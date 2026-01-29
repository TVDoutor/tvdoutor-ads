import { useState, useCallback } from 'react';
import type { DashboardFilters } from '@/components/dashboard';

const defaultFilters: DashboardFilters = {
  dateRange: '30days',
  proposals: 'all',
  specialty: undefined,
  city: undefined,
  status: undefined,
  owner: undefined,
  customDateRange: undefined,
};

export const useDashboardFilters = (initialFilters: DashboardFilters = defaultFilters) => {
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters);

  const updateFilters = useCallback((newFilters: Partial<DashboardFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const applyFilters = useCallback(() => {
    // Lógica para aplicar os filtros
    console.log('✅ Filtros aplicados:', filters);
    // Trigger para invalidar queries relacionadas será feito no componente
  }, [filters]);

  return {
    filters,
    setFilters,
    updateFilters,
    resetFilters,
    applyFilters,
  };
};