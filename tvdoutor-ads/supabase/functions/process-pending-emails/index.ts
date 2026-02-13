import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// ✅ INSTRUÇÃO ADICIONADA: Dizendo ao "robô" para usar o 'console' como a caneta 'loggers'.
const loggers = console;

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
  console.log('📧 Process Pending Emails Function called:', req.method, req.url)
  
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    console.log('🔧 Environment check:', { 
      hasUrl: !!supabaseUrl, 
      hasServiceKey: !!supabaseServiceKey,
      hasAnonKey: !!supabaseAnonKey
    })
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Variáveis de ambiente faltando:', {
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

    // Criar cliente Supabase com base na presença de token JWT
    let supabaseClient
    const authHeader = req.headers.get('Authorization')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Usar token do usuário se fornecido
      const token = authHeader.replace('Bearer ', '')
      console.log('🔑 Usando token JWT do usuário')
      
      try {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey!, {
          global: {
            headers: { Authorization: authHeader }
          }
        })
        
        // Validar o token
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
        
        if (authError || !user) {
          console.warn('⚠️ Token JWT inválido ou expirado, usando Service Role', authError?.message)
          // Fallback para Service Role se o token for inválido
          supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
        } else {
          console.log('✅ Token JWT válido para usuário:', user.email)
        }
      } catch (error) {
        console.warn('⚠️ Erro ao validar token JWT, usando Service Role:', error)
        // Fallback para Service Role em caso de erro
        supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
      }
    } else {
      // Usar Service Role quando não houver token (ex: durante signup)
      console.log('🔑 Nenhum token JWT fornecido, usando Service Role para operações admin')
      supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
    }

    const method = req.method

    if (method === 'GET') {
      // Buscar emails pendentes
      console.log('📧 Buscando emails pendentes...')
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

      if (fetchError) {
        console.error('❌ Erro ao buscar emails pendentes:', {
          message: fetchError.message,
          code: fetchError.code,
          details: fetchError.details,
          hint: fetchError.hint
        })
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Erro ao buscar emails pendentes',
            details: fetchError.message,
            code: fetchError.code
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('✅ Emails pendentes encontrados:', pendingEmails?.length || 0)
      
      // Retornar dados com informações adicionais
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: pendingEmails || [],
          count: pendingEmails?.length || 0,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (method === 'POST') {
      // Processar emails pendentes
      const contentType = req.headers.get('Content-Type') || req.headers.get('content-type') || ''
      const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || ''
      console.log('📥 POST recebido na função', { contentType, hasAuth: !!authHeader })

      // Ler corpo cru para diagnosticar eventuais 400 ao parsear JSON
      let rawBody = ''
      try {
        rawBody = await req.text()
      } catch (e) {
        console.warn('⚠️ Falha ao ler corpo como texto:', e)
      }

      let requestBody: any = {}
      try {
        requestBody = rawBody ? JSON.parse(rawBody) : {}
      } catch (e) {
        console.error('❌ JSON inválido no corpo da requisição', { rawSnippet: rawBody?.slice(0, 200) })
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'JSON inválido no corpo da requisição',
            details: e instanceof Error ? e.message : 'Erro desconhecido ao parsear JSON',
            snippet: rawBody?.slice(0, 200) || ''
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { action } = requestBody

      if (!action) {
        console.error('❌ Ação não especificada no corpo da requisição')
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Parâmetro "action" é obrigatório',
            details: 'Use "action": "process" para processar emails pendentes'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      if (action === 'process') {
        console.log('🔄 Iniciando processamento de emails pendentes...')
        
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

        if (fetchError) {
          console.error('❌ Erro ao buscar emails pendentes:', {
            message: fetchError.message,
            code: fetchError.code,
            details: fetchError.details,
            hint: fetchError.hint
          })
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Erro ao buscar emails pendentes',
              details: fetchError.message,
              code: fetchError.code
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        console.log('📧 Processando emails pendentes:', pendingEmails?.length || 0)

        let processed = 0
        let successful = 0
        let failed = 0
        const errors: Array<{ emailId: number, error: string }> = []

        if (pendingEmails && pendingEmails.length > 0) {
          for (const emailLog of pendingEmails) {
            try {
              processed++
              console.log(`📤 [${processed}/${pendingEmails.length}] Processando email ID ${emailLog.id} para: ${emailLog.recipient_email}`)
              
              // Simular envio de email (por enquanto)
              // TODO: Integrar com serviço de email real (SendGrid, Resend, etc)
              console.log(`   Tipo: ${emailLog.email_type}, Assunto: ${emailLog.subject}`)
              
              // Atualizar status para 'sent'
              const { error: updateError } = await supabaseClient
                .from('email_logs')
                .update({ 
                  status: 'sent',
                  sent_at: new Date().toISOString(),
                  error_message: null
                })
                .eq('id', emailLog.id)

              if (updateError) {
                console.error(`❌ Erro ao atualizar status do email ID ${emailLog.id}:`, {
                  message: updateError.message,
                  code: updateError.code,
                  details: updateError.details
                })
                failed++
                errors.push({ 
                  emailId: emailLog.id, 
                  error: updateError.message 
                })
                
                // Tentar atualizar com status de falha
                try {
                  await supabaseClient
                    .from('email_logs')
                    .update({ 
                      status: 'failed',
                      error_message: updateError.message,
                      sent_at: new Date().toISOString()
                    })
                    .eq('id', emailLog.id)
                } catch (fallbackError) {
                  console.error(`❌ Erro ao atualizar status de falha para email ID ${emailLog.id}:`, fallbackError)
                }
              } else {
                console.log(`✅ Email ID ${emailLog.id} processado com sucesso`)
                successful++
              }
              
            } catch (error) {
              console.error(`❌ Erro inesperado ao processar email ID ${emailLog.id}:`, error)
              failed++
              errors.push({ 
                emailId: emailLog.id, 
                error: error instanceof Error ? error.message : 'Erro desconhecido'
              })
              
              // Tentar marcar como falho no banco
              try {
                await supabaseClient
                  .from('email_logs')
                  .update({ 
                    status: 'failed',
                    error_message: error instanceof Error ? error.message : 'Erro desconhecido',
                    sent_at: new Date().toISOString()
                  })
                  .eq('id', emailLog.id)
              } catch (fallbackError) {
                console.error(`❌ Erro ao atualizar status de falha para email ID ${emailLog.id}:`, fallbackError)
              }
            }
          }
        } else {
          console.log('ℹ️ Nenhum email pendente para processar')
        }

        console.log('✅ Processamento concluído:', { 
          processed, 
          successful, 
          failed,
          timestamp: new Date().toISOString()
        })

        return new Response(
          JSON.stringify({ 
            success: true, 
            processed,
            successful,
            failed,
            errors: errors.length > 0 ? errors : undefined,
            message: `Processados ${processed} emails: ${successful} sucessos, ${failed} falhas`,
            timestamp: new Date().toISOString()
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else {
        console.error(`❌ Ação não reconhecida: "${action}"`)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Ação "${action}" não reconhecida`,
            details: 'Use "action": "process" para processar emails pendentes',
            validActions: ['process']
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    console.error(`❌ Método HTTP não permitido: ${method}`)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Método HTTP "${method}" não permitido`,
        details: 'Use GET para listar emails pendentes ou POST para processar emails',
        validMethods: ['GET', 'POST', 'OPTIONS']
      }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Erro crítico na Edge Function de processamento de emails:', {
      error,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
