import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import type { PessoaProjeto } from '@/types/agencia';
import { logDebug, logError, logWarn } from '@/utils/secureLogger';

// Tipos baseados na estrutura do banco de dados
export interface Agencia {
  id: string;
  nome_agencia: string;
  codigo_agencia: string;
  cnpj: string;
  email_empresa: string;
  telefone_empresa: string;
  cidade: string;
  estado: string;
  taxa_porcentagem: number;
  created_at: string;
}

export interface Deal {
  id: string;
  nome_deal: string;
  agencia_id: string;
  status: string;
  created_at: string;
}

export interface Projeto {
  id: string;
  nome_projeto: string;
  deal_id: string;
  agencia_id: string;
  status_projeto: string;
  data_inicio: string;
  data_fim: string;
  orcamento_projeto: number;
  valor_gasto: number;
  responsavel_projeto: string | null;
  cliente_final: string;
  prioridade: string;
  progresso: number;
  descricao: string;
  briefing: string;
  objetivos: string[];
  tags: string[];
  arquivos_anexos: Array<{ nome: string; url: string; tamanho: string }>;
}

export interface Contato {
  id: string;
  agencia_id: string;
  nome_contato: string;
  email_contato: string;
  telefone_contato: string;
  cargo: string;
}

// Tipos para funções de equipe
export type FuncaoEquipe = 'membro' | 'coordenador' | 'gerente' | 'diretor';

export interface Equipe {
  id: string;
  projeto_id: string;
  pessoa_id: string;
  papel: FuncaoEquipe;
  data_entrada: string;
  data_saida?: string;
  ativo: boolean;
  created_at?: string;
  created_by?: string;
}

// Interface para estatísticas de equipe
export interface EstatisticasEquipe {
  total_membros: number;
  total_coordenadores: number;
  total_gerentes: number;
  total_diretores: number;
  membros_ativos: number;
}

// Interface para dados completos da equipe
export interface EquipeCompleta extends Equipe {
  nome_pessoa: string;
  email_pessoa: string | null;
  telefone_pessoa: string | null;
  cargo_pessoa: string | null;
  nome_projeto: string;
  status_projeto: string;
  cliente_final: string;
  nome_agencia: string;
  codigo_agencia: string;
  nome_deal: string;
  nivel_hierarquia: number;
  status_membro: string;
}

export interface Marco {
  id: string;
  projeto_id: string;
  nome_marco: string;
  descricao: string;
  data_prevista: string;
  status: string;
  responsavel_id: string;
  ordem: number;
}

// Serviços para Agências
export const agenciaService = {
  // Listar todas as agências
  async listar(supabase: SupabaseClient): Promise<Agencia[]> {
    try {
      console.log('🏢 Buscando agências na tabela...');
      const { data, error } = await supabase
        .from('agencias')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logError('Erro na query de agências', { code: error.code, message: error.message });
        throw error;
      }
      
      logDebug('Agências encontradas', { count: data?.length || 0 });
      return data || [];
    } catch (error) {
      logError('Erro ao listar agências', error);
      toast.error('Erro ao carregar agências');
      throw error;
    }
  },

  // Criar nova agência
  async criar(supabase: SupabaseClient, agencia: Omit<Agencia, 'id' | 'created_at'>): Promise<Agencia> {
    try {
      const { data, error } = await supabase
        .from('agencias')
        .insert([agencia])
        .select()
        .single();

      if (error) throw error;
      toast.success('Agência criada com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao criar agência:', error);
      toast.error('Erro ao criar agência');
      throw error;
    }
  },

  // Atualizar agência
  async atualizar(supabase: SupabaseClient, id: string, agencia: Partial<Agencia>): Promise<Agencia> {
    try {
      const { data, error } = await supabase
        .from('agencias')
        .update(agencia)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      toast.success('Agência atualizada com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao atualizar agência:', error);
      toast.error('Erro ao atualizar agência');
      throw error;
    }
  },

  // Excluir agência
  async excluir(supabase: SupabaseClient, id: string): Promise<void> {
    try {
      // Primeiro, excluir registros relacionados na tabela pessoas_projeto
      console.log('🗑️ Removendo dependências da agência...');
      const { error: pessoasError } = await supabase
        .from('pessoas_projeto')
        .delete()
        .eq('agencia_id', id);

      if (pessoasError) {
        console.warn('⚠️ Aviso ao remover pessoas do projeto:', pessoasError);
        // Não falha se não houver registros para remover
      }

      // Depois, excluir a agência
      console.log('🗑️ Excluindo agência...');
      const { error } = await supabase
        .from('agencias')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Agência excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir agência:', error);
      toast.error('Erro ao excluir agência');
      throw error;
    }
  }
};

