import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { storybookAngularVitest } from '@storybook/angular-vite/vitest';
const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// The workspace root, two levels up from projects/ui. npm hoists every dependency
// there, so it is where the setup files below actually live on disk.
const workspaceRoot = path.join(dirname, '..', '..');

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  // `storybookTest` pins Vite's root to the Storybook configDir's parent — i.e.
  // projects/ui — but this is a monorepo, so the setup files it and
  // `storybookAngularVitest` inject (@angular/compiler, addon-vitest's own
  // setup-file) resolve into the hoisted <workspaceRoot>/node_modules, outside
  // that root. Vitest only rewrites an out-of-root module to a servable `/@fs/`
  // URL when fs.allow covers it; without this the browser gets a bare absolute
  // path, fails to fetch it, and every story errors before a single test runs.
  server: { fs: { allow: [workspaceRoot] } },
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          // Forwards Angular build options (styles, assets, zoneless, …) into standalone vitest runs.
          //
          // `styles` is not optional here, and passing `{}` is not a smaller
          // version of passing it. Storybook's own targets in angular.json carry
          // `styles: ['./.storybook/preview.scss']`, and the Storybook CLI hands
          // those to this plugin through an env var — but `npm run test:a11y` is
          // a standalone vitest run with no CLI in front of it, so nothing sets
          // that var and whatever is passed here is all the run gets.
          //
          // Left empty, the theme never loads: every `--mat-sys-*` / `--ui-sys-*`
          // token is undefined, every component renders on the UA's own colours,
          // and axe's colour-contrast rules — the reason `test: 'error'` is set
          // in preview.ts — grade a page this library did not style. That is a
          // green suite that proves nothing, which is worse than a red one.
          //
          // Absolute, because vitest's root is projects/ui but this value is not
          // documented as being resolved against it.
          storybookAngularVitest({
            styles: [path.join(dirname, '.storybook', 'preview.scss')],
          }),
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
              {
                browser: 'chromium',
              },
            ],
          },
        },
      },
    ],
  },
});
