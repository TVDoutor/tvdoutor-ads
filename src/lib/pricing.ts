/**
 * Módulo de domínio para cálculos de precificação e impactos da proposta.
 *
 * Objetivo: centralizar a lógica em funções pequenas e testáveis.
 */

export type PeriodUnit = 'months' | 'days';
export type PricingMode = 'cpm' | 'insertion';
export type PricingVariant = 'avulsa' | 'especial' | 'ambos';

export interface InsertionPriceTable {
  avulsa: Record<number, number>;
  especial: Record<number, number>;
}

export interface InsertionDiscountTable {
  avulsa: Record<number, { pct?: number; fixed?: number }>;
  especial: Record<number, { pct?: number; fixed?: number }>;
}

export interface PricingInput {
  // contexto de campanha
  screens_count: number;
  film_seconds: number[];
  custom_film_seconds?: number;
  insertions_per_hour: number;
  hours_per_day?: number;
  business_days_per_month?: number;
  period_unit?: PeriodUnit;
  months_period?: number; // relevante quando period_unit = 'months'
  days_period?: number; // relevante quando period_unit = 'days'

  // audiência base
  avg_audience_per_insertion?: number; // legado/manual
  audience_monthly_total?: number; // soma da audiência mensal das telas selecionadas

  // modo por inserção
  pricing_mode?: PricingMode; // default: 'cpm'
  pricing_variant?: PricingVariant; // default: 'avulsa'
  insertion_prices: InsertionPriceTable;
  discounts_per_insertion?: InsertionDiscountTable;

  // modo CPM
  cpm_value?: number; // default: 25
  discount_pct?: number; // aplicado no CPM
  discount_fixed?: number; // aplicado no CPM
}

export interface PricingMetrics {
  screens: number;
  totalInsertions: number;
  audiencePerPeriod: number;
  impacts: number;
  grossValue: number;
  netValue: number;
  pricingMode: PricingMode;
  pricingVariant: PricingVariant;
  periodUnit: PeriodUnit;
  monthsPeriod?: number;
  daysPeriod?: number | null;
  missingPriceFor: number[]; // segundos sem preço quando modo = insertion
}

/** Retorna a lista de durações (segundos) selecionadas, incluindo custom se existir. */
export function getSelectedDurations(seconds: number[], custom?: number): number[] {
  const base = Array.isArray(seconds) ? seconds.filter((s) => typeof s === 'number' && s > 0) : [];
  const list = custom && custom > 0 ? [...base, custom] : base;
  return Array.from(new Set(list)).sort((a, b) => a - b);
}

/**
 * Calcula o total de inserções de acordo com a unidade do período.
 * Regra:
 * - period_unit = 'days': insertions_per_hour * hours_per_day * days_period * screens_count
 * - period_unit = 'months': insertions_per_hour * hours_per_day * business_days_per_month * months_period * screens_count
 * - fallback: insertions_per_hour * (hours_per_day || 10) * defaultDays(30) * screens_count
 */
export function computeTotalInsertions(input: PricingInput): number {
  const screens = input.screens_count || 0;
  const hoursPerDay = input.hours_per_day ?? 10;
  const businessDaysPerMonth = input.business_days_per_month ?? 22;
  const periodUnit = input.period_unit ?? 'months';
  const monthsPeriod = input.months_period ?? 1;
  const daysPeriod = input.days_period;

  if (periodUnit === 'days' && typeof daysPeriod === 'number' && daysPeriod > 0) {
    return input.insertions_per_hour * hoursPerDay * daysPeriod * screens;
  }

  if (periodUnit === 'months' && typeof monthsPeriod === 'number' && monthsPeriod > 0) {
    return input.insertions_per_hour * hoursPerDay * businessDaysPerMonth * monthsPeriod * screens;
  }

  // fallback
  const defaultDays = 30;
  return input.insertions_per_hour * hoursPerDay * defaultDays * screens;
}

/**
 * Determina a audiência de referência do período para cálculo de impactos.
 * - months: usa audiência mensal total das telas
 * - days: distribui a audiência mensal pelos dias úteis base
 * - fallback legado: média manual por inserção * inserções do período
 */
export function computeAudiencePerPeriod(input: PricingInput, totalInsertions: number): number {
  const monthlyAudience = typeof input.audience_monthly_total === 'number' && input.audience_monthly_total > 0
    ? input.audience_monthly_total
    : 0;

  if (monthlyAudience > 0) {
    if ((input.period_unit ?? 'months') === 'days') {
      const businessDaysPerMonth = input.business_days_per_month ?? 22;
      return Math.round(monthlyAudience / Math.max(businessDaysPerMonth, 1));
    }
    return monthlyAudience;
  }

  const avg = typeof input.avg_audience_per_insertion === 'number' && input.avg_audience_per_insertion > 0
    ? input.avg_audience_per_insertion
    : 100;
  return totalInsertions * avg;
}

