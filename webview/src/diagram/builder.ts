import type { BlockStatement, Diagram, DiagramEdge, DiagramNode, Statement } from '../types.js';
import { buildParametersNode } from './parameters.js';
import { processChoiceCases } from './choices.js';
import { processQuestionBranches } from './questions.js';
import type { ChoiceCaseRecord, QuestionBranchInfo } from './models.js';
import { deriveLabel, splitStatements } from './utils.js';
import { handleAttachment, handleLine, handleNote } from './attachments.js';
import { ensureEndNodes, ensureStartNode, processForEachBody } from './nodes.js';
import {
  buildChoiceEdges,
  buildQuestionEdges,
  connectImplicitColumnEdges,
  finalizeEdgeAnchors,
  resolveChoiceNextTargets,
  resolveQuestionNextTargets
} from './edges.js';
import type { DiagramBuildContext } from './context.js';

export class DiagramBuilder implements DiagramBuildContext {
  public readonly errors: string[];
  public readonly diagram: Diagram;
  public readonly aliasMap = new Map<string, string>();
  public readonly nodeById = new Map<string, DiagramNode>();
  public readonly columnNodes = new Map<number, DiagramNode[]>();
  public readonly laneColumn = new Map<string, number>();
  public readonly questionBranchInfo = new Map<string, QuestionBranchInfo>();
  public readonly choiceCaseRecords: Array<ChoiceCaseRecord & { choiceId: string }> = [];
  public readonly choiceNextRecords: Array<{ choiceId: string; nextRaw: string }> = [];
  public readonly explicitEdgeSet = new Set<string>();

  private nextColumnIndex = 0;
  public MAIN_COLUMN = 0;
  public primaryColumn = 0;
  public primaryColumnInitialized = false;
  public hasExplicitLane = false;
  public diagramAnchorBase = '';
  public startNode: DiagramNode | null = null;

  constructor(errors: string[]) {
    this.errors = errors;
    this.diagram = {
      title: '',
      metadata: {},
      nodes: [],
      edges: [],
      attachments: [],
      notes: []
    };
  }

