import {
  renderDocument,
  zoomIn,
  zoomOut,
  zoomToFit,
  resetZoomToActual,
  scrollToTop,
  scrollToBottom,
  scrollToLeft,
  scrollToRight,
  focusStartNode
} from './renderer.js';
import { exportDiagram } from './exporters.js';

function getWebviewApi(): WebviewApi {
  if (typeof acquireVsCodeApi === 'function') {
    return acquireVsCodeApi();
  }
  return {
    postMessage: () => {
      /* no-op for non-VS Code harnesses */
    }
  };
}

const vscode = getWebviewApi();
const diagramEl = document.getElementById('diagram');
const errorsEl = document.getElementById('errors');
const exportSvgButton = document.getElementById('export-svg');
const exportPngButton = document.getElementById('export-png');
const exportWebpButton = document.getElementById('export-webp');
const zoomInButton = document.getElementById('zoom-in');
const zoomOutButton = document.getElementById('zoom-out');
const zoomFitButton = document.getElementById('zoom-fit');
const zoomActualButton = document.getElementById('zoom-actual');
const scrollTopButton = document.getElementById('scroll-top');
const scrollBottomButton = document.getElementById('scroll-bottom');
const scrollLeftButton = document.getElementById('scroll-left');
const scrollRightButton = document.getElementById('scroll-right');
const focusHomeButton = document.getElementById('focus-home');

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
  if (zoomInButton instanceof HTMLButtonElement) {
    zoomInButton.addEventListener('click', () => {
      zoomIn();
    });
  }
  if (zoomOutButton instanceof HTMLButtonElement) {
    zoomOutButton.addEventListener('click', () => {
      zoomOut();
    });
  }
  if (zoomFitButton instanceof HTMLButtonElement) {
    zoomFitButton.addEventListener('click', () => {
      zoomToFit();
    });
  }
  if (zoomActualButton instanceof HTMLButtonElement) {
    zoomActualButton.addEventListener('click', () => {
      resetZoomToActual();
    });
  }
  if (scrollTopButton instanceof HTMLButtonElement) {
    scrollTopButton.addEventListener('click', () => {
      scrollToTop();
    });
  }
  if (scrollBottomButton instanceof HTMLButtonElement) {
    scrollBottomButton.addEventListener('click', () => {
      scrollToBottom();
    });
  }
  if (scrollLeftButton instanceof HTMLButtonElement) {
    scrollLeftButton.addEventListener('click', () => {
      scrollToLeft();
    });
  }
  if (scrollRightButton instanceof HTMLButtonElement) {
    scrollRightButton.addEventListener('click', () => {
      scrollToRight();
    });
  }
  if (focusHomeButton instanceof HTMLButtonElement) {
    focusHomeButton.addEventListener('click', () => {
      focusStartNode();
    });
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
