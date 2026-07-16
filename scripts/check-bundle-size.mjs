#!/usr/bin/env node
// Reports the built dist/ui FESM2022 bundle size against the budget in
// projects/ui/bundle-budget.json, and exits non-zero when it is over.
//
// This is the human-facing / manual entry point (`npm run check:size`). CI
// enforcement rides on projects/ui/src/bundle-size.spec.ts so it happens inside
// the existing `ng test` step; both read the same budget file, so the threshold
// has a single source of truth.
//
// Run `npx ng build ui` first — this measures the build output, not the source.
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const budget = JSON.parse(readFileSync(join(root, 'projects', 'ui', 'bundle-budget.json'), 'utf8'));

const fesmDir = join(root, 'dist', 'ui', 'fesm2022');
let files;
try {
  files = readdirSync(fesmDir).filter((f) => f.endsWith('.mjs'));
} catch {
  files = [];
}
if (files.length === 0) {
  console.error(`✗ No FESM2022 bundle found in ${fesmDir}.`);
  console.error('  Did you run `npx ng build ui` first?');
  process.exit(1);
}

const kib = (n) => `${(n / 1024).toFixed(1)} KiB`;
let overBudget = false;

for (const file of files) {
  const raw = readFileSync(join(fesmDir, file));
  const gzip = gzipSync(raw);
  const rawOk = raw.length <= budget.maxRawBytes;
  const gzipOk = gzip.length <= budget.maxGzipBytes;
  overBudget ||= !rawOk || !gzipOk;

  console.log(`Bundle: dist/ui/fesm2022/${file}`);
  console.log(`  raw:  ${kib(raw.length)} / ${kib(budget.maxRawBytes)}  ${rawOk ? 'OK' : 'OVER BUDGET'}`);
  console.log(`  gzip: ${kib(gzip.length)} / ${kib(budget.maxGzipBytes)}  ${gzipOk ? 'OK' : 'OVER BUDGET'}`);
}

if (overBudget) {
  console.error(
    '\n✗ Bundle exceeds its budget. If this growth is intended, raise the limits in projects/ui/bundle-budget.json; otherwise find what bloated the library.',
  );
  process.exit(1);
}
console.log('\n✓ Bundle within budget.');
