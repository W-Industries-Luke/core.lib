#!/usr/bin/env node
// Headless smoke gate over the BUILT Storybook (storybook-static/).
//
// Why this exists — vitest (`npm run test:a11y`) renders stories in a bare
// browser that never loads `.storybook/preview-head.html` and never asserts on
// rendered appearance, so a whole class of "it built, it just looks wrong" bugs
// shipped to the published Storybook while `ng build` + `ng test` stayed green:
//
//   - bare `<mat-icon>` painting its ligature as the literal word "info"
//     because the wrong icon font was asked for (#121),
//   - form-field errors never rendering in the built preview (#122),
//   - dark mode resolving to the exact same colours as light because the
//     `light-dark()` tokens were downlevelled and stopped flipping (#123).
//
// This pass loads the REAL built artifact — the same files GitHub Pages serves —
// enumerates EVERY story from `index.json`, and for each asserts the three
// things the above bugs would have tripped:
//
//   1. No render/console errors      — no uncaught exception, no Storybook
//      `storyErrored`/`storyThrewException`, no `console.error` during load.
//   2. Icons are glyphs, not text    — every `<mat-icon>` resolves the icon
//      font (Material Symbols), and that font is actually loaded, so its
//      ligature paints as a glyph rather than as its name. The #121 signature.
//   3. Dark differs from light       — forcing `globals=scheme:dark` re-resolves
//      `--mat-sys-surface` to a different colour than light. The #123 signature.
//
// a11y is deliberately NOT re-implemented here: `npm run test:a11y` /
// `:dark` already render every story through axe in both schemes, so this gate
// reuses that rather than duplicating a worse copy.
//
// It drives Chromium through Playwright (already a dev dependency; the vitest
// browser provider uses it too). It serves the static build over localhost —
// not `file://` — so relative asset URLs, `index.json` and the CDN font `<link>`
// all resolve exactly as they do in production. The only network it needs is the
// Material Symbols / Roboto CDN the preview head already declares.
//
// Run `npm run build-storybook` first — this reads the build output, it does not
// produce it. `npm run test:stories` chains the two.

import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { chromium } from 'playwright';

const ROOT = join(process.cwd(), 'storybook-static');
const INDEX = join(ROOT, 'index.json');

// The icon font the whole fleet standardises on (see icon/provide-icons.ts).
// A healthy `<mat-icon>` computes to this; the #121 bug computes to the body
// font because the never-loaded `material-icons` class leaves font-family unset.
const ICON_FONT = 'Material Symbols Outlined';

// One page navigation is one story load + font fetch (~1s cold, faster warm once
// the CDN font is cached by the browser). A small pool of pages keeps the whole
// pass to a couple of minutes without hammering the CDN.
const CONCURRENCY = Number(process.env['SMOKE_CONCURRENCY'] || 6);

// Generous per-story ceiling: a story that never signals rendered inside this is
// a FAILURE (it could not load), never a silent skip.
const STORY_TIMEOUT = Number(process.env['SMOKE_TIMEOUT'] || 20000);

// console.error text this gate treats as noise rather than a story defect. Kept
// deliberately tiny and specific — anything not matched here fails the story, so
// a real render error can never be swallowed. Extend only with a reason.
const CONSOLE_IGNORE = [
  /favicon\.ico/i, // the iframe has no favicon of its own; a 404 here is cosmetic
];

/** Installed into every preview document: turns Storybook's render lifecycle
 *  into flags this script can poll for. Runs before the story boots, and each
 *  full navigation is a fresh document, so it re-arms per story.
 *
 *  `rendered` and `errors` are tracked separately rather than as one
 *  "first-terminal-wins" status, because Storybook emits `storyRendered` only
 *  *after* a play function completes — so a story whose play throws (the guard
 *  that catches #122) can fire both an error event AND, depending on version,
 *  `storyRendered`. Collecting errors independently means an error is never
 *  masked by a later render signal, whatever the ordering. */
