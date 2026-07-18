import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, userEvent, waitFor } from 'storybook/test';

import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import {
  ButtonToggle,
  ButtonToggleOptionDef,
  type UiButtonToggleAppearance,
  type UiButtonToggleOption,
} from './button-toggle';

const APPEARANCES: UiButtonToggleAppearance[] = ['standard', 'legacy'];

const VIEWS: UiButtonToggleOption<string>[] = [
  { value: 'list', label: 'List', icon: 'view_list' },
  { value: 'grid', label: 'Grid', icon: 'grid_view' },
  { value: 'map', label: 'Map', icon: 'map' },
];

const ALIGNMENTS: UiButtonToggleOption<string>[] = [
  { value: 'left', label: 'Align left', icon: 'format_align_left' },
  { value: 'center', label: 'Align centre', icon: 'format_align_center' },
  { value: 'right', label: 'Align right', icon: 'format_align_right' },
  { value: 'justify', label: 'Justify', icon: 'format_align_justify' },
];

const STYLES: UiButtonToggleOption<string>[] = [
  { value: 'bold', label: 'Bold', icon: 'format_bold' },
  { value: 'italic', label: 'Italic', icon: 'format_italic' },
  { value: 'underline', label: 'Underline', icon: 'format_underlined' },
];

const RANGE: UiButtonToggleOption<string>[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year — needs a paid plan', disabled: true },
];

/** Captions a grid cell, so a story is readable without opening the source. */
const caption = (text: string, content: string) => `
  <div style="display: flex; flex-direction: column; gap: 0.5rem;">
    ${content}
    <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${text}</span>
  </div>`;

const grid = (content: string, columns = 2) => `
  <div style="display: grid; grid-template-columns: repeat(${columns}, max-content); gap: 1.5rem;">
    ${content}
  </div>`;

const column = (content: string) =>
  `<div style="display: flex; flex-direction: column; align-items: start; gap: 1rem;">${content}</div>`;

/** The readout `<p>` a Forms story renders under its group, found by its text. */
const readout = (canvas: HTMLElement, contains: string): HTMLElement =>
  [...canvas.querySelectorAll('p')].find((p) => p.textContent!.includes(contains))!;

/** Chooses a toggle by clicking the option button whose text contains `text`. */
const chooseToggle = (canvas: HTMLElement, text: string): Promise<void> =>
  userEvent.click(
    [...canvas.querySelectorAll('mat-button-toggle button')].find((b) =>
      b.textContent!.includes(text),
    ) as HTMLElement,
  );

/** Clicks the action `<button>` (outside the group) whose text matches, e.g. `Clear`. */
const clickAction = (canvas: HTMLElement, text: string): Promise<void> =>
  userEvent.click(
    [...canvas.querySelectorAll('button')].find((b) => b.textContent!.trim() === text)!,
  );

