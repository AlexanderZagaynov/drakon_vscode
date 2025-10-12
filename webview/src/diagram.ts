import type { Diagram, Statement, BlockStatement, DiagramNode, DiagramEdge, AttributeStatement } from './types.js';
import { baseAnchor, normalizeMultilineText } from './shared.js';

interface SplitResult {
  attributes: Record<string, unknown>;
  blocks: BlockStatement[];
}

type BranchKind = 'yes' | 'no';

interface QuestionBranchInfo {
  branchKind: BranchKind;
  branchStartId: string | null;
  branchEndId: string | null;
  defaultKind: BranchKind;
  direct: boolean;
  nextRaw?: string;
  nextResolved?: { full: string; base: string };
}

interface ChoiceCaseRecord {
  id: string;
  label: string;
  kind: 'case' | 'else';
  branchStartId: string | null;
  branchEndId: string | null;
  direct: boolean;
  nextRaw?: string;
  nextResolved?: { full: string; base: string };
}

function splitStatements(items: Statement[]): SplitResult {
  const grouped = Map.groupBy(items, (item) => item.type);
  const attributesEntries =
    (grouped.get('attribute') as AttributeStatement[] | undefined)?.map(({ key, value }) => [key, value]) ?? [];
  const attributes = Object.fromEntries(attributesEntries);
  const blocks = (grouped.get('block') as BlockStatement[] | undefined) ?? [];
  return { attributes, blocks };
}

function deriveLabel(attributes: Record<string, unknown>, fallback: string): string {
  if (typeof attributes.text === 'string') {
    return attributes.text;
  }
  if (Array.isArray(attributes.lines) && attributes.lines.length) {
    return attributes.lines.map((value) => String(value)).join('\n');
  }
  return fallback;
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }
  if (typeof value === 'string') {
    return [value];
  }
  return [];
}

