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

function drawControlPeriodEndShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  drawRoundedRectangle(group, width, height, node);
  const gateWidth = Math.min(width * 0.18, 44);
  const offset = width / 2 - gateWidth;
  [offset, offset - gateWidth / 2].forEach((x) => {
    group
      .append('line')
      .attr('class', 'node-divider')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', -height / 2 + 16)
      .attr('y2', height / 2 - 16);
  });
}

export const ctrlPeriodEndSpec: NodeSpec = {
  width: BASE_NODE_WIDTH * (13 / 12),
  minHeight: BASE_NODE_MIN_HEIGHT * (22 / 17),
  lineHeight: BASE_LINE_HEIGHT * (12 / 11),
  textPaddingTop: BASE_TEXT_PADDING_TOP * (11 / 7),
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (9 / 7),
  draw: drawControlPeriodEndShape
};
