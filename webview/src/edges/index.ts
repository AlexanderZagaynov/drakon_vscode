// CSI: edge renderer — handles connector routing and label placement for the
// diagram preview.
import type { Selection } from 'd3';
import type { Diagram, DiagramEdge, DiagramNode, LayoutResult } from '../types.js';
import { LAYOUT } from '../layout.js';

// CSI: label geometry bundle — keeps midpoint offsets together for readability.
interface EdgeLayoutResult {
  x: number;
  y: number;
  dx: number;
  dy: number;
  anchor: 'start' | 'middle' | 'end';
}

const orthogonalLine = d3
  .line<{ x: number; y: number }>()
  .x((point) => point.x)
  .y((point) => point.y);

export function drawEdges(
  container: Selection<SVGGElement, unknown, null, undefined>,
  diagram: Diagram,
  layout: LayoutResult,
  nodeById: Map<string, DiagramNode>
): void {
  // CSI: cull — skip edges whose anchors the layout cannot resolve.
  const visibleEdges = diagram.edges.filter(
    (edge) => layout.positions.has(edge.fromBase ?? '') && layout.positions.has(edge.toBase ?? '')
  );

  // CSI: grouping — isolate edge visuals for scoped styling.
  const edgesGroup = container.append('g').attr('class', 'edges');

  // CSI: connectors — render paths before labels so markers and strokes paint behind text.
  edgesGroup
    .selectAll<SVGPathElement, DiagramEdge>('path')
    .data(visibleEdges, (edge) => edge.handle)
    .join('path')
    .attr('class', (d) => `edge ${d.kind ?? 'main'}`)
    .attr('marker-end', 'url(#arrowhead)')
    .attr('d', (d) => buildEdgePath(d, layout, nodeById));

  const labelSelection = edgesGroup
    .selectAll<SVGTextElement, DiagramEdge>('text')
    .data(
      visibleEdges.filter((edge) => edge.label),
      (edge) => `${edge.handle}|${edge.label}`
    )
    .join(
      (enter) => enter.append('text').attr('class', 'edge-label'),
      (update) => update,
      (exit) => exit.remove()
    )
    .attr('class', 'edge-label')
    .text((d) => d.label ?? '');

  labelSelection.each(function (edge) {
    const placement = edgeLabelLayout(edge, layout, nodeById);
    d3
      .select(this as SVGTextElement)
      .attr('x', placement.x)
      .attr('y', placement.y)
      .attr('dx', placement.dx)
      .attr('dy', placement.dy)
      .attr('text-anchor', placement.anchor);
  });
}

// CSI: path builder — replicate orthogonal routing rules from the main viewer.
function buildEdgePath(edge: DiagramEdge, layout: LayoutResult, nodeById: Map<string, DiagramNode>): string {
  const from = layout.positions.get(edge.fromBase ?? '') ?? { x: 0, y: 0 };
  const to = layout.positions.get(edge.toBase ?? '') ?? { x: 0, y: 0 };
  const x1 = from.x;
  const y1 = from.y;
  const x2 = to.x;
  const y2 = to.y;
  const attrs = (edge.attributes ?? {}) as Record<string, unknown>;

  if (attrs.branch_case) {
    const fromNode = nodeById.get(edge.fromBase ?? edge.from);
    const fromHeight = fromNode?.geometry?.height ?? 0;
    const toNode = nodeById.get(edge.toBase ?? edge.to);
    const targetHeight = toNode?.geometry?.height ?? 0;
    const baseY = y1 + fromHeight / 2;
    const targetTop = y2 - targetHeight / 2;
    const midY = (baseY + targetTop) / 2;
    return orthogonalLine([
      { x: x1, y: y1 },
      { x: x1, y: midY },
      { x: x2, y: midY },
      { x: x2, y: y2 }
    ]) ?? '';
  }

  // CSI: direct branch — empty "No" lanes jog outward before rejoining.
  if (attrs.branch_direct) {
    const fromNode = nodeById.get(edge.fromBase ?? edge.from);
    const toNode = nodeById.get(edge.toBase ?? edge.to);
    const targetHeight = toNode?.geometry?.height ?? 0;
    const targetTop = y2 - targetHeight / 2;
    const clearance = Math.max(40, targetHeight / 3);
    const joinCandidate = Math.min(targetTop - clearance, y2 - clearance);
    const joinY = Math.min(Math.max(joinCandidate, y1 + clearance / 2), y2 - 8);

    if (fromNode && (fromNode.type === 'choice_case' || fromNode.type === 'choice_else')) {
      const fromHeight = fromNode.geometry?.height ?? 0;
      const baseY = y1 + fromHeight / 2;
      return orthogonalLine([
        { x: x1, y: y1 },
        { x: x1, y: baseY },
        { x: x1, y: joinY },
        { x: x2, y: joinY },
        { x: x2, y: y2 }
      ]) ?? '';
    }

    const fromWidth = fromNode?.geometry?.width ?? 0;
    const horizontalOffset = fromWidth / 2 + LAYOUT.laneGap / 2;
    const outerX = x1 + horizontalOffset;
    return orthogonalLine([
      { x: x1, y: y1 },
      { x: outerX, y: y1 },
      { x: outerX, y: joinY },
      { x: x2, y: joinY },
      { x: x2, y: y2 }
    ]) ?? '';
  }

  // CSI: rejoin — slide vertically to hug the main lane before elbowing.
  if (attrs.rejoin) {
    const toNode = nodeById.get(edge.toBase ?? edge.to);
    const targetHeight = toNode?.geometry?.height ?? 0;
    const targetTop = y2 - targetHeight / 2;
    const clearance = Math.max(40, targetHeight / 3);
    const joinCandidate = Math.min(targetTop - clearance, y2 - clearance);
    const joinY = Math.min(Math.max(joinCandidate, y1 + clearance / 2), y2 - 8);
    return orthogonalLine([
      { x: x1, y: y1 },
      { x: x1, y: joinY },
      { x: x2, y: joinY },
      { x: x2, y: y2 }
    ]) ?? '';
  }

  // CSI: straight alignment — no elbows needed for collinear nodes.
  if (Math.abs(x1 - x2) < 0.01 || Math.abs(y1 - y2) < 0.01) {
    return orthogonalLine([
      { x: x1, y: y1 },
      { x: x2, y: y2 }
    ]) ?? '';
  }

  // CSI: fallback — classic single elbow when no special routing applies.
  return orthogonalLine([
    { x: x1, y: y1 },
    { x: x2, y: y1 },
    { x: x2, y: y2 }
  ]) ?? '';
}

