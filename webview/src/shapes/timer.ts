import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';

function drawTimerShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  const waist = Math.min(width * 0.32, 70);
  const path = d3.path();
  path.moveTo(-width / 2, -height / 2);
  path.lineTo(width / 2, -height / 2);
  path.lineTo(waist / 2, 0);
  path.lineTo(width / 2, height / 2);
  path.lineTo(-width / 2, height / 2);
  path.lineTo(-waist / 2, 0);
  path.closePath();
  group
    .append('path')
    .attr('class', `node-shape ${node.type}`)
    .attr('d', path.toString());
}

export const timerSpec: NodeSpec = {
  width: 260,
  minHeight: 260,
  lineHeight: 24,
  textPaddingTop: 140,
  textPaddingBottom: 36,
  draw: drawTimerShape
};
