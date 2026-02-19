/* eslint-env node */
/**
 * Raw analysis: extract text from a voluntary petition PDF and parse B101-critical answers.
 * Usage: node scripts/analyze-petition-pdf.mjs "/path/to/Voluntary Petition.pdf"
 * Use the printed JSON to seed or merge into intake (e.g. seedData or FilingToolsDrawer).
 */
import fs from 'fs';
import path from 'path';

const pdfPath = process.argv[2];
if (!pdfPath || !fs.existsSync(pdfPath)) {
  console.error('Usage: node scripts/analyze-petition-pdf.mjs "/path/to/file.pdf"');
  process.exit(1);
}

// Inline parser (mirrors src/ocr/parseVoluntaryPetitionText.ts) so script runs in Node without TS.
function parsePetitionText(text) {
  const normalized = (text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return {};

  const findFirst = (patterns) => {
    for (const { re, value } of patterns) {
      if (re.test(normalized)) return value;
    }
    return undefined;
  };

  const chapterPatterns = [
    { re: /\bchapter\s*13\b/i, value: '13' },
    { re: /\bchapter\s*7\b/i, value: '7' },
    { re: /\bchapter\s*11\b/i, value: '11' },
  ];
  const feePatterns = [
    { re: /pay\s+in\s+installments?/i, value: 'installments' },
    { re: /installment/i, value: 'installments' },
    { re: /fee\s+waived|waiver|request\s+waiver/i, value: 'waiver_request' },
    { re: /pay\s+entirely|full\s+payment/i, value: 'full' },
  ];
  const debtPatterns = [
    { re: /\bconsumer\s+debts?\b/i, value: 'consumer' },
    { re: /\bbusiness\s+debts?\b/i, value: 'business' },
    { re: /\bboth\b.*(consumer|business)/i, value: 'other' },
    { re: /primarily\s+consumer/i, value: 'consumer' },
  ];
  const rangeMap = [
    { re: /\$?\s*500\s*,?\s*001\s*[-–—to]\s*\$?\s*1\s*,?\s*000\s*,?\s*000/i, value: '500001-1000000' },
    { re: /500001\s*[-–]\s*1000000/i, value: '500001-1000000' },
    { re: /\$?\s*100\s*,?\s*001\s*[-–—to]\s*\$?\s*500\s*,?\s*000/i, value: '100001-500000' },
    { re: /100001\s*[-–]\s*500000/i, value: '100001-500000' },
    { re: /\$?\s*0\s*[-–—to]\s*\$?\s*50\s*,?\s*000/i, value: '0-50000' },
    { re: /0\s*[-–]\s*50000/i, value: '0-50000' },
  ];
  const dateRe = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b|\b(\d{4})-(\d{2})-(\d{2})\b/g;
  const findRange = () => {
    for (const { re, value } of rangeMap) {
      if (re.test(normalized)) return value;
    }
    return undefined;
  };
  const findDate = () => {
    const candidates = [];
    let m;
    dateRe.lastIndex = 0;
    while ((m = dateRe.exec(normalized)) !== null) {
      if (m[1] !== undefined) {
        candidates.push(`${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`);
      } else if (m[4] !== undefined) {
        candidates.push(`${m[4]}-${m[5]}-${m[6]}`);
      }
    }
    if (candidates.length === 0) return undefined;
    candidates.sort();
    return candidates[candidates.length - 1];
  };

  const out = {};
  const filing_chapter = findFirst(chapterPatterns);
  const filing_fee_method = findFirst(feePatterns);
  const debt_nature = findFirst(debtPatterns);
  const asset_range = findRange();
  const liability_range = findRange();
  const filing_date = findDate();
  if (filing_chapter) out.filing_chapter = filing_chapter;
  if (filing_fee_method) out.filing_fee_method = filing_fee_method;
  if (debt_nature) out.debt_nature = debt_nature;
  if (asset_range) out.asset_range = asset_range;
  if (liability_range) out.liability_range = liability_range;
  if (filing_date) out.filing_date = filing_date;
  return out;
}

async function run() {
  const buffer = fs.readFileSync(pdfPath);
  let pdfParse;
  try {
    pdfParse = (await import('pdf-parse')).default;
  } catch {
    console.error('Install pdf-parse for raw text extraction: npm install pdf-parse --save-dev');
    process.exit(1);
  }
  const data = await pdfParse(buffer);
  const text = (data && data.text) || '';
  const parsed = parsePetitionText(text);

  console.log('File:', path.basename(pdfPath));
  console.log('Pages:', data?.numpages ?? '?');
  console.log('Raw text length:', text.length);
  console.log('');
  console.log('--- Extracted B101 / seed answers (raw analysis) ---');
  console.log(JSON.stringify(parsed, null, 2));
  if (text.length < 100) {
    console.log('');
    console.log('(Little or no extractable text. PDF may be image-only; use visual/OCR in the app or re-run after OCR.)');
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
