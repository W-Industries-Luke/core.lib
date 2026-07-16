import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, waitFor } from 'storybook/test';

import { Button } from '../button/button';
import { Textarea, TextareaHint, type UiTextareaAppearance } from './textarea';

const APPEARANCES: UiTextareaAppearance[] = ['fill', 'outline'];

/** Enough prose to make a field that grows visibly grow. */
const PARAGRAPH = [
  'Ada Lovelace worked with Charles Babbage on the Analytical Engine.',
  'Her notes on it include what is generally recognised as the first algorithm',
  'intended to be carried out by a machine, along with the observation that such',
  'a machine might one day compose music.',
].join(' ');

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
  <div style="display: grid; grid-template-columns: repeat(${columns}, minmax(0, 20rem)); gap: 1rem 1.5rem;">
    ${content}
  </div>`;

const meta: Meta<Textarea> = {
  title: 'Components/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  decorators: [
    // The projection marker, plus the pieces the forms stories are built from:
    // this library's `uiButton` — which needs `MatButton` alongside it, since it
    // decorates Material's button rather than replacing it.
    moduleMetadata({
      imports: [Textarea, TextareaHint, FormsModule, ReactiveFormsModule, MatButton, Button],
    }),
  ],
  args: {
    label: 'Bio',
    rows: 3,
    autosize: true,
    hideCounter: false,
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
    rows: { control: { type: 'number', min: 1, max: 20 } },
    maxRows: { control: { type: 'number', min: 1, max: 40 } },
    maxLength: { control: { type: 'number', min: 1, max: 2000 } },
    autosize: { control: 'boolean' },
    hideCounter: { control: 'boolean' },
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
    autosizeRef: { table: { disable: true } },
    textareaElement: { table: { disable: true } },
    hasError: { table: { disable: true } },
    hasCounter: { table: { disable: true } },
    length: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-textarea` is the shared theme applied to Angular Material’s `<mat-form-field>` around a',
          '`<textarea matInput>`, wired as a form control and grown by the CDK’s own',
          '`cdkTextareaAutosize`. It is `ui-input`’s sibling — same inputs, same forms wiring, same',
          'attribute forwarding — plus the two things a multi-line field adds: **it grows with its',
          'content**, and **it can count characters**.',
          '',
          '### It is Material, not a re-implementation',
          '',
          'The box, the outline, the floating label and its animation, the focus ring and every colour',
          'are `<mat-form-field>`’s own, resolved from the `--mat-sys-*` tokens the shared theme emits.',
          'There is not a literal colour in `textarea.scss`, so every story below renders the exact',
          'palette a consuming app gets — toggle your OS light/dark preference to watch them follow.',
          '',
          'The growing is the CDK’s `cdkTextareaAutosize` rather than a scroll-height loop of our own,',
          'and the counter is a `<mat-hint align="end">`, which is exactly the shape Material’s own',
          'documentation gives it.',
          '',
          '### Autosize',
          '',
          '`autosize` is on by default: the field rests at `rows` and grows as the user types, so nobody',
          'writes an essay through a three-line porthole. `maxRows` caps the growth and hands back the',
          'scrollbar. `[autosize]="false"` pins the field at `rows` and gives the user back the native',
          'resize grabber — the two are alternatives, since a height the CDK recomputes on the next',
          'keystroke is not one a drag can hold. See the **Autosize** stories.',
          '',
          '### The counter',
          '',
          '`maxLength` does both halves of the job: the browser stops accepting input at the limit, and',
          '`12 / 280` appears under the field, opposite the hint. `hideCounter` keeps the limit and drops',
          'the counter.',
          '',
          '### Forms',
          '',
          '`ui-textarea` is a `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]` and',
          '`formControlName` work with no adapter — bind the host, not the textarea inside it.',
          '`[(value)]` is the same state without a forms directive. See the **Forms** stories.',
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
    template: frame(`<ui-textarea ${argsToTemplate(args)} />`),
  }),
};

export default meta;
type Story = StoryObj<Textarea>;

/** The default field: three rows, `outline`, growing, with a label and nothing else. */
export const Default: Story = {};

