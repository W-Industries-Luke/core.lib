import type { StorybookConfig } from '@storybook/angular-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-vitest', '@storybook/addon-a11y', '@storybook/addon-docs'],

  // Self-hosted assets copied verbatim into the build root (and served by the
  // dev server). This is where the Material Symbols variable `.woff2` lives, so
  // the icon font — the load-bearing assertion of the `test:stories` smoke gate
  // — resolves from the same origin as the build instead of `fonts.gstatic.com`,
  // the documented flake source for that gate. `preview-head.html` points its
  // `@font-face` at `./fonts/material-symbols-outlined.woff2`, which this places
  // at the build root. Paths are relative to this config directory.
  staticDirs: [{ from: './static', to: '/' }],
  framework: {
    name: '@storybook/angular-vite',
    options: {
      // compodoc parses the library's TypeScript into documentation.json, which
      // preview.ts hands to the docs addon. That is what makes autodocs render
      // real input/output tables and JSDoc rather than bare arg names.
      // The builder regenerates it on every build, so it is a build artifact
      // (gitignored) rather than something to commit.
      compodoc: true,
      compodocArgs: ['-e', 'json', '-d', 'projects/ui'],
    },
  },

  viteFinal: async (viteConfig) => ({
    ...viteConfig,

    // Emit relative asset URLs so the static build works from any mount point —
    // GitHub Pages serves this project site from /core.lib/, not from /.
    // This is Storybook's default; pinning it makes the requirement explicit and
    // survives an upstream default change. Note it must stay relative rather than
    // a hardcoded '/core.lib/', or local `build-storybook` output and PR previews
    // would break.
    base: './',

    build: {
      ...viteConfig.build,

      // Preserve native CSS `light-dark()` in the built preview.
      //
      // The whole dark mode mechanism is that every `--mat-sys-*` / `--ui-sys-*`
      // role is a `light-dark()` pair the toolbar flips by forcing `color-scheme`
      // on `<html>` at runtime (see `preview.ts`, `_theme.scss`). Vite's CSS
      // pipeline here is Lightning CSS, which — for any target that predates
      // `light-dark()` — downlevels `light-dark(a, b)` into a
      // `var(--lightningcss-light,a) var(--lightningcss-dark,b)` polyfill whose
      // helper vars are switched ONLY by a `@media (prefers-color-scheme: dark)`
      // rule. A runtime `color-scheme: dark` never touches that media query, so
      // the toolbar would flip nothing and dark would render identically to
      // light — exactly the bug this fixes.
      //
      // Lightning CSS derives its targets from `build.cssTarget` (Vite passes it
      // through `convertTargets`, ignoring `css.lightningcss.targets` at minify
      // time), which otherwise defaults to a floor old enough to trigger the
      // downlevel. Pinning it to the browsers with native `light-dark()`
      // (Baseline widely available since 2024, and the floor `.browserslistrc`
      // declares for the fleet) keeps the pairs intact so the forced
      // `color-scheme` re-resolves them.
      cssTarget: ['chrome123', 'edge123', 'firefox120', 'safari17.5'],
    },
  }),
};

export default config;