// CSI: label layout — decide offsets per edge variant.
function edgeLabelLayout(edge: DiagramEdge, layout: LayoutResult, nodeById: Map<string, DiagramNode>): EdgeLayoutResult {
  // CSI: anchor lookup — derive coordinates for both endpoints to inform offsets.
  const from = layout.positions.get(edge.fromBase ?? '') ?? { x: 0, y: 0 };
  const to = layout.positions.get(edge.toBase ?? '') ?? { x: 0, y: 0 };
  const x1 = from.x;
  const y1 = from.y;
  const x2 = to.x;
  const y2 = to.y;
  const attrs = (edge.attributes ?? {}) as Record<string, unknown>;

  // CSI: branch lane — hang the label near the shoulder, nudged toward the side lane.
  if (attrs.branch_lane) {
    const fromNode = nodeById.get(edge.fromBase ?? edge.from);
    const fromWidth = fromNode?.geometry?.width ?? 0;
    const direction = x2 >= x1 ? 1 : -1;
    return {
      x: x1,
      y: y1 - 12,
      dx: direction * (fromWidth / 2 + 12),
      dy: 0,
      anchor: direction >= 0 ? 'start' : 'end'
    };
  }

  if (attrs.branch_main) {
  // CSI: branch main — tuck text below the question node.
    const fromNode = nodeById.get(edge.fromBase ?? edge.from);
    const fromHeight = fromNode?.geometry?.height ?? 0;
    const bottomY = y1 + fromHeight / 2;
    const margin = 20;
    return {
      x: x1 - margin,
      y: bottomY + margin,
      dx: 0,
      dy: 0,
      anchor: 'end'
    };
  }

  if (attrs.branch_direct) {
  // CSI: branch direct — keep text just beyond the question shoulder.
    const fromNode = nodeById.get(edge.fromBase ?? edge.from);
    const fromWidth = fromNode?.geometry?.width ?? 0;
    const visibleStart = fromWidth / 2;
    const margin = 12;
    const x = x1 + visibleStart + margin;
    return {
      x,
      y: y1 - 12,
      dx: 0,
      dy: 0,
      anchor: 'start'
    };
  }

  // CSI: straight run — midpoint keeps label centered.
  if (Math.abs(x1 - x2) < 0.01 || Math.abs(y1 - y2) < 0.01) {
    return {
      x: (x1 + x2) / 2,
      y: (y1 + y2) / 2 - 12,
      dx: 0,
      dy: 0,
      anchor: 'middle'
    };
  }

  // CSI: rejoin elbow — drop label under the elbow to dodge downstream nodes.
  if (attrs.rejoin) {
    return {
      x: (x1 + x2) / 2,
      y: y2 - 12,
      dx: 0,
      dy: 0,
      anchor: 'middle'
    };
  }

  const horizontalLength = Math.abs(x2 - x1);
  const verticalLength = Math.abs(y2 - y1);
  // CSI: horizontal dominant — bias label above the run to match DRAKON defaults.
  if (horizontalLength >= verticalLength) {
    return {
      x: (x1 + x2) / 2,
      y: y1 - 12,
      dx: 0,
      dy: 0,
      anchor: 'middle'
    };
  }

  // CSI: vertical leg fallback — hug the destination to stay readable.
  return {
    x: x2,
    y: (y1 + y2) / 2 - 12,
    dx: 0,
    dy: 0,
    anchor: x2 >= x1 ? 'start' : 'end'
  };
}