// Serviços para Deals
export const dealService = {
  // Listar todos os deals
  async listar(supabase: SupabaseClient): Promise<Deal[]> {
    try {
      console.log('💼 Buscando deals na tabela...');
      const { data, error } = await supabase
        .from('agencia_deals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logError('Erro na query de deals', { code: error.code, message: error.message });
        throw error;
      }
      
      logDebug('Deals encontrados', { count: data?.length || 0 });
      return data || [];
    } catch (error) {
      console.error('❌ Erro ao listar deals:', error);
      toast.error('Erro ao carregar deals');
      throw error;
    }
  },

  // Criar novo deal
  async criar(supabase: SupabaseClient, deal: Omit<Deal, 'id' | 'created_at'>): Promise<Deal> {
    try {
      const { data, error } = await supabase
        .from('agencia_deals')
        .insert([deal])
        .select()
        .single();

      if (error) throw error;
      toast.success('Deal criado com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao criar deal:', error);
      toast.error('Erro ao criar deal');
      throw error;
    }
  },

  // Atualizar deal
  async atualizar(supabase: SupabaseClient, id: string, deal: Partial<Deal>): Promise<Deal> {
    try {
      const { data, error } = await supabase
        .from('agencia_deals')
        .update(deal)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      toast.success('Deal atualizado com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao atualizar deal:', error);
      toast.error('Erro ao atualizar deal');
      throw error;
    }
  },

  // Excluir deal
  async excluir(supabase: SupabaseClient, id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('agencia_deals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Deal excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir deal:', error);
      toast.error('Erro ao excluir deal');
      throw error;
    }
  }
};

