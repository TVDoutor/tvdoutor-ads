import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface EmailLog {
  id: number;
  proposal_id: number;
  email_type: string;
  recipient_email: string;
  recipient_type: string;
  subject: string;
  customer_name: string;
  proposal_type: string;
  created_at: string;
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
    // Verificar variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Variáveis de ambiente faltando:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configuração do servidor incompleta',
          details: 'Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client with service role key
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    console.log('Edge Function iniciada:', {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    })

    const { method } = req

    if (method === 'GET') {
      // Buscar emails pendentes
      const { data: pendingEmails, error } = await supabaseClient
        .from('email_logs')
        .select(`
          id,
          proposal_id,
          email_type,
          recipient_email,
          recipient_type,
          subject,
          customer_name,
          proposal_type,
          created_at
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) {
        console.error('Erro ao buscar emails pendentes:', error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Erro ao buscar emails pendentes',
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
          data: pendingEmails || [],
          count: pendingEmails?.length || 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (method === 'POST') {
      // Processar emails pendentes
      let requestBody = {}
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

      const { action } = requestBody

      if (action === 'process') {
        // Buscar emails pendentes
        const { data: pendingEmails, error: fetchError } = await supabaseClient
          .from('email_logs')
          .select(`
            id,
            proposal_id,
            email_type,
            recipient_email,
            recipient_type,
            subject,
            customer_name,
            proposal_type,
            created_at
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(50)

        if (fetchError) {
          console.error('Erro ao buscar emails pendentes:', fetchError)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Erro ao buscar emails pendentes',
              details: fetchError.message 
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        if (!pendingEmails || pendingEmails.length === 0) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Nenhum email pendente para processar',
              processed: 0,
              successful: 0,
              failed: 0
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Processar cada email
        let successful = 0
        let failed = 0

        for (const emailLog of pendingEmails) {
          try {
            // Simular processamento de email (você pode integrar com Resend aqui)
            console.log(`Processando email ${emailLog.id} para ${emailLog.recipient_email}`)
            
            // Simular delay de processamento
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
            
            // 95% de taxa de sucesso na simulação
            const success = Math.random() > 0.05

            if (success) {
              // Atualizar status para 'sent'
              const { error: updateError } = await supabaseClient
                .from('email_logs')
                .update({ 
                  status: 'sent',
                  sent_at: new Date().toISOString()
                })
                .eq('id', emailLog.id)

              if (updateError) {
                console.error(`Erro ao atualizar email ${emailLog.id}:`, updateError)
                failed++
              } else {
                successful++
                console.log(`Email ${emailLog.id} processado com sucesso`)
              }
            } else {
              // Atualizar status para 'failed'
              const { error: updateError } = await supabaseClient
                .from('email_logs')
                .update({ 
                  status: 'failed',
                  error_message: 'Falha na simulação de envio'
                })
                .eq('id', emailLog.id)

              if (updateError) {
                console.error(`Erro ao atualizar email ${emailLog.id}:`, updateError)
              }
              failed++
            }
          } catch (error) {
            console.error(`Erro ao processar email ${emailLog.id}:`, error)
            
            // Atualizar status para 'failed'
            try {
              await supabaseClient
                .from('email_logs')
                .update({ 
                  status: 'failed',
                  error_message: error instanceof Error ? error.message : 'Erro desconhecido'
                })
                .eq('id', emailLog.id)
            } catch (updateError) {
              console.error(`Erro ao atualizar status do email ${emailLog.id}:`, updateError)
            }
            
            failed++
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Processamento concluído',
            processed: pendingEmails.length,
            successful,
            failed
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
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
    console.error('Erro na Edge Function:', error)
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