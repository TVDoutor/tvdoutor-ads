import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export interface InvestmentBreakdownRow {
  durationLabel: string;
  periodValue: number;
  insertionsPerHour: number;
  insertionsPerUnit: number;
  audiencePerUnit?: number | null;
  impactsPerUnit?: number | null;
  screens: number;
  investBruto: number;
  investAgBruto: number;
  discountPct: number;
  investPerScreen: number;
  cpmPerImpact: number;
  investNegotiated: number;
  totalNegotiated: number;
}

interface InvestmentBreakdownCardProps {
  title: string;
  subtitle?: string;
  periodColumnLabel: string;
  unitLabel: string;
  rows: InvestmentBreakdownRow[];
  formatCurrency: (value?: number | null) => string;
  formatNumber: (value?: number | null) => string;
}

export const InvestmentBreakdownCard = ({
  title,
  subtitle,
  periodColumnLabel,
  unitLabel,
  rows,
  formatCurrency,
  formatNumber,
}: InvestmentBreakdownCardProps) => {
  const unitLower = unitLabel.toLowerCase();
  const insertionsLabel = `Inserções/${unitLower}`;
  const audienceLabel = `Audiência/${unitLower}`;
  const impactsLabel = `Impactos/${unitLower}`;
  const investBrutoLabel = `Invest Bruto/${unitLower}`;
  const investAgLabel = `Invest Ag. Bruto/${unitLower}`;
  const investPerScreenLabel = `Invest/tela/${unitLower}`;
  const cpmLabel = `CPM/Impacto/${unitLower}`;
  const investNegotiatedLabel = `Invest. Negociado ${unitLabel === 'Dia' ? 'Diário' : 'Mensal'}`;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma configuração disponível para este tipo de veiculação.
          </p>
        ) : (
          <table className="min-w-[800px] w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground text-xs uppercase tracking-wide">
                <th className="py-2 pr-4">Filme</th>
                <th className="py-2 pr-4">{periodColumnLabel}</th>
                <th className="py-2 pr-4">Inserções/hora</th>
                <th className="py-2 pr-4">{insertionsLabel}</th>
                <th className="py-2 pr-4">{audienceLabel}</th>
                <th className="py-2 pr-4">{impactsLabel}</th>
                <th className="py-2 pr-4">Qtd. Telas</th>
                <th className="py-2 pr-4">{investBrutoLabel}</th>
                <th className="py-2 pr-4">{investAgLabel}</th>
                <th className="py-2 pr-4">Desc (%)</th>
                <th className="py-2 pr-4">{investPerScreenLabel}</th>
                <th className="py-2 pr-4">{cpmLabel}</th>
                <th className="py-2 pr-4">{investNegotiatedLabel}</th>
                <th className="py-2 pr-4">Total Negociado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${title}-${row.durationLabel}`} className="border-t border-border/50">
                  <td className="py-2 pr-4 font-semibold">{row.durationLabel}</td>
                  <td className="py-2 pr-4">{formatNumber(row.periodValue)}</td>
                  <td className="py-2 pr-4">{formatNumber(row.insertionsPerHour)}</td>
                  <td className="py-2 pr-4">{formatNumber(row.insertionsPerUnit)}</td>
                  <td className="py-2 pr-4">{formatNumber(row.audiencePerUnit)}</td>
                  <td className="py-2 pr-4">{formatNumber(row.impactsPerUnit)}</td>
                  <td className="py-2 pr-4">{formatNumber(row.screens)}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{formatCurrency(row.investBruto)}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{formatCurrency(row.investAgBruto)}</td>
                  <td className="py-2 pr-4">{`${(row.discountPct * 100).toFixed(2)}%`}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{formatCurrency(row.investPerScreen)}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{formatCurrency(row.cpmPerImpact)}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{formatCurrency(row.investNegotiated)}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{formatCurrency(row.totalNegotiated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
};

