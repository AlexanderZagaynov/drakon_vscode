import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import { drawRoundedRectangle } from './common.js';

function drawControlPeriodStartShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  drawRoundedRectangle(group, width, height, node);
  const gateWidth = Math.min(width * 0.18, 44);
  const gap = gateWidth / 2;
  [-gap, gap].forEach((offset) => {
    group
      .append('line')
      .attr('class', 'node-divider')
      .attr('x1', offset)
      .attr('x2', offset)
      .attr('y1', -height / 2 + 16)
      .attr('y2', height / 2 - 16);
  });
}

export const ctrlPeriodStartSpec: NodeSpec = {
  width: 260,
  minHeight: 220,
  lineHeight: 24,
  textPaddingTop: 44,
  textPaddingBottom: 36,
  draw: drawControlPeriodStartShape
};
