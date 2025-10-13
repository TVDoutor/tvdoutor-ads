import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardService, type DashboardStats, type ProposalsStats } from '@/lib/dashboard-service';

/**
 * Hook principal para estatísticas do dashboard
 * Carrega todas as estatísticas com cache inteligente
 */
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: DashboardService.getAllDashboardStats,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // 1 minuto
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    throwOnError: false, // Não quebrar a aplicação se houver erro
  });
};

/**
 * Hook para estatísticas com fallback
 * Carrega dados parciais mesmo se algumas consultas falharem
 */
export const useDashboardStatsWithFallback = () => {
  return useQuery({
    queryKey: ['dashboard-stats-fallback'],
    queryFn: DashboardService.getDashboardStatsWithFallback,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // 1 minuto
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 20000),
    throwOnError: false, // Não quebrar a aplicação se houver erro
  });
};

/**
 * Hook específico para estatísticas de propostas
 */
export const useProposalsStats = () => {
  return useQuery({
    queryKey: ['proposals-stats'],
    queryFn: DashboardService.getProposalsStats,
    staleTime: 1 * 60 * 1000, // 1 minuto (propostas mudam mais frequentemente)
    gcTime: 3 * 60 * 1000, // 3 minutos
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // 30 segundos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    throwOnError: false, // Não quebrar a aplicação se houver erro
  });
};

/**
 * Hook específico para estatísticas de agências
 */
export const useAgenciesStats = () => {
  return useQuery({
    queryKey: ['agencies-stats'],
    queryFn: DashboardService.getAgenciesStats,
    staleTime: 5 * 60 * 1000, // 5 minutos (agências mudam menos)
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000, // 5 minutos
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 20000),
  });
};

/**
 * Hook específico para estatísticas de projetos
 */
export const useProjectsStats = () => {
  return useQuery({
    queryKey: ['projects-stats'],
    queryFn: DashboardService.getProjectsStats,
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 7 * 60 * 1000, // 7 minutos
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000, // 2 minutos
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 20000),
  });
};

/**
 * Hook específico para estatísticas de deals
 */
export const useDealsStats = () => {
  return useQuery({
    queryKey: ['deals-stats'],
    queryFn: DashboardService.getDealsStats,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
    refetchInterval: 90 * 1000, // 1.5 minutos
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 20000),
  });
};

/**
 * Hook para refresh manual de todas as estatísticas
 */
export const useRefreshDashboardStats = () => {
  const queryClient = useQueryClient();

  const refreshAllStats = async () => {
    
    try {
      await DashboardService.refreshAllStats();
      
      // Invalidar todas as queries relacionadas
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats-fallback'] });
      await queryClient.invalidateQueries({ queryKey: ['proposals-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['agencies-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['projects-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['deals-stats'] });
      
    } catch (error) {
      console.error('❌ Erro ao refreshar estatísticas do dashboard:', error);
      throw error;
    }
  };

  return { refreshAllStats };
};

/**
 * Hook para invalidar cache específico
 */
export const useInvalidateDashboardCache = () => {
  const queryClient = useQueryClient();

  const invalidateStats = (type?: 'proposals' | 'agencies' | 'projects' | 'deals' | 'all') => {
    
    if (!type || type === 'all') {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats-fallback'] });
      queryClient.invalidateQueries({ queryKey: ['proposals-stats'] });
      queryClient.invalidateQueries({ queryKey: ['agencies-stats'] });
      queryClient.invalidateQueries({ queryKey: ['projects-stats'] });
      queryClient.invalidateQueries({ queryKey: ['deals-stats'] });
    } else {
      queryClient.invalidateQueries({ queryKey: [`${type}-stats`] });
    }
  };

  return { invalidateStats };
};

/**
 * Hook para dados de propostas com cálculos específicos
 */
export const useProposalsWithCalculations = () => {
  const { data: proposalsStats, isLoading, error } = useProposalsStats();

  const calculations = proposalsStats ? {
    // Taxa de conversão real
    conversionRate: proposalsStats.conversionRate,
    
    // Status da taxa de conversão
    conversionStatus: proposalsStats.conversionRate >= 70 ? 'excellent' : 
                     proposalsStats.conversionRate >= 50 ? 'good' : 
                     proposalsStats.conversionRate >= 30 ? 'average' : 'poor',
    
    // Performance vs média
    performanceVsAverage: proposalsStats.conversionRate >= 60 ? 'above' : 'below',
    
    // Tendência (comparação com período anterior - simplificado)
    trend: 'stable', // TODO: Implementar comparação temporal
    
    // Resumo executivo
    executiveSummary: {
      totalProposals: proposalsStats.total,
      successRate: proposalsStats.conversionRate,
      status: proposalsStats.conversionRate >= 70 ? 'Excelente' : 
              proposalsStats.conversionRate >= 50 ? 'Bom' : 
              proposalsStats.conversionRate >= 30 ? 'Médio' : 'Baixo'
    }
  } : null;

  return {
    proposalsStats,
    calculations,
    isLoading,
    error,
    isLoaded: !!proposalsStats
  };
};