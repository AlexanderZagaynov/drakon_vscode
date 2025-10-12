// CSI: pause node — rounded rectangle with top/bottom bands resembling pause icon.
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

function drawPauseShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  // CSI: frame — standard rounded rectangle base.
  drawRoundedRectangle(group, width, height, node);
  const inset = Math.min(height * 0.18, 28);
  group
    .append('rect')
    // CSI: top band — one half of the pause icon motif.
    .attr('class', 'node-band')
    .attr('x', -width / 2)
    .attr('y', -height / 2)
    .attr('width', width)
    .attr('height', inset);
  group
    .append('rect')
    // CSI: bottom band — completes the pause symbol.
    .attr('class', 'node-band')
    .attr('x', -width / 2)
    .attr('y', height / 2 - inset)
    .attr('width', width)
    .attr('height', inset);
}

export const pauseSpec: NodeSpec = {
  // CSI: balanced padding — maintain visual weight around the center text.
  width: BASE_NODE_WIDTH,
  minHeight: BASE_NODE_MIN_HEIGHT * (16 / 17),
  lineHeight: BASE_LINE_HEIGHT,
  textPaddingTop: BASE_TEXT_PADDING_TOP * (8 / 7),
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (8 / 7),
  draw: drawPauseShape
};
