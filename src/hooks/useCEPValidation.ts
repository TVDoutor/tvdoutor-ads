import { useState, useEffect, useCallback } from 'react';
import { 
  getAddressByCEP, 
  isValidCEPFormat, 
  formatCEP,
  type ViaCEPAddress 
} from '@/lib/viacep-service';

export type CEPValidationState = 'idle' | 'validating' | 'valid' | 'invalid' | 'not-found';

interface UseCEPValidationReturn {
  // Estado
  validationState: CEPValidationState;
  isValidating: boolean;
  isValid: boolean;
  addressData: ViaCEPAddress | null;
  error: string | null;
  
  // Funções
  validateCEP: (cep: string) => Promise<void>;
  clearValidation: () => void;
  formatCEPValue: (cep: string) => string;
}

interface UseCEPValidationOptions {
  autoValidate?: boolean;
  debounceMs?: number;
  onAddressFound?: (address: ViaCEPAddress) => void;
}

/**
 * Hook para validação de CEP com integração ViaCEP
 */
export function useCEPValidation(options: UseCEPValidationOptions = {}): UseCEPValidationReturn {
  const {
    autoValidate = true,
    debounceMs = 500,
    onAddressFound
  } = options;

  const [validationState, setValidationState] = useState<CEPValidationState>('idle');
  const [addressData, setAddressData] = useState<ViaCEPAddress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearValidation = useCallback(() => {
    setValidationState('idle');
    setAddressData(null);
    setError(null);
  }, []);

  const validateCEP = useCallback(async (cep: string) => {
    // Limpar estado anterior
    setError(null);
    
    // Verificar formato básico
    if (!cep || cep.trim() === '') {
      clearValidation();
      return;
    }

    const cleanCEP = cep.replace(/\D/g, '');
    
    // CEP incompleto
    if (cleanCEP.length < 8) {
      setValidationState('idle');
      setAddressData(null);
      return;
    }

    // Formato inválido
    if (!isValidCEPFormat(cep)) {
      setValidationState('invalid');
      setError('CEP deve ter 8 dígitos');
      setAddressData(null);
      return;
    }

    // Validar com API
    setValidationState('validating');
    
    try {
      const address = await getAddressByCEP(cep);
      
      if (address) {
        setValidationState('valid');
        setAddressData(address);
        setError(null);
        
        // Callback quando endereço é encontrado
        if (onAddressFound) {
          onAddressFound(address);
        }
      } else {
        setValidationState('not-found');
        setError('CEP não encontrado');
        setAddressData(null);
      }
    } catch (err) {
      console.error('Erro ao validar CEP:', err);
      setValidationState('invalid');
      setError(err instanceof Error ? err.message : 'Erro ao validar CEP');
      setAddressData(null);
    }
  }, [onAddressFound, clearValidation]);

  const formatCEPValue = useCallback((cep: string): string => {
    return formatCEP(cep);
  }, []);

  return {
    validationState,
    isValidating: validationState === 'validating',
    isValid: validationState === 'valid',
    addressData,
    error,
    validateCEP,
    clearValidation,
    formatCEPValue
  };
}

