import { FormsModule, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, waitFor } from 'storybook/test';

import { Button } from '../button/button';
import {
  Input,
  InputHint,
  InputPrefix,
  InputSuffix,
  type UiInputAppearance,
  type UiInputType,
} from './input';

const TYPES: UiInputType[] = ['text', 'email', 'password'];
const APPEARANCES: UiInputAppearance[] = ['fill', 'outline'];

/** What each type is actually for, said in the field itself. */
const TYPE_FIELDS: Record<UiInputType, { label: string; placeholder: string; hint: string }> = {
  text: {
    label: 'Full name',
    placeholder: 'Ada Lovelace',
    hint: 'As it appears on your ID.',
  },
  email: {
    label: 'Email',
    placeholder: 'name@example.com',
    hint: 'We only use this to sign you in.',
  },
  password: {
    label: 'Password',
    placeholder: 'At least 12 characters',
    hint: 'Use a passphrase you have not used elsewhere.',
  },
};

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

const meta: Meta<Input> = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
  decorators: [
    // The projection markers, plus the pieces the slot and form stories are
    // built from: Material's buttons and `<mat-icon>`, and this library's
    // `uiButton` — which needs `MatButton` alongside it, since it decorates
    // Material's button rather than replacing it.
    moduleMetadata({
      imports: [
        Input,
        InputPrefix,
        InputSuffix,
        InputHint,
        FormsModule,
        ReactiveFormsModule,
        MatIcon,
        MatButton,
        MatIconButton,
        Button,
      ],
    }),
  ],
  args: {
    label: 'Email',
    type: 'text',
    appearance: 'outline',
    disabled: false,
    required: false,
    readonly: false,
    hideRequiredMarker: false,
    floatLabel: 'auto',
    subscriptSizing: 'fixed',
    value: '',
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    hint: { control: 'text' },
    error: { control: 'text' },
    type: { control: 'inline-radio', options: TYPES },
    appearance: { control: 'inline-radio', options: APPEARANCES },
    floatLabel: { control: 'inline-radio', options: ['auto', 'always'] },
    subscriptSizing: { control: 'inline-radio', options: ['fixed', 'dynamic'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    readonly: { control: 'boolean' },
    hideRequiredMarker: { control: 'boolean' },
    value: { control: 'text' },
    valueChange: { action: 'valueChange' },
    // Documented in the table but not a knob: its input is aliased to
    // `aria-describedby`, which `argsToTemplate` cannot bind — it writes the
    // class member name. The `Native attributes` story covers it for real.
    ariaDescribedby: { name: 'aria-describedby', control: false },
    matFormField: { table: { disable: true } },
    matInput: { table: { disable: true } },
    inputElement: { table: { disable: true } },
    hasError: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-input` is the shared theme applied to Angular Material’s `<mat-form-field>` around an',
          '`<input matInput>`, wired as a form control. Like `ui-card` and unlike `uiButton`, it is a',
          '**component** rather than a directive: a field owns *composition* — a container, a floating',
          'label, the control, and a subscript that is either a hint or an error — and there is no',
          'single native element to decorate.',
          '',
          '### It is Material, not a re-implementation',
          '',
          'The box, the outline, the floating label and its animation, the focus ring and every colour',
          'are `<mat-form-field>`’s own, resolved from the `--mat-sys-*` tokens the shared theme emits.',
          'There is not a literal colour in `input.scss`, so every story below renders the exact',
          'palette a consuming app gets — toggle your OS light/dark preference to watch them follow.',
          '',
          'That includes the label association: `<mat-label>` and `<input matInput>` wire themselves',
          'together, so clicking a label focuses its field and a screen reader reads the two as one',
          'control. Try it on any story here.',
          '',
          '### Forms',
          '',
          '`ui-input` is a `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]` and',
          '`formControlName` work with no adapter — bind the host, not the input inside it. `[(value)]`',
          'is the same state without a forms directive. See the **Forms** stories.',
          '',
          '### Errors',
          '',
          '`error` is a string, and the field shows it — and goes red, and flips `aria-invalid` — for',
          'exactly as long as it is set. *When* that is stays with the consumer, because only they know',
          'their validation: see **Forms: reactive validation** for the usual shape.',
          '',
          '### Native attributes reach the real input',
          '',
          'Anything this component does not name — `autocomplete`, `maxlength`, `inputmode`, `aria-*`,',
          '`data-*`, `tabindex` — is moved from `<ui-input>` onto the `<input>` inside it, so a wrapper',
          'is not where attributes go to die.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: frame(`<ui-input ${argsToTemplate(args)} />`),
  }),
};

export default meta;
type Story = StoryObj<Input>;

/** The default field: `text`, `outline`, with a label and nothing else. */
export const Default: Story = {};

// --- Types -----------------------------------------------------------------

/** The default. Anything that is just words. */
export const Text: Story = { args: { ...TYPE_FIELDS.text, type: 'text' } };

/**
 * Swaps the on-screen keyboard for one with `@` on it and turns on the browser’s
 * own email validation.
 */
export const Email: Story = { args: { ...TYPE_FIELDS.email, type: 'email' } };

/**
 * Masks the value, and is what tells a password manager this is a field worth
 * filling. Pair it with `autocomplete="current-password"` or `"new-password"` so
 * the manager knows which.
 */
export const Password: Story = {
  args: { ...TYPE_FIELDS.password, type: 'password', value: 'correct horse battery staple' },
};

/** Every type together — the set a consumer is choosing between. */
export const Types: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      TYPES.map((type) =>
        caption(
          `type="${type}"`,
          `<ui-input type="${type}" label="${TYPE_FIELDS[type].label}"
             placeholder="${TYPE_FIELDS[type].placeholder}" value="${
               type === 'password' ? 'hunter2hunter2' : ''
             }" />`,
        ),
      ).join('\n'),
      3,
    ),
  }),
};

