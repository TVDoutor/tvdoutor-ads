import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DashboardFilters } from "./FilterBar";

interface FilterIndicatorProps {
  filters: DashboardFilters;
  onRemoveFilter: (key: keyof DashboardFilters) => void;
  onClearAll: () => void;
}

const filterLabels = {
  dateRange: "Período",
  proposals: "Propostas",
  specialty: "Especialidade",
  city: "Cidade",
  status: "Status",
  owner: "Responsável",
};

const dateRangeLabels = {
  today: "Hoje",
  yesterday: "Ontem",
  "7days": "Últimos 7 dias",
  "30days": "Últimos 30 dias",
  thisMonth: "Este mês",
  lastMonth: "Mês anterior",
};

const proposalLabels = {
  all: "Todas",
  rascunho: "Rascunho",
  enviada: "Enviadas",
  em_analise: "Em Análise",
  aceita: "Aceitas",
  rejeitada: "Rejeitadas",
};

export const FilterIndicator = ({ filters, onRemoveFilter, onClearAll }: FilterIndicatorProps) => {
  const activeFilters: Array<{ key: keyof DashboardFilters; label: string; value: string }> = [];

  // Adicionar filtros ativos (exceto defaults)
  if (filters.dateRange && filters.dateRange !== "30days") {
    let dateValue = dateRangeLabels[filters.dateRange as keyof typeof dateRangeLabels] || filters.dateRange;
    
    // Se for período personalizado, mostrar as datas
    if (filters.dateRange === "custom" && filters.customDateRange) {
      if (filters.customDateRange.from && filters.customDateRange.to) {
        dateValue = `${format(filters.customDateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(filters.customDateRange.to, "dd/MM/yyyy", { locale: ptBR })}`;
      } else if (filters.customDateRange.from) {
        dateValue = `A partir de ${format(filters.customDateRange.from, "dd/MM/yyyy", { locale: ptBR })}`;
      }
    }
    
    activeFilters.push({
      key: "dateRange",
      label: filterLabels.dateRange,
      value: dateValue,
    });
  }

  if (filters.proposals && filters.proposals !== "all") {
    activeFilters.push({
      key: "proposals",
      label: filterLabels.proposals,
      value: proposalLabels[filters.proposals as keyof typeof proposalLabels] || filters.proposals,
    });
  }

  if (filters.specialty) {
    activeFilters.push({
      key: "specialty",
      label: filterLabels.specialty,
      value: filters.specialty,
    });
  }

  if (filters.city) {
    activeFilters.push({
      key: "city",
      label: filterLabels.city,
      value: filters.city,
    });
  }

  if (filters.status) {
    activeFilters.push({
      key: "status",
      label: filterLabels.status,
      value: proposalLabels[filters.status as keyof typeof proposalLabels] || filters.status,
    });
  }

  if (filters.owner) {
    activeFilters.push({
      key: "owner",
      label: filterLabels.owner,
      value: filters.owner,
    });
  }

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-6 py-3 bg-blue-50 border-b border-blue-200">
      <span className="text-sm font-medium text-blue-700">Filtros ativos:</span>
      
      <div className="flex items-center gap-2 flex-wrap">
        {activeFilters.map((filter) => (
          <Badge
            key={filter.key}
            variant="secondary"
            className="bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 transition-colors"
          >
            <span className="font-medium">{filter.label}:</span>
            <span className="ml-1">{filter.value}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto w-auto p-0 ml-2 hover:bg-blue-300 rounded-full"
              onClick={() => onRemoveFilter(filter.key)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 ml-2"
      >
        Limpar todos
      </Button>
    </div>
  );
};