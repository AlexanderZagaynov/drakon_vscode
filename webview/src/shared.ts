export function baseAnchor(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.split('@')[0];
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
