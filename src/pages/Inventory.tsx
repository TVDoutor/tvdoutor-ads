import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Search, Filter, Eye, Edit, Monitor, Building, AlertCircle, Trash2, Upload, Download, Plus, RefreshCw, FileSpreadsheet, CheckCircle, XCircle, Loader2, MapPin, Users, TrendingUp, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { addScreenAsAdmin, deleteScreenAsAdmin } from "@/lib/admin-operations";
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Classes sociais permitidas conforme definido no banco de dados
const ALLOWED_CLASSES = ['A', 'AB', 'ABC', 'B', 'BC', 'C', 'CD', 'D', 'E', 'ND'] as const;

// Função para normalizar especialidades médicas
const normalizeSpecialties = (specialtiesText: string): string[] => {
  if (!specialtiesText || typeof specialtiesText !== 'string') return [];
  
  // Se já tem vírgulas, usar split normal
  if (specialtiesText.includes(',')) {
    return specialtiesText.split(',').map(s => s.trim()).filter(Boolean);
  }
  
  // Lista de especialidades médicas conhecidas para separação automática
  const medicalSpecialties = [
    'OTORRINOLARINGOLOGIA', 'CIRURGIA GERAL', 'CLINICO GERAL', 'MEDICINA NUCLEAR', 
    'MEDICINA DO TRABALHO', 'MEDICINA ESPORTIVA', 'GASTROENTEROLOGIA', 
    'ENDOCRINOLOGIA', 'INFECTOLOGIA', 'OBSTETRICIA', 'REUMATOLOGIA', 
    'OFTALMOLOGIA', 'CARDIOLOGIA', 'DERMATOLOGIA', 'GINECOLOGIA', 
    'NEUROLOGIA', 'ORTOPEDIA', 'PEDIATRIA', 'ONCOLOGIA', 'TRANSPLANTE',
    'PSIQUIATRIA', 'UROLOGIA', 'ANESTESIOLOGIA', 'RADIOLOGIA', 'PATOLOGIA',
    'HEMATOLOGIA', 'NEFROLOGIA', 'PNEUMOLOGIA', 'GERIATRIA', 'UTI'
  ];
  
  console.log('🔍 Processando especialidades:', specialtiesText);
  
  const text = specialtiesText.toUpperCase().trim();
  const result: string[] = [];
  
  // Método simples e direto: substituir cada especialidade por um marcador
  let processedText = text;
  const foundSpecialties: string[] = [];
  
  // Ordenar por tamanho (maiores primeiro)
  const sortedSpecialties = [...medicalSpecialties].sort((a, b) => b.length - a.length);
  
  // Primeiro, marcar todas as especialidades encontradas
  for (const specialty of sortedSpecialties) {
    const regex = new RegExp(specialty.replace(/\s+/g, '\\s+'), 'gi');
    if (regex.test(processedText)) {
      foundSpecialties.push(specialty);
      processedText = processedText.replace(regex, `|${specialty}|`);
    }
  }
  
  if (foundSpecialties.length > 0) {
    console.log('✅ Especialidades encontradas:', foundSpecialties);
    return foundSpecialties;
  }
  
  // Se não encontrou com espaços, tentar sem espaços (texto grudado)
  console.log('🔄 Tentando separar texto grudado...');
  
  let remainingText = text;
  
  while (remainingText.length > 0) {
    let found = false;
    
    for (const specialty of sortedSpecialties) {
      const cleanSpecialty = specialty.replace(/\s+/g, '');
      
      if (remainingText.startsWith(cleanSpecialty)) {
        result.push(specialty);
        remainingText = remainingText.substring(cleanSpecialty.length);
        found = true;
        console.log(`✅ Encontrada: ${specialty}, restante: "${remainingText}"`);
        break;
      }
    }
    
    if (!found) {
      // Procurar a próxima especialidade conhecida
      let nextIndex = -1;
      let nextSpecialty = '';
      
      for (const specialty of sortedSpecialties) {
        const cleanSpecialty = specialty.replace(/\s+/g, '');
        const index = remainingText.indexOf(cleanSpecialty);
        
        if (index > 0 && (nextIndex === -1 || index < nextIndex)) {
          nextIndex = index;
          nextSpecialty = specialty;
        }
      }
      
      if (nextIndex > 0) {
        // Há uma especialidade mais à frente, pegar o texto antes dela
        const unknownPart = remainingText.substring(0, nextIndex);
        result.push(unknownPart);
        remainingText = remainingText.substring(nextIndex);
        console.log(`⚠️ Parte não reconhecida: "${unknownPart}", próxima: ${nextSpecialty}`);
      } else {
        // Não há mais especialidades conhecidas, adicionar o resto
        if (remainingText.trim()) {
          result.push(remainingText.trim());
          console.log(`⚠️ Texto final: "${remainingText}"`);
        }
        break;
      }
    }
  }
  
  console.log('🔄 Resultado final:', result);
  return result.length > 0 ? result : [specialtiesText.trim()];
};



