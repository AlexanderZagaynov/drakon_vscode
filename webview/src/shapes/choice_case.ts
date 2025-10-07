import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import {
  BASE_NODE_WIDTH,
  BASE_NODE_MIN_HEIGHT,
  BASE_LINE_HEIGHT,
  BASE_TEXT_PADDING_TOP,
  BASE_TEXT_PADDING_BOTTOM
} from './constants.js';

function drawChoiceCaseShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  const triangleHeight = Math.min(height * 0.35, 56);
  const bodyHeight = height - triangleHeight;
  const path = d3.path();

  path.moveTo(-width / 2, -height / 2);
  path.lineTo(width / 2, -height / 2);
  path.lineTo(width / 2, -height / 2 + bodyHeight);
  path.lineTo(0, height / 2);
  path.lineTo(-width / 2, -height / 2 + bodyHeight);
  path.closePath();

  group
    .append('path')
    .attr('class', `node-shape ${node.type}`)
    .attr('d', path.toString());

  group
    .append('line')
    .attr('class', 'node-divider')
    .attr('x1', -width / 2)
    .attr('y1', -height / 2 + bodyHeight)
    .attr('x2', width / 2)
    .attr('y2', -height / 2 + bodyHeight);
}

export const choiceCaseSpec: NodeSpec = {
  width: BASE_NODE_WIDTH,
  minHeight: BASE_NODE_MIN_HEIGHT,
  lineHeight: BASE_LINE_HEIGHT,
  textPaddingTop: BASE_TEXT_PADDING_TOP * (10 / 9),
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (6 / 5),
  draw: drawChoiceCaseShape,
  textBaseline: 'top'
};
