import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import { drawRoundedRectangle } from './common.js';

function drawInsertionShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  drawRoundedRectangle(group, width, height, node);
  const inset = Math.min(8, width * 0.035);
  const innerRadius = Math.min(8, Math.min(width, height) / 12);
  group
    .append('rect')
    .attr('class', 'node-inset')
    .attr('x', -width / 2 + inset)
    .attr('y', -height / 2 + inset)
    .attr('width', width - inset * 2)
    .attr('height', height - inset * 2)
    .attr('rx', innerRadius)
    .attr('ry', innerRadius);
}

export const insertionSpec: NodeSpec = {
  width: 260,
  minHeight: 200,
  lineHeight: 22,
  textPaddingTop: 32,
  textPaddingBottom: 32,
  draw: drawInsertionShape
};
