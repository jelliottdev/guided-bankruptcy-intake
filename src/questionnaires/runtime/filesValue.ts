import type { ResponseValue } from '../types';

export type ResponseFileMeta = {
  id: string;
  name: string;
  uploadedAt: string;
  mimeType?: string;
  sizeBytes?: number;
  blobKey?: string;
};

export function isFilesValue(value: unknown): value is { files: ResponseFileMeta[] } {
  if (typeof value !== 'object' || value == null) return false;
  return 'files' in value && Array.isArray((value as { files?: unknown }).files);
}

export function getFilesFromValue(value: ResponseValue | undefined): ResponseFileMeta[] {
  return isFilesValue(value) ? value.files : [];
}

export function withAppendedFiles(
  value: ResponseValue | undefined,
  incoming: ResponseFileMeta[]
): ResponseValue {
  const existing = getFilesFromValue(value);
  const byId = new Map(existing.map((file) => [file.id, file]));
  for (const file of incoming) {
    if (!file?.id) continue;
    if (byId.has(file.id)) continue;
    byId.set(file.id, file);
  }
  return { files: Array.from(byId.values()) };
}

export function removeFilesById(
  value: ResponseValue | undefined,
  fileIds: string[]
): ResponseValue | undefined {
  const existing = getFilesFromValue(value);
  if (existing.length === 0) return value;
  const remove = new Set(fileIds.filter(Boolean));
  if (remove.size === 0) return value;
  const nextFiles = existing.filter((file) => !remove.has(file.id));
  return nextFiles.length > 0 ? { files: nextFiles } : undefined;
}

export function moveFileBetweenValues(
  fromValue: ResponseValue | undefined,
  toValue: ResponseValue | undefined,
  fileId: string
): { fromValue: ResponseValue | undefined; toValue: ResponseValue | undefined; moved: ResponseFileMeta | null } {
  const existingFrom = getFilesFromValue(fromValue);
  const moved = existingFrom.find((f) => f.id === fileId) ?? null;
  if (!moved) return { fromValue, toValue, moved: null };
  return {
    fromValue: removeFilesById(fromValue, [fileId]),
    toValue: withAppendedFiles(toValue, [moved]),
    moved,
  };
}

