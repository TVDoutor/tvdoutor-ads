import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, Eye, Edit, Monitor, Building, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Screen {
  id: number;
  code: string;
  name: string;
  display_name: string;
  city: string;
  state: string;
  address_raw: string;
  class: string;
  active: boolean;
  venue_type_parent: string;
  venue_type_child: string;
  venue_type_grandchildren: string;
  specialty: string[];
}

const Inventory = () => {
  const { toast } = useToast();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [filteredScreens, setFilteredScreens] = useState<Screen[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Mock user - será substituído por autenticação real
  const mockUser = {
    name: "João Silva",
    email: "joao@tvdoutorada.com",
    role: "Admin"
  };

  useEffect(() => {
    fetchScreens();
  }, []);

  useEffect(() => {
    filterScreens();
  }, [searchTerm, statusFilter, typeFilter, screens]);

  const fetchScreens = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('screens')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setScreens(data || []);
    } catch (err: any) {
      console.error('Error fetching screens:', err);
      setError(err.message);
      
      if (err.message?.includes('JWT') || err.message?.includes('auth')) {
        toast({
          title: "Erro de Autenticação",
          description: "Você precisa estar logado para ver o inventário.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível carregar o inventário.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const filterScreens = () => {
    let filtered = screens;

    if (searchTerm) {
      filtered = filtered.filter(screen => {
        const screenName = `${screen.name || ''} ${screen.display_name || ''}`.toLowerCase();
        const location = `${screen.address_raw || ''} ${screen.city || ''} ${screen.state || ''}`.toLowerCase();
        
        return screenName.includes(searchTerm.toLowerCase()) ||
               location.includes(searchTerm.toLowerCase()) ||
               (screen.code && screen.code.toLowerCase().includes(searchTerm.toLowerCase()));
      });
    }

    if (statusFilter !== "all") {
      if (statusFilter === "ativa") {
        filtered = filtered.filter(screen => screen.active === true);
      } else if (statusFilter === "inativa") {
        filtered = filtered.filter(screen => screen.active === false);
      }
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(screen => screen.class === typeFilter);
    }

    setFilteredScreens(filtered);
  };

  const getDisplayName = (screen: Screen) => {
    return `${screen.name || ''} ${screen.display_name || ''}`.trim() || 'Tela sem nome';
  };

  const getLocation = (screen: Screen) => {
    const parts = [screen.address_raw, screen.city, screen.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Localização não informada';
  };

  const getStatusBadge = (active: boolean) => {
    return active ? (
      <Badge variant="default">Ativa</Badge>
    ) : (
      <Badge variant="secondary">Inativa</Badge>
    );
  };

  const getUniqueClasses = () => {
    const classes = screens.map(screen => screen.class).filter(Boolean);
    return [...new Set(classes)];
  };

  if (error && !loading) {
    return (
      <DashboardLayout user={mockUser}>
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Erro ao Carregar</h3>
                <p className="text-muted-foreground mb-4">
                  Não foi possível carregar o inventário. Verifique sua conexão e tente novamente.
                </p>
                <Button onClick={fetchScreens}>
                  Tentar Novamente
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={mockUser}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Monitor className="h-6 w-6 text-primary" />
              Inventário
            </h1>
            <p className="text-muted-foreground">
              Gerencie todas as telas do sistema
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary-soft flex items-center justify-center">
                  <Monitor className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {loading ? "..." : screens.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Total de Telas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Building className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {loading ? "..." : screens.filter(s => s.active === true).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Telas Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {loading ? "..." : screens.filter(s => s.active === false).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Telas Inativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, localização ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ativa">Ativas</SelectItem>
                    <SelectItem value="inativa">Inativas</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Classe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {getUniqueClasses().map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Telas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tela</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Especialidades</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  filteredScreens.map((screen) => (
                    <TableRow key={screen.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{getDisplayName(screen)}</p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {screen.code || `ID: ${screen.id}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getLocation(screen)}</TableCell>
                      <TableCell>{getStatusBadge(screen.active)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{screen.class || "N/A"}</Badge>
                      </TableCell>
                      <TableCell>
                        {screen.specialty && screen.specialty.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {screen.specialty.slice(0, 2).map((spec, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                            {screen.specialty.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{screen.specialty.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {!loading && filteredScreens.length === 0 && (
              <div className="text-center py-8">
                <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm || statusFilter !== "all" || typeFilter !== "all" 
                    ? "Nenhuma tela encontrada"
                    : "Nenhuma tela cadastrada"
                  }
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                    ? "Tente ajustar os filtros de busca."
                    : "Quando houver telas cadastradas, elas aparecerão aqui."
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Inventory;