import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  responsavel_projeto: string;
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

export interface Equipe {
  id: string;
  projeto_id: string;
  usuario_id: string;
  nome_usuario: string;
  email: string;
  papel: string;
  data_entrada: string;
  ativo: boolean;
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
  async listar(): Promise<Agencia[]> {
    try {
      const { data, error } = await supabase
        .from('agencias')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao listar agências:', error);
      toast.error('Erro ao carregar agências');
      throw error;
    }
  },

  // Criar nova agência
  async criar(agencia: Omit<Agencia, 'id' | 'created_at'>): Promise<Agencia> {
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
  async atualizar(id: string, agencia: Partial<Agencia>): Promise<Agencia> {
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
  async excluir(id: string): Promise<void> {
    try {
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
  async listar(): Promise<Deal[]> {
    try {
      const { data, error } = await supabase
        .from('agencia_deals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao listar deals:', error);
      toast.error('Erro ao carregar deals');
      throw error;
    }
  },

  // Criar novo deal
  async criar(deal: Omit<Deal, 'id' | 'created_at'>): Promise<Deal> {
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
  async atualizar(id: string, deal: Partial<Deal>): Promise<Deal> {
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
  async excluir(id: string): Promise<void> {
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
  async listar(): Promise<Projeto[]> {
    try {
      const { data, error } = await supabase
        .from('agencia_projetos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao listar projetos:', error);
      toast.error('Erro ao carregar projetos');
      throw error;
    }
  },

  // Criar novo projeto
  async criar(projeto: Omit<Projeto, 'id'>): Promise<Projeto> {
    try {
      const { data, error } = await supabase
        .from('agencia_projetos')
        .insert([projeto])
        .select()
        .single();

      if (error) throw error;
      toast.success('Projeto criado com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
      toast.error('Erro ao criar projeto');
      throw error;
    }
  },

  // Atualizar projeto
  async atualizar(id: string, projeto: Partial<Projeto>): Promise<Projeto> {
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
  async excluir(id: string): Promise<void> {
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
  async listarPorAgencia(agenciaId: string): Promise<Contato[]> {
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
  async criar(contato: Omit<Contato, 'id'>): Promise<Contato> {
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
  async atualizar(id: string, contato: Partial<Contato>): Promise<Contato> {
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
  async excluir(id: string): Promise<void> {
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
  // Listar equipe por projeto
  async listarPorProjeto(projetoId: string): Promise<Equipe[]> {
    try {
      const { data, error } = await supabase
        .from('agencia_projeto_equipe')
        .select('*')
        .eq('projeto_id', projetoId)
        .eq('ativo', true)
        .order('data_entrada', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao listar equipe:', error);
      toast.error('Erro ao carregar equipe');
      throw error;
    }
  },

  // Adicionar membro à equipe
  async adicionarMembro(membro: Omit<Equipe, 'id'>): Promise<Equipe> {
    try {
      const { data, error } = await supabase
        .from('agencia_projeto_equipe')
        .insert([membro])
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

  // Remover membro da equipe
  async removerMembro(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('agencia_projeto_equipe')
        .update({ ativo: false, data_saida: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Membro removido da equipe com sucesso!');
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast.error('Erro ao remover membro da equipe');
      throw error;
    }
  }
};

// Serviços para Marcos
export const marcoService = {
  // Listar marcos por projeto
  async listarPorProjeto(projetoId: string): Promise<Marco[]> {
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
  async criar(marco: Omit<Marco, 'id'>): Promise<Marco> {
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
  async atualizar(id: string, marco: Partial<Marco>): Promise<Marco> {
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
  async excluir(id: string): Promise<void> {
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

// Serviço principal para carregar todos os dados
export const projectManagementService = {
  async carregarTodosDados() {
    try {
      const [agencias, deals, projetos, contatos, equipes, marcos] = await Promise.all([
        agenciaService.listar(),
        dealService.listar(),
        projetoService.listar(),
        supabase.from('agencia_contatos').select('*'),
        supabase.from('agencia_projeto_equipe').select('*'),
        supabase.from('agencia_projeto_marcos').select('*')
      ]);

      return {
        agencias,
        deals,
        projetos,
        contatos: contatos.data || [],
        equipes: equipes.data || [],
        marcos: marcos.data || []
      };
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do sistema');
      throw error;
    }
  }
};
