// CSI: question node — hexagonal decision diamond rendered via custom path.
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

function drawQuestionShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  // CSI: construct beveled hexagon — emulate classic DRAKON decision diamond.
  const path = d3.path();
  const bevel = Math.min(width / 4, height / 1.5);
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  path.moveTo(-halfWidth + bevel, -halfHeight);
  path.lineTo(halfWidth - bevel, -halfHeight);
  path.lineTo(halfWidth, 0);
  path.lineTo(halfWidth - bevel, halfHeight);
  path.lineTo(-halfWidth + bevel, halfHeight);
  path.lineTo(-halfWidth, 0);
  path.closePath();
  group
    .append('path')
    .attr('class', `node-shape ${node.type}`)
    .attr('d', path.toString());
}

export const questionSpec: NodeSpec = {
  // CSI: widen footprint — allow space for longer Yes/No labels.
  width: BASE_NODE_WIDTH * (4 / 3),
  minHeight: BASE_NODE_MIN_HEIGHT,
  lineHeight: BASE_LINE_HEIGHT,
  textPaddingTop: BASE_TEXT_PADDING_TOP,
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM,
  draw: drawQuestionShape
};
