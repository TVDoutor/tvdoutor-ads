import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardFilters } from '@/components/dashboard';
import type { ProposalWithDetails } from './useRealProposals';

/**
 * Hook para aplicar filtros aos dados do dashboard
 */
export const useFilteredProposals = (filters: DashboardFilters, limit: number = 50) => {
  return useQuery({
    queryKey: ['filtered-proposals', filters, limit],
    queryFn: async (): Promise<ProposalWithDetails[]> => {
      console.log('🔍 Aplicando filtros:', filters);
      
      let query = supabase
        .from('proposals')
        .select('*')
        .limit(limit);

      // Filtro por período
      if (filters.dateRange === 'custom' && filters.customDateRange) {
        // Período personalizado
        if (filters.customDateRange.from) {
          const startDate = new Date(filters.customDateRange.from);
          startDate.setHours(0, 0, 0, 0);
          query = query.gte('created_at', startDate.toISOString());
        }
        if (filters.customDateRange.to) {
          const endDate = new Date(filters.customDateRange.to);
          endDate.setHours(23, 59, 59, 999);
          query = query.lte('created_at', endDate.toISOString());
        }
      } else if (filters.dateRange && filters.dateRange !== 'custom') {
        // Períodos predefinidos
        const now = new Date();
        let startDate: Date;
        
        switch (filters.dateRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'yesterday':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            query = query.lt('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString());
            break;
          case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'thisMonth':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'lastMonth':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            query = query.gte('created_at', lastMonth.toISOString())
                        .lte('created_at', lastMonthEnd.toISOString());
            startDate = lastMonth;
            break;
          default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        
        if (filters.dateRange !== 'lastMonth') {
          query = query.gte('created_at', startDate.toISOString());
        }
      }

      // Filtro por status de propostas
      if (filters.proposals && filters.proposals !== 'all') {
        query = query.eq('status', filters.proposals);
      }

      // Filtro por especialidade - removido pois não existe na tabela proposals
      // TODO: Implementar join com tabela de especialidades se necessário
      // if (filters.specialty) {
      //   query = query.ilike('specialty', `%${filters.specialty}%`);
      // }

      // Filtro por cidade
      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }

      // Filtro por status adicional (se diferente do filtro principal)
      if (filters.status && filters.status !== filters.proposals) {
        query = query.eq('status', filters.status);
      }

      // Filtro por responsável
      if (filters.owner) {
        query = query.ilike('created_by', `%${filters.owner}%`);
      }

      // Ordenar por data mais recente
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro ao filtrar propostas:', error);
        throw new Error(`Erro ao filtrar propostas: ${error.message}`);
      }

      // Mapear para o formato esperado
      const mappedProposals: ProposalWithDetails[] = (data || []).map(proposal => ({
        ...proposal,
        organizationName: proposal.customer_name || 'Organização não informada',
        city: proposal.city || undefined,
        state: undefined, // A tabela proposals não tem estado separado
      }));

      console.log('✅ Propostas filtradas:', mappedProposals.length);
      return mappedProposals;
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 3 * 60 * 1000, // 3 minutos
    refetchOnWindowFocus: true,
    retry: 2,
    throwOnError: false,
  });
};

/**
 * Hook para calcular estatísticas baseadas nos filtros
 */
export const useFilteredStats = (filters: DashboardFilters) => {
  const { data: filteredProposals, isLoading } = useFilteredProposals(filters, 1000);

  const stats = useMemo(() => {
    if (!filteredProposals) return null;

    const total = filteredProposals.length;
    const accepted = filteredProposals.filter(p => p.status === 'aceita').length;
    const rejected = filteredProposals.filter(p => p.status === 'rejeitada').length;
    const inAnalysis = filteredProposals.filter(p => p.status === 'em_analise').length;
    const sent = filteredProposals.filter(p => p.status === 'enviada').length;
    const draft = filteredProposals.filter(p => p.status === 'rascunho').length;

    const totalFinalized = accepted + rejected;
    const conversionRate = totalFinalized > 0 ? (accepted / totalFinalized) * 100 : 0;

    const totalRevenue = filteredProposals
      .filter(p => p.status === 'aceita')
      .reduce((sum, p) => sum + (p.net_calendar || 0), 0);

    return {
      total,
      accepted,
      rejected,
      inAnalysis,
      sent,
      draft,
      conversionRate: Math.round(conversionRate * 10) / 10,
      totalRevenue,
      averageValue: total > 0 ? Math.round(filteredProposals.reduce((sum, p) => sum + (p.net_calendar || 0), 0) / total) : 0,
      /** Projetos ativos - não calculado a partir das propostas filtradas; usar stats?.projects?.active como fallback */
      activeProjects: undefined,
    };
  }, [filteredProposals]);

  return {
    stats,
    isLoading,
    proposalsCount: filteredProposals?.length || 0
  };
};