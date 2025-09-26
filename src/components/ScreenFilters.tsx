import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  MapPin, 
  Star, 
  Filter,
  RefreshCw,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SpecialtySearch } from './SpecialtySearch';

export interface ScreenFilters {
  nameOrCode: string;
  address: string;
  city: string;
  state: string;
  selectedClasses: string[];
  selectedSpecialties: string[];
}

interface ScreenFiltersProps {
  filters: ScreenFilters;
  onFiltersChange: (filters: ScreenFilters) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  loading?: boolean;
}

const AVAILABLE_CLASSES = ['A', 'B', 'C', 'D', 'E'];

export const ScreenFilters: React.FC<ScreenFiltersProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  loading = false
}) => {
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableStates, setAvailableStates] = useState<string[]>([]);

  // Carregar dados para os filtros
  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      // Buscar cidades
      const { data: cityData } = await supabase
        .from('v_screens_enriched')
        .select('city')
        .not('city', 'is', null);

      if (cityData) {
        const cities = Array.from(new Set(cityData.map((item: any) => item.city))).sort();
        setAvailableCities(cities);
      }

      // Buscar estados
      const { data: stateData } = await supabase
        .from('v_screens_enriched')
        .select('state')
        .not('state', 'is', null);

      if (stateData) {
        const states = Array.from(new Set(stateData.map((item: any) => item.state))).sort();
        setAvailableStates(states);
      }
    } catch (error) {
      console.error('Erro ao carregar opções de filtro:', error);
    }
  };

  const updateFilters = (updates: Partial<ScreenFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleClass = (className: string) => {
    const newClasses = filters.selectedClasses.includes(className)
      ? filters.selectedClasses.filter(c => c !== className)
      : [...filters.selectedClasses, className];
    updateFilters({ selectedClasses: newClasses });
  };

  const removeClass = (className: string) => {
    updateFilters({ selectedClasses: filters.selectedClasses.filter(c => c !== className) });
  };

  const hasActiveFilters = () => {
    return filters.nameOrCode.trim() !== '' ||
           filters.address.trim() !== '' ||
           filters.city.trim() !== '' ||
           filters.state.trim() !== '' ||
           filters.selectedClasses.length > 0 ||
           filters.selectedSpecialties.length > 0;
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filtros de Busca
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Busca por Nome/Código */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Nome ou Código do Ponto
          </Label>
          <Input
            placeholder="Ex: P2000, Nipo, Santa Casa de São Paulo, P2000.20..."
            value={filters.nameOrCode}
            onChange={(e) => updateFilters({ nameOrCode: e.target.value })}
          />
        </div>

        {/* Busca por Localização */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Localização
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-600">Endereço/Rua/Avenida/Bairro</Label>
              <Input
                placeholder="Ex: Rua Augusta, Avenida Paulista..."
                value={filters.address}
                onChange={(e) => updateFilters({ address: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm text-gray-600">Cidade</Label>
              <Input
                placeholder="Ex: São Paulo, Rio de Janeiro..."
                value={filters.city}
                onChange={(e) => updateFilters({ city: e.target.value })}
                list="cities"
              />
              <datalist id="cities">
                {availableCities.map(city => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="w-full md:w-1/2">
            <Label className="text-sm text-gray-600">Estado</Label>
            <Input
              placeholder="Ex: SP, RJ, MG..."
              value={filters.state}
              onChange={(e) => updateFilters({ state: e.target.value })}
              list="states"
            />
            <datalist id="states">
              {availableStates.map(state => (
                <option key={state} value={state} />
              ))}
            </datalist>
          </div>
        </div>

        <Separator />

        {/* Filtro por Classe */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Classes
          </Label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_CLASSES.map(className => (
              <Badge
                key={className}
                variant={filters.selectedClasses.includes(className) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleClass(className)}
              >
                Classe {className}
              </Badge>
            ))}
          </div>
          {filters.selectedClasses.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-sm text-gray-600">Selecionadas:</span>
              {filters.selectedClasses.map(className => (
                <Badge key={className} variant="secondary" className="gap-1">
                  {className}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => removeClass(className)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Filtro por Especialidade - Novo componente */}
        <SpecialtySearch
          selectedSpecialties={filters.selectedSpecialties}
          onSpecialtiesChange={(specialties) => updateFilters({ selectedSpecialties: specialties })}
        />

        {/* Botões de Ação */}
        <div className="flex justify-between items-center pt-4">
          <Button 
            variant="outline" 
            onClick={onClearFilters}
            disabled={!hasActiveFilters()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Limpar Filtros
          </Button>
          
          <Button 
            onClick={onApplyFilters}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Buscar Telas
              </>
            )}
          </Button>
        </div>

        {/* Resumo dos filtros ativos */}
        {hasActiveFilters() && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800 font-medium">Filtros Ativos:</p>
            <div className="mt-2 space-y-1 text-xs text-blue-700">
              {filters.nameOrCode && <p>• Nome/Código: "{filters.nameOrCode}"</p>}
              {filters.address && <p>• Endereço: "{filters.address}"</p>}
              {filters.city && <p>• Cidade: "{filters.city}"</p>}
              {filters.state && <p>• Estado: "{filters.state}"</p>}
              {filters.selectedClasses.length > 0 && (
                <p>• Classes: {filters.selectedClasses.join(', ')}</p>
              )}
              {filters.selectedSpecialties.length > 0 && (
                <p>• Especialidades: {filters.selectedSpecialties.join(', ')}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

