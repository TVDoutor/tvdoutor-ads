import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RealAlert {
  id: string;
  category: 'inactive_screen' | 'no_response_proposal' | 'integration_error' | 'player_offline';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  entityName: string;
  location?: string;
  slaDeadline: string;
  slaBreached: boolean;
  recommendedAction: string;
  timestamp: string;
}

export interface RealAlertGroup {
  category: 'inactive_screen' | 'no_response_proposal' | 'integration_error' | 'player_offline';
  name: string;
  count: number;
  criticalCount: number;
  alerts: RealAlert[];
}

/**
 * Hook para buscar alertas reais baseados em dados do sistema
 */
export const useRealAlerts = () => {
  return useQuery({
    queryKey: ['real-alerts'],
    queryFn: async (): Promise<RealAlertGroup[]> => {
      console.log('🚨 Buscando alertas reais do sistema...');
      
      try {
        // Buscar propostas sem resposta há muito tempo
        const noResponseProposalsAlerts = await getNoResponseProposalsAlerts();
        
        // Buscar erros de integração (logs de erro recentes)
        const integrationErrorsAlerts = await getIntegrationErrorsAlerts();

        const alertGroups: RealAlertGroup[] = [
          {
            category: 'no_response_proposal',
            name: 'Propostas sem Resposta',
            count: noResponseProposalsAlerts.length,
            criticalCount: noResponseProposalsAlerts.filter(a => a.severity === 'critical').length,
            alerts: noResponseProposalsAlerts
          },
          {
            category: 'integration_error',
            name: 'Erros de Integração',
            count: integrationErrorsAlerts.length,
            criticalCount: integrationErrorsAlerts.filter(a => a.severity === 'critical').length,
            alerts: integrationErrorsAlerts
          }
        ];

        const totalAlerts = alertGroups.reduce((sum, group) => sum + group.count, 0);
        console.log('✅ Alertas carregados:', totalAlerts, 'total');
        
        return alertGroups;
      } catch (error) {
        console.error('❌ Erro ao buscar alertas:', error);
        return [];
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minuto (alertas precisam ser atualizados frequentemente)
    gcTime: 3 * 60 * 1000, // 3 minutos
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60 * 1000, // Atualizar a cada 2 minutos
    retry: 2,
    throwOnError: false,
  });
};

/**
 * Buscar propostas sem resposta há muito tempo
 */
async function getNoResponseProposalsAlerts(): Promise<RealAlert[]> {
  const { data: proposals, error } = await supabase
    .from('proposals')
    .select('id, customer_name, status, created_at, updated_at')
    .in('status', ['enviada', 'em_analise'])
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('⚠️ Erro ao buscar propostas:', error);
    return [];
  }

  const alerts: RealAlert[] = [];
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  (proposals || []).forEach(proposal => {
    const createdDate = new Date(proposal.created_at);
    const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Proposta crítica: enviada há mais de 2 semanas sem resposta
    if (createdDate < twoWeeksAgo && proposal.status === 'enviada') {
      alerts.push({
        id: `proposal-${proposal.id}`,
        category: 'no_response_proposal',
        severity: 'critical',
        title: `Proposta sem resposta há ${daysSinceCreated} dias`,
        description: `${proposal.customer_name}`,
        entityName: proposal.customer_name || 'Cliente não informado',
        slaDeadline: `Há ${daysSinceCreated} dias`,
        slaBreached: true,
        recommendedAction: 'Entrar em contato urgente com o cliente',
        timestamp: proposal.created_at
      });
    }
    // Proposta de atenção: enviada há mais de 1 semana
    else if (createdDate < oneWeekAgo && proposal.status === 'enviada') {
      alerts.push({
        id: `proposal-${proposal.id}`,
        category: 'no_response_proposal',
        severity: 'warning',
        title: `Proposta aguardando resposta há ${daysSinceCreated} dias`,
        description: `${proposal.customer_name}`,
        entityName: proposal.customer_name || 'Cliente não informado',
        slaDeadline: `Há ${daysSinceCreated} dias`,
        slaBreached: false,
        recommendedAction: 'Fazer follow-up com o cliente',
        timestamp: proposal.created_at
      });
    }
  });

  return alerts;
}

/**
 * Buscar equipamentos offline há mais de 24h (tvd_player_status, cache GraphQL app.tvdoutor)
 */
async function getPlayerOffline24hAlerts(): Promise<RealAlert[]> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const { data: rows, error } = await supabase
    .from('tvd_player_status')
    .select('player_id, player_name, venue_code, last_seen, is_connected')
    .or(`last_seen.is.null,last_seen.lt.${cutoffDate}`)
    .order('last_seen', { ascending: true, nullsFirst: true })
    .limit(100);

  if (error) {
    console.warn('⚠️ Erro ao buscar tvd_player_status (offline > 24h):', error);
    return [];
  }

  return (rows || []).map((p) => {
    const lastSeen = p.last_seen ? new Date(p.last_seen) : null;
    const hoursAgo = lastSeen
      ? Math.floor((Date.now() - lastSeen.getTime()) / (1000 * 60 * 60))
      : null;
    const label = hoursAgo != null ? `há ${hoursAgo}h` : 'nunca visto';
    const title = p.venue_code
      ? `Equipamento ${p.venue_code} offline ${label}`
      : `Player ${p.player_name || p.player_id} offline ${label}`;

    return {
      id: `player-offline-${p.player_id}`,
      category: 'player_offline',
      severity: 'critical',
      title,
      description: p.player_name || p.player_id,
      entityName: p.venue_code || p.player_name || p.player_id,
      location: p.venue_code ?? undefined,
      slaDeadline: label,
      slaBreached: true,
      recommendedAction: 'Verificar conexão e sincronia no inventário',
      timestamp: p.last_seen || new Date().toISOString(),
    };
  });
}

/**
 * Buscar erros de integração (simulado baseado em dados inconsistentes)
 */
async function getIntegrationErrorsAlerts(): Promise<RealAlert[]> {
  const alerts: RealAlert[] = [];
  
  try {
    // Verificar propostas com dados inconsistentes
    const { data: inconsistentProposals, error } = await supabase
      .from('proposals')
      .select('id, customer_name, net_calendar')
      .or('customer_name.is.null,net_calendar.is.null');

    if (!error && inconsistentProposals && inconsistentProposals.length > 0) {
      alerts.push({
        id: 'integration-data-inconsistency',
        category: 'integration_error',
        severity: 'warning',
        title: 'Dados inconsistentes detectados',
        description: `${inconsistentProposals.length} propostas com dados incompletos`,
        entityName: 'Sistema de Propostas',
        slaDeadline: 'Detectado agora',
        slaBreached: false,
        recommendedAction: 'Verificar integração e completar dados faltantes',
        timestamp: new Date().toISOString()
      });
    }

    // Verificar agências sem contatos
    const { data: agenciesWithoutContacts, error: agenciesError } = await supabase
      .from('agencias')
      .select(`
        id, 
        nome_agencia,
        agencia_contatos(id)
      `)
      .is('agencia_contatos.id', null);

    if (!agenciesError && agenciesWithoutContacts && agenciesWithoutContacts.length > 0) {
      alerts.push({
        id: 'integration-missing-contacts',
        category: 'integration_error',
        severity: 'info',
        title: 'Agências sem contatos',
        description: `${agenciesWithoutContacts.length} agências precisam de contatos`,
        entityName: 'Sistema de Agências',
        slaDeadline: 'Detectado agora',
        slaBreached: false,
        recommendedAction: 'Adicionar contatos para as agências',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.warn('⚠️ Erro ao verificar integrações:', error);
  }

  return alerts;
}