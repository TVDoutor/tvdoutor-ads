import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { CategoryService, type CategorySearchResult } from '@/lib/category-service';
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
  // Lista de CEPs em texto
  cepListText?: string;
}

interface ScreenFiltersProps {
  filters: ScreenFilters;
  onFiltersChange: (filters: ScreenFilters) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  selectedCategoryIds?: string[];
  onCategorySelectChange?: (categoryId: string, checked: boolean) => void;
  categorySpecialties?: Record<string, string[]>;
  onCategorySpecialtiesChange?: (categoryId: string, specialties: string[]) => void;
  loading?: boolean;
}

// Classes sociais suportadas no sistema (mesmo conjunto usado no Inventário/importação)
// Mantém ordem “do topo para baixo” e inclui faixas intermediárias e ND.
const AVAILABLE_CLASSES = ['A', 'AB', 'ABC', 'B', 'BC', 'C', 'CD', 'D', 'E', 'ND'];

export const ScreenFilters: React.FC<ScreenFiltersProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  selectedCategoryIds = [],
  onCategorySelectChange,
  categorySpecialties = {},
  onCategorySpecialtiesChange,
  loading = false
}) => {
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('quick');
  const [quickQuery, setQuickQuery] = useState<string>(filters.nameOrCode || '');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [categoryResults, setCategoryResults] = useState<CategorySearchResult[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const hasCategoryFeature = typeof onCategorySelectChange === 'function';

  // Manter o input de "Pesquisa Rápida" sincronizado com o estado externo
  useEffect(() => {
    setQuickQuery(filters.nameOrCode || '');
  }, [filters.nameOrCode]);

  // Carregar dados para os filtros
  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    if (!hasCategoryFeature) return;

    const run = async () => {
      const query = categoryQuery.trim();
      if (!query) {
        setCategoryResults([]);
        return;
      }

      try {
        setCategoryLoading(true);
        const results = await CategoryService.searchCategories(query);
        setCategoryResults(results);
      } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        toast.error('Não foi possível buscar categorias.');
      } finally {
        setCategoryLoading(false);
      }
    };

    const timer = window.setTimeout(run, 180);
    return () => window.clearTimeout(timer);
  }, [categoryQuery, hasCategoryFeature]);

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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);

    // Evitar colisão de filtros entre abas:
    // quando troca de aba, limpamos os campos específicos das outras abas,
    // mantendo classes/especialidades (que são filtros globais).
    if (tab === 'radius') {
      updateFilters({
        cepListText: '',
        nameOrCode: '',
        address: '',
        city: '',
        state: '',
      });
      return;
    }

    if (tab === 'cep') {
      updateFilters({
        radiusSearchAddress: '',
        nameOrCode: '',
        address: '',
        city: '',
        state: '',
      });
      return;
    }

    if (tab === 'quick') {
      updateFilters({
        radiusSearchAddress: '',
        cepListText: '',
        city: '',
        state: '',
      });
      return;
    }

    if (tab === 'advanced') {
      updateFilters({
        radiusSearchAddress: '',
        cepListText: '',
      });
      return;
    }

    if (tab === 'category') {
      updateFilters({
        radiusSearchAddress: '',
        cepListText: '',
        nameOrCode: '',
        address: '',
        city: '',
        state: '',
      });
    }
  };

  const updateQuickQuery = (value: string) => {
    setQuickQuery(value);
    updateFilters({ nameOrCode: value, address: value });
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
           filters.radiusSearchAddress.trim() !== '' ||
           (filters.cepListText && filters.cepListText.trim() !== '') ||
           ((selectedCategoryIds?.length ?? 0) > 0);
  };

  const selectedCategories = CategoryService.getCategoriesByIds(selectedCategoryIds ?? []);

  const getCategorySpecialties = (category: CategorySearchResult) => {
    return categorySpecialties[category.id] && categorySpecialties[category.id].length > 0
      ? categorySpecialties[category.id]
      : category.specialties;
  };

  const removeCategorySpecialty = (category: CategorySearchResult, specialty: string) => {
    const nextSpecialties = getCategorySpecialties(category).filter((item) => item !== specialty);
    if (nextSpecialties.length === 0) {
      toast.error('A categoria precisa manter pelo menos uma especialidade.');
      return;
    }
    onCategorySpecialtiesChange?.(category.id, nextSpecialties);
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
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className={`grid w-full ${hasCategoryFeature ? 'grid-cols-5' : 'grid-cols-4'}`}>
            <TabsTrigger value="quick">Rápido</TabsTrigger>
            <TabsTrigger value="radius">Raio</TabsTrigger>
            <TabsTrigger value="cep">CEPs</TabsTrigger>
            <TabsTrigger value="advanced">Avançado</TabsTrigger>
            {hasCategoryFeature && <TabsTrigger value="category">Categoria</TabsTrigger>}
          </TabsList>

          <TabsContent value="quick" className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Pesquisa Rápida
              </Label>
              <Input
                placeholder="Nome, código, endereço ou CEP"
                value={quickQuery}
                onChange={(e) => updateQuickQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onApplyFilters(); }}
              />
            </div>
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                Classes
              </Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_CLASSES.map(className => (
                  <Badge
                    key={className}
                    variant={filters.selectedClasses.includes(className) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleClass(className)}
                  >
                    Classe {className}
                  </Badge>
                ))}
              </div>
            </div>
            <SpecialtySearch
              selectedSpecialties={filters.selectedSpecialties}
              onSpecialtiesChange={(specialties) => updateFilters({ selectedSpecialties: specialties })}
            />
            <div className="flex justify-between items-center pt-2">
              <Button 
                variant="outline" 
                onClick={onClearFilters}
                disabled={!hasActiveFilters()}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Limpar Filtros
              </Button>
              <Button onClick={onApplyFilters} disabled={loading} className="gap-2">
                {loading ? (<><RefreshCw className="w-4 h-4 animate-spin" />Buscando...</>) : (<><Search className="w-4 h-4" />Buscar Telas</>)}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="radius" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-blue-800 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Localização
                </Label>
                <Input
                  placeholder="Endereço ou CEP"
                  value={filters.radiusSearchAddress}
                  onChange={(e) => updateFilters({ radiusSearchAddress: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') onApplyFilters(); }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-blue-800 flex items-center gap-2">
                  <Navigation className="w-4 h-4" />
                  Raio (km)
                </Label>
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
            <div className="flex justify-end">
              <Button onClick={onApplyFilters} disabled={loading} className="gap-2">
                {loading ? (<><RefreshCw className="w-4 h-4 animate-spin" />Buscando...</>) : (<><Search className="w-4 h-4" />Buscar por Raio</>)}
              </Button>
            </div>
            <div className="text-xs text-blue-600">💡 Busque por Endereço, Bairro, Cidade ou CEP.</div>
          </TabsContent>

          <TabsContent value="cep" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-indigo-800">CEPs (separados por vírgula, espaço ou linha)</Label>
                <textarea
                  className="w-full border rounded-md p-2 h-24"
                  placeholder="01306-060, 01306-900, 01306-901"
                  value={filters.cepListText || ''}
                  onChange={(e) => updateFilters({ cepListText: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-indigo-800 flex items-center gap-2">
                  <Navigation className="w-4 h-4" />
                  Raio (km)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={filters.radiusKm}
                    onChange={(e) => updateFilters({ radiusKm: parseInt(e.target.value) || 5 })}
                    className="flex-1"
                  />
                  <span className="text-sm text-indigo-600">km</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={onApplyFilters} disabled={loading || !(filters.cepListText && filters.cepListText.trim())} className="gap-2">
                <Search className="w-4 h-4" />
                Buscar por CEP
              </Button>
            </div>
            <div className="text-xs text-indigo-700">💡 Informe múltiplos CEPs para buscar telas próximas em lote.</div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Endereço/Bairro</Label>
                <Input
                  placeholder="Ex: Rua Augusta"
                  value={filters.address}
                  onChange={(e) => updateFilters({ address: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">Cidade</Label>
                <Input
                  placeholder="Ex: São Paulo"
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
            <div className="flex justify-end">
              <Button onClick={onApplyFilters} disabled={loading} className="gap-2">
                {loading ? (<><RefreshCw className="w-4 h-4 animate-spin" />Buscando...</>) : (<><Search className="w-4 h-4" />Buscar Avançado</>)}
              </Button>
            </div>
          </TabsContent>

          {hasCategoryFeature && (
            <TabsContent value="category" className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Buscar por Categoria
                </Label>
                <Input
                  placeholder="Ex: Odonto, Cardio, Oftalmo..."
                  value={categoryQuery}
                  onChange={(e) => setCategoryQuery(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Digite uma categoria para adicionar os pontos relacionados às especialidades agrupadas.
                </p>
              </div>

              {selectedCategories.length > 0 && (
                <div className="space-y-2">
                  <Label>Categorias Selecionadas</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategories.map((category) => (
                      <Badge key={category.id} variant="default" className="flex items-center gap-1">
                        {category.label}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => onCategorySelectChange?.(category.id, false)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-dashed p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Resultados por categoria</span>
                  {categoryResults.length > 0 && (
                    <Badge variant="secondary">{categoryResults.length} encontrada(s)</Badge>
                  )}
                </div>

                {categoryLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Buscando categorias...
                  </div>
                ) : categoryQuery.trim() ? (
                  categoryResults.length > 0 ? (
                    <div className="space-y-2">
                      {categoryResults.map((category) => (
                        <label
                          key={category.id}
                          className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                        >
                          <Checkbox
                            checked={(selectedCategoryIds ?? []).includes(category.id)}
                            onCheckedChange={(checked) => onCategorySelectChange?.(category.id, Boolean(checked))}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{category.label}</span>
                              <Badge variant="outline" className="text-xs">
                                {category.specialtiesCount} especialidades
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Correspondência: {category.matchedBy}
                            </p>
                            <div className="mt-2">
                              <p className="text-xs font-medium text-foreground">Especialidades:</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {getCategorySpecialties(category).map((specialty) => (
                                  <Badge key={`${category.id}-${specialty}`} variant="outline" className="flex items-center gap-1">
                                    <span className="text-[11px]">{specialty}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 w-4 p-0 hover:bg-transparent"
                                      onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        removeCategorySpecialty(category, specialty);
                                      }}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma categoria encontrada para "{categoryQuery}".
                    </p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Busque uma categoria para habilitar a seleção em lote.
                  </p>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>

        <Separator />

        {hasActiveFilters() && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800 font-medium">Filtros Ativos:</p>
            <div className="mt-2 space-y-1 text-xs text-blue-700">
              {filters.cepListText && filters.cepListText.trim() && (
                <p>• Lista de CEPs: {filters.cepListText.split(/\s|,|;/).filter(Boolean).slice(0,5).join(', ')}{filters.cepListText.split(/\s|,|;/).filter(Boolean).length>5?'...':''}</p>
              )}
              {filters.radiusSearchAddress && (
                <>
                  <p>• Busca por Raio: "{filters.radiusSearchAddress}"</p>
                  <p>• Raio: {filters.radiusKm} km</p>
                </>
              )}
              {filters.nameOrCode && <p>• Termo: "{filters.nameOrCode}"</p>}
              {filters.city && <p>• Cidade: "{filters.city}"</p>}
              {filters.state && <p>• Estado: "{filters.state}"</p>}
              {filters.selectedClasses.length > 0 && (
                <p>• Classes: {filters.selectedClasses.join(', ')}</p>
              )}
              {filters.selectedSpecialties.length > 0 && (
                <p>• Especialidades: {filters.selectedSpecialties.join(', ')}</p>
              )}
              {selectedCategories.length > 0 && (
                <p>• Categorias: {selectedCategories.map((category) => category.label).join(', ')}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

