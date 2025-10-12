import type { BlockStatement, DiagramEdge } from '../types.js';
import { deriveLabel, splitStatements } from './utils.js';
import type { DiagramBuildContext } from './context.js';

export function handleAttachment(builder: DiagramBuildContext, block: BlockStatement): void {
  const parts = splitStatements(block.body);
  const targetRef = builder.resolveReference(parts.attributes.target, 'Attach target');
  if (!targetRef) {
    return;
  }
  parts.attributes.target = targetRef.full;
  builder.diagram.attachments.push({
    type: block.labels[0] ?? 'attachment',
    id: block.labels[1] ?? `${block.labels[0] ?? 'attachment'}_${builder.diagram.attachments.length + 1}`,
    target: targetRef.full,
    attributes: parts.attributes
  });
}

export function handleNote(builder: DiagramBuildContext, block: BlockStatement): void {
  const parts = splitStatements(block.body);
  const attachesTo =
    typeof parts.attributes.attaches_to === 'string'
      ? builder.resolveReference(parts.attributes.attaches_to, 'Note attaches_to')?.full ?? null
      : null;
  if (attachesTo) {
    parts.attributes.attaches_to = attachesTo;
  }
  builder.diagram.notes.push({
    text: deriveLabel(parts.attributes, 'Note'),
    placement: typeof parts.attributes.placement === 'string' ? parts.attributes.placement : 'right',
    attachesTo
  });
}

export function handleLine(builder: DiagramBuildContext, block: BlockStatement): void {
  const parts = splitStatements(block.body);
  const fromRef = builder.resolveReference(parts.attributes.from, 'Line "from"');
  const toRef = builder.resolveReference(parts.attributes.to, 'Line "to"');
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
  builder.diagram.edges.push(edge);
  builder.explicitEdgeSet.add(`${fromRef.base}>${toRef.base}`);
}
