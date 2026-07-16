import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, waitFor } from 'storybook/test';

import {
  Combobox,
  ComboboxHint,
  ComboboxOptionDef,
  ComboboxPrefix,
  ComboboxSuffix,
  type UiComboboxAppearance,
  type UiComboboxOption,
} from './combobox';

const APPEARANCES: UiComboboxAppearance[] = ['fill', 'outline'];

/** The short list most stories are built from. */
const COUNTRIES: UiComboboxOption<string>[] = [
  { value: 'gb', label: 'United Kingdom' },
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany' },
  { value: 'es', label: 'Spain' },
  { value: 'it', label: 'Italy' },
  { value: 'jp', label: 'Japan', disabled: true },
];

const TOPPINGS: UiComboboxOption<string>[] = [
  { value: 'cheese', label: 'Extra cheese' },
  { value: 'mushroom', label: 'Mushroom' },
  { value: 'olive', label: 'Olive' },
  { value: 'basil', label: 'Basil' },
  { value: 'pepper', label: 'Pepper' },
  { value: 'onion', label: 'Red onion' },
];

/** A grouped list, for the `Grouped` story — with one option that stands on its own. */
const TIMEZONES: UiComboboxOption<string>[] = [
  { value: 'utc', label: 'UTC' },
  { value: 'lon', label: 'London', group: 'Europe' },
  { value: 'par', label: 'Paris', group: 'Europe' },
  { value: 'ber', label: 'Berlin', group: 'Europe' },
  { value: 'nyc', label: 'New York', group: 'Americas' },
  { value: 'sao', label: 'São Paulo', group: 'Americas' },
  { value: 'tyo', label: 'Tokyo', group: 'Asia' },
  { value: 'sin', label: 'Singapore', group: 'Asia' },
];

/** A long list, for the `ManyOptions` story — where searching earns its keep. */
const CURRENCIES: UiComboboxOption<string>[] = [
  'AUD Australian Dollar',
  'BRL Brazilian Real',
  'CAD Canadian Dollar',
  'CHF Swiss Franc',
  'CNY Chinese Yuan',
  'DKK Danish Krone',
  'EUR Euro',
  'GBP Pound Sterling',
  'HKD Hong Kong Dollar',
  'INR Indian Rupee',
  'JPY Japanese Yen',
  'KRW South Korean Won',
  'MXN Mexican Peso',
  'NOK Norwegian Krone',
  'NZD New Zealand Dollar',
  'PLN Polish Zloty',
  'SEK Swedish Krona',
  'SGD Singapore Dollar',
  'USD US Dollar',
  'ZAR South African Rand',
].map((label) => ({ value: label.slice(0, 3), label }));

/** Fields are full-width by nature, so every story renders in a form-ish column. */
const frame = (content: string, width = '22rem') =>
  `<div style="max-width: ${width}; display: flex; flex-direction: column;">${content}</div>`;

