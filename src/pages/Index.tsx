import { useState } from "react";
import { Monitor, MapPin, FileText, TrendingUp, Users, Calculator, Search } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatsCard } from "@/components/StatsCard";
import { RecentProposals } from "@/components/RecentProposals";
import { EmailStatsCard } from "@/components/EmailStatsCard";
import { GeospatialSearch } from "@/components/GeospatialSearch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudienceCalculator } from "@/components/landing/AudienceCalculator";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { type ScreenSearchResult } from "@/lib/search-service";
import heroBanner from "@/assets/hero-banner.jpg";
import dashboardPreview from "@/assets/dashboard-preview.jpg";


const Index = () => {
  console.log('📊 Dashboard Index component loading...');
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { stats, loading, error } = useDashboardStats();
  
  // Estado para busca geoespacial
  const [searchResults, setSearchResults] = useState<ScreenSearchResult[]>([]);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(5);
  

  
  // Safe admin check with fallback
  const isAdminUser = () => {
    try {
      return isAdmin && typeof isAdmin === 'function' ? isAdmin() : false;
    } catch (error) {
      console.warn('Erro ao verificar se usuário é admin:', error);
      return false;
    }
  };
  
  console.log('🔐 Auth status:', { isAdmin: isAdminUser() });
  console.log('📈 Dashboard stats:', { stats, loading, error });

  // Função para formatar valores monetários
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}K`;
    }
    return `R$ ${value.toLocaleString('pt-BR')}`;
  };

  const statsData = [
    {
      title: "Telas Ativas",
      value: loading ? "..." : stats.activeScreens.toLocaleString('pt-BR'),
      change: loading ? undefined : { value: stats.screenGrowth, label: "este mês" },
      icon: Monitor,
      variant: "primary" as const,
      onClick: () => navigate("/mapa-interativo")
    },
    {
      title: "Propostas Ativas",
      value: loading ? "..." : stats.activeProposals,
      change: loading ? undefined : { value: stats.proposalGrowth, label: "esta semana" },
      icon: FileText,
      variant: "secondary" as const,
      onClick: () => navigate("/nova-proposta")
    },
    {
      title: "Faturamento",
      value: loading ? "..." : formatCurrency(stats.totalRevenue),
      change: loading ? undefined : { value: stats.revenueGrowth, label: "este mês" },
      icon: TrendingUp,
      variant: "accent" as const
    },
    {
      title: "Cidades",
      value: loading ? "..." : stats.totalCities,
      change: loading ? undefined : { value: stats.cityGrowth, label: "novas cidades" },
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

  // Funções para busca geoespacial
  const handleSearchResults = (screens: ScreenSearchResult[], center: { lat: number; lng: number }, radius: number) => {
    setSearchResults(screens);
    setSearchCenter(center);
    setSearchRadius(radius);
    console.log('🔍 Resultados da busca geoespacial:', { screens: screens.length, center, radius });
  };

  const handleNavigateToMap = () => {
    // Navegar para o mapa com os resultados da busca
    if (searchCenter && searchResults.length > 0) {
      // Aqui você pode passar os parâmetros de busca para o mapa
      navigate("/mapa-interativo", { 
        state: { 
          searchResults, 
          center: searchCenter, 
          radius: searchRadius 
        } 
      });
    } else {
      navigate("/mapa-interativo");
    }
  };

  // Mostrar erro se houver
  if (error) {
    console.error('❌ Erro na dashboard:', error);
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Hero Section with V2.0 Features */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-hero p-8 text-white">
          <div className="absolute inset-0">
            <img 
              src={heroBanner} 
              alt="Digital advertising platform" 
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-secondary/80" />
          </div>
          
          <div className="relative z-10">
            <div className="max-w-2xl mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                Plataforma DOOH Self-Service
              </h1>
              <p className="text-lg text-white/90 mb-6">
                Descubra, simule e contrate mídia digital out-of-home de forma inteligente. 
                Segmente por especialidade médica e localize oportunidades próximas aos seus clientes.
              </p>
            </div>

            {/* V2.0 Interactive Tools */}
            <Tabs defaultValue="calculator" className="w-full">
              <TabsList className="bg-white/10 backdrop-blur-sm">
                <TabsTrigger value="calculator" className="data-[state=active]:bg-white/20">
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculadora de Alcance
                </TabsTrigger>
                <TabsTrigger value="search" className="data-[state=active]:bg-white/20">
                  <Search className="w-4 h-4 mr-2" />
                  Busca Geoespacial
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="calculator" className="mt-6">
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6">
                  <AudienceCalculator />
                </div>
              </TabsContent>
              
              <TabsContent value="search" className="mt-6">
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5 text-primary" />
                        Busca Geoespacial de Telas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-6">
                        Encontre telas digitais próximas ao seu endereço de interesse 
                        com cotação dinâmica em tempo real.
                      </p>
                      <GeospatialSearch 
                        onResults={handleSearchResults}
                        onNavigateToMap={handleNavigateToMap}
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
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

        {/* Error message if any */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive text-sm">
              ⚠️ Erro ao carregar dados: {error}
            </p>
          </div>
        )}

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
        {isAdminUser() && (
          <EmailStatsCard />
        )}

        {/* Platform Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Visão Geral da Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Gerencie seu inventário DOOH</h3>
                <p className="text-muted-foreground">
                  Controle completo sobre suas telas digitais, propostas comerciais e campanhas publicitárias. 
                  Monitore performance em tempo real e otimize seus resultados.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate("/mapa-interativo")}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Explorar Mapa
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate("/reports")}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Ver Relatórios
                  </Button>
                </div>
              </div>
              <div className="relative">
                <img 
                  src={dashboardPreview} 
                  alt="Dashboard preview" 
                  className="rounded-lg shadow-lg w-full h-auto"
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