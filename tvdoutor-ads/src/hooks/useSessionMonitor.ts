/**
 * 🔍 Hook de Monitoramento de Sessão
 * 
 * Atualiza automaticamente o timestamp de "última atividade" do usuário
 * enquanto ele navega pela aplicação.
 */

import { useEffect, useRef } from 'react';
import { updateLastSeen, isSessionValid, endUserSession } from '@/lib/userSessionManager';

export interface UseSessionMonitorOptions {
  /**
   * Intervalo em milissegundos para atualizar last_seen
   * @default 60000 (1 minuto)
   */
  updateInterval?: number;
  
  /**
   * Se true, verifica a validade da sessão periodicamente
   * @default true
   */
  checkValidity?: boolean;
  
  /**
   * Callback chamado quando a sessão expira
   */
  onSessionExpired?: () => void;
  
  /**
   * Se true, encerra a sessão automaticamente ao desmontar o componente
   * @default false
   */
  endOnUnmount?: boolean;
}

/**
 * Hook para monitorar e manter a sessão do usuário ativa
 * 
 * @example
 * ```tsx
 * function App() {
 *   useSessionMonitor({
 *     updateInterval: 60000, // Atualiza a cada 1 minuto
 *     onSessionExpired: () => {
 *       // Redirecionar para login
 *       navigate('/login');
 *     }
 *   });
 *   
 *   return <div>...</div>;
 * }
 * ```
 */
export function useSessionMonitor(options: UseSessionMonitorOptions = {}) {
  const {
    updateInterval = 60000, // 1 minuto
    checkValidity = true,
    onSessionExpired,
    endOnUnmount = false
  } = options;
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const validityCheckRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const sessionToken = sessionStorage.getItem('session_token');
    
    // Só ativar se houver um token de sessão
    if (!sessionToken) {
      console.log('📍 Session Monitor: Nenhuma sessão ativa encontrada');
      return;
    }
    
    console.log('📍 Session Monitor: Iniciado', {
      updateInterval: `${updateInterval / 1000}s`,
      checkValidity
    });
    
    // Função para atualizar last_seen
    const updateActivity = async () => {
      const success = await updateLastSeen();
      
      if (success) {
        console.log('✅ Last seen atualizado:', new Date().toISOString());
      } else {
        console.warn('⚠️ Falha ao atualizar last seen');
      }
    };
    
    // Função para verificar validade da sessão
    const checkSession = async () => {
      const valid = await isSessionValid();
      
      if (!valid) {
        console.warn('⚠️ Sessão expirada ou inválida');
        
        // Limpar intervalos
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (validityCheckRef.current) clearInterval(validityCheckRef.current);
        
        // Chamar callback se fornecido
        if (onSessionExpired) {
          onSessionExpired();
        }
      }
    };
    
    // Atualizar imediatamente ao montar
    updateActivity();
    
    // Configurar intervalo para atualizar periodicamente
    intervalRef.current = setInterval(updateActivity, updateInterval);
    
    // Configurar verificação de validade (a cada 2 minutos)
    if (checkValidity) {
      validityCheckRef.current = setInterval(checkSession, 120000); // 2 minutos
    }
    
    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      if (validityCheckRef.current) {
        clearInterval(validityCheckRef.current);
      }
      
      // Encerrar sessão ao desmontar se configurado
      if (endOnUnmount) {
        endUserSession('system');
      }
      
      console.log('📍 Session Monitor: Parado');
    };
  }, [updateInterval, checkValidity, onSessionExpired, endOnUnmount]);
}

/**
 * Hook simplificado que detecta inatividade do usuário
 * e encerra a sessão após um período sem atividade
 */
export function useInactivityTimeout(timeoutMinutes: number = 30) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const resetTimeout = () => {
      // Limpar timeout anterior
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Configurar novo timeout
      timeoutRef.current = setTimeout(async () => {
        console.warn(`⏰ Usuário inativo por ${timeoutMinutes} minutos. Encerrando sessão...`);
        await endUserSession('timeout');
        
        // Opcional: redirecionar para login
        window.location.href = '/login';
      }, timeoutMinutes * 60 * 1000);
    };
    
    // Eventos que indicam atividade do usuário
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];
    
    // Adicionar listeners
    events.forEach(event => {
      document.addEventListener(event, resetTimeout);
    });
    
    // Iniciar timeout
    resetTimeout();
    
    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      events.forEach(event => {
        document.removeEventListener(event, resetTimeout);
      });
    };
  }, [timeoutMinutes]);
}

