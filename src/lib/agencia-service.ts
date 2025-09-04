import { supabase } from '../integrations/supabase/client'
import type { Agencia, Deal, Projeto } from '../types/agencia'
import { validateProjeto, sanitizeProjeto } from '../utils/validations/projeto-validations'

// Remover completamente a função checkAgenciasTable (linhas 5-18)
export async function listarAgencias(): Promise<Agencia[]> {
  // Sempre usar a tabela 'agencias' para listar agências
  const { data, error } = await supabase
    .from('agencias')
    .select('id, codigo_agencia, nome_agencia, cnpj, site, cidade, estado, email_empresa, telefone_empresa, taxa_porcentagem')
    .order('nome_agencia', { ascending: true })

  if (error) throw error
  return data as Agencia[]
}

export async function criarAgencia(payload: Partial<Agencia>, criarDealPadrao = true) {
  // Primeiro, criar a agência na tabela 'agencias'
  const { data: agencia, error } = await supabase
    .from('agencias')
    .insert({
      codigo_agencia: payload.codigo_agencia ?? null, // trigger gera se nulo
      nome_agencia: payload.nome_agencia,
      cnpj: payload.cnpj,
      site: payload.site ?? null,
      cidade: payload.cidade ?? null,
      estado: payload.estado ?? null,
      email_empresa: payload.email_empresa ?? null,
      telefone_empresa: payload.telefone_empresa ?? null,
      taxa_porcentagem: payload.taxa_porcentagem ?? 0,
    })
    .select()
    .single()

  if (error) throw error

  // Se solicitado, criar um deal padrão para a agência
  if (criarDealPadrao) {
    try {
      const { data: deal, error: dealError } = await supabase
        .from('agencia_deals')
        .insert({
          agencia_id: agencia.id,
          nome_deal: `Deal Principal - ${agencia.nome_agencia}`,
          status: 'ativo',
        })
        .select()
        .single()

      if (dealError) {
        console.warn('⚠️ Erro ao criar deal padrão:', dealError)
      } else {
        console.log('✅ Deal padrão criado:', deal)
      }
    } catch (dealError) {
      console.warn('⚠️ Erro ao criar deal padrão:', dealError)
    }
  }

  return { agencia }
}

export async function atualizarAgencia(id: string, payload: Partial<Agencia>) {
  if (payload.codigo_agencia && !/^A\d{3}$/.test(payload.codigo_agencia)) {
    throw new Error('codigo_agencia deve seguir o padrão A000 (ex.: A200)')
  }
  
  // Sempre atualizar na tabela 'agencias'
  const { data, error } = await supabase
    .from('agencias')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Agencia
}

export async function excluirAgencia(id: string) {
  // Verifica propostas vinculadas à agência
  const { data: props, error: e1 } = await supabase
    .from('proposals')
    .select('id')
    .eq('agencia_id', id)
    .limit(1)
  if (e1) throw e1
  if (props && props.length > 0) {
    throw new Error('Existem propostas vinculadas a esta agência. Trate-as antes de excluir.')
  }

  // Limpar relacionamentos: Projetos → Deals → Agência
  
  // 1. Buscar todos os deals desta agência
  const { data: deals, error: dealsError } = await supabase
    .from('agencia_deals')
    .select('id')
    .eq('agencia_id', id)

  if (dealsError) throw dealsError

  if (deals && deals.length > 0) {
    const dealIds = deals.map((d) => d.id)

    // 2. Excluir todos os projetos dos deals
    const { error: eProj } = await supabase
      .from('agencia_projetos')
      .delete()
      .in('deal_id', dealIds)
    
    if (eProj) throw eProj

    // 3. Excluir todos os deals da agência
    const { error: eDeal } = await supabase
      .from('agencia_deals')
      .delete()
      .eq('agencia_id', id)
    
    if (eDeal) throw eDeal
  }

  // 4. Finalmente, excluir a agência
  const { error: eAg } = await supabase
    .from('agencias')
    .delete()
    .eq('id', id)
  
  if (eAg) throw eAg
  return true
}

