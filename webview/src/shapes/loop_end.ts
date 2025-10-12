// CSI: loop end node — action-like with clipped bottom corners indicating loop closure.
import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import {
  BASE_NODE_WIDTH,
  BASE_NODE_MIN_HEIGHT,
  BASE_LINE_HEIGHT,
  BASE_TEXT_PADDING_TOP,
  BASE_TEXT_PADDING_BOTTOM
} from './constants.js';

function drawLoopEndShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  // CSI: keep top flat; bevel bottom corners to show the loop returning upward.
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const bevel = Math.max(6, Math.min(halfWidth * 0.25, 14));

  const topY = -halfHeight;
  const bottomY = halfHeight;
  const leftX = -halfWidth;
  const rightX = halfWidth;

  const path = d3.path();
  path.moveTo(leftX, topY);
  path.lineTo(rightX, topY);
  path.lineTo(rightX, bottomY - bevel);
  path.lineTo(rightX - bevel, bottomY);
  path.lineTo(leftX + bevel, bottomY);
  path.lineTo(leftX, bottomY - bevel);
  path.closePath();

  group
    .append('path')
    .attr('class', `node-shape ${node.type}`)
    .attr('d', path.toString());
}

export const loopEndSpec: NodeSpec = {
  // CSI: slim footprint — align with for-each headers stacked above.
  width: BASE_NODE_WIDTH * (13 / 12),
  minHeight: BASE_NODE_MIN_HEIGHT * (9 / 17),
  lineHeight: BASE_LINE_HEIGHT * (9 / 11),
  textPaddingTop: BASE_TEXT_PADDING_TOP * (3 / 7),
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (3 / 7),
  draw: drawLoopEndShape
};
