// CSI: simple output — compact mirror of simple input.
import type { NodeSpec } from '../types.js';
import { drawOutputShape } from './output.js';
import {
  BASE_NODE_WIDTH,
  BASE_NODE_MIN_HEIGHT,
  BASE_LINE_HEIGHT,
  BASE_TEXT_PADDING_TOP,
  BASE_TEXT_PADDING_BOTTOM
} from './constants.js';

export const simpleOutputSpec: NodeSpec = {
  // CSI: shared metrics — maintain symmetry with the simple input block.
  width: BASE_NODE_WIDTH,
  minHeight: BASE_NODE_MIN_HEIGHT * (14 / 17),
  lineHeight: BASE_LINE_HEIGHT,
  textPaddingTop: BASE_TEXT_PADDING_TOP,
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (6 / 7),
  draw: drawOutputShape
};
