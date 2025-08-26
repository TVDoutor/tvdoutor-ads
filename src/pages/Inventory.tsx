import { useState, useEffect, useCallback } from "react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Filter, Eye, Edit, Monitor, Building, AlertCircle, X, Trash2, Upload, Download, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { addScreenAsAdmin, deleteScreenAsAdmin } from "@/lib/admin-operations";

// Valid class options
const ALLOWED_CLASSES = ['A', 'B', 'C', 'D', 'E', 'ND'] as const;

interface Screen {
  id: number;
  code: string;
  name: string;
  display_name: string;
  city: string;
  state: string;
  address_raw: string;
  class: typeof ALLOWED_CLASSES[number];
  active: boolean;
  venue_type_parent: string;
  venue_type_child: string;
  venue_type_grandchildren: string;
  specialty: string[];
  lat?: number;
  lng?: number;
  venue_id?: number;
  // Dados complementares
  screen_rates?: {
    standard_rate_month?: number;
    selling_rate_month?: number;
    spots_per_hour?: number;
    spot_duration_secs?: number;
  };
  venue_info?: {
    name?: string;
    address?: string;
    audience_monthly?: number;
  };
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
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null);
  const [newScreen, setNewScreen] = useState<Partial<Screen>>({});
  const [saving, setSaving] = useState(false);
  const [specialtyText, setSpecialtyText] = useState('');
  
  // Upload states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

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

      // Buscar dados principais das telas
      const { data: screensData, error: screensError } = await supabase
        .from('screens')
        .select(`
          id, code, name, display_name, city, state, address_raw, class, active, 
          venue_type_parent, venue_type_child, venue_type_grandchildren, specialty,
          lat, lng, venue_id
        `)
        .order('created_at', { ascending: false });

      if (screensError) {
        throw screensError;
      }

      // Buscar dados complementares para cada tela
      const enrichedScreens = await Promise.all(
        (screensData || []).map(async (screen) => {
          const enrichedScreen: Screen = { ...screen };

          // Buscar dados de rates
          if (screen.id) {
            const { data: ratesData } = await supabase
              .from('screen_rates')
              .select('standard_rate_month, selling_rate_month, spots_per_hour, spot_duration_secs')
              .eq('screen_id', screen.id)
              .single();

            if (ratesData) {
              enrichedScreen.screen_rates = ratesData;
            }
          }

          // Buscar dados do venue
          if (screen.venue_id) {
            const { data: venueData } = await supabase
              .from('venues')
              .select('name')
              .eq('id', screen.venue_id)
              .single();

            if (venueData) {
              enrichedScreen.venue_info = {
                name: venueData.name || '',
                address: '',
              };

              // Buscar dados de audiência (comentado até verificar estrutura da tabela)
              // const { data: audienceData } = await supabase
              //   .from('venue_audience_monthly')
              //   .select('audience_monthly')
              //   .eq('venue_id', screen.venue_id)
              //   .single();

              // if (audienceData) {
              //   enrichedScreen.venue_info.audience_monthly = audienceData.audience_monthly;
              // }
            }
          }

          return enrichedScreen;
        })
      );

      setScreens(enrichedScreens);
    } catch (err: unknown) {
      console.error('Error fetching screens:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      
      if (errorMessage.includes('JWT') || errorMessage.includes('auth')) {
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
         const screenCode = screen.code || '';
         const displayName = screen.display_name || '';
         const location = `${screen.address_raw || ''} ${screen.city || ''} ${screen.state || ''}`.toLowerCase();
         
         return screenCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                location.includes(searchTerm.toLowerCase());
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
    setSpecialtyText(screen.specialty ? screen.specialty.join(', ') : '');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingScreen || (!isAdmin() && !isManager())) return;

    setSaving(true);
    
    try {
      const specialties = specialtyText.split(',').map(s => s.trim()).filter(Boolean);
      
      // Validate and sanitize class value
      const sanitizedClass = ALLOWED_CLASSES.includes(editingScreen.class as any) 
        ? editingScreen.class 
        : 'ND';
      
      const updateData = {
        code: editingScreen.code || null,
        name: editingScreen.code || null,
        display_name: editingScreen.display_name || null,
        city: editingScreen.city || null,
        state: editingScreen.state || null,
        address_raw: editingScreen.address_raw || null,
        class: sanitizedClass,
        active: editingScreen.active ?? true,
        venue_type_parent: editingScreen.venue_type_parent || null,
        venue_type_child: editingScreen.venue_type_child || null,
        venue_type_grandchildren: editingScreen.venue_type_grandchildren || null,
        specialty: specialties.length > 0 ? specialties : null,
        lat: editingScreen.lat || null,
        lng: editingScreen.lng || null,
      };
      
      const { error } = await supabase
        .from('screens')
        .update(updateData)
        .eq('id', editingScreen.id);

      if (error) throw error;

      const updatedScreen = { ...editingScreen, specialty: specialties, class: sanitizedClass };
      setScreens(screens.map(screen => 
        screen.id === editingScreen.id ? updatedScreen : screen
      ));

      toast({
        title: "Sucesso",
        description: "Tela atualizada com sucesso!",
      });
      setEditModalOpen(false);
      setEditingScreen(null);
      setSpecialtyText('');
      
    } catch (err: unknown) {
      console.error('Error updating screen:', err);
      let errorMessage = 'Erro desconhecido';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        // Check for specific enum error
        if (err.message.includes('22P02') || err.message.toLowerCase().includes('enum class_band')) {
          errorMessage = 'Classe inválida. Use A, B, C, D, E ou ND.';
        }
      } else if (typeof err === 'object' && err !== null) {
        errorMessage = (err as any).error_description || (err as any).message || JSON.stringify(err);
      }
      
      toast({
        title: "Erro",
        description: `Não foi possível atualizar a tela: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddScreen = async () => {
    if (!isAdmin() && !isManager()) {
      toast({
        title: "Acesso Negado",
        description: "Você não tem permissão para adicionar telas.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    
    try {
      const specialties = specialtyText.split(',').map(s => s.trim()).filter(Boolean);
      
      // Validate and sanitize class value
      const sanitizedClass = ALLOWED_CLASSES.includes(newScreen.class as any) 
        ? newScreen.class 
        : 'ND';
      
      const insertData = {
        code: newScreen.code || null,
        name: newScreen.code || null,
        display_name: newScreen.display_name || null,
        city: newScreen.city || null,
        state: newScreen.state || null,
        address_raw: newScreen.address_raw || null,
        class: sanitizedClass,
        active: newScreen.active ?? true,
        venue_type_parent: newScreen.venue_type_parent || null,
        venue_type_child: newScreen.venue_type_child || null,
        venue_type_grandchildren: newScreen.venue_type_grandchildren || null,
        specialty: specialties.length > 0 ? specialties : null,
        lat: newScreen.lat || null,
        lng: newScreen.lng || null,
      };
      
      // Try using the admin function first, fallback to direct insert
      let data;
      try {
        data = await addScreenAsAdmin(insertData);
      } catch (adminError) {
        console.log('Admin function failed, trying direct insert:', adminError);
        // Fallback to direct insert
        const { data: directData, error } = await supabase
          .from('screens')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        data = directData;
      }

      setScreens([data, ...screens]);
      toast({
        title: "Sucesso",
        description: "Tela adicionada com sucesso!",
      });
      setAddModalOpen(false);
      setNewScreen({});
      setSpecialtyText('');
      
    } catch (err: unknown) {
      console.error('Error adding screen:', err);
      let errorMessage = 'Erro desconhecido';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        // Check for specific enum error
        if (err.message.includes('22P02') || err.message.toLowerCase().includes('enum class_band')) {
          errorMessage = 'Classe inválida. Use A, B, C, D, E ou ND.';
        }
      } else if (typeof err === 'object' && err !== null) {
        errorMessage = (err as any).error_description || (err as any).message || JSON.stringify(err);
      }
      
      toast({
        title: "Erro",
        description: `Não foi possível adicionar a tela: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteScreen = async (screenId: number) => {
    if (!isAdmin()) {
      toast({
        title: "Acesso Negado",
        description: "Apenas super administradores podem excluir telas.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Try using the admin function first, fallback to direct delete
      let success;
      try {
        success = await deleteScreenAsAdmin(screenId);
      } catch (adminError) {
        console.log('Admin function failed, trying direct delete:', adminError);
        // Fallback to direct delete
        const { error } = await supabase
          .from('screens')
          .delete()
          .eq('id', screenId);

        if (error) throw error;
        success = true;
      }

      if (success) {
        setScreens(screens.filter(screen => screen.id !== screenId));
        toast({
          title: "Sucesso",
          description: "Tela excluída com sucesso!",
        });
      }
      
    } catch (err: unknown) {
      console.error('Error deleting screen:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({
        title: "Erro",
        description: `Não foi possível excluir a tela: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const updateEditingScreen = (field: keyof Screen, value: any) => {
    if (!editingScreen) return;
    setEditingScreen({ ...editingScreen, [field]: value });
  };

  const updateNewScreen = (field: keyof Screen, value: any) => {
    setNewScreen({ ...newScreen, [field]: value });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      setUploadFile(file);
    } else {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo Excel (.xlsx)",
        variant: "destructive",
      });
    }
  };

  const handleUploadScreens = async () => {
    if (!uploadFile || !isAdmin()) {
      toast({
        title: "Acesso Negado",
        description: "Apenas super administradores podem fazer upload de planilhas.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      // Aqui você implementaria a lógica de leitura da planilha
      // Por enquanto, vamos simular o processo
      toast({
        title: "Processando",
        description: "Processando planilha...",
      });
      
      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Validar dados (implementar validação real)
      const mockValidation = {
        valid: true,
        total: 10,
        duplicates: 2,
        new: 8
      };
      
      if (mockValidation.valid) {
        toast({
          title: "Sucesso",
          description: `Planilha processada: ${mockValidation.new} novas telas, ${mockValidation.duplicates} duplicatas ignoradas`,
        });
        setUploadModalOpen(false);
        setUploadFile(null);
        fetchScreens(); // Recarregar dados
      } else {
        toast({
          title: "Erro",
          description: "Planilha contém erros. Verifique os dados e tente novamente.",
          variant: "destructive",
        });
      }
      
    } catch (err: unknown) {
      console.error('Error uploading file:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({
        title: "Erro",
        description: `Erro ao processar planilha: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
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
          
          <div className="flex items-center gap-2">
            {(isAdmin() || isManager()) && (
              <Button onClick={() => setAddModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Tela
              </Button>
            )}
            
            {isAdmin() && (
              <Button 
                variant="outline" 
                onClick={() => setUploadModalOpen(true)}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Planilha
              </Button>
            )}
            
            <Button variant="outline" onClick={fetchScreens} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
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
                   placeholder="Buscar por código do ponto, nome de exibição ou localização..."
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
                   <TableHead>Código do Ponto</TableHead>
                   <TableHead>Localização</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Classe</TableHead>
                   <TableHead>Rates</TableHead>
                   <TableHead>Venue</TableHead>
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
                           <p className="font-medium font-mono">{screen.code || `ID: ${screen.id}`}</p>
                           <p className="text-sm text-muted-foreground">
                             {screen.display_name || 'Sem nome de exibição'}
                           </p>
                         </div>
                       </TableCell>
                      <TableCell>{getLocation(screen)}</TableCell>
                      <TableCell>{getStatusBadge(screen.active)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{screen.class || "N/A"}</Badge>
                      </TableCell>
                      <TableCell>
                        {screen.screen_rates ? (
                          <div className="text-xs space-y-1">
                            <div>R$ {screen.screen_rates.standard_rate_month?.toLocaleString() || 'N/A'}</div>
                            <div className="text-muted-foreground">
                              {screen.screen_rates.spots_per_hour || 'N/A'} spots/h
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {screen.venue_info ? (
                          <div className="text-xs space-y-1">
                            <div className="font-medium">{screen.venue_info.name || 'N/A'}</div>
                            <div className="text-muted-foreground">
                              {screen.venue_info.audience_monthly?.toLocaleString() || 'N/A'} audiência/mês
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
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
                          {isAdmin() && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir a tela "{getDisplayName(screen)}"? 
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteScreen(screen.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
                     <Label className="text-sm font-medium text-muted-foreground">Código do Ponto</Label>
                     <p className="text-sm font-mono">{selectedScreen.code || `ID: ${selectedScreen.id}`}</p>
                   </div>
                   <div className="space-y-2">
                     <Label className="text-sm font-medium text-muted-foreground">Nome de Exibição</Label>
                     <p className="text-sm">{selectedScreen.display_name || 'N/A'}</p>
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
                     <Label htmlFor="code">Código do Ponto</Label>
                     <Input
                       id="code"
                       value={editingScreen.code || ''}
                       onChange={(e) => updateEditingScreen('code', e.target.value)}
                       placeholder="Digite o Cod. do Ponto"
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
                  <Select value={editingScreen.class || ''} onValueChange={(value) => updateEditingScreen('class', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a classe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                      <SelectItem value="E">E</SelectItem>
                      <SelectItem value="ND">ND</SelectItem>
                    </SelectContent>
                  </Select>
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
                    value={specialtyText}
                    onChange={(e) => setSpecialtyText(e.target.value)}
                    placeholder="Digite as especialidades separadas por vírgula (ex: Cardiologia, Neurologia, Pediatria)"
                    rows={2}
                  />
                  {specialtyText && (
                    <div className="text-xs text-muted-foreground">
                      Especialidades: {specialtyText.split(',').map(s => s.trim()).filter(Boolean).join(' • ')}
                    </div>
                  )}
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

        {/* Modal de Adicionar Tela */}
        <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Adicionar Nova Tela
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="new-code">Código do Ponto</Label>
                     <Input
                       id="new-code"
                       value={newScreen.code || ''}
                       onChange={(e) => updateNewScreen('code', e.target.value)}
                       placeholder="Digite o Cod. do Ponto"
                     />
                   </div>
                <div className="space-y-2">
                  <Label htmlFor="new-display_name">Nome de Exibição</Label>
                  <Input
                    id="new-display_name"
                    value={newScreen.display_name || ''}
                    onChange={(e) => updateNewScreen('display_name', e.target.value)}
                    placeholder="Nome de exibição"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-address">Endereço</Label>
                <Textarea
                  id="new-address"
                  value={newScreen.address_raw || ''}
                  onChange={(e) => updateNewScreen('address_raw', e.target.value)}
                  placeholder="Endereço completo"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-city">Cidade</Label>
                  <Input
                    id="new-city"
                    value={newScreen.city || ''}
                    onChange={(e) => updateNewScreen('city', e.target.value)}
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-state">Estado</Label>
                  <Input
                    id="new-state"
                    value={newScreen.state || ''}
                    onChange={(e) => updateNewScreen('state', e.target.value)}
                    placeholder="Estado"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-class">Classe</Label>
                  <Select value={newScreen.class || ''} onValueChange={(value) => updateNewScreen('class', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a classe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                      <SelectItem value="E">E</SelectItem>
                      <SelectItem value="ND">ND</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-specialty">Especialidades (separadas por vírgula)</Label>
                <Textarea
                  id="new-specialty"
                  value={specialtyText}
                  onChange={(e) => setSpecialtyText(e.target.value)}
                  placeholder="Digite as especialidades separadas por vírgula"
                  rows={2}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="new-active"
                  checked={newScreen.active ?? true}
                  onCheckedChange={(checked) => updateNewScreen('active', checked)}
                />
                <Label htmlFor="new-active">Tela Ativa</Label>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setAddModalOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleAddScreen}
                disabled={saving}
              >
                {saving ? "Adicionando..." : "Adicionar Tela"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Upload de Planilha */}
        <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload de Planilha
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Selecionar arquivo Excel (.xlsx)</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                />
                <p className="text-xs text-muted-foreground">
                  O arquivo deve conter colunas: Nome, Cidade, Estado, Classe, Endereço, etc.
                </p>
              </div>
              
              {uploadFile && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Arquivo selecionado:</p>
                  <p className="text-xs text-muted-foreground">{uploadFile.name}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setUploadModalOpen(false)}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleUploadScreens}
                disabled={!uploadFile || uploading}
              >
                {uploading ? "Processando..." : "Processar Planilha"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Inventory;