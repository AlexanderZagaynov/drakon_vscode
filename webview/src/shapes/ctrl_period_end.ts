import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import { drawRoundedRectangle } from './common.js';

function drawControlPeriodEndShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  drawRoundedRectangle(group, width, height, node);
  const gateWidth = Math.min(width * 0.18, 44);
  const offset = width / 2 - gateWidth;
  [offset, offset - gateWidth / 2].forEach((x) => {
    group
      .append('line')
      .attr('class', 'node-divider')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', -height / 2 + 16)
      .attr('y2', height / 2 - 16);
  });
}

export const ctrlPeriodEndSpec: NodeSpec = {
  width: 260,
  minHeight: 220,
  lineHeight: 24,
  textPaddingTop: 44,
  textPaddingBottom: 36,
  draw: drawControlPeriodEndShape
};
