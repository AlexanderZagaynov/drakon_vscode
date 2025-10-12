// CSI: renderer utilities — shared math/parsing helpers supporting document
// rendering, zoom behavior, and export metadata.

import type { ZoomTransform } from 'd3';
import { buildDiagram } from '../diagram.js';
import { tokenize, Parser } from '../parse.js';
import type { Diagram, LayoutResult } from '../types.js';
import type { DiagramContainer } from './types.js';
import type { ParseResult } from './types.js';
import { FIT_PADDING, MAX_ZOOM, MIN_ZOOM, TRANSFORM_PRECISION } from './constants.js';

export function round(value: number): number {
  // CSI: tolerance — clamp minuscule floating errors so repeated transforms
  // don’t accumulate drift.
  if (!Number.isFinite(value)) {
    return 0;
  }
  const rounded = Number(value.toFixed(TRANSFORM_PRECISION));
  return Math.abs(rounded) < 1e-6 ? 0 : rounded;
}

export function computeDiagramContentBounds(diagram: Diagram, layout: LayoutResult):
  | { minX: number; maxX: number; minY: number; maxY: number }
  | null {
  // CSI: defensive exit — empty diagrams skip expensive geometry checks.
  if (!diagram.nodes.length) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  diagram.nodes.forEach((node) => {
    const position = layout.positions.get(node.id);
    const geometry = node.geometry;
    if (!position || !geometry) {
      return;
    }
    const halfWidth = (geometry.width ?? 0) / 2;
    const halfHeight = (geometry.height ?? 0) / 2;
    const left = position.x - halfWidth;
    const right = position.x + halfWidth;
    const top = position.y - halfHeight;
    const bottom = position.y + halfHeight;

    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  // CSI: extend to layout bounds — make sure exports include any grid/labels
  // that extend to the canvas edges even if nodes don’t.
  minX = Math.min(minX, 0);
  minY = Math.min(minY, 0);
  maxX = Math.max(maxX, layout.width);
  maxY = Math.max(maxY, layout.height);

  return { minX, minY, maxX, maxY };
}

export function parseHclDiagram(text: string): ParseResult {
  // CSI: parse pipeline — tokenize, parse, and convert to diagram while
  // bubbling up all syntax errors.
  const errors: string[] = [];
  const tokens = tokenize(text, errors);
  if (errors.length) {
    return { diagram: null, errors };
  }
  const parser = new Parser(tokens, errors);
  const statements = parser.parse();
  if (errors.length) {
    return { diagram: null, errors };
  }
  const diagram = buildDiagram(statements, errors);
  return { diagram: errors.length ? null : diagram, errors };
}

export function computeFitTransform(layout: LayoutResult, container: DiagramContainer): ZoomTransform {
  // CSI: fit math — derive a stable transform that centers the layout with a
  // safety margin, bounded by min/max zoom limits.
  const rect = container.getBoundingClientRect();
  const containerWidth = rect.width || layout.width || 1;
  const containerHeight = rect.height || layout.height || 1;
  const availableWidth = Math.max(containerWidth - FIT_PADDING * 2, 1);
  const availableHeight = Math.max(containerHeight - FIT_PADDING * 2, 1);
  const scale = Math.min(availableWidth / layout.width, availableHeight / layout.height);
  const clampedScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number.isFinite(scale) && scale > 0 ? scale : 1));
  const translateX = (containerWidth - layout.width * clampedScale) / 2;
  const translateY = (containerHeight - layout.height * clampedScale) / 2;
  return d3.zoomIdentity.translate(translateX, translateY).scale(clampedScale);
}
