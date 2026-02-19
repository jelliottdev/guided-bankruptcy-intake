/**
 * Automatic document ownership detection for joint bankruptcy filings
 * Uses multi-signal heuristics to determine if a document belongs to debtor, spouse, or both
 */

import type { OcrDocType } from './types';

export type DocumentOwnership = 'debtor' | 'spouse' | 'joint' | 'unknown';

type OwnershipSignal = {
    owner: 'debtor' | 'spouse' | 'joint';
    confidence: number; // 0-1
    source: 'filename' | 'ocr_name' | 'ocr_multiple_names' | 'upload_context';
    reasoning?: string;
};

type CaseContext = {
    debtorFullName: string;
    spouseFullName?: string;
    debtorFirstName?: string;
    spouseFirstName?: string;
};

type OcrContent = {
    accountHolderName?: string;
    employeeName?: string;
    rawText?: string;
};

export type OwnershipDetectionResult = {
    ownership: DocumentOwnership;
    confidence: number;
    signals: OwnershipSignal[];
    requiresClientClarification: boolean; // true if confidence < 0.8
};

/**
 * Main detection function
 */
export function detectDocumentOwner(
    filename: string,
    ocrContent: OcrContent,
    caseContext: CaseContext,
    uploadFieldId?: string
): OwnershipDetectionResult {
    const signals: OwnershipSignal[] = [];

    // Signal 1: Filename analysis
    const filenameSignals = analyzeFilename(filename, caseContext);
    signals.push(...filenameSignals);

    // Signal 2: OCR content name matching
    const ocrSignals = analyzeOcrNames(ocrContent, caseContext);
    signals.push(...ocrSignals);

    // Signal 3: Upload context (which form field was it uploaded to?)
    const uploadSignal = analyzeUploadContext(uploadFieldId);
    if (uploadSignal) signals.push(uploadSignal);

    // Aggregate signals and determine ownership
    const aggregated = aggregateSignals(signals);

    return {
        ...aggregated,
        signals,
        requiresClientClarification: aggregated.confidence < 0.8
    };
}

/**
 * Analyze filename for ownership clues
 */
function analyzeFilename(
    filename: string,
    context: CaseContext
): OwnershipSignal[] {
    const signals: OwnershipSignal[] = [];
    const lower = filename.toLowerCase();

    // Check for explicit "joint" keyword
    if (lower.includes('joint')) {
        signals.push({
            owner: 'joint',
            confidence: 0.9,
            source: 'filename',
            reasoning: 'Filename contains "joint"'
        });
    }

    // Check for debtor first name
    if (context.debtorFirstName) {
        const debtorFirst = context.debtorFirstName.toLowerCase();
        if (lower.includes(debtorFirst)) {
            signals.push({
                owner: 'debtor',
                confidence: 0.7,
                source: 'filename',
                reasoning: `Filename contains debtor first name "${context.debtorFirstName}"`
            });
        }
    }

    // Check for spouse first name
    if (context.spouseFirstName) {
        const spouseFirst = context.spouseFirstName.toLowerCase();
        if (lower.includes(spouseFirst)) {
            signals.push({
                owner: 'spouse',
                confidence: 0.7,
                source: 'filename',
                reasoning: `Filename contains spouse first name "${context.spouseFirstName}"`
            });
        }
    }

    // Check for both names (indicates joint)
    if (
        context.debtorFirstName &&
        context.spouseFirstName &&
        lower.includes(context.debtorFirstName.toLowerCase()) &&
        lower.includes(context.spouseFirstName.toLowerCase())
    ) {
        signals.push({
            owner: 'joint',
            confidence: 0.85,
            source: 'filename',
            reasoning: 'Filename contains both debtor and spouse names'
        });
    }

    return signals;
}

/**
 * Analyze OCR extracted names
 */
function analyzeOcrNames(
    ocrContent: OcrContent,
    context: CaseContext
): OwnershipSignal[] {
    const signals: OwnershipSignal[] = [];

    const nameToCheck =
        ocrContent.accountHolderName || ocrContent.employeeName;

    if (!nameToCheck) return signals;

    const nameLower = nameToCheck.toLowerCase();

    // Check for "and", "or", "&" indicating joint ownership
    if (
        nameLower.includes(' and ') ||
        nameLower.includes(' or ') ||
        nameLower.includes(' & ')
    ) {
        signals.push({
            owner: 'joint',
            confidence: 0.95,
            source: 'ocr_multiple_names',
            reasoning: 'OCR extracted multiple names with "and/or/&"'
        });
        return signals; // Strong signal, return early
    }

    // Match against debtor name
    const debtorMatch = matchName(nameToCheck, context.debtorFullName);
    if (debtorMatch > 0.7) {
        signals.push({
            owner: 'debtor',
            confidence: debtorMatch,
            source: 'ocr_name',
            reasoning: `OCR name "${nameToCheck}" matches debtor "${context.debtorFullName}"`
        });
    }

    // Match against spouse name
    if (context.spouseFullName) {
        const spouseMatch = matchName(nameToCheck, context.spouseFullName);
        if (spouseMatch > 0.7) {
            signals.push({
                owner: 'spouse',
                confidence: spouseMatch,
                source: 'ocr_name',
                reasoning: `OCR name "${nameToCheck}" matches spouse "${context.spouseFullName}"`
            });
        }
    }

    return signals;
}

