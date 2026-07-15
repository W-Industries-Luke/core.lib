import { MatButton } from '@angular/material/button';
import { provideRouter, RouterLink } from '@angular/router';
import {
  applicationConfig,
  argsToTemplate,
  moduleMetadata,
  type Meta,
  type StoryObj,
} from '@storybook/angular-vite';

import { Button, type UiButtonColor, type UiButtonVariant } from './button';

const VARIANTS: UiButtonVariant[] = ['filled', 'outlined', 'text', 'elevated', 'tonal'];
const COLORS: UiButtonColor[] = ['primary', 'accent', 'warn'];

const meta: Meta<Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({ imports: [Button, MatButton, RouterLink] }),
    // `routerLink` needs a Router to resolve an href against. Providing one for
    // every story is also the point: a consuming app has one, so the stories
    // render what the app renders.
    applicationConfig({ providers: [provideRouter([])] }),
  ],
  args: {
    variant: 'filled',
    color: 'primary',
  },
  argTypes: {
    variant: { control: 'inline-radio', options: VARIANTS },
    color: { control: 'inline-radio', options: COLORS },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`uiButton` applies the shared M3 theme to a Material button. It is a **directive on the',
          'native element**, not a wrapper: the `<button>` a consumer writes is the `<button>` the',
          'browser gets, so `aria-label`, `id`, `form`/`name`/`value`, `type`, `disabled`,',
          '`data-*`, `tabindex`, `(click)` and `routerLink` all just work — see the stories below,',
          'none of which use a workaround.',
          '',
          'It goes on an element that also has `matButton`, because `MatButton` is a *component*',
          'with an attribute selector: Angular will not let a directive pull a component onto its',
          'own host, and its attribute must be in the template for Angular to match it. `variant`',
          'is the source of truth for the appearance — write `matButton` bare.',
          '',
          'Colours resolve from the shared M3 theme in `src/styles/_theme.scss` via Material system',
          'tokens, so every story below renders the exact palette a consuming app gets — including',
          'in dark mode, which the theme follows from the OS preference.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<button matButton uiButton ${argsToTemplate(args)}>Save changes</button>`,
  }),
};

export default meta;
type Story = StoryObj<Button>;

/** The default button: filled, primary, enabled. */
export const Default: Story = {};

// --- Variants (at the default primary colour) ------------------------------

/** High-emphasis button for the primary action on a surface. */
export const Filled: Story = { args: { variant: 'filled' } };

/** Medium emphasis: the outline uses the theme's neutral `outline` role, per M3. */
export const Outlined: Story = { args: { variant: 'outlined' } };

/** Lowest emphasis — for tertiary actions and dialog dismissals. */
export const Text: Story = { args: { variant: 'text' } };

/** Filled-tonal: a middle ground between `filled` and `outlined`. */
export const Tonal: Story = { args: { variant: 'tonal' } };

/** Like `filled`, but on a raised `surface` container for use over busy backgrounds. */
export const Elevated: Story = { args: { variant: 'elevated' } };

// --- Colours (at the default filled variant) -------------------------------

/** The theme's primary palette. */
export const ColorPrimary: Story = { name: 'Color: primary', args: { color: 'primary' } };

/** The theme's tertiary palette, exposed under the familiar `accent` name. */
export const ColorAccent: Story = { name: 'Color: accent', args: { color: 'accent' } };

/** The theme's error palette — for destructive actions. */
export const ColorWarn: Story = { name: 'Color: warn', args: { color: 'warn' } };

// --- States ----------------------------------------------------------------

/**
 * `disabled` is the *native* attribute — there is no `disabled` input to forward,
 * which is the point. Material styles it from the theme's disabled tokens.
 */
export const Disabled: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
        ${VARIANTS.map((v) => `<button matButton uiButton variant="${v}" disabled>${v}</button>`).join('\n        ')}
      </div>
    `,
  }),
};

// --- The hacks the wrapper used to force -----------------------------------

/**
 * An icon-only button needs `aria-label` on the element the screen reader sees.
 * The old `<ui-button aria-label="…">` put it on the wrapper, where it did
 * nothing; here it is on the `<button>` itself, so it is simply correct.
 */
export const AriaLabel: Story = {
  name: 'Native: aria-label',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <button matButton uiButton variant="text" color="warn" aria-label="Close dialog">✕</button>
    `,
  }),
};

/**
 * Native `type` and `form`. The submit button lives *outside* the form and is
 * associated with it by `form="editor"` — a native feature a wrapper cannot
 * forward at all. `type="button"` (the native default here is `submit`, so say
 * it) does not submit.
 */
export const FormSubmit: Story = {
  name: 'Native: form / type=submit',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { onSubmit: (event: Event) => event.preventDefault() },
    template: `
      <form id="editor" (submit)="onSubmit($event)" style="margin-bottom: 1rem;">
        <label style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface);">
          Name <input name="name" value="Ada" />
        </label>
      </form>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <button matButton uiButton form="editor" type="submit" name="intent" value="save">
          Submit (submits the form above)
        </button>
        <button matButton uiButton variant="outlined" type="button">Button (does not)</button>
      </div>
    `,
  }),
};

/**
 * `a[uiButton]` is a real anchor, so `routerLink` resolves an `href` and
 * navigates. This is what the wrapper made impossible — and why the selector
 * covers `a[uiButton]` as well as `button[uiButton]`.
 */
export const AnchorRouterLink: Story = {
  name: 'Native: a[uiButton] routerLink',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; gap: 1rem; align-items: center;">
        <a matButton uiButton routerLink="/settings">Settings (routerLink)</a>
        <a matButton uiButton variant="outlined" href="https://angular.dev" target="_blank" rel="noreferrer">
          Plain href
        </a>
      </div>
    `,
  }),
};

/**
 * `exportAs: 'uiButton'` hands back the directive, and `.matButton` hands back
 * Material's own instance — the escape hatch for anything not wrapped here.
 */
export const TemplateRef: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <button matButton uiButton #save="uiButton" variant="tonal">Save</button>
      <button matButton uiButton variant="text" (click)="save.matButton.focus()">
        Focus the Save button
      </button>
    `,
  }),
};

// --- The full matrix -------------------------------------------------------

/**
 * Every variant × colour combination, enabled and disabled. This is the
 * reference grid: if a combination is not legible here, the theme is wrong.
 */
export const AllVariantsAndColors: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <table style="border-collapse: collapse; font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface);">
        <thead>
          <tr>
            <!-- The corner cell labels nothing — it is the blank intersection of the
                 variant and colour axes, so it is a spacer td, not an empty th. -->
            <td style="padding: 0.75rem;"></td>
            ${COLORS.map(
              (c) =>
                `<th style="text-align: left; padding: 0.75rem; font: var(--mat-sys-title-small);">${c}</th>`,
            ).join('\n            ')}
          </tr>
        </thead>
        <tbody>
          ${VARIANTS.map(
            (v) => `
          <tr>
            <th style="text-align: left; padding: 0.75rem; font: var(--mat-sys-title-small);">${v}</th>
            ${COLORS.map(
              (c) => `<td style="padding: 0.75rem;">
              <div style="display: flex; gap: 0.5rem; align-items: center;">
                <button matButton uiButton variant="${v}" color="${c}">${v}</button>
                <button matButton uiButton variant="${v}" color="${c}" disabled>disabled</button>
              </div>
            </td>`,
            ).join('\n            ')}
          </tr>`,
          ).join('')}
        </tbody>
      </table>
    `,
  }),
};
