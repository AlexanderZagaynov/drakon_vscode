import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import { drawRoundedRectangle } from './common.js';

function drawShelfShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  drawRoundedRectangle(group, width, height, node);
  const top = -height / 2 + Math.min(0.22 * height, 38);
  const bottom = height / 2 - Math.min(0.18 * height, 32);
  group
    .append('line')
    .attr('class', 'node-divider')
    .attr('x1', -width / 2)
    .attr('x2', width / 2)
    .attr('y1', top)
    .attr('y2', top);
  group
    .append('line')
    .attr('class', 'node-divider')
    .attr('x1', -width / 2)
    .attr('x2', width / 2)
    .attr('y1', bottom)
    .attr('y2', bottom);
  group
    .append('line')
    .attr('class', 'node-divider')
    .attr('x1', 0)
    .attr('x2', 0)
    .attr('y1', bottom)
    .attr('y2', height / 2);
}

export const shelfSpec: NodeSpec = {
  width: 320,
  minHeight: 190,
  lineHeight: 22,
  textPaddingTop: 42,
  textPaddingBottom: 28,
  draw: drawShelfShape
};
