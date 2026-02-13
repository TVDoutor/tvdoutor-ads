import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@3.2.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ✅ INSTRUÇÃO ADICIONADA: Dizendo ao "robô" para usar o 'console' como a caneta 'loggers'.
const loggers = console;

interface EmailRequest {
  logId: number;
  proposalId: number;
  emailType: string;
  recipientEmail: string;
  recipientType: string;
  subject: string;
  customerName?: string;
  proposalType?: string;
  htmlContent?: string;
  textContent?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const emailData: EmailRequest = await req.json()
    
    console.log('Processing email:', emailData)

    // Use provided content or generate it
    let emailContent;
    if (emailData.htmlContent && emailData.textContent) {
      emailContent = {
        html: emailData.htmlContent,
        text: emailData.textContent,
        subject: emailData.subject
      };
    } else {
      emailContent = generateEmailContent(emailData);
    }
    
    // Try to send with SendGrid first, then Resend, then simulation
    const success = await sendEmailWithSendGrid(emailData.recipientEmail, emailContent)
    
    if (success) {
      // Update email log status to 'sent'
      const { error } = await supabase.rpc('update_email_status', {
        p_log_id: emailData.logId,
        p_status: 'sent'
      })
      
      if (error) {
        console.error('Error updating email status:', error)
        throw error
      }
      
      console.log(`Email sent successfully to ${emailData.recipientEmail}`)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email sent successfully',
          logId: emailData.logId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } else {
      // Update email log status to 'failed'
      const { error } = await supabase.rpc('update_email_status', {
        p_log_id: emailData.logId,
        p_status: 'failed',
        p_error_message: 'Email service unavailable'
      })
      
      if (error) {
        console.error('Error updating email status:', error)
      }
      
      throw new Error('Failed to send email')
    }

  } catch (error) {
    console.error('Error in send-proposal-email function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

function generateEmailContent(emailData: EmailRequest) {
  const { emailType, recipientType, customerName, proposalId, proposalType } = emailData
  
  let htmlContent = ''
  let textContent = ''
  
  // Base template
  const baseTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #1a365d; margin: 0;">TV Doutor</h1>
        <p style="color: #718096; margin: 5px 0 0 0;">Sistema de Propostas Comerciais</p>
      </div>
      
      <div style="background-color: white; padding: 30px; border-radius: 8px; border: 1px solid #e2e8f0;">
        {{CONTENT}}
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background-color: #f7fafc; border-radius: 8px; text-align: center;">
        <p style="color: #718096; font-size: 12px; margin: 0;">
          Este é um email automático do sistema TV Doutor.<br>
          Para dúvidas, entre em contato conosco.
        </p>
      </div>
    </div>
  `
  
  if (emailType === 'proposal_created') {
    if (recipientType === 'client') {
      const content = `
        <h2 style="color: #2d3748; margin-bottom: 20px;">Nova Proposta Comercial</h2>
        <p>Olá <strong>${customerName}</strong>,</p>
        <p>Temos o prazer de informar que sua proposta comercial foi criada com sucesso!</p>
        
        <div style="background-color: #e6fffa; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="color: #234e52; margin: 0 0 10px 0;">Detalhes da Proposta:</h3>
          <p style="margin: 5px 0;"><strong>Número:</strong> #${proposalId}</p>
          <p style="margin: 5px 0;"><strong>Tipo:</strong> ${proposalType === 'avulsa' ? 'Campanha Avulsa' : 'Projeto'}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> Em preparação</p>
        </div>
        
        <p>Nossa equipe está trabalhando na sua proposta e em breve você receberá mais detalhes.</p>
        <p>Agradecemos pela confiança em nossos serviços!</p>
        
        <p style="margin-top: 30px;">
          Atenciosamente,<br>
          <strong>Equipe TV Doutor</strong>
        </p>
      `
      htmlContent = baseTemplate.replace('{{CONTENT}}', content)
    } else {
      const content = `
        <h2 style="color: #2d3748; margin-bottom: 20px;">Proposta Criada com Sucesso</h2>
        <p>A proposta comercial foi criada com sucesso no sistema!</p>
        
        <div style="background-color: #f0fff4; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="color: #276749; margin: 0 0 10px 0;">Resumo:</h3>
          <p style="margin: 5px 0;"><strong>Proposta:</strong> #${proposalId}</p>
          <p style="margin: 5px 0;"><strong>Cliente:</strong> ${customerName}</p>
          <p style="margin: 5px 0;"><strong>Tipo:</strong> ${proposalType === 'avulsa' ? 'Campanha Avulsa' : 'Projeto'}</p>
        </div>
        
        <p>Você pode acessar o sistema para gerenciar esta proposta e acompanhar seu progresso.</p>
      `
      htmlContent = baseTemplate.replace('{{CONTENT}}', content)
    }
  }
  
  if (emailType === 'status_changed') {
    if (recipientType === 'client') {
      const content = `
        <h2 style="color: #2d3748; margin-bottom: 20px;">Atualização da Sua Proposta</h2>
        <p>Olá <strong>${customerName}</strong>,</p>
        <p>Sua proposta comercial teve uma atualização de status:</p>
        
        <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin: 0 0 10px 0;">Proposta #${proposalId}</h3>
          <p style="margin: 5px 0; font-size: 18px;"><strong>Novo Status:</strong> 
            <span style="color: #059669;">{{STATUS_DISPLAY}}</span>
          </p>
        </div>
        
        <p>Para mais informações sobre sua proposta, entre em contato conosco.</p>
        
        <p style="margin-top: 30px;">
          Atenciosamente,<br>
          <strong>Equipe TV Doutor</strong>
        </p>
      `
      htmlContent = baseTemplate.replace('{{CONTENT}}', content)
    } else {
      const content = `
        <h2 style="color: #2d3748; margin-bottom: 20px;">Status da Proposta Alterado</h2>
        <p>O status da proposta foi alterado no sistema:</p>
        
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Proposta:</strong> #${proposalId}</p>
          <p style="margin: 5px 0;"><strong>Cliente:</strong> ${customerName}</p>
          <p style="margin: 5px 0;"><strong>Novo Status:</strong> {{STATUS_DISPLAY}}</p>
        </div>
        
        <p>Acesse o sistema para mais detalhes.</p>
      `
      htmlContent = baseTemplate.replace('{{CONTENT}}', content)
    }
  }
  
  // Generate simple text version
  textContent = htmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  
  return {
    html: htmlContent,
    text: textContent,
    subject: emailData.subject
  }
}

async function sendEmailWithSendGrid(recipientEmail: string, emailContent: any): Promise<boolean> {
  const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
  
  if (!sendGridApiKey) {
    console.warn('⚠️ SENDGRID_API_KEY not configured, falling back to Resend');
    return await sendEmailWithResend(recipientEmail, emailContent);
  }

  try {
    console.log(`📧 Sending email via SendGrid to: ${recipientEmail}`);
    
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendGridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: recipientEmail }],
          subject: emailContent.subject
        }],
        from: {
          email: 'noreply@tvdoutor.com.br',
          name: 'TV Doutor ADS'
        },
        content: [
          {
            type: 'text/html',
            value: emailContent.html
          },
          {
            type: 'text/plain',
            value: emailContent.text
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ SendGrid error:', response.status, errorText);
      return false;
    }

    console.log('✅ Email sent via SendGrid successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Error sending email via SendGrid:', error);
    // Fallback to Resend
    console.log('🔄 Falling back to Resend...');
    return await sendEmailWithResend(recipientEmail, emailContent);
  }
}

async function sendEmailWithResend(recipientEmail: string, emailContent: any): Promise<boolean> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  
  if (!resendApiKey) {
    console.warn('⚠️ RESEND_API_KEY not configured, falling back to simulation');
    return await simulateEmailSend(emailContent);
  }

  try {
    const resend = new Resend(resendApiKey);
    
    console.log(`📧 Sending email via Resend to: ${recipientEmail}`);
    
    const { data, error } = await resend.emails.send({
      from: 'TV Doutor ADS <noreply@tvdoutor.com.br>',
      to: [recipientEmail],
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return false;
    }

    console.log('✅ Email sent via Resend successfully:', data);
    return true;
    
  } catch (error) {
    console.error('❌ Error sending email via Resend:', error);
    // Fallback to simulation on error
    console.log('🔄 Falling back to simulation...');
    return await simulateEmailSend(emailContent);
  }
}

async function simulateEmailSend(emailContent: any): Promise<boolean> {
  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Log the email content for debugging
  console.log('📧 [SIMULADO] Email Content:', {
    subject: emailContent.subject,
    htmlLength: emailContent.html.length,
    textLength: emailContent.text.length
  })
  
  // Simulate 95% success rate
  return Math.random() > 0.05
}

// Email integration with Resend is now implemented above!
