import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import { drawRoundedRectangle } from './common.js';

function drawActionShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  drawRoundedRectangle(group, width, height, node);
  const header = Math.min(0.18 * height, 32);
  const footer = header;
  group
    .append('line')
    .attr('class', 'node-divider')
    .attr('x1', -width / 2)
    .attr('x2', width / 2)
    .attr('y1', -height / 2 + header)
    .attr('y2', -height / 2 + header);
  group
    .append('line')
    .attr('class', 'node-divider')
    .attr('x1', -width / 2)
    .attr('x2', width / 2)
    .attr('y1', height / 2 - footer)
    .attr('y2', height / 2 - footer);
}

export const actionSpec: NodeSpec = {
  width: 240,
  minHeight: 220,
  lineHeight: 24,
  textPaddingTop: 36,
  textPaddingBottom: 36,
  draw: drawActionShape
};

export { drawActionShape };
