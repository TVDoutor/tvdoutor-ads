import { useNavigate } from "react-router-dom";
import { NewProposalWizard, type ProposalData } from "@/components/NewProposalWizard";
import { supabase } from "@/integrations/supabase/client";
import { emailService } from "@/lib/email-service";
import { toast } from "sonner";

const NewProposal = () => {
  const navigate = useNavigate();

  const handleComplete = async (data: ProposalData) => {
    try {
      // Create proposal in database
      const { data: proposalData, error } = await supabase
        .from('proposals')
        .insert({
          customer_name: data.customer_name,
          customer_email: data.customer_email,
          proposal_type: data.proposal_type,
          start_date: data.start_date,
          end_date: data.end_date,
          insertions_per_hour: data.insertions_per_hour,
          film_seconds: data.film_seconds,
          cpm_mode: data.cpm_mode,
          cpm_value: data.cpm_value,
          discount_pct: data.discount_pct,
          discount_fixed: data.discount_fixed,
          impact_formula: data.impact_formula,
          status: 'rascunho', // Status inicial
          filters: {},
          quote: {},
          screens: data.selectedScreens
        })
        .select('id')
        .single();

      if (error) throw error;

      const proposalId = proposalData?.id;
      
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
    <NewProposalWizard 
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
};

export default NewProposal;

