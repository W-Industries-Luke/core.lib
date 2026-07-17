import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, userEvent, waitFor } from 'storybook/test';

import { Button } from '../button/button';
import { Toggle, type UiToggleLabelPosition } from './toggle';

/** The readout `<p>` a Forms story renders under its control, found by its text. */
const readout = (canvas: HTMLElement, contains: string): HTMLElement =>
  [...canvas.querySelectorAll('p')].find((p) => p.textContent!.includes(contains))!;

/** Clicks the action `<button>` (not the switch) whose text matches, e.g. `Toggle`. */
const clickAction = (canvas: HTMLElement, text: string): Promise<void> =>
  userEvent.click([...canvas.querySelectorAll('button')].find((b) => b.textContent!.trim() === text)!);

const LABEL_POSITIONS: UiToggleLabelPosition[] = ['after', 'before'];

/** Captions a grid cell, so a story is readable without opening the source. */
const caption = (text: string, content: string) => `
  <div style="display: flex; flex-direction: column; gap: 0.25rem;">
    ${content}
    <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${text}</span>
  </div>`;

const grid = (content: string, columns = 2) => `
  <div style="display: grid; grid-template-columns: repeat(${columns}, minmax(0, 16rem)); gap: 1rem 1.5rem;">
    ${content}
  </div>`;

/** A toggle stacks with its siblings, so the form-ish stories render in a column. */
const column = (content: string) =>
  `<div style="display: flex; flex-direction: column; align-items: start; gap: 0.5rem;">${content}</div>`;

/**
 * The shape a toggle is actually for: a settings row where the label *is* the
 * row and the switch is parked at the end of it. `labelPosition="before"` plus a
 * `display: block` host — a rule, not a workaround (see **Settings list**).
 */
const settingsRow = (content: string) => `
  <div style="width: 22rem; display: flex; flex-direction: column;">
    ${content}
  </div>`;

const meta: Meta<Toggle> = {
  title: 'Components/Toggle',
  component: Toggle,
  tags: ['autodocs'],
  decorators: [
    // The forms directives the form stories are built from, plus Material's
    // button and this library's `uiButton` — which needs `MatButton` alongside
    // it, since it decorates Material's button rather than replacing it.
    moduleMetadata({
      imports: [Toggle, FormsModule, ReactiveFormsModule, MatButton, Button],
    }),
  ],
  args: {
    label: 'Dark mode',
    checked: false,
    disabled: false,
    required: false,
    labelPosition: 'after',
    hideIcon: false,
    disableRipple: false,
    disabledInteractive: false,
  },
  argTypes: {
    label: { control: 'text' },
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    labelPosition: { control: 'inline-radio', options: LABEL_POSITIONS },
    hideIcon: { control: 'boolean' },
    disableRipple: { control: 'boolean' },
    disabledInteractive: { control: 'boolean' },
    id: { control: 'text' },
    name: { control: 'text' },
    changed: { action: 'changed' },
    toggled: { action: 'toggled' },
    checkedChange: { action: 'checkedChange' },
    // Documented in the table but not knobs: their inputs are aliased to the
    // ARIA attributes, which `argsToTemplate` cannot bind — it writes the class
    // member name. The `Native attributes` story covers them for real.
    ariaLabel: { name: 'aria-label', control: false },
    ariaLabelledby: { name: 'aria-labelledby', control: false },
    ariaDescribedby: { name: 'aria-describedby', control: false },
    tabindex: { control: false },
    matSlideToggle: { table: { disable: true } },
    toggleElement: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-toggle` is the shared theme applied to Angular Material’s `<mat-slide-toggle>`, wired as',
          'a form control. Like `ui-checkbox`, and unlike `uiButton`, it is a **component** rather than a',
          'directive: `MatSlideToggle` is a component with an element selector, so there is no native',
          'element to decorate — the `<button role="switch">` is what Material renders *inside* the',
          'track, the handle, the icons, the touch target and the label it composes.',
          '',
          '### Toggle or checkbox?',
          '',
          'A toggle applies its change **immediately** — it is a setting, and flipping it is the act. A',
          'checkbox is a value the surrounding form submits later. If there is a Save button, reach for',
          '`ui-checkbox` instead.',
          '',
          '### It is Material, not a re-implementation',
          '',
          'The track, the handle and its slide, the on/off icons, the ripple, the state layers, the 48px',
          'touch target, the focus ring and every colour are `<mat-slide-toggle>`’s own, resolved from',
          'the `--mat-sys-*` tokens the shared theme emits. There is not a literal colour in',
          '`toggle.scss` — so every story below renders the exact palette a consuming app gets. Toggle',
          'your OS light/dark preference to watch them follow.',
          '',
          '`color` is not an input, because Material’s own `color` is an M2-only API that does nothing',
          'under an M3 theme. The `--ui-toggle-*` hooks are the M3 answer — see **Theming**.',
          '',
          '### Forms',
          '',
          '`ui-toggle` is a `ControlValueAccessor` **and** a `Validator`, so `[(ngModel)]`,',
          '`[formControl]` and `formControlName` work with no adapter — bind the host, not the toggle',
          'inside it. `required` is enforced the way a switch means it: invalid until it is *on*, which',
          '`Validators.required` alone will not do. See the **Forms** stories.',
          '',
          '`[(checked)]` is the same state without a forms directive.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<ui-toggle ${argsToTemplate(args)} />`,
  }),
};

