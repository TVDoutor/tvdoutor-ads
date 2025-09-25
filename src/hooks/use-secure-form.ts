/**
 * Hook personalizado para formulários com proteção CSRF
 */

import { useCallback, useEffect, useState } from 'react';
import { useCSRFProtection } from '@/lib/csrf-protection';
import { logError } from '@/utils/secureLogger';

interface SecureFormOptions {
  onSubmit: (data: any, csrfToken: string) => Promise<void>;
  onError?: (error: Error) => void;
}

export const useSecureForm = ({ onSubmit, onError }: SecureFormOptions) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string>('');
  const { getToken, validateToken } = useCSRFProtection();

  // Gerar token CSRF quando o hook for montado
  useEffect(() => {
    const generateToken = async () => {
      try {
        const token = await getToken();
        setCsrfToken(token);
      } catch (error) {
        logError('Erro ao gerar token CSRF', error);
      }
    };
    
    generateToken();
  }, [getToken]);

  // Função segura de submit
  const handleSecureSubmit = useCallback(async (formData: any) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);

    try {
      // Validar token CSRF
      const isValidToken = await validateToken(csrfToken);
      if (!isValidToken) {
        throw new Error('Token CSRF inválido. Recarregue a página e tente novamente.');
      }

      // Executar o submit com o token validado
      await onSubmit(formData, csrfToken);
      
      // Gerar novo token após submit bem-sucedido
      const newToken = await getToken();
      setCsrfToken(newToken);
      
    } catch (error) {
      logError('Erro no submit seguro do formulário', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Erro desconhecido'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, csrfToken, validateToken, onSubmit, onError, getToken]);

  // Função para obter campos hidden do formulário
  const getCSRFFields = useCallback(() => {
    return {
      'csrf_token': csrfToken,
      '_method': 'POST'
    };
  }, [csrfToken]);

  // Função para obter headers seguros
  const getSecureHeaders = useCallback(() => {
    return {
      'X-CSRF-Token': csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json'
    };
  }, [csrfToken]);

  return {
    isSubmitting,
    csrfToken,
    handleSecureSubmit,
    getCSRFFields,
    getSecureHeaders
  };
};

// Hook para validar requisições de entrada
export const useRequestValidation = () => {
  const { validateToken } = useCSRFProtection();

  const validateIncomingRequest = useCallback(async (headers: Record<string, string>) => {
    const csrfToken = headers['x-csrf-token'] || headers['X-CSRF-Token'];
    
    if (!csrfToken) {
      logError('Token CSRF ausente na requisição');
      return false;
    }

    const isValid = await validateToken(csrfToken);
    if (!isValid) {
      logError('Token CSRF inválido na requisição');
      return false;
    }

    return true;
  }, [validateToken]);

  return { validateIncomingRequest };
};
