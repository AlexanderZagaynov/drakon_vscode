import type { Selection } from 'd3';

export type TokenType =
  | 'identifier'
  | 'string'
  | 'number'
  | 'brace_open'
  | 'brace_close'
  | 'bracket_open'
  | 'bracket_close'
  | 'equals'
  | 'comma'
  | 'eof';

export interface Token {
  type: TokenType;
  value: string | number | null;
  line: number;
  column: number;
}

export interface AttributeStatement {
  type: 'attribute';
  key: string;
  value: unknown;
}

export interface BlockStatement {
  type: 'block';
  name: string;
  labels: string[];
  body: Statement[];
}

export type Statement = AttributeStatement | BlockStatement;

export interface DiagramAttachment {
  type: string;
  id: string;
  target: string;
  attributes: Record<string, unknown>;
}

export interface DiagramNote {
  text: string;
  placement: string;
  attachesTo: string | null;
}

export interface DiagramEdge {
  from: string;
  to: string;
  kind: string;
  label: string;
  note: string;
  handle: string;
  attributes: Record<string, unknown>;
  fromBase?: string;
  toBase?: string;
}

export interface DiagramNode {
  id: string;
  type: string;
  lane: string;
  label: string;
  attributes: Record<string, unknown>;
  block: BlockStatement;
  geometry?: NodeGeometry;
}

export interface Lane {
  id: string;
  title: string;
  tags: string[];
  nodes: DiagramNode[];
  raw: BlockStatement;
  implicit: boolean;
}

export interface Diagram {
  title: string;
  metadata: Record<string, unknown>;
  lanes: Lane[];
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  attachments: DiagramAttachment[];
  notes: DiagramNote[];
}

export type DrawFunction = (
  group: Selection<SVGGElement, unknown, null, undefined>,
  width: number,
  height: number,
  node: DiagramNode
) => void;

export interface NodeSpec {
  width?: number;
  minHeight?: number;
  textPaddingTop?: number;
  textPaddingBottom?: number;
  textPaddingLeft?: number;
  textPaddingRight?: number;
  lineHeight?: number;
  draw: DrawFunction;
  textBaseline?: 'top' | 'center';
  textYOffset?: number;
  baseWidth?: number;
  dynamicHeight?: boolean;
  textAlign?: 'left' | 'center' | 'right';
}

export interface NodeGeometry {
  width: number;
  height: number;
  lines: number;
  lineHeight: number;
  textYOffset: number;
  spec: NodeSpec;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  wrappedLines: string[];
}

export interface LayoutConfig {
  laneGap: number;
  lanePadding: number;
  laneTopMargin: number;
  laneBottomMargin: number;
  laneLeftMargin: number;
  laneSpacing: number;
}

export interface LaneNodeEntry {
  node: DiagramNode;
  order: number;
}

export interface LaneLayout {
  id: string;
  title: string;
  x: number;
  width: number;
  implicit: boolean;
  nodes: LaneNodeEntry[];
  totalHeight?: number;
  innerTop?: number;
  innerBottom?: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface LayoutResult {
  width: number;
  height: number;
  lanes: LaneLayout[];
  positions: Map<string, Point>;
}
