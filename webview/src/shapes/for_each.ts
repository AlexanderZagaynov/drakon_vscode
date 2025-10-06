import type { NodeSpec } from '../types.js';
import { drawActionShape } from './action.js';

export const forEachSpec: NodeSpec = {
  width: 260,
  minHeight: 200,
  lineHeight: 24,
  textPaddingTop: 36,
  textPaddingBottom: 36,
  draw: drawActionShape
};
