/**
 * Políticas e Validação de Senhas Seguras
 * Implementa validações rigorosas para senhas seguindo padrões de segurança
 */

// @ts-nocheck
import { z } from 'zod';
import { logError, logWarn } from '@/utils/secureLogger';

interface PasswordStrengthResult {
  score: number; // 0-100
  level: 'weak' | 'fair' | 'good' | 'strong' | 'excellent';
  feedback: string[];
  isValid: boolean;
}

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  requireMixedCase: boolean;
  blockCommonPasswords: boolean;
  blockPersonalInfo: boolean;
  maxRepeatingChars: number;
  minUniqueChars: number;
}

class PasswordSecurity {
  private static instance: PasswordSecurity;
  
  private readonly DEFAULT_POLICY: PasswordPolicy = {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    requireMixedCase: true,
    blockCommonPasswords: true,
    blockPersonalInfo: true,
    maxRepeatingChars: 3,
    minUniqueChars: 8
  };

  // Lista de senhas comuns bloqueadas
  private readonly COMMON_PASSWORDS = [
    'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', 'dragon', 'master', 'senha',
    '12345678', 'football', 'iloveyou', 'princess', 'sunshine', 'password1',
    'qwerty123', 'admin123', 'root', 'toor', 'pass', 'test', 'guest'
  ];

