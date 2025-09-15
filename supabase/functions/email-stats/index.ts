import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
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

    // Buscar estatísticas de emails
    const { data: stats, error } = await supabaseClient
      .from('email_logs')
      .select('email_type, status, created_at')

    if (error) {
      console.error('Erro ao buscar estatísticas:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao buscar estatísticas',
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Processar estatísticas
    const statsMap = new Map()
    
    stats?.forEach(log => {
      const key = `${log.email_type}_${log.status}`
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          email_type: log.email_type,
          status: log.status,
          total: 0,
          today: 0,
          last_7_days: 0
        })
      }
      
      const stat = statsMap.get(key)
      stat.total++
      
      const logDate = new Date(log.created_at)
      const today = new Date()
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      if (logDate.toDateString() === today.toDateString()) {
        stat.today++
      }
      
      if (logDate >= sevenDaysAgo) {
        stat.last_7_days++
      }
    })

    const statsArray = Array.from(statsMap.values())

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: statsArray
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na Edge Function de estatísticas:', error)
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