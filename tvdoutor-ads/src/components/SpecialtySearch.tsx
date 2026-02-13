// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Stethoscope, 
  X,
  ChevronDown,
  ChevronUp,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SpecialtySearchProps {
  selectedSpecialties: string[];
  onSpecialtiesChange: (specialties: string[]) => void;
  className?: string;
}

export const SpecialtySearch: React.FC<SpecialtySearchProps> = ({
  selectedSpecialties,
  onSpecialtiesChange,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([]);
  const [filteredSpecialties, setFilteredSpecialties] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carregar especialidades disponíveis
  useEffect(() => {
    loadSpecialties();
  }, []);

  // Filtrar especialidades baseado no termo de busca
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredSpecialties(availableSpecialties);
    } else {
      const filtered = availableSpecialties.filter(specialty =>
        specialty.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSpecialties(filtered);
    }
  }, [searchTerm, availableSpecialties]);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadSpecialties = async () => {
    try {
      setLoading(true);
      console.log('🔍 Carregando especialidades médicas...');
      
      // Tentar buscar da view enriquecida primeiro
      let { data: specialtyData, error } = await supabase
        .from('v_screens_enriched')
        .select('specialty')
        .not('specialty', 'is', null);

      // Fallback para tabela screens se a view não existir
      if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
        console.log('⚠️ View v_screens_enriched indisponível, usando tabela screens');
        const fallback = await supabase
          .from('screens')
          .select('specialty')
          .not('specialty', 'is', null);
        
        specialtyData = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.error('❌ Erro ao carregar especialidades:', error);
        return;
      }

      if (specialtyData) {
        const specialties = new Set<string>();
        
        specialtyData.forEach((item: any) => {
          if (Array.isArray(item.specialty)) {
            item.specialty.forEach((spec: string) => {
              if (spec && spec.trim()) {
                specialties.add(spec.trim());
              }
            });
          } else if (typeof item.specialty === 'string' && item.specialty.trim()) {
            specialties.add(item.specialty.trim());
          }
        });
        
        const sortedSpecialties = Array.from(specialties).sort();
        console.log('✅ Especialidades carregadas:', sortedSpecialties.length);
        setAvailableSpecialties(sortedSpecialties);
      }
    } catch (error) {
      console.error('💥 Erro ao carregar especialidades:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSpecialty = (specialty: string) => {
    if (!selectedSpecialties.includes(specialty)) {
      const newSpecialties = [...selectedSpecialties, specialty];
      onSpecialtiesChange(newSpecialties);
      console.log('➕ Especialidade adicionada:', specialty);
    }
    
    // Limpar busca e fechar dropdown após seleção
    setSearchTerm('');
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  const removeSpecialty = (specialty: string) => {
    const newSpecialties = selectedSpecialties.filter(s => s !== specialty);
    onSpecialtiesChange(newSpecialties);
    console.log('➖ Especialidade removida:', specialty);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredSpecialties.length > 0) {
      e.preventDefault();
      const firstMatch = filteredSpecialties.find(
        specialty => !selectedSpecialties.includes(specialty)
      );
      if (firstMatch) {
        addSpecialty(firstMatch);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      inputRef.current?.blur();
    }
  };

  // Especialidades não selecionadas para mostrar no dropdown
  const unselectedSpecialties = filteredSpecialties.filter(
    specialty => !selectedSpecialties.includes(specialty)
  );

  return (
    <div className={cn("space-y-3", className)}>
      <Label className="flex items-center gap-2">
        <Stethoscope className="w-4 h-4" />
        Especialidades Médicas
      </Label>
      
      {/* Campo de busca */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Busque por especialidade (ex: CARDIOLOGIA, NEUROLOGIA...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-12"
            disabled={loading}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={clearSearch}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {isDropdownOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Dropdown com lista de especialidades */}
        {isDropdownOpen && (
          <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-hidden shadow-lg">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-pulse">Carregando especialidades...</div>
                </div>
              ) : unselectedSpecialties.length > 0 ? (
                <div className="max-h-60 overflow-y-auto">
                  {unselectedSpecialties.map((specialty, index) => (
                    <div
                      key={specialty}
                      className={cn(
                        "flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors",
                        index === 0 && searchTerm && "bg-blue-50"
                      )}
                      onClick={() => addSpecialty(specialty)}
                    >
                      <span className="text-sm font-medium">{specialty}</span>
                      <Plus className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? (
                    <div>
                      <p className="text-sm">Nenhuma especialidade encontrada para "{searchTerm}"</p>
                      {availableSpecialties.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          Tente um termo diferente
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm">
                      {selectedSpecialties.length === availableSpecialties.length
                        ? "Todas as especialidades já foram selecionadas"
                        : "Nenhuma especialidade disponível"
                      }
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Especialidades selecionadas */}
      {selectedSpecialties.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">
              Selecionadas ({selectedSpecialties.length})
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSpecialtiesChange([])}
              className="text-gray-500 hover:text-gray-700 h-auto p-1"
            >
              <X className="w-4 h-4 mr-1" />
              Limpar todas
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg">
            {selectedSpecialties.map(specialty => (
              <Badge 
                key={specialty} 
                variant="secondary" 
                className="gap-2 bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
              >
                <Stethoscope className="w-3 h-3" />
                {specialty}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto w-auto p-0 hover:bg-transparent"
                  onClick={() => removeSpecialty(specialty)}
                >
                  <X className="w-3 h-3 text-blue-600 hover:text-blue-800" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Informações úteis */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Digite para buscar especialidades médicas</p>
        <p>• Clique nas especialidades para selecioná-las</p>
        <p>• Use Enter para selecionar o primeiro resultado</p>
        {availableSpecialties.length > 0 && (
          <p>• {availableSpecialties.length} especialidades disponíveis</p>
        )}
      </div>
    </div>
  );
};