const meta: Meta<ButtonToggle<string>> = {
  title: 'Components/ButtonToggle',
  component: ButtonToggle,
  tags: ['autodocs'],
  decorators: [
    // The forms directives the form stories are built from, the option template
    // directive and this library's icon — plus Material's button and `uiButton`, which
    // needs `MatButton` alongside it since it decorates Material's button rather than
    // replacing it.
    moduleMetadata({
      imports: [
        ButtonToggle,
        ButtonToggleOptionDef,
        Icon,
        FormsModule,
        ReactiveFormsModule,
        MatButton,
        Button,
      ],
    }),
  ],
  args: {
    label: 'View',
    options: VIEWS,
    value: null,
    multiple: false,
    appearance: 'standard',
    disabled: false,
    vertical: false,
    iconOnly: false,
    hideSelectionIndicator: false,
    disableRipple: false,
    disabledInteractive: false,
  },
  argTypes: {
    label: { control: 'text' },
    options: { control: 'object' },
    // An object control rather than a text one: the value is an array in `multiple`
    // mode, and a knob that could not spell one would be lying about the type.
    value: { control: 'object' },
    multiple: { control: 'boolean' },
    appearance: { control: 'inline-radio', options: APPEARANCES },
    disabled: { control: 'boolean' },
    vertical: { control: 'boolean' },
    iconOnly: { control: 'boolean' },
    hideSelectionIndicator: { control: 'boolean' },
    disableRipple: { control: 'boolean' },
    disabledInteractive: { control: 'boolean' },
    name: { control: 'text' },
    changed: { action: 'changed' },
    valueChange: { action: 'valueChange' },
    // Documented in the table but not knobs: their inputs are aliased to the ARIA
    // attributes, which `argsToTemplate` cannot bind — it writes the class member name.
    // The `Native attributes` story covers them for real.
    ariaLabel: { name: 'aria-label', control: false },
    ariaLabelledby: { name: 'aria-labelledby', control: false },
    matButtonToggleGroup: { table: { disable: true } },
    matButtonToggles: { table: { disable: true } },
    groupElement: { table: { disable: true } },
    selectedValues: { table: { disable: true } },
    selectedOptions: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-button-toggle` is the shared theme applied to Angular Material’s',
          '`<mat-button-toggle-group>` and `<mat-button-toggle>`, wired as a form control. Like',
          '`ui-radio-group` and `ui-list`, and unlike `uiButton`, it is a **component** rather than a',
          'directive: a toggle group owns *composition* — a label naming the set, and the toggles',
          'themselves, which only mean anything as a group.',
          '',
          '### Which control this is',
          '',
          'A button toggle is a radio group — or a set of checkboxes, when `multiple` — that looks like a',
          'bar of buttons: it is for a choice that is *shown* rather than one that is filled in, and whose',
          'options are few and short. A view switcher, a text alignment, a date range. For a choice in a',
          'form, reach for `ui-radio-group`; for one over more than a handful of options, `ui-select`.',
          '',
          '### It is Material, not a re-implementation',
          '',
          'The buttons and their shared outline, the ripples, the state layers, the focus rings, the',
          'selection checkmark, the exclusivity, the roving arrow-key focus, the roles each mode takes and',
          'every colour are Material’s own, resolved from the `--mat-sys-*` tokens the shared theme emits.',
          'There is not a literal colour in `button-toggle.scss` — so every story below renders the exact',
          'palette a consuming app gets. Toggle your OS light/dark preference to watch them follow.',
          '',
          '`color` is not an input, because Material’s own `color` is an M2-only API that does nothing',
          'under an M3 theme. The `--ui-button-toggle-*` hooks are the M3 answer — see **Theming**.',
          '',
          '### Accessibility',
          '',
          'Material’s group carries the role — `radiogroup` of `radio`s, or (when `multiple`) `group` of',
          'pressable `button`s — and `label` names it: the label is rendered with an id of its own and the',
          'group’s `aria-labelledby` points at it. See **Accessibility: naming the group**. Each option’s',
          '`label` becomes its toggle’s accessible name whenever the text is not on screen, which is what',
          'keeps **Icons only** a visual decision rather than a row of unnamed glyphs.',
          '',
          '### Forms',
          '',
          '`ui-button-toggle` is a `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]` and',
          '`formControlName` work with no adapter — bind the host, not the group inside it. `[(value)]` is',
          'the same state without a forms directive. See the **Forms** stories.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<ui-button-toggle ${argsToTemplate(args)} />`,
  }),
};

export default meta;
type Story = StoryObj<ButtonToggle<string>>;

/** The default group: one choice, nothing chosen, named by its label. */
export const Default: Story = {};

// --- Selection -------------------------------------------------------------

/**
 * The default. One toggle at a time, exactly like a radio group — which is what it is
 * to assistive tech: Material gives the group `role="radiogroup"` and each toggle
 * `role="radio"`, so the arrow keys move between them and the value is one option’s.
 *
 * The chosen toggle takes M3’s `secondary-container` fill and a checkmark. Clicking it
 * again does nothing: a single-select group answers a question, and "unanswered" is not
 * one of the answers — offer an explicit option if it should be.
 */
export const SingleSelect: Story = {
  name: 'Single select',
  args: { value: 'grid' },
};

/**
 * `multiple` makes the value an **array** and every toggle a checkbox: Material drops
 * to `role="group"` and gives each button `aria-pressed`, so any number of them can be
 * on at once and clicking a chosen one turns it off.
 *
 * The value is always an array here — `[]` rather than `null` when nothing is chosen —
 * so a consumer never mode-checks before counting.
 *
 * Material sizes the group’s selection model as it initialises, so `multiple` is what
 * the control *is* rather than a state it moves between: set it in the template, and
 * reach for `@if` if a screen genuinely needs both.
 */
export const MultiSelect: Story = {
  name: 'Multi select',
  args: { label: 'Style', options: STYLES, multiple: true, value: ['bold', 'underline'] },
};

