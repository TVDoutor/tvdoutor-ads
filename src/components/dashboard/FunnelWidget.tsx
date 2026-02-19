import React, { useMemo } from "react";

export type FunnelStep = {
  key: string;
  label: string;
  value: number;
  color: string;
  stroke?: string;
};

export type FunnelWidgetProps = {
  title?: string;
  steps: FunnelStep[];
  className?: string;
};

function fmtPct(x: number) {
  if (!isFinite(x)) return "0.0%";
  const val = Math.round(x * 1000) / 10;
  return `${val.toFixed(1)}%`;
}

/** Círculo de progresso SVG */
function ProgressRing({
  value,
  progress,
  color,
  stroke,
  size = 80,
  strokeWidth = 8,
}: {
  value: number;
  progress: number; // 0 a 1
  color: string;
  stroke?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(1, progress)));
  const accentColor = stroke ?? color;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Círculo de fundo (trilha) */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={accentColor}
          strokeWidth={strokeWidth}
          className="opacity-30"
        />
        {/* Círculo de progresso */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={accentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold text-gray-900 leading-none">
          {value}
        </span>
        <span className="text-xs font-semibold text-gray-700 mt-0.5">
          {fmtPct(progress)}
        </span>
      </div>
    </div>
  );
}

export function FunnelWidget({
  title = "Funil de Conversão",
  steps,
  className = "",
}: FunnelWidgetProps) {
  const computed = useMemo(() => {
    const top = steps?.[0]?.value ?? 0;
    const denom = top > 0 ? top : Math.max(...(steps?.map((s) => s.value) ?? [0]), 1);

    return (steps ?? []).map((s, i) => {
      const prev = steps?.[i - 1];
      const next = steps?.[i + 1];
      const rateToNext = next ? (s.value > 0 ? next.value / s.value : 0) : null;
      const rateToThis = prev && prev.value > 0 ? s.value / prev.value : i === 0 ? 1 : 0;
      return {
        ...s,
        rateToNext,
        rateToThis,
      };
    });
  }, [steps]);

  const hasSteps = computed.length > 0;

  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-500">
          {hasSteps && computed[0]?.value
            ? `Base: ${computed[0].value}`
            : "Sem dados na base"}
        </div>
      </div>

      {!hasSteps ? (
        <div className="flex h-32 items-center justify-center text-gray-500">
          <p className="text-sm">Nenhum dado disponível</p>
        </div>
      ) : (
        <>
          {/* Cards com círculos de progresso */}
          <div className="space-y-4">
            {computed.map((s, i) => {
              const isLast = i === computed.length - 1;
              const ringProgress =
                i === 0
                  ? 1
                  : isLast && s.value > 0
                    ? 1
                    : s.rateToThis;

              return (
                <div
                  key={s.key}
                  className="rounded-xl border-2 p-4 transition-colors bg-white"
                  style={{
                    borderColor: s.stroke ?? "#E5E7EB",
                  }}
                >
                  <div className="font-bold text-sm mb-3" style={{ color: s.stroke ?? s.color }}>
                    {s.label}
                  </div>
                  <div className="flex items-center gap-4">
                    <ProgressRing
                      value={s.value}
                      progress={ringProgress}
                      color={s.color}
                      stroke={s.stroke}
                    />
                    <div className="flex-1">
                      {!isLast && s.rateToNext != null && (
                        <p className="text-sm font-bold text-gray-900">
                          {fmtPct(s.rateToNext)} ~ próxima etapa
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resumo textual */}
          <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
            {computed.map((s, i) => {
              const next = computed[i + 1];
              const conv = s.rateToNext != null ? fmtPct(s.rateToNext) : null;
              return (
                <div
                  key={s.key}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-xs font-semibold text-gray-700 truncate">
                    {s.label}
                  </span>
                  <span className="text-xs font-medium text-gray-800 shrink-0 ml-2">
                    {s.value}
                    {next && conv != null && (
                      <span className="ml-1 text-gray-500">({conv})</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
