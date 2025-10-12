import type { BlockStatement } from '../types.js';

export interface SplitResult {
  attributes: Record<string, unknown>;
  blocks: BlockStatement[];
}

export type BranchKind = 'yes' | 'no';

export interface QuestionBranchInfo {
  branchKind: BranchKind;
  branchStartId: string | null;
  branchEndId: string | null;
  defaultKind: BranchKind;
  direct: boolean;
  nextRaw?: string;
  nextResolved?: { full: string; base: string };
}

export interface ChoiceCaseRecord {
  id: string;
  label: string;
  kind: 'case' | 'else';
  branchStartId: string | null;
  branchEndId: string | null;
  direct: boolean;
  nextRaw?: string;
  nextResolved?: { full: string; base: string };
}
