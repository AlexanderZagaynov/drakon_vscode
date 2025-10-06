import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import {
  BASE_NODE_WIDTH,
  BASE_NODE_MIN_HEIGHT,
  BASE_LINE_HEIGHT,
  BASE_TEXT_PADDING_TOP,
  BASE_TEXT_PADDING_BOTTOM,
  BASE_TEXT_PADDING_LEFT,
  BASE_TEXT_PADDING_RIGHT
} from './constants.js';

function drawParametersShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  group
    .append('rect')
    .attr('class', `node-shape ${node.type}`)
    .attr('x', -width / 2)
    .attr('y', -height / 2)
    .attr('width', width)
    .attr('height', height)
    .attr('rx', 0)
    .attr('ry', 0);

  const spurLength = Math.min(width * 0.15, 60);
  group
    .append('line')
    .attr('class', 'node-connection parameters-spur')
    .attr('x1', -width / 2 - spurLength)
    .attr('y1', 0)
    .attr('x2', -width / 2)
    .attr('y2', 0);
}

export const parametersSpec: NodeSpec = {
  width: BASE_NODE_WIDTH * (5 / 4),
  minHeight: BASE_NODE_MIN_HEIGHT * (11 / 17),
  lineHeight: BASE_LINE_HEIGHT * (9 / 11),
  textBaseline: 'center',
  textYOffset: 0,
  textPaddingTop: BASE_TEXT_PADDING_TOP * (6 / 7),
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (5 / 7),
  textPaddingLeft: BASE_TEXT_PADDING_LEFT * (8 / 7),
  textPaddingRight: BASE_TEXT_PADDING_RIGHT * (6 / 7),
  baseWidth: BASE_NODE_WIDTH * (5 / 4),
  textAlign: 'left',
  draw: drawParametersShape
};
