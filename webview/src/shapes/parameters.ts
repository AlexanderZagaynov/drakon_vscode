import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import { drawRoundedRectangle } from './common.js';

function drawParametersShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  drawRoundedRectangle(group, width, height, node);
  const header = Math.min(0.22 * height, 40);
  group
    .append('line')
    .attr('class', 'node-divider')
    .attr('x1', -width / 2)
    .attr('x2', width / 2)
    .attr('y1', -height / 2 + header)
    .attr('y2', -height / 2 + header);
}

export const parametersSpec: NodeSpec = {
  width: 320,
  minHeight: 180,
  lineHeight: 22,
  textBaseline: 'top',
  textPaddingTop: 36,
  textPaddingBottom: 24,
  draw: drawParametersShape
};
