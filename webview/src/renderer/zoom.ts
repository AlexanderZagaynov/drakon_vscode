import type { ZoomTransform } from 'd3';
import { ZOOM_STEP, MAX_ZOOM, MIN_ZOOM } from './constants.js';
import { state } from './state.js';
import { computeDiagramContentBounds, computeFitTransform, round } from './utils.js';

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

function getContainerMetrics(): { width: number; height: number } | null {
  if (!state.currentLayout) {
    return null;
  }
  const host = state.currentScrollHost ?? state.currentContainer;
  if (!host) {
    return null;
  }
  const width = host.clientWidth || state.currentLayout.width;
  const height = host.clientHeight || state.currentLayout.height;
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
  if (!state.currentLayout) {
    console.log('applyScale_missingLayout=1');
    return;
  }
  const metrics = getContainerMetrics();
  if (!metrics) {
    console.log('applyScale_missingMetrics=1');
    return;
  }

  const normalizedScale = clampScaleValue(targetScale);
  if (normalizedScale === null) {
    console.log(`applyScale_invalidTarget=${targetScale}`);
    return;
  }

  const currentScale = getCurrentScale();
  if (Math.abs(currentScale - normalizedScale) < 1e-6) {
    console.log(`applyScale_sameScale=${normalizedScale}`);
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
  const diagX = Number.isFinite(inverted[0]) ? inverted[0] : state.currentLayout.width / 2;
  const diagY = Number.isFinite(inverted[1]) ? inverted[1] : state.currentLayout.height / 2;
  diagramAnchor = [diagX, diagY] as const;
  }

  const translateX = round(viewportAnchor[0] - diagramAnchor[0] * normalizedScale);
  const translateY = round(viewportAnchor[1] - diagramAnchor[1] * normalizedScale);

  console.log(`applyScale_targetScale=${targetScale}`);
  console.log(`applyScale_normalizedScale=${normalizedScale}`);
  console.log(`applyScale_viewportAnchorX=${viewportAnchor[0]}`);
  console.log(`applyScale_viewportAnchorY=${viewportAnchor[1]}`);
  console.log(`applyScale_diagramAnchorX=${diagramAnchor[0]}`);
  console.log(`applyScale_diagramAnchorY=${diagramAnchor[1]}`);
  console.log(`applyScale_translateX=${translateX}`);
  console.log(`applyScale_translateY=${translateY}`);

  setTransform(normalizedScale, translateX, translateY, options?.animate ?? true);
}

export function setTransform(scale: number, translateX: number, translateY: number, animate: boolean): void {
  if (!state.currentLayout || !state.currentContainer) {
    return;
  }
  const metrics = getContainerMetrics();
  if (!metrics) {
    return;
  }
  const clampedX = clampTranslation(translateX, scale, state.currentLayout.width, metrics.width);
  const clampedY = clampTranslation(translateY, scale, state.currentLayout.height, metrics.height);
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
  if (!state.currentLayout) {
    return;
  }
  const metrics = getContainerMetrics();
  if (!metrics) {
    return;
  }
  const scale = getCurrentScale();
  let targetX = currentTranslation(scale, 'x', metrics.width, state.currentLayout.width);
  let targetY = currentTranslation(scale, 'y', metrics.height, state.currentLayout.height);

  switch (direction) {
    case 'top':
      targetY = 0;
      break;
    case 'bottom':
      targetY = metrics.height - state.currentLayout.height * scale;
      break;
    case 'left':
      targetX = 0;
      break;
    case 'right':
      targetX = metrics.width - state.currentLayout.width * scale;
      break;
    default:
      break;
  }

  setTransform(scale, targetX, targetY, animate);
}

function focusNodeById(nodeId: string, animate: boolean): void {
  if (!state.currentLayout) {
    return;
  }
  const metrics = getContainerMetrics();
  if (!metrics) {
    return;
  }
  const position = state.currentLayout.positions.get(nodeId);
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
    console.log(`scaleDiagram_invalidFactor=${factor}`);
    return;
  }
  const currentScale = getCurrentScale();
  const targetScale = currentScale * factor;
  console.log(`scaleDiagram_factor=${factor}`);
  console.log(`scaleDiagram_currentScale=${currentScale}`);
  console.log(`scaleDiagram_targetScale=${targetScale}`);
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
  if (!state.currentLayout || !state.currentContainer) {
    console.log('zoomToFit_missingLayoutOrContainer=1');
    return;
  }
  const host = state.currentScrollHost ?? state.currentContainer;
  host?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  console.log('zoomToFit_scale=1');
  console.log('zoomToFit_translateX=0');
  console.log('zoomToFit_translateY=0');
  setTransform(1, 0, 0, true);
}

