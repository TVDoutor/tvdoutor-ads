import { Monitor, MapPin, FileText, TrendingUp, Users, Calendar, Plus, Eye } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsCard } from "@/components/StatsCard";
import { RecentProposals } from "@/components/RecentProposals";
import { EmailStatsCard } from "@/components/EmailStatsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import heroBanner from "@/assets/hero-banner.jpg";
import dashboardPreview from "@/assets/dashboard-preview.jpg";

const Index = () => {
  console.log('📊 Dashboard Index component loading...');
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  console.log('🔐 Auth status:', { isAdmin: isAdmin() });
  


  const statsData = [
    {
      title: "Telas Ativas",
      value: 1247,
      change: { value: 12, label: "este mês" },
      icon: Monitor,
      variant: "primary" as const,
      onClick: () => navigate("/mapa-interativo")
    },
    {
      title: "Propostas Ativas",
      value: 89,
      change: { value: 8, label: "esta semana" },
      icon: FileText,
      variant: "secondary" as const,
      onClick: () => navigate("/nova-proposta")
    },
    {
      title: "Faturamento",
      value: "R$ 2.4M",
      change: { value: 15, label: "este mês" },
      icon: TrendingUp,
      variant: "accent" as const
    },
    {
      title: "Cidades",
      value: 45,
      change: { value: 3, label: "novas cidades" },
      icon: MapPin,
      variant: "default" as const,
      onClick: () => navigate("/mapa-interativo")
    }
  ];

  const handleCreateProposal = () => {
    navigate("/nova-proposta");
  };

  const handleViewInventory = () => {
    navigate("/inventory");
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "create-proposal":
        navigate("/nova-proposta");
        break;
      case "manage-inventory":
        navigate("/inventory");
        break;
      case "explore-map":
        navigate("/mapa-interativo");
        break;
      default:
        break;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Hero Section */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-hero p-8 text-white">
          <div className="absolute inset-0">
            <img 
              src={heroBanner} 
              alt="Digital advertising platform" 
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-secondary/80" />
          </div>
          
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Bem-vindo ao TV Doutor ADS
            </h1>
            <p className="text-lg text-white/90 mb-6">
              Plataforma completa para gestão de inventário DOOH (Digital Out-of-Home). 
              Crie propostas, gerencie campanhas e monitore resultados.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="accent" 
                size="lg" 
                className="gap-2 hover:scale-105 transition-transform"
                onClick={handleCreateProposal}
              >
                <Plus className="h-5 w-5" />
                Nova Proposta
              </Button>
              <Button 
                variant="soft" 
                size="lg" 
                className="gap-2 hover:scale-105 transition-transform"
                onClick={handleViewInventory}
              >
                <Eye className="h-5 w-5" />
                Ver Inventário
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsData.map((stat, index) => (
            <div key={index} onClick={stat.onClick} className={stat.onClick ? "cursor-pointer" : ""}>
              <StatsCard
                title={stat.title}
                value={stat.value}
                change={stat.change}
                icon={stat.icon}
                variant={stat.variant}
              />
            </div>
          ))}
        </div>

        {/* Quick Actions & Recent Proposals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-12 hover:bg-primary/5 transition-colors"
                onClick={() => handleQuickAction("create-proposal")}
              >
                <FileText className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Criar Nova Proposta</p>
                  <p className="text-sm text-muted-foreground">Wizard passo-a-passo</p>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-12 hover:bg-secondary/5 transition-colors"
                onClick={() => handleQuickAction("manage-inventory")}
              >
                <Monitor className="h-5 w-5 text-secondary" />
                <div className="text-left">
                  <p className="font-medium">Gerenciar Inventário</p>
                  <p className="text-sm text-muted-foreground">Telas e disponibilidade</p>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-12 hover:bg-accent/5 transition-colors"
                onClick={() => handleQuickAction("explore-map")}
              >
                <MapPin className="h-5 w-5 text-accent" />
                <div className="text-left">
                  <p className="font-medium">Explorar Mapa</p>
                  <p className="text-sm text-muted-foreground">Visualização geográfica</p>
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Proposals */}
          <RecentProposals limit={4} />
        </div>

        {/* Admin Email Stats */}
        {isAdmin() && (
          <EmailStatsCard />
        )}

        {/* Platform Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              Visão Geral da Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">
                  Gestão Completa de DOOH
                </h3>
                <p className="text-muted-foreground">
                  Nossa plataforma oferece todas as ferramentas necessárias para 
                  gerenciar seu inventário de mídia digital, desde a criação de 
                  propostas até o acompanhamento de campanhas.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm">Wizard de propostas inteligente</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-secondary" />
                    <span className="text-sm">Mapa interativo com geolocalização</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-accent" />
                    <span className="text-sm">Relatórios e analytics avançados</span>
                  </li>
                </ul>
                <div className="flex gap-3">
                  <Button variant="hero" className="gap-2" onClick={handleCreateProposal}>
                    <Plus className="h-4 w-4" />
                    Criar Proposta
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={handleViewInventory}>
                    <Eye className="h-4 w-4" />
                    Ver Mapa
                  </Button>
                </div>
              </div>
              
              <div className="rounded-lg overflow-hidden shadow-soft">
                <img 
                  src={dashboardPreview} 
                  alt="Dashboard preview" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Index;