// --- Appearances -----------------------------------------------------------

/** This library’s default: M3’s outlined box. */
export const Outline: Story = { args: { appearance: 'outline', ...TYPE_FIELDS.email } };

/** Material’s own default: the filled box, for a form on a plain surface. */
export const Fill: Story = { args: { appearance: 'fill', ...TYPE_FIELDS.email } };

/**
 * Both appearances, empty and filled. Neither carries a colour of its own — the
 * container, the outline and the label all resolve from the theme’s M3 tokens.
 */
export const Appearances: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      APPEARANCES.flatMap((appearance) =>
        ['', 'ada@example.com'].map((value) =>
          caption(
            `appearance="${appearance}"${value ? ' · filled' : ' · empty'}`,
            `<ui-input appearance="${appearance}" label="Email" value="${value}" />`,
          ),
        ),
      ).join('\n'),
    ),
  }),
};

// --- Hint ------------------------------------------------------------------

/**
 * `hint` is the help under the field — a format, a rule, a reassurance. Material
 * points the control’s `aria-describedby` at it, so it is announced with the
 * field rather than stranded next to it.
 */
export const WithHint: Story = { args: { ...TYPE_FIELDS.email } };

/**
 * Rule 7: a string cannot spell a link, so project a `uiInputHint` element for a
 * hint that needs one. It replaces the `hint` string, and Material announces it
 * with the control exactly the same way.
 */
