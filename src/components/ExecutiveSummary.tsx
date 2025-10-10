import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Users, 
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";
import { useRevenueData } from "@/hooks/useRevenueData";
import { useDashboardStats } from "@/hooks/useDashboardStats";

interface ExecutiveSummaryProps {
  className?: string;
}

export const ExecutiveSummary = ({ className }: ExecutiveSummaryProps) => {
  const { data: revenueData, loading: revenueLoading } = useRevenueData();
  const { stats, loading: statsLoading } = useDashboardStats();

  const loading = revenueLoading || statsLoading;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}K`;
    }
    return `R$ ${value.toLocaleString('pt-BR')}`;
  };

  const getPerformanceStatus = (value: number, threshold: number) => {
    if (value >= threshold) {
      return { 
        status: 'good', 
        icon: CheckCircle, 
        color: 'text-green-600', 
        bg: 'bg-green-100',
        label: 'Bom'
      };
    } else if (value >= threshold * 0.7) {
      return { 
        status: 'warning', 
        icon: Clock, 
        color: 'text-yellow-600', 
        bg: 'bg-yellow-100',
        label: 'Atenção'
      };
    } else {
      return { 
        status: 'critical', 
        icon: AlertTriangle, 
        color: 'text-red-600', 
        bg: 'bg-red-100',
        label: 'Crítico'
      };
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Resumo Executivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const revenueStatus = getPerformanceStatus(revenueData.currentMonth, 50000);
  const conversionStatus = getPerformanceStatus(revenueData.conversionRate, 20);
  const screensStatus = getPerformanceStatus(stats.activeScreens, 100);
  const proposalsStatus = getPerformanceStatus(stats.activeProposals, 10);

  const kpis = [
    {
      title: "Faturamento Mensal",
      value: formatCurrency(revenueData.currentMonth),
      change: revenueData.growth,
      status: revenueStatus,
      icon: DollarSign,
      description: "Receita total do mês atual"
    },
    {
      title: "Taxa de Conversão",
      value: `${revenueData.conversionRate}%`,
      change: 0, // Could be calculated vs previous month
      status: conversionStatus,
      icon: Target,
      description: "Propostas aceitas vs total"
    },
    {
      title: "Telas Ativas",
      value: stats.activeScreens.toLocaleString('pt-BR'),
      change: stats.screenGrowth,
      status: screensStatus,
      icon: MapPin,
      description: "Inventário disponível"
    },
    {
      title: "Propostas Ativas",
      value: stats.activeProposals.toString(),
      change: stats.proposalGrowth,
      status: proposalsStatus,
      icon: Users,
      description: "Oportunidades em andamento"
    }
  ];

  const criticalIssues = [];
  const warnings = [];

  if (revenueData.currentMonth < 50000) {
    criticalIssues.push("Faturamento abaixo da meta mensal");
  }
  if (revenueData.conversionRate < 15) {
    criticalIssues.push("Taxa de conversão muito baixa");
  }
  if (stats.activeScreens < 100) {
    warnings.push("Inventário de telas limitado");
  }
  if (stats.activeProposals < 5) {
    warnings.push("Poucas propostas em andamento");
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Resumo Executivo
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Visão geral dos principais indicadores de performance
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kpis.map((kpi, index) => {
            const StatusIcon = kpi.status.icon;
            return (
              <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <kpi.icon className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-sm">{kpi.title}</h3>
                  </div>
                  <Badge className={`${kpi.status.bg} ${kpi.status.color} border-0 text-xs`}>
                    {kpi.status.label}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{kpi.value}</span>
                    {kpi.change !== 0 && (
                      <div className={`flex items-center gap-1 text-sm ${
                        kpi.change >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {kpi.change >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span>{Math.abs(kpi.change)}%</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{kpi.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Alerts Section */}
        {(criticalIssues.length > 0 || warnings.length > 0) && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Alertas Importantes
            </h4>
            
            {criticalIssues.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Crítico</span>
                </div>
                <ul className="space-y-1">
                  {criticalIssues.map((issue, index) => (
                    <li key={index} className="text-sm text-red-700">• {issue}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {warnings.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">Atenção</span>
                </div>
                <ul className="space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index} className="text-sm text-yellow-700">• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Performance Summary */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">Status Geral</h4>
              <p className="text-xs text-muted-foreground">
                {criticalIssues.length === 0 && warnings.length === 0 
                  ? "Todos os indicadores dentro do esperado"
                  : `${criticalIssues.length} crítico(s), ${warnings.length} atenção`
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              {criticalIssues.length === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <span className={`text-sm font-medium ${
                criticalIssues.length === 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {criticalIssues.length === 0 ? 'Saudável' : 'Atenção Necessária'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t">
          <h4 className="font-semibold text-sm mb-3">Ações Recomendadas</h4>
          <div className="space-y-2">
            {criticalIssues.length > 0 && (
              <div className="text-sm text-muted-foreground">
                • Revisar estratégia de vendas e precificação
              </div>
            )}
            {revenueData.conversionRate < 20 && (
              <div className="text-sm text-muted-foreground">
                • Analisar processo de follow-up com clientes
              </div>
            )}
            {stats.activeScreens < 100 && (
              <div className="text-sm text-muted-foreground">
                • Expandir inventário de telas disponíveis
              </div>
            )}
            {stats.activeProposals < 5 && (
              <div className="text-sm text-muted-foreground">
                • Intensificar prospecção de novos clientes
              </div>
            )}
            {criticalIssues.length === 0 && warnings.length === 0 && (
              <div className="text-sm text-muted-foreground">
                • Manter estratégia atual e focar em crescimento
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
