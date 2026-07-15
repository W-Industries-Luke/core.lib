import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Button } from '../button/button';
import { Checkbox, type UiCheckboxLabelPosition } from './checkbox';

const LABEL_POSITIONS: UiCheckboxLabelPosition[] = ['after', 'before'];

/** Captions a grid cell, so a story is readable without opening the source. */
const caption = (text: string, content: string) => `
  <div style="display: flex; flex-direction: column; gap: 0.25rem;">
    ${content}
    <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${text}</span>
  </div>`;

const grid = (content: string, columns = 2) => `
  <div style="display: grid; grid-template-columns: repeat(${columns}, minmax(0, 14rem)); gap: 1rem 1.5rem;">
    ${content}
  </div>`;

/** A checkbox stacks with its siblings, so the form-ish stories render in a column. */
const column = (content: string) =>
  `<div style="display: flex; flex-direction: column; align-items: start; gap: 0.5rem;">${content}</div>`;

const meta: Meta<Checkbox> = {
  title: 'Components/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  decorators: [
    // The forms directives the form stories are built from, plus Material's
    // button and this library's `uiButton` — which needs `MatButton` alongside
    // it, since it decorates Material's button rather than replacing it.
    moduleMetadata({
      imports: [Checkbox, FormsModule, ReactiveFormsModule, MatButton, Button],
    }),
  ],
  args: {
    label: 'Remember me',
    checked: false,
    indeterminate: false,
    disabled: false,
    required: false,
    labelPosition: 'after',
    disableRipple: false,
    disabledInteractive: false,
  },
  argTypes: {
    label: { control: 'text' },
    checked: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    labelPosition: { control: 'inline-radio', options: LABEL_POSITIONS },
    disableRipple: { control: 'boolean' },
    disabledInteractive: { control: 'boolean' },
    id: { control: 'text' },
    name: { control: 'text' },
    value: { control: 'text' },
    changed: { action: 'changed' },
    checkedChange: { action: 'checkedChange' },
    indeterminateChange: { action: 'indeterminateChange' },
    // Documented in the table but not knobs: their inputs are aliased to the
    // ARIA attributes, which `argsToTemplate` cannot bind — it writes the class
    // member name. The `Native attributes` story covers them for real.
    ariaLabel: { name: 'aria-label', control: false },
    ariaLabelledby: { name: 'aria-labelledby', control: false },
    ariaDescribedby: { name: 'aria-describedby', control: false },
    ariaExpanded: { name: 'aria-expanded', control: false },
    ariaControls: { name: 'aria-controls', control: false },
    ariaOwns: { name: 'aria-owns', control: false },
    tabindex: { control: false },
    matCheckbox: { table: { disable: true } },
    checkboxElement: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-checkbox` is the shared theme applied to Angular Material’s `<mat-checkbox>`, wired as a',
          'form control. Like `ui-input` and `ui-select`, and unlike `uiButton`, it is a **component**',
          'rather than a directive: `MatCheckbox` is a component with an element selector, so there is',
          'no native element to decorate — the `<input type="checkbox">` is what Material renders',
          '*inside* the box, the ripple, the touch target and the label it composes.',
          '',
          '### It is Material, not a re-implementation',
          '',
          'The box, the checkmark and the mixed mark and the animations between them, the ripple, the',
          'state layers, the 48px touch target, the focus ring and every colour are `<mat-checkbox>`’s',
          'own, resolved from the `--mat-sys-*` tokens the shared theme emits. There is not a literal',
          'colour in `checkbox.scss` — so every story below renders the exact palette a consuming app',
          'gets. Toggle your OS light/dark preference to watch them follow.',
          '',
          '`color` is not an input, because Material’s own `color` is an M2-only API that does nothing',
          'under an M3 theme. The `--ui-checkbox-color` hook is the M3 answer — see **Theming**.',
          '',
          '### Forms',
          '',
          '`ui-checkbox` is a `ControlValueAccessor` **and** a `Validator`, so `[(ngModel)]`,',
          '`[formControl]` and `formControlName` work with no adapter — bind the host, not the checkbox',
          'inside it. `required` is enforced the way a checkbox means it: invalid until the box is',
          '*ticked*, which `Validators.required` alone will not do. See the **Forms** stories.',
          '',
          '`[(checked)]` is the same state without a forms directive, and `[(indeterminate)]` is the',
          'mixed state of a parent whose children disagree — see **Select all**.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<ui-checkbox ${argsToTemplate(args)} />`,
  }),
};

