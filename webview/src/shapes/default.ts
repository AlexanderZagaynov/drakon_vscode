import type { NodeSpec } from '../types.js';
import { drawRoundedRectangle } from './common.js';

export const defaultSpec: NodeSpec = {
  width: 240,
  minHeight: 170,
  textPaddingTop: 28,
  textPaddingBottom: 28,
  lineHeight: 22,
  draw: drawRoundedRectangle
};
