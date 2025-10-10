import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle,
  FileText,
  MapPin,
  Users,
  DollarSign,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  category: 'proposal' | 'screen' | 'user' | 'system' | 'revenue';
  priority: 'high' | 'medium' | 'low';
  actionRequired?: boolean;
  actionUrl?: string;
}

interface AlertsCenterProps {
  className?: string;
}

export const AlertsCenter = ({ className }: AlertsCenterProps) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts();
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar propostas próximas do vencimento
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('proposals')
        .select('id, customer_name, created_at, status')
        .in('status', ['enviada', 'em_analise'])
        .order('created_at', { ascending: false })
        .limit(10);

      // Buscar telas inativas
      const { data: screensData, error: screensError } = await supabase
        .from('screens')
        .select('id, display_name, city, active')
        .eq('active', false)
        .limit(10);

      const alertsList: Alert[] = [];

      // Alertas de propostas
      if (proposalsData) {
        proposalsData.forEach(proposal => {
          const daysSinceCreated = Math.floor(
            (new Date().getTime() - new Date(proposal.created_at).getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceCreated >= 7 && proposal.status === 'enviada') {
            alertsList.push({
              id: `proposal-${proposal.id}`,
              type: 'warning',
              title: 'Proposta sem resposta',
              message: `Proposta #${proposal.id} para ${proposal.customer_name} aguarda resposta há ${daysSinceCreated} dias`,
              timestamp: proposal.created_at,
              category: 'proposal',
              priority: 'high',
              actionRequired: true,
              actionUrl: '/propostas'
            });
          }
        });
      }

      // Alertas de telas
      if (screensData) {
        screensData.forEach(screen => {
          alertsList.push({
            id: `screen-${screen.id}`,
            type: 'error',
            title: 'Tela inativa',
            message: `Tela ${screen.display_name} em ${screen.city} está inativa`,
            timestamp: new Date().toISOString(),
            category: 'screen',
            priority: 'medium',
            actionRequired: true,
            actionUrl: '/inventory'
          });
        });
      }

      // Alertas de sistema (simulados)
      alertsList.push({
        id: 'system-email',
        type: 'info',
        title: 'Sistema de email',
        message: 'Sistema de email funcionando normalmente',
        timestamp: new Date().toISOString(),
        category: 'system',
        priority: 'low',
        actionRequired: false
      });

      // Ordenar por prioridade e timestamp
      alertsList.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      setAlerts(alertsList);

    } catch (err) {
      console.error('Erro ao buscar alertas:', err);
      setError('Erro ao carregar alertas');
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error': return XCircle;
      case 'warning': return AlertTriangle;
      case 'success': return CheckCircle;
      case 'info': return Bell;
      default: return Bell;
    }
  };

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'error': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'success': return 'text-green-600 bg-green-100';
      case 'info': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: Alert['category']) => {
    switch (category) {
      case 'proposal': return FileText;
      case 'screen': return MapPin;
      case 'user': return Users;
      case 'revenue': return DollarSign;
      case 'system': return Bell;
      default: return Bell;
    }
  };

  const getPriorityColor = (priority: Alert['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleDismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const handleRefresh = () => {
    fetchAlerts();
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Centro de Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const highPriorityAlerts = alerts.filter(alert => alert.priority === 'high');
  const mediumPriorityAlerts = alerts.filter(alert => alert.priority === 'medium');
  const lowPriorityAlerts = alerts.filter(alert => alert.priority === 'low');

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Centro de Alertas
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {alerts.length} alerta{alerts.length !== 1 ? 's' : ''} ativo{alerts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum alerta ativo</p>
            <p className="text-sm text-muted-foreground">Sistema funcionando normalmente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* High Priority Alerts */}
            {highPriorityAlerts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-red-600 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Crítico ({highPriorityAlerts.length})
                </h4>
                {highPriorityAlerts.map(alert => {
                  const AlertIcon = getAlertIcon(alert.type);
                  const CategoryIcon = getCategoryIcon(alert.category);
                  return (
                    <div key={alert.id} className="p-3 border border-red-200 bg-red-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertIcon className="h-5 w-5 text-red-600 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-medium text-sm text-red-800">{alert.title}</h5>
                            <Badge className="text-xs bg-red-200 text-red-800 border-0">
                              {alert.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-red-700 mb-2">{alert.message}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-red-600">
                              {formatDistanceToNow(new Date(alert.timestamp), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </span>
                            <div className="flex gap-2">
                              {alert.actionRequired && alert.actionUrl && (
                                <Button size="sm" variant="outline" className="text-xs">
                                  Ver Detalhes
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-xs text-red-600 hover:text-red-800"
                                onClick={() => handleDismissAlert(alert.id)}
                              >
                                Dispensar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Medium Priority Alerts */}
            {mediumPriorityAlerts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-yellow-600 flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  Atenção ({mediumPriorityAlerts.length})
                </h4>
                {mediumPriorityAlerts.map(alert => {
                  const AlertIcon = getAlertIcon(alert.type);
                  const CategoryIcon = getCategoryIcon(alert.category);
                  return (
                    <div key={alert.id} className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-medium text-sm text-yellow-800">{alert.title}</h5>
                            <Badge className="text-xs bg-yellow-200 text-yellow-800 border-0">
                              {alert.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-yellow-700 mb-2">{alert.message}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-yellow-600">
                              {formatDistanceToNow(new Date(alert.timestamp), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </span>
                            <div className="flex gap-2">
                              {alert.actionRequired && alert.actionUrl && (
                                <Button size="sm" variant="outline" className="text-xs">
                                  Ver Detalhes
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-xs text-yellow-600 hover:text-yellow-800"
                                onClick={() => handleDismissAlert(alert.id)}
                              >
                                Dispensar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Low Priority Alerts */}
            {lowPriorityAlerts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-green-600 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Informativo ({lowPriorityAlerts.length})
                </h4>
                {lowPriorityAlerts.map(alert => {
                  const AlertIcon = getAlertIcon(alert.type);
                  const CategoryIcon = getCategoryIcon(alert.category);
                  return (
                    <div key={alert.id} className="p-3 border border-green-200 bg-green-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertIcon className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-medium text-sm text-green-800">{alert.title}</h5>
                            <Badge className="text-xs bg-green-200 text-green-800 border-0">
                              {alert.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-green-700 mb-2">{alert.message}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-green-600">
                              {formatDistanceToNow(new Date(alert.timestamp), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </span>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-xs text-green-600 hover:text-green-800"
                              onClick={() => handleDismissAlert(alert.id)}
                            >
                              Dispensar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        {alerts.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {highPriorityAlerts.length} crítico(s), {mediumPriorityAlerts.length} atenção, {lowPriorityAlerts.length} informativo(s)
              </span>
              <span className="text-muted-foreground">
                Atualizado {formatDistanceToNow(new Date(), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
