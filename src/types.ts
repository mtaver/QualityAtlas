export type Cell = string | number | boolean | Date | null;
export type Row = Record<string, Cell>;

export type ColumnProfile = {
  name: string;
  inferredType: string;
  nonMissing: number;
  missing: number;
  completeness: number;
  unique: number;
  inconsistentRows: number[];
  examples: string[];
};

export type Rule = {
  id: string;
  column: string;
  kind: 'required' | 'regex' | 'range' | 'allowed';
  value?: string;
  min?: number;
  max?: number;
};

export type RuleResult = Rule & { passed: number; denominator: number; affectedRows: number[] };

export type Profile = {
  name: string;
  rows: Row[];
  columns: ColumnProfile[];
  duplicateRows: number[];
  duplicateIdentifierRows: number[];
  identifier?: string;
  rules: RuleResult[];
  timeliness?: { column: string; thresholdDays: number; currentRows: number; denominator: number; staleRows: number[]; invalidRows: number[] };
  createdAt: string;
};

export type Finding = {
  id: string;
  source: 'document' | 'ai';
  kind: 'metric' | 'definition' | 'result' | 'target';
  title: string;
  quote: string;
  page?: number;
  status: 'pending' | 'approved';
};

export type DocumentRecord = { id: string; name: string; pages: string[]; scanned: boolean; findings: Finding[] };

export type DatasetSource = { name: string; worksheet: string; rows: Row[]; columns: string[] };
export type ComparisonRule = {
  mode: 'exact' | 'number' | 'date';
  trim?: boolean;
  caseInsensitive?: boolean;
  tolerance?: number;
  dateFormat?: 'auto' | 'iso' | 'dmy' | 'mdy';
};
export type ColumnMapping = { targetColumn: string; referenceColumn: string; rule: ComparisonRule };
export type ComparisonDetail = {
  targetRow: number;
  referenceRow?: number;
  identifier: string;
  targetColumn: string;
  referenceColumn: string;
  targetValue: Cell;
  referenceValue: Cell;
  outcome: 'mismatch' | 'missing-target' | 'missing-reference' | 'ambiguous-date' | 'invalid-value';
  rule: string;
};
export type ComparisonColumnResult = {
  targetColumn: string;
  referenceColumn: string;
  matches: number;
  comparable: number;
  totalTargetCells: number;
  excluded: number;
  accuracy: number | null;
  coverage: number;
};
export type ComparisonReport = {
  id: string;
  targetName: string;
  targetWorksheet: string;
  referenceName: string;
  referenceWorksheet: string;
  targetIdentifier: string;
  referenceIdentifier: string;
  mappings: ColumnMapping[];
  comparedAt: string;
  matches: number;
  comparable: number;
  totalTargetCells: number;
  excluded: number;
  accuracy: number | null;
  coverage: number;
  columns: ComparisonColumnResult[];
  details: ComparisonDetail[];
  unmatchedTargetRows: number[];
  missingTargetIdentifierRows: number[];
  missingReferenceIdentifierRows: number[];
  duplicateTargetIdentifiers: { identifier: string; rows: number[] }[];
  duplicateReferenceIdentifiers: { identifier: string; rows: number[] }[];
  approved: boolean;
};
