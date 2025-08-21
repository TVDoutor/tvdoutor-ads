import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Play, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  "Plataforma 100% gratuita para começar",
  "Criação de proposta em 5 minutos",
  "Compliance médico garantido", 
  "Suporte especializado incluído",
  "Analytics em tempo real",
  "Sem taxa de setup ou ativação"
];

const CTASection = () => {
  return (
    <section className="py-20 medical-cta-gradient">
      <div className="container mx-auto px-4 lg:px-6">
        <Card className="medical-glow max-w-4xl mx-auto overflow-hidden">
          <CardContent className="p-0">
            <div className="grid lg:grid-cols-2 gap-0">
              <div className="p-8 lg:p-12 space-y-6">
                <div className="space-y-4">
                  <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                    Pronto para Revolucionar 
                    <span className="block text-primary">
                      Sua Publicidade Médica?
                    </span>
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Junte-se a mais de 500 profissionais da saúde que já estão 
                    alcançando resultados extraordinários com nossa plataforma DOOH.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    size="lg" 
                    className="medical-gradient text-primary-foreground hover:opacity-90 transition-opacity flex-1"
                    asChild
                  >
                    <Link to="/login">
                      <Play className="h-5 w-5 mr-2" />
                      Criar Proposta Gratuita
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="medical-glow"
                  >
                    Falar com Especialista
                  </Button>
                </div>

                <div className="text-center pt-4">
                  <p className="text-sm text-muted-foreground">
                    ✓ Sem compromisso • ✓ Sem cartão de crédito • ✓ Suporte gratuito
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-8 lg:p-12 flex items-center justify-center">
                <div className="text-center space-y-8">
                  <div className="space-y-4">
                    <div className="text-5xl font-bold text-primary">2.5M+</div>
                    <div className="text-muted-foreground">Impressões mensais garantidas</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">500+</div>
                      <div className="text-sm text-muted-foreground">Clínicas ativas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">4.9★</div>
                      <div className="text-sm text-muted-foreground">Avaliação média</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">72%</div>
                      <div className="text-sm text-muted-foreground">ROI médio</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">24/7</div>
                      <div className="text-sm text-muted-foreground">Suporte</div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <p className="text-sm text-muted-foreground italic">
                      "A melhor decisão que tomei para minha clínica"
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      - Dr. Roberto Silva, Cardiologista
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default CTASection;
