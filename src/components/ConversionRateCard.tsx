import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, TrendingDown, Users, CheckCircle, Clock, XCircle } from "lucide-react";
import { useRevenueData } from "@/hooks/useRevenueData";

interface ConversionRateCardProps {
  className?: string;
}

export const ConversionRateCard = ({ className }: ConversionRateCardProps) => {
  const { data, loading, error } = useRevenueData();

  const getConversionStatus = (rate: number) => {
    if (rate >= 30) return { status: 'excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (rate >= 20) return { status: 'good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (rate >= 10) return { status: 'average', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { status: 'poor', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const getConversionLabel = (rate: number) => {
    if (rate >= 30) return 'Excelente';
    if (rate >= 20) return 'Bom';
    if (rate >= 10) return 'Médio';
    return 'Baixo';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Taxa de Conversão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
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
            <Target className="h-5 w-5 text-primary" />
            Taxa de Conversão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">Erro ao carregar dados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const conversionStatus = getConversionStatus(data.conversionRate);
  const conversionLabel = getConversionLabel(data.conversionRate);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Taxa de Conversão
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Conversion Rate */}
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4">
            {/* Background Circle */}
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(data.conversionRate / 100) * 251.2} 251.2`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            
            {/* Percentage Text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={`text-3xl font-bold ${conversionStatus.color}`}>
                  {data.conversionRate}%
                </div>
                <div className="text-xs text-muted-foreground">
                  Conversão
                </div>
              </div>
            </div>
          </div>
          
          <Badge className={`${conversionStatus.bg} ${conversionStatus.color} border-0`}>
            {conversionLabel}
          </Badge>
        </div>

        {/* Conversion Details */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-accent/20 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  {Math.round((data.conversionRate / 100) * data.totalProposals)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Aceitas</p>
            </div>
            
            <div className="text-center p-3 bg-accent/20 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">
                  {data.totalProposals - Math.round((data.conversionRate / 100) * data.totalProposals)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Rejeitadas</p>
            </div>
          </div>

          {/* Total Proposals */}
          <div className="text-center p-3 bg-primary/5 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-lg font-bold text-primary">
                {data.totalProposals}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Total de Propostas</p>
          </div>
        </div>

        {/* Performance Indicator */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Performance:</span>
            <div className="flex items-center gap-1">
              {data.conversionRate >= 20 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={`font-medium ${
                data.conversionRate >= 20 ? 'text-green-600' : 'text-red-600'
              }`}>
                {data.conversionRate >= 20 ? 'Acima da média' : 'Abaixo da média'}
              </span>
            </div>
          </div>
        </div>

        {/* Tips */}
        {data.conversionRate < 20 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              💡 <strong>Dica:</strong> Considere revisar o processo de vendas ou 
              ajustar os preços para melhorar a taxa de conversão.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
