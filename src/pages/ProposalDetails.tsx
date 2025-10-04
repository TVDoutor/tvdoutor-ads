import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProposalStatusBadge, type ProposalStatus } from "@/components/ProposalStatusBadge";
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Mail, 
  DollarSign, 
  Monitor, 
  Edit,
  MapPin,
  BarChart3,
  Clock,
  Download,
  Eye,
  TrendingUp,
  Building,
  Target,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateProPDF } from "@/lib/pdf";

// helper local para abrir PDF a partir de Blob OU URL
function openPDFFromAny(input: { blob?: Blob; pdfBase64?: string; arrayBuffer?: ArrayBuffer; url?: string; filename?: string }) {
  const filename = input.filename || 'documento.pdf';

  if (input.url) {
    window.open(input.url, '_blank', 'noopener,noreferrer');
    return;
  }

  let blob: Blob | null = null;

  if (input.pdfBase64) {
    const bin = atob(input.pdfBase64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    blob = new Blob([bytes], { type: 'application/pdf' });
  } else if (input.arrayBuffer) {
    blob = new Blob([input.arrayBuffer], { type: 'application/pdf' });
  } else if (input.blob) {
    blob = input.blob;
  }

  if (!blob) throw new Error('EMPTY_PDF_PAYLOAD');

  const url = URL.createObjectURL(blob);
  // Abrir em nova aba e sugerir filename
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

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
  agencia_id?: string;
  projeto_id?: string;
  film_seconds?: number;
  insertions_per_hour?: number;
  cpm_value?: number;
  discount_pct?: number;
  discount_fixed?: number;
  agencias?: {
    id: string;
    nome_agencia: string;
    email_empresa?: string;
    telefone_empresa?: string;
  };
  agencia_projetos?: {
    id: string;
    nome_projeto: string;
    descricao?: string;
    cliente_final?: string;
  };
  proposal_screens?: Array<{
    id: number;
    screen_id: number;
    custom_cpm?: number;
    screens: {
      id: number;
      name: string;
      city: string;
      state: string;
      class: string;
      venue_id?: number;
      venues?: {
        id: number;
        name: string;
      };
    };
  }>;
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
        .select(`
          *,
          agencias (
            id,
            nome_agencia,
            email_empresa,
            telefone_empresa
          ),
          proposal_screens (
            id,
            screen_id,
            custom_cpm,
            screens (
              id,
              name,
              city,
              state,
              class,
              venue_id,
              venues (
                id,
                name
              )
            )
          )
        `)
        .eq('id', proposalId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Proposta não encontrada');

      // Buscar dados do projeto se houver projeto_id
      let projectData = null;
      if (data.projeto_id) {
        const { data: project, error: projectError } = await supabase
          .from('agencia_projetos')
          .select('id, nome_projeto, descricao, cliente_final')
          .eq('id', data.projeto_id)
          .single();
        
        if (!projectError && project) {
          projectData = project;
        }
      }

      // Combinar dados da proposta com dados do projeto
      const proposalWithProject = {
        ...data,
        agencia_projetos: projectData
      };

      setProposal(proposalWithProject);
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

  // Calcular valores dinâmicos se não estiverem salvos
  const calculateEstimatedValues = (proposal: any) => {
    if (!proposal) return { grossValue: 0, netValue: 0, days: 0, impacts: 0 };

    const screens = proposal.proposal_screens?.length || 0;
    const startDate = proposal.start_date ? new Date(proposal.start_date) : null;
    const endDate = proposal.end_date ? new Date(proposal.end_date) : null;
    const days = startDate && endDate ? 
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;
    
    const insertionsPerHour = proposal.insertions_per_hour || 0;
    const hoursPerDay = 10; // Assumindo 10 horas operacionais por dia
    const totalInsertions = insertionsPerHour * hoursPerDay * days * screens;
    
    const avgAudiencePerScreen = 100; // Audiência média estimada
    const impacts = totalInsertions * avgAudiencePerScreen;
    
    const cpm = proposal.cpm_value || 25; // CPM padrão
    const grossValue = (impacts / 1000) * cpm;
    
    const discountPct = proposal.discount_pct || 0;
    const discountFixed = proposal.discount_fixed || 0;
    const netValue = grossValue - (grossValue * discountPct / 100) - discountFixed;

    return {
      grossValue: proposal.gross_calendar || grossValue,
      netValue: proposal.net_calendar || netValue,
      days: proposal.days_calendar || days,
      impacts: proposal.impacts_calendar || impacts
    };
  };

  const estimatedValues = proposal ? calculateEstimatedValues(proposal) : null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Nova função para gerar PDF profissional
  const handleGeneratePDF = async () => {
    try {
      toast.info("Gerando PDF profissional...");
      // >>> envie o ID da proposta
      const result: any = await generateProPDF(proposal.id);

      // Log para telemetria mínima
      console.debug('[PDF][generateProPDF result]', {
        ok: result?.ok,
        keys: Object.keys(result || {}),
        contentType: result?.contentType,
        size: result?.blob ? result.blob.size : (result?.arrayBuffer?.byteLength || (result?.pdfBase64?.length || 0)),
        kind: result?.kind,
        status: result?.status,
      });

      // Normalizamos o contrato aceitando múltiplos formatos:
      if (result?.ok) {
        const payload = {
          url: result.pdf_url || result.url,
          blob: result.blob,
          pdfBase64: result.pdfBase64 || result.base64,
          arrayBuffer: result.arrayBuffer,
          filename: `proposta-${proposal.id}.pdf`,
        };

        // Se a Edge sinalizar explicitamente que é básico, avise; mas não use heurística de nome.
        if (result.kind === 'basic') {
          toast.success("PDF básico gerado (função PRO não respondeu).");
        } else {
          toast.success("PDF profissional gerado com sucesso!");
        }

        openPDFFromAny(payload);
        return;
      }

      // Se não ok, mostre motivo detalhado
      const reason = result?.reason || result?.error || 'UNKNOWN';
      toast.error(`Falha ao gerar PDF: ${reason}`);
    } catch (err: any) {
      console.error('[PDF][handleGeneratePDF]', err);
      toast.error(`Erro ao gerar PDF: ${err?.message || 'desconhecido'}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
        {/* Hero Header com Gradiente */}
        <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => navigate('/propostas')}
                  className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-1">
                    {proposal.agencia_projetos?.nome_projeto || proposal.customer_name || `Proposta #${proposal.id}`}
                  </h1>
                  <p className="text-orange-100 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Criada em {formatDate(proposal.created_at)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <ProposalStatusBadge status={proposal.status} />
                <Button 
                  variant="secondary"
                  onClick={() => navigate(`/nova-proposta?edit=${proposal.id}`)}
                  className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
                <Button 
                  onClick={handleGeneratePDF}
                  className="gap-2 bg-white text-orange-600 hover:bg-orange-50"
                >
                  <Download className="h-4 w-4" />
                  PDF Profissional
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Container principal */}
        <div className="px-6 py-8 space-y-8">
          {/* Cards de métricas principais */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Valor Total</p>
                    <p className="text-3xl font-bold">{formatCurrency(estimatedValues?.netValue)}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Telas Selecionadas</p>
                    <p className="text-3xl font-bold">{proposal.proposal_screens?.length || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Monitor className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Cidades</p>
                    <p className="text-3xl font-bold">
                      {proposal.proposal_screens ? 
                        new Set(proposal.proposal_screens.map(ps => ps.screens.city)).size : 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <MapPin className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Estados</p>
                    <p className="text-3xl font-bold">
                      {proposal.proposal_screens ? 
                        new Set(proposal.proposal_screens.map(ps => ps.screens.state)).size : 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Building className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Grid principal de conteúdo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Informações do Cliente - Card expandido */}
            <Card className="lg:col-span-2 border-0 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  Informações do Projeto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Nome do Projeto</label>
                    <p className="text-2xl font-bold text-slate-900">
                      {proposal.agencia_projetos?.nome_projeto || proposal.customer_name || 'Projeto não definido'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Cliente Final</label>
                    <p className="text-lg font-medium text-slate-700">
                      {proposal.agencia_projetos?.cliente_final || proposal.customer_name}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Agência</label>
                    <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <Building className="h-5 w-5 text-orange-600" />
                      <p className="text-lg font-medium text-slate-700">
                        {proposal.agencias?.nome_agencia || 'Agência não definida'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Email da Agência</label>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Mail className="h-5 w-5 text-slate-500" />
                      <p className="text-lg font-medium text-slate-700">
                        {proposal.agencias?.email_empresa || proposal.customer_email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Tipo de Proposta</label>
                    <Badge className="text-sm py-1 px-3 bg-orange-100 text-orange-800 border border-orange-200">
                      {proposal.proposal_type === 'avulsa' ? 'Campanha Avulsa' : 'Projeto Especial'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Status Atual</label>
                    <ProposalStatusBadge status={proposal.status} />
                  </div>
                </div>
                
                {proposal.notes && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Observações</label>
                    <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                      <p className="text-slate-700 leading-relaxed">{proposal.notes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumo Financeiro - Card destacado */}
            <Card className="border-0 shadow-xl bg-gradient-to-b from-orange-50 to-white">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  Resumo Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center p-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl text-white">
                  <p className="text-orange-100 text-sm font-medium mb-1">Investimento Total</p>
                  <p className="text-4xl font-black">{formatCurrency(estimatedValues?.netValue)}</p>
                </div>
                
                {/* Detalhes do tipo de veiculação */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900 text-lg border-b border-orange-200 pb-2">
                    Detalhes da Veiculação
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-sm font-medium text-orange-700">Tempo do Filme</p>
                      <p className="text-lg font-bold text-orange-900">{proposal.film_seconds || 0}"</p>
                    </div>
                    
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-sm font-medium text-orange-700">Inserções/Hora</p>
                      <p className="text-lg font-bold text-orange-900">{proposal.insertions_per_hour || 0}</p>
                    </div>
                    
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-sm font-medium text-orange-700">Audiência/Mês</p>
                      <p className="text-lg font-bold text-orange-900">
                        {estimatedValues ? Math.round(estimatedValues.impacts / (estimatedValues.days / 30)) : 0}
                      </p>
                    </div>
                    
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-sm font-medium text-orange-700">Impactos</p>
                      <p className="text-lg font-bold text-orange-900">
                        {estimatedValues ? Math.round(estimatedValues.impacts).toLocaleString('pt-BR') : 0}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-600 font-medium">Valor Bruto</span>
                    <span className="text-xl font-bold text-slate-900">{formatCurrency(estimatedValues?.grossValue)}</span>
                  </div>
                  
                  {proposal.discount_pct && proposal.discount_pct > 0 && (
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <span className="text-yellow-700 font-medium">Desconto ({proposal.discount_pct}%)</span>
                      <span className="text-xl font-bold text-yellow-800">
                        -{formatCurrency((estimatedValues?.grossValue || 0) * (proposal.discount_pct / 100))}
                      </span>
                    </div>
                  )}
                  
                  {proposal.discount_fixed && proposal.discount_fixed > 0 && (
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <span className="text-yellow-700 font-medium">Desconto Fixo</span>
                      <span className="text-xl font-bold text-yellow-800">
                        -{formatCurrency(proposal.discount_fixed)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="text-orange-700 font-medium">Valor Líquido</span>
                    <span className="text-xl font-bold text-orange-800">{formatCurrency(estimatedValues?.netValue)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="text-orange-700 font-medium">Investimento/Tela</span>
                    <span className="text-xl font-bold text-orange-800">
                      {formatCurrency(estimatedValues?.netValue / (proposal.proposal_screens?.length || 1))}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="text-orange-700 font-medium">CPM/Impacto</span>
                    <span className="text-xl font-bold text-orange-800">
                      {formatCurrency((estimatedValues?.netValue || 0) / ((estimatedValues?.impacts || 1) / 1000))}
                    </span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-orange-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-600">Período de Execução</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {formatDate(proposal.start_date)} - {formatDate(proposal.end_date)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-600">Duração Estimada</p>
                      <p className="text-lg font-semibold text-slate-900">{estimatedValues?.days || 0} dias</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ações de Status - Card moderno */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <Target className="h-5 w-5 text-white" />
                </div>
                Gerenciar Status da Proposta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {[
                  { status: 'rascunho', label: 'Rascunho', color: 'bg-orange-500 hover:bg-orange-600' },
                  { status: 'enviada', label: 'Enviada', color: 'bg-orange-500 hover:bg-orange-600' },
                  { status: 'em_analise', label: 'Em Análise', color: 'bg-orange-500 hover:bg-orange-600' },
                  { status: 'aceita', label: 'Aceita', color: 'bg-orange-500 hover:bg-orange-600' },
                  { status: 'rejeitada', label: 'Rejeitada', color: 'bg-orange-500 hover:bg-orange-600' }
                ].map(({ status, label, color }) => (
                  <Button
                    key={status}
                    variant={proposal.status === status ? 'default' : 'outline'}
                    onClick={() => handleStatusChange(status as ProposalStatus)}
                    className={`
                      px-6 py-2 font-semibold transition-all duration-200 
                      ${proposal.status === status 
                        ? `${color} text-white shadow-lg transform scale-105` 
                        : 'hover:scale-105 border-orange-200 text-orange-600 hover:bg-orange-50'
                      }
                    `}
                  >
                    {proposal.status === status && <Zap className="h-4 w-4 mr-2" />}
                    {label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detalhes das Telas - Card expansivo */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <Monitor className="h-5 w-5 text-white" />
                </div>
                Inventário Selecionado
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Grid de estatísticas das telas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Monitor className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-orange-600">{proposal.proposal_screens?.length || 0}</div>
                  <div className="text-sm font-semibold text-orange-700">Total de Telas</div>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MapPin className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-orange-600">
                    {proposal.proposal_screens ? 
                      new Set(proposal.proposal_screens.map(ps => ps.screens.city)).size : 0}
                  </div>
                  <div className="text-sm font-semibold text-orange-700">Cidades</div>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Building className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-orange-600">
                    {proposal.proposal_screens ? 
                      new Set(proposal.proposal_screens.map(ps => ps.screens.state)).size : 0}
                  </div>
                  <div className="text-sm font-semibold text-orange-700">Estados</div>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-orange-600">
                    {formatCurrency(estimatedValues?.grossValue / (estimatedValues?.days || 1) / (proposal.proposal_screens?.length || 1) || 0)}
                  </div>
                  <div className="text-sm font-semibold text-orange-700">Valor Médio/Tela/Dia</div>
                </div>
              </div>

              {/* Resumo por cidade/estado */}
              {proposal.proposal_screens && proposal.proposal_screens.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-orange-600" />
                    Resumo por Cidade/Estado
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from(new Set(proposal.proposal_screens.map(ps => `${ps.screens.city}/${ps.screens.state}`)))
                      .map(cityState => {
                        const [city, state] = cityState.split('/');
                        const screensInCity = proposal.proposal_screens?.filter(ps => 
                          ps.screens.city === city && ps.screens.state === state
                        ).length || 0;
                        
                        return (
                          <div key={cityState} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-900">{city}</span>
                              <span className="text-orange-600 font-bold">{screensInCity} Telas</span>
                            </div>
                            <div className="text-sm text-slate-600">{state}</div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Indicação de que há mais detalhes no PDF */}
              <div className="text-center p-6 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                <Eye className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-orange-900 mb-2">Detalhes Completos no PDF</h3>
                <p className="text-orange-700 mb-4">
                  Visualize o inventário detalhado, tabelas financeiras e informações técnicas no documento profissional.
                </p>
                <Button onClick={handleGeneratePDF} className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                  <Download className="h-4 w-4" />
                  Gerar PDF Completo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProposalDetails;