import type { Meta, StoryObj } from '@storybook/angular-vite';

import { Ui } from './ui';

// The pattern every component in this library should follow:
//
//   - `component` points at the standalone component itself; Storybook renders
//     it through Angular, so what you see here is what a *.web app gets.
//   - each named export below is one story = one configuration of the component.
//     As `Ui` grows inputs, add an `args: {...}` story per meaningful variant
//     rather than one story with knobs — the variants are the documentation.
//   - `tags: ['autodocs']` generates the Docs page from the compodoc metadata
//     (see `compodoc: true` in .storybook/main.ts), so JSDoc on inputs shows up
//     in the args table for free.
const meta: Meta<Ui> = {
  title: 'Components/Ui',
  component: Ui,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Placeholder component that proves the library → Storybook pipeline. ' +
          'Stories render against the shared M3 theme in `src/styles/_theme.scss`, ' +
          'so they reflect the same tokens the consuming apps use.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<Ui>;

/** The component as exported from the library's public API, with no overrides. */
export const Default: Story = {};
