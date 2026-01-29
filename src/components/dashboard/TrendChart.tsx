import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProposalsTrend } from "@/hooks/useRealProposals";

interface TrendDataPoint {
  date: string;
  revenue: number;
  proposals: number;
}

interface TrendChartProps {
  granularity?: 'daily' | 'weekly' | 'monthly';
  onGranularityChange?: (granularity: 'daily' | 'weekly' | 'monthly') => void;
}

export const TrendChart = ({ 
  granularity = 'daily',
  onGranularityChange 
}: TrendChartProps) => {
  const { data: trendData, isLoading, error } = useProposalsTrend();
  const [activeGranularity, setActiveGranularity] = useState(granularity);

  const handleGranularityChange = (newGranularity: 'daily' | 'weekly' | 'monthly') => {
    setActiveGranularity(newGranularity);
    onGranularityChange?.(newGranularity);
  };

  // Usar dados reais ou fallback vazio
  const data = trendData || [];

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Receita e Propostas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Receita e Propostas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-center justify-center text-gray-500">
            <p>Erro ao carregar dados de tendência</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Receita e Propostas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-center justify-center text-gray-500">
            <p>Nenhum dado disponível para o período selecionado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const revenueValues = data.map(d => d.revenue);
  const proposalsValues = data.map(d => d.proposals);
  const maxRevenue = Math.max(1, ...revenueValues);
  const maxProposals = Math.max(1, ...proposalsValues);
  const n = data.length;
  const denom = n <= 1 ? 1 : n - 1;

  const generatePath = (values: number[], max: number, height: number = 160) => {
    return values
      .map((value, index) => {
        const x = (index / denom) * 100;
        const y = height - (value / max) * (height - 20);
        return `${Number.isFinite(x) ? x : 0},${Number.isFinite(y) ? y : height}`;
      })
      .join(' ');
  };

  const revenuePoints = generatePath(revenueValues, maxRevenue);
  const proposalsPoints = generatePath(proposalsValues, maxProposals);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Tendência de Receita e Propostas
          </CardTitle>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(['daily', 'weekly', 'monthly'] as const).map((period) => (
              <Button
                key={period}
                variant="ghost"
                size="sm"
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md",
                  activeGranularity === period
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-600 hover:text-gray-900"
                )}
                onClick={() => handleGranularityChange(period)}
              >
                {period === 'daily' ? 'Diário' : period === 'weekly' ? 'Semanal' : 'Mensal'}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Gráfico SVG */}
          <div className="h-40 w-full relative">
            <svg className="w-full h-full" viewBox="0 0 100 160">
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={20 + (y * 1.2)}
                  x2="100"
                  y2={20 + (y * 1.2)}
                  stroke="#f1f5f9"
                  strokeWidth="0.5"
                />
              ))}
              
              {/* Receita Line */}
              <polyline
                points={revenuePoints}
                fill="none"
                stroke="#f97316"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Propostas Line */}
              <polyline
                points={proposalsPoints}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Data points */}
              {data.map((_, index) => {
                const x = (index / denom) * 100;
                const revenueY = 160 - (data[index].revenue / maxRevenue) * 140;
                const proposalsY = 160 - (data[index].proposals / maxProposals) * 140;
                const cx = Number.isFinite(x) ? x : 50;
                const rY = Number.isFinite(revenueY) ? revenueY : 20;
                const pY = Number.isFinite(proposalsY) ? proposalsY : 20;
                return (
                  <g key={index}>
                    <circle cx={cx} cy={rY} r="3" fill="#f97316" stroke="white" strokeWidth="2" />
                    <circle cx={cx} cy={pY} r="3" fill="#3b82f6" stroke="white" strokeWidth="2" />
                  </g>
                );
              })}
            </svg>
            
            {/* Y-axis labels - Receita */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 py-2">
              <span>R$ {(maxRevenue / 1000).toFixed(0)}K</span>
              <span>R$ {(maxRevenue * 0.75 / 1000).toFixed(0)}K</span>
              <span>R$ {(maxRevenue * 0.5 / 1000).toFixed(0)}K</span>
              <span>R$ {(maxRevenue * 0.25 / 1000).toFixed(0)}K</span>
              <span>R$ 0</span>
            </div>

            {/* Y-axis labels - Propostas */}
            <div className="absolute right-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 py-2">
              <span>{Math.round(maxProposals)}</span>
              <span>{Math.round(maxProposals * 0.75)}</span>
              <span>{Math.round(maxProposals * 0.5)}</span>
              <span>{Math.round(maxProposals * 0.25)}</span>
              <span>0</span>
            </div>
          </div>
          
          {/* X-axis labels */}
          <div className="flex justify-between text-xs text-gray-500 mt-2 px-4">
            {data.map((point, index) => (
              <span key={index}>{point.date}</span>
            ))}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-orange-500 rounded"></div>
              <span className="text-sm text-gray-600">Receita</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-600">Propostas</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};