export default meta;
type Story = StoryObj<Checkbox>;

/** The default box: unticked, label after, nothing else. */
export const Default: Story = {};

// --- State -----------------------------------------------------------------

/** Unticked — the resting state, and what a form starts at unless told otherwise. */
export const Unchecked: Story = { args: { checked: false } };

/** Ticked. The fill and the checkmark are the theme’s `primary` / `on-primary` roles. */
export const Checked: Story = { args: { checked: true } };

/**
 * M3’s mixed state: a parent whose children disagree. It is a *display* state,
 * not a third value — the control still reports `checked`, and a form never sees
 * "mixed".
 *
 * Material clears it the moment the box is clicked, because a click is an answer.
 * That is why it is two-way — see **Select all** for what it is actually for.
 */
export const Indeterminate: Story = { args: { indeterminate: true } };

/** Not editable, not focusable, not submitted. */
export const Disabled: Story = { args: { disabled: true } };

/** Disabled and ticked — a state that is settled and cannot be argued with. */
export const DisabledChecked: Story = { args: { disabled: true, checked: true } };

/**
 * Every state side by side, enabled and disabled. Not one of them carries a
 * colour of its own: the fill, the mark, the outline and the greyed label all
 * resolve from the theme’s M3 tokens.
 */
export const States: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      [
        ['unchecked', ''],
        ['checked', '[checked]="true"'],
        ['indeterminate', '[indeterminate]="true"'],
      ]
        .flatMap(([name, binding]) => [
          caption(name, `<ui-checkbox label="Remember me" ${binding} />`),
          caption(`${name} · disabled`, `<ui-checkbox label="Remember me" ${binding} disabled />`),
        ])
        .join('\n'),
    ),
  }),
};

/**
 * `disabledInteractive` keeps a disabled box focusable and announced, marked with
 * `aria-disabled` rather than the native `disabled`. Material’s own answer to the
 * disabled control that still has to explain itself: a natively disabled input is
 * skipped by the tab order, so a screen reader user never reaches the tooltip
 * saying why it is off.
 *
 * Tab through both boxes below — only the second one takes focus.
 */
export const DisabledInteractive: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      [
        caption('disabled', `<ui-checkbox label="Not available" disabled />`),
        caption(
          'disabled disabledInteractive',
          `<ui-checkbox label="Not available yet" disabled disabledInteractive />`,
        ),
      ].join('\n'),
    ),
  }),
};

// --- Label -----------------------------------------------------------------

/** The default: the label to the right of the box, which is what a form wants. */
export const LabelAfter: Story = { args: { labelPosition: 'after' } };

/**
 * The label to the left, for a settings row where the label *is* the row and the
 * box is its control. Material flips its own layout — the `<label for>` stays
 * tied to the input either way, so clicking the text still toggles the box.
 */
export const LabelBefore: Story = { args: { labelPosition: 'before' } };

/** Both positions together — the choice a consumer is making. */
export const LabelPositions: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      LABEL_POSITIONS.map((position) =>
        caption(
          `labelPosition="${position}"`,
          `<ui-checkbox label="Remember me" labelPosition="${position}" [checked]="true" />`,
        ),
      ).join('\n'),
    ),
  }),
};

/**
 * Rule 7: a string cannot spell a link, so the label is projected content with the
 * `label` input as its fallback. It renders inside Material’s own `<label for>`,
 * so clicking the text still toggles the box — and the link still works.
 */
export const ProjectedLabel: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: column(`
      <ui-checkbox>
        I accept the <a href="https://example.com/terms" target="_blank">terms of service</a>
      </ui-checkbox>

      <ui-checkbox>
        <strong>Email me</strong> about new features
        <span style="display: block; font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant);">
          About once a month. Unsubscribe any time.
        </span>
      </ui-checkbox>`),
  }),
};

