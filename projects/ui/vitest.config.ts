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
          // Forwards Angular build options (styles, assets, zoneless, …) into standalone vitest runs
          storybookAngularVitest({}),
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
