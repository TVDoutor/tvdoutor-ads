/**
 * Carrega uma proposta do banco e mapeia para o formato ProposalData do wizard.
 * Usado para editar rascunhos e continuar de onde parou.
 */
import { supabase } from '@/integrations/supabase/client';
import type { ProposalData } from '@/components/NewProposalWizardImproved';

const DEFAULT_PROJECT_DATA: ProposalData = {
  selectedCategories: [],
  categorySpecialties: {},
  screenSelectionOrigins: {},
  proposal_type: [],
  customer_name: '',
  customer_email: '',
  selectedScreens: [],
  film_seconds: [15],
  insertions_per_hour: 6,
  cpm_mode: 'manual',
  cpm_value: 25,
  impact_formula: 'A',
  discount_pct: 0,
  discount_fixed: 0,
  avg_audience_per_insertion: 100,
  horas_operacao_dia: 10,
  dias_uteis_mes_base: 22,
  months_period: 8,
  days_period: undefined,
  pricing_mode: 'cpm',
  pricing_variant: 'avulsa',
  period_unit: 'months',
  insertion_prices: {
    avulsa: { 15: 0.39, 30: 0.55, 45: 0.71 },
    especial: { 15: 0.62, 30: 0.76, 45: 0.88 },
  },
  discounts_per_insertion: {
    avulsa: {},
    especial: {},
  },
  discount_pct_avulsa: 0,
  discount_pct_especial: 0,
  fator_quadros: 6,
  audience_base_monthly: 0,
  valor_insercao_config: {
    tipo_servico_proposta: 'Avulsa',
    audiencia_mes_base: 0,
    qtd_telas: 0,
    desconto_percentual: 0,
    valor_manual_insercao_avulsa: 0,
    valor_manual_insercao_especial: 0,
    insercoes_hora_linha: null,
  },
};

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toNumOrUndef(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toPriceRecord(table: Record<string, unknown> | undefined): Record<number, number> {
  if (!table || typeof table !== 'object') return {};
  return Object.entries(table).reduce((acc, [k, v]) => {
    const sec = parseInt(String(k), 10);
    const price = toNum(v);
    if (sec > 0 && price >= 0) acc[sec] = price;
    return acc;
  }, {} as Record<number, number>);
}

function toDiscountRecord(table: Record<string, any> | undefined): Record<number, { pct?: number; fixed?: number }> {
  if (!table || typeof table !== 'object') return {};
  return Object.entries(table).reduce((acc, [k, v]) => {
    const sec = parseInt(String(k), 10);
    if (sec <= 0) return acc;
    const pct = toNumOrUndef(v?.pct);
    const fixed = toNumOrUndef(v?.fixed);
    acc[sec] = { ...(pct !== undefined ? { pct } : {}), ...(fixed !== undefined ? { fixed } : {}) };
    return acc;
  }, {} as Record<number, { pct?: number; fixed?: number }>);
}

export async function loadProposalForEdit(proposalId: number): Promise<{ data: ProposalData; proposal: any } | null> {
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select(`
      *,
      proposal_screens (
        screen_id
      )
    `)
    .eq('id', proposalId)
    .single();

  if (error || !proposal) return null;

  const quote = (proposal.quote && typeof proposal.quote === 'object' ? proposal.quote : {}) as Record<string, any>;
  const filters = (proposal.filters && typeof proposal.filters === 'object' ? proposal.filters : {}) as Record<string, unknown>;

  const proposalType = proposal.proposal_type === 'projeto' ? ['projeto'] : ['avulsa'];
  const filmSecondsVal = toNum(proposal.film_seconds);
  const filmSeconds = filmSecondsVal > 0 ? [filmSecondsVal] : [15];

  const selectedScreens: number[] = Array.isArray(proposal.proposal_screens)
    ? proposal.proposal_screens.map((ps: { screen_id: number }) => ps.screen_id).filter(Boolean)
    : [];

  const insertionPrices = quote?.insertion_prices;
  const discountsPerInsertion = quote?.discounts_per_insertion;
  const selectionMetadata = (quote?.selection_metadata && typeof quote.selection_metadata === 'object'
    ? quote.selection_metadata
    : {}) as Record<string, any>;

  const data: ProposalData = {
    ...DEFAULT_PROJECT_DATA,
    proposal_type: proposalType as ('avulsa' | 'projeto' | 'patrocinio_editorial')[],
    customer_name: proposal.customer_name || '',
    customer_email: proposal.customer_email || '',
    selectedScreens,
    selectedCategories: Array.isArray(selectionMetadata.selected_category_ids)
      ? selectionMetadata.selected_category_ids.filter((value: unknown): value is string => typeof value === 'string')
      : [],
    categorySpecialties: selectionMetadata.category_specialties && typeof selectionMetadata.category_specialties === 'object'
      ? Object.fromEntries(
          Object.entries(selectionMetadata.category_specialties).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.filter((item: unknown): item is string => typeof item === 'string') : [],
          ])
        )
      : {},
    screenSelectionOrigins: selectionMetadata.screen_origins && typeof selectionMetadata.screen_origins === 'object'
      ? selectionMetadata.screen_origins as Record<string, ProposalData['screenSelectionOrigins'][string]>
      : {},
    film_seconds: filmSeconds,
    insertions_per_hour: toNum(proposal.insertions_per_hour) || 6,
    cpm_mode: (proposal.cpm_mode || quote?.pricing_mode === 'insertion' ? 'valor_insercao' : 'manual') as 'manual' | 'blended' | 'valor_insercao',
    cpm_value: toNum(proposal.cpm_value ?? quote?.cpm_value) || 25,
    impact_formula: proposal.impact_formula || 'A',
    discount_pct: toNum(proposal.discount_pct ?? quote?.discount_pct) || 0,
    discount_fixed: toNum(proposal.discount_fixed ?? quote?.discount_fixed) || 0,
    avg_audience_per_insertion: toNum(quote?.avg_audience_per_insertion ?? quote?.audience_per_insertion) || 100,
    start_date: proposal.start_date || undefined,
    end_date: proposal.end_date || undefined,
    projeto_id: proposal.projeto_id || null,
    agencia_id: proposal.agencia_id || null,
    horas_operacao_dia: toNum(quote?.horas_operacao_dia ?? proposal.horas_operacao_dia) || 10,
    dias_uteis_mes_base: toNum(quote?.dias_uteis_mes_base ?? proposal.dias_uteis_mes_base) || 22,
    months_period: toNumOrUndef(quote?.months_period ?? proposal.months_period) ?? 8,
    days_period: toNumOrUndef(quote?.days_period ?? proposal.days_period),
    period_unit: (quote?.period_unit ?? proposal.period_unit) || 'months',
    pricing_mode: (quote?.pricing_mode ?? proposal.pricing_mode) || 'cpm',
    pricing_variant: (quote?.pricing_variant ?? proposal.pricing_variant) || 'avulsa',
    insertion_prices: {
      avulsa: toPriceRecord(insertionPrices?.avulsa) || DEFAULT_PROJECT_DATA.insertion_prices.avulsa,
      especial: toPriceRecord(insertionPrices?.especial) || DEFAULT_PROJECT_DATA.insertion_prices.especial,
    },
    discounts_per_insertion: {
      avulsa: toDiscountRecord(discountsPerInsertion?.avulsa) || {},
      especial: toDiscountRecord(discountsPerInsertion?.especial) || {},
    },
    discount_pct_avulsa: toNum(quote?.discount_pct_avulsa) || 0,
    discount_pct_especial: toNum(quote?.discount_pct_especial) || 0,
    valor_insercao_config: quote?.valor_insercao_config || DEFAULT_PROJECT_DATA.valor_insercao_config,
  };

  const initialStep = Math.min(6, Math.max(1, toNum(quote?.last_completed_step) || 1));

  return { data, proposal, initialStep };
}
