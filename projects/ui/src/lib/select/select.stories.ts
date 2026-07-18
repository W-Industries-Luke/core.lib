import { JsonPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, waitFor } from 'storybook/test';

import { Button } from '../button/button';
import {
  Select,
  SelectHint,
  SelectOptionDef,
  SelectPrefix,
  SelectSuffix,
  SelectTriggerDef,
  type UiSelectAppearance,
  type UiSelectOption,
} from './select';

const APPEARANCES: UiSelectAppearance[] = ['fill', 'outline'];

/** The list every story that is not about the options themselves is built from. */
const COUNTRIES: UiSelectOption<string>[] = [
  { value: 'gb', label: 'United Kingdom' },
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany' },
  { value: 'es', label: 'Spain' },
  { value: 'jp', label: 'Japan', disabled: true },
];

const TOPPINGS: UiSelectOption<string>[] = [
  { value: 'cheese', label: 'Extra cheese' },
  { value: 'mushroom', label: 'Mushroom' },
  { value: 'olive', label: 'Olive' },
  { value: 'basil', label: 'Basil' },
];

/** Fields are full-width by nature, so every story renders in a form-ish column. */
const frame = (content: string, width = '22rem') =>
  `<div style="max-width: ${width}; display: flex; flex-direction: column;">${content}</div>`;

/** Captions a grid cell, so a story is readable without opening the source. */
const caption = (text: string, content: string) => `
  <div style="display: flex; flex-direction: column;">
    ${content}
    <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${text}</span>
  </div>`;

const grid = (content: string, columns = 2) => `
  <div style="display: grid; grid-template-columns: repeat(${columns}, minmax(0, 18rem)); gap: 1rem 1.5rem;">
    ${content}
  </div>`;

