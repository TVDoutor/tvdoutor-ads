import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Clock, 
  Monitor, 
  MapPin, 
  RefreshCw, 
  Shield,
  Activity,
  History,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { userSessionService, type OnlineUsersStats, type SessionHistory } from '@/lib/user-session-service';
import { toast } from 'sonner';

interface UserSessionDashboardProps {
  className?: string;
}

export const UserSessionDashboard: React.FC<UserSessionDashboardProps> = ({ className }) => {
  const [onlineStats, setOnlineStats] = useState<OnlineUsersStats | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Verificar permissões e carregar dados
  useEffect(() => {
    checkPermissionsAndLoadData();
    
    // Atualizar dados a cada 30 segundos
    const interval = setInterval(() => {
      if (isSuperAdmin) {
        loadOnlineStats();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isSuperAdmin]);

  const checkPermissionsAndLoadData = async () => {
    const hasPermission = await userSessionService.isSuperAdmin();
    setIsSuperAdmin(hasPermission);
    
    if (hasPermission) {
      await loadOnlineStats();
      await loadSessionHistory();
    }
  };

  const loadOnlineStats = async () => {
    try {
      const stats = await userSessionService.getOnlineUsersStats();
      setOnlineStats(stats);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao carregar estatísticas online:', error);
    }
  };

  const loadSessionHistory = async () => {
    try {
      const history = await userSessionService.getSessionHistory();
      setSessionHistory(history);
    } catch (error) {
      console.error('Erro ao carregar histórico de sessões:', error);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadOnlineStats(),
        loadSessionHistory()
      ]);
      toast.success('Dados atualizados com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanupExpired = async () => {
    try {
      const cleanedCount = await userSessionService.cleanupExpiredSessions();
      toast.success(`${cleanedCount} sessões expiradas foram limpas`);
      await handleRefresh();
    } catch (error) {
      toast.error('Erro ao limpar sessões expiradas');
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}min`;
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (endedBy?: string): string => {
    switch (endedBy) {
      case 'logout': return 'bg-green-100 text-green-800';
      case 'timeout': return 'bg-yellow-100 text-yellow-800';
      case 'forced': return 'bg-red-100 text-red-800';
      case 'system': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (endedBy?: string): string => {
    switch (endedBy) {
      case 'logout': return 'Logout Normal';
      case 'timeout': return 'Timeout';
      case 'forced': return 'Forçado';
      case 'system': return 'Sistema';
      default: return 'Ativo';
    }
  };

  // Se não for super admin, mostrar aviso
  if (!isSuperAdmin) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <Shield className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>Acesso Restrito:</strong> Esta funcionalidade está disponível apenas para Super Administradores.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Monitor de Usuários</h2>
          <p className="text-gray-600">Acompanhe usuários online e histórico de sessões</p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-sm text-gray-500">
              Última atualização: {formatDateTime(lastUpdate.toISOString())}
            </span>
          )}
          <Button 
            onClick={handleRefresh} 
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button 
            onClick={handleCleanupExpired}
            variant="outline"
            size="sm"
          >
            <Activity className="h-4 w-4 mr-2" />
            Limpar Expiradas
          </Button>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Online</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {onlineStats?.total_online || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Sessões ativas no momento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio Online</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {onlineStats?.sessions_data.length ? 
                formatDuration(
                  onlineStats.sessions_data.reduce((acc, session) => 
                    acc + session.duration_minutes, 0
                  ) / onlineStats.sessions_data.length
                ) : 
                '0 min'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Duração média das sessões
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessões Hoje</CardTitle>
            <History className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {sessionHistory.filter(session => {
                const today = new Date();
                const sessionDate = new Date(session.started_at);
                return sessionDate.toDateString() === today.toDateString();
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de sessões iniciadas hoje
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para Usuários Online e Histórico */}
      <Tabs defaultValue="online" className="space-y-4">
        <TabsList>
          <TabsTrigger value="online" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Usuários Online ({onlineStats?.total_online || 0})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de Sessões
          </TabsTrigger>
        </TabsList>

        {/* Usuários Online */}
        <TabsContent value="online" className="space-y-4">
          {onlineStats?.sessions_data.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum usuário online
                </h3>
                <p className="text-gray-500 text-center">
                  Não há usuários conectados no momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {onlineStats?.sessions_data.map((session, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {session.full_name || session.email}
                          </h4>
                          <p className="text-sm text-gray-500">{session.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Online
                        </Badge>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDuration(session.duration_minutes)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          Iniciou: {formatDateTime(session.started_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          Última atividade: {formatDateTime(session.last_seen_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          IP: {session.ip_address || 'Desconhecido'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Histórico de Sessões */}
        <TabsContent value="history" className="space-y-4">
          {sessionHistory.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <History className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum histórico disponível
                </h3>
                <p className="text-gray-500 text-center">
                  Não há histórico de sessões para exibir.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {sessionHistory.map((session, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <Monitor className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {session.full_name || session.email}
                          </h4>
                          <p className="text-sm text-gray-500">{session.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(session.ended_by)}>
                          {getStatusText(session.ended_by)}
                        </Badge>
                        {session.duration_minutes && (
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDuration(session.duration_minutes)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          Iniciou: {formatDateTime(session.started_at)}
                        </span>
                      </div>
                      {session.ended_at && (
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">
                            Finalizou: {formatDateTime(session.ended_at)}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
