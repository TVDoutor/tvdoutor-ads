import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown } from "lucide-react";
import { useRealFunnelData } from "@/hooks/useRealProposals";

interface FunnelStage {
  name: string;
  value: number;
  color?: string;
}

interface FunnelWidgetProps {
  // Props opcionais para override dos dados reais
  stages?: FunnelStage[];
  overallConversion?: number;
}

export const FunnelWidget = ({ 
  stages: propStages, 
  overallConversion: propConversion 
}: FunnelWidgetProps) => {
  const { data: funnelData, isLoading, error } = useRealFunnelData();
  
  // Usar dados reais ou props como fallback
  const stages = propStages || funnelData?.stages || [];
  const overallConversion = propConversion ?? funnelData?.overallConversion ?? 0;

  // Loading state
  if (isLoading) {
    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Funil de Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Funil de Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-gray-500">
            <p>Erro ao carregar dados do funil</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (stages.length === 0) {
    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Funil de Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-gray-500">
            <p>Nenhum dado disponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  // Calcular drop-off entre estágios
  const getDropOffPercentage = (currentValue: number, previousValue: number) => {
    if (previousValue === 0) return 0;
    return Math.round(((previousValue - currentValue) / previousValue) * 100);
  };

  // Calcular largura relativa de cada estágio
  const getStageWidth = (value: number, maxValue: number) => {
    return Math.max((value / maxValue) * 100, 20); // Mínimo de 20% para visibilidade
  };

  const maxValue = Math.max(...stages.map(s => s.value));

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Funil de Conversão
          </CardTitle>
          <Badge className="bg-green-100 text-green-700 border-green-200">
            {overallConversion.toFixed(1)}% conversão total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.map((stage, index) => {
          const stageWidth = getStageWidth(stage.value, maxValue);
          const dropOff = index > 0 ? getDropOffPercentage(stage.value, stages[index - 1].value) : 0;
          
          return (
            <div key={index} className="space-y-2">
              {/* Drop-off indicator */}
              {index > 0 && (
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-1 text-sm text-red-600 bg-red-50 px-2 py-1 rounded-full">
                    <TrendingDown className="h-3 w-3" />
                    <span className="font-medium">-{dropOff}%</span>
                  </div>
                </div>
              )}
              
              {/* Stage box */}
              <div className="relative">
                <div 
                  className={`
                    border-2 rounded-lg p-4 transition-all duration-300 hover:shadow-md
                    ${stage.color || 'bg-gray-100 border-gray-200'}
                  `}
                  style={{ 
                    width: `${stageWidth}%`,
                    marginLeft: `${(100 - stageWidth) / 2}%`
                  }}
                >
                  <div className="text-center">
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">
                      {stage.name}
                    </h4>
                    <p className="text-2xl font-bold text-gray-900">
                      {stage.value.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Drop-off analysis */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h5 className="font-semibold text-gray-900 mb-3 text-sm">
            Principais Motivos de Drop-off
          </h5>
          <div className="space-y-2">
            {[
              { reason: "Preço elevado", percentage: 37.8 },
              { reason: "Prazo inadequado", percentage: 24.0 },
              { reason: "Sem resposta", percentage: 22.6 },
              { reason: "Concorrência", percentage: 15.6 },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{item.reason}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-400 h-2 rounded-full"
                      style={{ width: `${(item.percentage / 40) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-10">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};