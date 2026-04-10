// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Download,
  Building,
  Target,
  Clock,
  TrendingUp,
  FileText,
  Share2,
} from "lucide-react";
import { FileSpreadsheet } from "lucide-react";
import ExcelJS from "exceljs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadVisibleProposalPDF } from "@/lib/pdf-service";
import { useProposalFilters } from "@/hooks/useProposalFilters";
import { normalizeProposal } from "@/utils/validations/proposal";
import { calculateProposalMetrics, getSelectedDurations } from "@/lib/pricing";
import { ProposalScreensMap } from "@/components/wizard/ProposalScreensMap";
import { parseLatLng, getScreenPointCode } from "@/lib/geo";
import { getCapitalInterior, getExportEspaco } from "@/lib/proposal-export-fields";

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
  public_map_token?: string | null;
  public_map_token_created_at?: string | null;
  agencia_projetos?: {
    id: string;
    nome_projeto: string;
    descricao?: string;
    cliente_final?: string;
    orcamento_projeto?: number;
    responsavel_nome?: string;
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
      google_formatted_address?: string;
      city: string;
      state: string;
      class: string;
      cep?: string;
      venue_id?: number;
      ambiente?: string;
      restricoes?: string;
      programatica?: boolean;
      venue_type_parent?: string;
      staging_tipo_venue?: string;
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
  const [copyingMapLink, setCopyingMapLink] = useState(false);

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

      // Obter durações configuradas
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

      // Montar input para calculateProposalMetrics
      const pricingInput = {
        screens_count: proposal.proposal_screens?.length ?? quote.qtd_telas ?? 0,
        film_seconds: durations,
        custom_film_seconds: customFilmSeconds,
        insertions_per_hour: toNumber(proposal.insertions_per_hour ?? quote.insertions_per_hour) ?? 6,
        hours_per_day: toNumber(quote.horas_operacao_dia ?? proposal.horas_operacao_dia) ?? 10,
        business_days_per_month: toNumber(quote.dias_uteis_mes_base ?? proposal.dias_uteis_mes_base) ?? 22,
        period_unit: quote.period_unit ?? proposal.period_unit ?? 'months',
        months_period: toNumber(quote.months_period ?? proposal.months_period) ?? 1,
        days_period: toNumber(quote.days_period ?? proposal.days_period),
        avg_audience_per_insertion: toNumber(quote.avg_audience_per_insertion ?? quote.audience_per_insertion ?? proposal.avg_audience_per_insertion) ?? 100,
        pricing_mode: quote.pricing_mode ?? proposal.pricing_mode ?? 'insertion',
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

      // Calcular métricas usando a função existente
      const metrics = calculateProposalMetrics(pricingInput);
      
      return {
        filmSeconds: durations[0] || 30,
        insertionsPerHour: pricingInput.insertions_per_hour,
        screensCount: pricingInput.screens_count,
        insertionsPerMonth: metrics.totalInsertions / (pricingInput.months_period || 1),
        totalInsertions: metrics.totalInsertions,
        impacts: metrics.impacts,
        grossValue: metrics.grossValue,
        netValue: metrics.netValue,
        monthsPeriod: pricingInput.months_period || 1,
        hoursPerDay: pricingInput.hours_per_day,
        businessDaysPerMonth: pricingInput.business_days_per_month,
        metrics,
        pricingInput,
        durations,
        quote,
      };
    } catch (error) {
      console.error('Erro ao calcular métricas:', error);
      return null;
    }
  }, [proposal]);

  const proposalMapScreenPoints = useMemo(() => {
    if (!proposal?.proposal_screens?.length) return [];
    return proposal.proposal_screens
      .map((ps: any) => ps.screens)
      .filter(Boolean)
      .map((s: any) => ({
        id: Number(s.id),
        code: getScreenPointCode(s) || s.code,
        display_name: s.display_name,
        name: s.name,
        lat: parseLatLng(s.lat),
        lng: parseLatLng(s.lng),
      }));
  }, [proposal]);

  const proposalScreenIdsForMap = useMemo(
    () => (proposal?.proposal_screens || []).map((ps: any) => Number(ps.screen_id)),
    [proposal]
  );

  const fetchProposal = async (proposalId: number) => {
    try {
      setLoading(true);
      const proposalSelectV2 = `
        *,
        projeto_id,
        agencia_id,
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
            code,
            name,
            display_name,
            category,
            google_formatted_address,
            address_raw,
            city,
            state,
            lat,
            lng,
            class,
            cep,
            venue_id,
            ambiente,
            restricoes,
            programatica,
            venue_type_parent,
            venue_type_child,
            venue_type_grandchildren,
            audiencia_pacientes,
            audiencia_local,
            audiencia_hcp,
            audiencia_medica,
            aceita_convenio,
            venues (
              id,
              name
            )
          )
        )
      `;

      const proposalSelectFallback = `
        *,
        projeto_id,
        agencia_id,
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
            code,
            name,
            display_name,
            category,
            google_formatted_address,
            address_raw,
            city,
            state,
            lat,
            lng,
            class,
            cep,
            venue_id,
            ambiente,
            venue_type_parent,
            venue_type_child,
            venue_type_grandchildren,
            audiencia_pacientes,
            audiencia_local,
            audiencia_hcp,
            audiencia_medica,
            aceita_convenio,
            venues (
              id,
              name
            )
          )
        )
      `;

      let data: any = null;
      let error: any = null;

      const firstTry = await supabase
        .from('proposals')
        .select(proposalSelectV2)
        .eq('id', proposalId)
        .single();

      data = firstTry.data;
      error = firstTry.error;

      // Compatibilidade com ambientes sem as colunas novas em screens.
      if (error && error.code === 'PGRST204') {
        const retry = await supabase
          .from('proposals')
          .select(proposalSelectFallback)
          .eq('id', proposalId)
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;
      if (!data) throw new Error('Proposta não encontrada');

      // DEBUG: Log para verificar projeto_id
      console.log('🔍 [ProposalDetails] Dados completos da proposta:', data);
      console.log('🔍 [ProposalDetails] projeto_id:', data.projeto_id);
      console.log('🔍 [ProposalDetails] agencia_id:', data.agencia_id);
      console.log('🔍 [ProposalDetails] Tipo de projeto_id:', typeof data.projeto_id);
      
      let projectData = null;
      if (data.projeto_id) {
        console.log('🔍 [ProposalDetails] Buscando projeto com ID:', data.projeto_id);
        console.log('🔍 [ProposalDetails] Tipo do projeto_id:', typeof data.projeto_id);
        
        // Tentar buscar o projeto
        const { data: project, error: projectError } = await supabase
          .from('agencia_projetos')
          .select(`
            id, 
            nome_projeto, 
            descricao, 
            cliente_final,
            orcamento_projeto,
            responsavel_projeto
          `)
          .eq('id', data.projeto_id)
          .single();
        
        if (projectError) {
          console.error('❌ [ProposalDetails] Erro ao buscar projeto:', projectError);
          console.error('❌ [ProposalDetails] Detalhes do erro:', {
            message: projectError.message,
            code: projectError.code,
            details: projectError.details,
            hint: projectError.hint
          });
        }
        
        if (!projectError && project) {
          console.log('✅ [ProposalDetails] Projeto encontrado:', project);
          
          // Buscar o nome do responsável separadamente se houver responsavel_projeto
          let responsavelNome = null;
          if (project.responsavel_projeto) {
            const { data: responsavel, error: responsavelError } = await supabase
              .from('pessoas_projeto')
              .select('nome')
              .eq('id', project.responsavel_projeto)
              .single();
            
            if (!responsavelError && responsavel) {
              responsavelNome = responsavel.nome;
              console.log('✅ [ProposalDetails] Responsável encontrado:', responsavelNome);
            } else if (responsavelError) {
              console.warn('⚠️ [ProposalDetails] Erro ao buscar responsável:', responsavelError);
            }
          }
          
          // Normalizar os dados do projeto para incluir responsavel_nome
          projectData = {
            ...project,
            responsavel_nome: responsavelNome
          };
        } else if (!projectError && !project) {
          console.warn('⚠️ [ProposalDetails] Projeto não encontrado para ID:', data.projeto_id);
        }
      } else {
        console.warn('⚠️ [ProposalDetails] Nenhum projeto_id definido na proposta');
        console.warn('⚠️ [ProposalDetails] Dados da proposta:', {
          id: data.id,
          customer_name: data.customer_name,
          projeto_id: data.projeto_id
        });
      }

      const proposalWithProject = {
        ...data,
        agencia_projetos: projectData,
      };
      
      console.log('📦 [ProposalDetails] Proposta completa:', proposalWithProject);

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

  const handleCopyPublicMapLink = async () => {
    if (!proposal) return;
    try {
      setCopyingMapLink(true);
      let token = proposal.public_map_token ?? null;
      if (!token) {
        token = crypto.randomUUID();
        const { error } = await supabase
          .from('proposals')
          .update({
            public_map_token: token,
            public_map_token_created_at: new Date().toISOString(),
          })
          .eq('id', proposal.id);
        if (error) throw error;
        setProposal((prev) =>
          prev
            ? {
                ...prev,
                public_map_token: token,
                public_map_token_created_at: new Date().toISOString(),
              }
            : null
        );
      }
      const url = `${window.location.origin}/mapa-proposta/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Link do mapa copiado');
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível gerar ou copiar o link');
    } finally {
      setCopyingMapLink(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      if (!proposal) {
        throw new Error('Dados da proposta não carregados');
      }

      toast.info("Gerando PDF...");
      await downloadVisibleProposalPDF(`proposta-${proposal.id}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      toast.error(`Erro ao gerar PDF: ${err?.message || 'desconhecido'}`);
    }
  };

  const handleDownloadExcel = async () => {
    if (!proposal) return;

    try {
      const extractScreenCode = (screen: any): string => {
        const code = String(screen?.code ?? '').trim();
        if (code) return code.toUpperCase();
        const name = String(screen?.name ?? '').trim();
        // Em alguns cadastros antigos, o código pode estar em `name`
        if (/^P\d{4,5}(\.\d+)?$/i.test(name)) return name.toUpperCase();
        return '';
      };

      // Preparar dados das telas
      const rows = (proposal.proposal_screens || []).map((ps) => {
        const screen = ps.screens;
        // Garantir que o código seja uma string válida (com fallback)
        const code = extractScreenCode(screen);
        
        // Log para depuração
        if (!code) {
          console.warn('⚠️ [Excel] Tela sem código:', {
            screen_id: screen?.id,
            name: screen?.name,
            display_name: screen?.display_name,
            screen_data: screen
          });
        }
        
        return {
          id: screen?.id || null,
          code: code || '',
          // "Nome" deve ser o nome de exibição do ponto (Inventário), não o "name" técnico
          // (em muitos cadastros, `name` é só o código)
          name: screen?.display_name ?? screen?.venues?.name ?? screen?.name ?? '',
          capital_interior: getCapitalInterior(screen?.city, screen?.state),
          espaco: getExportEspaco(screen as any),
          class: screen?.class ?? '',
          ambiente: (screen as any)?.ambiente ?? '',
          restricoes: (screen as any)?.restricoes ?? '',
          programatica: (screen as any)?.programatica == null ? '' : ((screen as any)?.programatica ? 'Sim' : 'Não'),
          cep: (screen as any)?.cep ?? '',
          type: (screen as any)?.category ?? (screen as any)?.screen_type ?? '',
          address:
            (screen as any)?.google_formatted_address ??
            (screen as any)?.address_raw ??
            (screen as any)?.formatted_address ??
            '',
          city: screen?.city ?? '',
          state: screen?.state ?? '',
          venue_id: screen?.venue_id ?? null,
          venue_name: screen?.venues?.name ?? '',
        };
      });
      
      console.log('📊 [Excel] Total de linhas preparadas:', rows.length);
      console.log('📊 [Excel] Primeiras 3 linhas:', rows.slice(0, 3));
      console.log('📊 [Excel] Códigos das primeiras 3 linhas:', rows.slice(0, 3).map(r => r.code));

      const wb = new ExcelJS.Workbook();
      
      // Planilha 1: Pontos
      const ws = wb.addWorksheet('Pontos');
      ws.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Código', key: 'code', width: 14 },
        { header: 'Nome', key: 'name', width: 32 },
        { header: 'Capital / interior', key: 'capital_interior', width: 18 },
        { header: 'Espaço', key: 'espaco', width: 20 },
        { header: 'Classe', key: 'class', width: 12 },
        { header: 'Ambiente', key: 'ambiente', width: 16 },
        { header: 'Restrições', key: 'restricoes', width: 24 },
        { header: 'Programática', key: 'programatica', width: 18 },
        { header: 'CEP', key: 'cep', width: 12 },
        { header: 'Tipo', key: 'type', width: 16 },
        { header: 'Endereço', key: 'address', width: 40 },
        { header: 'Cidade', key: 'city', width: 18 },
        { header: 'Estado', key: 'state', width: 10 },
        { header: 'Venue', key: 'venue_id', width: 12 },
        { header: 'Venue Nome', key: 'venue_name', width: 20 },
      ];
      ws.addRows(rows);

      // Planilha 2: Resumo com FÓRMULAS
      const ws2 = wb.addWorksheet('Resumo');
      
      const quote = proposal.quote && typeof proposal.quote === 'object' ? proposal.quote : {};
      
      // Determinar se é período em dias ou meses
      const periodUnit = pricingSummary?.pricingInput?.period_unit || quote.period_unit || 'months';
      const isDaysPeriod = periodUnit === 'days';
      
      // Calcular período correto
      let periodValue = 1;
      if (isDaysPeriod) {
        periodValue = pricingSummary?.pricingInput?.days_period || quote.days_period || 45;
      } else {
        periodValue = pricingSummary?.monthsPeriod || pricingSummary?.pricingInput?.months_period || 1;
      }
      
      const screensCount = pricingSummary?.screensCount || 0;
      const insertionsPerHour = pricingSummary?.insertionsPerHour || 6;
      const hoursPerDay = pricingSummary?.hoursPerDay || 10;
      const businessDaysPerMonth = pricingSummary?.businessDaysPerMonth || 22;
      const filmSeconds = pricingSummary?.filmSeconds || 30;
      const descPct = proposal.discount_pct || 0;
      const avgAudiencePerInsertion = 100;
      
      const priceAvulsa = (quote?.insertion_prices?.avulsa || {}) as Record<number, number>;
      const priceEspecial = (quote?.insertion_prices?.especial || {}) as Record<number, number>;
      
      const durations = [15, 30, 45, 60].filter(sec => priceAvulsa[sec] || priceEspecial[sec]);
      if (durations.length === 0) durations.push(filmSeconds);

      const currencyFmt = '"R$" #,##0.00';
      const percentFmt = '0.00%';
      
      const periodLabel = isDaysPeriod ? 'Dias' : 'Meses';
      const unitLabel = isDaysPeriod ? 'dia' : 'mês';

      // SEÇÃO: Veiculação Avulsa
      const titleAv = ws2.addRow(['Veiculação Avulsa']);
      titleAv.font = { bold: true, size: 14 };
      
      const headerAv = ws2.addRow([
        'Filme', periodLabel, 'Inserções/hora', `Inserções/${unitLabel}`, 
        `Audiência/${unitLabel}`, `Impactos/${unitLabel}`, 'Qtd telas', 
        `Investimento Bruto/${isDaysPeriod ? 'Dia' : 'Mês'}`, `Investimento Ag. Bruto/${isDaysPeriod ? 'Dia' : 'Mês'}`, 
        'Desconto (%)', `Investimento/tela/${unitLabel}`, `CPM/Impacto/${isDaysPeriod ? 'Dia' : 'Mês'}`, 
        `Investimento Negociado ${isDaysPeriod ? 'Diário' : 'Mensal'}`, 'Total Negociado'
      ]);
      headerAv.font = { bold: true };
      headerAv.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

      const avulsaRowIdxs: number[] = [];
      durations.forEach((sec) => {
        const row = ws2.addRow([
          `${sec}"`,
          periodValue,
          insertionsPerHour,
          null, // D = Fórmula
          avgAudiencePerInsertion,
          null, // F = Fórmula
          screensCount,
          null, // H = Fórmula (virá da tabela de preços)
          null, // I = Fórmula
          descPct / 100,
          null, // K = Fórmula
          null, // L = Fórmula
          null, // M = Fórmula
          null, // N = Fórmula
        ]);
        avulsaRowIdxs.push(row.number);
        const r = row.number;
        
        // D: Inserções por período = C * 10 * G (se dias, * 1; se mês, * 22)
        const multiplier = isDaysPeriod ? 1 : 22;
        row.getCell(4).value = { formula: `C${r}*10*G${r}*${multiplier}` };
        
        // F: Impactos por período = E * C
        row.getCell(6).value = { formula: `E${r}*C${r}` };
        
        // H: Investimento Bruto = D * preço (será referenciado depois)
        row.getCell(8).value = null; // Será preenchido depois com referência à tabela
        
        // I: Investimento Ag. Bruto = H
        row.getCell(9).value = { formula: `H${r}` };
        
        // K: Investimento/tela = M / G
        row.getCell(11).value = { formula: `M${r}/G${r}` };
        
        // L: CPM/Impacto = (M / F) * 1000
        row.getCell(12).value = { formula: `(M${r}/F${r})*1000` };
        
        // M: Investimento Negociado = I - (I * J)
        row.getCell(13).value = { formula: `I${r}-(I${r}*J${r})` };
        
        // N: Total Negociado COM DESCONTO = (M * B) - ((M * B) * J)
        // Aplicar desconto no total negociado
        row.getCell(14).value = { formula: `(M${r}*B${r})-((M${r}*B${r})*J${r})` };
        
        // Formatar
        row.getCell(8).numFmt = currencyFmt;
        row.getCell(9).numFmt = currencyFmt;
        row.getCell(10).numFmt = percentFmt;
        row.getCell(11).numFmt = currencyFmt;
        row.getCell(12).numFmt = currencyFmt;
        row.getCell(13).numFmt = currencyFmt;
        row.getCell(14).numFmt = currencyFmt;
      });

      ws2.addRow([]);

      // SEÇÃO: Projeto Especial de Conteúdo
      const titleEsp = ws2.addRow(['Projeto Especial de Conteúdo']);
      titleEsp.font = { bold: true, size: 14 };
      
      const headerEsp = ws2.addRow([
        'Filme', periodLabel, 'Inserções/hora', `Inserções/${unitLabel}`, 
        `Audiência/${unitLabel}`, `Impactos/${unitLabel}`, 'Qtd telas', 
        `Investimento Bruto/${isDaysPeriod ? 'Dia' : 'Mês'}`, `Investimento Ag. Bruto/${isDaysPeriod ? 'Dia' : 'Mês'}`, 
        'Desconto (%)', `Investimento/tela/${unitLabel}`, `CPM/Impacto/${isDaysPeriod ? 'Dia' : 'Mês'}`, 
        `Investimento Negociado ${isDaysPeriod ? 'Diário' : 'Mensal'}`, 'Total Negociado'
      ]);
      headerEsp.font = { bold: true };
      headerEsp.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

      const especialRowIdxs: number[] = [];
      durations.forEach((sec) => {
        const row = ws2.addRow([
          `${sec}"`,
          periodValue,
          insertionsPerHour,
          null,
          avgAudiencePerInsertion,
          null,
          screensCount,
          null,
          null,
          descPct / 100,
          null,
          null,
          null,
          null,
        ]);
        especialRowIdxs.push(row.number);
        const r = row.number;
        
        // Mesmas fórmulas que Avulsa
        const multiplier = isDaysPeriod ? 1 : 22;
        row.getCell(4).value = { formula: `C${r}*10*G${r}*${multiplier}` };
        row.getCell(6).value = { formula: `E${r}*C${r}` };
        row.getCell(8).value = null; // Será preenchido depois
        row.getCell(9).value = { formula: `H${r}` };
        row.getCell(11).value = { formula: `M${r}/G${r}` };
        row.getCell(12).value = { formula: `(M${r}/F${r})*1000` };
        row.getCell(13).value = { formula: `I${r}-(I${r}*J${r})` };
        // N: Total Negociado COM DESCONTO
        row.getCell(14).value = { formula: `(M${r}*B${r})-((M${r}*B${r})*J${r})` };
        
        row.getCell(8).numFmt = currencyFmt;
        row.getCell(9).numFmt = currencyFmt;
        row.getCell(10).numFmt = percentFmt;
        row.getCell(11).numFmt = currencyFmt;
        row.getCell(12).numFmt = currencyFmt;
        row.getCell(13).numFmt = currencyFmt;
        row.getCell(14).numFmt = currencyFmt;
      });

      ws2.addRow([]);

      // SEÇÃO: Tabela de Preços
      const headerTabela = ws2.addRow(['Veiculação', 'Tempo', 'Inserção Avulsa', 'Inserção Esp. Cont.']);
      headerTabela.font = { bold: true };
      headerTabela.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } };
      
      const linhaHorario = ws2.addRow(['2ª a 6ª Feira (5 d.u.)', '08h - 18h - 10h/dia', '', '']);
      const linhaHorarioRow = linhaHorario.number;
      
      const firstPriceRow = linhaHorarioRow + 1;
      durations.forEach((sec) => {
        const row = ws2.addRow(['', `${sec}"`, priceAvulsa[sec] || 0, priceEspecial[sec] || 0]);
        row.getCell(3).numFmt = currencyFmt;
        row.getCell(4).numFmt = currencyFmt;
      });

      // Agora preencher H (Investimento Bruto) com fórmulas referenciando tabela de preços
      avulsaRowIdxs.forEach((r, i) => {
        const priceRow = firstPriceRow + i;
        // H = D * preço da tabela (coluna C da tabela)
        ws2.getCell(r, 8).value = { formula: `D${r}*C${priceRow}` };
      });
      
      especialRowIdxs.forEach((r, i) => {
        const priceRow = firstPriceRow + i;
        // H = D * preço da tabela (coluna D da tabela)
        ws2.getCell(r, 8).value = { formula: `D${r}*D${priceRow}` };
      });

      ws2.addRow([]);
      ws2.addRow(['Observações']).font = { bold: true };
      ws2.addRow(['Os quadros têm duração de 30"']);
      ws2.addRow(['Checking Online']);
      ws2.addRow(['Para Checking Presencial, consultar condições e valores']);
      ws2.addRow(['Tabela vigente mês da veiculação; pontos podem estar indisponíveis no momento da autorização']);
      ws2.addRow(['Em caso de multiplicidade de marcas será cobrado adicional de 30% sobre o valor da proposta']);

      // Exportar
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposta_${proposal.id}_pontos.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      
      toast.success('Planilha gerada com sucesso');
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      toast.error('Erro ao gerar planilha');
    }
  };

  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null || Number.isNaN(Number(value))) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatNumber = (value?: number | null) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '0';
    return Math.round(value).toLocaleString('pt-BR');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    return new Date(dateString).toLocaleDateString('pt-BR');
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

  const cityCount = new Set(proposal.proposal_screens?.map(ps => ps.screens?.city)).size;
  const stateCount = new Set(proposal.proposal_screens?.map(ps => ps.screens?.state)).size;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/propostas')}
                  className="text-white hover:bg-white/20"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  Proposta #{proposal.id}
                </Badge>
                <ProposalStatusBadge status={proposal.status} />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/nova-proposta?edit=${proposal.id}`)}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  onClick={handleGeneratePDF}
                  disabled={loading}
                  className="bg-white text-orange-600 hover:bg-orange-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button
                  onClick={handleDownloadExcel}
                  disabled={loading}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button
                  type="button"
                  onClick={handleCopyPublicMapLink}
                  disabled={loading || copyingMapLink}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {copyingMapLink ? 'Copiando…' : 'Copiar link do mapa'}
                </Button>
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-bold mb-2">
                {proposal.agencia_projetos?.nome_projeto || proposal.customer_name || `Proposta #${proposal.id}`}
              </h1>
              <div className="flex flex-wrap gap-6 text-sm text-white/90">
                {proposal.customer_name && (
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {proposal.customer_name}
                  </span>
                )}
                {proposal.agencias?.nome_agencia && (
                  <span className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {proposal.agencias.nome_agencia}
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Criada em {formatDate(proposal.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 -mt-6 pb-12">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Investimento Total</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(pricingSummary?.netValue || 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Telas Selecionadas</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatNumber(proposal.proposal_screens?.length || 0)}
                    </p>
                    <p className="text-xs text-slate-400">{cityCount} cidades</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Monitor className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Cobertura</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatNumber(stateCount)} estados
                    </p>
                    <p className="text-xs text-slate-400">{cityCount} cidades</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Impactos/Mês</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatNumber(pricingSummary?.impacts || 0)}
                    </p>
                    <p className="text-xs text-slate-400">Estimado</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-auto">
              <TabsTrigger value="overview">Resumo</TabsTrigger>
              <TabsTrigger value="financial">Financeiro</TabsTrigger>
              <TabsTrigger value="map">Mapa de Pontos</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Informações do Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {proposal.customer_name && (
                      <div>
                        <p className="text-sm text-slate-500">Nome</p>
                        <p className="font-medium">{proposal.customer_name}</p>
                      </div>
                    )}

                    {proposal.customer_email && (
                      <div>
                        <p className="text-sm text-slate-500">Email</p>
                        <p className="font-medium">{proposal.customer_email}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-slate-500">Tipo</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                          Veiculação Avulsa
                        </Badge>
                        <Badge variant="secondary" className="bg-orange-600 text-white">
                          Projeto Especial de Conteúdo
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card do Projeto Selecionado - SEMPRE MOSTRAR */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Projeto Selecionado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {proposal.agencia_projetos ? (
                      <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-3 text-sm">
                        <div>
                          <p className="text-slate-600">Nome:</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-right">
                            {proposal.agencia_projetos.nome_projeto}
                          </p>
                        </div>

                        {proposal.agencia_projetos.cliente_final && (
                          <>
                            <div>
                              <p className="text-slate-600">Cliente:</p>
                            </div>
                            <div>
                              <p className="text-slate-900 text-right">{proposal.agencia_projetos.cliente_final}</p>
                            </div>
                          </>
                        )}

                        <div>
                          <p className="text-slate-600">Período:</p>
                        </div>
                        <div>
                          <p className="text-slate-900 text-right">
                            {proposal.start_date && proposal.end_date 
                              ? `${formatDate(proposal.start_date)} - ${formatDate(proposal.end_date)}`
                              : 'Não informado'}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-600">Orçamento:</p>
                        </div>
                        <div>
                          <p className="text-slate-900 text-right">
                            {proposal.agencia_projetos.orcamento_projeto 
                              ? formatCurrency(proposal.agencia_projetos.orcamento_projeto) 
                              : 'R$ 0,00'}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-600">Responsável:</p>
                        </div>
                        <div>
                          <p className="text-slate-900 text-right">
                            {proposal.agencia_projetos.responsavel_nome || 'Não informado'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <Building className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p className="font-medium">Nenhum projeto selecionado</p>
                        <p className="text-sm mt-1">Esta proposta não está vinculada a um projeto</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Período da Campanha - Full Width */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Período da Campanha
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-4">
                    <div>
                      <p className="text-sm text-slate-500">Data de Início</p>
                      <p className="font-medium text-lg">{formatDate(proposal.start_date)}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">Data de Término</p>
                      <p className="font-medium text-lg">{formatDate(proposal.end_date)}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">Criada em</p>
                      <p className="font-medium">{formatDate(proposal.created_at)}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">Última atualização</p>
                      <p className="font-medium">{formatDate(proposal.updated_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Financial Tab */}
            <TabsContent value="financial" className="space-y-6">
              {/* Resumo Geral */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumo Financeiro Geral</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-4">
                    <div>
                      <p className="text-sm text-slate-500">Valor Bruto Total</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {formatCurrency(pricingSummary?.grossValue || 0)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">Valor Líquido Total</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(pricingSummary?.netValue || 0)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">Inserções por Hora</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {pricingSummary?.insertionsPerHour || 0}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">Impactos/Mês</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {formatNumber(pricingSummary?.impacts || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Veiculação Avulsa */}
              {pricingSummary?.durations && pricingSummary.durations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Veiculação Avulsa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2 font-semibold">Filme</th>
                            <th className="text-right py-2 px-2 font-semibold">Dias</th>
                            <th className="text-right py-2 px-2 font-semibold">Inserções/hora</th>
                            <th className="text-right py-2 px-2 font-semibold">Inserções/dia</th>
                            <th className="text-right py-2 px-2 font-semibold">Audiência/dia</th>
                            <th className="text-right py-2 px-2 font-semibold">Impactos/dia</th>
                            <th className="text-right py-2 px-2 font-semibold">Qtd telas</th>
                            <th className="text-right py-2 px-2 font-semibold">Invest. Bruto/Dia</th>
                            <th className="text-right py-2 px-2 font-semibold">Invest. Negociado Diário</th>
                            <th className="text-right py-2 px-2 font-semibold">Total Negociado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pricingSummary.durations.map((duration) => {
                            const priceAvulsa = pricingSummary?.pricingInput?.insertion_prices?.avulsa?.[duration] || 0;
                            const insertionsPerDay = (pricingSummary?.insertionsPerHour || 6) * 10 * (pricingSummary?.screensCount || 0);
                            const audiencePerDay = 168000;
                            const impactsPerDay = 1008000;
                            const investBrutoDay = priceAvulsa * insertionsPerDay;
                            const descPct = proposal.discount_pct || 0;
                            const investNegDay = investBrutoDay * (1 - descPct / 100);
                            
                            // Usar dias ou meses do pricingSummary
                            const periodUnit = pricingSummary?.pricingInput?.period_unit || 'months';
                            const isDays = periodUnit === 'days';
                            const periodValue = isDays 
                              ? (pricingSummary?.pricingInput?.days_period || 45)
                              : (pricingSummary?.monthsPeriod || 1);
                            
                            const totalNegBruto = investNegDay * periodValue;
                            const totalNeg = totalNegBruto * (1 - descPct / 100);
                            
                            return (
                              <tr key={duration} className="border-b hover:bg-slate-50">
                                <td className="py-2 px-2 font-medium">{duration}"</td>
                                <td className="text-right py-2 px-2">{periodValue}</td>
                                <td className="text-right py-2 px-2">{pricingSummary?.insertionsPerHour || 6}</td>
                                <td className="text-right py-2 px-2">{formatNumber(insertionsPerDay)}</td>
                                <td className="text-right py-2 px-2">{formatNumber(audiencePerDay)}</td>
                                <td className="text-right py-2 px-2">{formatNumber(impactsPerDay)}</td>
                                <td className="text-right py-2 px-2">{pricingSummary?.screensCount || 0}</td>
                                <td className="text-right py-2 px-2">{formatCurrency(investBrutoDay)}</td>
                                <td className="text-right py-2 px-2">{formatCurrency(investNegDay)}</td>
                                <td className="text-right py-2 px-2 font-semibold text-green-600">{formatCurrency(totalNeg)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Projeto Especial de Conteúdo */}
              {pricingSummary?.durations && pricingSummary.durations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Projeto Especial de Conteúdo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2 font-semibold">Filme</th>
                            <th className="text-right py-2 px-2 font-semibold">Dias</th>
                            <th className="text-right py-2 px-2 font-semibold">Inserções/hora</th>
                            <th className="text-right py-2 px-2 font-semibold">Inserções/dia</th>
                            <th className="text-right py-2 px-2 font-semibold">Audiência/dia</th>
                            <th className="text-right py-2 px-2 font-semibold">Impactos/dia</th>
                            <th className="text-right py-2 px-2 font-semibold">Qtd telas</th>
                            <th className="text-right py-2 px-2 font-semibold">Invest. Bruto/Dia</th>
                            <th className="text-right py-2 px-2 font-semibold">Invest. Negociado Diário</th>
                            <th className="text-right py-2 px-2 font-semibold">Total Negociado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pricingSummary.durations.map((duration) => {
                            const priceEspecial = pricingSummary?.pricingInput?.insertion_prices?.especial?.[duration] || 0;
                            const insertionsPerDay = (pricingSummary?.insertionsPerHour || 6) * 10 * (pricingSummary?.screensCount || 0);
                            const audiencePerDay = 168000;
                            const impactsPerDay = 1008000;
                            const investBrutoDay = priceEspecial * insertionsPerDay;
                            const descPct = proposal.discount_pct || 0;
                            const investNegDay = investBrutoDay * (1 - descPct / 100);
                            
                            // Usar dias ou meses do pricingSummary
                            const periodUnit = pricingSummary?.pricingInput?.period_unit || 'months';
                            const isDays = periodUnit === 'days';
                            const periodValue = isDays 
                              ? (pricingSummary?.pricingInput?.days_period || 45)
                              : (pricingSummary?.monthsPeriod || 1);
                            
                            const totalNegBruto = investNegDay * periodValue;
                            const totalNeg = totalNegBruto * (1 - descPct / 100);
                            
                            return (
                              <tr key={duration} className="border-b hover:bg-slate-50">
                                <td className="py-2 px-2 font-medium">{duration}"</td>
                                <td className="text-right py-2 px-2">{periodValue}</td>
                                <td className="text-right py-2 px-2">{pricingSummary?.insertionsPerHour || 6}</td>
                                <td className="text-right py-2 px-2">{formatNumber(insertionsPerDay)}</td>
                                <td className="text-right py-2 px-2">{formatNumber(audiencePerDay)}</td>
                                <td className="text-right py-2 px-2">{formatNumber(impactsPerDay)}</td>
                                <td className="text-right py-2 px-2">{pricingSummary?.screensCount || 0}</td>
                                <td className="text-right py-2 px-2">{formatCurrency(investBrutoDay)}</td>
                                <td className="text-right py-2 px-2">{formatCurrency(investNegDay)}</td>
                                <td className="text-right py-2 px-2 font-semibold text-green-600">{formatCurrency(totalNeg)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tabela de Preços */}
              {pricingSummary?.pricingInput?.insertion_prices && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tabela de Preços</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">2ª a 6ª Feira (5 d.u.) - 08h às 18h (10h/dia)</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-yellow-50">
                              <th className="text-left py-2 px-3 font-semibold">Tempo</th>
                              <th className="text-right py-2 px-3 font-semibold">Inserção Avulsa</th>
                              <th className="text-right py-2 px-3 font-semibold">Inserção Esp. Cont.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pricingSummary.durations && pricingSummary.durations.map((duration) => (
                              <tr key={duration} className="border-b">
                                <td className="py-2 px-3 font-medium">{duration}"</td>
                                <td className="text-right py-2 px-3">
                                  {formatCurrency(pricingSummary?.pricingInput?.insertion_prices?.avulsa?.[duration] || 0)}
                                </td>
                                <td className="text-right py-2 px-3">
                                  {formatCurrency(pricingSummary?.pricingInput?.insertion_prices?.especial?.[duration] || 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="map" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Mapa das telas selecionadas</CardTitle>
                  <p className="text-sm text-muted-foreground font-normal">
                    Pontos da proposta no mapa. A lista abaixo mostra todas as telas (mesmo sem coordenadas no cadastro).
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {proposal.proposal_screens?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma tela nesta proposta.</p>
                  ) : (
                    <>
                      <ProposalScreensMap
                        screens={proposalMapScreenPoints}
                        addedToProposalIds={proposalScreenIdsForMap}
                        tempSelectedIds={[]}
                        allSelectedStyle
                        overviewMode={(proposalMapScreenPoints?.length ?? 0) > 15}
                        height={440}
                      />
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-2">
                          Telas e locais ({proposal.proposal_screens.length})
                        </h3>
                        <div className="rounded-lg border max-h-[min(50vh,420px)] overflow-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 sticky top-0">
                              <tr className="border-b">
                                <th className="text-left py-2 px-3 font-medium">Código</th>
                                <th className="text-left py-2 px-3 font-medium">Nome / tela</th>
                                <th className="text-left py-2 px-3 font-medium">Local</th>
                                <th className="text-left py-2 px-3 font-medium">UF</th>
                                <th className="text-left py-2 px-3 font-medium">Latitude / Longitude</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(proposal.proposal_screens || []).filter((ps: any) => ps.screens).map((ps: any) => {
                                const s = ps.screens;
                                const latN = parseLatLng(s.lat);
                                const lngN = parseLatLng(s.lng);
                                const hasCoord =
                                  latN !== undefined && lngN !== undefined;
                                const venueName = s.venues?.name;
                                const label = s.display_name || s.name || "—";
                                const pointCode = getScreenPointCode(s) || s.code || "—";
                                return (
                                  <tr key={ps.id ?? `${ps.screen_id}`} className="border-b border-slate-100">
                                    <td className="py-2 px-3 font-mono text-xs">{pointCode}</td>
                                    <td className="py-2 px-3">{label}</td>
                                    <td className="py-2 px-3 text-slate-700">
                                      {[venueName, s.city].filter(Boolean).join(" · ") || "—"}
                                    </td>
                                    <td className="py-2 px-3">{s.state ?? "—"}</td>
                                    <td className="py-2 px-3 text-xs">
                                      {hasCoord ? (
                                        <span className="text-emerald-800">
                                          {latN?.toFixed(5)}, {lngN?.toFixed(5)}
                                        </span>
                                      ) : (
                                        <span className="text-amber-700">Sem lat/lng válidos</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Status Tab */}
            <TabsContent value="status" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Gerenciar Status da Proposta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-500 mb-2">Status Atual</p>
                      <ProposalStatusBadge status={proposal.status} />
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm text-slate-500 mb-3">Alterar Status</p>
                      <div className="flex flex-wrap gap-2">
                        {["rascunho", "enviada", "em_analise", "aceita", "rejeitada"].map((status) => (
                          <Button
                            key={status}
                            variant={proposal.status === status ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleStatusChange(status as ProposalStatus)}
                            disabled={proposal.status === status}
                          >
                            {status === "rascunho" && "Rascunho"}
                            {status === "enviada" && "Enviada"}
                            {status === "em_analise" && "Em Análise"}
                            {status === "aceita" && "Aceita"}
                            {status === "rejeitada" && "Rejeitada"}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm text-slate-500">Última atualização de status</p>
                      <p className="font-medium">{formatDate(proposal.status_updated_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProposalDetails;
