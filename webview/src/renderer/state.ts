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
  state.currentSvg = null;
  state.zoomBehavior = null;
  state.zoomTarget = null;
  state.currentTransform = null;
  state.currentLayout = null;
  state.currentContainer = diagramEl;
  state.currentDiagram = null;
  state.currentScrollHost = diagramEl.parentElement instanceof HTMLElement ? diagramEl.parentElement : null;
}
