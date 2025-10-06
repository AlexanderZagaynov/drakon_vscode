let measureContext: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureContext) {
    return measureContext;
  }
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }
  const bodyStyle = window.getComputedStyle(document.body);
  const font =
    bodyStyle.font && bodyStyle.font !== ''
      ? bodyStyle.font
      : `${bodyStyle.fontSize || '14px'} ${bodyStyle.fontFamily || 'sans-serif'}`;
  context.font = font;
  measureContext = context;
  return context;
}

function measureWidth(text: string): number {
  const context = getMeasureContext();
  if (!context) {
    return text.length * 8;
  }
  return context.measureText(text).width;
}

function splitLongSegment(segment: string, maxWidth: number): string[] {
  const pieces: string[] = [];
  let remaining = segment;
  while (remaining.length) {
    let low = 1;
    let high = remaining.length;
    let best = 1;
    while (low <= high) {
      const mid = Math.max(1, Math.floor((low + high) / 2));
      const candidate = remaining.slice(0, mid);
      const width = measureWidth(candidate);
      if (width <= maxWidth) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    best = Math.max(1, best);
    const slice = remaining.slice(0, best);
    pieces.push(slice);
    remaining = remaining.slice(slice.length);
  }
  return pieces;
}

function wrapSingleLine(line: string, maxWidth: number): string[] {
  if (!line) {
    return [''];
  }
  const words = line.split(/\s+/).filter((word) => word.length);
  if (!words.length) {
    return [''];
  }
  const wrapped: string[] = [];
  let current = '';
  words.forEach((word, index) => {
    if (!current) {
      if (measureWidth(word) <= maxWidth) {
        current = word;
      } else {
        wrapped.push(...splitLongSegment(word, maxWidth));
      }
      return;
    }
    const candidate = `${current} ${word}`;
    if (measureWidth(candidate) <= maxWidth) {
      current = candidate;
      return;
    }
    wrapped.push(current);
    if (measureWidth(word) <= maxWidth) {
      current = word;
    } else {
      wrapped.push(...splitLongSegment(word, maxWidth));
      current = '';
    }
  });
  if (current) {
    wrapped.push(current);
  }
  return wrapped.length ? wrapped : [''];
}

export function wrapLabelText(
  label: string | undefined,
  width: number,
  paddingLeft: number,
  paddingRight: number
): string[] {
  const available = Math.max(4, width - paddingLeft - paddingRight);
  const rawLines = label !== undefined && label !== null ? label.split(/\r?\n/) : [''];
  const wrapped: string[] = [];
  rawLines.forEach((rawLine, index) => {
    if (rawLine === '') {
      wrapped.push('');
      return;
    }
    const segments = wrapSingleLine(rawLine, available);
    wrapped.push(...segments);
  });
  return wrapped.length ? wrapped : [''];
}