// Tipo para os dados retornados pela VIEW v_screens_enriched
type InventoryRow = {
  id: number;
  code: string | null;
  name: string | null;
  display_name: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  geom: any | null;
  active: boolean | null;
  class: string | null;
  specialty: string[] | null;
  board_format: string | null;
  category: string | null;
  rede: string | null;  // Campo fixo: TV Doutor, LG, Amil
  standard_rate_month: number | null;
  selling_rate_month: number | null;
  spots_per_hour: number | null;
  spot_duration_secs: number | null;
  
  // Dados do venue
  venue_name: string | null;
  venue_address: string | null;
  venue_country: string | null;
  venue_state: string | null;
  venue_district: string | null;
  
  // Dados do staging para compatibilidade
  staging_nome_ponto: string | null;
  staging_audiencia: number | null;
  staging_especialidades: string | null;
  staging_tipo_venue: string | null;
  staging_subtipo: string | null;
  staging_categoria: string | null;
};

interface Screen {
  id: number;
  code: string;
  name: string;
  display_name: string;
  city: string;
  state: string;
  address: string;
  class: string;
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
  const [classFilter, setClassFilter] = useState<string>("all");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null);
  const [newScreen, setNewScreen] = useState<Partial<Screen>>({});
  const [saving, setSaving] = useState(false);
  const [specialtyText, setSpecialtyText] = useState('');
  
  // Upload states - apenas para super admins
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [exporting, setExporting] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    withLocation: 0,
    totalCities: 0
  });

  useEffect(() => {
    console.log('🚀 Componente Inventory carregado, iniciando busca de dados...');
    fetchScreens();
  }, []);

  useEffect(() => {
    filterScreens();
  }, [searchTerm, statusFilter, classFilter, specialtyFilter, screens]);

  // Função para obter todas as especialidades únicas
  const getAllSpecialties = useCallback(() => {
    const specialtySet = new Set<string>();
    screens.forEach(screen => {
      if (screen.specialty && screen.specialty.length > 0) {
        screen.specialty.forEach(spec => {
          if (spec && spec.trim()) {
            specialtySet.add(spec.trim());
          }
        });
      }
    });
    return Array.from(specialtySet).sort();
  }, [screens]);

  // Calcular estatísticas
  const calculateStats = useCallback((screensData: Screen[]) => {
    const total = screensData.length;
    const active = screensData.filter(s => s.active).length;
    const inactive = total - active;
    const withLocation = screensData.filter(s => s.lat && s.lng).length;
    const totalCities = new Set(screensData.map(s => s.city).filter(Boolean)).size;
    
    return { total, active, inactive, withLocation, totalCities };
  }, []);

  // Função para refresh dos dados
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchScreens();
    setRefreshing(false);
  };

  const fetchScreens = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Iniciando busca de dados das telas via VIEW...');
      
      const { data, error } = await supabase
        .from('v_screens_enriched')
        .select(`
          id, code, name, display_name, city, state, cep, address, lat, lng, geom,
          active, class, specialty, board_format, category, rede,
          standard_rate_month, selling_rate_month, spots_per_hour, spot_duration_secs,
          venue_name, venue_address, venue_country, venue_state, venue_district,
          staging_nome_ponto, staging_audiencia, staging_especialidades,
          staging_tipo_venue, staging_subtipo, staging_categoria
        `)
        .order('code', { ascending: true });

      console.log('📊 Dados da VIEW recebidos:', { data, error });
      
      if (error) {
        console.error('❌ Erro na busca da VIEW:', error);
        throw error;
      } else {
        console.log('✅ Busca da VIEW funcionou, dados:', data?.length, 'registros');
      }

      // Mapear para o tipo Screen
      console.log('🔄 Mapeando dados da VIEW para Screen...');
      const enriched = (data ?? []).map((r: InventoryRow, index: number): Screen => {
        console.log(`📱 Processando tela ${index + 1}:`, r);
        
        return {
          id: r.id,
          code: r.code ?? '',
          name: r.name ?? '',
          display_name: r.display_name ?? r.staging_nome_ponto ?? r.name ?? '',
          city: r.city ?? '',
          state: r.state ?? '',
          address: r.address ?? '',
          class: r.class ?? 'ND',
          active: r.active ?? true,

          venue_type_parent: r.staging_tipo_venue ?? '',
          venue_type_child: r.staging_subtipo ?? '',
          venue_type_grandchildren: r.rede ?? r.staging_categoria ?? r.category ?? '',

          specialty: r.specialty ?? (r.staging_especialidades ? normalizeSpecialties(r.staging_especialidades) : []),

          // sua UI espera "screen_rates"
          screen_rates: {
            standard_rate_month: r.standard_rate_month ?? undefined,
            selling_rate_month: r.selling_rate_month ?? undefined,
            spots_per_hour: r.spots_per_hour ?? undefined,
            spot_duration_secs: r.spot_duration_secs ?? undefined,
          },

          // sua UI espera "venue_info"
          venue_info: {
            name: r.venue_name ?? r.staging_nome_ponto ?? r.name ?? undefined,
            address: r.venue_address ?? r.address ?? undefined,
            audience_monthly: r.staging_audiencia ?? undefined,
          },

          // campos opcionais que seu tipo Screen já tem
          lat: r.lat ?? undefined,
          lng: r.lng ?? undefined,
          venue_id: undefined, // Não temos venue_id na view atual
        };
      });

      console.log('✅ Dados enriquecidos:', enriched);
      console.log('🔍 Primeira tela com classe:', enriched[0] ? {
        id: enriched[0].id,
        code: enriched[0].code,
        class: enriched[0].class
      } : 'Nenhuma tela');
      setScreens(enriched);
      
      // Calcular e atualizar estatísticas
      const newStats = calculateStats(enriched);
      setStats(newStats);
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
         const location = (screen.address || '').toLowerCase();
         const specialties = screen.specialty ? screen.specialty.join(' ').toLowerCase() : '';
         
         return screenCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                location.includes(searchTerm.toLowerCase()) ||
                specialties.includes(searchTerm.toLowerCase());
       });
     }

    if (statusFilter !== "all") {
      if (statusFilter === "ativa") {
        filtered = filtered.filter(screen => screen.active === true);
      } else if (statusFilter === "inativa") {
        filtered = filtered.filter(screen => screen.active === false);
      }
    }

    if (classFilter !== "all") {
      filtered = filtered.filter(screen => screen.class === classFilter);
    }

    if (specialtyFilter !== "all") {
      filtered = filtered.filter(screen => {
        if (!screen.specialty || screen.specialty.length === 0) return false;
        return screen.specialty.some(spec => 
          spec.toLowerCase().includes(specialtyFilter.toLowerCase())
        );
      });
    }

    setFilteredScreens(filtered);
  };

  const getDisplayName = (screen: Screen) => {
    return `${screen.name || ''} ${screen.display_name || ''}`.trim() || 'Tela sem nome';
  };

  const getLocation = (screen: Screen) => {
    // O endereço já vem formatado da view como "[endereço], [cidade] – [UF]"
    return screen.address || 'Localização não informada';
  };

  const getStatusBadge = (active: boolean) => {
    return active ? (
      <Badge variant="default">Ativa</Badge>
    ) : (
      <Badge variant="secondary">Inativa</Badge>
    );
  };

  // Removido: getUniqueClasses - coluna 'class' não existe no banco

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
    
    console.log('🔧 Opening edit modal for screen:', {
      id: screen.id,
      idType: typeof screen.id,
      name: screen.name,
      display_name: screen.display_name
    });
    
    setEditingScreen({ ...screen });
    setSpecialtyText(screen.specialty ? screen.specialty.join(', ') : '');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingScreen) return;

    // Validate that we have a valid screen ID
    if (!editingScreen.id || typeof editingScreen.id !== 'number') {
      console.error('❌ Invalid screen ID:', editingScreen.id);
      toast({
        title: "Erro",
        description: "ID da tela inválido. Tente recarregar a página.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    
    try {
      console.log('🔄 Attempting to update screen with ID:', editingScreen.id, 'Type:', typeof editingScreen.id);
      
      // Check user's database role before attempting update
      const { data: dbRole } = await supabase
        .rpc('get_user_role', { _user_id: profile?.id });

      // Check if user has permission to edit (admin or super_admin in database)
      if (!dbRole || (dbRole !== 'admin' && dbRole !== 'super_admin')) {
        toast({
          title: "Acesso Negado",
          description: "Você não tem permissão para editar telas. Verifique suas permissões com o administrador.",
          variant: "destructive",
        });
        return;
      }

      const specialties = specialtyText.split(',').map(s => s.trim()).filter(Boolean);
      // Use the selected class directly (no sanitization needed)
      const selectedClass = editingScreen.class;
      
      // Primeiro tentar atualizar com a classe
      let updateData = {
        code: editingScreen.code || null,
        name: editingScreen.code || null,
        display_name: editingScreen.display_name || null,
        city: editingScreen.city || null,
        state: editingScreen.state || null,
        address_raw: editingScreen.address || null,
        class: selectedClass,
        active: editingScreen.active ?? true,
        venue_type_parent: editingScreen.venue_type_parent || null,
        venue_type_child: editingScreen.venue_type_child || null,
        venue_type_grandchildren: editingScreen.venue_type_grandchildren || null,
        specialty: specialties.length > 0 ? specialties : null,
        lat: editingScreen.lat || null,
        lng: editingScreen.lng || null,
      };
      
      console.log('📝 Update data:', updateData);
      
      let { error } = await supabase
        .from('screens')
        .update(updateData)
        .eq('id', editingScreen.id);

      // Se a coluna class não existir, tentar novamente sem ela
      if (error && error.code === 'PGRST204' && error.message.includes("Could not find the 'class' column")) {
        console.log('⚠️ Coluna class não existe, atualizando sem ela...');
        
        // Remover a classe do updateData
        const { class: _, ...updateDataWithoutClass } = updateData;
        
        const { error: errorWithoutClass } = await supabase
          .from('screens')
          .update(updateDataWithoutClass)
          .eq('id', editingScreen.id);
        
        if (errorWithoutClass) {
          console.error('🚫 Database update error (without class):', errorWithoutClass);
          throw errorWithoutClass;
        }
        
        console.log('✅ Tela atualizada sem a coluna class');
      } else if (error) {
        console.error('🚫 Database update error:', error);
        throw error;
      } else {
        console.log('✅ Tela atualizada com sucesso (incluindo classe)');
      }

      const updatedScreen = { ...editingScreen, specialty: specialties, class: selectedClass };
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
      // Use the selected class directly
      const selectedClass = newScreen.class || 'ND';
      
      // Primeiro tentar inserir com a classe
      let insertData = {
        code: newScreen.code || null,
        name: newScreen.code || null,
        display_name: newScreen.display_name || null,
        city: newScreen.city || null,
        state: newScreen.state || null,
        address_raw: newScreen.address || null,
        class: selectedClass,
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
        
        // Se o erro for relacionado à coluna class, tentar sem ela
        if (adminError && (adminError as any).code === 'PGRST204' && (adminError as any).message?.includes("Could not find the 'class' column")) {
          console.log('⚠️ Coluna class não existe, inserindo sem ela...');
          
          // Remover a classe do insertData
          const { class: _, ...insertDataWithoutClass } = insertData;
          
          const { data: directData, error } = await supabase
            .from('screens')
            .insert(insertDataWithoutClass)
            .select()
            .single();

          if (error) throw error;
          data = { ...directData, class: selectedClass }; // Adicionar a classe no frontend
        } else {
          // Fallback to direct insert
          const { data: directData, error } = await supabase
            .from('screens')
            .insert(insertData)
            .select()
            .single();

          if (error) throw error;
          data = directData;
        }
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
    if (!file) return;
    
    // Verificar se é super admin
    if (!isAdmin()) {
      toast({
        title: "Acesso Negado",
        description: "Apenas super administradores podem fazer upload de arquivos.",
        variant: "destructive",
      });
      return;
    }
    
    // Aceitar tanto CSV quanto Excel
    const allowedTypes = [
      'text/csv',
      'application/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Formato Inválido",
        description: "Por favor, selecione um arquivo CSV ou Excel (.csv, .xlsx, .xls)",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar tamanho do arquivo (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo Muito Grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }
    
    setUploadFile(file);
    toast({
      title: "Arquivo Selecionado",
      description: `${file.name} foi selecionado para upload.`,
    });
  };

  const validateScreenData = (data: any[]): any[] => {
    const validatedData: any[] = [];
    const errors: string[] = [];
    // Removido: allowedClasses - coluna 'class' não existe no banco

    data.forEach((row, index) => {
      const rowNumber = index + 2; // +2 porque começamos na linha 2 (linha 1 é cabeçalho)
      
      // Validações obrigatórias
      if (!row['Código'] || typeof row['Código'] !== 'string') {
        errors.push(`Linha ${rowNumber}: Código é obrigatório`);
        return;
      }
      
      if (!row['Nome de Exibição'] || typeof row['Nome de Exibição'] !== 'string') {
        errors.push(`Linha ${rowNumber}: Nome de Exibição é obrigatório`);
        return;
      }

      // Removido: Validação da classe - coluna não existe no banco

      // Validar coordenadas se fornecidas
      if (row['Latitude'] && (isNaN(Number(row['Latitude'])) || Number(row['Latitude']) < -90 || Number(row['Latitude']) > 90)) {
        errors.push(`Linha ${rowNumber}: Latitude deve ser um número entre -90 e 90`);
        return;
      }

      if (row['Longitude'] && (isNaN(Number(row['Longitude'])) || Number(row['Longitude']) < -180 || Number(row['Longitude']) > 180)) {
        errors.push(`Linha ${rowNumber}: Longitude deve ser um número entre -180 e 180`);
        return;
      }

      // Validar status ativo
      const activeValue = row['Ativo'];
      let active = true; // padrão
      if (activeValue) {
        if (typeof activeValue === 'string') {
          const normalizedActive = activeValue.toLowerCase().trim();
          active = normalizedActive === 'sim' || normalizedActive === 'ativo' || normalizedActive === 'true' || normalizedActive === '1';
        } else if (typeof activeValue === 'boolean') {
          active = activeValue;
        }
      }

      // Criar objeto da tela validado
      const validatedScreen = {
        name: row['Código'].toString().trim(),
        display_name: row['Nome de Exibição'].toString().trim(),
        address: row['Endereço'] ? row['Endereço'].toString().trim() : null,
        city: row['Cidade'] ? row['Cidade'].toString().trim() : null,
        state: row['Estado'] ? row['Estado'].toString().trim() : null,
        zip_code: row['CEP'] ? row['CEP'].toString().trim() : null,
        // Removido: class: row['Classe'] ? row['Classe'].toString().trim() : 'ND', - coluna não existe no banco
        specialty: row['Especialidade'] ? row['Especialidade'].toString().trim() : null,
        active: active,
        lat: row['Latitude'] ? Number(row['Latitude']) : null,
        lng: row['Longitude'] ? Number(row['Longitude']) : null,
        google_place_id: row['Google Place ID'] ? row['Google Place ID'].toString().trim() : null,
        google_maps_url: row['Google Maps URL'] ? row['Google Maps URL'].toString().trim() : null,
        // Dados de taxa se fornecidos
        rates: {
          standard_rate_month: row['Taxa Padrão (Mês)'] ? Number(row['Taxa Padrão (Mês)']) : null,
          selling_rate_month: row['Taxa Venda (Mês)'] ? Number(row['Taxa Venda (Mês)']) : null,
          spots_per_hour: row['Spots por Hora'] ? Number(row['Spots por Hora']) : null,
          spot_duration_secs: row['Duração Spot (seg)'] ? Number(row['Duração Spot (seg)']) : null
        }
      };

      validatedData.push(validatedScreen);
    });

    if (errors.length > 0) {
      throw new Error(`Erros encontrados na planilha:\n${errors.join('\n')}`);
    }

    return validatedData;
  };

  const processCSVFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            throw new Error('Arquivo CSV deve ter pelo menos uma linha de cabeçalho e uma linha de dados');
          }
          
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const data = [];
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const row: any = {};
            
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            
            data.push(row);
          }
          
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo CSV'));
      reader.readAsText(file, 'UTF-8');
    });
  };

  const handleUploadScreens = async () => {
    if (!uploadFile || !isAdmin()) {
      toast({
        title: "Acesso Negado",
        description: "Apenas super administradores podem fazer upload de arquivos.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    try {
      toast({
        title: "Processando",
        description: "Lendo arquivo...",
      });

      let jsonData: any[] = [];
      
      // Processar arquivo baseado no tipo
      if (uploadFile.type === 'text/csv' || uploadFile.name.endsWith('.csv')) {
        jsonData = await processCSVFile(uploadFile);
      } else {
        // Para arquivos Excel, usar a lógica existente
        const data = await uploadFile.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(data);
        const worksheet = workbook.getWorksheet(1);
        
        if (worksheet) {
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header row
            const rowData: any = {};
            row.eachCell((cell, colNumber) => {
              const headerCell = worksheet.getCell(1, colNumber);
              const header = headerCell.text || headerCell.value?.toString() || `col${colNumber}`;
              rowData[header] = cell.text || cell.value;
            });
            jsonData.push(rowData);
          });
        }
      }

      if (!jsonData || jsonData.length === 0) {
        throw new Error('Arquivo está vazio ou não contém dados válidos');
      }

      setUploadProgress(20);
      toast({
        title: "Validando",
        description: "Validando dados do arquivo...",
      });

      // Validar dados
      const validatedData = validateScreenData(jsonData);
      setUploadProgress(40);

      toast({
        title: "Salvando",
        description: "Inserindo telas no banco de dados...",
      });

      // Processar inserção das telas
      let insertedCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      const totalItems = validatedData.length;

      for (let i = 0; i < validatedData.length; i++) {
        const screenData = validatedData[i];
        
        try {
          // Verificar se já existe uma tela com o mesmo código
          const { data: existingScreen } = await supabase
            .from('screens')
            .select('id, name')
            .eq('name', screenData.name)
            .single();

          if (existingScreen) {
            duplicateCount++;
            continue;
          }

          // Separar dados de taxa
          const { rates, ...screenInsertData } = screenData;

          // Inserir tela
          const { data: insertedScreen, error: insertError } = await supabase
            .from('screens')
            .insert(screenInsertData)
            .select('id')
            .single();

          if (insertError) {
            throw insertError;
          }

          // Inserir taxa se fornecida
          if (insertedScreen && rates && (rates.standard_rate_month || rates.selling_rate_month)) {
            const rateData = {
              screen_id: insertedScreen.id,
              standard_rate_month: rates.standard_rate_month || 1500,
              selling_rate_month: rates.selling_rate_month || 1800,
              spots_per_hour: rates.spots_per_hour || 12,
              spot_duration_secs: rates.spot_duration_secs || 30
            };

            const { error: rateError } = await supabase
              .from('screen_rates')
              .insert(rateData);

            if (rateError) {
              console.warn(`Erro ao inserir taxa para tela ${screenData.name}:`, rateError);
            }
          }

          insertedCount++;

        } catch (error: any) {
          errorCount++;
          errors.push(`${screenData.name}: ${error.message}`);
          console.error(`Erro ao inserir tela ${screenData.name}:`, error);
        }
        
        // Atualizar progresso
        const progress = 40 + ((i + 1) / totalItems) * 50;
        setUploadProgress(progress);
      }

      setUploadProgress(100);

      // Mostrar resultado
      let resultMessage = `${insertedCount} telas adicionadas`;
      if (duplicateCount > 0) {
        resultMessage += `, ${duplicateCount} duplicatas ignoradas`;
      }
      if (errorCount > 0) {
        resultMessage += `, ${errorCount} erros`;
      }

      if (insertedCount > 0) {
        toast({
          title: "Sucesso",
          description: resultMessage,
        });
        
        // Fechar modal e recarregar dados
        setUploadModalOpen(false);
        setUploadFile(null);
        setUploadProgress(0);
        await fetchScreens();
      } else {
        toast({
          title: "Aviso",
          description: "Nenhuma tela nova foi adicionada. " + resultMessage,
          variant: "destructive",
        });
      }

      // Se houver erros, mostrar detalhes
      if (errors.length > 0) {
        console.error('Erros durante importação:', errors);
      }
      
    } catch (err: any) {
      console.error('Error uploading file:', err);
      toast({
        title: "Erro",
        description: `Erro ao processar arquivo: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleExportScreens = async () => {
    if (!isAdmin()) {
      toast({
        title: "Acesso Negado",
        description: "Apenas super administradores podem exportar dados.",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    
    try {
      toast({
        title: "Exportando",
        description: "Preparando dados para exportação...",
      });

      // Buscar todos os dados das telas
      const { data: screensData, error } = await supabase
        .from('screens')
        .select(`
          *,
          screen_rates (
            standard_rate_month,
            selling_rate_month,
            spots_per_hour,
            spot_duration_secs
          )
        `)
        .order('name');

      if (error) {
        throw new Error(`Erro ao buscar dados: ${error.message}`);
      }

      if (!screensData || screensData.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhuma tela encontrada para exportar.",
          variant: "destructive",
        });
        return;
      }

      // Preparar dados para Excel
      const exportData = screensData.map(screen => ({
        'Código': screen.name || '',
        'Nome de Exibição': screen.display_name || '',
        'Endereço': screen.address || '',
        'Cidade': screen.city || '',
        'Estado': screen.state || '',
        'CEP': screen.zip_code || '',
        // Removido: 'Classe': screen.class || '', - coluna não existe no banco
        'Especialidade': screen.specialty || '',
        'Ativo': screen.active ? 'Sim' : 'Não',
        'Latitude': screen.lat || '',
        'Longitude': screen.lng || '',
        'Taxa Padrão (Mês)': screen.screen_rates?.[0]?.standard_rate_month || '',
        'Taxa Venda (Mês)': screen.screen_rates?.[0]?.selling_rate_month || '',
        'Spots por Hora': screen.screen_rates?.[0]?.spots_per_hour || '',
        'Duração Spot (seg)': screen.screen_rates?.[0]?.spot_duration_secs || '',
        'Google Place ID': screen.google_place_id || '',
        'Google Maps URL': screen.google_maps_url || '',
        'Criado em': screen.created_at ? new Date(screen.created_at).toLocaleDateString('pt-BR') : '',
        'Atualizado em': screen.updated_at ? new Date(screen.updated_at).toLocaleDateString('pt-BR') : ''
      }));

      // Criar planilha Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Inventário TV Doutor");
      
      // Adicionar cabeçalhos
      const headers = Object.keys(exportData[0] || {});
      worksheet.addRow(headers);
      
      // Adicionar dados
      exportData.forEach(row => {
        const values = headers.map(header => row[header]);
        worksheet.addRow(values);
      });
      
      // Configurar largura das colunas
      const colWidths = [15, 25, 30, 15, 10, 12, 15, 8, 12, 12, 15, 15, 12, 15, 20, 25, 12, 12];
      worksheet.columns = headers.map((header, index) => ({
        header,
        key: header,
        width: colWidths[index] || 15
      }));

      // Gerar arquivo e fazer download
      const excelBuffer = await workbook.xlsx.writeBuffer();
      
      const data = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const fileName = `inventario_tvdoutor_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);

      toast({
        title: "Sucesso",
        description: `Inventário exportado com sucesso! ${screensData.length} telas exportadas.`,
      });

    } catch (error: any) {
      console.error('Error exporting screens:', error);
      toast({
        title: "Erro na Exportação",
        description: `Erro ao exportar dados: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Monitor className="h-6 w-6 text-primary" />
              </div>
              Inventário de Telas
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie e visualize todas as telas do sistema TV Doutor
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? "Atualizando..." : "Atualizar"}
            </Button>
            
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
                <FileSpreadsheet className="h-4 w-4" />
                Upload CSV
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={handleExportScreens} 
              className="gap-2"
              disabled={exporting}
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exportando..." : "Exportar"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.total.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-sm text-muted-foreground">Total de Telas</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Monitor className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.active.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-sm text-muted-foreground">Telas Ativas</p>
                  {!loading && stats.total > 0 && (
                    <p className="text-xs text-green-600">
                      {((stats.active / stats.total) * 100).toFixed(1)}% do total
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.inactive.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-sm text-muted-foreground">Telas Inativas</p>
                  {!loading && stats.total > 0 && (
                    <p className="text-xs text-red-600">
                      {((stats.inactive / stats.total) * 100).toFixed(1)}% do total
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalCities.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-sm text-muted-foreground">Cidades</p>
                  {!loading && stats.withLocation > 0 && (
                    <p className="text-xs text-blue-600">
                      {stats.withLocation} com localização
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros e Busca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, nome, cidade, endereço ou especialidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="ativa">Apenas Ativas</SelectItem>
                    <SelectItem value="inativa">Apenas Inativas</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Classe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Classes</SelectItem>
                    {ALLOWED_CLASSES.map((classType) => (
                      <SelectItem key={classType} value={classType}>
                        Classe {classType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Especialidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Especialidades</SelectItem>
                    {getAllSpecialties().map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(searchTerm || statusFilter !== "all" || classFilter !== "all" || specialtyFilter !== "all") && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setClassFilter("all");
                      setSpecialtyFilter("all");
                    }}
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </div>
            
            {(searchTerm || statusFilter !== "all" || classFilter !== "all" || specialtyFilter !== "all") && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Mostrando {filteredScreens.length} de {screens.length} telas
                  {searchTerm && ` • Busca: "${searchTerm}"`}
                  {statusFilter !== "all" && ` • Status: ${statusFilter === "ativa" ? "Ativas" : "Inativas"}`}
                  {classFilter !== "all" && ` • Classe: ${classFilter}`}
                  {specialtyFilter !== "all" && ` • Especialidade: ${specialtyFilter}`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Lista de Telas
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando...
                  </div>
                ) : (
                  `${filteredScreens.length} telas encontradas`
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Código do Ponto</TableHead>
                    <TableHead className="w-[250px]">Localização</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[100px]">Classe</TableHead>
                    <TableHead className="w-[150px]">Rates</TableHead>
                    <TableHead className="w-[200px]">Venue</TableHead>
                    <TableHead className="w-[200px]">Especialidades</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
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
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  filteredScreens.map((screen) => (
                    <TableRow key={screen.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium font-mono text-sm">
                            {screen.code || `ID: ${screen.id}`}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {screen.display_name || screen.venue_info?.name || 'Sem nome de exibição'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium truncate max-w-[230px]">
                            {screen.city && screen.state ? `${screen.city}, ${screen.state}` : 'N/A'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-[230px]">
                            {screen.address || 'Endereço não informado'}
                          </p>
                          {screen.lat && screen.lng && (
                            <div className="flex items-center gap-1 text-xs text-blue-600">
                              <MapPin className="h-3 w-3" />
                              Localizada
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {screen.active ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inativa
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {screen.class || 'ND'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {screen.screen_rates ? (
                          <div className="text-xs space-y-1">
                            <div className="font-medium">
                              R$ {screen.screen_rates.standard_rate_month?.toLocaleString('pt-BR') || 'N/A'}
                            </div>
                            <div className="text-muted-foreground">
                              {screen.screen_rates.spots_per_hour || 'N/A'} spots/h
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Não definido</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {screen.venue_info ? (
                          <div className="text-xs space-y-1">
                            <div className="font-medium truncate max-w-[180px]">
                              {screen.venue_info.name || 'N/A'}
                            </div>
                            {screen.venue_info.audience_monthly && (
                              <div className="text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {screen.venue_info.audience_monthly.toLocaleString('pt-BR')}/mês
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Não informado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {screen.specialty && screen.specialty.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
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
                          <span className="text-muted-foreground text-xs">Nenhuma</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleViewScreen(screen)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(isAdmin() || isManager()) && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleEditScreen(screen)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {isAdmin() && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
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
                <div className="text-center py-12">
                  <Monitor className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {searchTerm || statusFilter !== "all" || classFilter !== "all" || specialtyFilter !== "all"
                      ? "Nenhuma tela encontrada"
                      : "Nenhuma tela cadastrada"
                    }
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== "all" || classFilter !== "all" || specialtyFilter !== "all"
                      ? "Tente ajustar os filtros de busca ou limpe os filtros para ver todas as telas."
                      : "Quando houver telas cadastradas, elas aparecerão aqui."
                    }
                  </p>
                  {(searchTerm || statusFilter !== "all" || classFilter !== "all" || specialtyFilter !== "all") && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                        setClassFilter("all");
                        setSpecialtyFilter("all");
                      }}
                    >
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              )}
            </div>
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
              <DialogDescription>
                Visualize todas as informações detalhadas da tela selecionada
              </DialogDescription>
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
                  {/* Removido: Campo da classe - coluna não existe no banco */}
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
                    <Label className="text-sm font-medium text-muted-foreground">
                      Especialidades ({selectedScreen.specialty?.length || 0} total)
                    </Label>
                    {selectedScreen.specialty && selectedScreen.specialty.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {selectedScreen.specialty.slice(0, 10).map((spec, index) => (
                            <Badge key={index} variant="secondary" className="text-sm whitespace-nowrap">{spec}</Badge>
                          ))}
                          {selectedScreen.specialty.length > 10 && (
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              +{selectedScreen.specialty.length - 10}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                          <strong>Texto completo:</strong> {selectedScreen.specialty.join(', ')}
                        </div>
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
              <DialogDescription>
                Modifique as informações da tela selecionada
              </DialogDescription>
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
                    {editingScreen.display_name && (
                      <p className="text-xs text-muted-foreground">
                        Nome atual: {editingScreen.display_name}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Textarea
                    id="address"
                    value={editingScreen.address || ''}
                    onChange={(e) => updateEditingScreen('address', e.target.value)}
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
                  <Label htmlFor="class">Classe Social</Label>
                  <Select
                    value={editingScreen.class || 'ND'}
                    onValueChange={(value) => updateEditingScreen('class', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a classe social" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALLOWED_CLASSES.map((classType) => (
                        <SelectItem key={classType} value={classType}>
                          {classType}
                        </SelectItem>
                      ))}
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
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Prévia das especialidades ({specialtyText.split(',').map(s => s.trim()).filter(Boolean).length} total):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {specialtyText.split(',').map(s => s.trim()).filter(Boolean).slice(0, 10).map((spec, index) => (
                          <Badge key={index} variant="secondary" className="text-xs whitespace-nowrap">{spec}</Badge>
                        ))}
                        {specialtyText.split(',').map(s => s.trim()).filter(Boolean).length > 10 && (
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            +{specialtyText.split(',').map(s => s.trim()).filter(Boolean).length - 10}
                          </Badge>
                        )}
                      </div>
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
              <DialogDescription>
                Cadastre uma nova tela no sistema de inventário
              </DialogDescription>
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
                  value={newScreen.address || ''}
                  onChange={(e) => updateNewScreen('address', e.target.value)}
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
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-class">Classe Social</Label>
                <Select
                  value={newScreen.class || 'ND'}
                  onValueChange={(value) => updateNewScreen('class', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a classe social" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLOWED_CLASSES.map((classType) => (
                      <SelectItem key={classType} value={classType}>
                        {classType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

        {/* Modal de Upload de CSV */}
        <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Upload de Arquivo CSV
              </DialogTitle>
              <DialogDescription>
                Importe múltiplas telas através de um arquivo CSV ou Excel
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Área de upload */}
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <div className="space-y-2">
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Clique para selecionar ou arraste o arquivo</p>
                        <p className="text-xs text-muted-foreground">
                          Formatos suportados: CSV, XLSX, XLS (máx. 10MB)
                        </p>
                      </div>
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
                
                {uploadFile && (
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="h-8 w-8 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{uploadFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUploadFile(null)}
                        disabled={uploading}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processando arquivo...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {/* Informações sobre o formato */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium">Formato do arquivo:</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = '/template-inventario.csv';
                      link.download = 'template-inventario.csv';
                      link.click();
                    }}
                    className="gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Baixar Template
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Colunas obrigatórias: <code>Código</code>, <code>Nome de Exibição</code></p>
                  <p>• Colunas opcionais: <code>Cidade</code>, <code>Estado</code>, <code>Endereço</code>, <code>Classe</code>, <code>Ativo</code></p>
                  <p>• Use vírgulas para separar valores e aspas para textos com vírgulas</p>
                  <p>• Para <code>Ativo</code>: use "Sim" ou "Não" (padrão: Sim)</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setUploadModalOpen(false);
                  setUploadFile(null);
                  setUploadProgress(0);
                }}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleUploadScreens}
                disabled={!uploadFile || uploading}
                className="gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Importar Arquivo
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Inventory;

