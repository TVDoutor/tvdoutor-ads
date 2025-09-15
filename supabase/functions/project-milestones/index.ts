import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface ProjectMilestone {
  id?: string;
  projeto_id: string;
  nome_marco: string;
  descricao?: string;
  data_prevista?: string;
  data_conclusao?: string;
  status: string;
  responsavel_id?: string;
  ordem?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { method } = req

    if (method === 'GET') {
      // Buscar marcos de projeto
      const url = new URL(req.url)
      const projetoId = url.searchParams.get('projeto_id')

      let query = supabaseClient
        .from('agencia_projeto_marcos')
        .select(`
          id,
          projeto_id,
          nome_marco,
          descricao,
          data_prevista,
          data_conclusao,
          status,
          responsavel_id,
          ordem,
          created_at,
          created_by
        `)
        .order('ordem', { ascending: true })

      if (projetoId) {
        query = query.eq('projeto_id', projetoId)
      }

      const { data: milestones, error } = await query

      if (error) {
        console.error('Erro ao buscar marcos:', error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Erro ao buscar marcos',
            details: error.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: milestones || []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (method === 'POST') {
      // Criar novo marco
      let requestBody: ProjectMilestone
      try {
        requestBody = await req.json()
      } catch (e) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid JSON in request body' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { data: newMilestone, error } = await supabaseClient
        .from('agencia_projeto_marcos')
        .insert({
          projeto_id: requestBody.projeto_id,
          nome_marco: requestBody.nome_marco,
          descricao: requestBody.descricao,
          data_prevista: requestBody.data_prevista,
          status: requestBody.status || 'pendente',
          responsavel_id: requestBody.responsavel_id,
          ordem: requestBody.ordem || 1
        })
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar marco:', error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Erro ao criar marco',
            details: error.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: newMilestone
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (method === 'PUT') {
      // Atualizar marco
      let requestBody: ProjectMilestone
      try {
        requestBody = await req.json()
      } catch (e) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid JSON in request body' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (!requestBody.id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'ID do marco é obrigatório para atualização' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { data: updatedMilestone, error } = await supabaseClient
        .from('agencia_projeto_marcos')
        .update({
          nome_marco: requestBody.nome_marco,
          descricao: requestBody.descricao,
          data_prevista: requestBody.data_prevista,
          data_conclusao: requestBody.data_conclusao,
          status: requestBody.status,
          responsavel_id: requestBody.responsavel_id,
          ordem: requestBody.ordem,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestBody.id)
        .select()
        .single()

      if (error) {
        console.error('Erro ao atualizar marco:', error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Erro ao atualizar marco',
            details: error.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: updatedMilestone
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (method === 'DELETE') {
      // Deletar marco
      const url = new URL(req.url)
      const id = url.searchParams.get('id')

      if (!id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'ID do marco é obrigatório para exclusão' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { error } = await supabaseClient
        .from('agencia_projeto_marcos')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Erro ao deletar marco:', error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Erro ao deletar marco',
            details: error.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Marco deletado com sucesso'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Método não permitido' 
      }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na Edge Function de marcos:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})


