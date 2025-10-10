import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Tipos para especialidades
export interface Specialty {
  specialty_name: string;
  last_updated: string;
  total_occurrences: number;
  sources: string;
}

export interface SpecialtyUnified {
  specialty_name: string;
  source_table: string;
  source_id: string;
  last_updated: string;
  first_seen: string;
  usage_count: number;
}

// Função para buscar especialidades da view unificada
const fetchSpecialties = async (): Promise<Specialty[]> => {
  console.log('🔍 Buscando especialidades da view unificada...');
  
  const { data, error } = await supabase
    .from('v_specialties_for_dashboard')
    .select('*')
    .order('specialty_name');

  if (error) {
    console.error('❌ Erro ao buscar especialidades:', error);
    throw new Error(`Erro ao carregar especialidades: ${error.message}`);
  }

  console.log('✅ Especialidades carregadas:', data?.length || 0);
  return data || [];
};

// Função para buscar especialidades detalhadas (para debug/admin)
const fetchSpecialtiesDetailed = async (): Promise<SpecialtyUnified[]> => {
  console.log('🔍 Buscando especialidades detalhadas...');
  
  const { data, error } = await supabase
    .from('v_specialties_unified')
    .select('*')
    .order('specialty_name');

  if (error) {
    console.error('❌ Erro ao buscar especialidades detalhadas:', error);
    throw new Error(`Erro ao carregar especialidades detalhadas: ${error.message}`);
  }

  return data || [];
};

// Função para forçar refresh das views
const refreshSpecialtiesViews = async (): Promise<string> => {
  console.log('🔄 Forçando refresh das views de especialidades...');
  
  const { data, error } = await supabase
    .rpc('refresh_specialties_views');

  if (error) {
    console.error('❌ Erro ao refreshar views:', error);
    throw new Error(`Erro ao refreshar views: ${error.message}`);
  }

  console.log('✅ Views atualizadas:', data);
  return data || 'Views atualizadas com sucesso';
};

// Hook principal para especialidades (otimizado para dashboard)
export const useSpecialties = () => {
  return useQuery({
    queryKey: ['specialties'],
    queryFn: fetchSpecialties,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // 30 segundos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook para especialidades detalhadas (admin/debug)
export const useSpecialtiesDetailed = () => {
  return useQuery({
    queryKey: ['specialties-detailed'],
    queryFn: fetchSpecialtiesDetailed,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    enabled: false, // Só carrega quando explicitamente chamado
  });
};

// Hook para refresh manual
export const useRefreshSpecialties = () => {
  const queryClient = useQueryClient();

  const refreshSpecialties = async () => {
    try {
      await refreshSpecialtiesViews();
      // Invalidar e recarregar todas as queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['specialties'] });
      await queryClient.invalidateQueries({ queryKey: ['specialties-detailed'] });
      console.log('✅ Cache de especialidades invalidado e recarregado');
    } catch (error) {
      console.error('❌ Erro ao refreshar especialidades:', error);
      throw error;
    }
  };

  return { refreshSpecialties };
};

// Hook para buscar especialidades com fallback
export const useSpecialtiesWithFallback = () => {
  const { data: specialties, isLoading, error, refetch } = useSpecialties();

  // Fallback para busca direta na tabela screens se a view falhar
  const { data: fallbackSpecialties, refetch: refetchFallback } = useQuery({
    queryKey: ['specialties-fallback'],
    queryFn: async (): Promise<string[]> => {
      console.log('🔄 Tentando fallback para busca direta...');
      
      const { data, error } = await supabase
        .from('screens')
        .select('specialty')
        .not('specialty', 'is', null)
        .limit(1000);

      if (error) {
        console.error('❌ Erro no fallback:', error);
        throw error;
      }

      const allSpecialties = (data || [])
        .flatMap((row: any) => row.specialty || [])
        .filter(Boolean)
        .map((s: string) => s.trim())
        .filter(Boolean);

      const uniqueSpecialties = Array.from(new Set(allSpecialties))
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));

      console.log('✅ Fallback carregou:', uniqueSpecialties.length, 'especialidades');
      return uniqueSpecialties;
    },
    enabled: false, // Só executa quando chamado explicitamente
    staleTime: 2 * 60 * 1000,
  });

  // Se a query principal falhar, usar fallback
  const effectiveSpecialties = error && fallbackSpecialties 
    ? fallbackSpecialties.map(name => ({ specialty_name: name, last_updated: new Date().toISOString(), total_occurrences: 1, sources: 'fallback' }))
    : specialties;

  const effectiveLoading = isLoading && !error;

  const retryWithFallback = async () => {
    if (error) {
      await refetchFallback();
    } else {
      await refetch();
    }
  };

  return {
    specialties: effectiveSpecialties || [],
    isLoading: effectiveLoading,
    error,
    retry: retryWithFallback,
    isUsingFallback: !!error && !!fallbackSpecialties,
  };
};
