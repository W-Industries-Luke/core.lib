import type { Preview } from '@storybook/angular-vite';
import { setCompodocJson } from '@storybook/addon-docs/angular';
import docJson from '../documentation.json';
setCompodocJson(docJson);

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // Every story is an axe assertion: `npm run test:a11y` runs each one in a
      // real browser and fails on any violation. This is the library's a11y
      // floor, so it is deliberately 'error' rather than 'todo' — a violation
      // here would ship to every consuming app.
      //
      // 'todo'  - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off'   - skip a11y checks entirely
      //
      // Narrowly disable a genuine false positive on the story that hits it
      // (`parameters.a11y.config.rules`), with a comment saying why — never
      // globally, and never to go green.
      test: 'error',
    },
  },
};

export default preview;
