interface ExportFormatMessage {
  type: 'export';
  format: 'svg' | 'png' | 'webp';
  data: string;
}

type SupportedFormat = ExportFormatMessage['format'];

const RASTER_SCALE = 2;
const WEBP_QUALITY = 0.95;

export async function exportDiagram(
  format: SupportedFormat,
  diagramEl: HTMLElement,
  vscode: WebviewApi
): Promise<void> {
  const svgElement = diagramEl.querySelector('svg');
  if (!(svgElement instanceof SVGSVGElement)) {
    console.warn('Export requested but no SVG diagram is available.');
    return;
  }

  if (format === 'svg') {
    const svgMarkup = serializeSvg(svgElement);
    vscode.postMessage({ type: 'export', format, data: svgMarkup } satisfies ExportFormatMessage);
    return;
  }

  const svgMarkup = serializeSvg(svgElement);
  const dataUrl = await rasterizeSvg(svgMarkup, svgElement, format);
  vscode.postMessage({ type: 'export', format, data: dataUrl } satisfies ExportFormatMessage);
}

function serializeSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineStyles(svg, clone);
  const viewBoxBase = svg.viewBox.baseVal;
  const width =
    (viewBoxBase && viewBoxBase.width > 0 ? viewBoxBase.width : parseFloat(svg.getAttribute('width') ?? '')) ||
    svg.clientWidth ||
    svg.getBBox().width ||
    800;
  const height =
    (viewBoxBase && viewBoxBase.height > 0 ? viewBoxBase.height : parseFloat(svg.getAttribute('height') ?? '')) ||
    svg.clientHeight ||
    svg.getBBox().height ||
    600;

  clone.setAttribute('version', '1.1');
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  return new XMLSerializer().serializeToString(clone);
}

function inlineStyles(source: Element, target: Element): void {
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

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = (event) => reject(new Error(`Failed to load SVG for export: ${String(event)}`));
    image.src = svgDataUrl;
  });

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  if (format === 'png') {
    return canvas.toDataURL('image/png');
  }
  return canvas.toDataURL('image/webp', WEBP_QUALITY);
}

function svgToDataUrl(markup: string): string {
  const encoded = window.btoa(
    encodeURIComponent(markup).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  );
  return `data:image/svg+xml;base64,${encoded}`;
}
