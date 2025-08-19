import React, { useState } from "react";
import { Tags, MapPin, MousePointer, Monitor, Filter, Grid3X3, List, MonitorOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

type SelectionMethod = "specialty" | "radius" | "manual";

interface Screen {
  id: number;
  name: string;
  address: string;
  class: "A" | "B" | "C";
  cpm: number;
  audience: number;
  monthlyRate: number;
  specialty: string;
  available: boolean;
}

const mockScreens: Screen[] = [
  {
    id: 1,
    name: "Shopping ABC - Hall Principal",
    address: "Av. Paulista, 1000 - São Paulo",
    class: "A",
    cpm: 12.50,
    audience: 45000,
    monthlyRate: 3500,
    specialty: "Shopping",
    available: true
  },
  {
    id: 2,
    name: "Hospital Central - Recepção",
    address: "R. das Flores, 500 - São Paulo",
    class: "B",
    cpm: 8.75,
    audience: 28000,
    monthlyRate: 2400,
    specialty: "Hospital",
    available: true
  },
  {
    id: 3,
    name: "Farmácia Popular - Entrada",
    address: "R. do Comércio, 200 - São Paulo",
    class: "C",
    cpm: 5.20,
    audience: 15000,
    monthlyRate: 1200,
    specialty: "Farmácia",
    available: true
  },
  {
    id: 4,
    name: "Aeroporto - Terminal 1",
    address: "Aeroporto Int. - Guarulhos",
    class: "A",
    cpm: 18.00,
    audience: 85000,
    monthlyRate: 5400,
    specialty: "Aeroporto",
    available: true
  }
];

const specialties = [
  { id: "shopping", name: "Shopping Centers", count: 245 },
  { id: "hospital", name: "Hospitais", count: 89 },
  { id: "airport", name: "Aeroportos", count: 34 },
  { id: "university", name: "Universidades", count: 67 },
  { id: "pharmacy", name: "Farmácias", count: 156 },
  { id: "metro", name: "Estações Metrô", count: 78 }
];

export const LocationSelection: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<SelectionMethod>("specialty");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedScreens, setSelectedScreens] = useState<number[]>([]);
  const [radius, setRadius] = useState([10]);
  const [centralAddress, setCentralAddress] = useState("");

  const handleSpecialtyChange = (specialtyId: string, checked: boolean) => {
    if (checked) {
      setSelectedSpecialties(prev => [...prev, specialtyId]);
    } else {
      setSelectedSpecialties(prev => prev.filter(id => id !== specialtyId));
    }
  };

  const handleScreenToggle = (screenId: number) => {
    setSelectedScreens(prev => 
      prev.includes(screenId) 
        ? prev.filter(id => id !== screenId)
        : [...prev, screenId]
    );
  };

  const calculateTotals = () => {
    let totalScreens = 0;
    let totalValue = 0;

    if (selectedMethod === "specialty") {
      selectedSpecialties.forEach(specialtyId => {
        const specialty = specialties.find(s => s.id === specialtyId);
        if (specialty) {
          totalScreens += specialty.count;
          totalValue += specialty.count * 1500; // Valor médio simulado
        }
      });
    } else if (selectedMethod === "radius") {
      totalScreens = 23; // Simulado
      totalValue = 67500; // Simulado
    } else if (selectedMethod === "manual") {
      totalScreens = selectedScreens.length;
      totalValue = selectedScreens.reduce((sum, screenId) => {
        const screen = mockScreens.find(s => s.id === screenId);
        return sum + (screen?.monthlyRate || 0);
      }, 0);
    }

    return { totalScreens, totalValue };
  };

  const { totalScreens, totalValue } = calculateTotals();

  const getClassColor = (screenClass: string) => {
    switch (screenClass) {
      case "A": return "bg-secondary";
      case "B": return "bg-primary";
      case "C": return "bg-accent";
      default: return "bg-muted";
    }
  };

  const renderMethodSelector = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <Button
        variant={selectedMethod === "specialty" ? "default" : "outline"}
        className={`p-6 h-auto text-left justify-start ${
          selectedMethod === "specialty" ? "border-primary bg-primary-soft" : ""
        }`}
        onClick={() => setSelectedMethod("specialty")}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Tags className="w-8 h-8 text-primary" />
            {selectedMethod === "specialty" && (
              <Badge variant="default" className="text-xs">Recomendado</Badge>
            )}
          </div>
          <div>
            <h3 className="font-semibold mb-2">Por Especialidades</h3>
            <p className="text-sm text-muted-foreground">
              Selecione locais baseado nas especialidades das telas (shoppings, hospitais, etc.)
            </p>
          </div>
        </div>
      </Button>

      <Button
        variant={selectedMethod === "radius" ? "default" : "outline"}
        className={`p-6 h-auto text-left justify-start ${
          selectedMethod === "radius" ? "border-primary bg-primary-soft" : ""
        }`}
        onClick={() => setSelectedMethod("radius")}
      >
        <div className="space-y-3">
          <MapPin className="w-8 h-8 text-primary" />
          <div>
            <h3 className="font-semibold mb-2">Por Raio Geográfico</h3>
            <p className="text-sm text-muted-foreground">
              Defina um ponto central e raio em km para selecionar automaticamente as telas
            </p>
          </div>
        </div>
      </Button>

      <Button
        variant={selectedMethod === "manual" ? "default" : "outline"}
        className={`p-6 h-auto text-left justify-start ${
          selectedMethod === "manual" ? "border-primary bg-primary-soft" : ""
        }`}
        onClick={() => setSelectedMethod("manual")}
      >
        <div className="space-y-3">
          <MousePointer className="w-8 h-8 text-primary" />
          <div>
            <h3 className="font-semibold mb-2">Seleção Manual</h3>
            <p className="text-sm text-muted-foreground">
              Navegue pelo inventário e selecione individualmente cada tela desejada
            </p>
          </div>
        </div>
      </Button>
    </div>
  );

  const renderSpecialtySelection = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Selecione as Especialidades</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {specialties.map((specialty) => (
            <div 
              key={specialty.id}
              className="flex items-center p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
              onClick={() => handleSpecialtyChange(specialty.id, !selectedSpecialties.includes(specialty.id))}
            >
              <Checkbox
                checked={selectedSpecialties.includes(specialty.id)}
                onCheckedChange={(checked) => handleSpecialtyChange(specialty.id, !!checked)}
                className="mr-3"
              />
              <div>
                <div className="font-medium">{specialty.name}</div>
                <div className="text-sm text-muted-foreground">{specialty.count} telas disponíveis</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros Adicionais */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base">Filtros Adicionais</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cidade</Label>
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
            </div>
            <div>
              <Label>Classe</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as classes</SelectItem>
                  <SelectItem value="a">Classe A</SelectItem>
                  <SelectItem value="b">Classe B</SelectItem>
                  <SelectItem value="c">Classe C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview das Telas Selecionadas */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Telas Correspondentes</h3>
        <Card>
          <CardContent className="p-4">
            {selectedSpecialties.length > 0 ? (
              <div className="space-y-3">
                {selectedSpecialties.map(specialtyId => {
                  const specialty = specialties.find(s => s.id === specialtyId);
                  return specialty ? (
                    <div key={specialtyId} className="flex items-center justify-between p-3 bg-card rounded border">
                      <span className="text-sm font-medium">{specialty.name}</span>
                      <span className="text-sm text-muted-foreground">{specialty.count} telas</span>
                    </div>
                  ) : null;
                })}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Monitor className="w-12 h-12 mx-auto mb-4 text-muted" />
                <p>Selecione uma especialidade para ver as telas disponíveis</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-blue-700">Total de telas selecionadas:</span>
              <span className="font-semibold text-blue-900">{totalScreens}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700">Estimativa de investimento:</span>
              <span className="font-semibold text-blue-900">R$ {totalValue.toLocaleString('pt-BR')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderRadiusSelection = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Definir Localização e Raio</h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="address">Endereço Central</Label>
            <Input
              id="address"
              placeholder="Digite um endereço ou clique no mapa"
              value={centralAddress}
              onChange={(e) => setCentralAddress(e.target.value)}
            />
          </div>
          
          <div>
            <Label>Raio de Cobertura</Label>
            <div className="flex items-center space-x-4 mt-2">
              <Slider
                value={radius}
                onValueChange={setRadius}
                max={50}
                min={1}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-medium bg-muted px-3 py-1 rounded">
                {radius[0]} km
              </span>
            </div>
          </div>
        </div>

        {/* Mapa Placeholder */}
        <Card>
          <CardContent className="p-0">
            <div className="h-64 bg-gradient-to-br from-blue-50 to-green-50 relative overflow-hidden rounded-lg">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Mapa Interativo</p>
                </div>
              </div>
              {/* Círculo de raio simulado */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-primary rounded-full opacity-50"></div>
              {/* Pin central */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Telas no Raio Selecionado</h3>
        <Card>
          <CardContent className="p-0 max-h-96 overflow-y-auto">
            {mockScreens.map((screen, index) => (
              <div key={screen.id} className={`p-4 flex items-center justify-between ${index !== mockScreens.length - 1 ? 'border-b' : ''}`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 ${getClassColor(screen.class)} rounded-full`}></div>
                  <div>
                    <p className="font-medium text-sm">{screen.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Classe {screen.class} • {Math.floor(Math.random() * 3) + 0.5}km do centro
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">Incluída</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-green-700">Telas encontradas no raio:</span>
              <span className="font-semibold text-green-900">23 telas</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-green-700">Investimento estimado:</span>
              <span className="font-semibold text-green-900">R$ 67.500</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderManualSelection = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Inventário Disponível</h3>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon">
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon">
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4">
          <Select>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todas as cidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as cidades</SelectItem>
              <SelectItem value="sp">São Paulo</SelectItem>
              <SelectItem value="rj">Rio de Janeiro</SelectItem>
            </SelectContent>
          </Select>
          
          <Select>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todas as classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as classes</SelectItem>
              <SelectItem value="a">Classe A</SelectItem>
              <SelectItem value="b">Classe B</SelectItem>
              <SelectItem value="c">Classe C</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Mais filtros
          </Button>
        </div>

        {/* Grid de Telas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {mockScreens.map((screen) => (
            <Card 
              key={screen.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedScreens.includes(screen.id) ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleScreenToggle(screen.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <Checkbox
                    checked={selectedScreens.includes(screen.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant={screen.class === 'A' ? 'default' : screen.class === 'B' ? 'secondary' : 'outline'}>
                        {screen.class}
                      </Badge>
                      <h4 className="font-medium text-sm">{screen.name}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{screen.address}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">CPM: R$ {screen.cpm.toFixed(2)}</span>
                      <span className="text-muted-foreground">
                        Audiência: {(screen.audience / 1000).toFixed(0)}k/mês
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Sidebar de Telas Selecionadas */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Telas Selecionadas</h3>
        <Card>
          <CardContent className="p-4 max-h-80 overflow-y-auto">
            {selectedScreens.length > 0 ? (
              <div className="space-y-2">
                {selectedScreens.map(screenId => {
                  const screen = mockScreens.find(s => s.id === screenId);
                  return screen ? (
                    <div key={screenId} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                      <span className="truncate">{screen.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleScreenToggle(screenId);
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ) : null;
                })}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <MonitorOff className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Nenhuma tela selecionada</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Total de telas:</span>
                <span className="font-semibold text-blue-900">{totalScreens}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Estimativa:</span>
                <span className="font-semibold text-blue-900">R$ {totalValue.toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderMethodContent = () => {
    switch (selectedMethod) {
      case "specialty":
        return renderSpecialtySelection();
      case "radius":
        return renderRadiusSelection();
      case "manual":
        return renderManualSelection();
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seleção de Locais</CardTitle>
        <p className="text-muted-foreground">Escolha os locais onde sua campanha será exibida</p>
      </CardHeader>
      <CardContent className="space-y-8">
        {renderMethodSelector()}
        {renderMethodContent()}
      </CardContent>
    </Card>
  );
};

