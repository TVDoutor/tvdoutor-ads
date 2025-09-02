import { useNavigate } from "react-router-dom";
import { NewProposalWizard, type ProposalData } from "@/components/NewProposalWizard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NewProposal = () => {
  const navigate = useNavigate();

  const handleComplete = async (data: ProposalData) => {
    try {
      // Create proposal in database
      const { error } = await supabase
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
          filters: {},
          quote: {},
          screens: data.selectedScreens
        });

      if (error) throw error;

      toast.success('Proposta criada com sucesso!');
      navigate('/');
    } catch (error: any) {
      console.error('Erro ao criar proposta:', error);
      toast.error('Erro ao criar proposta: ' + error.message);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <NewProposalWizard 
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
};

export default NewProposal;
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">Nova Proposta</h1>
              <p className="text-muted-foreground">Crie uma nova proposta comercial</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleSaveDraft}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Rascunho
            </Button>
            <Button onClick={handleNextStep}>
              {currentStep === 4 ? "Finalizar" : "Próximo"}
              {currentStep < 4 && <ChevronRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <ProposalProgressBar currentStep={currentStep} />

        {/* Step Content */}
        <div className="pb-6">
          {renderStepContent()}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewProposal;