export function resetZoomToActual(): void {
  console.log('resetZoom_start=1');
  if (!state.currentLayout || !state.currentContainer) {
    console.log('resetZoom_missingLayoutOrContainer=1');
    return;
  }

  const metrics = getContainerMetrics();
  if (!metrics) {
    console.log('resetZoom_missingMetrics=1');
    return;
  }

  const layoutWidth = state.currentLayout.width;
  const layoutHeight = state.currentLayout.height;
  let minX = 0;
  let minY = 0;
  let maxX = layoutWidth;
  let maxY = layoutHeight;

  if (state.currentDiagram) {
    const bounds = computeDiagramContentBounds(state.currentDiagram, state.currentLayout);
    if (bounds) {
      minX = Math.min(bounds.minX, minX);
      minY = Math.min(bounds.minY, minY);
      maxX = Math.max(bounds.maxX, maxX);
      maxY = Math.max(bounds.maxY, maxY);
      console.log(`resetZoom_contentMinX=${bounds.minX}`);
      console.log(`resetZoom_contentMinY=${bounds.minY}`);
      console.log(`resetZoom_contentMaxX=${bounds.maxX}`);
      console.log(`resetZoom_contentMaxY=${bounds.maxY}`);
    } else {
      console.log('resetZoom_contentBoundsFallback=1');
    }
  } else {
    console.log('resetZoom_noDiagram=1');
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
    console.log(`resetZoom_bboxX=${bbox.x}`);
    console.log(`resetZoom_bboxY=${bbox.y}`);
    console.log(`resetZoom_bboxWidth=${bbox.width}`);
    console.log(`resetZoom_bboxHeight=${bbox.height}`);
  } else {
    console.log('resetZoom_noBBox=1');
  }

  const contentWidth = Math.max(maxX - minX, 1);
  const contentHeight = Math.max(maxY - minY, 1);
  const domContentWidth = state.currentContainer ? state.currentContainer.scrollWidth : contentWidth;
  const domContentHeight = state.currentContainer ? state.currentContainer.scrollHeight : contentHeight;
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

  console.log(`resetZoom_containerWidth=${metrics.width}`);
  console.log(`resetZoom_containerHeight=${metrics.height}`);
  console.log(`resetZoom_contentWidth=${contentWidth}`);
  console.log(`resetZoom_contentHeight=${contentHeight}`);
  console.log(`resetZoom_domContentWidth=${domContentWidth}`);
  console.log(`resetZoom_domContentHeight=${domContentHeight}`);
  console.log(`resetZoom_scaleX=${scaleX}`);
  console.log(`resetZoom_scaleY=${scaleY}`);
  console.log(`resetZoom_scaleDomX=${scaleDomX}`);
  console.log(`resetZoom_scaleDomY=${scaleDomY}`);
    console.log(`resetZoom_devicePixelRatio=${devicePixelRatio}`);
    console.log(`resetZoom_baseScale=${baseScale}`);
  console.log(`resetZoom_desiredScale=${desiredScale}`);
  console.log(`resetZoom_normalizedScale=${normalizedScale}`);

  const contentCenterX = (minX + maxX) / 2;
  const contentCenterY = (minY + maxY) / 2;
  console.log(`resetZoom_contentCenterX=${contentCenterX}`);
  console.log(`resetZoom_contentCenterY=${contentCenterY}`);

  const translateX = round(-minX * normalizedScale);
  const translateY = round(-minY * normalizedScale);
  console.log(`resetZoom_translateX=${translateX}`);
  console.log(`resetZoom_translateY=${translateY}`);

  setTransform(normalizedScale, translateX, translateY, false);

  console.log('resetZoom_complete=1');
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
