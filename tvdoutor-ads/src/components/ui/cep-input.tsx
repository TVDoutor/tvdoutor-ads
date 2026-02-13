import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  MapPin,
  Info
} from 'lucide-react';
import { useCEPValidation, type CEPValidationState } from '@/hooks/useCEPValidation';
import { cn } from '@/lib/utils';
import { formatCEP } from '@/lib/viacep-service';
import type { ViaCEPAddress } from '@/lib/viacep-service';

interface CEPInputProps {
  value: string;
  onChange: (value: string, addressData?: ViaCEPAddress | null) => void;
  onAddressSelect?: (address: ViaCEPAddress) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  showValidation?: boolean;
  autoFormat?: boolean;
  required?: boolean;
}

export const CEPInput = ({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Ex: 01310-100",
  label,
  className,
  disabled = false,
  showValidation = true,
  autoFormat = true,
  required = false
}: CEPInputProps) => {
  const [localValue, setLocalValue] = useState(value);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout>();

  const {
    validationState,
    isValidating,
    addressData,
    error,
    validateCEP,
    clearValidation,
    formatCEPValue
  } = useCEPValidation({
    autoValidate: true,
    debounceMs: 800,
    onAddressFound: (address) => {
      if (onAddressSelect) {
        onAddressSelect(address);
      }
      setShowSuggestion(true);
      // Auto-hide suggestion after 5 seconds
      setTimeout(() => setShowSuggestion(false), 5000);
    }
  });

  // Sincronizar com prop value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Auto-formatação
    if (autoFormat) {
      // Remove tudo que não é número
      const numbers = inputValue.replace(/\D/g, '');
      
      // Limita a 8 dígitos
      const limited = numbers.slice(0, 8);
      
      // Formata com hífen se tiver 5 ou mais dígitos
      if (limited.length > 5) {
        inputValue = `${limited.slice(0, 5)}-${limited.slice(5)}`;
      } else {
        inputValue = limited;
      }
    }
    
    setLocalValue(inputValue);
    onChange(inputValue, null);
    
    // Debounce para validação
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    debounceTimeout.current = setTimeout(() => {
      if (inputValue.replace(/\D/g, '').length === 8) {
        validateCEP(inputValue);
      } else {
        clearValidation();
        setShowSuggestion(false);
      }
    }, 800);
  };

  const handleBlur = () => {
    // Formata ao perder foco se tiver 8 dígitos
    const numbers = localValue.replace(/\D/g, '');
    if (numbers.length === 8 && autoFormat) {
      const formatted = formatCEPValue(localValue);
      setLocalValue(formatted);
      onChange(formatted, addressData);
    }
  };

  const getValidationIcon = () => {
    if (!showValidation) return null;
    
    switch (validationState) {
      case 'validating':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'valid':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'invalid':
      case 'not-found':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <MapPin className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getInputBorderColor = () => {
    if (!showValidation || validationState === 'idle' || validationState === 'validating') {
      return '';
    }
    
    if (validationState === 'valid') {
      return 'border-green-500 focus-visible:ring-green-500';
    }
    
    if (validationState === 'invalid' || validationState === 'not-found') {
      return 'border-red-500 focus-visible:ring-red-500';
    }
    
    return '';
  };

  const getValidationMessage = () => {
    if (!showValidation) return null;
    
    if (error) {
      return (
        <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
          <XCircle className="w-3 h-3" />
          {error}
        </p>
      );
    }
    
    if (validationState === 'valid' && addressData) {
      return (
        <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
          <CheckCircle2 className="w-3 h-3" />
          CEP válido
        </p>
      );
    }
    
    return null;
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          {getValidationIcon()}
        </div>
        
        <Input
          type="text"
          value={localValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pl-10 pr-4",
            getInputBorderColor()
          )}
          maxLength={9} // 8 dígitos + 1 hífen
        />
        
        {validationState === 'valid' && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
              Válido
            </Badge>
          </div>
        )}
      </div>
      
      {getValidationMessage()}
      
      {/* Sugestão de endereço encontrado */}
      {showSuggestion && addressData && validationState === 'valid' && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 animate-in slide-in-from-top-2">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs space-y-1">
              <p className="font-medium text-blue-900">Endereço encontrado:</p>
              <p className="text-blue-700">
                {addressData.logradouro && <span>{addressData.logradouro}</span>}
                {addressData.bairro && <span>, {addressData.bairro}</span>}
              </p>
              <p className="text-blue-600">
                {addressData.localidade}/{addressData.uf}
              </p>
            </div>
            <button
              onClick={() => setShowSuggestion(false)}
              className="ml-auto text-blue-400 hover:text-blue-600"
              aria-label="Fechar"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {!label && (
        <p className="text-xs text-muted-foreground">
          Digite o CEP com ou sem hífen (ex: 01310-100 ou 01310100)
        </p>
      )}
    </div>
  );
};

