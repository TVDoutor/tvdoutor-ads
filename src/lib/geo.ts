/**
 * Converte lat/lng vindos do banco ou de formulários (vírgula ou ponto como decimal).
 */
export function parseLatLng(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  const s = String(value).trim().replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

/** Código do ponto: coluna `code` ou padrão P#### no `name` (cadastros legados). */
export function getScreenPointCode(screen: {
  code?: string | null;
  name?: string | null;
}): string {
  const code = String(screen?.code ?? '').trim();
  if (code) return code;
  const name = String(screen?.name ?? '').trim();
  if (/^P\d{4,5}(\.[A-Za-z0-9]+)*$/i.test(name)) return name;
  return '';
}
