import { MatFabButton, MatMiniFabButton } from '@angular/material/button';
import { provideRouter, RouterLink, withDisabledInitialNavigation } from '@angular/router';
import {
  applicationConfig,
  moduleMetadata,
  type Meta,
  type StoryObj,
} from '@storybook/angular-vite';

import { Icon } from '../icon/icon';
import { Fab, type UiFabColor } from './fab';

const COLORS: UiFabColor[] = ['primary', 'accent', 'warn'];

const meta: Meta<Fab> = {
  title: 'Components/FAB',
  component: Fab,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: [Fab, MatFabButton, MatMiniFabButton, Icon, RouterLink] }),
    // `routerLink` needs a Router to resolve an href against, and
    // `withDisabledInitialNavigation()` keeps that Router from navigating against
    // the Storybook iframe's own URL — see `button.stories.ts` for the full why.
    applicationConfig({
      providers: [provideRouter([], withDisabledInitialNavigation())],
    }),
  ],
  args: {
    color: 'primary',
  },
  argTypes: {
    color: { control: 'inline-radio', options: COLORS },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`uiFab` applies the shared M3 theme to a Material floating action button — regular, mini',
          'or extended. Like `uiButton` it is a **directive on the native element**, not a wrapper:',
          'the `<button>` a consumer writes is the `<button>` the browser gets, so `aria-label`',
          '(which an icon-only FAB needs), `id`, `disabled`, `data-*`, `tabindex`, `(click)`,',
          "Material's own `extended` input and `routerLink` all just work.",
          '',
          'It goes on an element that also has `matFab` or `matMiniFab` — those are *components* with',
          'attribute selectors, and the regular/mini split is Material’s own component boundary. A',
          'FAB is a low-emphasis *container* surface, so each `color` resolves to its palette’s',
          '`container` / `on-container` pair from the shared M3 theme, dark mode included.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `
      <button matFab uiFab [color]="color" aria-label="Compose">
        <ui-icon name="edit" />
      </button>
    `,
  }),
};

export default meta;
type Story = StoryObj<Fab>;

/** The default FAB: a regular FAB at the `primary` container colour. */
export const Default: Story = {};

// --- Variants --------------------------------------------------------------

/** The regular FAB: the primary action on a surface. */
export const Regular: Story = {
  name: 'Variant: regular',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <button matFab uiFab aria-label="Compose"><ui-icon name="edit" /></button>
    `,
  }),
};

/** The mini FAB: a smaller FAB for a secondary or space-constrained action. */
export const Mini: Story = {
  name: 'Variant: mini',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <button matMiniFab uiFab aria-label="Add"><ui-icon name="add" /></button>
    `,
  }),
};

/**
 * The extended FAB: `extended` is Material's own input and reaches the FAB
 * natively. It pairs an icon with a visible label, so it needs no `aria-label`.
 */
export const Extended: Story = {
  name: 'Variant: extended',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <button matFab extended uiFab><ui-icon name="navigation" /> Navigate</button>
    `,
  }),
};

// --- Colours ---------------------------------------------------------------

/** Material's default FAB colour — the `primary-container` pair. */
export const ColorPrimary: Story = { name: 'Color: primary', args: { color: 'primary' } };

/** The theme's tertiary-container pair, exposed under the familiar `accent` name. */
export const ColorAccent: Story = { name: 'Color: accent', args: { color: 'accent' } };

/** The theme's error-container pair — for a destructive primary action. */
export const ColorWarn: Story = { name: 'Color: warn', args: { color: 'warn' } };

// --- States ----------------------------------------------------------------

/**
 * `disabled` is the *native* attribute — there is no `disabled` input to forward.
 * Material styles it from the theme's disabled tokens.
 */
export const Disabled: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; gap: 1.5rem; align-items: center;">
        <button matFab uiFab disabled aria-label="Compose"><ui-icon name="edit" /></button>
        <button matMiniFab uiFab disabled aria-label="Add"><ui-icon name="add" /></button>
        <button matFab extended uiFab disabled><ui-icon name="navigation" /> Navigate</button>
      </div>
    `,
  }),
};

/**
 * `a[uiFab]` is a real anchor, so `routerLink` resolves an `href` and navigates —
 * the FAB doubles as a nav control with no wrapper hack.
 */
export const AnchorRouterLink: Story = {
  name: 'Native: a[uiFab] routerLink',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <a matFab uiFab routerLink="/compose" aria-label="Compose"><ui-icon name="edit" /></a>
    `,
  }),
};

// --- The full matrix -------------------------------------------------------

/**
 * Every variant × colour. This is the reference grid: if a combination is not
 * legible here, the theme is wrong. Each icon-only FAB carries its own
 * `aria-label`; the extended FAB has a visible label instead.
 */
export const AllVariantsAndColors: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { colors: COLORS },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        @for (color of colors; track color) {
          <div style="display: flex; gap: 1.5rem; align-items: center;">
            <button matFab uiFab [color]="color" [attr.aria-label]="'Compose (' + color + ')'">
              <ui-icon name="edit" />
            </button>
            <button matMiniFab uiFab [color]="color" [attr.aria-label]="'Add (' + color + ')'">
              <ui-icon name="add" />
            </button>
            <button matFab extended uiFab [color]="color">
              <ui-icon name="navigation" /> {{ color }}
            </button>
          </div>
        }
      </div>
    `,
  }),
};
