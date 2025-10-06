import type { NodeSpec } from '../types.js';
import { drawOutputShape } from './output.js';

export const simpleOutputSpec: NodeSpec = {
  width: 240,
  minHeight: 140,
  lineHeight: 22,
  textPaddingTop: 28,
  textPaddingBottom: 24,
  draw: drawOutputShape
};
