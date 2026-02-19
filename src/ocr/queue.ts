import { getBlob } from '../files/blobStore';
import { extractFromText, classifyDoc } from './extractors';
import { recognizeImage } from './ocrWorker';
import { getOcrResult, upsertOcrResult } from './store';
import type { OcrDocType, OcrResult, OcrStatus } from './types';

const MAX_SIZE_MB_AUTO = 15;
const MAX_PAGES_AUTO = 15;
const MAX_PAGES_MANUAL = 15;
const PDF_SCALE = 1.6;

type Job = { fileId: string; mode: 'auto' | 'manual'; continuePdf: boolean };

let running = false;
const queue: Job[] = [];

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function looksLikePdf(meta: { mimeType?: string; name?: string } | null): boolean {
  const mt = (meta?.mimeType ?? '').toLowerCase();
  if (mt === 'application/pdf' || mt.endsWith('/pdf')) return true;
  const name = (meta?.name ?? '').toLowerCase();
  return name.endsWith('.pdf');
}

function looksLikeImage(meta: { mimeType?: string } | null): boolean {
  const mt = (meta?.mimeType ?? '').toLowerCase();
  return mt.startsWith('image/');
}

function bytesToMb(bytes: number | undefined): number {
  if (!bytes || !Number.isFinite(bytes)) return 0;
  return bytes / (1024 * 1024);
}

async function blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) ctx.drawImage(bitmap, 0, 0);
    return canvas;
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) ctx.drawImage(img, 0, 0);
      return canvas;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function setStatus(fileId: string, status: OcrStatus, patch?: Partial<OcrResult>) {
  upsertOcrResult({
    fileId,
    status,
    ...patch,
    processedAt: status === 'done' || status === 'error' ? new Date().toISOString() : patch?.processedAt,
  });
}

export function enqueueOcr(fileId: string, opts?: { mode?: 'auto' | 'manual'; continuePdf?: boolean }) {
  const mode = opts?.mode ?? 'auto';
  const continuePdf = Boolean(opts?.continuePdf);
  queue.push({ fileId, mode, continuePdf });
  void pump();
}

async function pump() {
  if (running) return;
  running = true;
  try {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) break;
      await runJob(job);
    }
  } finally {
    running = false;
  }
}

async function runJob(job: Job) {
  const existing = getOcrResult(job.fileId);
  if (!existing) return;

  const sizeMb = bytesToMb(existing.sizeBytes);
  if (job.mode === 'auto' && sizeMb > MAX_SIZE_MB_AUTO) {
    setStatus(job.fileId, 'not_processed', {
      progress: undefined,
      review: { needsReview: true, reason: 'too_large', detail: `File is ${Math.round(sizeMb)}MB.` },
    });
    return;
  }

  const isPdf = looksLikePdf(existing);
  const isImage = looksLikeImage(existing);
  if (!isPdf && !isImage) {
    setStatus(job.fileId, 'unsupported', {
      progress: undefined,
      review: { needsReview: true, reason: 'unsupported', detail: 'Unsupported file type.' },
    });
    return;
  }

  setStatus(job.fileId, 'processing', { progress: 0, review: undefined });

  let blob: Blob | null = null;
  try {
    blob = await getBlob(job.fileId);
  } catch (err) {
    void err;
  }
  if (!blob) {
    setStatus(job.fileId, 'error', {
      progress: undefined,
      review: { needsReview: true, reason: 'missing_blob', detail: 'Re-upload required (file bytes missing).' },
    });
    return;
  }

  try {
    if (isPdf) {
      await ocrPdf(job.fileId, blob, existing, job);
      return;
    }
    await ocrImage(job.fileId, blob, existing);
  } catch (err) {
    setStatus(job.fileId, 'error', {
      progress: undefined,
      review: { needsReview: true, reason: 'unreadable', detail: String(err ?? 'OCR failed') },
    });
  }
}

async function ocrImage(fileId: string, blob: Blob, existing: OcrResult) {
  const canvas = await blobToCanvas(blob);
  const { text, confidence } = await recognizeImage(canvas, (p) => {
    upsertOcrResult({ fileId, status: 'processing', progress: clamp01(p) });
  });

  const trimmed = text.trim();
  const docType: OcrDocType = classifyDoc(trimmed, existing.legacyFieldId);
  const fields = extractFromText(docType, trimmed);
  const review = buildBaseReview({ docType, text: trimmed, confidence, pdf: null });

  setStatus(fileId, 'done', {
    progress: 1,
    ocrConfidence: confidence,
    rawText: trimmed,
    docType,
    extracted: { docType, fields },
    review,
  });
}

