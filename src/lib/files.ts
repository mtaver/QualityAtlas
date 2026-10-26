import * as XLSX from 'xlsx';
import type { Row } from '../types';

export async function readDataset(file: File): Promise<Row[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('The workbook does not contain a worksheet.');
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: null, raw: true });
}
