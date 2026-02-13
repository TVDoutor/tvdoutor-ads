import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/client';

export type Proposal = Tables<'proposals'>;

export interface ProposalWithDetails extends Proposal {
  organizationName?: string;
  city?: string;
  state?: string;
}

/**
 * Hook para buscar propostas reais do banco de dados
 */
export const useRealProposals = (limit: number = 10) => {
  return useQuery({
    queryKey: ['real-proposals', limit],
    queryFn: async (): Promise<ProposalWithDetails[]> => {
      console.log('📋 Buscando propostas reais do banco...');
      
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Erro ao buscar propostas:', error);
        throw new Error(`Erro ao carregar propostas: ${error.message}`);
      }

      // Mapear para o formato esperado pelos componentes
      const mappedProposals: ProposalWithDetails[] = (data || []).map(proposal => ({
        ...proposal,
        organizationName: proposal.customer_name || 'Organização não informada',
        city: proposal.city || undefined,
        state: undefined, // A tabela proposals não tem estado separado
      }));

      console.log('✅ Propostas carregadas:', mappedProposals.length);
      return mappedProposals;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
    retry: 3,
    throwOnError: false,
  });
};

/**
 * Hook para buscar dados de tendência de propostas (últimos 30 dias)
 */
export const useProposalsTrend = () => {
  return useQuery({
    queryKey: ['proposals-trend'],
    queryFn: async () => {
      console.log('📈 Buscando tendência de propostas...');
      
      // Buscar propostas dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('proposals')
        .select('created_at, net_calendar, status')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar tendência:', error);
        throw new Error(`Erro ao carregar tendência: ${error.message}`);
      }

      // Agrupar por semana
      const weeklyData: Record<string, { proposals: number; revenue: number }> = {};
      
      (data || []).forEach(proposal => {
        const date = new Date(proposal.created_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Início da semana
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { proposals: 0, revenue: 0 };
        }
        
        weeklyData[weekKey].proposals += 1;
        weeklyData[weekKey].revenue += proposal.net_calendar || 0;
      });

      // Converter para array ordenado
      const trendData = Object.entries(weeklyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date: new Date(date).toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: 'short' 
          }),
          revenue: data.revenue,
          proposals: data.proposals
        }));

      console.log('✅ Tendência carregada:', trendData.length, 'pontos');
      return trendData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: true,
    retry: 2,
    throwOnError: false,
  });
};

/**
 * Hook para buscar dados do funil de conversão real
 */
export const useRealFunnelData = () => {
  return useQuery({
    queryKey: ['real-funnel-data'],
    queryFn: async () => {
      console.log('🔄 Buscando dados reais do funil...');
      
      const { data, error } = await supabase
        .from('proposals')
        .select('status, id, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar dados do funil:', error);
        throw new Error(`Erro ao carregar funil: ${error.message}`);
      }

      const proposals = data || [];
      
      // Contar por status
      const statusCounts = {
        enviadas: proposals.filter(p => p.status === 'enviada').length,
        aceitas: proposals.filter(p => p.status === 'aceita').length,
        ativas: proposals.filter(p => p.status === 'aceita').length, // Assumindo que aceitas = ativas
      };

      // Calcular conversão total
      const totalProposals = statusCounts.enviadas + statusCounts.aceitas;
      const overallConversion = totalProposals > 0 
        ? (statusCounts.ativas / totalProposals) * 100 
        : 0;

      const funnelStages = [
        { 
          name: "Propostas Enviadas", 
          value: statusCounts.enviadas,
          color: "bg-orange-100 border-orange-200" 
        },
        { 
          name: "Propostas Aceitas", 
          value: statusCounts.aceitas,
          color: "bg-yellow-100 border-yellow-200" 
        },
        { 
          name: "Projetos Ativos", 
          value: statusCounts.ativas,
          color: "bg-green-100 border-green-200" 
        },
      ];

      console.log('✅ Funil carregado:', { statusCounts, overallConversion });
      
      return {
        stages: funnelStages,
        overallConversion: Math.round(overallConversion * 10) / 10, // Uma casa decimal
      };
    },
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 7 * 60 * 1000, // 7 minutos
    refetchOnWindowFocus: true,
    retry: 2,
    throwOnError: false,
  });
};