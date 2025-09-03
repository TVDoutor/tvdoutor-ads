import { supabase } from '../integrations/supabase/client'
import type { Agencia, Deal, Projeto } from '../types'

// Função para verificar se a tabela 'agencias' existe
async function checkAgenciasTable() {
  try {
    const { data, error } = await supabase
      .from('agencias')
      .select('id')
      .limit(1)
    
    if (!error && data !== null) {
      console.log('✅ Tabela "agencias" encontrada')
      return true
    }
  } catch (error) {
    console.log('❌ Tabela "agencias" não encontrada')
  }
  return false
}

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

export async function criarProjeto(payload: Partial<Projeto> & { deal_id: string }) {
  const { data, error } = await supabase
    .from('agencia_projetos')
    .insert({
      deal_id: payload.deal_id,
      nome_projeto: payload.nome_projeto,
      descricao: payload.descricao ?? null,
      data_inicio: payload.data_inicio ?? null,
      data_fim: payload.data_fim ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as Projeto
}
