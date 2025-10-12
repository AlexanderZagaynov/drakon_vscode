import { normalizeMultilineText } from '../shared.js';
import type { BlockStatement, DiagramNode } from '../types.js';
import { formatParameterScalar } from './utils.js';

interface ResolvedParametersValue {
  id: string;
  label: string;
  attributes: Record<string, unknown>;
}

function ensureAttributes(
  attrs: Record<string, unknown>,
  diagramAnchorBase: string
): Record<string, unknown> {
  const attributes = { ...attrs };
  attributes.implicit = true;
  const rawAnchor = typeof attributes.anchor === 'string' ? attributes.anchor.trim() : '';
  if (rawAnchor) {
    attributes.anchor = rawAnchor;
  } else {
    attributes.anchor = `${diagramAnchorBase}@parameters`;
  }
  if (typeof attributes.text === 'string') {
    attributes.text = normalizeMultilineText(attributes.text);
  }
  if (Array.isArray(attributes.lines)) {
    attributes.lines = (attributes.lines as unknown[]).map((entry) => String(entry));
  }
  return attributes;
}

export function resolveParametersValue(
  value: unknown,
  diagramAnchorBase: string
): ResolvedParametersValue | null {
  if (value === undefined || value === null) {
    return null;
  }

  const defaultId = 'parameters';

  if (typeof value === 'string') {
    const text = normalizeMultilineText(value);
    const label = text || 'Parameters';
    return { id: defaultId, label, attributes: ensureAttributes({ text: label }, diagramAnchorBase) };
  }

  if (Array.isArray(value)) {
    const lines = value.map((entry) => String(entry));
    const label = lines.length ? lines.join('\n') : 'Parameters';
    return { id: defaultId, label, attributes: ensureAttributes({ lines }, diagramAnchorBase) };
  }

  if (typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const config: Record<string, unknown> = {};
    Object.entries(source).forEach(([key, entry]) => {
      if (typeof entry === 'string' && (key === 'text' || key === 'title' || key === 'caption')) {
        config[key] = normalizeMultilineText(entry);
      } else if (Array.isArray(entry)) {
        config[key] = entry.map((element) => String(element));
      } else {
        config[key] = entry;
      }
    });
    const rawId = typeof config.id === 'string' ? config.id.trim() : '';
    delete config.id;

    const textAttr = typeof config.text === 'string' ? config.text : '';
    const linesAttr = Array.isArray(config.lines) ? (config.lines as unknown[]) : undefined;
    if (linesAttr) {
      config.lines = linesAttr.map((entry) => String(entry));
    }

    let label = textAttr ? textAttr : '';
    if (!label && Array.isArray(config.lines) && (config.lines as string[]).length) {
      label = (config.lines as string[]).join('\n');
    }
    if (!label && typeof config.title === 'string' && config.title.trim()) {
      label = config.title.trim();
    }
    if (!label && typeof config.caption === 'string' && config.caption.trim()) {
      label = config.caption.trim();
    }
    if (!label) {
      const informativeEntries = Object.entries(config).filter(
        ([key]) => !['anchor', 'tags', 'data', 'text', 'lines', 'title', 'caption'].includes(key)
      );
      if (informativeEntries.length) {
        label = informativeEntries.map(([key, entry]) => `${key} = ${formatParameterScalar(entry)}`).join('\n');
      }
    }
    if (!label) {
      label = 'Parameters';
    }
    const attributes = ensureAttributes(config, diagramAnchorBase);
    if (!('text' in attributes) && label) {
      attributes.text = label;
    }
    return { id: rawId || defaultId, label, attributes };
  }

  const text = String(value);
  const normalized = normalizeMultilineText(text);
  const label = normalized || 'Parameters';
  return { id: defaultId, label, attributes: ensureAttributes({ text: label }, diagramAnchorBase) };
}

export function buildParametersNode(
  column: number,
  value: unknown,
  diagramAnchorBase: string
): DiagramNode | null {
  const resolved = resolveParametersValue(value, diagramAnchorBase);
  if (!resolved) {
    return null;
  }
  const { id, label, attributes } = resolved;
  const block: BlockStatement = {
    type: 'block',
    name: 'parameters',
    labels: [id],
    body: []
  };
  const node: DiagramNode = {
    id,
    type: 'parameters',
    column,
    label,
    attributes,
    block
  };
  return node;
}
