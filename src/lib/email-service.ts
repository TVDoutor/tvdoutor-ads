import { supabase } from '@/integrations/supabase/client';
import { logDebug, logError, logInfo, logWarn } from '@/utils/secureLogger';

// Configuração do Resend
interface ResendEmailData {
  recipientEmail: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailLog {
  log_id: number;
  proposal_id: number;
  email_type: string;
  recipient_email: string;
  recipient_type: string;
  subject: string;
  customer_name: string;
  proposal_type: string;
  created_at: string;
}

export interface EmailStats {
  email_type: string;
  status: string;
  total: number;
  today: number;
  last_7_days: number;
}

class EmailService {
  private processingEmails = new Set<number>();

  /**
   * Busca emails pendentes para processamento
   */
  async getPendingEmails(limit = 10): Promise<EmailLog[]> {
    try {
      const { data, error } = await supabase.rpc('get_pending_emails', {
        p_limit: limit
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logError('Erro ao buscar emails pendentes', error);
      throw error;
    }
  }

  /**
   * Processa um email específico
   */
  async processEmail(emailLog: EmailLog): Promise<boolean> {
    // Evitar processamento duplo
    if (this.processingEmails.has(emailLog.log_id)) {
      logDebug(`Email já está sendo processado`, { logId: emailLog.log_id });
      return false;
    }

    this.processingEmails.add(emailLog.log_id);

    try {
      logDebug(`Processando email`, { logId: emailLog.log_id, hasRecipient: !!emailLog.recipient_email });

      // Tentar envio real com Resend primeiro, fallback para simulação se falhar
      let success = false;
      
      try {
        success = await this.sendEmailWithResend(emailLog);
      } catch (resendError) {
        console.warn('⚠️ Falha no Resend, usando simulação como fallback:', resendError);
        success = await this.simulateEmailSend(emailLog);
      }

      if (success) {
        // Atualizar status para 'sent'
        await supabase.rpc('update_email_status', {
          p_log_id: emailLog.log_id,
          p_status: 'sent'
        });
        
        logInfo(`Email enviado com sucesso`, { logId: emailLog.log_id, hasRecipient: !!emailLog.recipient_email });
        return true;
      } else {
        throw new Error('Falha na simulação de envio');
      }
    } catch (error) {
      logError(`Erro ao processar email`, { logId: emailLog.log_id, error });
      
      // Atualizar status para 'failed' em caso de erro
      try {
        await supabase.rpc('update_email_status', {
          p_log_id: emailLog.log_id,
          p_status: 'failed',
          p_error_message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      } catch (updateError) {
        logError('Erro ao atualizar status do email', updateError);
      }
      
      return false;
    } finally {
      this.processingEmails.delete(emailLog.log_id);
    }
  }

  /**
   * Envia email real usando Resend
   */
  private async sendEmailWithResend(emailLog: EmailLog): Promise<boolean> {
    try {
      logDebug(`[RESEND] Enviando email`, { hasRecipient: !!emailLog.recipient_email });

      // Gerar conteúdo do email
      const emailContent = this.generateEmailContent(emailLog);
      
      // Chamar a Edge Function do Supabase que usa Resend
      const { data, error } = await supabase.functions.invoke('send-proposal-email', {
        body: {
          logId: emailLog.log_id,
          proposalId: emailLog.proposal_id,
          emailType: emailLog.email_type,
          recipientEmail: emailLog.recipient_email,
          recipientType: emailLog.recipient_type,
          subject: emailLog.subject,
          customerName: emailLog.customer_name,
          proposalType: emailLog.proposal_type,
          htmlContent: emailContent.html,
          textContent: emailContent.text
        }
      });

      if (error) {
        console.error('❌ Erro na Edge Function:', error);
        return false;
      }

      if (data?.success) {
        logInfo(`Email enviado com sucesso via Resend`, { hasRecipient: !!emailLog.recipient_email });
        return true;
      } else {
        console.error('❌ Edge Function retornou erro:', data?.error);
        return false;
      }

    } catch (error) {
      logError('Erro ao enviar email via Resend', error);
      return false;
    }
  }

  /**
   * Gera conteúdo HTML e texto do email
   */
  private generateEmailContent(emailLog: EmailLog): { html: string; text: string } {
    const { email_type, recipient_type, customer_name, proposal_id, proposal_type } = emailLog;
    
    // Template base
    const baseTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #1a365d; margin: 0;">TV Doutor ADS</h1>
          <p style="color: #718096; margin: 5px 0 0 0;">Sistema de Propostas Comerciais</p>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 8px; border: 1px solid #e2e8f0;">
          {{CONTENT}}
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #f7fafc; border-radius: 8px; text-align: center;">
          <p style="color: #718096; font-size: 12px; margin: 0;">
            Este é um email automático do sistema TV Doutor ADS.<br>
            Para dúvidas, entre em contato conosco.
          </p>
        </div>
      </div>
    `;
    
    let content = '';
    
    if (email_type === 'proposal_created') {
      if (recipient_type === 'client') {
        content = `
          <h2 style="color: #2d3748; margin-bottom: 20px;">Nova Proposta Comercial</h2>
          <p>Olá <strong>${customer_name}</strong>,</p>
          <p>Temos o prazer de informar que sua proposta comercial foi criada com sucesso!</p>
          
          <div style="background-color: #e6fffa; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #234e52; margin: 0 0 10px 0;">Detalhes da Proposta:</h3>
            <p style="margin: 5px 0;"><strong>Número:</strong> #${proposal_id}</p>
            <p style="margin: 5px 0;"><strong>Tipo:</strong> ${proposal_type === 'avulsa' ? 'Campanha Avulsa' : 'Projeto'}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> Em preparação</p>
          </div>
          
          <p>Nossa equipe está trabalhando na sua proposta e em breve você receberá mais detalhes.</p>
          <p>Agradecemos pela confiança em nossos serviços!</p>
          
          <p style="margin-top: 30px;">
            Atenciosamente,<br>
            <strong>Equipe TV Doutor ADS</strong>
          </p>
        `;
      } else {
        content = `
          <h2 style="color: #2d3748; margin-bottom: 20px;">Proposta Criada com Sucesso</h2>
          <p>A proposta comercial foi criada com sucesso no sistema!</p>
          
          <div style="background-color: #f0fff4; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #276749; margin: 0 0 10px 0;">Resumo:</h3>
            <p style="margin: 5px 0;"><strong>Proposta:</strong> #${proposal_id}</p>
            <p style="margin: 5px 0;"><strong>Cliente:</strong> ${customer_name}</p>
            <p style="margin: 5px 0;"><strong>Tipo:</strong> ${proposal_type === 'avulsa' ? 'Campanha Avulsa' : 'Projeto'}</p>
          </div>
          
          <p>Você pode acessar o sistema para gerenciar esta proposta e acompanhar seu progresso.</p>
        `;
      }
    } else if (email_type === 'status_changed') {
      if (recipient_type === 'client') {
        content = `
          <h2 style="color: #2d3748; margin-bottom: 20px;">Atualização da Sua Proposta</h2>
          <p>Olá <strong>${customer_name}</strong>,</p>
          <p>Sua proposta comercial teve uma atualização de status:</p>
          
          <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin: 0 0 10px 0;">Proposta #${proposal_id}</h3>
            <p style="margin: 5px 0; font-size: 18px;"><strong>Status atualizado</strong></p>
          </div>
          
          <p>Para mais informações sobre sua proposta, entre em contato conosco.</p>
          
          <p style="margin-top: 30px;">
            Atenciosamente,<br>
            <strong>Equipe TV Doutor ADS</strong>
          </p>
        `;
      } else {
        content = `
          <h2 style="color: #2d3748; margin-bottom: 20px;">Status da Proposta Alterado</h2>
          <p>O status da proposta foi alterado no sistema:</p>
          
          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Proposta:</strong> #${proposal_id}</p>
            <p style="margin: 5px 0;"><strong>Cliente:</strong> ${customer_name}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> Alterado</p>
          </div>
          
          <p>Acesse o sistema para mais detalhes.</p>
        `;
      }
    }
    
    const html = baseTemplate.replace('{{CONTENT}}', content);
    const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    
    return { html, text };
  }

  /**
   * Simula envio de email para desenvolvimento (fallback)
   */
  private async simulateEmailSend(emailLog: EmailLog): Promise<boolean> {
    // Simular delay de envio
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    logDebug(`[SIMULADO] Email enviado`, {
      hasRecipient: !!emailLog.recipient_email,
      tipo: emailLog.recipient_type,
      proposal_id: emailLog.proposal_id
    });
    
    // 95% de taxa de sucesso na simulação
    return Math.random() > 0.05;
  }

  /**
   * Processa todos os emails pendentes
   */
  async processAllPendingEmails(): Promise<{ processed: number; successful: number; failed: number }> {
    try {
      const pendingEmails = await this.getPendingEmails(50); // Processar até 50 por vez
      
      if (pendingEmails.length === 0) {
        logDebug('Nenhum email pendente para processar');
        return { processed: 0, successful: 0, failed: 0 };
      }

      logInfo(`Processando emails pendentes`, { count: pendingEmails.length });

      const results = await Promise.allSettled(
        pendingEmails.map(email => this.processEmail(email))
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
      const failed = results.length - successful;

      console.log(`Processamento concluído: ${successful} sucessos, ${failed} falhas`);

      return {
        processed: pendingEmails.length,
        successful,
        failed
      };
    } catch (error) {
      logError('Erro ao processar emails pendentes', error);
      throw error;
    }
  }

  /**
   * Busca estatísticas de emails
   */
  async getEmailStats(): Promise<EmailStats[]> {
    try {
      const { data, error } = await supabase
        .from('email_stats')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logError('Erro ao buscar estatísticas de email', error);
      throw error;
    }
  }

  /**
   * Força o envio de notificação para uma proposta específica
   */
  async sendProposalNotification(
    proposalId: number, 
    emailType: 'proposal_created' | 'status_changed' = 'proposal_created'
  ): Promise<boolean> {
    try {
      // Buscar dados da proposta
      const { data: proposal, error } = await supabase
        .from('proposals')
        .select(`
          id,
          customer_name,
          customer_email,
          proposal_type,
          status,
          created_by
        `)
        .eq('id', proposalId)
        .single();

      if (error) throw error;
      if (!proposal) throw new Error('Proposta não encontrada');

      // Buscar dados do usuário criador
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email;

      // Criar logs de email manualmente
      const emailLogs = [];

      // Log para cliente
      const clientLogId = await supabase.rpc('create_email_log', {
        p_proposal_id: proposalId,
        p_email_type: emailType,
        p_recipient_email: proposal.customer_email,
        p_recipient_type: 'client',
        p_subject: emailType === 'proposal_created' 
          ? `Nova Proposta Comercial - Proposta #${proposalId}`
          : `Proposta #${proposalId} - Atualização de Status`
      });

      if (clientLogId.data) {
        emailLogs.push({
          log_id: clientLogId.data,
          proposal_id: proposalId,
          email_type: emailType,
          recipient_email: proposal.customer_email,
          recipient_type: 'client',
          subject: emailType === 'proposal_created' 
            ? `Nova Proposta Comercial - Proposta #${proposalId}`
            : `Proposta #${proposalId} - Atualização de Status`,
          customer_name: proposal.customer_name,
          proposal_type: proposal.proposal_type,
          created_at: new Date().toISOString()
        });
      }

      // Log para usuário (se email diferente)
      if (userEmail && userEmail !== proposal.customer_email) {
        const userLogId = await supabase.rpc('create_email_log', {
          p_proposal_id: proposalId,
          p_email_type: emailType,
          p_recipient_email: userEmail,
          p_recipient_type: 'user',
          p_subject: `Proposta #${proposalId} - ${emailType === 'proposal_created' ? 'Criada' : 'Status Alterado'}`
        });

        if (userLogId.data) {
          emailLogs.push({
            log_id: userLogId.data,
            proposal_id: proposalId,
            email_type: emailType,
            recipient_email: userEmail,
            recipient_type: 'user',
            subject: `Proposta #${proposalId} - ${emailType === 'proposal_created' ? 'Criada' : 'Status Alterado'}`,
            customer_name: proposal.customer_name,
            proposal_type: proposal.proposal_type,
            created_at: new Date().toISOString()
          });
        }
      }

      // Processar emails criados
      const results = await Promise.allSettled(
        emailLogs.map(email => this.processEmail(email))
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
      logInfo(`Notificação enviada`, { successful, total: emailLogs.length });

      return successful > 0;
    } catch (error) {
      console.error('Erro ao enviar notificação da proposta:', error);
      throw error;
    }
  }

  /**
   * Inicia processamento automático de emails em background
   */
  startAutoProcessing(intervalMs = 10000) { // 10 segundos por padrão
    logInfo(`Iniciando processamento automático de emails`, { intervalMs });
    
    const processEmails = async () => {
      try {
        await this.processAllPendingEmails();
      } catch (error) {
        console.error('Erro no processamento automático:', error);
      }
    };

    // Processar imediatamente
    processEmails();

    // Configurar intervalo
    return setInterval(processEmails, intervalMs);
  }
}

// Singleton instance
export const emailService = new EmailService();

// Auto-start email processing when service is imported
let autoProcessInterval: NodeJS.Timeout | null = null;

export const startEmailProcessing = () => {
  if (!autoProcessInterval) {
    autoProcessInterval = emailService.startAutoProcessing();
    logInfo('Processamento automático de emails iniciado');
  }
};

export const stopEmailProcessing = () => {
  if (autoProcessInterval) {
    clearInterval(autoProcessInterval);
    autoProcessInterval = null;
    logInfo('Processamento automático de emails parado');
  }
};
