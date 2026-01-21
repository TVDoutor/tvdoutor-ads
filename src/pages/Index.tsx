import { useState } from "react";
import { 
  Monitor, MapPin, FileText, TrendingUp, Users, 
  Activity, DollarSign, Eye, Zap, Target, 
  ArrowUpRight, ArrowDownRight, Sparkles, 
  BarChart3, PieChart, Clock, Calendar, Plus,
  AlertTriangle, Stethoscope, Settings, Package
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RecentProposals } from "@/components/RecentProposals";
import { EmailStatsCard } from "@/components/EmailStatsCard";
import { RevenueChart } from "@/components/RevenueChart";
import { ConversionRateCard } from "@/components/ConversionRateCard";
import { ExecutiveSummary } from "@/components/ExecutiveSummary";
import { AlertsCenter } from "@/components/AlertsCenter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStatsWithFallback } from "@/hooks/useDashboardStats";

const Index = () => {
  const navigate = useNavigate();
  const { isAdmin, profile } = useAuth();
  const { data: stats, isLoading: loading, error } = useDashboardStatsWithFallback();
  
  // Safe admin check with fallback
  const isAdminUser = () => {
    try {
      return isAdmin && typeof isAdmin === 'function' ? isAdmin() : false;
    } catch (error) {
      return false;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        {/* Hero Section com Gradiente Animado */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#f48220] via-[#ff9d4d] to-[#ffb87a] p-8 md:p-12 mb-8">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
          <div className="absolute inset-x-0 top-0 h-[180px] bg-gradient-to-br from-[#f48220]/95 via-[#ff9d4d]/85 to-transparent" />
          
          {/* Floating Orbs Animation */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#ff9d4d]/25 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#ffb87a]/25 rounded-full blur-3xl animate-pulse delay-1000" />
          
          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 shadow-2xl">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                      Dashboard
                    </h1>
                    <p className="text-white/90 text-lg font-medium">
                      Visão Completa do Sistema
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-1">
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm hover:bg-white/30 transition-all">
                    <Clock className="h-3 w-3 mr-1" />
                    Atualizado agora
                  </Badge>
                  <Badge className="bg-green-500/20 text-white border-green-400/30 backdrop-blur-sm hover:bg-green-500/30 transition-all">
                    <Activity className="h-3 w-3 mr-1 animate-pulse" />
                    Sistema Online
                  </Badge>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => navigate('/nova-proposta')}
                  size="lg"
                  className="bg-white text-[#f48220] hover:bg-white/90 shadow-2xl hover:shadow-white/50 hover:scale-105 transition-all duration-300 font-bold group"
                >
                  <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                  Nova Proposta
                </Button>
                <Button
                  onClick={() => navigate('/mapa-interativo')}
                  size="lg"
                  variant="outline"
                  className="bg-white/10 text-white border-white/30 backdrop-blur-sm hover:bg-white/20 hover:scale-105 transition-all duration-300 font-bold"
                >
                  <MapPin className="h-5 w-5 mr-2" />
                  Mapa
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-12 space-y-8">
          {/* KPI Cards com Design Moderno */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 - Propostas Totais */}
            <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-[#f48220] to-[#e67516]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#ff9d4d]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +12%
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <p className="text-white/80 text-sm font-medium">Total de Propostas</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black text-white">
                      {loading ? "..." : (stats?.proposals?.total || 0)}
                    </h3>
                    <span className="text-white/60 text-sm">propostas</span>
                  </div>
                </div>
                
                <Button
                  onClick={() => navigate('/propostas')}
                  variant="ghost"
                  className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white border-0 group/btn"
                >
                  Ver Todas
                  <ArrowUpRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            {/* Card 2 - Propostas Aceitas */}
            <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-[#ff9d4d] to-[#ffb87a]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#ffc499]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    +8%
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <p className="text-white/80 text-sm font-medium">Propostas Aceitas</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black text-white">
                      {loading ? "..." : (stats?.proposals?.accepted || 0)}
                    </h3>
                    <span className="text-white/60 text-sm">fechadas</span>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-white/70">Taxa de Conversão</span>
                  <span className="text-white font-bold">{loading ? "..." : `${stats?.proposals?.conversionRate || 0}%`}</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 3 - Agências Ativas */}
            <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-[#d66912] to-[#b85a0f]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#e67516]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {loading ? "0" : (stats?.agencies?.recent || 0)} novas
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <p className="text-white/80 text-sm font-medium">Agências Ativas</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black text-white">
                      {loading ? "..." : (stats?.agencies?.active || 0)}
                    </h3>
                    <span className="text-white/60 text-sm">parceiros</span>
                  </div>
                </div>
                
                <Button
                  onClick={() => navigate('/gerenciamento-projetos')}
                  variant="ghost"
                  className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white border-0 group/btn"
                >
                  Gerenciar
                  <ArrowUpRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            {/* Card 4 - Projetos Ativos */}
            <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-[#ffb87a] to-[#ffc499]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#ffd4b8]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
              
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                    <Monitor className="h-6 w-6 text-white" />
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    <Zap className="h-3 w-3 mr-1" />
                    Ativo
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <p className="text-white/80 text-sm font-medium">Projetos Ativos</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black text-white">
                      {loading ? "..." : (stats?.projects?.active || 0)}
                    </h3>
                    <span className="text-white/60 text-sm">em andamento</span>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-white/70">Concluídos</span>
                  <span className="text-white font-bold">{loading ? "..." : (stats?.projects?.completed || 0)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Executive Summary */}
          <ExecutiveSummary />

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueChart />
            <ConversionRateCard />
          </div>

          {/* Alerts Center */}
          <AlertsCenter />

          {/* Recent Proposals & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentProposals limit={6} />
            </div>
            
            {/* Quick Actions Card */}
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-slate-50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-[#f48220]" />
                  Ações Rápidas
                </CardTitle>
                <CardDescription>Acesso rápido às principais funcionalidades</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 h-14 hover:bg-[#f48220]/5 hover:border-[#f48220] transition-all group"
                  onClick={() => navigate("/nova-proposta")}
                >
                  <div className="p-2 bg-[#f48220]/10 rounded-lg group-hover:scale-110 transition-transform">
                    <FileText className="h-5 w-5 text-[#f48220]" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold">Criar Nova Proposta</p>
                    <p className="text-xs text-muted-foreground">Wizard passo-a-passo</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 h-14 hover:bg-[#ff9d4d]/5 hover:border-[#ff9d4d] transition-all group"
                  onClick={() => navigate("/inventory")}
                >
                  <div className="p-2 bg-[#ff9d4d]/10 rounded-lg group-hover:scale-110 transition-transform">
                    <Monitor className="h-5 w-5 text-[#ff9d4d]" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold">Gerenciar Inventário</p>
                    <p className="text-xs text-muted-foreground">Telas e disponibilidade</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 h-14 hover:bg-[#d66912]/5 hover:border-[#d66912] transition-all group"
                  onClick={() => navigate("/mapa-interativo")}
                >
                  <div className="p-2 bg-[#d66912]/10 rounded-lg group-hover:scale-110 transition-transform">
                    <MapPin className="h-5 w-5 text-[#d66912]" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold">Explorar Mapa</p>
                    <p className="text-xs text-muted-foreground">Visualização geográfica</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 h-14 hover:bg-[#ffb87a]/5 hover:border-[#ffb87a] transition-all group"
                  onClick={() => navigate("/reports")}
                >
                  <div className="p-2 bg-[#ffb87a]/10 rounded-lg group-hover:scale-110 transition-transform">
                    <BarChart3 className="h-5 w-5 text-[#ffb87a]" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold">Ver Relatórios</p>
                    <p className="text-xs text-muted-foreground">Análises e métricas</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Admin Email Stats */}
          {isAdminUser() && (
            <EmailStatsCard />
          )}

          {/* Error message if any */}
          {error && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-destructive/10 rounded-lg">
                    <Activity className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-semibold text-destructive">Erro ao carregar dados</p>
                    <p className="text-sm text-destructive/80">{error?.message || 'Erro desconhecido'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