const meta: Meta<Select<string>> = {
  title: 'Components/Select',
  component: Select,
  tags: ['autodocs'],
  decorators: [
    // The projection markers, plus the pieces the slot and form stories are
    // built from: Material's button and `<mat-icon>`, and this library's
    // `uiButton` — which needs `MatButton` alongside it, since it decorates
    // Material's button rather than replacing it.
    moduleMetadata({
      imports: [
        Select,
        SelectPrefix,
        SelectSuffix,
        SelectHint,
        SelectOptionDef,
        SelectTriggerDef,
        FormsModule,
        ReactiveFormsModule,
        MatIcon,
        MatButton,
        Button,
        // For the `Forms: object values` story, which shows the object the
        // control actually holds.
        JsonPipe,
      ],
    }),
  ],
  args: {
    label: 'Country',
    options: COUNTRIES,
    appearance: 'outline',
    multiple: false,
    disabled: false,
    required: false,
    hideRequiredMarker: false,
    hideSingleSelectionIndicator: false,
    disableOptionCentering: false,
    floatLabel: 'auto',
    subscriptSizing: 'fixed',
    panelWidth: 'auto',
    value: null,
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    hint: { control: 'text' },
    error: { control: 'text' },
    options: { control: 'object' },
    appearance: { control: 'inline-radio', options: APPEARANCES },
    floatLabel: { control: 'inline-radio', options: ['auto', 'always'] },
    subscriptSizing: { control: 'inline-radio', options: ['fixed', 'dynamic'] },
    // Material reads `multiple` once, as the select initialises, and throws when
    // it changes afterwards — so this is a control that would break the story it
    // is on. The `Multiple` story below is the real one.
    multiple: { control: false },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    hideRequiredMarker: { control: 'boolean' },
    hideSingleSelectionIndicator: { control: 'boolean' },
    disableOptionCentering: { control: 'boolean' },
    panelClass: { control: 'text' },
    panelWidth: { control: 'text' },
    value: { control: false },
    valueChange: { action: 'valueChange' },
    openedChange: { action: 'openedChange' },
    // Documented in the table but not knobs: their inputs are aliased to the
    // ARIA attributes, which `argsToTemplate` cannot bind — it writes the class
    // member name. The `Native attributes` story covers them for real.
    ariaLabel: { name: 'aria-label', control: false },
    ariaLabelledby: { name: 'aria-labelledby', control: false },
    ariaDescribedby: { name: 'aria-describedby', control: false },
    tabindex: { control: false },
    compareWith: { control: false },
    matFormField: { table: { disable: true } },
    matSelect: { table: { disable: true } },
    selectElement: { table: { disable: true } },
    hasError: { table: { disable: true } },
    selectedValues: { table: { disable: true } },
    selectedOptions: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-select` is the shared theme applied to Angular Material’s `<mat-form-field>` around a',
          '`<mat-select>`, wired as a form control. Like `ui-card` and `ui-input`, and unlike',
          '`uiButton`, it is a **component** rather than a directive: a select owns *composition* — a',
          'container, a floating label, the trigger, an overlay panel of options, and a subscript that',
          'is either a hint or an error.',
          '',
          '`<select>` is not the element it decorates, either: Material’s select is a `combobox` over an',
          'overlay `listbox`, which is what lets an option hold **an object rather than a string**, and',
          'render something other than text.',
          '',
          '### It is Material, not a re-implementation',
          '',
          'The box, the outline, the floating label, the arrow, the panel and its elevation and',
          'animation, the ripples, the checkboxes of `multiple` mode, the typeahead and every colour',
          'are `<mat-form-field>`’s and `<mat-select>`’s own, resolved from the `--mat-sys-*` tokens the',
          'shared theme emits. There is not a literal colour in `select.scss`, so every story below',
          'renders the exact palette a consuming app gets — toggle your OS light/dark preference to',
          'watch them follow.',
          '',
          'Open a panel and type: the typeahead, the arrow keys, Home/End and the roving',
          '`aria-activedescendant` are all Material’s, not reimplemented here.',
          '',
          '### Forms',
          '',
          '`ui-select` is a `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]` and',
          '`formControlName` work with no adapter — bind the host, not the select inside it.',
          '`[(value)]` is the same state without a forms directive. See the **Forms** stories, and',
          '**Forms: object values** for the case a string-only API would force an adapter on.',
          '',
          '### Errors',
          '',
          '`error` is a string, and the field shows it — and goes red, and flips `aria-invalid` — for',
          'exactly as long as it is set. *When* that is stays with the consumer, because only they know',
          'their validation: see **Forms: reactive validation** for the usual shape.',
          '',
          '### Custom content',
          '',
          '`uiSelectOption` renders an option as something other than its label, and `uiSelectTrigger`',
          'renders the closed field’s value — both inside Material’s own elements, so selection and the',
          'keyboard keep working. See the **Slots** stories.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: frame(`<ui-select ${argsToTemplate(args)} />`),
  }),
};

export default meta;
type Story = StoryObj<Select<string>>;

/** The default field: single, `outline`, with a label and a list. */
export const Default: Story = {};

// --- Single and multiple ---------------------------------------------------

/**
 * One choice. The panel closes as soon as it is made, and the value is the
 * option’s `value` — `'fr'` here, not the label.
 *
 * `Japan` is `disabled: true`: one option unavailable while the rest still work.
 */
export const Single: Story = {
  args: { label: 'Country', value: 'fr', hint: 'Where your card was issued.' },
};

/**
 * `multiple` makes the value an **array** and gives every option Material’s own
 * checkbox. The panel stays open, because choosing is not the end of the
 * interaction.
 *
 * Material reads `multiple` once, as the select initialises — like `<select
 * multiple>`, it is what the control *is*, not a state it moves between.
 */
export const Multiple: Story = {
  args: {
    label: 'Toppings',
    options: TOPPINGS,
    multiple: true,
    value: ['cheese', 'basil'],
    hint: 'Pick as many as you like.',
  },
};

// --- Appearances -----------------------------------------------------------

/** This library’s default: M3’s outlined box. */
export const Outline: Story = { args: { appearance: 'outline', value: 'fr' } };

/** Material’s own default: the filled box, for a form on a plain surface. */
export const Fill: Story = { args: { appearance: 'fill', value: 'fr' } };

/**
 * Both appearances, empty and chosen. Neither carries a colour of its own — the
 * container, the outline, the arrow and the label all resolve from the theme’s M3
 * tokens.
 */
export const Appearances: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES },
    template: grid(
      APPEARANCES.flatMap((appearance) =>
        ['null', "'fr'"].map((value) =>
          caption(
            `appearance="${appearance}"${value === 'null' ? ' · empty' : ' · chosen'}`,
            `<ui-select appearance="${appearance}" label="Country" [options]="options" [value]="${value}" />`,
          ),
        ),
      ).join('\n'),
    ),
  }),
};

// --- Options ---------------------------------------------------------------

/**
 * A disabled option is one choice being unavailable while the rest still work —
 * `Japan` here. It is not the same as a disabled *field*, below: the control is
 * still open, still keyboard-navigable, and the option is still announced, as
 * `aria-disabled`.
 */
export const DisabledOption: Story = {
  args: { label: 'Country', hint: 'Japan is not available.' },
};

/**
 * Nothing to choose. The field still opens — an empty panel is the honest answer,
 * and the hint is where the reason goes.
 */
export const NoOptions: Story = {
  args: { label: 'Country', options: [], hint: 'No countries are available yet.' },
};

// --- Error -----------------------------------------------------------------

/**
 * The field shows the message — and goes red, and flips `aria-invalid` — for
 * exactly as long as `error` is set. Clear the `error` control to watch it go back
 * to the hint.
 */
export const WithError: Story = {
  args: {
    label: 'Country',
    hint: 'Where your card was issued.',
    error: 'Choose the country your card was issued in.',
  },
  // Guards the regression from issue #122: the `error` arg must reach the `[error]`
  // input, so `<mat-error>` renders and the field enters Material's own invalid
  // state. A smoke-render alone passes even when the message is missing.
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await waitFor(() => {
      const error = canvasElement.querySelector('mat-error');
      expect(error).not.toBeNull();
      expect(error!.textContent!.trim()).toBe('Choose the country your card was issued in.');
    });

    expect(canvasElement.querySelector('.mat-form-field-invalid')).not.toBeNull();
    expect(canvasElement.querySelector('[aria-invalid="true"]')).not.toBeNull();
    expect(canvasElement.querySelector('mat-hint')).toBeNull();
  },
};

/**
 * Material renders one subscript message: the error replaces the hint rather than
 * stacking on it. Both fields below have the same hint.
 */
export const ErrorReplacesHint: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES },
    template: grid(
      [
        caption(
          'hint',
          `<ui-select label="Country" [options]="options" [value]="'fr'" hint="Where your card was issued." />`,
        ),
        caption(
          'hint + error',
          `<ui-select label="Country" [options]="options" hint="Where your card was issued."
             error="Choose the country your card was issued in." />`,
        ),
      ].join('\n'),
    ),
  }),
};

/** The error state in both appearances — the red is M3’s `error` role, in either box. */
export const ErrorAppearances: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES },
    template: grid(
      APPEARANCES.map((appearance) =>
        caption(
          `appearance="${appearance}"`,
          `<ui-select appearance="${appearance}" label="Country" [options]="options"
             error="Choose a country." />`,
        ),
      ).join('\n'),
    ),
  }),
};

// --- State -----------------------------------------------------------------

/** A disabled field: it does not open, and it is out of the tab order. */
export const Disabled: Story = {
  args: { label: 'Country', value: 'fr', disabled: true },
};

/** Disabled in both appearances, empty and chosen. */
export const DisabledStates: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES },
    template: grid(
      APPEARANCES.flatMap((appearance) =>
        ['null', "'fr'"].map((value) =>
          caption(
            `appearance="${appearance}"${value === 'null' ? ' · empty' : ' · chosen'}`,
            `<ui-select appearance="${appearance}" label="Country" [options]="options" [value]="${value}"
               disabled hint="Hints grey out too." />`,
          ),
        ),
      ).join('\n'),
    ),
  }),
};

/**
 * `required` adds Material’s asterisk and sets `aria-required`. It says the field
 * is required; it does not enforce it — Angular’s own `required` validator matches
 * the same attribute on `<ui-select [(ngModel)] required>`, so writing it once gets
 * both.
 */
export const Required: Story = { args: { label: 'Country', required: true } };

/** `hideRequiredMarker` drops the asterisk on a form where everything is required. */
export const HideRequiredMarker: Story = {
  args: { label: 'Country', required: true, hideRequiredMarker: true },
};

// --- Label and placeholder -------------------------------------------------

/**
 * A placeholder is not a label: it disappears the moment something is chosen. Use
 * it for the *shape* of an answer over a `label` that says which answer it wants.
 *
 * Note the pairing — with the default `floatLabel="auto"` the label sits where the
 * placeholder would be, so `floatLabel="always"` is how to show both at rest.
 */
export const WithPlaceholder: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES },
    template: grid(
      (['auto', 'always'] as const)
        .map((floatLabel) =>
          caption(
            `floatLabel="${floatLabel}"`,
            `<ui-select label="Country" placeholder="Choose one" floatLabel="${floatLabel}"
               [options]="options" />`,
          ),
        )
        .join('\n'),
    ),
  }),
};

// --- Slots -----------------------------------------------------------------

/**
 * Rule 7: `uiSelectPrefix` and `uiSelectSuffix` project into Material’s own icon
 * slots, inside the field’s box. Note the arrow is Material’s and always there —
 * a suffix sits beside it, it does not replace it.
 */
export const PrefixAndSuffix: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES },
    template: grid(
      [
        caption(
          'uiSelectPrefix',
          `<ui-select label="Country" [options]="options" [value]="'fr'">
             <mat-icon uiSelectPrefix>public</mat-icon>
           </ui-select>`,
        ),
        caption(
          'uiSelectSuffix',
          `<ui-select label="Country" [options]="options" [value]="'fr'">
             <mat-icon uiSelectSuffix>check_circle</mat-icon>
           </ui-select>`,
        ),
      ].join('\n'),
    ),
  }),
};

/**
 * Rule 7: a string cannot spell a link, so project a `uiSelectHint` element for a
 * hint that needs one. It replaces the `hint` string, and Material announces it
 * with the control exactly the same way.
 */
export const ProjectedHint: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES },
    template: frame(`
      <ui-select label="Country" [options]="options">
        <span uiSelectHint>Not sure? <a href="#">Read this first</a>.</span>
      </ui-select>`),
  }),
};

/**
 * Rule 7: `uiSelectOption` renders each option in place of its label — for a
 * swatch, an avatar, a flag, a two-line option. It renders *inside* Material’s own
 * `<mat-option>`, so selection, the ripple and the keyboard are untouched.
 */
export const CustomOptions: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      options: [
        { value: '#1a73e8', label: 'Azure' },
        { value: '#188038', label: 'Green' },
        { value: '#d93025', label: 'Red' },
      ] satisfies UiSelectOption<string>[],
    },
    template: frame(`
      <ui-select label="Brand colour" [options]="options" [value]="'#188038'">
        <ng-template uiSelectOption let-option>
          <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
            <span [style.background]="option.value"
                  style="width: 0.9rem; height: 0.9rem; border-radius: 50%;
                         outline: 1px solid var(--mat-sys-outline-variant);"></span>
            {{ option.label }}
          </span>
        </ng-template>
      </ui-select>`),
  }),
};

/**
 * Rule 7: `uiSelectTrigger` renders the *closed* field’s value. The usual reason is
 * `multiple`, where Material’s own default — every label, comma-separated —
 * overflows the moment someone picks a few.
 *
 * The template is handed the value and the chosen options, and Material renders it
 * only once there is a value, so an empty field is still the placeholder.
 */
export const CustomTrigger: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: TOPPINGS, picked: ['cheese', 'mushroom', 'basil'] },
    template: frame(`
      <ui-select label="Toppings" multiple [options]="options" [(ngModel)]="picked">
        <ng-template uiSelectTrigger let-options="options">
          {{ options[0]?.label }}
          @if (options.length > 1) {
            <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">
              (+{{ options.length - 1 }} more)
            </span>
          }
        </ng-template>
      </ui-select>`),
  }),
};

// --- Forms -----------------------------------------------------------------

/**
 * `[(ngModel)]` binds the host — `ui-select` is a `ControlValueAccessor`, so there
 * is no adapter and nothing to reach inside for (rule 5). Choose an option and
 * watch the model.
 */
export const NgModel: Story = {
  name: 'Forms: [(ngModel)]',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES, country: 'fr' },
    template: frame(`
      <ui-select label="Country" [options]="options" [(ngModel)]="country" />
      <p style="font: var(--mat-sys-body-small); margin: 0;">
        country: <strong>{{ country ?? 'null' }}</strong>
      </p>`),
  }),
};

/**
 * The same state without a forms directive: `[(value)]` is a `model()` (rule 5).
 *
 * `exportAs: 'uiSelect'` hands the component back, so the buttons below are just
 * `field.value.set(…)` and `field.matSelect().open()` — no host code at all, and
 * Material’s own API is one hop away rather than re-declared here (rule 4).
 */
export const TwoWayValue: Story = {
  name: 'Forms: [(value)] and exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES, country: 'de' },
    template: frame(`
      <ui-select #field="uiSelect" label="Country" [options]="options" [(value)]="country">
        <mat-icon uiSelectPrefix>public</mat-icon>
      </ui-select>

      <div style="display: flex; gap: 0.5rem;">
        <button matButton uiButton variant="outlined" (click)="field.value.set(null)">Clear</button>
        <button matButton uiButton variant="outlined" (click)="field.matSelect().open()">Open</button>
      </div>

      <p style="font: var(--mat-sys-body-small); margin: 0.5rem 0 0;">
        value: <strong>{{ field.value() ?? 'null' }}</strong>
      </p>`),
  }),
};

/**
 * The usual shape for a reactive form. `error` is a string this library shows on
 * demand — *when* to show it is the consumer’s call, because only they know their
 * validation. Here it waits until the user has been in and out of the field, which
 * for a select means opening the panel and closing it again.
 *
 * Open the panel and close it without choosing.
 */
export const ReactiveValidation: Story = {
  name: 'Forms: reactive validation',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      options: COUNTRIES,
      control: new FormControl<string | null>(null, Validators.required),
    },
    template: frame(`
      <ui-select
        label="Country"
        required
        hint="Where your card was issued."
        [options]="options"
        [formControl]="control"
        [error]="control.touched && control.hasError('required') ? 'Choose a country.' : ''"
      />

      <p style="font: var(--mat-sys-body-small); margin: 0;">
        touched: <strong>{{ control.touched }}</strong> · valid: <strong>{{ control.valid }}</strong>
      </p>`),
  }),
};

/**
 * A form’s own `disable()` reaches the field through `setDisabledState`, so a
 * `FormControl` that starts disabled — or is disabled later — needs nothing in the
 * template.
 */
export const FormDisabled: Story = {
  name: 'Forms: control.disable()',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES, control: new FormControl({ value: 'fr', disabled: true }) },
    template: frame(`
      <ui-select label="Country" [options]="options" [formControl]="control"
                 hint="Disabled by the form, not the template." />

      <button matButton uiButton variant="outlined"
              (click)="control.enabled ? control.disable() : control.enable()">
        Toggle
      </button>`),
  }),
};

/**
 * The case a string-only API would force an adapter on: the option’s `value` is a
 * whole object, and that is what the form holds — no id in, no lookup out (rule 5).
 *
 * The control below starts with an object that is **not** the same instance as the
 * one in `options`, as a form patched from a server response would be, so
 * `compareWith` is what matches it to its option. Without it the default `===`
 * would leave the field looking empty.
 */
export const ObjectValues: Story = {
  name: 'Forms: object values and compareWith',
  parameters: { controls: { disable: true } },
  render: () => {
    const options: UiSelectOption<{ id: string; name: string }>[] = [
      { value: { id: 'gb', name: 'United Kingdom' }, label: 'United Kingdom' },
      { value: { id: 'fr', name: 'France' }, label: 'France' },
    ];
    return {
      props: {
        options,
        byId: (a: { id: string }, b: { id: string }) => a?.id === b?.id,
        control: new FormControl<{ id: string; name: string } | null>({ id: 'fr', name: 'France' }),
      },
      template: frame(`
        <ui-select label="Country" [options]="options" [compareWith]="byId" [formControl]="control" />
        <p style="font: var(--mat-sys-body-small); margin: 0;">
          value: <strong>{{ control.value | json }}</strong>
        </p>`),
    };
  },
};

// --- Native attributes -----------------------------------------------------

/**
 * Rule 3. Everything this component does not name is moved onto the real
 * `<mat-select>` — inspect the DOM here: `data-*` is on the control, not stranded
 * on the wrapper.
 *
 * `id`, `tabindex`, `aria-label`, `aria-labelledby` and `aria-describedby` have
 * inputs of their own instead, because Material’s own host bindings own those
 * attributes on the control — a forwarded one would be overwritten on the next
 * change detection. `aria-describedby` is merged with the hint’s id rather than
 * replacing it, so both are announced.
 *
 * `name` is the exception that stays on the wrapper: `<mat-select>` renders no
 * native form element, so there is nowhere to move it to — and `[(ngModel)]` in a
 * `<form>` reads it off the host, which is the only thing `name` does here.
 */
export const NativeAttributes: Story = {
  name: 'Native attributes',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES },
    template: frame(`
      <p id="policy" style="font: var(--mat-sys-body-small); margin: 0 0 0.5rem;">
        We only use this to work out your tax rate.
      </p>

      <ui-select
        label="Country"
        id="signup-country"
        name="country"
        data-testid="signup-country"
        aria-describedby="policy"
        [options]="options"
        hint="Both this hint and the note above are announced with the field."
      />`),
  }),
};

// --- Styling hooks ---------------------------------------------------------

/**
 * `<ui-select>` is a block and the field fills it, so sizing a field is an ordinary
 * rule on an ordinary selector — no `::ng-deep`, no `!important`. Set the width on
 * the host; reach for `--ui-select-width` only when the field should not fill it.
 *
 * The panel is a different problem — it renders in an overlay at the document root,
 * outside the component’s encapsulation. `panelClass` is Material’s own answer to
 * that, and it is forwarded, so styling the panel is not a `::ng-deep` either.
 */
export const StylingHooks: Story = {
  name: 'Styling hooks: --ui-select-width and panelClass',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; max-width: 34rem;">
        <ui-select label="Sized by the host" style="width: 12rem;" [options]="options" />

        <ui-select label="Sized by the hook" style="--ui-select-width: max-content;"
                   [options]="options"
                   hint="max-content — the field shrinks to Material’s own intrinsic width." />

        <div style="display: flex; gap: 1rem;">
          <ui-select label="Country" style="flex: 1;" [options]="options" />
          <ui-select label="Backup" style="flex: 1;" [options]="options" />
        </div>

        <ui-select label="Wide panel" panelWidth="20rem" [options]="options"
                   style="width: 10rem;"
                   hint="panelWidth — the panel need not match the field." />
      </div>`,
  }),
};

// --- The full matrix -------------------------------------------------------

/**
 * Every appearance × state combination. This is the reference grid: if a
 * combination does not hold together here, the theme is wrong.
 */
export const AllConfigurations: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES },
    template: `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 18rem)); gap: 1rem 1.5rem;">
        ${APPEARANCES.flatMap((appearance) =>
          [
            { name: 'default', attrs: '', value: 'null' },
            { name: 'chosen', attrs: '', value: "'fr'" },
            {
              name: 'placeholder',
              attrs: 'placeholder="Choose one" floatLabel="always"',
              value: 'null',
            },
            { name: 'hint', attrs: 'hint="Where your card was issued."', value: 'null' },
            { name: 'error', attrs: 'error="Choose a country."', value: 'null' },
            { name: 'required', attrs: 'required', value: 'null' },
            { name: 'disabled', attrs: 'disabled', value: "'fr'" },
          ].map(({ name, attrs, value }) =>
            caption(
              `${appearance} · ${name}`,
              `<ui-select appearance="${appearance}" label="Country" [options]="options"
                 [value]="${value}" ${attrs} />`,
            ),
          ),
        ).join('')}
      </div>`,
  }),
};
