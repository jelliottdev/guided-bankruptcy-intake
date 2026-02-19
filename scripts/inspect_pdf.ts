import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function inspect(path: string) {
    const buffer = fs.readFileSync(path);
    const pdfDoc = await PDFDocument.load(buffer);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`Fields in ${path}:`);
    fields.forEach(f => {
        const type = f.constructor.name;
        const name = f.getName();
        console.log(`- ${name} (${type})`);
    });
}

inspect(process.argv[2]).catch(console.error);
