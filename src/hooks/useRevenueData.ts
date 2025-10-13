import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface RevenueDataPoint {
  month: string;
  revenue: number;
  proposals: number;
  conversionRate: number;
}

export interface RevenueStats {
  currentMonth: number;
  previousMonth: number;
  growth: number;
  averageTicket: number;
  totalProposals: number;
  conversionRate: number;
  monthlyData: RevenueDataPoint[];
}

export const useRevenueData = () => {
  const [data, setData] = useState<RevenueStats>({
    currentMonth: 0,
    previousMonth: 0,
    growth: 0,
    averageTicket: 0,
    totalProposals: 0,
    conversionRate: 0,
    monthlyData: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setLoading(true);
        setError(null);

        const currentDate = new Date();
        const currentMonthStart = startOfMonth(currentDate);
        const currentMonthEnd = endOfMonth(currentDate);
        const previousMonthStart = startOfMonth(subMonths(currentDate, 1));
        const previousMonthEnd = endOfMonth(subMonths(currentDate, 1));

        // Buscar propostas dos últimos 12 meses
        const { data: proposalsData, error: proposalsError } = await supabase
          .from('proposals')
          .select(`
            id,
            created_at,
            net_calendar,
            net_business,
            gross_business,
            status
          `)
          .gte('created_at', subMonths(currentDate, 12).toISOString())
          .order('created_at', { ascending: true });

        if (proposalsError) {
          console.warn('Erro ao buscar propostas:', proposalsError);
          throw proposalsError;
        }

        const proposals = proposalsData || [];
        

        // Calcular dados mensais
        const monthlyData: RevenueDataPoint[] = [];
        for (let i = 11; i >= 0; i--) {
          const monthStart = startOfMonth(subMonths(currentDate, i));
          const monthEnd = endOfMonth(subMonths(currentDate, i));
          
          const monthProposals = proposals.filter(proposal => {
            const proposalDate = new Date(proposal.created_at);
            return proposalDate >= monthStart && proposalDate <= monthEnd;
          });

          const monthRevenue = monthProposals.reduce((sum, proposal) => {
            const value = proposal.net_calendar || proposal.net_business || proposal.gross_business || 0;
            return sum + value;
          }, 0);

          const acceptedProposals = monthProposals.filter(p => p.status === 'aceita').length;
          const conversionRate = monthProposals.length > 0 
            ? (acceptedProposals / monthProposals.length) * 100 
            : 0;

          monthlyData.push({
            month: format(monthStart, 'MMM/yy', { locale: ptBR }),
            revenue: monthRevenue,
            proposals: monthProposals.length,
            conversionRate: Math.round(conversionRate * 10) / 10
          });
        }

        // Calcular estatísticas atuais
        const currentMonthProposals = proposals.filter(proposal => {
          const proposalDate = new Date(proposal.created_at);
          return proposalDate >= currentMonthStart && proposalDate <= currentMonthEnd;
        });

        const previousMonthProposals = proposals.filter(proposal => {
          const proposalDate = new Date(proposal.created_at);
          return proposalDate >= previousMonthStart && proposalDate <= previousMonthEnd;
        });

        const currentMonthRevenue = currentMonthProposals.reduce((sum, proposal) => {
          const value = proposal.net_calendar || proposal.net_business || proposal.gross_business || 0;
          return sum + value;
        }, 0);

        const previousMonthRevenue = previousMonthProposals.reduce((sum, proposal) => {
          const value = proposal.net_calendar || proposal.net_business || proposal.gross_business || 0;
          return sum + value;
        }, 0);

        const currentAccepted = currentMonthProposals.filter(p => p.status === 'aceita').length;
        const currentConversionRate = currentMonthProposals.length > 0 
          ? (currentAccepted / currentMonthProposals.length) * 100 
          : 0;

        const growth = previousMonthRevenue > 0 
          ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
          : 0;

        const averageTicket = currentMonthProposals.length > 0 
          ? currentMonthRevenue / currentMonthProposals.length 
          : 0;

        const finalData = {
          currentMonth: currentMonthRevenue,
          previousMonth: previousMonthRevenue,
          growth: Math.round(growth * 10) / 10,
          averageTicket: Math.round(averageTicket),
          totalProposals: currentMonthProposals.length,
          conversionRate: Math.round(currentConversionRate * 10) / 10,
          monthlyData
        };
        
        
        setData(finalData);

      } catch (err) {
        console.error('Erro ao buscar dados de faturamento:', err);
        setError('Erro ao carregar dados de faturamento');
        
        // Dados padrão em caso de erro
        setData({
          currentMonth: 0,
          previousMonth: 0,
          growth: 0,
          averageTicket: 0,
          totalProposals: 0,
          conversionRate: 0,
          monthlyData: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueData();
  }, []);

  return { data, loading, error };
};
