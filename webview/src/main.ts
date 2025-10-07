import { renderDocument } from './renderer.js';
import { exportDiagram } from './exporters.js';

const vscode = acquireVsCodeApi();
const diagramEl = document.getElementById('diagram');
const errorsEl = document.getElementById('errors');
const exportSvgButton = document.getElementById('export-svg');
const exportPngButton = document.getElementById('export-png');
const exportWebpButton = document.getElementById('export-webp');

if (!(diagramEl instanceof HTMLElement) || !(errorsEl instanceof HTMLElement)) {
  throw new Error('Webview container elements were not found.');
}

const diagramContainer = diagramEl as HTMLElement;
const errorsContainer = errorsEl as HTMLElement;
let lastRenderedSource: string | null = null;

const triggerExport = (format: 'svg' | 'png' | 'webp') => {
  exportDiagram(format, diagramContainer, vscode).catch((error) => {
    console.error(`Failed to export diagram as ${format}:`, error);
  });
};

function attachToolbarHandlers(): void {
  if (exportSvgButton instanceof HTMLButtonElement) {
    exportSvgButton.addEventListener('click', () => triggerExport('svg'));
  }
  if (exportPngButton instanceof HTMLButtonElement) {
    exportPngButton.addEventListener('click', () => triggerExport('png'));
  }
  if (exportWebpButton instanceof HTMLButtonElement) {
    exportWebpButton.addEventListener('click', () => triggerExport('webp'));
  }
}

type IncomingMessage = { type?: string; text?: string; format?: string };

window.addEventListener('message', (event: MessageEvent<IncomingMessage>) => {
  const message = event.data;
  if (message?.type === 'update') {
    const nextSource = message.text ?? '';
    if (nextSource === lastRenderedSource) {
      return;
    }
    lastRenderedSource = nextSource;
    try {
      renderDocument(nextSource, diagramContainer, errorsContainer);
    } catch (error) {
      lastRenderedSource = null;
      throw error;
    }
  } else if (message?.type === 'exportCommand') {
    const format = message.format as 'svg' | 'png' | 'webp' | undefined;
    if (format) {
      triggerExport(format);
    }
  }
});

vscode.postMessage({ type: 'ready' });
attachToolbarHandlers();
