// CSI: Module intent — bridge toolbar/WebView wiring so user actions fan out to
// renderer helpers without leaking VS Code globals through the rest of the UI.

import {
  renderDocument,
  zoomIn,
  zoomOut,
  zoomToFit,
  resetZoomToActual
} from './renderer.js';
import { exportDiagram } from './exporters.js';

// CSI: guard — normalize the VS Code messaging API so our harness can run in
// browser tests where `acquireVsCodeApi` is absent.
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
// CSI: wiring — cache common DOM targets once; repeated lookups for the same
// nodes would invite accidental null checks elsewhere.
const diagramEl = document.getElementById('diagram');
const errorsEl = document.getElementById('errors');
const exportSvgButton = document.getElementById('export-svg');
const exportPngButton = document.getElementById('export-png');
const exportWebpButton = document.getElementById('export-webp');
const zoomInButton = document.getElementById('zoom-in');
const zoomOutButton = document.getElementById('zoom-out');
const zoomFitButton = document.getElementById('zoom-fit');
const zoomActualButton = document.getElementById('zoom-actual');

// CSI: fail-fast — the webview cannot render without these containers, so bail
// quickly with a descriptive exception rather than limp along.
if (!(diagramEl instanceof HTMLElement) || !(errorsEl instanceof HTMLElement)) {
  throw new Error('Webview container elements were not found.');
}

const diagramContainer = diagramEl as HTMLElement;
const errorsContainer = errorsEl as HTMLElement;
let lastRenderedSource: string | null = null;

// CSI: action — centralize export dispatch so toolbar buttons and remote
// commands share retry/logging behavior.
const triggerExport = (format: 'svg' | 'png' | 'webp') => {
  exportDiagram(format, diagramContainer, vscode).catch((error) => {
    console.error(`Failed to export diagram as ${format}:`, error);
  });
};

function attachToolbarHandlers(): void {
  // CSI: handlers — wire each optional button defensively so custom test
  // harnesses can omit controls without crashing event hookup.
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
}

type IncomingMessage = { type?: string; text?: string; format?: string };

// CSI: bus listener — react to extension messages for document updates and
// headless export requests.
window.addEventListener('message', (event: MessageEvent<IncomingMessage>) => {
  const message = event.data;
  if (message?.type === 'update') {
    // CSI: duplicate suppression — only rerender when the extension sends a new
    // payload; avoids flicker during rapid save events.
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
// CSI: startup — wire toolbar at the end so DOM is guaranteed ready before we
// attach handlers.
attachToolbarHandlers();