export default meta;
type Story = StoryObj<Toggle>;

/** The default switch: off, label after, nothing else. */
export const Default: Story = {};

// --- State -----------------------------------------------------------------

/**
 * On. The track is the theme’s `primary` role, the handle is `on-primary`, and
 * the checkmark on it is `on-primary-container` — not one of them is a colour
 * this library picked.
 */
export const On: Story = { args: { checked: true } };

/** Off — the resting state, and what a form starts at unless told otherwise. */
export const Off: Story = { args: { checked: false } };

/** Not editable, not focusable. The whole switch drops to the theme’s disabled tones. */
export const Disabled: Story = { args: { disabled: true } };

/** Disabled and on — a setting that is fixed and cannot be argued with. */
export const DisabledOn: Story = { args: { disabled: true, checked: true } };

/**
 * Every state side by side, enabled and disabled. Not one of them carries a
 * colour of its own: the track, the handle, the icons and the greyed label all
 * resolve from the theme’s M3 tokens.
 */
export const States: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      [
        ['off', ''],
        ['on', '[checked]="true"'],
      ]
        .flatMap(([name, binding]) => [
          caption(name, `<ui-toggle label="Dark mode" ${binding} />`),
          caption(`${name} · disabled`, `<ui-toggle label="Dark mode" ${binding} disabled />`),
        ])
        .join('\n'),
    ),
  }),
};

/**
 * `disabledInteractive` keeps a disabled switch focusable and announced, marked
 * with `aria-disabled` rather than the native `disabled`. Material’s own answer
 * to the disabled control that still has to explain itself: a natively disabled
 * button is skipped by the tab order, so a screen reader user never reaches the
 * tooltip saying why it is off.
 *
 * Tab through both switches below — only the second one takes focus.
 */
export const DisabledInteractive: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      [
        caption('disabled', `<ui-toggle label="Not available" disabled />`),
        caption(
          'disabled disabledInteractive',
          `<ui-toggle label="Not available yet" disabled disabledInteractive />`,
        ),
      ].join('\n'),
    ),
  }),
};

/**
 * `hideIcon` drops the checkmark and dash Material draws on the handle.
 *
 * They are M3’s own affordance for telling on from off without relying on
 * colour, which is exactly what a colour-blind user cannot do — so hide them
 * only where the state is unambiguous some other way.
 */
export const HideIcon: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      [
        ['default', ''],
        ['hideIcon', 'hideIcon'],
      ]
        .flatMap(([name, binding]) => [
          caption(`${name} · on`, `<ui-toggle label="Dark mode" [checked]="true" ${binding} />`),
          caption(`${name} · off`, `<ui-toggle label="Dark mode" ${binding} />`),
        ])
        .join('\n'),
    ),
  }),
};

// --- Label -----------------------------------------------------------------

/** The default: the label to the right of the switch. */
export const LabelAfter: Story = { args: { labelPosition: 'after' } };

/**
 * The label to the left — the usual shape for a settings row, where the label
 * *is* the row and the switch is its control. Material flips its own layout; the
 * `<label for>` stays tied to the button either way, so clicking the text still
 * flips the switch. See **Settings list** for what this is for.
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
          `<ui-toggle label="Dark mode" labelPosition="${position}" [checked]="true" />`,
        ),
      ).join('\n'),
    ),
  }),
};

/**
 * What `labelPosition="before"` is actually for. The host is `inline-block` by
 * default, so a row that fills its container is `display: block` on the element —
 * a rule, not a `::ng-deep` (rule 2). Material pushes the switch to the far end
 * itself.
 */
export const SettingsList: Story = {
  name: 'Settings list',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { wifi: true, bluetooth: false, hotspot: false },
    template: settingsRow(`
      <ui-toggle style="display: block; padding: 0.5rem 0;" labelPosition="before" [(checked)]="wifi">Wi-Fi</ui-toggle>
      <ui-toggle style="display: block; padding: 0.5rem 0;" labelPosition="before" [(checked)]="bluetooth">Bluetooth</ui-toggle>
      <ui-toggle style="display: block; padding: 0.5rem 0;" labelPosition="before" [(checked)]="hotspot">Personal hotspot</ui-toggle>`),
  }),
};

