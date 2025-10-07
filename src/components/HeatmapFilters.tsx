import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, X, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HeatmapFilters as HeatmapFiltersType, CityOption, ClassOption } from '@/hooks/useHeatmapData';

interface HeatmapFiltersProps {
  filters: HeatmapFiltersType;
  onFiltersChange: (filters: HeatmapFiltersType) => void;
  onApplyFilters: () => void;
  cities: CityOption[];
  classes: ClassOption[];
  loading?: boolean;
}

export const HeatmapFilters: React.FC<HeatmapFiltersProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
  cities,
  classes,
  loading = false
}) => {
  const [startDate, setStartDate] = useState<Date | undefined>(
    filters.startDate ? new Date(filters.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    filters.endDate ? new Date(filters.endDate) : undefined
  );

  // Atualizar datas quando os filtros mudarem
  useEffect(() => {
    setStartDate(filters.startDate ? new Date(filters.startDate) : undefined);
    setEndDate(filters.endDate ? new Date(filters.endDate) : undefined);
  }, [filters.startDate, filters.endDate]);

  const handleDateChange = (date: Date | undefined, type: 'start' | 'end') => {
    if (type === 'start') {
      setStartDate(date);
      onFiltersChange({
        ...filters,
        startDate: date ? format(date, 'yyyy-MM-dd') : undefined
      });
    } else {
      setEndDate(date);
      onFiltersChange({
        ...filters,
        endDate: date ? format(date, 'yyyy-MM-dd') : undefined
      });
    }
  };

  const handleCityChange = (city: string) => {
    onFiltersChange({
      ...filters,
      city: city === 'all' ? undefined : city
    });
  };

  const handleClassChange = (classValue: string) => {
    onFiltersChange({
      ...filters,
      class: classValue === 'all' ? undefined : classValue
    });
  };

  const handleNormalizeChange = (normalize: boolean) => {
    onFiltersChange({
      ...filters,
      normalize
    });
  };

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    onFiltersChange({
      startDate: undefined,
      endDate: undefined,
      city: undefined,
      class: undefined,
      normalize: false
    });
  };

  const hasActiveFilters = filters.startDate || filters.endDate || filters.city || filters.class || filters.normalize;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros do Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Período */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Período</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Data Inicial</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => handleDateChange(date, 'start')}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Data Final</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => handleDateChange(date, 'end')}
                    initialFocus
                    locale={ptBR}
                    disabled={(date) => startDate ? date < startDate : false}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Cidade */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Cidade</Label>
          <Select value={filters.city || 'all'} onValueChange={handleCityChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar cidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as cidades</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city.city} value={city.city}>
                  {city.city} ({city.proposal_count} propostas)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Classe */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Classe da Tela</Label>
          <Select value={filters.class || 'all'} onValueChange={handleClassChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar classe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as classes</SelectItem>
              {classes.map((classItem) => (
                <SelectItem key={classItem.class} value={classItem.class}>
                  {classItem.class} ({classItem.proposal_count} propostas)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Normalização */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Normalizar Dados</Label>
            <p className="text-xs text-gray-600">
              Mostra popularidade relativa em vez de contagem absoluta
            </p>
          </div>
          <Switch
            checked={filters.normalize || false}
            onCheckedChange={handleNormalizeChange}
          />
        </div>

        {/* Ações */}
        <div className="flex gap-2 pt-4">
          <Button 
            onClick={onApplyFilters} 
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Aplicando...
              </>
            ) : (
              <>
                <Filter className="h-4 w-4 mr-2" />
                Aplicar Filtros
              </>
            )}
          </Button>
          {hasActiveFilters && (
            <Button 
              variant="outline" 
              onClick={clearFilters}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>

        {/* Resumo dos filtros ativos */}
        {hasActiveFilters && (
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium text-gray-700">Filtros Ativos:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.startDate && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  Desde: {format(new Date(filters.startDate), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              )}
              {filters.endDate && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  Até: {format(new Date(filters.endDate), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              )}
              {filters.city && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  Cidade: {filters.city}
                </span>
              )}
              {filters.class && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                  Classe: {filters.class}
                </span>
              )}
              {filters.normalize && (
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                  Normalizado
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

