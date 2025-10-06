import type { NodeSpec } from '../types.js';
import { drawStadium } from './common.js';

export const startSpec: NodeSpec = {
  width: 240,
  minHeight: 140,
  lineHeight: 22,
  draw: drawStadium
};