/** The two modes together — the choice a consumer is making. */
export const Selection: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { styles: STYLES },
    template: grid(
      [
        caption(
          'single — radiogroup of radios',
          `<ui-button-toggle label="Style" [options]="styles" value="bold" />`,
        ),
        caption(
          'multiple — group of pressed buttons',
          `<ui-button-toggle label="Style" multiple [options]="styles" [value]="['bold', 'italic']" />`,
        ),
      ].join('\n'),
    ),
  }),
};

// --- Icons -----------------------------------------------------------------

/**
 * An option’s `icon` is a Material Symbols name, rendered as this library’s own
 * `<ui-icon>` — so it is the fleet’s icon set and takes the toggle’s colour, including
 * on the chosen one.
 */
export const WithIcons: Story = {
  name: 'Icons and labels',
  args: { value: 'list' },
};

/**
 * `iconOnly` drops the text, for the toolbar case where the glyphs are the vocabulary
 * and the words would be noise.
 *
 * The `label` does not go away — it *becomes* each toggle’s accessible name. Material
 * marks the icon `aria-hidden`, so without that the group would be a row of unnamed
 * buttons, which is exactly the icon-only control axe (and a screen reader user) is
 * right to reject. Inspect the DOM here: every button carries its `aria-label`.
 *
 * `hideSelectionIndicator` is the usual companion — the checkmark crowds a glyph.
 * An option with no icon keeps its text either way, so a group is never a blank button.
 */
export const IconsOnly: Story = {
  name: 'Icons only',
  args: {
    label: 'Alignment',
    options: ALIGNMENTS,
    iconOnly: true,
    hideSelectionIndicator: true,
    value: 'left',
  },
};

/** With and without the checkmark, and with and without the words. */
export const IconTreatments: Story = {
  name: 'Icons: the treatments',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: ALIGNMENTS.slice(0, 3) },
    template: grid(
      [
        caption(
          'icon and label',
          `<ui-button-toggle label="Alignment" [options]="options" value="left" />`,
        ),
        caption(
          'iconOnly',
          `<ui-button-toggle label="Alignment" iconOnly [options]="options" value="left" />`,
        ),
        caption(
          'iconOnly hideSelectionIndicator',
          `<ui-button-toggle label="Alignment" iconOnly hideSelectionIndicator
                             [options]="options" value="left" />`,
        ),
        caption(
          'label only',
          `<ui-button-toggle label="Range" [options]="[{value: 'day', label: 'Day'}, {value: 'week', label: 'Week'}]"
                             value="day" />`,
        ),
      ].join('\n'),
    ),
  }),
};

// --- State -----------------------------------------------------------------

/**
 * One option out, the rest live — for a choice that exists but is not available right
 * now. Mark it on the option; `disabled` on the *group* takes all of them out.
 *
 * A disabled toggle keeps its shape and its place in the bar: it is a choice the user
 * cannot make, not one they cannot see.
 */
export const DisabledOption: Story = {
  name: 'Disabled option',
  args: { label: 'Range', options: RANGE, value: 'week' },
};

/** The whole group out: not chooseable, not focusable. */
export const Disabled: Story = { args: { disabled: true, value: 'grid' } };

/**
 * Every state side by side. Not one of them carries a colour of its own: the fills, the
 * outline and the greyed labels all resolve from the theme’s M3 tokens.
 */
export const States: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { views: VIEWS, range: RANGE },
    template: grid(
      [
        caption('nothing chosen', `<ui-button-toggle label="View" [options]="views" />`),
        caption('chosen', `<ui-button-toggle label="View" [options]="views" value="grid" />`),
        caption(
          'one option disabled',
          `<ui-button-toggle label="Range" [options]="range" value="week" />`,
        ),
        caption(
          'group disabled',
          `<ui-button-toggle label="View" [options]="views" value="grid" disabled />`,
        ),
      ].join('\n'),
    ),
  }),
};

/**
 * `disabledInteractive` keeps disabled toggles focusable and announced, marked with
 * `aria-disabled` rather than the native `disabled`. Material’s own answer to the
 * disabled control that still has to explain itself: a natively disabled button is
 * skipped by the tab order, so a screen reader user never reaches the tooltip saying
 * why it is off.
 *
 * Tab through both groups below — only the second one takes focus.
 */
