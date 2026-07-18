import { JsonPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Button } from '../button/button';
import { AddressForm } from './address-form';
import { type UiAddress } from './address-schema';

/** A filled-in US address, for the prefilled and disabled stories. */
const US_ADDRESS: UiAddress = {
  line1: '1600 Amphitheatre Parkway',
  line2: '',
  city: 'Mountain View',
  region: 'CA',
  postalCode: '94043',
  country: 'US',
};

/** A filled-in UK address, so the non-US story shows real data. */
const UK_ADDRESS: UiAddress = {
  line1: '10 Downing Street',
  line2: '',
  city: 'London',
  region: 'Greater London',
  postalCode: 'SW1A 2AA',
  country: 'GB',
};

/** An address form is a column of full-width fields, so every story renders in one. */
const frame = (content: string, width = '30rem') =>
  `<div style="max-width: ${width};">${content}</div>`;

/** Captions a cell, so a grid of countries is readable without opening the source. */
const caption = (text: string, content: string) => `
  <div style="display: flex; flex-direction: column; gap: 0.5rem;">
    <span style="font: var(--mat-sys-title-small); color: var(--mat-sys-on-surface);">${text}</span>
    ${content}
  </div>`;

const meta: Meta<AddressForm> = {
  title: 'Components/Address form',
  component: AddressForm,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [AddressForm, FormsModule, ReactiveFormsModule, MatButton, Button, JsonPipe],
    }),
  ],
  args: {
    country: 'US',
    disabled: false,
    showErrors: false,
  },
  argTypes: {
    country: { control: 'inline-radio', options: ['US', 'GB', 'CA', 'ZZ'] },
    disabled: { control: 'boolean' },
    showErrors: { control: 'boolean' },
    // Bound in the render functions rather than the controls panel — an object /
    // array control is noise next to the stories that show them for real.
    value: { table: { disable: true } },
    countries: { table: { disable: true } },
    schemas: { table: { disable: true } },
    requiredFields: { table: { disable: true } },
    ariaLabel: { name: 'aria-label', control: 'text' },
    valueChange: { action: 'valueChange' },
    activeCountry: { table: { disable: true } },
    schema: { table: { disable: true } },
    currentValue: { table: { disable: true } },
    errors: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-address-form` is the library’s first **composite**: it is built *from* `ui-input` and',
          '`ui-select`, not from scratch, so the theme, the error treatment and every `--mat-sys-*`',
          'colour are the primitives’ own. There is not a literal colour in `address-form.scss`.',
          '',
          '### Locale-aware, and data-driven',
          '',
          'The fields, their order, the labels (`State`/`ZIP code` vs `County`/`Postcode`) and the',
          'per-field validation all come from a schema chosen by the selected country. There is no',
          'US-shaped markup — pick a different country in any story below and watch the form re-shape.',
          'Adding a country is adding a schema, never editing the component.',
          '',
          '### Forms',
          '',
          'It is a `ControlValueAccessor` **and** a `Validator`, so `[(ngModel)]`, `[formControl]` and',
          '`formControlName` bind the whole typed address with no adapter, and a parent form is invalid',
          'exactly when a field is. `[(value)]` is the same address without a forms directive.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: frame(`<ui-address-form ${argsToTemplate(args)} />`),
  }),
};

export default meta;
type Story = StoryObj<AddressForm>;

/** The default: a US address, empty. Pick a country to watch the schema change. */
export const Default: Story = {};

// --- Countries -------------------------------------------------------------

/**
 * The US layout: `City`, a `State` dropdown of all 50 states, and a five-digit
 * `ZIP code` (which also accepts ZIP+4). State and ZIP share a row.
 */
export const UnitedStates: Story = { args: { country: 'US' } };

/**
 * The UK layout: `Town/City`, a free-text `County`, and a `Postcode` validated
 * against the UK format. The state dropdown is gone — a county is not a closed
 * list — which is the schema, not the markup, changing.
 */
export const UnitedKingdom: Story = { args: { country: 'GB' } };

/**
 * The Canadian layout: a `Province` dropdown and an `A1A 1A1` `Postal code`. A
 * third country, added the same way the first two were — as a schema.
 */
export const Canada: Story = { args: { country: 'CA' } };

/**
 * The three shipped layouts side by side. Only the data differs between them —
 * the same template renders all three — which is what "data-driven" buys.
 */
export const Countries: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 24rem)); gap: 2rem;">
        ${caption('United States', `<ui-address-form country="US" />`)}
        ${caption('United Kingdom', `<ui-address-form country="GB" />`)}
        ${caption('Canada', `<ui-address-form country="CA" />`)}
      </div>`,
  }),
};

