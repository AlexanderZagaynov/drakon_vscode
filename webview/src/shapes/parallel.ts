import type { NodeSpec } from '../types.js';
import { drawActionShape } from './action.js';

export const parallelSpec: NodeSpec = {
  width: 260,
  minHeight: 220,
  lineHeight: 24,
  textPaddingTop: 36,
  textPaddingBottom: 36,
  draw: drawActionShape
};
