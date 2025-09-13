import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";
import { SearchInterface } from "@/components/landing/SearchInterface";
import { MapView } from "@/components/landing/MapView";
import BenefitsSection from "@/components/landing/BenefitsSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FAQSection from "@/components/landing/FAQSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import { type ScreenSearchResult } from "@/lib/search-service";

const LandingPage = () => {
  const { loading } = useAuth();
  const [searchResults, setSearchResults] = useState<ScreenSearchResult[]>([]);
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(5);

  // Mostrar loading apenas se necessário, mas não bloquear a landing page
  if (loading) {
    return <LoadingScreen message="Carregando plataforma..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <HeroSection />
        
        {/* Seção de Busca - Layout de Duas Colunas */}
        <section className="container mx-auto px-4 lg:px-6 py-16">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 h-[800px]">
              {/* Coluna Esquerda - Busca e Resultados */}
              <div className="flex flex-col">
                <SearchInterface
                  onSearchResults={setSearchResults}
                  onLocationChange={setSearchLocation}
                  onRadiusChange={setSearchRadius}
                />
              </div>
              
              {/* Coluna Direita - Mapa */}
              <div className="relative">
                <MapView
                  screens={searchResults}
                  centerLat={searchLocation?.lat || -23.550520}
                  centerLng={searchLocation?.lng || -46.633308}
                  radiusKm={searchRadius}
                />
              </div>
            </div>
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
