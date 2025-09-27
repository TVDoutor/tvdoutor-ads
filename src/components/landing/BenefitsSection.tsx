import { Card, CardContent } from "@/components/ui/card";

interface VisualElement {
  text: string;
  color: string;
}

interface Benefit {
  bigNumber?: string;
  visualElements?: VisualElement[];
  title: string;
  description: string;
  color: string;
}

const benefits: Benefit[] = [
  {
    bigNumber: "+130 MILHÕES",
    title: "Alcance Qualificado",
    description: "de pessoas alcançadas. Comunique-se com pacientes e acompanhantes em um ambiente de confiança, no momento ideal para a comunicação de saúde.",
    color: "text-blue-600"
  },
  {
    visualElements: [
      { text: "+370 Cidades", color: "bg-green-100 text-green-800" },
      { text: "25 Estados", color: "bg-blue-100 text-blue-800" },
      { text: "Por Especialidade", color: "bg-purple-100 text-purple-800" },
      { text: "Por Classe Social", color: "bg-orange-100 text-orange-800" },
      { text: "Por Linha de Cuidado", color: "bg-pink-100 text-pink-800" }
    ],
    title: "Segmentação Precisa",
    description: "Direcionamento avançado com opções múltiplas de segmentação para alcançar exatamente sua audiência-alvo.",
    color: "text-green-600"
  },
  {
    bigNumber: "76%",
    title: "ROI Mensurável",
    description: "dos adultos que viram publicidade no consultório tomaram alguma ação. Métricas tangíveis que conectam sua mensagem à prescrição e adesão, como Script Lift e Recall de Marca.",
    color: "text-purple-600"
  }
];

const BenefitsSection = () => {
  return (
    <section id="beneficios" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-4">
            Dados que Comprovam Nossa Eficácia
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A única plataforma DOOH especializada em ambientes médicos, 
            com métricas reais que provam o impacto da sua comunicação.
          </p>
        </div>

        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <Card key={index} className="p-8 hover:shadow-xl transition-shadow duration-300 bg-white border-0 shadow-lg">
              <CardContent className="text-center p-0">
                {/* Número Grande para Impacto Visual */}
                {benefit.bigNumber && (
                  <div className="mb-6">
                    <div className={`text-6xl font-bold ${benefit.color} mb-2`}>
                      {benefit.bigNumber}
                    </div>
                  </div>
                )}
                
                {/* Tags Visuais para Segmentação */}
                {benefit.visualElements && (
                  <div className="mb-6">
                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                      {benefit.visualElements.map((element, idx) => (
                        <span key={idx} className={`px-3 py-1 rounded-full text-xs font-medium ${element.color}`}>
                          {element.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <h3 className="text-2xl font-bold text-gray-800 mb-4">{benefit.title}</h3>
                
                <p className="text-gray-600 mb-6 leading-relaxed text-left">
                  {benefit.bigNumber && (
                    <span className={`font-bold ${benefit.color}`}>{benefit.bigNumber} </span>
                  )}
                  {benefit.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Métricas Adicionais */}
        <div className="mt-16 text-center">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-blue-600">130M+</div>
              <div className="text-gray-600">Pessoas alcançadas</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-green-600">370+</div>
              <div className="text-gray-600">Cidades atendidas</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-purple-600">25+</div>
              <div className="text-gray-600">Especialidades médicas</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-orange-600">44%</div>
              <div className="text-gray-600">Classes A e B</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;