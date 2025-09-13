import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";
import { SearchForm } from "@/components/landing/SearchForm";
import BenefitsSection from "@/components/landing/BenefitsSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FAQSection from "@/components/landing/FAQSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const LandingPage = () => {
  const { user, loading } = useAuth();

  console.log('🔍 [DEBUG] LandingPage render:', { 
    hasUser: !!user, 
    loading,
    userId: user?.id 
  });

  // Mostrar loading apenas se necessário, mas não bloquear a landing page
  if (loading) {
    console.log('🔍 [DEBUG] LandingPage: Mostrando loading...');
    return <LoadingScreen message="Carregando plataforma..." />;
  }

  console.log('🔍 [DEBUG] LandingPage: Renderizando landing page...');

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <HeroSection />
        
        {/* Seção de Busca - Nova funcionalidade */}
        <section className="container mx-auto px-4 lg:px-6 py-16">
          <div className="max-w-7xl mx-auto">
            <SearchForm />
          </div>
        </section>
        
        <BenefitsSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
