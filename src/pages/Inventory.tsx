import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Search, Filter, Eye, Edit, Monitor, Building, AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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
  const { profile, isAdmin, isManager } = useAuth();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [filteredScreens, setFilteredScreens] = useState<Screen[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null);
  const [saving, setSaving] = useState(false);

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

  const handleViewScreen = (screen: Screen) => {
    setSelectedScreen(screen);
    setViewModalOpen(true);
  };

  const handleEditScreen = (screen: Screen) => {
    if (!isAdmin() && !isManager()) {
      toast({
        title: "Acesso Negado",
        description: "Você não tem permissão para editar telas.",
        variant: "destructive",
      });
      return;
    }
    setEditingScreen({ ...screen });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingScreen || !isAdmin() && !isManager()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('screens')
        .update({
          name: editingScreen.name,
          display_name: editingScreen.display_name,
          city: editingScreen.city,
          state: editingScreen.state,
          address_raw: editingScreen.address_raw,
          class: editingScreen.class,
          active: editingScreen.active,
          venue_type_parent: editingScreen.venue_type_parent,
          venue_type_child: editingScreen.venue_type_child,
          venue_type_grandchildren: editingScreen.venue_type_grandchildren,
          specialty: editingScreen.specialty,
        })
        .eq('id', editingScreen.id);

      if (error) {
        throw error;
      }

      // Atualizar a lista local
      setScreens(screens.map(screen => 
        screen.id === editingScreen.id ? editingScreen : screen
      ));

      toast({
        title: "Sucesso",
        description: "Tela atualizada com sucesso!",
      });

      setEditModalOpen(false);
      setEditingScreen(null);
    } catch (err: any) {
      console.error('Error updating screen:', err);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a tela.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateEditingScreen = (field: keyof Screen, value: any) => {
    if (!editingScreen) return;
    setEditingScreen({ ...editingScreen, [field]: value });
  };

  if (error && !loading) {
    return (
      <DashboardLayout>
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
    <DashboardLayout>
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
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewScreen(screen)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(isAdmin() || isManager()) && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditScreen(screen)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
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

        {/* Modal de Visualização */}
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Detalhes da Tela
              </DialogTitle>
            </DialogHeader>
            {selectedScreen && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Nome da Tela</Label>
                    <p className="text-sm">{getDisplayName(selectedScreen)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Código</Label>
                    <p className="text-sm font-mono">{selectedScreen.code || `ID: ${selectedScreen.id}`}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div>{getStatusBadge(selectedScreen.active)}</div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Classe</Label>
                    <Badge variant="outline">{selectedScreen.class || "N/A"}</Badge>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Endereço Completo</Label>
                    <p className="text-sm">{getLocation(selectedScreen)}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Cidade</Label>
                      <p className="text-sm">{selectedScreen.city || "N/A"}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Estado</Label>
                      <p className="text-sm">{selectedScreen.state || "N/A"}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Tipo Principal</Label>
                      <p className="text-sm">{selectedScreen.venue_type_parent || "N/A"}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Subtipo</Label>
                      <p className="text-sm">{selectedScreen.venue_type_child || "N/A"}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Categoria</Label>
                      <p className="text-sm">{selectedScreen.venue_type_grandchildren || "N/A"}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Especialidades</Label>
                    {selectedScreen.specialty && selectedScreen.specialty.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedScreen.specialty.map((spec, index) => (
                          <Badge key={index} variant="secondary">{spec}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhuma especialidade cadastrada</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewModalOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Edição */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Editar Tela
              </DialogTitle>
            </DialogHeader>
            {editingScreen && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={editingScreen.name || ''}
                      onChange={(e) => updateEditingScreen('name', e.target.value)}
                      placeholder="Nome da tela"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="display_name">Nome de Exibição</Label>
                    <Input
                      id="display_name"
                      value={editingScreen.display_name || ''}
                      onChange={(e) => updateEditingScreen('display_name', e.target.value)}
                      placeholder="Nome de exibição"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Textarea
                    id="address"
                    value={editingScreen.address_raw || ''}
                    onChange={(e) => updateEditingScreen('address_raw', e.target.value)}
                    placeholder="Endereço completo"
                    rows={2}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={editingScreen.city || ''}
                      onChange={(e) => updateEditingScreen('city', e.target.value)}
                      placeholder="Cidade"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={editingScreen.state || ''}
                      onChange={(e) => updateEditingScreen('state', e.target.value)}
                      placeholder="Estado"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="class">Classe</Label>
                  <Input
                    id="class"
                    value={editingScreen.class || ''}
                    onChange={(e) => updateEditingScreen('class', e.target.value)}
                    placeholder="Classe da tela"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="venue_parent">Tipo Principal</Label>
                    <Input
                      id="venue_parent"
                      value={editingScreen.venue_type_parent || ''}
                      onChange={(e) => updateEditingScreen('venue_type_parent', e.target.value)}
                      placeholder="Tipo principal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="venue_child">Subtipo</Label>
                    <Input
                      id="venue_child"
                      value={editingScreen.venue_type_child || ''}
                      onChange={(e) => updateEditingScreen('venue_type_child', e.target.value)}
                      placeholder="Subtipo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="venue_grandchildren">Categoria</Label>
                    <Input
                      id="venue_grandchildren"
                      value={editingScreen.venue_type_grandchildren || ''}
                      onChange={(e) => updateEditingScreen('venue_type_grandchildren', e.target.value)}
                      placeholder="Categoria"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="specialty">Especialidades (separadas por vírgula)</Label>
                  <Textarea
                    id="specialty"
                    value={editingScreen.specialty ? editingScreen.specialty.join(', ') : ''}
                    onChange={(e) => {
                      const specialties = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      updateEditingScreen('specialty', specialties);
                    }}
                    placeholder="Digite as especialidades separadas por vírgula"
                    rows={2}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={editingScreen.active}
                    onCheckedChange={(checked) => updateEditingScreen('active', checked)}
                  />
                  <Label htmlFor="active">Tela Ativa</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setEditModalOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveEdit}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Inventory;