export async function listarDealsDaAgencia(agenciaId: string): Promise<Deal[]> {
  const { data, error } = await supabase
    .from('agencia_deals')
    .select('id, agencia_id, nome_deal, status, created_at')
    .eq('agencia_id', agenciaId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Deal[]
}

export async function listarProjetosPorAgencia(agenciaId: string): Promise<(Projeto & { deal_id: string; nome_deal: string })[]> {
  // Buscar projetos que estão vinculados a deals da agência
  // Usar JOIN para pegar o nome do deal
  const { data, error } = await supabase
    .from('agencia_projetos')
    .select(`
      id, 
      deal_id, 
      nome_projeto, 
      descricao, 
      data_inicio, 
      data_fim, 
      created_at,
      agencia_deals!inner(nome_deal, agencia_id)
    `)
    .eq('agencia_deals.agencia_id', agenciaId)
    .order('nome_projeto', { ascending: true })

  if (error) throw error

  // Normalizar saída
  return (data as any[]).map((row) => ({
    id: row.id,
    deal_id: row.deal_id,
    nome_projeto: row.nome_projeto,
    descricao: row.descricao,
    data_inicio: row.data_inicio,
    data_fim: row.data_fim,
    created_at: row.created_at,
    nome_deal: row.agencia_deals?.nome_deal || 'Deal',
  }))
}

export async function criarProjeto(payload: { deal_id: string; nome_projeto: string; descricao?: string; data_inicio?: string; data_fim?: string }) {
  // Validação básica
  if (!payload.deal_id || !payload.nome_projeto) {
    throw new Error('deal_id e nome_projeto são obrigatórios');
  }
  
  // Preparar dados apenas com campos que existem na tabela
  const dbData = {
    deal_id: payload.deal_id,
    nome_projeto: payload.nome_projeto,
    descricao: payload.descricao || null,
    data_inicio: payload.data_inicio || null,
    data_fim: payload.data_fim || null
  };
  
  const { data, error } = await supabase
    .from('agencia_projetos')
    .insert(dbData)
    .select()
    .single()

  if (error) {
    console.error('Erro do Supabase ao criar projeto:', error);
    throw new Error(`Erro ao criar projeto: ${error.message}`);
  }
  
  return data;
}

// Função atualizarProjeto já implementada corretamente (linha 206)
export async function atualizarProjeto(id: string, payload: Partial<Projeto>): Promise<{ success: boolean; error?: string }> {
  try {
    // Sanitização e validação já implementadas
    const sanitizedData = sanitizeProjeto(payload);
    const validation = validateProjeto(sanitizedData);
    
    if (!validation.success) {
      const errorMessages = Object.values(validation.errors || {}).join(', ');
      return { success: false, error: `Dados inválidos: ${errorMessages}` };
    }

    const validatedData = validation.data;
    
    if (!validatedData) {
      return { success: false, error: 'Dados de validação não disponíveis' };
    }
    
    // Preparação correta dos dados para o banco
    const dbData: Record<string, any> = {
      nome_projeto: validatedData.nome_projeto,
      descricao: validatedData.descricao || null,
      data_inicio: validatedData.data_inicio || null,
      data_fim: validatedData.data_fim || null,
      deal_id: validatedData.deal_id,
      status_projeto: validatedData.status_projeto,
      orcamento_projeto: validatedData.orcamento_projeto || null,
      responsavel_projeto: validatedData.responsavel_projeto || null,
      observacoes: validatedData.observacoes || null,
      prioridade: validatedData.prioridade,
      tipo_projeto: validatedData.tipo_projeto
    };

    // Atualização no banco com tratamento de erro
    const { error } = await supabase
      .from('agencia_projetos')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar projeto:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro inesperado ao atualizar projeto:', error);
    return { success: false, error: 'Erro interno do servidor' };
  }
}

export async function excluirProjeto(id: string) {
  const { error } = await supabase
    .from('agencia_projetos')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro do Supabase ao excluir projeto:', error);
    throw new Error(`Erro ao excluir projeto: ${error.message}`);
  }
  
  return { success: true }
}
