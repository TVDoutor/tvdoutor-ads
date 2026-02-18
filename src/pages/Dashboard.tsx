import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { PageHeader, buttonStyles } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, RefreshCw, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardStatsWithFallback } from "@/hooks/useDashboardStats";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import { useRealKPIs } from "@/hooks/useRealKPIs";
import { useFilteredProposals, useFilteredStats } from "@/hooks/useFilteredData";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FilterBar,
  KpiCard,
  KpiStrip,
  TrendChart,
  FunnelWidget,
  AlertQueue,
  ProposalsTable,
  QuickActions,
  type DashboardFilters
} from "@/components/dashboard";
import { FilterIndicator } from "@/components/dashboard/FilterIndicator";
import { AlertStats } from "@/components/dashboard/AlertStats";
import "@/styles/design-tokens.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { data: stats, isLoading: loading } = useDashboardStatsWithFallback();
  const { data: kpis, isLoading: kpisLoading } = useRealKPIs();
  const { filters, setFilters, applyFilters, resetFilters } = useDashboardFilters();
  
  // Dados filtrados
  const { data: filteredProposals, isLoading: filteredLoading } = useFilteredProposals(filters);
  const { stats: filteredStats, isLoading: statsLoading } = useFilteredStats(filters);

  const handleFiltersChange = (newFilters: DashboardFilters) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    console.log('🔄 Aplicando filtros:', filters);
    applyFilters();
    // Invalidar queries para forçar atualização
    queryClient.invalidateQueries({ queryKey: ['filtered-proposals'] });
    queryClient.invalidateQueries({ queryKey: ['real-kpis'] });
    
    // Toast baseado nos resultados
    setTimeout(() => {
      const proposalsCount = filteredProposals?.length || 0;
      if (proposalsCount === 0) {
        toast.info("Nenhuma proposta encontrada para os filtros aplicados");
      } else {
        toast.success(`Filtros aplicados! ${proposalsCount} ${proposalsCount === 1 ? 'proposta encontrada' : 'propostas encontradas'}`);
      }
    }, 1000);
  };

  const handleResetFilters = () => {
    console.log('🔄 Resetando filtros');
    resetFilters();
    // Invalidar queries para forçar atualização
    queryClient.invalidateQueries({ queryKey: ['filtered-proposals'] });
    queryClient.invalidateQueries({ queryKey: ['real-kpis'] });
    toast.info("Filtros resetados");
  };

  const handleRefreshData = () => {
    console.log('🔄 Atualizando dados...');
    queryClient.invalidateQueries();
    toast.success("Dados atualizados!");
  };

  const handleRemoveFilter = (key: keyof DashboardFilters) => {
    const newFilters = { ...filters };
    if (key === 'dateRange') {
      newFilters[key] = '30days';
      newFilters.customDateRange = undefined; // Limpar período personalizado
    } else if (key === 'proposals') {
      newFilters[key] = 'all';
    } else {
      newFilters[key] = undefined;
    }
    setFilters(newFilters);
    handleApplyFilters();
  };

  const handleClearAllFilters = () => {
    handleResetFilters();
  };

  if (loading || kpisLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
            <p className="text-gray-600">Carregando dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Page Header - mesmo estilo laranja com cantos arredondados do Inventário */}
        <PageHeader
          title="Dashboard"
          subtitle="Visão Completa do Sistema"
          icon={LayoutDashboard}
          badge={{ label: "Atualizado agora", color: "bg-white/20 text-white border-white/30" }}
          actions={
            <>
              <Button
                onClick={() => navigate('/nova-proposta')}
                className={buttonStyles.primary}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Proposta
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/mapa-interativo')}
                className={buttonStyles.secondary}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Mapa
              </Button>
              <Button
                variant="outline"
                onClick={handleRefreshData}
                className={buttonStyles.secondary}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </>
          }
        />

        {/* Filter Bar */}
        <FilterBar 
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
        />

        {/* Filter Indicator */}
        <FilterIndicator 
          filters={filters}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
        />

        {/* Main Content */}
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* KPI Cards */}
            <KpiStrip className="mb-6">
              {filteredStats ? (
                // KPIs baseados nos dados filtrados
                <>
                  <KpiCard
                    title="Total de Propostas"
                    value={filteredStats.total}
                    format="number"
                    className={statsLoading ? "opacity-50" : ""}
                  />
                  <KpiCard
                    title="Propostas Aceitas"
                    value={filteredStats.accepted}
                    format="number"
                    className={statsLoading ? "opacity-50" : ""}
                  />
                  <KpiCard
                    title="Taxa de Conversão"
                    value={filteredStats.conversionRate}
                    format="percent"
                    className={statsLoading ? "opacity-50" : ""}
                  />
                  <KpiCard
                    title="Receita Total"
                    value={filteredStats.totalRevenue}
                    format="currency"
                    className={statsLoading ? "opacity-50" : ""}
                  />
                </>
              ) : kpis && kpis.length > 0 ? (
                // KPIs originais se filtrados não estiverem disponíveis
                kpis.map((kpi) => (
                  <KpiCard
                    key={kpi.id}
                    title={kpi.title}
                    value={kpi.currentValue}
                    delta={kpi.delta}
                    target={kpi.target}
                    sparklineData={kpi.sparkline}
                    format={kpi.format}
                  />
                ))
              ) : (
                // Fallback para dados básicos
                <>
                  <KpiCard
                    title="Total de Propostas"
                    value={stats?.totalProposals || 0}
                    format="number"
                  />
                  <KpiCard
                    title="Propostas Aceitas"
                    value={stats?.acceptedProposals || 0}
                    format="number"
                  />
                  <KpiCard
                    title="Taxa de Conversão"
                    value={stats?.proposals?.conversionRate || 0}
                    format="percent"
                  />
                  <KpiCard
                    title="Agências Ativas"
                    value={stats?.totalAgencies || 0}
                    format="number"
                  />
                </>
              )}
            </KpiStrip>

            {/* Main Grid Layout */}
            <div className="dashboard-grid-2-1 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Trend Chart */}
                <TrendChart />

                {/* Alerts */}
                <AlertQueue />

                {/* Proposals Table */}
                <ProposalsTable 
                  proposals={filteredProposals}
                  limit={20}
                />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Funnel Widget - usando dados reais */}
                <FunnelWidget />

                {/* Alert Stats */}
                <AlertStats 
                  totalAlerts={stats?.activeScreens || 0}
                  criticalAlerts={2} // TODO: Calcular baseado em dados reais
                />

                {/* Quick Actions */}
                <QuickActions />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;