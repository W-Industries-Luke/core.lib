import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Spinner, type UiSpinnerMode } from './spinner';

const MODES: UiSpinnerMode[] = ['indeterminate', 'determinate'];

/**
 * `diameter` is a free number rather than a fixed set of named sizes, so this is
 * the *representative* scale the stories document: the sizes a consumer actually
 * reaches for — inside a button, beside a line of text, in a field, the default,
 * and the two page-level sizes. Any other number works just as well.
 */
const SIZES = [16, 20, 24, 32, 40, 64, 96];

/** The determinate values worth showing: empty, the quarters, and full. */
const VALUES = [0, 25, 50, 75, 100];

/** Captions the size and value grids, so a story is readable without the source. */
const caption = (text: string, content: string) => `
  <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
    ${content}
    <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${text}</span>
  </div>`;

const row = (content: string) =>
  `<div style="display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;">${content}</div>`;

const meta: Meta<Spinner> = {
  title: 'Components/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [Spinner] })],
  args: {
    mode: 'indeterminate',
    value: 0,
    diameter: 40,
    label: 'Loading',
  },
  argTypes: {
    mode: { control: 'inline-radio', options: MODES },
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    diameter: { control: { type: 'range', min: 12, max: 120, step: 4 } },
    strokeWidth: { control: { type: 'range', min: 1, max: 16, step: 1 } },
    label: { control: 'text' },
    // Documented in the table but not a knob: its input is aliased to
    // `aria-label`, which `argsToTemplate` cannot bind — it writes the class
    // member name. The `a11y: aria-label` story covers it with a real template.
    ariaLabel: { name: 'aria-label', control: false },
    matProgressSpinner: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-spinner` is the shared theme applied to Angular Material’s',
          '`<mat-progress-spinner>`. Like `ui-card` and unlike `uiButton`, it is a **component**',
          'rather than a directive: a spinner is not a decoration on a native element — there is',
          'no native element to decorate — it renders its own SVG.',
          '',
          '### Modes',
          '',
          '- `indeterminate` *(default)* — the work has no measurable progress. The arc spins.',
          '- `determinate` — the arc is drawn to `value` (0–100).',
          '',
          '`value` is ignored while indeterminate, so it is safe to keep binding a real value',
          'across a mode switch.',
          '',
          '### Accessibility',
          '',
          'The host is a `role="status"` live region carrying the accessible name, so a spinner',
          'appearing is announced politely, without stealing focus. Inside it, Material’s own',
          '`role="progressbar"` carries `aria-valuenow` in determinate mode. Name it with `label`',
          '— say what is loading (`Loading orders`), not that it is a spinner. `aria-label` works',
          'as an equivalent, and an unset or blank name falls back to a generic `Loading` rather',
          'than leaving an anonymous widget.',
          '',
          '### Theming and restyling',
          '',
          'The arc and its animation are `<mat-progress-spinner>`’s own, resolved from the M3',
          'system tokens in `src/styles/_theme.scss` — there is not a literal colour in this',
          'component’s stylesheet, and every story below renders the exact palette a consuming app',
          'gets, dark mode included. `--ui-spinner-color` re-points the arc from an ordinary CSS',
          'rule, with no `::ng-deep`.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<ui-spinner ${argsToTemplate(args)}></ui-spinner>`,
  }),
};

export default meta;
type Story = StoryObj<Spinner>;

/** The default: indeterminate, 40px, primary. */
export const Default: Story = {};

// --- Modes -----------------------------------------------------------------

/** The default mode, for work whose progress cannot be measured. */
export const Indeterminate: Story = {
  args: { mode: 'indeterminate', label: 'Loading orders' },
};

/** The arc is drawn to `value`. Drag the `value` control to move it. */
export const Determinate: Story = {
  args: { mode: 'determinate', value: 65, label: 'Uploading' },
};

/** Both modes side by side — the pair a consumer is choosing between. */
export const Modes: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      MODES.map((mode) =>
        caption(mode, `<ui-spinner mode="${mode}" value="65" label="${mode}"></ui-spinner>`),
      ).join(''),
    ),
  }),
};

// --- Determinate values ----------------------------------------------------

/**
 * Each quarter of the range, plus the two ends. `0` is an empty track and `100`
 * a closed ring — both are states a real upload passes through, so both are here
 * rather than assumed.
 */
export const DeterminateValues: Story = {
  name: 'Determinate: 0–100',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      VALUES.map((value) =>
        caption(
          `${value}%`,
          `<ui-spinner mode="determinate" value="${value}" label="Uploading, ${value} percent"></ui-spinner>`,
        ),
      ).join(''),
    ),
  }),
};

// Every value on its own, so each is an independently linkable, independently
// axe-asserted story rather than only a cell in the grid above.
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
 * `value` is ignored while indeterminate — Material reports `0` and omits
 * `aria-valuenow` — so a consumer can keep binding a real value across a mode
 * switch rather than nulling it out.
 */
export const ValueIgnoredWhileIndeterminate: Story = {
  name: 'Determinate: value is ignored while indeterminate',
  args: { mode: 'indeterminate', value: 65, label: 'Loading' },
};

// --- Sizes -----------------------------------------------------------------

/**
 * The representative scale. `diameter` is a free number, so these are the sizes
 * worth documenting rather than the only ones that work. The stroke keeps
 * Material's tenth-of-the-diameter ratio at every size, so the proportions hold.
 */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      SIZES.map((diameter) =>
        caption(
          `${diameter}px`,
          `<ui-spinner diameter="${diameter}" label="Loading, ${diameter} pixels"></ui-spinner>`,
        ),
      ).join(''),
    ),
  }),
};

