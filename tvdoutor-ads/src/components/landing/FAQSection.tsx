import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const faqs = [
  {
    question: "Como funciona o DOOH em ambientes médicos?",
    answer: "O Digital Out-of-Home médico utiliza telas estrategicamente posicionadas em salas de espera, recepções e corredores de clínicas e hospitais. Nosso conteúdo é exibido quando pacientes e acompanhantes estão mais receptivos, criando um ambiente de aprendizado e engajamento único no setor de saúde."
  },
  {
    question: "Quanto tempo leva para minha campanha ficar no ar?",
    answer: "Após criar sua proposta na plataforma (5 minutos), nossa equipe médica revisa o conteúdo em até 24 horas para garantir compliance total. Uma vez aprovado, sua campanha entra no ar imediatamente em nossa rede de clínicas parceiras."
  },
  {
    question: "Como vocês garantem o compliance com as normas médicas?",
    answer: "Temos uma equipe especializada em regulamentações do CFM, ANVISA e CRM que revisa todo conteúdo antes da veiculação. Seguimos rigorosamente as diretrizes de publicidade médica e fornecemos orientações para adequação quando necessário."
  },
  {
    question: "Posso segmentar por especialidade médica?",
    answer: "Sim! Nossa plataforma permite segmentação por mais de 15 especialidades médicas, incluindo cardiologia, dermatologia, pediatria, oftalmologia, ginecologia, entre outras. Você também pode segmentar por região geográfica e perfil demográfico."
  },
  {
    question: "Que tipo de métricas vocês fornecem?",
    answer: "Oferecemos analytics completos em tempo real: impressões, tempo de visualização, taxa de engajamento, conversões, ROI, dados demográficos da audiência e relatórios comparativos. Tudo através de um dashboard intuitivo e acessível."
  },
  {
    question: "Qual o investimento mínimo para começar?",
    answer: "Não há investimento mínimo! Você pode começar com o valor que desejar. Nossa plataforma oferece flexibilidade total de orçamento, permitindo testes com baixo investimento e escalabilidade conforme os resultados."
  },
  {
    question: "Vocês ajudam na criação do conteúdo?",
    answer: "Absolutamente! Nossa equipe de criativos especializados em comunicação médica pode desenvolver seu conteúdo do zero ou otimizar materiais existentes. Oferecemos desde consultoria estratégica até produção completa de vídeos e artes."
  },
  {
    question: "Como posso acompanhar os resultados da minha campanha?",
    answer: "Através do nosso dashboard online você acompanha todas as métricas em tempo real, 24/7. Também enviamos relatórios semanais e mensais personalizados com insights e recomendações para otimização contínua dos resultados."
  }
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-20">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Tire suas dúvidas sobre nossa plataforma DOOH médica. 
            Se não encontrar sua resposta aqui, entre em contato conosco.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="medical-glow">
            <CardContent className="p-6">
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`item-${index}`}
                    className="border border-border rounded-lg px-4"
                  >
                    <AccordionTrigger className="text-left hover:text-primary transition-colors">
                      <span className="font-semibold">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed pt-2">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <div className="mt-12 text-center">
            <Card className="medical-glow">
              <CardHeader>
                <CardTitle className="text-foreground">Ainda tem dúvidas?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Nossa equipe está pronta para esclarecer qualquer questão sobre 
                  DOOH médico e como pode beneficiar sua prática.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <div className="text-center">
                    <div className="font-semibold text-foreground">WhatsApp</div>
                    <div className="text-primary">(11) 99999-9999</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-foreground">E-mail</div>
                    <div className="text-primary">contato@tvdoutor.com.br</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-foreground">Atendimento</div>
                    <div className="text-primary">Segunda a Sexta, 8h às 18h</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
