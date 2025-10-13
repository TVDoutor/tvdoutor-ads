import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook para sincronização em tempo real do dashboard
 * Escuta mudanças em todas as tabelas relevantes e invalida cache automaticamente
 */
export const useDashboardRealtime = () => {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Função para processar mudanças individuais
  const handleDataChange = useCallback((table: string, payload: any) => {
    
    // Invalidar cache específico baseado na tabela
    switch (table) {
      case 'proposals':
        queryClient.invalidateQueries({ queryKey: ['proposals-stats'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats-fallback'] });
        break;
        
      case 'agencies':
        queryClient.invalidateQueries({ queryKey: ['agencies-stats'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats-fallback'] });
        break;
        
      case 'projects':
        queryClient.invalidateQueries({ queryKey: ['projects-stats'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats-fallback'] });
        break;
        
      case 'deals':
        queryClient.invalidateQueries({ queryKey: ['deals-stats'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats-fallback'] });
        break;
        
      case 'specialties':
        queryClient.invalidateQueries({ queryKey: ['specialties'] });
        queryClient.invalidateQueries({ queryKey: ['specialties-detailed'] });
        queryClient.invalidateQueries({ queryKey: ['specialties-fallback'] });
        break;
    }
    
  }, [queryClient]);

  // Função para processar sincronização em lote
  const handleBatchSync = useCallback((payload: any) => {
    
    // Invalidar todas as queries do dashboard
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats-fallback'] });
    queryClient.invalidateQueries({ queryKey: ['proposals-stats'] });
    queryClient.invalidateQueries({ queryKey: ['agencies-stats'] });
    queryClient.invalidateQueries({ queryKey: ['projects-stats'] });
    queryClient.invalidateQueries({ queryKey: ['deals-stats'] });
    queryClient.invalidateQueries({ queryKey: ['specialties'] });
    
  }, [queryClient]);

  useEffect(() => {

    // Criar canal de realtime para múltiplas tabelas
    const channel = supabase
      .channel('dashboard-realtime')
      // Escutar mudanças em propostas
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'proposals'
        },
        (payload) => {
          console.log('📡 Mudança detectada em propostas:', payload);
          handleDataChange('proposals', payload);
        }
      )
      // Escutar mudanças em agências
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agencias'
        },
        (payload) => {
          console.log('📡 Mudança detectada em agências:', payload);
          handleDataChange('agencies', payload);
        }
      )
      // Escutar mudanças em projetos
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agencia_projetos'
        },
        (payload) => {
          console.log('📡 Mudança detectada em projetos:', payload);
          handleDataChange('projects', payload);
        }
      )
      // Escutar mudanças em deals
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agencia_deals'
        },
        (payload) => {
          console.log('📡 Mudança detectada em deals:', payload);
          handleDataChange('deals', payload);
        }
      )
      // Escutar mudanças em screens (para especialidades)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'screens'
        },
        (payload) => {
          console.log('📡 Mudança detectada em screens:', payload);
          handleDataChange('specialties', payload);
        }
      )
      // Escutar notificações de sincronização em lote
      .on(
        'broadcast',
        {
          event: 'dashboard_sync'
        },
        (payload) => {
          console.log('📡 Notificação de sincronização em lote:', payload);
          handleBatchSync(payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da conexão realtime do dashboard:', status);
        if (status === 'SUBSCRIBED') {
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Erro na conexão realtime do dashboard, continuando sem sincronização em tempo real');
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ Timeout na conexão realtime do dashboard, tentando reconectar...');
          // Tentar reconectar após 3 segundos
          setTimeout(() => {
            if (channelRef.current) {
              channelRef.current.unsubscribe();
              channelRef.current = null;
            }
          }, 3000);
        }
      });

    channelRef.current = channel;

    // Cleanup na desmontagem
    return () => {
      console.log('🔌 Desconectando dashboard do canal realtime...');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [queryClient, handleDataChange, handleBatchSync]);

  // Função para forçar refresh manual
  const forceRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats-fallback'] });
    queryClient.invalidateQueries({ queryKey: ['proposals-stats'] });
    queryClient.invalidateQueries({ queryKey: ['agencies-stats'] });
    queryClient.invalidateQueries({ queryKey: ['projects-stats'] });
    queryClient.invalidateQueries({ queryKey: ['deals-stats'] });
    queryClient.invalidateQueries({ queryKey: ['specialties'] });
  };

  return {
    forceRefresh,
    isConnected: channelRef.current !== null
  };
};

/**
 * Hook simplificado para componentes que só precisam invalidar cache
 */
export const useDashboardInvalidation = () => {
  const queryClient = useQueryClient();

  const invalidateDashboard = (type?: 'all' | 'proposals' | 'agencies' | 'projects' | 'deals') => {
    
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

  return { invalidateDashboard };
};

