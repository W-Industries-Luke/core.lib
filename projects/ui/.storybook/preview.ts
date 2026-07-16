import type { Decorator, Preview } from '@storybook/angular-vite';
import { setCompodocJson } from '@storybook/addon-docs/angular';
import docJson from '../documentation.json';
import { applyScheme, DEFAULT_SCHEME, isScheme } from './color-scheme';
setCompodocJson(docJson);

// Every story renders in the scheme the toolbar selects. This is a decorator
// rather than per-story wiring precisely because "does dark mode work?" is a
// question about all of them: a story cannot opt out, so a component that breaks
// in dark is visible on the story that already exists for it.
//
// The scheme goes on `<html>` — the element the theme itself is written to —
// rather than on the story's own wrapper, so it reaches content the story does
// not contain: menus, dialogs, snackbars and tooltips all render into the CDK
// overlay container at the end of `<body>`, outside the decorator's tree.
const withColorScheme: Decorator = (story, context) => {
  applyScheme(document.documentElement, context.globals['scheme']);
  return story();
};

// `npm run test:a11y` renders every story through axe, whose rules include
// colour contrast — so pointing that run at dark mode is what turns "the stories
// have a dark mode" into "dark mode is checked". The whole suite runs in both:
//
//   npm run test:a11y         # the default scheme, as published
//   npm run test:a11y:dark    # the same stories, forced dark
//
// The Vite builder exposes `STORYBOOK_*` to the preview (its `envPrefix`), so
// this is the one seam that lets a scheme be chosen before the browser starts.
// Anything unset or unrecognised falls back to the default, which is what a
// developer opening Storybook gets.
const envScheme: unknown = import.meta.env['STORYBOOK_SCHEME'];

const preview: Preview = {
  // The toolbar. `system` is first and is the default because it is what the
  // theme ships (`color-scheme: light dark`) and therefore what a consuming app
  // that sets nothing gets; `light` and `dark` force the two an app can pin.
  globalTypes: {
    scheme: {
      description: 'Colour scheme to render the preview in',
      toolbar: {
        title: 'Scheme',
        icon: 'mirror',
        items: [
          { value: 'system', icon: 'browser', title: 'System' },
          { value: 'light', icon: 'sun', title: 'Light' },
          { value: 'dark', icon: 'moon', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },

  initialGlobals: {
    scheme: isScheme(envScheme) ? envScheme : DEFAULT_SCHEME,
  },

  decorators: [withColorScheme],

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
