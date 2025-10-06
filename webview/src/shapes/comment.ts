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

function drawCommentShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  drawRoundedRectangle(group, width, height, node);
  const foldSize = Math.min(30, Math.min(width, height) * 0.15);
  const path = d3.path();

  path.moveTo(-width / 2, -height / 2);
  path.lineTo(width / 2 - foldSize, -height / 2);
  path.lineTo(width / 2, -height / 2 + foldSize);
  path.lineTo(width / 2, height / 2);
  path.lineTo(-width / 2, height / 2);
  path.closePath();

  group
    .append('path')
    .attr('class', `node-shape ${node.type}`)
    .attr('d', path.toString());

  group
    .append('line')
    .attr('class', 'node-divider')
    .attr('x1', width / 2 - foldSize)
    .attr('y1', -height / 2)
    .attr('x2', width / 2 - foldSize)
    .attr('y2', -height / 2 + foldSize);

  group
    .append('line')
    .attr('class', 'node-divider')
    .attr('x1', width / 2 - foldSize)
    .attr('y1', -height / 2 + foldSize)
    .attr('x2', width / 2)
    .attr('y2', -height / 2 + foldSize);
}

export const commentSpec: NodeSpec = {
  width: BASE_NODE_WIDTH * (7 / 6),
  minHeight: BASE_NODE_MIN_HEIGHT * (18 / 17),
  lineHeight: BASE_LINE_HEIGHT,
  textPaddingTop: BASE_TEXT_PADDING_TOP * (8 / 7),
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (8 / 7),
  draw: drawCommentShape
};
