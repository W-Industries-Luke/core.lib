import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Mask, UI_MASK_PRESETS } from './mask';

const meta: Meta<Mask> = {
  title: 'Directives/Mask',
  component: Mask,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [Mask, MatFormField, MatLabel, MatHint, MatInput, FormsModule, ReactiveFormsModule],
    }),
  ],
  argTypes: {
    uiMask: {
      control: 'text',
      description: 'A preset name or a literal token pattern (`0` digit, `A` letter, `*` alphanumeric).',
    },
    unmaskedValue: {
      control: 'boolean',
      description: 'Whether the form value is the raw value (default) or the formatted string.',
    },
    placeholderChar: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`uiMask` masks a text input so the **display** is formatted while the **form value** is the',
          'raw, unmasked characters — the split that keeps separators out of the value you store,',
          'validate and submit. It is a **directive on the native `<input matInput>`** (like `uiButton`),',
          'so `matInput`, `<mat-form-field>`, `aria-*` and every native attribute keep working, and it',
          'is the input’s `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]` and `formControlName`',
          'Just Work with no adapter.',
          '',
          'Presets: `phone` (US), `date`, `postcode` (US ZIP/ZIP+4) and `currency`. Anything else is a',
          'literal token pattern. It reformats on every keystroke, paste and backspace — not just on',
          'blur — and keeps the caret where it belongs.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `
      <mat-form-field style="width: 20rem;">
        <mat-label>Value</mat-label>
        <input matInput uiMask="${args.uiMask}" [unmaskedValue]="unmaskedValue"
               placeholderChar="${args.placeholderChar ?? '_'}" #ngModel="ngModel" [(ngModel)]="model" />
        <mat-hint>raw form value: <strong>{{ model || '—' }}</strong></mat-hint>
      </mat-form-field>
    `,
  }),
};

export default meta;
type Story = StoryObj<Mask>;

/** US phone: type `5551234567` — the field shows `(555) 123-4567`, the value stays `5551234567`. */
export const Phone: Story = { args: { uiMask: 'phone', unmaskedValue: true, placeholderChar: '_' } };

/** `MM/DD/YYYY`. Type `12312024`. */
export const Date: Story = { args: { uiMask: 'date', unmaskedValue: true, placeholderChar: '_' } };

/** US ZIP / ZIP+4. Lazy — `12345` is valid, and the `-6789` appears as you type it. */
export const Postcode: Story = { args: { uiMask: 'postcode', unmaskedValue: true, placeholderChar: '_' } };

/** Grouped decimal with a `$` prefix. Type `123456` then `.` then `78`. */
export const Currency: Story = { args: { uiMask: 'currency', unmaskedValue: true, placeholderChar: '_' } };

/**
 * A custom pattern from the token characters: `0` digit, `A` letter, `*`
 * alphanumeric, everything else a literal. Here `AA-0000` for a plate.
 */
export const CustomPattern: Story = {
  args: { uiMask: 'AA-0000', unmaskedValue: true, placeholderChar: '_' },
};

/**
 * Every preset in one place, each in a themed `<mat-form-field>`, each showing the
 * raw value it reports to its form control.
 */
export const AllPresets: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { UI_MASK_PRESETS, values: {} as Record<string, string> },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 20rem;">
        @for (preset of UI_MASK_PRESETS; track preset) {
          <mat-form-field>
            <mat-label>{{ preset }}</mat-label>
            <input matInput [uiMask]="preset" [(ngModel)]="values[preset]" />
            <mat-hint>raw: <strong>{{ values[preset] || '—' }}</strong></mat-hint>
          </mat-form-field>
        }
      </div>
    `,
  }),
};

/**
 * The reactive-forms shape, proving the boundary: the control below holds the raw
 * value while the field shows the mask. Type a phone number and watch the two.
 */
export const ReactiveFormRawValue: Story = {
  name: 'Forms: raw value',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { control: new FormControl('') },
    template: `
      <mat-form-field style="width: 20rem;">
        <mat-label>Phone</mat-label>
        <input matInput uiMask="phone" [formControl]="control" />
        <mat-hint>Formatted display, raw value below.</mat-hint>
      </mat-form-field>
      <p style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface);">
        control.value: <strong>{{ control.value || '—' }}</strong>
      </p>
    `,
  }),
};

/**
 * With `[unmaskedValue]="false"` the form stores the formatted string instead —
 * for the case where the mask *is* the value you want to keep.
 */
export const StoreFormattedValue: Story = {
  name: 'unmaskedValue = false',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { control: new FormControl('') },
    template: `
      <mat-form-field style="width: 20rem;">
        <mat-label>Phone</mat-label>
        <input matInput uiMask="phone" [unmaskedValue]="false" [formControl]="control" />
      </mat-form-field>
      <p style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface);">
        control.value: <strong>{{ control.value || '—' }}</strong>
      </p>
    `,
  }),
};
