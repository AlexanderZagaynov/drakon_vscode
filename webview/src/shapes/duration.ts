import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';

function drawDurationShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  const radius = height / 2;
  const path = d3.path();
  path.moveTo(-width / 2 + radius, -height / 2);
  path.arc(-width / 2 + radius, 0, radius, -Math.PI / 2, Math.PI / 2, false);
  path.lineTo(width / 2, height / 2);
  path.lineTo(width / 2, -height / 2);
  path.closePath();
  group
    .append('path')
    .attr('class', `node-shape ${node.type}`)
    .attr('d', path.toString());
}

export const durationSpec: NodeSpec = {
  width: 240,
  minHeight: 140,
  lineHeight: 22,
  textPaddingTop: 26,
  textPaddingBottom: 26,
  draw: drawDurationShape
};