  public build(statements: Statement[]): Diagram | null {
    const root = this.findRoot(statements);
    if (!root) {
      this.errors.push('No `drakon` block found. Define the diagram first.');
      return null;
    }

    const diagramIdLabel = root.labels[0] ?? 'diagram';
    this.diagramAnchorBase = diagramIdLabel.replace(/\s+/g, '_');

    this.MAIN_COLUMN = this.allocateColumn();
    this.primaryColumn = this.MAIN_COLUMN;

    const rootParts = splitStatements(root.body);
    const metadata: Record<string, unknown> = { ...rootParts.attributes };
    const parametersConfig = metadata.parameters;
    delete metadata.parameters;
    this.diagram.metadata = metadata;
    const rawTitle =
      typeof metadata.title === 'string' && metadata.title.trim().length
        ? (metadata.title as string)
        : root.labels[0] ?? 'Diagram';
    this.diagram.title = rawTitle.trim() || 'Diagram';
    const implicitStartLabel = this.diagram.title;

    const pendingLines: BlockStatement[] = [];
    const pendingAttachments: BlockStatement[] = [];
    const pendingNotes: BlockStatement[] = [];

    rootParts.blocks.forEach((block) => {
      if (block.name === 'lane') {
        const laneId = block.labels[0] ?? `lane_${this.laneColumn.size + 1}`;
        const laneParts = splitStatements(block.body);
        const column = this.ensureColumnForLane(laneId);
        if (!this.primaryColumnInitialized) {
          this.primaryColumn = column;
          this.primaryColumnInitialized = true;
        }
        laneParts.blocks.forEach((child) => {
          if (child.name === 'line' || child.name === 'attach' || child.name === 'note') {
            this.errors.push(`Block "${child.name}" is not supported within lane "${laneId}". Move it to the diagram root.`);
            return;
          }
          this.createColumnNode(column, child);
        });
      } else if (block.name === 'line') {
        pendingLines.push(block);
      } else if (block.name === 'attach') {
        pendingAttachments.push(block);
      } else if (block.name === 'note') {
        pendingNotes.push(block);
      } else {
        if (!this.primaryColumnInitialized) {
          this.primaryColumnInitialized = true;
        }
        this.createColumnNode(this.primaryColumn, block);
      }
    });

  ensureStartNode(this, implicitStartLabel);

    let parametersEdge: DiagramEdge | null = null;
    if (parametersConfig !== undefined && parametersConfig !== null && this.startNode) {
      const parametersColumn = this.allocateColumn();
      const candidate = buildParametersNode(parametersColumn, parametersConfig, this.diagramAnchorBase);
      if (candidate && this.registerNode(parametersColumn, candidate)) {
        this.registerAlias('parameters', candidate.id);
        parametersEdge = {
          from: this.startNode.id,
          to: candidate.id,
          kind: 'main',
          label: '',
          note: '',
          handle: '',
          attributes: { implicit: true, role: 'parameters' },
          fromBase: this.startNode.id,
          toBase: candidate.id
        };
      }
    }

    ensureEndNodes(this);

    pendingAttachments.forEach((block) => handleAttachment(this, block));
    pendingNotes.forEach((block) => handleNote(this, block));

    if (parametersEdge) {
      this.diagram.edges.push(parametersEdge);
      this.explicitEdgeSet.add(`${parametersEdge.fromBase}>${parametersEdge.toBase}`);
    }

    pendingLines.forEach((block) => handleLine(this, block));

    resolveQuestionNextTargets(this);
    const choiceNextResolved = resolveChoiceNextTargets(this);
    const choiceCaseInfo = d3.group(this.choiceCaseRecords, (record) => record.choiceId);

    connectImplicitColumnEdges(this);

    const defaultEndId = this.aliasMap.get('end') ?? this.diagram.nodes.find((node) => node.type === 'end')?.id ?? null;
    buildQuestionEdges(this, defaultEndId);
    buildChoiceEdges(this, choiceCaseInfo, choiceNextResolved, defaultEndId);

    finalizeEdgeAnchors(this);

    return this.diagram;
  }

  public ensureColumn(column: number): void {
    if (!this.columnNodes.has(column)) {
      this.columnNodes.set(column, []);
    }
  }

  public allocateColumn(): number {
    const column = this.nextColumnIndex;
    this.nextColumnIndex += 1;
    this.ensureColumn(column);
    return column;
  }

  public registerNode(column: number, node: DiagramNode, position: 'append' | 'prepend' = 'append'): boolean {
    if (this.nodeById.has(node.id)) {
      this.errors.push(`Duplicate node id "${node.id}".`);
      return false;
    }
    this.ensureColumn(column);
    node.column = column;
    if (position === 'prepend') {
      this.columnNodes.get(column)?.unshift(node);
      this.diagram.nodes.unshift(node);
    } else {
      this.columnNodes.get(column)?.push(node);
      this.diagram.nodes.push(node);
    }
    this.nodeById.set(node.id, node);
    this.registerAlias(node.id, node.id);
    node.block.labels.forEach((label) => this.registerAlias(label, node.id));
    const anchorAttr = typeof node.attributes.anchor === 'string' ? node.attributes.anchor.trim() : '';
    if (anchorAttr) {
      this.registerAlias(anchorAttr, node.id);
    }
    return true;
  }

