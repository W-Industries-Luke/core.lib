import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, userEvent, waitFor } from 'storybook/test';

import { Button } from '../button/button';
import {
  RadioGroup,
  RadioOptionDef,
  type UiRadioGroupDirection,
  type UiRadioOption,
} from './radio-group';

/** The readout `<p>` a Forms story renders under its group, found by its text. */
const readout = (canvas: HTMLElement, contains: string): HTMLElement =>
  [...canvas.querySelectorAll('p')].find((p) => p.textContent!.includes(contains))!;

/** Chooses an option by clicking its label, e.g. `Express`. */
const chooseOption = (canvas: HTMLElement, text: string): Promise<void> =>
  userEvent.click([...canvas.querySelectorAll('label')].find((l) => l.textContent!.trim() === text)!);

/** Clicks the action `<button>` whose text matches, e.g. `Clear`. */
const clickAction = (canvas: HTMLElement, text: string): Promise<void> =>
  userEvent.click([...canvas.querySelectorAll('button')].find((b) => b.textContent!.trim() === text)!);

const DIRECTIONS: UiRadioGroupDirection[] = ['column', 'row'];

const DELIVERY: UiRadioOption<string>[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'express', label: 'Express' },
  { value: 'courier', label: 'Courier' },
];

const YES_NO: UiRadioOption<string>[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

/** Captions a grid cell, so a story is readable without opening the source. */
const caption = (text: string, content: string) => `
  <div style="display: flex; flex-direction: column; gap: 0.5rem;">
    ${content}
    <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${text}</span>
  </div>`;

const grid = (content: string, columns = 2) => `
  <div style="display: grid; grid-template-columns: repeat(${columns}, minmax(0, 16rem)); gap: 1.5rem;">
    ${content}
  </div>`;

const column = (content: string) =>
  `<div style="display: flex; flex-direction: column; align-items: start; gap: 1rem;">${content}</div>`;

const meta: Meta<RadioGroup<string>> = {
  title: 'Components/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
  decorators: [
    // The forms directives the form stories are built from, the option template
    // directive, plus Material's button and this library's `uiButton` — which needs
    // `MatButton` alongside it, since it decorates Material's button rather than
    // replacing it.
    moduleMetadata({
      imports: [RadioGroup, RadioOptionDef, FormsModule, ReactiveFormsModule, MatButton, Button],
    }),
  ],
  args: {
    label: 'Delivery',
    options: DELIVERY,
    value: null,
    direction: 'column',
    disabled: false,
    required: false,
    labelPosition: 'after',
    disableRipple: false,
    disabledInteractive: false,
  },
  argTypes: {
    label: { control: 'text' },
    options: { control: 'object' },
    value: { control: 'text' },
    direction: { control: 'inline-radio', options: DIRECTIONS },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    labelPosition: { control: 'inline-radio', options: ['after', 'before'] },
    disableRipple: { control: 'boolean' },
    disabledInteractive: { control: 'boolean' },
    name: { control: 'text' },
    changed: { action: 'changed' },
    valueChange: { action: 'valueChange' },
    // Documented in the table but not knobs: their inputs are aliased to the ARIA
    // attributes, which `argsToTemplate` cannot bind — it writes the class member
    // name. The `Native attributes` story covers them for real.
    ariaLabel: { name: 'aria-label', control: false },
    ariaLabelledby: { name: 'aria-labelledby', control: false },
    matRadioGroup: { table: { disable: true } },
    matRadioButtons: { table: { disable: true } },
    groupElement: { table: { disable: true } },
    selectedOption: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-radio-group` is the shared theme applied to Angular Material’s `<mat-radio-group>` and',
          '`<mat-radio-button>`, wired as a form control. Like `ui-select` and `ui-input`, and unlike',
          '`uiButton`, it is a **component** rather than a directive: a radio group owns *composition* —',
          'a legend naming the set, and the buttons themselves, which only mean anything as a group.',
          '',
          '### It is Material, not a re-implementation',
          '',
          'The circles, the dot and its animation, the ripples, the state layers, the touch targets, the',
          'focus rings, the shared `name` that makes the buttons exclusive, the arrow-key roving focus',
          'and every colour are Material’s own, resolved from the `--mat-sys-*` tokens the shared theme',
          'emits. There is not a literal colour in `radio-group.scss` — so every story below renders the',
          'exact palette a consuming app gets. Toggle your OS light/dark preference to watch them follow.',
          '',
          '`color` is not an input, because Material’s own `color` is an M2-only API that does nothing',
          'under an M3 theme. The `--ui-radio-group-color` hook is the M3 answer — see **Theming**.',
          '',
          '### Accessibility',
          '',
          '`<mat-radio-group>` carries `role="radiogroup"`, and `label` names it: the legend is rendered',
          'with an id of its own and the group’s `aria-labelledby` points at it, so a screen reader',
          'announces "Delivery, Standard, radio button, 1 of 3" rather than a bare "Standard". A',
          '`<legend>` would not do this job — that names a `<fieldset>`, and the element with the role',
          'is the group inside it. See **Accessibility: naming the group**.',
          '',
          '### Forms',
          '',
          '`ui-radio-group` is a `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]` and',
          '`formControlName` work with no adapter — bind the host, not the group inside it. `[(value)]`',
          'is the same state without a forms directive. See the **Forms** stories.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<ui-radio-group ${argsToTemplate(args)} />`,
  }),
};

