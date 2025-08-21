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
  CheckCircle
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
import { useNavigate, useLocation } from "react-router-dom";

interface Screen {
  id: number;
  name: string;
  address: string;
  class: "A" | "B" | "C";
  cpm: number;
  audience: number;
  monthlyRate: number;
  specialties: string[];
  availability: string;
  position: { top: string; left: string };
}

const mockScreens: Screen[] = [
  {
    id: 1,
    name: "Shopping Vila Olímpia - Hall Principal",
    address: "Av. das Nações Unidas, 14401 - Vila Olímpia, São Paulo",
    class: "A",
    cpm: 12.50,
    audience: 45000,
    monthlyRate: 3500,
    specialties: ["Shopping", "Alto Tráfego"],
    availability: "Disponível",
    position: { top: "42%", left: "48%" }
  },
  {
    id: 2,
    name: "Hospital Albert Einstein - Recepção",
    address: "Av. Albert Einstein, 627 - Morumbi, São Paulo",
    class: "A",
    cpm: 15.00,
    audience: 28000,
    monthlyRate: 4200,
    specialties: ["Hospital", "Saúde"],
    availability: "Disponível",
    position: { top: "38%", left: "46%" }
  },
  {
    id: 3,
    name: "Aeroporto Congonhas - Terminal",
    address: "Av. Washington Luís, s/n - Vila Congonhas, São Paulo",
    class: "A",
    cpm: 18.00,
    audience: 85000,
    monthlyRate: 5400,
    specialties: ["Aeroporto", "Alto Tráfego"],
    availability: "Disponível",
    position: { top: "55%", left: "44%" }
  },
  {
    id: 4,
    name: "Shopping Morumbi - Praça de Alimentação",
    address: "Av. Roque Petroni Júnior, 1089 - Morumbi, São Paulo",
    class: "B",
    cpm: 8.75,
    audience: 32000,
    monthlyRate: 2400,
    specialties: ["Shopping", "Alimentação"],
    availability: "Disponível",
    position: { top: "48%", left: "42%" }
  },
  {
    id: 5,
    name: "Universidade Mackenzie - Hall Central",
    address: "R. da Consolação, 930 - Consolação, São Paulo",
    class: "B",
    cpm: 6.50,
    audience: 18000,
    monthlyRate: 1800,
    specialties: ["Universidade", "Educação"],
    availability: "Disponível",
    position: { top: "32%", left: "43%" }
  },
  {
    id: 6,
    name: "Farmácia São Paulo - Fachada",
    address: "R. Augusta, 1254 - Consolação, São Paulo",
    class: "C",
    cpm: 5.20,
    audience: 12000,
    monthlyRate: 1200,
    specialties: ["Farmácia", "Saúde"],
    availability: "Disponível",
    position: { top: "45%", left: "52%" }
  },
  {
    id: 7,
    name: "Estação Metrô Paulista - Platform",
    address: "Av. Paulista, 1000 - Bela Vista, São Paulo",
    class: "C",
    cpm: 4.80,
    audience: 95000,
    monthlyRate: 1600,
    specialties: ["Transporte", "Alto Tráfego"],
    availability: "Disponível",
    position: { top: "40%", left: "47%" }
  }
];