/**
 * Rule 7: a string cannot spell a hint under the label, so the label is projected
 * content with the `label` input as its fallback. It renders inside Material’s own
 * `<label for>`, so clicking the whole block still flips the switch.
 */
export const ProjectedLabel: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: column(`
      <ui-toggle labelPosition="before" style="display: block; width: 22rem;">
        <strong>Sync over cellular</strong>
        <span style="display: block; font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant);">
          May use your data allowance.
        </span>
      </ui-toggle>`),
  }),
};

/**
 * A switch named by `aria-label` rather than by visible text — for a toolbar
 * where an icon beside it carries the meaning.
 */
export const NoVisibleLabel: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `<ui-toggle aria-label="Dark mode" [checked]="true" />`,
  }),
};

// --- Forms -----------------------------------------------------------------

/**
 * `[(ngModel)]` binds the host — `ui-toggle` is a `ControlValueAccessor`, so there
 * is no adapter and nothing to reach inside for (rule 5). Flip the switch and
 * watch the model.
 */
export const NgModel: Story = {
  name: 'Forms: [(ngModel)]',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { dark: false },
    template: column(`
      <ui-toggle label="Dark mode" [(ngModel)]="dark" />
      <p style="font: var(--mat-sys-body-small); margin: 0;">
        dark: <strong>{{ dark }}</strong>
      </p>`),
  }),
  // Proves the round-trip the description claims: flipping the switch reaches
  // `[(ngModel)]`. A smoke-render shows the switch but never proves the binding.
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const sw = canvasElement.querySelector<HTMLButtonElement>('button[role="switch"]')!;
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(readout(canvasElement, 'dark:').textContent).toContain('false');

    await userEvent.click(canvasElement.querySelector('label')!);

    await waitFor(() => expect(sw.getAttribute('aria-checked')).toBe('true'));
    expect(readout(canvasElement, 'dark:').textContent).toContain('true');
  },
};

/**
 * The same state without a forms directive: `[(checked)]` is a `model()` (rule 5),
 * for a settings row where `[(ngModel)]` would be a directive dragged in for one
 * binding.
 *
 * `exportAs: 'uiToggle'` hands the component back, so the button below is just
 * `sw.checked.set(false)` — no host code at all.
 */
export const TwoWayChecked: Story = {
  name: 'Forms: [(checked)] and exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { notifications: true },
    template: column(`
      <ui-toggle #sw="uiToggle" label="Notifications" [(checked)]="notifications" />

      <button matButton uiButton variant="outlined" (click)="sw.checked.set(false)">Mute</button>

      <p style="font: var(--mat-sys-body-small); margin: 0;">
        checked: <strong>{{ sw.checked() }}</strong>
      </p>`),
  }),
};

/**
 * `required` on a switch means *on*, and this component enforces it —
 * `Validators.required` would not: it rejects an empty value, and `false` is not
 * empty, so a required toggle under Angular’s own validator is valid while off.
 *
 * Flip the switch and watch the form’s status. The message is the consumer’s to
 * place, exactly as with `ui-input`’s `error`.
 */
export const RequiredValidation: Story = {
  name: 'Forms: required',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { backups: new FormControl(false) },
    template: column(`
      <ui-toggle label="Enable automatic backups" required [formControl]="backups" />

      @if (backups.touched && backups.invalid) {
        <p style="font: var(--mat-sys-body-small); color: var(--mat-sys-error); margin: 0;">
          Backups must be on to continue.
        </p>
      }

      <p style="font: var(--mat-sys-body-small); margin: 0;">
        valid: <strong>{{ backups.valid }}</strong> · touched: <strong>{{ backups.touched }}</strong>
      </p>`),
  }),
  // Proves the switch-specific validation the description claims: `required`
  // means *on*, so the control is invalid until it is flipped — which
  // `Validators.required` alone would not enforce, since `false` is not empty.
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    expect(readout(canvasElement, 'valid:').textContent).toContain('valid: false');

    await userEvent.click(canvasElement.querySelector('label')!);

    await waitFor(() =>
      expect(readout(canvasElement, 'valid:').textContent).toContain('valid: true'),
    );
  },
};

/**
 * A form’s own `disable()` reaches the switch through `setDisabledState`, so a
 * `FormControl` that starts disabled — or is disabled later — needs nothing in the
 * template.
 */
export const FormDisabled: Story = {
  name: 'Forms: control.disable()',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { control: new FormControl({ value: true, disabled: true }) },
    template: column(`
      <ui-toggle label="Disabled by the form, not the template" [formControl]="control" />

      <button matButton uiButton variant="outlined"
              (click)="control.enabled ? control.disable() : control.enable()">
        Toggle
      </button>`),
  }),
  // Proves `setDisabledState` round-trips both ways: a control that starts
  // disabled by the form renders disabled, and enabling the form re-enables it —
  // with nothing in the template driving the switch's `disabled`.
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const sw = canvasElement.querySelector<HTMLButtonElement>('button[role="switch"]')!;
    expect(sw.disabled).toBe(true);

    await clickAction(canvasElement, 'Toggle');

    await waitFor(() => expect(sw.disabled).toBe(false));
  },
};

