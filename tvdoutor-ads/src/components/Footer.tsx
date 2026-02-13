'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { 
  Stethoscope, 
  Phone, 
  Mail, 
  MapPin, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Twitter,
  Heart,
  Shield,
  Users,
  Clock
} from 'lucide-react';

interface FooterLink {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface FooterSection {
  label: string;
  links: FooterLink[];
}

const footerLinks: FooterSection[] = [
  {
    label: 'Serviços',
    links: [
      { title: 'Publicidade Médica', href: '/servicos/publicidade' },
      { title: 'Marketing Digital', href: '/servicos/marketing' },
      { title: 'Gestão de Redes Sociais', href: '/servicos/redes-sociais' },
      { title: 'Consultoria', href: '/servicos/consultoria' },
    ],
  },
  {
    label: 'Empresa',
    links: [
      { title: 'Sobre Nós', href: '/sobre' },
      { title: 'Nossa Equipe', href: '/equipe' },
      { title: 'Cases de Sucesso', href: '/cases' },
      { title: 'Blog', href: '/blog' },
    ],
  },
  {
    label: 'Suporte',
    links: [
      { title: 'Central de Ajuda', href: '/ajuda' },
      { title: 'FAQ', href: '/faq' },
      { title: 'Contato', href: '/contato' },
      { title: 'Política de Privacidade', href: '/privacidade' },
    ],
  },
  {
    label: 'Redes Sociais',
    links: [
      { title: 'Facebook', href: 'https://facebook.com/tvdoutorada', icon: Facebook },
      { title: 'Instagram', href: 'https://instagram.com/tvdoutorada', icon: Instagram },
      { title: 'LinkedIn', href: 'https://linkedin.com/company/tvdoutorada', icon: Linkedin },
      { title: 'Twitter', href: 'https://twitter.com/tvdoutorada', icon: Twitter },
    ],
  },
];

const companyInfo = {
  name: 'TVDoutor ADS',
  description: 'Especialistas em marketing e publicidade para profissionais da saúde. Conectamos médicos aos seus pacientes através de estratégias digitais eficazes e éticas.',
  contact: {
    phone: '+55 (11) 9999-9999',
    email: 'contato@tvdoutorada.com.br',
    address: 'São Paulo, SP - Brasil'
  }
};

const stats = [
  { icon: Heart, value: '5000+', label: 'Médicos Atendidos' },
  { icon: Shield, value: '100%', label: 'Conformidade CFM' },
  { icon: Users, value: '50Mi+', label: 'Pacientes Alcançados' },
  { icon: Clock, value: '10+', label: 'Anos de Experiência' }
];

type ViewAnimationProps = {
  delay?: number;
  className?: string;
  children: React.ReactNode;
};

function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
      whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function TVDoutorFooter() {
  return (
    <footer className="relative w-full bg-gradient-to-b from-background to-muted/20 border-t border-border">
      {/* Decorative top border */}
      <div className="bg-primary/20 absolute top-0 right-1/2 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full blur" />
      
      <div className="container mx-auto px-6 py-16 lg:py-20">
        {/* Stats Section */}
        <AnimatedContainer className="mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="text-center group"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </AnimatedContainer>

        {/* Main Footer Content */}
        <div className="grid gap-12 xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2">
          {/* Company Info */}
          <AnimatedContainer className="xl:col-span-1 lg:col-span-1 md:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">{companyInfo.name}</h2>
            </div>
            
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              {companyInfo.description}
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-primary" />
                <a href={`tel:${companyInfo.contact.phone}`} className="text-muted-foreground hover:text-primary transition-colors">
                  {companyInfo.contact.phone}
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-primary" />
                <a href={`mailto:${companyInfo.contact.email}`} className="text-muted-foreground hover:text-primary transition-colors">
                  {companyInfo.contact.email}
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">{companyInfo.contact.address}</span>
              </div>
            </div>
          </AnimatedContainer>

          {/* Footer Links */}
          <div className="xl:col-span-3 lg:col-span-2 md:col-span-2">
            <div className="grid gap-8 md:grid-cols-3 sm:grid-cols-2">
              {footerLinks.slice(0, 3).map((section, index) => (
                <AnimatedContainer key={section.label} delay={0.1 + index * 0.1}>
                  <div>
                    <h3 className="font-semibold text-foreground mb-4">{section.label}</h3>
                    <ul className="space-y-3">
                      {section.links.map((link) => (
                        <li key={link.title}>
                          <a
                            href={link.href}
                            className="text-muted-foreground hover:text-primary transition-colors duration-300 text-sm inline-flex items-center gap-2"
                          >
                            {link.icon && <link.icon className="w-4 h-4" />}
                            {link.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </AnimatedContainer>
              ))}
            </div>
          </div>
        </div>

        {/* Social Links Section */}
        <AnimatedContainer delay={0.4} className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3">Siga-nos nas redes sociais</h4>
              <div className="flex gap-4">
                {footerLinks[3].links.map((social) => (
                  <motion.a
                    key={social.title}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-primary text-muted-foreground hover:text-primary-foreground transition-colors duration-300"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {social.icon && <social.icon className="w-5 h-5" />}
                  </motion.a>
                ))}
              </div>
            </div>
            
            {/* Newsletter Signup */}
            <div className="text-center md:text-right">
              <h4 className="font-semibold text-foreground mb-3">Newsletter</h4>
              <div className="flex gap-2 max-w-sm">
                <input
                  type="email"
                  placeholder="Seu e-mail"
                  className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors">
                  Inscrever
                </button>
              </div>
            </div>
          </div>
        </AnimatedContainer>

        {/* Bottom Bar */}
        <AnimatedContainer delay={0.5} className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} {companyInfo.name}. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <a href="/termos" className="hover:text-primary transition-colors">
                Termos de Uso
              </a>
              <a href="/privacidade" className="hover:text-primary transition-colors">
                Política de Privacidade
              </a>
              <a href="/cookies" className="hover:text-primary transition-colors">
                Cookies
              </a>
            </div>
          </div>
        </AnimatedContainer>
      </div>
    </footer>
  );
}

export default TVDoutorFooter;
