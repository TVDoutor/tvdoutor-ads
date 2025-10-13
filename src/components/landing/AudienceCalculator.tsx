import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calculator, Users, Building2, Loader2, X, CheckSquare, Search, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useSpecialtiesWithFallback } from '@/hooks/useSpecialties';
import { useSpecialtiesRealtime } from '@/hooks/useSpecialtiesRealtime';
import { SpecialtiesService } from '@/lib/specialties-service';

interface AudienceResult {
  clinic_count: number;
  estimated_patients_monthly: number;
}

export const AudienceCalculator = () => {
  // Estados existentes (mantidos intactos)
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [result, setResult] = useState<AudienceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cities, setCities] = useState<string[]>([]);
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
  
  

  // Novos estados para seleção múltipla (adicionados sem alterar os existentes)
  const [multiCityMode, setMultiCityMode] = useState(false);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [showCityModal, setShowCityModal] = useState(false);
  const [citySearchTerm, setCitySearchTerm] = useState('');

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

  // Função para buscar cidades por especialidade (usando serviço centralizado)
  const fetchCitiesBySpecialty = async (selectedSpecialty: string) => {
    console.log('🔍 Buscando cidades para especialidade:', selectedSpecialty);
    setLoadingCities(true);
    try {
      const cities = await SpecialtiesService.getCitiesBySpecialty(selectedSpecialty);
      setAvailableCities(cities);
      console.log('🏙️ Cidades encontradas:', cities.length);
    } catch (err) {
      console.error('❌ Erro ao buscar cidades por especialidade:', err);
      // Fallback: usar todas as cidades disponíveis
      setAvailableCities(cities);
      setError('Erro ao carregar cidades específicas. Mostrando todas as cidades.');
    } finally {
      setLoadingCities(false);
    }
  };

  // Carregar cidades para fallback (mantido para compatibilidade)
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const { data: citiesRows, error: citiesError } = await supabase
          .from('screens')
          .select('city')
          .not('city', 'is', null)
          .eq('active', true as any)
          .limit(2000);

        if (citiesError) throw citiesError;
        const uniqueCities = Array.from(new Set((citiesRows || [])
          .map((r: any) => (r.city || '').trim())
          .filter(Boolean)))
          .sort((a, b) => a.localeCompare(b, 'pt-BR'));
        setCities(uniqueCities);
      } catch (e: any) {
        console.error('Erro carregando cidades:', e);
      }
    };
    fetchCities();
  }, []);

  // Handler para mudança de especialidade (lógica existente preservada)
  const handleSpecialtyChange = (newSpecialty: string) => {
    console.log('🎯 Especialidade alterada para:', newSpecialty);
    setSpecialty(newSpecialty);
    setCity(''); // Reset cidade única
    setSelectedCities([]); // Reset cidades múltiplas
    setResult(null); // Reset resultado
    setError(''); // Limpar erros
    fetchCitiesBySpecialty(newSpecialty);
  };

  // Novas funções para seleção múltipla (adicionadas sem alterar as existentes)
  const handleMultiCityToggle = (enabled: boolean) => {
    console.log('🔄 Modo múltiplas cidades:', enabled ? 'ATIVADO' : 'DESATIVADO');
    setMultiCityMode(enabled);
    
    if (enabled) {
      // Ativar modo múltiplo: limpar seleção única e abrir modal
      setCity('');
      setSelectedCities([]);
      setShowCityModal(true);
    } else {
      // Desativar modo múltiplo: limpar seleções múltiplas
      setSelectedCities([]);
    }
  };

  const handleCityToggle = (cityName: string, checked: boolean) => {
    if (checked) {
      setSelectedCities(prev => [...prev, cityName]);
    } else {
      setSelectedCities(prev => prev.filter(c => c !== cityName));
    }
  };

  const handleSelectAllCities = () => {
    const citiesToSelect = filteredAvailableCities.filter(city => !selectedCities.includes(city));
    setSelectedCities(prev => [...prev, ...citiesToSelect]);
  };

  const handleClearAllCities = () => {
    setSelectedCities([]);
  };

  const handleRemoveCity = (cityName: string) => {
    setSelectedCities(prev => prev.filter(c => c !== cityName));
  };

  // Filtrar cidades baseado no termo de busca
  const filteredAvailableCities = useMemo(() => {
    if (!citySearchTerm.trim()) return availableCities;
    return availableCities.filter(city => 
      city.toLowerCase().includes(citySearchTerm.toLowerCase())
    );
  }, [availableCities, citySearchTerm]);

  // Reset busca quando modal é fechado
  const handleCloseModal = () => {
    setShowCityModal(false);
    setCitySearchTerm('');
  };

  const handleCalculate = async () => {
    // Validação adaptada para ambos os modos
    const hasValidSelection = multiCityMode 
      ? (selectedCities.length > 0)
      : (city.length > 0);

    if (!specialty || !hasValidSelection) {
      setError(multiCityMode 
        ? 'Por favor, selecione uma especialidade e pelo menos uma cidade'
        : 'Por favor, selecione uma especialidade e uma cidade');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🧮 Calculando alcance:', {
        specialty,
        mode: multiCityMode ? 'multiple' : 'single',
        cities: multiCityMode ? selectedCities : [city]
      });

      // Preferir view enriquecida; se der erro, usar tabela screens
      let query = supabase
        .from('v_screens_enriched')
        .select('id, class, city, specialty, venue_name, display_name, name')
        .not('class', 'is', null);

      // Filtrar por cidade(s) - ADAPTAÇÃO PARA MODO MÚLTIPLO
      if (multiCityMode) {
        // Modo múltiplo: usar operador .in() para array de cidades
        query = (query as any).in('city', selectedCities);
      } else {
        // Modo único: usar .ilike() como antes (lógica existente preservada)
        query = (query as any).ilike('city', `%${city}%`);
      }

      // Filtrar especialidade (array text[]) - LÓGICA EXISTENTE PRESERVADA
      // Supabase suporta contains para arrays
      // Ex.: .contains('specialty', ['Dermatologia'])
      query = (query as any).contains('specialty', [specialty]);

      let { data, error: qError } = await query as any;

      if (qError) {
        // Fallback para screens - LÓGICA EXISTENTE PRESERVADA COM ADAPTAÇÃO
        let fbQuery = supabase
          .from('screens')
          .select('id, class, city, specialty, display_name, name')
          .contains('specialty', [specialty]);

        // Aplicar filtro de cidade no fallback também
        if (multiCityMode) {
          fbQuery = (fbQuery as any).in('city', selectedCities);
        } else {
          fbQuery = (fbQuery as any).ilike('city', `%${city}%`);
        }

        const fb = await fbQuery;
        data = fb.data as any[] | null;
        qError = fb.error as any;
      }

      if (qError) throw qError;
      const rows = (data || []) as Array<{ id: string; class?: string | null; specialty?: string[] | null; venue_name?: string | null; display_name?: string | null; name?: string | null }>;

      console.log('📊 Dados obtidos:', {
        totalRows: rows.length,
        cities: multiCityMode ? selectedCities : [city]
      });

      // Contabilizar "clínicas" por nome do local (venue/display/name) para evitar duplicidade por múltiplas telas
      // LÓGICA EXISTENTE PRESERVADA
      const venueKey = (r: any) => (r.venue_name || r.display_name || r.name || r.id || '').toString();
      const uniqueVenueCount = Array.from(new Set(rows.map(venueKey))).length;

      // Estimar pacientes/mês somando alcance estimado por classe
      // LÓGICA EXISTENTE PRESERVADA
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
        {/* Toggle para seleção múltipla */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Selecionar mais de uma cidade</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Não</span>
            <Button
              variant={multiCityMode ? "default" : "outline"}
              size="sm"
              onClick={() => handleMultiCityToggle(!multiCityMode)}
              disabled={!specialty}
            >
              Sim
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Especialidade Médica</label>
              <div className="flex items-center gap-2">
                {isUsingFallback && (
                  <Badge variant="secondary" className="text-xs">
                    Fallback
                  </Badge>
                )}
              </div>
            </div>
            <Select 
              value={specialty} 
              onValueChange={handleSpecialtyChange}
              disabled={loadingSpecialties}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  loadingSpecialties 
                    ? "Carregando especialidades..." 
                    : specialtiesError 
                      ? "Erro ao carregar especialidades" 
                      : "Selecione uma especialidade"
                } />
              </SelectTrigger>
              <SelectContent>
                {specialties.map((spec) => (
                  <SelectItem key={spec.specialty_name} value={spec.specialty_name}>
                    <div className="flex items-center justify-between w-full">
                      <span>{spec.specialty_name}</span>
                      <Badge variant="outline" className="text-xs ml-2">
                        {spec.total_occurrences}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Cidade</label>
            {!multiCityMode ? (
              // Modo único (lógica existente preservada)
              <Select 
                value={city} 
                onValueChange={setCity}
                disabled={!specialty || loadingCities}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !specialty 
                      ? "Selecione uma especialidade primeiro" 
                      : loadingCities 
                        ? "Carregando cidades..." 
                        : availableCities.length === 0
                          ? "Nenhuma cidade encontrada"
                          : "Selecione uma cidade"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableCities.map((cityOption) => (
                    <SelectItem key={cityOption} value={cityOption}>
                      {cityOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              // Modo múltiplo (otimizado para melhor uso do espaço)
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-between h-10"
                  onClick={() => setShowCityModal(true)}
                  disabled={!specialty || loadingCities}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {selectedCities.length === 0 
                      ? (loadingCities ? "Carregando cidades..." : "Selecionar cidades")
                      : `${selectedCities.length} cidade(s) selecionada(s)`
                    }
                  </div>
                  <CheckSquare className="w-4 h-4" />
                </Button>
                
                {/* Indicador compacto de cidades selecionadas */}
                {selectedCities.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Clique para gerenciar seleção ({selectedCities.length} cidades)
                  </div>
                )}
              </div>
            )}
            
            {specialty && availableCities.length === 0 && !loadingCities && (
              <p className="text-xs text-muted-foreground">
                Nenhuma cidade encontrada com a especialidade "{specialty}"
              </p>
            )}
          </div>
        </div>

        <Button 
          onClick={handleCalculate} 
          disabled={loading || loadingSpecialties || !specialty || (multiCityMode ? selectedCities.length === 0 : !city)}
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
                  {multiCityMode ? (
                    <>
                      Em {selectedCities.length} cidade(s) selecionada(s), você pode alcançar até <strong>{result.estimated_patients_monthly.toLocaleString('pt-BR')} pacientes</strong> por mês 
                      através de telas estrategicamente posicionadas em {result.clinic_count} clínicas especializadas em {specialty}.
                    </>
                  ) : (
                    <>
                      Em {city}, você pode alcançar até <strong>{result.estimated_patients_monthly.toLocaleString('pt-BR')} pacientes</strong> por mês 
                      através de telas estrategicamente posicionadas em {result.clinic_count} clínicas especializadas em {specialty}.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal de seleção múltipla de cidades - OTIMIZADO */}
        <Dialog open={showCityModal} onOpenChange={handleCloseModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Selecionar Cidades para {specialty}
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 space-y-4 flex flex-col">
              {/* Barra de busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cidades..."
                  value={citySearchTerm}
                  onChange={(e) => setCitySearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Controles de seleção */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      {selectedCities.length} de {availableCities.length} cidades selecionadas
                    </span>
                  </div>
                  {citySearchTerm && (
                    <Badge variant="secondary" className="text-xs">
                      {filteredAvailableCities.length} encontradas
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllCities}
                    disabled={filteredAvailableCities.length === 0 || selectedCities.length === filteredAvailableCities.length}
                  >
                    Selecionar Todas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllCities}
                    disabled={selectedCities.length === 0}
                  >
                    Limpar Seleção
                  </Button>
                </div>
              </div>

              {/* Cidades selecionadas (resumo compacto) */}
              {selectedCities.length > 0 && (
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default" className="text-xs">
                      Selecionadas: {selectedCities.length}
                    </Badge>
                  </div>
                  <ScrollArea className="h-20">
                    <div className="flex flex-wrap gap-1">
                      {selectedCities.map((cityName) => (
                        <Badge key={cityName} variant="secondary" className="text-xs">
                          {cityName}
                          <button
                            onClick={() => handleRemoveCity(cityName)}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Lista de cidades */}
              <div className="flex-1 border rounded-lg">
                <ScrollArea className="h-96">
                  <div className="p-4 space-y-1">
                    {filteredAvailableCities.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma cidade encontrada</p>
                        {citySearchTerm && (
                          <p className="text-xs">Tente um termo de busca diferente</p>
                        )}
                      </div>
                    ) : (
                      filteredAvailableCities.map((cityName) => (
                        <div key={cityName} className="flex items-center space-x-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
                          <Checkbox
                            id={cityName}
                            checked={selectedCities.includes(cityName)}
                            onCheckedChange={(checked) => handleCityToggle(cityName, checked as boolean)}
                          />
                          <label 
                            htmlFor={cityName}
                            className="flex-1 text-sm cursor-pointer font-medium"
                          >
                            {cityName}
                          </label>
                          {selectedCities.includes(cityName) && (
                            <Badge variant="default" className="text-xs">
                              Selecionada
                            </Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCloseModal}
                disabled={selectedCities.length === 0}
                className="min-w-[140px]"
              >
                Confirmar ({selectedCities.length} cidades)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};