// --- State -----------------------------------------------------------------

/**
 * Prefilled from a bound value. `[(value)]` is the no-forms two-way binding — the
 * JSON below is the live control value, updating as you edit.
 */
export const Prefilled: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { value: { ...US_ADDRESS } },
    template: frame(`
      <ui-address-form [(value)]="value" />
      <pre style="font: var(--mat-sys-body-small); background: var(--mat-sys-surface-container);
                  padding: 0.75rem; border-radius: var(--mat-sys-corner-small); overflow: auto;"
      >{{ value | json }}</pre>`),
  }),
};

/** Disabled: every field greys out through the primitives, from one input. */
export const Disabled: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { value: { ...UK_ADDRESS } },
    template: frame(`<ui-address-form [value]="value" disabled />`),
  }),
};

/**
 * `showErrors` reveals every outstanding message at once — the shape a form uses
 * on submit. Each message is the schema’s own, so it reads in the country’s terms
 * (`ZIP code is required.`), and it shows through the field’s normal `error`
 * treatment rather than a class painted on.
 */
export const WithErrors: Story = {
  args: { country: 'US', showErrors: true },
  render: (args) => ({
    props: args,
    template: frame(`<ui-address-form ${argsToTemplate(args)} />`),
  }),
};

// --- Forms -----------------------------------------------------------------

/**
 * `[(ngModel)]` binds the whole address — `ui-address-form` is a
 * `ControlValueAccessor`, so there is no adapter and nothing to reach inside for.
 * Edit any field and watch the model.
 */
export const NgModel: Story = {
  name: 'Forms: [(ngModel)]',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { address: { ...US_ADDRESS } },
    template: frame(`
      <ui-address-form [(ngModel)]="address" />
      <pre style="font: var(--mat-sys-body-small); background: var(--mat-sys-surface-container);
                  padding: 0.75rem; border-radius: var(--mat-sys-corner-small); overflow: auto;"
      >{{ address | json }}</pre>`),
  }),
};

/**
 * The usual reactive-forms shape. The form’s validity is the address form’s own —
 * `validate()` reports the field errors, so the submit button is disabled until
 * every required field is valid. Submitting flips `showErrors` to reveal what is
 * still missing.
 *
 * Press **Save** on the empty form to see it, then fill it in.
 */
export const ReactiveValidation: Story = {
  name: 'Forms: reactive validation',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      control: new FormControl<UiAddress | null>(null, Validators.required),
      submitted: false,
    },
    template: frame(`
      <ui-address-form [formControl]="control" [showErrors]="submitted" />

      <div style="display: flex; align-items: center; gap: 1rem; margin-top: 0.5rem;">
        <button matButton uiButton variant="filled"
                [disabled]="control.invalid" (click)="submitted = true">Save</button>
        <span style="font: var(--mat-sys-body-small);">
          valid: <strong>{{ control.valid }}</strong>
        </span>
      </div>`),
  }),
};

/**
 * `requiredFields` overrides the schema’s own defaults — here every field is
 * optional, so a mostly-empty address is valid. Pass an array to require exactly
 * the fields you need.
 */
export const RequiredFieldsOverride: Story = {
  name: 'requiredFields override',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { none: [] as string[] },
    template: frame(`<ui-address-form country="US" [requiredFields]="none" showErrors />`),
  }),
};

// --- Styling hooks ---------------------------------------------------------

/**
 * `--ui-address-form-columns` sets the grid’s column count. At `1` every field
 * stacks — for a narrow column or a mobile layout — with no `::ng-deep`.
 */
export const SingleColumn: Story = {
  name: 'Styling hooks: --ui-address-form-columns',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(
      `<ui-address-form country="US" style="--ui-address-form-columns: 1;" />`,
      '22rem',
    ),
  }),
};