async function ocrPdf(fileId: string, blob: Blob, existing: OcrResult, job: Job) {
  const { extractPdfText, renderPdfPages } = await import('./pdf');

  const previouslyProcessed = existing.pdf?.processedPages ?? 0;
  const continueFrom = job.continuePdf ? previouslyProcessed + 1 : 1;
  const maxPages = job.mode === 'manual' ? MAX_PAGES_MANUAL : MAX_PAGES_AUTO;

  // Prefer native PDF text extraction (fast + accurate) when available.
  try {
    const { text, totalPages, processedPages } = await extractPdfText(blob, {
      startPage: continueFrom,
      maxPages,
    });
    const trimmedText = text.trim();
    const processedTotal = Math.min(totalPages, previouslyProcessed + processedPages);

    // If the PDF contains real text, skip OCR rasterization.
    if (trimmedText.length >= 200) {
      const combinedText = job.continuePdf ? `${(existing.rawText ?? '').trim()}\n\n${trimmedText}`.trim() : trimmedText;
      const docType: OcrDocType = classifyDoc(combinedText, existing.legacyFieldId);
      const fields = extractFromText(docType, combinedText);
      const baseReview = buildBaseReview({
        docType,
        text: combinedText,
        confidence: 1,
        pdf: { totalPages, processedPages: processedTotal },
      });

      setStatus(fileId, 'done', {
        progress: 1,
        ocrConfidence: 1,
        rawText: combinedText,
        docType,
        extracted: { docType, fields },
        pdf: { totalPages, processedPages: processedTotal },
        review: baseReview,
      });
      return;
    }
  } catch {
    // fall back to OCR
  }

  const { canvases, totalPages, processedPages } = await renderPdfPages(blob, {
    startPage: continueFrom,
    maxPages,
    scale: PDF_SCALE,
  });

  const pageCount = canvases.length;
  let combinedText = job.continuePdf ? (existing.rawText ?? '') : '';
  let confSum = 0;
  let confCount = 0;

  for (let idx = 0; idx < pageCount; idx += 1) {
    const pageNum = continueFrom + idx;
    const canvas = canvases[idx];
    const { text, confidence } = await recognizeImage(canvas, (p) => {
      const overall = (idx + clamp01(p)) / Math.max(1, pageCount);
      upsertOcrResult({ fileId, status: 'processing', progress: clamp01(overall) });
    });

    const normalized = text.trim();
    if (normalized) {
      combinedText = `${combinedText}\n\n[Page ${pageNum}]\n${normalized}`.trim();
    }
    if (confidence > 0) {
      confSum += confidence;
      confCount += 1;
    }
  }

  const ocrConfidence = confCount > 0 ? confSum / confCount : 0;
  const processedTotal = Math.min(totalPages, previouslyProcessed + processedPages);

  const trimmed = combinedText.trim();
  const docType: OcrDocType = classifyDoc(trimmed, existing.legacyFieldId);
  const fields = extractFromText(docType, trimmed);

  const baseReview = buildBaseReview({
    docType,
    text: trimmed,
    confidence: ocrConfidence,
    pdf: { totalPages, processedPages: processedTotal },
  });

  setStatus(fileId, 'done', {
    progress: 1,
    ocrConfidence,
    rawText: trimmed,
    docType,
    extracted: { docType, fields },
    pdf: { totalPages, processedPages: processedTotal },
    review: baseReview,
  });
}

function buildBaseReview(input: {
  docType: OcrDocType;
  text: string;
  confidence: number;
  pdf: { totalPages: number; processedPages: number } | null;
}): OcrResult['review'] | undefined {
  const t = input.text.trim();
  if (input.pdf && input.pdf.processedPages < input.pdf.totalPages) {
    return {
      needsReview: false,
      reason: 'partial_pdf',
      detail: `Processed ${input.pdf.processedPages}/${input.pdf.totalPages} pages.`,
    };
  }
  if (!t || t.length < 40) {
    return { needsReview: true, reason: 'unreadable', detail: 'OCR text is empty or too short.' };
  }
  if (input.docType === 'unknown') {
    return { needsReview: false, reason: 'unknown_type', detail: 'Could not classify document type.' };
  }
  if (input.confidence > 0 && input.confidence < 0.6) {
    return { needsReview: true, reason: 'low_confidence', detail: 'Low OCR confidence.' };
  }
  return undefined;
}
