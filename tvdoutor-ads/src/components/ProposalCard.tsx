
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Edit, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle,
  MoreHorizontal,
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProposalStatusBadge, type ProposalStatus } from "./ProposalStatusBadge";
import { PDFDownloadButton } from "./PDFDownloadButton";
import { supabase } from "@/integrations/supabase/client";
import { emailService } from "@/lib/email-service";
import { toast } from "sonner";

interface Proposal {
  id: number;
  customer_name: string;
  customer_email: string;
  proposal_type: 'avulsa' | 'projeto';
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
  status_updated_at: string;
  start_date?: string;
  end_date?: string;
  net_calendar?: number;
  gross_calendar?: number;
  created_by?: string;
}

interface ProposalCardProps {
  proposal: Proposal;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onStatusChange: (id: number, newStatus: ProposalStatus) => void;
  onRefresh: () => void;
}

export const ProposalCard = ({ 
  proposal, 
  onView, 
  onEdit, 
  onStatusChange, 
  onRefresh 
}: ProposalCardProps) => {
  
  const formatCurrency = (value?: number) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getTimeSince = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d atrás`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}sem atrás`;
    return formatDate(dateString);
  };

  const handleStatusChange = async (newStatus: ProposalStatus) => {
    try {
      const { error } = await supabase
        .rpc('update_proposal_status', {
          p_proposal_id: proposal.id,
          p_new_status: newStatus
        });

      if (error) throw error;

      toast.success(`Status alterado para "${newStatus}"`);
      onStatusChange(proposal.id, newStatus);
      onRefresh();

      // Enviar notificação de mudança de status (não bloquear a UI)
      emailService.sendProposalNotification(proposal.id, 'status_changed')
        .then(() => {
          toast.success('Notificações de status enviadas!');
        })
        .catch((emailError) => {
          console.error('Erro ao enviar notificações:', emailError);
          // Não mostrar erro para não confundir o usuário, apenas log
        });

    } catch (error: unknown) {
      console.error('Erro ao alterar status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao alterar status: ' + errorMessage);
    }
  };

  const getStatusActions = (currentStatus: ProposalStatus) => {
    const actions = [];
    
    switch (currentStatus) {
      case 'rascunho':
        actions.push({ status: 'enviada', label: 'Enviar Proposta', icon: Send });
        break;
      case 'enviada':
        actions.push({ status: 'em_analise', label: 'Marcar Em Análise', icon: Clock });
        actions.push({ status: 'aceita', label: 'Marcar como Aceita', icon: CheckCircle });
        actions.push({ status: 'rejeitada', label: 'Marcar como Rejeitada', icon: XCircle });
        break;
      case 'em_analise':
        actions.push({ status: 'aceita', label: 'Marcar como Aceita', icon: CheckCircle });
        actions.push({ status: 'rejeitada', label: 'Marcar como Rejeitada', icon: XCircle });
        actions.push({ status: 'enviada', label: 'Voltar para Enviada', icon: Send });
        break;
      case 'rejeitada':
        actions.push({ status: 'enviada', label: 'Reenviar Proposta', icon: Send });
        actions.push({ status: 'rascunho', label: 'Voltar para Rascunho', icon: Edit });
        break;
    }
    
    return actions;
  };

  const statusActions = getStatusActions(proposal.status);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold">
                Proposta #{proposal.id}
              </h3>
              <ProposalStatusBadge status={proposal.status} />
              <Badge variant="outline" className="text-xs">
                {proposal.proposal_type}
              </Badge>
            </div>
            
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><strong>Cliente:</strong> {proposal.customer_name}</p>
              <p><strong>Email:</strong> {proposal.customer_email}</p>
              {proposal.start_date && proposal.end_date && (
                <p>
                  <strong>Período:</strong> {formatDate(proposal.start_date)} - {formatDate(proposal.end_date)}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(proposal.id)}>
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </DropdownMenuItem>
              
              {proposal.status === 'rascunho' && (
                <DropdownMenuItem onClick={() => onEdit(proposal.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem asChild>
                <PDFDownloadButton 
                  proposalId={proposal.id}
                  customerName={proposal.customer_name}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-auto p-2"
                />
              </DropdownMenuItem>
              
              {statusActions.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {statusActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <DropdownMenuItem
                        key={action.status}
                        onClick={() => handleStatusChange(action.status as ProposalStatus)}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {action.label}
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-6 text-sm">
            {proposal.net_calendar && (
              <div>
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-medium text-green-600 ml-1">
                  {formatCurrency(proposal.net_calendar)}
                </span>
              </div>
            )}
            
            <div>
              <span className="text-muted-foreground">Criada:</span>
              <span className="ml-1">{formatDate(proposal.created_at)}</span>
            </div>
            
            <div>
              <span className="text-muted-foreground">Atualizada:</span>
              <span className="ml-1">{getTimeSince(proposal.status_updated_at)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onView(proposal.id)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver
            </Button>
            
            {proposal.status === 'rascunho' && (
              <Button 
                size="sm"
                onClick={() => handleStatusChange('enviada')}
              >
                <Send className="h-4 w-4 mr-1" />
                Enviar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
