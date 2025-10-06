(function () {
  const vscode = acquireVsCodeApi();

  const diagramEl = document.getElementById('diagram');
  const errorsEl = document.getElementById('errors');

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message?.type === 'update') {
      renderDocument(message.text ?? '');
    }
  });

  vscode.postMessage({ type: 'ready' });

  function renderDocument(text) {
    const parsed = parseDocument(text);
    updateErrors(parsed.errors);
    drawDiagram(parsed);
  }

  function updateErrors(errors) {
    if (!errors.length) {
      errorsEl.classList.add('hidden');
      errorsEl.innerHTML = '';
      return;
    }

    errorsEl.classList.remove('hidden');
    const items = errors
      .map((error) => `<li>${escapeHtml(error)}</li>`)
      .join('');
    errorsEl.innerHTML = `<p class="error-title">Problems detected</p><ul class="error-list">${items}</ul>`;
  }

  function drawDiagram(parsed) {
    diagramEl.innerHTML = '';

    if (!parsed.nodes.length) {
      const message = document.createElement('p');
      message.className = 'empty-state';
      message.textContent =
        'Define nodes with lines like: node start start "Begin"';
      diagramEl.appendChild(message);
      return;
    }

    const layout = buildLayout(parsed.nodes, parsed.edges);
    const svg = createSvg(layout.width, layout.height);
    const edgesGroup = createSvgElement('g', { class: 'edges' });
    const nodesGroup = createSvgElement('g', { class: 'nodes' });

    for (const edge of parsed.edges) {
      const fromPos = layout.positions.get(edge.from);
      const toPos = layout.positions.get(edge.to);
      if (!fromPos || !toPos) {
        continue;
      }

      const line = createSvgElement('line', {
        class: 'edge',
        x1: fromPos.x.toString(),
        y1: fromPos.y.toString(),
        x2: toPos.x.toString(),
        y2: toPos.y.toString()
      });
      line.setAttribute('marker-end', 'url(#arrowhead)');
      edgesGroup.appendChild(line);

      if (edge.label) {
        const label = createSvgElement('text', {
          class: 'edge-label',
          x: ((fromPos.x + toPos.x) / 2).toString(),
          y: ((fromPos.y + toPos.y) / 2 - 10).toString()
        });
        label.textContent = edge.label;
        edgesGroup.appendChild(label);
      }
    }

    for (const node of parsed.nodes) {
      const position = layout.positions.get(node.id);
      if (!position) {
        continue;
      }
      const group = createSvgElement('g', {
        class: `node ${node.type}`,
        transform: `translate(${position.x}, ${position.y})`
      });

      const size = getNodeSize(node.type);
      const labelLines = node.label.split(/\r?\n/);
      let shape;

      if (node.type === 'start' || node.type === 'end') {
        shape = createSvgElement('ellipse', {
          class: `node-shape ${node.type}`,
          cx: '0',
          cy: '0',
          rx: String(size.width / 2),
          ry: String(size.height / 2)
        });
      } else if (node.type === 'question') {
        const points = [
          [0, -size.height / 2],
          [size.width / 2, 0],
          [0, size.height / 2],
          [-size.width / 2, 0]
        ]
          .map(([x, y]) => `${x},${y}`)
          .join(' ');
        shape = createSvgElement('polygon', {
          class: 'node-shape question',
          points
        });
      } else {
        shape = createSvgElement('rect', {
          class: 'node-shape action',
          x: String(-size.width / 2),
          y: String(-size.height / 2),
          width: String(size.width),
          height: String(size.height),
          rx: '12',
          ry: '12'
        });
      }

      const labelEl = createSvgElement('text', {
        class: 'node-label',
        'text-anchor': 'middle',
        'alignment-baseline': 'central'
      });

      labelLines.forEach((line, index) => {
        const tspan = createSvgElement('tspan', {
          x: '0',
          dy: index === 0 ? '0' : '1.2em'
        });
        tspan.textContent = line;
        labelEl.appendChild(tspan);
      });

      group.appendChild(shape);
      group.appendChild(labelEl);
      nodesGroup.appendChild(group);
    }

    svg.appendChild(edgesGroup);
    svg.appendChild(nodesGroup);
    diagramEl.appendChild(svg);
  }

  function parseDocument(text) {
    const nodes = [];
    const edges = [];
    const errors = [];
    const nodeIndex = new Map();

    const nodePattern =
      /^node\s+([a-zA-Z0-9_-]+)\s+(start|action|question|end)\s+"([^"]+)"\s*$/i;
    const edgePattern =
      /^edge\s+([a-zA-Z0-9_-]+)\s*->\s*([a-zA-Z0-9_-]+)(?:\s+(.+))?$/i;

    const lines = text.split(/\r?\n/);

    lines.forEach((rawLine, index) => {
      const lineNumber = index + 1;
      const trimmed = rawLine.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }

      const nodeMatch = trimmed.match(nodePattern);
      if (nodeMatch) {
        const identifier = nodeMatch[1];
        const type = nodeMatch[2].toLowerCase();
        const label = nodeMatch[3].replace(/\\n/g, '\n');

        if (nodeIndex.has(identifier)) {
          errors.push(`Line ${lineNumber}: Duplicate node "${identifier}".`);
        } else {
          nodeIndex.set(identifier, nodes.length);
          nodes.push({
            id: identifier,
            type,
            label,
            line: lineNumber
          });
        }
        return;
      }

      const edgeMatch = trimmed.match(edgePattern);
      if (edgeMatch) {
        edges.push({
          from: edgeMatch[1],
          to: edgeMatch[2],
          label: (edgeMatch[3] ?? '').trim(),
          line: lineNumber
        });
        return;
      }

      errors.push(`Line ${lineNumber}: Could not parse "${trimmed}".`);
    });

    for (const edge of edges) {
      if (!nodeIndex.has(edge.from)) {
        errors.push(
          `Line ${edge.line}: Edge source "${edge.from}" is not defined.`
        );
      }
      if (!nodeIndex.has(edge.to)) {
        errors.push(
          `Line ${edge.line}: Edge target "${edge.to}" is not defined.`
        );
      }
    }

    return { nodes, edges, errors };
  }

  function buildLayout(nodes, edges) {
    const horizontalSpacing = 220;
    const verticalSpacing = 170;
    const margin = 120;

    const positions = new Map();
    const adjacency = new Map();
    const indegree = new Map();

    nodes.forEach((node) => {
      adjacency.set(node.id, []);
      indegree.set(node.id, 0);
    });

    edges.forEach((edge) => {
      if (adjacency.has(edge.from) && adjacency.has(edge.to)) {
        adjacency.get(edge.from).push(edge.to);
        indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
      }
    });

    const queue = [];
    indegree.forEach((count, id) => {
      if (count === 0) {
        queue.push(id);
      }
    });

    if (queue.length === 0 && nodes.length) {
      queue.push(nodes[0].id);
    }

    const depth = new Map();
    queue.forEach((id) => depth.set(id, 0));

    while (queue.length) {
      const id = queue.shift();
      const nodeDepth = depth.get(id) ?? 0;
      const neighbors = adjacency.get(id) ?? [];
      neighbors.forEach((neighbor) => {
        const candidateDepth = nodeDepth + 1;
        const previous = depth.get(neighbor);
        if (previous === undefined || candidateDepth > previous) {
          depth.set(neighbor, candidateDepth);
        }
        indegree.set(neighbor, (indegree.get(neighbor) ?? 0) - 1);
        if ((indegree.get(neighbor) ?? 0) === 0) {
          queue.push(neighbor);
        }
      });
    }

    nodes.forEach((node) => {
      if (!depth.has(node.id)) {
        depth.set(node.id, 0);
      }
    });

    const levels = [];
    depth.forEach((levelValue, nodeId) => {
      if (!levels[levelValue]) {
        levels[levelValue] = [];
      }
      levels[levelValue].push(nodeId);
    });

    let maxColumns = 0;

    levels.forEach((levelIds, levelIndex) => {
      if (!levelIds) {
        return;
      }
      levelIds.forEach((nodeId, index) => {
        maxColumns = Math.max(maxColumns, index + 1);
        const x = margin + index * horizontalSpacing;
        const y = margin + levelIndex * verticalSpacing;
        positions.set(nodeId, { x, y });
      });
    });

    const width = Math.max(margin * 2 + (maxColumns - 1) * horizontalSpacing, 600);
    const height = Math.max(
      margin * 2 + (levels.length - 1) * verticalSpacing,
      600
    );

    return { positions, width, height };
  }

  function getNodeSize(type) {
    if (type === 'question') {
      return { width: 160, height: 120 };
    }
    if (type === 'start' || type === 'end') {
      return { width: 140, height: 80 };
    }
    return { width: 180, height: 90 };
  }

  function createSvg(width, height) {
    const svg = createSvgElement('svg', {
      viewBox: `0 0 ${width} ${height}`,
      width: String(width),
      height: String(height),
      role: 'img'
    });

    const defs = createSvgElement('defs', {});
    const marker = createSvgElement('marker', {
      id: 'arrowhead',
      viewBox: '0 0 10 10',
      refX: '8',
      refY: '5',
      markerWidth: '7',
      markerHeight: '7',
      orient: 'auto'
    });

    const markerPath = createSvgElement('path', {
      d: 'M 0 0 L 10 5 L 0 10 z',
      class: 'edge-head'
    });

    marker.appendChild(markerPath);
    defs.appendChild(marker);
    svg.appendChild(defs);

    return svg;
  }

  function createSvgElement(name, attributes) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(([key, value]) => {
      el.setAttribute(key, value);
    });
    return el;
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
})();
