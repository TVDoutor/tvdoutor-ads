import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  Building2,
  Target,
  Clock,
  CheckCircle,
  Upload,
  X,
  Phone,
  Mail,
  MapPin,
  UserPlus,
  Flag,
  FileText,
  Settings,
  ArrowLeft,
  Save,
  Bell,
  Activity,
  BarChart3,
  Paperclip
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  projectManagementService,
  agenciaService,
  dealService,
  projetoService,
  contatoService,
  equipeService,
  marcoService,
  type Agencia,
  type Deal,
  type Projeto,
  type Contato,
  type Equipe,
  type Marco
} from '@/lib/project-management-service';

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  data: string;
  lida: boolean;
}

const ProjectManagement = () => {
  const [telaAtiva, setTelaAtiva] = useState('projetos');
  const [dados, setDados] = useState({
    agencias: [] as Agencia[],
    deals: [] as Deal[],
    projetos: [] as Projeto[],
    equipes: [] as Equipe[],
    marcos: [] as Marco[],
    contatos: [] as Contato[],
    notificacoes: [] as Notificacao[]
  });
  
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    agencia: '',
    status: '',
    busca: ''
  });

  // Carregar dados do Supabase
  const carregarDados = async () => {
    try {
      setLoading(true);
      
      const dadosCarregados = await projectManagementService.carregarTodosDados();
      
      setDados({
        ...dadosCarregados,
        notificacoes: [] // Implementar notificações futuramente
      });

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do sistema');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Componente de navegação lateral
  const Navigation = () => (
    <div className="w-64 bg-gray-900 text-white h-screen fixed left-0 top-0 overflow-y-auto flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold">SaaS Projetos</h1>
      </div>
      
      <nav className="mt-6 flex-grow">
        {[
          { id: 'projetos', nome: 'Projetos', icon: Target },
          { id: 'agencias', nome: 'Agências', icon: Building2 },
          { id: 'deals', nome: 'Deals', icon: TrendingUp },
          { id: 'equipes', nome: 'Equipes', icon: Users },
          { id: 'marcos', nome: 'Marcos', icon: Flag },
          { id: 'relatorios', nome: 'Relatórios', icon: BarChart3 }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setTelaAtiva(item.id)}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-gray-800 transition-colors ${
              telaAtiva === item.id ? 'bg-gray-800 border-r-4 border-blue-500' : ''
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.nome}</span>
          </button>
        ))}
      </nav>
      
      {/* Notificações */}
      <div className="p-4">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4" />
            <span className="text-sm font-medium">Notificações</span>
            {dados.notificacoes.filter(n => !n.lida).length > 0 && (
              <span className="bg-red-500 text-xs font-semibold px-2 py-0.5 rounded-full">
                {dados.notificacoes.filter(n => !n.lida).length}
              </span>
            )}
          </div>
          {dados.notificacoes.slice(0, 2).map(notif => (
            <div key={notif.id} className="text-xs text-gray-300 mb-1 p-1 rounded hover:bg-gray-700 cursor-pointer">
              {notif.titulo}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Tela de Agências
  const TelaAgencias = () => {
    const [showModal, setShowModal] = useState(false);
    const [agenciaSelecionada, setAgenciaSelecionada] = useState<Agencia | null>(null);
    const [showContatos, setShowContatos] = useState<string | null>(null);

    const AgenciaCard = ({ agencia }: { agencia: Agencia }) => (
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{agencia.nome_agencia}</h3>
            <p className="text-sm text-gray-600">{agencia.codigo_agencia}</p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
            Ativa
          </span>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4" />
            <span>{agencia.email_empresa}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="w-4 h-4" />
            <span>{agencia.telefone_empresa}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{agencia.cidade}, {agencia.estado}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <DollarSign className="w-4 h-4" />
            <span>Taxa: {agencia.taxa_porcentagem}%</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button 
            onClick={() => setShowContatos(agencia.id)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Ver Contatos ({dados.contatos.filter(c => c.agencia_id === agencia.id).length})
          </button>
          <div className="flex gap-2">
            <button 
              onClick={() => {setAgenciaSelecionada(agencia); setShowModal(true);}}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agências</h1>
            <p className="text-gray-600">Gerencie todas as agências parceiras</p>
          </div>
          <button 
            onClick={() => {setAgenciaSelecionada(null); setShowModal(true);}}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Nova Agência
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {dados.agencias.map(agencia => (
            <AgenciaCard key={agencia.id} agencia={agencia} />
          ))}
        </div>

        {/* Modal de contatos */}
        {showContatos && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full m-4">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Contatos da Agência</h2>
                  <button onClick={() => setShowContatos(null)}>
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                {dados.contatos.filter(c => c.agencia_id === showContatos).map(contato => (
                  <div key={contato.id} className="flex items-center justify-between p-4 border rounded-lg mb-3">
                    <div>
                      <h3 className="font-medium">{contato.nome_contato}</h3>
                      <p className="text-sm text-gray-600">{contato.cargo}</p>
                      <p className="text-sm text-gray-600">{contato.email_contato}</p>
                      <p className="text-sm text-gray-600">{contato.telefone_contato}</p>
                    </div>
                    <button className="text-blue-600 hover:text-blue-700">
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button className="w-full mt-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 flex items-center justify-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Adicionar Contato
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Tela de Deals
  const TelaDeals = () => {
    const [showModal, setShowModal] = useState(false);

    const DealCard = ({ deal }: { deal: Deal }) => {
      const agencia = dados.agencias.find(a => a.id === deal.agencia_id);
      const projetos = dados.projetos.filter(p => p.deal_id === deal.id);

      return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{deal.nome_deal}</h3>
              <p className="text-sm text-gray-600">{agencia?.nome_agencia}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm ${
              deal.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {deal.status}
            </span>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Target className="w-4 h-4" />
              <span>{projetos.length} projeto(s) vinculado(s)</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Criado em {new Date(deal.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button 
              onClick={() => setTelaAtiva('projetos')}
              className="px-3 py-1 text-blue-600 hover:text-blue-700 text-sm"
            >
              Ver Projetos
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
            <p className="text-gray-600">Gerencie os deals de todas as agências</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Novo Deal
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {dados.deals.map(deal => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      </div>
    );
  };

  // Tela de Projetos
  const TelaProjetos = () => {
    const [showModal, setShowModal] = useState(false);
    const [projetoSelecionado, setProjetoSelecionado] = useState<Projeto | null>(null);
    const [showDetalhes, setShowDetalhes] = useState<Projeto | null>(null);

    const ProjetoCard = ({ projeto }: { projeto: Projeto }) => {
      const agencia = dados.agencias.find(a => a.id === projeto.agencia_id);
      const deal = dados.deals.find(d => d.id === projeto.deal_id);
      const valorDisponivel = projeto.orcamento_projeto - projeto.valor_gasto;
      const percentualGasto = (projeto.valor_gasto / projeto.orcamento_projeto) * 100;

      return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {projeto.nome_projeto}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Building2 className="w-4 h-4" />
                <span>{agencia?.nome_agencia}</span>
                <span className='text-gray-400'>•</span>
                <span>{deal?.nome_deal}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                projeto.status_projeto === 'ativo' ? 'bg-green-100 text-green-800' :
                projeto.status_projeto === 'pausado' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {projeto.status_projeto}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Target className="w-4 h-4" />
              <span>{projeto.cliente_final}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{projeto.responsavel_projeto}</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Orçamento utilizado</span>
              <span>{percentualGasto.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  percentualGasto > 80 ? 'bg-red-500' : 
                  percentualGasto > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(percentualGasto, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">
                Gasto: R$ {projeto.valor_gasto.toLocaleString()}
              </span>
              <span className="text-gray-600">
                Disponível: R$ {valorDisponivel.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <DollarSign className="w-4 h-4" />
                <span>R$ {projeto.orcamento_projeto.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowDetalhes(projeto)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button 
                onClick={() => {setProjetoSelecionado(projeto); setShowModal(true);}}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      );
    };

    const projetosFiltrados = dados.projetos.filter(projeto => {
      const agencia = dados.agencias.find(a => a.id === projeto.agencia_id);
      return (
        (!filtros.agencia || projeto.agencia_id === filtros.agencia) &&
        (!filtros.status || projeto.status_projeto === filtros.status) &&
        (!filtros.busca || 
          projeto.nome_projeto.toLowerCase().includes(filtros.busca.toLowerCase()) ||
          projeto.cliente_final.toLowerCase().includes(filtros.busca.toLowerCase()) ||
          agencia?.nome_agencia.toLowerCase().includes(filtros.busca.toLowerCase())
        )
      );
    });

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projetos</h1>
            <p className="text-gray-600">Gerencie todos os projetos das suas agências</p>
          </div>
          <button 
            onClick={() => {setProjetoSelecionado(null); setShowModal(true);}}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Novo Projeto
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Projetos</p>
                  <p className="text-2xl font-bold text-gray-900">{dados.projetos.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Projetos Ativos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {dados.projetos.filter(p => p.status_projeto === 'ativo').length}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Orçamento Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    R$ {dados.projetos.reduce((acc, p) => acc + p.orcamento_projeto, 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Agências Ativas</p>
                  <p className="text-2xl font-bold text-gray-900">{dados.agencias.length}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar projetos, clientes ou agências..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={filtros.busca}
                  onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                />
              </div>
            </div>
            
            <select 
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtros.agencia}
              onChange={(e) => setFiltros({...filtros, agencia: e.target.value})}
            >
              <option value="">Todas as Agências</option>
              {dados.agencias.map(agencia => (
                <option key={agencia.id} value={agencia.id}>
                  {agencia.nome_agencia}
                </option>
              ))}
            </select>
            
            <select 
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filtros.status}
              onChange={(e) => setFiltros({...filtros, status: e.target.value})}
            >
              <option value="">Todos os Status</option>
              <option value="planejamento">Planejamento</option>
              <option value="ativo">Ativo</option>
              <option value="pausado">Pausado</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {projetosFiltrados.map(projeto => (
            <ProjetoCard key={projeto.id} projeto={projeto} />
          ))}
        </div>

        {/* Modal de Detalhes */}
        {showDetalhes && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {showDetalhes.nome_projeto}
                    </h2>
                    <p className="text-sm text-gray-600">Detalhes do projeto</p>
                  </div>
                  <button onClick={() => setShowDetalhes(null)}>
                    <X className="w-6 h-6 text-gray-500 hover:text-gray-800" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-500">Cliente Final</p>
                        <p className="text-lg font-semibold text-gray-800">{showDetalhes.cliente_final}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-500">Status</p>
                        <p className="text-lg font-semibold text-gray-800 capitalize">{showDetalhes.status_projeto}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-500">Responsável</p>
                        <p className="text-lg font-semibold text-gray-800">{showDetalhes.responsavel_projeto}</p>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="font-semibold text-gray-800 mb-2">Linha do Tempo</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className='flex items-center gap-2'>
                           <Calendar className='w-4 h-4 text-green-600'/>
                           <span>Início: {new Date(showDetalhes.data_inicio).toLocaleDateString()}</span>
                        </div>
                         <div className='flex items-center gap-2'>
                           <Flag className='w-4 h-4 text-red-600'/>
                           <span>Fim: {new Date(showDetalhes.data_fim).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="font-semibold text-gray-800 mb-2">Financeiro</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600">
                                R$ {showDetalhes.valor_gasto.toLocaleString()} gastos de R$ {showDetalhes.orcamento_projeto.toLocaleString()}
                            </span>
                            <span className="text-sm font-semibold">
                                {((showDetalhes.valor_gasto / showDetalhes.orcamento_projeto) * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(showDetalhes.valor_gasto / showDetalhes.orcamento_projeto) * 100}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-3">Marcos do Projeto</h3>
                        <div className="space-y-3">
                            {dados.marcos.filter(m => m.projeto_id === showDetalhes.id).map(marco => (
                                <div key={marco.id} className="flex items-start gap-3">
                                    <div className={`mt-1 p-1 rounded-full ${marco.status === 'concluido' ? 'bg-green-500' : 'bg-gray-300'}`}>
                                        <CheckCircle className="w-4 h-4 text-white"/>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800">{marco.nome_marco}</p>
                                        <p className="text-sm text-gray-500">Prazo: {new Date(marco.data_prevista).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-3">Equipe</h3>
                         <div className="space-y-3">
                            {dados.equipes.filter(e => e.projeto_id === showDetalhes.id).map(membro => (
                                <div key={membro.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold text-gray-600">
                                        {membro.nome_usuario.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800">{membro.nome_usuario}</p>
                                        <p className="text-sm text-gray-500 capitalize">{membro.papel}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="mt-8">
                    <h3 className="font-semibold text-gray-800 mb-3">Anexos</h3>
                    <div className="space-y-2">
                        {showDetalhes.arquivos_anexos?.map(file => (
                            <a href={file.url} key={file.nome} className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border">
                                <Paperclip className="w-5 h-5 text-gray-500" />
                                <div>
                                    <p className="font-medium text-blue-600">{file.nome}</p>
                                    <p className="text-sm text-gray-500">{file.tamanho}</p>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Telas de Placeholder
  const TelaEquipes = () => <div className="p-6"><h1 className="text-2xl font-bold">Gerenciamento de Equipes</h1></div>;
  const TelaMarcos = () => <div className="p-6"><h1 className="text-2xl font-bold">Gerenciamento de Marcos</h1></div>;
  const TelaRelatorios = () => <div className="p-6"><h1 className="text-2xl font-bold">Relatórios e Dashboards</h1></div>;
  
  // Função para renderizar a tela ativa
  const renderTelaAtiva = () => {
    switch (telaAtiva) {
      case 'projetos':
        return <TelaProjetos />;
      case 'agencias':
        return <TelaAgencias />;
      case 'deals':
        return <TelaDeals />;
      case 'equipes':
        return <TelaEquipes />;
      case 'marcos':
        return <TelaMarcos />;
      case 'relatorios':
        return <TelaRelatorios />;
      default:
        return <TelaProjetos />;
    }
  };

  return (
    <DashboardLayout>
      <div className="bg-gray-100 min-h-screen">
        <Navigation />
        <main className="ml-64 p-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando dados...</p>
              </div>
            </div>
          ) : (
            renderTelaAtiva()
          )}
        </main>
      </div>
    </DashboardLayout>
  );
};

export default ProjectManagement;
