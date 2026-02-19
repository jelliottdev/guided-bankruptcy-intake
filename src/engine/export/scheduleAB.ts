import { PDFDocument } from 'pdf-lib';
import type { CaseCanonical } from '../types';
import { fillScheduleAB } from '../../export/fillScheduleAB';
import type { ScheduleAData } from '../../export/scheduleA';
import type { ScheduleBData } from '../../export/scheduleB';

/**
 * Generates the Official Form 106A/B (Schedule A/B: Property) PDF.
 * Uses the same filler as the UI path: canonical.assets.scheduleA / scheduleB → fillScheduleAB.
 *
 * @param data The canonical case data (must include assets.scheduleA and assets.scheduleB from buildCanonical).
 * @param templateBuffer The array buffer of the blank PDF template.
 * @returns A Uint8Array containing the filled PDF.
 */
export async function generateScheduleAB(
    data: CaseCanonical,
    templateBuffer: ArrayBuffer
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(templateBuffer);

    const assets = data.assets as
        | { scheduleA?: ScheduleAData; scheduleB?: ScheduleBData }
        | undefined;
    const scheduleA = assets?.scheduleA;
    const scheduleB = assets?.scheduleB;

    if (!scheduleA || !scheduleB) {
        throw new Error(
            'Canonical must include assets.scheduleA and assets.scheduleB (set by buildCanonical from answers).'
        );
    }

    await fillScheduleAB(pdfDoc, scheduleA, scheduleB, data);

    const form = pdfDoc.getForm();
    form.updateFieldAppearances();

    return pdfDoc.save();
}
