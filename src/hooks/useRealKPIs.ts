import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RealKPIData {
  id: string;
  title: string;
  currentValue: number;
  previousValue: number;
  target?: number;
  sparkline: number[];
  format: 'number' | 'currency' | 'percent';
  delta: number;
}

/**
 * Hook para buscar KPIs reais do banco de dados
 */
export const useRealKPIs = () => {
  return useQuery({
    queryKey: ['real-kpis'],
    queryFn: async (): Promise<RealKPIData[]> => {
      console.log('📊 Calculando KPIs reais...');
      
      try {
        // Buscar dados dos últimos 30 dias para comparação
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        // 1. Total de Propostas
        const totalProposalsKPI = await calculateTotalProposalsKPI(thirtyDaysAgo, sixtyDaysAgo);
        
        // 2. Propostas Aceitas
        const acceptedProposalsKPI = await calculateAcceptedProposalsKPI(thirtyDaysAgo, sixtyDaysAgo);
        
        // 3. Taxa de Conversão
        const conversionRateKPI = await calculateConversionRateKPI(thirtyDaysAgo, sixtyDaysAgo);
        
        // 4. Receita Mensal
        const monthlyRevenueKPI = await calculateMonthlyRevenueKPI(thirtyDaysAgo, sixtyDaysAgo);

        const kpis = [
          totalProposalsKPI,
          acceptedProposalsKPI,
          conversionRateKPI,
          monthlyRevenueKPI
        ];

        console.log('✅ KPIs calculados:', kpis.length);
        return kpis;
      } catch (error) {
        console.error('❌ Erro ao calcular KPIs:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000, // Atualizar a cada 5 minutos
    retry: 2,
    throwOnError: false,
  });
};

/**
 * Calcular KPI de Total de Propostas
 */
async function calculateTotalProposalsKPI(thirtyDaysAgo: Date, sixtyDaysAgo: Date): Promise<RealKPIData> {
  // Propostas dos últimos 30 dias
  const { data: currentProposals } = await supabase
    .from('proposals')
    .select('id, created_at')
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Propostas dos 30 dias anteriores (para comparação)
  const { data: previousProposals } = await supabase
    .from('proposals')
    .select('id, created_at')
    .gte('created_at', sixtyDaysAgo.toISOString())
    .lt('created_at', thirtyDaysAgo.toISOString());

  // Sparkline dos últimos 7 dias
  const sparkline = await calculateDailySparkline(thirtyDaysAgo, 'proposals', 'count');

  const currentValue = currentProposals?.length || 0;
  const previousValue = previousProposals?.length || 0;
  const delta = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;

  return {
    id: 'total-proposals',
    title: 'Total de Propostas',
    currentValue,
    previousValue,
    target: 50, // Meta mensal
    sparkline,
    format: 'number',
    delta: Math.round(delta * 10) / 10
  };
}

/**
 * Calcular KPI de Propostas Aceitas
 */
async function calculateAcceptedProposalsKPI(thirtyDaysAgo: Date, sixtyDaysAgo: Date): Promise<RealKPIData> {
  // Propostas aceitas dos últimos 30 dias
  const { data: currentAccepted } = await supabase
    .from('proposals')
    .select('id, created_at')
    .eq('status', 'aceita')
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Propostas aceitas dos 30 dias anteriores
  const { data: previousAccepted } = await supabase
    .from('proposals')
    .select('id, created_at')
    .eq('status', 'aceita')
    .gte('created_at', sixtyDaysAgo.toISOString())
    .lt('created_at', thirtyDaysAgo.toISOString());

  // Sparkline dos últimos 7 dias
  const sparkline = await calculateDailySparkline(thirtyDaysAgo, 'proposals', 'count', { status: 'aceita' });

  const currentValue = currentAccepted?.length || 0;
  const previousValue = previousAccepted?.length || 0;
  const delta = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;

  return {
    id: 'accepted-proposals',
    title: 'Propostas Aceitas',
    currentValue,
    previousValue,
    target: 30, // Meta mensal
    sparkline,
    format: 'number',
    delta: Math.round(delta * 10) / 10
  };
}

/**
 * Calcular KPI de Taxa de Conversão
 */
async function calculateConversionRateKPI(thirtyDaysAgo: Date, sixtyDaysAgo: Date): Promise<RealKPIData> {
  // Propostas finalizadas dos últimos 30 dias (aceitas + rejeitadas)
  const { data: currentFinalized } = await supabase
    .from('proposals')
    .select('id, status, created_at')
    .in('status', ['aceita', 'rejeitada'])
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Propostas finalizadas dos 30 dias anteriores
  const { data: previousFinalized } = await supabase
    .from('proposals')
    .select('id, status, created_at')
    .in('status', ['aceita', 'rejeitada'])
    .gte('created_at', sixtyDaysAgo.toISOString())
    .lt('created_at', thirtyDaysAgo.toISOString());

  const currentAccepted = currentFinalized?.filter(p => p.status === 'aceita').length || 0;
  const currentTotal = currentFinalized?.length || 0;
  const currentRate = currentTotal > 0 ? (currentAccepted / currentTotal) * 100 : 0;

  const previousAccepted = previousFinalized?.filter(p => p.status === 'aceita').length || 0;
  const previousTotal = previousFinalized?.length || 0;
  const previousRate = previousTotal > 0 ? (previousAccepted / previousTotal) * 100 : 0;

  const delta = previousRate > 0 ? currentRate - previousRate : 0;

  // Sparkline de taxa de conversão dos últimos 7 dias
  const sparkline = await calculateConversionSparkline(thirtyDaysAgo);

  return {
    id: 'conversion-rate',
    title: 'Taxa de Conversão',
    currentValue: Math.round(currentRate * 10) / 10,
    previousValue: Math.round(previousRate * 10) / 10,
    sparkline,
    format: 'percent',
    delta: Math.round(delta * 10) / 10
  };
}

/**
 * Calcular KPI de Receita Mensal
 */
async function calculateMonthlyRevenueKPI(thirtyDaysAgo: Date, sixtyDaysAgo: Date): Promise<RealKPIData> {
  // Receita dos últimos 30 dias (propostas aceitas)
  const { data: currentRevenue } = await supabase
    .from('proposals')
    .select('net_calendar, created_at')
    .eq('status', 'aceita')
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Receita dos 30 dias anteriores
  const { data: previousRevenue } = await supabase
    .from('proposals')
    .select('net_calendar, created_at')
    .eq('status', 'aceita')
    .gte('created_at', sixtyDaysAgo.toISOString())
    .lt('created_at', thirtyDaysAgo.toISOString());

  const currentValue = currentRevenue?.reduce((sum, p) => sum + (p.net_calendar || 0), 0) || 0;
  const previousValue = previousRevenue?.reduce((sum, p) => sum + (p.net_calendar || 0), 0) || 0;
  const delta = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;

  // Sparkline de receita dos últimos 7 dias
  const sparkline = await calculateDailySparkline(thirtyDaysAgo, 'proposals', 'revenue', { status: 'aceita' });

  return {
    id: 'monthly-revenue',
    title: 'Receita Mensal',
    currentValue,
    previousValue,
    target: 100000, // Meta mensal de R$ 100k
    sparkline,
    format: 'currency',
    delta: Math.round(delta * 10) / 10
  };
}

/**
 * Calcular sparkline diário para os últimos 7 dias
 */
async function calculateDailySparkline(
  fromDate: Date, 
  table: string, 
  type: 'count' | 'revenue',
  filters?: Record<string, any>
): Promise<number[]> {
  const sparkline: number[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(fromDate);
    date.setDate(date.getDate() - i);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    let query = supabase
      .from(table)
      .select(type === 'revenue' ? 'net_calendar' : 'id')
      .gte('created_at', date.toISOString())
      .lt('created_at', nextDate.toISOString());

    // Aplicar filtros adicionais
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { data } = await query;
    
    if (type === 'revenue') {
      const dayValue = data?.reduce((sum: number, item: any) => sum + (item.net_calendar || 0), 0) || 0;
      sparkline.push(dayValue);
    } else {
      sparkline.push(data?.length || 0);
    }
  }

  return sparkline;
}

/**
 * Calcular sparkline de taxa de conversão dos últimos 7 dias
 */
async function calculateConversionSparkline(fromDate: Date): Promise<number[]> {
  const sparkline: number[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(fromDate);
    date.setDate(date.getDate() - i);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const { data } = await supabase
      .from('proposals')
      .select('status')
      .in('status', ['aceita', 'rejeitada'])
      .gte('created_at', date.toISOString())
      .lt('created_at', nextDate.toISOString());

    const accepted = data?.filter(p => p.status === 'aceita').length || 0;
    const total = data?.length || 0;
    const rate = total > 0 ? (accepted / total) * 100 : 0;
    
    sparkline.push(Math.round(rate * 10) / 10);
  }

  return sparkline;
}