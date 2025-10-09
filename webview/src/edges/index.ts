// Pull in D3 selection type because we build SVG fragments directly.
import type { Selection } from 'd3';
// Diagram data structures and layout helpers live in the shared types/layout modules.
import type { Diagram, DiagramEdge, DiagramNode, LayoutResult } from '../types.js';
import { LAYOUT } from '../layout.js';

// Bundle of geometry information we need when positioning edge labels.
// Keeping it structured avoids returning several loosely-related numbers.
interface EdgeLayoutResult {
  x: number;
  y: number;
  dx: number;
  dy: number;
  anchor: 'start' | 'middle' | 'end';
}

// Render every edge in the diagram.
// Responsibility for routing and label layout lives here so the renderer can stay lean.
export function drawEdges(
  container: Selection<SVGGElement, unknown, null, undefined>,
  diagram: Diagram,
  layout: LayoutResult,
  nodeById: Map<string, DiagramNode>
): void {
  // Only keep edges where both endpoints have been positioned by the layout pass.
  const visibleEdges = diagram.edges.filter(
    (edge) => layout.positions.has(edge.fromBase ?? '') && layout.positions.has(edge.toBase ?? '')
  );

  // Collect all edge visuals under a dedicated group so styling stays scoped.
  const edgesGroup = container.append('g').attr('class', 'edges');

  // Draw the actual connectors first.
  edgesGroup
    .selectAll('path')
    .data(visibleEdges)
    .enter()
    .append('path')
    .attr('class', (d) => `edge ${d.kind ?? 'main'}`)
    .attr('d', (d) => buildEdgePath(d, layout, nodeById))
    .attr('marker-end', 'url(#arrowhead)');

  // Then render labels for edges that explicitly set one.
  edgesGroup
    .selectAll('text')
    .data(visibleEdges.filter((edge) => edge.label))
    .enter()
    .append('text')
    .attr('class', 'edge-label')
    .attr('x', (d) => edgeLabelLayout(d, layout, nodeById).x)
    .attr('y', (d) => edgeLabelLayout(d, layout, nodeById).y)
    .attr('dx', (d) => edgeLabelLayout(d, layout, nodeById).dx)
    .attr('dy', (d) => edgeLabelLayout(d, layout, nodeById).dy)
    .attr('text-anchor', (d) => edgeLabelLayout(d, layout, nodeById).anchor)
    .text((d) => d.label);
}

// Generate the SVG path for an edge, mirroring the simple orthogonal routing used in the viewer.
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
    return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
  }

  // Direct branches (empty "No" lanes) first step sideways, then down, then back.
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
      return `M ${x1} ${y1} L ${x1} ${baseY} L ${x1} ${joinY} L ${x2} ${joinY} L ${x2} ${y2}`;
    }

    const fromWidth = fromNode?.geometry?.width ?? 0;
    const horizontalOffset = fromWidth / 2 + LAYOUT.laneGap / 2;
    const outerX = x1 + horizontalOffset;
    return `M ${x1} ${y1} L ${outerX} ${y1} L ${outerX} ${joinY} L ${x2} ${joinY} L ${x2} ${y2}`;
  }

  // Rejoin edges drop straight down to the main flow before turning.
  if (attrs.rejoin) {
    const toNode = nodeById.get(edge.toBase ?? edge.to);
    const targetHeight = toNode?.geometry?.height ?? 0;
    const targetTop = y2 - targetHeight / 2;
    const clearance = Math.max(40, targetHeight / 3);
    const joinCandidate = Math.min(targetTop - clearance, y2 - clearance);
    const joinY = Math.min(Math.max(joinCandidate, y1 + clearance / 2), y2 - 8);
    return `M ${x1} ${y1} L ${x1} ${joinY} L ${x2} ${joinY} L ${x2} ${y2}`;
  }

  // If the nodes already align horizontally or vertically, keep the edge straight.
  if (Math.abs(x1 - x2) < 0.01 || Math.abs(y1 - y2) < 0.01) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  // Fallback: single elbow (classic DRAKON orthogonal connector).
  const elbowX = x2;
  const elbowY = y1;
  return `M ${x1} ${y1} L ${elbowX} ${elbowY} L ${x2} ${y2}`;
}

// Decide where the label should sit for a given edge style.
function edgeLabelLayout(edge: DiagramEdge, layout: LayoutResult, nodeById: Map<string, DiagramNode>): EdgeLayoutResult {
  // Look up both endpoints so we can calculate label offsets relative to screen space.
  const from = layout.positions.get(edge.fromBase ?? '') ?? { x: 0, y: 0 };
  const to = layout.positions.get(edge.toBase ?? '') ?? { x: 0, y: 0 };
  const x1 = from.x;
  const y1 = from.y;
  const x2 = to.x;
  const y2 = to.y;
  const attrs = (edge.attributes ?? {}) as Record<string, unknown>;

  // Side branch with its own column: hang the label near the shoulder and push it outward.
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
    // Default downward flow: tuck the label beneath the question on the left-hand side.
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
    // Empty branch (No-block omitted): keep the label just beyond the question shoulder.
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

  // Straight segments simply take the midpoint to keep the label centered on the run.
  if (Math.abs(x1 - x2) < 0.01 || Math.abs(y1 - y2) < 0.01) {
    return {
      x: (x1 + x2) / 2,
      y: (y1 + y2) / 2 - 12,
      dx: 0,
      dy: 0,
      anchor: 'middle'
    };
  }

  // Rejoin edges sit under the elbow so the label does not overlap the downstream action.
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
  // Horizontal-dominant edges show the label above the run to match DRAKON defaults.
  if (horizontalLength >= verticalLength) {
    return {
      x: (x1 + x2) / 2,
      y: y1 - 12,
      dx: 0,
      dy: 0,
      anchor: 'middle'
    };
  }

  // Fallback: treat the final leg as vertical and hug the destination node.
  return {
    x: x2,
    y: (y1 + y2) / 2 - 12,
    dx: 0,
    dy: 0,
    anchor: x2 >= x1 ? 'start' : 'end'
  };
}
