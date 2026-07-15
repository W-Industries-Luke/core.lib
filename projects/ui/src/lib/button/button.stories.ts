import { argsToTemplate, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Button, type UiButtonColor, type UiButtonVariant } from './button';

const VARIANTS: UiButtonVariant[] = ['filled', 'outlined', 'text', 'elevated', 'tonal'];
const COLORS: UiButtonColor[] = ['primary', 'accent', 'warn'];

const meta: Meta<Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    variant: 'filled',
    color: 'primary',
    disabled: false,
    type: 'button',
  },
  argTypes: {
    variant: { control: 'inline-radio', options: VARIANTS },
    color: { control: 'inline-radio', options: COLORS },
    type: { control: 'inline-radio', options: ['button', 'submit'] },
    clicked: { action: 'clicked' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Themed wrapper around Angular Material’s button. Colours resolve from the shared M3 ' +
          'theme in `src/styles/_theme.scss` via Material system tokens, so every story below ' +
          'renders the exact palette a consuming app gets — including in dark mode, which the ' +
          'theme follows from the OS preference.',
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<ui-button ${argsToTemplate(args)}>Save changes</ui-button>`,
  }),
};

export default meta;
type Story = StoryObj<Button>;

/** The default `ui-button`: filled, primary, enabled. */
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

/** Disabled buttons are styled from the theme's disabled tokens and never emit `clicked`. */
export const Disabled: Story = { args: { disabled: true } };

/** Every variant in its disabled state. */
export const DisabledVariants: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
        ${VARIANTS.map((v) => `<ui-button variant="${v}" disabled>${v}</ui-button>`).join('\n        ')}
      </div>
    `,
    moduleMetadata: { imports: [Button] },
  }),
};

/**
 * `type="submit"` submits the surrounding form; the default `type="button"` does not.
 * Click each to see which one triggers the form's submit handler.
 */
export const SubmitType: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { onSubmit: (event: Event) => event.preventDefault() },
    template: `
      <form (submit)="onSubmit($event)" style="display: flex; gap: 1rem; align-items: center;">
        <ui-button type="submit">Submit (submits)</ui-button>
        <ui-button type="button" variant="outlined">Button (does not)</ui-button>
      </form>
    `,
    moduleMetadata: { imports: [Button] },
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
                <ui-button variant="${v}" color="${c}">${v}</ui-button>
                <ui-button variant="${v}" color="${c}" disabled>disabled</ui-button>
              </div>
            </td>`,
            ).join('\n            ')}
          </tr>`,
          ).join('')}
        </tbody>
      </table>
    `,
    moduleMetadata: { imports: [Button] },
  }),
};
