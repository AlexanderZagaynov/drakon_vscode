import type { AttributeStatement, BlockStatement, Statement } from '../types.js';
import type { SplitResult } from './models.js';

export function splitStatements(items: Statement[]): SplitResult {
  const grouped = Map.groupBy(items, (item) => item.type);
  const attributesEntries =
    (grouped.get('attribute') as AttributeStatement[] | undefined)?.map(({ key, value }) => [key, value]) ?? [];
  const attributes = Object.fromEntries(attributesEntries);
  const blocks = (grouped.get('block') as BlockStatement[] | undefined) ?? [];
  return { attributes, blocks };
}

export function deriveLabel(attributes: Record<string, unknown>, fallback: string): string {
  if (typeof attributes.text === 'string') {
    return attributes.text;
  }
  if (Array.isArray(attributes.lines) && attributes.lines.length) {
    return attributes.lines.map((value) => String(value)).join('\n');
  }
  return fallback;
}

export function formatParameterScalar(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => formatParameterScalar(entry)).join(', ')}]`;
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