const meta: Meta<Combobox<string>> = {
  title: 'Components/Combobox',
  component: Combobox,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        Combobox,
        ComboboxPrefix,
        ComboboxSuffix,
        ComboboxHint,
        ComboboxOptionDef,
        FormsModule,
        ReactiveFormsModule,
        MatIcon,
      ],
    }),
  ],
  args: {
    label: 'Country',
    options: COUNTRIES,
    appearance: 'outline',
    multiple: false,
    clearable: false,
    disabled: false,
    required: false,
    floatLabel: 'auto',
    subscriptSizing: 'fixed',
    searchPlaceholder: 'Search…',
    noResultsText: 'No results',
    value: null,
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    searchPlaceholder: { control: 'text' },
    noResultsText: { control: 'text' },
    hint: { control: 'text' },
    error: { control: 'text' },
    options: { control: 'object' },
    appearance: { control: 'inline-radio', options: APPEARANCES },
    floatLabel: { control: 'inline-radio', options: ['auto', 'always'] },
    subscriptSizing: { control: 'inline-radio', options: ['fixed', 'dynamic'] },
    // Material reads `multiple` once, as the select initialises, and throws when it
    // changes afterwards — so this is a control that would break the story it is on.
    // The `Multiple` story below is the real one.
    multiple: { control: false },
    clearable: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    panelClass: { control: 'text' },
    value: { control: false },
    valueChange: { action: 'valueChange' },
    openedChange: { action: 'openedChange' },
    // Aliased to the ARIA attributes, which `argsToTemplate` cannot bind.
    ariaLabel: { name: 'aria-label', control: false },
    ariaLabelledby: { name: 'aria-labelledby', control: false },
    ariaDescribedby: { name: 'aria-describedby', control: false },
    tabindex: { control: false },
    compareWith: { control: false },
    filterWith: { control: false },
    matFormField: { table: { disable: true } },
    matSelect: { table: { disable: true } },
    selectElement: { table: { disable: true } },
    hasError: { table: { disable: true } },
    search: { table: { disable: true } },
    selectedValues: { table: { disable: true } },
    selectedOptions: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-combobox` is the shared theme applied to Angular Material’s `<mat-form-field>` around a',
          '`<mat-select>`, with a **search field dropped into the panel** — a select whose option list',
          'you can filter. It is a `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]` and',
          '`[(value)]` work with no adapter.',
          '',
          'It is the middle of three widgets, and choosing between them is choosing what the value *is*:',
          '',
          '- **`ui-select`** — a constrained list, no search.',
          '- **`ui-combobox`** — a constrained list you can **search within**. The value is always an',
          'option’s `value`; the search only narrows what is shown, and is emptied when the panel closes.',
          '- **`ui-autocomplete`** — a **free-text** box that suggests; the value can be text no option holds.',
          '',
          '### It is Material, not a re-implementation',
          '',
          'The box, the outline, the overlay panel, the options and their ripples, the `multiple`',
          'checkboxes, the `combobox`/`listbox` roles, the arrow keys, Enter and Escape and every colour',
          'are `<mat-form-field>`’s and `<mat-select>`’s own, resolved from the `--mat-sys-*` tokens the',
          'shared theme emits — so there is not a literal colour in `combobox.scss`. Open a panel: the',
          'search field takes focus, typing filters, and the arrows/Enter still drive Material’s list.',
          '',
          '### Multiple',
          '',
          'In `multiple` mode the value is an **array** and the chosen options show as `ui-chips` in the',
          'closed field — remove a chip to deselect. See the **Multiple** story.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: frame(`<ui-combobox ${argsToTemplate(args)} />`),
  }),
};

export default meta;
type Story = StoryObj<Combobox<string>>;

/** The default field: single, `outline`, with a label and a searchable list. */
export const Default: Story = {};

// --- Single and multiple ---------------------------------------------------

/**
 * One choice. Open the panel and type to filter — the value is the option’s `value`
 * (`'fr'` here), not the label, and the search text never becomes the value.
 */
export const Single: Story = {
  args: { label: 'Country', value: 'fr', hint: 'Type to filter the list.' },
};

/**
 * `multiple` makes the value an **array**, gives every option Material’s checkbox, and
 * shows the chosen options as `ui-chips` in the closed field. Remove a chip to
 * deselect; the panel stays open while you pick.
 */
export const Multiple: Story = {
  args: {
    label: 'Toppings',
    options: TOPPINGS,
    multiple: true,
    clearable: true,
    value: ['cheese', 'basil'],
    hint: 'Pick as many as you like.',
  },
};

// --- Grouped ---------------------------------------------------------------

/**
 * Options that share a `group` are gathered under Material’s own `<mat-optgroup>`, in
 * the order the group first appears. An option with no `group` (UTC) stands on its own,
 * above the headings. Search narrows the options, and a group empties out with them.
 */
export const Grouped: Story = {
  args: { label: 'Timezone', options: TIMEZONES, value: 'lon', hint: 'Grouped by region.' },
};

// --- Clearable -------------------------------------------------------------

/**
 * `clearable` adds a button that empties the whole selection. It shows only while there
 * is something to clear, and clearing does not open the panel.
 */
export const Clearable: Story = {
  args: { label: 'Country', clearable: true, value: 'fr' },
};

// --- Many options ----------------------------------------------------------

/**
 * The case a combobox exists for: a list too long to scan. The search field is where a
 * `ui-select` would leave the user scrolling.
 */
export const ManyOptions: Story = {
  args: {
    label: 'Currency',
    options: CURRENCIES,
    clearable: true,
    value: 'EUR',
    hint: '20 currencies — type to find one.',
  },
};

// --- State -----------------------------------------------------------------

/** A disabled field: it does not open, and it is out of the tab order. */
export const Disabled: Story = {
  args: { label: 'Country', value: 'fr', disabled: true },
};

/**
 * The field shows the message — and goes red, and flips `aria-invalid` — for exactly as
 * long as `error` is set. Clear the `error` control to watch it go back to the hint.
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

/** `required` adds Material’s asterisk and sets `aria-required`. It does not enforce. */
export const Required: Story = { args: { label: 'Country', required: true } };

// --- Appearances -----------------------------------------------------------

/** This library’s default is the outlined box; Material’s own default is the filled one. */
export const Appearances: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES },
    template: `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 18rem)); gap: 1.5rem;">
        <ui-combobox appearance="outline" label="Country (outline)" [options]="options" [value]="'fr'" />
        <ui-combobox appearance="fill" label="Country (fill)" [options]="options" [value]="'fr'" />
      </div>`,
  }),
};

// --- Slots -----------------------------------------------------------------

/**
 * Rule 7: `uiComboboxOption` renders each option in place of its label — a swatch, an
 * avatar, a two-line option. It renders *inside* Material’s own `<mat-option>`, so
 * selection, the ripple and the keyboard are untouched.
 */
export const CustomOptions: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      options: [
        { value: '#1a73e8', label: 'Azure' },
        { value: '#188038', label: 'Green' },
        { value: '#d93025', label: 'Red' },
        { value: '#f9ab00', label: 'Amber' },
      ] satisfies UiComboboxOption<string>[],
    },
    template: frame(`
      <ui-combobox label="Brand colour" [options]="options" [value]="'#188038'">
        <ng-template uiComboboxOption let-option>
          <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
            <span [style.background]="option.value"
                  style="width: 0.9rem; height: 0.9rem; border-radius: 50%;
                         outline: 1px solid var(--mat-sys-outline-variant);"></span>
            {{ option.label }}
          </span>
        </ng-template>
      </ui-combobox>`),
  }),
};

/**
 * Rule 7: `uiComboboxPrefix`/`uiComboboxSuffix` project into Material’s own icon slots,
 * and `uiComboboxHint` spells a hint a string cannot — one with a link in it.
 */
export const Slots: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES },
    template: frame(`
      <ui-combobox label="Country" [options]="options" [value]="'fr'">
        <mat-icon uiComboboxPrefix>public</mat-icon>
        <span uiComboboxHint>Not sure? <a href="#">Read this first</a>.</span>
      </ui-combobox>`),
  }),
};

// --- Forms -----------------------------------------------------------------

/**
 * `[(ngModel)]` binds the host — `ui-combobox` is a `ControlValueAccessor`, so there is
 * no adapter and nothing to reach inside for (rule 5). Choose an option and watch the
 * model; note it is the value, not the label.
 */
export const NgModel: Story = {
  name: 'Forms: [(ngModel)]',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES, country: 'fr' },
    template: frame(`
      <ui-combobox label="Country" clearable [options]="options" [(ngModel)]="country" />
      <p style="font: var(--mat-sys-body-small); margin: 0;">
        country: <strong>{{ country ?? 'null' }}</strong>
      </p>`),
  }),
};

/**
 * The usual shape for a reactive form. `error` is a string this library shows on demand;
 * *when* to show it is the consumer’s call. Here it waits until the field has been
 * opened and closed without a choice.
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
      <ui-combobox
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
