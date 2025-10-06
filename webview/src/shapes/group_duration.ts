import type { NodeSpec } from '../types.js';
import { drawStadium } from './common.js';

export const groupDurationSpec: NodeSpec = {
  width: 120,
  minHeight: 260,
  lineHeight: 22,
  textPaddingTop: 36,
  textPaddingBottom: 36,
  draw: drawStadium
};
