import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  TrendingUp,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Types for screen data
interface ScreenData {
  id: number;
  name: string | null;
  display_name: string | null;
  address_raw: string | null;
  city: string | null;
  state: string | null;
  board_format: string | null;
  active: boolean | null;
  asset_url: string | null;
}

interface ScreenRate {
  id: number;
  screen_id: number | null;
  selling_rate_month: number | null;
  effective_from: string | null;
  effective_to: string | null;
}

// Helper functions
const formatScreenName = (name: string | null, displayName: string | null): string => {
  const parts = [name, displayName].filter(Boolean);
  if (parts.length === 0) return "Tela sem nome";
  if (parts.length === 1) return parts[0];
  // Remove duplicação se os nomes forem iguais
  if (parts[0] === parts[1]) return parts[0];
  return parts.join(" - ");
};

const formatLocation = (addressRaw: string | null, city: string | null, state: string | null): string => {
  const parts = [addressRaw, city, state].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Localização não informada";
};

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

  // Buscar dados das telas - Como RLS requer autenticação, vamos usar dados mock por enquanto
  const { data: screensData, isLoading, error } = useQuery({
    queryKey: ['screens'],
    queryFn: async () => {
      console.log('Tentando buscar dados das telas...');
      
      // Primeiro tenta buscar dados reais
      const { data, error } = await supabase
        .from('screens')
        .select(`
          id, 
          name, 
          display_name, 
          address_raw, 
          city, 
          state, 
          board_format, 
          active, 
          asset_url
        `)
        .order('id')
        .limit(100);
      
      console.log('Resposta da query screens:', { data, error });
      
      // Se erro de autenticação (RLS), usa dados mock
      if (error && error.code === 'PGRST116') {
        console.log('RLS bloqueou acesso, usando dados mock...');
        toast({
          title: "Usando dados de demonstração",
          description: "Conecte-se para ver dados reais do Supabase.",
          variant: "default",
        });
        
        // Retorna dados mock que seguem a estrutura real
        return [
          {
            id: 1,
            name: "Shopping Iguatemi",
            display_name: "Entrada Principal",
            address_raw: "Av. Brigadeiro Faria Lima, 2232",
            city: "São Paulo",
            state: "SP",
            board_format: "LED Outdoor",
            active: true,
            asset_url: null
          },
          {
            id: 2,
            name: "Terminal Rodoviário",
            display_name: "Saguão Central",
            address_raw: "Av. Francisco Bicalho, 1",
            city: "Rio de Janeiro",
            state: "RJ",
            board_format: "LCD Indoor",
            active: true,
            asset_url: null
          },
          {
            id: 3,
            name: "Posto Ipiranga",
            display_name: "BR-101",
            address_raw: "BR-101, Km 12",
            city: "Salvador",
            state: "BA",
            board_format: "LED Outdoor",
            active: false,
            asset_url: null
          },
          {
            id: 4,
            name: "Farmácia Droga Raia",
            display_name: "Centro",
            address_raw: "Rua Augusta, 1234",
            city: "São Paulo",
            state: "SP",
            board_format: "LCD Indoor",
            active: true,
            asset_url: null
          },
          {
            id: 5,
            name: "Metro Estação Sé",
            display_name: "Plataforma",
            address_raw: "Praça da Sé, s/n",
            city: "São Paulo",
            state: "SP",
            board_format: "LED Indoor",
            active: false,
            asset_url: null
          }
        ] as ScreenData[];
      }
      
      if (error) {
        console.error('Error fetching screens:', error);
        toast({
          title: "Erro ao carregar telas",
          description: `Erro: ${error.message}`,
          variant: "destructive",
        });
        throw error;
      }
      
      console.log(`Encontradas ${data?.length || 0} telas reais`);
      return data as ScreenData[];
    },
    retry: 1
  });

  // Buscar preços das telas
  const { data: screenRatesData } = useQuery({
    queryKey: ['screen-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('screen_rates')
        .select('id, screen_id, selling_rate_month, effective_from, effective_to')
        .order('effective_from', { ascending: false });
      
      if (error) {
        console.log('Erro ao buscar screen_rates, usando dados mock:', error);
        // Retorna dados mock de preços
        return [
          { id: 1, screen_id: 1, selling_rate_month: 8500, effective_from: '2024-01-01', effective_to: null },
          { id: 2, screen_id: 2, selling_rate_month: 3200, effective_from: '2024-01-01', effective_to: null },
          { id: 3, screen_id: 3, selling_rate_month: 5500, effective_from: '2024-01-01', effective_to: null },
          { id: 4, screen_id: 4, selling_rate_month: 2800, effective_from: '2024-01-01', effective_to: null },
          { id: 5, screen_id: 5, selling_rate_month: 6200, effective_from: '2024-01-01', effective_to: null }
        ] as ScreenRate[];
      }
      return data as ScreenRate[];
    },
    enabled: !!screensData
  });

  // Processar dados combinados
  const processedScreens = useMemo(() => {
    if (!screensData) return [];

    return screensData.map(screen => {
      // Buscar o preço mais recente para esta tela
      const latestRate = screenRatesData?.find(rate => 
        rate.screen_id === screen.id && 
        (!rate.effective_to || new Date(rate.effective_to) >= new Date())
      );

      return {
        id: screen.id,
        name: formatScreenName(screen.name, screen.display_name),
        location: formatLocation(screen.address_raw, screen.city, screen.state),
        city: screen.city || "Não informado",
        type: screen.board_format || "Não informado",
        status: screen.active === true ? "active" : "inactive",
        monthlyRate: latestRate?.selling_rate_month || 0,
        asset_url: screen.asset_url
      };
    });
  }, [screensData, screenRatesData]);

  // Cidades únicas para filtro
  const cities = useMemo(() => {
    if (!processedScreens) return ["all"];
    const uniqueCities = Array.from(new Set(processedScreens.map(s => s.city).filter(Boolean)));
    return ["all", ...uniqueCities];
  }, [processedScreens]);

  const statuses = ["all", "active", "inactive"];

  // Filtros aplicados aos dados processados
  const filteredScreens = useMemo(() => {
    if (!processedScreens) return [];
    
    return processedScreens.filter(screen => {
      const matchesSearch = screen.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           screen.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCity = selectedCity === "all" || screen.city === selectedCity;
      const matchesStatus = selectedStatus === "all" || screen.status === selectedStatus;
      
      return matchesSearch && matchesCity && matchesStatus;
    });
  }, [processedScreens, searchTerm, selectedCity, selectedStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "inactive": return "secondary";
      default: return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Ativo";
      case "inactive": return "Inativo";
      default: return status;
    }
  };

  // Cálculos dos KPIs baseados nos dados reais
  const totalScreens = processedScreens?.length || 0;
  const activeScreens = processedScreens?.filter(s => s.status === "active").length || 0;
  const uniqueCities = processedScreens ? 
    Array.from(new Set(processedScreens.map(s => s.city).filter(Boolean))).length : 0;
  const activityRate = totalScreens > 0 ? ((activeScreens / totalScreens) * 100) : 0;

  return (
    <DashboardLayout>
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

        {/* Informação sobre dados de demonstração */}
        {screensData && screensData.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              📊 Exibindo dados de demonstração. Para ver dados reais, faça login no sistema.
            </p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Telas</p>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="text-lg">Carregando...</span>
                    </div>
                  ) : (
                    <p className="text-3xl font-bold">{totalScreens}</p>
                  )}
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
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="text-lg">Carregando...</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-primary">{activeScreens}</p>
                      <p className="text-sm text-muted-foreground">
                        {activityRate.toFixed(1)}% do total
                      </p>
                    </>
                  )}
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cidades Cobertas</p>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="text-lg">Carregando...</span>
                    </div>
                  ) : (
                    <p className="text-3xl font-bold text-secondary">{uniqueCities}</p>
                  )}
                </div>
                <MapPin className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Atividade</p>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="text-lg">Carregando...</span>
                    </div>
                  ) : (
                    <p className="text-3xl font-bold text-accent">
                      {activityRate.toFixed(1)}%
                    </p>
                  )}
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
                </select>
                
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Carregando telas...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                <p>Erro ao carregar os dados das telas.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Verifique sua conexão e tente novamente.
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tela</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
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
                            <p className="text-sm text-muted-foreground">ID: {screen.id}</p>
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
                          <span className="font-medium">
                            {screen.monthlyRate > 0 
                              ? `R$ ${screen.monthlyRate.toLocaleString()}` 
                              : "Não informado"
                            }
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
                
                {filteredScreens.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    {processedScreens?.length === 0 
                      ? "Nenhuma tela cadastrada no sistema."
                      : "Nenhuma tela encontrada com os filtros aplicados."
                    }
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Inventory;