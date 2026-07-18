import { JsonPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { DateRange } from '@angular/material/datepicker';
import {
  applicationConfig,
  argsToTemplate,
  moduleMetadata,
  type Meta,
  type StoryObj,
} from '@storybook/angular-vite';

import {
  DateRangePicker,
  type UiDateRangePickerAppearance,
  type UiDateRangePreset,
} from './date-range-picker';

const APPEARANCES: UiDateRangePickerAppearance[] = ['fill', 'outline'];

// Every date below is relative to the day the stories are opened, so a range is
// always one a reader can actually pick inside — a hard-coded 2024 would open a
// calendar with every cell greyed out.
const today = new Date();
const at = (offsetInDays: number): Date => {
  const date = new Date(today);
  date.setDate(date.getDate() + offsetInDays);
  return date;
};

/** Fields are full-width by nature, so every story renders in a form-ish column. */
const frame = (content: string, width = '26rem') =>
  `<div style="max-width: ${width}; display: flex; flex-direction: column;">${content}</div>`;

/** Captions a grid cell, so a story is readable without opening the source. */
const caption = (text: string, content: string) => `
  <div style="display: flex; flex-direction: column;">
    ${content}
    <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${text}</span>
  </div>`;

const grid = (content: string, columns = 2) => `
  <div style="display: grid; grid-template-columns: repeat(${columns}, minmax(0, 22rem)); gap: 1.5rem;">
    ${content}
  </div>`;

const meta: Meta<DateRangePicker> = {
  title: 'Components/DateRangePicker',
  component: DateRangePicker,
  tags: ['autodocs'],
  decorators: [
    // Unlike `ui-datepicker`, this component does NOT provide a date adapter — it
    // is generic over the date type, so a consumer (here, Storybook) supplies one.
    // Without this every story throws "No provider found for DateAdapter".
    applicationConfig({ providers: [provideNativeDateAdapter()] }),
    moduleMetadata({
      imports: [DateRangePicker, FormsModule, ReactiveFormsModule, JsonPipe],
    }),
  ],
  args: {
    label: 'Date range',
    appearance: 'fill',
    startPlaceholder: 'Start date',
    endPlaceholder: 'End date',
    separator: '–',
    disabled: false,
    required: false,
    touchUi: false,
    min: null,
    max: null,
    value: null,
  },
  argTypes: {
    label: { control: 'text' },
    startPlaceholder: { control: 'text' },
    endPlaceholder: { control: 'text' },
    separator: { control: 'text' },
    presetsAriaLabel: { control: 'text' },
    appearance: { control: 'inline-radio', options: APPEARANCES },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    touchUi: { control: 'boolean' },
    min: { control: 'date' },
    max: { control: 'date' },
    // A range/function value is not something Storybook's knobs can offer; the
    // dedicated stories below cover them for real.
    value: { control: false },
    presets: { control: false },
    dateFilter: { control: false },
    valueChange: { action: 'valueChange' },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-date-range-picker` is the shared theme applied to Angular Material’s',
          '`<mat-date-range-input>` / `<mat-date-range-picker>`, wired as a single reactive-forms',
          'control whose value is a `DateRange`, with an optional `mat-chip-listbox` of preset ranges',
          'beside the field. Like `ui-datepicker` it is a **component**, not a directive: it owns the',
          'composition of a field, two inputs, a toggle and the calendar overlay.',
          '',
          '### Setup: provide a `DateAdapter`',
          '',
          'Unlike `ui-datepicker`, this component does **not** provide a date adapter, so an app must',
          'supply one at its root — `provideNativeDateAdapter()` for native `Date`s, or the equivalent',
          'for another date library. These stories do exactly that in their Storybook config.',
          '',
          '### It is Material, not a re-implementation',
          '',
          'The calendar, overlay, keyboard handling and every colour are Material’s own, resolved from',
          'the `--mat-sys-*` tokens the shared theme emits — there is not a literal colour in',
          '`date-range-picker.scss`. Toggle your OS light/dark preference to watch the stories follow.',
        ].join('\n'),
      },
    },
  },
};
export default meta;
type Story = StoryObj<DateRangePicker>;

/** The default: seven built-in presets beside a fill-appearance field. */
export const Default: Story = {
  render: (args) => ({
    props: args,
    template: frame(`<ui-date-range-picker ${argsToTemplate(args)} />`),
  }),
};

export const Appearances: Story = {
  parameters: { controls: { disable: true } },
  render: (args) => ({
    props: args,
    template: grid(
      APPEARANCES.map((appearance) =>
        caption(
          appearance,
          `<ui-date-range-picker ${argsToTemplate({ ...args, appearance })} />`,
        ),
      ).join(''),
    ),
  }),
};

/** A range can be seeded — the field shows both endpoints and the calendar opens on them. */
export const WithValue: Story = {
  args: { value: new DateRange(at(-7), at(0)) },
  render: (args) => ({
    props: args,
    template: frame(`<ui-date-range-picker ${argsToTemplate(args)} />`),
  }),
};

/** Passing `[presets]="[]"` drops the chip row and leaves just the field. */
export const NoPresets: Story = {
  args: { presets: [] },
  render: (args) => ({
    props: args,
    template: frame(`<ui-date-range-picker ${argsToTemplate(args)} />`),
  }),
};

/** Presets are data: a `label` plus a `range` built lazily through the ambient adapter. */
export const CustomPresets: Story = {
  args: {
    presets: [
      { label: 'This week', range: () => new DateRange<Date>(at(-6), at(0)) },
      { label: 'Next 2 weeks', range: () => new DateRange<Date>(at(0), at(14)) },
      { label: 'This quarter', range: () => new DateRange<Date>(at(-45), at(45)) },
    ] as UiDateRangePreset<Date>[],
  },
  render: (args) => ({
    props: args,
    template: frame(`<ui-date-range-picker ${argsToTemplate(args)} />`),
  }),
};

/** `min`/`max` bound the calendar; dates outside the window are unselectable. */
export const MinMax: Story = {
  args: { min: at(-14), max: at(14), presets: [] },
  render: (args) => ({
    props: args,
    template: frame(`<ui-date-range-picker ${argsToTemplate(args)} />`),
  }),
};

/** A `dateFilter` greys out individual days — here, weekends. */
export const DateFilter: Story = {
  args: {
    presets: [],
    dateFilter: (d: Date | null) => {
      const day = (d ?? new Date()).getDay();
      return day !== 0 && day !== 6;
    },
  },
  render: (args) => ({
    props: args,
    template: frame(`<ui-date-range-picker ${argsToTemplate(args)} />`),
  }),
};

export const Disabled: Story = {
  args: { disabled: true, value: new DateRange(at(-7), at(0)) },
  render: (args) => ({
    props: args,
    template: frame(`<ui-date-range-picker ${argsToTemplate(args)} />`),
  }),
};

/** The overlay opens as a full-screen dialog on touch, via `touchUi`. */
export const TouchUi: Story = {
  args: { touchUi: true, presets: [] },
  render: (args) => ({
    props: args,
    template: frame(`<ui-date-range-picker ${argsToTemplate(args)} />`),
  }),
};

/** A consumer's `<mat-hint>` and `<mat-error>` project straight through the field. */
export const WithHintAndError: Story = {
  args: { required: true, presets: [] },
  render: (args) => ({
    props: args,
    template: frame(`
      <ui-date-range-picker ${argsToTemplate(args)}>
        <mat-hint>Pick a start and an end date</mat-hint>
      </ui-date-range-picker>`),
  }),
};

/**
 * Reactive forms Just Work — no adapter. The control below is `required`, so it
 * is invalid until a complete range is picked; the live dump tracks value/status.
 */
export const ReactiveForm: Story = {
  parameters: { controls: { disable: true } },
  render: () => {
    const control = new FormControl<DateRange<Date> | null>(null, Validators.required);
    return {
      props: { control },
      template: frame(`
        <ui-date-range-picker label="Reporting period" [formControl]="control">
          <mat-hint>Reactive forms, no adapter needed</mat-hint>
          <mat-error>A complete range is required</mat-error>
        </ui-date-range-picker>
        <pre style="font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant);">status: {{ control.status }}
value: {{ control.value | json }}</pre>`),
    };
  },
};

/** `[(value)]` two-way binds the range; the panel below echoes the model. */
export const TwoWayBinding: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { value: null as DateRange<Date> | null },
    template: frame(`
      <ui-date-range-picker label="Trip dates" [(value)]="value" [presets]="[]" />
      <pre style="font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant);">start: {{ value?.start | json }}
end: {{ value?.end | json }}</pre>`),
  }),
};
