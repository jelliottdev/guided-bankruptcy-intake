/**
 * Extract B101-critical answers from a voluntary petition PDF using raw text
 * (PDF.js getTextContent). For image-only PDFs, run OCR in the app first and
 * pass the OCR result text to parseVoluntaryPetitionText.
 */
import { extractPdfText } from './pdf';
import { parseVoluntaryPetitionText, type PetitionParsed } from './parseVoluntaryPetitionText';

const MIN_TEXT_LENGTH = 50;

/**
 * Raw analysis: extract text from the PDF and parse petition answers.
 * Returns parsed answers and whether enough text was found (false => try visual/OCR).
 */
export async function extractPetitionAnswersFromPdfBlob(
  blob: Blob
): Promise<{ parsed: PetitionParsed; method: 'raw'; textLength: number; suggestVisual: boolean }> {
  const { text } = await extractPdfText(blob, {
    startPage: 1,
    maxPages: 10,
  });
  const textLength = text.length;
  const parsed = parseVoluntaryPetitionText(text);
  return {
    parsed,
    method: 'raw',
    textLength,
    suggestVisual: textLength < MIN_TEXT_LENGTH,
  };
}

/**
 * Use after visual/OCR: parse petition answers from OCR result text.
 */
export function parsePetitionTextFromOcr(ocrText: string): PetitionParsed {
  return parseVoluntaryPetitionText(ocrText);
}
