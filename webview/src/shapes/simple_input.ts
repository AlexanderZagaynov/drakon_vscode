import type { NodeSpec } from '../types.js';
import { drawInputShape } from './input.js';

export const simpleInputSpec: NodeSpec = {
  width: 240,
  minHeight: 140,
  lineHeight: 22,
  textPaddingTop: 28,
  textPaddingBottom: 24,
  draw: drawInputShape
};
