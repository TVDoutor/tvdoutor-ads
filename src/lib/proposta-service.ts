import { supabase } from '../integrations/supabase/client'

export async function criarProposta(payload: {
  customer_name: string
  agencia_id: string
  projeto_id?: string | null
}) {
  const { data, error } = await supabase
    .from('proposals')
    .insert({
      customer_name: payload.customer_name,
      agencia_id: payload.agencia_id,
      projeto_id: payload.projeto_id ?? null,
      // Campos obrigatórios do schema (jsonb not null)
      filters: {},
      quote: {},
      screens: {},
      status: 'draft',
    })
    .select()
    .single()

  if (error) throw error
  return data
}
