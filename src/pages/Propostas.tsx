import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProposalCard } from "@/components/ProposalCard";
import { type ProposalStatus } from "@/components/ProposalStatusBadge";
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  RefreshCw,
  Filter
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  }, []);

  useEffect(() => {
    applyFilters();
  }, [proposals, searchTerm, statusFilter, typeFilter]);

  const fetchProposals = async () => {
    try {
      setLoading(true);
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

  // Helper function for status icons
  // const getStatusIcon = (status: ProposalStatus) => {
  //   switch (status) {
  //     case 'rascunho': return FileText;
  //     case 'enviada': return TrendingUp;
  //     case 'em_analise': return Clock;
  //     case 'aceita': return CheckCircle;
  //     case 'rejeitada': return XCircle;
  //   }
  // };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Propostas</h1>
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-32 bg-gray-200 rounded"></div>
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Propostas</h1>
            <p className="text-muted-foreground">
              Gerencie todas as suas propostas comerciais ({stats.total} total)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button onClick={() => navigate('/nova-proposta')} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Proposta
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          
          <Card className="text-center cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter('rascunho')}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-600">{stats.rascunho}</div>
              <div className="text-sm text-muted-foreground">Rascunho</div>
            </CardContent>
          </Card>
          
          <Card className="text-center cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter('enviada')}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.enviada}</div>
              <div className="text-sm text-muted-foreground">Enviadas</div>
            </CardContent>
          </Card>
          
          <Card className="text-center cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter('em_analise')}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.em_analise}</div>
              <div className="text-sm text-muted-foreground">Em Análise</div>
            </CardContent>
          </Card>
          
          <Card className="text-center cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter('aceita')}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.aceita}</div>
              <div className="text-sm text-muted-foreground">Aceitas</div>
            </CardContent>
          </Card>
          
          <Card className="text-center cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter('rejeitada')}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.rejeitada}</div>
              <div className="text-sm text-muted-foreground">Rejeitadas</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por cliente, email ou ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="enviada">Enviada</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="aceita">Aceita</SelectItem>
                  <SelectItem value="rejeitada">Rejeitada</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
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
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Proposals List */}
        {filteredProposals.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {proposals.length === 0 ? 'Nenhuma proposta encontrada' : 'Nenhum resultado'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {proposals.length === 0 
                  ? 'Comece criando sua primeira proposta comercial.'
                  : 'Tente ajustar os filtros para encontrar o que procura.'
                }
              </p>
              <Button onClick={() => navigate('/nova-proposta')}>
                Criar Nova Proposta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onView={handleView}
                onEdit={handleEdit}
                onStatusChange={handleStatusChange}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Propostas;
