// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProposalCard } from "@/components/ProposalCard";
import { type ProposalStatus } from "@/components/ProposalStatusBadge";
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Download,
  Send,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  BarChart3,
  Sparkles,
  ArrowUpRight,
  Grid3x3,
  List,
  Target,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// Utility functions
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const getStatusColor = (status: ProposalStatus) => {
  switch (status) {
    case 'rascunho': return 'bg-gray-100 text-gray-800';
    case 'enviada': return 'bg-blue-100 text-blue-800';
    case 'em_analise': return 'bg-yellow-100 text-yellow-800';
    case 'aceita': return 'bg-green-100 text-green-800';
    case 'rejeitada': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: ProposalStatus) => {
  switch (status) {
    case 'rascunho': return FileText;
    case 'enviada': return Send;
    case 'em_analise': return Eye;
    case 'aceita': return TrendingUp;
    case 'rejeitada': return Trash2;
    default: return FileText;
  }
};

interface Proposal {
  id: number;
  customer_name: string;
  customer_email: string;
  proposal_type: 'avulsa' | 'projeto';
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
  status_updated_at: string;
  start_date?: string;
  end_date?: string;
  net_calendar?: number;
  gross_calendar?: number;
  created_by?: string;
}

interface ProposalStats {
  total: number;
  rascunho: number;
  enviada: number;
  em_analise: number;
  aceita: number;
  rejeitada: number;
}

const Propostas = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [stats, setStats] = useState<ProposalStats>({
    total: 0,
    rascunho: 0,
    enviada: 0,
    em_analise: 0,
    aceita: 0,
    rejeitada: 0
  });

  const calculateStats = (proposalsList: Proposal[]) => {
    const newStats = {
      total: proposalsList.length,
      rascunho: proposalsList.filter(p => p.status === 'rascunho').length,
      enviada: proposalsList.filter(p => p.status === 'enviada').length,
      em_analise: proposalsList.filter(p => p.status === 'em_analise').length,
      aceita: proposalsList.filter(p => p.status === 'aceita').length,
      rejeitada: proposalsList.filter(p => p.status === 'rejeitada').length,
    };
    setStats(newStats);
  };

  const fetchProposals = async () => {
    try {
      setLoading(true);
      console.log('🔍 Iniciando busca de propostas...');
      console.log('👤 Usuário atual:', user);
      
      if (!user) {
        console.warn('⚠️ Usuário não autenticado');
        setProposals([]);
        calculateStats([]);
        return;
      }

      console.log('🔍 Buscando propostas para usuário:', user.id);
      
      // Primeiro, tentar buscar propostas do usuário
      let { data, error } = await supabase
        .from('proposals')
        .select(`
          id,
          customer_name,
          customer_email,
          proposal_type,
          status,
          created_at,
          updated_at,
          status_updated_at,
          start_date,
          end_date,
          net_calendar,
          gross_calendar,
          created_by
        `)
        .eq('created_by', user.id)
        .order('status_updated_at', { ascending: false });

      console.log('📊 Resultado da busca (usuário):', { data, error });

      // Se não encontrou propostas do usuário, tentar buscar todas (para admins)
      if (!error && (!data || data.length === 0)) {
        console.log('🔍 Nenhuma proposta do usuário encontrada, tentando buscar todas...');
        
        const { data: allData, error: allError } = await supabase
          .from('proposals')
          .select(`
            id,
            customer_name,
            customer_email,
            proposal_type,
            status,
            created_at,
            updated_at,
            status_updated_at,
            start_date,
            end_date,
            net_calendar,
            gross_calendar,
            created_by
          `)
          .order('status_updated_at', { ascending: false });

        console.log('📊 Resultado da busca (todas):', { data: allData, error: allError });
        
        if (!allError) {
          data = allData;
          error = allError;
        }
      }

      if (error) {
        console.error('❌ Erro na busca:', error);
        throw error;
      }

      console.log(`✅ Propostas encontradas: ${data?.length || 0}`);
      setProposals(data || []);
      calculateStats(data || []);
    } catch (error: any) {
      console.error('❌ Erro ao buscar propostas:', error);
      toast.error('Erro ao carregar propostas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    let filtered = [...proposals];

    // Filtro por texto
    if (searchTerm) {
      filtered = filtered.filter(proposal =>
        proposal.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proposal.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proposal.id.toString().includes(searchTerm)
      );
    }

    // Filtro por status
    if (statusFilter !== "all") {
      filtered = filtered.filter(proposal => proposal.status === statusFilter);
    }

    // Filtro por tipo
    if (typeFilter !== "all") {
      filtered = filtered.filter(proposal => proposal.proposal_type === typeFilter);
    }

    console.log('✅ Filtros aplicados:', {
      total: proposals.length,
      filtradas: filtered.length,
      statusFilter,
      typeFilter,
      searchTerm
    });

    setFilteredProposals(filtered);
  }, [proposals, searchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    console.log('🔄 useEffect executado - user mudou:', user);
    fetchProposals();
  }, [user]);

  useEffect(() => {
    console.log('🔄 Aplicando filtros:', { 
      proposalsCount: proposals.length, 
      searchTerm, 
      statusFilter, 
      typeFilter
    });
    applyFilters();
  }, [applyFilters]);

  const handleView = (id: number) => {
    navigate(`/propostas/${id}`);
  };

  const handleEdit = (id: number) => {
    navigate(`/nova-proposta?edit=${id}`);
  };

  const handleStatusChange = (id: number, newStatus: ProposalStatus) => {
    setProposals(prev => prev.map(p => 
      p.id === id ? { ...p, status: newStatus, status_updated_at: new Date().toISOString() } : p
    ));
  };

  const handleRefresh = () => {
    fetchProposals();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja excluir esta proposta?")) return;

    try {
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Proposta excluída com sucesso");
      fetchProposals();
    } catch (error: any) {
      console.error('Erro ao excluir proposta:', error);
      toast.error('Erro ao excluir proposta');
    }
  };


  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Loading Animation */}
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <Sparkles className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
              </div>
              <p className="mt-6 text-lg font-semibold text-slate-600">Carregando propostas...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        {/* Hero Header com Gradiente */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#f48220] via-[#ff9d4d] to-[#ffb87a] p-8 md:p-12 mb-8">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#f48220]/95 via-[#ff9d4d]/85 to-transparent" />
          
          {/* Floating Orbs */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#ff9d4d]/25 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#ffb87a]/25 rounded-full blur-3xl animate-pulse delay-1000" />
          
          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 shadow-2xl">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                      Propostas
                    </h1>
                    <p className="text-white/90 text-lg font-medium">
                      Gerencie suas propostas comerciais • {stats.total} no total
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  className="bg-white/10 text-white border-white/30 backdrop-blur-sm hover:bg-white/20 hover:scale-105 transition-all duration-300 font-bold"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Atualizar
                </Button>
                <Button
                  onClick={() => navigate('/nova-proposta')}
                  className="bg-white text-[#f48220] hover:bg-white/90 shadow-2xl hover:shadow-white/50 hover:scale-105 transition-all duration-300 font-bold group"
                >
                  <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                  Nova Proposta
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-12 space-y-8">
          {/* Stats Cards com Efeito Glassmorphism */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 relative z-10 mb-4" style={{ isolation: 'isolate' }}>
            <Card 
              className="group border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer bg-gradient-to-br from-[#f48220] to-[#e67516] overflow-hidden relative"
              onClick={(e) => {
                e.stopPropagation();
                console.log('🖱️ Card Total clicado');
                setStatusFilter("all");
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#ff9d4d]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
                    <BarChart3 className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-3xl font-black text-white">{stats.total}</div>
                    <div className="text-xs text-white/80 font-medium">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="group border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer bg-gradient-to-br from-slate-500 to-slate-600 overflow-hidden relative"
              onClick={(e) => {
                e.stopPropagation();
                console.log('🖱️ Card Rascunho clicado');
                setStatusFilter('rascunho');
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-3xl font-black text-white">{stats.rascunho}</div>
                    <div className="text-xs text-white/80 font-medium">Rascunho</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="group border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer bg-gradient-to-br from-[#ff9d4d] to-[#ffb87a] overflow-hidden relative"
              onClick={(e) => {
                e.stopPropagation();
                console.log('🖱️ Card Enviadas clicado');
                setStatusFilter('enviada');
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#ffc499]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
                    <Send className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-3xl font-black text-white">{stats.enviada}</div>
                    <div className="text-xs text-white/80 font-medium">Enviadas</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="group border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer bg-gradient-to-br from-[#d66912] to-[#b85a0f] overflow-hidden relative"
              onClick={(e) => {
                e.stopPropagation();
                console.log('🖱️ Card Análise clicado');
                setStatusFilter('em_analise');
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#e67516]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-3xl font-black text-white">{stats.em_analise}</div>
                    <div className="text-xs text-white/80 font-medium">Análise</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="group border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer bg-gradient-to-br from-[#ffb87a] to-[#ffc499] overflow-hidden relative"
              onClick={(e) => {
                e.stopPropagation();
                console.log('🖱️ Card Aceitas clicado');
                setStatusFilter('aceita');
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#ffd4b8]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-3xl font-black text-white">{stats.aceita}</div>
                    <div className="text-xs text-white/80 font-medium">Aceitas</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="group border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer bg-gradient-to-br from-red-500 to-red-600 overflow-hidden relative"
              onClick={(e) => {
                e.stopPropagation();
                console.log('🖱️ Card Rejeitadas clicado');
                setStatusFilter('rejeitada');
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardContent className="p-4 relative z-10">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
                    <Trash2 className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-3xl font-black text-white">{stats.rejeitada}</div>
                    <div className="text-xs text-white/80 font-medium">Rejeitadas</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters Card com Design Moderno */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm relative z-20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-[#f48220]/10 rounded-lg">
                  <Filter className="h-5 w-5 text-[#f48220]" />
                </div>
                Filtros e Busca
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-[#f48220] transition-colors" />
                    <Input
                      placeholder="Buscar por cliente, email, ID ou descrição..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-12 bg-white border-2 border-slate-200 hover:border-[#f48220]/50 focus:border-[#f48220] transition-all"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[150px] h-12 bg-white border-2 border-slate-200 hover:border-[#f48220]/50 focus:border-[#f48220] transition-all">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Status</SelectItem>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                      <SelectItem value="enviada">Enviada</SelectItem>
                      <SelectItem value="em_analise">Em Análise</SelectItem>
                      <SelectItem value="aceita">Aceita</SelectItem>
                      <SelectItem value="rejeitada">Rejeitada</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[150px] h-12 bg-white border-2 border-slate-200 hover:border-[#f48220]/50 focus:border-[#f48220] transition-all">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Tipos</SelectItem>
                      <SelectItem value="avulsa">Avulsa</SelectItem>
                      <SelectItem value="projeto">Projeto</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {(searchTerm || statusFilter !== "all" || typeFilter !== "all") && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                        setTypeFilter("all");
                      }}
                      className="h-12 px-4 border-2 hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-all"
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium text-slate-600">
                  {filteredProposals.length} de {proposals.length} propostas exibidas
                </span>
                {filteredProposals.length !== proposals.length && (
                  <Badge className="bg-[#f48220]/10 text-[#f48220] border-[#f48220]/20 hover:bg-[#f48220]/20">
                    Filtrado
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Proposals Content */}
          <div className="space-y-6 relative" style={{ isolation: 'isolate' }}>
            <div className="flex items-center gap-2 relative z-50" style={{ pointerEvents: 'auto' }}>
              <div className="grid w-full max-w-[400px] grid-cols-2 h-12 bg-white border-2 border-slate-200 shadow-lg rounded-md p-1 relative z-50">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🖱️ Botão Grade clicado - statusFilter atual:', statusFilter);
                    setViewMode('grid');
                    console.log('✅ ViewMode alterado para: grid');
                  }}
                  className={`flex items-center justify-center gap-2 rounded-md transition-all relative z-50 ${
                    viewMode === 'grid'
                      ? 'bg-[#f48220] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  style={{ pointerEvents: 'auto' }}
                >
                  <Grid3x3 className="h-4 w-4" />
                  Grade
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🖱️ Botão Lista clicado - statusFilter atual:', statusFilter);
                    setViewMode('list');
                    console.log('✅ ViewMode alterado para: list');
                  }}
                  className={`flex items-center justify-center gap-2 rounded-md transition-all relative z-50 ${
                    viewMode === 'list'
                      ? 'bg-[#f48220] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  style={{ pointerEvents: 'auto' }}
                >
                  <List className="h-4 w-4" />
                  Lista
                </button>
              </div>
            </div>

            {viewMode === 'grid' && (
              <div>
              {filteredProposals.length === 0 ? (
                <Card className="border-2 border-dashed border-slate-300 bg-white/50 backdrop-blur-sm">
                  <CardContent className="p-12 text-center">
                    <div className="mx-auto w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-6 shadow-inner">
                      <FileText className="h-12 w-12 text-slate-400" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-slate-800">
                      {proposals.length === 0 ? 'Nenhuma proposta criada' : 'Nenhum resultado encontrado'}
                    </h3>
                    <p className="text-slate-600 mb-6 max-w-sm mx-auto">
                      {proposals.length === 0 
                        ? 'Comece criando sua primeira proposta comercial para começar a gerenciar seus negócios.'
                        : 'Tente ajustar os filtros ou termos de busca para encontrar as propostas desejadas.'
                      }
                    </p>
                    <Button 
                      onClick={() => navigate('/nova-proposta')} 
                      size="lg"
                      className="shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
                    >
                      <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                      Criar Nova Proposta
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProposals.map((proposal) => (
                    <ModernProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      onView={handleView}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              )}
              </div>
            )}

            {viewMode === 'list' && (
              <div className="space-y-4">
                {filteredProposals.length === 0 ? (
                  <Card className="border-2 border-dashed border-slate-300 bg-white/50 backdrop-blur-sm">
                    <CardContent className="p-12 text-center">
                      <FileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-xl font-bold mb-2 text-slate-800">
                        {proposals.length === 0 ? 'Nenhuma proposta criada' : 'Nenhum resultado encontrado'}
                      </h3>
                      <p className="text-slate-600 mb-4">
                        {proposals.length === 0 
                          ? 'Comece criando sua primeira proposta comercial.'
                          : 'Tente ajustar os filtros para encontrar o que procura.'
                        }
                      </p>
                      <Button 
                        onClick={() => navigate('/nova-proposta')} 
                        className="shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group"
                      >
                        <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                        Criar Nova Proposta
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  filteredProposals.map((proposal) => (
                    <ListProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      onView={handleView}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );

  // Componente de Card Moderno para Propostas
  function ModernProposalCard({ 
    proposal, 
    onView, 
    onEdit, 
    onDelete, 
    onStatusChange
  }: {
    proposal: Proposal;
    onView: (id: number) => void;
    onEdit: (id: number) => void;
    onDelete: (id: number) => void;
    onStatusChange: (id: number, status: ProposalStatus) => void;
  }) {
    const StatusIcon = getStatusIcon(proposal.status);
    
    return (
      <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f48220]/5 to-[#ff9d4d]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#f48220]/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
        
        <CardHeader className="pb-3 relative z-10">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Badge className={`${getStatusColor(proposal.status)} text-xs px-2 py-1 shadow-sm`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {proposal.status}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">#{proposal.id}</span>
              </div>
              <CardTitle className="text-lg leading-tight group-hover:text-[#f48220] transition-colors line-clamp-2">
                {proposal.customer_name}
              </CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 hover:text-primary"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onView(proposal.id)} className="gap-2 cursor-pointer">
                  <Eye className="h-4 w-4" />
                  Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(proposal.id)} className="gap-2 cursor-pointer">
                  <Edit className="h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <Download className="h-4 w-4" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(proposal.id)} 
                  className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{proposal.customer_email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>Criada em {formatDate(proposal.created_at)}</span>
            </div>
            {(proposal.net_calendar || proposal.gross_calendar) && (
              <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                <DollarSign className="h-4 w-4 flex-shrink-0" />
                <span>
                  {proposal.net_calendar && formatCurrency(proposal.net_calendar)}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 pt-2 border-t">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onView(proposal.id)}
              className="flex-1 text-xs h-9 hover:bg-[#f48220]/10 hover:text-[#f48220] hover:border-[#f48220] transition-all group/btn"
            >
              <Eye className="h-3 w-3 mr-1 group-hover/btn:scale-110 transition-transform" />
              Ver
            </Button>
            <Button 
              size="sm" 
              onClick={() => onEdit(proposal.id)}
              className="flex-1 text-xs h-9 shadow-md hover:shadow-lg hover:scale-105 transition-all"
            >
              <Edit className="h-3 w-3 mr-1" />
              Editar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Componente de Lista para Propostas
  function ListProposalCard({ 
    proposal, 
    onView, 
    onEdit, 
    onDelete, 
    onStatusChange
  }: {
    proposal: Proposal;
    onView: (id: number) => void;
    onEdit: (id: number) => void;
    onDelete: (id: number) => void;
    onStatusChange: (id: number, status: ProposalStatus) => void;
  }) {
    const StatusIcon = getStatusIcon(proposal.status);
    
    return (
      <Card className="group w-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#f48220]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardContent className="p-5 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="p-3 bg-gradient-to-br from-[#f48220]/10 to-[#ff9d4d]/10 rounded-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                <StatusIcon className="h-6 w-6 text-[#f48220]" />
              </div>
              
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg truncate group-hover:text-[#f48220] transition-colors">{proposal.customer_name}</h3>
                  <Badge className={`${getStatusColor(proposal.status)} text-xs flex-shrink-0 shadow-sm`}>
                    {proposal.status}
                  </Badge>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
                  <span className="truncate font-medium">{proposal.customer_email}</span>
                  <span className="hidden sm:inline text-slate-300">•</span>
                  <span className="font-mono text-xs">#{proposal.id}</span>
                  <span className="hidden sm:inline text-slate-300">•</span>
                  <span>{formatDate(proposal.created_at)}</span>
                  {(proposal.net_calendar || proposal.gross_calendar) && (
                    <>
                      <span className="hidden sm:inline text-slate-300">•</span>
                      <span className="font-bold text-green-600">
                        {proposal.net_calendar && formatCurrency(proposal.net_calendar)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onView(proposal.id)}
                className="hover:bg-[#f48220]/10 hover:border-[#f48220] hover:text-[#f48220] transition-all group/btn"
              >
                <Eye className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
              </Button>
              <Button 
                size="sm" 
                onClick={() => onEdit(proposal.id)}
                className="shadow-md hover:shadow-lg hover:scale-105 transition-all"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="hover:bg-[#f48220]/10 hover:border-[#f48220] transition-all"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="gap-2 cursor-pointer">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(proposal.id)} 
                    className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
};

export default Propostas;
