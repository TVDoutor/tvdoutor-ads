import { supabase } from '@/integrations/supabase/client';

export interface UserSession {
  user_id: string;
  email: string;
  full_name: string;
  started_at: string;
  last_seen_at: string;
  duration_minutes: number;
  ip_address?: string;
  user_agent?: string;
}

export interface SessionHistory {
  user_id: string;
  email: string;
  full_name: string;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  ended_by?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface SessionHistoryFilters {
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

export interface OnlineUsersStats {
  total_online: number;
  sessions_data: UserSession[];
}

class UserSessionService {
  private sessionToken: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 segundos
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos

  /**
   * Inicializar sessão do usuário
   */
  async initializeSession(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('👤 Usuário não autenticado, não criando sessão');
        return false;
      }

      // Gerar token de sessão único
      this.sessionToken = this.generateSessionToken();
      
      // Obter informações do navegador
      const userAgent = navigator.userAgent;
      const ipAddress = await this.getClientIP();
      
      // Calcular tempo de expiração
      const expiresAt = new Date(Date.now() + this.SESSION_TIMEOUT);
      
      // Inserir sessão no banco
      const { error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          session_token: this.sessionToken,
          ip_address: ipAddress,
          user_agent: userAgent,
          expires_at: expiresAt.toISOString(),
          is_active: true
        });

      if (error) {
        console.error('❌ Erro ao criar sessão:', error);
        return false;
      }

      console.log('✅ Sessão de usuário inicializada');
      
      // Iniciar heartbeat
      this.startHeartbeat();
      
      // Limpar sessão ao fechar a página
      this.setupBeforeUnload();
      
      return true;
    } catch (error) {
      console.error('💥 Erro ao inicializar sessão:', error);
      return false;
    }
  }

  /**
   * Atualizar última atividade do usuário
   */
  async updateLastSeen(): Promise<boolean> {
    if (!this.sessionToken) return false;

    try {
      const { error } = await supabase.rpc('update_user_last_seen', {
        p_session_token: this.sessionToken
      });

      if (error) {
        console.error('❌ Erro ao atualizar last_seen:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('💥 Erro ao atualizar last_seen:', error);
      return false;
    }
  }

  /**
   * Finalizar sessão do usuário
   */
  async endSession(): Promise<boolean> {
    if (!this.sessionToken) return false;

    try {
      // Parar heartbeat
      this.stopHeartbeat();

      // Mover para histórico e remover da tabela ativa
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('session_token', this.sessionToken);

      if (error) {
        console.error('❌ Erro ao finalizar sessão:', error);
        return false;
      }

      // Inserir no histórico
      await supabase
        .from('user_session_history')
        .insert({
          session_token: this.sessionToken,
          ended_by: 'logout'
        });

      this.sessionToken = null;
      console.log('✅ Sessão de usuário finalizada');
      
      return true;
    } catch (error) {
      console.error('💥 Erro ao finalizar sessão:', error);
      return false;
    }
  }

  /**
   * Obter estatísticas de usuários online (apenas para super admins)
   */
  async getOnlineUsersStats(): Promise<OnlineUsersStats | null> {
    try {
      const { data, error } = await supabase.rpc('get_online_users_stats');

      if (error) {
        console.error('❌ Erro ao obter estatísticas de usuários online:', error);
        return null;
      }

      return data?.[0] || { total_online: 0, sessions_data: [] };
    } catch (error) {
      console.error('💥 Erro ao obter estatísticas de usuários online:', error);
      return null;
    }
  }

  /**
   * Obter histórico de sessões (apenas para super admins)
   */
  async getSessionHistory(filters?: SessionHistoryFilters): Promise<SessionHistory[]> {
    try {
      // Construir query base
      let query = supabase
        .from('user_session_history')
        .select(`
          user_id,
          email,
          full_name,
          started_at,
          ended_at,
          duration_minutes,
          ended_by,
          ip_address,
          user_agent
        `)
        .order('ended_at', { ascending: false });

      // Filtrar por período
      if (filters.startDate || filters.endDate) {
        const startDate = filters.startDate ? new Date(filters.startDate) : null;
        const endDate = filters.endDate ? new Date(filters.endDate) : null;

        mockData = mockData.filter(session => {
          const sessionDate = new Date(session.started_at);
          
          if (startDate && sessionDate < startDate) return false;
          if (endDate && sessionDate > endDate) return false;
          
          return true;
        });
      }

      // Filtrar por termo de busca
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        mockData = mockData.filter(session => 
          session.email.toLowerCase().includes(searchTerm) ||
          (session.full_name && session.full_name.toLowerCase().includes(searchTerm))
        );
      }

      console.log('📊 Histórico de sessões filtrado:', {
        total: mockData.length,
        filters
      });

      return mockData;
    } catch (error) {
      console.error('💥 Erro ao obter histórico de sessões:', error);
      return [];
    }
  }

  /**
   * Dados mockados para demonstração do histórico de sessões
   */
  private getMockSessionHistory(): SessionHistory[] {
    const now = new Date();
    const users = [
      { id: '1', email: 'hildebrando.cardoso@tvdoctor.com.br', full_name: 'Hildebrando Cardoso' },
      { id: '2', email: 'admin@tvdoctor.com.br', full_name: 'Administrador' },
      { id: '3', email: 'user@tvdoctor.com.br', full_name: 'Usuário Teste' },
      { id: '4', email: 'manager@tvdoctor.com.br', full_name: 'Gerente' },
      { id: '5', email: 'analyst@tvdoctor.com.br', full_name: 'Analista' }
    ];

    const sessions: SessionHistory[] = [];
    
    // Gerar sessões para os últimos 30 dias
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const user = users[Math.floor(Math.random() * users.length)];
      
      // 1-3 sessões por dia por usuário
      const sessionsPerDay = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < sessionsPerDay; j++) {
        const startTime = new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000);
        const durationMinutes = Math.floor(Math.random() * 180) + 30; // 30min a 3.5h
        const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
        
        sessions.push({
          user_id: user.id,
          email: user.email,
          full_name: user.full_name,
          started_at: startTime.toISOString(),
          ended_at: endTime.toISOString(),
          duration_minutes: durationMinutes,
          ended_by: 'logout',
          ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        });
      }
    }

    return sessions.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }

  /**
   * Limpar sessões expiradas
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_sessions');

      if (error) {
        console.error('❌ Erro ao limpar sessões expiradas:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('💥 Erro ao limpar sessões expiradas:', error);
      return 0;
    }
  }

  /**
   * Iniciar heartbeat para manter sessão ativa
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      await this.updateLastSeen();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Parar heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Configurar limpeza ao fechar a página
   */
  private setupBeforeUnload(): void {
    const handleBeforeUnload = () => {
      // Usar sendBeacon para garantir que a requisição seja enviada
      if (this.sessionToken && navigator.sendBeacon) {
        const data = new FormData();
        data.append('session_token', this.sessionToken);
        data.append('ended_by', 'page_close');
        
        // Enviar requisição de finalização de sessão
        fetch('/api/end-session', {
          method: 'POST',
          body: data,
          keepalive: true
        }).catch(console.error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
  }

  /**
   * Gerar token de sessão único
   */
  private generateSessionToken(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `sess_${timestamp}_${random}`;
  }

  /**
   * Obter IP do cliente (aproximado)
   */
  private async getClientIP(): Promise<string | null> {
    try {
      // Tentar obter IP através de serviço público
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || null;
    } catch {
      // Fallback para IP local ou desconhecido
      return 'unknown';
    }
  }

  /**
   * Verificar se usuário é super admin
   */
  async isSuperAdmin(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }
}

export const userSessionService = new UserSessionService();
