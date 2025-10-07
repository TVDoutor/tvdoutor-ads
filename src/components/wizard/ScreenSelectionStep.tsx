import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Monitor, Users, CheckCircle2, X, Search, Building2, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { ProposalData } from "../NewProposalWizard";
import { toast } from "sonner";
import { CitySelectionModal } from "@/components/ui/city-selection-modal";
import { AddressRadiusSearch } from "@/components/ui/address-radius-search";

interface Screen {
  id: number;
  code: string;
  name: string;
  display_name: string;
  city: string;
  state: string;
  active: boolean;
  venue_id?: number;
  class: string;
  class_name?: string;
  lat?: number;
  lng?: number;
  specialty?: string[]; // Array de especialidades
  address_raw?: string; // Endereço da tela
}

// Removido - agora buscamos especialidades do banco de dados

interface ScreenSelectionStepProps {
  data: ProposalData;
  onUpdate: (updates: Partial<ProposalData>) => void;
}

export const ScreenSelectionStep = ({ data, onUpdate }: ScreenSelectionStepProps) => {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
    
    // Se há termo de busca, limpar telas selecionadas para forçar nova busca
    if (value.trim().length > 0) {
      console.log('🧹 Termo de busca digitado, limpando telas selecionadas');
      onUpdate({ selectedScreens: [] });
      toast.info('Selecione "Buscar Telas Próximas" para ver as telas encontradas');
    }
  };
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [availableSpecialties, setAvailableSpecialties] = useState<{ value: string; label: string; count: number }[]>([]);
  const [radiusSearchResults, setRadiusSearchResults] = useState<any[]>([]);
  const [radiusSearchActive, setRadiusSearchActive] = useState(false);

  useEffect(() => {
    fetchScreens();
  }, []);

  const fetchScreens = async () => {
    try {
      setLoading(true);
      // 1) Tentar buscar via view enriquecida para obter a classe pronta
      console.log('🔍 Buscando telas via v_screens_enriched...');
      let { data: enriched, error: enrichedError } = await supabase
        .from('v_screens_enriched')
        .select(`
          id,
          code,
          name,
          display_name,
          city,
          state,
          lat,
          lng,
          active,
          class,
          specialty,
          address
        `)
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .order('display_name');

      let screensData: any[] | null = null;

      if (!enrichedError && enriched) {
        // Mapear dados da view para nosso modelo
        screensData = enriched.map((s: any) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          display_name: s.display_name || s.name,
          city: s.city,
          state: s.state,
          active: Boolean(s.active),
          lat: s.lat,
          lng: s.lng,
          class: s.class || 'ND',
          class_name: s.class || 'ND',
          specialty: Array.isArray(s.specialty)
            ? s.specialty
            : typeof s.specialty === 'string' && s.specialty.length > 0
              ? s.specialty.split(',').map((x: string) => x.trim()).filter(Boolean)
              : [],
          address_raw: s.address || ''
        }));
      } else {
        // 2) Fallback para a tabela screens mantendo o comportamento antigo
        console.log('⚠️ v_screens_enriched indisponível. Usando tabela screens. Detalhe:', enrichedError?.message);
        let { data: fromScreens, error } = await supabase
          .from('screens')
          .select(`
            id,
            code,
            name,
            display_name,
            city,
            state,
            active,
            venue_id,
            lat,
            lng,
            specialty,
            address_raw,
            class
          `)
      .eq('active', true as any)
          .not('lat', 'is', null)
          .not('lng', 'is', null)
          .order('display_name');

        // Se a coluna specialty não existir, buscar sem ela
        if (error && error.code === '42703' && error.message.includes('column screens.specialty does not exist')) {
          console.log('⚠️ Coluna specialty não existe, buscando sem ela...');
          const { data: screensWithoutSpecialty, error: errorWithoutSpecialty } = await supabase
            .from('screens')
            .select(`
              id,
              code,
              name,
              display_name,
              city,
              state,
              active,
              venue_id,
              lat,
              lng,
              address_raw,
              class
            `)
            .eq('active', true as any)
            .not('lat', 'is', null)
            .not('lng', 'is', null)
            .order('display_name');

          if (errorWithoutSpecialty) throw errorWithoutSpecialty;
          fromScreens = screensWithoutSpecialty as any;
          error = null as any;
        }

        if (error) throw error;

        screensData = (fromScreens || []).map((screen: any) => ({
          ...screen,
          class: screen.class || 'ND',
          class_name: screen.class || 'ND',
          specialty: Array.isArray(screen.specialty)
            ? screen.specialty
            : typeof screen.specialty === 'string' && screen.specialty.length > 0
              ? screen.specialty.split(',').map((x: string) => x.trim()).filter(Boolean)
              : []
        }));
      }

      // Garantir array
      screensData = screensData || [];

      // Aplicar no estado
      setScreens(screensData as any);

      // Debug
      console.log('📊 Telas carregadas:', screensData.length);
      console.log('📊 Exemplo:', screensData[0]);

      // 3) Calcular especialidades disponíveis (arrays)
      const specialtyCounts: { [key: string]: number } = {};
      (screensData || []).forEach((screen: any) => {
        if (screen.specialty && Array.isArray(screen.specialty)) {
          screen.specialty.forEach((spec: string) => {
            const trimmedSpec = spec?.trim();
            if (trimmedSpec && trimmedSpec !== '') {
              specialtyCounts[trimmedSpec] = (specialtyCounts[trimmedSpec] || 0) + 1;
            }
          });
        }
      });

      const specialties = Object.entries(specialtyCounts)
        .map(([specialty, count]) => ({
          value: specialty,
          label: specialty.charAt(0).toUpperCase() + specialty.slice(1),
          count
        }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

      setAvailableSpecialties(specialties);
    } catch (error: any) {
      console.error('Erro ao buscar telas:', error);
      toast.error('Erro ao carregar telas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredScreens = screens.filter(screen => {
    // Se a busca por raio estiver ativa, mostrar apenas as telas encontradas na busca
    if (radiusSearchActive) {
      return radiusSearchResults.some(result => result.id === screen.id.toString());
    }
    
    // Se não há busca por raio ativa, aplicar outros filtros
    const matchesSearch = !searchTerm || 
      screen.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      screen.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      screen.state.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCity = !selectedCity || selectedCity === "all" || screen.city === selectedCity;
    
    // Se há cidades selecionadas, mostrar APENAS essas cidades
    const matchesSelectedCities = data.selectedCities.length === 0 || data.selectedCities.includes(screen.city);
    
    // Se há especialidades selecionadas, mostrar APENAS essas especialidades
    const matchesSelectedSpecialties = data.selectedSpecialties.length === 0 || 
      (screen.specialty && Array.isArray(screen.specialty) && 
       data.selectedSpecialties.some(selectedSpec => 
         screen.specialty!.some(spec => spec?.trim() === selectedSpec)
       ));
    
    // Lógica mais restritiva: se há filtros específicos, aplicar TODOS
    const hasSpecificFilters = data.selectedCities.length > 0 || data.selectedSpecialties.length > 0 || searchTerm;
    
    if (hasSpecificFilters) {
      // Se há filtros específicos, TODOS devem ser atendidos
      return matchesSearch && matchesCity && matchesSelectedCities && matchesSelectedSpecialties;
    } else {
      // Se não há filtros específicos, mostrar todas as telas
      return true;
    }
  });

  const availableCities = [...new Set(screens.map(s => s.city))].sort();

  const toggleScreenSelection = (screenId: number) => {
    const currentSelected = data.selectedScreens;
    const newSelected = currentSelected.includes(screenId)
      ? currentSelected.filter(id => id !== screenId)
      : [...currentSelected, screenId];
    
    onUpdate({ selectedScreens: newSelected });
  };

  const handleSpecialtyChange = (specialtyId: string) => {
    if (specialtyId === "all") {
      onUpdate({ selectedSpecialties: [] });
    } else {
      onUpdate({ selectedSpecialties: [specialtyId] });
      
      // Se há especialidade selecionada, limpar telas selecionadas para forçar nova busca
      console.log('🧹 Especialidade selecionada, limpando telas selecionadas');
      onUpdate({ selectedScreens: [] });
      toast.info('Selecione "Buscar Telas Próximas" para ver as telas da especialidade escolhida');
    }
  };

  const handleCitySelection = (selectedCities: string[]) => {
    onUpdate({ selectedCities });
    
    // Se há cidades selecionadas, limpar telas selecionadas para forçar nova busca
    if (selectedCities.length > 0) {
      console.log('🧹 Cidades selecionadas, limpando telas selecionadas');
      onUpdate({ selectedScreens: [] });
      toast.info('Selecione "Buscar Telas Próximas" para ver as telas das cidades escolhidas');
    }
  };

  const handleRadiusSearchResults = (screens: any[], center: { lat: number; lng: number }, radius: number) => {
    console.log('📍 Resultados da busca por raio:', { screens: screens.length, center, radius });
    
    // Converter os resultados para o formato esperado
    const screenIds = screens.map(screen => parseInt(screen.id));
    
    // Limpar telas selecionadas anteriores e selecionar apenas as encontradas na busca
    setRadiusSearchResults(screens);
    setRadiusSearchActive(true);
    onUpdate({ selectedScreens: screenIds });
    
    toast.success(`${screens.length} telas encontradas e selecionadas automaticamente!`);
  };


  const handleSelectAllScreens = () => {
    const allScreenIds = filteredScreens.map(screen => screen.id);
    const currentSelected = data.selectedScreens;
    const newSelected = [...new Set([...currentSelected, ...allScreenIds])];
    
    onUpdate({ selectedScreens: newSelected });
    toast.success(`${allScreenIds.length} telas selecionadas!`);
  };

  const getAvailableCitiesWithCount = () => {
    const cityCounts: { [key: string]: { name: string; state: string; count: number; address?: string } } = {};
    
    screens.forEach(screen => {
      if (!cityCounts[screen.city]) {
        cityCounts[screen.city] = {
          name: screen.city,
          state: screen.state,
          count: 0,
          address: screen.address_raw || undefined
        };
      }
      cityCounts[screen.city].count++;
    });
    
    return Object.values(cityCounts).sort((a, b) => a.name.localeCompare(b.name));
  };

  const getSelectedScreensByLocation = () => {
    const selectedScreensData = screens.filter(s => data.selectedScreens.includes(s.id));
    const locationMap: { [key: string]: Screen[] } = {};
    
    selectedScreensData.forEach(screen => {
      const location = `${screen.city}, ${screen.state}`;
      if (!locationMap[location]) {
        locationMap[location] = [];
      }
      locationMap[location].push(screen);
    });
    
    return locationMap;
  };

  const selectedScreensByLocation = getSelectedScreensByLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando telas disponíveis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros - Layout em linha para melhor UX */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Busca */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Search className="w-4 h-4" />
              Buscar telas
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome, cidade ou estado..."
                value={searchTerm}
                onChange={(e) => handleSearchTermChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Especialidades */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Filtrar por Especialidade
              {loading && <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>}
            </label>
            <Select
              value={data.selectedSpecialties.length > 0 ? data.selectedSpecialties[0] : "all"}
              onValueChange={handleSpecialtyChange}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Carregando especialidades..." : "Selecione uma especialidade"} />
              </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as especialidades</SelectItem>
              {availableSpecialties.filter(specialty => specialty.value && specialty.value.trim() !== '').map(specialty => (
                <SelectItem key={specialty.value} value={specialty.value}>
                  {specialty.label}
                </SelectItem>
              ))}
            </SelectContent>
            </Select>
          </div>

          {/* Cidades */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Filtrar por Cidades
            </label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCityModalOpen(true)}
                className="flex items-center gap-2 w-full justify-start"
              >
                <Filter className="w-4 h-4" />
                Selecionar Cidades
                {data.selectedCities.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {data.selectedCities.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Cidades Selecionadas - Mostrar quando houver seleção */}
        {data.selectedCities.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Cidades Selecionadas:</label>
            <div className="flex flex-wrap gap-2">
              {data.selectedCities.map(city => (
                <Badge key={city} variant="default" className="flex items-center gap-1">
                  {city}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => {
                      const newCities = data.selectedCities.filter(c => c !== city);
                      onUpdate({ selectedCities: newCities });
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}


        {/* Busca por Endereço + Raio */}
        <div className="pt-4">
          <AddressRadiusSearch
            onResults={handleRadiusSearchResults}
            disabled={loading}
          />
        </div>

        {/* Indicador de Resultados e Filtros Ativos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                {filteredScreens.length} telas encontradas
              </span>
            </div>
            {(searchTerm || data.selectedSpecialties.length > 0 || data.selectedCities.length > 0 || (selectedCity && selectedCity !== "all") || radiusSearchActive) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Limpar todos os filtros
                  handleSearchTermChange("");
                  onUpdate({ selectedSpecialties: [], selectedCities: [] });
                  setSelectedCity("all");
                  setRadiusSearchActive(false);
                  setRadiusSearchResults([]);
                  
                  // Limpar todas as telas selecionadas
                  onUpdate({ selectedScreens: [] });
                  
                  toast.success("Filtros e telas selecionadas foram limpos");
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                Limpar filtros
              </Button>
            )}
          </div>

          {/* Filtros Ativos */}
          {(searchTerm || data.selectedSpecialties.length > 0 || data.selectedCities.length > 0 || (selectedCity && selectedCity !== "all") || radiusSearchActive) && (
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  Busca: "{searchTerm}"
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => handleSearchTermChange("")}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}
              
              {data.selectedSpecialties.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {availableSpecialties.find(s => s.value === data.selectedSpecialties[0])?.label}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => onUpdate({ selectedSpecialties: [] })}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}
              
              {data.selectedCities.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {data.selectedCities.length} cidade(s)
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => onUpdate({ selectedCities: [] })}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}
              
              {selectedCity && selectedCity !== "all" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Cidade: {selectedCity}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => setSelectedCity("all")}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}
              
              {radiusSearchActive && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Busca por endereço ({radiusSearchResults.length} telas)
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => {
                      setRadiusSearchActive(false);
                      setRadiusSearchResults([]);
                      onUpdate({ selectedScreens: [] });
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>


      {/* Lista de Telas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Telas Disponíveis ({filteredScreens.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredScreens.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhuma tela encontrada com os filtros aplicados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {filteredScreens.map(screen => {
                const isSelected = data.selectedScreens.includes(screen.id);
                
                return (
                  <Card
                    key={screen.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected 
                        ? 'ring-2 ring-primary border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleScreenSelection(screen.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">
                            {screen.code} - {screen.display_name}
                          </h4>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3" />
                            <span>{screen.city}, {screen.state}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-semibold">
                          {screen.class_name || 'ND'}
                        </Badge>
                        {screen.venue_id && (
                          <Badge variant="secondary" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            Venue
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
        
        {/* Botão Selecionar Todas as Telas */}
        {filteredScreens.length > 0 && (
          <div className="p-4 border-t bg-muted/30">
            <Button 
              onClick={handleSelectAllScreens}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Selecionar todas as telas ({filteredScreens.length})
            </Button>
          </div>
        )}
      </Card>

      {/* Resumo da Seleção */}
      {data.selectedScreens.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                Telas Selecionadas ({data.selectedScreens.length})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onUpdate({ selectedScreens: [] });
                  toast.success("Todas as telas selecionadas foram removidas");
                }}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                Limpar todas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(selectedScreensByLocation).map(([location, locationScreens]) => (
                <div key={location}>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-medium">{location}</span>
                    <Badge variant="secondary">{locationScreens.length} telas</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                    {locationScreens.map(screen => (
                      <div key={screen.id} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {screen.code} - {screen.display_name}
                            </span>
                            <Badge variant="outline" className="text-xs font-semibold shrink-0">
                              {screen.class_name || 'ND'}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {screen.city}, {screen.state}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleScreenSelection(screen.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0 ml-2"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.selectedScreens.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-700 text-sm">
            ⚠️ Selecione pelo menos uma tela para continuar.
          </p>
        </div>
      )}

      {/* Modal de Seleção de Cidades */}
      <CitySelectionModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        onConfirm={handleCitySelection}
        availableCities={getAvailableCitiesWithCount()}
        selectedCities={data.selectedCities}
      />
    </div>
  );
};