export const ProjectedHint: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-input label="API token">
        <span uiInputHint>Generate one in <a href="#">Settings → Tokens</a>.</span>
      </ui-input>`),
  }),
};

// --- Error -----------------------------------------------------------------

/**
 * The field shows the message — and goes red, and flips `aria-invalid` — for
 * exactly as long as `error` is set. Clear the `error` control to watch it go
 * back to the hint.
 */
export const WithError: Story = {
  args: {
    ...TYPE_FIELDS.email,
    value: 'ada@',
    error: 'Enter an email address like name@example.com.',
  },
  // Guards the regression this story exists to prevent (issue #122): the `error`
  // arg must reach the `[error]` input, so the `<mat-error>` renders and the
  // field goes into Material's own invalid state. A smoke-render alone passes
  // even when the message is missing, so this asserts it is actually there.
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    // The message renders as Material's own `<mat-error>`…
    await waitFor(() => {
      const error = canvasElement.querySelector('mat-error');
      expect(error).not.toBeNull();
      expect(error!.textContent!.trim()).toBe('Enter an email address like name@example.com.');
    });

    // …and the field is in Material's own invalid state, not merely painted red.
    expect(canvasElement.querySelector('.mat-form-field-invalid')).not.toBeNull();
    expect(canvasElement.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');

    // The error replaces the hint rather than stacking on it.
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
    template: grid(
      [
        caption(
          'hint',
          `<ui-input label="Email" hint="${TYPE_FIELDS.email.hint}" value="ada@example.com" />`,
        ),
        caption(
          'hint + error',
          `<ui-input label="Email" hint="${TYPE_FIELDS.email.hint}" value="ada@"
             error="Enter an email address like name@example.com." />`,
        ),
      ].join('\n'),
    ),
  }),
};

/** The error state in both appearances — the red is M3’s `error` role, in either box. */
export const ErrorAppearances: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      APPEARANCES.map((appearance) =>
        caption(
          `appearance="${appearance}"`,
          `<ui-input appearance="${appearance}" label="Email" value="ada@"
             error="Enter a valid email address." />`,
        ),
      ).join('\n'),
    ),
  }),
};

// --- State -----------------------------------------------------------------

/** A disabled field: not editable, not focusable, not submitted. */
export const Disabled: Story = { args: { ...TYPE_FIELDS.email, value: 'ada@example.com', disabled: true } };

/** Disabled in both appearances, empty and filled. */
export const DisabledStates: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      APPEARANCES.flatMap((appearance) =>
        ['', 'ada@example.com'].map((value) =>
          caption(
            `appearance="${appearance}"${value ? ' · filled' : ' · empty'}`,
            `<ui-input appearance="${appearance}" label="Email" value="${value}" disabled
               hint="Hints grey out too." />`,
          ),
        ),
      ).join('\n'),
    ),
  }),
};

/**
 * `readonly` is not `disabled`: the value can be read, selected, copied and
 * submitted, and the field stays in the tab order and is announced normally. It
 * is the one to reach for when a value is *shown* rather than *unavailable*.
 */
export const Readonly: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      [
        caption('readonly', `<ui-input label="Account ID" value="acct_8Hy2" readonly />`),
        caption('disabled', `<ui-input label="Account ID" value="acct_8Hy2" disabled />`),
      ].join('\n'),
    ),
  }),
};

/**
 * `required` adds Material’s asterisk and sets `aria-required`. It says the field
 * is required; it does not enforce it — Angular’s own `required` validator matches
 * the same attribute on `<ui-input [(ngModel)] required>`, so writing it once gets
 * both.
 */
export const Required: Story = { args: { ...TYPE_FIELDS.email, required: true } };

/** `hideRequiredMarker` drops the asterisk on a form where everything is required. */
export const HideRequiredMarker: Story = {
  args: { ...TYPE_FIELDS.email, required: true, hideRequiredMarker: true },
};

// --- Label and placeholder -------------------------------------------------

/**
 * A placeholder is not a label: it disappears the moment someone types. Use it
 * for the *shape* of an answer over a `label` that says which answer it wants.
 *
 * Note the pairing — with the default `floatLabel="auto"` the label sits where
 * the placeholder would be, so the placeholder only appears once the field has
 * focus. `floatLabel="always"` (below) is how to show both at rest.
 */
export const WithPlaceholder: Story = {
  args: { label: 'Email', placeholder: 'name@example.com' },
};

/** `floatLabel="always"` keeps the label up, so the placeholder is visible at rest. */
export const FloatLabelAlways: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      (['auto', 'always'] as const)
        .map((floatLabel) =>
          caption(
            `floatLabel="${floatLabel}"`,
            `<ui-input label="Email" placeholder="name@example.com" floatLabel="${floatLabel}" />`,
          ),
        )
        .join('\n'),
    ),
  }),
};

// --- Subscript sizing ------------------------------------------------------

/**
 * `fixed` (Material’s default) reserves the subscript line always, so a row of
 * fields does not jump when one shows an error. `dynamic` gives the space back —
 * for a field standing on its own, where nothing below it would move.
 *
 * The dashed rule marks where the next element starts.
 */
export const SubscriptSizing: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      (['fixed', 'dynamic'] as const)
        .map((sizing) =>
          caption(
            `subscriptSizing="${sizing}"`,
            `<div>
               <ui-input label="Email" subscriptSizing="${sizing}" />
               <div style="border-top: 1px dashed var(--mat-sys-outline);"></div>
             </div>`,
          ),
        )
        .join('\n'),
    ),
  }),
};

// --- Slots -----------------------------------------------------------------

/**
 * Rule 7: `uiInputPrefix` and `uiInputSuffix` project into Material’s own icon
 * slots, inside the field’s box — for a search glyph, a unit, or a real button.
 */
export const PrefixAndSuffix: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      [
        caption(
          'uiInputPrefix',
          `<ui-input label="Search"><mat-icon uiInputPrefix>search</mat-icon></ui-input>`,
        ),
        caption(
          'uiInputSuffix',
          `<ui-input label="Email" value="ada@example.com">
             <mat-icon uiInputSuffix>check_circle</mat-icon>
           </ui-input>`,
        ),
        caption(
          'both',
          `<ui-input label="Amount" value="42.00">
             <mat-icon uiInputPrefix>payments</mat-icon>
             <mat-icon uiInputSuffix>euro</mat-icon>
           </ui-input>`,
        ),
      ].join('\n'),
      3,
    ),
  }),
};

/**
 * The slot takes any content, so a field that needs a control can carry a real
 * one — no extra input, no `::ng-deep`. This is Material’s own `matIconButton`,
 * and the type it toggles is `ui-input`’s own `type` input.
 */
export const PasswordReveal: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { shown: false },
    template: frame(`
      <ui-input
        label="Password"
        [type]="shown ? 'text' : 'password'"
        value="correct horse battery staple"
        hint="Use a passphrase you have not used elsewhere."
      >
        <button
          matIconButton
          uiInputSuffix
          type="button"
          (click)="shown = !shown"
          [attr.aria-label]="shown ? 'Hide password' : 'Show password'"
          [attr.aria-pressed]="shown"
        >
          <mat-icon>{{ shown ? 'visibility_off' : 'visibility' }}</mat-icon>
        </button>
      </ui-input>`),
  }),
};

// --- Forms -----------------------------------------------------------------

/**
 * `[(ngModel)]` binds the host — `ui-input` is a `ControlValueAccessor`, so there
 * is no adapter and nothing to reach inside for (rule 5). Type in the field and
 * watch the model.
 */
export const NgModel: Story = {
  name: 'Forms: [(ngModel)]',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { email: 'ada@example.com' },
    template: frame(`
      <ui-input label="Email" type="email" [(ngModel)]="email" />
      <p style="font: var(--mat-sys-body-small); margin: 0;">
        email: <strong>{{ email }}</strong>
      </p>`),
  }),
};

/**
 * The same state without a forms directive: `[(value)]` is a `model()` (rule 5),
 * for a filter box or a search field where `[(ngModel)]` would be a directive
 * dragged in for one binding.
 *
 * `exportAs: 'uiInput'` hands the component back, so the button below is just
 * `field.value.set('')` — no host code at all.
 */
export const TwoWayValue: Story = {
  name: 'Forms: [(value)] and exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { filter: 'ada' },
    template: frame(`
      <ui-input #field="uiInput" label="Filter" [(value)]="filter">
        <mat-icon uiInputPrefix>search</mat-icon>
      </ui-input>

      <button matButton uiButton variant="outlined" (click)="field.value.set('')">Clear</button>

      <p style="font: var(--mat-sys-body-small); margin: 0.5rem 0 0;">
        value: <strong>{{ field.value() }}</strong>
      </p>`),
  }),
};

/**
 * The usual shape for a reactive form. `error` is a string this library shows on
 * demand — *when* to show it is the consumer’s call, because only they know their
 * validation. Here it waits for a blur, which is the convention for a field the
 * user has not finished with yet.
 *
 * Blur the empty field, then type `ada@` and blur again.
 */
export const ReactiveValidation: Story = {
  name: 'Forms: reactive validation',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { control: new FormControl('', [Validators.required, Validators.email]) },
    template: frame(`
      <ui-input
        label="Email"
        type="email"
        required
        hint="We only use this to sign you in."
        [formControl]="control"
        [error]="
          control.touched && control.hasError('required')
            ? 'Enter your email address.'
            : control.touched && control.hasError('email')
              ? 'Enter an email address like name@example.com.'
              : ''
        "
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
    props: { control: new FormControl({ value: 'ada@example.com', disabled: true }) },
    template: frame(`
      <ui-input label="Email" [formControl]="control" hint="Disabled by the form, not the template." />

      <button matButton uiButton variant="outlined"
              (click)="control.enabled ? control.disable() : control.enable()">
        Toggle
      </button>`),
  }),
};

