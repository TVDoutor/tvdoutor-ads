import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Search, 
  MapPin, 
  Star, 
  Filter,
  RefreshCw,
  X,
  Navigation,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SpecialtySearch } from './SpecialtySearch';
import { toast } from 'sonner';

export interface ScreenFilters {
  nameOrCode: string;
  address: string;
  city: string;
  state: string;
  selectedClasses: string[];
  selectedSpecialties: string[];
  // Novos campos para busca por raio
  radiusSearchAddress: string;
  radiusKm: number;
  useRadiusSearch: boolean;
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
           filters.selectedSpecialties.length > 0 ||
           filters.radiusSearchAddress.trim() !== '';
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
        {/* Busca por Raio - Layout do Mapa Interativo */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Busca por Endereço e Raio
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Localização
              </label>
              <Input
                placeholder="Ex: Av Paulista, 1000 ou CEP 01310-100 (ENTER para buscar)"
                value={filters.radiusSearchAddress}
                onChange={(e) => updateFilters({ radiusSearchAddress: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onApplyFilters();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Raio de Busca
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={filters.radiusKm}
                  onChange={(e) => updateFilters({ radiusKm: parseInt(e.target.value) || 5 })}
                  className="flex-1"
                />
                <span className="text-sm text-blue-600">km</span>
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-blue-600">
            💡 <strong>Dica:</strong> Busque por Endereço, Bairro, Cidade ou CEP (com ou sem hífen)
          </div>
        </div>

        <Separator />

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
              <Label className="text-sm text-gray-600">Endereço/Rua/Avenida/Bairro/CEP</Label>
              <Input
                placeholder="Ex: Rua Augusta ou CEP 01305-000..."
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
              {filters.radiusSearchAddress && (
                <>
                  <p>• <strong>Busca por Raio:</strong> "{filters.radiusSearchAddress}"</p>
                  <p>• Raio: {filters.radiusKm} km</p>
                </>
              )}
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

