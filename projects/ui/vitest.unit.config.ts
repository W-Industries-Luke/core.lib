import { defineConfig } from 'vitest/config';

/**
 * Extra Vitest config for `ng test ui`, wired via the `runnerConfig` option on the
 * `test` target in `angular.json`. The Angular CLI builds the rest of the Vitest
 * setup (jsdom environment, Angular plugins, coverage) and merges this file's
 * `test` section over it — this only adds what the builder cannot infer.
 *
 * `@material/material-color-utilities` (a **devDependency**, used only by the
 * `Foundations/Theme Generator` story support and its spec) ships ESM with a few
 * extensionless relative imports that Node's native resolver rejects when Vitest
 * externalises the package. Inlining it makes Vite transform and resolve it
 * instead, so `styles/theme-generator.spec.ts` can exercise the real colour maths.
 */
export default defineConfig({
  test: {
    server: {
      deps: {
        inline: [/@material\/material-color-utilities/],
      },
    },
  },
});
