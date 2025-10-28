import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Clock, 
  Activity,
  History,
  RefreshCw,
  TrendingUp,
  CalendarDays,
  Search,
  User,
  MapPin,
  Monitor,
  Zap
} from 'lucide-react';
import { userSessionService, type OnlineUsersStats, type SessionHistory } from '@/lib/user-session-service';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserSessionDashboardProps {
  className?: string;
}

export const UserSessionDashboard: React.FC<UserSessionDashboardProps> = ({ className }) => {
  const [onlineStats, setOnlineStats] = useState<OnlineUsersStats | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Verificar permissões e carregar dados
  useEffect(() => {
    checkPermissionsAndLoadData();
    
    // DESABILITADO: Auto-refresh causando sobrecarga
    // const interval = setInterval(() => {
    //   if (isSuperAdmin) {
    //     loadOnlineStats();
    //   }
    // }, 30000);

    // return () => clearInterval(interval);
  }, [isSuperAdmin]);

  const checkPermissionsAndLoadData = async () => {
    try {
      const hasPermission = await userSessionService.isSuperAdmin();
      setIsSuperAdmin(hasPermission);
      
      if (hasPermission) {
        await Promise.allSettled([
          loadOnlineStats(),
          loadSessionHistory()
        ]);
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      toast.error('Erro ao carregar dados do monitor');
    } finally {
      setIsLoading(false);
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
      const history = await userSessionService.getSessionHistory({
        searchTerm: searchTerm.trim() || undefined
      });
      setSessionHistory(history);
    } catch (error) {
      console.error('Erro ao carregar histórico de sessões:', error);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadOnlineStats(), loadSessionHistory()]);
      toast.success('Dados atualizados com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  const getAverageDuration = () => {
    if (!onlineStats || onlineStats.sessions_data.length === 0) return 0;
    const total = onlineStats.sessions_data.reduce((sum, session) => sum + (session.duration_minutes || 0), 0);
    return Math.round(total / onlineStats.sessions_data.length);
  };

  const filteredSessions = onlineStats?.sessions_data.filter(session =>
    searchTerm === '' || 
    session.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className={`h-full flex flex-col space-y-6 ${className || ''}`}>
      {/* Monitor Header */}
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Monitor de Usuários</CardTitle>
                <CardDescription>Acompanhe usuários online e histórico de sessões</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdate && (
                <div className="text-xs text-muted-foreground">
                  Última atualização: {format(lastUpdate, "HH:mm:ss", { locale: ptBR })}
                </div>
              )}
              <Button
                onClick={handleRefresh}
                disabled={isLoading}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Usuários Online */}
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-green-900">
                Usuários Online
              </CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {isLoading ? <Skeleton className="h-9 w-16" /> : (onlineStats?.total_online || 0)}
            </div>
            <p className="text-xs text-green-600 mt-1">Sessões ativas no momento</p>
          </CardContent>
        </Card>

        {/* Tempo Médio Online */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-900">
                Tempo Médio Online
              </CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">
              {isLoading ? <Skeleton className="h-9 w-20" /> : formatDuration(getAverageDuration())}
            </div>
            <p className="text-xs text-blue-600 mt-1">Duração média das sessões</p>
          </CardContent>
        </Card>

        {/* Sessões Hoje */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-purple-900">
                Sessões Hoje
              </CardTitle>
              <CalendarDays className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">
              {isLoading ? <Skeleton className="h-9 w-12" /> : 0}
            </div>
            <p className="text-xs text-purple-600 mt-1">Total de sessões iniciadas hoje</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <Tabs defaultValue="online" className="h-full flex flex-col">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <TabsList className="grid w-[400px] grid-cols-2">
                <TabsTrigger value="online" className="gap-2">
                  <Zap className="h-4 w-4" />
                  Usuários Online ({filteredSessions.length})
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="h-4 w-4" />
                  Histórico de Sessões
                </TabsTrigger>
              </TabsList>
              
              {/* Search Bar */}
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 min-h-0 pt-6">
            {/* Tab: Usuários Online */}
            <TabsContent value="online" className="h-full mt-0">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="p-4 bg-muted rounded-full">
                    <Users className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Nenhum usuário online</h3>
                    <p className="text-sm text-muted-foreground">
                      Não há usuários conectados no momento.
                    </p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-3">
                    {filteredSessions.map((session, index) => (
                      <Card key={session.user_id + index} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              {/* Avatar */}
                              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full text-white font-semibold text-lg">
                                {session.full_name ? session.full_name[0].toUpperCase() : session.email[0].toUpperCase()}
                              </div>
                              
                              {/* User Info */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-base">
                                    {session.full_name || session.email.split('@')[0]}
                                  </h4>
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                    <div className="h-2 w-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                                    Online
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{session.email}</p>
                              </div>
                            </div>

                            {/* Session Details */}
                            <div className="flex items-center gap-6 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>{formatDuration(session.duration_minutes || 0)}</span>
                              </div>
                              
                              {session.ip_address && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <MapPin className="h-4 w-4" />
                                  <span className="font-mono text-xs">{session.ip_address}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Additional Info */}
                          <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Monitor className="h-3 w-3" />
                              <span className="truncate max-w-md">
                                {session.user_agent?.split(' ')[0] || 'Navegador desconhecido'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span>Iniciou: {format(new Date(session.started_at), "HH:mm:ss", { locale: ptBR })}</span>
                              <span>Última atividade: {format(new Date(session.last_seen_at), "HH:mm:ss", { locale: ptBR })}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* Tab: Histórico de Sessões */}
            <TabsContent value="history" className="h-full mt-0">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : sessionHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="p-4 bg-muted rounded-full">
                    <History className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Nenhum histórico disponível</h3>
                    <p className="text-sm text-muted-foreground">
                      O histórico de sessões aparecerá aqui quando houver dados.
                    </p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-3">
                    {sessionHistory.map((session, index) => (
                      <Card key={session.user_id + session.started_at + index} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-10 h-10 bg-muted rounded-full text-sm font-medium">
                                {session.full_name ? session.full_name[0].toUpperCase() : session.email[0].toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">
                                  {session.full_name || session.email.split('@')[0]}
                                </h4>
                                <p className="text-xs text-muted-foreground">{session.email}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-6 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                <span>{format(new Date(session.started_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatDuration(session.duration_minutes || 0)}</span>
                              </div>
                              {session.ended_by && (
                                <Badge variant="secondary" className="text-xs">
                                  {session.ended_by}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};
