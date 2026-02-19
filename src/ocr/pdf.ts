type RenderOpts = { startPage: number; maxPages: number; scale: number };

type PdfViewport = { width: number; height: number };
type PdfPageProxy = {
  getViewport: (input: { scale: number }) => PdfViewport & Record<string, unknown>;
  render: (input: { canvasContext: CanvasRenderingContext2D; viewport: PdfViewport & Record<string, unknown> }) => {
    promise: Promise<unknown>;
  };
  getTextContent?: () => Promise<{ items?: Array<{ str?: string }> }>;
  cleanup?: () => void;
};
type PdfDocumentProxy = {
  numPages: number;
  getPage: (pageNum: number) => Promise<PdfPageProxy>;
};
type PdfjsModule = {
  getDocument: (input: { data: ArrayBuffer }) => { promise: Promise<PdfDocumentProxy> };
  GlobalWorkerOptions?: { workerSrc: string };
};

export async function renderPdfPages(
  blob: Blob,
  opts: RenderOpts
): Promise<{ canvases: HTMLCanvasElement[]; totalPages: number; processedPages: number }> {
  const mod = (await import('pdfjs-dist/build/pdf.mjs')) as unknown;
  const workerMod = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')) as unknown;
  const pdfjs = mod as PdfjsModule;
  const workerUrl = (workerMod as { default?: unknown } | null)?.default;
  const resolvedWorkerUrl = typeof workerUrl === 'string' ? workerUrl : undefined;
  if (resolvedWorkerUrl && pdfjs?.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = resolvedWorkerUrl;
  }

  const buffer = await blob.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const totalPages: number = doc.numPages ?? 0;

  const startPage = Math.max(1, Math.min(opts.startPage, Math.max(1, totalPages)));
  const endPage = Math.min(totalPages, startPage + Math.max(1, opts.maxPages) - 1);

  const canvases: HTMLCanvasElement[] = [];
  for (let pageNum = startPage; pageNum <= endPage; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: opts.scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport }).promise;
    canvases.push(canvas);
    try {
      page.cleanup?.();
    } catch {
      // ignore
    }
  }

  return { canvases, totalPages, processedPages: endPage - startPage + 1 };
}

export async function extractPdfText(
  blob: Blob,
  opts: { startPage: number; maxPages: number }
): Promise<{ text: string; totalPages: number; processedPages: number }> {
  const mod = (await import('pdfjs-dist/build/pdf.mjs')) as unknown;
  const workerMod = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')) as unknown;
  const pdfjs = mod as PdfjsModule;
  const workerUrl = (workerMod as { default?: unknown } | null)?.default;
  const resolvedWorkerUrl = typeof workerUrl === 'string' ? workerUrl : undefined;
  if (resolvedWorkerUrl && pdfjs?.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = resolvedWorkerUrl;
  }

  const buffer = await blob.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const totalPages: number = doc.numPages ?? 0;

  const startPage = Math.max(1, Math.min(opts.startPage, Math.max(1, totalPages)));
  const endPage = Math.min(totalPages, startPage + Math.max(1, opts.maxPages) - 1);

  let combined = '';
  for (let pageNum = startPage; pageNum <= endPage; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    if (!page.getTextContent) continue;
    const content = await page.getTextContent();
    const pageText = (content.items ?? [])
      .map((item) => String(item.str ?? '').trim())
      .filter(Boolean)
      .join(' ')
      .trim();
    if (pageText) {
      combined = `${combined}\n\n[Page ${pageNum}]\n${pageText}`.trim();
    }
    try {
      page.cleanup?.();
    } catch {
      // ignore
    }
  }

  return { text: combined.trim(), totalPages, processedPages: endPage - startPage + 1 };
}
