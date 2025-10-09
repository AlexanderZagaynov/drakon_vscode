import type { Diagram } from '../types.js';

export type DiagramContainer = HTMLElement;

export interface ParseResult {
  diagram: Diagram | null;
  errors: string[];
}
