import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import { drawRoundedRectangle } from './common.js';

function drawCommentShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  drawRoundedRectangle(group, width, height, node);
  const foldSize = Math.min(30, Math.min(width, height) * 0.15);
  const path = d3.path();

  path.moveTo(-width / 2, -height / 2);
  path.lineTo(width / 2 - foldSize, -height / 2);
  path.lineTo(width / 2, -height / 2 + foldSize);
  path.lineTo(width / 2, height / 2);
  path.lineTo(-width / 2, height / 2);
  path.closePath();

  group
    .append('path')
    .attr('class', `node-shape ${node.type}`)
    .attr('d', path.toString());

  group
    .append('line')
    .attr('class', 'node-divider')
    .attr('x1', width / 2 - foldSize)
    .attr('y1', -height / 2)
    .attr('x2', width / 2 - foldSize)
    .attr('y2', -height / 2 + foldSize);

  group
    .append('line')
    .attr('class', 'node-divider')
    .attr('x1', width / 2 - foldSize)
    .attr('y1', -height / 2 + foldSize)
    .attr('x2', width / 2)
    .attr('y2', -height / 2 + foldSize);
}

export const commentSpec: NodeSpec = {
  width: 280,
  minHeight: 180,
  lineHeight: 22,
  textPaddingTop: 32,
  textPaddingBottom: 32,
  draw: drawCommentShape
};