export const DisabledInteractive: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: VIEWS },
    template: grid(
      [
        caption('disabled', `<ui-button-toggle label="View" [options]="options" disabled />`),
        caption(
          'disabled disabledInteractive',
          `<ui-button-toggle label="View" [options]="options" disabled disabledInteractive />`,
        ),
      ].join('\n'),
    ),
  }),
};

// --- Appearance ------------------------------------------------------------

/**
 * The default, and M3’s own: an outlined bar sharing one border, with dividers between
 * the toggles.
 */
export const Standard: Story = { args: { appearance: 'standard', value: 'grid' } };

/**
 * The M2-era elevated bar — a card of buttons rather than an outlined one, for a
 * surface already dense with outlines.
 *
 * Material tokenises the two appearances separately and leaves every `legacy-*` token
 * **unset** under an M3 theme, so a `legacy` group out of the box has no text colour and
 * an invisible selected state. `button-toggle.scss` fills them in from the same
 * `--mat-sys-*` roles the standard appearance uses — so `legacy` here is the M2 *shape*
 * wearing the M3 theme’s colours, and the theming hooks below move both.
 */
export const Legacy: Story = { args: { appearance: 'legacy', value: 'grid' } };

/** Both appearances, with the selected state that only one of them ships themed. */
export const Appearances: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: VIEWS },
    template: grid(
      APPEARANCES.map((appearance) =>
        caption(
          `appearance="${appearance}"`,
          `<ui-button-toggle label="View" appearance="${appearance}" [options]="options" value="grid" />`,
        ),
      ).join('\n'),
    ),
  }),
};

/**
 * `vertical` stacks the toggles, keeping the shared outline and turning the dividers.
 * Material’s own switch, forwarded — for a narrow rail, or labels a row cannot fit.
 */
export const Vertical: Story = { args: { vertical: true, value: 'grid' } };

// --- Forms -----------------------------------------------------------------

/**
 * `[(ngModel)]` binds the host — `ui-button-toggle` is a `ControlValueAccessor`, so
 * there is no adapter and nothing to reach inside for (rule 5). Choose a view and watch
 * the model.
 */
export const NgModel: Story = {
  name: 'Forms: [(ngModel)]',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: VIEWS, view: 'list' },
    template: column(`
      <ui-button-toggle label="View" [options]="options" [(ngModel)]="view" />
      <p style="font: var(--mat-sys-body-small); margin: 0;">view: <strong>{{ view }}</strong></p>`),
  }),
  // Proves the round-trip the description claims: choosing a toggle reaches
  // `[(ngModel)]`, and the value is the option's own `value`, not its label.
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    expect(readout(canvasElement, 'view:').textContent).toContain('list');

    await chooseToggle(canvasElement, 'Grid');

    await waitFor(() => expect(readout(canvasElement, 'view:').textContent).toContain('grid'));
  },
};

/**
 * The same state without a forms directive: `[(value)]` is a `model()` (rule 5), for a
 * view switcher where `[(ngModel)]` would be a directive dragged in for one binding.
 *
 * `exportAs: 'uiButtonToggle'` hands the component back, so the button below is just
 * `group.value.set(null)` — no host code at all — and `selectedOptions()` is the chosen
 * option itself rather than an id to look up.
 */
export const TwoWayValue: Story = {
  name: 'Forms: [(value)] and exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: VIEWS, view: 'grid' },
    template: column(`
      <ui-button-toggle #group="uiButtonToggle" label="View" [options]="options" [(value)]="view" />

      <button matButton uiButton variant="outlined" (click)="group.value.set(null)">Clear</button>

      <p style="font: var(--mat-sys-body-small); margin: 0;">
        value: <strong>{{ group.value() ?? 'none' }}</strong> ·
        label: <strong>{{ group.selectedOptions()[0]?.label ?? 'none' }}</strong>
      </p>`),
  }),
};

/**
 * A reactive control over a `multiple` group: the value is an array, and the form gets
 * it as one — empty rather than `null` when nothing is chosen.
 */
export const ReactiveMultiple: Story = {
  name: 'Forms: [formControl] and multiple',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: STYLES, control: new FormControl<string[]>(['bold']) },
    template: column(`
      <ui-button-toggle label="Style" multiple [options]="options" [formControl]="control" />

      <p style="font: var(--mat-sys-body-small); margin: 0;">
        value: <strong>{{ control.value?.join(', ') || 'none' }}</strong> ·
        touched: <strong>{{ control.touched }}</strong>
      </p>`),
  }),
  // Proves the `multiple` behavior the description claims: the value is an array,
  // and choosing a second toggle adds to it rather than replacing.
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    expect(readout(canvasElement, 'value:').textContent).toContain('bold');

    await chooseToggle(canvasElement, 'Italic');

    await waitFor(() => {
      const text = readout(canvasElement, 'value:').textContent!;
      expect(text).toContain('bold');
      expect(text).toContain('italic');
    });
  },
};

