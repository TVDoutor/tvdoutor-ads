/**
 * Centro de Alertas - Versão Limitada (5 alertas)
 * Com botão "Ver todas notificações"
 */

import { AlertTriangle, Clock, Monitor, FileText, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";

interface Alert {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'warning' | 'error' | 'info';
  icon: React.ElementType;
}

export function AlertsCenterLimited() {
  const navigate = useNavigate();

  // Mock de alertas - em produção virá de uma API/hook
  const allAlerts: Alert[] = [
    {
      id: '1',
      title: 'Proposta sem resposta',
      description: 'Aguardando resposta da Mídia Digital há 35 dias',
      time: '1m',
      type: 'error',
      icon: FileText
    },
    {
      id: '2',
      title: 'Tela inativa em Piracicaba',
      description: 'Hospital dos Fornecedores de Cana de Piracicaba',
      time: '5m',
      type: 'warning',
      icon: Monitor
    },
    {
      id: '3',
      title: 'Proposta aguardando aprovação',
      description: 'Proposta #145 precisa de revisão urgente',
      time: '15m',
      type: 'warning',
      icon: FileText
    },
    {
      id: '4',
      title: 'Tela offline em Campinas',
      description: 'Hospital das Clínicas - Sem conexão há 2 horas',
      time: '2h',
      type: 'error',
      icon: Monitor
    },
    {
      id: '5',
      title: 'Vencimento de contrato próximo',
      description: 'Contrato com Rede Saúde vence em 7 dias',
      time: '3h',
      type: 'info',
      icon: Clock
    },
  ];

  const limitedAlerts = allAlerts.slice(0, 5);

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-orange-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-gray-600';
    }
  };

  const getAlertBg = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50';
      case 'warning':
        return 'bg-orange-50';
      case 'info':
        return 'bg-blue-50';
      default:
        return 'bg-gray-50';
    }
  };

  return (
    <div className="space-y-3">
      {limitedAlerts.map((alert) => {
        const Icon = alert.icon;
        return (
          <div
            key={alert.id}
            className={`p-4 rounded-xl border ${getAlertBg(alert.type)} border-gray-200 hover:shadow-md transition-all cursor-pointer`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className={`p-2 rounded-lg ${getAlertBg(alert.type)}`}>
                  <Icon className={`h-4 w-4 ${getAlertColor(alert.type)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold text-sm ${getAlertColor(alert.type)}`}>
                    {alert.title}
                  </h4>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                    {alert.description}
                  </p>
                </div>
              </div>
              <span className="text-xs text-gray-400 ml-2">{alert.time}</span>
            </div>
          </div>
        );
      })}

      {/* Botão Ver Todas Notificações */}
      <Button
        variant="outline"
        className="w-full mt-4 text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300 transition-all rounded-xl font-semibold"
        onClick={() => navigate('/notifications')} // Ajuste a rota conforme necessário
      >
        Ver todas notificações
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}