export default meta;
type Story = StoryObj<RadioGroup<string>>;

/** The default group: a column, nothing chosen, named by its legend. */
export const Default: Story = {};

// --- Direction -------------------------------------------------------------

/**
 * The default. A column is scannable at any label length, and it is the only
 * layout that survives a narrow viewport without reflowing — which is why it is
 * the default rather than `row`.
 */
export const Column: Story = { args: { direction: 'column', value: 'standard' } };

/**
 * Side by side, for two or three short labels. A row wraps rather than overflowing
 * when it cannot fit: the labels are the consumer’s, and `direction="row"` is a
 * preference about layout, not a promise that three long options fit a phone.
 */
export const Row: Story = {
  args: { direction: 'row', label: 'Ship to a business address?', options: YES_NO, value: 'no' },
};

/** Both directions together — the choice a consumer is making. */
export const Directions: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: YES_NO },
    template: grid(
      DIRECTIONS.map((direction) =>
        caption(
          `direction="${direction}"`,
          `<ui-radio-group label="Ship to a business address?" direction="${direction}"
                           [options]="options" value="yes" />`,
        ),
      ).join('\n'),
    ),
  }),
};

// --- State -----------------------------------------------------------------

/**
 * A group that starts with an answer — the common case for an edit form, or for a
 * setting with a sensible default. The dot is the theme’s `primary` role; the empty
 * circles stay the neutral `on-surface-variant`, so the group does not read as a
 * wall of brand colour.
 */
export const Preselected: Story = { args: { value: 'express' } };

/**
 * One option out, the rest live — for a choice that exists but is not available
 * right now. Mark it on the option; `disabled` on the *group* takes all three out.
 */
export const DisabledOption: Story = {
  args: {
    options: [
      { value: 'standard', label: 'Standard' },
      { value: 'express', label: 'Express' },
      { value: 'courier', label: 'Courier — unavailable in your area', disabled: true },
    ],
    value: 'standard',
  },
};

/** The whole group out: not editable, not focusable, not submitted. */
export const Disabled: Story = { args: { disabled: true, value: 'standard' } };

/**
 * Every state side by side. Not one of them carries a colour of its own: the dot,
 * the circles and the greyed labels all resolve from the theme’s M3 tokens.
 */
export const States: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: DELIVERY, withDisabledOption: DisabledOption.args!.options },
    template: grid(
      [
        caption('nothing chosen', `<ui-radio-group label="Delivery" [options]="options" />`),
        caption('preselected', `<ui-radio-group label="Delivery" [options]="options" value="express" />`),
        caption(
          'one option disabled',
          `<ui-radio-group label="Delivery" [options]="withDisabledOption" value="standard" />`,
        ),
        caption(
          'group disabled',
          `<ui-radio-group label="Delivery" [options]="options" value="standard" disabled />`,
        ),
      ].join('\n'),
    ),
  }),
};

