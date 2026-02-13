import { useState } from "react";
import { Calendar, ChevronDown, Filter, RotateCcw, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { useCitiesFromDB } from "@/hooks/useCitiesFromDB";

export interface DashboardFilters {
  dateRange: string;
  proposals: string;
  specialty?: string;
  city?: string;
  status?: string;
  owner?: string;
  customDateRange?: DateRange;
}

interface FilterBarProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  onApplyFilters?: () => void;
  onResetFilters?: () => void;
}

const dateRangeOptions = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "7days", label: "Últimos 7 dias" },
  { value: "30days", label: "Últimos 30 dias" },
  { value: "thisMonth", label: "Este mês" },
  { value: "lastMonth", label: "Mês anterior" },
  { value: "custom", label: "Período personalizado" },
];

const proposalStatusOptions = [
  { value: "all", label: "Todas" },
  { value: "rascunho", label: "Rascunho" },
  { value: "enviada", label: "Enviadas" },
  { value: "em_analise", label: "Em Análise" },
  { value: "aceita", label: "Aceitas" },
  { value: "rejeitada", label: "Rejeitadas" },
];

const proposalTypeOptions = [
  "Padrão",
  "Premium", 
  "Básico",
  "Personalizado",
];

// cityOptions agora vem do banco via hook

export const FilterBar = ({ 
  filters, 
  onFiltersChange, 
  onApplyFilters,
  onResetFilters 
}: FilterBarProps) => {
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(filters.customDateRange);
  
  // Buscar cidades reais do banco
  const { data: cityOptions = [] } = useCitiesFromDB();
  
  const updateFilter = (key: keyof DashboardFilters, value: string | DateRange | undefined) => {
    const newFilters = {
      ...filters,
      [key]: value,
    };
    onFiltersChange(newFilters);
  };

  const handleResetFilters = () => {
    const resetFilters = {
      dateRange: "30days",
      proposals: "all",
      specialty: undefined,
      city: undefined,
      status: undefined,
      owner: undefined,
      customDateRange: undefined,
    };
    setCustomDateRange(undefined);
    onFiltersChange(resetFilters);
    onResetFilters?.();
  };

  const handleDateRangeChange = (value: string) => {
    if (value === "custom") {
      setDatePickerOpen(true);
    } else {
      setCustomDateRange(undefined);
      updateFilter('customDateRange', undefined);
    }
    updateFilter('dateRange', value);
  };

  const handleCustomDateSelect = (range: DateRange | undefined) => {
    setCustomDateRange(range);
    updateFilter('customDateRange', range);
    if (range?.from && range?.to) {
      setDatePickerOpen(false);
    }
  };

  const formatCustomDateRange = () => {
    if (!customDateRange?.from) return "Selecionar período...";
    if (!customDateRange.to) {
      return format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR });
    }
    return `${format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(customDateRange.to, "dd/MM/yyyy", { locale: ptBR })}`;
  };

  const handleApplyFilters = () => {
    onApplyFilters?.();
  };

  const hasAdvancedFilters = filters.specialty || filters.city || filters.status || filters.owner;

  return (
    <div className="filter-bar flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4">
        {/* Período */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 uppercase tracking-wide">
            PERÍODO
          </span>
          {filters.dateRange === "custom" ? (
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-64 justify-start text-left font-normal ${
                    customDateRange?.from && customDateRange?.to 
                      ? "border-orange-300 bg-orange-50 text-orange-700" 
                      : ""
                  }`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatCustomDateRange()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 max-w-2xl" align="start">
                <div className="p-3">
                  <h4 className="text-sm font-medium mb-3">Selecione o período</h4>
                  
                  {/* Presets rápidos */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      { label: "Últimos 7 dias", days: 7 },
                      { label: "Últimos 15 dias", days: 15 },
                      { label: "Últimos 30 dias", days: 30 },
                      { label: "Últimos 90 dias", days: 90 },
                    ].map((preset) => (
                      <Button
                        key={preset.days}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const end = new Date();
                          const start = new Date();
                          start.setDate(end.getDate() - preset.days);
                          handleCustomDateSelect({ from: start, to: end });
                        }}
                        className="text-xs"
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={customDateRange?.from}
                    selected={customDateRange}
                    onSelect={handleCustomDateSelect}
                    numberOfMonths={2}
                    locale={ptBR}
                    className="rounded-md border"
                  />
                </div>
                <div className="p-3 border-t">
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCustomDateRange(undefined);
                        updateFilter('dateRange', '30days');
                        setDatePickerOpen(false);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (customDateRange?.from && customDateRange?.to) {
                          setDatePickerOpen(false);
                        }
                      }}
                      disabled={!customDateRange?.from || !customDateRange?.to}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger className="w-48">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Propostas */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 uppercase tracking-wide">
            PROPOSTAS
          </span>
          <Select value={filters.proposals} onValueChange={(value) => updateFilter('proposals', value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {proposalStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mais Filtros */}
        <DropdownMenu open={advancedFiltersOpen} onOpenChange={setAdvancedFiltersOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Mais filtros
              <ChevronDown className="h-4 w-4 ml-2" />
              {hasAdvancedFilters && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-orange-500 text-white text-xs">
                  !
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="start">
            <div className="p-3 space-y-3">
              {/* Tipo de Proposta */}
              <div>
                <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  Tipo de Proposta
                </label>
                <Select value={filters.specialty || ""} onValueChange={(value) => updateFilter('specialty', value)}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {proposalTypeOptions.map((type) => (
                      <SelectItem key={type} value={type.toLowerCase()}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  Status
                </label>
                <Select value={filters.status || ""} onValueChange={(value) => updateFilter('status', value)}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {proposalStatusOptions.slice(1).map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cidade */}
              <div>
                <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  Cidade
                </label>
                <Select value={filters.city || ""} onValueChange={(value) => updateFilter('city', value)}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {cityOptions.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetFilters}
          className="text-gray-500 hover:text-gray-700"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Limpar
        </Button>
        
        <Button 
          onClick={handleApplyFilters}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6"
        >
          Aplicar
        </Button>
      </div>
    </div>
  );
};