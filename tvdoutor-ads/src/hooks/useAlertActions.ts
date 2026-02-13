import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { RealAlert } from './useRealAlerts';

const STORAGE_KEY = 'tvd-dashboard-dismissed-alerts';

function loadDismissedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveDismissedIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

/**
 * Hook para gerenciar ações dos alertas (resolver e dispensar).
 * Alertas dispensados são persistidos em localStorage e sobrevivem ao refresh.
 */
export const useAlertActions = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(loadDismissedIds);

  /**
   * Resolve um alerta redirecionando para a página apropriada
   */
  const resolveAlert = (alert: RealAlert) => {
    console.log('🔧 Resolvendo alerta:', alert.id, alert.category);
    
    let targetPath = '/dashboard';
    let message = 'Redirecionando para resolver o alerta...';

    switch (alert.category) {
      case 'inactive_screen':
        // Redirecionar para inventário/telas
        targetPath = '/inventory';
        message = 'Redirecionando para o inventário de telas...';
        break;
        
      case 'no_response_proposal':
        // Redirecionar para propostas
        targetPath = '/propostas';
        message = 'Redirecionando para as propostas...';
        break;
        
      case 'integration_error':
        // Agências sem contatos → Gerenciamento de Projetos
        if (alert.id === 'integration-missing-contacts' || alert.title?.includes('Agências sem contatos')) {
          targetPath = '/gerenciamento-projetos';
          message = 'Redirecionando para o gerenciamento de projetos...';
        } else {
          // Outros erros de integração → Configurações
          targetPath = '/settings';
          message = 'Redirecionando para configurações...';
        }
        break;

      case 'player_offline':
        targetPath = '/inventory';
        message = 'Redirecionando para o inventário de equipamentos...';
        break;
        
      default:
        targetPath = '/dashboard';
        message = 'Redirecionando...';
    }

    toast.info(message);
    
    // Pequeno delay para mostrar o toast antes de redirecionar
    setTimeout(() => {
      navigate(targetPath);
    }, 1000);
  };

  /**
   * Dispensa um alerta (remove da visualização). Persiste em localStorage.
   */
  const dismissAlert = useCallback((alertId: string) => {
    setDismissedAlerts(prev => {
      const next = [...prev, alertId];
      saveDismissedIds(next);
      return next;
    });
    queryClient.invalidateQueries({ queryKey: ['real-alerts'] });
    toast.success('Alerta dispensado com sucesso');
  }, [queryClient]);

  /**
   * Ação em lote para múltiplos alertas
   */
  const handleBulkAction = (action: 'resolve' | 'dismiss', alertIds: string[], alerts: RealAlert[]) => {
    console.log(`📋 Ação em lote: ${action} para ${alertIds.length} alertas`);
    
    if (action === 'resolve') {
      // Para resolver em lote, vamos para a página mais relevante baseada na maioria dos alertas
      const categories = alertIds.map(id => {
        const alert = alerts.find(a => a.id === id);
        return alert?.category;
      });
      
      const mostCommonCategory = categories.reduce((acc, category) => {
        if (!category) return acc;
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const primaryCategory = Object.entries(mostCommonCategory)
        .sort(([,a], [,b]) => b - a)[0]?.[0] as RealAlert['category'];
      
      if (primaryCategory) {
        const mockAlert: RealAlert = {
          id: 'bulk',
          category: primaryCategory,
          severity: 'info',
          title: 'Bulk Action',
          description: 'Bulk resolution',
          entityName: 'Multiple',
          slaDeadline: '',
          slaBreached: false,
          recommendedAction: '',
          timestamp: new Date().toISOString()
        };
        
        resolveAlert(mockAlert);
        toast.success(`Redirecionando para resolver ${alertIds.length} alertas`);
      }
    } else if (action === 'dismiss') {
      setDismissedAlerts(prev => {
        const next = [...new Set([...prev, ...alertIds])];
        saveDismissedIds(next);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['real-alerts'] });
      toast.success(`${alertIds.length} ${alertIds.length === 1 ? 'alerta dispensado' : 'alertas dispensados'}`);
    }
  };

  /**
   * Filtrar alertas dispensados
   */
  const filterDismissedAlerts = (alerts: RealAlert[]): RealAlert[] => {
    return alerts.filter(alert => !dismissedAlerts.includes(alert.id));
  };

  /**
   * Limpar alertas dispensados (para debug/admin / Restaurar)
   */
  const clearDismissedAlerts = useCallback(() => {
    setDismissedAlerts([]);
    saveDismissedIds([]);
    queryClient.invalidateQueries({ queryKey: ['real-alerts'] });
    toast.info('Alertas dispensados restaurados');
  }, [queryClient]);

  return {
    resolveAlert,
    dismissAlert,
    handleBulkAction,
    filterDismissedAlerts,
    clearDismissedAlerts,
    dismissedAlerts,
  };
};