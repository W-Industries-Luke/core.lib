import { DatePipe, JsonPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Button } from '../button/button';
import {
  Datepicker,
  DatepickerHint,
  DatepickerToggleIcon,
  type UiDatepickerAppearance,
  type UiDatepickerStartView,
} from './datepicker';

const APPEARANCES: UiDatepickerAppearance[] = ['fill', 'outline'];
const START_VIEWS: UiDatepickerStartView[] = ['month', 'year', 'multi-year'];

// Every date below is relative to the day the stories are opened, so a range is
// always one a reader can actually pick inside — a hard-coded 2024 would open a
// calendar with every cell greyed out.
const today = new Date();
const at = (offsetInDays: number): Date => {
  const date = new Date(today);
  date.setDate(date.getDate() + offsetInDays);
  return date;
};
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

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

const meta: Meta<Datepicker> = {
  title: 'Components/Datepicker',
  component: Datepicker,
  tags: ['autodocs'],
  decorators: [
    // The projection markers, plus the pieces the slot and form stories are built
    // from: Material's button and `<mat-icon>`, and this library's `uiButton` —
    // which needs `MatButton` alongside it, since it decorates Material's button
    // rather than replacing it.
    moduleMetadata({
      imports: [
        Datepicker,
        DatepickerHint,
        DatepickerToggleIcon,
        FormsModule,
        ReactiveFormsModule,
        MatIcon,
        MatButton,
        Button,
        // The form stories print the `Date` they are holding, and the validation
        // story prints the control's errors.
        DatePipe,
        JsonPipe,
      ],
    }),
  ],
  args: {
    label: 'Due date',
    appearance: 'outline',
    disabled: false,
    required: false,
    readonly: false,
    toggle: true,
    touchUi: false,
    startView: 'month',
    floatLabel: 'auto',
    subscriptSizing: 'fixed',
    min: null,
    max: null,
    value: null,
    opened: false,
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    hint: { control: 'text' },
    error: { control: 'text' },
    toggleAriaLabel: { control: 'text' },
    min: { control: 'date' },
    max: { control: 'date' },
    value: { control: 'date' },
    appearance: { control: 'inline-radio', options: APPEARANCES },
    startView: { control: 'inline-radio', options: START_VIEWS },
    floatLabel: { control: 'inline-radio', options: ['auto', 'always'] },
    subscriptSizing: { control: 'inline-radio', options: ['fixed', 'dynamic'] },
    xPosition: { control: 'inline-radio', options: ['start', 'end'] },
    yPosition: { control: 'inline-radio', options: ['above', 'below'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    readonly: { control: 'boolean' },
    toggle: { control: 'boolean' },
    touchUi: { control: 'boolean' },
    opened: { control: 'boolean' },
    valueChange: { action: 'valueChange' },
    openedChange: { action: 'openedChange' },
    // Documented in the table but not knobs: a function control is not something
    // Storybook can offer, and their own stories cover them for real.
    dateFilter: { control: false },
    dateClass: { control: false },
    startAt: { control: false },
    // Its input is aliased to `aria-describedby`, which `argsToTemplate` cannot
    // bind — it writes the class member name. `Native attributes` covers it.
    ariaDescribedby: { name: 'aria-describedby', control: false },
    matFormField: { table: { disable: true } },
    matDatepicker: { table: { disable: true } },
    matDatepickerInput: { table: { disable: true } },
    matInput: { table: { disable: true } },
    inputElement: { table: { disable: true } },
    hasError: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-datepicker` is the shared theme applied to Angular Material’s `<mat-form-field>` around',
          'an `<input matInput [matDatepicker]>`, with Material’s own toggle and calendar, wired as a',
          'form control. Like `ui-input` and unlike `uiButton`, it is a **component** rather than a',
          'directive: a datepicker owns *composition* — a field, a label, an input, a toggle button and',
          'the calendar overlay it opens — and there is no single native element to decorate.',
          '',
          '### Setup: none',
          '',
          'The date adapter is provided **by the component**, so importing `Datepicker` is the whole',
          'setup. There is no `MatNativeDateModule` to remember in an app’s bootstrap, and no',
          '`provideNativeDateAdapter()` either. Dates are native `Date`s.',
          '',
          'What an app may still want to provide at its root — both optional, and both reaching every',
          '`<ui-datepicker>`:',
          '',
          '- `{provide: MAT_DATE_LOCALE, useValue: "en-GB"}` — how dates are printed and parsed, and',
          'which day the week starts on. Defaults to the app’s `LOCALE_ID`.',
          '- `{provide: MAT_DATE_FORMATS, useValue: …}` — the format strings themselves, when the',
          'locale’s defaults are not what a field wants.',
          '',
          'The adapter itself is deliberately **not** overridable from the root: this component’s API is',
          'typed in `Date`, and a Luxon or Moment adapter would have the calendar hand back a `DateTime`',
          'through a signal that claims to be a `Date`. An app that wants a different date library wants',
          'a different control. `provideUiDateAdapter()` is exported for anywhere else that needs the',
          'same wiring.',
          '',
          '### It is Material, not a re-implementation',
          '',
          'The calendar, its overlay and keyboard handling, the toggle, the box, the outline, the',
          'floating label and every colour are Material’s own, resolved from the `--mat-sys-*` tokens',
          'the shared theme emits. There is not a literal colour in `datepicker.scss`, so every story',
          'below renders the exact palette a consuming app gets — toggle your OS light/dark preference',
          'to watch them follow.',
          '',
          '### Forms and validation',
          '',
          '`ui-datepicker` is a `ControlValueAccessor` **and** a `Validator`, so `[(ngModel)]`,',
          '`[formControl]` and `formControlName` work with no adapter — bind the host, not the input',
          'inside it. `[(value)]` is the same state without a forms directive.',
          '',
          '`min`, `max` and `dateFilter` are *enforced*, not just drawn: the calendar greys the dates out',
          'and the bound control gets Material’s own `matDatepickerMin`, `matDatepickerMax`,',
          '`matDatepickerFilter` and `matDatepickerParse` errors. A user can always type past a calendar.',
          'See the **Forms** stories.',
          '',
          '### Errors',
          '',
          '`error` is a string, and the field shows it — and goes red, and flips `aria-invalid` — for',
          'exactly as long as it is set. *When* that is stays with the consumer, because only they know',
          'their validation: see **Forms: reactive validation** for the usual shape.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: frame(`<ui-datepicker ${argsToTemplate(args)} />`),
  }),
};

export default meta;
type Story = StoryObj<Datepicker>;

/**
 * The default field: an outlined box, a label, and Material’s calendar behind the
 * toggle. Pick a date, or type one — both report the same `Date`.
 */
export const Default: Story = {};

/** A field that already holds a date. */
export const WithValue: Story = {
  args: { value: at(14), hint: 'Type a date, or pick one from the calendar.' },
};

// --- Range -----------------------------------------------------------------

/**
 * `min` and `max` bound the field to this month. Open the calendar: everything
 * outside the range is greyed out, and the arrows stop at the edges.
 *
 * The range is enforced rather than merely drawn — a date typed outside it puts
 * `matDatepickerMin` / `matDatepickerMax` on the bound control. See
 * **Forms: range validation**.
 */
export const WithRange: Story = {
  name: 'With min/max range',
  args: {
    label: 'Delivery date',
    min: startOfMonth,
    max: endOfMonth,
    startAt: startOfMonth,
    hint: 'This month only.',
  },
};

/** A range that only has a floor — anything from today onwards. */
export const MinOnly: Story = {
  name: 'With min only',
  args: { label: 'Start date', min: today, hint: 'Today or later.' },
};

/** A range that only has a ceiling — anything up to today. */
export const MaxOnly: Story = {
  name: 'With max only',
  args: { label: 'Date of birth', max: today, startView: 'multi-year', hint: 'Today or earlier.' },
};

/**
 * `dateFilter` decides which dates inside the range can be picked — here,
 * weekdays. Weekends are greyed out in the calendar and report
 * `matDatepickerFilter` if typed.
 */
export const WithDateFilter: Story = {
  name: 'With a date filter',
  args: {
    label: 'Appointment',
    hint: 'Weekdays only.',
    dateFilter: (date: Date | null) => !date || (date.getDay() !== 0 && date.getDay() !== 6),
  },
};

// --- States ----------------------------------------------------------------

/**
 * The field, its toggle and its calendar all go with it — a disabled field whose
 * calendar still opened would be a way around it.
 */
export const Disabled: Story = {
  args: { disabled: true, value: at(14), hint: 'This hint is disabled too.' },
};

/** Every state a disabled field can be in, in both appearances. */
export const DisabledStates: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { value: at(14) },
    template: grid(
      APPEARANCES.flatMap((appearance) =>
        [
          { name: 'empty', bind: '' },
          { name: 'filled', bind: '[value]="value"' },
        ].map(({ name, bind }) =>
          caption(
            `${appearance} · disabled · ${name}`,
            `<ui-datepicker appearance="${appearance}" label="Due date" disabled ${bind} />`,
          ),
        ),
      ).join('\n'),
    ),
  }),
};

/**
 * Not the same as `disabled`: a readonly field stays focusable, stays in the tab
 * order and is still submitted — and its toggle stays live on purpose, so the date
 * can still come from the calendar rather than the keyboard. Add `[toggle]="false"`
 * for a field that is genuinely display-only.
 */
export const Readonly: Story = {
  args: { readonly: true, value: at(14), hint: 'Pick from the calendar; typing is off.' },
};

/** Material’s asterisk on the label, and `aria-required` on the control. */
export const Required: Story = { args: { required: true } };

// --- Error -----------------------------------------------------------------

/**
 * The field shows the message — and goes red, and flips `aria-invalid` — for
 * exactly as long as `error` is set. Clear the `error` control to watch it go back
 * to the hint.
 */
export const WithError: Story = {
  args: {
    label: 'Start date',
    value: at(-30),
    min: today,
    error: 'Pick a date from today onwards.',
  },
};

/**
 * Material renders one subscript message: the error replaces the hint rather than
 * stacking on it. Both fields below have the same hint.
 */
export const ErrorReplacesHint: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { value: at(-30) },
    template: grid(
      [
        caption('hint', `<ui-datepicker label="Start date" hint="Today or later." />`),
        caption(
          'hint + error',
          `<ui-datepicker label="Start date" hint="Today or later." [value]="value"
             error="Pick a date from today onwards." />`,
        ),
      ].join('\n'),
    ),
  }),
};

/** The error state in both appearances — the red is M3’s `error` role, in either box. */
export const ErrorAppearances: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { value: at(-30) },
    template: grid(
      APPEARANCES.map((appearance) =>
        caption(
          `${appearance} · error`,
          `<ui-datepicker appearance="${appearance}" label="Start date" [value]="value"
             error="Pick a date from today onwards." />`,
        ),
      ).join('\n'),
    ),
  }),
};

// --- Appearance ------------------------------------------------------------

/** This library’s default: M3’s outlined box. */
export const Outline: Story = { args: { appearance: 'outline', value: at(14) } };

/** Material’s own default: the filled box, for a form on a plain surface. */
export const Fill: Story = { args: { appearance: 'fill', value: at(14) } };

/**
 * Both appearances, empty and filled. Neither carries a colour of its own — the
 * container, the outline, the label and the toggle icon all resolve from the
 * theme’s M3 tokens.
 */
export const Appearances: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { value: at(14) },
    template: grid(
      APPEARANCES.flatMap((appearance) =>
        [
          { name: 'empty', bind: '' },
          { name: 'filled', bind: '[value]="value"' },
        ].map(({ name, bind }) =>
          caption(
            `${appearance} · ${name}`,
            `<ui-datepicker appearance="${appearance}" label="Due date" ${bind} />`,
          ),
        ),
      ).join('\n'),
    ),
  }),
};

// --- The calendar ----------------------------------------------------------

/**
 * `startView` decides which view opens first. `multi-year` is the one a date far
 * from today wants — a birthday reached through `month` is two dozen taps of the
 * back arrow.
 */
export const StartViews: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      START_VIEWS.map((view) =>
        caption(
          `startView="${view}"`,
          `<ui-datepicker label="Date of birth" startView="${view}" />`,
        ),
      ).join('\n'),
      3,
    ),
  }),
};

/**
 * `touchUi` opens the calendar as a modal dialog with larger touch targets instead
 * of a dropdown — for the phone, where a dropdown’s cells are smaller than a
 * fingertip.
 */
export const TouchUi: Story = {
  name: 'touchUi',
  args: { touchUi: true, hint: 'Open the calendar — it is a dialog, not a dropdown.' },
};

/**
 * `[(opened)]` is two-way state, not a write-only command: Material owns *when* the
 * calendar closes — a click outside, Escape, a date picked — and the binding hears
 * about all of it. That is what lets a button of your own drive the calendar and
 * stay in step.
 */
export const OpenedBinding: Story = {
  name: 'Two-way [(opened)]',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { open: false },
    template: frame(`
      <ui-datepicker label="Due date" [(opened)]="open" [toggle]="false"
                     hint="The toggle is off — this calendar is opened from the button." />

      <button matButton uiButton variant="outlined" (click)="open = !open">
        {{ open ? 'Close' : 'Open' }} the calendar
      </button>

      <p style="font: var(--mat-sys-body-small);">opened: <strong>{{ open }}</strong></p>`),
  }),
};

// --- Toggle ----------------------------------------------------------------

/**
 * `[toggle]="false"` leaves a text-only date field — the shape a keyboard-first
 * form sometimes wants. The calendar is still reachable from `matDatepicker()` for
 * a toggle of your own; see **Two-way [(opened)]**.
 */
export const WithoutToggle: Story = {
  name: 'Without the toggle',
  args: { toggle: false, placeholder: 'MM/DD/YYYY', floatLabel: 'always' },
};

/**
 * Rule 7: project a `uiDatepickerToggleIcon` element to replace the calendar icon.
 * It lands *inside* Material’s own button, so it keeps the ripple, the focus ring
 * and the accessible name.
 */
export const CustomToggleIcon: Story = {
  name: 'Custom toggle icon',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-datepicker label="Event date">
        <mat-icon uiDatepickerToggleIcon>event_available</mat-icon>
      </ui-datepicker>`),
  }),
};

