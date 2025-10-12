// CSI: wiring payload — mirrors the message envelope expected by the extension
// host when a webview export completes.
interface ExportFormatMessage {
  type: 'export';
  format: 'svg' | 'png' | 'webp';
  data: string;
}

type SupportedFormat = ExportFormatMessage['format'];

// CSI: tuning knobs — raster exports need extra pixel density and sensible
// WebP quality so diagrams stay crisp without ballooning file size.
const RASTER_SCALE = 2;
const WEBP_QUALITY = 0.95;

export async function exportDiagram(
  format: SupportedFormat,
  diagramEl: HTMLElement,
  vscode: WebviewApi
): Promise<void> {
  // CSI: availability gate — surface a friendly warning if the renderer hasn't
  // mounted the SVG yet instead of throwing an opaque error.
  const svgElement = diagramEl.querySelector('svg');
  if (!(svgElement instanceof SVGSVGElement)) {
    console.warn('Export requested but no SVG diagram is available.');
    return;
  }

  if (format === 'svg') {
    // CSI: fast path — raw SVG exports avoid rasterization entirely.
    const svgMarkup = serializeSvg(svgElement);
    vscode.postMessage({ type: 'export', format, data: svgMarkup } satisfies ExportFormatMessage);
    return;
  }

  // CSI: raster flow — serialize once so PNG/WebP branches share consistent
  // markup; avoids subtle divergence on data attributes.
  const svgMarkup = serializeSvg(svgElement);
  const dataUrl = await rasterizeSvg(svgMarkup, svgElement, format);
  vscode.postMessage({ type: 'export', format, data: dataUrl } satisfies ExportFormatMessage);
}

function serializeSvg(svg: SVGSVGElement): string {
  // CSI: clone hygiene — work on a detached copy so we can rewrite structure
  // without mutating the live DOM.
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const clientRect = svg.getBoundingClientRect();
  const storedOriginX = parseNumericAttribute(svg, 'data-diagram-origin-x');
  const storedOriginY = parseNumericAttribute(svg, 'data-diagram-origin-y');
  const storedLayoutCenterX = parseNumericAttribute(svg, 'data-layout-center-x');
  const storedLayoutCenterY = parseNumericAttribute(svg, 'data-layout-center-y');
  const storedLayoutWidth = parseNumericAttribute(svg, 'data-layout-width');
  const storedLayoutHeight = parseNumericAttribute(svg, 'data-layout-height');
  const contentBounds = getContentBounds(svg);
  inlineStyles(svg, clone);
  normalizeCloneStructure(clone);

  const viewBoxBase = svg.viewBox.baseVal;
  const width =
    storedLayoutWidth ??
    ((viewBoxBase && viewBoxBase.width > 0 ? viewBoxBase.width : parseFloat(svg.getAttribute('width') ?? '')) ||
      svg.clientWidth ||
      svg.getBBox().width ||
      800);
  const height =
    storedLayoutHeight ??
    ((viewBoxBase && viewBoxBase.height > 0 ? viewBoxBase.height : parseFloat(svg.getAttribute('height') ?? '')) ||
      svg.clientHeight ||
      svg.getBBox().height ||
      600);

  const baseCenterX =
    storedLayoutCenterX ??
    storedOriginX ??
    (contentBounds ? contentBounds.x + contentBounds.width / 2 : width / 2);
  const baseCenterY =
    storedLayoutCenterY ??
    storedOriginY ??
    (contentBounds ? contentBounds.y + contentBounds.height / 2 : height / 2);

  const clientWidth = clientRect.width;
  const horizontalScale = width > 0 && clientWidth > 0 ? Math.min(1, clientWidth / width) : 1;
  const centerX = baseCenterX * horizontalScale;
  const centerY = baseCenterY;
  updateStyleProperty(clone, 'transform-origin', `${formatLength(centerX)} ${formatLength(centerY)}`);

  const roleValue = clone.getAttribute('role');
  const styleValue = clone.getAttribute('style');

  clone.removeAttribute('width');
  clone.removeAttribute('height');
  clone.removeAttribute('role');
  clone.removeAttribute('style');
  clone.removeAttribute('version');
  clone.removeAttribute('xmlns');
  clone.removeAttribute('xmlns:xlink');
  clone.removeAttribute('viewBox');

  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  if (roleValue) {
    clone.setAttribute('role', roleValue);
  }
  if (styleValue) {
    clone.setAttribute('style', styleValue);
  }
  clone.setAttribute('version', '1.1');
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
  return new XMLSerializer().serializeToString(clone);
}

function normalizeCloneStructure(svg: SVGSVGElement): void {
  // CSI: purge renderer-only artifacts — exported markup should not leak layout
  // bookkeeping attributes or extra wrappers.
  svg.removeAttribute('class');
  svg.removeAttribute('data-diagram-origin-x');
  svg.removeAttribute('data-diagram-origin-y');
  svg.removeAttribute('data-layout-width');
  svg.removeAttribute('data-layout-height');
  svg.removeAttribute('data-layout-center-x');
  svg.removeAttribute('data-layout-center-y');
  svg.removeAttribute('data-diagram-origin-source');
  svg.removeAttribute('data-layout-columns-min-x');
  svg.removeAttribute('data-layout-columns-max-x');
  const contentGroup = svg.querySelector('g.diagram-content');
  if (contentGroup instanceof SVGGElement) {
    contentGroup.removeAttribute('transform');
    contentGroup.removeAttribute('style');
    const parent = contentGroup.parentElement;
    if (parent) {
      const children = Array.from(contentGroup.childNodes);
      children.forEach((child) => {
        parent.insertBefore(child, contentGroup);
      });
      parent.removeChild(contentGroup);
    }
  }
}

