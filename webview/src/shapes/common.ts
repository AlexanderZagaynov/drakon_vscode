import type { Selection } from 'd3';
import type { DiagramNode } from '../types.js';

export type NodeSelection = Selection<SVGGElement, unknown, null, undefined>;

export function drawRoundedRectangle(
  group: NodeSelection,
  width: number,
  height: number,
  node: DiagramNode
): void {
  const radius = Math.min(12, Math.min(width, height) / 10);
  group
    .append('rect')
    .attr('class', `node-shape ${node.type}`)
    .attr('x', -width / 2)
    .attr('y', -height / 2)
    .attr('width', width)
    .attr('height', height)
    .attr('rx', radius)
    .attr('ry', radius);
}

export function drawStadium(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  const radius = height / 2;
  const rectWidth = width - height;

  if (rectWidth <= 0) {
    group
      .append('circle')
      .attr('class', `node-shape ${node.type}`)
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', radius);
    return;
  }

  const path = d3.path();
  const halfRect = rectWidth / 2;

  path.moveTo(halfRect, -radius);
  path.arc(halfRect, 0, radius, -Math.PI / 2, Math.PI / 2, false);
  path.lineTo(-halfRect, radius);
  path.arc(-halfRect, 0, radius, Math.PI / 2, -Math.PI / 2, false);
  path.closePath();

  group
    .append('path')
    .attr('class', `node-shape ${node.type}`)
    .attr('d', path.toString());
}