  // Padrões de senhas fracas
  private readonly WEAK_PATTERNS = [
    /^(.)\1{3,}/, // Caracteres repetidos
    /^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def)/, // Sequências
    /^(qwer|asdf|zxcv|uiop|hjkl|bnmv)/, // Padrões de teclado
    /^(19|20)\d{2}$/, // Anos
    /^\d{4,}$/, // Só números
    /^[a-z]+$/i, // Só letras
  ];

  private constructor() {}

  public static getInstance(): PasswordSecurity {
    if (!PasswordSecurity.instance) {
      PasswordSecurity.instance = new PasswordSecurity();
    }
    return PasswordSecurity.instance;
  }

  /**
   * Cria schema Zod com política de senhas rigorosa
   */
  public createPasswordSchema(customPolicy?: Partial<PasswordPolicy>): z.ZodString {
    const policy = { ...this.DEFAULT_POLICY, ...customPolicy };
    
    let schema = z.string()
      .min(policy.minLength, `Senha deve ter pelo menos ${policy.minLength} caracteres`);

    // Adicionar validações customizadas
    schema = schema.refine(
      (password) => this.validatePassword(password, policy).isValid,
      (password) => ({
        message: this.validatePassword(password, policy).feedback.join('; ')
      })
    );

    return schema;
  }

  /**
   * Valida uma senha contra a política definida
   */
  public validatePassword(password: string, customPolicy?: Partial<PasswordPolicy>): PasswordStrengthResult {
    const policy = { ...this.DEFAULT_POLICY, ...customPolicy };
    const feedback: string[] = [];
    let score = 0;

    // Validar comprimento
    if (password.length < policy.minLength) {
      feedback.push(`Senha deve ter pelo menos ${policy.minLength} caracteres`);
    } else {
      score += Math.min(25, password.length * 2);
    }

    // Validar maiúsculas
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      feedback.push('Senha deve conter pelo menos uma letra maiúscula');
    } else if (/[A-Z]/.test(password)) {
      score += 15;
    }

    // Validar minúsculas
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      feedback.push('Senha deve conter pelo menos uma letra minúscula');
    } else if (/[a-z]/.test(password)) {
      score += 15;
    }

    // Validar números
    if (policy.requireNumbers && !/\d/.test(password)) {
      feedback.push('Senha deve conter pelo menos um número');
    } else if (/\d/.test(password)) {
      score += 15;
    }

    // Validar caracteres especiais
    if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
      feedback.push('Senha deve conter pelo menos um caractere especial (!@#$%^&*()_+-=[]{}|;:,.<>?)');
    } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
      score += 15;
    }

    // Validar caso misto
    if (policy.requireMixedCase && (!/[A-Z]/.test(password) || !/[a-z]/.test(password))) {
      feedback.push('Senha deve conter letras maiúsculas e minúsculas');
    }

    // Validar senhas comuns
    if (policy.blockCommonPasswords && this.isCommonPassword(password)) {
      feedback.push('Esta senha é muito comum. Escolha uma senha mais única');
      score -= 30;
    }

    // Validar padrões fracos
    if (this.hasWeakPatterns(password)) {
      feedback.push('Evite padrões previsíveis como sequências ou repetições');
      score -= 20;
    }

    // Validar caracteres repetidos
    if (policy.maxRepeatingChars > 0 && this.hasExcessiveRepeating(password, policy.maxRepeatingChars)) {
      feedback.push(`Evite mais de ${policy.maxRepeatingChars} caracteres iguais consecutivos`);
      score -= 15;
    }

    // Validar diversidade de caracteres
    const uniqueChars = new Set(password.toLowerCase()).size;
    if (policy.minUniqueChars > 0 && uniqueChars < policy.minUniqueChars) {
      feedback.push(`Use pelo menos ${policy.minUniqueChars} caracteres diferentes`);
      score -= 10;
    } else if (uniqueChars >= policy.minUniqueChars) {
      score += 10;
    }

    // Bonus por comprimento extra
    if (password.length >= 16) {
      score += 10;
    }

    // Normalizar score
    score = Math.max(0, Math.min(100, score));

    // Determinar nível
    let level: PasswordStrengthResult['level'];
    if (score < 30) level = 'weak';
    else if (score < 50) level = 'fair';
    else if (score < 70) level = 'good';
    else if (score < 90) level = 'strong';
    else level = 'excellent';

    const isValid = feedback.length === 0 && score >= 60;

    return {
      score,
      level,
      feedback,
      isValid
    };
  }

  /**
   * Gera uma senha segura automaticamente
   */
  public generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    let password = '';

    // Garantir que a senha tenha pelo menos um de cada tipo
    password += this.getRandomChar(lowercase);
    password += this.getRandomChar(uppercase);
    password += this.getRandomChar(numbers);
    password += this.getRandomChar(symbols);

    // Preencher o resto aleatoriamente
    for (let i = 4; i < length; i++) {
      password += this.getRandomChar(allChars);
    }

    // Embaralhar a senha
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Verifica vazamentos de senha em bases conhecidas (simulação)
   */
  public async checkPasswordBreach(password: string): Promise<boolean> {
    try {
      // Em produção, isso faria uma verificação em APIs como HaveIBeenPwned
      // Por ora, apenas verifica contra a lista de senhas comuns
      return this.isCommonPassword(password);
    } catch (error) {
      logError('Erro na verificação de vazamento de senha', error);
      return false;
    }
  }

  /**
   * Cria dicas de melhoria de senha
   */
  public getPasswordStrengthTips(password: string): string[] {
    const tips: string[] = [];
    const result = this.validatePassword(password);

    if (result.score < 70) {
      tips.push('• Use pelo menos 12 caracteres');
      tips.push('• Combine letras maiúsculas e minúsculas');
      tips.push('• Inclua números e símbolos');
      tips.push('• Evite informações pessoais');
      tips.push('• Não use senhas comuns ou previsíveis');
      tips.push('• Considere usar uma frase secreta memorable');
    }

    return tips;
  }

  /**
   * Utilitários privados
   */
  private isCommonPassword(password: string): boolean {
    const lower = password.toLowerCase();
    return this.COMMON_PASSWORDS.some(common => 
      lower.includes(common) || common.includes(lower)
    );
  }

  private hasWeakPatterns(password: string): boolean {
    return this.WEAK_PATTERNS.some(pattern => pattern.test(password.toLowerCase()));
  }

  private hasExcessiveRepeating(password: string, maxRepeating: number): boolean {
    let consecutiveCount = 1;
    for (let i = 1; i < password.length; i++) {
      if (password[i] === password[i - 1]) {
        consecutiveCount++;
        if (consecutiveCount > maxRepeating) {
          return true;
        }
      } else {
        consecutiveCount = 1;
      }
    }
    return false;
  }

  private getRandomChar(chars: string): string {
    const randomIndex = Math.floor(Math.random() * chars.length);
    return chars[randomIndex];
  }
}

// Instância singleton
export const passwordSecurity = PasswordSecurity.getInstance();

// Hook para uso em componentes React
export const usePasswordSecurity = () => {
  const validatePassword = (password: string, customPolicy?: Partial<PasswordPolicy>) =>
    passwordSecurity.validatePassword(password, customPolicy);
  
  const generatePassword = (length?: number) => 
    passwordSecurity.generateSecurePassword(length);
  
  const getStrengthTips = (password: string) =>
    passwordSecurity.getPasswordStrengthTips(password);
  
  const checkBreach = async (password: string) =>
    passwordSecurity.checkPasswordBreach(password);

  return {
    validatePassword,
    generatePassword,
    getStrengthTips,
    checkBreach
  };
};

// Schema pré-configurado para uso geral
export const strongPasswordSchema = passwordSecurity.createPasswordSchema();

// Exportar tipos
export type { PasswordStrengthResult, PasswordPolicy };
