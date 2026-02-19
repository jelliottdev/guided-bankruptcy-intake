const SCOPE_KEY = 'gbi:client-scope:v1';

function sanitize(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

export function getClientScopeId(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('client') || params.get('client_id') || params.get('case');
  if (fromQuery) {
    const scoped = sanitize(fromQuery);
    if (!scoped) return null;
    try {
      localStorage.setItem(SCOPE_KEY, scoped);
    } catch {
      // ignore
    }
    return scoped;
  }
  try {
    const cached = localStorage.getItem(SCOPE_KEY);
    return cached ? sanitize(cached) : null;
  } catch {
    return null;
  }
}

export function scopedStorageKey(baseKey: string): string {
  const scope = getClientScopeId();
  if (!scope) return baseKey;
  return `${baseKey}:${scope}`;
}

/** Demo-related localStorage keys (unscoped and scoped). Reset clears these. */
const DEMO_STORAGE_KEYS = [
  'gbi:wallace-demo-loaded',
  'gbi:attorney-financial',
  'gbi:attorney-creditor-matrix',
  'gbi:scheduling:v1',
  'gbi:questionnaires:v3',
  'gbi:questionnaires:v1',
] as const;

/** Remove all demo-related localStorage entries. Call on Reset. */
export function clearDemoState(): void {
  if (typeof window === 'undefined') return;
  try {
    for (const baseKey of DEMO_STORAGE_KEYS) {
      localStorage.removeItem(baseKey);
      localStorage.removeItem(scopedStorageKey(baseKey));
    }
  } catch {
    // ignore
  }
}
