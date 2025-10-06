import type * as d3Type from 'd3';

declare global {
  const d3: typeof d3Type;

  interface WebviewApi {
    postMessage(message: unknown): void;
  }

  function acquireVsCodeApi<T = WebviewApi>(): T;
}

export {};
