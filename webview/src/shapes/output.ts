// CSI: output node — mirror of input, slanted left to show data leaving.
import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import {
  BASE_NODE_WIDTH,
  BASE_NODE_MIN_HEIGHT,
  BASE_LINE_HEIGHT,
  BASE_TEXT_PADDING_TOP,
  BASE_TEXT_PADDING_BOTTOM
} from './constants.js';

export function drawOutputShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  // CSI: leftward bevel — complements the input shape for visual balance.
  const bevel = Math.min(width * 0.15, 40);
  const path = d3.path();
  path.moveTo(-width / 2, -height / 2);
  path.lineTo(width / 2 - bevel, -height / 2);
  path.lineTo(width / 2, 0);
  path.lineTo(width / 2 - bevel, height / 2);
  path.lineTo(-width / 2, height / 2);
  path.closePath();
  group
    .append('path')
    .attr('class', `node-shape ${node.type}`)
    .attr('d', path.toString());
}

export const outputSpec: NodeSpec = {
  // CSI: shared padding — keep input/output text areas consistent.
  width: BASE_NODE_WIDTH * (7 / 6),
  minHeight: BASE_NODE_MIN_HEIGHT * (18 / 17),
  lineHeight: BASE_LINE_HEIGHT,
  textPaddingTop: BASE_TEXT_PADDING_TOP * (8 / 7),
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (8 / 7),
  draw: drawOutputShape
};
