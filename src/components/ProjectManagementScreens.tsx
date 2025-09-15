import React, { useState, useEffect } from 'react'; 
import { 
  Plus, 
  Edit, 
  X, 
  Users, 
  Target, 
   
  UserPlus,
  Flag,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  TrendingUp,
  
  User,
  Shield,
  Crown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { PessoaProjeto } from '@/types/agencia';
import type { 
  Agencia, 
  Deal, 
  Projeto, 
  Contato, 
  Equipe, 
  Marco 
} from '@/lib/project-management-service';

// Tipos de Exemplo
interface Notificacao {
  id: string;
  titulo: string;
  descricao: string;
  tipo: 'info' | 'warning' | 'error' | 'success';
  data: string;
  lida: boolean;
}

// Serviços de Exemplo
const PessoasProjetoService = {
  listar: async (): Promise<PessoaProjeto[]> => {
    const { data, error } = await supabase
      .from('pessoas_projeto')
      .select('id, nome, email, telefone, cargo, agencia_id, created_at, updated_at');
    
    if (error) {
      console.error('Erro ao buscar pessoas do projeto:', error);
      return [];
    }
    
    return data || [];
  }
};

const equipeService = {
  adicionarMembro: async (membro: Omit<Equipe, 'id' | 'ativo' | 'data_entrada'>): Promise<any> => {
    const { data, error } = await supabase
      .from('agencia_projeto_equipe')
      .insert([{ ...membro, ativo: true, data_entrada: new Date().toISOString() }]);
    
    if (error) {
      console.error('Erro ao adicionar membro:', error);
      throw error;
    }
    
    return data;
  },
  atualizarMembro: async (id: string, updates: Partial<Equipe>): Promise<any> => {
    const { data, error } = await supabase
      .from('agencia_projeto_equipe')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      console.error('Erro ao atualizar membro:', error);
      throw error;
    }
    
    return data;
  }
};

const marcoService = {
    criar: async (marco: Omit<Marco, 'id'>): Promise<any> => {
        const { data, error } = await supabase
            .from('agencia_projeto_marcos')
            .insert([marco]);
        
        if (error) {
            console.error('Erro ao criar marco:', error);
            throw error;
        }
        
        return data;
    },
    atualizar: async (id: string, updates: Partial<Marco>): Promise<any> => {
        const { data, error } = await supabase
            .from('agencia_projeto_marcos')
            .update(updates)
            .eq('id', id);
        
        if (error) {
            console.error('Erro ao atualizar marco:', error);
            throw error;
        }
        
        return data;
    }
};

interface ProjectManagementScreensProps {
  dados: {
    agencias: Agencia[];
    deals: Deal[];
    projetos: Projeto[];
    equipes: Equipe[];
    marcos: Marco[];
    contatos: Contato[];
    notificacoes: Notificacao[];
    pessoasProjeto: PessoaProjeto[];
  };
  carregarDados: () => Promise<void>;
}

