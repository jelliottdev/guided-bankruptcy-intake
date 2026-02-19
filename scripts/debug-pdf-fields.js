// Debug script to list all PDF form fields
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';

const pdfPath = process.argv[2] || './public/forms/form_b_101_0624_fillable_clean.pdf';

async function listFields() {
    const bytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(bytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`\nTotal fields: ${fields.length}\n`);

    fields.forEach((field, idx) => {
        const name = field.getName();
        const type = field.constructor.name;

        if (name.toLowerCase().includes('district') || name.toLowerCase().includes('box10') || name.toLowerCase().includes('box11') || name.toLowerCase().includes('check box 10') || name.toLowerCase().includes('check box 11')) {
            console.log(`${idx + 1}. [${type}] "${name}"`);
        }
    });
}

listFields().catch(console.error);
