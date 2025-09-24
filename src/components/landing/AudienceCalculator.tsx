import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calculator, Users, Building2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface AudienceResult {
  clinic_count: number;
  estimated_patients_monthly: number;
}

export const AudienceCalculator = () => {
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [result, setResult] = useState<AudienceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Map simples de alcance por classe (mantém compatibilidade com a base atual)
  const reachByClass = useMemo(() => ({
    'A': 2000,
    'AB': 1800,
    'ABC': 1700,
    'B': 1500,
    'BC': 1300,
    'C': 1200,
    'CD': 1100,
    'D': 1000,
    'E': 900,
    'ND': 800
  } as Record<string, number>), []);

  // Carregar opções reais de Especialidades e Cidades
  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        // Buscar especialidades a partir da view v_screens_enriched (preferida) ou da tabela screens
        let specialtiesData: any[] | null = null;
        let specError: any = null;
        const specView = await supabase
          .from('v_screens_enriched')
          .select('specialty, staging_especialidades')
          .limit(1000);
        specialtiesData = specView.data;
        specError = specView.error;
        if (specError) {
          const specTbl = await supabase
            .from('screens')
            .select('specialty')
            .limit(1000);
          specialtiesData = specTbl.data;
          specError = specTbl.error;
        }
        // Extrair e normalizar especialidades
        const rawSpecs: string[] = (specialtiesData || []).flatMap((row: any) => {
          const fromArray = Array.isArray(row.specialty) ? row.specialty : [];
          const fromStaging = row.staging_especialidades
            ? String(row.staging_especialidades).split(',')
            : [];
          return [...fromArray, ...fromStaging];
        });
        const cleaned = rawSpecs
          .flatMap((s) =>
            String(s)
              // aceitar vírgula, ponto e vírgula, barra vertical e barra
              .split(/[,;|\/]+/)
          )
          .map((s) => s.trim())
          .filter(Boolean);
        const uniqueInsensitive = Array.from(
          new Map(cleaned.map((s) => [s.toLocaleUpperCase('pt-BR'), s])).values()
        );
        const specs = uniqueInsensitive.sort((a, b) => a.localeCompare(b, 'pt-BR'));

        setSpecialties(specs);

        // Buscar cidades distintas
        const { data: citiesRows, error: citiesError } = await supabase
          .from('screens')
          .select('city')
          .not('city', 'is', null)
          .eq('active', true)
          .limit(2000);

        if (citiesError) throw citiesError;
        const uniqueCities = Array.from(new Set((citiesRows || [])
          .map((r: any) => (r.city || '').trim())
          .filter(Boolean)))
          .sort((a, b) => a.localeCompare(b, 'pt-BR'));
        setCities(uniqueCities);
      } catch (e: any) {
        console.error('Erro carregando opções da calculadora:', e);
        setError('Não foi possível carregar opções. Tente novamente.');
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, []);

  const handleCalculate = async () => {
    if (!specialty || !city) {
      setError('Por favor, selecione uma especialidade e uma cidade');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Preferir view enriquecida; se der erro, usar tabela screens
      let query = supabase
        .from('v_screens_enriched')
        .select('id, class, city, specialty, venue_name, display_name, name')
        .ilike('city', `%${city}%`)
        .not('class', 'is', null);

      // Filtrar especialidade (array text[])
      // Supabase suporta contains para arrays
      // Ex.: .contains('specialty', ['Dermatologia'])
      query = (query as any).contains('specialty', [specialty]);

      let { data, error: qError } = await query as any;

      if (qError) {
        // Fallback para screens
        const fb = await supabase
          .from('screens')
          .select('id, class, city, specialty, display_name, name')
          .ilike('city', `%${city}%`)
          .contains('specialty', [specialty]);
        data = fb.data as any[] | null;
        qError = fb.error as any;
      }

      if (qError) throw qError;
      const rows = (data || []) as Array<{ id: string; class?: string | null; specialty?: string[] | null; venue_name?: string | null; display_name?: string | null; name?: string | null }>;

      // Contabilizar "clínicas" por nome do local (venue/display/name) para evitar duplicidade por múltiplas telas
      const venueKey = (r: any) => (r.venue_name || r.display_name || r.name || r.id || '').toString();
      const uniqueVenueCount = Array.from(new Set(rows.map(venueKey))).length;

      // Estimar pacientes/mês somando alcance estimado por classe
      const estimatedPatients = rows.reduce((sum, r) => {
        const key = (r.class || 'ND').toUpperCase();
        const reach = reachByClass[key] ?? reachByClass['ND'];
        return sum + reach;
      }, 0);

      setResult({
        clinic_count: uniqueVenueCount,
        estimated_patients_monthly: estimatedPatients
      });
    } catch (err) {
      setError('Erro ao calcular estimativa. Tente novamente.');
      console.error('Error calculating audience:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          <CardTitle>Calculadora de Alcance</CardTitle>
        </div>
        <CardDescription>
          Descubra quantos pacientes você pode alcançar com mídia digital segmentada
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Especialidade Médica</label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma especialidade" />
              </SelectTrigger>
              <SelectContent>
                {specialties.map((spec) => (
                  <SelectItem key={spec} value={spec}>
                    {spec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Cidade</label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma cidade" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((cityOption) => (
                  <SelectItem key={cityOption} value={cityOption}>
                    {cityOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          onClick={handleCalculate} 
          disabled={loading || loadingOptions || !specialty || !city}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Calculando...
            </>
          ) : (
            <>
              <Calculator className="w-4 h-4 mr-2" />
              Calcular Alcance
            </>
          )}
        </Button>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {result && (
          <div className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 rounded-lg">
            <h3 className="font-semibold text-lg mb-4">Resultado da Simulação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{result.clinic_count}</p>
                  <p className="text-sm text-muted-foreground">Clínicas de {specialty}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Users className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-secondary">
                    {result.estimated_patients_monthly.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-sm text-muted-foreground">Pacientes/mês estimados</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-accent/50 rounded-lg">
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="shrink-0">💡 Insight</Badge>
                <p className="text-sm">
                  Em {city}, você pode alcançar até <strong>{result.estimated_patients_monthly.toLocaleString('pt-BR')} pacientes</strong> por mês 
                  através de telas estrategicamente posicionadas em {result.clinic_count} clínicas especializadas em {specialty}.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};