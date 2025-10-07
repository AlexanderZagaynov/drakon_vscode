import { createReadStream, readFileSync, readdirSync, existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { expect, test } from '@playwright/test';

const projectRoot = path.resolve(__dirname, '../..');
const examplesDir = path.join(projectRoot, 'docs', 'simple_examples');
const snapshotsDir = path.join(projectRoot, 'tests', 'e2e', 'snapshots', 'simple_examples');

const SNAPSHOT_STYLE_PROPERTIES = new Set<string>([
  'background',
  'background-color',
  'border-radius',
  'box-shadow',
  'color',
  'display',
  'visibility',
  'opacity',
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linejoin',
  'stroke-miterlimit',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-anchor',
  'alignment-baseline',
  'dominant-baseline',
  'paint-order',
  'marker-start',
  'marker-mid',
  'marker-end',
  'vector-effect',
  'transform',
  'transform-origin',
  'shape-rendering'
]);

const exampleFiles = readdirSync(examplesDir)
  .filter((file) => file.endsWith('.drakon'))
  .sort();

let server: http.Server | null = null;
let harnessUrl: string;

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

async function resolveFilePath(requestPath: string): Promise<string | null> {
  const decoded = decodeURIComponent(requestPath);
  const stripped = decoded.replace(/^\/+/, '');
  const normalized = path.normalize(stripped);
  if (normalized.startsWith('..')) {
    return null;
  }
  let candidate = path.join(projectRoot, normalized);
  try {
    const stats = await fs.stat(candidate);
    if (stats.isDirectory()) {
      candidate = path.join(candidate, 'index.html');
    }
    await fs.access(candidate);
    return candidate;
  } catch {
    console.warn(`playwright static server missing: ${candidate}`);
    return null;
  }
}

test.beforeAll(async () => {
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const filePath = await resolveFilePath(url.pathname);
    if (!filePath) {
      console.warn(`playwright static server 404: ${url.pathname}`);
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', getContentType(filePath));
    createReadStream(filePath).pipe(res);
  });
  await new Promise<void>((resolve) => server!.listen(0, resolve));
  const address = server.address() as AddressInfo;
  harnessUrl = new URL('/tests/e2e/harness/index.html', `http://127.0.0.1:${address.port}`).toString();
});

test.afterAll(async () => {
  if (!server) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    server!.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
  server = null;
});

type HarnessMessage = { type?: string; format?: 'svg' | 'png' | 'webp'; data?: string };

function sanitizeStyleAttribute(styleValue: string): string | null {
  const decoded = styleValue.replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  const parts: string[] = [];
  let buffer = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = 0; index < decoded.length; index += 1) {
    const char = decoded[index] ?? '';
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    }

    if (char === ';' && !inSingleQuote && !inDoubleQuote) {
      parts.push(buffer.trim());
      buffer = '';
      continue;
    }

    buffer += char;
  }
  if (buffer.trim()) {
    parts.push(buffer.trim());
  }

  const entries = parts
    .filter(Boolean)
    .map((entry) => {
      const colonIndex = entry.indexOf(':');
      if (colonIndex === -1) {
        return null;
      }
      const property = entry.slice(0, colonIndex).trim();
      const value = entry.slice(colonIndex + 1).trim();
      if (!property) {
        return null;
      }
      return { property, value };
    })
    .filter(
      (entry): entry is { property: string; value: string } =>
        Boolean(entry) && SNAPSHOT_STYLE_PROPERTIES.has(entry.property)
    )
    .map(({ property, value }) => `${property}:${value}`);

  if (!entries.length) {
    return null;
  }

  entries.sort();
  const reconstructed = entries
    .map((entry) => entry.replace(/"/g, '&quot;').replace(/'/g, '&apos;'))
    .join(';');
  return reconstructed;
}

function normalizeSvg(content: string): string {
  const unified = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const sanitized = unified.replace(/style="([^"]*)"/g, (_, styleValue: string) => {
    const filtered = sanitizeStyleAttribute(styleValue);
    if (!filtered) {
      return '';
    }
    return `style="${filtered}"`;
  });
  const withBreaks = sanitized.replace(/></g, '>\n<');
  return withBreaks.trim() + '\n';
}

test.describe('simple examples', () => {
  for (const file of exampleFiles) {
    const source = readFileSync(path.join(examplesDir, file), 'utf-8');

    test(`renders ${file} without errors`, async ({ page }) => {
      await page.goto(harnessUrl);
      await page.waitForLoadState('domcontentloaded');

      await page.waitForFunction(() => {
        const win = window as typeof window & { __playwrightMessages?: HarnessMessage[] };
        return Array.isArray(win.__playwrightMessages) && win.__playwrightMessages.some((msg) => msg?.type === 'ready');
      });

      await page.evaluate(() => {
        const win = window as typeof window & { __playwrightMessages?: HarnessMessage[] };
        if (Array.isArray(win.__playwrightMessages)) {
          win.__playwrightMessages.splice(0);
        } else {
          win.__playwrightMessages = [];
        }
      });

      await page.evaluate((diagramSource) => {
        window.postMessage({ type: 'update', text: diagramSource }, '*');
      }, source);

      await page.waitForFunction(() => {
        const container = document.getElementById('diagram');
        if (!container) {
          return false;
        }
        return Boolean(container.querySelector('svg') || container.querySelector('.empty-state'));
      });

      const svgLocator = page.locator('svg');
      const emptyStateLocator = page.locator('.empty-state');
      const hasSvg = (await svgLocator.count()) > 0;

      if (hasSvg) {
        await expect(svgLocator).toBeVisible();
      } else {
        await expect(emptyStateLocator).toBeVisible();
      }

      await expect(page.locator('#errors')).toHaveClass(/hidden/);

      if (hasSvg) {
        await page.evaluate(() => {
          const win = window as typeof window & { __playwrightMessages?: HarnessMessage[] };
          if (Array.isArray(win.__playwrightMessages)) {
            win.__playwrightMessages.splice(0);
          } else {
            win.__playwrightMessages = [];
          }
        });
        await page.click('#export-svg');
        await page.waitForFunction(() => {
          const win = window as typeof window & { __playwrightMessages?: HarnessMessage[] };
          return win.__playwrightMessages?.some((msg) => msg?.type === 'export' && msg.format === 'svg');
        });
        const exportMessage = await page.evaluate(() => {
          const win = window as typeof window & { __playwrightMessages?: HarnessMessage[] };
          return win.__playwrightMessages?.find((msg) => msg?.type === 'export');
        });
        expect(exportMessage?.data && exportMessage.data.length).toBeGreaterThan(0);

        const normalizedActual = normalizeSvg(String(exportMessage?.data ?? ''));
        const snapshotPath = path.join(
          snapshotsDir,
          `${file.replace(/\.drakon$/, '')}.svg`
        );
        await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
        if (!existsSync(snapshotPath)) {
          await fs.writeFile(snapshotPath, normalizedActual, 'utf-8');
        } else {
          const expected = normalizeSvg(await fs.readFile(snapshotPath, 'utf-8'));
          expect(normalizedActual).toBe(expected);
        }
      }
    });
  }
});
