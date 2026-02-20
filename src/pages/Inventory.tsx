// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatsGrid } from "@/components/StatsGrid";
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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Filter, Eye, Edit, Monitor, Building, AlertCircle, Trash2, Upload, Download, Plus, RefreshCw, FileSpreadsheet, CheckCircle, XCircle, Loader2, MapPin, Users, TrendingUp, BarChart3 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTvdPlayerStatus } from "@/hooks/useTvdPlayerStatus";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

  // Novos campos venue/details
  ambiente: string | null;
  audiencia_pacientes: number | null;
  audiencia_local: number | null;
  audiencia_hcp: number | null;
  audiencia_medica: number | null;
  aceita_convenio: boolean | null;
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
  /** Audiência mensal (editável; espelhada de venue_info.audience_monthly / staging_audiencia) */
  audience_monthly?: number | null;
  ambiente?: string | null;
  audiencia_pacientes?: number | null;
  audiencia_local?: number | null;
  audiencia_hcp?: number | null;
  audiencia_medica?: number | null;
  aceita_convenio?: boolean | null;
}

const Inventory = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile, isAdmin, isManager } = useAuth();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [filteredScreens, setFilteredScreens] = useState<Screen[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
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

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(filteredScreens.length / ITEMS_PER_PAGE) || 1;
  const paginatedScreens = filteredScreens.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const venueCodes = [...new Set(filteredScreens.map((s) => s.code).filter(Boolean))];
  const { data: tvdStatusMap, isLoading: tvdStatusLoading, isError: tvdStatusError, error: tvdStatusErr } = useTvdPlayerStatus(venueCodes);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [replaceExistingOnImport, setReplaceExistingOnImport] = useState(true);
  /** 'full' = inventário completo; 'audience' = lista de audiência (atualizar ou cadastrar por código) */
  const [uploadMode, setUploadMode] = useState<'full' | 'audience'>('full');
  const [exporting, setExporting] = useState(false);
  const [syncingTvdCode, setSyncingTvdCode] = useState<string | null>(null);
  const [syncingTvdAll, setSyncingTvdAll] = useState(false);
  
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

  // Resetar página ao mudar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, classFilter, specialtyFilter]);

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
      // PostgREST/Supabase pode limitar o retorno a 1000 linhas; por isso buscamos paginado.
      const PAGE_SIZE = 1000;
      let from = 0;
      let all: InventoryRow[] = [];
      let lastError: any = null;

      while (true) {
        const { data, error } = await supabase
          .from('v_screens_enriched')
          .select(`
            id, code, name, display_name, city, state, cep, address, lat, lng, geom,
            active, class, specialty, board_format, category, rede,
            standard_rate_month, selling_rate_month, spots_per_hour, spot_duration_secs,
            venue_name, venue_address, venue_country, venue_state, venue_district,
            staging_nome_ponto, staging_audiencia, staging_especialidades,
            staging_tipo_venue, staging_subtipo, staging_categoria,
            ambiente, audiencia_pacientes, audiencia_local, audiencia_hcp, audiencia_medica, aceita_convenio
          `)
          .order('code', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (error) {
          lastError = error;
          break;
        }

        const chunk = (data ?? []) as any[];
        all = all.concat(chunk as InventoryRow[]);

        // Se veio menos que o tamanho da página, terminou
        if (chunk.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      const data = all;
      const error = lastError;

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

          audience_monthly: r.staging_audiencia ?? undefined,

          ambiente: r.ambiente ?? undefined,
          audiencia_pacientes: r.audiencia_pacientes ?? undefined,
          audiencia_local: r.audiencia_local ?? undefined,
          audiencia_hcp: r.audiencia_hcp ?? undefined,
          audiencia_medica: r.audiencia_medica ?? undefined,
          aceita_convenio: r.aceita_convenio ?? undefined,

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

    // Validar formato do Código do Ponto: P#### ou P#####.XX[.YY...] (ex: P3348.F04.1)
    const codeToSave = (editingScreen.code || '').trim().replace(/\s+/g, '');
    const codeFormatValid = /^P\d{4,5}(\.[A-Za-z0-9]+)*$/i.test(codeToSave);
    if (!codeToSave || !codeFormatValid) {
      toast({
        title: "Código do Ponto inválido",
        description: "Use formato alfanumérico: P#### ou P#####.XX.YY (ex: P3348, P3348.F01, P3348.F04.1)",
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
      const audienceVal = editingScreen.audience_monthly ?? editingScreen.venue_info?.audience_monthly;
      let updateData: Record<string, unknown> = {
        code: codeToSave || null,
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
        lat: editingScreen.lat ?? null,
        lng: editingScreen.lng ?? null,
        ambiente: editingScreen.ambiente ?? null,
        audiencia_pacientes: editingScreen.audiencia_pacientes ?? null,
        audiencia_local: editingScreen.audiencia_local ?? null,
        audiencia_hcp: editingScreen.audiencia_hcp ?? null,
        audiencia_medica: editingScreen.audiencia_medica ?? null,
        aceita_convenio: editingScreen.aceita_convenio ?? null,
      };
      if (typeof audienceVal === 'number' || audienceVal === null) {
        updateData.audience_monthly = audienceVal;
      }
      
      console.log('📝 Update data:', updateData);
      
      let { error } = await supabase
        .from('screens')
        .update(updateData)
        .eq('id', editingScreen.id);

      // Se a coluna class não existir, tentar novamente sem ela
      if (error && error.code === 'PGRST204' && error.message.includes("Could not find the 'class' column")) {
        console.log('⚠️ Coluna class não existe, atualizando sem ela...');
        const { class: _c, ...rest } = updateData as { class?: unknown; [k: string]: unknown };
        const { error: errorWithoutClass } = await supabase
          .from('screens')
          .update(rest)
          .eq('id', editingScreen.id);
        if (errorWithoutClass) {
          console.error('🚫 Database update error (without class):', errorWithoutClass);
          throw errorWithoutClass;
        }
        console.log('✅ Tela atualizada sem a coluna class');
      } else if (error && error.code === 'PGRST204' && (error.message.includes("Could not find the 'audience_monthly' column") || error.message?.includes('audience_monthly'))) {
        console.log('⚠️ Coluna audience_monthly não existe, atualizando sem ela...');
        const { audience_monthly: _a, ...rest } = updateData as { audience_monthly?: unknown; [k: string]: unknown };
        const { error: err2 } = await supabase
          .from('screens')
          .update(rest)
          .eq('id', editingScreen.id);
        if (err2) {
          console.error('🚫 Database update error (without audience_monthly):', err2);
          throw err2;
        }
        console.log('✅ Tela atualizada sem a coluna audience_monthly');
      } else if (error) {
        console.error('🚫 Database update error:', error);
        throw error;
      } else {
        console.log('✅ Tela atualizada com sucesso');
      }

      const updatedScreen = {
        ...editingScreen,
        specialty: specialties,
        class: selectedClass,
        audience_monthly: editingScreen.audience_monthly ?? editingScreen.venue_info?.audience_monthly ?? undefined,
        venue_info: {
          ...editingScreen.venue_info,
          audience_monthly: editingScreen.audience_monthly ?? editingScreen.venue_info?.audience_monthly,
        },
        ambiente: editingScreen.ambiente ?? null,
        audiencia_pacientes: editingScreen.audiencia_pacientes ?? null,
        audiencia_local: editingScreen.audiencia_local ?? null,
        audiencia_hcp: editingScreen.audiencia_hcp ?? null,
        audiencia_medica: editingScreen.audiencia_medica ?? null,
        aceita_convenio: editingScreen.aceita_convenio ?? null,
      };
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

    const codeToAdd = (newScreen.code || '').trim().replace(/\s+/g, '');
    const codeFormatValid = /^P\d{4,5}(\.[A-Za-z0-9]+)*$/i.test(codeToAdd);
    if (!codeToAdd || !codeFormatValid) {
      toast({
        title: "Código do Ponto inválido",
        description: "Use formato alfanumérico: P#### ou P#####.XX.YY (ex: P3348, P3348.F01, P3348.F04.1)",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    
    try {
      const specialties = specialtyText.split(',').map(s => s.trim()).filter(Boolean);
      // Use the selected class directly
      const selectedClass = newScreen.class || 'ND';
      
      const audienceMonthly = newScreen.audience_monthly != null && newScreen.audience_monthly !== '' ? Number(newScreen.audience_monthly) : null;
      let insertData: Record<string, unknown> = {
        code: codeToAdd || null,
        name: codeToAdd || null,
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
        ambiente: newScreen.ambiente ?? null,
        audiencia_pacientes: newScreen.audiencia_pacientes ?? null,
        audiencia_local: newScreen.audiencia_local ?? null,
        audiencia_hcp: newScreen.audiencia_hcp ?? null,
        audiencia_medica: newScreen.audiencia_medica ?? null,
        aceita_convenio: newScreen.aceita_convenio ?? null,
      };
      if (typeof audienceMonthly === 'number' && !Number.isNaN(audienceMonthly)) {
        insertData.audience_monthly = audienceMonthly;
      }

      // Try using the admin function first, fallback to direct insert
      let data;
      try {
        data = await addScreenAsAdmin(insertData);
      } catch (adminError) {
        console.log('Admin function failed, trying direct insert:', adminError);
        
        // Se o erro for relacionado à coluna class, tentar sem ela
        if (adminError && (adminError as any).code === 'PGRST204' && (adminError as any).message?.includes("Could not find the 'class' column")) {
          console.log('⚠️ Coluna class não existe, inserindo sem ela...');
          const { class: _c, ...insertDataWithoutClass } = insertData;
          
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
      const addedCode = (data && typeof data === "object" && (data as any).code) ?? newScreen.code ?? null;
      toast({
        title: "Sucesso",
        description: "Tela adicionada com sucesso!",
      });
      setAddModalOpen(false);
      setNewScreen({});
      setSpecialtyText('');

      if (addedCode && String(addedCode).trim()) {
        supabase.functions
          .invoke("tvd-verify-sync-player", { body: { code: String(addedCode).trim() } })
          .then(({ data: res, error }) => {
            const payload = res as { found?: boolean; error?: string } | null;
            queryClient.invalidateQueries({ queryKey: ["tvd-player-status"] });
            if (payload?.found) queryClient.invalidateQueries({ queryKey: ["real-alerts"] });
            if (error) {
              toast({
                title: "Verificação TV Doutor",
                description: "Não foi possível verificar no app.tvdoutor. Tente novamente mais tarde.",
                variant: "destructive",
              });
              return;
            }
            if (payload?.found) {
              toast({
                title: "Sincronizado com TV Doutor",
                description: "Tela encontrada no app.tvdoutor e status de conexão sincronizado.",
              });
            } else {
              toast({
                title: "TV Doutor",
                description: "Código não encontrado no app.tvdoutor. Verifique o código do ponto se precisar da coluna Conexão (TVD).",
              });
            }
          })
          .catch(() => {
            queryClient.invalidateQueries({ queryKey: ["tvd-player-status"] });
            toast({
              title: "Verificação TV Doutor",
              description: "Não foi possível verificar no app.tvdoutor. Tente novamente mais tarde.",
              variant: "destructive",
            });
          });
      }
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

  const normalizeHeaderKey = (value: any): string => {
    return String(value ?? '')
      .replace(/^\uFEFF/, '') // BOM
      .trim()
      .replace(/^"+|"+$/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .toLowerCase();
  };

  const parseBooleanActive = (value: any): boolean => {
    if (value === null || value === undefined || value === '') return true;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).toLowerCase().trim();
    return normalized === 'sim' || normalized === 'ativo' || normalized === 'true' || normalized === '1' || normalized === 'yes';
  };

  const parseNumberBR = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    let s = String(value).trim();
    if (!s) return null;

    // Remove símbolos e espaços
    s = s.replace(/[^\d,\.\-]/g, '');
    if (!s) return null;

    // Se tiver vírgula e ponto, assumir formato BR: 1.234,56
    if (s.includes(',') && s.includes('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',') && !s.includes('.')) {
      // Formato BR decimal: -23,55
      s = s.replace(',', '.');
    }

    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const parseMoneyBR = (value: any): number | null => {
    return parseNumberBR(value);
  };

  const splitSpecialties = (value: any): string[] => {
    if (value === null || value === undefined || value === '') return [];
    if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
    const text = String(value).trim();
    if (!text) return [];
    // Export do JS geralmente vira "a,b,c"; alguns CSVs usam ";"
    return text
      .split(/[,;|]/g)
      .map(s => s.trim())
      .filter(Boolean);
  };

  const validateScreenData = (data: any[]): {
    rows: any[];
    skippedTemplateRows: number;
    warnings: { cepNormalized: number; cepInvalid: number };
  } => {
    const validatedData: any[] = [];
    const errors: string[] = [];
    const allowedClassSet = new Set(ALLOWED_CLASSES.map(c => String(c).toUpperCase()));
    // Formato alfanumérico: P#### ou P#####.XX[.YY...] (ex: P3348, P3348.F01, P3348.F04.1)
    const codeRegex = /^P\d{4,5}(\.[A-Za-z0-9]+)*$/i;
    let skippedTemplateRows = 0;
    let cepNormalized = 0;
    let cepInvalid = 0;
    const sanitizeCode = (v: any): string => {
      let s = String(v ?? '').trim();
      // remove invisíveis comuns (zero-width etc)
      s = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
      // remove espaços internos
      s = s.replace(/\s+/g, '');
      // alguns CSVs podem vir com vírgula: P2893,4 ou P3348,F04,1
      if (/^P\d{4,5},/i.test(s)) s = s.replace(/,/g, '.');
      return s;
    };
    const normalizeCep = (v: any): string | null => {
      if (v === null || v === undefined) return null;
      const raw = String(v).trim();
      if (!raw) return null;
      const digits = raw.replace(/\D/g, '');
      if (!digits) return null;
      if (digits.length !== 8) return null;
      if (digits !== raw) cepNormalized++;
      return digits;
    };

    data.forEach((row, index) => {
      const rowNumber = index + 2; // +2 porque começamos na linha 2 (linha 1 é cabeçalho)

      // Normalizar chaves do row para ficar resiliente (Código vs Codigo vs code etc)
      const r: any = {};
      Object.keys(row || {}).forEach((k) => {
        r[normalizeHeaderKey(k)] = row[k];
      });

      const codeRaw =
        r['codigo'] ??
        r['codigo do ponto'] ??
        r['code'] ??
        r['screen_code'];

      const displayNameRaw =
        r['nome de exibicao'] ??
        r['nome de exibição'] ??
        r['nome exibicao'] ??
        r['display_name'] ??
        r['display name'];

      const code = sanitizeCode(codeRaw);
      const display_name = String(displayNameRaw ?? '').trim();

      if (!code) {
        errors.push(`Linha ${rowNumber}: Código é obrigatório`);
        return;
      }

      // Ignorar linhas de template/exemplo (ex: PXXX.1, PXXXX.2 etc)
      // Base: 4-5 dígitos após P. Sufixo opcional: alfanumérico com pontos (ex: .F01, .F04.1).
      const codeBody = code.slice(1);
      const [basePart, ...restParts] = codeBody.split('.');
      const decimalPart = restParts.join('.');
      const baseLooksValid = /^\d{4,5}$/.test(basePart);
      const decimalLooksValid = decimalPart === '' ? true : /^[A-Za-z0-9]+(\.[A-Za-z0-9]+)*$/.test(decimalPart);
      if (!baseLooksValid || !decimalLooksValid) {
        skippedTemplateRows++;
        return;
      }

      if (!codeRegex.test(code)) {
        const hint = /^TVD/i.test(code)
          ? ' (Dica: o padrão do sistema é P#### ou P#####.XX.YY — ex: P2000, P3348.F01, P3348.F04.1. O template antigo "TVD001" não é aceito pelo banco.)'
          : '';
        errors.push(`Linha ${rowNumber}: Código inválido (${code}). Esperado: P#### ou P#####.XX.YY (ex: P3348.F01, P3348.F04.1)${hint}`);
        return;
      }
      if (!display_name) {
        errors.push(`Linha ${rowNumber}: Nome de Exibição é obrigatório`);
        return;
      }

      const lat = parseNumberBR(r['latitude']);
      const lng = parseNumberBR(r['longitude']);
      if (lat !== null && (lat < -90 || lat > 90)) {
        errors.push(`Linha ${rowNumber}: Latitude deve ser um número entre -90 e 90`);
        return;
      }
      if (lng !== null && (lng < -180 || lng > 180)) {
        errors.push(`Linha ${rowNumber}: Longitude deve ser um número entre -180 e 180`);
        return;
      }

      const classRaw = r['classe'] ?? r['class'];
      let classValue: any = null;
      if (classRaw !== null && classRaw !== undefined && String(classRaw).trim() !== '') {
        let c = String(classRaw).trim().toUpperCase();
        // aceita "CLASSE A", "Classe AB", etc
        c = c.replace(/^CLASSE\s+/i, '').trim();
        if (!allowedClassSet.has(c)) {
          errors.push(`Linha ${rowNumber}: Classe inválida (${c}). Valores aceitos: ${Array.from(allowedClassSet).join(', ')}`);
          return;
        }
        classValue = c;
      } else {
        classValue = 'ND';
      }

      const active = parseBooleanActive(r['ativo'] ?? r['active']);

      const address_raw = (r['endereco'] ?? r['endereço'] ?? r['address'] ?? r['address_raw'] ?? '').toString().trim() || null;
      const city = (r['cidade'] ?? r['city'] ?? '').toString().trim() || null;
      const state = (r['estado'] ?? r['uf'] ?? r['state'] ?? '').toString().trim() || null;
      const cepRaw = r['cep'] ?? '';
      const cep = normalizeCep(cepRaw);
      if (cepRaw !== null && cepRaw !== undefined && String(cepRaw).trim() !== '' && cep === null) {
        // Não bloqueia a importação: apenas evita violar o constraint do banco.
        // (Usuário pode corrigir no Excel/CSV depois se quiser.)
        cepInvalid++;
      }

      const specialty = splitSpecialties(r['especialidade'] ?? r['especialidades'] ?? r['specialty']);

      const google_place_id = (r['google place id'] ?? r['google_place_id'] ?? '').toString().trim() || null;
      const google_formatted_address =
        (r['google formatted address'] ?? r['google_formatted_address'] ?? '').toString().trim() || null;

      const rates = {
        standard_rate_month: parseMoneyBR(r['taxa padrao (mes)'] ?? r['taxa padrao (mês)'] ?? r['standard_rate_month']),
        selling_rate_month: parseMoneyBR(r['taxa venda (mes)'] ?? r['taxa venda (mês)'] ?? r['selling_rate_month']),
        spots_per_hour: parseNumberBR(r['spots por hora'] ?? r['spots_per_hour']),
        spot_duration_secs: parseNumberBR(r['duracao spot (seg)'] ?? r['duracao spot (seg)'] ?? r['spot_duration_secs']),
      };

      const parseAceitaConvenio = (v: any): boolean | null => {
        if (v === null || v === undefined || v === '') return null;
        const s = String(v).toLowerCase().trim();
        return s === 'sim' || s === 's' || s === 'true' || s === '1' || s === 'yes';
      };

      const validatedScreen = {
        code,
        name: code,
        display_name,
        address_raw,
        city,
        state,
        cep,
        class: classValue,
        specialty: specialty.length ? specialty : [],
        active,
        lat,
        lng,
        google_place_id,
        google_formatted_address,
        ambiente: (r['ambiente'] ?? '').toString().trim() || null,
        audiencia_pacientes: parseNumberBR(r['audiencia pacientes'] ?? r['audiencia_pacientes']),
        audiencia_local: parseNumberBR(r['audiencia local'] ?? r['audiencia_local']),
        audiencia_hcp: parseNumberBR(r['audiencia hcp'] ?? r['audiencia_hcp']),
        audiencia_medica: parseNumberBR(r['audiencia medica'] ?? r['audiencia_medica']),
        aceita_convenio: parseAceitaConvenio(r['aceita convenio'] ?? r['aceita_convenio'] ?? r['aceita_convenio']),
        updated_at: new Date().toISOString(),
      };

      validatedData.push({ screen: validatedScreen, rates });
    });

    if (errors.length > 0) {
      const max = 30;
      const shown = errors.slice(0, max);
      const suffix = errors.length > max ? `\n... e mais ${errors.length - max} erro(s).` : '';
      throw new Error(`Erros encontrados na planilha (${errors.length}):\n${shown.join('\n')}${suffix}`);
    }

    return { rows: validatedData, skippedTemplateRows, warnings: { cepNormalized, cepInvalid } };
  };

  const parseDelimitedLine = (line: string, delimiter: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];
      if (ch === '"') {
        if (inQuotes && next === '"') {
          cur += '"';
          i++;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }
      if (!inQuotes && ch === delimiter) {
        out.push(cur);
        cur = '';
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    return out.map(v => v.trim());
  };

  const detectDelimiter = (headerLine: string): string => {
    // Heurística simples: CSV PT-BR costuma usar ';'
    const semicolons = (headerLine.match(/;/g) || []).length;
    const commas = (headerLine.match(/,/g) || []).length;
    return semicolons > commas ? ';' : ',';
  };

  const processCSVFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = String(e.target?.result ?? '');
          const clean = text.replace(/^\uFEFF/, '');
          const lines = clean.split(/\r?\n/).filter(line => line.trim());
          
          if (lines.length < 2) {
            throw new Error('Arquivo CSV deve ter pelo menos uma linha de cabeçalho e uma linha de dados');
          }
          
          const delimiter = detectDelimiter(lines[0]);
          const headers = parseDelimitedLine(lines[0], delimiter).map(h => h.replace(/"/g, '').trim());
          const data: any[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            const values = parseDelimitedLine(lines[i], delimiter).map(v => v.replace(/"/g, '').trim());
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

  /** Valida e normaliza linhas de uma planilha "Lista de audiência": Código + Audiência obrigatórios. */
  const validateAudienceListData = (data: any[]): { rows: { code: string; audience_monthly: number; display_name?: string; city?: string; state?: string; address_raw?: string }[]; errors: string[] } => {
    const rows: { code: string; audience_monthly: number; display_name?: string; city?: string; state?: string; address_raw?: string }[] = [];
    const errors: string[] = [];
    const codeRegex = /^P\d{4,5}(\.[A-Za-z0-9]+)*$/i;
    const sanitizeCode = (v: any): string => {
      let s = String(v ?? '').trim().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, '');
      if (/^P\d{4,5},[A-Za-z0-9]+$/i.test(s)) s = s.replace(',', '.');
      return s;
    };

    data.forEach((row, index) => {
      const rowNumber = index + 2;
      const r: any = {};
      Object.keys(row || {}).forEach((k) => {
        r[normalizeHeaderKey(k)] = row[k];
      });

      const codeRaw = r['codigo'] ?? r['codigo do ponto'] ?? r['code'] ?? r['screen_code'];
      const code = sanitizeCode(codeRaw);
      const audRaw = r['audiencia'] ?? r['audiência'] ?? r['audience'] ?? r['audiencia mensal'] ?? r['audience_monthly'];
      const audience = parseNumberBR(audRaw) ?? (typeof audRaw === 'number' && Number.isFinite(audRaw) ? audRaw : null);

      if (!code) {
        errors.push(`Linha ${rowNumber}: Código é obrigatório`);
        return;
      }
      if (!codeRegex.test(code)) {
        errors.push(`Linha ${rowNumber}: Código inválido (${code}). Esperado: P#### ou P#####.XX.YY (ex: P3348.F01, P3348.F04.1)`);
        return;
      }
      if (audience === null || audience === undefined) {
        errors.push(`Linha ${rowNumber}: Audiência é obrigatória e deve ser um número`);
        return;
      }
      if (audience < 0) {
        errors.push(`Linha ${rowNumber}: Audiência não pode ser negativa`);
        return;
      }

      const display_name = (r['nome de exibicao'] ?? r['nome de exibição'] ?? r['display_name'] ?? '').toString().trim() || undefined;
      const city = (r['cidade'] ?? r['city'] ?? '').toString().trim() || undefined;
      const state = (r['estado'] ?? r['uf'] ?? r['state'] ?? '').toString().trim() || undefined;
      const address_raw = (r['endereco'] ?? r['endereço'] ?? r['address'] ?? '').toString().trim() || undefined;

      rows.push({ code, audience_monthly: Math.round(audience), display_name, city, state, address_raw });
    });

    return { rows, errors };
  };

  /** Importar lista de audiência: se o código já existe, atualiza audience_monthly; senão, cadastra nova tela. */
  const handleUploadAudienceList = async () => {
    if (!uploadFile || !isAdmin()) {
      toast({
        title: "Acesso Negado",
        description: "Apenas super administradores podem importar lista de audiência.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      toast({ title: "Lendo arquivo...", description: "Processando planilha de audiência..." });

      let jsonData: any[] = [];
      if (uploadFile.type === 'text/csv' || uploadFile.name.endsWith('.csv')) {
        jsonData = await processCSVFile(uploadFile);
      } else {
        const data = await uploadFile.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(data);
        const worksheet = workbook.getWorksheet(1);
        if (worksheet) {
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
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

      if (!jsonData?.length) {
        throw new Error('Arquivo está vazio ou não contém dados.');
      }

      setUploadProgress(15);
      const { rows: validatedRows, errors } = validateAudienceListData(jsonData);
      if (errors.length > 0) {
        const msg = errors.slice(0, 15).join('\n') + (errors.length > 15 ? `\n... e mais ${errors.length - 15} erro(s).` : '');
        throw new Error(msg);
      }

      const deduped = (() => {
        const byCode = new Map<string, typeof validatedRows[0]>();
        validatedRows.forEach((row) => byCode.set(row.code, row));
        return Array.from(byCode.values());
      })();

      if (deduped.length === 0) {
        throw new Error('Nenhuma linha válida após deduplicação por Código.');
      }

      setUploadProgress(25);
      toast({ title: "Verificando códigos no banco...", description: "" });

      const codes = deduped.map((r) => r.code);
      const BATCH = 200;
      const existingByCode = new Map<string, { id: number }>();
      for (let i = 0; i < codes.length; i += BATCH) {
        const chunk = codes.slice(i, i + BATCH);
        const { data: existing } = await supabase
          .from('screens')
          .select('id, code')
          .in('code', chunk);
        (existing ?? []).forEach((row: any) => {
          if (row?.code != null) existingByCode.set(String(row.code).trim(), { id: row.id });
        });
        setUploadProgress(25 + (i / codes.length) * 25);
      }

      let updated = 0;
      let inserted = 0;

      setUploadProgress(50);
      for (let i = 0; i < deduped.length; i += BATCH) {
        const chunk = deduped.slice(i, i + BATCH);
        for (const row of chunk) {
          const existing = existingByCode.get(row.code);
          if (existing) {
            const { error } = await supabase
              .from('screens')
              .update({ audience_monthly: row.audience_monthly, updated_at: new Date().toISOString() })
              .eq('id', existing.id);
            if (error) throw error;
            updated++;
          } else {
            const insertPayload = {
              code: row.code,
              name: row.code,
              display_name: row.display_name ?? row.code,
              city: row.city ?? null,
              state: row.state ?? null,
              address_raw: row.address_raw ?? null,
              audience_monthly: row.audience_monthly,
              active: true,
              lat: null,
              lng: null,
              venue_type_grandchildren: 'TV Doutor',
            };
            const { error } = await supabase.from('screens').insert(insertPayload).select('id').single();
            if (error) throw error;
            inserted++;
          }
        }
        setUploadProgress(50 + ((i + chunk.length) / deduped.length) * 45);
      }

      setUploadProgress(100);
      toast({
        title: "Lista de audiência importada",
        description: `${updated} tela(s) atualizada(s), ${inserted} tela(s) cadastrada(s). Total: ${deduped.length} linha(s).`,
      });
      setUploadModalOpen(false);
      setUploadFile(null);
      setUploadProgress(0);
      await fetchScreens();
    } catch (err: any) {
      console.error('Erro ao importar lista de audiência:', err);
      toast({
        title: "Erro",
        description: err?.message ?? 'Falha ao processar a lista de audiência.',
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
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

    if (replaceExistingOnImport) {
      const ok = window.confirm(
        'ATENÇÃO: "Substituir base" vai INATIVAR todas as telas atuais e então reativar/atualizar somente as telas presentes no arquivo.\n\nDeseja continuar?'
      );
      if (!ok) return;
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
      const { rows: validatedData, skippedTemplateRows, warnings } = validateScreenData(jsonData);
      if (!validatedData || validatedData.length === 0) {
        throw new Error(
          skippedTemplateRows > 0
            ? `O arquivo não contém linhas válidas para importar (as ${skippedTemplateRows} linhas com código de template/exemplo foram ignoradas).`
            : 'O arquivo não contém linhas válidas para importar.'
        );
      }
      if ((warnings?.cepNormalized ?? 0) > 0 || (warnings?.cepInvalid ?? 0) > 0) {
        toast({
          title: "Aviso (CEP)",
          description: `${(warnings?.cepNormalized ?? 0) ? `${warnings.cepNormalized} CEP(s) foram normalizados (removidos separadores e espaços). ` : ''}${(warnings?.cepInvalid ?? 0) ? `${warnings.cepInvalid} CEP(s) inválido(s) foram ignorados (salvos como vazio) para não quebrar a importação.` : ''}`.trim(),
        });
      }

      // Deduplicar por "code" antes do upsert para evitar:
      // "ON CONFLICT DO UPDATE command cannot affect row a second time"
      // (acontece quando o mesmo código aparece mais de uma vez no mesmo lote)
      const dedupeResult = (() => {
        const byCode = new Map<string, any>();
        let duplicates = 0;
        let missingCode = 0;

        for (const row of validatedData) {
          const codeRaw = row?.screen?.code;
          const code = String(codeRaw ?? '').trim();
          if (!code) {
            missingCode++;
            continue;
          }
          if (byCode.has(code)) duplicates++;
          // última ocorrência vence (mais perto do fim do arquivo)
          byCode.set(code, row);
        }

        return { deduped: Array.from(byCode.values()), duplicates, missingCode };
      })();

      const dedupedValidatedData = dedupeResult.deduped;
      if (dedupeResult.duplicates > 0 || dedupeResult.missingCode > 0) {
        toast({
          title: "Aviso (deduplicação)",
          description: `${dedupeResult.duplicates ? `${dedupeResult.duplicates} linha(s) duplicada(s) por Código foram consolidadas (última ocorrência venceu). ` : ''}${dedupeResult.missingCode ? `${dedupeResult.missingCode} linha(s) sem Código foram ignoradas.` : ''}`.trim(),
        });
      }
      if (!dedupedValidatedData || dedupedValidatedData.length === 0) {
        throw new Error('Após deduplicação, não restaram linhas válidas para importar. Verifique a coluna "Código".');
      }
      setUploadProgress(40);

      toast({
        title: "Salvando",
        description: replaceExistingOnImport
          ? "Substituindo base (inativando telas atuais) e atualizando no banco..."
          : "Atualizando/Inserindo telas no banco...",
      });

      const totalItems = dedupedValidatedData.length;
      const screensPayload = dedupedValidatedData.map((x: any) => x.screen);

      // "Replace" seguro: inativar tudo e reativar/atualizar o que veio no arquivo (evita quebra de FK)
      if (replaceExistingOnImport) {
        setUploadProgress(45);
        const { error: deactivateError } = await supabase
          .from('screens')
          .update({ active: false, updated_at: new Date().toISOString() })
          .neq('id', 0);
        if (deactivateError) throw deactivateError;
      }

      const BATCH_SIZE = 200;
      const codeToId = new Map<string, number>();
      let upsertedRows = 0;

      for (let start = 0; start < screensPayload.length; start += BATCH_SIZE) {
        const batch = screensPayload.slice(start, start + BATCH_SIZE);
        const { data: upserted, error: upsertError } = await supabase
          .from('screens')
          .upsert(batch, { onConflict: 'code' })
          .select('id,code');

        if (upsertError) throw upsertError;

        (upserted ?? []).forEach((r: any) => {
          if (r?.code && r?.id) codeToId.set(String(r.code), Number(r.id));
        });
        upsertedRows += (upserted ?? []).length;

        const progress = 45 + ((start + batch.length) / totalItems) * 35;
        setUploadProgress(progress);
      }

      // Atualizar taxas (screen_rates) — substitui para as telas importadas
      setUploadProgress(82);
      let ratesInserted = 0;
      let ratesSkipped = 0;

      const rateRows: any[] = [];
      dedupedValidatedData.forEach((x: any) => {
        const code = x?.screen?.code;
        const screenId = codeToId.get(String(code));
        if (!screenId) return;

        const rates = x?.rates ?? {};
        const hasAny =
          rates.standard_rate_month !== null ||
          rates.selling_rate_month !== null ||
          rates.spots_per_hour !== null ||
          rates.spot_duration_secs !== null;

        if (!hasAny) {
          ratesSkipped++;
          return;
        }

        rateRows.push({
          screen_id: screenId,
          standard_rate_month: rates.standard_rate_month,
          selling_rate_month: rates.selling_rate_month,
          spots_per_hour: rates.spots_per_hour,
          spot_duration_secs: rates.spot_duration_secs,
        });
      });

      try {
        const importedIds = Array.from(codeToId.values());
        for (let start = 0; start < importedIds.length; start += BATCH_SIZE) {
          const batchIds = importedIds.slice(start, start + BATCH_SIZE);
          const { error: delError } = await supabase
            .from('screen_rates')
            .delete()
            .in('screen_id', batchIds);
          if (delError) throw delError;
        }

        for (let start = 0; start < rateRows.length; start += BATCH_SIZE) {
          const batchRates = rateRows.slice(start, start + BATCH_SIZE);
          const { error: insError } = await supabase
            .from('screen_rates')
            .insert(batchRates);
          if (insError) throw insError;
          ratesInserted += batchRates.length;
        }
      } catch (rateErr) {
        console.warn('⚠️ Importou telas, mas falhou ao atualizar screen_rates:', rateErr);
        toast({
          title: "Aviso",
          description: "As telas foram importadas, mas houve erro ao atualizar as taxas (screen_rates). Verifique permissões/RLS.",
          variant: "destructive",
        });
      }

      setUploadProgress(100);

      toast({
        title: "Importação concluída",
        description: `${totalItems} linha(s) válidas • ${skippedTemplateRows ? `${skippedTemplateRows} ignoradas (template) • ` : ''}${upsertedRows} tela(s) upsertadas • ${ratesInserted} taxa(s) atualizada(s) • ${ratesSkipped} sem taxas no arquivo`,
      });

      // Fechar modal e recarregar dados
      setUploadModalOpen(false);
      setUploadFile(null);
      setUploadProgress(0);
      await fetchScreens();
      
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
        'Código': screen.code || '',
        'Nome de Exibição': screen.display_name || '',
        'Endereço': screen.venue_info?.address || screen.address || '',
        'Cidade': screen.city || '',
        'Estado': screen.state || '',
        'CEP': screen.zip_code || '',
        'Especialidade': screen.specialty || '',
        'Ativo': screen.active ? 'Sim' : 'Não',
        'Ambiente': screen.ambiente || '',
        'Audiência Pacientes': screen.audiencia_pacientes ?? '',
        'Audiência Local': screen.audiencia_local ?? '',
        'Audiência HCP': screen.audiencia_hcp ?? '',
        'Audiência Médica': screen.audiencia_medica ?? '',
        'Aceita convênio': screen.aceita_convenio == null ? '' : (screen.aceita_convenio ? 'Sim' : 'Não'),
        'Latitude': screen.lat || '',
        'Longitude': screen.lng || '',
        'Taxa Padrão (Mês)': screen.screen_rates?.standard_rate_month || '',
        'Taxa Venda (Mês)': screen.screen_rates?.selling_rate_month || '',
        'Spots por Hora': screen.screen_rates?.spots_per_hour || '',
        'Duração Spot (seg)': screen.screen_rates?.spot_duration_secs || '',
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
            <Card className="w-full max-w-md rounded-2xl shadow-lg">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        <PageHeader
          icon={Monitor}
          title="Inventário de Telas"
          description="Gerencie e visualize todas as telas do sistema TV Doutor"
          badges={[
            { label: `${stats.total} telas`, variant: "default" },
            { label: `${stats.active} ativas`, variant: "default" }
          ]}
          actions={
            <>
              <Button 
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="bg-white/10 text-white border-white/30 hover:bg-white/20 transition-all group"
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform`} />
                {refreshing ? "Atualizando..." : "Atualizar"}
              </Button>
              
              {isAdmin() && (
                <Button 
                  variant="outline"
                  onClick={() => setUploadModalOpen(true)}
                  className="bg-white/10 text-white border-white/30 hover:bg-white/20 transition-all group"
                >
                  <FileSpreadsheet className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                  Upload CSV
                </Button>
              )}
              
              <Button 
                variant="outline"
                onClick={handleExportScreens} 
                disabled={exporting}
                className="bg-white/10 text-white border-white/30 hover:bg-white/20 transition-all group"
              >
                <Download className="h-5 w-5 mr-2 group-hover:translate-y-1 transition-transform" />
                {exporting ? "Exportando..." : "Exportar"}
              </Button>
              
              {(isAdmin() || isManager()) && (
                <Button 
                  onClick={() => setAddModalOpen(true)}
                  className="bg-white text-[#f48220] hover:bg-white/90 shadow-2xl hover:shadow-white/50 hover:scale-105 transition-all font-bold group"
                >
                  <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform" />
                  Adicionar Tela
                </Button>
              )}
            </>
          }
        />

        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-12 space-y-8">

        {/* Stats Cards */}
          <StatsGrid
            columns={4}
            stats={[
              {
                title: "Total de Telas",
                value: loading ? "..." : stats.total.toLocaleString('pt-BR'),
                subtitle: "Todas as telas",
                icon: Monitor,
                gradient: "bg-gradient-to-br from-[#f48220] to-[#e67516]",
                badge: { label: "Inventário", icon: BarChart3 }
              },
              {
                title: "Telas Ativas",
                value: loading ? "..." : stats.active.toLocaleString('pt-BR'),
                subtitle: !loading && stats.total > 0 ? `${((stats.active / stats.total) * 100).toFixed(1)}% do total` : "Operacionais",
                icon: CheckCircle,
                gradient: "bg-gradient-to-br from-[#ffb87a] to-[#ffc499]",
                badge: { label: "Operacionais", icon: TrendingUp }
              },
              {
                title: "Telas Inativas",
                value: loading ? "..." : stats.inactive.toLocaleString('pt-BR'),
                subtitle: !loading && stats.total > 0 ? `${((stats.inactive / stats.total) * 100).toFixed(1)}% do total` : "Fora de operação",
                icon: XCircle,
                gradient: "bg-gradient-to-br from-slate-500 to-slate-600"
              },
              {
                title: "Cidades",
                value: loading ? "..." : stats.totalCities.toLocaleString('pt-BR'),
                subtitle: !loading && stats.withLocation > 0 ? `${stats.withLocation} com localização` : "Distribuição",
                icon: MapPin,
                gradient: "bg-gradient-to-br from-[#ff9d4d] to-[#ffb87a]",
                badge: { label: "Geolocalização", icon: MapPin }
              }
            ]}
          />

          {/* Filters and Search */}
          <Card className="border-0 shadow-lg hover:shadow-2xl transition-all rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-[#f48220]/10 rounded-xl">
                  <Filter className="h-5 w-5 text-[#f48220]" />
                </div>
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
                  className="pl-10 h-12 bg-white border-2 border-slate-200 hover:border-[#f48220]/50 focus:border-[#f48220] transition-all"
                />
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 h-12 bg-white border-2 border-slate-200 hover:border-[#f48220]/50 focus:border-[#f48220] transition-all">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="ativa">Apenas Ativas</SelectItem>
                    <SelectItem value="inativa">Apenas Inativas</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger className="w-40 h-12 bg-white border-2 border-slate-200 hover:border-[#f48220]/50 focus:border-[#f48220] transition-all">
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
                  <SelectTrigger className="w-48 h-12 bg-white border-2 border-slate-200 hover:border-[#f48220]/50 focus:border-[#f48220] transition-all">
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
                    className="gap-2 h-12 border-2 hover:bg-[#f48220]/10 hover:border-[#f48220] hover:text-[#f48220] transition-all group"
                  >
                    <XCircle className="h-4 w-4 group-hover:rotate-90 transition-transform" />
                    Limpar Filtros
                  </Button>
                )}

                {(isAdmin() || isManager()) && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setSyncingTvdAll(true);
                      try {
                        const { data: res, error } = await supabase.functions.invoke('tvd-sync-trigger');
                        const payload = res as { ok?: boolean; total?: number; error?: string } | null;
                        queryClient.invalidateQueries({ queryKey: ['tvd-player-status'] });
                        if (error) throw new Error(error);
                        if (payload?.ok) {
                          toast({ title: 'Sincronizado', description: `${payload.total ?? 0} players atualizados no app.tvdoutor.` });
                        } else {
                          toast({ title: 'Erro', description: payload?.error || 'Não foi possível sincronizar.', variant: 'destructive' });
                        }
                      } catch (e) {
                        toast({ title: 'Erro', description: e instanceof Error ? e.message : 'Não foi possível sincronizar.', variant: 'destructive' });
                      } finally {
                        setSyncingTvdAll(false);
                      }
                    }}
                    disabled={syncingTvdAll}
                    className="gap-2 h-12 border-2 hover:bg-[#f48220]/10 hover:border-[#f48220] hover:text-[#f48220] transition-all"
                  >
                    {syncingTvdAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Sincronizar TVD
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
          <Card className="border-0 shadow-lg hover:shadow-2xl transition-all rounded-2xl" data-inventory-table>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="p-2 bg-[#f48220]/10 rounded-xl">
                    <BarChart3 className="h-5 w-5 text-[#f48220]" />
                  </div>
                  Lista de Telas
                </CardTitle>
              <div className="text-sm text-muted-foreground">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando...
                  </div>
                ) : filteredScreens.length > 0 ? (
                  <>
                    {filteredScreens.length} telas
                    {totalPages > 1 && (
                      <span className="text-muted-foreground/80">
                        {" "}(pág. {currentPage}/{totalPages})
                      </span>
                    )}
                  </>
                ) : (
                  "Nenhuma tela"
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {tvdStatusError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="mb-1">Não foi possível carregar o status de conexão TVD. Confira se a Edge Function <code className="font-mono text-xs">tvd-player-status</code> está deployada, se você está logado e se o sync <code className="font-mono text-xs">tvd-sync-players</code> populou a tabela.</p>
                  {tvdStatusErr && (
                    <p className="mt-2 text-xs opacity-90 font-mono break-all">
                      {[tvdStatusErr?.code, tvdStatusErr?.message].filter(Boolean).join(' — ') || String(tvdStatusErr)}
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}
            {!tvdStatusError && !tvdStatusLoading && venueCodes.length > 0 && (!tvdStatusMap || Object.keys(tvdStatusMap).length === 0) && (
              <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhum dado de conexão TVD encontrado. Execute a Edge Function <code className="font-mono text-xs">tvd-sync-players</code> (com header <code className="font-mono text-xs">x-cron-secret</code>) para popular a tabela <code className="font-mono text-xs">tvd_player_status</code>. No Supabase: Functions → tvd-sync-players → Invoke, ou configure um cron que chame a URL com o secret.
                </AlertDescription>
              </Alert>
            )}
            <div className="overflow-x-auto -mx-6 px-6">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Código do Ponto</TableHead>
                    <TableHead className="min-w-[220px]">Localização</TableHead>
                    <TableHead className="min-w-[90px]">Status</TableHead>
                    <TableHead className="min-w-[80px]">Classe</TableHead>
                    <TableHead className="min-w-[140px]">Conexão (TVD)</TableHead>
                    <TableHead className="min-w-[100px]">Audiência</TableHead>
                    <TableHead className="min-w-[100px]">Ambiente</TableHead>
                    <TableHead className="min-w-[90px]">Convênio</TableHead>
                    {((searchTerm && searchTerm.trim() !== '') || statusFilter !== "all" || classFilter !== "all" || specialtyFilter !== "all") && (
                      <TableHead className="min-w-[350px]">Especialidades</TableHead>
                    )}
                    <TableHead className="min-w-[120px] sticky right-0 bg-background z-10">Ações</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => {
                    const hasFilters = (searchTerm && searchTerm.trim() !== '') || statusFilter !== "all" || classFilter !== "all" || specialtyFilter !== "all";
                    return (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                        {hasFilters && (
                          <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        )}
                        <TableCell className="sticky right-0 bg-background z-10"><Skeleton className="h-4 w-20" /></TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  paginatedScreens.map((screen) => {
                    const hasFilters = (searchTerm && searchTerm.trim() !== '') || statusFilter !== "all" || classFilter !== "all" || specialtyFilter !== "all";
                    return (
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
                          {tvdStatusLoading ? (
                            <Skeleton className="h-4 w-20" />
                          ) : (() => {
                            const st = tvdStatusMap?.[screen.code];
                            if (!st) return (
                              <div className="flex items-center gap-1">
                                <span
                                  className="text-muted-foreground text-xs"
                                  title={tvdStatusError ? 'Status TVD indisponível' : 'Sem registro de conexão TVD. Clique para sincronizar.'}
                                >
                                  —
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  disabled={syncingTvdCode === screen.code}
                                  onClick={async () => {
                                    setSyncingTvdCode(screen.code);
                                    try {
                                      const { data: res, error } = await supabase.functions.invoke('tvd-verify-sync-player', { body: { code: screen.code } });
                                      const payload = res as { found?: boolean; error?: string } | null;
                                      queryClient.invalidateQueries({ queryKey: ['tvd-player-status'] });
                                      if (payload?.found) {
                                        toast({ title: 'Sincronizado', description: `Ponto ${screen.code} sincronizado com sucesso.` });
                                      } else {
                                        toast({ title: 'Não encontrado', description: payload?.error || `Código ${screen.code} não encontrado no app.tvdoutor.`, variant: 'destructive' });
                                      }
                                    } catch {
                                      toast({ title: 'Erro', description: 'Não foi possível sincronizar.', variant: 'destructive' });
                                    } finally {
                                      setSyncingTvdCode(null);
                                    }
                                  }}
                                  title="Sincronizar com app.tvdoutor"
                                >
                                  {syncingTvdCode === screen.code ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            );
                            return (
                              <div className="text-xs space-y-0.5">
                                {st.is_connected ? (
                                  <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Online
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Offline
                                  </Badge>
                                )}
                                {st.last_seen && (
                                  <p className="text-muted-foreground">
                                    {format(new Date(st.last_seen), "dd/MM HH:mm", { locale: ptBR })}
                                  </p>
                                )}
                                {st.sync_progress != null && (
                                  <p className="text-muted-foreground">Sync {st.sync_progress}%</p>
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          {(screen.audience_monthly ?? screen.venue_info?.audience_monthly) != null && Number(screen.audience_monthly ?? screen.venue_info?.audience_monthly) > 0 ? (
                            <span className="text-sm font-medium" title="Audiência mensal">
                              {(screen.audience_monthly ?? screen.venue_info?.audience_monthly)?.toLocaleString('pt-BR')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-[100px]" title={screen.ambiente ?? ''}>
                          {screen.ambiente ? screen.ambiente : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {screen.aceita_convenio === true ? (
                            <Badge variant="default" className="text-xs">
                              Sim
                            </Badge>
                          ) : (
                            <Badge className="text-xs bg-red-600 hover:bg-red-600 text-white">
                              Não
                            </Badge>
                          )}
                        </TableCell>
                        {hasFilters && (
                          <TableCell>
                            {screen.specialty && screen.specialty.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[400px]">
                                {screen.specialty.map((spec, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs whitespace-nowrap">
                                    {spec}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">Nenhuma</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="sticky right-0 bg-background z-10">
                          <div className="flex items-center gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleViewScreen(screen)}
                              className="h-8 w-8 p-0"
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleEditScreen(screen)}
                              className="h-8 w-8 p-0"
                              title="Editar tela"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
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
                    );
                  })
                )
              }
              </TableBody>
            </Table>

              {!loading && filteredScreens.length > 0 && totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredScreens.length)} de {filteredScreens.length} telas
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) {
                              setCurrentPage((p) => p - 1);
                              document.querySelector('[data-inventory-table]')?.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(pageNum);
                                document.querySelector('[data-inventory-table]')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer min-w-[2.25rem]"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) {
                              setCurrentPage((p) => p + 1);
                              document.querySelector('[data-inventory-table]')?.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}

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
                  
                  {(selectedScreen.ambiente || selectedScreen.aceita_convenio != null || selectedScreen.audiencia_pacientes != null || selectedScreen.audiencia_local != null || selectedScreen.audiencia_hcp != null || selectedScreen.audiencia_medica != null) && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Detalhes do ambiente</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {selectedScreen.ambiente && <div><span className="text-muted-foreground">Ambiente:</span> {selectedScreen.ambiente}</div>}
                        {selectedScreen.aceita_convenio != null && <div><span className="text-muted-foreground">Aceita convênio:</span> {selectedScreen.aceita_convenio ? 'Sim' : 'Não'}</div>}
                        {selectedScreen.audiencia_pacientes != null && selectedScreen.audiencia_pacientes > 0 && <div><span className="text-muted-foreground">Audiência Pacientes:</span> {selectedScreen.audiencia_pacientes?.toLocaleString('pt-BR')}</div>}
                        {selectedScreen.audiencia_local != null && selectedScreen.audiencia_local > 0 && <div><span className="text-muted-foreground">Audiência Local:</span> {selectedScreen.audiencia_local?.toLocaleString('pt-BR')}</div>}
                        {selectedScreen.audiencia_hcp != null && selectedScreen.audiencia_hcp > 0 && <div><span className="text-muted-foreground">Audiência HCP:</span> {selectedScreen.audiencia_hcp?.toLocaleString('pt-BR')}</div>}
                        {selectedScreen.audiencia_medica != null && selectedScreen.audiencia_medica > 0 && <div><span className="text-muted-foreground">Audiência Médica:</span> {selectedScreen.audiencia_medica?.toLocaleString('pt-BR')}</div>}
                      </div>
                    </div>
                  )}
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
                       placeholder="Ex: P3348.F01, P3348.F04.1"
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lat">Latitude</Label>
                    <Input
                      id="lat"
                      type="number"
                      step="any"
                      value={editingScreen.lat ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseFloat(e.target.value);
                        updateEditingScreen('lat', value);
                      }}
                      placeholder="Ex: -23.5505"
                    />
                    <p className="text-xs text-muted-foreground">
                      Coordenada de latitude (ex: -23.5505)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lng">Longitude</Label>
                    <Input
                      id="lng"
                      type="number"
                      step="any"
                      value={editingScreen.lng ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseFloat(e.target.value);
                        updateEditingScreen('lng', value);
                      }}
                      placeholder="Ex: -46.6333"
                    />
                    <p className="text-xs text-muted-foreground">
                      Coordenada de longitude (ex: -46.6333)
                    </p>
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
                  <Label htmlFor="audience_monthly">Audiência mensal</Label>
                  <Input
                    id="audience_monthly"
                    type="number"
                    min={0}
                    step={1}
                    value={editingScreen.audience_monthly ?? editingScreen.venue_info?.audience_monthly ?? ''}
                    onChange={(e) => {
                      const v = e.target.value === '' ? null : parseInt(e.target.value, 10);
                      updateEditingScreen('audience_monthly', Number.isNaN(v) ? null : v);
                    }}
                    placeholder="Ex: 45000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Estimativa de audiência mensal do ponto (pessoas/mês)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ambiente">Ambiente</Label>
                  <Input
                    id="ambiente"
                    value={editingScreen.ambiente ?? ''}
                    onChange={(e) => updateEditingScreen('ambiente', e.target.value || null)}
                    placeholder="Ex: sala de espera, consultório"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="audiencia_pacientes">Audiência Pacientes</Label>
                    <Input
                      id="audiencia_pacientes"
                      type="number"
                      min={0}
                      value={editingScreen.audiencia_pacientes ?? ''}
                      onChange={(e) => updateEditingScreen('audiencia_pacientes', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="audiencia_local">Audiência Local</Label>
                    <Input
                      id="audiencia_local"
                      type="number"
                      min={0}
                      value={editingScreen.audiencia_local ?? ''}
                      onChange={(e) => updateEditingScreen('audiencia_local', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="audiencia_hcp">Audiência HCP</Label>
                    <Input
                      id="audiencia_hcp"
                      type="number"
                      min={0}
                      value={editingScreen.audiencia_hcp ?? ''}
                      onChange={(e) => updateEditingScreen('audiencia_hcp', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="audiencia_medica">Audiência Médica</Label>
                    <Input
                      id="audiencia_medica"
                      type="number"
                      min={0}
                      value={editingScreen.audiencia_medica ?? ''}
                      onChange={(e) => updateEditingScreen('audiencia_medica', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="aceita_convenio"
                    checked={editingScreen.aceita_convenio ?? false}
                    onCheckedChange={(checked) => updateEditingScreen('aceita_convenio', checked)}
                  />
                  <Label htmlFor="aceita_convenio">Aceita convênio</Label>
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
                <Label htmlFor="new-audience_monthly">Audiência mensal</Label>
                <Input
                  id="new-audience_monthly"
                  type="number"
                  min={0}
                  step={1}
                  value={newScreen.audience_monthly ?? ''}
                  onChange={(e) => {
                    const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                    updateNewScreen('audience_monthly', (v !== undefined && !Number.isNaN(v)) ? v : undefined);
                  }}
                  placeholder="Ex: 45000"
                />
                <p className="text-xs text-muted-foreground">Estimativa de audiência mensal do ponto (pessoas/mês)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-ambiente">Ambiente</Label>
                <Input
                  id="new-ambiente"
                  value={newScreen.ambiente ?? ''}
                  onChange={(e) => updateNewScreen('ambiente', e.target.value || null)}
                  placeholder="Ex: sala de espera, consultório"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-audiencia_pacientes">Audiência Pacientes</Label>
                  <Input id="new-audiencia_pacientes" type="number" min={0} value={newScreen.audiencia_pacientes ?? ''} onChange={(e) => updateNewScreen('audiencia_pacientes', e.target.value === '' ? null : parseInt(e.target.value, 10))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-audiencia_local">Audiência Local</Label>
                  <Input id="new-audiencia_local" type="number" min={0} value={newScreen.audiencia_local ?? ''} onChange={(e) => updateNewScreen('audiencia_local', e.target.value === '' ? null : parseInt(e.target.value, 10))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-audiencia_hcp">Audiência HCP</Label>
                  <Input id="new-audiencia_hcp" type="number" min={0} value={newScreen.audiencia_hcp ?? ''} onChange={(e) => updateNewScreen('audiencia_hcp', e.target.value === '' ? null : parseInt(e.target.value, 10))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-audiencia_medica">Audiência Médica</Label>
                  <Input id="new-audiencia_medica" type="number" min={0} value={newScreen.audiencia_medica ?? ''} onChange={(e) => updateNewScreen('audiencia_medica', e.target.value === '' ? null : parseInt(e.target.value, 10))} />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="new-aceita_convenio" checked={newScreen.aceita_convenio ?? false} onCheckedChange={(checked) => updateNewScreen('aceita_convenio', checked)} />
                <Label htmlFor="new-aceita_convenio">Aceita convênio</Label>
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

        {/* Modal de Upload de CSV / Lista de audiência */}
        <Dialog open={uploadModalOpen} onOpenChange={(open) => { setUploadModalOpen(open); if (!open) setUploadFile(null); setUploadProgress(0); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Importar planilha
              </DialogTitle>
              <DialogDescription>
                {uploadMode === 'audience'
                  ? 'Envie uma lista com Código e Audiência. Telas existentes terão a audiência atualizada; códigos novos serão cadastrados.'
                  : 'Importe múltiplas telas através de um arquivo CSV ou Excel'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'full' | 'audience')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="full">Inventário completo</TabsTrigger>
                  <TabsTrigger value="audience">Lista de audiência</TabsTrigger>
                </TabsList>
              </Tabs>

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
                      if (uploadMode === 'audience') {
                        const link = document.createElement('a');
                        link.href = '/template-audiencia.csv';
                        link.download = 'template-audiencia.csv';
                        link.click();
                      } else {
                        const link = document.createElement('a');
                        link.href = '/template-inventario.csv';
                        link.download = 'template-inventario.csv';
                        link.click();
                      }
                    }}
                    className="gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Baixar Template
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  {uploadMode === 'audience' ? (
                    <>
                      <p>• Colunas obrigatórias: <code>Código</code> (ex: P2000, P2000.1), <code>Audiência</code> (número inteiro, ex: 45000)</p>
                      <p>• Opcionais para novos cadastros: <code>Nome de Exibição</code>, <code>Cidade</code>, <code>Estado</code>, <code>Endereço</code></p>
                      <p>• Se o código já existir no sistema, apenas a audiência será atualizada. Se não existir, a tela será cadastrada com os dados da linha.</p>
                    </>
                  ) : (
                    <>
                      <p>• Colunas obrigatórias: <code>Código</code>, <code>Nome de Exibição</code></p>
                      <p>• Colunas opcionais: <code>Cidade</code>, <code>Estado</code>, <code>Endereço</code>, <code>CEP</code>, <code>Classe</code>, <code>Especialidade</code>, <code>Ativo</code>, <code>Latitude</code>, <code>Longitude</code>, <code>Ambiente</code>, <code>Audiência Pacientes</code>, <code>Audiência Local</code>, <code>Audiência HCP</code>, <code>Audiência Médica</code>, <code>Aceita convênio</code> (Sim/Não)</p>
                      <p>• CSV pode usar <code>;</code> ou <code>,</code> como separador. Para decimais, aceitamos <code>,</code> (ex: -23,55) ou <code>.</code> (ex: -23.55)</p>
                      <p>• Para <code>Ativo</code>: use "Sim" ou "Não" (padrão: Sim)</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              {uploadMode === 'full' && (
                <div className="flex-1 flex items-center gap-2 justify-start">
                  <Switch
                    id="replace-import"
                    checked={replaceExistingOnImport}
                    onCheckedChange={(checked) => setReplaceExistingOnImport(checked)}
                    disabled={uploading}
                  />
                  <Label htmlFor="replace-import" className="text-sm">
                    Substituir base (inativar telas atuais antes de importar)
                  </Label>
                </div>
              )}
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
                onClick={uploadMode === 'audience' ? handleUploadAudienceList : handleUploadScreens}
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
                    {uploadMode === 'audience' ? 'Importar audiência' : 'Importar Arquivo'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Inventory;

