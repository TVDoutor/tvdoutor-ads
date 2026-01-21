/**
 * Hook para gerenciar corpo clínico usando a view view_detalhes_profissionais
 * 
 * Usa tipos gerados automaticamente do Supabase para garantir type-safety
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { supabase, type Views } from '@/integrations/supabase/client';

// Tipo gerado automaticamente da view
export type ProfissionalDetalhes = Views<'view_detalhes_profissionais'>;

export interface FiltrosCorpoClinico {
  venueId?: number;
  tipoProfissional?: string;
  especialidade?: string;
  cidade?: string;
}

/**
 * Hook para buscar corpo clínico com filtros
 * 
 * @example
 * // Buscar todos os profissionais
 * const { data } = useCorpoClinico();
 * 
 * @example
 * // Buscar profissionais de um venue específico
 * const { data } = useCorpoClinico({ venueId: 123 });
 * 
 * @example
 * // Buscar médicos de São Paulo
 * const { data } = useCorpoClinico({ 
 *   tipoProfissional: 'Médico',
 *   cidade: 'São Paulo' 
 * });
 */
export function useCorpoClinico(
  filtros?: FiltrosCorpoClinico,
  options?: Omit<UseQueryOptions<ProfissionalDetalhes[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['corpo-clinico', filtros],
    queryFn: async () => {
      let query = supabase
        .from('view_detalhes_profissionais')
        .select('*');

      // Aplicar filtros dinâmicos
      if (filtros?.venueId) {
        query = query.eq('venue_id', filtros.venueId);
      }

      if (filtros?.tipoProfissional) {
        query = query.eq('tipo_profissional', filtros.tipoProfissional);
      }

      if (filtros?.cidade) {
        query = query.eq('venue_cidade', filtros.cidade);
      }

      if (filtros?.especialidade) {
        // Buscar em array de especialidades
        query = query.contains('especialidades', [filtros.especialidade]);
      }

      const { data, error } = await query
        .order('profissional_nome', { ascending: true });

      if (error) {
        throw new Error(`Erro ao buscar corpo clínico: ${error.message}`);
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 5, // Cache de 5 minutos
    ...options
  });
}

/**
 * Hook para buscar um profissional específico por ID
 */
export function useProfissional(profissionalId: string | null) {
  return useQuery({
    queryKey: ['profissional', profissionalId],
    queryFn: async () => {
      if (!profissionalId) return null;

      const { data, error } = await supabase
        .from('view_detalhes_profissionais')
        .select('*')
        .eq('profissional_id', profissionalId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Profissional não encontrado
        }
        throw error;
      }

      return data;
    },
    enabled: !!profissionalId, // Só executa se tiver ID
    staleTime: 1000 * 60 * 10, // Cache de 10 minutos
  });
}

/**
 * Hook para buscar estatísticas do corpo clínico
 */
export function useEstatisticasCorpoClinico(venueId?: number) {
  return useQuery({
    queryKey: ['estatisticas-corpo-clinico', venueId],
    queryFn: async () => {
      let query = supabase
        .from('view_detalhes_profissionais')
        .select('*');

      if (venueId) {
        query = query.eq('venue_id', venueId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calcular estatísticas
      const porTipo: Record<string, number> = {};
      const especialidadesUnicas = new Set<string>();
      const venuesUnicos = new Set<number>();
      const cidadesUnicas = new Set<string>();

      data?.forEach(profissional => {
        // Agrupar por tipo
        if (profissional.tipo_profissional) {
          porTipo[profissional.tipo_profissional] = 
            (porTipo[profissional.tipo_profissional] || 0) + 1;
        }

        // Especialidades únicas
        profissional.especialidades?.forEach(esp => 
          especialidadesUnicas.add(esp)
        );

        // Venues únicos
        if (profissional.venue_id) {
          venuesUnicos.add(profissional.venue_id);
        }

        // Cidades únicas
        if (profissional.venue_cidade) {
          cidadesUnicas.add(profissional.venue_cidade);
        }
      });

      return {
        totalProfissionais: data?.length || 0,
        porTipo,
        totalEspecialidades: especialidadesUnicas.size,
        especialidades: Array.from(especialidadesUnicas).sort(),
        totalVenues: venuesUnicos.size,
        totalCidades: cidadesUnicas.size,
        cidades: Array.from(cidadesUnicas).sort()
      };
    },
    staleTime: 1000 * 60 * 5, // Cache de 5 minutos
  });
}
