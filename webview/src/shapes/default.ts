import type { NodeSpec } from '../types.js';
import { drawRoundedRectangle } from './common.js';
import {
  BASE_NODE_WIDTH,
  BASE_NODE_MIN_HEIGHT,
  BASE_TEXT_PADDING_TOP,
  BASE_TEXT_PADDING_BOTTOM,
  BASE_LINE_HEIGHT
} from './constants.js';

export const defaultSpec: NodeSpec = {
  width: BASE_NODE_WIDTH,
  minHeight: BASE_NODE_MIN_HEIGHT,
  textPaddingTop: BASE_TEXT_PADDING_TOP,
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM,
  lineHeight: BASE_LINE_HEIGHT,
  draw: drawRoundedRectangle
};