function getContentBounds(svg: SVGSVGElement): DOMRect | SVGRect | null {
  const candidates: SVGGraphicsElement[] = [];
  const contentGroup = svg.querySelector('g.diagram-content');
  if (contentGroup instanceof SVGGElement) {
    candidates.push(contentGroup);
  }
  const nodesGroup = svg.querySelector('g.nodes');
  if (nodesGroup instanceof SVGGElement) {
    candidates.push(nodesGroup);
  }
  if (svg instanceof SVGGraphicsElement) {
    candidates.push(svg);
  }

  for (const element of candidates) {
    try {
      const bbox = element.getBBox();
      if (bbox && Number.isFinite(bbox.width) && Number.isFinite(bbox.height) && bbox.width > 0 && bbox.height > 0) {
        return bbox;
      }
    } catch {
      // Ignore elements that cannot provide a bounding box (e.g. detached from DOM).
    }
  }

  return null;
}

function updateStyleProperty(element: Element, property: string, value: string): void {
  // CSI: style merge — sanitize inline styles so we can tweak a single property
  // without clobbering unrelated CSS the renderer had already set.
  const current = element.getAttribute('style') ?? '';
  const entries = current
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.split(':'))
    .filter((parts): parts is [string, string] => parts.length >= 2)
    .reduce<Map<string, string>>((map, [prop, ...rest]) => {
      map.set(prop.trim(), rest.join(':').trim());
      return map;
    }, new Map());

  if (value) {
    entries.set(property, value);
  } else {
    entries.delete(property);
  }

  if (!entries.size) {
    element.removeAttribute('style');
    return;
  }

  const serialized = Array.from(entries.entries())
    .map(([prop, propValue]) => `${prop}:${propValue}`)
    .join(';');
  element.setAttribute('style', serialized);
}

function formatLength(value: number): string {
  const rounded = Number.isFinite(value) ? Number(value.toFixed(3)) : 0;
  return `${rounded}px`;
}

function parseNumericAttribute(element: Element, attribute: string): number | null {
  const raw = element.getAttribute(attribute);
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function inlineStyles(source: Element, target: Element): void {
  // CSI: computed copy — bake runtime CSS into the clone so exported SVGs look
  // identical when opened outside VS Code.
  const computedStyle = window.getComputedStyle(source);
  const cssText = Array.from(computedStyle)
    .map((property) => `${property}:${computedStyle.getPropertyValue(property)};`)
    .join('');
  if (cssText) {
    target.setAttribute('style', cssText);
  }

  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  sourceChildren.forEach((child, index) => {
    const targetChild = targetChildren[index];
    if (targetChild) {
      inlineStyles(child, targetChild as Element);
    }
  });
}

async function rasterizeSvg(
  svgMarkup: string,
  originalSvg: SVGSVGElement,
  format: Exclude<SupportedFormat, 'svg'>
): Promise<string> {
  // CSI: canvas prep — determine a sensible render size that honors layout
  // metrics then draw onto a white background so transparent nodes remain legible.
  const viewBox = originalSvg.viewBox.baseVal;
  const fallbackWidth = parseFloat(originalSvg.getAttribute('width') ?? '') || originalSvg.clientWidth || 800;
  const fallbackHeight = parseFloat(originalSvg.getAttribute('height') ?? '') || originalSvg.clientHeight || 600;

  const width = viewBox && viewBox.width > 0 ? viewBox.width : fallbackWidth;
  const height = viewBox && viewBox.height > 0 ? viewBox.height : fallbackHeight;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * RASTER_SCALE));
  canvas.height = Math.max(1, Math.round(height * RASTER_SCALE));

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to acquire 2D rendering context for export.');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const svgDataUrl = svgToDataUrl(svgMarkup);
  const image = new Image();
  image.decoding = 'async';
  image.crossOrigin = 'anonymous';

  const { promise: imageLoaded, resolve, reject } = Promise.withResolvers<void>();
  image.onload = () => resolve();
  image.onerror = (event) => reject(new Error(`Failed to load SVG for export: ${String(event)}`));
  image.src = svgDataUrl;

  await imageLoaded;

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  if (format === 'png') {
    return canvas.toDataURL('image/png');
  }
  return canvas.toDataURL('image/webp', WEBP_QUALITY);
}

function svgToDataUrl(markup: string): string {
  // CSI: data URI — encode SVG markup to eliminate charset issues when loaded
  // into an offscreen canvas element.
  const encoded = window.btoa(
    encodeURIComponent(markup).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  );
  return `data:image/svg+xml;base64,${encoded}`;
}
