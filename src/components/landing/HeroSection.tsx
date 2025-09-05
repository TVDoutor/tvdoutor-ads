import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-banner.jpg";

const HeroSection = () => {
  return (
    <section className="container mx-auto px-4 lg:px-6 py-16 lg:py-24 relative">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
              Revolucione Sua
              <span className="block text-primary">
                Publicidade Médica
              </span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Conecte-se com pacientes no momento certo através do Digital Out-of-Home 
              mais inteligente para o setor de saúde. Salas de espera, recepções e 
              corredores hospitalares agora são seu canal direto.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg" 
              className="medical-gradient text-primary-foreground hover:opacity-90 transition-opacity"
              asChild
            >
              <Link to="/login">
                Começar Grátis
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="medical-glow">
              Ver Demonstração
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">500+</div>
              <div className="text-sm text-muted-foreground">Clínicas Ativas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">2.5M</div>
              <div className="text-sm text-muted-foreground">Visualizações/mês</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">85%</div>
              <div className="text-sm text-muted-foreground">Taxa de Conversão</div>
            </div>
          </div>
        </div>

        <div className="relative">
          <Card className="overflow-hidden medical-glow">
            <img 
              src={heroImage} 
              alt="TV Doutor DOOH Platform - Digital advertising in medical waiting rooms"
              className="w-full h-auto object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
          </Card>
          
          {/* Floating stats cards */}
          <Card className="absolute -bottom-6 -left-6 p-4 medical-glow bg-card/95 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <div className="text-lg font-bold text-foreground">+42%</div>
                <div className="text-xs text-muted-foreground">Engagement Rate</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
