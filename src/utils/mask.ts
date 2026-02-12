/**
 * Mask email for display: e**l@gmail.com
 */
export function maskEmail(email: string): string {
  if (!email || email.length < 3) return '***';
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const first = local[0];
  const last = local[local.length - 1];
  return `${first}**${last}${domain}`;
}

/**
 * Mask phone for display: (8**) 2**-4***
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '(***) ***-****';
  const area = digits.slice(0, 3);
  const mid = digits.slice(3, 6);
  const last = digits.slice(6);
  return `(${area[0]}**) ${mid[0]}**-${last.slice(0, 1)}***`;
}