/**
 * “Open calendar” three times over tells a screen-reader user which button they
 * are on but not which date it picks — so name the toggle when a page has several
 * date fields. Unset, it falls back to Material’s own translated label.
 */
export const ToggleAriaLabel: Story = {
  name: 'Naming the toggle',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      [
        caption('default — “Open calendar”', `<ui-datepicker label="Start date" />`),
        caption(
          'toggleAriaLabel',
          `<ui-datepicker label="End date" toggleAriaLabel="Choose an end date" />`,
        ),
      ].join('\n'),
    ),
  }),
};

// --- Hint ------------------------------------------------------------------

/**
 * `hint` is the help under the field — the format expected, the range allowed.
 * Material points the control’s `aria-describedby` at it, so it is announced with
 * the field rather than stranded next to it.
 */
export const WithHint: Story = { args: { hint: 'The date the invoice falls due.' } };

/**
 * Rule 7: a string cannot spell a link, so project a `uiDatepickerHint` element for
 * a hint that needs one. It replaces the `hint` string, and Material announces it
 * with the control exactly the same way.
 */
export const ProjectedHint: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-datepicker label="Return date">
        <span uiDatepickerHint>See the <a href="#">refund policy</a> before choosing.</span>
      </ui-datepicker>`),
  }),
};

// --- Forms -----------------------------------------------------------------

/**
 * `[(ngModel)]` binds the host — no adapter, no reaching for the input inside it.
 * The value is a `Date`, or `null` when the field is empty or what is typed is not
 * a date.
 */
export const FormsNgModel: Story = {
  name: 'Forms: [(ngModel)]',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { due: null },
    template: frame(`
      <ui-datepicker label="Due date" [(ngModel)]="due" hint="Pick a date, or type one." />

      <p style="font: var(--mat-sys-body-small);">
        due: <strong>{{ due ? (due | date: 'fullDate') : 'null' }}</strong>
      </p>`),
  }),
};

/**
 * `[(value)]` is the same state without a forms directive — for a filter on a
 * report, or a date on a dashboard, where `[(ngModel)]` would be a directive
 * dragged in for one binding.
 */
export const FormsValue: Story = {
  name: 'Forms: [(value)]',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { from: at(-7) },
    template: frame(`
      <ui-datepicker label="Showing results from" [(value)]="from" />

      <p style="font: var(--mat-sys-body-small);">
        from: <strong>{{ from ? (from | date: 'mediumDate') : 'null' }}</strong>
      </p>`),
  }),
};

/**
 * The reason this component is a `Validator`: a user can always type past a
 * calendar, so a range that is only drawn is not enforced. Type a date before
 * today (or after next month) rather than picking one — the control reports
 * Material’s own `matDatepickerMin` / `matDatepickerMax`, and the `error` below is
 * a ternary over it.
 *
 * Typing something that is not a date at all reports `matDatepickerParse` the same
 * way.
 */
export const FormsRangeValidation: Story = {
  name: 'Forms: range validation',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { control: new FormControl<Date | null>(null), min: today, max: endOfMonth },
    template: frame(`
      <ui-datepicker
        label="Delivery date"
        [formControl]="control"
        [min]="min"
        [max]="max"
        hint="Between today and the end of the month."
        [error]="
          control.hasError('matDatepickerMin') ? 'That is in the past — pick today or later.' :
          control.hasError('matDatepickerMax') ? 'That is too far out — pick a date this month.' :
          control.hasError('matDatepickerParse') ? 'That is not a date we can read.' : ''
        "
      />

      <p style="font: var(--mat-sys-body-small); margin: 0;">
        valid: <strong>{{ control.valid }}</strong> ·
        errors: <strong>{{ (control.errors | json) || 'none' }}</strong>
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
    props: { control: new FormControl({ value: at(14), disabled: true }) },
    template: frame(`
      <ui-datepicker label="Due date" [formControl]="control"
                     hint="Disabled by the form, not the template." />

      <button matButton uiButton variant="outlined"
              (click)="control.enabled ? control.disable() : control.enable()">
        Toggle
      </button>`),
  }),
};

