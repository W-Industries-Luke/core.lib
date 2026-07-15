/**
 * Loads every entry in the *built* Storybook in headless Chromium and fails on
 * any `console.error` or uncaught page error.
 *
 * Why this exists (issue #80): `ng build`, `ng test` and `test:a11y` all render
 * components inside a *test harness*, so none of them sees what the real
 * Storybook iframe does. A `provideRouter([])` in button.stories.ts threw
 * `NG04002` on every button story and blanked the Docs previews while all four
 * gates stayed green — a human found it on the published site. This check closes
 * that hole by driving the same artefact that gets published.
 *
 * Usage:
 *   npm run build-storybook && node tools/check-storybook-console.mjs
 *
 * It reuses the Chromium that `test:a11y` installs (`npx playwright install
 * --with-deps chromium`) — there is no second browser toolchain here.
 */
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const staticDir = path.join(repoRoot, 'storybook-static');

/**
 * Console noise that is genuinely outside our control. **Empty on purpose** —
 * the whole built Storybook currently loads with zero console errors, so nothing
 * has earned a place here and the check needs no help to pass.
 *
 * Anything not listed fails the run. An error in the preview frame is a real
 * error on the published site until proven otherwise, so the bar for adding an
 * entry is "we cannot fix this", not "this is failing CI". Each entry is a
 * narrow regex — matching one specific message, never a whole category — with a
 * comment saying why it is unfixable:
 *
 *   { pattern: /^Some exact message from a third-party script$/, reason: '…' }
 */
const ALLOWED_CONSOLE_ERRORS = [];

/**
 * The entries the NG04002 regression actually broke. Checking every id in
 * index.json already covers them, but a rename would silently drop that coverage
 * and leave this check green for the exact bug it was written for — so require
 * them by name and fail loudly if they vanish. If a story is deliberately
 * renamed, update this list to match.
 */
const REQUIRED_ENTRY_IDS = [
  'components-button--disabled',
  'components-button--form-submit',
  'components-button--docs',
];

const MIME_TYPES = {
  '.css': 'text/css',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.mjs': 'text/javascript',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

/** Serves storybook-static over http, because file:// URLs break module loading. */
async function serveStatic() {
  const server = createServer(async (req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    // path.join collapses `..`, and the prefix check rejects anything that
    // escaped staticDir regardless.
    const filePath = path.join(staticDir, urlPath === '/' ? 'index.html' : urlPath);
    if (!filePath.startsWith(staticDir)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const info = await stat(filePath);
      if (info.isDirectory()) {
        res.writeHead(403).end();
        return;
      }
      res.writeHead(200, {
        'content-type': MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream',
        'content-length': info.size,
      });
      createReadStream(filePath).pipe(res);
    } catch {
      res.writeHead(404).end('not found');
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

/**
 * Every id in index.json, each with the view mode the manager would use for it:
 * `docs` entries are the autodocs pages (where the NG04002 blanking actually
 * showed up), `story` entries are the individual stories.
 */
async function readEntries() {
  let index;
  try {
    index = JSON.parse(await readFile(path.join(staticDir, 'index.json'), 'utf8'));
  } catch (error) {
    throw new Error(
      `Could not read ${path.relative(repoRoot, staticDir)}/index.json — run \`npm run build-storybook\` first.\n${error.message}`,
    );
  }
  const entries = Object.values(index.entries ?? {}).map((entry) => ({
    id: entry.id,
    title: entry.title,
    name: entry.name,
    viewMode: entry.type === 'docs' ? 'docs' : 'story',
  }));
  if (entries.length === 0) {
    throw new Error(
      'index.json contains no entries — the Storybook build produced nothing to check.',
    );
  }
  const ids = new Set(entries.map((entry) => entry.id));
  const missing = REQUIRED_ENTRY_IDS.filter((id) => !ids.has(id));
  if (missing.length > 0) {
    throw new Error(
      `index.json is missing entries this check is required to cover: ${missing.join(', ')}.\n` +
        'If they were renamed, update REQUIRED_ENTRY_IDS in tools/check-storybook-console.mjs.',
    );
  }
  return entries;
}

/** Resolves once Storybook has rendered something into the preview frame. */
async function waitForRender(page) {
  await page.waitForFunction(
    () => {
      const rendered = (selector) => (document.querySelector(selector)?.childElementCount ?? 0) > 0;
      // `sb-show-errordisplay` is Storybook's own render-failure screen; treat it
      // as "done" so the error it reports is what gets surfaced, rather than a
      // timeout that buries it.
      return (
        rendered('#storybook-root') ||
        rendered('#storybook-docs') ||
        document.body.classList.contains('sb-show-errordisplay')
      );
    },
    undefined,
    { timeout: 30_000 },
  );
}

async function checkEntry(page, baseUrl, entry) {
  const problems = [];
  const onConsole = (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    const allowed = ALLOWED_CONSOLE_ERRORS.find(({ pattern }) => pattern.test(text));
    if (!allowed) problems.push(`console.error: ${text}`);
  };
  const onPageError = (error) => problems.push(`uncaught: ${error.message}`);

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  try {
    const url = `${baseUrl}/iframe.html?id=${encodeURIComponent(entry.id)}&viewMode=${entry.viewMode}`;
    await page.goto(url, { waitUntil: 'load' });
    try {
      await waitForRender(page);
    } catch {
      problems.push('nothing rendered into the preview frame within 30s');
    }
    // Errors thrown from a microtask or an effect land after first paint, so
    // give them a beat to arrive before unsubscribing.
    await page.waitForTimeout(250);
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
  }
  return problems;
}

async function main() {
  const entries = await readEntries();
  const { server, baseUrl } = await serveStatic();
  const browser = await chromium.launch();
  const failures = [];

  try {
    const page = await browser.newPage();
    for (const entry of entries) {
      const problems = await checkEntry(page, baseUrl, entry);
      if (problems.length > 0) failures.push({ entry, problems });
      process.stdout.write(problems.length > 0 ? 'F' : '.');
    }
    process.stdout.write('\n');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} of ${entries.length} Storybook entries logged errors:\n`);
    for (const { entry, problems } of failures) {
      console.error(`  ${entry.id} (viewMode=${entry.viewMode}) — ${entry.title} / ${entry.name}`);
      for (const problem of problems) {
        console.error(`      ${problem.split('\n')[0]}`);
      }
    }
    console.error(
      '\nThese are real errors in the published Storybook. Fix the story or the component;\n' +
        'only add to ALLOWED_CONSOLE_ERRORS in tools/check-storybook-console.mjs if the noise\n' +
        'is genuinely outside our control, and say why.\n',
    );
    process.exitCode = 1;
    return;
  }

  console.log(`${entries.length} Storybook entries loaded with zero console errors.`);
}

await main();
