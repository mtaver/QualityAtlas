import { describe, expect, it } from 'vitest';
import { compareDatasets } from './comparison';
import type { ColumnMapping, DatasetSource } from '../types';

const source = (name: string, rows: Record<string, string>[]): DatasetSource => ({ name, worksheet: 'Sheet1', rows, columns: Object.keys(rows[0] || {}) });

describe('reference comparison', () => {
  it('separates matches, mismatches, blanks, unmatched records, and ID issues', () => {
    const target = source('target.csv', [
      { id:'001', name:' Alice ', score:'10', blank:'' }, { id:'002', name:'Bob', score:'12', blank:'' },
      { id:'003', name:'Cara', score:'8', blank:'x' }, { id:'004', name:'Dan', score:'7', blank:'x' },
      { id:'', name:'Missing', score:'1', blank:'x' }, { id:'006', name:'Dup', score:'1', blank:'x' }, { id:'006', name:'Dup', score:'1', blank:'x' }
    ]);
    const reference = source('reference.xlsx', [
      { ref_id:'001', full_name:'alice', score_ref:'10.5', blank_ref:'' }, { ref_id:'002', full_name:'Bobby', score_ref:'12.6', blank_ref:'' },
      { ref_id:'003', full_name:'Cara', score_ref:'8', blank_ref:'' }, { ref_id:'', full_name:'Missing', score_ref:'1', blank_ref:'x' },
      { ref_id:'006', full_name:'Dup', score_ref:'1', blank_ref:'x' }, { ref_id:'006', full_name:'Dup2', score_ref:'1', blank_ref:'x' }
    ]);
    const mappings: ColumnMapping[] = [
      { targetColumn:'name', referenceColumn:'full_name', rule:{ mode:'exact', trim:true, caseInsensitive:true } },
      { targetColumn:'score', referenceColumn:'score_ref', rule:{ mode:'number', tolerance:.5 } },
      { targetColumn:'blank', referenceColumn:'blank_ref', rule:{ mode:'exact' } }
    ];
    const report = compareDatasets(target, reference, 'id', 'ref_id', mappings, new Date('2026-10-27T00:00:00Z'));
    expect(report.matches).toBe(4); // 001 name+score boundary, 002 name mismatch+score mismatch, 003 name+score
    expect(report.comparable).toBe(6);
    expect(report.totalTargetCells).toBe(21);
    expect(report.details.filter(d => d.outcome === 'missing-target')).toHaveLength(2);
    expect(report.unmatchedTargetRows).toEqual([4]);
    expect(report.missingTargetIdentifierRows).toEqual([5]);
    expect(report.duplicateTargetIdentifiers[0]).toEqual({ identifier:'006', rows:[6,7] });
    expect(report.duplicateReferenceIdentifiers[0]).toEqual({ identifier:'006', rows:[5,6] });
    expect(report.details.some(d => d.identifier === '001')).toBe(true); // blank/blank is excluded, never matched
  });

  it('preserves leading-zero identifiers and applies tolerance inclusively', () => {
    const report = compareDatasets(source('t.csv',[{id:'001',v:'10'}]), source('r.csv',[{id:'001',v:'10.5'},{id:'1',v:'99'}]), 'id','id',[{targetColumn:'v',referenceColumn:'v',rule:{mode:'number',tolerance:.5}}]);
    expect(report.matches).toBe(1); expect(report.comparable).toBe(1); expect(report.unmatchedTargetRows).toEqual([]);
  });

  it('flags ambiguous dates and reports N/A accuracy when nothing is comparable', () => {
    const report = compareDatasets(source('t.csv',[{id:'01',date:'01/02/2025'}]), source('r.csv',[{id:'01',date:'01/02/2025'}]), 'id','id',[{targetColumn:'date',referenceColumn:'date',rule:{mode:'date',dateFormat:'auto'}}]);
    expect(report.accuracy).toBeNull(); expect(report.comparable).toBe(0); expect(report.details[0].outcome).toBe('ambiguous-date');
  });
});