export const TelaEquipes = ({ dados, carregarDados }: ProjectManagementScreensProps) => {
  const [showModal, setShowModal] = useState(false);
  const [projetoSelecionado, setProjetoSelecionado] = useState<string>('');
  const [membroSelecionado, setMembroSelecionado] = useState<Equipe | null>(null);
  const [pessoasDisponiveis, setPessoasDisponiveis] = useState<PessoaProjeto[]>([]);
  const [carregandoPessoas, setCarregandoPessoas] = useState(false);
  const [erroPessoas, setErroPessoas] = useState<string | null>(null);

  // Carregar pessoas disponíveis que ainda não estão na equipe do projeto selecionado.
  const carregarPessoasDisponiveis = async () => {
    if (!projetoSelecionado) return;

    try {
      setCarregandoPessoas(true);
      setErroPessoas(null);
      
      const { data: membrosExistentes } = await supabase
        .from('agencia_projeto_equipe')
        .select('pessoa_id')
        .eq('projeto_id', projetoSelecionado)
        .eq('ativo', true);

      const idsMembrosExistentes = new Set((membrosExistentes || []).map((m: any) => m.pessoa_id));
      
      // Usar sempre o PessoasProjetoService para carregar usuários
      const pessoasFonte: PessoaProjeto[] = await PessoasProjetoService.listar();
      
      const disponiveis = (pessoasFonte || []).filter(p => !idsMembrosExistentes.has(p.id));
      
      setPessoasDisponiveis(disponiveis);
    } catch (error) {
      console.error('Erro ao carregar pessoas do projeto:', error);
      setErroPessoas('Não foi possível carregar a lista de pessoas.');
      setPessoasDisponiveis([]);
    } finally {
      setCarregandoPessoas(false);
    }
  };

  // Carregar pessoas quando o modal abrir para um projeto específico.
  useEffect(() => {
    if (showModal && projetoSelecionado && !membroSelecionado) {
      carregarPessoasDisponiveis();
    }
  }, [showModal, projetoSelecionado, membroSelecionado]);
  
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
    consultor: {
        label: 'Consultor',
        icon: Shield,
        color: 'bg-purple-100 text-purple-800',
        borderColor: 'border-purple-200'
    }
  } as const;
  
  const EquipeCard = ({ projeto }: { projeto: Projeto }) => {
    const equipesProjeto = dados.equipes.filter(e => e.projeto_id === projeto.id && e.ativo);
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">{projeto.nome_projeto}</h3>
            <p className="text-sm text-gray-600">{projeto.descricao}</p>
          </div>
          <button
            onClick={() => {
              setProjetoSelecionado(projeto.id);
              setMembroSelecionado(null);
              setShowModal(true);
              // Dispara a carga imediatamente para melhor UX
              setTimeout(() => carregarPessoasDisponiveis(), 0);
            }}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-3">
          {equipesProjeto.map(membro => {
            const pessoa = dados.pessoasProjeto.find(p => p.id === membro.pessoa_id);
            const config = FUNCOES_CONFIG[membro.papel as keyof typeof FUNCOES_CONFIG];
            const nomePessoa = pessoa?.nome || 'Pessoa não encontrada';
            
            return (
              <div key={membro.id} className={`flex items-center justify-between p-3 rounded-lg border-2 ${config?.borderColor || 'border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold`}>
                    {(nomePessoa?.[0] || 'P').toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{nomePessoa}</p>
                    <p className="text-sm text-gray-600">{pessoa?.email || 'Email não disponível'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${config?.color || 'bg-gray-200'}`}>
                    {config?.label || membro.papel}
                  </span>
                   <span className="text-xs text-gray-500">
                      Entrou em {new Date(membro.data_entrada).toLocaleDateString()}
                    </span>
                  <button
                    onClick={() => {setMembroSelecionado(membro); setProjetoSelecionado(projeto.id); setShowModal(true);}}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
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
              <p className="text-sm font-medium text-gray-600">Consultores</p>
              <p className="text-2xl font-bold text-purple-600">
                {dados.equipes.filter(e => e.ativo && e.papel === 'consultor').length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dados.projetos.map(projeto => (
          <EquipeCard key={projeto.id} projeto={projeto} />
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {membroSelecionado ? 'Editar Papel do Membro' : 'Adicionar Membro'}
                </h2>
                <button onClick={() => {setShowModal(false); setMembroSelecionado(null); setProjetoSelecionado('');}}>
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget as HTMLFormElement);
                
                try {
                  if (membroSelecionado) {
                    const dadosAtualizados = {
                      papel: formData.get('papel') as string,
                    };
                    await equipeService.atualizarMembro(membroSelecionado.id, dadosAtualizados);
                  } else {
                    const dadosMembro = {
                      projeto_id: projetoSelecionado,
                      pessoa_id: formData.get('pessoa_id') as string,
                      papel: formData.get('papel') as string,
                    };
                    await equipeService.adicionarMembro(dadosMembro);
                  }
                  setShowModal(false);
                  setMembroSelecionado(null);
                  setProjetoSelecionado('');
                  await carregarDados();
                } catch (error) {
                  console.error('Erro ao salvar membro:', error);
                }
              }} className="space-y-4">
                
                {!membroSelecionado && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Selecionar Pessoa
                    </label>
                    <select
                      name="pessoa_id"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={carregandoPessoas || !!erroPessoas}
                      defaultValue=""
                    >
                      <option value="">
                        {carregandoPessoas
                          ? 'Carregando pessoas...'
                          : erroPessoas
                            ? 'Erro ao carregar — tente novamente'
                            : 'Selecione uma pessoa'}
                      </option>
                      {pessoasDisponiveis.map(pessoa => (
                        <option key={pessoa.id} value={pessoa.id}>
                          {pessoa.nome} {pessoa.email ? `(${pessoa.email})` : ''}
                        </option>
                      ))}
                    </select>
                    {erroPessoas && (
                      <p className="mt-1 text-sm text-red-600">{erroPessoas}</p>
                    )}
                  </div>
                )}

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
                    <option value="consultor">Consultor</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
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
                    {membroSelecionado ? 'Atualizar Papel' : 'Adicionar Membro'}
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
  const [marcoTemplates, setMarcoTemplates] = useState<string[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [customMarcoName, setCustomMarcoName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Função para carregar templates de marcos
  const carregarTemplatesMarcos = async () => {
    setLoadingTemplates(true);
    try {
      console.log('Carregando templates de marcos...');
      
      // Templates padrão comuns para projetos de agência
      const templatesComuns = [
        'Briefing Inicial',
        'Aprovação do Conceito',
        'Desenvolvimento',
        'Revisão Cliente',
        'Ajustes Finais',
        'Entrega Final',
        'Kickoff do Projeto',
        'Pesquisa e Análise',
        'Criação de Wireframes',
        'Design Visual',
        'Desenvolvimento Frontend',
        'Desenvolvimento Backend',
        'Testes de Qualidade',
        'Deploy e Lançamento',
        'Treinamento Cliente',
        'Suporte Pós-Lançamento'
      ];
      
      // Tentar buscar marcos existentes da tabela (se as permissões permitirem)
      try {
        const { data, error } = await supabase
          .from('agencia_projeto_marcos')
          .select('nome_marco')
          .not('nome_marco', 'is', null)
          .order('nome_marco');
          
        if (!error && data && data.length > 0) {
          // Combinar templates padrão com marcos existentes
          const marcosExistentes = data.map(item => item.nome_marco).filter(Boolean);
          const todosTemplates = [...new Set([...templatesComuns, ...marcosExistentes])];
          setMarcoTemplates(todosTemplates.sort());
          console.log('Templates carregados (padrão + existentes):', todosTemplates);
        } else {
          // Usar apenas templates padrão se houver erro de permissão
          setMarcoTemplates(templatesComuns);
          console.log('Usando templates padrão:', templatesComuns);
        }
      } catch (dbError) {
        // Fallback para templates padrão em caso de erro de permissão
        console.log('Erro de permissão, usando templates padrão:', dbError);
        setMarcoTemplates(templatesComuns);
      }
      
    } catch (error) {
      console.error('Erro ao carregar templates de marcos:', error);
      // Fallback final para templates básicos
      setMarcoTemplates(['Início', 'Desenvolvimento', 'Revisão', 'Entrega']);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Carregar templates quando o modal abrir
  useEffect(() => {
    if (showModal && marcoTemplates.length === 0) {
      carregarTemplatesMarcos();
    }
  }, [showModal]);

  const MarcoCard = ({ projeto }: { projeto: Projeto }) => {
    const agencia = dados.agencias.find(a => a.id === projeto.agencia_id);
    const marcosProjeto = dados.marcos.filter(m => m.projeto_id === projeto.id).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

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
              onClick={() => {setProjetoSelecionado(projeto.id); setMarcoSelecionado(null); setShowModal(true);}}
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
                onClick={() => {setMarcoSelecionado(marco); setProjetoSelecionado(marco.projeto_id); setShowModal(true);}}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dados.projetos.map(projeto => (
          <MarcoCard key={projeto.id} projeto={projeto} />
        ))}
      </div>

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
                
                // Determinar o nome do marco correto
                let nomeMarco = formData.get('nome_marco') as string;
                if (showCustomInput) {
                  nomeMarco = customMarcoName;
                }
                
                const dadosMarco = {
                  projeto_id: projetoSelecionado,
                  nome_marco: nomeMarco,
                  descricao: formData.get('descricao') as string,
                  data_prevista: formData.get('data_prevista') as string,
                  ordem: parseInt(formData.get('ordem') as string) || 1,
                  status: 'pendente' as const
                };

                try {
                  if (marcoSelecionado) {
                    await marcoService.atualizar(marcoSelecionado.id, dadosMarco);
                  } else {
                    await marcoService.criar(dadosMarco);
                  }
                  setShowModal(false);
                  setMarcoSelecionado(null);
                  setProjetoSelecionado('');
                  setShowCustomInput(false);
                  setCustomMarcoName('');
                  await carregarDados();
                } catch (error) {
                  console.error('Erro ao salvar marco:', error);
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Marco
                  </label>
                  <select
                    name="nome_marco"
                    defaultValue={marcoSelecionado?.nome_marco || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={!showCustomInput}
                    disabled={loadingTemplates}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setShowCustomInput(true);
                      } else {
                        setShowCustomInput(false);
                        setCustomMarcoName('');
                      }
                    }}
                  >
                    <option value="">
                      {loadingTemplates ? 'Carregando templates...' : 'Selecione um marco'}
                    </option>
                    {marcoTemplates.length > 0 ? (
                      marcoTemplates.map((template, index) => (
                        <option key={`template-${index}`} value={template}>
                          {template}
                        </option>
                      ))
                    ) : (
                      !loadingTemplates && (
                        <option disabled>Nenhum template encontrado</option>
                      )
                    )}
                    <option value="custom">Outro (digite personalizado)</option>
                  </select>
                  
                  {showCustomInput && (
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Digite o nome do marco"
                        value={customMarcoName}
                        onChange={(e) => setCustomMarcoName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={showCustomInput}
                        name="nome_marco_custom"
                      />
                    </div>
                  )}
                  
                  {!loadingTemplates && marcoTemplates.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Nenhum template encontrado. Use a opção "Outro" para criar um marco personalizado.
                    </p>
                  )}
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
                {marcoSelecionado && (
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
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false); 
                      setMarcoSelecionado(null); 
                      setProjetoSelecionado('');
                      setShowCustomInput(false);
                      setCustomMarcoName('');
                    }}
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
    const [filtroPeriodo, setFiltroPeriodo] = useState('30');
    const [filtroAgencia, setFiltroAgencia] = useState('');
  
    const projetosAtivos = dados.projetos.filter(p => p.status_projeto === 'ativo');
    const projetosConcluidos = dados.projetos.filter(p => p.status_projeto === 'concluido');
    const orcamentoTotal = dados.projetos.reduce((acc, p) => acc + (p.orcamento_projeto || 0), 0);
    const gastoTotal = dados.projetos.reduce((acc, p) => acc + (p.valor_gasto || 0), 0);
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
                  R$ {orcamentoTotal.toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Gasto: R$ {gastoTotal.toLocaleString('pt-BR')}
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
  
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
                  const percentualGasto = (projeto.orcamento_projeto && projeto.orcamento_projeto > 0) ? ((projeto.valor_gasto || 0) / projeto.orcamento_projeto) * 100 : 0;
                  
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
                        R$ {(projeto.orcamento_projeto || 0).toLocaleString('pt-BR')}
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
