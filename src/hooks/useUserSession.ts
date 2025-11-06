import { useEffect, useRef } from 'react';
import { userSessionService } from '@/lib/user-session-service';

/**
 * Hook para gerenciar sessões de usuário
 * Inicializa automaticamente o rastreamento de sessão
 */
export const useUserSession = () => {
  const isInitialized = useRef(false);

  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      if (isInitialized.current) return;
      
      try {
        const success = await userSessionService.initializeSession();
        if (success && mounted) {
          isInitialized.current = true;
          console.log('✅ Sessão de usuário inicializada');
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar sessão:', error);
      }
    };

    // Inicializar sessão quando o componente monta
    initializeSession();

    // Cleanup ao desmontar
    return () => {
      mounted = false;
      if (isInitialized.current) {
        userSessionService.endSession().catch(console.error);
      }
    };
  }, []);

  // Cleanup ao fechar a página
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isInitialized.current) {
        // Usar Beacon/keepalive leve para evitar aborts no unload
        try {
          userSessionService.endSessionBeacon('page_close');
        } catch {}
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, []);

  return {
    isInitialized: isInitialized.current
  };
};
