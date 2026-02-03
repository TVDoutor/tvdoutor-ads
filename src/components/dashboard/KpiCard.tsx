import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: number | string;
  delta?: number;
  target?: number;
  targetLabel?: string;
  sparklineData?: number[];
  format?: 'number' | 'currency' | 'percent';
  className?: string;
}

const Sparkline = ({ data }: { data: number[] }) => {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 80;
    const y = range === 0 ? 16 : 32 - ((value - min) / range) * 24;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="w-20 h-8" viewBox="0 0 80 32">
      <polyline
        points={points}
        fill="none"
        stroke="#f97316"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const formatValue = (value: number | string, format: 'number' | 'currency' | 'percent' = 'number') => {
  if (typeof value === 'string') return value;
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    default:
      return new Intl.NumberFormat('pt-BR').format(value);
  }
};

export const KpiCard = ({
  title,
  value,
  delta,
  target,
  targetLabel,
  sparklineData,
  format = 'number',
  className
}: KpiCardProps) => {
  const getTrendIcon = () => {
    if (delta === undefined || delta === 0) return <Minus className="h-3 w-3" />;
    return delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (delta === undefined || delta === 0) return "text-gray-500";
    return delta > 0 ? "text-green-600" : "text-red-600";
  };

  const getProgressPercentage = () => {
    if (!target || typeof value === 'string') return 0;
    return Math.min((value / target) * 100, 100);
  };

  return (
    <Card className={cn("kpi-card", className)}>
      <CardContent className="p-6">
        {/* Header com título e sparkline */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          {sparklineData && <Sparkline data={sparklineData} />}
        </div>

        {/* Valor principal */}
        <div className="mb-2">
          <p className="text-3xl font-bold text-gray-900">
            {formatValue(value, format)}
          </p>
        </div>

        {/* Delta (variação) */}
        {delta !== undefined && (
          <div className={cn("flex items-center gap-1 text-sm mb-3", getTrendColor())}>
            {getTrendIcon()}
            <span className="font-medium">
              {delta > 0 ? '+' : ''}{delta.toFixed(1)}% vs período anterior
            </span>
          </div>
        )}

        {/* Barra de progresso vs meta */}
        {target && typeof value === 'number' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Meta mensal</span>
              <span>{targetLabel || formatValue(target, format)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const KpiStrip = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
      {children}
    </div>
  );
};