// --- Autosize --------------------------------------------------------------

/**
 * The default. The field rests at `rows` and grows as you type — put the cursor
 * in it and hold return, or paste a paragraph in. It never shrinks below `rows`.
 */
export const Autosize: Story = {
  args: { label: 'Bio', hint: 'Type — the field grows to fit.', value: PARAGRAPH },
};

/**
 * `[autosize]="false"` pins the field at `rows`, and the content scrolls past it.
 * The native resize grabber comes back with it: the two are alternatives, because
 * a height the CDK recomputes on every keystroke is not one a drag can hold.
 *
 * The same text is in both fields below.
 */
export const AutosizeOnAndOff: Story = {
  name: 'Autosize: on and off',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      [
        caption(
          'autosize (default) — grew to fit',
          `<ui-textarea label="Bio" value="${PARAGRAPH}" />`,
        ),
        caption(
          '[autosize]="false" — three rows, then scrolls',
          `<ui-textarea label="Bio" [autosize]="false" value="${PARAGRAPH}" />`,
        ),
      ].join('\n'),
    ),
  }),
};

/**
 * `rows` is the resting height, and with autosize on it is also the floor — an
 * empty field is still this tall. Every field below is empty.
 */
export const Rows: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      [2, 3, 6].map((rows) => caption(`rows="${rows}"`, `<ui-textarea label="Notes" rows="${rows}" />`)).join('\n'),
      3,
    ),
  }),
};

/**
 * `maxRows` is the ceiling: the field grows to it and then the content scrolls,
 * which is what a field that must not push the submit button off the screen
 * wants. Both fields hold the same text and grow; only the right one stops.
 */
export const MaxRows: Story = {
  name: 'Autosize: maxRows',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      [
        caption('no maxRows — grows forever', `<ui-textarea label="Bio" value="${PARAGRAPH}" />`),
        caption(
          'maxRows="3" — grows, then scrolls',
          `<ui-textarea label="Bio" maxRows="3" value="${PARAGRAPH}" />`,
        ),
      ].join('\n'),
    ),
  }),
};

/**
 * The escape hatch for the one case the CDK cannot see (rule 4): a field first
 * rendered with no layout — inside a collapsed panel, a hidden tab — was measured
 * at zero and stays there. `exportAs` hands back the component, and
 * `autosizeRef()` hands back the CDK’s own directive, so the fix is one call.
 */
export const ResizeToFitContent: Story = {
  name: 'Autosize: resizeToFitContent()',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { text: PARAGRAPH },
    template: frame(`
      <ui-textarea #field="uiTextarea" label="Bio" [(value)]="text" />

      <button matButton uiButton variant="outlined"
              (click)="field.autosizeRef().resizeToFitContent(true)">
        Re-measure
      </button>`),
  }),
};

// --- The counter -----------------------------------------------------------

/**
 * `maxLength` does both halves of the job: the browser stops accepting input at
 * the limit, and the counter appears. Type past 80 to watch the browser stop you.
 */
export const WithCounter: Story = {
  args: { label: 'Headline', maxLength: 80, value: 'The first algorithm' },
};

/**
 * The counter is Material’s own end-aligned hint, so it sits opposite the `hint`
 * rather than under it — a field can have both, on one line.
 */
export const CounterAndHint: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      [
        caption('counter only', `<ui-textarea label="Bio" maxLength="280" value="Ada." />`),
        caption(
          'counter + hint',
          `<ui-textarea label="Bio" maxLength="280" value="Ada."
             hint="Shown on your public profile." />`,
        ),
      ].join('\n'),
    ),
  }),
};

/**
 * `hideCounter` keeps the limit and drops the display — for a limit that is a
 * backstop (a database column’s width) rather than a budget the user is meant to
 * spend. Both fields below still stop accepting input at 80.
 */
export const HideCounter: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      [
        caption('maxLength="80"', `<ui-textarea label="Headline" maxLength="80" value="Ada." />`),
        caption(
          'maxLength="80" hideCounter',
          `<ui-textarea label="Headline" maxLength="80" hideCounter value="Ada." />`,
        ),
      ].join('\n'),
    ),
  }),
};

