/**
 * CSRF Protection Utilities
 * Implementa proteção contra Cross-Site Request Forgery
 */

// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';

class CSRFProtection {
  private static instance: CSRFProtection;
  private tokenCache: Map<string, { token: string; expires: number }> = new Map();
  private readonly TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hora

  private constructor() {}

  public static getInstance(): CSRFProtection {
    if (!CSRFProtection.instance) {
      CSRFProtection.instance = new CSRFProtection();
    }
    return CSRFProtection.instance;
  }

  /**
   * Gera um token CSRF único para a sessão atual
   */
  public async generateCSRFToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    const sessionId = session?.access_token || 'anonymous';

    // Verificar se existe token válido em cache
    const cached = this.tokenCache.get(sessionId);
    if (cached && cached.expires > Date.now()) {
      return cached.token;
    }

    // Gerar novo token
    const token = this.generateSecureToken();
    const expires = Date.now() + this.TOKEN_EXPIRY;

    // Armazenar em cache
    this.tokenCache.set(sessionId, { token, expires });

    // Limpar tokens expirados
    this.cleanExpiredTokens();

    return token;
  }

  /**
   * Valida um token CSRF
   */
  public async validateCSRFToken(providedToken: string): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    const sessionId = session?.access_token || 'anonymous';

    const cached = this.tokenCache.get(sessionId);
    if (!cached || cached.expires <= Date.now()) {
      return false;
    }

    return cached.token === providedToken;
  }

  /**
   * Middleware para validar CSRF em requisições
   */
  public async validateRequest(headers: Record<string, string>): Promise<boolean> {
    const csrfToken = headers['x-csrf-token'];
    if (!csrfToken) {
      return false;
    }

    return await this.validateCSRFToken(csrfToken);
  }

  /**
   * Gera um token seguro usando Web Crypto API
   */
  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Remove tokens expirados do cache
   */
  private cleanExpiredTokens(): void {
    const now = Date.now();
    for (const [key, value] of this.tokenCache.entries()) {
      if (value.expires <= now) {
        this.tokenCache.delete(key);
      }
    }
  }

  /**
   * Configura cabeçalhos CSRF para requisições
   */
  public async getCSRFHeaders(): Promise<Record<string, string>> {
    const token = await this.generateCSRFToken();
    return {
      'X-CSRF-Token': token,
      'X-Requested-With': 'XMLHttpRequest'
    };
  }

  /**
   * Configura cookies seguros
   */
  public setSecureCookie(name: string, value: string, options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    maxAge?: number;
  } = {}): void {
    const defaults = {
      httpOnly: true,
      secure: window.location.protocol === 'https:',
      sameSite: 'strict' as const,
      maxAge: 86400 // 24 hours
    };

    const settings = { ...defaults, ...options };
    
    let cookieString = `${name}=${value}`;
    cookieString += `; Max-Age=${settings.maxAge}`;
    cookieString += `; SameSite=${settings.sameSite}`;
    cookieString += `; Path=/`;
    
    if (settings.secure) {
      cookieString += `; Secure`;
    }
    
    if (settings.httpOnly) {
      cookieString += `; HttpOnly`;
    }

    document.cookie = cookieString;
  }
}

// Hook React para uso em componentes
export const useCSRFProtection = () => {
  const csrf = CSRFProtection.getInstance();

  const getToken = async () => csrf.generateCSRFToken();
  const validateToken = async (token: string) => csrf.validateCSRFToken(token);
  const getHeaders = async () => csrf.getCSRFHeaders();

  return { getToken, validateToken, getHeaders };
};

// Instância singleton
export const csrfProtection = CSRFProtection.getInstance();

// Função utilitária para adicionar CSRF a requisições do Supabase
export const createSecureSupabaseRequest = async () => {
  const headers = await csrfProtection.getCSRFHeaders();
  
  // Configurar interceptador para adicionar headers em todas as requisições
  const originalRequest = supabase.rest.request;
  supabase.rest.request = function(request) {
    return originalRequest.call(this, {
      ...request,
      headers: {
        ...request.headers,
        ...headers
      }
    });
  };
};