/**
 * `disabledInteractive` keeps disabled buttons focusable and announced, marked with
 * `aria-disabled` rather than the native `disabled`. Material’s own answer to the
 * disabled control that still has to explain itself: a natively disabled input is
 * skipped by the tab order, so a screen reader user never reaches the tooltip
 * saying why it is off.
 *
 * Tab through both groups below — only the second one takes focus.
 */
export const DisabledInteractive: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: DELIVERY },
    template: grid(
      [
        caption('disabled', `<ui-radio-group label="Delivery" [options]="options" disabled />`),
        caption(
          'disabled disabledInteractive',
          `<ui-radio-group label="Delivery" [options]="options" disabled disabledInteractive />`,
        ),
      ].join('\n'),
    ),
  }),
};

// --- Label -----------------------------------------------------------------

/** The default: each label to the right of its button, which is what a form wants. */
export const LabelAfter: Story = { args: { labelPosition: 'after', value: 'standard' } };

/**
 * Each label to the left. Material flips its own layout — the `<label for>` stays
 * tied to the input either way, so clicking the text still chooses the option.
 */
export const LabelBefore: Story = { args: { labelPosition: 'before', value: 'standard' } };

/**
 * The `radiogroup` role and its name. The legend is rendered with an id and the
 * group’s `aria-labelledby` points at it — inspect the DOM here.
 *
 * Three ways to name a group, all of them real:
 *
 * - `label` — the legend, and the name. The usual case.
 * - `aria-labelledby` — a heading already on the page, which wins over the legend.
 * - `aria-label` — no visible name at all, for a group whose meaning is the row
 *   it sits in.
 *
 * An unnamed radio group is an accessibility violation, not a design choice.
 */
export const Naming: Story = {
  name: 'Accessibility: naming the group',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: DELIVERY },
    template: column(`
      <div>
        <h3 id="shipping-heading" style="font: var(--mat-sys-title-medium); margin: 0 0 0.5rem;">
          Shipping speed
        </h3>
        <ui-radio-group aria-labelledby="shipping-heading" [options]="options" value="standard" />
      </div>

      <ui-radio-group label="Delivery" [options]="options" value="express" />

      <ui-radio-group aria-label="Delivery speed" direction="row" [options]="options" />`),
  }),
};

// --- Custom content --------------------------------------------------------

/**
 * Rule 7: a string cannot spell a price and a description, so the option is a
 * `uiRadioOption` template rather than another input this component would have to
 * grow. The option is the implicit context, and `let-checked` says whether it is
 * the chosen one.
 *
 * It renders *inside* Material’s own `<mat-radio-button>`, and therefore inside the
 * `<label for>` tied to the real input — so clicking the custom content still
 * chooses the option, and the keyboard navigation and the ripple are untouched.
 */
export const CustomOptions: Story = {
  name: 'Custom option content',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      plans: [
        { value: { id: 'free', price: '£0' }, label: 'Free' },
        { value: { id: 'pro', price: '£12' }, label: 'Pro' },
        { value: { id: 'team', price: '£40' }, label: 'Team' },
      ],
    },
    template: `
      <ui-radio-group label="Plan" [options]="plans" [value]="plans[1].value">
        <ng-template uiRadioOption let-option let-checked="checked">
          <span style="display: inline-flex; flex-direction: column;">
            <strong style="font: var(--mat-sys-body-medium);">
              {{ option.label }}
              @if (checked) {
                <span style="color: var(--mat-sys-primary);"> · current</span>
              }
            </strong>
            <span style="font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant);">
              {{ option.value.price }} per month
            </span>
          </span>
        </ng-template>
      </ui-radio-group>`,
  }),
};

// --- Forms -----------------------------------------------------------------

/**
 * `[(ngModel)]` binds the host — `ui-radio-group` is a `ControlValueAccessor`, so
 * there is no adapter and nothing to reach inside for (rule 5). Choose an option
 * and watch the model.
 */