// --- Native attributes -----------------------------------------------------

/**
 * Rule 3. Everything this component does not name is moved onto the real
 * `<input>` — inspect the DOM here: `tabindex`, `data-*` and `aria-label` are all
 * on the control, not stranded on the wrapper.
 *
 * `id`, `name`, `readonly`, `required` and `aria-describedby` have inputs of their
 * own instead, because Material’s own host bindings own those attributes on the
 * input — a forwarded one would be overwritten on the next change detection.
 * `aria-describedby` is merged with the hint’s id rather than replacing it, so both
 * are announced.
 */
export const NativeAttributes: Story = {
  name: 'Native attributes',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <p id="terms" style="font: var(--mat-sys-body-small); margin: 0 0 0.5rem;">
        Invoices are due 30 days after issue.
      </p>

      <ui-datepicker
        label="Due date"
        id="invoice-due"
        name="due"
        data-testid="invoice-due"
        aria-describedby="terms"
        hint="Both this hint and the note above are announced with the field."
      />`),
  }),
};

// --- Styling hooks ---------------------------------------------------------

/**
 * `<ui-datepicker>` is a block and the field fills it, so sizing one is an ordinary
 * rule on an ordinary selector — no `::ng-deep`, no `!important`. Set the width on
 * the host; reach for `--ui-datepicker-width` only when the field should not fill
 * it.
 *
 * The toggle icon has hooks of its own. Both default to the very tokens Material
 * would have used, so point them at an M3 role rather than a literal and they
 * survive a palette change and dark mode. The calendar itself renders in an overlay
 * at the document root — outside this host, where a custom property set here cannot
 * reach it — so recolour that through `[panelClass]`, or through a
 * `mat.datepicker-overrides()` in the shared theme if it should apply everywhere.
 */
export const StylingHooks: Story = {
  name: 'Styling hooks',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; max-width: 34rem;">
        <ui-datepicker label="Sized by the host" style="width: 12rem;" />

        <ui-datepicker label="Sized by the hook" style="--ui-datepicker-width: max-content;"
                       hint="max-content — the field shrinks to Material’s own intrinsic width." />

        <div style="display: flex; gap: 1rem;">
          <ui-datepicker label="From" style="flex: 1;" />
          <ui-datepicker label="To" style="flex: 1;" />
        </div>

        <ui-datepicker
          label="Recoloured toggle"
          style="--ui-datepicker-toggle-icon-color: var(--mat-sys-tertiary);
                 --ui-datepicker-toggle-active-icon-color: var(--mat-sys-error);"
          hint="--ui-datepicker-toggle-icon-color, and -active-icon-color while open."
        />
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
    props: { value: at(14), past: at(-30), min: today, max: endOfMonth },
    template: `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 18rem)); gap: 1rem 1.5rem;">
        ${APPEARANCES.flatMap((appearance) =>
          [
            { name: 'default', attrs: '' },
            { name: 'filled', attrs: '[value]="value"' },
            { name: 'placeholder', attrs: 'placeholder="MM/DD/YYYY" floatLabel="always"' },
            { name: 'hint', attrs: 'hint="The date the invoice falls due."' },
            { name: 'range', attrs: '[min]="min" [max]="max" hint="Today to end of month."' },
            {
              name: 'error',
              attrs: '[value]="past" [min]="min" error="Pick a date from today onwards."',
            },
            { name: 'required', attrs: 'required' },
            { name: 'disabled', attrs: 'disabled [value]="value"' },
            { name: 'readonly', attrs: 'readonly [value]="value"' },
            { name: 'no toggle', attrs: '[toggle]="false" [value]="value"' },
          ].map(({ name, attrs }) =>
            caption(
              `${appearance} · ${name}`,
              `<ui-datepicker appearance="${appearance}" label="Due date" ${attrs} />`,
            ),
          ),
        ).join('')}
      </div>`,
  }),
};
