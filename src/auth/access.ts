import { getClientScopeId, scopedStorageKey } from '../state/clientScope';

const ACCESS_SESSION_KEY = 'gbi:access:granted:v1';

export function getExpectedAccessCode(): string {
  return (import.meta.env.VITE_DEMO_ACCESS_CODE as string | undefined) ?? 'demo-access';
}

export function getRequestedAccessCode(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('access');
}

export function hasGrantedAccess(): boolean {
  const expected = getExpectedAccessCode();
  const queryCode = getRequestedAccessCode();
  if (queryCode && queryCode === expected) {
    grantAccess();
    return true;
  }
  try {
    return localStorage.getItem(scopedStorageKey(ACCESS_SESSION_KEY)) === '1';
  } catch {
    return false;
  }
}

export function grantAccess(): void {
  try {
    localStorage.setItem(scopedStorageKey(ACCESS_SESSION_KEY), '1');
    const scope = getClientScopeId();
    if (scope) localStorage.setItem(scopedStorageKey('gbi:access:scope'), scope);
  } catch {
    // ignore
  }
}
