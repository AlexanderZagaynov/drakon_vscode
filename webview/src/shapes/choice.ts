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

function drawChoiceShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  const skew = Math.min(width * 0.18, 42);
  const path = d3.path();
  path.moveTo(-width / 2 + skew, -height / 2);
  path.lineTo(width / 2, -height / 2);
  path.lineTo(width / 2 - skew, height / 2);
  path.lineTo(-width / 2, height / 2);
  path.closePath();
  group
    .append('path')
    .attr('class', `node-shape ${node.type}`)
    .attr('d', path.toString());
}

export const choiceSpec: NodeSpec = {
  width: BASE_NODE_WIDTH * (7 / 6),
  minHeight: BASE_NODE_MIN_HEIGHT * (20 / 17),
  lineHeight: BASE_LINE_HEIGHT * (12 / 11),
  textPaddingTop: BASE_TEXT_PADDING_TOP * (9 / 7),
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (9 / 7),
  draw: drawChoiceShape
};
