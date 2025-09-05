import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Target, 
  BarChart3, 
  Zap, 
  Users, 
  Shield, 
  
  TrendingUp,
  MapPin
} from "lucide-react";

const benefits = [
  {
    icon: Target,
    title: "Alcance Qualificado",
    description: "Conecte-se com pacientes e acompanhantes em salas de espera médicas, o momento ideal para comunicação de saúde.",
    stat: "500+ clínicas parceiras",
    color: "text-blue-500"
  },
  {
    icon: MapPin,
    title: "Segmentação Precisa",
    description: "Direcionamento por especialidade médica, região geográfica e perfil demográfico dos pacientes.",
    stat: "15 especialidades disponíveis",
    color: "text-green-500"
  },
  {
    icon: BarChart3,
    title: "ROI Mensurável",
    description: "Métricas detalhadas de impressões, engajamento e conversão para otimizar suas campanhas continuamente.",
    stat: "Relatórios em tempo real",
    color: "text-purple-500"
  },
  {
    icon: Zap,
    title: "Criação Simples",
    description: "Interface intuitiva para criar propostas profissionais em minutos, sem necessidade de conhecimento técnico.",
    stat: "Criação em 5 minutos",
    color: "text-orange-500"
  },
  {
    icon: Users,
    title: "Suporte Especializado",
    description: "Equipe com expertise em marketing médico para orientar suas estratégias e maximizar resultados.",
    stat: "Consultoria gratuita",
    color: "text-pink-500"
  },
  {
    icon: Shield,
    title: "Compliance Médico",
    description: "Conteúdo revisado conforme regulamentações do CFM e ANVISA, garantindo total conformidade legal.",
    stat: "100% em conformidade",
    color: "text-indigo-500"
  }
];

const BenefitsSection = () => {
  return (
    <section id="beneficios" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Por que Escolher a TV Doutor Ads?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            A única plataforma DOOH especializada em ambientes médicos, 
            com tecnologia e expertise para maximizar o impacto da sua comunicação.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <Card key={index} className="medical-glow hover:scale-105 transition-transform duration-300">
              <CardHeader className="text-center pb-4">
                <div className={`w-16 h-16 mx-auto rounded-full bg-background flex items-center justify-center mb-4 shadow-lg`}>
                  <benefit.icon className={`h-8 w-8 ${benefit.color}`} />
                </div>
                <CardTitle className="text-xl text-foreground">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {benefit.description}
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <TrendingUp className="h-4 w-4" />
                  {benefit.stat}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">2.5M+</div>
              <div className="text-muted-foreground">Impressões mensais</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">85%</div>
              <div className="text-muted-foreground">Taxa de recall</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">3.2x</div>
              <div className="text-muted-foreground">ROI médio</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">24/7</div>
              <div className="text-muted-foreground">Monitoramento</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
