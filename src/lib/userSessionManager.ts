/**
 * 🔐 Gerenciador de Sessões de Usuário
 * 
 * Sistema completo de monitoramento de sessões ativas e históricas
 * com rastreamento de IP, User Agent e controle de expiração.
 */

import { supabase } from './supabase';

// Tipo da sessão de usuário
export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  started_at: string;
  last_seen_at: string;
  expires_at: string;
  is_active: boolean;
}

// Tipo do histórico de sessão
export interface SessionHistory {
  id: string;
  user_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  ended_by?: 'logout' | 'timeout' | 'forced' | 'system';
}

// Razões para encerrar sessão
export type SessionEndReason = 'logout' | 'timeout' | 'forced' | 'system';

/**
 * Cria uma nova sessão de usuário ao fazer login
 * @param userId - ID do usuário que está fazendo login
 * @param expiresInHours - Horas até a sessão expirar (padrão: 24h)
 * @returns Token da sessão ou null em caso de erro
 */
export async function createUserSession(
  userId: string,
  expiresInHours: number = 24
): Promise<string | null> {
  try {
    // TEMPORÁRIO: Sistema de sessões desabilitado para evitar tela branca
    console.log('Sistema de sessões temporariamente desabilitado');
    return null;
    
    // Gerar token único para a sessão
    const sessionToken = crypto.randomUUID();
    
    // Detectar IP do cliente (opcional) - DESABILITADO
    let ipAddress: string | null = null;
    // try {
    //   const response = await fetch('https://api.ipify.org?format=json');
    //   const data = await response.json();
    //   ipAddress = data.ip;
    // } catch (error) {
    //   console.warn('Não foi possível detectar IP:', error);
    // }
    
    // User Agent do navegador
    const userAgent = navigator.userAgent;
    
    // Calcular data de expiração
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
    
    // Criar sessão no banco de dados
    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt,
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar sessão:', error);
      return null;
    }
    
    // Salvar token na sessão local do navegador
    sessionStorage.setItem('session_token', sessionToken);
    
    console.log('✅ Sessão criada com sucesso:', {
      userId,
      sessionToken,
      expiresAt
    });
    
    return sessionToken;
  } catch (error) {
    console.error('Erro ao criar sessão de usuário:', error);
    return null;
  }
}

/**
 * Atualiza o timestamp de última atividade da sessão
 * Deve ser chamado periodicamente enquanto o usuário está ativo
 */
export async function updateLastSeen(): Promise<boolean> {
  // TEMPORÁRIO: Sistema de sessões desabilitado
  return true;
  
  const sessionToken = sessionStorage.getItem('session_token');
  
  if (!sessionToken) {
    console.warn('Token de sessão não encontrado');
    return false;
  }
  
  try {
    const { data, error } = await supabase.rpc('update_user_last_seen', {
      p_session_token: sessionToken
    });
    
    if (error) {
      console.error('Erro ao atualizar last_seen:', error);
      return false;
    }
    
    return data as boolean;
  } catch (error) {
    console.error('Erro ao atualizar última atividade:', error);
    return false;
  }
}

/**
 * Encerra a sessão do usuário e move para histórico
 * @param reason - Razão do encerramento da sessão
 */
export async function endUserSession(reason: SessionEndReason): Promise<boolean> {
  // TEMPORÁRIO: Sistema de sessões desabilitado
  return true;
  
  const sessionToken = sessionStorage.getItem('session_token');
  
  if (!sessionToken) {
    console.warn('Token de sessão não encontrado');
    return false;
  }
  
  try {
    // Buscar sessão atual
    const { data: session, error: fetchError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .single();
    
    if (fetchError || !session) {
      console.warn('Sessão não encontrada:', fetchError);
      sessionStorage.removeItem('session_token');
      return false;
    }
    
    // Calcular duração da sessão em minutos
    const durationMs = Date.now() - new Date(session.started_at).getTime();
    const durationMinutes = Math.floor(durationMs / 60000);
    
    // Adicionar ao histórico
    const { error: historyError } = await supabase
      .from('user_session_history')
      .insert({
        user_id: session.user_id,
        session_token: session.session_token,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        started_at: session.started_at,
        ended_at: new Date().toISOString(),
        duration_minutes: durationMinutes,
        ended_by: reason
      });
    
    if (historyError) {
      console.error('Erro ao salvar no histórico:', historyError);
    }
    
    // Remover sessão ativa
    const { error: deleteError } = await supabase
      .from('user_sessions')
      .delete()
      .eq('session_token', sessionToken);
    
    if (deleteError) {
      console.error('Erro ao remover sessão:', deleteError);
      return false;
    }
    
    // Limpar storage local
    sessionStorage.removeItem('session_token');
    
    console.log('✅ Sessão encerrada:', {
      reason,
      durationMinutes,
      endedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao encerrar sessão:', error);
    return false;
  }
}

/**
 * Verifica se a sessão atual ainda é válida
 * @returns true se a sessão está ativa e não expirou
 */
export async function isSessionValid(): Promise<boolean> {
  const sessionToken = sessionStorage.getItem('session_token');
  
  if (!sessionToken) {
    return false;
  }
  
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('expires_at, is_active')
      .eq('session_token', sessionToken)
      .single();
    
    if (error || !data) {
      return false;
    }
    
    // Verificar se está ativa e não expirou
    const isActive = data.is_active;
    const notExpired = new Date(data.expires_at) > new Date();
    
    return isActive && notExpired;
  } catch (error) {
    console.error('Erro ao validar sessão:', error);
    return false;
  }
}

/**
 * Obtém estatísticas de usuários online (apenas para super admins)
 */
export async function getOnlineUsersStats() {
  try {
    const { data, error } = await supabase.rpc('get_online_users_stats');
    
    if (error) {
      console.error('Erro ao buscar usuários online:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    return null;
  }
}

/**
 * Obtém histórico de sessões (apenas para super admins)
 * @param userId - ID do usuário (opcional, null retorna todos)
 */
export async function getUserSessionHistory(userId?: string) {
  try {
    const { data, error } = await supabase.rpc('get_user_session_history', {
      p_user_id: userId || null
    });
    
    if (error) {
      console.error('Erro ao buscar histórico:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao obter histórico:', error);
    return null;
  }
}

/**
 * Limpa todas as sessões de um usuário (útil para forçar logout)
 * @param userId - ID do usuário
 */
export async function clearUserSessions(userId: string): Promise<boolean> {
  try {
    // Buscar todas as sessões ativas do usuário
    const { data: sessions, error: fetchError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (fetchError) {
      console.error('Erro ao buscar sessões:', fetchError);
      return false;
    }
    
    if (!sessions || sessions.length === 0) {
      return true; // Nenhuma sessão para limpar
    }
    
    // Mover todas para histórico
    for (const session of sessions) {
      const durationMs = Date.now() - new Date(session.started_at).getTime();
      const durationMinutes = Math.floor(durationMs / 60000);
      
      await supabase.from('user_session_history').insert({
        user_id: session.user_id,
        session_token: session.session_token,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        started_at: session.started_at,
        ended_at: new Date().toISOString(),
        duration_minutes: durationMinutes,
        ended_by: 'forced'
      });
    }
    
    // Deletar todas as sessões ativas
    const { error: deleteError } = await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', userId);
    
    if (deleteError) {
      console.error('Erro ao deletar sessões:', deleteError);
      return false;
    }
    
    console.log(`✅ ${sessions.length} sessão(ões) removida(s) para usuário ${userId}`);
    
    return true;
  } catch (error) {
    console.error('Erro ao limpar sessões do usuário:', error);
    return false;
  }
}

