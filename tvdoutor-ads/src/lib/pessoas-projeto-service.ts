import { supabase } from '@/integrations/supabase/client';
import type { PessoaProjeto, PessoaProjetoInsert, PessoaProjetoUpdate } from '@/types/agencia';

export class PessoasProjetoService {
  /**
   * Lista todas as pessoas do projeto
   */
  static async listar(): Promise<PessoaProjeto[]> {
    const { data, error } = await supabase
      .from('pessoas_projeto')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao listar pessoas do projeto:', error);
      throw new Error(`Erro ao listar pessoas: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Busca uma pessoa específica por ID
   */
  static async buscarPorId(id: string): Promise<PessoaProjeto | null> {
    const { data, error } = await supabase
      .from('pessoas_projeto')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Pessoa não encontrada
      }
      console.error('Erro ao buscar pessoa por ID:', error);
      throw new Error(`Erro ao buscar pessoa: ${error.message}`);
    }

    return data;
  }

  /**
   * Cria uma nova pessoa do projeto
   */
  static async criar(pessoa: PessoaProjetoInsert): Promise<PessoaProjeto> {
    const { data, error } = await supabase
      .from('pessoas_projeto')
      .insert(pessoa)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar pessoa do projeto:', error);
      throw new Error(`Erro ao criar pessoa: ${error.message}`);
    }

    return data;
  }

  /**
   * Atualiza uma pessoa existente
   */
  static async atualizar(id: string, pessoa: PessoaProjetoUpdate): Promise<PessoaProjeto> {
    const { data, error } = await supabase
      .from('pessoas_projeto')
      .update(pessoa)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar pessoa do projeto:', error);
      throw new Error(`Erro ao atualizar pessoa: ${error.message}`);
    }

    return data;
  }

  /**
   * Remove uma pessoa do projeto
   */
  static async remover(id: string): Promise<void> {
    const { error } = await supabase
      .from('pessoas_projeto')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao remover pessoa do projeto:', error);
      throw new Error(`Erro ao remover pessoa: ${error.message}`);
    }
  }

  /**
   * Lista pessoas de uma agência específica
   */
  static async listarPorAgencia(agenciaId: string): Promise<PessoaProjeto[]> {
    const { data, error } = await supabase
      .from('pessoas_projeto')
      .select('*')
      .eq('agencia_id', agenciaId)
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao listar pessoas por agência:', error);
      throw new Error(`Erro ao listar pessoas da agência: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Busca pessoas por nome (para autocomplete)
   */
  static async buscarPorNome(nome: string): Promise<PessoaProjeto[]> {
    const { data, error } = await supabase
      .from('pessoas_projeto')
      .select('*')
      .ilike('nome', `%${nome}%`)
      .order('nome', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Erro ao buscar pessoas por nome:', error);
      throw new Error(`Erro ao buscar pessoas: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Verifica se um email já existe
   */
  static async verificarEmailExistente(email: string, excludeId?: string): Promise<boolean> {
    let query = supabase
      .from('pessoas_projeto')
      .select('id')
      .eq('email', email);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao verificar email existente:', error);
      throw new Error(`Erro ao verificar email: ${error.message}`);
    }

    return (data?.length || 0) > 0;
  }
}
