import { supabase } from '@/integrations/supabase/client';

// Tipos para dados do dashboard
export interface ProposalsStats {
  total: number;
  draft: number;
  sent: number;
  analysis: number;
  accepted: number;
  rejected: number;
  conversionRate: number;
}

export interface AgenciesStats {
  total: number;
  active: number;
  inactive: number;
  recent: number; // Últimos 30 dias
}

export interface ProjectsStats {
  total: number;
  active: number;
  completed: number;
  pending: number;
  recent: number; // Últimos 30 dias
}

export interface DealsStats {
  total: number;
  won: number;
  lost: number;
  inProgress: number;
  recent: number; // Últimos 30 dias
}

export interface SpecialtiesStats {
  total: number;
  mostUsed: Array<{ specialty_name: string; total_occurrences: number }>;
  recentlyUpdated: Array<{ specialty_name: string; last_updated: string }>;
}

export interface DashboardStats {
  proposals: ProposalsStats;
  agencies: AgenciesStats;
  projects: ProjectsStats;
  deals: DealsStats;
  specialties: SpecialtiesStats;
  activeScreens: number;
  activeProposals: number;
  screenGrowth: number;
  proposalGrowth: number;
  lastUpdated: string;
}

/**
 * Serviço centralizado para dados do dashboard
 * Consolida todas as estatísticas em tempo real
 */
export class DashboardService {

  /**
   * Busca estatísticas de propostas
   */
  static async getProposalsStats(): Promise<ProposalsStats> {
    console.log('📊 Buscando estatísticas de propostas...');
    
    const { data, error } = await supabase
      .from('proposals')
      .select('status, id, created_at, net_calendar, customer_name')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar propostas:', error);
      throw new Error(`Erro ao carregar propostas: ${error.message}`);
    }

    const proposals = data || [];
    const total = proposals.length;
    
    
    const draft = proposals.filter(p => p.status === 'rascunho').length;
    const sent = proposals.filter(p => p.status === 'enviada').length;
    const analysis = proposals.filter(p => p.status === 'em_analise').length;
    const accepted = proposals.filter(p => p.status === 'aceita').length;
    const rejected = proposals.filter(p => p.status === 'rejeitada').length;
    
    // Debug: Log das contagens
    console.log('🔍 Contagens por status:', { draft, sent, analysis, accepted, rejected });
    
    // Debug: Log dos valores das propostas
    const totalValue = proposals.reduce((sum, p) => sum + (p.net_calendar || 0), 0);
    console.log('🔍 Valores das propostas:', {
      totalValue,
      proposalsWithValue: proposals.filter(p => p.net_calendar > 0).length,
      proposalsWithoutValue: proposals.filter(p => !p.net_calendar || p.net_calendar === 0).length,
      sampleValues: proposals.slice(0, 3).map(p => ({ id: p.id, value: p.net_calendar, customer: p.customer_name }))
    });
    
    // Calcular taxa de conversão (aceitas / (aceitas + rejeitadas))
    const conversionTotal = accepted + rejected;
    const conversionRate = conversionTotal > 0 ? Math.round((accepted / conversionTotal) * 100) : 0;


