import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Quote, TrendingUp } from "lucide-react";

const testimonials = [
  {
    name: "Dr. Amanda Silva",
    role: "Cardiologista",
    clinic: "Clínica CardioVida",
    image: "/placeholder.svg",
    content: "A TV Doutor Ads revolucionou nossa comunicação com pacientes. Conseguimos um aumento de 65% no agendamento de consultas preventivas em apenas 3 meses.",
    rating: 5,
    results: {
      metric: "Agendamentos",
      increase: "+65%"
    }
  },
  {
    name: "Dr. Roberto Santos",
    role: "Dermatologista", 
    clinic: "Instituto DermaTech",
    image: "/placeholder.svg",
    content: "Impressionante como os pacientes chegam às consultas já conhecendo nossos tratamentos. A taxa de conversão para procedimentos estéticos triplicou.",
    rating: 5,
    results: {
      metric: "Conversão",
      increase: "+200%"
    }
  },
  {
    name: "Dra. Mariana Costa",
    role: "Pediatra",
    clinic: "Clínica Infantil Esperança",
    image: "/placeholder.svg", 
    content: "A plataforma é incrivelmente fácil de usar. Em 10 minutos criei uma campanha que educou centenas de pais sobre vacinação. ROI fantástico!",
    rating: 5,
    results: {
      metric: "Alcance",
      increase: "+180%"
    }
  },
  {
    name: "Dr. Fernando Lima",
    role: "Oftalmologista",
    clinic: "Centro Oftalmológico Visão",
    image: "/placeholder.svg",
    content: "Investimento que se paga sozinho. Nossa receita mensal aumentou 40% após implementar as campanhas da TV Doutor. Recomendo a todos os colegas.",
    rating: 5,
    results: {
      metric: "Receita",
      increase: "+40%"
    }
  }
];

const TestimonialsSection = () => {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Resultados Comprovados por Quem Confia
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Mais de 500 profissionais da saúde já transformaram seus resultados 
            com nossa plataforma. Veja alguns depoimentos dos nossos clientes.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="medical-glow hover:scale-105 transition-transform duration-300">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <Quote className="h-8 w-8 text-primary/30 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 leading-relaxed italic">
                      "{testimonial.content}"
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={testimonial.image} alt={testimonial.name} />
                      <AvatarFallback className="medical-gradient text-primary-foreground">
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-foreground">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.clinic}</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
                      <TrendingUp className="h-4 w-4" />
                      {testimonial.results.increase}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {testimonial.results.metric}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">4.9/5</div>
              <div className="text-muted-foreground">Avaliação média</div>
              <div className="flex justify-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">98%</div>
              <div className="text-muted-foreground">Taxa de satisfação</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">500+</div>
              <div className="text-muted-foreground">Clientes ativos</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">72%</div>
              <div className="text-muted-foreground">ROI médio</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
