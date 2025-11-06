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
  cpm_mode: 'manual' | 'blended';
  cpm_value: number;
  discount_pct: number;
  discount_fixed: number;
  created_by: string;
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

  const payload: NormalizedProposalPayload = {
    customer_name: data.customer_name,
    customer_email: data.customer_email,
    proposal_type: normalizeProposalType(data.proposal_type as any),
    start_date: normalizeDate(data.start_date),
    end_date: normalizeDate(data.end_date),
    impact_formula: data.impact_formula,
    status: 'rascunho',
    filters: {},
    quote: {},
    insertions_per_hour: isNaN(insertionsPerHour) ? 0 : insertionsPerHour,
    film_seconds: normalizeFilmSeconds(data),
    cpm_mode: data.cpm_mode || 'manual',
    cpm_value: isNaN(cpmValue) ? 0 : cpmValue,
    discount_pct: isNaN(discountPct) ? 0 : discountPct,
    discount_fixed: isNaN(discountFixed) ? 0 : discountFixed,
    created_by: userId,
  };

  // Logs de diagnóstico úteis durante a migração/normalização
  if (Array.isArray(data.proposal_type)) {
    console.warn('[normalizeProposalPayload] proposal_type veio como array, normalizado para string:', data.proposal_type);
  }
  if (Array.isArray(data.film_seconds)) {
    console.warn('[normalizeProposalPayload] film_seconds veio como array, usando primeiro valor:', data.film_seconds);
  }

  return payload;
}

