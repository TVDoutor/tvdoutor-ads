/**
 * Secure Cookie Management
 * Gerencia cookies com configurações de segurança rigorosas
 */

import { logWarn, logError } from '@/utils/secureLogger';

interface SecureCookieOptions {
  expires?: Date | number; // Data de expiração ou dias
  maxAge?: number; // Tempo de vida em segundos
  domain?: string;
  path?: string;
  secure?: boolean; // Requer HTTPS
  httpOnly?: boolean; // Não acessível via JavaScript
  sameSite?: 'strict' | 'lax' | 'none';
  priority?: 'low' | 'medium' | 'high';
  partitioned?: boolean; // Para cookies de terceiros
}

interface CookieParseResult {
  [key: string]: string;
}

class SecureCookieManager {
  private static instance: SecureCookieManager;
  
  private readonly DEFAULT_OPTIONS: Required<Omit<SecureCookieOptions, 'expires' | 'maxAge' | 'domain' | 'priority' | 'partitioned'>> = {
    path: '/',
    secure: window.location.protocol === 'https:',
    httpOnly: false, // Frontend cookies não podem ser httpOnly
    sameSite: 'strict'
  };

  // Cookies sensíveis que precisam de configuração especial
  private readonly SENSITIVE_COOKIES = new Set([
    'auth-token',
    'refresh-token',
    'csrf-token',
    'session-id',
    'user-id'
  ]);

  private constructor() {}

  public static getInstance(): SecureCookieManager {
    if (!SecureCookieManager.instance) {
      SecureCookieManager.instance = new SecureCookieManager();
    }
    return SecureCookieManager.instance;
  }

  /**
   * Define um cookie com configurações de segurança
   */
  public setCookie(name: string, value: string, options: SecureCookieOptions = {}): boolean {
    try {
      // Validar nome e valor do cookie
      this.validateCookieName(name);
      this.validateCookieValue(value);

      const finalOptions = this.buildCookieOptions(name, options);
      const cookieString = this.buildCookieString(name, value, finalOptions);

      document.cookie = cookieString;
      
      return true;
    } catch (error) {
      logError('Erro ao definir cookie', error);
      return false;
    }
  }

  /**
   * Obtém o valor de um cookie
   */
  public getCookie(name: string): string | null {
    try {
      this.validateCookieName(name);
      
      const cookies = this.parseCookies();
      return cookies[name] || null;
    } catch (error) {
      logError('Erro ao obter cookie', error);
      return null;
    }
  }

  /**
   * Remove um cookie
   */
  public removeCookie(name: string, options: Pick<SecureCookieOptions, 'domain' | 'path'> = {}): boolean {
    try {
      // Definir o cookie com data passada para removê-lo
      const removeOptions: SecureCookieOptions = {
        ...options,
        expires: new Date(0),
        maxAge: 0
      };

      return this.setCookie(name, '', removeOptions);
    } catch (error) {
      logError('Erro ao remover cookie', error);
      return false;
    }
  }

  /**
   * Remove todos os cookies
   */
  public clearAllCookies(): void {
    const cookies = this.parseCookies();
    
    Object.keys(cookies).forEach(name => {
      this.removeCookie(name);
      // Tentar remover também com diferentes paths
      this.removeCookie(name, { path: '/' });
      this.removeCookie(name, { path: '', domain: window.location.hostname });
    });
  }

  /**
   * Verifica se um cookie existe
   */
  public hasCookie(name: string): boolean {
    return this.getCookie(name) !== null;
  }

  /**
   * Lista todos os cookies
   */
  public getAllCookies(): CookieParseResult {
    return this.parseCookies();
  }

  /**
   * Define cookie de sessão (expira quando o navegador fecha)
   */
  public setSessionCookie(name: string, value: string, options: Omit<SecureCookieOptions, 'expires' | 'maxAge'> = {}): boolean {
    return this.setCookie(name, value, {
      ...options,
      // Não definir expires nem maxAge para cookie de sessão
    });
  }