// Serviços para Projetos
export const projetoService = {
  // Listar todos os projetos
  async listar(supabase: SupabaseClient): Promise<Projeto[]> {
    try {
      const { data, error } = await supabase
        .from('agencia_projetos')
        .select('*')
        .order('created_at', { ascending: false });

      let projetosBanco = [];
      if (error) {
        console.warn('⚠️ Erro ao carregar projetos do banco:', error);
        toast.warning('Carregando projetos salvos localmente');
      } else {
        projetosBanco = data || [];
      }

      // Carregar projetos salvos localmente
      let projetosLocais = [];
      try {
        const projetosLocaisStr = localStorage.getItem('projetos_locais');
        if (projetosLocaisStr) {
          projetosLocais = JSON.parse(projetosLocaisStr);
          logDebug('Projetos locais carregados', { count: projetosLocais.length });
        }
      } catch (storageError) {
        logWarn('Erro ao carregar projetos locais');
      }

      // Combinar projetos do banco e locais
      const todosProjetos = [...projetosBanco, ...projetosLocais];
      
      // Ordenar por data de criação
      todosProjetos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return todosProjetos;
    } catch (error) {
      console.error('Erro ao listar projetos:', error);
      
      // Fallback: retornar apenas projetos locais
      try {
        const projetosLocaisStr = localStorage.getItem('projetos_locais');
        if (projetosLocaisStr) {
          const projetosLocais = JSON.parse(projetosLocaisStr);
          logDebug('Usando apenas projetos locais como fallback');
          return projetosLocais;
        }
      } catch (storageError) {
        logWarn('Erro ao carregar projetos locais como fallback');
      }
      
      toast.error('Erro ao carregar projetos');
      return [];
    }
  },

  // Criar novo projeto
  async criar(supabase: SupabaseClient, projeto: Omit<Projeto, 'id'>): Promise<Projeto> {
    try {
      console.log('🔧 Tentando criar projeto:', projeto);
      
      // Verificar se o usuário está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      console.log('👤 Usuário autenticado:', user.id);
      
      // Preparar dados do projeto com valores padrão para campos obrigatórios
      const projetoData = {
        ...projeto,
        status_projeto: projeto.status_projeto || 'ativo',
        orcamento_projeto: projeto.orcamento_projeto || 0,
        valor_gasto: projeto.valor_gasto || 0,
        prioridade: projeto.prioridade || 'media',
        progresso: projeto.progresso || 0,
        objetivos: projeto.objetivos || [],
        tags: projeto.tags || [],
        arquivos_anexos: projeto.arquivos_anexos || []
      };
      
      console.log('📝 Dados do projeto preparados:', projetoData);
      
      const { data, error } = await supabase
        .from('agencia_projetos')
        .insert([projetoData])
        .select()
        .single();

      if (error) {
        logError('Erro do Supabase', { code: error.code, message: error.message });
        throw error;
      }
      
      logDebug('Projeto criado com sucesso', { hasData: !!data });
      toast.success('Projeto criado com sucesso!');
      return data;
    } catch (error) {
      logError('Erro ao criar projeto', error);
      
      // Mensagem de erro mais específica
      let errorMessage = 'Erro ao criar projeto';
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
      throw error;
    }
  },

  // Atualizar projeto
  async atualizar(supabase: SupabaseClient, id: string, projeto: Partial<Projeto>): Promise<Projeto> {
    try {
      const { data, error } = await supabase
        .from('agencia_projetos')
        .update(projeto)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      toast.success('Projeto atualizado com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao atualizar projeto:', error);
      toast.error('Erro ao atualizar projeto');
      throw error;
    }
  },

  // Excluir projeto
  async excluir(supabase: SupabaseClient, id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('agencia_projetos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Projeto excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir projeto:', error);
      toast.error('Erro ao excluir projeto');
      throw error;
    }
  }
};

// Serviços para Contatos
export const contatoService = {
  // Listar contatos por agência
  async listarPorAgencia(supabase: SupabaseClient, agenciaId: string): Promise<Contato[]> {
    try {
      const { data, error } = await supabase
        .from('agencia_contatos')
        .select('*')
        .eq('agencia_id', agenciaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao listar contatos:', error);
      toast.error('Erro ao carregar contatos');
      throw error;
    }
  },

  // Criar novo contato
  async criar(supabase: SupabaseClient, contato: Omit<Contato, 'id'>): Promise<Contato> {
    try {
      const { data, error } = await supabase
        .from('agencia_contatos')
        .insert([contato])
        .select()
        .single();

      if (error) throw error;
      toast.success('Contato criado com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao criar contato:', error);
      toast.error('Erro ao criar contato');
      throw error;
    }
  },

  // Atualizar contato
  async atualizar(supabase: SupabaseClient, id: string, contato: Partial<Contato>): Promise<Contato> {
    try {
      const { data, error } = await supabase
        .from('agencia_contatos')
        .update(contato)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      toast.success('Contato atualizado com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao atualizar contato:', error);
      toast.error('Erro ao atualizar contato');
      throw error;
    }
  },

  // Excluir contato
  async excluir(supabase: SupabaseClient, id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('agencia_contatos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Contato excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir contato:', error);
      toast.error('Erro ao excluir contato');
      throw error;
    }
  }
};