/**
 * A form’s own `disable()` reaches the group through `setDisabledState`, so a
 * `FormControl` that starts disabled — or is disabled later — needs nothing in the
 * template.
 */
export const FormDisabled: Story = {
  name: 'Forms: control.disable()',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: VIEWS, control: new FormControl({ value: 'grid', disabled: true }) },
    template: column(`
      <ui-button-toggle label="Disabled by the form, not the template"
                        [options]="options" [formControl]="control" />

      <button matButton uiButton variant="outlined"
              (click)="control.enabled ? control.disable() : control.enable()">
        Toggle
      </button>`),
  }),
  // Proves `setDisabledState` round-trips both ways: a group that starts disabled
  // by the form renders its toggles disabled, and enabling the form re-enables
  // them — with nothing in the template driving `disabled`.
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const toggle = canvasElement.querySelector<HTMLButtonElement>('mat-button-toggle button')!;
    expect(toggle.disabled).toBe(true);

    await clickAction(canvasElement, 'Toggle');

    await waitFor(() => expect(toggle.disabled).toBe(false));
  },
};

/**
 * `changed` is the *user*, and only the user: it is Material’s own `change` forwarded,
 * so a form patch or the button below does not fire it. `valueChange` — the `model()`’s
 * output — fires however the value moved. Reach for `changed` when the point is that
 * someone chose.
 */
export const Changed: Story = {
  name: 'changed vs valueChange',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: VIEWS, log: [] as string[], view: 'list' },
    template: column(`
      <ui-button-toggle
        label="View"
        [options]="options"
        [(value)]="view"
        (changed)="log.push('changed: ' + $event)"
      />

      <button matButton uiButton variant="outlined" (click)="view = 'map'">
        Choose Map from code
      </button>

      <p style="font: var(--mat-sys-body-small); margin: 0;">
        value: <strong>{{ view }}</strong> · changed fired <strong>{{ log.length }}</strong> time(s) —
        the button does not fire it.
      </p>`),
  }),
};

/**
 * The value is the option’s `value`, whatever that is — an object, if that is what
 * `options` holds. No id in and lookup out.
 *
 * Note there is no `compareWith`: Material matches a value to its toggle by `===`, so
 * hold the option’s own object (or an id) in the control rather than a copy of it.
 */
export const ObjectValues: Story = {
  name: 'Object values',
  parameters: { controls: { disable: true } },
  render: () => {
    const ranges = [
      { value: { days: 1 }, label: 'Day' },
      { value: { days: 7 }, label: 'Week' },
      { value: { days: 30 }, label: 'Month' },
    ];

    return {
      props: { ranges, range: ranges[1].value },
      template: column(`
        <ui-button-toggle label="Range" [options]="ranges" [(value)]="range" />
        <p style="font: var(--mat-sys-body-small); margin: 0;">
          range: <strong>{{ range.days }} day(s)</strong> — the option’s own object, not an id this
          component made you look up.
        </p>`),
    };
  },
};

// --- Accessibility ---------------------------------------------------------

/**
 * The role and its name. The label is rendered with an id and the group’s
 * `aria-labelledby` points at it — inspect the DOM here.
 *
 * Three ways to name a group, all of them real:
 *
 * - `label` — the visible name. The usual case.
 * - `aria-labelledby` — a heading already on the page, which wins over the label.
 * - `aria-label` — no visible name at all, for a group whose meaning is the row it sits
 *   in (a toolbar).
 *
 * An unnamed toggle group is an accessibility violation, not a design choice.
 */
export const Naming: Story = {
  name: 'Accessibility: naming the group',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { views: VIEWS, alignments: ALIGNMENTS },
    template: column(`
      <div>
        <h3 id="results-heading" style="font: var(--mat-sys-title-medium); margin: 0 0 0.5rem;">
          Results
        </h3>
        <ui-button-toggle aria-labelledby="results-heading" [options]="views" value="list" />
      </div>

      <ui-button-toggle label="View" [options]="views" value="grid" />

      <ui-button-toggle aria-label="Alignment" iconOnly hideSelectionIndicator
                        [options]="alignments" value="left" />`),
  }),
};

