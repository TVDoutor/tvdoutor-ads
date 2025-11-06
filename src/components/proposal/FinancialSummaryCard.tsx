interface FinancialSummaryCardProps {
  investmentTotal: number;
  filmSeconds?: number | null;
  insertionsPerHour?: number | null;
  audiencePerMonth?: number | null; // opcional, se houver
  impacts?: number | null; // calculado
  grossValue?: number | null;
  netValue?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  formatCurrency: (value?: number | null) => string;
}

export function FinancialSummaryCard({
  investmentTotal,
  filmSeconds,
  insertionsPerHour,
  audiencePerMonth,
  impacts,
  grossValue,
  netValue,
  startDate,
  endDate,
  formatCurrency,
}: FinancialSummaryCardProps) {
  return (
    <div className="rounded-xl border border-orange-200 bg-white overflow-hidden pdf-tight-card">
      <div className="bg-orange-600 text-white p-4">
        <div className="text-sm pdf-compact-title">Investimento Total</div>
        <div className="text-2xl font-bold">{formatCurrency(investmentTotal)}</div>
      </div>
      <div className="p-4 space-y-4 pdf-dense-text">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-orange-100 p-3">
            <div className="text-xs text-slate-600">Tempo do Filme</div>
            <div className="text-slate-900 font-semibold">{filmSeconds ? `${filmSeconds}s` : '-'}</div>
          </div>
          <div className="rounded-lg border border-orange-100 p-3">
            <div className="text-xs text-slate-600">Inserções/Hora</div>
            <div className="text-slate-900 font-semibold">{insertionsPerHour ?? '-'}</div>
          </div>
          <div className="rounded-lg border border-orange-100 p-3">
            <div className="text-xs text-slate-600">Audiência/Mês</div>
            <div className="text-slate-900 font-semibold">{audiencePerMonth ?? '-'}</div>
          </div>
          <div className="rounded-lg border border-orange-100 p-3">
            <div className="text-xs text-slate-600">Impactos</div>
            <div className="text-slate-900 font-semibold">{impacts ?? '-'}</div>
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
