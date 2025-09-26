import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  BarChart3
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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
  const [stats, setStats] = useState<ProposalStats>({
    total: 0,
    rascunho: 0,
    enviada: 0,
    em_analise: 0,
    aceita: 0,
    rejeitada: 0
  });

  useEffect(() => {
    fetchProposals();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [proposals, searchTerm, statusFilter, typeFilter]);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        console.warn('Usuário não autenticado');
        setProposals([]);
        calculateStats([]);
        return;
      }

      const { data, error } = await supabase
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

      if (error) throw error;

      setProposals(data || []);
      calculateStats(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar propostas:', error);
      toast.error('Erro ao carregar propostas');
    } finally {
      setLoading(false);
    }
  };

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

  const applyFilters = () => {
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

    setFilteredProposals(filtered);
  };

  const handleView = (id: number) => {
    navigate(`/propostas/${id}`);
  };

  const handleEdit = (id: number) => {
    // Por enquanto navega para nova proposta (depois será página de edição)
    navigate(`/nova-proposta?edit=${id}`);
  };

  const handleStatusChange = (id: number, newStatus: ProposalStatus) => {
    // Atualizar estado local
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Propostas</h1>
              <p className="text-muted-foreground">Carregando...</p>
            </div>
            <div className="flex gap-2">
              <Button disabled className="gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Carregando
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-8 bg-gray-200 rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Propostas</h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie suas propostas comerciais • {stats.total} no total
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleRefresh} className="gap-2 text-sm">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button onClick={() => navigate('/nova-proposta')} className="gap-2 text-sm">
              <Plus className="h-4 w-4" />
              Nova Proposta
            </Button>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStatusFilter("all")}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStatusFilter('rascunho')}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <FileText className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600">{stats.rascunho}</div>
                  <div className="text-xs text-muted-foreground">Rascunho</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStatusFilter('enviada')}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Send className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.enviada}</div>
                  <div className="text-xs text-muted-foreground">Enviadas</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStatusFilter('em_analise')}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Eye className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.em_analise}</div>
                  <div className="text-xs text-muted-foreground">Análise</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStatusFilter('aceita')}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.aceita}</div>
                  <div className="text-xs text-muted-foreground">Aceitas</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStatusFilter('rejeitada')}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats.rejeitada}</div>
                  <div className="text-xs text-muted-foreground">Rejeitadas</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="bg-gradient-to-r from-gray-50/50 to-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5 text-primary" />
              Filtros e Busca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por cliente, email, ID ou descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 bg-white"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px] h-10 bg-white">
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
                  <SelectTrigger className="w-full sm:w-[150px] h-10 bg-white">
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
                    className="h-10 px-3 text-sm"
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {filteredProposals.length} de {proposals.length} propostas exibidas
              </span>
              {filteredProposals.length !== proposals.length && (
                <Badge variant="secondary" className="text-xs">
                  Filtrado
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Proposals Content */}
        <Tabs defaultValue="grid" className="space-y-6">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="grid" className="gap-2">
              <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-current rounded-[1px]" />
                ))}
              </div>
              Grade
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <div className="w-4 h-4 flex flex-col gap-0.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-current h-0.5 rounded-[1px]" />
                ))}
              </div>
              Lista
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grid">
            {filteredProposals.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <FileText className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">
                    {proposals.length === 0 ? 'Nenhuma proposta criada' : 'Nenhum resultado encontrado'}
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    {proposals.length === 0 
                      ? 'Comece criando sua primeira proposta comercial para começar a gerenciar seus negócios.'
                      : 'Tente ajustar os filtros ou termos de busca para encontrar as propostas desejadas.'
                    }
                  </p>
                  <Button onClick={() => navigate('/nova-proposta')} className="gap-2">
                    <Plus className="h-4 w-4" />
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
          </TabsContent>

          <TabsContent value="list">
            <div className="space-y-4">
              {filteredProposals.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {proposals.length === 0 ? 'Nenhuma proposta criada' : 'Nenhum resultado encontrado'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {proposals.length === 0 
                        ? 'Comece criando sua primeira proposta comercial.'
                        : 'Tente ajustar os filtros para encontrar o que procura.'
                      }
                    </p>
                    <Button onClick={() => navigate('/nova-proposta')} className="gap-2">
                      <Plus className="h-4 w-4" />
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
          </TabsContent>
        </Tabs>
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
      <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-primary/20 hover:border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className={`${getStatusColor(proposal.status)} text-xs px-2 py-1`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {proposal.status}
                </Badge>
                <span className="text-xs text-muted-foreground">#{proposal.id}</span>
              </div>
              <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                {proposal.customer_name}
              </CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onView(proposal.id)} className="gap-2">
                  <Eye className="h-4 w-4" />
                  Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(proposal.id)} className="gap-2">
                  <Edit className="h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Download className="h-4 w-4" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(proposal.id)} 
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="truncate">{proposal.customer_email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Criada em {formatDate(proposal.created_at)}</span>
            </div>
            {(proposal.net_calendar || proposal.gross_calendar) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>
                  {proposal.net_calendar && `Líq: ${formatCurrency(proposal.net_calendar)}`}
                  {proposal.net_calendar && proposal.gross_calendar && ' • '}
                  {proposal.gross_calendar && `Bruto: ${formatCurrency(proposal.gross_calendar)}`}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onView(proposal.id)}
              className="flex-1 text-xs h-8"
            >
              <Eye className="h-3 w-3 mr-1" />
              Ver
            </Button>
            <Button 
              size="sm" 
              onClick={() => onEdit(proposal.id)}
              className="flex-1 text-xs h-8"
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
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                <StatusIcon className="h-5 w-5 text-primary" />
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{proposal.customer_name}</h3>
                  <Badge className={`${getStatusColor(proposal.status)} text-xs flex-shrink-0`}>
                    {proposal.status}
                  </Badge>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
                  <span className="truncate">{proposal.customer_email}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>#{proposal.id}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{formatDate(proposal.created_at)}</span>
                  {(proposal.net_calendar || proposal.gross_calendar) && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span>
                        {proposal.net_calendar && formatCurrency(proposal.net_calendar)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={() => onView(proposal.id)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => onEdit(proposal.id)}>
                <Edit className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="gap-2">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(proposal.id)} 
                    className="gap-2 text-destructive focus:text-destructive"
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
