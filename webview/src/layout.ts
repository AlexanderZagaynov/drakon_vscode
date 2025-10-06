import type {
  Diagram,
  LayoutResult,
  LayoutConfig,
  NodeGeometry,
  DiagramNode,
  LaneLayout,
  LaneNodeEntry
} from './types.js';
import { getNodeSpec } from './shapes/index.js';
import { baseAnchor } from './shared.js';

export const LAYOUT: LayoutConfig = {
  laneGap: 140,
  lanePadding: 80,
  laneTopMargin: 140,
  laneBottomMargin: 120,
  laneLeftMargin: 160,
  laneSpacing: 90
};

export function prepareNodes(diagram: Diagram): void {
  diagram.nodes.forEach((node) => {
    const spec = getNodeSpec(node.type);
    const lines = Math.max(1, node.label ? node.label.split(/\r?\n/).length : 1);
    const lineHeight = spec.lineHeight ?? 22;
    const paddingTop = spec.textPaddingTop ?? 28;
    const paddingBottom = spec.textPaddingBottom ?? 28;
    const width = spec.width ?? spec.baseWidth ?? 240;
    const minHeight = spec.minHeight ?? (spec.width ?? 170);
    const dynamicHeight = spec.dynamicHeight !== false;
    const computedHeight = dynamicHeight ? Math.max(minHeight, paddingTop + paddingBottom + lines * lineHeight) : minHeight;
    const geometry: NodeGeometry = {
      width,
      height: computedHeight,
      lines,
      lineHeight,
      textYOffset: spec.textYOffset ?? 0,
      spec,
      paddingTop,
      paddingBottom
    };
    node.geometry = geometry;
  });
}

export function buildLayout(diagram: Diagram): LayoutResult {
  const laneGap = LAYOUT.laneGap;
  const laneSpacing = LAYOUT.laneSpacing;
  const laneTop = LAYOUT.laneTopMargin;
  const laneLeft = LAYOUT.laneLeftMargin;

  const lanes = diagram.lanes.length
    ? diagram.lanes.map((lane) => ({ id: lane.id, title: lane.title ?? lane.id }))
    : [{ id: 'main', title: 'Main' }];

  const laneNodesMap = new Map<string, LaneNodeEntry[]>(
    lanes.map((lane) => [lane.id, [] as LaneNodeEntry[]])
  );

  diagram.nodes.forEach((node, index) => {
    if (!laneNodesMap.has(node.lane)) {
      lanes.push({ id: node.lane, title: node.lane });
      laneNodesMap.set(node.lane, []);
    }
    const entry: LaneNodeEntry = { node, order: index };
    laneNodesMap.get(node.lane)?.push(entry);
  });

  const depths = computeDepths(diagram);

  laneNodesMap.forEach((entries) => {
    entries.sort((a, b) => {
      const depthDiff = (depths.get(a.node.id) ?? 0) - (depths.get(b.node.id) ?? 0);
      if (depthDiff !== 0) {
        return depthDiff;
      }
      return a.order - b.order;
    });
  });

  const laneLayouts: LaneLayout[] = [];
  let currentX = laneLeft;
  let requiredHeight = laneTop;

  lanes.forEach((lane) => {
    const nodes = laneNodesMap.get(lane.id) ?? [];
    const maxNodeWidth = nodes.reduce((acc, entry) => Math.max(acc, entry.node.geometry?.width ?? 220), 220);
    const laneWidth = Math.max(maxNodeWidth + LAYOUT.lanePadding, 260);
    const centerX = currentX + laneWidth / 2;
    laneLayouts.push({ id: lane.id, title: lane.title, x: centerX, width: laneWidth, nodes });
    currentX += laneWidth + laneGap;
  });

  const positions = new Map<string, { x: number; y: number }>();

  laneLayouts.forEach((lane) => {
    let currentY = laneTop;
    lane.nodes.forEach(({ node }) => {
      const height = node.geometry?.height ?? 170;
      const y = currentY + height / 2;
      positions.set(node.id, { x: lane.x, y });
      currentY += height + laneSpacing;
    });
    lane.totalHeight = currentY;
    requiredHeight = Math.max(requiredHeight, currentY);
  });

  const totalWidth = Math.max(currentX - laneGap + laneLeft, 640);
  const totalHeight = Math.max(requiredHeight + LAYOUT.laneBottomMargin, 600);

  diagram.edges.forEach((edge) => {
    edge.fromBase = baseAnchor(edge.from);
    edge.toBase = baseAnchor(edge.to);
  });

  return { width: totalWidth, height: totalHeight, lanes: laneLayouts, positions };
}

function computeDepths(diagram: Diagram): Map<string, number> {
  const depths = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const indegree = new Map<string, number>();

  diagram.nodes.forEach((node) => {
    adjacency.set(node.id, []);
    indegree.set(node.id, 0);
  });

  diagram.edges.forEach((edge) => {
    const from = baseAnchor(edge.from);
    const to = baseAnchor(edge.to);
    if (!adjacency.has(from) || !adjacency.has(to)) {
      return;
    }
    adjacency.get(from)?.push(to);
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
    (adjacency.get(current) ?? []).forEach((neighbor) => {
      const candidateDepth = currentDepth + 1;
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
