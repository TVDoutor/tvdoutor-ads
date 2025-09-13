import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Building, Map } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AutocompleteOption {
  id: string;
  name: string;
  displayText: string;
  type: 'city' | 'address' | 'geocoded';
  icon?: React.ReactNode;
}

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (option: AutocompleteOption) => void;
  options: AutocompleteOption[];
  loading?: boolean;
  placeholder?: string;
  className?: string;
}

export function Autocomplete({
  value,
  onChange,
  onSelect,
  options,
  loading = false,
  placeholder = "Digite uma localização...",
  className
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Abrir dropdown quando há opções
  useEffect(() => {
    setIsOpen(options.length > 0 && value.length > 0);
  }, [options, value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < options.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : options.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          handleSelect(options[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (option: AutocompleteOption) => {
    onSelect(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const getOptionIcon = (type: string) => {
    switch (type) {
      case 'city':
        return <Map className="w-4 h-4 text-blue-600" />;
      case 'address':
        return <Building className="w-4 h-4 text-green-600" />;
      case 'geocoded':
        return <MapPin className="w-4 h-4 text-purple-600" />;
      default:
        return <MapPin className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="relative" ref={inputRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(options.length > 0 && value.length > 0)}
          placeholder={placeholder}
          className={cn("pl-10", className)}
          autoComplete="off"
        />
      </div>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 shadow-lg border">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Buscando localizações...</p>
              </div>
            ) : options.length > 0 ? (
              <div className="max-h-60 overflow-y-auto">
                {options.map((option, index) => (
                  <button
                    key={option.id}
                    type="button"
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0",
                      "flex items-center gap-3",
                      index === highlightedIndex && "bg-muted/50"
                    )}
                    onClick={() => handleSelect(option)}
                  >
                    {getOptionIcon(option.type)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {option.displayText}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {option.type === 'city' ? 'Cidade' : 
                         option.type === 'address' ? 'Endereço específico' : 
                         'Endereço geocodificado'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma localização encontrada</p>
                <p className="text-xs mt-1">Tente uma busca diferente</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