// --- Custom content --------------------------------------------------------

/**
 * Rule 7: a string cannot spell a count, or a glyph that fills when it is chosen, so the
 * toggle is a `uiButtonToggleOption` template rather than another input this component
 * would have to grow. The option is the implicit context, and `let-selected` says
 * whether it is chosen.
 *
 * It renders *inside* Material’s own `<mat-button-toggle>`, so the button, the ripple,
 * the state layers and the keyboard are untouched — and the toggle is named by what the
 * template renders rather than by `label`, since a name that says less than the content
 * shows is the `label-in-name` failure.
 */
export const CustomOptions: Story = {
  name: 'Custom option content',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      folders: [
        { value: 'inbox', label: 'Inbox', icon: 'inbox', count: 12 },
        { value: 'sent', label: 'Sent', icon: 'send', count: 3 },
        { value: 'drafts', label: 'Drafts', icon: 'draft', count: 0 },
      ],
    },
    template: `
      <ui-button-toggle label="Folder" hideSelectionIndicator [options]="folders" value="inbox">
        <ng-template uiButtonToggleOption let-option let-selected="selected">
          <ui-icon [name]="option.icon" [filled]="selected" size="sm"
                   style="vertical-align: middle; margin-inline-end: 0.5rem;" />
          {{ option.label }}
          <span style="color: var(--mat-sys-on-surface-variant);">({{ option.count }})</span>
        </ng-template>
      </ui-button-toggle>`,
  }),
};

// --- Theming ---------------------------------------------------------------

/**
 * Rule 6. Material’s `color` input is an M2-only API that does nothing under an M3
 * theme, so the colours are CSS custom properties resolved through
 * `mat.button-toggle-overrides()` against the theme’s own tokens:
 *
 * - `--ui-button-toggle-selected-container-color` — the fill of a chosen toggle
 * - `--ui-button-toggle-on-selected-container-color` — the text and checkmark on it
 * - `--ui-button-toggle-shape` — the group’s corners, defaulting to the fleet’s own
 *   `--ui-button-shape` so a group and the buttons beside it agree
 * - `--ui-button-toggle-gap` — the space under the label
 *
 * The two colours are a **pair**: point them at a role and its `on-` partner rather than
 * literals, and the chosen toggle stays legible through a palette change and dark mode.
 * M3’s own default is the *secondary* container — a bar whose chosen segment shouted in
 * brand colour would out-weigh the page’s actual primary action.
 *
 * No `::ng-deep`, no `!important`.
 */
export const Theming: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: VIEWS },
    template: grid(
      [
        ['default (secondary container)', ''],
        [
          'tertiary',
          `style="--ui-button-toggle-selected-container-color: var(--mat-sys-tertiary-container);
                  --ui-button-toggle-on-selected-container-color: var(--mat-sys-on-tertiary-container);"`,
        ],
        [
          'success (a --ui-sys role)',
          `style="--ui-button-toggle-selected-container-color: var(--ui-sys-success-container);
                  --ui-button-toggle-on-selected-container-color: var(--ui-sys-on-success-container);"`,
        ],
        ['pill (shape)', 'style="--ui-button-toggle-shape: var(--mat-sys-corner-full);"'],
      ]
        .map(([name, style]) =>
          caption(
            name,
            `<ui-button-toggle label="View" [options]="options" value="grid" ${style} />`,
          ),
        )
        .join('\n'),
    ),
  }),
};

// --- Native attributes -----------------------------------------------------

/**
 * Rule 3. Everything this component does not name is moved onto the real
 * `<mat-button-toggle-group>` — the element carrying the role. Inspect the DOM here:
 * `data-*` and `aria-describedby` are on the group, not stranded on the wrapper.
 *
 * `aria-label` and `aria-labelledby` have inputs of their own instead, because this
 * component resolves the group’s naming against the rendered label.
 */
export const NativeAttributes: Story = {
  name: 'Native attributes',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: RANGE },
    template: column(`
      <ui-button-toggle
        label="Range"
        name="range"
        [options]="options"
        value="week"
        aria-describedby="range-help"
        data-testid="range"
      />

      <p id="range-help" style="font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant); margin: 0;">
        A yearly range needs a paid plan. Announced with the group, because
        <code>aria-describedby</code> reaches the element with the role.
      </p>`),
  }),
};
