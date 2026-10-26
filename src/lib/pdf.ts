import type { DocumentRecord, Finding } from '../types';

const patterns: { kind: Finding['kind']; re: RegExp; label: string }[] = [
  { kind: 'definition', re: /\b(?:is defined as|means|refers to)\b/i, label: 'Candidate definition' },
  { kind: 'target', re: /\b(?:target|required|must|threshold|at least|no more than)\b.*(?:\d+(?:\.\d+)?\s*%|\d+)/i, label: 'Reported requirement or target' },
  { kind: 'result', re: /\b(?:result|achieved|measured|reported|was|were)\b.*(?:\d+(?:\.\d+)?\s*%|\d+)/i, label: 'Reported result' },
  { kind: 'metric', re: /\b(?:completeness|accuracy|validity|timeliness|consistency|duplicate|error rate|quality score)\b/i, label: 'Quality metric reference' }
];

function candidates(pages: string[]): Finding[] {
  const results: Finding[] = [];
  pages.forEach((page, pageIndex) => {
    const sentences = page.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
    sentences.map(s => s.trim()).filter(s => s.length >= 20 && s.length <= 600).forEach(sentence => {
      const found = patterns.find(p => p.re.test(sentence));
      if (found && !results.some(r => r.quote === sentence)) results.push({ id: crypto.randomUUID(), source: 'document', kind: found.kind, title: found.label, quote: sentence, page: pageIndex + 1, status: 'pending' });
    });
  });
  return results.slice(0, 100);
}

export async function extractDocument(file?: File, pasted?: string): Promise<DocumentRecord> {
  let pages: string[]; let name: string;
  if (file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) throw new Error('Please choose a PDF document.');
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i); const content = await page.getTextContent();
      pages.push(content.items.map(item => 'str' in item ? item.str : '').join(' ').trim());
    }
    name = file.name;
  } else {
    if (!pasted?.trim()) throw new Error('Paste some document text first.');
    pages = [pasted.trim()]; name = `Pasted document ${new Date().toLocaleDateString()}`;
  }
  const chars = pages.reduce((n, p) => n + p.replace(/\s/g, '').length, 0);
  const scanned = Boolean(file && chars < Math.max(30, pages.length * 15));
  return { id: crypto.randomUUID(), name, pages, scanned, findings: scanned ? [] : candidates(pages) };
}
