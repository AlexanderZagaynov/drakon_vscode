import type { ZoomTransform } from 'd3';
import type { LayoutResult } from '../types.js';
import type { DiagramContainer } from './types.js';
import { ZOOM_STEP, MAX_ZOOM, MIN_ZOOM } from './constants.js';
import { state } from './state.js';
import { computeDiagramContentBounds, round } from './utils.js';

// Centralized zoom/pan controller that keeps the D3 transform synchronized with
// toolbar interactions, enforces min/max constraints, and emits diagnostics to
// help us reason about viewport math during debugging sessions.

// Simple shape describing the viewport size we use while clamping translations.
type ContainerMetrics = {
  width: number;
  height: number;
};

// Bundle of DOM + layout state we require before manipulating the zoom viewport.
type ZoomContext = {
  container: DiagramContainer;
  layout: LayoutResult;
  metrics: ContainerMetrics;
};

// Normalizes various primitive shapes into our `scope_key=value` logging format so
// the output stays grep-friendly even when we share complex objects.
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

// Lightweight structured logger: flat maps of key/value pairs become a cluster of
// `console.log` entries grouped by the calling scope.
function logDebug(scope: string, payload: Record<string, unknown>): void {
  Object.entries(payload).forEach(([key, value]) => {
    console.log(`${scope}_${key}=${formatDebugValue(value)}`);
  });
}

// Validates that current renderer state carries everything we need to compute
// viewport metrics. Returning early keeps each caller compact and ensures we log
// missing prerequisites in one place.
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

// Wraps the D3 zoom behavior so every transform change funnels through a single
// point, giving us a consistent place to flip animation on or off.
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

// Safely extract the zoom scale from renderer state, falling back to `1` when the
// value is missing or corrupt so downstream math stays stable.
function getCurrentScale(): number {
  const scale = state.currentTransform?.k;
  if (!Number.isFinite(scale) || !scale || scale <= 0) {
    return 1;
  }
  return scale;
}

// Measure the visible viewport so we can clamp translations and compute centering
// offsets relative to the actual scroll container, not just the SVG bounds.
function getContainerMetrics(layout: LayoutResult): ContainerMetrics | null {
  const host = state.currentScrollHost ?? state.currentContainer;
  if (!host) {
    return null;
  }
  const width = host.clientWidth || layout.width;
  const height = host.clientHeight || layout.height;
  return { width, height };
}

// Keep diagram translations within the on-screen range. When the scaled diagram
// is smaller than the container we allow it to float inside the gutter; otherwise
// we clamp to the edges so nothing disappears off screen.
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

// Enforce global zoom limits and weed out invalid numbers before they reach D3.
function clampScaleValue(scale: number): number | null {
  if (!Number.isFinite(scale) || scale <= 0) {
    return null;
  }
  const limited = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
  return round(limited);
}

// Optional tuning knobs for `applyScale`, mirroring D3's concept of viewport and
// diagram anchors plus an animation toggle.
type ScaleOptions = {
  animate?: boolean;
  viewportAnchor?: readonly [number, number];
  diagramAnchor?: readonly [number, number];
};

// Shared zoom handler used by toolbar actions. Computes where the chosen anchor
// should land after scaling so the diagram appears to zoom toward that point.
function applyScale(targetScale: number, options?: ScaleOptions): void {
  const context = requireZoomContext('applyScale');
  if (!context) {
    return;
  }
  const { layout, metrics } = context;

  const normalizedScale = clampScaleValue(targetScale);
  // Bail out if the requested scale is outside the clamp range (or invalid) so we
  // never feed D3 with NaN/Infinity and can see the rejected value in logs.
  if (normalizedScale === null) {
    logDebug('applyScale', { invalidTarget: targetScale });
    return;
  }

  const currentScale = getCurrentScale();
  // Short-circuit when the requested scale matches the current one to avoid
  // jittery re-application of the same transform and reduce console noise.
  if (Math.abs(currentScale - normalizedScale) < 1e-6) {
    logDebug('applyScale', { sameScale: normalizedScale });
  }

  // Resolve the viewport anchor to use as the screen-space reference for all
  // downstream math. Defaults to the visual center when none is provided.
  const fallbackViewportAnchor = [metrics.width / 2, metrics.height / 2] as const;
  const resolvedViewportAnchor = options?.viewportAnchor ?? fallbackViewportAnchor;
  const viewportAnchor: readonly [number, number] = [resolvedViewportAnchor[0], resolvedViewportAnchor[1]] as const;

  // Determine which diagram-space coordinate should stay pinned beneath the
  // viewport anchor. Either use the caller's override or invert the current
  // transform so the zoom appears to happen in place.
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

  // Translate the diagram so the chosen anchor ends up under the viewport anchor
  // after scaling, keeping the zoom motion feeling anchored for the user.
  const translateX = round(viewportAnchor[0] - diagramAnchor[0] * normalizedScale);
  const translateY = round(viewportAnchor[1] - diagramAnchor[1] * normalizedScale);

  // Capture all of the derived values so debugging misaligned zooms is easier.
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

// Lowest-level transform setter that clamps the new translation, builds a D3
// transform, and delegates to the zoom behavior for the actual DOM mutation.
export function setTransform(scale: number, translateX: number, translateY: number, animate: boolean): void {
  const context = requireZoomContext('setTransform');
  if (!context) {
    return;
  }
  const { layout, metrics } = context;
  // Clamp the requested translation so the diagram stays within the viewport.
  const clampedX = clampTranslation(translateX, scale, layout.width, metrics.width);
  const clampedY = clampTranslation(translateY, scale, layout.height, metrics.height);
  // Build the new D3 transform and hand it off to the zoom behavior for playback.
  const transform = d3.zoomIdentity.translate(clampedX, clampedY).scale(round(scale));
  applyZoomTransform(transform, animate);
}

// Translate the diagram so the specified node's coordinates align with the
// center of the viewport, providing a handy focus mechanic for editor commands.
function focusNodeById(nodeId: string, animate: boolean): void {
  const context = requireZoomContext('focusNode');
  if (!context) {
    return;
  }
  const { layout, metrics } = context;
  // Look up the layout position for the requested node; bail if it is unknown.
  const position = layout.positions.get(nodeId);
  if (!position) {
    return;
  }
  const scale = getCurrentScale();
  // Translate so the node settles into the middle of the viewport.
  const targetX = round(metrics.width / 2 - position.x * scale);
  const targetY = round(metrics.height / 2 - position.y * scale);
  setTransform(scale, targetX, targetY, animate);
}

// Applies a multiplier to the existing zoom level. The toolbar zoom buttons use
// this with a constant step so repeated clicks feel predictable.
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
  // Use the provided anchor if available, otherwise default to the current
  // transform origin so zooming feels consistent with previous behavior.
  const viewportAnchor = anchor ?? ([transform.x, transform.y] as const);
  applyScale(targetScale, {
    viewportAnchor,
    diagramAnchor: [0, 0] as const,
    animate: true
  });
}

