import { MatIconButton } from '@angular/material/button';
import { provideRouter, RouterLink, withDisabledInitialNavigation } from '@angular/router';
import {
  applicationConfig,
  argsToTemplate,
  moduleMetadata,
  type Meta,
  type StoryObj,
} from '@storybook/angular-vite';

import { Icon } from '../icon/icon';
import { IconButton, type UiIconButtonColor } from './icon-button';

const COLORS: UiIconButtonColor[] = ['primary', 'accent', 'warn'];

const meta: Meta<IconButton> = {
  title: 'Components/Icon Button',
  component: IconButton,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: [IconButton, MatIconButton, Icon, RouterLink] }),
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
          '`uiIconButton` applies the shared M3 theme to a Material icon button. Like `uiButton`',
          'it is a **directive on the native element**, not a wrapper: the `<button>` a consumer',
          'writes is the `<button>` the browser gets, so `aria-label` — which an icon-only button',
          '**must** have for a screen reader — `id`, `disabled`, `data-*`, `tabindex`, `(click)` and',
          '`routerLink` all just work.',
          '',
          'It goes on an element that also has `matIconButton`, because `MatIconButton` is a',
          '*component* with an attribute selector: Angular will not let a directive pull a component',
          'onto its own host. There is no `variant` — Material icon buttons have a single appearance;',
          'only `color` applies, resolved from the shared M3 theme, so every story renders the exact',
          'palette a consuming app gets, dark mode included.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `
      <button matIconButton uiIconButton ${argsToTemplate(args)} aria-label="Add to favourites">
        <ui-icon name="favorite" />
      </button>
    `,
  }),
};

export default meta;
type Story = StoryObj<IconButton>;

/** The default icon button: the neutral `primary` colour, enabled. */
export const Default: Story = {};

// --- Colours ---------------------------------------------------------------

/** Material's default icon-button colour — the neutral `on-surface-variant` role. */
export const ColorPrimary: Story = { name: 'Color: primary', args: { color: 'primary' } };

/** The theme's tertiary palette, exposed under the familiar `accent` name. */
export const ColorAccent: Story = { name: 'Color: accent', args: { color: 'accent' } };

/** The theme's error palette — for a destructive action like delete. */
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
      <button matIconButton uiIconButton disabled aria-label="Add to favourites">
        <ui-icon name="favorite" />
      </button>
    `,
  }),
};

/**
 * `a[uiIconButton]` is a real anchor, so `routerLink` resolves an `href` and
 * navigates — the icon button doubles as a nav control with no wrapper hack.
 */
export const AnchorRouterLink: Story = {
  name: 'Native: a[uiIconButton] routerLink',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <a matIconButton uiIconButton routerLink="/settings" aria-label="Settings">
        <ui-icon name="settings" />
      </a>
    `,
  }),
};

/**
 * `exportAs: 'uiIconButton'` hands back the directive, and `.matIconButton` hands
 * back Material's own instance — the escape hatch for anything not wrapped here.
 */
export const TemplateRef: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <button matIconButton uiIconButton #fav="uiIconButton" aria-label="Favourite">
        <ui-icon name="favorite" />
      </button>
      <button matIconButton uiIconButton (click)="fav.matIconButton.focus()" aria-label="Focus favourite">
        <ui-icon name="ads_click" />
      </button>
    `,
  }),
};

// --- The full matrix -------------------------------------------------------

/**
 * Every colour, enabled and disabled. This is the reference row: if a colour is
 * not legible here, the theme is wrong. Each button carries its own `aria-label`.
 */
export const AllColors: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { colors: COLORS },
    template: `
      <div style="display: flex; gap: 1.5rem; align-items: center;">
        @for (color of colors; track color) {
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button matIconButton uiIconButton [color]="color" [attr.aria-label]="color">
              <ui-icon name="favorite" />
            </button>
            <button matIconButton uiIconButton [color]="color" disabled [attr.aria-label]="color + ' disabled'">
              <ui-icon name="favorite" />
            </button>
          </div>
        }
      </div>
    `,
  }),
};
