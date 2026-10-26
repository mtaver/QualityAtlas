import { mkdirSync, writeFileSync } from 'node:fs';
import * as XLSX from 'xlsx';

const directory = new URL('../.test-fixtures/', import.meta.url);
mkdirSync(directory, { recursive: true });
const rows = [
  { id: 1, email: 'a@example.com', score: 10, updated: '2026-10-20' },
  { id: 2, email: '', score: 200, updated: '2026-08-01' },
  { id: 2, email: '', score: 200, updated: '2026-08-01' }
];
const csv = 'id,email,score,updated\n1,a@example.com,10,2026-10-20\n2,,200,2026-08-01\n2,,200,2026-08-01\n';
writeFileSync(new URL('known.csv', directory), csv);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Quality data');
XLSX.writeFile(workbook, new URL('known.xlsx', directory).pathname.slice(1));

const content = 'BT /F1 12 Tf 72 720 Td (Completeness means the proportion of required values that are present.) Tj 0 -24 Td (The required target is at least 95 percent.) Tj 0 -24 Td (The reported result was 91 percent.) Tj ET';
const objects = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
  `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
];
let pdf = '%PDF-1.4\n'; const offsets = [0];
objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
const xref = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
writeFileSync(new URL('quality-report.pdf', directory), pdf);
console.log('Browser fixtures created in .test-fixtures');
