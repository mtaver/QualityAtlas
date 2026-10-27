import * as XLSX from 'xlsx';
import type { DatasetSource, Row } from '../types';

export async function readDataset(file: File): Promise<Row[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('The workbook does not contain a worksheet.');
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: null, raw: true });
}

export async function readWorkbook(file: File, worksheet?: string): Promise<{ sheets: string[]; source: DatasetSource }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, raw: false });
  const sheetName = worksheet || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Worksheet “${sheetName}” was not found.`);
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: null, raw: false });
  return { sheets: workbook.SheetNames, source: { name: file.name, worksheet: sheetName, rows, columns: [...new Set(rows.flatMap(Object.keys))] } };
}
