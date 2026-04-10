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
  private initPromise: Promise<boolean> | null = null;
  private unloadListenersAttached = false;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 segundos
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos
  private readonly LOCK_NAME = 'tvd_user_session_init';

  private trackingStorageKey(userId: string): string {
    return `tvd_track_sess:${userId}`;
  }

  private readStoredTrackingToken(userId: string): string | null {
    try {
      return sessionStorage.getItem(this.trackingStorageKey(userId));
    } catch {
      return null;
    }
  }

  private writeStoredTrackingToken(userId: string, token: string): void {
    try {
      sessionStorage.setItem(this.trackingStorageKey(userId), token);
    } catch {
      /* private mode / quota */
    }
  }

  private clearStoredTrackingToken(userId: string): void {
    try {
      sessionStorage.removeItem(this.trackingStorageKey(userId));
    } catch {
      /* ignore */
    }
  }

  /**
   * Reaproveita sessão ativa (sessionStorage ou linha já criada por outra aba) e evita INSERT duplicado.
   * @returns token adotado ou null
   */
  private async tryResumeExistingSession(user: { id: string }): Promise<string | null> {
    const nowIso = new Date().toISOString();

    const pickRow = async (token: string) => {
      const { data: row } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('session_token', token)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('expires_at', nowIso)
        .maybeSingle();
      return row;
    };

    const stored = this.readStoredTrackingToken(user.id);
    if (stored) {
      const row = await pickRow(stored);
      if (row) {
        await this.mergeIntoCanonicalSession(user.id, row.session_token);
        return row.session_token;
      }
      this.clearStoredTrackingToken(user.id);
    }

    const { data: rows } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', nowIso)
      .order('started_at', { ascending: false })
      .limit(1);

    const existing = rows?.[0];
    if (existing) {
      await this.mergeIntoCanonicalSession(user.id, existing.session_token);
      return existing.session_token;
    }

    return null;
  }

  /** Mantém uma única linha ativa por usuário e atualiza UA / IP / expiração. */
  private async mergeIntoCanonicalSession(userId: string, canonicalToken: string): Promise<void> {
    await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('is_active', true)
      .neq('session_token', canonicalToken);

    const userAgent = navigator.userAgent;
    const ipAddress = await this.getClientIP();
    const expiresAt = new Date(Date.now() + this.SESSION_TIMEOUT).toISOString();
    const patch: Record<string, string> = {
      user_agent: userAgent,
      expires_at: expiresAt,
      last_seen_at: new Date().toISOString(),
    };
    if (ipAddress && ipAddress !== 'unknown') {
      patch.ip_address = ipAddress;
    }
    await supabase.from('user_sessions').update(patch).eq('session_token', canonicalToken);
  }

  private finalizeActiveSession(userId: string, token: string): void {
    this.sessionToken = token;
    this.writeStoredTrackingToken(userId, token);
    this.stopHeartbeat();
    this.startHeartbeat();
    this.setupBeforeUnloadOnce();
  }

  /**
   * Inicializar sessão do usuário
   */
  async initializeSession(): Promise<boolean> {
    if (this.sessionToken) {
      console.log('⚠️ [initializeSession] Sessão já inicializada, ignorando...');
      return true;
    }

    const run = async (): Promise<boolean> => {
      if (this.sessionToken) return true;
      return this.runInitializeSession();
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.locks?.request) {
        return await navigator.locks.request(
          this.LOCK_NAME,
          { mode: 'exclusive' },
          run
        );
      }
    } catch {
      /* fallback abaixo */
    }

    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = (async () => {
      try {
        return await run();
      } finally {
        this.initPromise = null;
      }
    })();
    return this.initPromise;
  }

  private async runInitializeSession(): Promise<boolean> {
    try {
      if (this.sessionToken) {
        return true;
      }

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

      const resumedToken = await this.tryResumeExistingSession(user);
      if (resumedToken) {
        this.finalizeActiveSession(user.id, resumedToken);
        console.log('✅ [initializeSession] Sessão existente reutilizada');
        console.log('✅ Sessão de usuário inicializada com sucesso!');
        return true;
      }

      console.log('🧹 [initializeSession] Limpando sessões ativas anteriores...');
      await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('is_active', true);

      const newToken = this.generateSessionToken();
      console.log('🎫 [initializeSession] Token de sessão gerado:', newToken);
      
      const userAgent = navigator.userAgent;
      const ipAddress = await this.getClientIP();
      console.log('🌐 [initializeSession] IP obtido:', ipAddress);
      
      const expiresAt = new Date(Date.now() + this.SESSION_TIMEOUT);
      console.log('⏰ [initializeSession] Expira em:', expiresAt.toISOString());
      
      console.log('💾 [initializeSession] Inserindo no banco...');
      const insertData: Record<string, unknown> = {
        user_id: user.id,
        session_token: newToken,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString(),
        is_active: true
      };
      
      if (ipAddress && ipAddress !== 'unknown') {
        insertData.ip_address = ipAddress;
      }
      
      console.log('📦 [initializeSession] Dados para inserir:', insertData);
      
      const { data: insertedData, error } = await supabase
        .from('user_sessions')
        .insert(insertData)
        .select();

      if (error) {
        const isDup =
          error.code === '23505' ||
          (typeof error.message === 'string' &&
            error.message.includes('user_sessions_session_token_key'));

        if (isDup) {
          const adopted = await this.tryResumeExistingSession(user);
          if (adopted) {
            this.finalizeActiveSession(user.id, adopted);
            console.log('✅ [initializeSession] Sessão adotada após conflito de token');
            console.log('✅ Sessão de usuário inicializada com sucesso!');
            return true;
          }
        }

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

      this.finalizeActiveSession(user.id, newToken);
      console.log('💓 [initializeSession] Heartbeat iniciado');
      console.log('🚪 [initializeSession] BeforeUnload configurado');
      
      return true;
    } catch (error) {
      this.sessionToken = null;
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

    const token = this.sessionToken;

    try {
      // Parar heartbeat
      this.stopHeartbeat();

      const { data: session, error: fetchError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('session_token', token)
        .maybeSingle();

      if (fetchError || !session) {
        this.sessionToken = null;
        try {
          const { data: { user: u } } = await supabase.auth.getUser();
          if (u) this.clearStoredTrackingToken(u.id);
        } catch {
          /* ignore */
        }
        if (fetchError) {
          console.warn('⚠️ Sessão ativa não encontrada ao finalizar:', fetchError);
        }
        return false;
      }

      const durationMs = Date.now() - new Date(session.started_at).getTime();
      const durationMinutes = Math.floor(durationMs / 60000);
      const endedAt = new Date().toISOString();

      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('session_token', token);

      if (error) {
        console.error('❌ Erro ao finalizar sessão:', error);
        return false;
      }

      const { error: historyError } = await supabase.from('user_session_history').insert({
        user_id: session.user_id,
        session_token: session.session_token,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        started_at: session.started_at,
        ended_at: endedAt,
        duration_minutes: durationMinutes,
        ended_by: 'logout'
      });

      if (historyError) {
        console.error('❌ Erro ao gravar histórico de sessão:', historyError);
      }

      this.sessionToken = null;
      this.clearStoredTrackingToken(session.user_id);
      console.log('✅ Sessão de usuário finalizada');
      
      return true;
    } catch (error) {
      this.sessionToken = null;
      try {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (u) this.clearStoredTrackingToken(u.id);
      } catch {
        /* ignore */
      }
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
        console.error('❌ Erro ao executar get_online_users_stats:', error);
        return { total_online: 0, sessions_data: [] };
      }

      const payload = Array.isArray(data) ? data[0] : data;
      if (!payload) return { total_online: 0, sessions_data: [] };

      const sessionsRaw = Array.isArray(payload.sessions_data) ? payload.sessions_data : [];
      const sessions_data: UserSession[] = sessionsRaw.map((session: any) => ({
        user_id: session.user_id,
        email: session.email ?? '',
        full_name: session.full_name ?? '',
        started_at: session.started_at ?? session.last_seen_at ?? new Date().toISOString(),
        last_seen_at: session.last_seen_at ?? session.started_at ?? new Date().toISOString(),
        duration_minutes: typeof session.duration_minutes === 'number'
          ? Math.max(0, Math.round(session.duration_minutes))
          : 0,
        ip_address: session.ip_address ?? undefined,
        user_agent: session.user_agent ?? undefined
      }));

      return {
        total_online: payload.total_online ?? sessions_data.length,
        sessions_data
      };
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
   * Configurar limpeza ao fechar a página (uma vez; evita listeners duplicados)
   */
  private setupBeforeUnloadOnce(): void {
    if (this.unloadListenersAttached || typeof window === 'undefined') return;
    this.unloadListenersAttached = true;
    const handleBeforeUnload = () => {
      this.sendEndSessionBeacon('page_close');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
  }

  /**
   * Enviar finalização de sessão via Beacon/keepalive (uso em beforeunload/pagehide)
   */
  private sendEndSessionBeacon(endedBy: string = 'page_close'): void {
    if (!this.sessionToken) return;

    const url = '/api/end-session';
    const form = new URLSearchParams({
      session_token: this.sessionToken,
      ended_by: endedBy
    });

    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      try {
        navigator.sendBeacon(url, form);
        return;
      } catch {}
    }

    // Fallback para fetch com keepalive
    try {
      fetch(url, {
        method: 'POST',
        body: form,
        keepalive: true
      }).catch((error) => {
        const isAbort = (error && (error.name === 'AbortError' || String(error).includes('aborted')));
        if (isAbort) {
          if ((import.meta as any)?.env?.MODE !== 'production') {
            console.warn('end-session abortado durante unload; ignorando em dev');
          }
        } else {
          console.error('Erro ao finalizar sessão (fallback fetch):', error);
        }
      });
    } catch {}
  }

  /**
   * API pública para enviar end-session via Beacon
   */
  public endSessionBeacon(endedBy: string = 'page_close'): void {
    this.sendEndSessionBeacon(endedBy);
  }

  /**
   * Gerar token de sessão único
   */
  private generateSessionToken(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `sess_${crypto.randomUUID()}`;
    }
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
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
