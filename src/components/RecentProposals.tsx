import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { FileText, Eye, Calendar } from "lucide-react";
import { ProposalStatusBadge, type ProposalStatus } from "./ProposalStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Proposal {
  id: number;
  customer_name: string;
  proposal_type: 'avulsa' | 'projeto';
  status: ProposalStatus;
  created_at: string;
  status_updated_at: string;
  net_calendar?: number;
}



interface RecentProposalsProps {
  limit?: number;
  showViewAll?: boolean;
}

export const RecentProposals = ({ limit = 5, showViewAll = true }: RecentProposalsProps) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentProposals();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchRecentProposals, 30000);
    return () => clearInterval(interval);
  }, [limit]);

  const fetchRecentProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          id,
          customer_name,
          proposal_type,
          status,
          created_at,
          status_updated_at,
          net_calendar
        `)
        .order('status_updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setProposals(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar propostas recentes:', error);
      toast.error('Erro ao carregar propostas recentes');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeSince = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora';
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    return formatDate(dateString);
  };

  const handleViewProposal = (proposalId: number) => {
    // Navegar para a lista de propostas (por enquanto)
    navigate('/propostas');
  };

  const handleViewAllProposals = () => {
    navigate('/propostas');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Propostas Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (proposals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Propostas Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nenhuma proposta encontrada</p>
            <Button onClick={() => navigate('/nova-proposta')}>
              Criar Nova Proposta
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Propostas Recentes
        </CardTitle>
        {showViewAll && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleViewAllProposals}
          >
            Ver Todas
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {proposals.map((proposal) => {
          return (
            <div
              key={proposal.id}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => handleViewProposal(proposal.id)}
            >
              {/* Status Badge */}
              <div className="flex-shrink-0">
                <ProposalStatusBadge status={proposal.status} className="text-xs" />
              </div>

              {/* Proposal Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">
                    Proposta #{proposal.id} - {proposal.customer_name}
                  </p>
                  <span className="text-xs text-muted-foreground ml-2">
                    {getTimeSince(proposal.status_updated_at)}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-muted-foreground capitalize">
                    {proposal.proposal_type}
                  </span>
                  {proposal.net_calendar && (
                    <span className="text-xs font-medium text-green-600">
                      {formatCurrency(proposal.net_calendar)}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewProposal(proposal.id);
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          );
        })}

        {/* Quick Stats */}
        <div className="pt-3 border-t">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">
                {proposals.filter(p => p.status === 'aceita').length}
              </p>
              <p className="text-xs text-muted-foreground">Aceitas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary">
                {proposals.filter(p => p.status === 'em_analise').length}
              </p>
              <p className="text-xs text-muted-foreground">Em Análise</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
