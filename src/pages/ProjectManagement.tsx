// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  Building2,
  Target,
  CheckCircle,
  X,
  Phone,
  Mail,
  MapPin,
  UserPlus,
  Flag,
  ArrowLeft,
  Bell,
  BarChart3,
  Paperclip,
  RefreshCw
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PessoaProjetoSelector } from '@/components/PessoaProjetoSelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { 
  projectManagementService,
  agenciaService,
  dealService,
  projetoService,
  contatoService,
  type Agencia,
  type Deal,
  type Projeto,
  type Contato,
  type EquipeCompleta,
  type Marco
} from '@/lib/project-management-service';
import type { PessoaProjeto } from '@/types/agencia';
import { TelaEquipes, TelaMarcos, TelaRelatorios } from '@/components/ProjectManagementScreens';

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  data: string;
  lida: boolean;
}

const ProjectManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [telaAtiva, setTelaAtiva] = useState('agencias');
  const [dados, setDados] = useState({
    agencias: [] as Agencia[],
    deals: [] as Deal[],
    projetos: [] as Projeto[],
    equipes: [] as EquipeCompleta[],
    marcos: [] as Marco[],
    contatos: [] as Contato[],
    notificacoes: [] as Notificacao[],
    pessoasProjeto: [] as PessoaProjeto[],
    profiles: [] as Array<{id: string, full_name: string}>
  });
  
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    agencia: '',
    status: '',
    busca: ''
  });


  // Função para buscar nome do responsável
  const getResponsavelNome = (responsavelId: string | null, projetoId?: string | null): string => {
    if (!responsavelId) return 'Não definido';
    
    // Se temos um projetoId, buscar entre os membros da equipe
    if (projetoId) {
      const membrosEquipe = getMembrosEquipeProjeto(projetoId);
      const membro = membrosEquipe.find(m => m.pessoa_id === responsavelId);
      if (membro) {
        return membro.nome_pessoa || 'Membro sem nome';
      }
    }
    
    // Fallback: buscar nos profiles (para compatibilidade)
    const profile = dados.profiles.find(p => p.id === responsavelId);
    return profile?.full_name || 'Usuário não encontrado';
  };

  // Função para obter membros da equipe do projeto atual
  const getMembrosEquipeProjeto = (projetoId: string | null): EquipeCompleta[] => {
    if (!projetoId) return [];
    return dados.equipes.filter(membro => 
      membro.projeto_id === projetoId && 
      membro.ativo === true
    );
  };

  // Carregar dados do Supabase
  const carregarDados = async () => {
    try {
      setLoading(true);
      console.log('🔄 Iniciando carregamento de dados...');
      
      const dadosCarregados = await projectManagementService.carregarTodosDados(supabase);
      
      console.log('📊 Dados carregados:', {
        agencias: dadosCarregados.agencias?.length || 0,
        deals: dadosCarregados.deals?.length || 0,
        projetos: dadosCarregados.projetos?.length || 0,
        contatos: dadosCarregados.contatos?.length || 0
      });
      
      console.log('🏢 Agências encontradas:', dadosCarregados.agencias);
      console.log('💼 Deals encontrados:', dadosCarregados.deals);
      console.log('👥 Profiles encontrados:', dadosCarregados.profiles);
      
      setDados({
        ...dadosCarregados,
        notificacoes: [], // Implementar notificações futuramente
        pessoasProjeto: dadosCarregados.pessoasProjeto || [],
        profiles: dadosCarregados.profiles || []
      });

    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do sistema');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Componente de navegação lateral modernizada
  const Navigation = () => (
    <div className="w-72 bg-gradient-to-b from-white to-gray-50/50 border-r border-gray-200/60 h-screen fixed left-0 top-0 overflow-y-auto flex flex-col shadow-xl backdrop-blur-sm">
      <div className="p-6 border-b border-gray-100/60 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
            <Target className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Gerenciamento</h1>
            <p className="text-sm text-gray-600 mt-0.5">Centro de controle</p>
          </div>
        </div>
      </div>
      
      <nav className="mt-6 flex-grow px-4 space-y-2">
        {[
          { id: 'agencias', nome: 'Agências', icon: Building2, desc: 'Parceiros', color: 'from-blue-500 to-blue-600' },
          { id: 'projetos', nome: 'Projetos', icon: Target, desc: 'Campanhas', color: 'from-primary to-primary/80' },
          { id: 'deals', nome: 'Deals', icon: TrendingUp, desc: 'Negócios', color: 'from-green-500 to-green-600' },
          { id: 'equipes', nome: 'Equipes', icon: Users, desc: 'Pessoas', color: 'from-purple-500 to-purple-600' },
          { id: 'marcos', nome: 'Marcos', icon: Flag, desc: 'Cronograma', color: 'from-orange-500 to-orange-600' },
          { id: 'relatorios', nome: 'Relatórios', icon: BarChart3, desc: 'Analytics', color: 'from-indigo-500 to-indigo-600' }
        ].map(item => (
          <div key={item.id} className="relative">
            <Button
              variant={telaAtiva === item.id ? "default" : "ghost"}
              className={`w-full justify-start gap-4 transition-all duration-300 h-14 rounded-xl ${
                telaAtiva === item.id 
                  ? 'bg-gradient-to-r shadow-lg transform scale-[1.02]' 
                  : 'hover:bg-gray-50/80 hover:shadow-md hover:scale-[1.01]'
              }`}
              onClick={() => setTelaAtiva(item.id)}
            >
              <div className={`p-2 rounded-lg transition-all duration-300 ${
                telaAtiva === item.id 
                  ? `bg-gradient-to-br ${item.color} shadow-md` 
                  : 'bg-gray-100 group-hover:bg-gray-200'
              }`}>
                <item.icon className={`h-5 w-5 transition-colors duration-300 ${
                  telaAtiva === item.id ? 'text-white' : 'text-gray-600'
                }`} />
              </div>
              <div className="flex-1 text-left">
                <div className={`font-semibold transition-colors duration-300 ${
                  telaAtiva === item.id ? 'text-white' : 'text-gray-900'
                }`}>
                  {item.nome}
                </div>
                <div className={`text-xs transition-colors duration-300 ${
                  telaAtiva === item.id ? 'text-white/90' : 'text-gray-500'
                }`}>
                  {item.desc}
                </div>
              </div>
            </Button>
          </div>
        ))}
      </nav>
      
      {/* Stats rápidas */}
      <div className="p-4 border-t border-gray-100/60">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-white rounded-xl p-4 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-primary/20 rounded-lg">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Resumo Rápido</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Agências:</span>
              <span className="font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">{dados.agencias.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Projetos:</span>
              <span className="font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">{dados.projetos.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Deals:</span>
              <span className="font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">{dados.deals.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Botão para voltar ao Dashboard */}
      <div className="p-4 border-t border-gray-100/60">
        <Button
          variant="outline"
          className="w-full justify-start gap-3 transition-all duration-300 hover:bg-gray-50 hover:shadow-md rounded-xl h-12"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 shrink-0 text-gray-600" />
          <span className="truncate flex-1 text-left font-medium">Voltar ao Dashboard</span>
        </Button>
      </div>
    </div>
  );

  // Tela de Agências
  const TelaAgencias = () => {
    const [showModal, setShowModal] = useState(false);
    const [agenciaSelecionada, setAgenciaSelecionada] = useState<Agencia | null>(null);
    const [showContatos, setShowContatos] = useState<string | null>(null);
    const [showModalContato, setShowModalContato] = useState(false);
    const [contatoSelecionado, setContatoSelecionado] = useState<Contato | null>(null);
    const [agenciaToDelete, setAgenciaToDelete] = useState<Agencia | null>(null);
    const [formDataContato, setFormDataContato] = useState({
      nome_contato: '',
      cargo: '',
      email_contato: '',
      telefone_contato: ''
    });
    const [formData, setFormData] = useState({
      nome_agencia: '',
      codigo_agencia: '',
      cnpj: '',
      email_empresa: '',
      telefone_empresa: '',
      cidade: '',
      estado: '',
      taxa_porcentagem: 0,
      site: '',
      rua_av: '',
      numero: '',
      cep: ''
    });

    const resetForm = () => {
      setFormData({
        nome_agencia: '',
        codigo_agencia: '',
        cnpj: '',
        email_empresa: '',
        telefone_empresa: '',
        cidade: '',
        estado: '',
        taxa_porcentagem: 0,
        site: '',
        rua_av: '',
        numero: '',
        cep: ''
      });
      setAgenciaSelecionada(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      try {
        if (agenciaSelecionada) {
          await agenciaService.atualizar(supabase, agenciaSelecionada.id, formData);
        } else {
          await agenciaService.criar(supabase, formData);
        }
        
        setShowModal(false);
        resetForm();
        carregarDados();
      } catch (error) {
        console.error('Erro ao salvar agência:', error);
      }
    };

    const openEditModal = (agencia: Agencia) => {
      setAgenciaSelecionada(agencia);
      setFormData({
        nome_agencia: agencia.nome_agencia,
        codigo_agencia: agencia.codigo_agencia,
        cnpj: agencia.cnpj,
        email_empresa: agencia.email_empresa || '',
        telefone_empresa: agencia.telefone_empresa || '',
        cidade: agencia.cidade || '',
        estado: agencia.estado || '',
        taxa_porcentagem: agencia.taxa_porcentagem || 0,
        site: '',
        rua_av: '',
        numero: '',
        cep: ''
      });
      setShowModal(true);
    };

    const openNewModal = () => {
      resetForm();
      setShowModal(true);
    };

    const resetFormContato = () => {
      setFormDataContato({
        nome_contato: '',
        cargo: '',
        email_contato: '',
        telefone_contato: ''
      });
      setContatoSelecionado(null);
    };

    const handleSubmitContato = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!showContatos) return;
      
      try {
        if (contatoSelecionado) {
          await contatoService.atualizar(supabase, contatoSelecionado.id, formDataContato);
        } else {
          await contatoService.criar(supabase, {
            ...formDataContato,
            agencia_id: showContatos
          });
        }
        
        setShowModalContato(false);
        resetFormContato();
        carregarDados();
      } catch (error) {
        console.error('Erro ao salvar contato:', error);
      }
    };

    const openEditModalContato = (contato: Contato) => {
      setContatoSelecionado(contato);
      setFormDataContato({
        nome_contato: contato.nome_contato,
        cargo: contato.cargo || '',
        email_contato: contato.email_contato || '',
        telefone_contato: contato.telefone_contato || ''
      });
      setShowModalContato(true);
    };

    const openNewModalContato = () => {
      resetFormContato();
      setShowModalContato(true);
    };

    const handleDeleteClick = (agencia: Agencia) => {
      setAgenciaToDelete(agencia);
    };

    const handleConfirmDelete = async () => {
      if (!agenciaToDelete) return;
      
      setLoading(true);
      try {
        await agenciaService.excluir(supabase, agenciaToDelete.id);
        await carregarDados();
        setAgenciaToDelete(null);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    const AgenciaCard = ({ agencia }: { agencia: Agencia }) => (
      <div className="bg-white rounded-xl border border-gray-200/60 p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300 group">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors duration-300">{agencia.nome_agencia}</h3>
            <p className="text-sm text-gray-600">{agencia.codigo_agencia}</p>
          </div>
          <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-green-50 text-green-800 rounded-full text-sm font-medium border border-green-200">
            Ativa
          </span>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <span>{agencia.email_empresa}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="p-1.5 bg-green-100 rounded-lg">
              <Phone className="w-4 h-4 text-green-600" />
            </div>
            <span>{agencia.telefone_empresa}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <MapPin className="w-4 h-4 text-purple-600" />
            </div>
            <span>{agencia.cidade}, {agencia.estado}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <span>Taxa: {agencia.taxa_porcentagem}%</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button 
            onClick={() => setShowContatos(agencia.id)}
            className="text-primary hover:text-primary/80 text-sm font-medium transition-colors duration-300 flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Ver Contatos ({dados.contatos.filter(c => c.agencia_id === agencia.id).length})
          </button>
          <div className="flex gap-2">
            <button 
              onClick={() => openEditModal(agencia)}
              className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-300"
            >
              <Edit className="w-4 h-4" />
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button 
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-300"
                  onClick={() => handleDeleteClick(agencia)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir a agência <strong>{agenciaToDelete?.nome_agencia}</strong>?
                    <br />
                    <span className="text-red-600 font-medium">Esta ação não pode ser desfeita.</span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setAgenciaToDelete(null)}>
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmDelete}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={loading}
                  >
                    {loading ? 'Excluindo...' : 'Excluir Agência'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
            onClick={openNewModal}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 font-medium"
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

        {/* Modal de Agência */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200/60">
              <div className="p-6 border-b border-gray-100/60 bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {agenciaSelecionada ? 'Editar Agência' : 'Nova Agência'}
                  </h2>
                  <button 
                    onClick={() => {setShowModal(false); resetForm();}}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-all duration-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da Agência *
                    </label>
                    <input
                      type="text"
                      value={formData.nome_agencia}
                      onChange={(e) => setFormData({...formData, nome_agencia: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código da Agência
                    </label>
                    <input
                      type="text"
                      value={formData.codigo_agencia}
                      onChange={(e) => setFormData({...formData, codigo_agencia: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                      placeholder="Ex: A001"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CNPJ *
                    </label>
                    <input
                      type="text"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                      placeholder="00.000.000/0000-00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Taxa (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.taxa_porcentagem}
                      onChange={(e) => setFormData({...formData, taxa_porcentagem: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email_empresa}
                      onChange={(e) => setFormData({...formData, email_empresa: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={formData.telefone_empresa}
                      onChange={(e) => setFormData({...formData, telefone_empresa: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={formData.cidade}
                      onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <input
                      type="text"
                      value={formData.estado}
                      onChange={(e) => setFormData({...formData, estado: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CEP
                    </label>
                    <input
                      type="text"
                      value={formData.cep}
                      onChange={(e) => setFormData({...formData, cep: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site
                  </label>
                  <input
                    type="url"
                    value={formData.site}
                    onChange={(e) => setFormData({...formData, site: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {setShowModal(false); resetForm();}}
                    className="px-6 py-3 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 font-medium"
                  >
                    {agenciaSelecionada ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
                    <button 
                      onClick={() => openEditModalContato(contato)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button 
                  onClick={openNewModalContato}
                  className="w-full mt-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  Adicionar Contato
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Contato */}
        {showModalContato && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    {contatoSelecionado ? 'Editar Contato' : 'Novo Contato'}
                  </h2>
                  <button onClick={() => {setShowModalContato(false); resetFormContato();}}>
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <form onSubmit={handleSubmitContato} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Contato *
                  </label>
                  <input
                    type="text"
                    value={formDataContato.nome_contato}
                    onChange={(e) => setFormDataContato({...formDataContato, nome_contato: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome completo do contato"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cargo
                  </label>
                  <input
                    type="text"
                    value={formDataContato.cargo}
                    onChange={(e) => setFormDataContato({...formDataContato, cargo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Gerente de Vendas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formDataContato.email_contato}
                    onChange={(e) => setFormDataContato({...formDataContato, email_contato: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="contato@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formDataContato.telefone_contato}
                    onChange={(e) => setFormDataContato({...formDataContato, telefone_contato: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {setShowModalContato(false); resetFormContato();}}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {contatoSelecionado ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Tela de Deals
  const TelaDeals = () => {
    const [showModal, setShowModal] = useState(false);
    const [dealSelecionado, setDealSelecionado] = useState<Deal | null>(null);
    const [formData, setFormData] = useState({
      nome_deal: '',
      agencia_id: '',
      status: 'ativo'
    });

    const resetForm = () => {
      setFormData({
        nome_deal: '',
        agencia_id: '',
        status: 'ativo'
      });
      setDealSelecionado(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      try {
        if (dealSelecionado) {
          await dealService.atualizar(supabase, dealSelecionado.id, formData);
        } else {
          await dealService.criar(supabase, formData);
        }
        
        setShowModal(false);
        resetForm();
        carregarDados();
      } catch (error) {
        console.error('Erro ao salvar deal:', error);
      }
    };

    const openEditModal = (deal: Deal) => {
      setDealSelecionado(deal);
      setFormData({
        nome_deal: deal.nome_deal,
        agencia_id: deal.agencia_id,
        status: deal.status
      });
      setShowModal(true);
    };

    const openNewModal = () => {
      resetForm();
      setShowModal(true);
    };

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
            <button 
              onClick={() => openEditModal(deal)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
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
            onClick={openNewModal}
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

        {/* Modal de Deal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    {dealSelecionado ? 'Editar Deal' : 'Novo Deal'}
                  </h2>
                  <button onClick={() => {setShowModal(false); resetForm();}}>
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Deal *
                  </label>
                  <input
                    type="text"
                    value={formData.nome_deal}
                    onChange={(e) => setFormData({...formData, nome_deal: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Campanha Verão 2024"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agência *
                  </label>
                  <select
                    value={formData.agencia_id}
                    onChange={(e) => setFormData({...formData, agencia_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Selecione uma agência</option>
                    {dados.agencias.map(agencia => (
                      <option key={agencia.id} value={agencia.id}>
                        {agencia.nome_agencia}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="pausado">Pausado</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {setShowModal(false); resetForm();}}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {dealSelecionado ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Tela de Projetos
  const TelaProjetos = () => {
    const [showModal, setShowModal] = useState(false);
    const [projetoSelecionado, setProjetoSelecionado] = useState<Projeto | null>(null);
    const [formData, setFormData] = useState({
      nome_projeto: '',
      agencia_id: '',
      deal_id: '',
      status_projeto: 'ativo',
      orcamento_projeto: 0,
      valor_gasto: 0,
      data_inicio: '',
      data_fim: '',
      descricao: '',
      cliente_final: '',
      responsavel_projeto: '' as string | null,
      prioridade: 'media',
      progresso: 0,
      briefing: '',
      objetivos: [] as string[],
      tags: [] as string[],
      arquivos_anexos: [] as Array<{ nome: string; url: string; tamanho: string }>
    });
    const [showDetalhes, setShowDetalhes] = useState<Projeto | null>(null);

    const resetForm = () => {
      setFormData({
        nome_projeto: '',
        agencia_id: '',
        deal_id: '',
        status_projeto: 'ativo',
        orcamento_projeto: 0,
        valor_gasto: 0,
        data_inicio: '',
        data_fim: '',
        descricao: '',
        cliente_final: '',
        responsavel_projeto: '',
        prioridade: 'media',
        progresso: 0,
        briefing: '',
        objetivos: [],
        tags: [],
        arquivos_anexos: []
      });
      setProjetoSelecionado(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      try {
        console.log('🚀 Iniciando criação/atualização do projeto...');
        console.log('📋 Dados do formulário:', formData);
        
        // Corrigir deal_id: converter string vazia para null
        const dadosCorrigidos = {
          ...formData,
          deal_id: formData.deal_id === '' ? null : formData.deal_id
        };
        
        console.log('📋 Dados corrigidos:', dadosCorrigidos);
        
        if (projetoSelecionado) {
          console.log('✏️ Atualizando projeto existente:', projetoSelecionado.id);
          await projetoService.atualizar(supabase, projetoSelecionado.id, dadosCorrigidos);
        } else {
          console.log('🆕 Criando novo projeto...');
          await projectManagementService.criarProjetoRobusto(supabase, dadosCorrigidos);
        }
        
        console.log('✅ Projeto salvo com sucesso!');
        setShowModal(false);
        resetForm();
        carregarDados();
      } catch (error) {
        console.error('❌ Erro ao salvar projeto:', error);
        
        // Mostrar erro mais específico para o usuário
        let errorMessage = 'Erro ao salvar projeto';
        if (error instanceof Error) {
          if (error.message.includes('permission denied')) {
            errorMessage = 'Sem permissão para criar projetos. Verifique suas credenciais.';
          } else if (error.message.includes('duplicate key')) {
            errorMessage = 'Já existe um projeto com esses dados.';
          } else if (error.message.includes('foreign key')) {
            errorMessage = 'Dados inválidos. Verifique a agência e deal selecionados.';
          } else {
            errorMessage = `Erro: ${error.message}`;
          }
        }
        
        toast.error(errorMessage);
      }
    };

    const openEditModal = (projeto: Projeto) => {
      setProjetoSelecionado(projeto);
      setFormData({
        nome_projeto: projeto.nome_projeto,
        agencia_id: projeto.agencia_id,
        deal_id: projeto.deal_id || '',
        status_projeto: projeto.status_projeto,
        orcamento_projeto: projeto.orcamento_projeto || 0,
        valor_gasto: projeto.valor_gasto || 0,
        data_inicio: projeto.data_inicio || '',
        data_fim: projeto.data_fim || '',
        descricao: projeto.descricao || '',
        cliente_final: projeto.cliente_final || '',
        responsavel_projeto: projeto.responsavel_projeto || null,
        prioridade: projeto.prioridade || 'media',
        progresso: projeto.progresso || 0,
        briefing: projeto.briefing || '',
        objetivos: projeto.objetivos || [],
        tags: projeto.tags || [],
        arquivos_anexos: projeto.arquivos_anexos || []
      });
      setShowModal(true);
    };

    const openNewModal = () => {
      resetForm();
      setShowModal(true);
    };

    const ProjetoCard = ({ projeto }: { projeto: Projeto }) => {
      const agencia = dados.agencias.find(a => a.id === projeto.agencia_id);
      const deal = dados.deals.find(d => d.id === projeto.deal_id);
      const valorDisponivel = projeto.orcamento_projeto - projeto.valor_gasto;
      const percentualGasto = (projeto.valor_gasto / projeto.orcamento_projeto) * 100;

      return (
        <div className="bg-white rounded-xl border border-gray-200/60 p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300 group">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-primary transition-colors duration-300">
                {projeto.nome_projeto}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <div className="p-1 bg-blue-100 rounded-lg">
                  <Building2 className="w-3 h-3 text-blue-600" />
                </div>
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
              <span>{getResponsavelNome(projeto.responsavel_projeto, projeto.id)}</span>
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDetalhes(projeto);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                type="button"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button 
                onClick={() => openEditModal(projeto)}
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
            onClick={openNewModal}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300 font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Projeto
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200/60 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Projetos</p>
                  <p className="text-2xl font-bold text-gray-900 group-hover:text-primary transition-colors duration-300">{dados.projetos.length}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl group-hover:from-blue-200 group-hover:to-blue-100 transition-all duration-300">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200/60 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Projetos Ativos</p>
                  <p className="text-2xl font-bold text-green-600 group-hover:text-green-700 transition-colors duration-300">
                    {dados.projetos.filter(p => p.status_projeto === 'ativo').length}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-green-100 to-green-50 rounded-xl group-hover:from-green-200 group-hover:to-green-100 transition-all duration-300">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200/60 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Orçamento Total</p>
                  <p className="text-2xl font-bold text-gray-900 group-hover:text-primary transition-colors duration-300">
                    R$ {dados.projetos.reduce((acc, p) => acc + p.orcamento_projeto, 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-xl group-hover:from-yellow-200 group-hover:to-yellow-100 transition-all duration-300">
                  <DollarSign className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200/60 hover:shadow-lg transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Agências Ativas</p>
                  <p className="text-2xl font-bold text-gray-900 group-hover:text-primary transition-colors duration-300">{dados.agencias.length}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl group-hover:from-purple-200 group-hover:to-purple-100 transition-all duration-300">
                  <Building2 className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl border border-gray-200/60 mb-6 shadow-sm">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar projetos, clientes ou agências..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                  value={filtros.busca}
                  onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                />
              </div>
            </div>
            
            <select 
              className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
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
              className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
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
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDetalhes(null);
              }
            }}
          >
            <div 
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {showDetalhes.nome_projeto}
                    </h2>
                    <p className="text-sm text-gray-600">Detalhes do projeto</p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDetalhes(null);
                    }}
                    type="button"
                  >
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
                        <p className="text-lg font-semibold text-gray-800">{getResponsavelNome(showDetalhes.responsavel_projeto, showDetalhes.id)}</p>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="font-semibold text-gray-800 mb-2">Linha do Tempo</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className='flex items-center gap-2'>
                           <Calendar className='w-4 h-4 text-green-600'/>
                           <span>Início: {showDetalhes.data_inicio ? new Date(showDetalhes.data_inicio).toLocaleDateString() : 'Não definida'}</span>
                        </div>
                         <div className='flex items-center gap-2'>
                           <Flag className='w-4 h-4 text-red-600'/>
                           <span>Fim: {showDetalhes.data_fim ? new Date(showDetalhes.data_fim).toLocaleDateString() : 'Não definida'}</span>
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="font-semibold text-gray-800 mb-2">Financeiro</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600">
                                R$ {(showDetalhes.valor_gasto || 0).toLocaleString()} gastos de R$ {(showDetalhes.orcamento_projeto || 0).toLocaleString()}
                            </span>
                            <span className="text-sm font-semibold">
                                {showDetalhes.orcamento_projeto && showDetalhes.orcamento_projeto > 0 
                                    ? (((showDetalhes.valor_gasto || 0) / showDetalhes.orcamento_projeto) * 100).toFixed(1)
                                    : 0}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                                className="bg-blue-600 h-2.5 rounded-full" 
                                style={{ 
                                    width: `${showDetalhes.orcamento_projeto && showDetalhes.orcamento_projeto > 0 
                                        ? ((showDetalhes.valor_gasto || 0) / showDetalhes.orcamento_projeto) * 100 
                                        : 0}%` 
                                }}
                            ></div>
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
                                        {(membro.nome_pessoa || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-800">{membro.nome_pessoa || 'Nome não disponível'}</p>
                                        <p className="text-sm text-gray-500 capitalize">{membro.papel || 'Papel não definido'}</p>
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

        {/* Modal de Projeto */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    {projetoSelecionado ? 'Editar Projeto' : 'Novo Projeto'}
                  </h2>
                  <button onClick={() => {setShowModal(false); resetForm();}}>
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Informações Básicas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Informações Básicas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome do Projeto *
                      </label>
                      <input
                        type="text"
                        value={formData.nome_projeto}
                        onChange={(e) => setFormData({...formData, nome_projeto: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                        placeholder="Ex: Campanha Digital Verão 2024"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Agência *
                      </label>
                      <select
                        value={formData.agencia_id}
                        onChange={(e) => setFormData({...formData, agencia_id: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                        required
                      >
                        <option value="">Selecione uma agência</option>
                        {dados.agencias.map(agencia => (
                          <option key={agencia.id} value={agencia.id}>
                            {agencia.nome_agencia}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deal (Opcional)
                      </label>
                      <select
                        value={formData.deal_id}
                        onChange={(e) => setFormData({...formData, deal_id: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                      >
                        <option value="">Selecione um deal</option>
                        {dados.deals.filter(deal => deal.agencia_id === formData.agencia_id).map(deal => (
                          <option key={deal.id} value={deal.id}>
                            {deal.nome_deal}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={formData.status_projeto}
                        onChange={(e) => setFormData({...formData, status_projeto: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                      >
                        <option value="ativo">Ativo</option>
                        <option value="pausado">Pausado</option>
                        <option value="concluido">Concluído</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Informações Financeiras */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Informações Financeiras</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Orçamento Total (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.orcamento_projeto}
                        onChange={(e) => setFormData({...formData, orcamento_projeto: parseFloat(e.target.value) || 0})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Datas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Cronograma</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data de Início
                      </label>
                      <input
                        type="date"
                        value={formData.data_inicio}
                        onChange={(e) => setFormData({...formData, data_inicio: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data de Fim
                      </label>
                      <input
                        type="date"
                        value={formData.data_fim}
                        onChange={(e) => setFormData({...formData, data_fim: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Informações do Cliente */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Informações do Cliente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome do Cliente
                      </label>
                      <input
                        type="text"
                        value={formData.cliente_final}
                        onChange={(e) => setFormData({...formData, cliente_final: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                        placeholder="Nome do cliente"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Responsável do Projeto
                      </label>
                      {(() => {
                        const membrosEquipe = getMembrosEquipeProjeto(formData.id);
                        if (membrosEquipe.length === 0) {
                          return (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                              <p className="text-sm text-yellow-800">
                                <Users className="inline w-4 h-4 mr-1" />
                                Nenhum membro na equipe. Adicione membros à equipe primeiro para poder selecionar um responsável.
                              </p>
                            </div>
                          );
                        }
                        return (
                          <Select 
                            value={formData.responsavel_projeto || undefined} 
                            onValueChange={(value) => setFormData({...formData, responsavel_projeto: value || null})}
                          >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o responsável">
                            {formData.responsavel_projeto && (
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-xs font-medium text-blue-600">
                                    {(() => {
                                      const nome = getResponsavelNome(formData.responsavel_projeto, formData.id);
                                      return nome ? nome.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';
                                    })()}
                                  </span>
                                </div>
                                <span className="truncate font-medium">{getResponsavelNome(formData.responsavel_projeto, formData.id)}</span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            const membrosEquipe = getMembrosEquipeProjeto(formData.id);
                            
                            if (membrosEquipe.length === 0) {
                              return (
                                <div className="flex items-center gap-2 text-muted-foreground p-2">
                                  <Users className="h-4 w-4" />
                                  <span>Nenhum membro na equipe do projeto</span>
                                </div>
                              );
                            }
                            
                            return membrosEquipe.map(membro => (
                              <SelectItem key={membro.pessoa_id} value={membro.pessoa_id}>
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                                    <span className="text-xs font-medium text-blue-600">
                                      {membro.nome_pessoa ? 
                                        membro.nome_pessoa.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 
                                        '??'
                                      }
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{membro.nome_pessoa || 'Membro sem nome'}</span>
                                    <span className="text-xs text-gray-500">
                                      {membro.papel} • {membro.email_pessoa || 'Sem email'}
                                    </span>
                                  </div>
                                </div>
                              </SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Descrição */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Descrição</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição do Projeto
                    </label>
                    <textarea
                      value={formData.descricao}
                      onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                      placeholder="Descreva os objetivos e detalhes do projeto..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {setShowModal(false); resetForm();}}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {projetoSelecionado ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  
  // Função para renderizar a tela ativa
  const renderTelaAtiva = () => {
    const props = { dados, carregarDados };
    
    switch (telaAtiva) {
      case 'projetos':
        return <TelaProjetos />;
      case 'agencias':
        return <TelaAgencias />;
      case 'deals':
        return <TelaDeals />;
      case 'equipes':
        return <TelaEquipes {...props} />;
      case 'marcos':
        return <TelaMarcos {...props} />;
      case 'relatorios':
        return <TelaRelatorios {...props} />;
      default:
        return <TelaProjetos />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary/5">
      <Navigation />
      <main className="ml-72">
          {/* Header da tela ativa */}
          <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 shadow-sm">
            <div className="px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl shadow-sm">
                    {telaAtiva === 'agencias' && <Building2 className="h-6 w-6 text-primary" />}
                    {telaAtiva === 'projetos' && <Target className="h-6 w-6 text-primary" />}
                    {telaAtiva === 'deals' && <TrendingUp className="h-6 w-6 text-primary" />}
                    {telaAtiva === 'equipes' && <Users className="h-6 w-6 text-primary" />}
                    {telaAtiva === 'marcos' && <Flag className="h-6 w-6 text-primary" />}
                    {telaAtiva === 'relatorios' && <BarChart3 className="h-6 w-6 text-primary" />}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 capitalize">
                      {telaAtiva === 'agencias' && 'Agências Parceiras'}
                      {telaAtiva === 'projetos' && 'Projetos Ativos'}
                      {telaAtiva === 'deals' && 'Deals e Negócios'}
                      {telaAtiva === 'equipes' && 'Equipes dos Projetos'}
                      {telaAtiva === 'marcos' && 'Marcos e Cronograma'}
                      {telaAtiva === 'relatorios' && 'Relatórios Executivos'}
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                      {telaAtiva === 'agencias' && `Gerencie todas as agências • ${dados.agencias.length} parceiros`}
                      {telaAtiva === 'projetos' && `Acompanhe projetos em execução • ${dados.projetos.length} ativos`}
                      {telaAtiva === 'deals' && `Controle de negócios • ${dados.deals.length} deals`}
                      {telaAtiva === 'equipes' && `Gestão de pessoas • ${dados.equipes.length} membros`}
                      {telaAtiva === 'marcos' && `Cronograma de entregas • ${dados.marcos.length} marcos`}
                      {telaAtiva === 'relatorios' && 'Análises e métricas de performance'}
                    </p>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={carregarDados} 
                  disabled={loading} 
                  className="gap-2 hover:bg-primary/5 hover:border-primary/20 transition-all duration-300"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
            </div>
          </div>

          <div className="p-8">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Card className="w-full max-w-md border-0 shadow-xl bg-gradient-to-br from-white to-primary/5">
                  <CardContent className="p-8 text-center">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto mb-6"></div>
                      <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-primary/30 animate-spin mx-auto mb-6" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900">Carregando Dados</h3>
                    <p className="text-gray-600">
                      Sincronizando informações do sistema...
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              renderTelaAtiva()
            )}
          </div>
      </main>
    </div>
  );
};

export default ProjectManagement;
