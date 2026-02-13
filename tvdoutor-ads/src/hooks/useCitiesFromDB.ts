import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para buscar cidades reais do banco de dados
 */
export const useCitiesFromDB = () => {
  return useQuery({
    queryKey: ['cities-from-db'],
    queryFn: async (): Promise<string[]> => {
      console.log('🏙️ Buscando cidades do banco...');
      
      const { data, error } = await supabase
        .from('proposals')
        .select('city')
        .not('city', 'is', null)
        .neq('city', '');

      if (error) {
        console.error('❌ Erro ao buscar cidades:', error);
        return [];
      }

      // Extrair cidades únicas e ordenar
      const cities = [...new Set(data.map(item => item.city).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));

      console.log('✅ Cidades encontradas:', cities.length);
      return cities;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos (cidades não mudam frequentemente)
    gcTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: false,
    retry: 2,
    throwOnError: false,
  });
};