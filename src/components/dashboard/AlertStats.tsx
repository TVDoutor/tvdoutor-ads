import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  X, 
  AlertTriangle, 
  Clock,
  RotateCcw
} from "lucide-react";
import { useAlertActions } from "@/hooks/useAlertActions";

interface AlertStatsProps {
  totalAlerts: number;
  criticalAlerts: number;
  className?: string;
}

export const AlertStats = ({ 
  totalAlerts, 
  criticalAlerts, 
  className 
}: AlertStatsProps) => {
  const { dismissedAlerts, clearDismissedAlerts } = useAlertActions();

  const activeAlerts = totalAlerts;
  const dismissedCount = dismissedAlerts.length;
  const totalProcessed = activeAlerts + dismissedCount;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Estatísticas de Alertas
          </span>
          {dismissedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDismissedAlerts}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Restaurar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Alertas Ativos */}
        <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">
              Alertas Ativos
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-orange-100 text-orange-700 border-orange-200">
              {activeAlerts}
            </Badge>
            {criticalAlerts > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                {criticalAlerts} críticos
              </Badge>
            )}
          </div>
        </div>

        {/* Alertas Dispensados */}
        {dismissedCount > 0 && (
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                Alertas Dispensados
              </span>
            </div>
            <Badge className="bg-gray-100 text-gray-700 border-gray-200">
              {dismissedCount}
            </Badge>
          </div>
        )}

        {/* Taxa de Resolução */}
        {totalProcessed > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Taxa de Processamento</span>
              <span className="font-medium">
                {Math.round((dismissedCount / totalProcessed) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min((dismissedCount / totalProcessed) * 100, 100)}%` 
                }}
              />
            </div>
          </div>
        )}

        {/* Status Summary */}
        <div className="text-xs text-gray-500 text-center pt-2">
          {criticalAlerts > 0 ? (
            <span className="text-red-600 font-medium">
              ⚠️ {criticalAlerts} alerta{criticalAlerts > 1 ? 's' : ''} crítico{criticalAlerts > 1 ? 's' : ''} requer{criticalAlerts === 1 ? '' : 'em'} atenção imediata
            </span>
          ) : activeAlerts > 0 ? (
            <span className="text-orange-600">
              📋 {activeAlerts} alerta{activeAlerts > 1 ? 's' : ''} ativo{activeAlerts > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-green-600">
              ✅ Nenhum alerta ativo
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};