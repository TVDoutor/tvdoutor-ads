/**
 * SSRF (Server-Side Request Forgery) Protection Utilities
 * Protege contra requisições para URLs maliciosas ou recursos internos
 */

import { logError, logWarn } from '@/utils/secureLogger';

interface SSRFValidationOptions {
  allowLocalhost?: boolean;
  allowPrivateNetworks?: boolean;
  maxRedirects?: number;
  timeout?: number;
}

class SSRFProtection {
  private static instance: SSRFProtection;

  // URLs e domínios permitidos
  private readonly ALLOWED_DOMAINS = [
    'maps.googleapis.com',
    'api.mapbox.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.jsdelivr.net',
    'api.github.com',
    'supabase.co',
    'supabase.com',
    'tvdoutor.com.br'
  ];

  // Portas permitidas
  private readonly ALLOWED_PORTS = [80, 443, 8080, 8443];

  // IPs e redes privadas bloqueadas
  private readonly BLOCKED_IP_RANGES = [
    /^127\./,           // 127.0.0.0/8 (localhost)
    /^10\./,            // 10.0.0.0/8 (private)
    /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12 (private)
    /^192\.168\./,      // 192.168.0.0/16 (private)
    /^169\.254\./,      // 169.254.0.0/16 (link-local)
    /^224\./,           // 224.0.0.0/4 (multicast)
    /^0\./,             // 0.0.0.0/8
    /^::1$/,            // IPv6 localhost
    /^fe80:/,           // IPv6 link-local
    /^fc00:/,           // IPv6 unique local
    /^ff00:/            // IPv6 multicast
  ];

  // Protocolos permitidos
  private readonly ALLOWED_PROTOCOLS = ['https:', 'http:'];

  private constructor() {}

  public static getInstance(): SSRFProtection {
    if (!SSRFProtection.instance) {
      SSRFProtection.instance = new SSRFProtection();
    }
    return SSRFProtection.instance;
  }

  /**
   * Valida se uma URL é segura para requisição
   */
  public async validateURL(url: string, options: SSRFValidationOptions = {}): Promise<boolean> {
    try {
      const parsedUrl = new URL(url);
      
      // Validar protocolo
      if (!this.ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
        logWarn('Protocolo não permitido', { protocol: parsedUrl.protocol });
        return false;
      }

      // Validar domínio
      if (!this.isAllowedDomain(parsedUrl.hostname)) {
        logWarn('Domínio não permitido', { hostname: parsedUrl.hostname });
        return false;
      }

      // Validar porta
      const port = parsedUrl.port ? parseInt(parsedUrl.port) : (parsedUrl.protocol === 'https:' ? 443 : 80);
      if (!this.ALLOWED_PORTS.includes(port)) {
        logWarn('Porta não permitida', { port });
        return false;
      }

      // Validar IPs privados/locais
      if (!options.allowLocalhost && !options.allowPrivateNetworks) {
        const isBlockedIP = await this.isBlockedIPAddress(parsedUrl.hostname);
        if (isBlockedIP) {
          logWarn('IP bloqueado detectado', { hostname: parsedUrl.hostname });
          return false;
        }
      }

      // Validar comprimento da URL
      if (url.length > 2048) {
        logWarn('URL muito longa', { length: url.length });
        return false;
      }

      return true;
    } catch (error) {
      logError('Erro na validação de URL', error);
      return false;
    }
  }

  /**
   * Faz uma requisição HTTP segura
   */
  public async secureFetch(url: string, options: RequestInit = {}, ssrfOptions: SSRFValidationOptions = {}): Promise<Response> {
    // Validar URL antes da requisição
    const isValid = await this.validateURL(url, ssrfOptions);
    if (!isValid) {
      throw new Error('URL não permitida para requisições externas');
    }

    // Configurar timeout padrão
    const timeout = ssrfOptions.timeout || 10000; // 10 segundos

    // Configurar opções seguras
    const secureOptions: RequestInit = {
      ...options,
      signal: AbortSignal.timeout(timeout),
      redirect: 'manual', // Não seguir redirects automaticamente
      headers: {
        'User-Agent': 'TV-Doutor-ADS/1.0',
        'Accept': 'application/json, text/plain, */*',
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, secureOptions);
      
      // Verificar redirects se houver
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
          const maxRedirects = ssrfOptions.maxRedirects || 3;
          if (maxRedirects > 0) {
            const redirectURL = new URL(location, url).toString();
            return this.secureFetch(redirectURL, options, { ...ssrfOptions, maxRedirects: maxRedirects - 1 });
          } else {
            throw new Error('Muitos redirects detectados');
          }
        }
      }

      return response;
    } catch (error) {
      logError('Erro na requisição segura', error);
      throw error;
    }
  }

  /**
   * Valida se o domínio está na lista de permitidos
   */
  private isAllowedDomain(hostname: string): boolean {
    return this.ALLOWED_DOMAINS.some(domain => {
      if (domain.startsWith('*')) {
        return hostname.endsWith(domain.slice(1));
      }
      return hostname === domain || hostname.endsWith('.' + domain);
    });
  }

  /**
   * Verifica se um hostname resolve para um IP bloqueado
   */
  private async isBlockedIPAddress(hostname: string): Promise<boolean> {
    // Verificar se já é um IP
    if (this.isIPAddress(hostname)) {
      return this.isBlockedIP(hostname);
    }

    // Para hostname, assumimos que está OK se passou pela validação de domínio
    // Em um ambiente de produção real, você poderia fazer resolução DNS
    return false;
  }

  /**
   * Verifica se uma string é um endereço IP
   */
  private isIPAddress(address: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(address) || ipv6Regex.test(address);
  }

  /**
   * Verifica se um IP está bloqueado
   */
  private isBlockedIP(ip: string): boolean {
    return this.BLOCKED_IP_RANGES.some(range => range.test(ip));
  }

  /**
   * Adiciona domínio à lista de permitidos (para configuração dinâmica)
   */
  public addAllowedDomain(domain: string): void {
    if (!this.ALLOWED_DOMAINS.includes(domain)) {
      this.ALLOWED_DOMAINS.push(domain);
    }
  }

  /**
   * Remove domínio da lista de permitidos
   */
  public removeAllowedDomain(domain: string): void {
    const index = this.ALLOWED_DOMAINS.indexOf(domain);
    if (index > -1) {
      this.ALLOWED_DOMAINS.splice(index, 1);
    }
  }
}

// Instância singleton
export const ssrfProtection = SSRFProtection.getInstance();

// Hook React para usar proteção SSRF
export const useSSRFProtection = () => {
  const validateUrl = async (url: string, options?: SSRFValidationOptions) => 
    ssrfProtection.validateURL(url, options);
  
  const secureFetch = async (url: string, options?: RequestInit, ssrfOptions?: SSRFValidationOptions) =>
    ssrfProtection.secureFetch(url, options, ssrfOptions);

  return { validateUrl, secureFetch };
};

// Função utilitária para validação rápida de URLs
export const isValidExternalURL = async (url: string): Promise<boolean> => {
  return ssrfProtection.validateURL(url);
};
