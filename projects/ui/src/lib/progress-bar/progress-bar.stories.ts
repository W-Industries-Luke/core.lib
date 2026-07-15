import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { ProgressBar, type UiProgressBarMode } from './progress-bar';

const MODES: UiProgressBarMode[] = ['indeterminate', 'determinate', 'buffer', 'query'];

/** The determinate values worth showing: empty, the quarters, and full. */
const VALUES = [0, 25, 50, 75, 100];

/**
 * A progress bar fills its container, so every story gets a width to fill.
 * Nothing here is part of the component's own layout.
 */
const frame = (content: string) => `<div style="width: 22rem; max-width: 100%;">${content}</div>`;

/** Captions a bar, so a story is readable without the source. */
const caption = (text: string, content: string) => `
  <div style="display: flex; flex-direction: column; gap: 0.5rem;">
    ${content}
    <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${text}</span>
  </div>`;

/** Stacks captioned bars, which is how a bar is compared with another bar. */
const stack = (content: string) =>
  `<div style="display: flex; flex-direction: column; gap: 1.5rem; width: 22rem; max-width: 100%;">${content}</div>`;

const meta: Meta<ProgressBar> = {
  title: 'Components/Progress bar',
  component: ProgressBar,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [ProgressBar] })],
  args: {
    mode: 'indeterminate',
    value: 0,
    bufferValue: 0,
    label: 'Loading',
  },
  argTypes: {
    mode: { control: 'inline-radio', options: MODES },
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    bufferValue: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    label: { control: 'text' },
    // Documented in the table but not a knob: its input is aliased to
    // `aria-label`, which `argsToTemplate` cannot bind — it writes the class
    // member name. The `a11y: aria-label` story covers it with a real template.
    ariaLabel: { name: 'aria-label', control: false },
    matProgressBar: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-progress-bar` is the shared theme applied to Angular Material’s',
          '`<mat-progress-bar>`. Like `ui-spinner` and unlike `uiButton`, it is a **component**',
          'rather than a directive: a progress bar is not a decoration on a native element — there',
          'is no native element to decorate — it renders its own track and indicator.',
          '',
          'Reach for a bar over a `ui-spinner` when the work has a measurable end and the wait is',
          'long enough to be worth quantifying — an upload, an import, a multi-step save. A bar',
          'also spans the thing it reports on, so it reads as belonging to that region rather than',
          'floating over it.',
          '',
          '### Modes',
          '',
          '- `indeterminate` *(default)* — the work has no measurable progress. The bar animates',
          '  continuously.',
          '- `determinate` — the bar is filled to `value` (0–100).',
          '- `buffer` — `value` fills the bar and `bufferValue` marks how much has been buffered',
          '  ahead of it, over a dotted remainder.',
          '- `query` — the bar runs backwards, for the "still working out how much work there is"',
          '  phase that precedes a `determinate` one.',
          '',
          'Note the default differs from `MatProgressBar`’s own `determinate`: a bar bound to no',
          'value should read as "working" rather than sit silently at 0%, and it matches',
          '`ui-spinner`. `value` is ignored in the two continuous modes, so it is safe to keep',
          'binding a real value across a mode switch.',
          '',
          '### Accessibility',
          '',
          'The host is a `role="status"` live region carrying the accessible name, so a bar',
          'appearing is announced politely, without stealing focus. Inside it, Material’s own',
          '`role="progressbar"` carries `aria-valuenow` in the modes that have a measurable value.',
          'Name it with `label` — say what is loading (`Loading orders`), not that it is a progress',
          'bar. `aria-label` works as an equivalent, and an unset or blank name falls back to a',
          'generic `Loading` rather than leaving an anonymous widget.',
          '',
          '### Theming and restyling',
          '',
          'The track, the indicator and every mode’s animation are `<mat-progress-bar>`’s own,',
          'resolved from the M3 system tokens in `src/styles/_theme.scss` — there is not a literal',
          'colour in this component’s stylesheet, and every story below renders the exact palette a',
          'consuming app gets, dark mode included. `--ui-progress-bar-color`,',
          '`--ui-progress-bar-track-color`, `--ui-progress-bar-height` and `--ui-progress-bar-shape`',
          'restyle it from an ordinary CSS rule, with no `::ng-deep`.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: frame(`<ui-progress-bar ${argsToTemplate(args)}></ui-progress-bar>`),
  }),
};

export default meta;
type Story = StoryObj<ProgressBar>;

/** The default: indeterminate, 4px, primary. */
export const Default: Story = {};

// --- Modes -----------------------------------------------------------------

/** The default mode, for work whose progress cannot be measured. */
export const Indeterminate: Story = {
  args: { mode: 'indeterminate', label: 'Loading orders' },
};

/** The bar is filled to `value`. Drag the `value` control to move it. */
export const Determinate: Story = {
  args: { mode: 'determinate', value: 65, label: 'Uploading' },
};

/**
 * `value` fills the bar and `bufferValue` marks how much has been buffered ahead
 * of it, over a dotted remainder — the media-player case: played vs. downloaded.
 */
export const Buffer: Story = {
  args: { mode: 'buffer', value: 35, bufferValue: 70, label: 'Buffering' },
};

/**
 * The bar runs backwards, for the phase before the work's size is known — a
 * query that has been sent but whose result set has not been counted yet.
 * Typically swapped for `determinate` the moment a total arrives.
 */
export const Query: Story = {
  args: { mode: 'query', label: 'Searching' },
};

/** Every mode side by side — the set a consumer is choosing between. */
export const Modes: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: stack(
      MODES.map((mode) =>
        caption(
          mode,
          `<ui-progress-bar
             mode="${mode}"
             value="35"
             bufferValue="70"
             label="${mode}"></ui-progress-bar>`,
        ),
      ).join(''),
    ),
  }),
};

// --- Determinate values ----------------------------------------------------

/**
 * Each quarter of the range, plus the two ends. `0` is an empty track and `100`
 * a full bar — both are states a real upload passes through, so both are here
 * rather than assumed.
 */
export const DeterminateValues: Story = {
  name: 'Determinate: 0–100',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: stack(
      VALUES.map((value) =>
        caption(
          `${value}%`,
          `<ui-progress-bar
             mode="determinate"
             value="${value}"
             label="Uploading, ${value} percent"></ui-progress-bar>`,
        ),
      ).join(''),
    ),
  }),
};

// Every value on its own, so each is an independently linkable, independently
// axe-asserted story rather than only a row in the stack above.
export const Value0: Story = {
  name: 'Determinate: 0%',
  args: { mode: 'determinate', value: 0, label: 'Uploading, 0 percent' },
};
export const Value25: Story = {
  name: 'Determinate: 25%',
  args: { mode: 'determinate', value: 25, label: 'Uploading, 25 percent' },
};
export const Value50: Story = {
  name: 'Determinate: 50%',
  args: { mode: 'determinate', value: 50, label: 'Uploading, 50 percent' },
};
export const Value75: Story = {
  name: 'Determinate: 75%',
  args: { mode: 'determinate', value: 75, label: 'Uploading, 75 percent' },
};
export const Value100: Story = {
  name: 'Determinate: 100%',
  args: { mode: 'determinate', value: 100, label: 'Uploading, 100 percent' },
};

/**
 * `value` is ignored in the continuous modes — Material omits `aria-valuenow`
 * there — so a consumer can keep binding a real value across a mode switch
 * rather than nulling it out.
 */
export const ValueIgnoredWhileIndeterminate: Story = {
  name: 'Determinate: value is ignored while indeterminate',
  args: { mode: 'indeterminate', value: 65, label: 'Loading' },
};

// --- Buffer values ---------------------------------------------------------

/**
 * The buffer ahead of the fill, at each quarter. `bufferValue` only means
 * anything in `buffer` mode; everywhere else Material fills the buffer bar
 * completely, so binding one in every mode is safe.
 */
export const BufferValues: Story = {
  name: 'Buffer: 0–100',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: stack(
      VALUES.map((bufferValue) =>
        caption(
          `value 20%, buffer ${bufferValue}%`,
          `<ui-progress-bar
             mode="buffer"
             value="20"
             bufferValue="${bufferValue}"
             label="Buffering, ${bufferValue} percent"></ui-progress-bar>`,
        ),
      ).join(''),
    ),
  }),
};

// --- Accessibility ---------------------------------------------------------

/**
 * The name is what a screen reader announces in the graphic's place, so it
 * should say what is loading rather than that it is a progress bar. The host is
 * a `role="status"` live region, so this is announced politely when the bar
 * appears.
 */
export const Labelled: Story = {
  name: 'a11y: label',
  args: { label: 'Loading orders' },
};

/**
 * `aria-label` is accepted as an equivalent of `label`: rule 3 of the
 * extensibility contract — the attribute a consumer reaches for first must reach
 * the real element and work, not be silently overwritten by the host binding.
 */
export const AriaLabel: Story = {
  name: 'a11y: aria-label',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`<ui-progress-bar aria-label="Fetching results"></ui-progress-bar>`),
  }),
};

/**
 * With no name at all the bar falls back to a generic `Loading` rather than
 * leaving an anonymous `status` region and an anonymous `progressbar` — which is
 * an axe violation, and this library's a11y floor is `error`.
 */
export const UnlabelledFallback: Story = {
  name: 'a11y: no label (fallback)',
  parameters: { controls: { disable: true } },
  render: () => ({ template: frame(`<ui-progress-bar></ui-progress-bar>`) }),
};

// --- Styling hooks and escape hatches --------------------------------------

/**
 * `--ui-progress-bar-color` is read off `<ui-progress-bar>`, so re-pointing the
 * indicator is an ordinary CSS rule on an ordinary selector — no `::ng-deep`, no
 * `!important`. Point it at another `--mat-sys-*` role rather than a literal, so
 * it survives a palette change and dark mode.
 */
export const CustomProperties: Story = {
  name: 'Styling hook: --ui-progress-bar-color',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: stack(
      ['primary', 'tertiary', 'error']
        .map((role) =>
          caption(
            `--mat-sys-${role}`,
            `<ui-progress-bar
               mode="determinate"
               value="65"
               label="Uploading"
               style="--ui-progress-bar-color: var(--mat-sys-${role});"></ui-progress-bar>`,
          ),
        )
        .join(''),
    ),
  }),
};

/**
 * The track is a hook of its own, for a bar whose default track is too quiet —
 * or not quiet enough — against the surface it sits on.
 */
export const CustomTrackColour: Story = {
  name: 'Styling hook: --ui-progress-bar-track-color',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: stack(
      ['surface-variant (default)', 'primary-container', 'secondary-container']
        .map((role) =>
          caption(
            `--mat-sys-${role}`,
            `<ui-progress-bar
               mode="determinate"
               value="65"
               label="Uploading"
               style="--ui-progress-bar-track-color: var(--mat-sys-${role.split(' ')[0]});"></ui-progress-bar>`,
          ),
        )
        .join(''),
    ),
  }),
};

/**
 * `--ui-progress-bar-height` drives the track and the indicator together, so a
 * heavier bar cannot end up with a fill thinner than its own track. Material's
 * default is 4px.
 */
export const CustomHeight: Story = {
  name: 'Styling hook: --ui-progress-bar-height',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: stack(
      ['4px (default)', '8px', '16px']
        .map((height) =>
          caption(
            height,
            `<ui-progress-bar
               mode="determinate"
               value="65"
               label="Uploading"
               style="--ui-progress-bar-height: ${height.split(' ')[0]};"></ui-progress-bar>`,
          ),
        )
        .join(''),
    ),
  }),
};

/**
 * M3 ships a square bar, which stays the default. `--ui-progress-bar-shape`
 * rounds it — a capsule reads better at the heavier heights — without reaching
 * into Material's internals.
 */
export const CustomShape: Story = {
  name: 'Styling hook: --ui-progress-bar-shape',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: stack(
      ['corner-none (default)', 'corner-small', 'corner-full']
        .map((shape) =>
          caption(
            `--mat-sys-${shape}`,
            `<ui-progress-bar
               mode="determinate"
               value="65"
               label="Uploading"
               style="--ui-progress-bar-height: 12px; --ui-progress-bar-shape: var(--mat-sys-${shape.split(' ')[0]});"></ui-progress-bar>`,
          ),
        )
        .join(''),
    ),
  }),
};

/**
 * A bar on a coloured surface: both hooks take the legible-on-that-surface
 * roles, so contrast comes from the theme rather than from a hand-picked hex.
 */
export const OnColouredSurface: Story = {
  name: 'Styling hook: on a coloured surface',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 22rem;
        max-width: 100%;
        padding: 1.5rem;
        border-radius: var(--mat-sys-corner-medium);
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
        font: var(--mat-sys-body-medium);">
        Importing orders…
        <ui-progress-bar
          mode="determinate"
          value="65"
          label="Importing orders"
          style="
            --ui-progress-bar-color: var(--mat-sys-on-primary-container);
            --ui-progress-bar-track-color: var(--mat-sys-primary);"></ui-progress-bar>
      </div>`,
  }),
};

