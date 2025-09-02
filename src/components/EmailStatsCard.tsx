import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  Activity
} from "lucide-react";
import { emailService, type EmailStats } from "@/lib/email-service";
import { toast } from "sonner";

export const EmailStatsCard = () => {
  const [stats, setStats] = useState<EmailStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Adicionar timeout para evitar travamento
    const timeoutId = setTimeout(() => {
      fetchStats();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, []);

  const fetchStats = async () => {
    try {
      console.log('📧 Buscando estatísticas de email...');
      const data = await emailService.getEmailStats();
      setStats(data);
      console.log('✅ Estatísticas carregadas:', data.length, 'registros');
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas de email:', error);
      // Não mostrar toast de erro para não atrapalhar UX
      setStats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessEmails = async () => {
    setProcessing(true);
    try {
      const result = await emailService.processAllPendingEmails();
      
      if (result.processed > 0) {
        toast.success(
          `Emails processados: ${result.successful} enviados, ${result.failed} falharam`
        );
        fetchStats(); // Atualizar estatísticas
      } else {
        toast.info('Nenhum email pendente para processar');
      }
    } catch (error) {
      console.error('Erro ao processar emails:', error);
      toast.error('Erro ao processar emails');
    } finally {
      setProcessing(false);
    }
  };

  const getTotalByStatus = (status: string) => {
    return stats
      .filter(s => s.status === status)
      .reduce((sum, s) => sum + s.total, 0);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return CheckCircle;
      case 'failed': return XCircle;
      case 'pending': return Clock;
      default: return Mail;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Sistema de Email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalSent = getTotalByStatus('sent');
  const totalFailed = getTotalByStatus('failed');
  const totalPending = getTotalByStatus('pending');
  const totalEmails = totalSent + totalFailed + totalPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Sistema de Email
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm"
            onClick={handleProcessEmails}
            disabled={processing || totalPending === 0}
          >
            {processing ? (
              <Activity className="h-4 w-4 animate-pulse mr-1" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            Processar
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{totalEmails}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalSent}</div>
            <div className="text-xs text-muted-foreground">Enviados</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{totalPending}</div>
            <div className="text-xs text-muted-foreground">Pendentes</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{totalFailed}</div>
            <div className="text-xs text-muted-foreground">Falharam</div>
          </div>
        </div>

        {/* Detailed Stats */}
        {stats.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Detalhamento por Tipo
            </h4>
            {stats.map((stat, index) => {
              const StatusIcon = getStatusIcon(stat.status);
              const statusColor = getStatusColor(stat.status);
              
              return (
                <div
                  key={`${stat.email_type}-${stat.status}-${index}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-accent/20"
                >
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                    <span className="text-sm capitalize">
                      {stat.email_type.replace('_', ' ')}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {stat.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">
                      Hoje: <strong>{stat.today}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      7d: <strong>{stat.last_7_days}</strong>
                    </span>
                    <span className="font-medium">
                      Total: <strong>{stat.total}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {stats.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum email processado ainda</p>
          </div>
        )}

        {/* Status Indicator */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${
              totalPending > 0 ? 'bg-yellow-500' : 'bg-green-500'
            }`} />
            <span className="text-xs text-muted-foreground">
              {totalPending > 0 
                ? `${totalPending} emails na fila`
                : 'Sistema em dia'
              }
            </span>
          </div>
          
          <span className="text-xs text-muted-foreground">
            Auto-processamento ativo
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