/**
 * Impactos estimados:
 * - regra atual: audiência do período × inserções/hora
 * - fallback legado: totalInsertions × audiência média por inserção
 */
export function computeImpacts(input: PricingInput, totalInsertions: number): number {
  const monthlyAudience = typeof input.audience_monthly_total === 'number' && input.audience_monthly_total > 0
    ? input.audience_monthly_total
    : 0;

  if (monthlyAudience > 0) {
    const audiencePerPeriod = computeAudiencePerPeriod(input, totalInsertions);
    return audiencePerPeriod * (input.insertions_per_hour || 0);
  }

  const avg = typeof input.avg_audience_per_insertion === 'number' && input.avg_audience_per_insertion > 0
    ? input.avg_audience_per_insertion
    : 100;
  return totalInsertions * avg;
}

/** Calcula o valor bruto e líquido no modo por inserção. */
export function computeInsertionModeValue(
  input: PricingInput,
  totalInsertions: number,
): { gross: number; net: number; missingPriceFor: number[] } {
  const variant = input.pricing_variant ?? 'avulsa';
  const durations = getSelectedDurations(input.film_seconds, input.custom_film_seconds);

  const computeForVariant = (v: Exclude<PricingVariant, 'ambos'>) => {
    let gross = 0;
    const missing: number[] = [];
    durations.forEach((sec) => {
      const priceTable = input.insertion_prices?.[v] || {};
      const price = priceTable?.[sec];
      if (price === undefined || price === null || isNaN(price) || price <= 0) {
        missing.push(sec);
        return;
      }
      const dCfg = input.discounts_per_insertion?.[v]?.[sec] || {};
      const pct = typeof dCfg.pct === 'number' ? dCfg.pct : 0;
      const fixed = typeof dCfg.fixed === 'number' ? dCfg.fixed : 0;
      const effectiveUnitPrice = pct > 0 ? (price * (1 - pct / 100)) : Math.max(0, price - fixed);
      gross += effectiveUnitPrice * totalInsertions;
    });
    return { gross, missing };
  };

  if (variant === 'ambos') {
    const av = computeForVariant('avulsa');
    const es = computeForVariant('especial');
    const grossSum = av.gross + es.gross;
    const missingUnion = Array.from(new Set([...av.missing, ...es.missing])).sort((a, b) => a - b);
    return { gross: grossSum, net: grossSum, missingPriceFor: missingUnion };
  }

  const single = computeForVariant(variant);
  return { gross: single.gross, net: single.gross, missingPriceFor: single.missing };
}

/** Calcula o valor bruto e líquido no modo CPM. */
export function computeCPMModeValue(
  impacts: number,
  cpm_value?: number,
  discount_pct?: number,
  discount_fixed?: number,
): { gross: number; net: number } {
  const cpm = typeof cpm_value === 'number' && cpm_value > 0 ? cpm_value : 25;
  const gross = (impacts / 1000) * cpm;
  const pct = typeof discount_pct === 'number' && discount_pct > 0 ? discount_pct : 0;
  const fixed = typeof discount_fixed === 'number' && discount_fixed > 0 ? discount_fixed : 0;
  const net = gross - (gross * pct / 100) - fixed;
  return { gross, net: Math.max(0, net) };
}

/** Função principal: calcula métricas completas da proposta. */
export function calculateProposalMetrics(input: PricingInput): PricingMetrics {
  const screens = input.screens_count || 0;
  const periodUnit = input.period_unit ?? 'months';
  const monthsPeriod = input.months_period ?? 1;
  const daysPeriod = input.days_period ?? null;
  const pricingMode = input.pricing_mode ?? 'cpm';
  const pricingVariant = input.pricing_variant ?? 'avulsa';

  const totalInsertions = computeTotalInsertions(input);
  const audiencePerPeriod = computeAudiencePerPeriod(input, totalInsertions);
  const impacts = computeImpacts(input, totalInsertions);

  if (pricingMode === 'insertion') {
    const { gross, net, missingPriceFor } = computeInsertionModeValue(input, totalInsertions);
    return {
      screens,
      totalInsertions,
      audiencePerPeriod,
      impacts,
      grossValue: gross,
      netValue: net,
      pricingMode,
      pricingVariant,
      periodUnit,
      monthsPeriod,
      daysPeriod,
      missingPriceFor,
    };
  }

  const { gross, net } = computeCPMModeValue(impacts, input.cpm_value, input.discount_pct, input.discount_fixed);
  return {
    screens,
    totalInsertions,
    audiencePerPeriod,
    impacts,
    grossValue: gross,
    netValue: net,
    pricingMode,
    pricingVariant,
    periodUnit,
    monthsPeriod,
    daysPeriod,
    missingPriceFor: [],
  };
}

