import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import { drawRoundedRectangle } from './common.js';
import {
  BASE_NODE_WIDTH,
  BASE_NODE_MIN_HEIGHT,
  BASE_LINE_HEIGHT,
  BASE_TEXT_PADDING_TOP,
  BASE_TEXT_PADDING_BOTTOM
} from './constants.js';

function drawInsertionShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  drawRoundedRectangle(group, width, height, node);
  const inset = Math.min(8, width * 0.035);
  const innerRadius = Math.min(8, Math.min(width, height) / 12);
  group
    .append('rect')
    .attr('class', 'node-inset')
    .attr('x', -width / 2 + inset)
    .attr('y', -height / 2 + inset)
    .attr('width', width - inset * 2)
    .attr('height', height - inset * 2)
    .attr('rx', innerRadius)
    .attr('ry', innerRadius);
}

export const insertionSpec: NodeSpec = {
  width: BASE_NODE_WIDTH * (13 / 12),
  minHeight: BASE_NODE_MIN_HEIGHT * (20 / 17),
  lineHeight: BASE_LINE_HEIGHT,
  textPaddingTop: BASE_TEXT_PADDING_TOP * (8 / 7),
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (8 / 7),
  draw: drawInsertionShape
};
