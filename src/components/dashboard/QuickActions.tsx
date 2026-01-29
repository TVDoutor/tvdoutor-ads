import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Package, 
  Map, 
  BarChart3,
  ArrowRight,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  variant?: 'primary' | 'secondary';
  description?: string;
}

interface QuickActionsProps {
  actions?: QuickAction[];
  onActionClick?: (action: QuickAction) => void;
}

const defaultActions: QuickAction[] = [
  {
    id: 'new-proposal',
    label: 'Nova Proposta',
    icon: Plus,
    path: '/nova-proposta',
    variant: 'primary',
    description: 'Criar nova proposta comercial'
  },
  {
    id: 'manage-inventory',
    label: 'Gerenciar Inventário',
    icon: Package,
    path: '/inventory',
    variant: 'secondary',
    description: 'Visualizar e editar inventário'
  },
  {
    id: 'explore-map',
    label: 'Explorar Mapa',
    icon: Map,
    path: '/mapa-interativo',
    variant: 'secondary',
    description: 'Visualizar pontos no mapa'
  },
  {
    id: 'reports',
    label: 'Relatórios',
    icon: BarChart3,
    path: '/reports',
    variant: 'secondary',
    description: 'Acessar relatórios detalhados'
  }
];

export const QuickActions = ({ 
  actions = defaultActions,
  onActionClick 
}: QuickActionsProps) => {
  const navigate = useNavigate();

  const handleActionClick = (action: QuickAction) => {
    onActionClick?.(action);
    navigate(action.path);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Zap className="h-5 w-5 text-orange-500" />
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => {
          const IconComponent = action.icon;
          const isPrimary = action.variant === 'primary';
          
          return (
            <Button
              key={action.id}
              variant={isPrimary ? "default" : "outline"}
              className={cn(
                "w-full justify-start h-auto p-4 group transition-all duration-200",
                isPrimary 
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  : "hover:bg-gray-50 hover:border-orange-200 hover:shadow-md"
              )}
              onClick={() => handleActionClick(action)}
            >
              <div className="flex items-center gap-3 w-full">
                <div className={cn(
                  "p-2 rounded-lg transition-transform group-hover:scale-110",
                  isPrimary 
                    ? "bg-white/20" 
                    : "bg-orange-50 text-orange-600"
                )}>
                  <IconComponent className="h-5 w-5" />
                </div>
                
                <div className="flex-1 text-left">
                  <div className={cn(
                    "font-semibold text-sm",
                    isPrimary ? "text-white" : "text-gray-900"
                  )}>
                    {action.label}
                  </div>
                  {action.description && (
                    <div className={cn(
                      "text-xs mt-1",
                      isPrimary ? "text-white/80" : "text-gray-500"
                    )}>
                      {action.description}
                    </div>
                  )}
                </div>
                
                <ArrowRight className={cn(
                  "h-4 w-4 transition-transform group-hover:translate-x-1",
                  isPrimary ? "text-white/80" : "text-gray-400"
                )} />
              </div>
            </Button>
          );
        })}
        
        {/* Seção adicional com estatísticas rápidas */}
        <div className="pt-4 mt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Acesso Rápido
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-16 flex-col gap-1 hover:bg-orange-50 hover:text-orange-600"
              onClick={() => navigate('/inventory')}
            >
              <Package className="h-4 w-4" />
              <span className="text-xs">Inventário</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-16 flex-col gap-1 hover:bg-orange-50 hover:text-orange-600"
              onClick={() => navigate('/reports')}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs">Relatórios</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};