/**
 * Material renders one subscript and an error wins it, so the counter and the
 * hint both give way while an `error` is showing — its own rule, not this
 * component’s. It costs little: the browser enforces `maxLength`, so nobody is
 * over the limit and reading the counter to find out by how much.
 */
export const CounterWithError: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      [
        caption(
          'counter + hint',
          `<ui-textarea label="Bio" maxLength="280" value="Ada." hint="Shown on your public profile." />`,
        ),
        caption(
          'error takes the line',
          `<ui-textarea label="Bio" maxLength="280" value="Ada." hint="Shown on your public profile."
             error="Say a little more than that." />`,
        ),
      ].join('\n'),
    ),
  }),
};

// --- Appearances -----------------------------------------------------------

/** This library’s default: M3’s outlined box. */
export const Outline: Story = { args: { appearance: 'outline', value: PARAGRAPH } };

/** Material’s own default: the filled box, for a form on a plain surface. */
export const Fill: Story = { args: { appearance: 'fill', value: PARAGRAPH } };

/**
 * Both appearances, empty and filled. Neither carries a colour of its own — the
 * container, the outline and the label all resolve from the theme’s M3 tokens.
 */
export const Appearances: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      APPEARANCES.flatMap((appearance) =>
        ['', 'Wrote the first algorithm.'].map((value) =>
          caption(
            `appearance="${appearance}"${value ? ' · filled' : ' · empty'}`,
            `<ui-textarea appearance="${appearance}" label="Bio" value="${value}" />`,
          ),
        ),
      ).join('\n'),
    ),
  }),
};

// --- Hint ------------------------------------------------------------------

/**
 * `hint` is the help under the field. Material points the control’s
 * `aria-describedby` at it, so it is announced with the field rather than
 * stranded next to it.
 */
export const WithHint: Story = { args: { hint: 'Shown on your public profile.' } };

/**
 * Rule 7: a string cannot spell a link, so project a `uiTextareaHint` element for
 * a hint that needs one. It replaces the `hint` string, sits opposite the counter
 * as the string would, and Material announces it with the control the same way.
 */
