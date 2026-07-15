import type { StorybookConfig } from '@storybook/angular-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-vitest', '@storybook/addon-a11y', '@storybook/addon-docs'],
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

  // Emit relative asset URLs so the static build works from any mount point —
  // GitHub Pages serves this project site from /core.lib/, not from /.
  // This is Storybook's default; pinning it makes the requirement explicit and
  // survives an upstream default change. Note it must stay relative rather than
  // a hardcoded '/core.lib/', or local `build-storybook` output and PR previews
  // would break.
  viteFinal: async (viteConfig) => ({ ...viteConfig, base: './' }),
};

export default config;
