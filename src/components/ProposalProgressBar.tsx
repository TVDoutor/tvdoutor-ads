import React from "react";
import { FileText, MapPin, Settings, CheckCircle } from "lucide-react";

interface ProposalProgressBarProps {
  currentStep: number;
}

export const ProposalProgressBar: React.FC<ProposalProgressBarProps> = ({ currentStep }) => {
  const steps = [
    {
      id: 1,
      title: "Informações",
      icon: FileText,
      description: "Dados básicos"
    },
    {
      id: 2,
      title: "Locais",
      icon: MapPin,
      description: "Seleção de telas"
    },
    {
      id: 3,
      title: "Configuração",
      icon: Settings,
      description: "Detalhes da campanha"
    },
    {
      id: 4,
      title: "Revisão",
      icon: CheckCircle,
      description: "Finalização"
    }
  ];

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return "completed";
    if (stepId === currentStep) return "current";
    return "pending";
  };

  const getStepClasses = (status: string) => {
    switch (status) {
      case "completed":
        return {
          circle: "bg-primary text-white border-primary",
          text: "text-primary",
          line: "bg-primary"
        };
      case "current":
        return {
          circle: "bg-primary text-white border-primary",
          text: "text-primary",
          line: "bg-muted"
        };
      default:
        return {
          circle: "bg-muted text-muted-foreground border-muted",
          text: "text-muted-foreground",
          line: "bg-muted"
        };
    }
  };

  return (
    <div className="bg-card border rounded-lg">
      <div className="p-6">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-4 w-full max-w-2xl">
            {steps.map((step, index) => {
              const status = getStepStatus(step.id);
              const classes = getStepClasses(status);
              const Icon = step.icon;
              
              return (
                <React.Fragment key={step.id}>
                  {/* Step */}
                  <div className="flex items-center flex-col min-w-0">
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center mb-2 ${classes.circle}`}>
                      {status === "completed" ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="text-center">
                      <div className={`text-sm font-medium ${classes.text}`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Line */}
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-1 mx-4">
                      <div className={`h-full rounded-full ${classes.line}`} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

