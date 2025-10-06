import type { Diagram, LayoutResult, LayoutConfig, NodeGeometry, DiagramNode } from './types.js';
import { getNodeSpec } from './shapes/index.js';
import { baseAnchor } from './shared.js';
import { wrapLabelText } from './text.js';

export const LAYOUT: LayoutConfig = {
  laneGap: 140,
  lanePadding: 80,
  laneTopMargin: 140,
  laneBottomMargin: 140,
  laneLeftMargin: 160,
  laneSpacing: 90
};

export function prepareNodes(diagram: Diagram): void {
  diagram.nodes.forEach((node) => {
    const spec = getNodeSpec(node.type);
    const lineHeight = spec.lineHeight ?? 22;
    const paddingTop = spec.textPaddingTop ?? 28;
    const paddingBottom = spec.textPaddingBottom ?? 28;
    const paddingLeft = spec.textPaddingLeft ?? 28;
    const paddingRight = spec.textPaddingRight ?? 28;
    const width = spec.width ?? spec.baseWidth ?? 240;
    const minHeight = spec.minHeight ?? (spec.width ?? 170);
    const dynamicHeight = spec.dynamicHeight !== false;
    const wrappedLines = wrapLabelText(node.label, width, paddingLeft, paddingRight);
    const lineCount = Math.max(1, wrappedLines.length);
    const computedHeight = dynamicHeight
      ? Math.max(minHeight, paddingTop + paddingBottom + lineCount * lineHeight)
      : minHeight;
    const geometry: NodeGeometry = {
      width,
      height: computedHeight,
      lines: lineCount,
      lineHeight,
      textYOffset: spec.textYOffset ?? 0,
      spec,
      paddingTop,
      paddingBottom,
      paddingLeft,
      paddingRight,
      wrappedLines
    };
    node.geometry = geometry;
  });
}

export function buildLayout(diagram: Diagram): LayoutResult {
  const laneGap = LAYOUT.laneGap;
  const laneSpacing = LAYOUT.laneSpacing;
  const laneTop = LAYOUT.laneTopMargin;
  const laneLeft = LAYOUT.laneLeftMargin;

  const depths = computeDepths(diagram);

  const columnEntries = new Map<number, { node: DiagramNode; order: number }[]>();
  diagram.nodes.forEach((node, index) => {
    const column = Number.isFinite(node.column) ? (node.column as number) : 0;
    if (!columnEntries.has(column)) {
      columnEntries.set(column, []);
    }
    columnEntries.get(column)?.push({ node, order: index });
  });

  if (!columnEntries.size) {
    columnEntries.set(0, []);
  }

  const sortedColumns = Array.from(columnEntries.keys()).sort((a, b) => a - b);
  const columnLayouts = new Map<number, { x: number; width: number }>();
  let currentX = laneLeft;

  sortedColumns.forEach((column) => {
    const entries = columnEntries.get(column) ?? [];
    entries.sort((a, b) => {
      const depthDiff = (depths.get(a.node.id) ?? 0) - (depths.get(b.node.id) ?? 0);
      if (depthDiff !== 0) {
        return depthDiff;
      }
      return a.order - b.order;
    });
    const maxNodeWidth = entries.reduce((acc, entry) => Math.max(acc, entry.node.geometry?.width ?? 220), 220);
    const columnWidth = Math.max(maxNodeWidth + LAYOUT.lanePadding, 260);
    const centerX = currentX + columnWidth / 2;
    columnLayouts.set(column, { x: centerX, width: columnWidth });
    currentX += columnWidth + laneGap;
  });

  const defaultHeight = 170;
  const levelNodes = new Map<number, DiagramNode[]>();
  diagram.nodes.forEach((node) => {
    const depth = depths.get(node.id) ?? 0;
    if (!levelNodes.has(depth)) {
      levelNodes.set(depth, []);
    }
    levelNodes.get(depth)?.push(node);
  });

  const sortedLevels = Array.from(levelNodes.keys()).sort((a, b) => a - b);
  const levelCenters = new Map<number, number>();
  let cursorY = laneTop;
  if (!sortedLevels.length) {
    levelCenters.set(0, laneTop + defaultHeight / 2);
    cursorY = laneTop + defaultHeight;
  } else {
    sortedLevels.forEach((level, index) => {
      const nodesAtLevel = levelNodes.get(level) ?? [];
      const maxHeight = nodesAtLevel.reduce(
        (acc, node) => Math.max(acc, node.geometry?.height ?? defaultHeight),
        defaultHeight
      );
      const centerY = cursorY + maxHeight / 2;
      levelCenters.set(level, centerY);
      cursorY += maxHeight;
      if (index < sortedLevels.length - 1) {
        cursorY += laneSpacing;
      }
    });
  }

  const fallbackCenter = levelCenters.get(sortedLevels[0] ?? 0) ?? laneTop + defaultHeight / 2;

  const positions = new Map<string, { x: number; y: number }>();
  let globalTop = Number.POSITIVE_INFINITY;
  let globalBottom = laneTop;

  sortedColumns.forEach((column) => {
    const entries = columnEntries.get(column) ?? [];
    const columnX = columnLayouts.get(column)?.x ?? laneLeft;
    entries.forEach(({ node }) => {
      const depth = depths.get(node.id) ?? 0;
      const centerY = levelCenters.get(depth) ?? fallbackCenter;
      const height = node.geometry?.height ?? defaultHeight;
      positions.set(node.id, { x: columnX, y: centerY });
      const top = centerY - height / 2;
      const bottom = centerY + height / 2;
      globalTop = Math.min(globalTop, top);
      globalBottom = Math.max(globalBottom, bottom);
    });
  });

  if (!Number.isFinite(globalTop)) {
    globalTop = laneTop;
    globalBottom = laneTop + defaultHeight;
  }

  const totalWidth = Math.max(currentX - laneGap + laneLeft, 640);
  const totalHeight = Math.max(globalBottom + LAYOUT.laneBottomMargin, 600);

  diagram.edges.forEach((edge) => {
    edge.fromBase = edge.fromBase ?? baseAnchor(edge.from);
    edge.toBase = edge.toBase ?? baseAnchor(edge.to);
  });

  const startNode = diagram.nodes.find((node) => node.type === 'start');
  const parametersNode = diagram.nodes.find((node) => node.type === 'parameters');
  if (startNode && parametersNode) {
    const startPos = positions.get(startNode.id);
    const paramPos = positions.get(parametersNode.id);
    if (startPos && paramPos) {
      positions.set(parametersNode.id, { x: paramPos.x, y: startPos.y });
    }
  }

  return { width: totalWidth, height: totalHeight, positions, columns: columnLayouts };
}

