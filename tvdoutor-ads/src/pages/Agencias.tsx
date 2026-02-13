import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Plus, 
  Search, 
  RefreshCw, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin,
  UserCheck,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Agencia {
  id: string;
  nome_agencia: string;
  email_empresa: string | null;
  telefone_empresa: string | null;
  rua_av: string | null;
  cidade: string | null;
  estado: string | null;
  codigo_agencia: string;
  taxa_porcentagem: number | null;
  created_at: string | null;
  contatos_count?: number;
  projetos_count?: number;
}

interface AgenciasStats {
  total: number;
  active: number;
  inactive: number;
  recent: number;
  totalProjetos: number;
  totalContatos: number;
}

export default function Agencias() {
  
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [stats, setStats] = useState<AgenciasStats>({
    total: 0,
    active: 0,
    inactive: 0,
    recent: 0,
    totalProjetos: 0,
    totalContatos: 0
  });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgencia, setEditingAgencia] = useState<Agencia | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    nome_agencia: '',
    email_empresa: '',
    telefone_empresa: '',
    rua_av: '',
    cidade: '',
    estado: '',
    codigo_agencia: '',
    taxa_porcentagem: 0
  });

  useEffect(() => {
    loadAgencias();
  }, []);

  const loadAgencias = async () => {
    try {
      setLoading(true);
      
      // Buscar agências com contagem de projetos e contatos
      const { data: agenciasData, error: agenciasError } = await supabase
        .from('agencias')
        .select(`
          id,
          nome_agencia,
          email_empresa,
          telefone_empresa,
          rua_av,
          cidade,
          estado,
          codigo_agencia,
          taxa_porcentagem,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (agenciasError) throw agenciasError;

      // Buscar contagem de projetos por agência
      const { data: projetosData, error: projetosError } = await supabase
        .from('agencia_projetos')
        .select('deal_id, agencia_deals!inner(agencia_id)');

      if (projetosError) {
        console.warn('Erro ao carregar projetos:', projetosError);
      }

      // Contar projetos por agência
      const projetosCount: { [key: number]: number } = {};
      if (projetosData) {
        projetosData.forEach(projeto => {
          const agenciaId = projeto.agencia_deals?.agencia_id;
          if (agenciaId) {
            projetosCount[agenciaId] = (projetosCount[agenciaId] || 0) + 1;
          }
        });
      }

      // Buscar contagem de contatos por agência (assumindo que existe uma tabela de contatos)
      // Por enquanto, vamos usar um valor mock
      const contatosCount: { [key: number]: number } = {};

      const agenciasWithCounts = (agenciasData || []).map(agencia => ({
        ...agencia,
        projetos_count: projetosCount[agencia.id] || 0,
        contatos_count: contatosCount[agencia.id] || 0
      }));

      setAgencias(agenciasWithCounts);
      calculateStats(agenciasWithCounts);
    } catch (error) {
      console.error('Erro ao carregar agências:', error);
      toast.error('Erro ao carregar agências');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (agenciasData: Agencia[]) => {
    const total = agenciasData.length;
    // Considerar ativa se tem código de agência
    const active = agenciasData.filter(a => a.codigo_agencia && a.codigo_agencia.trim() !== '').length;
    const inactive = total - active;
    
    // Agências criadas nos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recent = agenciasData.filter(a => 
      new Date(a.created_at) >= thirtyDaysAgo
    ).length;

    const totalProjetos = agenciasData.reduce((sum, a) => sum + (a.projetos_count || 0), 0);
    const totalContatos = agenciasData.reduce((sum, a) => sum + (a.contatos_count || 0), 0);

    setStats({
      total,
      active,
      inactive,
      recent,
      totalProjetos,
      totalContatos
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validar campos obrigatórios
      if (!formData.nome_agencia || !formData.codigo_agencia) {
        toast.error('Nome da agência e código são obrigatórios!');
        return;
      }

      if (editingAgencia) {
        const { error } = await supabase
          .from('agencias')
          .update(formData)
          .eq('id', editingAgencia.id);

        if (error) {
          if (error.code === '23505') {
            toast.error('Já existe uma agência com este código ou CNPJ!');
          } else {
            throw error;
          }
          return;
        }
        toast.success('Agência atualizada com sucesso!');
      } else {
        // Verificar se o código já existe antes de inserir
        const { data: existing } = await supabase
          .from('agencias')
          .select('id')
          .eq('codigo_agencia', formData.codigo_agencia)
          .single();

        if (existing) {
          toast.error(`Já existe uma agência com o código ${formData.codigo_agencia}!`);
          return;
        }

        const { error } = await supabase
          .from('agencias')
          .insert([formData]);

        if (error) {
          if (error.code === '23505') {
            toast.error('Já existe uma agência com este código ou CNPJ!');
          } else {
            throw error;
          }
          return;
        }
        toast.success('Agência criada com sucesso!');
      }

      setModalOpen(false);
      resetForm();
      loadAgencias();
    } catch (error: any) {
      console.error('Erro ao salvar agência:', error);
      toast.error(`Erro ao salvar agência: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const resetForm = () => {
    setFormData({
      nome_agencia: '',
      email_empresa: '',
      telefone_empresa: '',
      rua_av: '',
      cidade: '',
      estado: '',
      codigo_agencia: '',
      taxa_porcentagem: 0
    });
    setEditingAgencia(null);
  };

  const openEditModal = (agencia: Agencia) => {
    setEditingAgencia(agencia);
    setFormData({
      nome_agencia: agencia.nome_agencia,
      email_empresa: agencia.email_empresa || '',
      telefone_empresa: agencia.telefone_empresa || '',
      rua_av: agencia.rua_av || '',
      cidade: agencia.cidade || '',
      estado: agencia.estado || '',
      codigo_agencia: agencia.codigo_agencia,
      taxa_porcentagem: agencia.taxa_porcentagem || 0
    });
    setModalOpen(true);
  };

  const deleteAgencia = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta agência?')) return;

    try {
      const { error } = await supabase
        .from('agencias')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Agência excluída com sucesso!');
      loadAgencias();
    } catch (error: any) {
      console.error('Erro ao excluir agência:', error);
      toast.error(`Erro ao excluir agência: ${error.message}`);
    }
  };

  // Filtrar agências
  const filteredAgencias = agencias.filter(agencia => {
    const matchesSearch = agencia.nome_agencia.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (agencia.email_empresa && agencia.email_empresa.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (agencia.cidade && agencia.cidade.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const isActive = agencia.codigo_agencia && agencia.codigo_agencia.trim() !== '';
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && isActive) ||
                         (statusFilter === 'inactive' && !isActive);
    
    return matchesSearch && matchesStatus;
  });

  const statsData = [
    {
      title: "Total de Agências",
      value: stats.total,
      change: { value: stats.recent, label: "novas este mês" },
      icon: Building2,
      variant: "primary" as const
    },
    {
      title: "Agências Ativas",
      value: stats.active,
      change: { value: Math.round((stats.active / stats.total) * 100) || 0, label: "% ativas" },
      icon: Users,
      variant: "secondary" as const
    },
    {
      title: "Total de Projetos",
      value: stats.totalProjetos,
      change: { value: stats.inactive, label: "agências inativas" },
      icon: TrendingUp,
      variant: "accent" as const
    },
    {
      title: "Total de Contatos",
      value: stats.totalContatos,
      change: undefined,
      icon: UserCheck,
      variant: "default" as const
    }
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500 rounded-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Agências Parceiras</h1>
              <p className="text-gray-600 mt-1">Gerencie todas as agências • {stats.total} parceiros</p>
            </div>
          </div>
          <Button onClick={loadAgencias} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Content Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Agências</h2>
            <p className="text-gray-600 mt-1">Gerencie todas as agências parceiras</p>
          </div>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                Nova Agência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingAgencia ? 'Editar Agência' : 'Nova Agência'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome_agencia">Nome da Agência</Label>
                    <Input
                      id="nome_agencia"
                      value={formData.nome_agencia}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome_agencia: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="codigo_agencia">Código da Agência</Label>
                    <Input
                      id="codigo_agencia"
                      value={formData.codigo_agencia}
                      onChange={(e) => setFormData(prev => ({ ...prev, codigo_agencia: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email_empresa">Email da Empresa</Label>
                    <Input
                      id="email_empresa"
                      type="email"
                      value={formData.email_empresa}
                      onChange={(e) => setFormData(prev => ({ ...prev, email_empresa: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone_empresa">Telefone da Empresa</Label>
                    <Input
                      id="telefone_empresa"
                      value={formData.telefone_empresa}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefone_empresa: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rua_av">Rua/Avenida</Label>
                  <Input
                    id="rua_av"
                    value={formData.rua_av}
                    onChange={(e) => setFormData(prev => ({ ...prev, rua_av: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade}
                      onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Input
                      id="estado"
                      value={formData.estado}
                      onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxa_porcentagem">Taxa (%)</Label>
                    <Input
                      id="taxa_porcentagem"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.taxa_porcentagem}
                      onChange={(e) => setFormData(prev => ({ ...prev, taxa_porcentagem: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>


                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingAgencia ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsData.map((stat, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 font-medium">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    {stat.change && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-green-600 font-medium">
                          +{stat.change.value}
                        </span>
                        <span className="text-xs text-gray-500">{stat.change.label}</span>
                      </div>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg ${
                    stat.variant === 'primary' ? 'bg-blue-100 text-blue-600' :
                    stat.variant === 'secondary' ? 'bg-green-100 text-green-600' :
                    stat.variant === 'accent' ? 'bg-purple-100 text-purple-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar agências, emails ou cidades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Agências</SelectItem>
              <SelectItem value="active">Agências Ativas</SelectItem>
              <SelectItem value="inactive">Agências Inativas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Agencies List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <p className="text-gray-500 mt-2">Carregando agências...</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredAgencias.map((agencia) => (
              <Card key={agencia.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-xl font-semibold text-gray-900">{agencia.nome_agencia}</h3>
                        <Badge variant={agencia.codigo_agencia ? "default" : "secondary"} className={
                          agencia.codigo_agencia ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }>
                          {agencia.codigo_agencia ? 'Ativa' : 'Inativa'}
                        </Badge>
                        <span className="text-sm text-gray-500">ID: {agencia.codigo_agencia}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-gray-600">{agencia.email_empresa || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-600">{agencia.telefone_empresa || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-purple-500" />
                          <span className="text-sm text-gray-600">{agencia.cidade || 'N/A'} - {agencia.estado || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-orange-500" />
                          <span className="text-sm text-gray-600">Taxa: {agencia.taxa_porcentagem || 0}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-orange-500" />
                          <span className="text-sm text-gray-600">Ver Contatos ({agencia.contatos_count || 0})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(agencia)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteAgencia(agencia.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredAgencias.length === 0 && !loading && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma agência encontrada</h3>
                  <p className="text-gray-500">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Tente ajustar os filtros de busca.'
                      : 'Comece criando sua primeira agência parceira.'
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}