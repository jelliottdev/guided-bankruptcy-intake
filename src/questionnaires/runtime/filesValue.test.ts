import { describe, expect, it } from 'vitest';
import { moveFileBetweenValues, withAppendedFiles } from './filesValue';
import type { ResponseValue } from '../types';

describe('questionnaires/runtime/filesValue', () => {
  it('moves a file from one files value to another without duplication', () => {
    const from: ResponseValue = {
      files: [
        { id: 'f1', name: 'a.pdf', uploadedAt: 't1' },
        { id: 'f2', name: 'b.pdf', uploadedAt: 't2' },
      ],
    };
    const to: ResponseValue = { files: [{ id: 'f3', name: 'c.pdf', uploadedAt: 't3' }] };

    const moved = moveFileBetweenValues(from, to, 'f2');
    expect('files' in (moved.fromValue ?? {})).toBe(true);
    expect((moved.fromValue as { files: Array<{ id: string }> }).files.map((f) => f.id)).toEqual(['f1']);
    expect((moved.toValue as { files: Array<{ id: string }> }).files.map((f) => f.id)).toEqual(['f3', 'f2']);
  });

  it('appends files without overwriting existing ids', () => {
    const prev: ResponseValue = { files: [{ id: 'f1', name: 'a.pdf', uploadedAt: 't1' }] };
    const next = withAppendedFiles(prev, [{ id: 'f1', name: 'a2.pdf', uploadedAt: 't2' }, { id: 'f2', name: 'b.pdf', uploadedAt: 't2' }]);
    expect((next as { files: Array<{ id: string }> }).files.map((f) => f.id)).toEqual(['f1', 'f2']);
    expect((next as { files: Array<{ id: string; name: string }> }).files.find((f) => f.id === 'f1')?.name).toBe('a.pdf');
  });
});