/**
 * A box named by `aria-label` rather than by visible text — for the cell of a
 * table where the column header is the label, and the row is what it selects.
 */
export const NoVisibleLabel: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `<ui-checkbox aria-label="Select row: invoice 8912" />`,
  }),
};

// --- Forms -----------------------------------------------------------------

/**
 * `[(ngModel)]` binds the host — `ui-checkbox` is a `ControlValueAccessor`, so
 * there is no adapter and nothing to reach inside for (rule 5). Tick the box and
 * watch the model.
 */
export const NgModel: Story = {
  name: 'Forms: [(ngModel)]',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { subscribed: false },
    template: column(`
      <ui-checkbox label="Email me about new features" [(ngModel)]="subscribed" />
      <p style="font: var(--mat-sys-body-small); margin: 0;">
        subscribed: <strong>{{ subscribed }}</strong>
      </p>`),
  }),
};

/**
 * The same state without a forms directive: `[(checked)]` is a `model()` (rule 5),
 * for a filter toggle where `[(ngModel)]` would be a directive dragged in for one
 * binding.
 *
 * `exportAs: 'uiCheckbox'` hands the component back, so the button below is just
 * `box.checked.set(false)` — no host code at all.
 */
export const TwoWayChecked: Story = {
  name: 'Forms: [(checked)] and exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { showArchived: true },
    template: column(`
      <ui-checkbox #box="uiCheckbox" label="Show archived" [(checked)]="showArchived" />

      <button matButton uiButton variant="outlined" (click)="box.checked.set(false)">Reset</button>

      <p style="font: var(--mat-sys-body-small); margin: 0;">
        checked: <strong>{{ box.checked() }}</strong>
      </p>`),
  }),
};

/**
 * `required` on a checkbox means *ticked*, and this component enforces it —
 * `Validators.required` would not: it rejects an empty value, and `false` is not
 * empty, so a consent box under Angular’s own validator is valid while unticked.
 *
 * Tick and untick the box and watch the form’s status. The message is the
 * consumer’s to place, exactly as with `ui-input`’s `error`.
 */
export const RequiredValidation: Story = {
  name: 'Forms: required',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { terms: new FormControl(false) },
    template: column(`
      <ui-checkbox required [formControl]="terms">
        I accept the <a href="https://example.com/terms" target="_blank">terms of service</a>
      </ui-checkbox>

      @if (terms.touched && terms.invalid) {
        <p style="font: var(--mat-sys-body-small); color: var(--mat-sys-error); margin: 0;">
          Tick the box to continue.
        </p>
      }

      <p style="font: var(--mat-sys-body-small); margin: 0;">
        valid: <strong>{{ terms.valid }}</strong> · touched: <strong>{{ terms.touched }}</strong>
      </p>`),
  }),
};

/**
 * A form’s own `disable()` reaches the box through `setDisabledState`, so a
 * `FormControl` that starts disabled — or is disabled later — needs nothing in the
 * template.
 */
export const FormDisabled: Story = {
  name: 'Forms: control.disable()',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { control: new FormControl({ value: true, disabled: true }) },
    template: column(`
      <ui-checkbox label="Disabled by the form, not the template" [formControl]="control" />

      <button matButton uiButton variant="outlined"
              (click)="control.enabled ? control.disable() : control.enable()">
        Toggle
      </button>`),
  }),
};

/**
 * What `indeterminate` is *for*, and why it is two-way: a parent whose children
 * disagree shows the mixed mark, and a click on it is an answer — Material clears
 * the mixed state itself, and the binding reports that back rather than leaving
 * the parent’s signal claiming a state the DOM has left.
 *
 * Tick one child.
 */
