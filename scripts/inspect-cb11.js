// Inspect Checkbox Options for Line 11 (Simple)
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';

const pdfPath = process.argv[2] || './public/forms/form_b_101_0624_fillable_clean.pdf';

async function inspectCheckboxOptions() {
    const bytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(bytes);
    const form = pdfDoc.getForm();

    const cb10 = form.getCheckBox('Check Box10');
    const cb11 = form.getCheckBox('Check Box11');

    console.log('\n--- Check Box 10 (Rent/Own Top Level) ---');
    cb10.acroField.getWidgets().forEach((w, i) => {
        const onValue = w.getOnValue();
        console.log(`Widget ${i} OnValue: "${String(onValue)}"`);
    });

    console.log('\n--- Check Box 11 (Eviction Sub Level) ---');
    cb11.acroField.getWidgets().forEach((w, i) => {
        const onValue = w.getOnValue();
        console.log(`Widget ${i} OnValue: "${String(onValue)}"`);
    });
}

inspectCheckboxOptions().catch(console.error);
