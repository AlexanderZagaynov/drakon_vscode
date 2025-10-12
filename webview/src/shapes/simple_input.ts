// CSI: simple input — compact variant for quick prompts.
import type { NodeSpec } from '../types.js';
import { drawInputShape } from './input.js';
import {
  BASE_NODE_WIDTH,
  BASE_NODE_MIN_HEIGHT,
  BASE_LINE_HEIGHT,
  BASE_TEXT_PADDING_TOP,
  BASE_TEXT_PADDING_BOTTOM
} from './constants.js';

export const simpleInputSpec: NodeSpec = {
  // CSI: default width — keep slim footprint for lightweight dialogs.
  width: BASE_NODE_WIDTH,
  minHeight: BASE_NODE_MIN_HEIGHT * (14 / 17),
  lineHeight: BASE_LINE_HEIGHT,
  textPaddingTop: BASE_TEXT_PADDING_TOP,
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (6 / 7),
  draw: drawInputShape
};
