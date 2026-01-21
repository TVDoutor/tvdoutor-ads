import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Users, 
  Monitor, 
  Eye, 
  PlayCircle,
  PauseCircle,
  StopCircle,
  Target,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { AgenciaSelect } from '@/components/AgenciaSelect';
import { ProjetoSelect } from '@/components/ProjetoSelect';

interface Campaign {
  id: number;
  name: string;
  customer_name: string | null;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  notes: string | null;
  created_at: string;
  created_by: string;
  screen_count?: number;
}

interface CampaignFormData {
  name: string;
  customer_name: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  budget: string;
  notes: string;
  agencia_id: string | null;
  projeto_id: string | null;
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800'
};

const statusLabels = {
  draft: 'Rascunho',
  active: 'Ativa',
  paused: 'Pausada',
  completed: 'Concluída',
  cancelled: 'Cancelada'
};

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    customer_name: '',
    status: 'draft',
    start_date: '',
    end_date: '',
    budget: '',
    notes: '',
    agencia_id: null,
    projeto_id: null
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [campaigns, searchTerm, statusFilter]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      console.log('🔍 Buscando campanhas...');

      // Buscar campanhas com contagem de telas
      const { data: campaignsData, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_screens(count)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar campanhas:', error);
        throw error;
      }

      // Processar dados para incluir contagem de telas
      const processedCampaigns = campaignsData?.map(campaign => ({
        ...campaign,
        screen_count: campaign.campaign_screens?.[0]?.count || 0
      })) || [];

      console.log('✅ Campanhas carregadas:', processedCampaigns.length);
      setCampaigns(processedCampaigns);
      
      if (processedCampaigns.length > 0) {
        toast.success(`${processedCampaigns.length} campanhas carregadas`);
      }
    } catch (error: any) {
      console.error('💥 Erro ao buscar campanhas:', error);
      toast.error(`Erro ao carregar campanhas: ${error.message}`);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = campaigns;

    // Filtro de texto
    if (searchTerm.trim()) {
      filtered = filtered.filter(campaign =>
        campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (campaign.customer_name && campaign.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }

    setFilteredCampaigns(filtered);
  };

  const handleCreateCampaign = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Nome da campanha é obrigatório');
        return;
      }

      console.log('📝 Criando nova campanha...');

      const campaignData = {
        name: formData.name.trim(),
        customer_name: formData.customer_name.trim() || null,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        notes: formData.notes.trim() || null,
        agencia_id: formData.agencia_id,
        projeto_id: formData.projeto_id
      };

      const { data, error } = await supabase
        .from('campaigns')
        .insert([campaignData])
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar campanha:', error);
        throw error;
      }

      console.log('✅ Campanha criada:', data);
      toast.success('Campanha criada com sucesso!');
      
      // Resetar formulário e fechar dialog
      setFormData({
        name: '',
        customer_name: '',
        status: 'draft',
        start_date: '',
        end_date: '',
        budget: '',
        notes: '',
        agencia_id: null,
        projeto_id: null
      });
      setIsDialogOpen(false);
      
      // Recarregar campanhas
      fetchCampaigns();
    } catch (error: any) {
      console.error('💥 Erro ao criar campanha:', error);
      toast.error(`Erro ao criar campanha: ${error.message}`);
    }
  };

  const handleViewCampaign = (campaignId: number) => {
    navigate(`/campaigns/${campaignId}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatBudget = (budget: number | null) => {
    if (!budget) return '—';
    return budget.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return PlayCircle;
      case 'paused': return PauseCircle;
      case 'completed': return CheckCircle2;
      case 'cancelled': return StopCircle;
      default: return Clock;
    }
  };

  const getStatusProgress = (campaign: Campaign) => {
    if (!campaign.start_date || !campaign.end_date) return 0;
    
    const start = new Date(campaign.start_date).getTime();
    const end = new Date(campaign.end_date).getTime();
    const now = Date.now();
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    return Math.round(((now - start) / (end - start)) * 100);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-6"></div>
              <h3 className="text-xl font-semibold mb-2">Carregando Campanhas</h3>
              <p className="text-muted-foreground">
                Buscando suas campanhas publicitárias...
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Campanhas Publicitárias</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Gerencie e monitore suas campanhas • {campaigns.length} campanhas ativas
                  </p>
                </div>
              </div>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 shadow-sm">
                    <Plus className="w-4 h-4" />
                    Nova Campanha
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Nova Campanha Publicitária
                    </DialogTitle>
                    <DialogDescription>
                      Configure uma nova campanha para seus clientes com todos os detalhes necessários
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-4">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Informações Básicas
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nome da Campanha *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ex: Campanha Verão 2024"
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="customer">Cliente</Label>
                          <Input
                            id="customer"
                            value={formData.customer_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                            placeholder="Nome do cliente"
                            className="bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Cronograma e Status
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="status">Status</Label>
                          <Select 
                            value={formData.status} 
                            onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Rascunho</SelectItem>
                              <SelectItem value="active">Ativa</SelectItem>
                              <SelectItem value="paused">Pausada</SelectItem>
                              <SelectItem value="completed">Concluída</SelectItem>
                              <SelectItem value="cancelled">Cancelada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="start_date">Data Início</Label>
                          <Input
                            id="start_date"
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="end_date">Data Fim</Label>
                          <Input
                            id="end_date"
                            type="date"
                            value={formData.end_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                            className="bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Budget */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Orçamento
                      </h4>
                      <div className="space-y-2">
                        <Label htmlFor="budget">Orçamento Total (R$)</Label>
                        <Input
                          id="budget"
                          type="number"
                          step="0.01"
                          value={formData.budget}
                          onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                          placeholder="0,00"
                          className="bg-white"
                        />
                      </div>
                    </div>

                    {/* Project Association */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        Associação de Projeto
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AgenciaSelect 
                          value={formData.agencia_id} 
                          onChange={(id) => setFormData(prev => ({ ...prev, agencia_id: id, projeto_id: null }))} 
                        />
                        <ProjetoSelect 
                          agenciaId={formData.agencia_id} 
                          value={formData.projeto_id} 
                          onChange={(id) => setFormData(prev => ({ ...prev, projeto_id: id }))} 
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Observações Adicionais</h4>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Observações sobre a campanha, objetivos, requisitos especiais..."
                          rows={4}
                          className="bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateCampaign} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Criar Campanha
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white border-0 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-gray-600 text-sm font-medium">Total</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">{campaigns.length}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-0 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-green-50 rounded-xl">
                    <PlayCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <h3 className="text-gray-600 text-sm font-medium">Ativas</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {campaigns.filter(c => c.status === 'active').length}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-0 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-yellow-50 rounded-xl">
                    <PauseCircle className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <h3 className="text-gray-600 text-sm font-medium">Pausadas</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {campaigns.filter(c => c.status === 'paused').length}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-0 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <CheckCircle2 className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <h3 className="text-gray-600 text-sm font-medium">Concluídas</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {campaigns.filter(c => c.status === 'completed').length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Filters */}
          <Card className="bg-gradient-to-r from-gray-50/50 to-blue-50/50 border-l-4 border-l-primary">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
                Filtros e Busca
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Buscar Campanhas</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Nome da campanha ou cliente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="paused">Pausada</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                    }}
                    className="w-full"
                  >
                    Limpar filtros
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Exibindo <strong>{filteredCampaigns.length}</strong> de <strong>{campaigns.length}</strong> campanhas
                </span>
                <Button variant="outline" size="sm" onClick={fetchCampaigns} className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Recarregar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Campaigns Content */}
          <Tabs defaultValue="cards" className="space-y-6">
            <TabsList className="grid w-full max-w-[400px] grid-cols-2">
              <TabsTrigger value="cards" className="gap-2">
                <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-current rounded-[1px]" />
                  ))}
                </div>
                Cards
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-2">
                <div className="w-4 h-4 flex flex-col gap-0.5">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-current h-0.5 rounded-[1px]" />
                  ))}
                </div>
                Tabela
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cards">
              {filteredCampaigns.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                      <Target className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">
                      {campaigns.length === 0 ? 'Nenhuma campanha criada' : 'Nenhum resultado encontrado'}
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                      {campaigns.length === 0 
                        ? 'Crie sua primeira campanha publicitária para começar a gerenciar seus negócios.'
                        : 'Tente ajustar os filtros para encontrar as campanhas desejadas.'
                      }
                    </p>
                    <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Criar Nova Campanha
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredCampaigns.map(campaign => (
                    <ModernCampaignCard 
                      key={campaign.id} 
                      campaign={campaign} 
                      onView={handleViewCampaign}
                      getStatusIcon={getStatusIcon}
                      getStatusProgress={getStatusProgress}
                      formatDate={formatDate}
                      formatBudget={formatBudget}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="table">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-gray-50/50">
                        <tr>
                          <th className="text-left p-4 font-medium text-gray-900">Campanha</th>
                          <th className="text-left p-4 font-medium text-gray-900">Cliente</th>
                          <th className="text-left p-4 font-medium text-gray-900">Status</th>
                          <th className="text-left p-4 font-medium text-gray-900">Período</th>
                          <th className="text-left p-4 font-medium text-gray-900">Orçamento</th>
                          <th className="text-left p-4 font-medium text-gray-900">Progresso</th>
                          <th className="text-left p-4 font-medium text-gray-900">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredCampaigns.map(campaign => (
                          <CampaignTableRow 
                            key={campaign.id} 
                            campaign={campaign} 
                            onView={handleViewCampaign}
                            getStatusIcon={getStatusIcon}
                            getStatusProgress={getStatusProgress}
                            formatDate={formatDate}
                            formatBudget={formatBudget}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );

  // Componente de Card Moderno para Campanhas
  function ModernCampaignCard({ 
    campaign, 
    onView, 
    getStatusIcon, 
    getStatusProgress, 
    formatDate, 
    formatBudget 
  }: {
    campaign: Campaign;
    onView: (id: number) => void;
    getStatusIcon: (status: string) => any;
    getStatusProgress: (campaign: Campaign) => number;
    formatDate: (date: string | null) => string;
    formatBudget: (budget: number | null) => string;
  }) {
    const StatusIcon = getStatusIcon(campaign.status);
    const progress = getStatusProgress(campaign);
    
    return (
      <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <StatusIcon className={`h-4 w-4 ${statusColors[campaign.status].replace('bg-', 'text-').replace('-100', '-600')}`} />
                <Badge className={`${statusColors[campaign.status]} text-xs px-2 py-1`}>
                  {statusLabels[campaign.status]}
                </Badge>
              </div>
              <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                {campaign.name}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(campaign.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="truncate">{campaign.customer_name || 'Cliente não informado'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>{formatBudget(campaign.budget)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Monitor className="h-4 w-4" />
              <span>{campaign.screen_count || 0} telas</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          {progress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Progresso</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
          
          <Button 
            onClick={() => onView(campaign.id)}
            className="w-full gap-2 mt-4"
            size="sm"
          >
            <Eye className="h-4 w-4" />
            Ver Detalhes
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Componente de Linha da Tabela
  function CampaignTableRow({ 
    campaign, 
    onView, 
    getStatusIcon, 
    getStatusProgress, 
    formatDate, 
    formatBudget 
  }: {
    campaign: Campaign;
    onView: (id: number) => void;
    getStatusIcon: (status: string) => any;
    getStatusProgress: (campaign: Campaign) => number;
    formatDate: (date: string | null) => string;
    formatBudget: (budget: number | null) => string;
  }) {
    const StatusIcon = getStatusIcon(campaign.status);
    const progress = getStatusProgress(campaign);
    
    return (
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="p-4">
          <div>
            <div className="font-medium text-gray-900">{campaign.name}</div>
            <div className="text-sm text-gray-500">#{campaign.id}</div>
          </div>
        </td>
        <td className="p-4 text-sm text-gray-900">
          {campaign.customer_name || '—'}
        </td>
        <td className="p-4">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${statusColors[campaign.status].replace('bg-', 'text-').replace('-100', '-600')}`} />
            <Badge className={`${statusColors[campaign.status]} text-xs`}>
              {statusLabels[campaign.status]}
            </Badge>
          </div>
        </td>
        <td className="p-4 text-sm text-gray-600">
          <div>
            <div>{formatDate(campaign.start_date)}</div>
            <div>{formatDate(campaign.end_date)}</div>
          </div>
        </td>
        <td className="p-4 text-sm text-gray-900">
          {formatBudget(campaign.budget)}
        </td>
        <td className="p-4">
          {progress > 0 && (
            <div className="w-24">
              <Progress value={progress} className="h-2" />
              <div className="text-xs text-gray-500 mt-1">{progress}%</div>
            </div>
          )}
        </td>
        <td className="p-4">
          <Button variant="outline" size="sm" onClick={() => onView(campaign.id)} className="gap-1">
            <Eye className="h-3 w-3" />
            Ver
          </Button>
        </td>
      </tr>
    );
  }
}
