import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The bundle-size budget.
 *
 * This library ships into every *.web app, so a dependency accidentally pulled
 * into the FESM bundle bloats all of them at once — and nothing else in the
 * build catches it (ng-packagr has no budgets, and `color`/tree-shaking hide
 * the cost until an app bundles it). This asserts the built FESM2022 bundle —
 * the JS consumers actually bundle — stays under an agreed ceiling.
 *
 * It runs in the same node environment as release.spec.ts and reads the build
 * output off disk, so it only means anything after `ng build ui`. CI builds the
 * library immediately before `ng test`, so the bundle is present there; running
 * `ng test` alone without a prior build is what the guard below explains.
 *
 * The threshold lives in projects/ui/bundle-budget.json — the single source of
 * truth shared with `npm run check:size` — so raising it is one deliberate,
 * reviewable edit.
 */
describe('bundle size budget', () => {
  const root = process.cwd();
  const budget = JSON.parse(
    readFileSync(join(root, 'projects', 'ui', 'bundle-budget.json'), 'utf8'),
  ) as { maxRawBytes: number; maxGzipBytes: number };

  const fesmDir = join(root, 'dist', 'ui', 'fesm2022');
  const bundles = readBundles(fesmDir);

  it('has a built FESM bundle to measure', () => {
    // A miss here means the library was not built before the tests. CI runs
    // `ng build ui` first; locally, run it before `ng test ui`.
    expect(
      bundles.length,
      `No FESM2022 bundle in ${fesmDir}. Run \`npx ng build ui\` before the tests.`,
    ).toBeGreaterThan(0);
  });

  it('keeps the raw FESM bundle under budget', () => {
    for (const b of bundles) {
      const kib = (n: number) => `${(n / 1024).toFixed(1)} KiB`;
      expect(
        b.rawBytes,
        `${b.file} is ${kib(b.rawBytes)} raw, over the ${kib(budget.maxRawBytes)} budget. ` +
          `If intended, raise maxRawBytes in bundle-budget.json; otherwise find what bloated the library.`,
      ).toBeLessThanOrEqual(budget.maxRawBytes);
    }
  });

  it('keeps the gzipped FESM bundle under budget', () => {
    for (const b of bundles) {
      const kib = (n: number) => `${(n / 1024).toFixed(1)} KiB`;
      expect(
        b.gzipBytes,
        `${b.file} is ${kib(b.gzipBytes)} gzipped, over the ${kib(budget.maxGzipBytes)} budget. ` +
          `If intended, raise maxGzipBytes in bundle-budget.json; otherwise find what bloated the library.`,
      ).toBeLessThanOrEqual(budget.maxGzipBytes);
    }
  });
});

function readBundles(fesmDir: string): { file: string; rawBytes: number; gzipBytes: number }[] {
  let files: string[];
  try {
    files = readdirSync(fesmDir).filter((f) => f.endsWith('.mjs'));
  } catch {
    return [];
  }
  return files.map((file) => {
    const raw = readFileSync(join(fesmDir, file));
    return { file, rawBytes: raw.length, gzipBytes: gzipSync(raw).length };
  });
}
