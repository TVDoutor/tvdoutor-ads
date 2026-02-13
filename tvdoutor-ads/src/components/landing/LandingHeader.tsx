import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const LandingHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full medical-gradient flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">TV</span>
            </div>
            <span className="text-xl font-bold text-foreground">TV Doutor Ads</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => scrollToSection('beneficios')}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Benefícios
            </button>
            <button 
              onClick={() => scrollToSection('como-funciona')}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Como Funciona
            </button>
            <button 
              onClick={() => scrollToSection('faq')}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              FAQ
            </button>
            <a 
              href="#" 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Casos de Sucesso
            </a>
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="default" asChild>
              <Link to="/login">Fazer Login</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-4">
              <button 
                onClick={() => scrollToSection('beneficios')}
                className="text-left text-muted-foreground hover:text-primary transition-colors py-2"
              >
                Benefícios
              </button>
              <button 
                onClick={() => scrollToSection('como-funciona')}
                className="text-left text-muted-foreground hover:text-primary transition-colors py-2"
              >
                Como Funciona
              </button>
              <button 
                onClick={() => scrollToSection('faq')}
                className="text-left text-muted-foreground hover:text-primary transition-colors py-2"
              >
                FAQ
              </button>
              <a 
                href="#" 
                className="text-muted-foreground hover:text-primary transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Casos de Sucesso
              </a>
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                <Button variant="default" className="justify-start" asChild>
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>Fazer Login</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default LandingHeader;
