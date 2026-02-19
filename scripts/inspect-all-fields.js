// Enhanced PDF field inspector
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';

const pdfPath = process.argv[2] || './public/forms/form_b_101_0624_fillable_clean.pdf';

async function inspectAllFields() {
    const bytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(bytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`\n═══ PDF FORM FIELD INSPECTION ═══`);
    console.log(`Total fields: ${fields.length}\n`);

    // Group fields by type
    const byType = {};
    fields.forEach(field => {
        const type = field.constructor.name;
        if (!byType[type]) byType[type] = [];
        byType[type].push(field.getName());
    });

    console.log('Fields by Type:');
    Object.entries(byType).forEach(([type, names]) => {
        console.log(`  ${type}: ${names.length}`);
    });

    console.log('\n═══ FIELDS OF INTEREST ═══\n');

    // Show specific fields we care about
    const patterns = [
        'District', 'Check Box8', 'Check Box9', 'Check Box10', 'Check Box11',
        'When', 'Middle', 'Business name', 'Debtor1.First', 'Debtor2.First'
    ];

    fields.forEach((field, idx) => {
        const name = field.getName();
        const type = field.constructor.name;

        if (patterns.some(p => name.includes(p))) {
            console.log(`${idx + 1}. [${type}] "${name}"`);
        }
    });

    // List ALL fields for complete reference
    console.log('\n═══ ALL FIELDS (for reference) ═══\n');
    fields.forEach((field, idx) => {
        console.log(`${idx + 1}. ${field.getName()}`);
    });
}

inspectAllFields().catch(console.error);
