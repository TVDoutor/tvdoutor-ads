/**
 * Rate Limiting e Throttling System
 * Implementa controle de taxa de requisições para prevenir abuso
 */

import { logWarn, logError } from '@/utils/secureLogger';

interface RateLimitConfig {
  windowMs: number; // Janela de tempo em millisegundos
  maxRequests: number; // Número máximo de requisições na janela
  skipSuccessfulRequests?: boolean; // Se deve pular requisições bem-sucedidas
  skipFailedRequests?: boolean; // Se deve pular requisições com erro
  blockDuration?: number; // Duração do bloqueio em ms (0 = só limitar na janela)
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  blockedUntil?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

class RateLimiter {
  private static instance: RateLimiter;
  private storage: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Configurações predefinidas para diferentes tipos de operação
  private readonly PRESETS = {
    // Endpoints de autenticação - muito restritivo
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      maxRequests: 5, // 5 tentativas por 15 min
      blockDuration: 30 * 60 * 1000, // Bloquear por 30 min após limite
      skipSuccessfulRequests: true
    },
    
    // Operações gerais da API - moderado
    api: {
      windowMs: 60 * 1000, // 1 minuto
      maxRequests: 100, // 100 req/min
      blockDuration: 0
    },
    
    // Upload de arquivos - restritivo
    upload: {
      windowMs: 60 * 1000, // 1 minuto
      maxRequests: 10, // 10 uploads/min
      blockDuration: 5 * 60 * 1000 // 5 min de bloqueio
    },
    
    // Busca/consultas - liberal
    search: {
      windowMs: 60 * 1000, // 1 minuto
      maxRequests: 200, // 200 req/min
      blockDuration: 0
    },
    
    // Envio de emails - muito restritivo
    email: {
      windowMs: 60 * 60 * 1000, // 1 hora
      maxRequests: 10, // 10 emails/hora
      blockDuration: 60 * 60 * 1000 // 1 hora de bloqueio
    }
  };

  private constructor() {
    // Limpar entradas antigas a cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Verifica se uma requisição é permitida
   */
  public checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const key = this.generateKey(identifier, config);
    const entry = this.storage.get(key) || { count: 0, windowStart: now };

    // Verificar se está bloqueado
    if (entry.blockedUntil && entry.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.blockedUntil,
        retryAfter: entry.blockedUntil - now
      };
    }

    // Resetar janela se expirou
    if (now - entry.windowStart >= config.windowMs) {
      entry.count = 0;
      entry.windowStart = now;
      entry.blockedUntil = undefined;
    }