/**
 * `exportAs: 'uiProgressBar'` hands back the component, and `matProgressBar()`
 * hands back Material's own instance — the escape hatch for anything not wrapped
 * here.
 */
export const TemplateRef: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; width: 22rem; max-width: 100%; font: var(--mat-sys-body-medium);">
        <ui-progress-bar #bar="uiProgressBar" mode="determinate" value="65" label="Uploading"></ui-progress-bar>
        <span>MatProgressBar.value is currently <strong>{{ bar.matProgressBar().value }}</strong>.</span>
      </div>`,
  }),
};

// --- The full matrix -------------------------------------------------------

/**
 * Every mode × value combination, with the buffer row's own value held at 70.
 * This is the reference grid: if a combination does not hold together here, the
 * theme is wrong.
 */
export const AllConfigurations: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: grid; grid-template-columns: auto repeat(${VALUES.length}, 1fr); gap: 1rem; align-items: center; font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant); min-width: 34rem;">
        <span></span>
        ${VALUES.map((value) => `<span>${value}%</span>`).join('')}
        ${MODES.map(
          (mode) => `
          <span>${mode}</span>
          ${VALUES.map(
            (value) =>
              `<ui-progress-bar
                 mode="${mode}"
                 value="${value}"
                 bufferValue="70"
                 label="${mode}, ${value} percent"></ui-progress-bar>`,
          ).join('')}`,
        ).join('')}
      </div>`,
  }),
};
