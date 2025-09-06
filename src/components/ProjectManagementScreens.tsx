// Corrigir import
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  X, 
  Users, 
  Target, 
  Activity, 
  UserPlus,
  Flag,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  TrendingUp,
  BarChart3,
  User,
  Shield,
  Crown
} from 'lucide-react';
import { 
  equipeService,
  marcoService,
  type Agencia,
  type Deal,
  type Projeto,
  type Contato,
  type Equipe,
  type Marco
} from '@/lib/project-management-service';
import { supabase } from '@/integrations/supabase/client';

interface Notificacao {
  id: string;
  titulo: string;
  descricao: string;
  tipo: 'info' | 'warning' | 'error' | 'success';
  data: string;
  lida: boolean;
}

interface ProjectManagementScreensProps {
  dados: {
    agencias: Agencia[];
    deals: Deal[];
    projetos: Projeto[];
    equipes: Equipe[];
    marcos: Marco[];
    contatos: Contato[];
    notificacoes: Notificacao[];
  };
  carregarDados: () => Promise<void>;
}

export const TelaEquipes = ({ dados, carregarDados }: ProjectManagementScreensProps) => {
  const [showModal, setShowModal] = useState(false);
  const [projetoSelecionado, setProjetoSelecionado] = useState<string>('');
  const [membroSelecionado, setMembroSelecionado] = useState<Equipe | null>(null);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false);

  // Carregar usuários disponíveis
  const carregarUsuarios = async () => {
    try {
      setCarregandoUsuarios(true);
      
      // Buscar todos os usuários do sistema
      const { data: usuariosData, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;

      // Verificar quais usuários já estão na equipe do projeto selecionado
      const { data: membrosExistentes } = await supabase
        .from('agencia_projeto_equipe')
        .select('usuario_id')
        .eq('projeto_id', projetoSelecionado)
        .eq('ativo', true);

      const idsMembrosExistentes = new Set(membrosExistentes?.map(m => m.usuario_id) || []);
      
      // Filtrar usuários que não estão na equipe
      const usuariosDisponiveis = usuariosData?.filter(u => !idsMembrosExistentes.has(u.id)) || [];
      
      setUsuarios(usuariosDisponiveis);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setCarregandoUsuarios(false);
    }
  };

  // Carregar usuários quando o modal abrir
  useEffect(() => {
    if (showModal && projetoSelecionado) {
      carregarUsuarios();
    }
  }, [showModal, projetoSelecionado]);
  
  // Configuração das funções com ícones e cores
  const FUNCOES_CONFIG = {
    membro: {
      label: 'Membro',
      icon: User,
      color: 'bg-blue-100 text-blue-800',
      borderColor: 'border-blue-200'
    },
    coordenador: {
      label: 'Coordenador',
      icon: Target,
      color: 'bg-green-100 text-green-800',
      borderColor: 'border-green-200'
    },
    gerente: {
      label: 'Gerente',
      icon: Shield,
      color: 'bg-purple-100 text-purple-800',
      borderColor: 'border-purple-200'
    },
    diretor: {
      label: 'Diretor',
      icon: Crown,
      color: 'bg-yellow-100 text-yellow-800',
      borderColor: 'border-yellow-200'
    }
  };
  
  const EquipeCard = ({ projeto }: { projeto: Projeto }) => {
    const agencia = dados.agencias.find(a => a.id === projeto.agencia_id);
    const equipeProjeto = dados.equipes.filter(e => e.projeto_id === projeto.id && e.ativo);

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{projeto.nome_projeto}</h3>
            <p className="text-sm text-gray-600">{agencia?.nome_agencia}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              {equipeProjeto.length} membro(s)
            </span>
            <button 
              onClick={() => {setProjetoSelecionado(projeto.id); setShowModal(true);}}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {equipeProjeto.map(membro => {
            const config = FUNCOES_CONFIG[membro.papel as keyof typeof FUNCOES_CONFIG];
            const IconComponent = config?.icon || User;
            
            return (
              <div key={membro.id} className={`flex items-center justify-between p-3 rounded-lg border-2 ${config?.borderColor || 'border-gray-200'} bg-white`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                    {(membro.nome_pessoa || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{membro.nome_pessoa || 'Usuário'}</p>
                    <p className="text-sm text-gray-600">{membro.email_pessoa || 'Email não disponível'}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <IconComponent className="w-3 h-3" />
                      <span className={`text-xs px-2 py-0.5 rounded-full ${config?.color || 'bg-gray-100 text-gray-800'}`}>
                        {config?.label || membro.papel}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    Entrou em {new Date(membro.data_entrada).toLocaleDateString()}
                  </span>
                  <button 
                    onClick={() => {setMembroSelecionado(membro); setShowModal(true);}}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipes de Projeto</h1>
          <p className="text-gray-600">Gerencie as equipes de todos os projetos</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Membros</p>
              <p className="text-2xl font-bold text-gray-900">
                {dados.equipes.filter(e => e.ativo).length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Projetos com Equipe</p>
              <p className="text-2xl font-bold text-green-600">
                {new Set(dados.equipes.filter(e => e.ativo).map(e => e.projeto_id)).size}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Target className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Coordenadores</p>
              <p className="text-2xl font-bold text-green-600">
                {dados.equipes.filter(e => e.ativo && e.papel === 'coordenador').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Target className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Gerentes</p>
              <p className="text-2xl font-bold text-purple-600">
                {dados.equipes.filter(e => e.ativo && e.papel === 'gerente').length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Diretores</p>
              <p className="text-2xl font-bold text-yellow-600">
                {dados.equipes.filter(e => e.ativo && e.papel === 'diretor').length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Crown className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Projects with Teams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dados.projetos.map(projeto => (
          <EquipeCard key={projeto.id} projeto={projeto} />
        ))}
      </div>

      {/* Modal para adicionar/editar membro */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {membroSelecionado ? 'Editar Membro' : 'Adicionar Membro'}
                </h2>
                <button onClick={() => {setShowModal(false); setMembroSelecionado(null); setProjetoSelecionado('');}}>
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const dadosMembro = {
                  projeto_id: projetoSelecionado,
                  usuario_id: formData.get('usuario_id') as string,
                  papel: formData.get('papel') as string,
                  data_entrada: new Date().toISOString().split('T')[0]
                };

                try {
                  if (membroSelecionado) {
                    await equipeService.atualizarMembro(supabase, membroSelecionado.id, { papel: dadosMembro.papel });
                  } else {
                    await equipeService.adicionarMembro(supabase, dadosMembro);
                  }
                  setShowModal(false);
                  setMembroSelecionado(null);
                  setProjetoSelecionado('');
                  carregarDados();
                } catch (error) {
                  console.error('Erro ao salvar membro:', error);
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selecionar Usuário
                  </label>
                  <select
                    name="usuario_id"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={carregandoUsuarios}
                  >
                    <option value="">
                      {carregandoUsuarios ? 'Carregando usuários...' : 'Selecione um usuário'}
                    </option>
                    {usuarios.map(usuario => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.full_name} ({usuario.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Papel
                  </label>
                  <select
                    name="papel"
                    defaultValue={membroSelecionado?.papel || 'membro'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="membro">Membro</option>
                    <option value="coordenador">Coordenador</option>
                    <option value="gerente">Gerente</option>
                    <option value="diretor">Diretor</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {setShowModal(false); setMembroSelecionado(null); setProjetoSelecionado('');}}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {membroSelecionado ? 'Atualizar' : 'Adicionar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const TelaMarcos = ({ dados, carregarDados }: ProjectManagementScreensProps) => {
  const [showModal, setShowModal] = useState(false);
  const [projetoSelecionado, setProjetoSelecionado] = useState<string>('');
  const [marcoSelecionado, setMarcoSelecionado] = useState<Marco | null>(null);

  const MarcoCard = ({ projeto }: { projeto: Projeto }) => {
    const agencia = dados.agencias.find(a => a.id === projeto.agencia_id);
    const marcosProjeto = dados.marcos.filter(m => m.projeto_id === projeto.id).sort((a, b) => a.ordem - b.ordem);

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{projeto.nome_projeto}</h3>
            <p className="text-sm text-gray-600">{agencia?.nome_agencia}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              {marcosProjeto.length} marco(s)
            </span>
            <button 
              onClick={() => {setProjetoSelecionado(projeto.id); setShowModal(true);}}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {marcosProjeto.map((marco, index) => (
            <div key={marco.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                marco.status === 'concluido' ? 'bg-green-500' :
                marco.status === 'em_andamento' ? 'bg-yellow-500' :
                'bg-gray-400'
              }`}>
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{marco.nome_marco}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    marco.status === 'concluido' ? 'bg-green-100 text-green-800' :
                    marco.status === 'em_andamento' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {marco.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{marco.descricao}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Prazo: {new Date(marco.data_prevista).toLocaleDateString()}
                </p>
              </div>
              <button 
                onClick={() => {setMarcoSelecionado(marco); setShowModal(true);}}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marcos de Projeto</h1>
          <p className="text-gray-600">Gerencie os marcos de todos os projetos</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Marcos</p>
              <p className="text-2xl font-bold text-gray-900">{dados.marcos.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Flag className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Concluídos</p>
              <p className="text-2xl font-bold text-green-600">
                {dados.marcos.filter(m => m.status === 'concluido').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Em Andamento</p>
              <p className="text-2xl font-bold text-yellow-600">
                {dados.marcos.filter(m => m.status === 'em_andamento').length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-gray-600">
                {dados.marcos.filter(m => m.status === 'pendente').length}
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Projects with Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dados.projetos.map(projeto => (
          <MarcoCard key={projeto.id} projeto={projeto} />
        ))}
      </div>

      {/* Modal para adicionar/editar marco */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {marcoSelecionado ? 'Editar Marco' : 'Novo Marco'}
                </h2>
                <button onClick={() => {setShowModal(false); setMarcoSelecionado(null); setProjetoSelecionado('');}}>
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const projetoId = projetoSelecionado || marcoSelecionado?.projeto_id;
                
                if (!projetoId) {
                  console.error('Projeto não selecionado');
                  return;
                }
                
                const dadosMarco = {
                  projeto_id: projetoId,
                  nome_marco: formData.get('nome_marco') as string,
                  descricao: formData.get('descricao') as string,
                  data_prevista: formData.get('data_prevista') as string,
                  status: formData.get('status') as string,
                  ordem: parseInt(formData.get('ordem') as string) || 1,
                  responsavel_id: (formData.get('responsavel_id') as string) || ''
                };

                try {
                  if (marcoSelecionado) {
                    await marcoService.atualizar(supabase, marcoSelecionado.id, dadosMarco);
                  } else {
                    await marcoService.criar(supabase, dadosMarco);
                  }
                  setShowModal(false);
                  setMarcoSelecionado(null);
                  setProjetoSelecionado('');
                  carregarDados();
                } catch (error) {
                  console.error('Erro ao salvar marco:', error);
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Marco
                  </label>
                  <input
                    name="nome_marco"
                    type="text"
                    defaultValue={marcoSelecionado?.nome_marco || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    name="descricao"
                    defaultValue={marcoSelecionado?.descricao || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Prevista
                    </label>
                    <input
                      name="data_prevista"
                      type="date"
                      defaultValue={marcoSelecionado?.data_prevista ? new Date(marcoSelecionado.data_prevista).toISOString().split('T')[0] : ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ordem
                    </label>
                    <input
                      name="ordem"
                      type="number"
                      defaultValue={marcoSelecionado?.ordem || 1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={marcoSelecionado?.status || 'pendente'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {setShowModal(false); setMarcoSelecionado(null); setProjetoSelecionado('');}}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {marcoSelecionado ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const TelaRelatorios = ({ dados }: ProjectManagementScreensProps) => {
  const [filtroPeriodo, setFiltroPeriodo] = useState('30'); // dias
  const [filtroAgencia, setFiltroAgencia] = useState('');

  // Cálculos para relatórios
  const projetosAtivos = dados.projetos.filter(p => p.status_projeto === 'ativo');
  const projetosConcluidos = dados.projetos.filter(p => p.status_projeto === 'concluido');
  const orcamentoTotal = dados.projetos.reduce((acc, p) => acc + p.orcamento_projeto, 0);
  const gastoTotal = dados.projetos.reduce((acc, p) => acc + p.valor_gasto, 0);
  const marcosConcluidos = dados.marcos.filter(m => m.status === 'concluido').length;
  const marcosPendentes = dados.marcos.filter(m => m.status === 'pendente').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios e Dashboards</h1>
          <p className="text-gray-600">Visão geral do desempenho dos projetos</p>
        </div>
        <div className="flex gap-4">
          <select 
            value={filtroPeriodo}
            onChange={(e) => setFiltroPeriodo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="365">Último ano</option>
          </select>
          <select 
            value={filtroAgencia}
            onChange={(e) => setFiltroAgencia(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as Agências</option>
            {dados.agencias.map(agencia => (
              <option key={agencia.id} value={agencia.id}>
                {agencia.nome_agencia}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Projetos Ativos</p>
              <p className="text-2xl font-bold text-blue-600">{projetosAtivos.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                {dados.projetos.length > 0 ? ((projetosAtivos.length / dados.projetos.length) * 100).toFixed(1) : 0}% do total
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Orçamento Total</p>
              <p className="text-2xl font-bold text-green-600">
                R$ {orcamentoTotal.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Gasto: R$ {gastoTotal.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Marcos Concluídos</p>
              <p className="text-2xl font-bold text-purple-600">{marcosConcluidos}</p>
              <p className="text-xs text-gray-500 mt-1">
                {marcosPendentes} pendentes
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa de Conclusão</p>
              <p className="text-2xl font-bold text-orange-600">
                {dados.projetos.length > 0 ? ((projetosConcluidos.length / dados.projetos.length) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {projetosConcluidos.length} de {dados.projetos.length} projetos
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos e Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Status dos Projetos */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status dos Projetos</h3>
          <div className="space-y-3">
            {['ativo', 'concluido', 'pausado', 'cancelado'].map(status => {
              const count = dados.projetos.filter(p => p.status_projeto === status).length;
              const percentage = dados.projetos.length > 0 ? (count / dados.projetos.length) * 100 : 0;
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      status === 'ativo' ? 'bg-green-500' :
                      status === 'concluido' ? 'bg-blue-500' :
                      status === 'pausado' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}></div>
                    <span className="text-sm font-medium capitalize">{status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{count}</span>
                    <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance por Agência */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance por Agência</h3>
          <div className="space-y-3">
            {dados.agencias.map(agencia => {
              const projetosAgencia = dados.projetos.filter(p => p.agencia_id === agencia.id);
              const projetosConcluidosAgencia = projetosAgencia.filter(p => p.status_projeto === 'concluido');
              const taxaConclusao = projetosAgencia.length > 0 ? (projetosConcluidosAgencia.length / projetosAgencia.length) * 100 : 0;
              
              return (
                <div key={agencia.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{agencia.nome_agencia}</p>
                    <p className="text-xs text-gray-500">{projetosAgencia.length} projeto(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{taxaConclusao.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">conclusão</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabela de Projetos Recentes */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Projetos Recentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projeto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agência
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orçamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progresso
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dados.projetos.slice(0, 10).map(projeto => {
                const agencia = dados.agencias.find(a => a.id === projeto.agencia_id);
                const percentualGasto = (projeto.valor_gasto / projeto.orcamento_projeto) * 100;
                
                return (
                  <tr key={projeto.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{projeto.nome_projeto}</div>
                        <div className="text-sm text-gray-500">{projeto.cliente_final}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {agencia?.nome_agencia}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        projeto.status_projeto === 'ativo' ? 'bg-green-100 text-green-800' :
                        projeto.status_projeto === 'concluido' ? 'bg-blue-100 text-blue-800' :
                        projeto.status_projeto === 'pausado' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {projeto.status_projeto}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {projeto.orcamento_projeto.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              percentualGasto > 80 ? 'bg-red-500' : 
                              percentualGasto > 60 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(percentualGasto, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{percentualGasto.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

