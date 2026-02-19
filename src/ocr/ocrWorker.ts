type ProgressFn = (progress: number, status?: string) => void;

type TesseractRecognizeResult = { data?: { text?: unknown; confidence?: unknown } };

type TesseractWorker = {
  recognize: (image: unknown) => Promise<TesseractRecognizeResult>;
  setParameters: (params: Record<string, unknown>) => Promise<unknown>;
};

type TesseractModule = {
  createWorker?: (...args: unknown[]) => Promise<TesseractWorker>;
};

type TesseractImport = TesseractModule & { default?: TesseractModule };

let workerPromise: Promise<TesseractWorker> | null = null;
let activeProgress: ProgressFn | null = null;

function logger(msg: unknown) {
  if (!activeProgress) return;
  const maybe = msg as { progress?: unknown; status?: unknown } | null;
  const p = typeof maybe?.progress === 'number' ? maybe.progress : null;
  if (p == null) return;
  activeProgress(p, typeof maybe?.status === 'string' ? maybe.status : undefined);
}

function unwrapTesseractImport(mod: unknown): TesseractModule | null {
  const m = mod as TesseractImport | null;
  if (!m) return null;
  if (typeof m.createWorker === 'function') return m;
  if (m.default && typeof m.default.createWorker === 'function') return m.default;
  return null;
}

export async function getWorker(): Promise<TesseractWorker> {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    const mod = (await import('tesseract.js')) as unknown;
    const tesseract = unwrapTesseractImport(mod);
    const createWorker = tesseract?.createWorker;
    if (typeof createWorker !== 'function') throw new Error('tesseract.js createWorker unavailable');

    const w = await createWorker('eng', 1, { logger });
    try {
      await w.setParameters({ tessedit_pageseg_mode: '6' });
    } catch {
      // ignore
    }
    return w;
  })();
  return workerPromise;
}

export async function recognizeImage(
  image: unknown,
  onProgress?: ProgressFn
): Promise<{ text: string; confidence: number }> {
  const worker = await getWorker();
  activeProgress = onProgress ?? null;
  try {
    const res = await worker.recognize(image);
    const text = String(res?.data?.text ?? '');
    const confidenceRaw = typeof res?.data?.confidence === 'number' ? (res.data.confidence as number) : 0;
    const confidence = Math.max(0, Math.min(1, confidenceRaw / 100));
    return { text, confidence };
  } finally {
    activeProgress = null;
  }
}
