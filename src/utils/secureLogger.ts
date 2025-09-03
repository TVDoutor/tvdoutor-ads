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
  }

  /**
   * Sanitiza dados sensíveis antes do log
   */
  private sanitizeData(data: any): any {
    if (!data) return data;
    
    if (typeof data === 'string') {
      // Mascarar emails
      return data.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '***@$2');
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    
    if (typeof data === 'object') {
      const sanitized: any = {};
      
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

  private shouldLog(level: LogLevel): boolean {
    if (this.isProduction && !this.config.enableInProduction) {
      return level === 'error';
    }
    
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const requestedLevelIndex = levels.indexOf(level);
    
    return requestedLevelIndex >= currentLevelIndex;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.log(`🔧 ${message}`, data ? this.sanitizeData(data) : '');
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.log(`ℹ️ ${message}`, data ? this.sanitizeData(data) : '');
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(`⚠️ ${message}`, data ? this.sanitizeData(data) : '');
    }
  }

  error(message: string, error?: any): void {
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

  authError(message: string, error?: any): void {
    this.error(message, error);
  }
}

// Instância singleton
export const secureLogger = new SecureLogger();

// Funções de conveniência
export const logDebug = (message: string, data?: any) => secureLogger.debug(message, data);
export const logInfo = (message: string, data?: any) => secureLogger.info(message, data);
export const logWarn = (message: string, data?: any) => secureLogger.warn(message, data);
export const logError = (message: string, error?: any) => secureLogger.error(message, error);
export const logAuthSuccess = (message: string, userInfo?: { role?: string; hasEmail?: boolean }) => secureLogger.authSuccess(message, userInfo);
export const logAuthError = (message: string, error?: any) => secureLogger.authError(message, error);