export const SelectAll: Story = {
  name: 'Select all',
  parameters: { controls: { disable: true } },
  render: () => {
    // The predicates live here rather than in the template because Angular's
    // template language has no arrow functions — `toppings.every(t => …)` does
    // not parse. A story is a consumer like any other.
    const toppings = [
      { label: 'Extra cheese', checked: false },
      { label: 'Mushroom', checked: false },
      { label: 'Olive', checked: false },
    ];

    return {
      props: {
        toppings,
        allChecked: () => toppings.every((topping) => topping.checked),
        someChecked: () => toppings.some((topping) => topping.checked),
        setAll: (checked: boolean) => {
          for (const topping of toppings) {
            topping.checked = checked;
          }
        },
        setOne: (topping: { checked: boolean }, checked: boolean) => {
          topping.checked = checked;
        },
      },
      template: column(`
        <ui-checkbox
          [checked]="allChecked()"
          [indeterminate]="someChecked() && !allChecked()"
          (changed)="setAll($event)"
        >
          <strong>All toppings</strong>
        </ui-checkbox>

        <div style="display: flex; flex-direction: column; align-items: start; gap: 0.5rem; padding-left: 1.5rem;">
          @for (topping of toppings; track topping.label) {
            <ui-checkbox
              [label]="topping.label"
              [checked]="topping.checked"
              (changed)="setOne(topping, $event)"
            />
          }
        </div>`),
    };
  },
};

/**
 * `changed` is the *user*, and only the user: it is Material’s own `change`
 * forwarded, so a form patch or the parent above setting every child does not
 * fire it. `checkedChange` — the `model()`’s output — fires however the state
 * moved. Reach for `changed` when the point is that someone chose.
 */
export const Changed: Story = {
  name: 'changed vs checkedChange',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { log: [] as string[], checked: false },
    template: column(`
      <ui-checkbox
        label="Email me about new features"
        [(checked)]="checked"
        (changed)="log.push('changed: ' + $event)"
      />

      <button matButton uiButton variant="outlined" (click)="checked = !checked">
        Toggle from code
      </button>

      <p style="font: var(--mat-sys-body-small); margin: 0;">
        checked: <strong>{{ checked }}</strong> · changed fired
        <strong>{{ log.length }}</strong> time(s) — the button does not fire it.
      </p>`),
  }),
};

// --- Theming ---------------------------------------------------------------

/**
 * Rule 6. Material’s `color` input is an M2-only API that does nothing under an
 * M3 theme, so the colour is a pair of CSS custom properties resolved through
 * `mat.checkbox-overrides()` against the theme’s own tokens:
 *
 * - `--ui-checkbox-color` — the fill when ticked or indeterminate, and the ripple
 * - `--ui-checkbox-checkmark-color` — the mark drawn on that fill
 *
 * They move together because the mark has to stay legible against the fill, which
 * is exactly what M3’s `x` / `on-x` role pairs encode — so point them at another
 * such pair rather than at literals, and they survive a palette change and dark
 * mode. No `::ng-deep`, no `!important`.
 */
export const Theming: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      [
        ['default (primary)', ''],
        [
          'tertiary',
          'style="--ui-checkbox-color: var(--mat-sys-tertiary); --ui-checkbox-checkmark-color: var(--mat-sys-on-tertiary);"',
        ],
        [
          'error',
          'style="--ui-checkbox-color: var(--mat-sys-error); --ui-checkbox-checkmark-color: var(--mat-sys-on-error);"',
        ],
      ]
        .map(([name, style]) =>
          caption(name, `<ui-checkbox label="Remember me" [checked]="true" ${style} />`),
        )
        .join('\n'),
      3,
    ),
  }),
};

// --- Native attributes -----------------------------------------------------

/**
 * Rule 3. Everything this component does not name is moved onto the real
 * `<input type="checkbox">` — inspect the DOM here: `data-*` and `form` are on the
 * control, not stranded on the wrapper.
 *
 * `id`, `name`, `value`, `tabindex` and the `aria-*` attributes have inputs of
 * their own instead, because Material’s own bindings own those on the input — a
 * forwarded one would be overwritten on the next change detection. `id` is
 * Material’s: it takes the one below and gives the input `newsletter-input`,
 * which is what its `<label for>` points at.
 */
export const NativeAttributes: Story = {
  name: 'Native attributes',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: column(`
      <ui-checkbox
        label="Email me about new features"
        id="newsletter"
        name="newsletter"
        value="yes"
        aria-describedby="newsletter-help"
        data-testid="newsletter"
      />

      <p id="newsletter-help" style="font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant); margin: 0;">
        About once a month. Announced with the box, because <code>aria-describedby</code> reaches the
        real input.
      </p>`),
  }),
};
