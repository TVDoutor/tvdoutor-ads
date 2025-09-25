import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { NewProposalWizardImproved, type ProposalData } from "@/components/NewProposalWizardImproved";
import { supabase } from "@/integrations/supabase/client";
import { emailService } from "@/lib/email-service";
import { toast } from "sonner";

const NewProposal = () => {
  const navigate = useNavigate();

  const handleComplete = async (data: ProposalData) => {
    try {
      console.log('🔍 Dados da proposta antes de inserir:', {
        customer_name: data.customer_name,
        selectedScreens: data.selectedScreens,
        film_seconds: data.film_seconds,
        insertions_per_hour: data.insertions_per_hour
      });

      // Preparar valores numéricos com parsing seguro
      const insertionsPerHour = parseInt(String(data.insertions_per_hour), 10) || 0;
      const filmSecondsValue = Array.isArray(data.film_seconds)
        ? parseInt(String(data.film_seconds[0]), 10) || 0
        : parseInt(String(data.film_seconds as unknown as number), 10) || 0;
      const cpmValue = data.cpm_value !== undefined && data.cpm_value !== null
        ? parseFloat(String(data.cpm_value)) || 0
        : 0;
      const discountPct = parseFloat(String(data.discount_pct)) || 0;
      const discountFixed = parseFloat(String(data.discount_fixed)) || 0;

      // Payload final para o banco (sem salvar telas no JSON para evitar duplicidade)
      const payload = {
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        proposal_type: data.proposal_type,
        start_date: data.start_date,
        end_date: data.end_date,
        impact_formula: data.impact_formula,
        status: 'rascunho' as const,
        filters: {},
        quote: {},
        insertions_per_hour: insertionsPerHour,
        film_seconds: filmSecondsValue,
        cpm_mode: data.cpm_mode,
        cpm_value: cpmValue,
        discount_pct: discountPct,
        discount_fixed: discountFixed,
      } as const;

      console.log('✅ Payload pronto para inserir:', payload);

      // Create proposal in database
      const { data: proposalData, error } = await supabase
        .from('proposals')
        .insert(payload)
        .select('id')
        .single();

      if (error) throw error;

      const proposalId = proposalData?.id;
      
      // Inserir telas associadas na tabela de junção
      const selected = Array.isArray(data.selectedScreens) ? data.selectedScreens : [];
      
      if (proposalId && selected.length > 0) {
        const rows = selected.map((screenId: number | string) => ({
          proposal_id: proposalId,
          screen_id: screenId,
        }));
        
        const { error: linkError } = await supabase
          .from('proposal_screens')
          .insert(rows);
        
        if (linkError) {
          console.error('Erro ao inserir proposal_screens:', linkError);
          throw linkError;
        }
      }

      toast.success('Proposta criada com sucesso!');
      
      // Enviar notificação por email e processar imediatamente
      if (proposalId) {
        try {
          await emailService.sendProposalNotification(proposalId, 'proposal_created');
          
          // Forçar processamento imediato
          setTimeout(async () => {
            try {
              const result = await emailService.processAllPendingEmails();
              if (result.successful > 0) {
                toast.success(`Proposta criada e ${result.successful} email(s) enviado(s)!`);
              }
            } catch (processError) {
              console.error('Erro ao processar emails:', processError);
            }
          }, 1000);
          
        } catch (emailError) {
          console.error('Erro ao criar notificações de email:', emailError);
          toast.error('Proposta criada, mas houve erro na configuração dos emails');
        }
      }
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Erro ao criar proposta:', error);
      toast.error('Erro ao criar proposta: ' + error.message);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <DashboardLayout>
      <NewProposalWizardImproved
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </DashboardLayout>
  );
};

export default NewProposal;

