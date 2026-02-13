// Utilitário para normalizar status de telas
export const isActive = (s: unknown): boolean => {
  const v = String(s ?? '').toLowerCase().trim();
  return v === 'active' || v === 'ativa' || v === 'ativada' || v === '1' || v === 'true';
};

export const normalizeStatus = (s: unknown): 'active' | 'inactive' => {
  return isActive(s) ? 'active' : 'inactive';
};

export const getStatusLabel = (s: unknown): string => {
  return isActive(s) ? 'Ativa' : 'Inativa';
};