function installRenderProbe() {
  window.__smoke = { rendered: false, errors: [] };
  const fail = (msg) => window.__smoke.errors.push(msg || 'unknown error');
  const hook = () => {
    const channel = window.__STORYBOOK_ADDONS_CHANNEL__;
    if (!channel) {
      setTimeout(hook, 10);
      return;
    }
    channel.on('storyRendered', () => {
      window.__smoke.rendered = true;
    });
    channel.on('storyErrored', (p) => fail(`storyErrored: ${(p && p.error && p.error.message) || p}`));
    channel.on('storyThrewException', (e) => fail(`exception: ${(e && e.message) || e}`));
    channel.on('playFunctionThrewException', (e) => fail(`play() threw: ${(e && e.message) || e}`));
    channel.on('unhandledErrorsWhilePlaying', (errs) =>
      fail(`unhandled while playing: ${(errs && errs[0] && errs[0].message) || errs}`),
    );
    channel.on('storyMissing', () => fail('story missing from the built index'));
    // The render machine's own terminal error phase, as a backstop for any
    // failure that does not surface as one of the events above.
    channel.on('storyRenderPhaseChanged', (p) => {
      if (p && p.newPhase === 'errored') fail('render phase errored');
    });
  };
  hook();
}

/** Finds every `<mat-icon>` that is NOT drawing an icon-font glyph. Runs in the
 *  page. Icons projecting an inline SVG are skipped — they carry no ligature. */
