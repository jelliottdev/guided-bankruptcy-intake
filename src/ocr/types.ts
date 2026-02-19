export type OcrStatus = 'queued' | 'processing' | 'done' | 'error' | 'unsupported' | 'not_processed';
export type OcrDocType = 'paystub' | 'bank_statement' | 'tax_return' | 'credit_counseling' | 'unknown';

export type OcrExtractedField = {
  value: string | number;
  confidence: number; // 0..1
  source: 'ocr';
};

export type OcrReviewReason =
  | 'low_confidence'
  | 'unreadable'
  | 'conflict'
  | 'unknown_type'
  | 'partial_pdf'
  | 'missing_blob'
  | 'too_large'
  | 'unsupported';

export type OcrResult = {
  fileId: string;
  assignmentId: string;
  nodeId: string;
  legacyFieldId?: string;

  name: string;
  uploadedAt: string;
  mimeType?: string;
  sizeBytes?: number;

  status: OcrStatus;
  progress?: number; // 0..1
  processedAt?: string;
  belongsTo?: 'debtor' | 'spouse' | 'joint'; // NEW: Document ownership for joint filings

  pdf?: { totalPages: number; processedPages: number };

  ocrConfidence?: number; // 0..1 (normalized)
  rawText?: string; // truncated
  docType?: OcrDocType;

  extracted?: {
    docType: OcrDocType;
    fields: Record<string, OcrExtractedField>;
  };

  review?: {
    needsReview: boolean;
    reason: OcrReviewReason;
    detail?: string;
    /** When reason is 'conflict', which intake field and values to show in review UI */
    conflictFieldId?: string;
    conflictIntakeValue?: unknown;
    conflictOcrValue?: unknown;
  };

  // For idempotency of issue/comment creation.
  notifiedIssueKey?: string;
};

export type OcrState = { schemaVersion: 1; resultsByFileId: Record<string, OcrResult> };

