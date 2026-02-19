export type DocumentVerificationStatus =
  | 'missing'
  | 'received'
  | 'needs_review'
  | 'verified'
  | 'waived';

export interface DocumentRequestCard {
  id: string;
  label: string;
  required: boolean;
  whyNeeded: string;
  alternatives: string[];
  examplesMini: string[];
  linkedIssueId?: string;
  status: DocumentVerificationStatus;
  reviewer?: 'attorney' | 'staff';
  reviewedAt?: string;
  resolutionState?: 'none' | 'needs_review' | 'closed_with_exception' | 'approved';
}
