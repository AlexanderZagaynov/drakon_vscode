import type { Diagram, Statement, BlockStatement, DiagramNode, DiagramEdge } from './types.js';
import { baseAnchor } from './shared.js';

interface SplitResult {
  attributes: Record<string, unknown>;
  blocks: BlockStatement[];
}

function splitStatements(items: Statement[]): SplitResult {
  const attributes: Record<string, unknown> = {};
  const blocks: BlockStatement[] = [];
  items.forEach((item) => {
    if (item.type === 'attribute') {
      attributes[item.key] = item.value;
    } else if (item.type === 'block') {
      blocks.push(item);
    }
  });
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

export function buildDiagram(statements: Statement[], errors: string[]): Diagram | null {
  const root = statements.find((statement) => statement.type === 'block' && statement.name === 'drakon') as
    | BlockStatement
    | undefined;
  if (!root) {
    errors.push('No `drakon` block found. Define the diagram first.');
    return null;
  }

  const diagram: Diagram = {
    title: '',
    metadata: {},
    lanes: [],
    nodes: [],
    edges: [],
    attachments: [],
    notes: []
  };

  const rootParts = splitStatements(root.body);
  diagram.metadata = rootParts.attributes;
  diagram.title = (rootParts.attributes.title as string) ?? root.labels[0] ?? 'Diagram';

  const laneBlocks = rootParts.blocks.filter((block) => block.name === 'lane');
  const otherBlocks = rootParts.blocks.filter((block) => block.name !== 'lane');

  laneBlocks.forEach((laneBlock, index) => {
    const laneId = laneBlock.labels[0] ?? `lane_${index + 1}`;
    const laneParts = splitStatements(laneBlock.body);
    const lane = {
      id: laneId,
      title: (laneParts.attributes.title as string) ?? laneId,
      tags: toArray(laneParts.attributes.tags),
      nodes: [] as DiagramNode[],
      raw: laneBlock
    };

    laneParts.blocks.forEach((block) => {
      const nodeId = block.labels[0] ?? `${block.name}_${lane.nodes.length + 1}`;
      const nodeParts = splitStatements(block.body);
      const label = deriveLabel(nodeParts.attributes, nodeId);

      const node: DiagramNode = {
        id: nodeId,
        type: block.name,
        lane: laneId,
        label,
        attributes: nodeParts.attributes,
        block
      };
      lane.nodes.push(node);
      diagram.nodes.push(node);
    });

    diagram.lanes.push(lane);
  });

  otherBlocks.forEach((block) => {
    if (block.name === 'line') {
      const parts = splitStatements(block.body);
      const from = parts.attributes.from;
      const to = parts.attributes.to;
      if (typeof from !== 'string' || typeof to !== 'string') {
        errors.push('Line block requires string `from` and `to` attributes.');
        return;
      }
      const edge: DiagramEdge = {
        from,
        to,
        kind: typeof parts.attributes.kind === 'string' ? parts.attributes.kind : 'main',
        label: typeof parts.attributes.label === 'string' ? parts.attributes.label : '',
        note: typeof parts.attributes.note === 'string' ? parts.attributes.note : '',
        handle: typeof parts.attributes.handle === 'string' ? parts.attributes.handle : '',
        attributes: parts.attributes
      };
      diagram.edges.push(edge);
    } else if (block.name === 'attach') {
      const parts = splitStatements(block.body);
      const target = parts.attributes.target;
      if (typeof target !== 'string') {
        errors.push('Attach block requires a string `target` attribute.');
        return;
      }
      diagram.attachments.push({
        type: block.labels[0] ?? 'attachment',
        id: block.labels[1] ?? `${block.labels[0] ?? 'attachment'}_${diagram.attachments.length + 1}`,
        target,
        attributes: parts.attributes
      });
    } else if (block.name === 'note') {
      const parts = splitStatements(block.body);
      diagram.notes.push({
        text: deriveLabel(parts.attributes, 'Note'),
        placement: typeof parts.attributes.placement === 'string' ? parts.attributes.placement : 'right',
        attachesTo: typeof parts.attributes.attaches_to === 'string' ? parts.attributes.attaches_to : null
      });
    } else {
      errors.push(`Unsupported block "${block.name}" at the top level.`);
    }
  });

  diagram.edges.forEach((edge) => {
    const fromBase = baseAnchor(edge.from);
    const toBase = baseAnchor(edge.to);
    edge.fromBase = fromBase;
    edge.toBase = toBase;
    if (!diagram.nodes.find((node) => node.id === fromBase)) {
      errors.push(`Line references unknown source "${edge.from}".`);
    }
    if (!diagram.nodes.find((node) => node.id === toBase)) {
      errors.push(`Line references unknown target "${edge.to}".`);
    }
  });

  return diagram;
}
