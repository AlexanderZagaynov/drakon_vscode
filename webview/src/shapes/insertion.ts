// CSI: insertion node — rounded rectangle with vertical guides implying slots.
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
  // CSI: base shape — reuse generic rounded rectangle helper.
  drawRoundedRectangle(group, width, height, node);
  const offset = Math.min(width * 0.12, 18);
  const padding = Math.min(height * 0.12, 12);
  const top = -height / 2 + padding;
  const bottom = height / 2 - padding;

  const leftX = -width / 2 + offset;
  const rightX = width / 2 - offset;

  [leftX, rightX].forEach((x) => {
    // CSI: guides — add thin interior lines suggesting insertion slots.
    group
      .append('line')
      .attr('class', 'node-inset-line')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', top)
      .attr('y2', bottom);
  });
}

export const insertionSpec: NodeSpec = {
  // CSI: slight growth — allow extra padding so slot lines don’t crowd text.
  width: BASE_NODE_WIDTH * (13 / 12),
  minHeight: BASE_NODE_MIN_HEIGHT * (20 / 17),
  lineHeight: BASE_LINE_HEIGHT,
  textPaddingTop: BASE_TEXT_PADDING_TOP * (8 / 7),
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (8 / 7),
  draw: drawInsertionShape
};
