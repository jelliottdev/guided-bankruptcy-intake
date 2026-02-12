const FALLBACK = '—';

/**
 * Mask email for display: e**l@gmail.com. Handles undefined, short, and edge cases.
 * Returns "—" for missing or un-maskable values to avoid broken masks like *@.
 */
export function maskEmail(email: string | null | undefined): string {
  if (email == null || typeof email !== 'string') return FALLBACK;
  const trimmed = email.trim();
  if (trimmed.length < 3) return FALLBACK;
  const at = trimmed.indexOf('@');
  if (at <= 0) return FALLBACK;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at);
  const first = local[0];
  const last = local[local.length - 1];
  return `${first}**${last}${domain}`;
}

/**
 * Mask phone for display: (8**) 2**-4***. Handles undefined, non-digits, short.
 * Returns "—" for missing or un-maskable values.
 */
export function maskPhone(phone: string | null | undefined): string {
  if (phone == null || typeof phone !== 'string') return FALLBACK;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return FALLBACK;
  const area = digits.slice(0, 3);
  const mid = digits.slice(3, 6);
  const last = digits.slice(6);
  return `(${area[0]}**) ${mid[0]}**-${last.slice(0, 1)}***`;
}