export const ProjectedHint: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-textarea label="Release notes" maxLength="500">
        <span uiTextareaHint>Supports <a href="#">Markdown</a>.</span>
      </ui-textarea>`),
  }),
};

// --- Error -----------------------------------------------------------------

/**
 * The field shows the message — and goes red, and flips `aria-invalid` — for
 * exactly as long as `error` is set. Clear the `error` control to watch it go back
 * to the hint.
 */
export const WithError: Story = {
  args: {
    label: 'Bio',
    value: 'ok',
    hint: 'Shown on your public profile.',
    error: 'Say a little more about yourself — a sentence or two.',
  },
  // Guards the regression from issue #122: the `error` arg must reach the `[error]`
  // input, so `<mat-error>` renders and the field enters Material's own invalid
  // state. A smoke-render alone passes even when the message is missing.
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await waitFor(() => {
      const error = canvasElement.querySelector('mat-error');
      expect(error).not.toBeNull();
      expect(error!.textContent!.trim()).toBe('Say a little more about yourself — a sentence or two.');
    });

    expect(canvasElement.querySelector('.mat-form-field-invalid')).not.toBeNull();
    expect(canvasElement.querySelector('[aria-invalid="true"]')).not.toBeNull();
    expect(canvasElement.querySelector('mat-hint')).toBeNull();
  },
};

/** The error state in both appearances — the red is M3’s `error` role, in either box. */
export const ErrorAppearances: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      APPEARANCES.map((appearance) =>
        caption(
          `appearance="${appearance}"`,
          `<ui-textarea appearance="${appearance}" label="Bio" value="ok"
             error="Say a little more about yourself." />`,
        ),
      ).join('\n'),
    ),
  }),
};

// --- State -----------------------------------------------------------------

/** A disabled field: not editable, not focusable, not submitted. */
export const Disabled: Story = {
  args: { value: PARAGRAPH, disabled: true, hint: 'Hints grey out too.' },
};

/** Disabled in both appearances, empty and filled — and with a counter. */
export const DisabledStates: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      APPEARANCES.flatMap((appearance) =>
        ['', 'Wrote the first algorithm.'].map((value) =>
          caption(
            `appearance="${appearance}"${value ? ' · filled' : ' · empty'}`,
            `<ui-textarea appearance="${appearance}" label="Bio" value="${value}" disabled
               maxLength="280" hint="Hints grey out too." />`,
          ),
        ),
      ).join('\n'),
    ),
  }),
};

/**
 * `readonly` is not `disabled`: the value can be read, selected, copied and
 * submitted, and the field stays in the tab order and is announced normally. It is
 * the one to reach for when a value is *shown* rather than *unavailable*.
 */
export const Readonly: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      [
        caption('readonly', `<ui-textarea label="Terms" value="${PARAGRAPH}" readonly />`),
        caption('disabled', `<ui-textarea label="Terms" value="${PARAGRAPH}" disabled />`),
      ].join('\n'),
    ),
  }),
};

/**
 * `required` adds Material’s asterisk and sets `aria-required`. It says the field
 * is required; it does not enforce it — Angular’s own `required` validator matches
 * the same attribute on `<ui-textarea [(ngModel)] required>`, so writing it once
 * gets both.
 */
export const Required: Story = { args: { required: true } };

// --- Label and placeholder -------------------------------------------------

/**
 * A placeholder is not a label: it disappears the moment someone types. Use it for
 * the *shape* of an answer over a `label` that says which answer it wants.
 *
 * With the default `floatLabel="auto"` the label sits where the placeholder would
 * be, so `floatLabel="always"` is how to show both at rest.
 */
export const WithPlaceholder: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      (['auto', 'always'] as const)
        .map((floatLabel) =>
          caption(
            `floatLabel="${floatLabel}"`,
            `<ui-textarea label="Bio" placeholder="A sentence or two about yourself."
               floatLabel="${floatLabel}" />`,
          ),
        )
        .join('\n'),
    ),
  }),
};

// --- Forms -----------------------------------------------------------------

/**
 * `[(ngModel)]` binds the host — `ui-textarea` is a `ControlValueAccessor`, so
 * there is no adapter and nothing to reach inside for (rule 5). Type in the field
 * and watch the model.
 */
export const NgModel: Story = {
  name: 'Forms: [(ngModel)]',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { bio: 'Mathematician.' },
    template: frame(`
      <ui-textarea label="Bio" maxLength="280" [(ngModel)]="bio" />
      <p style="font: var(--mat-sys-body-small); margin: 0;">
        bio: <strong>{{ bio }}</strong>
      </p>`),
  }),
};

/**
 * The same state without a forms directive: `[(value)]` is a `model()` (rule 5),
 * for a comment box or a scratch note where `[(ngModel)]` would be a directive
 * dragged in for one binding.
 *
 * `exportAs: 'uiTextarea'` hands the component back, so the button below is just
 * `field.value.set('')` — no host code at all.
 */
export const TwoWayValue: Story = {
  name: 'Forms: [(value)] and exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { note: 'Remember the milk.' },
    template: frame(`
      <ui-textarea #field="uiTextarea" label="Note" maxLength="140" [(value)]="note" />

      <button matButton uiButton variant="outlined" (click)="field.value.set('')">Clear</button>

      <p style="font: var(--mat-sys-body-small); margin: 0.5rem 0 0;">
        length: <strong>{{ field.length() }}</strong>
      </p>`),
  }),
};

/**
 * The usual shape for a reactive form. `error` is a string this library shows on
 * demand — *when* to show it is the consumer’s call, because only they know their
 * validation. Here it waits for a blur, which is the convention for a field the
 * user has not finished with yet.
 *
 * Blur the empty field, then type a word and blur again.
 */
export const ReactiveValidation: Story = {
  name: 'Forms: reactive validation',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { control: new FormControl('', [Validators.required, Validators.minLength(20)]) },
    template: frame(`
      <ui-textarea
        label="Bio"
        required
        maxLength="280"
        hint="Shown on your public profile."
        [formControl]="control"
        [error]="
          control.touched && control.hasError('required')
            ? 'Tell us a little about yourself.'
            : control.touched && control.hasError('minlength')
              ? 'A sentence or two, please — at least 20 characters.'
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
    props: { control: new FormControl({ value: PARAGRAPH, disabled: true }) },
    template: frame(`
      <ui-textarea label="Bio" [formControl]="control"
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
 * `<textarea>` — inspect the DOM here: `spellcheck`, `wrap`, `autocapitalize` and
 * `data-*` are all on the control, not stranded on the wrapper.
 *
 * `id`, `name`, `readonly`, `required`, `rows`, `maxlength` and `aria-describedby`
 * have inputs of their own instead, because Material’s and the CDK’s own host
 * bindings own those attributes on the control — a forwarded one would be
 * overwritten on the next change detection. `aria-describedby` is merged with the
 * hint’s and the counter’s ids rather than replacing them, so all three are
 * announced.
 */
export const NativeAttributes: Story = {
  name: 'Native attributes',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <p id="policy" style="font: var(--mat-sys-body-small); margin: 0 0 0.5rem;">
        Your bio is public.
      </p>

      <ui-textarea
        label="Bio"
        id="profile-bio"
        name="bio"
        rows="4"
        maxLength="280"
        wrap="soft"
        spellcheck="true"
        autocapitalize="sentences"
        data-testid="profile-bio"
        aria-describedby="policy"
        hint="This hint, the counter and the note above are all announced with the field."
      />`),
  }),
};

