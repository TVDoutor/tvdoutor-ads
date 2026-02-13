import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook para escutar mudanças em tempo real nas especialidades
 * Invalida automaticamente o cache quando mudanças são detectadas
 */
export const useSpecialtiesRealtime = () => {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    console.log('🔄 Iniciando escuta de mudanças em tempo real...');

    // Criar canal de realtime para especialidades
    const channel = supabase
      .channel('specialties-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'screens',
          filter: 'specialty=not.is.null'
        },
        (payload) => {
          console.log('📡 Mudança detectada em screens:', payload);
          handleSpecialtyChange(payload);
        }
      )
      .on(
        'broadcast',
        {
          event: 'specialties_changes'
        },
        (payload) => {
          console.log('📡 Notificação de mudança em especialidades:', payload);
          handleSpecialtyChange(payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da conexão realtime:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Conectado ao canal de mudanças em tempo real');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Erro na conexão realtime, continuando sem sincronização em tempo real');
        }
      });

    channelRef.current = channel;

    // Função para processar mudanças
    const handleSpecialtyChange = (payload: any) => {
      console.log('🔄 Processando mudança em especialidades:', payload);
      
      // Invalidar todas as queries relacionadas a especialidades
      queryClient.invalidateQueries({ queryKey: ['specialties'] });
      queryClient.invalidateQueries({ queryKey: ['specialties-detailed'] });
      queryClient.invalidateQueries({ queryKey: ['specialties-fallback'] });
      
      // Log da mudança
      console.log('✅ Cache de especialidades invalidado devido a mudança:', {
        event: payload.eventType,
        table: payload.table,
        timestamp: new Date().toISOString()
      });
    };

    // Cleanup na desmontagem
    return () => {
      console.log('🔌 Desconectando do canal realtime...');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [queryClient]);

  // Função para forçar refresh manual
  const forceRefresh = () => {
    console.log('🔄 Forçando refresh manual de especialidades...');
    queryClient.invalidateQueries({ queryKey: ['specialties'] });
    queryClient.invalidateQueries({ queryKey: ['specialties-detailed'] });
    queryClient.invalidateQueries({ queryKey: ['specialties-fallback'] });
  };

  return {
    forceRefresh,
    isConnected: channelRef.current !== null
  };
};

/**
 * Hook simplificado para componentes que só precisam invalidar cache
 * sem gerenciar a conexão realtime
 */
export const useSpecialtiesInvalidation = () => {
  const queryClient = useQueryClient();

  const invalidateSpecialties = () => {
    console.log('🔄 Invalidando cache de especialidades...');
    queryClient.invalidateQueries({ queryKey: ['specialties'] });
    queryClient.invalidateQueries({ queryKey: ['specialties-detailed'] });
    queryClient.invalidateQueries({ queryKey: ['specialties-fallback'] });
  };

  return { invalidateSpecialties };
};
