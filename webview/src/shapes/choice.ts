import type { NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import type { DiagramNode } from '../types.js';

function drawChoiceShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  const indent = Math.min(width * 0.2, 56);
  const path = d3.path();
  path.moveTo(-width / 2 + indent, -height / 2);
  path.lineTo(width / 2 - indent, -height / 2);
  path.lineTo(width / 2, 0);
  path.lineTo(width / 2 - indent, height / 2);
  path.lineTo(-width / 2 + indent, height / 2);
  path.lineTo(-width / 2, 0);
  path.closePath();
  group
    .append('path')
    .attr('class', `node-shape ${node.type}`)
    .attr('d', path.toString());
}

export const choiceSpec: NodeSpec = {
  width: 280,
  minHeight: 200,
  lineHeight: 24,
  textPaddingTop: 36,
  textPaddingBottom: 36,
  draw: drawChoiceShape
};
