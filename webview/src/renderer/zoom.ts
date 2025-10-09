import type { ZoomTransform } from 'd3';
import type { LayoutResult } from '../types.js';
import type { DiagramContainer } from './types.js';
import { ZOOM_STEP, MAX_ZOOM, MIN_ZOOM } from './constants.js';
import { state } from './state.js';
import { computeDiagramContentBounds, round } from './utils.js';

type ContainerMetrics = {
  width: number;
  height: number;
};

type ZoomContext = {
  container: DiagramContainer;
  layout: LayoutResult;
  metrics: ContainerMetrics;
};

function formatDebugValue(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value == null) {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function logDebug(scope: string, payload: Record<string, unknown>): void {
  Object.entries(payload).forEach(([key, value]) => {
    console.log(`${scope}_${key}=${formatDebugValue(value)}`);
  });
}

function requireZoomContext(scope: string): ZoomContext | null {
  const layout = state.currentLayout;
  if (!layout) {
    console.log(`${scope}_missingLayout=1`);
    return null;
  }
  const container = state.currentContainer;
  if (!container) {
    console.log(`${scope}_missingContainer=1`);
    return null;
  }
  const metrics = getContainerMetrics(layout);
  if (!metrics) {
    console.log(`${scope}_missingMetrics=1`);
    return null;
  }
  return { container, layout, metrics };
}

export function applyZoomTransform(transform: ZoomTransform, animate: boolean): void {
  if (!state.currentSvg || !state.zoomBehavior) {
    return;
  }
  if (animate) {
    state.currentSvg.transition().duration(200).call(state.zoomBehavior.transform, transform);
  } else {
    state.currentSvg.call(state.zoomBehavior.transform, transform);
  }
}

function getCurrentScale(): number {
  const scale = state.currentTransform?.k;
  if (!Number.isFinite(scale) || !scale || scale <= 0) {
    return 1;
  }
  return scale;
}

function getContainerMetrics(layout: LayoutResult): ContainerMetrics | null {
  const host = state.currentScrollHost ?? state.currentContainer;
  if (!host) {
    return null;
  }
  const width = host.clientWidth || layout.width;
  const height = host.clientHeight || layout.height;
  return { width, height };
}

function clampTranslation(
  desired: number,
  scale: number,
  diagramSize: number,
  containerSize: number
): number {
  const scaledSize = diagramSize * scale;
  if (!Number.isFinite(scaledSize)) {
    return 0;
  }

  if (scaledSize <= containerSize) {
    const min = 0;
    const max = containerSize - scaledSize;
    const target = Number.isFinite(desired) ? desired : min;
    return round(Math.min(max, Math.max(min, target)));
  }

  const min = containerSize - scaledSize;
  const max = 0;
  const target = Number.isFinite(desired) ? desired : max;
  return round(Math.min(max, Math.max(min, target)));
}

function clampScaleValue(scale: number): number | null {
  if (!Number.isFinite(scale) || scale <= 0) {
    return null;
  }
  const limited = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
  return round(limited);
}

type ScaleOptions = {
  animate?: boolean;
  viewportAnchor?: readonly [number, number];
  diagramAnchor?: readonly [number, number];
};

function applyScale(targetScale: number, options?: ScaleOptions): void {
  const context = requireZoomContext('applyScale');
  if (!context) {
    return;
  }
  const { layout, metrics } = context;

  const normalizedScale = clampScaleValue(targetScale);
  if (normalizedScale === null) {
    logDebug('applyScale', { invalidTarget: targetScale });
    return;
  }

  const currentScale = getCurrentScale();
  if (Math.abs(currentScale - normalizedScale) < 1e-6) {
    logDebug('applyScale', { sameScale: normalizedScale });
  }

  const fallbackViewportAnchor = [metrics.width / 2, metrics.height / 2] as const;
  const resolvedViewportAnchor = options?.viewportAnchor ?? fallbackViewportAnchor;
  const viewportAnchor: readonly [number, number] = [resolvedViewportAnchor[0], resolvedViewportAnchor[1]] as const;

  let diagramAnchor: readonly [number, number];
  if (options?.diagramAnchor) {
    diagramAnchor = options.diagramAnchor;
  } else {
    const transform = state.currentTransform ?? d3.zoomIdentity;
    const inverted = transform.invert(viewportAnchor as [number, number]);
    const diagX = Number.isFinite(inverted[0]) ? inverted[0] : layout.width / 2;
    const diagY = Number.isFinite(inverted[1]) ? inverted[1] : layout.height / 2;
    diagramAnchor = [diagX, diagY] as const;
  }

  const translateX = round(viewportAnchor[0] - diagramAnchor[0] * normalizedScale);
  const translateY = round(viewportAnchor[1] - diagramAnchor[1] * normalizedScale);

  logDebug('applyScale', {
    targetScale,
    normalizedScale,
    viewportAnchorX: viewportAnchor[0],
    viewportAnchorY: viewportAnchor[1],
    diagramAnchorX: diagramAnchor[0],
    diagramAnchorY: diagramAnchor[1],
    translateX,
    translateY
  });

  setTransform(normalizedScale, translateX, translateY, options?.animate ?? true);
}

export function setTransform(scale: number, translateX: number, translateY: number, animate: boolean): void {
  const context = requireZoomContext('setTransform');
  if (!context) {
    return;
  }
  const { layout, metrics } = context;
  const clampedX = clampTranslation(translateX, scale, layout.width, metrics.width);
  const clampedY = clampTranslation(translateY, scale, layout.height, metrics.height);
  const transform = d3.zoomIdentity.translate(clampedX, clampedY).scale(round(scale));
  applyZoomTransform(transform, animate);
}

function panTo(translateX: number, translateY: number, animate: boolean): void {
  const scale = getCurrentScale();
  let nextX = translateX;
  let nextY = translateY;
  if (!Number.isFinite(nextX)) {
    nextX = round(state.currentTransform?.x ?? 0);
  }
  if (!Number.isFinite(nextY)) {
    nextY = round(state.currentTransform?.y ?? 0);
  }
  setTransform(scale, nextX, nextY, animate);
}

function moveViewportToOrigin(animate: boolean): void {
  const host = state.currentScrollHost ?? state.currentContainer;
  host?.scrollTo({ left: 0, top: 0, behavior: animate ? 'smooth' : 'auto' });
  const scale = getCurrentScale();
  setTransform(scale, 0, 0, animate);
}

function currentTranslation(
  scale: number,
  dimension: 'x' | 'y',
  containerSize: number,
  diagramSize: number
): number {
  const existing = state.currentTransform
    ? dimension === 'x'
      ? state.currentTransform.x
      : state.currentTransform.y
    : undefined;
  if (Number.isFinite(existing)) {
    return round(existing as number);
  }
  return clampTranslation(0, scale, diagramSize, containerSize);
}

function panToEdge(direction: 'top' | 'bottom' | 'left' | 'right', animate: boolean): void {
  const context = requireZoomContext('panToEdge');
  if (!context) {
    return;
  }
  const { layout, metrics } = context;
  const scale = getCurrentScale();
  let targetX = currentTranslation(scale, 'x', metrics.width, layout.width);
  let targetY = currentTranslation(scale, 'y', metrics.height, layout.height);

  switch (direction) {
    case 'top':
      targetY = 0;
      break;
    case 'bottom':
      targetY = metrics.height - layout.height * scale;
      break;
    case 'left':
      targetX = 0;
      break;
    case 'right':
      targetX = metrics.width - layout.width * scale;
      break;
    default:
      break;
  }

  setTransform(scale, targetX, targetY, animate);
}

function focusNodeById(nodeId: string, animate: boolean): void {
  const context = requireZoomContext('focusNode');
  if (!context) {
    return;
  }
  const { layout, metrics } = context;
  const position = layout.positions.get(nodeId);
  if (!position) {
    return;
  }
  const scale = getCurrentScale();
  const targetX = round(metrics.width / 2 - position.x * scale);
  const targetY = round(metrics.height / 2 - position.y * scale);
  setTransform(scale, targetX, targetY, animate);
}

function scaleDiagram(factor: number, anchor?: readonly [number, number]): void {
  if (!Number.isFinite(factor) || factor <= 0) {
    logDebug('scaleDiagram', { invalidFactor: factor });
    return;
  }
  const currentScale = getCurrentScale();
  const targetScale = currentScale * factor;
  logDebug('scaleDiagram', {
    factor,
    currentScale,
    targetScale
  });
  const transform = state.currentTransform ?? d3.zoomIdentity;
  const viewportAnchor = anchor ?? ([transform.x, transform.y] as const);
  applyScale(targetScale, {
    viewportAnchor,
    diagramAnchor: [0, 0] as const,
    animate: true
  });
}

function getViewportCenterAnchor(): readonly [number, number] | null {
  const svgNode = state.currentSvg?.node();
  if (!svgNode) {
    return null;
  }
  const host = state.currentScrollHost ?? state.currentContainer;
  if (!host) {
    return null;
  }
  const svgRect = svgNode.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  if (hostRect.width <= 0 || hostRect.height <= 0) {
    return null;
  }
  const centerX = hostRect.left + hostRect.width / 2 - svgRect.left;
  const centerY = hostRect.top + hostRect.height / 2 - svgRect.top;
  return [centerX, centerY];
}

export function zoomIn(): void {
  scaleDiagram(ZOOM_STEP);
}

export function zoomOut(): void {
  scaleDiagram(1 / ZOOM_STEP);
}

export function zoomToFit(): void {
  const context = requireZoomContext('zoomToFit');
  if (!context) {
    return;
  }
  const host = state.currentScrollHost ?? context.container;
  host?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  logDebug('zoomToFit', { scale: 1, translateX: 0, translateY: 0 });
  setTransform(1, 0, 0, true);
}

export function resetZoomToActual(): void {
  logDebug('resetZoom', { event: 'start' });
  if (!state.currentLayout || !state.currentContainer) {
    logDebug('resetZoom', { missingLayoutOrContainer: true });
    return;
  }

  const layout = state.currentLayout;
  const container = state.currentContainer;
  const metrics = getContainerMetrics(layout);
  if (!metrics) {
    logDebug('resetZoom', { missingMetrics: true });
    return;
  }

  const layoutWidth = layout.width;
  const layoutHeight = layout.height;
  let minX = 0;
  let minY = 0;
  let maxX = layoutWidth;
  let maxY = layoutHeight;

  if (state.currentDiagram) {
    const bounds = computeDiagramContentBounds(state.currentDiagram, layout);
    if (bounds) {
      minX = Math.min(bounds.minX, minX);
      minY = Math.min(bounds.minY, minY);
      maxX = Math.max(bounds.maxX, maxX);
      maxY = Math.max(bounds.maxY, maxY);
      logDebug('resetZoom', {
        contentMinX: bounds.minX,
        contentMinY: bounds.minY,
        contentMaxX: bounds.maxX,
        contentMaxY: bounds.maxY
      });
    } else {
      logDebug('resetZoom', { contentBoundsFallback: true });
    }
  } else {
    logDebug('resetZoom', { noDiagram: true });
  }

  const zoomTargetNode = state.zoomTarget?.node();
  if (zoomTargetNode) {
    const bbox = zoomTargetNode.getBBox();
    const bboxMaxX = bbox.x + bbox.width;
    const bboxMaxY = bbox.y + bbox.height;
    minX = Math.min(minX, bbox.x);
    minY = Math.min(minY, bbox.y);
    maxX = Math.max(maxX, bboxMaxX);
    maxY = Math.max(maxY, bboxMaxY);
    logDebug('resetZoom', {
      bboxX: bbox.x,
      bboxY: bbox.y,
      bboxWidth: bbox.width,
      bboxHeight: bbox.height
    });
  } else {
    logDebug('resetZoom', { noBBox: true });
  }

  const contentWidth = Math.max(maxX - minX, 1);
  const contentHeight = Math.max(maxY - minY, 1);
  const domContentWidth = container.scrollWidth || contentWidth;
  const domContentHeight = container.scrollHeight || contentHeight;
  const effectiveWidth = Math.max(contentWidth, domContentWidth);
  const effectiveHeight = Math.max(contentHeight, domContentHeight);
  const scaleX = metrics.width / contentWidth;
  const scaleY = metrics.height / contentHeight;
  const devicePixelRatio = window.devicePixelRatio || 1;
  const scaleDomX = metrics.width / effectiveWidth;
  const scaleDomY = metrics.height / effectiveHeight;
  const baseScale = Math.min(scaleX, scaleY, scaleDomX, scaleDomY);
  const desiredScale = baseScale / devicePixelRatio;
  const normalizedScale = clampScaleValue(desiredScale) ?? 1;

  logDebug('resetZoom', {
    containerWidth: metrics.width,
    containerHeight: metrics.height,
    contentWidth,
    contentHeight,
    domContentWidth,
    domContentHeight,
    scaleX,
    scaleY,
    scaleDomX,
    scaleDomY,
    devicePixelRatio,
    baseScale,
    desiredScale,
    normalizedScale
  });

  const contentCenterX = (minX + maxX) / 2;
  const contentCenterY = (minY + maxY) / 2;
  logDebug('resetZoom', {
    contentCenterX,
    contentCenterY
  });

  const translateX = round(-minX * normalizedScale);
  const translateY = round(-minY * normalizedScale);
  logDebug('resetZoom', {
    translateX,
    translateY
  });

  setTransform(normalizedScale, translateX, translateY, false);

  logDebug('resetZoom', { event: 'complete' });
}

export function scrollToTop(): void {
  panToEdge('top', true);
}

export function scrollToBottom(): void {
  panToEdge('bottom', true);
}

export function scrollToLeft(): void {
  panToEdge('left', true);
}

export function scrollToRight(): void {
  panToEdge('right', true);
}

export function focusStartNode(): void {
  if (!state.currentLayout) {
    return;
  }
  moveViewportToOrigin(true);
}

export function focusNode(nodeId: string): void {
  focusNodeById(nodeId, true);
}

export function panBy(deltaX: number, deltaY: number): void {
  panTo(deltaX, deltaY, true);
}
