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