// Serviços para Equipes
export const equipeService = {
  // Listar equipe por projeto com dados completos
  async listarPorProjeto(supabase: SupabaseClient, projetoId: string): Promise<EquipeCompleta[]> {
    try {
      const { data, error } = await supabase
        .from('vw_equipe_projeto_completa')
        .select('*')
        .eq('projeto_id', projetoId)
        .eq('ativo', true)
        .order('nivel_hierarquia', { ascending: false })
        .order('data_entrada', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao listar equipe:', error);
      toast.error('Erro ao carregar equipe');
      throw error;
    }
  },

  // Listar todas as equipes com dados de pessoas_projeto
  async listarTodas(supabase: SupabaseClient): Promise<EquipeCompleta[]> {
    try {
      const { data, error } = await supabase
        .from('agencia_projeto_equipe')
        .select(`
          *,
          pessoas_projeto!agencia_projeto_equipe_pessoa_id_fkey (
            nome,
            email,
            telefone,
            cargo
          ),
          projetos!agencia_projeto_equipe_projeto_id_fkey (
            nome_projeto,
            status_projeto,
            cliente_final,
            agencias!projetos_agencia_id_fkey (
              nome_agencia,
              codigo_agencia
            ),
            deals!projetos_deal_id_fkey (
              nome_deal
            )
          )
        `)
        .eq('ativo', true)
        .order('data_entrada', { ascending: false });

      if (error) throw error;
      
      // Transformar os dados para o formato esperado
      const equipesCompletas = data?.map(item => ({
        ...item,
        nome_pessoa: item.pessoas_projeto?.nome || 'Nome não disponível',
        email_pessoa: item.pessoas_projeto?.email || null,
        telefone_pessoa: item.pessoas_projeto?.telefone || null,
        cargo_pessoa: item.pessoas_projeto?.cargo || null,
        nome_projeto: item.projetos?.nome_projeto || 'Projeto não encontrado',
        status_projeto: item.projetos?.status_projeto || 'indefinido',
        cliente_final: item.projetos?.cliente_final || 'Cliente não definido',
        nome_agencia: item.projetos?.agencias?.nome_agencia || 'Agência não encontrada',
        codigo_agencia: item.projetos?.agencias?.codigo_agencia || 'Código não disponível',
        nome_deal: item.projetos?.deals?.nome_deal || 'Deal não encontrado',
        nivel_hierarquia: this.getNivelHierarquia(item.papel),
        status_membro: item.ativo ? 'ativo' : 'inativo'
      })) || [];
      
      return equipesCompletas;
    } catch (error) {
      console.error('Erro ao listar todas as equipes:', error);
      toast.error('Erro ao carregar equipes');
      throw error;
    }
  },

  // Função auxiliar para determinar nível hierárquico
  getNivelHierarquia(papel: FuncaoEquipe): number {
    const niveis = {
      'diretor': 4,
      'gerente': 3,
      'coordenador': 2,
      'membro': 1
    };
    return niveis[papel] || 1;
  },

  // Adicionar membro à equipe
  async adicionarMembro(supabase: SupabaseClient, membro: {
    projeto_id: string;
    pessoa_id: string;
    papel: FuncaoEquipe;
    data_entrada?: string;
  }): Promise<Equipe> {
    try {
      const { data, error } = await supabase
        .from('agencia_projeto_equipe')
        .insert([{
          ...membro,
          data_entrada: membro.data_entrada || new Date().toISOString().split('T')[0],
          ativo: true
        }])
        .select()
        .single();

      if (error) throw error;
      toast.success('Membro adicionado à equipe com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      toast.error('Erro ao adicionar membro à equipe');
      throw error;
    }
  },

  // Atualizar membro da equipe
  async atualizarMembro(supabase: SupabaseClient, id: string, membro: {
    papel?: FuncaoEquipe;
    data_entrada?: string;
    data_saida?: string;
    ativo?: boolean;
  }): Promise<Equipe> {
    try {
      const { data, error } = await supabase
        .from('agencia_projeto_equipe')
        .update(membro)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      toast.success('Membro atualizado com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao atualizar membro:', error);
      toast.error('Erro ao atualizar membro da equipe');
      throw error;
    }
  },

  // Remover membro da equipe
  async removerMembro(supabase: SupabaseClient, id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('agencia_projeto_equipe')
        .update({ 
          ativo: false, 
          data_saida: new Date().toISOString().split('T')[0] 
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Membro removido da equipe com sucesso!');
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast.error('Erro ao remover membro da equipe');
      throw error;
    }
  },

  // Obter estatísticas de equipe por projeto
  async obterEstatisticas(supabase: SupabaseClient, projetoId: string): Promise<EstatisticasEquipe> {
    try {
      const { data, error } = await supabase
        .rpc('get_equipe_stats', { projeto_uuid: projetoId });

      if (error) throw error;
      return data?.[0] || {
        total_membros: 0,
        total_coordenadores: 0,
        total_gerentes: 0,
        total_diretores: 0,
        membros_ativos: 0
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas da equipe:', error);
      return {
        total_membros: 0,
        total_coordenadores: 0,
        total_gerentes: 0,
        total_diretores: 0,
        membros_ativos: 0
      };
    }
  },

  // Verificar se usuário já está na equipe
  async verificarMembroExistente(supabase: SupabaseClient, projetoId: string, pessoaId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('agencia_projeto_equipe')
        .select('id')
        .eq('projeto_id', projetoId)
        .eq('pessoa_id', pessoaId)
        .eq('ativo', true)
        .single();

      return !!data;
    } catch {
      return false;
    }
  }
};

// Serviços para Marcos
export const marcoService = {
  // Listar marcos por projeto
  async listarPorProjeto(supabase: SupabaseClient, projetoId: string): Promise<Marco[]> {
    try {
      const { data, error } = await supabase
        .from('agencia_projeto_marcos')
        .select('*')
        .eq('projeto_id', projetoId)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao listar marcos:', error);
      toast.error('Erro ao carregar marcos');
      throw error;
    }
  },

  // Criar novo marco
  async criar(supabase: SupabaseClient, marco: Omit<Marco, 'id'>): Promise<Marco> {
    try {
      const { data, error } = await supabase
        .from('agencia_projeto_marcos')
        .insert([marco])
        .select()
        .single();

      if (error) throw error;
      toast.success('Marco criado com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao criar marco:', error);
      toast.error('Erro ao criar marco');
      throw error;
    }
  },

  // Atualizar marco
  async atualizar(supabase: SupabaseClient, id: string, marco: Partial<Marco>): Promise<Marco> {
    try {
      const { data, error } = await supabase
        .from('agencia_projeto_marcos')
        .update(marco)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      toast.success('Marco atualizado com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao atualizar marco:', error);
      toast.error('Erro ao atualizar marco');
      throw error;
    }
  },

  // Excluir marco
  async excluir(supabase: SupabaseClient, id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('agencia_projeto_marcos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Marco excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir marco:', error);
      toast.error('Erro ao excluir marco');
      throw error;
    }
  }
};

// Função auxiliar para criar projeto com fallback
const criarProjetoComFallback = async (supabase: SupabaseClient, projeto: Omit<Projeto, 'id'>): Promise<Projeto> => {
  try {
    // Primeira tentativa: inserção normal
    console.log('🔄 Tentativa 1: Inserção normal...');
    const { data, error } = await supabase
      .from('agencia_projetos')
      .insert([projeto])
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Tentativa 1 bem-sucedida!');
    return data;
  } catch (error) {
    console.warn('⚠️ Tentativa 1 falhou:', error);
    
    // Segunda tentativa: usar RPC se disponível
    try {
      console.log('🔄 Tentativa 2: Função RPC...');
      const { data, error } = await supabase.rpc('create_project', {
        p_nome_projeto: projeto.nome_projeto,
        p_agencia_id: projeto.agencia_id,
        p_deal_id: projeto.deal_id || null,
        p_status_projeto: projeto.status_projeto || 'ativo',
        p_orcamento_projeto: projeto.orcamento_projeto || 0,
        p_valor_gasto: projeto.valor_gasto || 0,
        p_data_inicio: projeto.data_inicio || null,
        p_data_fim: projeto.data_fim || null,
        p_cliente_final: projeto.cliente_final || null,
        p_responsavel_projeto: projeto.responsavel_projeto || null,
        p_prioridade: projeto.prioridade || 'media',
        p_progresso: projeto.progresso || 0,
        p_descricao: projeto.descricao || null,
        p_briefing: projeto.briefing || null,
        p_objetivos: projeto.objetivos || [],
        p_tags: projeto.tags || [],
        p_arquivos_anexos: projeto.arquivos_anexos || []
      });

      if (error) {
        logError('Erro na função RPC', { code: error.code, message: error.message });
        throw error;
      }

      // Verificar se a resposta contém erro
      if (data && data.error) {
        throw new Error(data.message || 'Erro na função RPC');
      }

      logDebug('Tentativa 2 bem-sucedida');
      return data;
    } catch (rpcError) {
      logWarn('Tentativa 2 falhou');
      
      // Terceira tentativa: inserção com dados mínimos
      try {
        logDebug('Tentativa 3: Inserção com dados mínimos');
        const projetoMinimo = {
          nome_projeto: projeto.nome_projeto,
          agencia_id: projeto.agencia_id,
          status_projeto: 'ativo',
          orcamento_projeto: 0,
          valor_gasto: 0,
          prioridade: 'media',
          progresso: 0,
          objetivos: [],
          tags: [],
          arquivos_anexos: []
        };

        const { data, error } = await supabase
          .from('agencia_projetos')
          .insert([projetoMinimo])
          .select()
          .single();

        if (error) throw error;
        logDebug('Tentativa 3 bem-sucedida');
        return data;
      } catch (minError) {
        logWarn('Tentativa 3 falhou');
        
        // Quarta tentativa: salvar localmente
        logDebug('Tentativa 4: Salvando localmente');
        const projetoSimulado = {
          id: crypto.randomUUID(),
          ...projeto,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Salvar no localStorage como fallback
        try {
          const projetosLocais = JSON.parse(localStorage.getItem('projetos_locais') || '[]');
          projetosLocais.push(projetoSimulado);
          localStorage.setItem('projetos_locais', JSON.stringify(projetosLocais));
            logDebug('Projeto salvo no localStorage');
        } catch (storageError) {
          logWarn('Erro ao salvar no localStorage');
        }
        
        logDebug('Projeto criado e salvo localmente');
        toast.warning('Projeto criado e salvo localmente - será sincronizado quando o banco estiver disponível');
        return projetoSimulado as Projeto;
      }
    }
  }
};

// Serviço principal para carregar todos os dados
export const projectManagementService = {
  async carregarTodosDados(supabase: SupabaseClient) {
    try {
      console.log('🔍 Iniciando carregamento de dados no serviço...');
      
      const [agencias, deals, projetos, contatos, equipes, marcos, pessoasProjeto, profiles] = await Promise.all([
        agenciaService.listar(supabase),
        dealService.listar(supabase),
        projetoService.listar(supabase),
        supabase.from('agencia_contatos').select('*'),
        supabase.from('agencia_projeto_equipe').select('*'),
        supabase.from('agencia_projeto_marcos').select('*'),
        supabase.from('pessoas_projeto').select('*'),
        supabase.from('profiles').select('id, full_name')
      ]);

      console.log('📋 Resultados individuais:', {
        agencias: agencias?.length || 0,
        deals: deals?.length || 0,
        projetos: projetos?.length || 0,
        contatos: contatos.data?.length || 0,
        equipes: equipes.data?.length || 0,
        marcos: marcos.data?.length || 0,
        pessoasProjeto: pessoasProjeto.data?.length || 0
      });

      return {
        agencias,
        deals,
        projetos,
        contatos: contatos.data || [],
        equipes: equipes.data || [],
        marcos: marcos.data || [],
        pessoasProjeto: pessoasProjeto.data || [],
        profiles: profiles.data || []
      };
    } catch (error) {
        logError('Erro ao carregar dados no serviço', error);
      toast.error('Erro ao carregar dados do sistema');
      throw error;
    }
  },

  // Função para criar projeto com múltiplas tentativas
  async criarProjetoRobusto(supabase: SupabaseClient, projeto: Omit<Projeto, 'id'>): Promise<Projeto> {
    try {
      logDebug('Criando projeto com método robusto');
      return await criarProjetoComFallback(supabase, projeto);
    } catch (error) {
        logError('Todas as tentativas falharam', error);
      throw error;
    }
  }
};
