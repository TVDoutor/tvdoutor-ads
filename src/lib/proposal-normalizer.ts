// Helper para normalizar o payload de proposta antes do insert no Supabase
// Mantém compatibilidade com diferentes fluxos de wizard e previne violações de constraints

import { type ProposalData } from '@/components/NewProposalWizardImproved';

type ProposalType = 'avulsa' | 'projeto';

export interface NormalizedProposalPayload {
  customer_name: string;
  customer_email: string;
  proposal_type: ProposalType;
  start_date?: string;
  end_date?: string;
  impact_formula: string;
  status: 'rascunho' | 'enviada' | 'em_analise' | 'aceita' | 'rejeitada';
  filters: Record<string, unknown>;
  quote: Record<string, unknown>;
  insertions_per_hour: number;
  film_seconds: number;
  cpm_mode: 'manual' | 'blended' | 'valor_insercao';
  cpm_value: number;
  discount_pct: number;
  discount_fixed: number;
  horas_operacao_dia: number | null;
  dias_uteis_mes_base: number | null;
  created_by: string;
  projeto_id?: string | null;
  agencia_id?: string | null;
}

function normalizeDate(input?: string): string | undefined {
  if (!input) return undefined;
  // Aceita strings no formato YYYY-MM-DD ou datas parseáveis pelo Date
  const d = new Date(input);
  if (isNaN(d.getTime())) return undefined;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeProposalType(value: ProposalData['proposal_type'] | ProposalType | undefined): ProposalType {
  if (!value) return 'avulsa';
  if (Array.isArray(value)) {
    const first = value[0];
    return first === 'projeto' ? 'projeto' : 'avulsa';
  }
  return value === 'projeto' ? 'projeto' : 'avulsa';
}

function normalizeFilmSeconds(data: ProposalData): number {
  // Prioriza custom_film_seconds se informado; senão, primeiro elemento do array film_seconds
  if (typeof data.custom_film_seconds === 'number' && data.custom_film_seconds > 0) {
    return Math.floor(data.custom_film_seconds);
  }
  if (Array.isArray(data.film_seconds) && data.film_seconds.length > 0) {
    const n = parseInt(String(data.film_seconds[0]), 10);
    return isNaN(n) ? 0 : n;
  }
  const n = parseInt(String((data as any).film_seconds), 10);
  return isNaN(n) ? 0 : n;
}

export function normalizeProposalPayload(data: ProposalData, userId: string): NormalizedProposalPayload {
  const insertionsPerHour = parseInt(String(data.insertions_per_hour), 10);
  const cpmValue = data.cpm_value !== undefined && data.cpm_value !== null
    ? parseFloat(String(data.cpm_value))
    : 0;
  const discountPct = parseFloat(String(data.discount_pct));
  const discountFixed = parseFloat(String(data.discount_fixed));
  const horasOperacaoDia = data.horas_operacao_dia ?? 10;
  const diasUteisMesBase = data.dias_uteis_mes_base ?? 22;
  const pricingMode = data.cpm_mode === 'valor_insercao' ? 'insertion' : (data.pricing_mode ?? 'cpm');

  const payload: NormalizedProposalPayload = {
    customer_name: data.customer_name,
    customer_email: data.customer_email,
    proposal_type: normalizeProposalType(data.proposal_type as any),
    start_date: normalizeDate(data.start_date),
    end_date: normalizeDate(data.end_date),
    impact_formula: data.impact_formula,
    status: 'rascunho',
    filters: {},
    quote: {
      pricing_mode: pricingMode,
      pricing_variant: data.pricing_variant ?? 'avulsa',
      insertion_prices: data.insertion_prices ?? {},
      discounts_per_insertion: data.discounts_per_insertion ?? {},
      period_unit: data.period_unit ?? 'months',
      months_period: data.months_period ?? 1,
      days_period: data.days_period ?? null,
      horas_operacao_dia: horasOperacaoDia,
      dias_uteis_mes_base: diasUteisMesBase,
      avg_audience_per_insertion: data.avg_audience_per_insertion ?? null,
      valor_insercao_config: data.valor_insercao_config ?? null,
    },
    insertions_per_hour: isNaN(insertionsPerHour) ? 0 : insertionsPerHour,
    film_seconds: normalizeFilmSeconds(data),
    cpm_mode: data.cpm_mode || 'manual',
    cpm_value: isNaN(cpmValue) ? 0 : cpmValue,
    discount_pct: isNaN(discountPct) ? 0 : discountPct,
    discount_fixed: isNaN(discountFixed) ? 0 : discountFixed,
    horas_operacao_dia: typeof horasOperacaoDia === 'number' ? horasOperacaoDia : null,
    dias_uteis_mes_base: typeof diasUteisMesBase === 'number' ? diasUteisMesBase : null,
    created_by: userId,
    projeto_id: data.projeto_id || null,
    agencia_id: data.agencia_id || null,
  };

  // Logs de diagnóstico úteis durante a migração/normalização
  if (Array.isArray(data.proposal_type)) {
    console.warn('[normalizeProposalPayload] proposal_type veio como array, normalizado para string:', data.proposal_type);
  }
  if (Array.isArray(data.film_seconds)) {
    console.warn('[normalizeProposalPayload] film_seconds veio como array, usando primeiro valor:', data.film_seconds);
  }
  
  // Log importante: verificar se projeto_id está sendo incluído
  if (data.projeto_id) {
    console.log('✅ [normalizeProposalPayload] projeto_id incluído no payload:', data.projeto_id);
  } else {
    console.warn('⚠️ [normalizeProposalPayload] ATENÇÃO: projeto_id está vazio ou null');
  }
  
  if (data.agencia_id) {
    console.log('✅ [normalizeProposalPayload] agencia_id incluído no payload:', data.agencia_id);
  }

  return payload;
}
