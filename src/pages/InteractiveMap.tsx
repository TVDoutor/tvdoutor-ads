import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Search, 
  Save, 
  Plus, 
  Minus, 
  Thermometer, 
  Map, 
  Satellite,
  Info,
  Download,
  FilePlus,
  Filter,
  X,
  Check,
  CheckCircle,
  MapPin,
  Star,
  Clock,
  MapPin as LocationIcon,
  Building,
  Users
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Interface para os dados reais da tabela screens
interface Screen {
  id: number;
  name: string | null;
  display_name: string | null;
  address_raw: string | null;
  address_norm: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  class: "A" | "B" | "C" | "D" | "E" | "ND";
  lat: number | null;
  lng: number | null;
  specialty: string[] | null;
  venue_type_parent: string | null;
  venue_type_child: string | null;
  venue_type_grandchildren: string | null;
  active: boolean | null;
  code: string | null;
  category: string | null;
  board_format: string | null;
  screen_start_time: string | null;
  screen_end_time: string | null;
  screen_facing: string | null;
  facing: string | null;
  asset_url: string | null;
  geom: unknown | null;
  venue_id: number | null;
  created_at: string | null;
  updated_at: string | null;
}

const InteractiveMap = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Estados para dados reais
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(new Set());
  
  // Estados para modal e filtros
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedScreenForDetails, setSelectedScreenForDetails] = useState<Screen | null>(null);
  
  // Estados para dados de filtros
  const [cities, setCities] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<Array<{name: string, count: number}>>([]);
  const [cpmRange, setCpmRange] = useState<{min: number, max: number}>({min: 0, max: 50});
  
  // Estados para filtros ativos
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  
  // Estados para zoom do mapa
  const [mapZoom, setMapZoom] = useState(1);
  
  // Estados existentes
  const [selectedScreens, setSelectedScreens] = useState<number[]>([]);
  const [currentInfoScreen, setCurrentInfoScreen] = useState<Screen | null>(null);
  const [infoWindowPosition, setInfoWindowPosition] = useState({ x: 0, y: 0 });
  const [heatmapVisible, setHeatmapVisible] = useState(false);
  const [mapView, setMapView] = useState<"map" | "satellite">("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState([0, 50]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [returnTo, setReturnTo] = useState<string | null>(null);

  // Filtros
  const [classFilters, setClassFilters] = useState({ A: true, B: true, C: true, D: true, E: true, ND: true });
  const [specialtyFilters, setSpecialtyFilters] = useState({
    shopping: false,
    hospital: false,
    airport: false,
    university: false,
    pharmacy: false,
    metro: false
  });

  // Buscar dados reais do Supabase
  useEffect(() => {
    fetchScreens();
    fetchFilterData();
  }, []);

  const fetchFilterData = async () => {
    try {
      // Buscar cidades e estados únicos
      const { data: locationData } = await supabase
        .from('screens')
        .select('city, state')
        .not('city', 'is', null)
        .not('state', 'is', null);

      if (locationData) {
        const uniqueCities = [...new Set(locationData.map(item => item.city).filter(Boolean))].sort();
        const uniqueStates = [...new Set(locationData.map(item => item.state).filter(Boolean))].sort();
        setCities(uniqueCities);
        setStates(uniqueStates);
      }

      // Buscar especialidades mais comuns
      const { data: specialtyData } = await supabase
        .from('screens')
        .select('specialty')
        .not('specialty', 'is', null);

      if (specialtyData) {
        const specialtyCounts: Record<string, number> = {};
        specialtyData.forEach(item => {
          if (item.specialty && Array.isArray(item.specialty)) {
            item.specialty.forEach(spec => {
              specialtyCounts[spec] = (specialtyCounts[spec] || 0) + 1;
            });
          }
        });

        const topSpecialties = Object.entries(specialtyCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));

        setSpecialties(topSpecialties);
      }

      // Buscar range de CPM
      const { data: cpmData } = await supabase
        .from('stg_billboard_data')
        .select('cpm')
        .not('cpm', 'is', null);

      if (cpmData && cpmData.length > 0) {
        const cpmValues = cpmData.map(item => item.cpm).filter(Boolean);
        const minCpm = Math.min(...cpmValues);
        const maxCpm = Math.max(...cpmValues);
        setCpmRange({ min: Math.floor(minCpm), max: Math.ceil(maxCpm) });
      }

    } catch (error) {
      console.error('Erro ao buscar dados de filtros:', error);
    }
  };

  const fetchScreens = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('screens')
        .select('*')
        .eq('active', true) // Apenas telas ativas
        .not('lat', 'is', null) // Apenas telas com coordenadas
        .not('lng', 'is', null);

      if (error) {
        throw error;
      }

      setScreens(data || []);
      
      toast({
        title: "Dados carregados",
        description: `${data?.length || 0} telas encontradas no mapa.`,
      });

    } catch (err) {
      console.error('Erro ao buscar telas:', err);
      setError('Erro ao carregar dados das telas');
      
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados das telas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Verificar se está em modo de seleção
  useEffect(() => {
    if (location.state?.selectMode) {
      setIsSelectMode(true);
      setReturnTo(location.state.returnTo);
    }
  }, [location.state]);

  const handleScreenClick = (screen: Screen, event: React.MouseEvent) => {
    setCurrentInfoScreen(screen);
    setInfoWindowPosition({
      x: event.pageX,
      y: event.pageY
    });
  };

  const handleShowDetails = (screen: Screen) => {
    setSelectedScreenForDetails(screen);
    setShowDetailsModal(true);
    setCurrentInfoScreen(null); // Fechar info window
  };

  const closeInfoWindow = () => {
    setCurrentInfoScreen(null);
  };

  const toggleScreenSelection = (screenId: number) => {
    setSelectedScreens(prev => 
      prev.includes(screenId) 
        ? prev.filter(id => id !== screenId)
        : [...prev, screenId]
    );
  };

  const getClassColor = (screenClass: string) => {
    switch (screenClass) {
      case "A": return "bg-secondary border-white";
      case "B": return "bg-primary border-white";
      case "C": return "bg-accent border-white";
      case "D": return "bg-orange-500 border-white";
      case "E": return "bg-red-500 border-white";
      case "ND": return "bg-gray-500 border-white";
      default: return "bg-muted border-white";
    }
  };

  const getPinSize = (screenClass: string) => {
    switch (screenClass) {
      case "A": return "w-6 h-6";
      case "B": return "w-5 h-5";
      case "C": return "w-4 h-4";
      case "D": return "w-4 h-4";
      case "E": return "w-3 h-3";
      case "ND": return "w-3 h-3";
      default: return "w-4 h-4";
    }
  };

  // Função para converter coordenadas para posição no mapa
  const getMapPosition = (lat: number, lng: number) => {
    // Coordenadas aproximadas do Brasil
    const brazilBounds = {
      north: 5.271786,
      south: -33.768377,
      east: -34.729993,
      west: -73.987235
    };

    // Converter latitude/longitude para posição percentual no mapa
    const latPercent = ((lat - brazilBounds.south) / (brazilBounds.north - brazilBounds.south)) * 100;
    const lngPercent = ((lng - brazilBounds.west) / (brazilBounds.east - brazilBounds.west)) * 100;

    return {
      top: `${Math.max(0, Math.min(100, latPercent))}%`,
      left: `${Math.max(0, Math.min(100, lngPercent))}%`
    };
  };

  // Função para agrupar pins próximos (clustering)
  const createClusters = (screens: Screen[], clusterRadius: number = 5) => {
    const clusters: Array<{
      center: { lat: number; lng: number };
      screens: Screen[];
      position: { top: string; left: string };
    }> = [];

    screens.forEach(screen => {
      if (!screen.lat || !screen.lng) return;

      // Verificar se a tela está próxima de algum cluster existente
      let addedToCluster = false;
      for (const cluster of clusters) {
        const distance = Math.sqrt(
          Math.pow(screen.lat - cluster.center.lat, 2) + 
          Math.pow(screen.lng - cluster.center.lng, 2)
        );

        if (distance < clusterRadius / 100) { // Converter para graus
          cluster.screens.push(screen);
          // Recalcular centro do cluster
          const avgLat = cluster.screens.reduce((sum, s) => sum + (s.lat || 0), 0) / cluster.screens.length;
          const avgLng = cluster.screens.reduce((sum, s) => sum + (s.lng || 0), 0) / cluster.screens.length;
          cluster.center = { lat: avgLat, lng: avgLng };
          cluster.position = getMapPosition(avgLat, avgLng);
          addedToCluster = true;
          break;
        }
      }

      // Se não foi adicionado a nenhum cluster, criar um novo
      if (!addedToCluster) {
        clusters.push({
          center: { lat: screen.lat, lng: screen.lng },
          screens: [screen],
          position: getMapPosition(screen.lat, screen.lng)
        });
      }
    });

    return clusters;
  };

  // Filtrar telas baseado nos filtros aplicados
  const filteredScreens = screens.filter(screen => {
    // Filtro por classe
    if (!classFilters[screen.class as keyof typeof classFilters]) {
      return false;
    }

    // Filtro por cidade
    if (selectedCity !== "all" && screen.city !== selectedCity) {
      return false;
    }

    // Filtro por estado
    if (selectedState !== "all" && screen.state !== selectedState) {
      return false;
    }

    // Filtro por especialidades
    if (selectedSpecialties.length > 0) {
      const screenSpecialties = screen.specialty || [];
      const hasMatchingSpecialty = selectedSpecialties.some(selected => 
        screenSpecialties.some(screenSpec => 
          screenSpec.toLowerCase().includes(selected.toLowerCase())
        )
      );
      if (!hasMatchingSpecialty) {
        return false;
      }
    }

    // Filtro por busca
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesName = screen.name?.toLowerCase().includes(searchLower);
      const matchesDisplayName = screen.display_name?.toLowerCase().includes(searchLower);
      const matchesAddress = screen.address_raw?.toLowerCase().includes(searchLower);
      const matchesAddressNorm = screen.address_norm?.toLowerCase().includes(searchLower);
      const matchesCity = screen.city?.toLowerCase().includes(searchLower);
      const matchesState = screen.state?.toLowerCase().includes(searchLower);
      const matchesCode = screen.code?.toLowerCase().includes(searchLower);
      
      if (!matchesName && !matchesDisplayName && !matchesAddress && !matchesAddressNorm && 
          !matchesCity && !matchesState && !matchesCode) {
        return false;
      }
    }

    return true;
  });

  // Calcular clusters baseado nos filtros
  const clusters = createClusters(filteredScreens, 3); // 3% de raio de cluster

  const calculateTotals = () => {
    const selectedScreensData = screens.filter(screen => selectedScreens.includes(screen.id));
    
    const classCounts = selectedScreensData.reduce((acc, screen) => {
      acc[screen.class] = (acc[screen.class] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: selectedScreens.length,
      classA: classCounts.A || 0,
      classB: classCounts.B || 0,
      classC: classCounts.C || 0,
      classD: classCounts.D || 0,
      classE: classCounts.E || 0,
      classND: classCounts.ND || 0
    };
  };

  const totals = calculateTotals();

  const handleSaveSelection = () => {
    if (selectedScreens.length === 0) {
      toast({
        title: "Nenhuma seleção",
        description: "Nenhuma tela selecionada para salvar.",
        variant: "destructive"
      });
      return;
    }
    console.log("Salvando seleção:", selectedScreens);
    toast({
      title: "Seleção salva",
      description: `${selectedScreens.length} telas selecionadas.`,
    });
  };

  const handleExportSelection = () => {
    if (selectedScreens.length === 0) {
      toast({
        title: "Nenhuma seleção",
        description: "Nenhuma tela selecionada para exportar.",
        variant: "destructive"
      });
      return;
    }
    console.log("Exportando seleção:", selectedScreens);
    toast({
      title: "Exportando",
      description: "Exportando lista de telas selecionadas...",
    });
  };

  const handleCreateProposal = () => {
    if (selectedScreens.length === 0) {
      toast({
        title: "Nenhuma seleção",
        description: "Selecione pelo menos uma tela para criar uma proposta.",
        variant: "destructive"
      });
      return;
    }
    
    const selectedScreensData = screens.filter(screen => selectedScreens.includes(screen.id));
    
    if (isSelectMode && returnTo) {
      navigate(returnTo, { 
        state: { 
          selectedScreens: selectedScreensData 
        } 
      });
    } else {
      navigate("/nova-proposta", { 
        state: { 
          selectedScreens: selectedScreensData 
        } 
      });
    }
  };

  const handleConfirmSelection = () => {
    if (selectedScreens.length === 0) {
      toast({
        title: "Nenhuma seleção",
        description: "Selecione pelo menos uma tela para continuar.",
        variant: "destructive"
      });
      return;
    }
    
    const selectedScreensData = screens.filter(screen => selectedScreens.includes(screen.id));
    
    if (returnTo) {
      navigate(returnTo, { 
        state: { 
          selectedScreens: selectedScreensData 
        } 
      });
    } else {
      navigate("/nova-proposta", { 
        state: { 
          selectedScreens: selectedScreensData 
        } 
      });
    }
  };

  const handleCancelSelection = () => {
    if (returnTo) {
      navigate(returnTo);
    } else {
      navigate("/");
    }
  };

  const handleZoomIn = () => {
    setMapZoom(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setMapZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleResetZoom = () => {
    setMapZoom(1);
  };

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="flex h-screen -m-6">
          {/* Sidebar Esquerda - Filtros */}
          <div className="w-80 bg-card shadow-lg overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {isSelectMode ? "Seleção de Telas" : "Filtros"}
                </h2>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate("/")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </div>

              {isSelectMode && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 mt-1" />
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">Modo de Seleção</h4>
                        <p className="text-sm text-blue-700">
                          Clique nas telas para selecioná-las para sua proposta
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {loading && (
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                      <span className="text-sm text-yellow-800">Carregando dados...</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {error && (
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <X className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-800">{error}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Indicador de Filtros Ativos */}
              {(selectedCity !== "all" || selectedState !== "all" || selectedSpecialties.length > 0 || 
                searchQuery || !Object.values(classFilters).every(Boolean)) && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Filter className="w-4 h-4 text-blue-600 mt-1" />
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-900 mb-2">Filtros Ativos</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedCity !== "all" && (
                            <Badge variant="secondary" className="text-xs">
                              Cidade: {selectedCity}
                            </Badge>
                          )}
                          {selectedState !== "all" && (
                            <Badge variant="secondary" className="text-xs">
                              Estado: {selectedState}
                            </Badge>
                          )}
                          {selectedSpecialties.map(specialty => (
                            <Badge key={specialty} variant="secondary" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                          {searchQuery && (
                            <Badge variant="secondary" className="text-xs">
                              Busca: "{searchQuery}"
                            </Badge>
                          )}
                          {Object.entries(classFilters)
                            .filter(([, active]) => !active)
                            .map(([classKey]) => (
                              <Badge key={classKey} variant="outline" className="text-xs">
                                Classe {classKey} oculta
                              </Badge>
                            ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, endereço, cidade, estado ou código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-6 w-6"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {/* Filtros de Localização */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Localização</Label>
                <div className="space-y-3">
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as cidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as cidades ({cities.length})</SelectItem>
                      {cities.map(city => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os estados ({states.length})</SelectItem>
                      {states.map(state => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Filtros de Classe */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Classe</Label>
                <div className="space-y-2">
                  {Object.entries(classFilters).map(([classKey, checked]) => (
                    <div key={classKey} className="flex items-center space-x-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(checked) => 
                          setClassFilters(prev => ({ ...prev, [classKey]: checked as boolean }))
                        }
                      />
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 ${getClassColor(classKey)} rounded-full`}></div>
                        <span className="text-sm">Classe {classKey}</span>
                        <span className="text-xs text-muted-foreground">
                          ({screens.filter(s => s.class === classKey).length})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filtros de Especialidade */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Especialidades</Label>
                <div className="space-y-2">
                  {specialties.map((specialty, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedSpecialties.includes(specialty.name)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedSpecialties(prev => [...prev, specialty.name]);
                          } else {
                            setSelectedSpecialties(prev => prev.filter(s => s !== specialty.name));
                          }
                        }}
                      />
                      <span className="text-sm">{specialty.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">({specialty.count})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filtros de Preço */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Faixa de Preço (CPM)</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs">R$ {priceRange[0]}</span>
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      max={cpmRange.max}
                      min={cpmRange.min}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs">R$ {priceRange[1]}</span>
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    Range: R$ {cpmRange.min} - R$ {cpmRange.max}
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2">
                <Button className="w-full" onClick={fetchScreens}>
                  Atualizar Dados
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setExpandedClusters(new Set());
                    setSearchQuery("");
                    setClassFilters({ A: true, B: true, C: true, D: true, E: true, ND: true });
                    setSelectedCity("all");
                    setSelectedState("all");
                    setSelectedSpecialties([]);
                    setPriceRange([cpmRange.min, cpmRange.max]);
                  }}
                >
                  Limpar Filtros
                </Button>
                {expandedClusters.size > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setExpandedClusters(new Set())}
                  >
                    Contrair Todos os Clusters
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Área do Mapa */}
          <div className="flex-1 relative">
            {/* Controles do Mapa */}
            <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
              <Card>
                <CardContent className="p-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-none border-b"
                    onClick={handleZoomIn}
                    disabled={mapZoom >= 3}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-none border-b"
                    onClick={handleZoomOut}
                    disabled={mapZoom <= 0.5}
                  >
                    <Minus className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-none"
                    onClick={handleResetZoom}
                    disabled={mapZoom === 1}
                    title="Reset Zoom"
                  >
                    <Map className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-0">
                  <Button 
                    variant={heatmapVisible ? "default" : "ghost"} 
                    size="icon"
                    onClick={() => setHeatmapVisible(!heatmapVisible)}
                    title="Toggle Heatmap"
                  >
                    <Thermometer className="w-5 h-5" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Toggle de Visualização */}
            <div className="absolute top-4 right-4 z-10">
              <Card>
                <CardContent className="p-1 flex">
                  <Button
                    variant={mapView === "map" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setMapView("map")}
                  >
                    <Map className="w-4 h-4 mr-1" />
                    Mapa
                  </Button>
                  <Button
                    variant={mapView === "satellite" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setMapView("satellite")}
                  >
                    <Satellite className="w-4 h-4 mr-1" />
                    Satélite
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Legenda */}
            <Card className="absolute bottom-4 left-4 z-10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Legenda</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-secondary rounded-full border-2 border-white shadow"></div>
                  <span className="text-xs">Classe A - Premium</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-primary rounded-full border-2 border-white shadow"></div>
                  <span className="text-xs">Classe B - Padrão</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-accent rounded-full border-2 border-white shadow"></div>
                  <span className="text-xs">Classe C - Básico</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow"></div>
                  <span className="text-xs">Classe D</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow"></div>
                  <span className="text-xs">Classe E</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-white shadow ring-2 ring-yellow-300"></div>
                  <span className="text-xs">Selecionado</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-yellow-500 rounded-full border-2 border-white shadow flex items-center justify-center text-white text-xs font-bold"></div>
                  <span className="text-xs">Cluster (múltiplas telas)</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="text-xs text-muted-foreground">
                    <div>Total: {screens.length} telas</div>
                    <div>Clusters: {clusters.length}</div>
                    <div>Expandidos: {expandedClusters.size}</div>
                    <div>Zoom: {Math.round(mapZoom * 100)}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contador de Seleção */}
            <Card className="absolute bottom-4 right-4 z-10">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{totals.total}</div>
                <div className="text-xs text-muted-foreground mb-2">Telas Selecionadas</div>
                <div className="text-lg font-semibold">{filteredScreens.length}</div>
                <div className="text-xs text-muted-foreground">
                  {filteredScreens.length === screens.length ? 'Total no Mapa' : `${filteredScreens.length} de ${screens.length} telas`}
                </div>
                {filteredScreens.length !== screens.length && (
                  <div className="text-xs text-blue-600 mt-1">
                    Filtros aplicados
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mapa Principal */}
            <div 
              className="w-full h-full bg-gradient-to-br from-blue-100 via-green-50 to-blue-50 relative overflow-hidden cursor-crosshair transition-transform duration-200"
              style={{ transform: `scale(${mapZoom})` }}
              onClick={closeInfoWindow}
            >
              {/* Pins reais das telas */}
              {clusters.map((cluster, index) => {
                const isExpanded = expandedClusters.has(index);
                
                return (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute cursor-pointer"
                        style={{ top: cluster.position.top, left: cluster.position.left }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (cluster.screens.length === 1) {
                            handleScreenClick(cluster.screens[0], e);
                          } else if (cluster.screens.length > 1) {
                            // Expandir/contrair cluster
                            setExpandedClusters(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(index)) {
                                newSet.delete(index);
                              } else {
                                newSet.add(index);
                              }
                              return newSet;
                            });
                          }
                        }}
                      >
                        {cluster.screens.length === 1 ? (
                          <div 
                            className={`
                              ${getPinSize(cluster.screens[0].class)} 
                              ${getClassColor(cluster.screens[0].class)} 
                              rounded-full border-2 shadow-lg 
                              hover:scale-125 transition-transform
                              ${selectedScreens.includes(cluster.screens[0].id) ? 'ring-4 ring-yellow-300 scale-125' : ''}
                            `}
                          />
                        ) : (
                          <div 
                            className={`w-8 h-8 bg-yellow-500 rounded-full border-2 shadow-lg flex items-center justify-center text-white text-xs font-bold hover:scale-110 transition-transform ${
                              isExpanded ? 'ring-4 ring-yellow-300' : ''
                            }`}
                          >
                            {cluster.screens.length}
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        {cluster.screens.length === 1 ? (
                          <>
                            <p className="font-medium text-sm">
                              {cluster.screens[0].display_name || cluster.screens[0].name || `Tela ${cluster.screens[0].code || cluster.screens[0].id}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {cluster.screens[0].address_raw || cluster.screens[0].address_norm || 'Endereço não informado'}
                            </p>
                            <p className="text-xs">
                              <span className="font-medium">Classe:</span> {cluster.screens[0].class}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-sm">{cluster.screens.length} telas</p>
                            <p className="text-xs text-muted-foreground">
                              {isExpanded ? 'Clique para contrair' : 'Clique para expandir'}
                            </p>
                            <p className="text-xs">
                              <span className="font-medium">Classes:</span> {Array.from(new Set(cluster.screens.map(s => s.class))).join(', ')}
                            </p>
                          </>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {/* Pins expandidos de clusters */}
              {clusters.map((cluster, index) => {
                const isExpanded = expandedClusters.has(index);
                
                if (!isExpanded || cluster.screens.length <= 1) return null;
                
                return cluster.screens.map((screen, screenIndex) => {
                  if (!screen.lat || !screen.lng) return null;
                  
                  const position = getMapPosition(screen.lat, screen.lng);
                  const offset = screenIndex * 20; // Offset para separar os pins
                  
                  return (
                    <Tooltip key={`expanded-${index}-${screen.id}`}>
                      <TooltipTrigger asChild>
                        <div
                          className="absolute cursor-pointer animate-in fade-in duration-200"
                          style={{ 
                            top: `calc(${position.top} + ${offset}px)`, 
                            left: `calc(${position.left} + ${offset}px)` 
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleScreenClick(screen, e);
                          }}
                        >
                          <div 
                            className={`
                              ${getPinSize(screen.class)} 
                              ${getClassColor(screen.class)} 
                              rounded-full border-2 shadow-lg 
                              hover:scale-125 transition-transform
                              ${selectedScreens.includes(screen.id) ? 'ring-4 ring-yellow-300 scale-125' : ''}
                            `}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">
                            {screen.display_name || screen.name || `Tela ${screen.code || screen.id}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {screen.address_raw || screen.address_norm || 'Endereço não informado'}
                          </p>
                          <p className="text-xs">
                            <span className="font-medium">Classe:</span> {screen.class}
                          </p>
                          {screen.specialty && screen.specialty.length > 0 && (
                            <p className="text-xs">
                              <span className="font-medium">Especialidade:</span> {screen.specialty.join(', ')}
                            </p>
                          )}
                          <p className="text-xs">
                            <span className="font-medium">Cidade:</span> {screen.city || 'Não informada'}
                          </p>
                          <p className="text-xs">
                            <span className="font-medium">Estado:</span> {screen.state || 'Não informado'}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                });
              })}

              {/* Heatmap overlay */}
              {heatmapVisible && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute w-32 h-32 bg-red-500 rounded-full opacity-30 blur-xl" style={{ top: "30%", left: "40%" }}></div>
                  <div className="absolute w-24 h-24 bg-orange-500 rounded-full opacity-30 blur-xl" style={{ top: "60%", left: "55%" }}></div>
                  <div className="absolute w-20 h-20 bg-yellow-500 rounded-full opacity-30 blur-lg" style={{ top: "55%", left: "48%" }}></div>
                </div>
              )}
            </div>

            {/* Info Window */}
            {currentInfoScreen && (
              <Card 
                className="absolute z-20 w-80 shadow-xl"
                style={{
                  left: Math.min(infoWindowPosition.x - 160, window.innerWidth - 320),
                  top: Math.max(infoWindowPosition.y - 100, 50)
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {currentInfoScreen.display_name || currentInfoScreen.name || `Tela ${currentInfoScreen.code || currentInfoScreen.id}`}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {currentInfoScreen.address_raw || currentInfoScreen.address_norm || 'Endereço não informado'}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={closeInfoWindow}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Classe</p>
                      <p className="font-medium">{currentInfoScreen.class}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Código</p>
                      <p className="font-medium">{currentInfoScreen.code || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cidade</p>
                      <p className="font-medium">{currentInfoScreen.city || 'Não informada'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Estado</p>
                      <p className="font-medium">{currentInfoScreen.state || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CEP</p>
                      <p className="font-medium">{currentInfoScreen.cep || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="font-medium text-secondary">
                        {currentInfoScreen.active ? 'Ativa' : 'Inativa'}
                      </p>
                    </div>
                  </div>
                  
                  {currentInfoScreen.specialty && currentInfoScreen.specialty.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Especialidades</p>
                      <div className="flex flex-wrap gap-1">
                        {currentInfoScreen.specialty.map((specialty, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentInfoScreen.venue_type_parent && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tipo de Local</p>
                      <p className="text-sm">{currentInfoScreen.venue_type_parent}</p>
                      {currentInfoScreen.venue_type_child && (
                        <p className="text-xs text-muted-foreground">{currentInfoScreen.venue_type_child}</p>
                      )}
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <Button 
                      className="flex-1" 
                      onClick={() => toggleScreenSelection(currentInfoScreen.id)}
                    >
                      {selectedScreens.includes(currentInfoScreen.id) 
                        ? "Remover da Seleção" 
                        : "Adicionar à Seleção"
                      }
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleShowDetails(currentInfoScreen)}
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar Direita - Telas Selecionadas */}
          <div className="w-80 bg-card shadow-lg overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {isSelectMode ? "Seleção para Proposta" : "Seleção"}
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-600 hover:text-red-800"
                  onClick={() => setSelectedScreens([])}
                >
                  Limpar Tudo
                </Button>
              </div>
              
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {selectedScreens.length > 0 ? (
                  selectedScreens.map(screenId => {
                    const screen = screens.find(s => s.id === screenId);
                    return screen ? (
                      <Card key={screenId}>
                        <CardContent className="p-3">
                          <div className="flex items-start space-x-3">
                            <div className={`w-3 h-3 ${getClassColor(screen.class)} rounded-full mt-1.5`}></div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium truncate">
                                {screen.display_name || screen.name || `Tela ${screen.code || screen.id}`}
                              </h4>
                              <p className="text-xs text-muted-foreground truncate">
                                {screen.address_raw || screen.address_norm || 'Endereço não informado'}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-muted-foreground">
                                  Classe {screen.class} • {screen.city || 'N/A'}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-red-500 hover:text-red-700"
                                  onClick={() => toggleScreenSelection(screenId)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : null;
                  })
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Info className="w-12 h-12 mx-auto mb-4 text-muted" />
                    <p className="text-sm">Nenhuma tela selecionada</p>
                    <p className="text-xs mt-1">Clique nas telas no mapa para selecioná-las</p>
                  </div>
                )}
              </div>

              {/* Resumo da Seleção */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Resumo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total de telas:</span>
                    <span className="font-medium">{totals.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Classe A:</span>
                    <span className="font-medium">{totals.classA}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Classe B:</span>
                    <span className="font-medium">{totals.classB}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Classe C:</span>
                    <span className="font-medium">{totals.classC}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Classe D:</span>
                    <span className="font-medium">{totals.classD}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Classe E:</span>
                    <span className="font-medium">{totals.classE}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Classe ND:</span>
                    <span className="font-medium">{totals.classND}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Ações */}
              <div className="space-y-2">
                {isSelectMode ? (
                  <>
                    <Button className="w-full" onClick={handleConfirmSelection}>
                      <Check className="w-4 h-4 mr-2" />
                      Confirmar Seleção
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleCancelSelection}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button className="w-full" onClick={handleSaveSelection}>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Seleção
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleExportSelection}>
                      <Download className="w-4 h-4 mr-2" />
                      Exportar Lista
                    </Button>
                    <Button variant="secondary" className="w-full" onClick={handleCreateProposal}>
                      <FilePlus className="w-4 h-4 mr-2" />
                      Criar Proposta
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>

      {/* Modal de Detalhes da Tela */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              Detalhes da Tela
            </DialogTitle>
          </DialogHeader>
          
          {selectedScreenForDetails && (
            <div className="space-y-6">
              {/* Header da Tela */}
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">
                      {selectedScreenForDetails.display_name || selectedScreenForDetails.name || `Tela ${selectedScreenForDetails.code || selectedScreenForDetails.id}`}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedScreenForDetails.address_raw || selectedScreenForDetails.address_norm || 'Endereço não informado'}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        Classe {selectedScreenForDetails.class}
                      </Badge>
                      <Badge variant={selectedScreenForDetails.active ? "default" : "destructive"} className="text-xs">
                        {selectedScreenForDetails.active ? 'Ativa' : 'Inativa'}
                      </Badge>
                      {selectedScreenForDetails.code && (
                        <Badge variant="outline" className="text-xs">
                          {selectedScreenForDetails.code}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleScreenSelection(selectedScreenForDetails.id)}
                  >
                    {selectedScreens.includes(selectedScreenForDetails.id) 
                      ? "Remover da Seleção" 
                      : "Adicionar à Seleção"
                    }
                  </Button>
                </div>
              </div>

              {/* Informações de Localização */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <LocationIcon className="w-4 h-4" />
                    Localização
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Cidade</Label>
                      <p className="text-sm font-medium">{selectedScreenForDetails.city || 'Não informada'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Estado</Label>
                      <p className="text-sm font-medium">{selectedScreenForDetails.state || 'Não informado'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">CEP</Label>
                      <p className="text-sm font-medium">{selectedScreenForDetails.cep || 'Não informado'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Coordenadas</Label>
                      <p className="text-sm font-medium">
                        {selectedScreenForDetails.lat && selectedScreenForDetails.lng 
                          ? `${selectedScreenForDetails.lat.toFixed(4)}, ${selectedScreenForDetails.lng.toFixed(4)}`
                          : 'Não informadas'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Especialidades */}
              {selectedScreenForDetails.specialty && selectedScreenForDetails.specialty.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Especialidades
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedScreenForDetails.specialty.map((specialty, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tipo de Local */}
              {selectedScreenForDetails.venue_type_parent && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Tipo de Local
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Categoria Principal</Label>
                      <p className="text-sm font-medium">{selectedScreenForDetails.venue_type_parent}</p>
                    </div>
                    {selectedScreenForDetails.venue_type_child && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Subcategoria</Label>
                        <p className="text-sm font-medium">{selectedScreenForDetails.venue_type_child}</p>
                      </div>
                    )}
                    {selectedScreenForDetails.venue_type_grandchildren && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Especificação</Label>
                        <p className="text-sm font-medium">{selectedScreenForDetails.venue_type_grandchildren}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Informações Técnicas */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Informações Técnicas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedScreenForDetails.board_format && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Formato</Label>
                        <p className="text-sm font-medium">{selectedScreenForDetails.board_format}</p>
                      </div>
                    )}
                    {selectedScreenForDetails.screen_facing && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Orientação</Label>
                        <p className="text-sm font-medium">{selectedScreenForDetails.screen_facing}</p>
                      </div>
                    )}
                    {selectedScreenForDetails.facing && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Direção</Label>
                        <p className="text-sm font-medium">{selectedScreenForDetails.facing}</p>
                      </div>
                    )}
                    {selectedScreenForDetails.category && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Categoria</Label>
                        <p className="text-sm font-medium">{selectedScreenForDetails.category}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Horários de Funcionamento */}
              {(selectedScreenForDetails.screen_start_time || selectedScreenForDetails.screen_end_time) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Horários de Funcionamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedScreenForDetails.screen_start_time && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Início</Label>
                          <p className="text-sm font-medium">{selectedScreenForDetails.screen_start_time}</p>
                        </div>
                      )}
                      {selectedScreenForDetails.screen_end_time && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Fim</Label>
                          <p className="text-sm font-medium">{selectedScreenForDetails.screen_end_time}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Ações */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    toggleScreenSelection(selectedScreenForDetails.id);
                    setShowDetailsModal(false);
                  }}
                >
                  {selectedScreens.includes(selectedScreenForDetails.id) 
                    ? "Remover da Seleção" 
                    : "Adicionar à Seleção"
                  }
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default InteractiveMap;