function getViewportCenterAnchor(): readonly [number, number] | null {
  // Returns the current visual center of the scroll host relative to the SVG,
  // enabling features that need to zoom toward whatever is in the user's view.
  const svgNode = state.currentSvg?.node();
  if (!svgNode) {
    return null;
  }
  // Prefer the scroll host when available so centering respects overflow.
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
  // Multiply the current scale by the configured increment.
  scaleDiagram(ZOOM_STEP);
}

export function zoomOut(): void {
  // Divide the current scale, mirroring the zoom-in behavior.
  scaleDiagram(1 / ZOOM_STEP);
}

export function zoomToFit(): void {
  const context = requireZoomContext('zoomToFit');
  if (!context) {
    return;
  }
  const host = state.currentScrollHost ?? context.container;
  // Reset scroll position so the origin is visible alongside the transform reset.
  host?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  // Fit reuses the legacy "reset transform" semantics: scale = 1, origin at 0,0.
  logDebug('zoomToFit', { scale: 1, translateX: 0, translateY: 0 });
  setTransform(1, 0, 0, true);
}

export function resetZoomToActual(): void {
  // Recomputes a scale that fits actual diagram bounds (including DOM padding) so
  // the 100% button reflects the true content size regardless of device DPR.
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

  // Initialize content bounds to the full layout extents so incremental updates
  // can expand them as we discover additional geometry.
  const layoutWidth = layout.width;
  const layoutHeight = layout.height;
  let minX = 0;
  let minY = 0;
  let maxX = layoutWidth;
  let maxY = layoutHeight;

  if (state.currentDiagram) {
    // Merge the actual diagram geometry into the bounds so zoom-to-actual
    // reflects rendered nodes and edges instead of the raw layout canvas.
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
    // If a zoom target is set (e.g., focus node), include its SVG bbox so we
    // guarantee space for highlighted elements that may extend beyond layout.
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
  // Account for both logical layout size and any extra DOM padding introduced by
  // fonts/markers so the computed scale truly fits what the user sees.
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
  // Useful for debugging: knowing where the content center landed helps explain
  // translations when diagrams are heavily offset within the layout canvas.
  logDebug('resetZoom', {
    contentCenterX,
    contentCenterY
  });

  const translateX = round(-minX * normalizedScale);
  const translateY = round(-minY * normalizedScale);
  // Move the minimum bounds corner to the origin so the diagram's top-left is
  // visible after we apply the normalized scale.
  logDebug('resetZoom', {
    translateX,
    translateY
  });

  setTransform(normalizedScale, translateX, translateY, false);

  logDebug('resetZoom', { event: 'complete' });
}

// Exposed so other modules can center arbitrary nodes (e.g. search or graph
// navigation features outside this file).
export function focusNode(nodeId: string): void {
  focusNodeById(nodeId, true);
}

// Nudges the current transform by the provided delta while preserving whichever
// scale is active. Drag gestures use this, and it remains available for future
// programmatic panning.
export function panBy(deltaX: number, deltaY: number): void {
  const scale = getCurrentScale();
  let nextX = deltaX;
  let nextY = deltaY;
  // Fall back to the current transform values if callers pass non-finite data.
  if (!Number.isFinite(nextX)) {
    nextX = round(state.currentTransform?.x ?? 0);
  }
  if (!Number.isFinite(nextY)) {
    nextY = round(state.currentTransform?.y ?? 0);
  }
  setTransform(scale, nextX, nextY, true);
}