// --- Styling hooks ---------------------------------------------------------

/**
 * `<ui-textarea>` is a block and the field fills it, so sizing a field is an
 * ordinary rule on an ordinary selector — no `::ng-deep`, no `!important`. Set the
 * width on the host; reach for `--ui-textarea-width` only when the field should
 * not fill it.
 *
 * `--ui-textarea-resize` is the other hook: autosize takes the grabber away by
 * default, since the CDK owns the height — set it back to `vertical` to have both.
 */
export const StylingHooks: Story = {
  name: 'Styling hooks: --ui-textarea-width, --ui-textarea-resize',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; max-width: 40rem;">
        <ui-textarea label="Sized by the host" style="width: 16rem;" />

        <ui-textarea label="Sized by the hook" style="--ui-textarea-width: max-content;"
                     hint="max-content — the field shrinks to Material’s own intrinsic width." />

        <ui-textarea label="Grabber, despite autosize" style="--ui-textarea-resize: vertical;"
                     hint="--ui-textarea-resize: vertical — drag the corner." />

        <div style="display: flex; gap: 1rem;">
          <ui-textarea label="Pros" style="flex: 1;" />
          <ui-textarea label="Cons" style="flex: 1;" />
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
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 20rem)); gap: 1rem 1.5rem;">
        ${APPEARANCES.flatMap((appearance) =>
          [
            { name: 'default', attrs: '', value: '' },
            { name: 'filled', attrs: '', value: 'Wrote the first algorithm.' },
            {
              name: 'placeholder',
              attrs: 'placeholder="A sentence or two." floatLabel="always"',
              value: '',
            },
            { name: 'hint', attrs: 'hint="Shown on your public profile."', value: '' },
            { name: 'counter', attrs: 'maxLength="280"', value: 'Ada.' },
            {
              name: 'counter + hint',
              attrs: 'maxLength="280" hint="Shown on your public profile."',
              value: 'Ada.',
            },
            { name: 'error', attrs: 'error="Say a little more."', value: 'ok' },
            { name: 'required', attrs: 'required', value: '' },
            { name: 'disabled', attrs: 'disabled maxLength="280"', value: 'Ada.' },
            { name: 'readonly', attrs: 'readonly', value: 'Ada.' },
            { name: 'no autosize', attrs: '[autosize]="false"', value: PARAGRAPH },
            { name: 'autosize + maxRows', attrs: 'maxRows="3"', value: PARAGRAPH },
          ].map(({ name, attrs, value }) =>
            caption(
              `${appearance} · ${name}`,
              `<ui-textarea appearance="${appearance}" label="Bio" value="${value}" ${attrs} />`,
            ),
          ),
        ).join('')}
      </div>`,
  }),
};