export const NgModel: Story = {
  name: 'Forms: [(ngModel)]',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: DELIVERY, method: 'standard' },
    template: column(`
      <ui-radio-group label="Delivery" [options]="options" [(ngModel)]="method" />
      <p style="font: var(--mat-sys-body-small); margin: 0;">
        method: <strong>{{ method }}</strong>
      </p>`),
  }),
  // Proves the round-trip the description claims: choosing an option reaches
  // `[(ngModel)]`, and the value is the option's own `value`, not its label.
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    expect(readout(canvasElement, 'method:').textContent).toContain('standard');

    await chooseOption(canvasElement, 'Express');

    await waitFor(() =>
      expect(readout(canvasElement, 'method:').textContent).toContain('express'),
    );
  },
};

/**
 * The same state without a forms directive: `[(value)]` is a `model()` (rule 5),
 * for a filter where `[(ngModel)]` would be a directive dragged in for one binding.
 *
 * `exportAs: 'uiRadioGroup'` hands the component back, so the button below is just
 * `group.value.set(null)` — no host code at all.
 */
export const TwoWayValue: Story = {
  name: 'Forms: [(value)] and exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: DELIVERY, method: 'express' },
    template: column(`
      <ui-radio-group #group="uiRadioGroup" label="Delivery" [options]="options" [(value)]="method" />

      <button matButton uiButton variant="outlined" (click)="group.value.set(null)">Clear</button>

      <p style="font: var(--mat-sys-body-small); margin: 0;">
        value: <strong>{{ group.value() ?? 'none' }}</strong> ·
        label: <strong>{{ group.selectedOption()?.label ?? 'none' }}</strong>
      </p>`),
  }),
};

/**
 * A reactive control, with `required` doing what it says: the attribute is read by
 * Angular’s own `required` validator *and* sets `aria-required` on each button, so
 * writing it once gets both. The message is the consumer’s to place, exactly as
 * with `ui-input`’s `error`.
 */
export const RequiredValidation: Story = {
  name: 'Forms: required',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: DELIVERY, control: new FormControl<string | null>(null) },
    template: column(`
      <ui-radio-group label="Delivery" required [options]="options" [formControl]="control" />

      @if (control.touched && control.invalid) {
        <p style="font: var(--mat-sys-body-small); color: var(--mat-sys-error); margin: 0;">
          Choose a delivery method to continue.
        </p>
      }

      <p style="font: var(--mat-sys-body-small); margin: 0;">
        valid: <strong>{{ control.valid }}</strong> · touched: <strong>{{ control.touched }}</strong>
      </p>`),
  }),
  // Proves `required` reaches the control: the group is invalid with nothing
  // chosen and valid once a choice is made.
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    expect(readout(canvasElement, 'valid:').textContent).toContain('valid: false');

    await chooseOption(canvasElement, 'Standard');

    await waitFor(() =>
      expect(readout(canvasElement, 'valid:').textContent).toContain('valid: true'),
    );
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
    props: {
      options: DELIVERY,
      control: new FormControl({ value: 'standard', disabled: true }),
    },
    template: column(`
      <ui-radio-group label="Disabled by the form, not the template"
                      [options]="options" [formControl]="control" />

      <button matButton uiButton variant="outlined"
              (click)="control.enabled ? control.disable() : control.enable()">
        Toggle
      </button>`),
  }),
  // Proves `setDisabledState` round-trips both ways: a group that starts disabled
  // by the form renders every button disabled, and enabling the form re-enables
  // them — with nothing in the template driving `disabled`.
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const first = canvasElement.querySelector<HTMLInputElement>('input[type="radio"]')!;
    expect(first.disabled).toBe(true);

    await clickAction(canvasElement, 'Toggle');

    await waitFor(() => expect(first.disabled).toBe(false));
  },
};

/**
 * `changed` is the *user*, and only the user: it is Material’s own `change`
 * forwarded, so a form patch or the button below does not fire it. `valueChange` —
 * the `model()`’s output — fires however the value moved. Reach for `changed` when
 * the point is that someone chose.
 */
