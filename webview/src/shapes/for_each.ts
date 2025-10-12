// CSI: for-each node — loop header with clipped corners hinting iteration.
import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import {
  BASE_NODE_WIDTH,
  BASE_NODE_MIN_HEIGHT,
  BASE_LINE_HEIGHT,
  BASE_TEXT_PADDING_TOP,
  BASE_TEXT_PADDING_BOTTOM
} from './constants.js';

function drawForEachShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  // CSI: bevel corners — give subtle visual distinction from action nodes.
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const bevel = Math.max(6, Math.min(halfWidth * 0.25, 14));

  const topY = -halfHeight;
  const bottomY = halfHeight;
  const leftX = -halfWidth;
  const rightX = halfWidth;

  const pathData = [
    `M ${leftX + bevel} ${topY}`,
    `L ${rightX - bevel} ${topY}`,
    `L ${rightX} ${topY + bevel}`,
    `L ${rightX} ${bottomY}`,
    `L ${leftX} ${bottomY}`,
    `L ${leftX} ${topY + bevel}`,
    'Z'
  ].join(' ');

  group
    .append('path')
    .attr('class', `node-shape ${node.type}`)
    .attr('d', pathData);
}

export const forEachSpec: NodeSpec = {
  // CSI: lean height — loop headers stay compact above repeated blocks.
  width: BASE_NODE_WIDTH * (13 / 12),
  minHeight: BASE_NODE_MIN_HEIGHT * (9 / 17),
  lineHeight: BASE_LINE_HEIGHT * (9 / 11),
  textPaddingTop: BASE_TEXT_PADDING_TOP * (3 / 7),
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (3 / 7),
  draw: drawForEachShape
};

export { drawForEachShape };
