import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Monitor, 
  Search, 
  Filter,
  Plus,
  Edit,
  Eye,
  MapPin,
  Calendar,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Inventory = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const mockUser = {
    name: "João Silva",
    email: "joao@tvdoutorada.com",
    role: "Admin"
  };

  const [screens, setScreens] = useState([
    {
      id: 1,
      name: "Shopping Iguatemi - Entrada Principal",
      city: "São Paulo",
      location: "Av. Brigadeiro Faria Lima, 2232",
      type: "LED Outdoor",
      size: "6x4m",
      status: "active",
      lastUpdate: "2024-01-15",
      monthlyRate: 8500,
      occupancy: 85
    },
    {
      id: 2,
      name: "Terminal Rodoviário - Saguão Central",
      city: "Rio de Janeiro",
      location: "Av. Francisco Bicalho, 1",
      type: "LCD Indoor",
      size: "55\"",
      status: "active",
      lastUpdate: "2024-01-14",
      monthlyRate: 3200,
      occupancy: 92
    },
    {
      id: 3,
      name: "Posto Ipiranga - BR-101",
      city: "Salvador",
      location: "BR-101, Km 12",
      type: "LED Outdoor",
      size: "8x6m",
      status: "maintenance",
      lastUpdate: "2024-01-10",
      monthlyRate: 5500,
      occupancy: 0
    },
    {
      id: 4,
      name: "Farmácia Droga Raia - Centro",
      city: "São Paulo",
      location: "Rua Augusta, 1234",
      type: "LCD Indoor",
      size: "43\"",
      status: "active",
      lastUpdate: "2024-01-15",
      monthlyRate: 2800,
      occupancy: 78
    },
    {
      id: 5,
      name: "Metro Estação Sé - Plataforma",
      city: "São Paulo",
      location: "Praça da Sé, s/n",
      type: "LED Indoor",
      size: "4x3m",
      status: "inactive",
      lastUpdate: "2024-01-08",
      monthlyRate: 6200,
      occupancy: 0
    }
  ]);

  const cities = ["all", ...Array.from(new Set(screens.map(s => s.city)))];
  const statuses = ["all", "active", "inactive", "maintenance"];

  const filteredScreens = screens.filter(screen => {
    const matchesSearch = screen.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         screen.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = selectedCity === "all" || screen.city === selectedCity;
    const matchesStatus = selectedStatus === "all" || screen.status === selectedStatus;
    
    return matchesSearch && matchesCity && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "inactive": return "secondary";
      case "maintenance": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Ativo";
      case "inactive": return "Inativo";
      case "maintenance": return "Manutenção";
      default: return status;
    }
  };

  const totalScreens = screens.length;
  const activeScreens = screens.filter(s => s.status === "active").length;
  const totalRevenue = screens
    .filter(s => s.status === "active")
    .reduce((sum, s) => sum + (s.monthlyRate * s.occupancy / 100), 0);
  const avgOccupancy = screens
    .filter(s => s.status === "active")
    .reduce((sum, s) => sum + s.occupancy, 0) / activeScreens;

  return (
    <DashboardLayout user={mockUser}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Inventário</h1>
              <p className="text-muted-foreground">Gerencie todas as telas e pontos de mídia</p>
            </div>
          </div>

          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Tela
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Telas</p>
                  <p className="text-3xl font-bold">{totalScreens}</p>
                </div>
                <Monitor className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Telas Ativas</p>
                  <p className="text-3xl font-bold text-primary">{activeScreens}</p>
                  <p className="text-sm text-muted-foreground">
                    {((activeScreens / totalScreens) * 100).toFixed(1)}% do total
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Receita Mensal</p>
                  <p className="text-3xl font-bold text-secondary">
                    R$ {totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-sm text-secondary">
                    +12.5% vs mês anterior
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ocupação Média</p>
                  <p className="text-3xl font-bold text-accent">
                    {avgOccupancy.toFixed(1)}%
                  </p>
                  <p className="text-sm text-accent">
                    +5.2% vs mês anterior
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <CardTitle>Lista de Telas</CardTitle>
              
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar telas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="p-2 border rounded-md"
                >
                  <option value="all">Todas as cidades</option>
                  {cities.slice(1).map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="p-2 border rounded-md"
                >
                  <option value="all">Todos os status</option>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="maintenance">Manutenção</option>
                </select>
                
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tela</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ocupação</TableHead>
                  <TableHead>Valor Mensal</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScreens.map((screen) => (
                  <TableRow key={screen.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{screen.name}</p>
                        <p className="text-sm text-muted-foreground">{screen.size}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{screen.city}</p>
                          <p className="text-sm text-muted-foreground">{screen.location}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{screen.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(screen.status) as any}>
                        {getStatusLabel(screen.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{ width: `${screen.occupancy}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{screen.occupancy}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        R$ {screen.monthlyRate.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredScreens.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma tela encontrada com os filtros aplicados.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Inventory;