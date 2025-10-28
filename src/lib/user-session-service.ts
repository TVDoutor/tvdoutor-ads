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
      console.log('🔵 [initializeSession] Iniciando...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ [initializeSession] Erro ao obter usuário:', userError);
        return false;
      }
      
      if (!user) {
        console.log('👤 [initializeSession] Usuário não autenticado, não criando sessão');
        return false;
      }

      console.log('✅ [initializeSession] Usuário autenticado:', { userId: user.id, email: user.email });

      // Gerar token de sessão único
      this.sessionToken = this.generateSessionToken();
      console.log('🎫 [initializeSession] Token de sessão gerado:', this.sessionToken);
      
      // Obter informações do navegador
      const userAgent = navigator.userAgent;
      const ipAddress = await this.getClientIP();
      console.log('🌐 [initializeSession] IP obtido:', ipAddress);
      
      // Calcular tempo de expiração
      const expiresAt = new Date(Date.now() + this.SESSION_TIMEOUT);
      console.log('⏰ [initializeSession] Expira em:', expiresAt.toISOString());
      
      // Inserir sessão no banco
      console.log('💾 [initializeSession] Inserindo no banco...');
      const insertData: any = {
        user_id: user.id,
        session_token: this.sessionToken,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString(),
        is_active: true
      };
      
      // Adicionar ip_address apenas se for válido (não 'unknown')
      if (ipAddress && ipAddress !== 'unknown') {
        insertData.ip_address = ipAddress;
      }
      
      console.log('📦 [initializeSession] Dados para inserir:', insertData);
      
      const { data: insertedData, error } = await supabase
        .from('user_sessions')
        .insert(insertData)
        .select();

      if (error) {
        console.error('❌ [initializeSession] Erro ao criar sessão:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return false;
      }

      console.log('✅ [initializeSession] Sessão criada no banco:', insertedData);
      console.log('✅ Sessão de usuário inicializada com sucesso!');
      
      // Iniciar heartbeat
      this.startHeartbeat();
      console.log('💓 [initializeSession] Heartbeat iniciado');
      
      // Limpar sessão ao fechar a página
      this.setupBeforeUnload();
      console.log('🚪 [initializeSession] BeforeUnload configurado');
      
      return true;
    } catch (error) {
      console.error('💥 [initializeSession] Erro crítico:', error);
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
      // Buscar sessões ativas diretamente (evita depender de RPC)
      const nowISO = new Date().toISOString();
      const { data: sessions, error } = await supabase
        .from('user_sessions')
        .select('user_id, started_at, last_seen_at, ip_address, user_agent, expires_at, is_active')
        .eq('is_active', true as any)
        .gt('expires_at', nowISO);

      if (error) {
        console.error('❌ Erro ao consultar user_sessions:', error);
        // Fallback: Edge Function com Service Role
        const { data: efData, error: efError } = await supabase.functions.invoke('user-sessions', {
          body: { action: 'online' }
        });
        if (efError) {
          console.error('❌ Fallback edge function (online) falhou:', efError);
          return { total_online: 0, sessions_data: [] };
        }
        return efData as OnlineUsersStats;
      }

      const rows = sessions || [];
      if (rows.length === 0) return { total_online: 0, sessions_data: [] };

      // Enriquecer com perfis para email/nome
      const uniqueUserIds = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean)));
      let profilesMap = new Map<string, { email: string; full_name: string }>();
      if (uniqueUserIds.length > 0) {
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', uniqueUserIds);
        if (!pErr) {
          for (const p of profiles || []) {
            profilesMap.set(p.id, { email: p.email, full_name: p.full_name });
          }
        } else {
          console.warn('⚠️ Erro ao enriquecer perfis em getOnlineUsersStats:', pErr);
        }
      }

      const sessions_data: UserSession[] = rows.map((r: any) => {
        const profile = profilesMap.get(r.user_id) || { email: '', full_name: '' };
        const started = r.started_at || r.last_seen_at || new Date().toISOString();
        const durationMinutes = Math.max(0, Math.floor((Date.now() - new Date(started).getTime()) / 60000));
        return {
          user_id: r.user_id,
          email: profile.email,
          full_name: profile.full_name,
          started_at: started,
          last_seen_at: r.last_seen_at || started,
          duration_minutes: durationMinutes,
          ip_address: r.ip_address,
          user_agent: r.user_agent,
        };
      });

      return { total_online: sessions_data.length, sessions_data };
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
      // Intervalo padrão: últimos 30 dias
      const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const defaultEnd = new Date().toISOString();

      const startISO = filters?.startDate ?? defaultStart;
      const endISO = filters?.endDate ?? defaultEnd;

      // 1) Buscar histórico de sessões real no banco
      let query = supabase
        .from('user_session_history')
        .select(`
          user_id,
          started_at,
          ended_at,
          duration_minutes,
          ended_by,
          ip_address,
          user_agent
        `)
        .gte('started_at', startISO)
        .lte('started_at', endISO)
        .order('started_at', { ascending: false });

      const { data: historyRows, error } = await query as any;
      if (error) {
        console.error('❌ Erro ao consultar user_session_history:', error);
        // Fallback: Edge Function com Service Role
        const { data: efData, error: efError } = await supabase.functions.invoke('user-sessions', {
          body: { action: 'history', startDate: startISO, endDate: endISO, searchTerm: filters?.searchTerm }
        });
        if (efError) {
          console.error('❌ Fallback edge function (history) falhou:', efError);
          return [];
        }
        return efData as SessionHistory[];
      }

      const rows = (historyRows || []) as Array<{
        user_id: string;
        started_at: string;
        ended_at?: string;
        duration_minutes?: number;
        ended_by?: string;
        ip_address?: string;
        user_agent?: string;
      }>;

      if (rows.length === 0) return [];

      // 2) Enriquecer com email e nome do usuário via tabela profiles
      const uniqueUserIds = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean)));
      let profilesMap = new Map<string, { email: string; full_name: string }>();
      if (uniqueUserIds.length > 0) {
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', uniqueUserIds);

        if (pErr) {
          console.warn('⚠️ Erro ao buscar perfis para histórico de sessões:', pErr);
        } else {
          for (const p of profiles || []) {
            profilesMap.set(p.id, { email: p.email, full_name: p.full_name });
          }
        }
      }

      // 3) Montar retorno com filtros de busca (se houver)
      let result: SessionHistory[] = rows.map(r => {
        const profile = profilesMap.get(r.user_id) || { email: '', full_name: '' };
        return {
          user_id: r.user_id,
          email: profile.email,
          full_name: profile.full_name,
          started_at: r.started_at,
          ended_at: r.ended_at,
          duration_minutes: r.duration_minutes,
          ended_by: r.ended_by,
          ip_address: r.ip_address,
          user_agent: r.user_agent,
        } as SessionHistory;
      });

      const term = filters?.searchTerm?.trim().toLowerCase();
      if (term) {
        result = result.filter(s =>
          (s.email && s.email.toLowerCase().includes(term)) ||
          (s.full_name && s.full_name.toLowerCase().includes(term))
        );
      }

      console.log('📊 Histórico de sessões (real):', { total: result.length, startISO, endISO });
      return result;
    } catch (error) {
      console.error('💥 Erro ao obter histórico de sessões:', error);
      return [];
    }
  }

  // Removidos dados mockados: somente dados reais do banco

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
