import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, FileText, Settings, MapPin, CheckCircle } from "lucide-react";
import { ProposalInfoStep } from "./wizard/ProposalInfoStep";
import { ScreenSelectionStep } from "./wizard/ScreenSelectionStep";
import { ProposalConfigStep } from "./wizard/ProposalConfigStep";
import { ProposalSummaryStep } from "./wizard/ProposalSummaryStep";

export type ProposalType = 'avulsa' | 'projeto';

export interface ProposalData {
  // Informações básicas
  customer_name: string;
  customer_email?: string;
  proposal_type: ProposalType;
  
  // Telas selecionadas
  selectedScreens: number[];
  
  // Configurações
  start_date?: string;
  end_date?: string;
  insertions_per_hour: number;
  film_seconds: number;
  cpm_mode: 'manual' | 'blended';
  cpm_value?: number;
  discount_pct: number;
  discount_fixed: number;
  impact_formula: 'A' | 'B';
}

interface NewProposalWizardProps {
  onComplete: (data: ProposalData) => void;
  onCancel: () => void;
}

const STEPS = [
  { id: 'info', title: 'Informações da Proposta', icon: FileText, description: 'Dados básicos do cliente e tipo' },
  { id: 'screens', title: 'Seleção de Telas', icon: MapPin, description: 'Escolha as telas no mapa interativo' },
  { id: 'config', title: 'Configuração', icon: Settings, description: 'CPM, desconto, filme e inserções' },
  { id: 'summary', title: 'Finalização', icon: CheckCircle, description: 'Resumo e confirmação' },
];

export const NewProposalWizard = ({ onComplete, onCancel }: NewProposalWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [proposalData, setProposalData] = useState<ProposalData>({
    customer_name: '',
    customer_email: '',
    proposal_type: 'avulsa',
    selectedScreens: [],
    insertions_per_hour: 6,
    film_seconds: 15,
    cpm_mode: 'blended',
    discount_pct: 0,
    discount_fixed: 0,
    impact_formula: 'A',
  });

  const updateProposalData = (updates: Partial<ProposalData>) => {
    setProposalData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete(proposalData);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Info step
        return proposalData.customer_name.trim() !== '';
      case 1: // Screens step
        return proposalData.selectedScreens.length > 0;
      case 2: // Config step
        return proposalData.start_date && proposalData.end_date;
      case 3: // Summary step
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <ProposalInfoStep 
            data={proposalData} 
            onUpdate={updateProposalData} 
          />
        );
      case 1:
        return (
          <ScreenSelectionStep 
            data={proposalData} 
            onUpdate={updateProposalData} 
          />
        );
      case 2:
        return (
          <ProposalConfigStep 
            data={proposalData} 
            onUpdate={updateProposalData} 
          />
        );
      case 3:
        return (
          <ProposalSummaryStep 
            data={proposalData} 
            onUpdate={updateProposalData} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Nova Proposta</h1>
          <p className="text-muted-foreground">
            Crie uma nova proposta comercial seguindo os passos abaixo
          </p>
        </div>

        {/* Progress Steps */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center gap-3 ${index < STEPS.length - 1 ? 'flex-1' : ''}`}>
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors
                        ${isActive ? 'border-primary bg-primary text-primary-foreground' : 
                          isCompleted ? 'border-green-500 bg-green-500 text-white' : 
                          'border-muted-foreground/30 text-muted-foreground'}
                      `}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="hidden md:block">
                        <p className={`font-medium ${isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {step.title}
                        </p>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                    
                    {index < STEPS.length - 1 && (
                      <div className={`hidden md:block flex-1 h-px mx-4 ${
                        isCompleted ? 'bg-green-500' : 'bg-border'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {React.createElement(STEPS[currentStep].icon, { className: "w-5 h-5" })}
              {STEPS[currentStep].title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            {currentStep > 0 && (
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {currentStep < STEPS.length - 1 ? (
              <Button 
                onClick={nextStep} 
                disabled={!canProceed()}
              >
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleComplete}
                disabled={!canProceed()}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Finalizar Proposta
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};