import { buildLayout, LAYOUT, prepareNodes } from '../layout.js';
import { drawNode } from '../shapes/index.js';
import { drawEdges } from '../edges/index.js';
import { escapeHtml } from '../shared.js';
import type { Diagram } from '../types.js';
import { state, initializeState } from './state.js';
import type { DiagramContainer } from './types.js';
import { computeDiagramContentBounds, parseHclDiagram, round } from './utils.js';
import { applyZoomTransform, setTransform } from './zoom.js';
import { MAX_ZOOM, MIN_ZOOM } from './constants.js';

export { LAYOUT };

export function renderDocument(text: string, diagramEl: DiagramContainer, errorsEl: HTMLElement): void {
  const result = parseHclDiagram(text);
  updateErrors(result.errors, errorsEl);
  drawDiagram(result.diagram, result.errors, diagramEl, errorsEl);
}

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
  const previousTransform = state.currentTransform;
  initializeState(diagramEl);
  state.currentDiagram = diagram;

  diagramEl.innerHTML = '';

  if (!diagram || !diagram.nodes.length) {
    state.currentDiagram = null;
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
  state.currentLayout = layout;

  const svg = d3
    .select(diagramEl)
    .append('svg')
    .attr('role', 'img')
    .attr('viewBox', `0 0 ${layout.width} ${layout.height}`)
    .attr('width', '100%')
    .attr('height', '100%');

  const contentBounds = computeDiagramContentBounds(diagram, layout);
  const layoutCenterX = layout.width / 2;
  const layoutCenterY = layout.height / 2;
  const originX = contentBounds ? (contentBounds.minX + contentBounds.maxX) / 2 : layoutCenterX;

  const originSource = contentBounds ? 'content' : 'layout';
  let columnsMin = Number.POSITIVE_INFINITY;
  let columnsMax = Number.NEGATIVE_INFINITY;
  layout.columns.forEach(({ x, width }) => {
    const left = x - width / 2;
    const right = x + width / 2;
    columnsMin = Math.min(columnsMin, left);
    columnsMax = Math.max(columnsMax, right);
  });

  svg
    .attr('data-diagram-origin-x', String(round(originX)))
    .attr('data-diagram-origin-y', String(round(layoutCenterY)))
    .attr('data-layout-width', String(round(layout.width)))
    .attr('data-layout-height', String(round(layout.height)))
    .attr('data-layout-center-x', String(round(layoutCenterX)))
    .attr('data-layout-center-y', String(round(layoutCenterY)))
    .attr('data-diagram-origin-source', originSource)
    .attr('data-layout-columns-min-x', Number.isFinite(columnsMin) ? String(round(columnsMin)) : '')
    .attr('data-layout-columns-max-x', Number.isFinite(columnsMax) ? String(round(columnsMax)) : '');

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

  const contentGroup = svg.append('g').attr('class', 'diagram-content');
  contentGroup.append('g').attr('class', 'grid');

  const nodeById = new Map<string, Diagram['nodes'][number]>();
  diagram.nodes.forEach((node) => nodeById.set(node.id, node));

  drawEdges(contentGroup, diagram, layout, nodeById);

  const nodesGroup = contentGroup.append('g').attr('class', 'nodes');

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

  state.zoomTarget = contentGroup;
  state.zoomBehavior = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([MIN_ZOOM, MAX_ZOOM])
    .filter((event) => {
      const e = event as WheelEvent | MouseEvent;
      if (event.type === 'wheel') {
        return e.ctrlKey;
      }
      if (event.type === 'mousedown') {
        return e instanceof MouseEvent && e.button === 0 && !e.ctrlKey;
      }
      return !('ctrlKey' in e) || !e.ctrlKey;
    })
    .on('zoom', (event) => {
      state.currentTransform = event.transform;
      if (state.zoomTarget) {
        state.zoomTarget.attr('transform', event.transform.toString());
      }
    });

  svg
    .call(state.zoomBehavior)
    .on('dblclick.zoom', null)
    .style('cursor', 'grab')
    .on('mousedown', () => {
      svg.style('cursor', 'grabbing');
    })
    .on('mouseup mouseleave', () => {
      svg.style('cursor', 'grab');
    })
    .on('wheel.pan', (event: WheelEvent) => {
      if (!state.zoomBehavior || event.ctrlKey) {
        return;
      }
      event.preventDefault();
      const dx = -event.deltaX;
      const dy = -event.deltaY;
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
        return;
      }
      svg.interrupt();
      svg.call(state.zoomBehavior.translateBy, dx, dy);
    });

  state.currentSvg = svg;

  if (previousTransform) {
    applyZoomTransform(previousTransform, false);
  } else {
    state.currentScrollHost?.scrollTo({ left: 0, top: 0, behavior: 'auto' });
    setTransform(1, 0, 0, false);
  }
}
