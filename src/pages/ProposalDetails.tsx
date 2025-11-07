// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { downloadVisibleProposalPDF } from "@/lib/pdf-service";
import { InventoryPreview, FinancialSummaryCard, ProjectInfoCard, StatusActionsCard, InventoryCard } from "@/components/proposal";
import { useProposalFilters } from "@/hooks/useProposalFilters";
import { normalizeProposal } from "@/utils/validations/proposal";
import { calculateProposalMetrics, getSelectedDurations } from "@/lib/pricing";

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
      display_name?: string;
      screen_type?: string;
      formatted_address?: string;
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
  // Filtros e opções de visualização (client-side) extraídos para hook reutilizável
  const {
    viewMode,
    setViewMode,
    filterCity,
    setFilterCity,
    filterState,
    setFilterState,
    filterClass,
    setFilterClass,
    searchQuery,
    setSearchQuery,
    showAddress,
    setShowAddress,
    showScreenId,
    setShowScreenId,
    showScreenType,
    setShowScreenType,
    filteredScreens,
    groupedByCityState,
  } = useProposalFilters(proposal?.proposal_screens || []);

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
              display_name,
              category,
              google_formatted_address,
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

      // Normalização com Zod para reduzir duplicação de mapeamentos

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
        agencia_projetos: projectData,
      };
      // Normalização segura — em caso de falha, retorna fallback sem quebrar a UI
      const normalized = normalizeProposal(proposalWithProject);
      setProposal(normalized as any);
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

  // filteredScreens e groupedByCityState já são calculados via hook useProposalFilters

  const computeCalendarDays = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return Math.max(Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1, 0);
  };

  const pricingSummary = useMemo(() => {
    if (!proposal) return null;

    try {
      const quote = proposal.quote && typeof proposal.quote === 'object' ? proposal.quote : {};
      const toPositiveNumber = (value: any) => {
        const num = Number(value);
        return Number.isFinite(num) && num > 0 ? num : undefined;
      };
      const toNumber = (value: any) => {
        const num = Number(value);
        return Number.isFinite(num) ? num : undefined;
      };
      const toPriceRecord = (table: Record<string, any> | undefined) => {
        if (!table || typeof table !== 'object') return {} as Record<number, number>;
        return Object.entries(table).reduce((acc, [key, value]) => {
          const sec = toPositiveNumber(key);
          const price = toNumber(value);
          if (sec && typeof price === 'number') {
            acc[sec] = price;
          }
          return acc;
        }, {} as Record<number, number>);
      };
      const toDiscountRecord = (table: Record<string, any> | undefined) => {
        if (!table || typeof table !== 'object') return {} as Record<number, { pct?: number; fixed?: number }>;
        return Object.entries(table).reduce((acc, [key, value]) => {
          const sec = toPositiveNumber(key);
          if (!sec) return acc;
          const pct = toNumber(value?.pct);
          const fixed = toNumber(value?.fixed);
          acc[sec] = {
            ...(typeof pct === 'number' ? { pct } : {}),
            ...(typeof fixed === 'number' ? { fixed } : {}),
          };
          return acc;
        }, {} as Record<number, { pct?: number; fixed?: number }>);
      };

      const variantDurations = Array.isArray(quote.selected_durations) ? quote.selected_durations : [];
      const quoteDurations = Array.isArray(quote.film_seconds) ? quote.film_seconds : [];
      const priceDurations = Object.keys({
        ...(quote.insertion_prices?.avulsa ?? {}),
        ...(quote.insertion_prices?.especial ?? {}),
      }).map((key) => toPositiveNumber(key)).filter(Boolean) as number[];

      const baseDurations: number[] = [
        ...quoteDurations,
        ...variantDurations,
        ...priceDurations,
      ]
        .map((value) => toPositiveNumber(value))
        .filter(Boolean) as number[];

      const normalizedFilmSeconds = toPositiveNumber(proposal.film_seconds);
      if (normalizedFilmSeconds) {
        baseDurations.push(normalizedFilmSeconds);
      }

      const customFilmSeconds = toPositiveNumber(quote.custom_film_seconds ?? quote.customFilmSeconds);
      const durations = getSelectedDurations(baseDurations as number[], customFilmSeconds);

      const pricingInput = {
        screens_count: proposal.proposal_screens?.length ?? quote.qtd_telas ?? quote.valor_insercao_config?.qtd_telas ?? 0,
        film_seconds: durations,
        custom_film_seconds: customFilmSeconds,
        insertions_per_hour: toNumber(proposal.insertions_per_hour ?? quote.insertions_per_hour) ?? 0,
        hours_per_day: toNumber(quote.horas_operacao_dia ?? proposal.horas_operacao_dia) ?? 10,
        business_days_per_month: toNumber(quote.dias_uteis_mes_base ?? proposal.dias_uteis_mes_base) ?? 22,
        period_unit: quote.period_unit ?? proposal.period_unit ?? 'months',
        months_period: toNumber(quote.months_period ?? proposal.months_period),
        days_period: toNumber(quote.days_period ?? proposal.days_period),
        avg_audience_per_insertion: toNumber(quote.avg_audience_per_insertion ?? quote.audience_per_insertion ?? proposal.avg_audience_per_insertion),
        pricing_mode: quote.pricing_mode ?? proposal.pricing_mode ?? (proposal.cpm_mode === 'valor_insercao' ? 'insertion' : 'cpm'),
        pricing_variant: quote.pricing_variant ?? proposal.pricing_variant ?? 'avulsa',
        insertion_prices: {
          avulsa: toPriceRecord(quote.insertion_prices?.avulsa),
          especial: toPriceRecord(quote.insertion_prices?.especial),
        },
        discounts_per_insertion: {
          avulsa: toDiscountRecord(quote.discounts_per_insertion?.avulsa),
          especial: toDiscountRecord(quote.discounts_per_insertion?.especial),
        },
        cpm_value: toNumber(proposal.cpm_value ?? quote.cpm_value),
        discount_pct: toNumber(proposal.discount_pct ?? quote.discount_pct),
        discount_fixed: toNumber(proposal.discount_fixed ?? quote.discount_fixed),
      };

      const metrics = calculateProposalMetrics(pricingInput);

      return {
        metrics,
        pricingInput,
        durations,
        quote,
      };
    } catch (error) {
      console.error('[ProposalDetails] Falha ao calcular métricas de precificação', error);
      return null;
    }
  }, [proposal]);

  const pricingMetrics = pricingSummary?.metrics;
  const pricingInput = pricingSummary?.pricingInput;
  const durationsForDisplay = pricingSummary?.durations;
  const netValueCalculated = pricingMetrics?.netValue ?? proposal?.net_calendar ?? proposal?.net_value ?? 0;
  const grossValueCalculated = pricingMetrics?.grossValue ?? proposal?.gross_calendar ?? proposal?.gross_value ?? 0;
  const calendarDays = computeCalendarDays(proposal?.start_date, proposal?.end_date);
  const inferredDays = (() => {
    if (calendarDays && calendarDays > 0) return calendarDays;
    if (!pricingMetrics) return null;

    if (pricingMetrics.periodUnit === 'months') {
      const months = pricingMetrics.monthsPeriod ?? 0;
      const businessDays = pricingInput?.business_days_per_month ?? 22;
      return months > 0 ? months * businessDays : null;
    }

    if (pricingMetrics.periodUnit === 'days') {
      return pricingMetrics.daysPeriod ?? null;
    }

    return null;
  })();

  const audiencePerMonth = pricingMetrics?.impacts && inferredDays
    ? Math.round((pricingMetrics.impacts / Math.max(inferredDays, 1)) * 30)
    : undefined;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Nova função para gerar PDF profissional
  const handleGeneratePDF = async () => {
    try {
      // DEBUG CRÍTICO: Verificar se os dados estão disponíveis
      console.log('🔍 [DEBUG] handleGeneratePDF chamado:', {
        proposalId: proposal?.id,
        hasProposal: !!proposal,
        loading,
        proposalData: proposal ? {
          id: proposal.id,
          customer_name: proposal.customer_name,
          screens_count: proposal.proposal_screens?.length || 0
        } : null
      });

      if (!proposal) {
        throw new Error('Dados da proposta não carregados');
      }

      if (loading) {
        throw new Error('Ainda carregando dados da proposta');
      }

      toast.info("Gerando PDF profissional...");
      // >>> usar nova função de captura do DOM vivo
      await downloadVisibleProposalPDF(`proposta-${proposal.id}.pdf`);

      // PDF gerado com sucesso
      console.log('✅ PDF gerado com sucesso!');

      // PDF gerado com sucesso
      toast.success("PDF profissional gerado com sucesso!");
    } catch (err: any) {
      console.error('[PDF][handleGeneratePDF]', err);
      toast.error(`Erro ao gerar PDF: ${err?.message || 'desconhecido'}`);
    }
  };

  return (
    <DashboardLayout>
      <div id="proposal-print-area" className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
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
                  className="hide-on-pdf gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
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
                <ProposalStatusBadge status={proposal.status} className="hide-on-pdf" />
                <Button 
                  variant="secondary"
                  onClick={() => navigate(`/nova-proposta?edit=${proposal.id}`)}
                  className="hide-on-pdf gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
                <Button 
                  onClick={handleGeneratePDF}
                  disabled={loading || !proposal}
                  className="pdf-download-button gap-2 bg-white text-orange-600 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4" />
                  {loading ? 'Carregando...' : 'PDF Profissional'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Container principal */}
        <div className="px-6 py-8 space-y-8">
        {/* Cards de métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pdf-kpis-grid pdf-section-kpis">
          <Card className="kpi-card border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Valor Total</p>
                  <p className="text-3xl font-bold">{formatCurrency(netValueCalculated)}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="kpi-card border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pdf-two-column pdf-gap-6">
            {/* Informações do Projeto - Componentizado */}
            <div className="avoid-break-inside lg:col-span-2 pdf-project-info pdf-section-project">
              <ProjectInfoCard
                proposal={{
                  project_name: proposal.agencia_projetos?.nome_projeto || proposal.customer_name || 'Projeto não definido',
                  client_name: proposal.agencia_projetos?.cliente_final || proposal.customer_name,
                  agency: {
                    name: proposal.agencias?.nome_agencia,
                    email: proposal.agencias?.email_empresa || proposal.customer_email,
                  },
                  proposal_type: proposal.proposal_type === 'avulsa' ? 'Campanha Avulsa' : 'Projeto Especial',
                  status: proposal.status,
                }}
                filteredScreens={filteredScreens}
                showAddress={showAddress}
                showScreenType={showScreenType}
              />
            </div>

            {/* Resumo Financeiro - Componentizado */}
            <div className="avoid-break-inside pdf-financial pdf-section-financial">
              <FinancialSummaryCard
                investmentTotal={netValueCalculated || 0}
                filmSeconds={durationsForDisplay && durationsForDisplay.length > 0 ? durationsForDisplay : proposal.film_seconds}
                insertionsPerHour={proposal.insertions_per_hour}
                totalInsertions={pricingMetrics?.totalInsertions}
                audiencePerMonth={audiencePerMonth}
                avgAudiencePerInsertion={pricingInput?.avg_audience_per_insertion}
                impacts={pricingMetrics?.impacts}
                grossValue={grossValueCalculated}
                netValue={netValueCalculated}
                startDate={formatDate(proposal.start_date)}
                endDate={formatDate(proposal.end_date)}
                formatCurrency={formatCurrency}
                quote={pricingSummary?.quote ?? proposal.quote}
                missingPriceFor={pricingMetrics?.missingPriceFor}
              />
            </div>
          </div>

        {/* Forçar quebra de página antes das ações e inventário no PDF para evitar acúmulo visual */}
        <div className="page-break-before" aria-hidden="true" />

          {/* Ações de Status - Componentizado */}
          <Card className="avoid-break-inside border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl pdf-compact-title">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <Target className="h-5 w-5 text-white" />
                </div>
                Gerenciar Status da Proposta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StatusActionsCard
                currentStatus={proposal.status}
                availableStatuses={["rascunho","enviada","em_analise","aceita","rejeitada"]}
                onChange={(next) => handleStatusChange(next as ProposalStatus)}
              />
            </CardContent>
          </Card>

          {/* Detalhes das Telas - Componentizado */}
          <Card className="avoid-break-inside border-0 shadow-xl pdf-section-inventory">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl pdf-compact-title">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <Monitor className="h-5 w-5 text-white" />
                </div>
                Inventário Selecionado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InventoryCard
                filteredScreens={filteredScreens}
                groupedByCityState={groupedByCityState}
                viewMode={viewMode}
                setViewMode={setViewMode}
                showAddress={showAddress}
                setShowAddress={setShowAddress}
                showScreenId={showScreenId}
                setShowScreenId={setShowScreenId}
                showScreenType={showScreenType}
                setShowScreenType={setShowScreenType}
                filterCity={filterCity}
                setFilterCity={setFilterCity}
                filterState={filterState}
                setFilterState={setFilterState}
                filterClass={filterClass}
                setFilterClass={setFilterClass}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                formatCurrency={formatCurrency}
              />

              {/* Indicação de que há mais detalhes no PDF */}
              <div className="text-center p-6 mt-6 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                <Eye className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-orange-900 mb-2">Detalhes Completos no PDF</h3>
                <p className="text-orange-700 mb-4">
                  Visualize o inventário detalhado, tabelas financeiras e informações técnicas no documento profissional.
                </p>
                <Button 
                  onClick={handleGeneratePDF} 
                  disabled={loading || !proposal}
                  className="pdf-download-button gap-2 bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4" />
                  {loading ? 'Carregando...' : 'Gerar PDF Completo'}
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
