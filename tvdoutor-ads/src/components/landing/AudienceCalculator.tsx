import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calculator, Users, Building2, Loader2, X, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSpecialtiesWithFallback } from '@/hooks/useSpecialties';
import { SpecialtiesService } from '@/lib/specialties-service';

interface AudienceResult {
  clinic_count: number;
  estimated_patients_monthly: number;
}

export const AudienceCalculator = () => {
  // Estados para resultados e controle
  const [result, setResult] = useState<AudienceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // Novos hooks para sincronização automática
  const { 
    specialties, 
    isLoading: loadingSpecialties, 
    error: specialtiesError, 
    retry: retrySpecialties,
    isUsingFallback 
  } = useSpecialtiesWithFallback();

  // Estados para busca e seleção de especialidades
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [specialtySearchTerm, setSpecialtySearchTerm] = useState('');

  // Estados para busca e seleção de cidades
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [citySearchTerm, setCitySearchTerm] = useState('');

  // Map simples de alcance por classe (mantém compatibilidade com a base atual)
  const reachByClass = useMemo(() => ({
    'A': 12000,
    'AB': 10000,
    'ABC': 8000,
    'B': 8000,
    'BC': 6000,
    'C': 4000,
    'CD': 3000,
    'D': 2000,
    'E': 1000,
    'ND': 400
  } as Record<string, number>), []);

  // Carregar cidades quando especialidades são selecionadas
  useEffect(() => {
    const fetchCitiesForSelectedSpecialties = async () => {
      if (selectedSpecialties.length === 0) {
        setAvailableCities([]);
        return;
      }

      console.log('🔍 Buscando cidades para especialidades:', selectedSpecialties);
      setLoadingCities(true);
      try {
        // Buscar cidades para todas as especialidades selecionadas
        const citiesSet = new Set<string>();
        
        for (const specialty of selectedSpecialties) {
          const cities = await SpecialtiesService.getCitiesBySpecialty(specialty);
          cities.forEach(city => citiesSet.add(city));
        }
        
        const allCities = Array.from(citiesSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        setAvailableCities(allCities);
        console.log('🏙️ Cidades encontradas:', allCities.length);
      } catch (err) {
        console.error('❌ Erro ao buscar cidades:', err);
        setError('Erro ao carregar cidades. Tente novamente.');
      } finally {
        setLoadingCities(false);
      }
    };
    
    fetchCitiesForSelectedSpecialties();
  }, [selectedSpecialties]);


  // Filtrar cidades baseado no termo de busca
  const filteredCities = useMemo(() => {
    if (!citySearchTerm.trim()) return availableCities;
    return availableCities.filter(city => 
      city.toLowerCase().includes(citySearchTerm.toLowerCase())
    );
  }, [availableCities, citySearchTerm]);

  // Alternar seleção de cidade
  const toggleCity = (cityName: string) => {
    setSelectedCities(prev => {
      if (prev.includes(cityName)) {
        return prev.filter(c => c !== cityName);
      } else {
        return [...prev, cityName];
      }
    });
  };


  // Filtrar especialidades baseado no termo de busca
  // Só mostra especialidades quando o usuário está buscando
  const filteredSpecialties = useMemo(() => {
    if (!specialtySearchTerm.trim()) return [];
    return specialties.filter(spec => 
      spec.specialty_name.toLowerCase().includes(specialtySearchTerm.toLowerCase())
    );
  }, [specialties, specialtySearchTerm]);

  // Alternar seleção de especialidade
  const toggleSpecialty = (specialtyName: string) => {
    setSelectedSpecialties(prev => {
      if (prev.includes(specialtyName)) {
        return prev.filter(s => s !== specialtyName);
      } else {
        return [...prev, specialtyName];
      }
    });
  };


  const handleCalculate = async () => {
    // Validação - apenas especialidades são obrigatórias
    const hasValidSpecialties = selectedSpecialties.length > 0;

    if (!hasValidSpecialties) {
      setError('Por favor, selecione pelo menos uma especialidade');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🧮 Calculando alcance:', {
        specialties: selectedSpecialties,
        cities: selectedCities.length > 0 ? selectedCities : 'todas',
        hasCityFilter: selectedCities.length > 0
      });

      // Acumular resultados de todas as especialidades selecionadas
      let allRows: Array<{ id: string; class?: string | null; specialty?: string[] | null; venue_name?: string | null; display_name?: string | null; name?: string | null; city?: string | null }> = [];

      // Buscar dados para cada especialidade
      for (const selectedSpecialty of selectedSpecialties) {
        console.log('🔍 Buscando telas para especialidade:', selectedSpecialty);
        
        // Preferir view enriquecida; se der erro, usar tabela screens
        // Buscar TODAS as telas primeiro e filtrar no cliente para ter busca parcial
        let query = supabase
          .from('v_screens_enriched')
          .select('id, class, city, specialty, venue_name, display_name, name')
          .not('class', 'is', null)
          .not('specialty', 'is', null);

        // Aplicar filtro de cidade se houver
        if (selectedCities.length > 0) {
          query = (query as any).in('city', selectedCities);
        }

        let { data, error: qError } = await query as any;

        if (qError) {
          console.log('⚠️ Erro na view enriquecida, usando fallback para screens');
          // Fallback para screens
          let fbQuery = supabase
            .from('screens')
            .select('id, class, city, specialty, display_name, name')
            .not('specialty', 'is', null);

          // Aplicar filtro de cidade no fallback
          if (selectedCities.length > 0) {
            fbQuery = (fbQuery as any).in('city', selectedCities);
          }

          const fb = await fbQuery;
          data = fb.data as any[] | null;
          qError = fb.error as any;
        }

        if (!qError && data) {
          // Filtrar no cliente para fazer busca parcial (como no inventário)
          const filteredData = data.filter((row: any) => {
            if (!row.specialty || !Array.isArray(row.specialty)) return false;
            
            // Verificar se QUALQUER especialidade no array CONTÉM a palavra-chave selecionada
            return row.specialty.some((spec: string) => 
              spec.toLowerCase().includes(selectedSpecialty.toLowerCase())
            );
          });
          
          console.log(`✅ Encontradas ${filteredData.length} telas para "${selectedSpecialty}"`);
          allRows = [...allRows, ...filteredData];
        } else {
          console.log(`⚠️ Nenhuma tela encontrada para "${selectedSpecialty}"`);
        }
      }

      console.log('📊 Dados obtidos:', {
        totalRows: allRows.length,
        specialties: selectedSpecialties,
        cities: selectedCities.length > 0 ? selectedCities : 'todas'
      });

      // Contabilizar "clínicas" por nome do local (venue/display/name) para evitar duplicidade por múltiplas telas
      // Usamos Set para evitar contagem duplicada quando uma clínica tem múltiplas especialidades
      const venueKey = (r: any) => (r.venue_name || r.display_name || r.name || r.id || '').toString();
      const uniqueVenueCount = Array.from(new Set(allRows.map(venueKey))).length;

      // Estimar pacientes/mês somando alcance estimado por classe
      // Remove duplicatas por ID antes de calcular para evitar contar a mesma tela múltiplas vezes
      const uniqueRows = Array.from(new Map(allRows.map(r => [r.id, r])).values());
      const estimatedPatients = uniqueRows.reduce((sum, r) => {
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
    <Card className="w-full h-full max-w-none mx-auto flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          <CardTitle>Calculadora de Alcance</CardTitle>
        </div>
        <CardDescription>
          Descubra quantos pacientes você pode alcançar com mídia digital segmentada
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 flex-1 overflow-auto min-h-0">

        <div className="grid grid-cols-1 gap-4">
          {/* Seção de Especialidades - Busca por palavra-chave */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Especialidades Médicas</label>
              <div className="flex items-center gap-2">
                {isUsingFallback && (
                  <Badge variant="secondary" className="text-xs">
                    Fallback
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Campo de busca por palavra-chave */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar especialidades (ex: Cardio, Pediatria)..."
                value={specialtySearchTerm}
                onChange={(e) => setSpecialtySearchTerm(e.target.value)}
                className="pl-10 pr-10"
                disabled={loadingSpecialties}
                autoComplete="off"
              />
              {specialtySearchTerm && (
                <button
                  onClick={() => setSpecialtySearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title="Limpar busca"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Contador e ações */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {selectedSpecialties.length} especialidade(s) selecionada(s)
                {specialtySearchTerm && ` • ${filteredSpecialties.length} encontrada(s)`}
              </div>
              <div className="flex gap-2">
                {specialtySearchTerm && filteredSpecialties.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      const allFiltered = filteredSpecialties.map(s => s.specialty_name);
                      setSelectedSpecialties(prev => {
                        const combined = [...new Set([...prev, ...allFiltered])];
                        return combined;
                      });
                    }}
                  >
                    Selecionar Todas
                  </Button>
                )}
                {selectedSpecialties.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setSelectedSpecialties([])}
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>
            
            {/* Badges clicáveis de especialidades */}
            <div className="p-3 bg-muted/30 rounded-lg border max-h-48 overflow-y-auto">
              <div className="flex flex-wrap gap-1">
                {filteredSpecialties.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {loadingSpecialties 
                      ? "Carregando..." 
                      : specialtySearchTerm.trim() 
                        ? "Nenhuma especialidade encontrada" 
                        : "Digite para buscar especialidades"}
                  </p>
                ) : (
                  filteredSpecialties.map((spec) => {
                    const isSelected = selectedSpecialties.includes(spec.specialty_name);
                    return (
                      <Badge 
                        key={spec.specialty_name} 
                        variant={isSelected ? "default" : "outline"}
                        className={`text-xs cursor-pointer transition-all hover:scale-105 ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                        }`}
                        onClick={() => toggleSpecialty(spec.specialty_name)}
                      >
                        {spec.specialty_name}
                        {isSelected && <span className="ml-1">✓</span>}
                      </Badge>
                    );
                  })
                )}
              </div>
            </div>
            
            {specialtiesError && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <span>Erro ao carregar especialidades</span>
                <Button
                  variant="link"
                  size="sm"
                  onClick={retrySpecialties}
                  className="h-auto p-0 text-xs"
                >
                  Tentar novamente
                </Button>
              </div>
            )}
          </div>

          {/* Seção de Cidades */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Cidades <span className="text-xs text-muted-foreground">(Opcional)</span>
            </label>
            
            {/* Campo de busca por palavra-chave */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cidades (ex: Camp, São, Rio)..."
                value={citySearchTerm}
                onChange={(e) => setCitySearchTerm(e.target.value)}
                className="pl-10 pr-10"
                disabled={selectedSpecialties.length === 0 || loadingCities}
                autoComplete="off"
              />
              {citySearchTerm && (
                <button
                  onClick={() => setCitySearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title="Limpar busca"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Contador e ações */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {selectedCities.length} cidade(s) selecionada(s)
                {citySearchTerm && ` • ${filteredCities.length} encontrada(s)`}
              </div>
              {filteredCities.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      setSelectedCities(prev => {
                        const combined = [...new Set([...prev, ...filteredCities])];
                        return combined;
                      });
                    }}
                  >
                    Selecionar Todas
                  </Button>
                  {selectedCities.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setSelectedCities([])}
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {/* Badges clicáveis de cidades */}
            <div className="p-3 bg-muted/30 rounded-lg border max-h-48 overflow-y-auto">
              <div className="flex flex-wrap gap-1">
                {loadingCities ? (
                  <p className="text-xs text-muted-foreground">Carregando cidades...</p>
                ) : filteredCities.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {availableCities.length === 0 
                      ? "Selecione especialidades primeiro" 
                      : "Nenhuma cidade encontrada"}
                  </p>
                ) : (
                  filteredCities.map((cityName) => {
                    const isSelected = selectedCities.includes(cityName);
                    return (
                      <Badge 
                        key={cityName} 
                        variant={isSelected ? "default" : "outline"}
                        className={`text-xs cursor-pointer transition-all hover:scale-105 ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                        }`}
                        onClick={() => toggleCity(cityName)}
                      >
                        {cityName}
                        {isSelected && <span className="ml-1">✓</span>}
                      </Badge>
                    );
                  })
                )}
              </div>
            </div>
            
            {selectedSpecialties.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {availableCities.length === 0 && !loadingCities
                  ? "Nenhuma cidade encontrada com as especialidades selecionadas"
                  : "Deixe em branco para buscar em todas as cidades disponíveis"
                }
              </p>
            )}
          </div>
        </div>

        <Button 
          onClick={handleCalculate} 
          disabled={loading || loadingSpecialties || selectedSpecialties.length === 0}
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
                  <p className="text-sm text-muted-foreground">
                    Clínicas {selectedSpecialties.length > 1 ? 'encontradas' : `de ${selectedSpecialties[0]}`}
                  </p>
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
                  {(() => {
                    const specialtyText = selectedSpecialties.length === 1 
                      ? selectedSpecialties[0]
                      : `${selectedSpecialties.length} especialidades (${selectedSpecialties.slice(0, 2).join(', ')}${selectedSpecialties.length > 2 ? '...' : ''})`;
                    
                    if (selectedCities.length === 0) {
                      return (
                        <>
                          Em <strong>todas as cidades disponíveis</strong>, você pode alcançar até <strong>{result.estimated_patients_monthly.toLocaleString('pt-BR')} pacientes</strong> por mês 
                          através de telas estrategicamente posicionadas em {result.clinic_count} clínicas especializadas em {specialtyText}.
                        </>
                      );
                    }
                    
                    return (
                      <>
                        Em {selectedCities.length} cidade(s) selecionada(s), você pode alcançar até <strong>{result.estimated_patients_monthly.toLocaleString('pt-BR')} pacientes</strong> por mês 
                        através de telas estrategicamente posicionadas em {result.clinic_count} clínicas especializadas em {specialtyText}.
                      </>
                    );
                  })()}
                </p>
              </div>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};