import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  UserPlus, 
  FileText, 
  CheckCircle, 
  BarChart3,
  ArrowRight,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  {
    step: "01",
    icon: UserPlus,
    title: "Cadastro e Login",
    description: "Crie sua conta gratuita em menos de 2 minutos. Acesse nossa plataforma intuitiva e comece imediatamente.",
    time: "2 min",
    highlight: "Gratuito"
  },
  {
    step: "02", 
    icon: FileText,
    title: "Criação da Proposta",
    description: "Defina seu público-alvo, orçamento, objetivos e conteúdo. Nossa IA sugere as melhores estratégias automaticamente.",
    time: "5 min",
    highlight: "IA Integrada"
  },
  {
    step: "03",
    icon: CheckCircle,
    title: "Aprovação de Conteúdo",
    description: "Nossa equipe médica revisa e otimiza seu conteúdo para compliance total com regulamentações sanitárias.",
    time: "24h",
    highlight: "Compliance CFM"
  },
  {
    step: "04",
    icon: BarChart3,
    title: "Campanha no Ar",
    description: "Acompanhe resultados em tempo real com dashboard completo de métricas e otimize performance continuamente.",
    time: "Tempo real",
    highlight: "Analytics Avançado"
  }
];

const HowItWorksSection = () => {
  return (
    <section id="como-funciona" className="py-20 bg-slate-50">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Sua Campanha no Ar em 4 Passos Simples
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Em apenas 4 passos simples, sua campanha estará rodando nas principais 
            clínicas e hospitais do país. Processo 100% digital e otimizado.
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8 mb-16">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <Card className="medical-glow hover:scale-105 transition-all duration-300 h-full">
                <CardContent className="p-6 text-center">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 mx-auto rounded-full medical-gradient flex items-center justify-center mb-4">
                      <step.icon className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                      {step.step}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {step.title}
                  </h3>
                  
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {step.description}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      <Clock className="h-4 w-4" />
                      {step.time}
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                      <CheckCircle className="h-4 w-4" />
                      {step.highlight}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Connector arrow */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <ArrowRight className="h-6 w-6 text-primary" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <Card className="medical-glow max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Pronto para Começar?
              </h3>
              <p className="text-muted-foreground mb-6">
                Crie sua primeira proposta gratuitamente e veja como é simples 
                alcançar seu público-alvo no ambiente médico.
              </p>
              <Button 
                size="lg" 
                className="medical-gradient text-primary-foreground hover:opacity-90 transition-opacity"
                asChild
              >
                <Link to="/login">
                  Começar Agora - É Grátis
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
