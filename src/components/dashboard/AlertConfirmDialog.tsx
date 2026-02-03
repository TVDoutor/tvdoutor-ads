import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import type { RealAlert } from "@/hooks/useRealAlerts";

interface AlertConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: RealAlert | null;
  action: 'resolve' | 'dismiss';
  onConfirm: () => void;
}

const actionConfig = {
  resolve: {
    title: "Resolver Alerta",
    description: "Você será redirecionado para a página apropriada para resolver este alerta.",
    actionLabel: "Resolver",
    actionClass: "bg-green-600 hover:bg-green-700",
  },
  dismiss: {
    title: "Dispensar Alerta",
    description: "Este alerta será removido da sua visualização. Esta ação não pode ser desfeita.",
    actionLabel: "Dispensar",
    actionClass: "bg-red-600 hover:bg-red-700",
  },
};

export const AlertConfirmDialog = ({
  open,
  onOpenChange,
  alert,
  action,
  onConfirm,
}: AlertConfirmDialogProps) => {
  if (!alert) return null;

  const config = actionConfig[action];
  const severityColor = {
    critical: "bg-red-100 text-red-700 border-red-200",
    warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
  }[alert.severity];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {config.title}
            <Badge className={severityColor}>
              {alert.severity === 'critical' ? 'Crítico' : 
               alert.severity === 'warning' ? 'Atenção' : 'Info'}
            </Badge>
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <div>
              <strong className="text-gray-900">{alert.title}</strong>
              <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm">
                <strong>Entidade:</strong> {alert.entityName}
              </p>
              {alert.location && (
                <p className="text-sm">
                  <strong>Local:</strong> {alert.location}
                </p>
              )}
              <p className="text-sm">
                <strong>SLA:</strong> {alert.slaDeadline}
              </p>
            </div>
            
            <p className="text-sm">{config.description}</p>
            
            {action === 'resolve' && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Ação recomendada:</strong> {alert.recommendedAction}
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={config.actionClass}
            onClick={onConfirm}
          >
            {config.actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};