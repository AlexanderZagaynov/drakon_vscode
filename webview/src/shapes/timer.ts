// CSI: timer node — hourglass silhouette highlighting long-running steps.
import type { DiagramNode, NodeSpec } from '../types.js';
import type { NodeSelection } from './common.js';
import {
  BASE_NODE_WIDTH,
  BASE_NODE_MIN_HEIGHT,
  BASE_LINE_HEIGHT,
  BASE_TEXT_PADDING_TOP,
  BASE_TEXT_PADDING_BOTTOM
} from './constants.js';

function drawTimerShape(group: NodeSelection, width: number, height: number, node: DiagramNode): void {
  // CSI: hourglass path — pinch at the waist to match official DRAKON timer icon.
  const waist = Math.min(width * 0.32, 70);
  const path = d3.path();
  path.moveTo(-width / 2, -height / 2);
  path.lineTo(width / 2, -height / 2);
  path.lineTo(waist / 2, 0);
  path.lineTo(width / 2, height / 2);
  path.lineTo(-width / 2, height / 2);
  path.lineTo(-waist / 2, 0);
  path.closePath();
  group
    .append('path')
    .attr('class', `node-shape ${node.type}`)
    .attr('d', path.toString());
}

export const timerSpec: NodeSpec = {
  // CSI: tall + extra top padding — leave room for “Timer” label above the waist.
  width: BASE_NODE_WIDTH * (13 / 12),
  minHeight: BASE_NODE_MIN_HEIGHT * (26 / 17),
  lineHeight: BASE_LINE_HEIGHT * (12 / 11),
  textPaddingTop: BASE_TEXT_PADDING_TOP * 5,
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (9 / 7),
  draw: drawTimerShape
};
