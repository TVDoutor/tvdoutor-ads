// @ts-nocheck
/**
 * Sistema de logging seguro que evita exposição de dados sensíveis
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
  level: LogLevel;
  enableInProduction: boolean;
}

class SecureLogger {
  private config: LogConfig;
  private isProduction: boolean;

  constructor() {
    this.isProduction = import.meta.env.PROD || import.meta.env.NODE_ENV === 'production';
    this.config = {
      level: this.isProduction ? 'error' : 'debug',
      enableInProduction: false
    };
    
    // Em produção, desabilitar completamente os logs de debug e info
    if (this.isProduction) {
      console.log = () => {};
      console.debug = () => {};
      console.info = () => {};
    }
  }

  /**
   * Sanitiza dados sensíveis antes do log
   */
  private sanitizeData(data: unknown): unknown {
    if (!data) return data;
    
    if (typeof data === 'string') {
      // Mascarar emails
      return data.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '***@$2');
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    
    if (typeof data === 'object') {
      const sanitized: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        
        // Campos sensíveis que devem ser mascarados
        if (lowerKey.includes('email')) {
          sanitized[key] = typeof value === 'string' ? this.maskEmail(value) : '[MASKED]';
        } else if (lowerKey.includes('password') || lowerKey.includes('token') || lowerKey.includes('secret')) {
          sanitized[key] = '[MASKED]';
        } else if (lowerKey === 'id' && typeof value === 'string' && value.length > 10) {
          // Mascarar IDs longos (UUIDs)
          sanitized[key] = `${value.substring(0, 8)}...${value.substring(value.length - 4)}`;
        } else if (lowerKey.includes('phone') || lowerKey.includes('cpf') || lowerKey.includes('cnpj')) {
          sanitized[key] = '[MASKED]';
        } else if (lowerKey.includes('name') || lowerKey.includes('nome') || lowerKey === 'profile') {
          // Mascarar nomes completos
          sanitized[key] = typeof value === 'string' ? this.maskName(value) : '[MASKED]';
        } else if (lowerKey === 'userid' || lowerKey === 'user_id') {
          // Mascarar user IDs
          sanitized[key] = typeof value === 'string' ? this.maskUserId(value) : '[MASKED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      
      return sanitized;
    }
    
    return data;
  }

  private maskEmail(email: string): string {
    if (!email || typeof email !== 'string') return '[MASKED]';
    
    const [username, domain] = email.split('@');
    if (!username || !domain) return '[MASKED]';
    
    const maskedUsername = username.length > 2 
      ? `${username[0]}***${username[username.length - 1]}`
      : '***';
    
    return `${maskedUsername}@${domain}`;
  }

  private maskName(name: string): string {
    if (!name || typeof name !== 'string') return '[MASKED]';
    
    // Se contém parênteses (como "Hildebrando Cardoso (Admin)"), mascarar apenas o nome
    const match = name.match(/^(.+?)\s*\((.+)\)$/);
    if (match) {
      const [, fullName, role] = match;
      const maskedName = this.maskFullName(fullName.trim());
      return `${maskedName} (${role})`;
    }
    
    return this.maskFullName(name);
  }

  private maskFullName(fullName: string): string {
    if (!fullName || typeof fullName !== 'string') return '[MASKED]';
    
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) {
      // Nome único - mostrar apenas primeira letra
      return `${parts[0][0]}***`;
    } else if (parts.length === 2) {
      // Nome e sobrenome - mostrar primeira letra de cada
      return `${parts[0][0]}*** ${parts[1][0]}***`;
    } else {
      // Múltiplos nomes - mostrar primeira letra do primeiro e último
      return `${parts[0][0]}*** ${parts[parts.length - 1][0]}***`;
    }
  }

  private maskUserId(userId: string): string {
    if (!userId || typeof userId !== 'string') return '[MASKED]';
    
    // Para UUIDs, mostrar apenas os primeiros 8 e últimos 4 caracteres
    if (userId.length > 20) {
      return `${userId.substring(0, 8)}...${userId.substring(userId.length - 4)}`;
    }
    
    // Para IDs menores, mostrar apenas os primeiros 4 caracteres
    return `${userId.substring(0, 4)}***`;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isProduction && !this.config.enableInProduction) {
      return level === 'error';
    }
    
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const requestedLevelIndex = levels.indexOf(level);
    
    return requestedLevelIndex >= currentLevelIndex;
  }

  // Manter apenas logs de produção (info, warn, error)
  // Remover ou comentar a função debug em produção
  debug(message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      console.log(`🔧 ${message}`, data ? this.sanitizeData(data) : '');
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      console.log(`ℹ️ ${message}`, data ? this.sanitizeData(data) : '');
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      console.warn(`⚠️ ${message}`, data ? this.sanitizeData(data) : '');
    }
  }

  error(message: string, error?: unknown): void {
    if (this.shouldLog('error')) {
      const sanitizedError = error instanceof Error 
        ? { message: error.message, name: error.name }
        : this.sanitizeData(error);
      
      console.error(`❌ ${message}`, sanitizedError);
    }
  }

  /**
   * Log específico para autenticação
   */
  authSuccess(message: string, userInfo?: { role?: string; hasEmail?: boolean }): void {
    this.info(message, userInfo);
  }

  authError(message: string, error?: unknown): void {
    this.error(message, error);
  }
}

// Instância singleton
export const secureLogger = new SecureLogger();

// Funções de conveniência
export const logDebug = (message: string, data?: unknown) => secureLogger.debug(message, data);
export const logInfo = (message: string, data?: unknown) => secureLogger.info(message, data);
export const logWarn = (message: string, data?: unknown) => secureLogger.warn(message, data);
export const logError = (message: string, error?: unknown) => secureLogger.error(message, error);
export const logAuthSuccess = (message: string, userInfo?: { role?: string; hasEmail?: boolean }) => secureLogger.authSuccess(message, userInfo);
export const logAuthError = (message: string, error?: unknown) => secureLogger.authError(message, error);

// Aliases para compatibilidade (caso alguém use com L maiúsculo)
export const LogWarn = logWarn;
export const LogDebug = logDebug;
export const LogInfo = logInfo;
export const LogError = logError;

// Definir PHI se não estiver definido
const PHI = {
  // Adicione as propriedades necessárias aqui
  // ou importe de onde deveria vir
};