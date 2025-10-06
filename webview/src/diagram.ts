import type {
  Diagram,
  Statement,
  BlockStatement,
  DiagramNode,
  DiagramEdge,
  Lane,
  AttributeStatement
} from './types.js';
import { baseAnchor } from './shared.js';

interface SplitResult {
  attributes: Record<string, unknown>;
  blocks: BlockStatement[];
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

function normalizeMultilineString(value: string): string {
  const normalized = value.replace(/\r/g, '');
  let lines = normalized.split('\n');
  while (lines.length && lines[0]?.trim() === '') {
    lines.shift();
  }
  while (lines.length && lines[lines.length - 1]?.trim() === '') {
    lines.pop();
  }
  if (!lines.length) {
    return '';
  }
  const indent = lines.reduce<number>(
    (acc, line) => {
      if (!line.trim()) {
        return acc;
      }
      const match = line.match(/^(\s*)/);
      const leading = match ? match[0].length : 0;
      return acc === -1 ? leading : Math.min(acc, leading);
    },
    -1
  );
  if (indent > 0) {
    lines = lines.map((line) => line.slice(Math.min(indent, line.length)));
  }
  return lines.join('\n');
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
    lanes: [],
    nodes: [],
    edges: [],
    attachments: [],
    notes: []
  };

  const aliasMap = new Map<string, string>();
  const nodeById = new Map<string, DiagramNode>();
  const laneById = new Map<string, Lane>();
  const laneOrder: Lane[] = [];

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

  const registerNode = (lane: Lane, node: DiagramNode, position: 'append' | 'prepend' = 'append') => {
    if (nodeById.has(node.id)) {
      errors.push(`Duplicate node id "${node.id}".`);
      return false;
    }
    if (position === 'prepend') {
      lane.nodes.unshift(node);
      diagram.nodes.unshift(node);
    } else {
      lane.nodes.push(node);
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

  const ensureLane = (
    id: string,
    options?: { title?: string; tags?: string[]; raw?: BlockStatement; implicit?: boolean }
  ): Lane => {
    let lane = laneById.get(id);
    if (!lane) {
      lane = {
        id,
        title: options?.title ?? id,
        tags: options?.tags ?? [],
        nodes: [],
        implicit: options?.implicit ?? false,
        raw:
          options?.raw ??
          ({
            type: 'block',
            name: 'lane',
            labels: [id],
            body: []
          } as BlockStatement)
      };
      laneById.set(id, lane);
      laneOrder.push(lane);
    } else {
      if (options?.title) {
        lane.title = options.title;
      }
      if (options?.tags) {
        lane.tags = options.tags;
      }
      if (typeof options?.implicit === 'boolean') {
        lane.implicit = options.implicit;
      }
    }
    return lane;
  };

  const createLaneNode = (lane: Lane, block: BlockStatement): DiagramNode | null => {
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
    const fallbackId = block.labels[0] ?? `${block.name}_${lane.nodes.length + 1}`;
    if (!fallbackId) {
      errors.push(`Unable to derive id for block "${block.name}" in lane "${lane.id}".`);
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
      lane: lane.id,
      label,
      attributes: nodeParts.attributes,
      block
    };
    if (!registerNode(lane, node)) {
      return null;
    }
    const anchorAttr = typeof nodeParts.attributes.anchor === 'string' ? nodeParts.attributes.anchor.trim() : '';
    if (anchorAttr) {
      registerAlias(anchorAttr, node.id);
    }
    return node;
  };

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
        attributes.text = normalizeMultilineString(attributes.text);
      }
      if (Array.isArray(attributes.lines)) {
        attributes.lines = (attributes.lines as unknown[]).map((entry) => String(entry));
      }
      return attributes;
    };

    if (typeof value === 'string') {
      const text = normalizeMultilineString(value);
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
          config[key] = normalizeMultilineString(entry);
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
    const normalized = normalizeMultilineString(text);
    const label = normalized || 'Parameters';
    return { id: defaultId, label, attributes: ensureAttributes({ text: label }) };
  };

  const buildParametersNode = (lane: Lane, value: unknown): DiagramNode | null => {
    const resolved = resolveParametersValue(value);
    if (!resolved) {
      return null;
    }
    const { id, label, attributes } = resolved;
    const node: DiagramNode = {
      id,
      type: 'parameters',
      lane: lane.id,
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

  let primaryLaneId: string | null = null;
  const pendingLines: BlockStatement[] = [];
  const pendingAttachments: BlockStatement[] = [];
  const pendingNotes: BlockStatement[] = [];

  rootParts.blocks.forEach((block) => {
    if (block.name === 'lane') {
      const laneId = block.labels[0] ?? `lane_${laneOrder.length + 1}`;
      const laneParts = splitStatements(block.body);
      const lane = ensureLane(laneId, {
        raw: block,
        title: (laneParts.attributes.title as string) ?? laneId,
        tags: toArray(laneParts.attributes.tags),
        implicit: false
      });
      if (!primaryLaneId) {
        primaryLaneId = lane.id;
      }
      laneParts.blocks.forEach((child) => {
        if (child.name === 'line' || child.name === 'attach' || child.name === 'note') {
          errors.push(`Block "${child.name}" is not supported within lane "${laneId}". Move it to the diagram root.`);
          return;
        }
        createLaneNode(lane, child);
      });
    } else if (block.name === 'line') {
      pendingLines.push(block);
    } else if (block.name === 'attach') {
      pendingAttachments.push(block);
    } else if (block.name === 'note') {
      pendingNotes.push(block);
    } else {
      const fallbackLaneId = primaryLaneId ?? 'main';
      const laneExists = laneById.has(fallbackLaneId);
      const lane = ensureLane(fallbackLaneId, {
        title: laneById.get(fallbackLaneId)?.title ?? 'Main',
        implicit: laneExists ? undefined : true
      });
      if (!primaryLaneId) {
        primaryLaneId = lane.id;
      }
      createLaneNode(lane, block);
    }
  });

  if (!primaryLaneId) {
    primaryLaneId = laneOrder[0]?.id ?? 'main';
  }
  if (!laneOrder.length) {
    const lane = ensureLane(primaryLaneId, { title: 'Main', implicit: true });
    primaryLaneId = lane.id;
  }

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

  const primaryLane = laneById.get(primaryLaneId) ?? ensureLane(primaryLaneId, { implicit: true });
  let startNode = diagram.nodes.find((node) => node.type === 'start');
  if (!startNode) {
    const implicitStart: DiagramNode = {
      id: `${diagramAnchorBase}@start`,
      type: 'start',
      lane: primaryLane.id,
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
    if (registerNode(primaryLane, implicitStart, 'prepend')) {
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
    const parametersLaneId = `${primaryLane.id}_parameters`;
    const parametersLane = ensureLane(parametersLaneId, { title: '', implicit: true });
    const candidate = buildParametersNode(parametersLane, parametersConfig);
    if (candidate && registerNode(parametersLane, candidate)) {
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
      lane: primaryLane.id,
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
    if (registerNode(primaryLane, implicitEnd)) {
      registerAlias('end', implicitEnd.id);
    }
  } else {
    endNodes.forEach((node, index) => {
      ensureAnchoredAlias(node, index === 0 ? `${diagramAnchorBase}@end` : null);
    });
  }

  diagram.lanes = laneOrder;

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

  laneOrder.forEach((lane) => {
    for (let index = 0; index < lane.nodes.length - 1; index += 1) {
      const fromNode = lane.nodes[index];
      const toNode = lane.nodes[index + 1];
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
    }
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
