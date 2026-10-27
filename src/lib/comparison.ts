import type { Cell, ColumnMapping, ComparisonDetail, ComparisonReport, DatasetSource, Row } from '../types';

const blank = (value: Cell) => value === null || value === undefined || String(value).trim() === '';
const idText = (value: Cell) => blank(value) ? '' : String(value);

function idIndex(rows: Row[], column: string) {
  const missing: number[] = []; const groups = new Map<string, number[]>();
  rows.forEach((row, index) => {
    const id = idText(row[column]);
    if (!id) missing.push(index + 1);
    else groups.set(id, [...(groups.get(id) || []), index + 1]);
  });
  const duplicates = [...groups.entries()].filter(([, indices]) => indices.length > 1).map(([identifier, indices]) => ({ identifier, rows: indices }));
  return { missing, groups, duplicates, duplicateIds: new Set(duplicates.map(d => d.identifier)) };
}

export function describeRule(mapping: ColumnMapping): string {
  const { rule } = mapping;
  if (rule.mode === 'number') return `numeric ±${rule.tolerance || 0}`;
  if (rule.mode === 'date') return `date (${rule.dateFormat || 'auto'})`;
  return `exact${rule.trim ? ', trim' : ''}${rule.caseInsensitive ? ', case-insensitive' : ''}`;
}

function parseDate(value: Cell, format: NonNullable<ColumnMapping['rule']['dateFormat']>) {
  const text = String(value).trim();
  let y: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(text);
  if (iso) [y, m, d] = [+iso[1], +iso[2], +iso[3]];
  else {
    const slash = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(text);
    if (!slash) return { valid: false, ambiguous: false, value: 0 };
    const a = +slash[1], b = +slash[2]; y = +slash[3];
    if (format === 'auto' && a <= 12 && b <= 12) return { valid: false, ambiguous: true, value: 0 };
    if (format === 'iso') return { valid: false, ambiguous: false, value: 0 };
    if (format === 'mdy' || (format === 'auto' && a <= 12)) { m = a; d = b; } else { d = a; m = b; }
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  const valid = date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  return { valid, ambiguous: false, value: date.getTime() };
}

function compareValues(target: Cell, reference: Cell, mapping: ColumnMapping) {
  if (blank(target)) return { comparable: false, match: false, outcome: 'missing-target' as const };
  if (blank(reference)) return { comparable: false, match: false, outcome: 'missing-reference' as const };
  if (mapping.rule.mode === 'number') {
    const a = Number(target), b = Number(reference);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return { comparable: false, match: false, outcome: 'invalid-value' as const };
    return { comparable: true, match: Math.abs(a - b) <= Math.max(0, mapping.rule.tolerance || 0), outcome: 'mismatch' as const };
  }
  if (mapping.rule.mode === 'date') {
    const format = mapping.rule.dateFormat || 'auto'; const a = parseDate(target, format), b = parseDate(reference, format);
    if (a.ambiguous || b.ambiguous) return { comparable: false, match: false, outcome: 'ambiguous-date' as const };
    if (!a.valid || !b.valid) return { comparable: false, match: false, outcome: 'invalid-value' as const };
    return { comparable: true, match: a.value === b.value, outcome: 'mismatch' as const };
  }
  let a = String(target), b = String(reference);
  if (mapping.rule.trim) { a = a.trim(); b = b.trim(); }
  if (mapping.rule.caseInsensitive) { a = a.toLocaleLowerCase(); b = b.toLocaleLowerCase(); }
  return { comparable: true, match: a === b, outcome: 'mismatch' as const };
}

export function compareDatasets(target: DatasetSource, reference: DatasetSource, targetIdentifier: string, referenceIdentifier: string, mappings: ColumnMapping[], now = new Date()): ComparisonReport {
  if (!targetIdentifier || !referenceIdentifier) throw new Error('Select both identifier columns.');
  if (!mappings.length) throw new Error('Map at least one column.');
  const ti = idIndex(target.rows, targetIdentifier), ri = idIndex(reference.rows, referenceIdentifier);
  const details: ComparisonDetail[] = [], unmatchedTargetRows: number[] = [];
  const columnCounters = mappings.map(() => ({ matches: 0, comparable: 0 }));
  target.rows.forEach((targetRow, targetIndex) => {
    const id = idText(targetRow[targetIdentifier]);
    if (!id || ti.duplicateIds.has(id)) return;
    const referenceRows = ri.groups.get(id);
    if (!referenceRows?.length) { unmatchedTargetRows.push(targetIndex + 1); return; }
    if (referenceRows.length !== 1 || ri.duplicateIds.has(id)) return;
    const referenceIndex = referenceRows[0]; const referenceRow = reference.rows[referenceIndex - 1];
    mappings.forEach((mapping, mappingIndex) => {
      const targetValue = targetRow[mapping.targetColumn], referenceValue = referenceRow[mapping.referenceColumn];
      const result = compareValues(targetValue, referenceValue, mapping);
      if (result.comparable) { columnCounters[mappingIndex].comparable++; if (result.match) columnCounters[mappingIndex].matches++; }
      if (!result.match) details.push({ targetRow: targetIndex + 1, referenceRow: referenceIndex, identifier: id, targetColumn: mapping.targetColumn, referenceColumn: mapping.referenceColumn, targetValue, referenceValue, outcome: result.outcome, rule: describeRule(mapping) });
    });
  });
  const totalTargetCells = target.rows.length * mappings.length;
  const columns = mappings.map((mapping, i) => ({ targetColumn: mapping.targetColumn, referenceColumn: mapping.referenceColumn, matches: columnCounters[i].matches, comparable: columnCounters[i].comparable, totalTargetCells: target.rows.length, excluded: target.rows.length - columnCounters[i].comparable, accuracy: columnCounters[i].comparable ? columnCounters[i].matches / columnCounters[i].comparable : null, coverage: target.rows.length ? columnCounters[i].comparable / target.rows.length : 0 }));
  const matches = columns.reduce((sum, c) => sum + c.matches, 0), comparable = columns.reduce((sum, c) => sum + c.comparable, 0);
  return { id: crypto.randomUUID(), targetName: target.name, targetWorksheet: target.worksheet, referenceName: reference.name, referenceWorksheet: reference.worksheet, targetIdentifier, referenceIdentifier, mappings, comparedAt: now.toISOString(), matches, comparable, totalTargetCells, excluded: totalTargetCells - comparable, accuracy: comparable ? matches / comparable : null, coverage: totalTargetCells ? comparable / totalTargetCells : 0, columns, details, unmatchedTargetRows, missingTargetIdentifierRows: ti.missing, missingReferenceIdentifierRows: ri.missing, duplicateTargetIdentifiers: ti.duplicates, duplicateReferenceIdentifiers: ri.duplicates, approved: false };
}

export function reportToDiscrepancyCsv(report: ComparisonReport) {
  const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const header = ['target_row','reference_row','identifier','target_column','reference_column','target_value','reference_value','outcome','rule'];
  return [header.map(quote).join(','), ...report.details.map(d => [d.targetRow,d.referenceRow ?? '',d.identifier,d.targetColumn,d.referenceColumn,d.targetValue ?? '',d.referenceValue ?? '',d.outcome,d.rule].map(quote).join(','))].join('\n');
}
