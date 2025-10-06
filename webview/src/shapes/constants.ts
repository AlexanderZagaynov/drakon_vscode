export const BASE_NODE_WIDTH = 240;
export const BASE_NODE_MIN_HEIGHT = 170;
export const BASE_LINE_HEIGHT = 22;

export const BASE_TEXT_PADDING_TOP = 28;
export const BASE_TEXT_PADDING_BOTTOM = 28;
export const BASE_TEXT_PADDING_LEFT = 28;
export const BASE_TEXT_PADDING_RIGHT = 28;

export function scale(value: number, factor: number): number {
  return Math.round(value * factor);
}
