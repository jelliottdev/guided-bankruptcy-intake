import type { OcrDocType, OcrExtractedField } from './types';

function normalize(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseMoney(raw: string): number | null {
  // Be strict: only accept values that look like money. This avoids mis-parsing
  // OCR/PDF text artifacts like "29,067040" (missing decimal).
  const m =
    raw.match(/-?\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)/) ?? null;
  if (!m) return null;
  const cleaned = (m[1] ?? '').replace(/,/g, '').trim();
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

function parseYear(raw: string): number | null {
  const m = raw.match(/(19|20)\d{2}/);
  if (!m) return null;
  const year = Number.parseInt(m[0], 10);
  return year >= 1900 && year <= 2100 ? year : null;
}

function field(value: string | number, confidence: number): OcrExtractedField {
  return { value, confidence, source: 'ocr' };
}

export function classifyDoc(text: string, legacyFieldId?: string): OcrDocType {
  if (legacyFieldId === 'upload_paystubs') return 'paystub';
  if (legacyFieldId === 'upload_bank_statements') return 'bank_statement';
  if (legacyFieldId === 'upload_tax_returns') return 'tax_return';
  if (legacyFieldId === 'upload_debt_counseling') return 'credit_counseling';

  const t = normalize(text).toLowerCase();
  if (/(pay\s*stub|earnings\s*statement|gross\s*pay|net\s*pay|ytd\s*(gross|earnings))/i.test(t)) {
    return 'paystub';
  }
  if (/(statement\s*period|ending\s*balance|beginning\s*balance|account\s*summary)/i.test(t)) {
    return 'bank_statement';
  }
  if (/(form\s*1040|adjusted\s*gross\s*income|\bagi\b|tax\s*return)/i.test(t)) {
    return 'tax_return';
  }
  if (/(credit\s*counseling|certificate\s*of\s*counseling|CC\s*certificate|pre-filing\s*certificate)/i.test(t)) {
    return 'credit_counseling';
  }
  return 'unknown';
}

export function extractFromText(docType: OcrDocType, text: string): Record<string, OcrExtractedField> {
  const t = normalize(text);
  if (!t) return {};

  switch (docType) {
    case 'paystub':
      return extractPaystub(t);
    case 'bank_statement':
      return extractBankStatement(t);
    case 'tax_return':
      return extractTaxReturn(t);
    case 'credit_counseling':
      return extractCreditCounseling(t);
    default:
      return {};
  }
}

function extractPaystub(t: string): Record<string, OcrExtractedField> {
  const out: Record<string, OcrExtractedField> = {};

  // Common patterns: "Gross Pay", or paystubs that show "GROSS: <current> <ytd>".
  const grossPairRe = /\bgross\s*[: ]+\$?\s*([0-9,]+(?:\.[0-9]{2})?)\s+\$?\s*([0-9,]+(?:\.[0-9]{2})?)/gi;
  const grossPairs = Array.from(t.matchAll(grossPairRe));
  const grossPairMatch = grossPairs.length > 0 ? grossPairs[grossPairs.length - 1] : null;
  const grossMatch = t.match(/gross\s*pay\s*[:-]?\s*\$?\s*([0-9,]+(\.[0-9]{2})?)/i);
  const totalGrossMatch = t.match(/total\s*gross[^0-9$]{0,30}\$?\s*([0-9,]+(\.[0-9]{2})?)/i);
  // Net pay often appears in a block with multiple monetary values; pick the max value near the label.
  const netLabelRe = /net\s*pay/gi;
  const netWindowRe = /\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/g;
  const netCandidates: number[] = [];
  for (const match of t.matchAll(netLabelRe)) {
    const start = (match.index ?? 0) + match[0].length;
    const window = t.slice(start, start + 220);
    const nums = Array.from(window.matchAll(netWindowRe))
      .map((m) => parseMoney(m[1] ?? ''))
      .filter((n): n is number => n != null);
    if (nums.length === 0) continue;
    netCandidates.push(...nums);
  }

  // Handles common variants like "YTD Gross Earnings" / "YTD Earnings".
  const ytdMatch = t.match(/ytd[^0-9$]{0,20}(gross|earnings)[^0-9$]{0,20}\$?\s*([0-9,]+(\.[0-9]{2})?)/i);

  if (grossPairMatch) {
    const current = parseMoney(grossPairMatch[1]);
    const ytd = parseMoney(grossPairMatch[2]);
    if (current != null) out.grossPay = field(current, 0.7);
    if (ytd != null) out.ytdGross = field(ytd, 0.65);
  } else if (grossMatch) {
    const num = parseMoney(grossMatch[1]);
    if (num != null) out.grossPay = field(num, 0.6);
  } else if (totalGrossMatch) {
    const num = parseMoney(totalGrossMatch[1]);
    if (num != null) out.grossPay = field(num, 0.65);
  }
  if (netCandidates.length > 0) {
    const gross = typeof out.grossPay?.value === 'number' ? out.grossPay.value : null;
    const filtered =
      gross != null
        ? netCandidates.filter((n) => n > 0 && n <= gross * 1.2)
        : netCandidates.filter((n) => n > 0);
    const best = (filtered.length > 0 ? filtered : netCandidates).reduce((a, b) => (b > a ? b : a), 0);
    if (best > 0) out.netPay = field(best, 0.55);
  }
  if (!out.ytdGross && ytdMatch) {
    const num = parseMoney(ytdMatch[2]);
    if (num != null) out.ytdGross = field(num, 0.55);
  }

  // Paystubs often have "FED TAXABLE GROSS <current> <ytd>" blocks. Use the largest YTD found.
  if (!out.ytdGross) {
    const fedRe = /fed\s*taxable\s*gross/gi;
    const moneyRe = /\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/g;
    let bestYtd: number | null = null;
    for (const match of t.matchAll(fedRe)) {
      const start = (match.index ?? 0) + match[0].length;
      const window = t.slice(start, start + 260);
      const nums = Array.from(window.matchAll(moneyRe))
        .map((m) => parseMoney(m[1] ?? ''))
        .filter((n): n is number => n != null);
      if (nums.length < 2) continue;
      const current = nums[0];
      const ytd = nums[1];
      if (ytd <= 0 || ytd < current) continue;
      if (bestYtd == null || ytd > bestYtd) bestYtd = ytd;
    }
    if (bestYtd != null) out.ytdGross = field(bestYtd, 0.45);
  }

  // Best-effort employer name
  const employerMatch = t.match(/employer\s*[:-]?\s*([A-Za-z0-9 &.,'-]{3,60})/i);
  if (employerMatch) {
    const name = employerMatch[1].trim().replace(/\s{2,}/g, ' ');
    if (name) out.employerName = field(name, 0.45);
  }

  return out;
}

function extractBankStatement(t: string): Record<string, OcrExtractedField> {
  const out: Record<string, OcrExtractedField> = {};

  const endBalRe =
    /ending\s*balance(?:\s*on\s*([A-Za-z]+\s+\d{1,2},\s*(?:19|20)\d{2}))?\s*[:-]?\s*\$?\s*([0-9,]+(?:\.[0-9]{2})?)/gi;
  const endMatches = Array.from(t.matchAll(endBalRe));
  const endBalMatch = endMatches.length > 0 ? endMatches[endMatches.length - 1] : null;
  if (endBalMatch) {
    const raw = endBalMatch[2];
    const num = parseMoney(raw);
    if (num != null) out.endingBalance = field(num, 0.6);
    const dateRaw = endBalMatch[1]?.trim();
    if (dateRaw) out.endingBalanceDate = field(dateRaw, 0.45);
  }

  const periodMatch =
    t.match(/statement\s*period\s*[:-]?\s*([A-Za-z0-9/. -]{5,40})/i) ??
    t.match(/period\s*[:-]?\s*([A-Za-z0-9/. -]{5,40})/i);
  if (periodMatch) {
    const period = periodMatch[1].trim();
    if (period) out.statementPeriod = field(period, 0.35);
  }

  return out;
}

function extractTaxReturn(t: string): Record<string, OcrExtractedField> {
  const out: Record<string, OcrExtractedField> = {};

  const agiMatch = t.match(/adjusted\s*gross\s*income[^0-9$]{0,20}\$?\s*([0-9,]+(\.[0-9]{2})?)/i);
  if (agiMatch) {
    const num = parseMoney(agiMatch[1]);
    if (num != null) out.agi = field(num, 0.6);
  } else {
    // IRS PDFs often extract as: "This is your adjusted gross income . ... 126,671"
    // We look ahead from the label and pick the largest money-like value (>= 1,000) in the window.
    const lower = t.toLowerCase();
    const idx = lower.indexOf('adjusted gross income');
    if (idx >= 0) {
      const window = t.slice(idx, idx + 320);
      const nums = Array.from(
        window.matchAll(/\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/g)
      )
        .map((m) => parseMoney(m[1] ?? ''))
        .filter((n): n is number => n != null && n >= 1000);
      if (nums.length > 0) out.agi = field(Math.max(...nums), 0.45);
    }
  }

  const yearMatch =
    t.match(/tax\s*year\s*ending[^0-9]{0,20}((19|20)\d{2})/i) ??
    t.match(/tax\s*year\s*[:-]?\s*([0-9]{4})/i) ??
    t.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? parseYear(yearMatch[0]) : null;
  if (year != null) out.taxYear = field(year, 0.5);

  return out;
}

function extractCreditCounseling(t: string): Record<string, OcrExtractedField> {
  const out: Record<string, OcrExtractedField> = {};

  // "Date of completion: October 12, 2025" or "Completed on 10/12/2025"
  const dateMatch =
    t.match(/(?:date\s*of\s*completion|completed\s*on|completion\s*date)\s*[:\-\s]\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i) ??
    t.match(/(\d{1,2}\/\d{1,2}\/\d{4})/); // Fallback to any date if context is strong (but classifyDoc handles context)

  if (dateMatch) {
    out.completionDate = field(dateMatch[1].trim(), 0.6);
  }

  return out;
}