/**
 * Analyze upload context (which form field was used)
 */
function analyzeUploadContext(uploadFieldId?: string): OwnershipSignal | null {
    if (!uploadFieldId) return null;

    const lower = uploadFieldId.toLowerCase();

    if (lower.includes('debtor') && !lower.includes('spouse')) {
        return {
            owner: 'debtor',
            confidence: 0.6,
            source: 'upload_context',
            reasoning: `Uploaded to debtor-specific field: ${uploadFieldId}`
        };
    }

    if (lower.includes('spouse') && !lower.includes('debtor')) {
        return {
            owner: 'spouse',
            confidence: 0.6,
            source: 'upload_context',
            reasoning: `Uploaded to spouse-specific field: ${uploadFieldId}`
        };
    }

    if (lower.includes('joint')) {
        return {
            owner: 'joint',
            confidence: 0.8,
            source: 'upload_context',
            reasoning: `Uploaded to joint field: ${uploadFieldId}`
        };
    }

    return null;
}

/**
 * Simple name matching algorithm
 * Returns confidence score 0-1
 */
function matchName(ocrName: string, fullName: string): number {
    const ocrLower = ocrName.toLowerCase().trim();
    const fullLower = fullName.toLowerCase().trim();

    // Exact match
    if (ocrLower === fullLower) return 1.0;

    // Check if OCR contains full name
    if (ocrLower.includes(fullLower)) return 0.95;

    // Split into parts and check for matches
    const ocrParts = ocrLower.split(/\s+/);
    const fullParts = fullLower.split(/\s+/);

    // Last name match is strong signal
    if (
        ocrParts[ocrParts.length - 1] === fullParts[fullParts.length - 1] &&
        fullParts[fullParts.length - 1].length > 2
    ) {
        return 0.85;
    }

    // First name + last name match
    if (ocrParts.length >= 2 && fullParts.length >= 2) {
        if (
            ocrParts[0] === fullParts[0] &&
            ocrParts[ocrParts.length - 1] === fullParts[fullParts.length - 1]
        ) {
            return 0.9;
        }
    }

    // Partial match (first name only)
    if (ocrParts[0] === fullParts[0] && fullParts[0].length > 2) {
        return 0.65;
    }

    return 0.0;
}

/**
 * Aggregate signals and determine final ownership
 */
function aggregateSignals(
    signals: OwnershipSignal[]
): Pick<OwnershipDetectionResult, 'ownership' | 'confidence'> {
    if (signals.length === 0) {
        return { ownership: 'unknown', confidence: 0 };
    }

    // Calculate weighted scores for each owner type
    const scores = {
        debtor: 0,
        spouse: 0,
        joint: 0
    };

    for (const signal of signals) {
        scores[signal.owner] += signal.confidence;
    }

    // Find highest score
    const maxScore = Math.max(scores.debtor, scores.spouse, scores.joint);
    const totalSignalStrength = signals.reduce(
        (sum, s) => sum + s.confidence,
        0
    );

    // Determine ownership
    let ownership: DocumentOwnership = 'unknown';
    if (maxScore === scores.joint && scores.joint > 0) {
        ownership = 'joint';
    } else if (maxScore === scores.debtor && scores.debtor > 0) {
        ownership = 'debtor';
    } else if (maxScore === scores.spouse && scores.spouse > 0) {
        ownership = 'spouse';
    }

    // Calculate overall confidence (normalize by total strength)
    const confidence =
        totalSignalStrength > 0 ? maxScore / totalSignalStrength : 0;

    return { ownership, confidence };
}

/**
 * Helper to format detection result for logging
 */
export function formatDetectionResult(result: OwnershipDetectionResult): string {
    const lines = [
        `Ownership: ${result.ownership} (confidence: ${(result.confidence * 100).toFixed(0)}%)`,
        result.requiresClientClarification
            ? '⚠️  Client clarification required'
            : '✓  Auto-detected',
        '',
        'Signals:'
    ];

    for (const signal of result.signals) {
        lines.push(
            `  • ${signal.owner} (${(signal.confidence * 100).toFixed(0)}%) - ${signal.source}: ${signal.reasoning}`
        );
    }

    return lines.join('\n');
}
