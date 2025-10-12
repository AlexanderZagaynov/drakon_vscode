import type { BlockStatement, Diagram, DiagramNode } from '../types.js';
import type { ChoiceCaseRecord, QuestionBranchInfo } from './models.js';

export interface DiagramBuildContext {
  readonly errors: string[];
  readonly diagram: Diagram;
  readonly aliasMap: Map<string, string>;
  readonly nodeById: Map<string, DiagramNode>;
  readonly columnNodes: Map<number, DiagramNode[]>;
  readonly laneColumn: Map<string, number>;
  readonly questionBranchInfo: Map<string, QuestionBranchInfo>;
  readonly choiceCaseRecords: Array<ChoiceCaseRecord & { choiceId: string }>;
  readonly choiceNextRecords: Array<{ choiceId: string; nextRaw: string }>;
  readonly explicitEdgeSet: Set<string>;
  startNode: DiagramNode | null;
  diagramAnchorBase: string;
  primaryColumn: number;
  MAIN_COLUMN: number;
  hasExplicitLane: boolean;
  primaryColumnInitialized: boolean;
  allocateColumn(): number;
  ensureColumn(column: number): void;
  registerNode(column: number, node: DiagramNode, position?: 'append' | 'prepend'): boolean;
  createColumnNode(column: number, block: BlockStatement): DiagramNode | null;
  registerAlias(rawAlias: string | undefined, id: string): void;
  ensureColumnForLane(id: string): number;
  resolveReference(value: unknown, description: string): { full: string; base: string } | null;
}
