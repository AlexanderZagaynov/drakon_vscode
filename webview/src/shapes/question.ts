import type { NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import type { DiagramNode } from '../types.js';
import {
  BASE_NODE_WIDTH,
  BASE_NODE_MIN_HEIGHT,
  BASE_LINE_HEIGHT,
  BASE_TEXT_PADDING_TOP,
  BASE_TEXT_PADDING_BOTTOM
} from './constants.js';

function drawQuestionShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  const path = d3.path();
  path.moveTo(0, -height / 2);
  path.lineTo(width / 2, 0);
  path.lineTo(0, height / 2);
  path.lineTo(-width / 2, 0);
  path.closePath();
  group
    .append('path')
    .attr('class', `node-shape ${node.type}`)
    .attr('d', path.toString());
}

export const questionSpec: NodeSpec = {
  width: BASE_NODE_WIDTH * (7 / 6),
  minHeight: BASE_NODE_MIN_HEIGHT * (18 / 17),
  lineHeight: BASE_LINE_HEIGHT * (12 / 11),
  textPaddingTop: BASE_TEXT_PADDING_TOP * (9 / 7),
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (9 / 7),
  draw: drawQuestionShape
};
