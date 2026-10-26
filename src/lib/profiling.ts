import type { Cell, ColumnProfile, Profile, Row, Rule, RuleResult } from '../types';

export const isMissing = (value: Cell) => value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

const cellKey = (value: Cell) => value instanceof Date ? value.toISOString() : String(value ?? '').trim();

export function inferCellType(value: Cell): string {
  if (isMissing(value)) return 'missing';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number' && Number.isFinite(value)) return 'number';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return 'date';
  const text = String(value).trim();
  if (/^(true|false)$/i.test(text)) return 'boolean';
  if (/^-?(?:\d+|\d*\.\d+)$/.test(text)) return 'number';
  if (/^\d{4}-\d{2}-\d{2}(?:[T ]|$)/.test(text) && !Number.isNaN(Date.parse(text))) return 'date';
  return 'text';
}

export function profileColumns(rows: Row[]): ColumnProfile[] {
  const names = [...new Set(rows.flatMap(Object.keys))];
  return names.map(name => {
    const values = rows.map(row => row[name]);
    const typed = values.map(inferCellType).filter(type => type !== 'missing');
    const counts = typed.reduce<Record<string, number>>((acc, type) => ({ ...acc, [type]: (acc[type] || 0) + 1 }), {});
    const inferredType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'empty';
    const inconsistentRows = typed.length ? values.flatMap((value, index) => {
      const type = inferCellType(value);
      return type !== 'missing' && type !== inferredType ? [index + 1] : [];
    }) : [];
    const missing = values.filter(isMissing).length;
    return {
      name, inferredType, missing, nonMissing: rows.length - missing,
      completeness: rows.length ? (rows.length - missing) / rows.length : 1,
      unique: new Set(values.filter(value => !isMissing(value)).map(cellKey)).size,
      inconsistentRows,
      examples: [...new Set(values.filter(value => !isMissing(value)).map(cellKey))].slice(0, 3)
    };
  });
}

export function findDuplicateRows(rows: Row[]): number[] {
  const seen = new Map<string, number>();
  const duplicates = new Set<number>();
  rows.forEach((row, index) => {
    const key = JSON.stringify(Object.keys(row).sort().map(name => [name, cellKey(row[name])]));
    if (seen.has(key)) { duplicates.add((seen.get(key) as number) + 1); duplicates.add(index + 1); }
    else seen.set(key, index);
  });
  return [...duplicates];
}

export function findDuplicateIdentifiers(rows: Row[], identifier?: string): number[] {
  if (!identifier) return [];
  const groups = new Map<string, number[]>();
  rows.forEach((row, index) => {
    if (isMissing(row[identifier])) return;
    const key = cellKey(row[identifier]);
    groups.set(key, [...(groups.get(key) || []), index + 1]);
  });
  return [...groups.values()].filter(indices => indices.length > 1).flat();
}

export function evaluateRules(rows: Row[], rules: Rule[]): RuleResult[] {
  return rules.map(rule => {
    const affectedRows: number[] = [];
    rows.forEach((row, index) => {
      const value = row[rule.column];
      let valid = true;
      if (rule.kind === 'required') valid = !isMissing(value);
      else if (!isMissing(value)) {
        if (rule.kind === 'regex') { try { valid = new RegExp(rule.value || '').test(String(value)); } catch { valid = false; } }
        if (rule.kind === 'allowed') valid = (rule.value || '').split(',').map(v => v.trim()).includes(String(value).trim());
        if (rule.kind === 'range') { const n = Number(value); valid = Number.isFinite(n) && (rule.min === undefined || n >= rule.min) && (rule.max === undefined || n <= rule.max); }
      }
      if (!valid) affectedRows.push(index + 1);
    });
    return { ...rule, passed: rows.length - affectedRows.length, denominator: rows.length, affectedRows };
  });
}

export function calculateTimeliness(rows: Row[], column: string, thresholdDays: number, now = new Date()) {
  const staleRows: number[] = [], invalidRows: number[] = [];
  rows.forEach((row, index) => {
    const parsed = new Date(String(row[column] ?? ''));
    if (Number.isNaN(parsed.getTime())) invalidRows.push(index + 1);
    else if ((now.getTime() - parsed.getTime()) / 86400000 > thresholdDays) staleRows.push(index + 1);
  });
  return { column, thresholdDays, currentRows: rows.length - staleRows.length - invalidRows.length, denominator: rows.length, staleRows, invalidRows };
}

export function createProfile(name: string, rows: Row[], identifier?: string, rules: Rule[] = [], dateColumn?: string, thresholdDays = 30): Profile {
  return { name, rows, columns: profileColumns(rows), duplicateRows: findDuplicateRows(rows), duplicateIdentifierRows: findDuplicateIdentifiers(rows, identifier), identifier, rules: evaluateRules(rows, rules), timeliness: dateColumn ? calculateTimeliness(rows, dateColumn, thresholdDays) : undefined, createdAt: new Date().toISOString() };
}
