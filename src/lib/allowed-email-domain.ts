const ALLOWED_SIGNUP_DOMAIN = 'tvdoutor.com.br';

export function isAllowedSignupEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(`@${ALLOWED_SIGNUP_DOMAIN}`);
}

export function getAllowedSignupDomain(): string {
  return ALLOWED_SIGNUP_DOMAIN;
}
