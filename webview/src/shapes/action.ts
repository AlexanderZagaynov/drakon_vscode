// CSI: action node — classic rectangle used for imperative steps.
import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import {
  BASE_NODE_WIDTH,
  BASE_NODE_MIN_HEIGHT,
  BASE_LINE_HEIGHT,
  BASE_TEXT_PADDING_TOP,
  BASE_TEXT_PADDING_BOTTOM
} from './constants.js';

function drawActionShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  // CSI: geometry — centered rect with crisp corners (rx/ry = 0) per DRAKON spec.
  group
    .append('rect')
    .attr('class', `node-shape ${node.type}`)
    .attr('x', -width / 2)
    .attr('y', -height / 2)
    .attr('width', width)
    .attr('height', height)
    .attr('rx', 0)
    .attr('ry', 0);
}

export const actionSpec: NodeSpec = {
  // CSI: metrics — shrink min height slightly below generic default to match
  // reference illustrations.
  width: BASE_NODE_WIDTH,
  minHeight: BASE_NODE_MIN_HEIGHT * (14 / 17),
  lineHeight: BASE_LINE_HEIGHT,
  textPaddingTop: BASE_TEXT_PADDING_TOP,
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM,
  draw: drawActionShape
};

export { drawActionShape };
