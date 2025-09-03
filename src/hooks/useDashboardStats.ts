import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  activeScreens: number;
  activeProposals: number;
  totalCities: number;
  totalRevenue: number;
  screenGrowth: number;
  proposalGrowth: number;
  cityGrowth: number;
  revenueGrowth: number;
}

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    activeScreens: 0,
    activeProposals: 0,
    totalCities: 0,
    totalRevenue: 0,
    screenGrowth: 0,
    proposalGrowth: 0,
    cityGrowth: 0,
    revenueGrowth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch active screens
        // Fetch all screens and filter active ones in frontend (same as Venues page)
        const { data: screensData, error: screensError } = await supabase
          .from('screens')
          .select('id, city, active')
          .order('display_name');
        
        if (screensError) throw screensError;
        
        // Filter active screens in frontend
        const activeScreensData = screensData?.filter(screen => Boolean(screen.active)) || [];

        // Fetch active proposals from proposal_kpis view
        const { data: proposalsData, error: proposalsError } = await supabase
          .from('proposal_kpis')
          .select('id, total_value, created_at')
          .eq('status', 'active');

        if (proposalsError) throw proposalsError;

        // Calculate unique cities from active screens only
        const uniqueCities = new Set(activeScreensData.map(screen => screen.city) || []);
        
        // Calculate total revenue
        const totalRevenue = proposalsData?.reduce((sum, proposal) => sum + (proposal.total_value || 0), 0) || 0;

        // Calculate growth rates (comparing with previous month/week)
        const currentDate = new Date();
        const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate());
        const lastWeek = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Fetch previous month's data for screens
        const { data: prevScreensData } = await supabase
          .from('screens')
          .select('id')
          .eq('active', true)
          .lt('created_at', lastMonth.toISOString());

        // Fetch previous week's proposals
        const { data: prevProposalsData } = await supabase
          .from('proposal_kpis')
          .select('id')
          .eq('status', 'active')
          .lt('created_at', lastWeek.toISOString());

        // Calculate growth percentages
        const currentScreens = screensData?.length || 0;
        const prevScreens = prevScreensData?.length || 0;
        const screenGrowth = prevScreens > 0 ? ((currentScreens - prevScreens) / prevScreens) * 100 : 0;

        const currentProposals = proposalsData?.length || 0;
        const prevProposals = prevProposalsData?.length || 0;
        const proposalGrowth = prevProposals > 0 ? ((currentProposals - prevProposals) / prevProposals) * 100 : 0;

        setStats({
          activeScreens: activeScreensData.length, // Use filtered count
          activeProposals: currentProposals,
          totalCities: uniqueCities.size,
          totalRevenue,
          screenGrowth: Math.round(screenGrowth),
          proposalGrowth: Math.round(proposalGrowth),
          cityGrowth: 5,
          revenueGrowth: 12,
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  return { stats, loading, error };
};