function computeDepths(diagram: Diagram): Map<string, number> {
  const depths = new Map<string, number>();
  const adjacency = new Map<string, { id: string; weight: number }[]>();
  const indegree = new Map<string, number>();

  diagram.nodes.forEach((node) => {
    adjacency.set(node.id, []);
    indegree.set(node.id, 0);
  });

  diagram.edges.forEach((edge) => {
    const from = edge.fromBase ?? baseAnchor(edge.from);
    const to = edge.toBase ?? baseAnchor(edge.to);
    if (!adjacency.has(from) || !adjacency.has(to)) {
      return;
    }
    const attrs = (edge.attributes ?? {}) as Record<string, unknown>;
    const isBranchLane = Boolean(attrs.branch_lane);
    const weight = isBranchLane ? 0 : 1;
    adjacency.get(from)?.push({ id: to, weight });
    indegree.set(to, (indegree.get(to) ?? 0) + 1);
  });

  const queue: string[] = [];
  indegree.forEach((value, key) => {
    if (value === 0) {
      queue.push(key);
      depths.set(key, 0);
    }
  });

  while (queue.length) {
    const current = queue.shift() ?? '';
    const currentDepth = depths.get(current) ?? 0;
    (adjacency.get(current) ?? []).forEach(({ id: neighbor, weight }) => {
      const candidateDepth = currentDepth + weight;
      if (!depths.has(neighbor) || candidateDepth > (depths.get(neighbor) ?? 0)) {
        depths.set(neighbor, candidateDepth);
      }
      indegree.set(neighbor, (indegree.get(neighbor) ?? 0) - 1);
      if ((indegree.get(neighbor) ?? 0) === 0) {
        queue.push(neighbor);
      }
    });
  }

  diagram.nodes.forEach((node) => {
    if (!depths.has(node.id)) {
      depths.set(node.id, 0);
    }
  });

  return depths;
}
