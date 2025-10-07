// @ts-nocheck
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { NewProposalWizardImproved, type ProposalData } from "@/components/NewProposalWizardImproved";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { emailService } from "@/lib/email-service";
import { toast } from "sonner";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  Calendar,
  DollarSign,
  Send,
  Save
} from "lucide-react";

const NewProposal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const handleComplete = async (data: ProposalData) => {
    setLoading(true);
    try {
      // Verificar se o usuário está autenticado
      if (!user) {
        toast.error('Você precisa estar logado para criar uma proposta');
        return;
      }

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
        created_by: user?.id, // Adicionar o campo created_by para as políticas RLS
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
      
      navigate('/propostas');
    } catch (error: any) {
      console.error('Erro ao criar proposta:', error);
      toast.error('Erro ao criar proposta: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/propostas');
  };

  const steps = [
    { id: 1, title: 'Tipo de Proposta', icon: FileText, description: 'Selecione o tipo de campanha' },
    { id: 2, title: 'Informações do Cliente', icon: Users, description: 'Dados do cliente' },
    { id: 3, title: 'Seleção de Projeto', icon: Calendar, description: 'Escolha o projeto' },
    { id: 4, title: 'Configurações', icon: DollarSign, description: 'Configure a campanha' },
    { id: 5, title: 'Resumo', icon: CheckCircle, description: 'Revise e finalize' },
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="flex items-center gap-2"
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <div className="h-8 border-l border-gray-200" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    Nova Proposta Comercial
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Crie e configure uma nova proposta para seus clientes
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Salvar Rascunho
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-700">
                Progresso da Proposta
              </div>
              <div className="text-sm text-gray-500">
                Passo {currentStep + 1} de {steps.length}
              </div>
            </div>
            <Progress value={(currentStep / (steps.length - 1)) * 100} className="h-2" />
            
            {/* Step Indicators */}
            <div className="mt-6 flex justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                
                return (
                  <div key={step.id} className="flex flex-col items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                        isCompleted
                          ? 'bg-primary border-primary text-white'
                          : isActive
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-gray-100 border-gray-300 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={`text-xs font-medium ${
                        isActive ? 'text-primary' : isCompleted ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 hidden sm:block max-w-24">
                        {step.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <Card>
              <CardContent className="p-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Criando Proposta
                    </h3>
                    <p className="text-sm text-gray-500">
                      Processando seus dados e configurando a proposta...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Success Message */}
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Wizard Inteligente:</strong> O sistema irá guiá-lo através de cada etapa 
                  para criar a proposta perfeita. Todas as informações são salvas automaticamente.
                </AlertDescription>
              </Alert>

              {/* Wizard Component */}
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-blue-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <FileText className="h-5 w-5 text-primary" />
                    Assistente de Criação de Proposta
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <NewProposalWizardImproved
                    onComplete={handleComplete}
                    onCancel={handleCancel}
                  />
                </CardContent>
              </Card>

              {/* Help Panel */}
              <Card className="bg-blue-50/50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-blue-600" />
                    Dicas para uma Proposta Eficaz
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-blue-900">Informações Completas</div>
                        <div className="text-blue-700">
                          Preencha todos os dados do cliente para personalizar melhor a proposta.
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Calendar className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-green-900">Prazos Realistas</div>
                        <div className="text-green-700">
                          Defina datas de início e fim que sejam viáveis para execução.
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <DollarSign className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-purple-900">Valores Competitivos</div>
                        <div className="text-purple-700">
                          Ajuste os preços conforme o mercado e valor percebido pelo cliente.
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewProposal;

