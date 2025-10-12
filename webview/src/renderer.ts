// CSI: re-export — expose the key renderer entry points without forcing the
// webview entry file to chase nested paths.

export { renderDocument, LAYOUT } from './renderer/document.js';
export {
  zoomIn,
  zoomOut,
  zoomToFit,
  resetZoomToActual
} from './renderer/zoom.js';