// --- Native attributes -----------------------------------------------------

/**
 * Rule 3. Everything this component does not name is moved onto the real
 * `<input>` — inspect the DOM here: `autocomplete`, `maxlength`, `inputmode` and
 * `data-*` are all on the control, not stranded on the wrapper.
 *
 * `id`, `name`, `readonly`, `required` and `aria-describedby` have inputs of their
 * own instead, because Material’s own host bindings own those attributes on the
 * input — a forwarded one would be overwritten on the next change detection.
 * `aria-describedby` is merged with the hint’s id rather than replacing it, so
 * both are announced.
 */
export const NativeAttributes: Story = {
  name: 'Native attributes',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <p id="policy" style="font: var(--mat-sys-body-small); margin: 0 0 0.5rem;">
        We never share your address.
      </p>

      <ui-input
        label="Email"
        type="email"
        id="signup-email"
        name="email"
        autocomplete="email"
        inputmode="email"
        maxlength="254"
        data-testid="signup-email"
        aria-describedby="policy"
        hint="Both this hint and the note above are announced with the field."
      />`),
  }),
};

// --- Styling hooks ---------------------------------------------------------

/**
 * `<ui-input>` is a block and the field fills it, so sizing a field is an ordinary
 * rule on an ordinary selector — no `::ng-deep`, no `!important`. Set the width on
 * the host; reach for `--ui-input-width` only when the field should not fill it.
 */
export const StylingHooks: Story = {
  name: 'Styling hooks: --ui-input-width',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; max-width: 34rem;">
        <ui-input label="Sized by the host" style="width: 12rem;" />

        <ui-input label="Sized by the hook" style="--ui-input-width: max-content;"
                  hint="max-content — the field shrinks to Material’s own intrinsic width." />

        <div style="display: flex; gap: 1rem;">
          <ui-input label="First name" style="flex: 1;" />
          <ui-input label="Last name" style="flex: 1;" />
        </div>
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
    template: `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 18rem)); gap: 1rem 1.5rem;">
        ${APPEARANCES.flatMap((appearance) =>
          [
            { name: 'default', attrs: '', value: '' },
            { name: 'filled', attrs: '', value: 'ada@example.com' },
            { name: 'placeholder', attrs: 'placeholder="name@example.com" floatLabel="always"', value: '' },
            { name: 'hint', attrs: 'hint="We only use this to sign you in."', value: '' },
            { name: 'error', attrs: 'error="Enter a valid email address."', value: 'ada@' },
            { name: 'required', attrs: 'required', value: '' },
            { name: 'disabled', attrs: 'disabled', value: 'ada@example.com' },
            { name: 'readonly', attrs: 'readonly', value: 'ada@example.com' },
          ].map(({ name, attrs, value }) =>
            caption(
              `${appearance} · ${name}`,
              `<ui-input appearance="${appearance}" label="Email" value="${value}" ${attrs} />`,
            ),
          ),
        ).join('')}
      </div>`,
  }),
};

/** Every type × appearance. */
export const AllTypes: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      APPEARANCES.flatMap((appearance) =>
        TYPES.map((type) =>
          caption(
            `${appearance} · ${type}`,
            `<ui-input appearance="${appearance}" type="${type}"
               label="${TYPE_FIELDS[type].label}" hint="${TYPE_FIELDS[type].hint}"
               value="${type === 'password' ? 'hunter2hunter2' : ''}" />`,
          ),
        ),
      ).join('\n'),
      3,
    ),
  }),
};
