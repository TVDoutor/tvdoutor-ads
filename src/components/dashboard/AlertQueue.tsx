import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  X,
  FileText,
  AlertCircle,
  ExternalLink,
  WifiOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealAlerts, type RealAlert, type RealAlertGroup } from "@/hooks/useRealAlerts";
import { useAlertActions } from "@/hooks/useAlertActions";
import { AlertConfirmDialog } from "./AlertConfirmDialog";

interface AlertQueueProps {
  groups?: RealAlertGroup[];
  onBulkAction?: (action: string, alertIds: string[]) => void;
  onAlertClick?: (alert: RealAlert) => void;
}

const categoryIcons = {
  no_response_proposal: FileText,
  integration_error: AlertCircle,
  player_offline: WifiOff,
};

const severityConfig = {
  critical: { 
    icon: '🔴', 
    color: 'text-red-600', 
    bg: 'bg-red-50 border-l-red-500',
    badge: 'bg-red-100 text-red-700 border-red-200'
  },
  warning: { 
    icon: '🟡', 
    color: 'text-yellow-600', 
    bg: 'bg-yellow-50 border-l-yellow-500',
    badge: 'bg-yellow-100 text-yellow-700 border-yellow-200'
  },
  info: { 
    icon: '🔵', 
    color: 'text-blue-600', 
    bg: 'bg-blue-50 border-l-blue-500',
    badge: 'bg-blue-100 text-blue-700 border-blue-200'
  },
};

export const AlertQueue = ({ 
  groups: propGroups,
  onBulkAction,
  onAlertClick 
}: AlertQueueProps) => {
  const { data: realAlerts, isLoading, error } = useRealAlerts();
  const { 
    resolveAlert, 
    dismissAlert, 
    handleBulkAction, 
    filterDismissedAlerts 
  } = useAlertActions();
  
  // Filtrar alertas dispensados
  const filteredGroups = useMemo(() => {
    if (!realAlerts) return propGroups || [];
    
    return realAlerts.map(group => ({
      ...group,
      alerts: filterDismissedAlerts(group.alerts),
      count: filterDismissedAlerts(group.alerts).length,
      criticalCount: filterDismissedAlerts(group.alerts).filter(a => a.severity === 'critical').length
    }));
  }, [realAlerts, propGroups, filterDismissedAlerts]);
  
  const groups = propGroups || filteredGroups;
  const [activeTab, setActiveTab] = useState(groups[0]?.category || 'no_response_proposal');
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    alert: RealAlert | null;
    action: 'resolve' | 'dismiss';
  }>({
    open: false,
    alert: null,
    action: 'resolve',
  });

  const activeGroup = groups.find(g => g.category === activeTab);
  const totalAlerts = groups.reduce((sum, group) => sum + group.count, 0);
  const totalCritical = groups.reduce((sum, group) => sum + group.criticalCount, 0);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Central de Alertas
          </CardTitle>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Central de Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-gray-500">
            <p>Erro ao carregar alertas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const toggleAlertSelection = (alertId: string) => {
    setSelectedAlerts(prev => 
      prev.includes(alertId) 
        ? prev.filter(id => id !== alertId)
        : [...prev, alertId]
    );
  };

  const selectAllAlerts = () => {
    if (!activeGroup) return;
    const allIds = activeGroup.alerts.map(alert => alert.id);
    setSelectedAlerts(prev => 
      prev.length === allIds.length ? [] : allIds
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Central de Alertas
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-gray-50">
              {totalAlerts} alertas
            </Badge>
            <Badge className="bg-red-100 text-red-700 border-red-200">
              {totalCritical} críticos
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
          {groups.map((group) => {
            const IconComponent = categoryIcons[group.category] ?? AlertCircle;
            return (
              <Button
                key={group.category}
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-1 justify-start gap-2 relative",
                  activeTab === group.category
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-600 hover:text-gray-900"
                )}
                onClick={() => setActiveTab(group.category)}
              >
                <IconComponent className="h-4 w-4" />
                <span className="font-medium">{group.name}</span>
                <Badge className="ml-auto bg-gray-200 text-gray-700 text-xs">
                  {group.count}
                </Badge>
                {group.criticalCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </Button>
            );
          })}
        </div>

        {/* Bulk actions */}
        {activeGroup && activeGroup.alerts.length > 0 && (
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedAlerts.length === activeGroup.alerts.length}
                onCheckedChange={selectAllAlerts}
              />
              <span className="text-sm text-gray-600">
                Selecionar todos ({selectedAlerts.length} selecionados)
              </span>
            </div>
            
            {selectedAlerts.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allAlerts = groups.flatMap(g => g.alerts);
                    handleBulkAction('resolve', selectedAlerts, allAlerts);
                    onBulkAction?.('resolve', selectedAlerts);
                  }}
                  className="hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Resolver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allAlerts = groups.flatMap(g => g.alerts);
                    handleBulkAction('dismiss', selectedAlerts, allAlerts);
                    onBulkAction?.('dismiss', selectedAlerts);
                    setSelectedAlerts([]); // Limpar seleção após dispensar
                  }}
                  className="hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Dispensar
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Alert list */}
        <div className="space-y-3">
          {activeGroup?.alerts.map((alert) => {
            const config = severityConfig[alert.severity];
            return (
              <div
                key={alert.id}
                className={cn(
                  "border-l-4 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md",
                  config.bg,
                  selectedAlerts.includes(alert.id) && "ring-2 ring-orange-200"
                )}
                onClick={() => onAlertClick?.(alert)}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedAlerts.includes(alert.id)}
                    onCheckedChange={() => toggleAlertSelection(alert.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{config.icon}</span>
                        <h4 className="font-semibold text-gray-900">
                          {alert.title}
                        </h4>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-700">{alert.description}</span>
                      </div>
                      
                      <Badge className={config.badge}>
                        {alert.severity === 'critical' ? 'Crítico' : 
                         alert.severity === 'warning' ? 'Atenção' : 'Info'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{alert.slaDeadline}</span>
                      </div>
                      {alert.slaBreached && (
                        <Badge className="bg-red-100 text-red-700 text-xs">
                          SLA Vencido
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-700 bg-gray-50 rounded p-2 mb-3">
                      <strong>Ação recomendada:</strong> {alert.recommendedAction}
                    </p>
                    
                    {/* Botões de ação individual */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDialog({
                            open: true,
                            alert,
                            action: 'resolve',
                          });
                        }}
                        className="text-xs hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Resolver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDialog({
                            open: true,
                            alert,
                            action: 'dismiss',
                          });
                        }}
                        className="text-xs hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Dispensar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {activeGroup?.alerts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum alerta nesta categoria</p>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Dialog de confirmação */}
      <AlertConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        alert={confirmDialog.alert}
        action={confirmDialog.action}
        onConfirm={() => {
          if (confirmDialog.alert) {
            if (confirmDialog.action === 'resolve') {
              resolveAlert(confirmDialog.alert);
              onAlertClick?.(confirmDialog.alert);
            } else {
              dismissAlert(confirmDialog.alert.id);
            }
          }
          setConfirmDialog({ open: false, alert: null, action: 'resolve' });
        }}
      />
    </Card>
  );
};