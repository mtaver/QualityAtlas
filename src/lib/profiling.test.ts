import { describe, expect, it } from 'vitest';
import { calculateTimeliness, createProfile, evaluateRules } from './profiling';

const rows = [
  { id: 1, email: 'a@example.com', score: 10, updated: '2026-10-20' },
  { id: 2, email: '', score: 200, updated: '2026-08-01' },
  { id: 2, email: '', score: 200, updated: '2026-08-01' }
];

describe('profiling', () => {
  it('uses all rows as the completeness denominator', () => {
    const profile = createProfile('known.csv', rows, 'id');
    expect(profile.columns.find(c => c.name === 'email')?.completeness).toBeCloseTo(1 / 3);
    expect(profile.duplicateRows).toEqual([2, 3]);
    expect(profile.duplicateIdentifierRows).toEqual([2, 3]);
  });
  it('reports affected 1-based data rows for rules', () => {
    const [result] = evaluateRules(rows, [{ id: 'score-range', column: 'score', kind: 'range', min: 0, max: 100 }]);
    expect(result.passed).toBe(1); expect(result.denominator).toBe(3); expect(result.affectedRows).toEqual([2, 3]);
  });
  it('calculates current, stale and invalid dates explicitly', () => {
    const result = calculateTimeliness([...rows, { id: 4, email: 'x', score: 1, updated: 'bad' }], 'updated', 30, new Date('2026-10-26T00:00:00Z'));
    expect(result.currentRows).toBe(1); expect(result.staleRows).toEqual([2, 3]); expect(result.invalidRows).toEqual([4]);
  });
});
