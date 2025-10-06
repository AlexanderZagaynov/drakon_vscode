import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import { drawRoundedRectangle } from './common.js';

function drawPauseShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  drawRoundedRectangle(group, width, height, node);
  const inset = Math.min(height * 0.18, 28);
  group
    .append('rect')
    .attr('class', 'node-band')
    .attr('x', -width / 2)
    .attr('y', -height / 2)
    .attr('width', width)
    .attr('height', inset);
  group
    .append('rect')
    .attr('class', 'node-band')
    .attr('x', -width / 2)
    .attr('y', height / 2 - inset)
    .attr('width', width)
    .attr('height', inset);
}

export const pauseSpec: NodeSpec = {
  width: 240,
  minHeight: 160,
  lineHeight: 22,
  textPaddingTop: 32,
  textPaddingBottom: 32,
  draw: drawPauseShape
};