/**
 * `changed` is the *user*, and only the user: it is Material’s own `change`
 * forwarded, so a form patch or the button below does not fire it. `checkedChange`
 * — the `model()`’s output — fires however the state moved. Reach for `changed`
 * when the point is that someone chose, which for a toggle is usually the request
 * that saves the setting.
 */
export const Changed: Story = {
  name: 'changed vs checkedChange',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { log: [] as string[], checked: false },
    template: column(`
      <ui-toggle
        label="Dark mode"
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
 * Rule 6. Material’s `color` input is an M2-only API that does nothing under an M3
 * theme, so the colour is four CSS custom properties resolved through
 * `mat.slide-toggle-overrides()` against the theme’s own tokens:
 *
 * - `--ui-toggle-color` — the track when on, and its state layer
 * - `--ui-toggle-handle-color` — the handle resting on that track
 * - `--ui-toggle-handle-accent-color` — the handle while hovered, focused or pressed
 * - `--ui-toggle-icon-color` — the checkmark drawn on the handle
 *
 * The four are one M3 role family, and each is legible against the one before it —
 * so re-point them as a set (`error` / `on-error` / `error-container` /
 * `on-error-container`, or the theme’s own `--ui-sys-success-*`) rather than at
 * literals, and they survive a palette change and dark mode. No `::ng-deep`, no
 * `!important`.
 *
 * Only the *on* half is hooked: the off half is the theme’s neutral surface, and a
 * switch whose off state carries a colour of its own is one nobody can read at a
 * glance.
 */
export const Theming: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: grid(
      [
        ['default (primary)', ''],
        [
          'tertiary',
          'style="--ui-toggle-color: var(--mat-sys-tertiary); --ui-toggle-handle-color: var(--mat-sys-on-tertiary); --ui-toggle-handle-accent-color: var(--mat-sys-tertiary-container); --ui-toggle-icon-color: var(--mat-sys-on-tertiary-container);"',
        ],
        [
          'success (--ui-sys-*)',
          'style="--ui-toggle-color: var(--ui-sys-success); --ui-toggle-handle-color: var(--ui-sys-on-success); --ui-toggle-handle-accent-color: var(--ui-sys-success-container); --ui-toggle-icon-color: var(--ui-sys-on-success-container);"',
        ],
        [
          'error',
          'style="--ui-toggle-color: var(--mat-sys-error); --ui-toggle-handle-color: var(--mat-sys-on-error); --ui-toggle-handle-accent-color: var(--mat-sys-error-container); --ui-toggle-icon-color: var(--mat-sys-on-error-container);"',
        ],
      ]
        .map(([name, style]) => caption(name, `<ui-toggle label="Dark mode" [checked]="true" ${style} />`))
        .join('\n'),
      2,
    ),
  }),
};

// --- Native attributes -----------------------------------------------------

/**
 * Rule 3. Everything this component does not name is moved onto the real
 * `<button role="switch">` — inspect the DOM here: `data-*` is on the control, not
 * stranded on the wrapper.
 *
 * `id`, `name`, `tabindex` and the three `aria-*` attributes Material binds have
 * inputs of their own instead, because Material’s own bindings own those on the
 * button — a forwarded one would be overwritten on the next change detection. `id`
 * is Material’s: it takes the one below and gives the button `dark-button`, which
 * is what its `<label for>` points at.
 *
 * `aria-expanded` and `aria-controls` need no input, because Material binds
 * neither — forwarding is enough, which is what makes the toggle-reveals-a-section
 * shape work with no hack.
 */
export const NativeAttributes: Story = {
  name: 'Native attributes',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { advanced: false },
    template: column(`
      <ui-toggle
        label="Dark mode"
        id="dark"
        name="dark"
        aria-describedby="dark-help"
        data-testid="dark"
      />

      <p id="dark-help" style="font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant); margin: 0;">
        Applies immediately. Announced with the switch, because <code>aria-describedby</code> reaches
        the real button.
      </p>

      <ui-toggle
        label="Advanced settings"
        [(checked)]="advanced"
        [attr.aria-expanded]="advanced"
        aria-controls="advanced-panel"
      />

      <div id="advanced-panel" style="font: var(--mat-sys-body-small);">
        @if (advanced) {
          <p style="margin: 0;">Revealed. <code>aria-expanded</code> is forwarded to the switch.</p>
        }
      </div>`),
  }),
};