  public createColumnNode(column: number, block: BlockStatement): DiagramNode | null {
    const disallowedInLane = new Set(['start', 'end', 'parameters', 'silhouette_loop', 'loop_silhouette']);
    if (disallowedInLane.has(block.name)) {
      if (block.name === 'parameters') {
        this.errors.push('Define parameters inside the `drakon` block using `parameters = { ... }` instead of a standalone block.');
      } else if (block.name === 'silhouette_loop' || block.name === 'loop_silhouette') {
        this.errors.push('The silhouette loop icon is managed by the renderer and cannot appear directly inside a lane.');
      } else {
        this.errors.push(`Block "${block.name}" is implicit. Remove the explicit definition.`);
      }
      return null;
    }
    const nodeParts = splitStatements(block.body);
    const fallbackId = block.labels[0] ?? `${block.name}_${(this.columnNodes.get(column)?.length ?? 0) + 1}`;
    if (!fallbackId) {
      this.errors.push(`Unable to derive id for block "${block.name}" in column ${column}.`);
      return null;
    }
    if (this.nodeById.has(fallbackId)) {
      this.errors.push(`Duplicate node id "${fallbackId}".`);
      return null;
    }
    const label = deriveLabel(nodeParts.attributes, fallbackId);
    const node: DiagramNode = {
      id: fallbackId,
      type: block.name,
      column,
      label,
      attributes: nodeParts.attributes,
      block
    };
    if (!this.registerNode(column, node)) {
      return null;
    }
    const anchorAttr = typeof nodeParts.attributes.anchor === 'string' ? nodeParts.attributes.anchor.trim() : '';
    if (anchorAttr) {
      this.registerAlias(anchorAttr, node.id);
    }
    if (block.name === 'question') {
      processQuestionBranches(this, column, node, nodeParts.attributes);
    } else if (block.name === 'choice') {
      processChoiceCases(this, column, node, nodeParts.attributes, nodeParts.blocks ?? []);
    } else if (block.name === 'for_each') {
      processForEachBody(this, column, node, nodeParts.blocks ?? []);
    }
    return node;
  }

  public registerAlias(rawAlias: string | undefined, id: string): void {
    if (!rawAlias) {
      return;
    }
    const alias = rawAlias.trim();
    if (!alias) {
      return;
    }
    const existing = this.aliasMap.get(alias);
    if (existing && existing !== id) {
      return;
    }
    this.aliasMap.set(alias, id);
  }

  public ensureColumnForLane(id: string): number {
    if (this.laneColumn.has(id)) {
      return this.laneColumn.get(id) ?? this.MAIN_COLUMN;
    }
    const column = this.hasExplicitLane ? this.allocateColumn() : this.primaryColumn;
    this.hasExplicitLane = true;
    this.laneColumn.set(id, column);
    return column;
  }

  public resolveReference(
    value: unknown,
    description: string
  ): { full: string; base: string } | null {
    if (typeof value !== 'string' || !value.trim()) {
      this.errors.push(`${description} must be a non-empty string.`);
      return null;
    }
    const raw = value.trim();
    const direct = this.aliasMap.get(raw);
    if (direct) {
      if (!this.nodeById.has(direct)) {
        this.errors.push(`${description} refers to unknown node "${raw}".`);
        return null;
      }
      return { full: direct, base: direct };
    }
    const atIndex = raw.indexOf('@');
    if (atIndex === -1) {
      if (!this.nodeById.has(raw)) {
        this.errors.push(`${description} refers to unknown node "${raw}".`);
        return null;
      }
      this.registerAlias(raw, raw);
      return { full: raw, base: raw };
    }
    const head = raw.slice(0, atIndex);
    const suffix = raw.slice(atIndex);
    const resolvedHead = this.aliasMap.get(head) ?? head;
    if (!this.nodeById.has(resolvedHead)) {
      this.errors.push(`${description} refers to unknown node "${head}".`);
      return null;
    }
    return { full: `${resolvedHead}${suffix}`, base: resolvedHead };
  }

  private findRoot(statements: Statement[]): BlockStatement | undefined {
    return statements.find((statement) => statement.type === 'block' && statement.name === 'drakon') as
      | BlockStatement
      | undefined;
  }
}
