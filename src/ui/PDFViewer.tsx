/**
 * In-page PDF viewer: shows the PDF in an iframe using the browser's native viewer.
 * Avoids PDF.js canvas rendering, which fails on the BB Packet PDF's AcroForm.
 */
import { useEffect, useState, useRef } from 'react';

interface PDFViewerProps {
  pdfUrl: string | null;
  onClose: () => void;
}

export function PDFViewer({ pdfUrl, onClose }: PDFViewerProps) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pdfUrl) {
      setDisplayUrl(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (pdfUrl.startsWith('data:')) {
      fetch(pdfUrl)
        .then((r) => r.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setDisplayUrl(url);
          setLoading(false);
        })
        .catch((err) => {
          setError(err?.message ?? 'Failed to load PDF');
          setLoading(false);
        });
    } else {
      setDisplayUrl(pdfUrl);
      setLoading(false);
    }

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [pdfUrl]);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = 'BB-Packet-Filled.pdf';
    a.click();
  };

  if (!pdfUrl) return null;

  if (error) {
    return (
      <div className="pdf-viewer-inner pdf-viewer-error">
        <p>Could not load PDF: {error}</p>
        <button type="button" className="pdf-viewer-close" onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="pdf-viewer-inner">
      <div className="pdf-viewer-toolbar">
        <div className="pdf-viewer-nav">
          <span className="pdf-viewer-page-num">PDF preview</span>
        </div>
        <div className="pdf-viewer-toolbar-right">
          <button type="button" className="pdf-viewer-download primary" onClick={handleDownload}>
            Download PDF
          </button>
          <button type="button" className="pdf-viewer-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div className="pdf-viewer-canvas-wrap pdf-viewer-iframe-wrap">
        {loading && <p>Loading…</p>}
        {displayUrl && (
          <iframe
            title="BB Packet PDF"
            src={displayUrl}
            className="pdf-viewer-iframe"
          />
        )}
      </div>
    </div>
  );
}
