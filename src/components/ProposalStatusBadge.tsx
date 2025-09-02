import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ProposalStatus = 'rascunho' | 'enviada' | 'em_analise' | 'aceita' | 'rejeitada';

interface ProposalStatusBadgeProps {
  status: ProposalStatus;
  className?: string;
}

const statusConfig = {
  rascunho: {
    label: 'Rascunho',
    variant: 'secondary' as const,
    className: 'bg-gray-100 text-gray-800 border-gray-300'
  },
  enviada: {
    label: 'Enviada',
    variant: 'default' as const,
    className: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  em_analise: {
    label: 'Em Análise',
    variant: 'outline' as const,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  },
  aceita: {
    label: 'Aceita',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 border-green-300'
  },
  rejeitada: {
    label: 'Rejeitada',
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800 border-red-300'
  }
};

export const ProposalStatusBadge = ({ status, className }: ProposalStatusBadgeProps) => {
  const config = statusConfig[status];
  
  if (!config) {
    // Fallback para status desconhecido
    return (
      <Badge 
        variant="secondary"
        className={cn("bg-gray-100 text-gray-800 border-gray-300", className)}
      >
        {status || 'Desconhecido'}
      </Badge>
    );
  }
  
  return (
    <Badge 
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
};
