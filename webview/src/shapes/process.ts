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

function drawProcessShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  drawRoundedRectangle(group, width, height, node);
  const band = Math.min(height * 0.2, 48);
  const secondBand = band * 2;
  [band, secondBand].forEach((offset) => {
    group
      .append('line')
      .attr('class', 'node-divider')
      .attr('x1', -width / 2)
      .attr('x2', width / 2)
      .attr('y1', -height / 2 + offset)
      .attr('y2', -height / 2 + offset);
  });
}

export const processSpec: NodeSpec = {
  width: BASE_NODE_WIDTH * (13 / 12),
  minHeight: BASE_NODE_MIN_HEIGHT * (26 / 17),
  lineHeight: BASE_LINE_HEIGHT * (12 / 11),
  textPaddingTop: BASE_TEXT_PADDING_TOP * (18 / 7),
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (9 / 7),
  draw: drawProcessShape
};
