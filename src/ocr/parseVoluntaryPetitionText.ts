/**
 * Parse raw or OCR text from a voluntary petition (e.g. Form 101) and infer
 * B101-critical intake answers. Used after raw PDF text extraction or visual OCR.
 */
import type { Answers } from '../form/types';

export type PetitionParsed = Partial<
  Pick<
    Answers,
    'filing_chapter' | 'filing_fee_method' | 'debt_nature' | 'asset_range' | 'liability_range' | 'filing_date'
  >
>;

const CHAPTER_PATTERNS = [
  { re: /\bchapter\s*13\b/i, value: '13' },
  { re: /\bchapter\s*7\b/i, value: '7' },
  { re: /\bchapter\s*11\b/i, value: '11' },
  { re: /\b13\s+\(chapter\)/i, value: '13' },
  { re: /\b7\s+\(chapter\)/i, value: '7' },
];

const FEE_PATTERNS = [
  { re: /pay\s+in\s+installments?/i, value: 'installments' },
  { re: /installment/i, value: 'installments' },
  { re: /fee\s+waived|waiver|request\s+waiver/i, value: 'waiver_request' },
  { re: /pay\s+entirely|full\s+payment/i, value: 'full' },
];

const DEBT_PATTERNS = [
  { re: /\bconsumer\s+debts?\b/i, value: 'consumer' },
  { re: /\bbusiness\s+debts?\b/i, value: 'business' },
  { re: /\bboth\b.*(consumer|business)/i, value: 'other' },
  { re: /primarily\s+consumer/i, value: 'consumer' },
];

// Ranges: match "$500,001 - $1,000,000" or "500001-1000000" or "500,001 to 1,000,000"
const RANGE_MAP: Array<{ re: RegExp; value: string }> = [
  { re: /\$?\s*500\s*,?\s*001\s*[-–—to]\s*\$?\s*1\s*,?\s*000\s*,?\s*000/i, value: '500001-1000000' },
  { re: /500001\s*[-–]\s*1000000/i, value: '500001-1000000' },
  { re: /\$?\s*100\s*,?\s*001\s*[-–—to]\s*\$?\s*500\s*,?\s*000/i, value: '100001-500000' },
  { re: /100001\s*[-–]\s*500000/i, value: '100001-500000' },
  { re: /\$?\s*50\s*,?\s*001\s*[-–—to]\s*\$?\s*100\s*,?\s*000/i, value: '50001-100000' },
  { re: /50001\s*[-–]\s*100000/i, value: '50001-100000' },
  { re: /\$?\s*0\s*[-–—to]\s*\$?\s*50\s*,?\s*000/i, value: '0-50000' },
  { re: /0\s*[-–]\s*50000/i, value: '0-50000' },
  { re: /\$?\s*1\s*,?\s*000\s*,?\s*001\s*[-–—to]\s*\$?\s*10\s*,?\s*000\s*,?\s*000/i, value: '1000001-10000000' },
  { re: /1000001\s*[-–]\s*10000000/i, value: '1000001-10000000' },
];

// Date: MM/DD/YYYY or YYYY-MM-DD
const DATE_RE = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b|\b(\d{4})-(\d{2})-(\d{2})\b/g;

function findFirst(text: string, patterns: Array<{ re: RegExp; value: string }>): string | undefined {
  for (const { re, value } of patterns) {
    if (re.test(text)) return value;
  }
  return undefined;
}

function findRange(text: string): string | undefined {
  for (const { re, value } of RANGE_MAP) {
    if (re.test(text)) return value;
  }
  return undefined;
}

/** Extract a single date (e.g. signature date); prefers later dates if multiple. */
function findDate(text: string): string | undefined {
  const candidates: string[] = [];
  let m: RegExpExecArray | null;
  DATE_RE.lastIndex = 0;
  while ((m = DATE_RE.exec(text)) !== null) {
    if (m[1] !== undefined) {
      const mm = m[1].padStart(2, '0');
      const dd = m[2].padStart(2, '0');
      const yyyy = m[3];
      candidates.push(`${yyyy}-${mm}-${dd}`);
    } else if (m[4] !== undefined) {
      candidates.push(`${m[4]}-${m[5]}-${m[6]}`);
    }
  }
  if (candidates.length === 0) return undefined;
  candidates.sort();
  return candidates[candidates.length - 1];
}

/**
 * Parse voluntary petition text (from raw PDF extraction or OCR) and return
 * B101-critical answers. Use for seeding or merging when the source is a filed petition.
 */
export function parseVoluntaryPetitionText(text: string): PetitionParsed {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return {};

  const filing_chapter = findFirst(normalized, CHAPTER_PATTERNS);
  const filing_fee_method = findFirst(normalized, FEE_PATTERNS);
  const debt_nature = findFirst(normalized, DEBT_PATTERNS);
  const asset_range = findRange(normalized);
  const liability_range = findRange(normalized);
  const filing_date = findDate(normalized);

  const out: PetitionParsed = {};
  if (filing_chapter) out.filing_chapter = filing_chapter;
  if (filing_fee_method) out.filing_fee_method = filing_fee_method;
  if (debt_nature) out.debt_nature = debt_nature;
  if (asset_range) out.asset_range = asset_range;
  if (liability_range) out.liability_range = liability_range;
  if (filing_date) out.filing_date = filing_date;
  return out;
}
