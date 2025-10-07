// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { logDebug, logError, logInfo } from '@/utils/secureLogger';

// Configuração do Resend

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
   * Busca emails pendentes para processamento via Edge Function
   */
  async getPendingEmails(limit = 10): Promise<EmailLog[]> {
    try {
      logDebug('Buscando emails pendentes via Edge Function');
      
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        logError('Erro ao obter sessão para buscar emails pendentes', sessionError);
        return [];
      }
      
      if (!session) {
        logWarn('Nenhuma sessão ativa para buscar emails pendentes');
        return [];
      }
      
      const { data, error } = await supabase.functions.invoke('process-pending-emails', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        logError('Erro na Edge Function de emails pendentes', error);
        return [];
      }

      if (data?.success && data?.data) {
        logDebug('Emails pendentes carregados via Edge Function', { count: data.data.length });
        return data.data.slice(0, limit);
      }

      logDebug('Nenhum email pendente encontrado');
      return [];
    } catch (error) {
      logError('Erro ao buscar emails pendentes via Edge Function', error);
      return []; // Graceful fallback
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
        logWarn('Falha no Resend, usando simulação como fallback');
        success = await this.simulateEmailSend(emailLog);
      }

      if (success) {
        // Atualizar status para 'sent'
        await supabase
          .from('email_logs')
          .update({ status: 'sent' })
          .eq('log_id', emailLog.log_id);
        
        logInfo(`Email enviado com sucesso`, { logId: emailLog.log_id, hasRecipient: !!emailLog.recipient_email });
        return true;
      } else {
        throw new Error('Falha na simulação de envio');
      }
    } catch (error) {
      logError(`Erro ao processar email`, { logId: emailLog.log_id, error });
      
      // Atualizar status para 'failed' em caso de erro
      try {
        await supabase
          .from('email_logs')
          .update({ 
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Erro desconhecido'
          })
          .eq('log_id', emailLog.log_id);
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

      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        logError('Erro ao obter sessão para envio de email', sessionError);
        return false;
      }
      
      if (!session) {
        logWarn('Nenhuma sessão ativa para envio de email');
        return false;
      }

      // Gerar conteúdo do email
      const emailContent = await this.generateEmailContent(emailLog);
      
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
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        logError('Erro na Edge Function', error);
        return false;
      }

      if (data?.success) {
        logInfo(`Email enviado com sucesso via Resend`, { hasRecipient: !!emailLog.recipient_email });
        return true;
      } else {
        logError('Edge Function retornou erro', { hasError: !!data?.error });
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
  private async generateEmailContent(emailLog: EmailLog): Promise<{ html: string; text: string }> {
    const { email_type, recipient_type, customer_name, proposal_id, proposal_type } = emailLog;
    
    // Buscar dados completos da proposta para o template
    let proposalDetails = null;
    let screensData = null;
    
    try {
      // Buscar dados da proposta
      const { data: proposal } = await supabase
        .from('proposals')
        .select(`
          id,
          customer_name,
          customer_email,
          proposal_type,
          start_date,
          end_date,
          impact_formula,
          insertions_per_hour,
          film_seconds,
          cpm_mode,
          cpm_value,
          discount_pct,
          discount_fixed,
          net_business,
          status,
          created_at
        `)
        .eq('id', proposal_id)
        .single();

      if (proposal) {
        proposalDetails = proposal;

        // Buscar telas associadas
        const { data: screens } = await supabase
          .from('proposal_screens')
          .select(`
            screen_id,
            screens!inner(
              id,
              name,
              code,
              city,
              specialty,
              class
            )
          `)
          .eq('proposal_id', proposal_id);

        screensData = screens || [];
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes da proposta:', error);
    }
    
    // Template base melhorado
    const baseTemplate = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; margin-bottom: 25px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">TV Doutor ADS</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">Sistema de Propostas Comerciais</p>
        </div>
        
        <!-- Content -->
        <div style="background-color: white; padding: 35px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
          {{CONTENT}}
        </div>
        
        <!-- Footer -->
        <div style="margin-top: 25px; padding: 20px; background-color: #f7fafc; border-radius: 8px; text-align: center; border-top: 3px solid #667eea;">
          <p style="color: #718096; font-size: 13px; margin: 0; line-height: 1.5;">
            Este é um email automático do sistema TV Doutor ADS.<br>
            Para dúvidas ou suporte, entre em contato conosco.
          </p>
        </div>
      </div>
    `;
    
    let content = '';
    
    if (email_type === 'proposal_created') {
      if (recipient_type === 'client') {
        content = await this.generateClientProposalCreatedContent(proposalDetails, screensData);
      } else if (recipient_type === 'agency') {
        content = await this.generateAgencyProposalCreatedContent(proposalDetails, screensData);
      } else {
        content = await this.generateUserProposalCreatedContent(proposalDetails, screensData);
      }
    } else if (email_type === 'status_changed') {
      if (recipient_type === 'client') {
        content = `
          <h2 style="color: #2d3748; margin-bottom: 25px; font-size: 24px;">Atualização da Sua Proposta</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">Olá <strong>${customer_name}</strong>,</p>
          <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">Sua proposta comercial teve uma atualização de status:</p>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; margin: 25px 0; color: white;">
            <h3 style="color: white; margin: 0 0 10px 0; font-size: 20px;">Proposta #${proposal_id}</h3>
            <p style="margin: 5px 0; font-size: 18px; font-weight: 600;">Status atualizado</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">Para mais informações sobre sua proposta, entre em contato conosco.</p>
          
          <div style="margin-top: 35px; padding: 20px; background-color: #f0fff4; border-radius: 8px; border-left: 4px solid #38a169;">
            <p style="margin: 0; font-size: 16px; color: #2f855a;">
              Atenciosamente,<br>
              <strong>Equipe TV Doutor ADS</strong>
            </p>
          </div>
        `;
      } else {
        content = `
          <h2 style="color: #2d3748; margin-bottom: 25px; font-size: 24px;">Status da Proposta Alterado</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">O status da proposta foi alterado no sistema:</p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 5px 0; font-size: 16px;"><strong>Proposta:</strong> #${proposal_id}</p>
            <p style="margin: 5px 0; font-size: 16px;"><strong>Cliente:</strong> ${customer_name}</p>
            <p style="margin: 5px 0; font-size: 16px;"><strong>Status:</strong> Alterado</p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">Acesse o sistema para mais detalhes.</p>
        `;
      }
    }
    
    const html = baseTemplate.replace('{{CONTENT}}', content);
    const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    
    return { html, text };
  }

  /**
   * Gera conteúdo para cliente quando proposta é criada
   */
  private async generateClientProposalCreatedContent(proposalDetails: any, screensData: any[]): Promise<string> {
    if (!proposalDetails) {
      return `
        <h2 style="color: #2d3748; margin-bottom: 20px;">Nova Proposta Comercial</h2>
        <p>Olá <strong>${proposalDetails?.customer_name || 'Cliente'}</strong>,</p>
        <p>Temos o prazer de informar que sua proposta comercial foi criada com sucesso!</p>
      `;
    }

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value || 0);
    };

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('pt-BR');
    };

    return `
      <h2 style="color: #2d3748; margin-bottom: 25px; font-size: 24px;">🎉 Nova Proposta Comercial Criada!</h2>
      
      <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">Olá <strong>${proposalDetails.customer_name}</strong>,</p>
      <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">Temos o prazer de informar que sua proposta comercial foi criada com sucesso em nosso sistema!</p>
      
      <!-- Informações principais -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 12px; margin: 25px 0; color: white;">
        <h3 style="color: white; margin: 0 0 15px 0; font-size: 20px;">📋 Detalhes da Proposta</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Número:</strong> #${proposalDetails.id}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Tipo:</strong> ${proposalDetails.proposal_type === 'avulsa' ? 'Campanha Avulsa' : 'Projeto'}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Status:</strong> ${this.getStatusLabel(proposalDetails.status)}</p>
          </div>
          <div>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Início:</strong> ${formatDate(proposalDetails.start_date)}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Fim:</strong> ${formatDate(proposalDetails.end_date)}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Valor:</strong> ${formatCurrency(proposalDetails.net_business)}</p>
          </div>
        </div>
      </div>

      <!-- Configurações técnicas -->
      <div style="background-color: #f0fff4; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #38a169;">
        <h3 style="color: #2f855a; margin: 0 0 15px 0; font-size: 18px;">⚙️ Configurações Técnicas</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Duração do Filme:</strong> ${proposalDetails.film_seconds}s</p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Inserções/Hora:</strong> ${proposalDetails.insertions_per_hour}</p>
          </div>
          <div>
            <p style="margin: 6px 0; font-size: 14px;"><strong>CPM:</strong> ${proposalDetails.cpm_mode === 'fixed' ? formatCurrency(proposalDetails.cpm_value) : 'Dinâmico'}</p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Desconto:</strong> ${proposalDetails.discount_pct > 0 ? proposalDetails.discount_pct + '%' : 'Não aplicado'}</p>
          </div>
        </div>
      </div>

      ${screensData && screensData.length > 0 ? `
      <!-- Telas selecionadas -->
      <div style="background-color: #eff6ff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">📺 Telas Selecionadas (${screensData.length})</h3>
        <div style="max-height: 200px; overflow-y: auto;">
          ${screensData.slice(0, 10).map((item: any) => `
            <div style="padding: 8px; background-color: white; margin: 5px 0; border-radius: 6px; border: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 14px; font-weight: 600;">${item.screens.name || 'Tela ' + item.screen_id}</p>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: #6b7280;">${item.screens.city || 'Cidade não informada'} • ${item.screens.specialty?.[0] || 'Especialidade não informada'}</p>
            </div>
          `).join('')}
          ${screensData.length > 10 ? `<p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280; text-align: center;">... e mais ${screensData.length - 10} telas</p>` : ''}
        </div>
      </div>
      ` : ''}

      <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">Nossa equipe está trabalhando na sua proposta e em breve você receberá mais detalhes sobre a implementação.</p>
      
      <div style="margin-top: 35px; padding: 20px; background-color: #f0fff4; border-radius: 8px; border-left: 4px solid #38a169;">
        <p style="margin: 0; font-size: 16px; color: #2f855a;">
          Agradecemos pela confiança em nossos serviços!<br>
          <strong>Equipe TV Doutor ADS</strong>
        </p>
      </div>
    `;
  }

  /**
   * Gera conteúdo para usuário quando proposta é criada
   */
  private async generateUserProposalCreatedContent(proposalDetails: any, screensData: any[]): Promise<string> {
    if (!proposalDetails) {
      return `
        <h2 style="color: #2d3748; margin-bottom: 20px;">Proposta Criada com Sucesso</h2>
        <p>A proposta comercial foi criada com sucesso no sistema!</p>
      `;
    }

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value || 0);
    };

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('pt-BR');
    };

    return `
      <h2 style="color: #2d3748; margin-bottom: 25px; font-size: 24px;">✅ Proposta Criada com Sucesso</h2>
      
      <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">A proposta comercial foi criada com sucesso no sistema!</p>
      
      <!-- Resumo da proposta -->
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 25px; border-radius: 12px; margin: 25px 0; color: white;">
        <h3 style="color: white; margin: 0 0 15px 0; font-size: 20px;">📊 Resumo da Proposta</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Proposta:</strong> #${proposalDetails.id}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Cliente:</strong> ${proposalDetails.customer_name}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Tipo:</strong> ${proposalDetails.proposal_type === 'avulsa' ? 'Campanha Avulsa' : 'Projeto'}</p>
          </div>
          <div>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Período:</strong> ${formatDate(proposalDetails.start_date)} - ${formatDate(proposalDetails.end_date)}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Valor:</strong> ${formatCurrency(proposalDetails.net_business)}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Status:</strong> ${this.getStatusLabel(proposalDetails.status)}</p>
          </div>
        </div>
      </div>

      <!-- Estatísticas -->
      <div style="background-color: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">📈 Estatísticas</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
          <div style="text-align: center; padding: 15px; background-color: white; border-radius: 8px;">
            <p style="margin: 0; font-size: 24px; font-weight: 700; color: #3b82f6;">${screensData?.length || 0}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Telas</p>
          </div>
          <div style="text-align: center; padding: 15px; background-color: white; border-radius: 8px;">
            <p style="margin: 0; font-size: 24px; font-weight: 700; color: #10b981;">${proposalDetails.insertions_per_hour}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Inserções/Hora</p>
          </div>
          <div style="text-align: center; padding: 15px; background-color: white; border-radius: 8px;">
            <p style="margin: 0; font-size: 24px; font-weight: 700; color: #f59e0b;">${proposalDetails.film_seconds}s</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;">Duração</p>
          </div>
        </div>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">Você pode acessar o sistema para gerenciar esta proposta e acompanhar seu progresso.</p>
      
      <div style="margin-top: 25px; padding: 15px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          💡 <strong>Dica:</strong> Use o dashboard para acompanhar o status e fazer atualizações na proposta.
        </p>
      </div>
    `;
  }

  /**
   * Gera conteúdo para agência quando proposta é criada
   */
  private async generateAgencyProposalCreatedContent(proposalDetails: any, screensData: any[]): Promise<string> {
    if (!proposalDetails) {
      return `
        <h2 style="color: #2d3748; margin-bottom: 20px;">Nova Proposta Criada</h2>
        <p>Uma nova proposta comercial foi criada no sistema!</p>
      `;
    }

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value || 0);
    };

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('pt-BR');
    };

    return `
      <h2 style="color: #2d3748; margin-bottom: 25px; font-size: 24px;">🏢 Nova Proposta para Sua Agência</h2>
      
      <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">Uma nova proposta comercial foi criada e está associada à sua agência!</p>
      
      <!-- Informações da proposta -->
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 25px; border-radius: 12px; margin: 25px 0; color: white;">
        <h3 style="color: white; margin: 0 0 15px 0; font-size: 20px;">📋 Detalhes da Proposta</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Número:</strong> #${proposalDetails.id}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Cliente:</strong> ${proposalDetails.customer_name}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Tipo:</strong> ${proposalDetails.proposal_type === 'avulsa' ? 'Campanha Avulsa' : 'Projeto'}</p>
          </div>
          <div>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Período:</strong> ${formatDate(proposalDetails.start_date)} - ${formatDate(proposalDetails.end_date)}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Valor:</strong> ${formatCurrency(proposalDetails.net_business)}</p>
            <p style="margin: 8px 0; font-size: 16px;"><strong>Status:</strong> ${this.getStatusLabel(proposalDetails.status)}</p>
          </div>
        </div>
      </div>

      <!-- Informações do cliente -->
      <div style="background-color: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">👤 Informações do Cliente</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Nome:</strong> ${proposalDetails.customer_name}</p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Email:</strong> ${proposalDetails.customer_email || 'Não informado'}</p>
          </div>
          <div>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Data de Criação:</strong> ${formatDate(proposalDetails.created_at)}</p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Status:</strong> ${this.getStatusLabel(proposalDetails.status)}</p>
          </div>
        </div>
      </div>

      <!-- Configurações técnicas -->
      <div style="background-color: #f0fff4; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #38a169;">
        <h3 style="color: #2f855a; margin: 0 0 15px 0; font-size: 18px;">⚙️ Configurações Técnicas</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
          <div>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Duração:</strong> ${proposalDetails.film_seconds}s</p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Inserções/Hora:</strong> ${proposalDetails.insertions_per_hour}</p>
          </div>
          <div>
            <p style="margin: 6px 0; font-size: 14px;"><strong>CPM:</strong> ${proposalDetails.cpm_mode === 'fixed' ? formatCurrency(proposalDetails.cpm_value) : 'Dinâmico'}</p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Desconto:</strong> ${proposalDetails.discount_pct > 0 ? proposalDetails.discount_pct + '%' : 'Não aplicado'}</p>
          </div>
          <div>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Fórmula:</strong> ${proposalDetails.impact_formula || 'Padrão'}</p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Valor Total:</strong> ${formatCurrency(proposalDetails.net_business)}</p>
          </div>
        </div>
      </div>

      ${screensData && screensData.length > 0 ? `
      <!-- Telas selecionadas -->
      <div style="background-color: #eff6ff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">📺 Telas Selecionadas (${screensData.length})</h3>
        <div style="max-height: 200px; overflow-y: auto;">
          ${screensData.slice(0, 8).map((item: any) => `
            <div style="padding: 8px; background-color: white; margin: 5px 0; border-radius: 6px; border: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 14px; font-weight: 600;">${item.screens.name || 'Tela ' + item.screen_id}</p>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: #6b7280;">${item.screens.city || 'Cidade não informada'} • ${item.screens.specialty?.[0] || 'Especialidade não informada'}</p>
            </div>
          `).join('')}
          ${screensData.length > 8 ? `<p style="margin: 10px 0 0 0; font-size: 12px; color: #6b7280; text-align: center;">... e mais ${screensData.length - 8} telas</p>` : ''}
        </div>
      </div>
      ` : ''}

      <!-- Ações recomendadas -->
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">💡 Próximos Passos</h3>
        <ul style="margin: 0; padding-left: 20px; color: #92400e;">
          <li style="margin: 8px 0; font-size: 14px;">Revisar os detalhes da proposta no sistema</li>
          <li style="margin: 8px 0; font-size: 14px;">Contatar o cliente para alinhamento</li>
          <li style="margin: 8px 0; font-size: 14px;">Acompanhar o progresso da campanha</li>
          <li style="margin: 8px 0; font-size: 14px;">Manter comunicação ativa com a equipe</li>
        </ul>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">Esta proposta está agora disponível para acompanhamento em seu painel de agência.</p>
      
      <div style="margin-top: 35px; padding: 20px; background-color: #f0fff4; border-radius: 8px; border-left: 4px solid #38a169;">
        <p style="margin: 0; font-size: 16px; color: #2f855a;">
          Para mais informações, acesse o sistema de gerenciamento.<br>
          <strong>Equipe TV Doutor ADS</strong>
        </p>
      </div>
    `;
  }

  /**
   * Converte status para label legível
   */
  private getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'rascunho': '📝 Rascunho',
      'enviada': '📤 Enviada',
      'em_analise': '🔍 Em Análise',
      'aceita': '✅ Aceita',
      'rejeitada': '❌ Rejeitada'
    };
    
    return statusLabels[status] || status;
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
   * Processa todos os emails pendentes via Edge Function
   */
  async processAllPendingEmails(): Promise<{ processed: number; successful: number; failed: number }> {
    try {
      logInfo('Iniciando processamento de emails via Edge Function');
      
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        logError('Erro ao obter sessão para processamento de emails', sessionError);
        return { processed: 0, successful: 0, failed: 0 };
      }
      
      if (!session) {
        logWarn('Nenhuma sessão ativa para processamento de emails');
        return { processed: 0, successful: 0, failed: 0 };
      }
      
      const { data, error } = await supabase.functions.invoke('process-pending-emails', {
        method: 'POST',
        body: { action: 'process' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        logError('Erro na Edge Function de processamento', error);
        return { processed: 0, successful: 0, failed: 0 };
      }

      if (data?.success) {
        const result = {
          processed: data.processed || 0,
          successful: data.successful || 0,
          failed: data.failed || 0
        };

        logInfo('Processamento de emails concluído via Edge Function', result);
        return result;
      }

      logDebug('Nenhum email pendente para processar');
      return { processed: 0, successful: 0, failed: 0 };
    } catch (error) {
      logError('Erro ao processar emails pendentes via Edge Function', error);
      return { processed: 0, successful: 0, failed: 0 }; // Graceful fallback
    }
  }

  /**
   * Busca estatísticas de emails via Edge Function
   */
  async getEmailStats(): Promise<{ data: EmailStats[] | null; error: any }> {
    try {
      logDebug('Buscando estatísticas de email via Edge Function');
      
      const { data, error } = await supabase.functions.invoke('email-stats');

      if (error) {
        logError('Erro na Edge Function de estatísticas', error);
        return { data: [], error: null };
      }

      if (data?.success && data?.data) {
        logDebug('Estatísticas carregadas via Edge Function', { 
          count: data.data.length 
        });
        return { data: data.data, error: null };
      }

      logDebug('Nenhuma estatística encontrada');
      return { data: [], error: null };
    } catch (error) {
      logError('Falha ao buscar estatísticas de email via Edge Function', error);
      return { data: [], error: null }; // Graceful fallback
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
      // Buscar dados da proposta com informações da agência
      const { data: proposal, error } = await supabase
        .from('proposals')
        .select(`
          id,
          customer_name,
          customer_email,
          proposal_type,
          status,
          created_by,
          agencia_id,
          agencias!proposals_agencia_id_fkey(
            id,
            nome_agencia,
            email_empresa
          )
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
      const sentEmails = new Set<string>(); // Para evitar emails duplicados

      // Log para cliente
      if (proposal.customer_email && !sentEmails.has(proposal.customer_email)) {
        const { data: clientLogData } = await supabase
          .from('email_logs')
          .insert({
            proposal_id: proposalId,
            email_type: emailType,
            recipient_email: proposal.customer_email,
            recipient_type: 'client',
            subject: emailType === 'proposal_created' 
              ? `Nova Proposta Comercial - Proposta #${proposalId}`
              : `Proposta #${proposalId} - Atualização de Status`,
            status: 'pending'
          })
          .select('log_id')
          .single();
        
        const clientLogId = { data: clientLogData?.log_id };

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
          sentEmails.add(proposal.customer_email);
        }
      }

      // Log para usuário (se email diferente do cliente)
      if (userEmail && !sentEmails.has(userEmail)) {
        const { data: userLogData } = await supabase
          .from('email_logs')
          .insert({
            proposal_id: proposalId,
            email_type: emailType,
            recipient_email: userEmail,
            recipient_type: 'user',
            subject: `Proposta #${proposalId} - ${emailType === 'proposal_created' ? 'Criada' : 'Status Alterado'}`,
            status: 'pending'
          })
          .select('log_id')
          .single();
        
        const userLogId = { data: userLogData?.log_id };

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
          sentEmails.add(userEmail);
        }
      }

      // Log para agência (se email diferente dos anteriores)
      if (proposal.agencias?.email_empresa && !sentEmails.has(proposal.agencias.email_empresa)) {
        const { data: agencyLogData } = await supabase
          .from('email_logs')
          .insert({
            proposal_id: proposalId,
            email_type: emailType,
            recipient_email: proposal.agencias.email_empresa,
            recipient_type: 'agency',
            subject: `Proposta #${proposalId} - ${emailType === 'proposal_created' ? 'Nova Proposta Criada' : 'Status Alterado'} - ${proposal.agencias.nome_agencia}`,
            status: 'pending'
          })
          .select('log_id')
          .single();
        
        const agencyLogId = { data: agencyLogData?.log_id };

        if (agencyLogId.data) {
          emailLogs.push({
            log_id: agencyLogId.data,
            proposal_id: proposalId,
            email_type: emailType,
            recipient_email: proposal.agencias.email_empresa,
            recipient_type: 'agency',
            subject: `Proposta #${proposalId} - ${emailType === 'proposal_created' ? 'Nova Proposta Criada' : 'Status Alterado'} - ${proposal.agencias.nome_agencia}`,
            customer_name: proposal.customer_name,
            proposal_type: proposal.proposal_type,
            created_at: new Date().toISOString()
          });
          sentEmails.add(proposal.agencias.email_empresa);
        }
      }

      // Processar emails criados
      const results = await Promise.allSettled(
        emailLogs.map(email => this.processEmail(email))
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
      logInfo(`Notificação enviada`, { 
        successful, 
        total: emailLogs.length,
        recipients: {
          client: proposal.customer_email,
          user: userEmail,
          agency: proposal.agencias?.email_empresa
        }
      });

      return successful > 0;
    } catch (error) {
      logError('Erro ao enviar notificação da proposta', error);
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
        logError('Erro no processamento automático', error);
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