  /**
   * Define cookie permanente com expiração
   */
  public setPersistentCookie(name: string, value: string, days: number, options: SecureCookieOptions = {}): boolean {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));

    return this.setCookie(name, value, {
      ...options,
      expires
    });
  }

  /**
   * Cookie seguro para tokens de autenticação
   */
  public setAuthToken(token: string, expiresIn: number = 24 * 60 * 60): boolean {
    return this.setCookie('auth-token', token, {
      maxAge: expiresIn,
      secure: true,
      sameSite: 'strict',
      path: '/'
    });
  }

  /**
   * Obtém token de autenticação
   */
  public getAuthToken(): string | null {
    return this.getCookie('auth-token');
  }

  /**
   * Remove token de autenticação
   */
  public clearAuthToken(): boolean {
    return this.removeCookie('auth-token');
  }

  /**
   * Utilitários privados
   */
  private validateCookieName(name: string): void {
    if (!name || typeof name !== 'string') {
      throw new Error('Nome do cookie deve ser uma string não vazia');
    }

    if (name.match(/[()<>@,;:\\"\/\[\]?={}]/)) {
      throw new Error('Nome do cookie contém caracteres inválidos');
    }

    if (name.length > 4096) {
      throw new Error('Nome do cookie muito longo');
    }
  }

  private validateCookieValue(value: string): void {
    if (typeof value !== 'string') {
      throw new Error('Valor do cookie deve ser uma string');
    }

    if (value.length > 4096) {
      throw new Error('Valor do cookie muito longo');
    }

    // Verificar caracteres especiais que podem precisar de encoding
    if (value.match(/[,;]/)) {
      logWarn('Valor do cookie contém caracteres que podem causar problemas');
    }
  }

  private buildCookieOptions(name: string, options: SecureCookieOptions): Required<Omit<SecureCookieOptions, 'expires' | 'maxAge' | 'domain' | 'priority' | 'partitioned'>> & Pick<SecureCookieOptions, 'expires' | 'maxAge' | 'domain' | 'priority' | 'partitioned'> {
    const baseOptions = { ...this.DEFAULT_OPTIONS };

    // Configurações especiais para cookies sensíveis
    if (this.SENSITIVE_COOKIES.has(name)) {
      baseOptions.secure = true;
      baseOptions.sameSite = 'strict';
    }

    // Aplicar opções fornecidas
    return {
      ...baseOptions,
      ...options
    };
  }

  private buildCookieString(name: string, value: string, options: any): string {
    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    if (options.expires) {
      const expires = options.expires instanceof Date ? options.expires : new Date(Date.now() + options.expires * 24 * 60 * 60 * 1000);
      cookieString += `; expires=${expires.toUTCString()}`;
    }

    if (options.maxAge !== undefined) {
      cookieString += `; max-age=${options.maxAge}`;
    }

    if (options.domain) {
      cookieString += `; domain=${options.domain}`;
    }

    if (options.path) {
      cookieString += `; path=${options.path}`;
    }

    if (options.secure) {
      cookieString += '; secure';
    }

    if (options.httpOnly) {
      cookieString += '; httponly';
    }

    if (options.sameSite) {
      cookieString += `; samesite=${options.sameSite}`;
    }

    if (options.priority) {
      cookieString += `; priority=${options.priority}`;
    }

    if (options.partitioned) {
      cookieString += '; partitioned';
    }

    return cookieString;
  }

  private parseCookies(): CookieParseResult {
    const cookies: CookieParseResult = {};
    
    if (typeof document !== 'undefined' && document.cookie) {
      document.cookie.split(';').forEach(cookie => {
        const [name, ...rest] = cookie.trim().split('=');
        if (name) {
          const value = rest.join('=');
          cookies[decodeURIComponent(name)] = decodeURIComponent(value);
        }
      });
    }

    return cookies;
  }
}

// Instância singleton
export const secureCookies = SecureCookieManager.getInstance();

// Hook para uso em componentes React
export const useSecureCookies = () => {
  const setCookie = (name: string, value: string, options?: SecureCookieOptions) =>
    secureCookies.setCookie(name, value, options);
  
  const getCookie = (name: string) => secureCookies.getCookie(name);
  
  const removeCookie = (name: string, options?: Pick<SecureCookieOptions, 'domain' | 'path'>) =>
    secureCookies.removeCookie(name, options);
  
  const clearAll = () => secureCookies.clearAllCookies();
  
  const setAuthToken = (token: string, expiresIn?: number) =>
    secureCookies.setAuthToken(token, expiresIn);
  
  const getAuthToken = () => secureCookies.getAuthToken();
  
  const clearAuthToken = () => secureCookies.clearAuthToken();

  return {
    setCookie,
    getCookie,
    removeCookie,
    clearAll,
    setAuthToken,
    getAuthToken,
    clearAuthToken
  };
};

// Configurar cookies seguros por padrão quando o módulo for carregado
if (typeof window !== 'undefined') {
  // Avisar sobre cookies inseguros existentes
  const cookies = secureCookies.getAllCookies();
  Object.keys(cookies).forEach(name => {
    if (secureCookies['SENSITIVE_COOKIES'].has(name)) {
      logWarn(`Cookie sensível '${name}' pode não estar configurado com segurança máxima`);
    }
  });
}

// Exportar tipos
export type { SecureCookieOptions, CookieParseResult };
