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
import { SpecialtiesService } from '@/lib/specialties-service';

interface AudienceResult {
  clinic_count: number;
  estimated_patients_monthly: number;
}

export const AudienceCalculator = () => {
  // Estados para seleção de cidade única (modo single)
  const [city, setCity] = useState('');
  
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
  
  

  // Novos estados para seleção múltipla de cidades (adicionados sem alterar os existentes)
  const [multiCityMode, setMultiCityMode] = useState(false);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [showCityModal, setShowCityModal] = useState(false);
  const [citySearchTerm, setCitySearchTerm] = useState('');

  // Novos estados para seleção múltipla de especialidades e busca por palavra-chave
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);
  const [specialtySearchTerm, setSpecialtySearchTerm] = useState('');

  // Map simples de alcance por classe (mantém compatibilidade com a base atual)
  const reachByClass = useMemo(() => ({
    'A': 12.000,
    'AB': 10.000,
    'ABC': 8.000,
    'B': 8.000,
    'BC': 6.000,
    'C': 4.000,
    'CD': 3.000,
    'D': 2.000,
    'E': 1.000,
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

  // Funções para gerenciar múltiplas especialidades
  const handleSpecialtyToggle = (specialtyName: string, checked: boolean) => {
    if (checked) {
      setSelectedSpecialties(prev => [...prev, specialtyName]);
    } else {
      setSelectedSpecialties(prev => prev.filter(s => s !== specialtyName));
    }
  };

  const handleSelectAllSpecialties = () => {
    const specialtiesToSelect = filteredSpecialties.filter(
      spec => !selectedSpecialties.includes(spec.specialty_name)
    );
    setSelectedSpecialties(prev => [...prev, ...specialtiesToSelect.map(s => s.specialty_name)]);
  };

  const handleClearAllSpecialties = () => {
    setSelectedSpecialties([]);
  };

  const handleRemoveSpecialty = (specialtyName: string) => {
    setSelectedSpecialties(prev => prev.filter(s => s !== specialtyName));
  };

  // Filtrar especialidades baseado no termo de busca (busca por palavra-chave)
  const filteredSpecialties = useMemo(() => {
    if (!specialtySearchTerm.trim()) return specialties;
    const searchLower = specialtySearchTerm.toLowerCase();
    return specialties.filter(spec => 
      spec.specialty_name.toLowerCase().includes(searchLower)
    );
  }, [specialties, specialtySearchTerm]);

  // Reset busca quando modals são fechados
  const handleCloseCityModal = () => {
    setShowCityModal(false);
    setCitySearchTerm('');
  };

  const handleCloseSpecialtyModal = () => {
    setShowSpecialtyModal(false);
    setSpecialtySearchTerm('');
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
        mode: multiCityMode ? 'multiple' : 'single',
        cities: multiCityMode ? selectedCities : (city ? [city] : 'todas'),
        hasCityFilter: multiCityMode ? selectedCities.length > 0 : city.length > 0
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
        const hasCityFilter = multiCityMode ? selectedCities.length > 0 : city.length > 0;
        
        if (hasCityFilter) {
          if (multiCityMode) {
            query = (query as any).in('city', selectedCities);
          } else {
            query = (query as any).ilike('city', `%${city}%`);
          }
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
          if (hasCityFilter) {
            if (multiCityMode) {
              fbQuery = (fbQuery as any).in('city', selectedCities);
            } else {
              fbQuery = (fbQuery as any).ilike('city', `%${city}%`);
            }
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
        cities: multiCityMode ? selectedCities : [city]
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
          {/* Seção de Especialidades - Agora com seleção múltipla e busca */}
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
            
            <Button
              variant="outline"
              className="w-full justify-between h-auto min-h-[40px] py-2"
              onClick={() => setShowSpecialtyModal(true)}
              disabled={loadingSpecialties}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Search className="w-4 h-4 shrink-0" />
                {selectedSpecialties.length === 0 
                  ? (loadingSpecialties 
                      ? "Carregando especialidades..." 
                      : "Buscar especialidades (ex: Cardio, Pediatria)")
                  : (
                    <div className="flex flex-wrap gap-1">
                      {selectedSpecialties.slice(0, 2).map((spec) => (
                        <Badge key={spec} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                      {selectedSpecialties.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{selectedSpecialties.length - 2} mais
                        </Badge>
                      )}
                    </div>
                  )
                }
              </div>
              <CheckSquare className="w-4 h-4 shrink-0" />
            </Button>
            
            {selectedSpecialties.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {selectedSpecialties.length} especialidade(s) selecionada(s)
              </div>
            )}
            
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

          {/* Toggle de múltiplas cidades */}
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
                disabled={selectedSpecialties.length === 0}
              >
                Sim
              </Button>
            </div>
          </div>

          {/* Seção de Cidades */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Cidade <span className="text-xs text-muted-foreground">(Opcional)</span>
            </label>
            {!multiCityMode ? (
              // Modo único (lógica existente preservada)
              <Select 
                value={city} 
                onValueChange={setCity}
                disabled={selectedSpecialties.length === 0 || loadingCities}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    selectedSpecialties.length === 0
                      ? "Selecione especialidades primeiro" 
                      : loadingCities 
                        ? "Carregando cidades..." 
                        : availableCities.length === 0
                          ? "Nenhuma cidade encontrada"
                          : "Todas as cidades (ou selecione uma)"
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
                  disabled={selectedSpecialties.length === 0 || loadingCities}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {selectedCities.length === 0 
                      ? (loadingCities ? "Carregando cidades..." : "Todas as cidades (ou selecione)")
                      : `${selectedCities.length} cidade(s) selecionada(s)`
                    }
                  </div>
                  <CheckSquare className="w-4 h-4" />
                </Button>
                
                {/* Indicador compacto de cidades selecionadas */}
                {selectedCities.length > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    Clique para gerenciar seleção ({selectedCities.length} cidades)
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Clique para filtrar por cidades específicas (opcional)
                  </div>
                )}
              </div>
            )}
            
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
                    
                    const hasCityFilter = multiCityMode ? selectedCities.length > 0 : city.length > 0;
                    
                    if (!hasCityFilter) {
                      return (
                        <>
                          Em <strong>todas as cidades disponíveis</strong>, você pode alcançar até <strong>{result.estimated_patients_monthly.toLocaleString('pt-BR')} pacientes</strong> por mês 
                          através de telas estrategicamente posicionadas em {result.clinic_count} clínicas especializadas em {specialtyText}.
                        </>
                      );
                    }
                    
                    if (multiCityMode && selectedCities.length > 0) {
                      return (
                        <>
                          Em {selectedCities.length} cidade(s) selecionada(s), você pode alcançar até <strong>{result.estimated_patients_monthly.toLocaleString('pt-BR')} pacientes</strong> por mês 
                          através de telas estrategicamente posicionadas em {result.clinic_count} clínicas especializadas em {specialtyText}.
                        </>
                      );
                    }
                    
                    return (
                      <>
                        Em {city}, você pode alcançar até <strong>{result.estimated_patients_monthly.toLocaleString('pt-BR')} pacientes</strong> por mês 
                        através de telas estrategicamente posicionadas em {result.clinic_count} clínicas especializadas em {specialtyText}.
                      </>
                    );
                  })()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal de seleção múltipla de especialidades */}
        <Dialog open={showSpecialtyModal} onOpenChange={handleCloseSpecialtyModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Buscar Especialidades Médicas
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 space-y-4 flex flex-col">
              {/* Barra de busca por palavra-chave */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Digite palavra-chave (ex: Cardio, Pediatria)..."
                  value={specialtySearchTerm}
                  onChange={(e) => setSpecialtySearchTerm(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>

              {/* Controles de seleção */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">
                      {selectedSpecialties.length} de {specialties.length} especialidades selecionadas
                    </span>
                  </div>
                  {specialtySearchTerm && (
                    <Badge variant="secondary" className="text-xs">
                      {filteredSpecialties.length} encontradas
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllSpecialties}
                    disabled={filteredSpecialties.length === 0}
                  >
                    Selecionar Todas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAllSpecialties}
                    disabled={selectedSpecialties.length === 0}
                  >
                    Limpar Seleção
                  </Button>
                </div>
              </div>

              {/* Especialidades selecionadas (resumo compacto) */}
              {selectedSpecialties.length > 0 && (
                <div className="p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default" className="text-xs">
                      Selecionadas: {selectedSpecialties.length}
                    </Badge>
                  </div>
                  <ScrollArea className="h-20">
                    <div className="flex flex-wrap gap-1">
                      {selectedSpecialties.map((specName) => (
                        <Badge key={specName} variant="secondary" className="text-xs">
                          {specName}
                          <button
                            onClick={() => handleRemoveSpecialty(specName)}
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

              {/* Lista de especialidades */}
              <div className="flex-1 border rounded-lg">
                <ScrollArea className="h-96">
                  <div className="p-4 space-y-1">
                    {filteredSpecialties.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma especialidade encontrada</p>
                        {specialtySearchTerm && (
                          <p className="text-xs">Tente um termo de busca diferente</p>
                        )}
                      </div>
                    ) : (
                      filteredSpecialties.map((spec) => (
                        <div key={spec.specialty_name} className="flex items-center space-x-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
                          <Checkbox
                            id={spec.specialty_name}
                            checked={selectedSpecialties.includes(spec.specialty_name)}
                            onCheckedChange={(checked) => handleSpecialtyToggle(spec.specialty_name, checked as boolean)}
                          />
                          <label 
                            htmlFor={spec.specialty_name}
                            className="flex-1 text-sm cursor-pointer font-medium"
                          >
                            {spec.specialty_name}
                          </label>
                          <Badge variant="outline" className="text-xs">
                            {spec.total_occurrences}
                          </Badge>
                          {selectedSpecialties.includes(spec.specialty_name) && (
                            <Badge variant="default" className="text-xs">
                              ✓
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
              <Button variant="outline" onClick={handleCloseSpecialtyModal}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCloseSpecialtyModal}
                disabled={selectedSpecialties.length === 0}
                className="min-w-[180px]"
              >
                Confirmar ({selectedSpecialties.length} especialidades)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de seleção múltipla de cidades */}
        <Dialog open={showCityModal} onOpenChange={handleCloseCityModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Selecionar Cidades (Opcional)
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Filtre por cidades específicas ou deixe em branco para buscar em todas as cidades disponíveis
              </p>
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
              <Button variant="outline" onClick={handleCloseCityModal}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCloseCityModal}
                className="min-w-[140px]"
              >
                {selectedCities.length === 0 
                  ? "Confirmar (Todas as cidades)"
                  : `Confirmar (${selectedCities.length} cidades)`
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};