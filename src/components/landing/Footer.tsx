import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock,
  Facebook,
  Instagram,
  Linkedin,
  Youtube
} from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-muted/50 pt-16 pb-8">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full medical-gradient flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">TV</span>
              </div>
              <span className="text-xl font-bold text-foreground">TV Doutor Ads</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              A primeira plataforma DOOH especializada em ambientes médicos do Brasil. 
              Conectando marcas de saúde com pacientes no momento certo.
            </p>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                <Facebook className="h-4 w-4" />
              </div>
              <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                <Instagram className="h-4 w-4" />
              </div>
              <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                <Linkedin className="h-4 w-4" />
              </div>
              <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                <Youtube className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Links Rápidos</h3>
            <ul className="space-y-2">
              <li><a href="#beneficios" className="text-muted-foreground hover:text-primary transition-colors">Benefícios</a></li>
              <li><a href="#como-funciona" className="text-muted-foreground hover:text-primary transition-colors">Como Funciona</a></li>
              <li><a href="#faq" className="text-muted-foreground hover:text-primary transition-colors">FAQ</a></li>
              <li><a href="/login" className="text-muted-foreground hover:text-primary transition-colors">Entrar no Sistema</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Casos de Sucesso</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Blog</a></li>
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Serviços</h3>
            <ul className="space-y-2">
              <li><span className="text-muted-foreground">TV Doutor Clínicas</span></li>
              <li><span className="text-muted-foreground">TV Doutor Hospitais</span></li>
              <li><span className="text-muted-foreground">TV Doutor Farmácias</span></li>
              <li><span className="text-muted-foreground">Analytics Avançado</span></li>
              <li><span className="text-muted-foreground">Criação de Conteúdo</span></li>
              <li><span className="text-muted-foreground">Consultoria Estratégica</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Contato</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-muted-foreground">
                  <div>Av. Paulista, 1000</div>
                  <div>São Paulo - SP, 01310-100</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">(11) 99999-9999</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <span className="text-muted-foreground">contato@tvdoutor.com.br</span>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-muted-foreground">
                  <div>Segunda a Sexta</div>
                  <div>8h às 18h</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-muted-foreground text-sm">
            © 2024 TV Doutor Ads. Todos os direitos reservados.
          </div>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              Política de Privacidade
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              Termos de Uso
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              Compliance Médico
            </a>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Sistema em funcionamento • 99.9% uptime
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
