import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProposalStatusBadge, type ProposalStatus } from "@/components/ProposalStatusBadge";
import { PDFDownloadButton } from "@/components/PDFDownloadButton";
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Mail, 
  DollarSign, 
  Monitor, 
  MapPin,
  Edit
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProposalDetails {
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
  notes?: string;
  screens: any[];
  filters: any;
  quote: any;
}

const ProposalDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<ProposalDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProposal(parseInt(id));
    }
  }, [id]);

  const fetchProposal = async (proposalId: number) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Proposta não encontrada');

      setProposal(data);
    } catch (error: any) {
      console.error('Erro ao buscar proposta:', error);
      toast.error('Erro ao carregar proposta');
      navigate('/propostas');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: ProposalStatus) => {
    if (!proposal) return;

    try {
      const { error } = await supabase
        .from('proposals')
        .update({ 
          status: newStatus,
          status_updated_at: new Date().toISOString()
        })
        .eq('id', proposal.id);

      if (error) throw error;

      setProposal(prev => prev ? {
        ...prev,
        status: newStatus,
        status_updated_at: new Date().toISOString()
      } : null);

      toast.success('Status atualizado com sucesso');
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!proposal) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Proposta não encontrada</h1>
            <Button onClick={() => navigate('/propostas')}>
              Voltar para Propostas
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const formatCurrency = (value?: number) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/propostas')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Proposta #{proposal.id}</h1>
              <p className="text-muted-foreground">
                Criada em {formatDate(proposal.created_at)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <ProposalStatusBadge status={proposal.status} />
            <Button 
              variant="outline" 
              onClick={() => navigate(`/nova-proposta?edit=${proposal.id}`)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
            <PDFDownloadButton 
              proposalId={proposal.id} 
              customerName={proposal.customer_name} 
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome</label>
                  <p className="text-lg font-semibold">{proposal.customer_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {proposal.customer_email}
                  </p>
                </div>
              </div>
              
              {proposal.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Observações</label>
                  <p className="mt-1 text-sm">{proposal.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                <Badge variant="outline" className="ml-2">
                  {proposal.proposal_type === 'avulsa' ? 'Avulsa' : 'Projeto'}
                </Badge>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Valor Bruto</label>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(proposal.gross_calendar)}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Valor Líquido</label>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(proposal.net_calendar)}
                </p>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-muted-foreground">Início</label>
                  <p className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(proposal.start_date)}
                  </p>
                </div>
                <div>
                  <label className="text-muted-foreground">Fim</label>
                  <p className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(proposal.end_date)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Actions */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Ações de Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={proposal.status === 'rascunho' ? 'default' : 'outline'}
                  onClick={() => handleStatusChange('rascunho')}
                  size="sm"
                >
                  Rascunho
                </Button>
                <Button
                  variant={proposal.status === 'enviada' ? 'default' : 'outline'}
                  onClick={() => handleStatusChange('enviada')}
                  size="sm"
                >
                  Enviada
                </Button>
                <Button
                  variant={proposal.status === 'em_analise' ? 'default' : 'outline'}
                  onClick={() => handleStatusChange('em_analise')}
                  size="sm"
                >
                  Em Análise
                </Button>
                <Button
                  variant={proposal.status === 'aceita' ? 'default' : 'outline'}
                  onClick={() => handleStatusChange('aceita')}
                  size="sm"
                >
                  Aceita
                </Button>
                <Button
                  variant={proposal.status === 'rejeitada' ? 'default' : 'outline'}
                  onClick={() => handleStatusChange('rejeitada')}
                  size="sm"
                >
                  Rejeitada
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Screens Summary */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Telas Selecionadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {proposal.screens?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Telas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {proposal.quote?.cities?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Cidades</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {proposal.quote?.states?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Estados</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProposalDetails;