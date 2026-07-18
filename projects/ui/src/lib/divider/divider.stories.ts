import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Divider, type UiDividerSpacing } from './divider';

const SPACINGS: UiDividerSpacing[] = ['none', 'sm', 'md', 'lg'];

/** A paragraph of content, so a divider has something to be a break between. */
const block = (text: string) => `
  <p style="margin: 0; font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface);">
    ${text}
  </p>`;

/** The column a horizontal divider lives in. Nothing here is the divider's own layout. */
const column = (content: string) =>
  `<div style="max-width: 32rem;">${content}</div>`;

const meta: Meta<Divider> = {
  title: 'Components/Divider',
  component: Divider,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [Divider] })],
  args: {
    vertical: false,
    inset: false,
    spacing: 'md',
  },
  argTypes: {
    vertical: { control: 'boolean' },
    inset: { control: 'boolean' },
    spacing: { control: 'inline-radio', options: SPACINGS },
    matDivider: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-divider` is the shared theme applied to Angular Material’s `<mat-divider>`. Like',
          '`ui-progress-bar` and unlike `uiButton`, it is a **component** rather than a directive:',
          'a divider is not a decoration on a native element — there is no native element to',
          'decorate — it *is* the element. The rule, its orientation, its inset and the',
          '`role="separator"` a screen reader reads it by are all Material’s.',
          '',
          'What it adds is `spacing`. Material ships a divider at `margin: 0`, so a rule with',
          'nothing around it reads as a border on the block above rather than as a break between',
          'two blocks — and every caller invents the gap themselves. The steps here resolve to the',
          'theme’s `--ui-sys-spacing-*` scale, so `md` is the same distance in every app.',
          '',
          'The line’s colour is the theme’s `outline-variant` role, which is M3’s role for exactly',
          'this, so every story below renders the palette a consuming app gets — including in dark',
          'mode, which the theme follows from the OS preference.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: column(`
      ${block('Deliveries are scheduled overnight and arrive before the depot opens.')}
      <ui-divider ${argsToTemplate(args)} />
      ${block('Returns are collected on the same run, if they are labelled by 18:00.')}
    `),
  }),
};

export default meta;
type Story = StoryObj<Divider>;

/** The default divider: horizontal, full-bleed, at the `md` step. */
export const Default: Story = {};

/** A horizontal rule is the break between two blocks in a column of content. */
export const Horizontal: Story = { args: { vertical: false } };

/**
 * A vertical divider separates items *along* a row, and takes its length from
 * that row — it stretches to the flex parent it is in, so it needs no height of
 * its own. Somewhere that gives it no height, set `--ui-divider-length`.
 */
export const Vertical: Story = {
  args: { vertical: true, spacing: 'sm' },
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; align-items: center; font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface);">
        <span>Draft</span>
        <ui-divider ${argsToTemplate(args)} />
        <span>Scheduled</span>
        <ui-divider ${argsToTemplate(args)} />
        <span>Delivered</span>
      </div>
    `,
  }),
};

/**
 * `inset` indents the rule past the leading content it aligns under — Material's
 * own inset, and its 80px: the indent of a list row's text, so the divider starts
 * where the text does rather than under the avatar beside it.
 *
 * `spacing="none"` goes with it here: the rows already own the space around
 * them, so the divider adds none of its own.
 */
export const Inset: Story = {
  args: { inset: true, spacing: 'none' },
  render: (args) => ({
    props: args,
    template: column(`
      <div style="display: flex; align-items: center; gap: 1rem; padding: 0.5rem 0;">
        <span style="width: 40px; height: 40px; border-radius: 50%; background: var(--mat-sys-primary-container);"></span>
        ${block('Ada Lovelace')}
      </div>
      <ui-divider ${argsToTemplate(args)} />
      <div style="display: flex; align-items: center; gap: 1rem; padding: 0.5rem 0;">
        <span style="width: 40px; height: 40px; border-radius: 50%; background: var(--mat-sys-primary-container);"></span>
        ${block('Grace Hopper')}
      </div>
    `),
  }),
};

// --- Spacing ---------------------------------------------------------------

/**
 * No space at all — for a divider whose neighbours already own the space around
 * them: between the rows of a list, or across the inside of a `ui-card`.
 */
export const SpacingNone: Story = { name: 'Spacing: none', args: { spacing: 'none' } };

/** The tight step (8px) — for dividing the rows of a dense list. */
export const SpacingSm: Story = { name: 'Spacing: sm', args: { spacing: 'sm' } };

/** The default (16px) — the step between blocks in a column of content. */
export const SpacingMd: Story = { name: 'Spacing: md', args: { spacing: 'md' } };

/** The loose step (24px) — for separating whole sections of a page. */
export const SpacingLg: Story = { name: 'Spacing: lg', args: { spacing: 'lg' } };

/**
 * Every step, in one column. This is the reference: the steps are the theme's
 * `--ui-sys-spacing-*` scale (M3's 4dp grid at 2×, 4× and 6×), not four numbers
 * chosen here — so a divider agrees with the rhythm of everything around it.
 */
export const AllSpacings: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: column(
      SPACINGS.map(
        (spacing) => `
      ${block(`spacing="${spacing}"`)}
      <ui-divider spacing="${spacing}" />`,
      ).join('') + block('end'),
    ),
  }),
};

// --- Styling hooks ---------------------------------------------------------

/**
 * The hooks (rule 6), each an ordinary declaration on an ordinary selector — no
 * `::ng-deep`. Point the colour at another `--mat-sys-*` role rather than a
 * literal, so it survives a palette change and dark mode.
 */
export const StylingHooks: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: column(`
      ${block('--ui-divider-color: var(--mat-sys-primary)')}
      <ui-divider style="--ui-divider-color: var(--mat-sys-primary);" />
      ${block('--ui-divider-width: 2px')}
      <ui-divider style="--ui-divider-width: 2px;" />
      ${block('--ui-divider-spacing: var(--ui-sys-spacing-lg)')}
      <ui-divider style="--ui-divider-spacing: var(--ui-sys-spacing-lg);" />
      ${block('end')}
    `),
  }),
};
