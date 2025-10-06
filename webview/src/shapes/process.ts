import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import { drawRoundedRectangle } from './common.js';

function drawProcessShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  drawRoundedRectangle(group, width, height, node);
  const band = Math.min(height * 0.2, 48);
  const secondBand = band * 2;
  [band, secondBand].forEach((offset) => {
    group
      .append('line')
      .attr('class', 'node-divider')
      .attr('x1', -width / 2)
      .attr('x2', width / 2)
      .attr('y1', -height / 2 + offset)
      .attr('y2', -height / 2 + offset);
  });
}

export const processSpec: NodeSpec = {
  width: 260,
  minHeight: 260,
  lineHeight: 24,
  textPaddingTop: 72,
  textPaddingBottom: 36,
  draw: drawProcessShape
};
