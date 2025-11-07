import { AlertCircle } from "lucide-react";

interface FinancialSummaryCardProps {
  investmentTotal: number;
  filmSeconds?: number | number[] | null;
  insertionsPerHour?: number | null;
  totalInsertions?: number | null;
  audiencePerMonth?: number | null; // opcional, se houver
  avgAudiencePerInsertion?: number | null;
  impacts?: number | null; // calculado
  grossValue?: number | null;
  netValue?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  formatCurrency: (value?: number | null) => string;
  // Informações adicionais da proposta para exibir modo de precificação e tabela por inserção
  quote?: {
    pricing_mode?: 'cpm' | 'insertion';
    pricing_variant?: 'avulsa' | 'especial';
    period_unit?: 'months' | 'days';
    months_period?: number;
    days_period?: number;
    insertion_prices?: {
      avulsa?: Record<number, number>;
      especial?: Record<number, number>;
    };
    discounts_per_insertion?: {
      avulsa?: Record<number, { pct?: number; fixed?: number }>;
      especial?: Record<number, { pct?: number; fixed?: number }>;
    };
  };
  missingPriceFor?: number[];
}

export function FinancialSummaryCard({
  investmentTotal,
  filmSeconds,
  insertionsPerHour,
  totalInsertions,
  audiencePerMonth,
  avgAudiencePerInsertion,
  impacts,
  grossValue,
  netValue,
  startDate,
  endDate,
  formatCurrency,
  quote,
  missingPriceFor,
}: FinancialSummaryCardProps) {
  const pricingMode = quote?.pricing_mode === 'insertion' ? 'Por Inserção' : 'CPM';
  const variantLabel = quote?.pricing_variant === 'especial' ? 'Projeto Especial' : quote?.pricing_variant === 'avulsa' ? 'Campanha Avulsa' : undefined;
  const selectedVariant = quote?.pricing_variant || 'avulsa';

  const pricesByVariant = quote?.insertion_prices?.[selectedVariant] || {};
  const discountsByVariant = quote?.discounts_per_insertion?.[selectedVariant] || {};
  const secondsList = Object.keys(pricesByVariant)
    .map((s) => parseInt(s, 10))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);

  const formatNumber = (value?: number | null) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '-';
    return value.toLocaleString('pt-BR');
  };

  const filmSecondsLabel = Array.isArray(filmSeconds)
    ? filmSeconds.filter((sec) => typeof sec === 'number' && !Number.isNaN(sec)).map((sec) => `${sec}s`).join(' • ')
    : typeof filmSeconds === 'number' && !Number.isNaN(filmSeconds) && filmSeconds > 0
      ? `${filmSeconds}s`
      : '-';

  return (
    <div className="rounded-xl border border-orange-200 bg-white overflow-hidden pdf-tight-card">
      <div className="bg-orange-600 text-white p-4">
        <div className="text-sm pdf-compact-title">Investimento Total</div>
        <div className="text-2xl font-bold">{formatCurrency(investmentTotal)}</div>
      </div>
      <div className="p-4 space-y-4 pdf-dense-text">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-orange-100 p-3">
            <div className="text-xs text-slate-600">Durações do Filme</div>
            <div className="text-slate-900 font-semibold">{filmSecondsLabel}</div>
          </div>
          <div className="rounded-lg border border-orange-100 p-3">
            <div className="text-xs text-slate-600">Inserções/Hora</div>
            <div className="text-slate-900 font-semibold">{insertionsPerHour ?? '-'}</div>
          </div>
          <div className="rounded-lg border border-orange-100 p-3">
            <div className="text-xs text-slate-600">Inserções Totais</div>
            <div className="text-slate-900 font-semibold">{formatNumber(totalInsertions)}</div>
          </div>
          <div className="rounded-lg border border-orange-100 p-3">
            <div className="text-xs text-slate-600">Audiência/Mês</div>
            <div className="text-slate-900 font-semibold">{formatNumber(audiencePerMonth)}</div>
          </div>
          <div className="rounded-lg border border-orange-100 p-3">
            <div className="text-xs text-slate-600">Audiência por Inserção</div>
            <div className="text-slate-900 font-semibold">{formatNumber(avgAudiencePerInsertion)}</div>
          </div>
          <div className="rounded-lg border border-orange-100 p-3">
            <div className="text-xs text-slate-600">Impactos Estimados</div>
            <div className="text-slate-900 font-semibold">{formatNumber(impacts)}</div>
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-700">Valor Bruto</span>
            <span className="font-semibold">{formatCurrency(grossValue)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-700">Valor Líquido</span>
            <span className="font-semibold">{formatCurrency(netValue)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-700">CPM/Impacto</span>
            <span className="font-semibold">{impacts && netValue ? formatCurrency(netValue / Math.max(impacts, 1)) : '-'}</span>
          </div>
        </div>

        {/* Modo de Precificação e Tabela por Inserção (quando aplicável) */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-700">Modo de Precificação</span>
            <span className="font-semibold" data-testid="pricing-mode-value">{pricingMode}</span>
          </div>
          {variantLabel && (
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Variante</span>
              <span className="font-semibold">{variantLabel}</span>
            </div>
          )}

          {quote?.pricing_mode === 'insertion' && secondsList.length > 0 && (
            <div className="mt-3" data-testid="insertion-pricing-table">
              <div className="text-xs text-slate-600 mb-2">Tabela de Preços por Inserção ({variantLabel || selectedVariant})</div>
              <div className="space-y-2">
                {secondsList.map((sec) => {
                  const base = pricesByVariant[sec];
                  const d = discountsByVariant[sec] || {};
                  const pct = d.pct || 0;
                  const fixed = d.fixed || 0;
                  const final = Math.max(base - (base * pct / 100) - fixed, 0);
                  return (
                    <div key={sec} className="grid grid-cols-4 gap-2 text-sm items-center" data-testid={`insertion-row-${sec}`}>
                      <div className="text-slate-700">{sec}s</div>
                      <div className="text-slate-900 font-semibold" data-testid="price-base">{formatCurrency(base)}</div>
                      <div className="text-slate-700" data-testid="price-discount">
                        {pct ? `${pct}%` : '-'}{fixed ? ` / ${formatCurrency(fixed)}` : ''}
                      </div>
                      <div className="text-slate-900 font-semibold" data-testid="price-final">{formatCurrency(final)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {missingPriceFor && missingPriceFor.length > 0 && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-200 rounded-lg p-3 text-red-700 mt-4">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">
              Faltam preços configurados para: {missingPriceFor.map((sec) => `${sec}"`).join(', ')}.
              Atualize a tabela de preços para liberar o cálculo completo.
            </p>
          </div>
        )}

        <div className="border-t pt-4">
          <div className="text-xs text-slate-600">Período de Execução</div>
          <div className="text-slate-900 font-semibold">
            {startDate || '-'}{endDate ? ` - ${endDate}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
