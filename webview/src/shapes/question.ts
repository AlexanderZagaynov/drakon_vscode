import type { NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import type { DiagramNode } from '../types.js';

function drawQuestionShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  const path = d3.path();
  path.moveTo(0, -height / 2);
  path.lineTo(width / 2, 0);
  path.lineTo(0, height / 2);
  path.lineTo(-width / 2, 0);
  path.closePath();
  group
    .append('path')
    .attr('class', `node-shape ${node.type}`)
    .attr('d', path.toString());
}

export const questionSpec: NodeSpec = {
  width: 280,
  minHeight: 180,
  lineHeight: 24,
  textPaddingTop: 36,
  textPaddingBottom: 36,
  draw: drawQuestionShape
};
