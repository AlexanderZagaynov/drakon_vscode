import type { Diagram, DiagramEdge } from './types.js';
import { tokenize, Parser } from './parse.js';
import { buildDiagram } from './diagram.js';
import { prepareNodes, buildLayout, LAYOUT } from './layout.js';
import { drawNode } from './shapes/index.js';
import { escapeHtml } from './shared.js';

type DiagramContainer = HTMLElement;

interface ParseResult {
  diagram: Diagram | null;
  errors: string[];
}

export function renderDocument(text: string, diagramEl: DiagramContainer, errorsEl: HTMLElement): void {
  const result = parseHclDiagram(text);
  updateErrors(result.errors, errorsEl);
  drawDiagram(result.diagram, result.errors, diagramEl, errorsEl);
}

export { LAYOUT };

function updateErrors(errors: string[], errorsEl: HTMLElement): void {
  if (!errors.length) {
    errorsEl.classList.add('hidden');
    errorsEl.innerHTML = '';
    return;
  }
  errorsEl.classList.remove('hidden');
  const items = errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('');
  errorsEl.innerHTML = `<p class="error-title">Problems detected</p><ul class="error-list">${items}</ul>`;
}

function drawDiagram(
  diagram: Diagram | null,
  errors: string[],
  diagramEl: DiagramContainer,
  errorsEl: HTMLElement
): void {
  diagramEl.innerHTML = '';

  if (!diagram || !diagram.nodes.length) {
    const message = document.createElement('p');
    message.className = 'empty-state';
    message.textContent =
      errors.length && !diagram
        ? 'Fix syntax errors in the HCL diagram to see a preview.'
        : 'Define blocks inside lanes using the HCL-based DRAKON DSL.';
    diagramEl.appendChild(message);
    return;
  }

  prepareNodes(diagram);
  const layout = buildLayout(diagram);

  const svg = d3
    .select(diagramEl)
    .append('svg')
    .attr('width', layout.width)
    .attr('height', layout.height)
    .attr('role', 'img');

  const defs = svg.append('defs');
  defs
    .append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 8)
    .attr('refY', 5)
    .attr('markerWidth', 7)
    .attr('markerHeight', 7)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M 0 0 L 10 5 L 0 10 z')
    .attr('class', 'edge-head');

  svg.append('g').attr('class', 'lanes');

  const nodeById = new Map<string, Diagram['nodes'][number]>();
  diagram.nodes.forEach((node) => nodeById.set(node.id, node));

  const visibleEdges = diagram.edges.filter(
    (edge) => layout.positions.has(edge.fromBase ?? '') && layout.positions.has(edge.toBase ?? '')
  );

  const edgesGroup = svg.append('g').attr('class', 'edges');
  const nodesGroup = svg.append('g').attr('class', 'nodes');

  const buildEdgePath = (edge: DiagramEdge) => {
    const from = layout.positions.get(edge.fromBase ?? '') ?? { x: 0, y: 0 };
    const to = layout.positions.get(edge.toBase ?? '') ?? { x: 0, y: 0 };
    const x1 = from.x;
    const y1 = from.y;
    const x2 = to.x;
    const y2 = to.y;
    if (Math.abs(x1 - x2) < 0.01 || Math.abs(y1 - y2) < 0.01) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    const attrs = (edge.attributes ?? {}) as Record<string, unknown>;
    if (attrs.rejoin) {
      const elbowX = x1;
      const elbowY = y2;
      return `M ${x1} ${y1} L ${elbowX} ${elbowY} L ${x2} ${y2}`;
    }
    const elbowX = x2;
    const elbowY = y1;
    return `M ${x1} ${y1} L ${elbowX} ${elbowY} L ${x2} ${y2}`;
  };

  const edgeLabelPosition = (edge: DiagramEdge) => {
    const from = layout.positions.get(edge.fromBase ?? '') ?? { x: 0, y: 0 };
    const to = layout.positions.get(edge.toBase ?? '') ?? { x: 0, y: 0 };
    const x1 = from.x;
    const y1 = from.y;
    const x2 = to.x;
    const y2 = to.y;
    if (Math.abs(x1 - x2) < 0.01 || Math.abs(y1 - y2) < 0.01) {
      return {
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2 - 12
      };
    }
    const attrs = (edge.attributes ?? {}) as Record<string, unknown>;
    if (attrs.rejoin) {
      return {
        x: (x1 + x2) / 2,
        y: y2 - 12
      };
    }
    if (attrs.branch_lane) {
      const fromNode = nodeById.get(edge.fromBase ?? edge.from);
      const fromWidth = fromNode?.geometry?.width ?? 0;
      const isRightward = x2 >= x1;
      return {
        x: isRightward ? x1 + fromWidth / 2 + 12 : x1 - fromWidth / 2 - 12,
        y: y1 - 12
      };
    }
    const horizontalLength = Math.abs(x2 - x1);
    const verticalLength = Math.abs(y2 - y1);
    if (horizontalLength >= verticalLength) {
      return {
        x: (x1 + x2) / 2,
        y: y1 - 12
      };
    }
    return {
      x: x2,
      y: (y1 + y2) / 2 - 12
    };
  };

  const edgeLabelAnchor = (edge: DiagramEdge) => {
    const attrs = (edge.attributes ?? {}) as Record<string, unknown>;
    if (attrs.branch_lane) {
      const from = layout.positions.get(edge.fromBase ?? '') ?? { x: 0, y: 0 };
      const to = layout.positions.get(edge.toBase ?? '') ?? { x: 0, y: 0 };
      return to.x >= from.x ? 'start' : 'end';
    }
    if (attrs.rejoin) {
      return 'middle';
    }
    return 'middle';
  };

  edgesGroup
    .selectAll('path')
    .data(visibleEdges)
    .enter()
    .append('path')
    .attr('class', (d) => `edge ${d.kind ?? 'main'}`)
    .attr('d', (d) => buildEdgePath(d))
    .attr('marker-end', 'url(#arrowhead)');

  edgesGroup
    .selectAll('text')
    .data(visibleEdges.filter((edge) => edge.label))
    .enter()
    .append('text')
    .attr('class', 'edge-label')
    .attr('x', (d) => edgeLabelPosition(d).x)
    .attr('y', (d) => edgeLabelPosition(d).y)
    .attr('text-anchor', (d) => edgeLabelAnchor(d))
    .text((d) => d.label);

  const nodeEnter = nodesGroup
    .selectAll('g')
    .data(diagram.nodes)
    .enter()
    .append('g')
    .attr('class', (d) => `node ${d.type}`)
    .attr('transform', (d) => {
      const position = layout.positions.get(d.id);
      return `translate(${position?.x ?? 0}, ${position?.y ?? 0})`;
    });

  nodeEnter.each(function (node) {
    drawNode(d3.select(this), node);
  });
}

function parseHclDiagram(text: string): ParseResult {
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
