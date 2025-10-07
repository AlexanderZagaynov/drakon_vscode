export function baseAnchor(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.split('@')[0];
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function normalizeMultilineText(value: string): string {
  const normalized = value.replace(/\r/g, '');
  let lines = normalized.split('\n');

  while (lines.length && lines[0]?.trim() === '') {
    lines.shift();
  }

  while (lines.length && lines[lines.length - 1]?.trim() === '') {
    lines.pop();
  }

  if (!lines.length) {
    return '';
  }

  const indent = lines.reduce<number>(
    (acc, line) => {
      if (!line.trim()) {
        return acc;
      }
      const match = line.match(/^(\s*)/);
      const leading = match ? match[0].length : 0;
      return acc === -1 ? leading : Math.min(acc, leading);
    },
    -1
  );

  if (indent > 0) {
    lines = lines.map((line) => line.slice(Math.min(indent, line.length)));
  }

  return lines.join('\n');
}
