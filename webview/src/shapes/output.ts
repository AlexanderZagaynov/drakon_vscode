import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';

export function drawOutputShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  const bevel = Math.min(width * 0.15, 40);
  const path = d3.path();
  path.moveTo(-width / 2, -height / 2);
  path.lineTo(width / 2 - bevel, -height / 2);
  path.lineTo(width / 2, 0);
  path.lineTo(width / 2 - bevel, height / 2);
  path.lineTo(-width / 2, height / 2);
  path.closePath();
  group
    .append('path')
    .attr('class', `node-shape ${node.type}`)
    .attr('d', path.toString());
}

export const outputSpec: NodeSpec = {
  width: 280,
  minHeight: 180,
  lineHeight: 22,
  textPaddingTop: 32,
  textPaddingBottom: 32,
  draw: drawOutputShape
};
