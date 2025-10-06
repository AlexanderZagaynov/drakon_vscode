import type { Diagram } from './types.js';
import { tokenize, Parser } from './parse.js';
import { buildDiagram } from './diagram.js';
import { prepareNodes, buildLayout, LAYOUT } from './layout.js';
import { drawNode } from './shapes/index.js';
import { drawEdges } from './edges/index.js';
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
        : 'Define blocks using the HCL-based DRAKON DSL.';
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

  svg.append('g').attr('class', 'grid');

  const nodeById = new Map<string, Diagram['nodes'][number]>();
  diagram.nodes.forEach((node) => nodeById.set(node.id, node));

  drawEdges(svg, diagram, layout, nodeById);

  const nodesGroup = svg.append('g').attr('class', 'nodes');

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
