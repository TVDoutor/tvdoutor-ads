import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HeatmapDataPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export interface HeatmapFilters {
  startDate?: string;
  endDate?: string;
  city?: string;
  class?: string;
  normalize?: boolean;
}

export interface HeatmapStats {
  total_screens: number;
  total_proposals: number;
  max_intensity: number;
  avg_intensity: number;
  cities_count: number;
  classes_count: number;
}

export interface CityOption {
  city: string;
  screen_count: number;
  proposal_count: number;
}

export interface ClassOption {
  class: string;
  screen_count: number;
  proposal_count: number;
}

export interface HeatmapResponse {
  heatmap: [number, number, number][];
  stats?: HeatmapStats;
  cities?: CityOption[];
  classes?: ClassOption[];
  metadata: {
    filters: HeatmapFilters;
    totalPoints: number;
    cacheKey: string;
    timestamp: string;
  };
}

export const useHeatmapData = (filters: HeatmapFilters = {}) => {
  const [heatmapData, setHeatmapData] = useState<HeatmapDataPoint[]>([]);
  const [stats, setStats] = useState<HeatmapStats | null>(null);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHeatmapData = useCallback(async (customFilters?: HeatmapFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      const activeFilters = { ...filters, ...customFilters };
      console.log('🔥 Buscando dados do heatmap com filtros:', activeFilters);
      
      // Construir query parameters
      const params = new URLSearchParams();
      if (activeFilters.startDate) params.append('startDate', activeFilters.startDate);
      if (activeFilters.endDate) params.append('endDate', activeFilters.endDate);
      if (activeFilters.city) params.append('city', activeFilters.city);
      if (activeFilters.class) params.append('class', activeFilters.class);
      if (activeFilters.normalize) params.append('normalize', 'true');
      params.append('stats', 'true');
      params.append('cities', 'true');
      params.append('classes', 'true');
      
      const { data, error } = await supabase.functions.invoke('maps-heatmap', {
        body: { 
          startDate: activeFilters.startDate,
          endDate: activeFilters.endDate,
          city: activeFilters.city,
          class: activeFilters.class,
          normalize: activeFilters.normalize,
          stats: true,
          cities: true,
          classes: true
        }
      });
      
      if (error) {
        console.error('❌ Erro ao buscar dados do heatmap:', error);
        setError('Erro ao carregar dados do heatmap');
        return;
      }

      if (data?.error) {
        console.error('❌ Erro na resposta do heatmap:', data.error);
        setError(data.message || 'Erro ao processar dados do heatmap');
        return;
      }

      const response: HeatmapResponse = data;

      // Converter o formato [lat, lng, intensity] para objetos
      const formattedData: HeatmapDataPoint[] = response.heatmap.map((point: [number, number, number]) => ({
        lat: point[0],
        lng: point[1],
        intensity: point[2]
      }));

      console.log('✅ Dados do heatmap obtidos com sucesso:', {
        totalPoints: formattedData.length,
        hasStats: !!response.stats,
        hasCities: !!response.cities,
        hasClasses: !!response.classes,
        filters: activeFilters
      });

      setHeatmapData(formattedData);
      if (response.stats) setStats(response.stats);
      if (response.cities) setCities(response.cities);
      if (response.classes) setClasses(response.classes);
      
    } catch (error) {
      console.error('💥 Erro ao buscar dados do heatmap:', error);
      setError('Erro de conexão ao buscar dados do heatmap');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Função para buscar apenas dados do heatmap (sem stats/cities/classes)
  const fetchHeatmapOnly = useCallback(async (customFilters?: HeatmapFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      const activeFilters = { ...filters, ...customFilters };
      console.log('🔥 Buscando apenas dados do heatmap:', activeFilters);
      
      const params = new URLSearchParams();
      if (activeFilters.startDate) params.append('startDate', activeFilters.startDate);
      if (activeFilters.endDate) params.append('endDate', activeFilters.endDate);
      if (activeFilters.city) params.append('city', activeFilters.city);
      if (activeFilters.class) params.append('class', activeFilters.class);
      if (activeFilters.normalize) params.append('normalize', 'true');
      
      const { data, error } = await supabase.functions.invoke('maps-heatmap', {
        body: { 
          startDate: activeFilters.startDate,
          endDate: activeFilters.endDate,
          city: activeFilters.city,
          class: activeFilters.class,
          normalize: activeFilters.normalize
        }
      });
      
      if (error) {
        console.error('❌ Erro ao buscar dados do heatmap:', error);
        setError('Erro ao carregar dados do heatmap');
        return;
      }

      if (data?.error) {
        console.error('❌ Erro na resposta do heatmap:', data.error);
        setError(data.message || 'Erro ao processar dados do heatmap');
        return;
      }

      const response: HeatmapResponse = data;
      const formattedData: HeatmapDataPoint[] = response.heatmap.map((point: [number, number, number]) => ({
        lat: point[0],
        lng: point[1],
        intensity: point[2]
      }));

      setHeatmapData(formattedData);
      
    } catch (error) {
      console.error('💥 Erro ao buscar dados do heatmap:', error);
      setError('Erro de conexão ao buscar dados do heatmap');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchHeatmapData();
  }, [fetchHeatmapData]);

  return {
    heatmapData,
    stats,
    cities,
    classes,
    loading,
    error,
    refetch: fetchHeatmapData,
    refetchHeatmapOnly: fetchHeatmapOnly
  };
};