// Each size as its own story, per the size scale above.
export const Size16: Story = { name: 'Size: 16px', args: { diameter: 16, label: 'Loading' } };
export const Size20: Story = { name: 'Size: 20px', args: { diameter: 20, label: 'Loading' } };
export const Size24: Story = { name: 'Size: 24px', args: { diameter: 24, label: 'Loading' } };
export const Size32: Story = { name: 'Size: 32px', args: { diameter: 32, label: 'Loading' } };
export const Size40: Story = {
  name: 'Size: 40px (default)',
  args: { diameter: 40, label: 'Loading' },
};
export const Size64: Story = { name: 'Size: 64px', args: { diameter: 64, label: 'Loading' } };
export const Size96: Story = { name: 'Size: 96px', args: { diameter: 96, label: 'Loading' } };

// --- strokeWidth -----------------------------------------------------------

/** The default: a tenth of the diameter, which is Material's own ratio. */
export const DefaultStrokeWidth: Story = {
  name: 'strokeWidth: default',
  args: { diameter: 64, label: 'Loading' },
};

/**
 * A heavier arc. Without this input, thickening the stroke would mean reaching
 * into Material's SVG with `::ng-deep`.
 */
export const CustomStrokeWidth: Story = {
  name: 'strokeWidth: 10',
  args: { diameter: 64, strokeWidth: 10, label: 'Loading' },
};

/** The stroke widths side by side, so the input's effect is visible. */
export const StrokeWidths: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      [undefined, 2, 6, 10]
        .map((strokeWidth) =>
          caption(
            strokeWidth === undefined ? 'default (d/10)' : `${strokeWidth}px`,
            `<ui-spinner
               diameter="64"
               ${strokeWidth === undefined ? '' : `strokeWidth="${strokeWidth}"`}
               label="Loading"></ui-spinner>`,
          ),
        )
        .join(''),
    ),
  }),
};

// --- Accessibility ---------------------------------------------------------

/**
 * The name is what a screen reader announces in the graphic's place, so it
 * should say what is loading rather than that it is a spinner. The host is a
 * `role="status"` live region, so this is announced politely when the spinner
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
  render: () => ({ template: `<ui-spinner aria-label="Fetching results"></ui-spinner>` }),
};

/**
 * With no name at all the spinner falls back to a generic `Loading` rather than
 * leaving an anonymous `status` region and an anonymous `progressbar` — which is
 * an axe violation, and this library's a11y floor is `error`.
 */
export const UnlabelledFallback: Story = {
  name: 'a11y: no label (fallback)',
  parameters: { controls: { disable: true } },
  render: () => ({ template: `<ui-spinner></ui-spinner>` }),
};

// --- Styling hooks and escape hatches --------------------------------------

/**
 * `--ui-spinner-color` is read off `<ui-spinner>`, so re-pointing the arc is an
 * ordinary CSS rule on an ordinary selector — no `::ng-deep`, no `!important`.
 * Point it at another `--mat-sys-*` role rather than a literal, so it survives a
 * palette change and dark mode.
 */
export const CustomProperties: Story = {
  name: 'Styling hook: --ui-spinner-color',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      ['primary', 'tertiary', 'error']
        .map((role) =>
          caption(
            `--mat-sys-${role}`,
            `<ui-spinner
               diameter="48"
               label="Loading"
               style="--ui-spinner-color: var(--mat-sys-${role});"></ui-spinner>`,
          ),
        )
        .join(''),
    ),
  }),
};

/**
 * A spinner on a coloured surface: the hook takes the legible-on-that-surface
 * role, so contrast comes from the theme rather than from a hand-picked hex.
 */
export const OnColouredSurface: Story = {
  name: 'Styling hook: on a coloured surface',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem;
        border-radius: var(--mat-sys-corner-medium);
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
        font: var(--mat-sys-body-medium);">
        <ui-spinner
          diameter="24"
          label="Loading orders"
          style="--ui-spinner-color: var(--mat-sys-on-primary-container);"></ui-spinner>
        Loading orders…
      </div>`,
  }),
};

/**
 * `exportAs: 'uiSpinner'` hands back the component, and `matProgressSpinner()`
 * hands back Material's own instance — the escape hatch for anything not wrapped
 * here.
 */
export const TemplateRef: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 1rem; font: var(--mat-sys-body-medium);">
        <ui-spinner #spinner="uiSpinner" mode="determinate" value="65" label="Uploading"></ui-spinner>
        <span>MatProgressSpinner.value is currently <strong>{{ spinner.matProgressSpinner().value }}</strong>.</span>
      </div>`,
  }),
};

// --- The full matrix -------------------------------------------------------

/**
 * Every mode × size combination, with the determinate column at a mid value.
 * This is the reference grid: if a combination does not hold together here, the
 * theme is wrong.
 */
export const AllConfigurations: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: grid; grid-template-columns: auto repeat(${SIZES.length}, auto); gap: 1rem; align-items: center; justify-items: center; font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">
        <span></span>
        ${SIZES.map((size) => `<span>${size}px</span>`).join('')}
        ${MODES.map(
          (mode) => `
          <span>${mode}</span>
          ${SIZES.map(
            (size) =>
              `<ui-spinner
                 mode="${mode}"
                 value="65"
                 diameter="${size}"
                 label="${mode}, ${size} pixels"></ui-spinner>`,
          ).join('')}`,
        ).join('')}
      </div>`,
  }),
};
