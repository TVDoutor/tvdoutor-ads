import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useRevenueData } from "@/hooks/useRevenueData";

interface RevenueChartProps {
  className?: string;
}

export const RevenueChart = ({ className }: RevenueChartProps) => {
  const { data, loading, error } = useRevenueData();

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}K`;
    }
    return `R$ ${value.toLocaleString('pt-BR')}`;
  };

  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'revenue') {
      return [formatCurrency(value), 'Faturamento'];
    }
    if (name === 'proposals') {
      return [value, 'Propostas'];
    }
    if (name === 'conversionRate') {
      return [`${value}%`, 'Taxa de Conversão'];
    }
    return [value, name];
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Faturamento Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              Carregando dados de faturamento...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Faturamento Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-destructive text-center">
              <p>Erro ao carregar dados</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Faturamento Mensal
          </CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <span className="text-muted-foreground">Faturamento</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-secondary rounded-full"></div>
              <span className="text-muted-foreground">Propostas</span>
            </div>
          </div>
        </div>
        
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(data.currentMonth)}
            </p>
            <p className="text-xs text-muted-foreground">Este Mês</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              {data.growth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${
                data.growth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {data.growth >= 0 ? '+' : ''}{data.growth}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">vs Mês Anterior</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-secondary">
              {data.totalProposals}
            </p>
            <p className="text-xs text-muted-foreground">Propostas</p>
          </div>
          
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">
              {data.conversionRate}%
            </p>
            <p className="text-xs text-muted-foreground">Conversão</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                yAxisId="revenue"
                orientation="left"
                className="text-xs"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <YAxis 
                yAxisId="proposals"
                orientation="right"
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={formatTooltipValue}
                labelFormatter={(label) => `Mês: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
              />
              <Line
                yAxisId="proposals"
                type="monotone"
                dataKey="proposals"
                stroke="hsl(var(--secondary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--secondary))', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: 'hsl(var(--secondary))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Additional Info */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Ticket Médio: {formatCurrency(data.averageTicket)}</span>
            <span>Período: Últimos 12 meses</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
