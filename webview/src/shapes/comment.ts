import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import {
  BASE_NODE_WIDTH,
  BASE_NODE_MIN_HEIGHT,
  BASE_LINE_HEIGHT,
  BASE_TEXT_PADDING_TOP,
  BASE_TEXT_PADDING_BOTTOM
} from './constants.js';

function drawCommentShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  // Outer shell – plain rectangle that matches comment fill/stroke palette.
  group
    .append('rect')
    .attr('class', `node-shape ${node.type} comment-outer`)
    .attr('x', -width / 2)
    .attr('y', -height / 2)
    .attr('width', width)
    .attr('height', height)
    .attr('fill', '#d0d0d0')
    .attr('stroke', '#2c3e50')
    .attr('stroke-width', 1.5);

  // Inner rounded panel for the actual text content.
  const inset = Math.max(24, Math.min(width, height) * 0.12);
  const innerWidth = Math.max(0, width - inset * 2);
  const innerHeight = Math.max(0, height - inset * 2);
  const cornerRadius = Math.min(18, Math.min(innerWidth, innerHeight) / 6);

  group
    .append('rect')
    .attr('class', 'comment-inner')
    .attr('x', -innerWidth / 2)
    .attr('y', -innerHeight / 2)
    .attr('width', innerWidth)
    .attr('height', innerHeight)
    .attr('rx', cornerRadius)
    .attr('ry', cornerRadius)
    .attr('stroke', '#2c3e50')
    .attr('stroke-width', 1);
}

export const commentSpec: NodeSpec = {
  width: BASE_NODE_WIDTH * (7 / 6),
  minHeight: BASE_NODE_MIN_HEIGHT * (18 / 17),
  lineHeight: BASE_LINE_HEIGHT,
  textPaddingTop: BASE_TEXT_PADDING_TOP * (9 / 7),
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (9 / 7),
  textPaddingLeft: BASE_TEXT_PADDING_TOP * (10 / 7),
  textPaddingRight: BASE_TEXT_PADDING_TOP * (10 / 7),
  draw: drawCommentShape
};