const InteractiveMap = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [classFilters, setClassFilters] = useState({ A: true, B: true, C: true });
  const [specialtyFilters, setSpecialtyFilters] = useState({
    shopping: false,
    hospital: false,
    airport: false,
    university: false,
    pharmacy: false,
    metro: false
  });

  // Mock user
  const mockUser = {
    name: "João Silva",
    email: "joao@tvdoutorada.com",
    role: "Admin"
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
      default: return "bg-muted border-white";
    }
  };

  const getPinSize = (screenClass: string) => {
    switch (screenClass) {
      case "A": return "w-6 h-6";
      case "B": return "w-5 h-5";
      case "C": return "w-4 h-4";
      default: return "w-4 h-4";
    }
  };

  const calculateTotals = () => {
    const selectedScreensData = mockScreens.filter(screen => selectedScreens.includes(screen.id));
    const totalValue = selectedScreensData.reduce((sum, screen) => sum + screen.monthlyRate, 0);
    
    const classCounts = selectedScreensData.reduce((acc, screen) => {
      acc[screen.class] = (acc[screen.class] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: selectedScreens.length,
      totalValue,
      classA: classCounts.A || 0,
      classB: classCounts.B || 0,
      classC: classCounts.C || 0
    };
  };

  const totals = calculateTotals();

  const handleSaveSelection = () => {
    if (selectedScreens.length === 0) {
      alert("Nenhuma tela selecionada para salvar.");
      return;
    }
    console.log("Salvando seleção:", selectedScreens);
    alert(`Seleção salva com sucesso!\n${selectedScreens.length} telas selecionadas.`);
  };

  const handleExportSelection = () => {
    if (selectedScreens.length === 0) {
      alert("Nenhuma tela selecionada para exportar.");
      return;
    }
    console.log("Exportando seleção:", selectedScreens);
    alert("Exportando lista de telas selecionadas...");
  };

  const handleCreateProposal = () => {
    if (selectedScreens.length === 0) {
      alert("Selecione pelo menos uma tela para criar uma proposta.");
      return;
    }
    
    const selectedScreensData = mockScreens.filter(screen => selectedScreens.includes(screen.id));
    
    if (isSelectMode && returnTo) {
      // Retornar para a página de proposta com as telas selecionadas
      navigate(returnTo, { 
        state: { 
          selectedScreens: selectedScreensData 
        } 
      });
    } else {
      // Navegar para nova proposta
      navigate("/nova-proposta", { 
        state: { 
          selectedScreens: selectedScreensData 
        } 
      });
    }
  };

  const handleConfirmSelection = () => {
    if (selectedScreens.length === 0) {
      alert("Selecione pelo menos uma tela para continuar.");
      return;
    }
    
    const selectedScreensData = mockScreens.filter(screen => selectedScreens.includes(screen.id));
    
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

  return (
    <DashboardLayout>
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
            
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar localização..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtros de Localização */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Localização</Label>
              <div className="space-y-3">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as cidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as cidades</SelectItem>
                    <SelectItem value="sp">São Paulo</SelectItem>
                    <SelectItem value="rj">Rio de Janeiro</SelectItem>
                    <SelectItem value="bh">Belo Horizonte</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os estados</SelectItem>
                    <SelectItem value="sp">São Paulo</SelectItem>
                    <SelectItem value="rj">Rio de Janeiro</SelectItem>
                    <SelectItem value="mg">Minas Gerais</SelectItem>
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
                        ({mockScreens.filter(s => s.class === classKey).length})
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
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={specialtyFilters.shopping}
                    onCheckedChange={(checked) => 
                      setSpecialtyFilters(prev => ({ ...prev, shopping: checked as boolean }))
                    }
                  />
                  <span className="text-sm">Shopping Centers</span>
                  <span className="text-xs text-muted-foreground ml-auto">(245)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={specialtyFilters.hospital}
                    onCheckedChange={(checked) => 
                      setSpecialtyFilters(prev => ({ ...prev, hospital: checked as boolean }))
                    }
                  />
                  <span className="text-sm">Hospitais</span>
                  <span className="text-xs text-muted-foreground ml-auto">(89)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={specialtyFilters.airport}
                    onCheckedChange={(checked) => 
                      setSpecialtyFilters(prev => ({ ...prev, airport: checked as boolean }))
                    }
                  />
                  <span className="text-sm">Aeroportos</span>
                  <span className="text-xs text-muted-foreground ml-auto">(34)</span>
                </div>
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
                    max={50}
                    min={0}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-xs">R$ {priceRange[1]}</span>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="space-y-2">
              <Button className="w-full">
                Aplicar Filtros
              </Button>
              <Button variant="outline" className="w-full">
                Limpar Filtros
              </Button>
            </div>
          </div>
        </div>

        {/* Área do Mapa */}
        <div className="flex-1 relative">
          {/* Controles do Mapa */}
          <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
            <Card>
              <CardContent className="p-0">
                <Button variant="ghost" size="icon" className="rounded-none border-b">
                  <Plus className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-none">
                  <Minus className="w-5 h-5" />
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
                <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-white shadow ring-2 ring-yellow-300"></div>
                <span className="text-xs">Selecionado</span>
              </div>
            </CardContent>
          </Card>

          {/* Contador de Seleção */}
          <Card className="absolute bottom-4 right-4 z-10">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{totals.total}</div>
              <div className="text-xs text-muted-foreground mb-2">Telas Selecionadas</div>
              <div className="text-lg font-semibold">R$ {totals.totalValue.toLocaleString('pt-BR')}</div>
              <div className="text-xs text-muted-foreground">Estimativa Total</div>
            </CardContent>
          </Card>

          {/* Mapa Principal */}
          <div 
            className="w-full h-full bg-gradient-to-br from-blue-100 via-green-50 to-blue-50 relative overflow-hidden cursor-crosshair"
            onClick={closeInfoWindow}
          >
            {/* Cluster São Paulo Centro */}
            <div className="absolute animate-pulse" style={{ top: "35%", left: "45%" }}>
              <div className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center text-sm font-bold shadow-lg cursor-pointer hover:scale-110 transition-transform">
                25
              </div>
            </div>

            {/* Pins individuais */}
            {mockScreens.map((screen) => (
              <div
                key={screen.id}
                className="absolute cursor-pointer"
                style={{ top: screen.position.top, left: screen.position.left }}
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
                  title={screen.name}
                />
              </div>
            ))}

            {/* Clusters adicionais */}
            <div className="absolute animate-pulse" style={{ top: "65%", left: "60%" }}>
              <div className="bg-primary text-white rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold shadow-lg cursor-pointer hover:scale-110 transition-transform">
                18
              </div>
            </div>

            <div className="absolute animate-pulse" style={{ top: "58%", left: "52%" }}>
              <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold shadow-lg cursor-pointer hover:scale-110 transition-transform">
                12
              </div>
            </div>

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
                    <CardTitle className="text-base">{currentInfoScreen.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{currentInfoScreen.address}</p>
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
                    <p className="text-xs text-muted-foreground">CPM</p>
                    <p className="font-medium">R$ {currentInfoScreen.cpm.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Audiência/mês</p>
                    <p className="font-medium">{currentInfoScreen.audience.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Disponibilidade</p>
                    <p className="font-medium text-secondary">{currentInfoScreen.availability}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Especialidades</p>
                  <div className="flex flex-wrap gap-1">
                    {currentInfoScreen.specialties.map((specialty, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
                
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
                  <Button variant="outline">
                    Detalhes
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
                  const screen = mockScreens.find(s => s.id === screenId);
                  return screen ? (
                    <Card key={screenId}>
                      <CardContent className="p-3">
                        <div className="flex items-start space-x-3">
                          <div className={`w-3 h-3 ${getClassColor(screen.class)} rounded-full mt-1.5`}></div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium truncate">{screen.name}</h4>
                            <p className="text-xs text-muted-foreground truncate">{screen.address}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                R$ {screen.monthlyRate.toLocaleString('pt-BR')}/mês
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
                <div className="border-t pt-2 mt-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Estimativa Total:</span>
                    <span className="font-bold text-primary">
                      R$ {totals.totalValue.toLocaleString('pt-BR')}
                    </span>
                  </div>
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
    </DashboardLayout>
  );
};

export default InteractiveMap;