function formatParameterScalar(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => formatParameterScalar(entry)).join(', ')}]`;
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function buildDiagram(statements: Statement[], errors: string[]): Diagram | null {
  const root = statements.find((statement) => statement.type === 'block' && statement.name === 'drakon') as
    | BlockStatement
    | undefined;
  if (!root) {
    errors.push('No `drakon` block found. Define the diagram first.');
    return null;
  }

  const diagramIdLabel = root.labels[0] ?? 'diagram';
  const diagramAnchorBase = diagramIdLabel.replace(/\s+/g, '_');

  const diagram: Diagram = {
    title: '',
    metadata: {},
    nodes: [],
    edges: [],
    attachments: [],
    notes: []
  };

  const aliasMap = new Map<string, string>();
  const nodeById = new Map<string, DiagramNode>();
  const columnNodes = new Map<number, DiagramNode[]>();
  const laneColumn = new Map<string, number>();
  const questionBranchInfo = new Map<string, QuestionBranchInfo>();
  const choiceCaseRecords: Array<ChoiceCaseRecord & { choiceId: string }> = [];
  const choiceNextRecords: Array<{ choiceId: string; nextRaw: string }> = [];
  let nextColumnIndex = 0;

  const ensureColumn = (column: number) => {
    if (!columnNodes.has(column)) {
      columnNodes.set(column, []);
    }
  };

  const allocateColumn = (): number => {
    const column = nextColumnIndex;
    nextColumnIndex += 1;
    ensureColumn(column);
    return column;
  };

  const MAIN_COLUMN = allocateColumn();
  let primaryColumn = MAIN_COLUMN;
  let primaryColumnInitialized = false;
  let hasExplicitLane = false;

  const toStatementArray = (value: unknown): Statement[] | null => {
    if (!Array.isArray(value)) {
      return null;
    }
    const statements: Statement[] = [];
    for (const entry of value) {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const candidate = entry as Statement;
      if (candidate.type !== 'attribute' && candidate.type !== 'block') {
        return null;
      }
      statements.push(candidate);
    }
    return statements;
  };

  const registerAlias = (rawAlias: string | undefined, id: string) => {
    if (!rawAlias) {
      return;
    }
    const alias = rawAlias.trim();
    if (!alias) {
      return;
    }
    const existing = aliasMap.get(alias);
    if (existing && existing !== id) {
      return;
    }
    aliasMap.set(alias, id);
  };

  const registerNode = (column: number, node: DiagramNode, position: 'append' | 'prepend' = 'append') => {
    if (nodeById.has(node.id)) {
      errors.push(`Duplicate node id "${node.id}".`);
      return false;
    }
    ensureColumn(column);
    node.column = column;
    if (position === 'prepend') {
      columnNodes.get(column)?.unshift(node);
      diagram.nodes.unshift(node);
    } else {
      columnNodes.get(column)?.push(node);
      diagram.nodes.push(node);
    }
    nodeById.set(node.id, node);
    registerAlias(node.id, node.id);
    node.block.labels.forEach((label) => registerAlias(label, node.id));
    const anchorAttr = typeof node.attributes.anchor === 'string' ? node.attributes.anchor.trim() : '';
    if (anchorAttr) {
      registerAlias(anchorAttr, node.id);
    }
    return true;
  };

  const ensureColumnForLane = (id: string): number => {
    if (laneColumn.has(id)) {
      return laneColumn.get(id) ?? MAIN_COLUMN;
    }
    const column = hasExplicitLane ? allocateColumn() : primaryColumn;
    hasExplicitLane = true;
    laneColumn.set(id, column);
    return column;
  };

  function createColumnNode(column: number, block: BlockStatement): DiagramNode | null {
    const disallowedInLane = new Set(['start', 'end', 'parameters', 'silhouette_loop', 'loop_silhouette']);
    if (disallowedInLane.has(block.name)) {
      if (block.name === 'parameters') {
        errors.push('Define parameters inside the `drakon` block using `parameters = { ... }` instead of a standalone block.');
      } else if (block.name === 'silhouette_loop' || block.name === 'loop_silhouette') {
        errors.push('The silhouette loop icon is managed by the renderer and cannot appear directly inside a lane.');
      } else {
        errors.push(`Block "${block.name}" is implicit. Remove the explicit definition.`);
      }
      return null;
    }
    const nodeParts = splitStatements(block.body);
    const fallbackId = block.labels[0] ?? `${block.name}_${(columnNodes.get(column)?.length ?? 0) + 1}`;
    if (!fallbackId) {
      errors.push(`Unable to derive id for block "${block.name}" in column ${column}.`);
      return null;
    }
    if (nodeById.has(fallbackId)) {
      errors.push(`Duplicate node id "${fallbackId}".`);
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
    if (!registerNode(column, node)) {
      return null;
    }
    const anchorAttr = typeof nodeParts.attributes.anchor === 'string' ? nodeParts.attributes.anchor.trim() : '';
    if (anchorAttr) {
      registerAlias(anchorAttr, node.id);
    }
    if (block.name === 'question') {
      processQuestionBranches(column, node, nodeParts.attributes);
    } else if (block.name === 'choice') {
      processChoiceCases(column, node, nodeParts.attributes, nodeParts.blocks ?? []);
    } else if (block.name === 'for_each') {
      processForEachBody(column, node, nodeParts.blocks ?? []);
    }
    return node;
  }

  function processQuestionBranches(column: number, node: DiagramNode, attributes: Record<string, unknown>): void {
    const yesStatements = toStatementArray(attributes.yes);
    const noStatements = toStatementArray(attributes.no);
    const nextAttr = typeof attributes.next === 'string' ? attributes.next.trim() : '';

    if (!yesStatements && !noStatements) {
      const branchLabel = 'No';
      questionBranchInfo.set(node.id, {
        branchKind: 'no',
        branchStartId: null,
        branchEndId: null,
        defaultKind: 'yes',
        direct: true,
        nextRaw: nextAttr || undefined
      });
      attributes.no = {
        direct: true,
        label: branchLabel
      };
      return;
    }

    const branches: { kind: BranchKind; statements: Statement[] }[] = [];
    if (yesStatements) {
      if (yesStatements.length) {
        branches.push({ kind: 'yes', statements: yesStatements });
      } else {
        errors.push(`Question "${node.id}" branch "yes" must include at least one block.`);
      }
    }
    if (noStatements) {
      if (noStatements.length) {
        branches.push({ kind: 'no', statements: noStatements });
      } else {
        errors.push(`Question "${node.id}" branch "no" must include at least one block.`);
      }
    }

    if (!branches.length) {
      return;
    }

    if (branches.length > 1) {
      errors.push(`Question "${node.id}" cannot define both "yes" and "no" branch blocks. Choose one explicit branch.`);
      return;
    }

    const branch = branches[0];
    const branchParts = splitStatements(branch.statements);
    const branchBlocks = branchParts.blocks;

    if (!branchBlocks.length) {
      const branchLabel = branch.kind === 'yes' ? 'Yes' : 'No';
      questionBranchInfo.set(node.id, {
        branchKind: branch.kind,
        branchStartId: null,
        branchEndId: null,
        defaultKind: branch.kind === 'yes' ? 'no' : 'yes',
        direct: true,
        nextRaw: nextAttr || undefined
      });
      attributes[branch.kind] = {
        direct: true,
        label: branchLabel
      };
      return;
    }

    const requestedColumn =
      typeof branchParts.attributes.column === 'number'
        ? (branchParts.attributes.column as number)
        : undefined;
    const branchColumn =
      requestedColumn !== undefined && Number.isFinite(requestedColumn) ? requestedColumn : allocateColumn();
    ensureColumn(branchColumn);

    const startIndex = columnNodes.get(branchColumn)?.length ?? 0;
    branchBlocks.forEach((child) => {
      if (child.name === 'line' || child.name === 'attach' || child.name === 'note') {
        errors.push(`Block "${child.name}" is not supported inside question branch "${branch.kind}" of "${node.id}".`);
        return;
      }
      createColumnNode(branchColumn, child);
    });

    const branchColumnNodes = columnNodes.get(branchColumn) ?? [];
    const createdNodes = branchColumnNodes.slice(startIndex);
    if (!createdNodes.length) {
      errors.push(`Question "${node.id}" branch "${branch.kind}" did not create any nodes.`);
      return;
    }

    const branchStart = createdNodes[0];
    const branchEnd = createdNodes[createdNodes.length - 1];

    const existingEdge = diagram.edges.some(
      (edge) => (edge.fromBase ?? edge.from) === node.id && (edge.toBase ?? edge.to) === branchStart.id
    );
    if (!existingEdge) {
      const branchLabel = branch.kind === 'yes' ? 'Yes' : 'No';
      diagram.edges.push({
        from: node.id,
        to: branchStart.id,
        kind: branch.kind,
        label: branchLabel,
        note: '',
        handle: '',
        attributes: { implicit: true, branch: branch.kind, branch_lane: true },
        fromBase: node.id,
        toBase: branchStart.id
      });
    }

    questionBranchInfo.set(node.id, {
      branchKind: branch.kind,
      branchStartId: branchStart.id,
      branchEndId: branchEnd.id,
      defaultKind: branch.kind === 'yes' ? 'no' : 'yes',
      direct: false,
      nextRaw: nextAttr || undefined
    });

    attributes[branch.kind] = {
      column: branchColumn,
      start: branchStart.id,
      end: branchEnd.id
    };
  }

  function processChoiceCases(
    column: number,
    node: DiagramNode,
    attributes: Record<string, unknown>,
    blocks: BlockStatement[]
  ): void {
    const nextAttr = typeof attributes.next === 'string' ? attributes.next.trim() : '';
    if (nextAttr) {
      choiceNextRecords.push({ choiceId: node.id, nextRaw: nextAttr });
    }

    const cases: ChoiceCaseRecord[] = [];

    blocks.forEach((block, index) => {
      if (block.name !== 'case' && block.name !== 'else') {
        createColumnNode(column, block);
        return;
      }

      const caseParts = splitStatements(block.body);
      const caseId = block.labels[0] ?? `${node.id}_${block.name}_${cases.length + 1}`;
      const caseLabel = deriveLabel(caseParts.attributes, caseId);
      const branchColumn = index === 0 ? column : allocateColumn();

      const caseNode: DiagramNode = {
        id: caseId,
        type: block.name === 'case' ? 'choice_case' : 'choice_else',
        column: branchColumn,
        label: caseLabel,
        attributes: caseParts.attributes,
        block
      };

      if (!registerNode(branchColumn, caseNode)) {
        return;
      }

      const nestedBlocks = caseParts.blocks;
      let firstChildId: string | null = null;
      let lastChildId: string | null = caseNode.id;

      nestedBlocks.forEach((child) => {
        const childNode = createColumnNode(branchColumn, child);
        if (!childNode) {
          return;
        }
        if (!firstChildId) {
          firstChildId = childNode.id;
        }
        lastChildId = childNode.id;
      });

      const caseNextAttr = typeof caseParts.attributes.next === 'string' ? caseParts.attributes.next.trim() : '';

      cases.push({
        id: caseNode.id,
        label: caseLabel,
        kind: block.name === 'case' ? 'case' : 'else',
        branchStartId: firstChildId,
        branchEndId: lastChildId,
        direct: !firstChildId,
        nextRaw: caseNextAttr || undefined
      });
    });

    if (cases.length) {
      cases.forEach((record) => {
        choiceCaseRecords.push({ choiceId: node.id, ...record });
      });
    }
  }

  function processForEachBody(column: number, node: DiagramNode, blocks: BlockStatement[]): void {
    if (!blocks.length) {
      return;
    }

    blocks.forEach((child) => {
      createColumnNode(column, child);
    });

    const baseId = `${node.id}_end`;
    let loopEndId = baseId;
    let counter = 1;
    while (nodeById.has(loopEndId)) {
      loopEndId = `${baseId}_${counter}`;
      counter += 1;
    }

    const loopEndNode: DiagramNode = {
      id: loopEndId,
      type: 'loop_end',
      column,
      label: '',
      attributes: {
        implicit: true,
        loop: node.id
      },
      block: {
        type: 'block',
        name: 'loop_end',
        labels: [loopEndId],
        body: []
      }
    };

    registerNode(column, loopEndNode);
    node.attributes.loop_end = loopEndId;
  }

  const resolveParametersValue = (
    value: unknown
  ): { id: string; label: string; attributes: Record<string, unknown> } | null => {
    if (value === undefined || value === null) {
      return null;
    }

    const defaultId = 'parameters';
    const ensureAttributes = (attrs: Record<string, unknown>): Record<string, unknown> => {
      const attributes = { ...attrs };
      attributes.implicit = true;
      const rawAnchor = typeof attributes.anchor === 'string' ? attributes.anchor.trim() : '';
      if (rawAnchor) {
        attributes.anchor = rawAnchor;
      } else {
        attributes.anchor = `${diagramAnchorBase}@parameters`;
      }
      if (typeof attributes.text === 'string') {
        attributes.text = normalizeMultilineText(attributes.text);
      }
      if (Array.isArray(attributes.lines)) {
        attributes.lines = (attributes.lines as unknown[]).map((entry) => String(entry));
      }
      return attributes;
    };

    if (typeof value === 'string') {
      const text = normalizeMultilineText(value);
      const label = text || 'Parameters';
      return { id: defaultId, label, attributes: ensureAttributes({ text: label }) };
    }

    if (Array.isArray(value)) {
      const lines = value.map((entry) => String(entry));
      const label = lines.length ? lines.join('\n') : 'Parameters';
      return { id: defaultId, label, attributes: ensureAttributes({ lines }) };
    }

    if (typeof value === 'object') {
      const source = value as Record<string, unknown>;
      const config: Record<string, unknown> = {};
      Object.entries(source).forEach(([key, entry]) => {
        if (typeof entry === 'string' && (key === 'text' || key === 'title' || key === 'caption')) {
          config[key] = normalizeMultilineText(entry);
        } else if (Array.isArray(entry)) {
          config[key] = entry.map((element) => String(element));
        } else {
          config[key] = entry;
        }
      });
      const rawId = typeof config.id === 'string' ? config.id.trim() : '';
      delete config.id;

      const textAttr = typeof config.text === 'string' ? config.text : '';
      const linesAttr = Array.isArray(config.lines) ? (config.lines as unknown[]) : undefined;
      if (linesAttr) {
        config.lines = linesAttr.map((entry) => String(entry));
      }

      let label = textAttr ? textAttr : '';
      if (!label && Array.isArray(config.lines) && (config.lines as string[]).length) {
        label = (config.lines as string[]).join('\n');
      }
      if (!label && typeof config.title === 'string' && config.title.trim()) {
        label = config.title.trim();
      }
      if (!label && typeof config.caption === 'string' && config.caption.trim()) {
        label = config.caption.trim();
      }
      if (!label) {
        const informativeEntries = Object.entries(config).filter(
          ([key]) => !['anchor', 'tags', 'data', 'text', 'lines', 'title', 'caption'].includes(key)
        );
        if (informativeEntries.length) {
          label = informativeEntries.map(([key, entry]) => `${key} = ${formatParameterScalar(entry)}`).join('\n');
        }
      }
      if (!label) {
        label = 'Parameters';
      }
      const attributes = ensureAttributes(config);
      if (!('text' in attributes) && label) {
        attributes.text = label;
      }
      return { id: rawId || defaultId, label, attributes };
    }

    const text = String(value);
    const normalized = normalizeMultilineText(text);
    const label = normalized || 'Parameters';
    return { id: defaultId, label, attributes: ensureAttributes({ text: label }) };
  };

  const buildParametersNode = (column: number, value: unknown): DiagramNode | null => {
    const resolved = resolveParametersValue(value);
    if (!resolved) {
      return null;
    }
    const { id, label, attributes } = resolved;
    const node: DiagramNode = {
      id,
      type: 'parameters',
      column,
      label,
      attributes,
      block: {
        type: 'block',
        name: 'parameters',
        labels: [id],
        body: []
      }
    };
    return node;
  };

  const rootParts = splitStatements(root.body);
  const metadata: Record<string, unknown> = { ...rootParts.attributes };
  const parametersConfig = metadata.parameters;
  delete metadata.parameters;
  diagram.metadata = metadata;
  const rawTitle =
    typeof metadata.title === 'string' && metadata.title.trim().length
      ? (metadata.title as string)
      : root.labels[0] ?? 'Diagram';
  diagram.title = rawTitle.trim() || 'Diagram';
  const implicitStartLabel = diagram.title;

  const pendingLines: BlockStatement[] = [];
  const pendingAttachments: BlockStatement[] = [];
  const pendingNotes: BlockStatement[] = [];

  rootParts.blocks.forEach((block) => {
    if (block.name === 'lane') {
      const laneId = block.labels[0] ?? `lane_${laneColumn.size + 1}`;
      const laneParts = splitStatements(block.body);
      const column = ensureColumnForLane(laneId);
      if (!primaryColumnInitialized) {
        primaryColumn = column;
        primaryColumnInitialized = true;
      }
      laneParts.blocks.forEach((child) => {
        if (child.name === 'line' || child.name === 'attach' || child.name === 'note') {
          errors.push(`Block "${child.name}" is not supported within lane "${laneId}". Move it to the diagram root.`);
          return;
        }
        createColumnNode(column, child);
      });
    } else if (block.name === 'line') {
      pendingLines.push(block);
    } else if (block.name === 'attach') {
      pendingAttachments.push(block);
    } else if (block.name === 'note') {
      pendingNotes.push(block);
    } else {
      if (!primaryColumnInitialized) {
        primaryColumnInitialized = true;
      }
      createColumnNode(primaryColumn, block);
    }
  });

  const ensureAnchoredAlias = (node: DiagramNode, fallbackAnchor: string | null = null) => {
    const currentAnchor =
      typeof node.attributes.anchor === 'string' && node.attributes.anchor.trim()
        ? node.attributes.anchor.trim()
        : null;
    if (currentAnchor) {
      registerAlias(currentAnchor, node.id);
      return;
    }
    if (fallbackAnchor) {
      node.attributes.anchor = fallbackAnchor;
      registerAlias(fallbackAnchor, node.id);
    }
  };

  let startNode = diagram.nodes.find((node) => node.type === 'start');
  if (!startNode) {
    const implicitStart: DiagramNode = {
      id: `${diagramAnchorBase}@start`,
      type: 'start',
      column: primaryColumn,
      label: implicitStartLabel,
      attributes: {
        implicit: true,
        anchor: `${diagramAnchorBase}@start`,
        text: implicitStartLabel
      },
      block: {
        type: 'block',
        name: 'start',
        labels: ['start'],
        body: []
      }
    };
    if (registerNode(primaryColumn, implicitStart, 'prepend')) {
      registerAlias('start', implicitStart.id);
      startNode = implicitStart;
    }
  } else {
    startNode.label = implicitStartLabel;
    if (!startNode.attributes || typeof startNode.attributes !== 'object') {
      startNode.attributes = {};
    }
    startNode.attributes.text = implicitStartLabel;
    ensureAnchoredAlias(startNode, `${diagramAnchorBase}@start`);
    registerAlias('start', startNode.id);
  }

  let parametersEdge: DiagramEdge | null = null;
  if (parametersConfig !== undefined && parametersConfig !== null) {
    const parametersColumn = allocateColumn();
    const candidate = buildParametersNode(parametersColumn, parametersConfig);
    if (candidate && registerNode(parametersColumn, candidate)) {
      registerAlias('parameters', candidate.id);
      if (startNode) {
        parametersEdge = {
          from: startNode.id,
          to: candidate.id,
          kind: 'main',
          label: '',
          note: '',
          handle: '',
          attributes: { implicit: true, role: 'parameters' },
          fromBase: startNode.id,
          toBase: candidate.id
        };
      }
    }
  }

  const endNodes = diagram.nodes.filter((node) => node.type === 'end');
  if (!endNodes.length) {
    const implicitEnd: DiagramNode = {
      id: `${diagramAnchorBase}@end`,
      type: 'end',
      column: primaryColumn,
      label: 'End',
      attributes: {
        implicit: true,
        anchor: `${diagramAnchorBase}@end`
      },
      block: {
        type: 'block',
        name: 'end',
        labels: ['end'],
        body: []
      }
    };
    if (registerNode(primaryColumn, implicitEnd)) {
      registerAlias('end', implicitEnd.id);
    }
  } else {
    endNodes.forEach((node, index) => {
      ensureAnchoredAlias(node, index === 0 ? `${diagramAnchorBase}@end` : null);
    });
  }

  const resolveReference = (value: unknown, description: string): { full: string; base: string } | null => {
    if (typeof value !== 'string' || !value.trim()) {
      errors.push(`${description} must be a non-empty string.`);
      return null;
    }
    const raw = value.trim();
    const direct = aliasMap.get(raw);
    if (direct) {
      if (!nodeById.has(direct)) {
        errors.push(`${description} refers to unknown node "${raw}".`);
        return null;
      }
      return { full: direct, base: direct };
    }
    const atIndex = raw.indexOf('@');
    if (atIndex === -1) {
      if (!nodeById.has(raw)) {
        errors.push(`${description} refers to unknown node "${raw}".`);
        return null;
      }
      registerAlias(raw, raw);
      return { full: raw, base: raw };
    }
    const head = raw.slice(0, atIndex);
    const suffix = raw.slice(atIndex);
    const resolvedHead = aliasMap.get(head) ?? head;
    if (!nodeById.has(resolvedHead)) {
      errors.push(`${description} refers to unknown node "${head}".`);
      return null;
    }
    return { full: `${resolvedHead}${suffix}`, base: resolvedHead };
  };

  pendingAttachments.forEach((block) => {
    const parts = splitStatements(block.body);
    const targetRef = resolveReference(parts.attributes.target, 'Attach target');
    if (!targetRef) {
      return;
    }
    parts.attributes.target = targetRef.full;
    diagram.attachments.push({
      type: block.labels[0] ?? 'attachment',
      id: block.labels[1] ?? `${block.labels[0] ?? 'attachment'}_${diagram.attachments.length + 1}`,
      target: targetRef.full,
      attributes: parts.attributes
    });
  });

  pendingNotes.forEach((block) => {
    const parts = splitStatements(block.body);
    const attachesTo =
      typeof parts.attributes.attaches_to === 'string'
        ? resolveReference(parts.attributes.attaches_to, 'Note attaches_to')?.full ?? null
        : null;
    if (attachesTo) {
      parts.attributes.attaches_to = attachesTo;
    }
    diagram.notes.push({
      text: deriveLabel(parts.attributes, 'Note'),
      placement: typeof parts.attributes.placement === 'string' ? parts.attributes.placement : 'right',
      attachesTo
    });
  });

  const explicitEdgeSet = new Set<string>();
  if (parametersEdge) {
    diagram.edges.push(parametersEdge);
    explicitEdgeSet.add(`${parametersEdge.fromBase}>${parametersEdge.toBase}`);
  }

  pendingLines.forEach((block) => {
    const parts = splitStatements(block.body);
    const fromRef = resolveReference(parts.attributes.from, 'Line "from"');
    const toRef = resolveReference(parts.attributes.to, 'Line "to"');
    if (!fromRef || !toRef) {
      return;
    }
    parts.attributes.from = fromRef.full;
    parts.attributes.to = toRef.full;
    const edge: DiagramEdge = {
      from: fromRef.full,
      to: toRef.full,
      kind: typeof parts.attributes.kind === 'string' ? parts.attributes.kind : 'main',
      label: typeof parts.attributes.label === 'string' ? parts.attributes.label : '',
      note: typeof parts.attributes.note === 'string' ? parts.attributes.note : '',
      handle: typeof parts.attributes.handle === 'string' ? parts.attributes.handle : '',
      attributes: parts.attributes,
      fromBase: fromRef.base,
      toBase: toRef.base
    };
    diagram.edges.push(edge);
    explicitEdgeSet.add(`${fromRef.base}>${toRef.base}`);
  });

  questionBranchInfo.forEach((info, questionId) => {
    if (info.nextRaw) {
      const resolved = resolveReference(info.nextRaw, `Question "${questionId}" next`);
      if (resolved) {
        info.nextResolved = resolved;
      }
    }
  });

  const choiceNextResolved = new Map<string, { full: string; base: string }>();
  choiceNextRecords.forEach(({ choiceId, nextRaw }) => {
    const resolved = resolveReference(nextRaw, `Choice "${choiceId}" next`);
    if (resolved) {
      choiceNextResolved.set(choiceId, resolved);
    }
  });

  const choiceCaseInfo = d3.group(choiceCaseRecords, (record) => record.choiceId);

  choiceCaseInfo.forEach((records) => {
    records.forEach((record) => {
      if (record.nextRaw) {
        const resolved = resolveReference(record.nextRaw, `Case "${record.id}" next`);
        if (resolved) {
          record.nextResolved = resolved;
        }
      }
    });
  });

  columnNodes.forEach((nodes) => {
    for (let index = 0; index < nodes.length - 1; index += 1) {
      const fromNode = nodes[index];
      const toNode = nodes[index + 1];
      if (
        (fromNode.type === 'question' && questionBranchInfo.has(fromNode.id)) ||
        (fromNode.type === 'choice' && choiceCaseInfo.has(fromNode.id))
      ) {
        continue;
      }
      const key = `${fromNode.id}>${toNode.id}`;
      if (explicitEdgeSet.has(key)) {
        continue;
      }
      const edge: DiagramEdge = {
        from: fromNode.id,
        to: toNode.id,
        kind: 'main',
        label: '',
        note: '',
        handle: '',
        attributes: { implicit: true },
        fromBase: fromNode.id,
        toBase: toNode.id
      };
      diagram.edges.push(edge);
      explicitEdgeSet.add(key);
    }
  });

  const defaultEndId = aliasMap.get('end') ?? diagram.nodes.find((node) => node.type === 'end')?.id ?? null;

  questionBranchInfo.forEach((info, questionId) => {
    const targetFull = info.nextResolved?.full ?? defaultEndId;
    const targetBase = info.nextResolved?.base ?? defaultEndId;
    if (!targetFull || !targetBase) {
      return;
    }

    const mainKey = `${questionId}>${targetBase}`;
    if (!explicitEdgeSet.has(mainKey)) {
      const mainLabel = info.defaultKind === 'yes' ? 'Yes' : 'No';
      diagram.edges.push({
        from: questionId,
        to: targetFull,
        kind: info.defaultKind,
        label: mainLabel,
        note: '',
        handle: '',
        attributes: { implicit: true, branch: info.defaultKind, branch_main: true },
        fromBase: questionId,
        toBase: targetBase
      });
      explicitEdgeSet.add(mainKey);
    }

    if (info.direct) {
      const branchLabel = info.branchKind === 'yes' ? 'Yes' : 'No';
      diagram.edges.push({
        from: questionId,
        to: targetFull,
        kind: info.branchKind,
        label: branchLabel,
        note: '',
        handle: '',
        attributes: { implicit: true, branch: info.branchKind, branch_direct: true },
        fromBase: questionId,
        toBase: targetBase
      });
      return;
    }

    if (!info.branchEndId || info.branchEndId === targetBase) {
      return;
    }

    const rejoinKey = `${info.branchEndId}>${targetBase}`;
    if (explicitEdgeSet.has(rejoinKey)) {
      return;
    }

    diagram.edges.push({
      from: info.branchEndId,
      to: targetFull,
      kind: 'main',
      label: '',
      note: '',
      handle: '',
      attributes: { implicit: true, branch: info.branchKind, rejoin: true },
      fromBase: info.branchEndId,
      toBase: targetBase
    });
    explicitEdgeSet.add(rejoinKey);
  });

  choiceCaseInfo.forEach((records, choiceId) => {
    const defaultTarget = choiceNextResolved.get(choiceId);
    const fallbackTarget = defaultTarget ?? (defaultEndId ? { full: defaultEndId, base: defaultEndId } : undefined);

    records.forEach((record) => {
      const branchEdgeKey = `${choiceId}>${record.id}`;
      if (!explicitEdgeSet.has(branchEdgeKey)) {
        diagram.edges.push({
          from: choiceId,
          to: record.id,
          kind: record.kind,
          label: '',
          note: '',
          handle: '',
          attributes: { implicit: true, branch: record.kind, branch_case: true },
          fromBase: choiceId,
          toBase: record.id
        });
        explicitEdgeSet.add(branchEdgeKey);
      }

      const resolvedTarget = record.nextResolved ?? fallbackTarget;
      if (!resolvedTarget) {
        return;
      }

      if (record.direct) {
        const directKey = `${record.id}>${resolvedTarget.base}`;
        if (!explicitEdgeSet.has(directKey)) {
          diagram.edges.push({
            from: record.id,
            to: resolvedTarget.full,
            kind: record.kind,
            label: '',
            note: '',
            handle: '',
            attributes: { implicit: true, branch: record.kind, branch_direct: true },
            fromBase: record.id,
            toBase: resolvedTarget.base
          });
          explicitEdgeSet.add(directKey);
        }
        return;
      }

      const branchEnd = record.branchEndId;
      if (!branchEnd || branchEnd === resolvedTarget.base) {
        return;
      }

      const rejoinKeyCase = `${branchEnd}>${resolvedTarget.base}`;
      if (explicitEdgeSet.has(rejoinKeyCase)) {
        return;
      }

      diagram.edges.push({
        from: branchEnd,
        to: resolvedTarget.full,
        kind: 'main',
        label: '',
        note: '',
        handle: '',
        attributes: { implicit: true, branch: record.kind, rejoin: true },
        fromBase: branchEnd,
        toBase: resolvedTarget.base
      });
      explicitEdgeSet.add(rejoinKeyCase);
    });
  });

  diagram.edges.forEach((edge) => {
    const fromId = edge.fromBase ?? baseAnchor(edge.from);
    const toId = edge.toBase ?? baseAnchor(edge.to);
    edge.fromBase = fromId;
    edge.toBase = toId;
    if (!nodeById.has(fromId)) {
      errors.push(`Line references unknown source "${edge.from}".`);
    }
    if (!nodeById.has(toId)) {
      errors.push(`Line references unknown target "${edge.to}".`);
    }
  });

  return diagram;
}
