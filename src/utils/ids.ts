// Utilitário para combinar arrays de IDs (number|string) sem duplicar
// Preserva a ordem do primeiro array e adiciona os novos elementos do segundo array que ainda não existem
export function combineIds<T extends number | string>(a: T[] = [], b: T[] = []): T[] {
  const seen = new Set<T>();
  const result: T[] = [];

  for (const id of a) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }

  for (const id of b) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }

  return result;
}

