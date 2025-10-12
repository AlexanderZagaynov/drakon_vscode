// CSI: duration node — pill shape with one rounded side to suggest time flow.
import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import {
  BASE_NODE_WIDTH,
  BASE_NODE_MIN_HEIGHT,
  BASE_LINE_HEIGHT,
  BASE_TEXT_PADDING_TOP,
  BASE_TEXT_PADDING_BOTTOM
} from './constants.js';

function drawDurationShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  // CSI: semi-capsule — round left edge while keeping right edge straight.
  const radius = height / 2;
  const path = d3.path();
  path.moveTo(-width / 2 + radius, -height / 2);
  path.arc(-width / 2 + radius, 0, radius, -Math.PI / 2, Math.PI / 2, false);
  path.lineTo(width / 2, height / 2);
  path.lineTo(width / 2, -height / 2);
  path.closePath();
  group
    .append('path')
    .attr('class', `node-shape ${node.type}`)
    .attr('d', path.toString());
}

export const durationSpec: NodeSpec = {
  // CSI: moderate padding — align with timeline blocks.
  width: BASE_NODE_WIDTH,
  minHeight: BASE_NODE_MIN_HEIGHT * (14 / 17),
  lineHeight: BASE_LINE_HEIGHT,
  textPaddingTop: BASE_TEXT_PADDING_TOP * (13 / 14),
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (13 / 14),
  draw: drawDurationShape
};
