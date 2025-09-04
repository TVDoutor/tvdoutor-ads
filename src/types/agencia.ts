export type Agencia = {
  id: string
  codigo_agencia: string
  nome_agencia: string
  cnpj: string
  site: string | null
  cidade: string | null
  estado: string | null
  email_empresa: string | null
  telefone_empresa: string | null
  taxa_porcentagem: number | null
}

export type Deal = {
  id: string
  agencia_id: string
  nome_deal: string
  status: string
  created_at: string
}

export type Projeto = {
  id: string
  deal_id: string
  nome_projeto: string
  descricao: string | null
  data_inicio: string | null
  data_fim: string | null
  created_at: string
}

export type ProjetoWithDetails = Projeto & {
  status_projeto?: string
  orcamento_projeto?: number | null
  responsavel_projeto?: string | null
  observacoes?: string | null
  prioridade?: string
  tipo_projeto?: string
  cliente_final?: string | null
  briefing?: string | null
  objetivos?: string[] | null
  publico_alvo?: string | null
  prazo_estimado_dias?: number | null
  tags?: string[] | null
  arquivos_anexos?: any
  orcamento_aprovado?: number | null
  valor_gasto?: number | null
  valor_disponivel?: number | null
}

export type Proposta = {
  id: number
  customer_name: string
  agencia_id: string | null
  projeto_id: string | null
}