export const Changed: Story = {
  name: 'changed vs valueChange',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: DELIVERY, log: [] as string[], method: 'standard' },
    template: column(`
      <ui-radio-group
        label="Delivery"
        [options]="options"
        [(value)]="method"
        (changed)="log.push('changed: ' + $event)"
      />

      <button matButton uiButton variant="outlined" (click)="method = 'courier'">
        Choose Courier from code
      </button>

      <p style="font: var(--mat-sys-body-small); margin: 0;">
        value: <strong>{{ method }}</strong> · changed fired
        <strong>{{ log.length }}</strong> time(s) — the button does not fire it.
      </p>`),
  }),
};

/**
 * The value is the option’s `value`, whatever that is — an object, if that is what
 * `options` holds. No id in and lookup out.
 *
 * Note there is no `compareWith`: Material’s radio group matches a value to its
 * button by `===`, so hold the option’s own object (or an id) in the control rather
 * than a copy of it.
 */
export const ObjectValues: Story = {
  name: 'Object values',
  parameters: { controls: { disable: true } },
  render: () => {
    const people = [
      { value: { id: 1, name: 'Ada Lovelace' }, label: 'Ada Lovelace' },
      { value: { id: 2, name: 'Alan Turing' }, label: 'Alan Turing' },
    ];

    return {
      props: { people, assignee: people[0].value },
      template: column(`
        <ui-radio-group label="Assignee" [options]="people" [(value)]="assignee" />
        <p style="font: var(--mat-sys-body-small); margin: 0;">
          assignee: <strong>#{{ assignee.id }} {{ assignee.name }}</strong> — the option’s own object,
          not an id this component made you look up.
        </p>`),
    };
  },
};

// --- Theming ---------------------------------------------------------------

/**
 * Rule 6. Material’s `color` input is an M2-only API that does nothing under an M3
 * theme, so the colour is a CSS custom property resolved through
 * `mat.radio-overrides()` against the theme’s own tokens:
 *
 * - `--ui-radio-group-color` — the dot of the chosen button, and its ripple
 * - `--ui-radio-group-gap` — the space under the legend and between the buttons
 *
 * Point the colour at another `--mat-sys-*` role rather than a literal, and it
 * survives a palette change and dark mode. The *unselected* circle is deliberately
 * not on the hook: M3 keeps it the neutral `on-surface-variant` role, so only the
 * answer the user gave is coloured. No `::ng-deep`, no `!important`.
 */
export const Theming: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: DELIVERY },
    template: grid(
      [
        ['default (primary)', ''],
        ['tertiary', 'style="--ui-radio-group-color: var(--mat-sys-tertiary);"'],
        ['error', 'style="--ui-radio-group-color: var(--mat-sys-error);"'],
        ['tight (gap 0)', 'style="--ui-radio-group-gap: 0;"'],
      ]
        .map(([name, style]) =>
          caption(name, `<ui-radio-group label="Delivery" [options]="options" value="express" ${style} />`),
        )
        .join('\n'),
    ),
  }),
};

// --- Native attributes -----------------------------------------------------

/**
 * Rule 3. Everything this component does not name is moved onto the real
 * `<mat-radio-group>` — the element carrying `role="radiogroup"`. Inspect the DOM
 * here: `data-*` and `aria-describedby` are on the group, not stranded on the
 * wrapper.
 *
 * `aria-label` and `aria-labelledby` have inputs of their own instead, because this
 * component resolves the group’s naming against the rendered legend.
 */
export const NativeAttributes: Story = {
  name: 'Native attributes',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: DELIVERY },
    template: column(`
      <ui-radio-group
        label="Delivery"
        name="delivery"
        [options]="options"
        value="standard"
        aria-describedby="delivery-help"
        data-testid="delivery"
      />

      <p id="delivery-help" style="font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant); margin: 0;">
        Express and Courier are not available at weekends. Announced with the group, because
        <code>aria-describedby</code> reaches the element with the role.
      </p>`),
  }),
};
