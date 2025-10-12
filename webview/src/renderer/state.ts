// CSI: renderer state — central cache for cross-module coordination between
// zoom logic, document rendering, and toolbar actions.

import type { Selection, ZoomBehavior, ZoomTransform } from 'd3';
import type { Diagram, LayoutResult } from '../types.js';
import type { DiagramContainer } from './types.js';

export interface RendererState {
  currentSvg: Selection<SVGSVGElement, unknown, null, undefined> | null;
  zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null;
  zoomTarget: Selection<SVGGElement, unknown, null, undefined> | null;
  currentTransform: ZoomTransform | null;
  currentLayout: LayoutResult | null;
  currentContainer: DiagramContainer | null;
  currentDiagram: Diagram | null;
  currentScrollHost: HTMLElement | null;
}

export const state: RendererState = {
  // CSI: defaults — initialize to null so checks for active zoom/layout context
  // stay explicit and predictable.
  currentSvg: null,
  zoomBehavior: null,
  zoomTarget: null,
  currentTransform: null,
  currentLayout: null,
  currentContainer: null,
  currentDiagram: null,
  currentScrollHost: null
};

export function initializeState(diagramEl: DiagramContainer): void {
  // CSI: reset — clear derived state before a new render pass, while keeping a
  // pointer to the current container/scroll host for follow-up operations.
  state.currentSvg = null;
  state.zoomBehavior = null;
  state.zoomTarget = null;
  state.currentTransform = null;
  state.currentLayout = null;
  state.currentContainer = diagramEl;
  state.currentDiagram = null;
  state.currentScrollHost = diagramEl.parentElement instanceof HTMLElement ? diagramEl.parentElement : null;
}