    // Verificar limite
    if (entry.count >= config.maxRequests) {
      // Aplicar bloqueio se configurado
      if (config.blockDuration && config.blockDuration > 0) {
        entry.blockedUntil = now + config.blockDuration;
      }

      logWarn('Rate limit excedido', {
        identifier: this.maskIdentifier(identifier),
        count: entry.count,
        limit: config.maxRequests
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.windowStart + config.windowMs,
        retryAfter: entry.blockedUntil ? entry.blockedUntil - now : config.windowMs - (now - entry.windowStart)
      };
    }

    // Incrementar contador
    entry.count++;
    this.storage.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.windowStart + config.windowMs
    };
  }

  /**
   * Middleware para verificar rate limiting
   */
  public createMiddleware(preset: keyof typeof this.PRESETS | RateLimitConfig, getIdentifier?: () => string) {
    const config = typeof preset === 'string' ? this.PRESETS[preset] : preset;
    
    return async (next: () => Promise<any>) => {
      const identifier = getIdentifier ? getIdentifier() : this.getDefaultIdentifier();
      const result = this.checkRateLimit(identifier, config);

      if (!result.allowed) {
        const error = new Error('Rate limit exceeded');
        (error as any).rateLimitInfo = result;
        throw error;
      }

      return await next();
    };
  }

  /**
   * Obter preset de configuração
   */
  public getPreset(name: keyof typeof this.PRESETS): RateLimitConfig {
    return { ...this.PRESETS[name] };
  }

  /**
   * Registrar tentativa bem-sucedida (para skipSuccessfulRequests)
   */
  public recordSuccess(identifier: string, config: RateLimitConfig): void {
    if (config.skipSuccessfulRequests) {
      const key = this.generateKey(identifier, config);
      const entry = this.storage.get(key);
      if (entry && entry.count > 0) {
        entry.count--;
        this.storage.set(key, entry);
      }
    }
  }

  /**
   * Registrar tentativa com falha (para skipFailedRequests)
   */
  public recordFailure(identifier: string, config: RateLimitConfig): void {
    if (config.skipFailedRequests) {
      const key = this.generateKey(identifier, config);
      const entry = this.storage.get(key);
      if (entry && entry.count > 0) {
        entry.count--;
        this.storage.set(key, entry);
      }
    }
  }

  /**
   * Resetar rate limit para um identificador
   */
  public resetRateLimit(identifier: string, config: RateLimitConfig): void {
    const key = this.generateKey(identifier, config);
    this.storage.delete(key);
  }

  /**
   * Obter status atual do rate limit
   */
  public getRateLimitStatus(identifier: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const key = this.generateKey(identifier, config);
    const entry = this.storage.get(key);

    if (!entry) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs
      };
    }

    // Verificar se está bloqueado
    if (entry.blockedUntil && entry.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.blockedUntil,
        retryAfter: entry.blockedUntil - now
      };
    }

    // Verificar se janela expirou
    if (now - entry.windowStart >= config.windowMs) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs
      };
    }

    return {
      allowed: entry.count < config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: entry.windowStart + config.windowMs
    };
  }

  /**
   * Implementar throttling - espaça as requisições uniformemente
   */
  public async throttle(identifier: string, minInterval: number): Promise<void> {
    const key = `throttle_${identifier}`;
    const lastRequest = this.storage.get(key)?.windowStart || 0;
    const now = Date.now();
    const timeSince = now - lastRequest;

    if (timeSince < minInterval) {
      const delay = minInterval - timeSince;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.storage.set(key, { count: 1, windowStart: Date.now() });
  }

  /**
   * Utilitários privados
   */
  private generateKey(identifier: string, config: RateLimitConfig): string {
    return `${identifier}_${config.windowMs}_${config.maxRequests}`;
  }

  private getDefaultIdentifier(): string {
    // Em um ambiente real, isso seria baseado no IP, user ID, etc.
    // Para o frontend, usamos sessionStorage ou um ID único
    let identifier = sessionStorage.getItem('rate_limit_id');
    if (!identifier) {
      identifier = this.generateUniqueId();
      sessionStorage.setItem('rate_limit_id', identifier);
    }
    return identifier;
  }

  private generateUniqueId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private maskIdentifier(identifier: string): string {
    if (identifier.length <= 8) return '***';
    return identifier.substring(0, 4) + '***' + identifier.substring(identifier.length - 4);
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.storage.forEach((entry, key) => {
      // Remover entradas antigas (mais de 1 hora sem uso)
      const age = now - entry.windowStart;
      if (age > 60 * 60 * 1000 && (!entry.blockedUntil || entry.blockedUntil < now)) {
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => this.storage.delete(key));
    
    if (toDelete.length > 0) {
      logWarn(`Limpeza do rate limiter: ${toDelete.length} entradas removidas`);
    }
  }

  /**
   * Cleanup ao destruir a instância
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Instância singleton
export const rateLimiter = RateLimiter.getInstance();

// Hook para uso em componentes React
export const useRateLimit = () => {
  const checkLimit = (identifier: string, config: RateLimitConfig) =>
    rateLimiter.checkRateLimit(identifier, config);
  
  const getStatus = (identifier: string, config: RateLimitConfig) =>
    rateLimiter.getRateLimitStatus(identifier, config);
  
  const throttle = (identifier: string, minInterval: number) =>
    rateLimiter.throttle(identifier, minInterval);
  
  const getPreset = (name: keyof typeof rateLimiter['PRESETS']) =>
    rateLimiter.getPreset(name);

  return {
    checkLimit,
    getStatus,
    throttle,
    getPreset
  };
};

// Utilitário para aplicar rate limiting em funções
export function withRateLimit<T extends (...args: any[]) => any>(
  fn: T,
  preset: keyof typeof rateLimiter['PRESETS'] | RateLimitConfig,
  getIdentifier?: () => string
): T {
  const config = typeof preset === 'string' ? rateLimiter.getPreset(preset) : preset;
  
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const identifier = getIdentifier ? getIdentifier() : rateLimiter['getDefaultIdentifier']();
    const result = rateLimiter.checkRateLimit(identifier, config);
    
    if (!result.allowed) {
      const error = new Error(`Rate limit exceeded. Try again in ${Math.ceil((result.retryAfter || 0) / 1000)} seconds`);
      (error as any).rateLimitInfo = result;
      throw error;
    }
    
    try {
      const fnResult = await fn(...args);
      
      // Registrar sucesso se configurado
      if (config.skipSuccessfulRequests) {
        rateLimiter.recordSuccess(identifier, config);
      }
      
      return fnResult;
    } catch (error) {
      // Registrar falha se configurado
      if (config.skipFailedRequests) {
        rateLimiter.recordFailure(identifier, config);
      }
      
      throw error;
    }
  }) as T;
}

// Exportar tipos
export type { RateLimitConfig, RateLimitResult };
