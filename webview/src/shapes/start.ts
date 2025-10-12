// CSI: start node — stadium shape marking entry into the algorithm.
import type { NodeSpec } from '../types.js';
import { drawStadium } from './common.js';
import {
  BASE_NODE_WIDTH,
  BASE_NODE_MIN_HEIGHT,
  BASE_LINE_HEIGHT,
  BASE_TEXT_PADDING_TOP,
  BASE_TEXT_PADDING_BOTTOM
} from './constants.js';

export const startSpec: NodeSpec = {
  // CSI: proportions — slightly narrower/shorter than action nodes to keep the
  // start marker visually distinct.
  width: BASE_NODE_WIDTH * (5 / 6),
  minHeight: BASE_NODE_MIN_HEIGHT * (10 / 17),
  lineHeight: BASE_LINE_HEIGHT * (10 / 11),
  textPaddingTop: BASE_TEXT_PADDING_TOP * (5 / 7),
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (5 / 7),
  draw: drawStadium
};
