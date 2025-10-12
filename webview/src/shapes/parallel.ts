// CSI: parallel block — visually similar to action but scaled for lane headers.
import type { NodeSpec } from '../types.js';
import { drawActionShape } from './action.js';
import {
  BASE_NODE_WIDTH,
  BASE_NODE_MIN_HEIGHT,
  BASE_LINE_HEIGHT,
  BASE_TEXT_PADDING_TOP,
  BASE_TEXT_PADDING_BOTTOM
} from './constants.js';

export const parallelSpec: NodeSpec = {
  // CSI: expanded footprint — emphasize that child branches run side-by-side.
  width: BASE_NODE_WIDTH * (13 / 12),
  minHeight: BASE_NODE_MIN_HEIGHT * (22 / 17),
  lineHeight: BASE_LINE_HEIGHT * (12 / 11),
  textPaddingTop: BASE_TEXT_PADDING_TOP * (9 / 7),
  textPaddingBottom: BASE_TEXT_PADDING_BOTTOM * (9 / 7),
  draw: drawActionShape
};