    return {
      total,
      draft,
      sent,
      analysis,
      accepted,
      rejected,
      conversionRate
    };
  }

  /**
   * Busca estatísticas de agências
   */
  static async getAgenciesStats(): Promise<AgenciesStats> {
    
    const { data, error } = await supabase
      .from('agencias')
      .select('id, nome_agencia, created_at, codigo_agencia')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar agências:', error);
      throw new Error(`Erro ao carregar agências: ${error.message}`);
    }

    const agencies = data || [];
    const total = agencies.length;
    
    
    // Como não há coluna 'ativo', vamos considerar todas as agências como ativas se têm código
    const active = agencies.filter(a => a.codigo_agencia && a.codigo_agencia.trim() !== '').length;
    const inactive = total - active;
    
    // Agências criadas nos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recent = agencies.filter(a => 
      new Date(a.created_at) >= thirtyDaysAgo
    ).length;


    return {
      total,
      active,
      inactive,
      recent
    };
  }

  /**
   * Busca estatísticas de projetos
   */
  static async getProjectsStats(): Promise<ProjectsStats> {
    console.log('🎯 Buscando estatísticas de projetos...');
    
    const { data, error } = await supabase
      .from('agencia_projetos')
      .select('id, nome_projeto, status_projeto, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar projetos:', error);
      throw new Error(`Erro ao carregar projetos: ${error.message}`);
    }

    const projects = data || [];
    const total = projects.length;
    
    
    // Usar os status reais dos projetos: 'ativo', 'pausado', 'concluido', 'cancelado'
    const active = projects.filter(p => p.status_projeto === 'ativo').length;
    const completed = projects.filter(p => p.status_projeto === 'concluido').length;
    const pending = projects.filter(p => p.status_projeto === 'pausado').length;
    
    // Projetos criados nos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recent = projects.filter(p => 
      new Date(p.created_at) >= thirtyDaysAgo
    ).length;


    return {
      total,
      active,
      completed,
      pending,
      recent
    };
  }

  /**
   * Busca estatísticas de deals
   */
  static async getDealsStats(): Promise<DealsStats> {
    console.log('💰 Buscando estatísticas de deals...');
    
    const { data, error } = await supabase
      .from('agencia_deals')
      .select('id, nome_deal, status, valor_estimado, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar deals:', error);
      throw new Error(`Erro ao carregar deals: ${error.message}`);
    }

    const deals = data || [];
    const total = deals.length;
    
    const won = deals.filter(d => d.status === 'won' || d.status === 'closed_won').length;
    const lost = deals.filter(d => d.status === 'lost' || d.status === 'closed_lost').length;
    const inProgress = deals.filter(d => d.status === 'in_progress' || d.status === 'negotiation').length;
    
    // Deals criados nos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recent = deals.filter(d => 
      new Date(d.created_at) >= thirtyDaysAgo
    ).length;


    return {
      total,
      won,
      lost,
      inProgress,
      recent
    };
  }

  /**
   * Busca estatísticas de especialidades (usando view unificada)
   */
  static async getSpecialtiesStats(): Promise<SpecialtiesStats> {
    console.log('🏥 Buscando estatísticas de especialidades...');
    
    try {
      const { data, error } = await supabase
        .from('v_specialties_for_dashboard')
        .select('*')
        .order('total_occurrences', { ascending: false });

      if (error) {
        console.warn('⚠️ View unificada não disponível, usando fallback:', error);
        return await this.getSpecialtiesStatsFallback();
      }

      const specialties = data || [];
      const total = specialties.length;
      
      const mostUsed = specialties.slice(0, 5).map(s => ({
        specialty_name: s.specialty_name,
        total_occurrences: s.total_occurrences
      }));
      
      const recentlyUpdated = specialties
        .sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime())
        .slice(0, 5)
        .map(s => ({
          specialty_name: s.specialty_name,
          last_updated: s.last_updated
        }));


      return {
        total,
        mostUsed,
        recentlyUpdated
      };
    } catch (error) {
      console.warn('⚠️ Erro na view unificada, usando fallback:', error);
      return await this.getSpecialtiesStatsFallback();
    }
  }

  /**
   * Fallback para estatísticas de especialidades
   */
  private static async getSpecialtiesStatsFallback(): Promise<SpecialtiesStats> {
    const { data, error } = await supabase
      .from('screens')
      .select('specialty')
      .not('specialty', 'is', null)
      .limit(1000);

    if (error) {
      console.error('❌ Erro no fallback de especialidades:', error);
      return { total: 0, mostUsed: [], recentlyUpdated: [] };
    }

    const allSpecialties = (data || [])
      .flatMap((row: any) => row.specialty || [])
      .filter(Boolean)
      .map((s: string) => s.trim())
      .filter(Boolean);

    const specialtyCounts = allSpecialties.reduce((acc: Record<string, number>, specialty: string) => {
      acc[specialty] = (acc[specialty] || 0) + 1;
      return acc;
    }, {});

    const mostUsed = Object.entries(specialtyCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([specialty_name, total_occurrences]) => ({
        specialty_name,
        total_occurrences: total_occurrences as number
      }));

    return {
      total: Object.keys(specialtyCounts).length,
      mostUsed,
      recentlyUpdated: [] // Não disponível no fallback
    };
  }

  /**
   * Busca todas as estatísticas do dashboard
   */
  static async getAllDashboardStats(): Promise<DashboardStats> {
    console.log('📊 Carregando todas as estatísticas do dashboard...');
    
    try {
      const [proposals, agencies, projects, deals, specialties] = await Promise.all([
        DashboardService.getProposalsStats(),
        DashboardService.getAgenciesStats(),
        DashboardService.getProjectsStats(),
        DashboardService.getDealsStats(),
        DashboardService.getSpecialtiesStats()
      ]);

      // Calcular estatísticas adicionais
      const activeScreens = await DashboardService.getActiveScreensCount();
      const activeProposals = proposals.accepted + proposals.analysis + proposals.sent;

      const stats: DashboardStats = {
        proposals,
        agencies,
        projects,
        deals,
        specialties,
        activeScreens,
        activeProposals,
        screenGrowth: 0, // TODO: Implementar cálculo de crescimento
        proposalGrowth: 0, // TODO: Implementar cálculo de crescimento
        lastUpdated: new Date().toISOString()
      };

      console.log('✅ Todas as estatísticas carregadas com sucesso');
      console.log('🔍 Dashboard Stats Debug:', {
        activeScreens: stats.activeScreens,
        activeProposals: stats.activeProposals,
        proposalsTotal: stats.proposals.total,
        proposalsAccepted: stats.proposals.accepted,
        agenciesTotal: stats.agencies.total,
        projectsTotal: stats.projects.total
      });
      return stats;
    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas do dashboard:', error);
      throw new Error('Erro ao carregar dados do dashboard');
    }
  }

  /**
   * Busca estatísticas com fallback para dados parciais
   */
  static async getDashboardStatsWithFallback(): Promise<Partial<DashboardStats>> {
    console.log('📊 Carregando estatísticas com fallback...');
    
    const stats: Partial<DashboardStats> = {
      lastUpdated: new Date().toISOString()
    };

    // Carregar cada estatística individualmente para evitar falha total
    try {
      stats.proposals = await DashboardService.getProposalsStats();
    } catch (error) {
      console.warn('⚠️ Erro ao carregar propostas:', error);
    }

    try {
      stats.agencies = await DashboardService.getAgenciesStats();
    } catch (error) {
      console.warn('⚠️ Erro ao carregar agências:', error);
    }

    try {
      stats.projects = await DashboardService.getProjectsStats();
    } catch (error) {
      console.warn('⚠️ Erro ao carregar projetos:', error);
    }

    try {
      stats.deals = await DashboardService.getDealsStats();
    } catch (error) {
      console.warn('⚠️ Erro ao carregar deals:', error);
    }

    try {
      stats.specialties = await DashboardService.getSpecialtiesStats();
    } catch (error) {
      console.warn('⚠️ Erro ao carregar especialidades:', error);
    }

    // Calcular estatísticas adicionais se possível
    try {
      stats.activeScreens = await DashboardService.getActiveScreensCount();
    } catch (error) {
      console.warn('⚠️ Erro ao carregar contagem de telas:', error);
      stats.activeScreens = 0;
    }

    try {
      if (stats.proposals) {
        stats.activeProposals = stats.proposals.accepted + stats.proposals.analysis + stats.proposals.sent;
      }
    } catch (error) {
      console.warn('⚠️ Erro ao calcular propostas ativas:', error);
      stats.activeProposals = 0;
    }

    // Valores padrão para crescimento
    stats.screenGrowth = 0;
    stats.proposalGrowth = 0;

    return stats;
  }

  /**
   * Conta telas ativas usando a mesma fonte do inventário
   */
  static async getActiveScreensCount(): Promise<number> {
    console.log('📺 Contando telas ativas usando VIEW unificada...');
    
    try {
      // Usar a mesma VIEW que o inventário usa para consistência
      const { data, error } = await supabase
        .from('v_screens_enriched')
        .select('id, active')
        .eq('active', true);

      if (error) {
        console.warn('⚠️ Erro ao contar telas ativas via VIEW:', error);
        // Fallback para tabela direta se VIEW falhar
        return await this.getActiveScreensCountFallback();
      }

      const activeCount = data?.length || 0;
      
      // Debug: Verificar total também
      const { data: allData } = await supabase
        .from('v_screens_enriched')
        .select('id, active');
      
      const totalCount = allData?.length || 0;
      const inactiveCount = totalCount - activeCount;
      
      
      return activeCount;
    } catch (error) {
      console.warn('⚠️ Erro ao contar telas ativas via VIEW:', error);
      return await this.getActiveScreensCountFallback();
    }
  }

  /**
   * Fallback para contar telas ativas diretamente da tabela screens
   */
  private static async getActiveScreensCountFallback(): Promise<number> {
    console.log('📺 Fallback: Contando telas ativas diretamente da tabela...');
    
    try {
      const { count, error } = await supabase
        .from('screens')
        .select('*', { count: 'exact', head: true })
        .eq('active', true);

      if (error) {
        console.warn('⚠️ Erro no fallback de contagem:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.warn('⚠️ Erro no fallback de contagem:', error);
      return 0;
    }
  }

  /**
   * Força refresh de todas as estatísticas
   */
  static async refreshAllStats(): Promise<DashboardStats> {
    return await DashboardService.getAllDashboardStats();
  }
}

