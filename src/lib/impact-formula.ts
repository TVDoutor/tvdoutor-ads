/** Valores aceitos por `proposals_impact_formula_check` (A–J). */
const ALLOWED_IMPACT_FORMULAS = new Set([
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
]);

/**
 * Converte rótulos da UI ou do banco `impact_models.name` (ex.: "Fórmula A")
 * para o código de uma letra gravado em `proposals.impact_formula`.
 */
export function normalizeImpactFormulaForDb(raw: string | undefined | null): string {
  if (raw == null || typeof raw !== 'string') return 'A';
  const t = raw.trim();
  if (ALLOWED_IMPACT_FORMULAS.has(t)) return t;

  const endLetter = t.match(/([A-J])\s*$/i);
  if (endLetter && ALLOWED_IMPACT_FORMULAS.has(endLetter[1].toUpperCase())) {
    return endLetter[1].toUpperCase();
  }

  const single = t.match(/^([A-J])$/i);
  if (single && ALLOWED_IMPACT_FORMULAS.has(single[1].toUpperCase())) {
    return single[1].toUpperCase();
  }

  return 'A';
}

/** Código de exibição/seleção a partir do nome do modelo na tabela `impact_models`. */
export function impactFormulaCodeFromModelName(name: string): string {
  return normalizeImpactFormulaForDb(name);
}