function findTextIcons(fontName) {
  const bad = [];
  for (const el of document.querySelectorAll('mat-icon')) {
    if (el.querySelector('svg')) continue; // an SVG icon, not a ligature
    const family = (getComputedStyle(el).fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
    const isIconFont = /symbols/i.test(family);
    const loaded = isIconFont && document.fonts.check(`24px "${family}"`);
    if (!isIconFont || !loaded) {
      bad.push({
        text: (el.textContent || '').trim().slice(0, 24),
        family: family || '(none)',
        loaded: Boolean(loaded),
      });
    }
  }
  return bad;
}

/** Resolves the surface role to a painted colour — the token that must flip
 *  between schemes. Runs in the page. */
function readSurface() {
  const probe = document.createElement('div');
  probe.style.background = 'var(--mat-sys-surface)';
  document.body.appendChild(probe);
  const surface = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return { surface, bodyBg: getComputedStyle(document.body).backgroundColor };
}

function storyUrl(base, id, scheme) {
  return `${base}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story&globals=scheme:${scheme}`;
}

function startServer() {
  const mime = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.map': 'application/json',
  };
  const server = http.createServer((req, res) => {
    let pathname = decodeURIComponent(req.url.split('?')[0]);
    if (pathname === '/') pathname = '/index.html';
    const filePath = normalize(join(ROOT, pathname));
    // Never serve outside the build dir.
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end('forbidden');
    }
    try {
      const body = readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

/** Loads one story and returns its problems (empty array = healthy). */
async function checkStory(page, base, story) {
  const problems = [];
  const consoleErrors = [];
  // Route this page's console/error stream into the story currently in flight.
  // A page only ever runs one story at a time, so a plain closure array is safe.
  page.__consoleErrors = consoleErrors;

  try {
    await page.goto(storyUrl(base, story.id, 'light'), { waitUntil: 'load', timeout: STORY_TIMEOUT });
  } catch (err) {
    return [`did not load (${err.message.split('\n')[0]})`];
  }

  let state;
  try {
    await page.waitForFunction(
      () => window.__smoke && (window.__smoke.rendered || window.__smoke.errors.length > 0),
      { timeout: STORY_TIMEOUT },
    );
    state = await page.evaluate(() => window.__smoke);
  } catch {
    return ['never signalled rendered — story failed to render within the timeout'];
  }

  for (const err of state.errors) {
    problems.push(`render error: ${err}`);
  }

  // Fonts are the whole point of the icon check — wait for the CDN webfont to
  // settle before asserting a glyph resolved.
  await page.evaluate(() => document.fonts.ready);

  const textIcons = await page.evaluate(findTextIcons, ICON_FONT);
  for (const icon of textIcons) {
    problems.push(
      `<mat-icon> is not a glyph (renders "${icon.text}" as text): font-family=${icon.family}, loaded=${icon.loaded} — the #121 signature`,
    );
  }

  const realConsoleErrors = consoleErrors.filter((t) => !CONSOLE_IGNORE.some((re) => re.test(t)));
  for (const text of realConsoleErrors) {
    problems.push(`console.error during load: ${text.split('\n')[0].slice(0, 200)}`);
  }

  return problems;
}

/** The #123 gate: the surface token must resolve differently in dark than in
 *  light. Run once on a representative story — the theme is global, so one
 *  honest surface is enough, and a failure here is a fleet-wide regression. */
async function checkDarkDiffersFromLight(page, base, story) {
  await page.goto(storyUrl(base, story.id, 'light'), { waitUntil: 'load', timeout: STORY_TIMEOUT });
  await page.waitForFunction(
    () => window.__smoke && (window.__smoke.rendered || window.__smoke.errors.length > 0),
    { timeout: STORY_TIMEOUT },
  );
  await page.evaluate(() => document.fonts.ready);
  const light = await page.evaluate(readSurface);

  await page.goto(storyUrl(base, story.id, 'dark'), { waitUntil: 'load', timeout: STORY_TIMEOUT });
  await page.waitForFunction(
    () => window.__smoke && (window.__smoke.rendered || window.__smoke.errors.length > 0),
    { timeout: STORY_TIMEOUT },
  );
  const dark = await page.evaluate(readSurface);

  if (light.surface === dark.surface) {
    return (
      `dark mode is identical to light on '${story.id}': ` +
      `--mat-sys-surface resolves to ${light.surface} in both — the #123 signature ` +
      `(the light-dark() tokens are not flipping with color-scheme)`
    );
  }
  return null;
}

async function main() {
  if (!existsSync(INDEX)) {
    console.error(`✗ No built Storybook at ${ROOT}.`);
    console.error('  Run `npm run build-storybook` first (or `npm run test:stories`, which chains it).');
    process.exit(1);
  }

  const index = JSON.parse(readFileSync(INDEX, 'utf8'));
  const stories = Object.values(index.entries).filter((e) => e.type === 'story');
  if (stories.length === 0) {
    console.error('✗ Built index.json contains no stories — nothing to smoke-test. Did the build fail?');
    process.exit(1);
  }

  const { server, port } = await startServer();
  const base = `http://127.0.0.1:${port}`;
  console.log(`Smoke-testing ${stories.length} stories from ${ROOT} …\n`);

  const browser = await chromium.launch({ headless: true });
  const failures = [];
  try {
    const context = await browser.newContext();
    await context.addInitScript(installRenderProbe);

    // A pool of pages, each pulling from a shared cursor. Every page routes its
    // own console/pageerror stream into whatever story it is currently running.
    const pages = await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, stories.length) }, async () => {
        const page = await context.newPage();
        page.on('console', (msg) => {
          if (msg.type() === 'error' && page.__consoleErrors) page.__consoleErrors.push(msg.text());
        });
        page.on('pageerror', (err) => {
          if (page.__consoleErrors) page.__consoleErrors.push(`uncaught: ${err.message}`);
        });
        return page;
      }),
    );

    let cursor = 0;
    let done = 0;
    await Promise.all(
      pages.map(async (page) => {
        for (;;) {
          const i = cursor++;
          if (i >= stories.length) break;
          const story = stories[i];
          const problems = await checkStory(page, base, story);
          done++;
          if (problems.length) {
            failures.push({ id: story.id, title: story.title, name: story.name, problems });
            process.stdout.write('✗');
          } else {
            process.stdout.write('.');
          }
          if (done % 80 === 0) process.stdout.write(` ${done}/${stories.length}\n`);
        }
      }),
    );
    process.stdout.write(`\n\n`);

    // Dark-vs-light, once, on a deterministic representative story.
    const darkFailure = await checkDarkDiffersFromLight(pages[0], base, stories[0]);
    if (darkFailure) {
      failures.push({ id: stories[0].id, title: stories[0].title, name: stories[0].name, problems: [darkFailure] });
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (failures.length) {
    console.error(`✗ ${failures.length} stor${failures.length === 1 ? 'y' : 'ies'} failed the smoke gate:\n`);
    for (const f of failures) {
      console.error(`  ${f.title} › ${f.name}  [${f.id}]`);
      for (const p of f.problems) console.error(`    - ${p}`);
    }
    console.error(
      `\n${failures.length} of ${stories.length} stories failed. These render defects would ship to the published Storybook.`,
    );
    process.exit(1);
  }

  console.log(`✓ All ${stories.length} stories rendered cleanly: no console/render errors, icons are glyphs, dark ≠ light.`);
}

main().catch((err) => {
  console.error('✗ Smoke pass crashed:', err);
  process.exit(1);
});
