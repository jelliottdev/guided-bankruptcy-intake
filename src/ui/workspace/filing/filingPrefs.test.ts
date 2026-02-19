import { describe, expect, it } from 'vitest';
import { loadFilingStateOverride, saveFilingStateOverride } from './filingPrefs';

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

describe('filingPrefs', () => {
  it('returns empty string when storage is missing', () => {
    expect(loadFilingStateOverride(null)).toBe('');
  });

  it('persists and reads state override value', () => {
    const storage = createMemoryStorage();
    expect(loadFilingStateOverride(storage)).toBe('');
    saveFilingStateOverride('Illinois', storage);
    expect(loadFilingStateOverride(storage)).toBe('Illinois');
  });

  it('trims whitespace', () => {
    const storage = createMemoryStorage();
    saveFilingStateOverride('  California  ', storage);
    expect(loadFilingStateOverride(storage)).toBe('California');
  });
});

