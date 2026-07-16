import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Button } from '../button/button';
import { Input as UiInput } from '../input/input';
import { Step, StepLabelDef } from './step';
import { StepperNext, StepperPrevious } from './stepper-navigation';
import { Stepper, type UiStepperOrientation } from './stepper';

const ORIENTATIONS: UiStepperOrientation[] = ['horizontal', 'vertical'];

/** A step body reads as prose, so every story's plain content is styled like prose. */
const body = (text: string) =>
  `<p style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface);">${text}</p>`;

/** The row of navigation buttons most stories end a step with. */
const nav = ({ back = true, next = true, label = 'Next' } = {}) => `
  <div style="display: flex; gap: 0.5rem; margin-block-start: 1rem;">
    ${back ? `<button matButton uiButton variant="text" uiStepperPrevious>Back</button>` : ''}
    ${next ? `<button matButton uiButton variant="filled" uiStepperNext>${label}</button>` : ''}
  </div>`;

/** The three steps most stories use — a plausible checkout rather than "Step 1". */
const CHECKOUT_STEPS = `
  <ui-step label="Address">
    ${body('Where the order is going.')}
    ${nav({ back: false })}
  </ui-step>
  <ui-step label="Payment">
    ${body('How it is being paid for.')}
    ${nav()}
  </ui-step>
  <ui-step label="Review">
    ${body('Three items, one box, arriving Thursday.')}
    ${nav({ next: false })}
  </ui-step>`;

/**
 * Stories render at a realistic width rather than filling the canvas: a stepper
 * spans its container, and how the header behaves is only legible against a
 * container that has an edge.
 */
const frame = (content: string, width = '44rem') =>
  `<div style="max-width: ${width};">${content}</div>`;

const meta: Meta<Stepper> = {
  title: 'Components/Stepper',
  component: Stepper,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        Stepper,
        Step,
        StepLabelDef,
        StepperNext,
        StepperPrevious,
        MatButton,
        Button,
        UiInput,
        ReactiveFormsModule,
      ],
    }),
  ],
  args: {
    orientation: 'horizontal',
    linear: false,
    labelPosition: 'end',
    selectedIndex: 0,
    disableRipple: false,
  },
  argTypes: {
    orientation: { control: 'inline-radio', options: ORIENTATIONS },
    linear: { control: 'boolean' },
    labelPosition: { control: 'inline-radio', options: ['end', 'bottom'] },
    selectedIndex: { control: { type: 'number', min: 0, max: 2, step: 1 } },
    disableRipple: { control: 'boolean' },
    // Documented in the table but not a knob: its input is aliased to the ARIA
    // attribute, which `argsToTemplate` cannot bind — it writes the class member
    // name. The `a11y:` story covers it with a real template.
    ariaLabel: { name: 'aria-label', control: false },
    steps: { table: { disable: true } },
    matStepper: { table: { disable: true } },
    selectionChange: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-stepper` is the shared theme applied to Angular Material’s `<mat-stepper>`. Like',
          '`ui-tabs` and unlike `uiButton`, it is a **component** rather than a directive: a stepper',
          'owns composition — a header of steps and the one body they switch between — so there is no',
          'native element to decorate.',
          '',
          'A stepper is for **one task split into ordered parts**: a checkout, an onboarding, a wizard.',
          'It is not a way to hide a long form — if the fields are independent, show them all — and it',
          'is not navigation between unrelated pages.',
          '',
          '### Declaring steps',
          '',
          'Each step is a `<ui-step label="…">` with its content projected inside it. The content is',
          'ordinary template content, not a string input, so anything can go in a step — a form, a',
          'table, another component. `<ui-step>` renders nothing itself: it hands its content to the',
          'stepper, which puts it inside Material’s own step body.',
          '',
          '### Navigation',
          '',
          'Put `uiStepperNext` / `uiStepperPrevious` on a button inside a step. These are this',
          'library’s directives rather than Material’s `matStepperNext`, which cannot find the',
          '`<mat-stepper>` from inside a `<ui-step>` and throws — the move itself is still Material’s.',
          'A consumer who would rather drive it directly can use `#s="uiStepper"` and `(click)="s.next()"`.',
          '',
          '### Linear steppers and validation',
          '',
          '`linear` makes the stepper refuse to move past a step whose `stepControl` is invalid. Give',
          'each gated step a control — a `FormGroup` from `[(ngModel)]` or reactive forms — and the',
          'stepper marks it complete when the control turns valid. A step the user leaves invalid is',
          'flagged on its header, which Material ships off and this library turns on.',
          '',
          '### Selection',
          '',
          '`[(selectedIndex)]` is a `model`, so the index is one piece of state rather than an input',
          'and an output that can disagree. Material’s own setter *throws* on an out-of-range index',
          'and *silently refuses* a move a linear stepper disallows; `ui-stepper` reconciles both, so',
          'this signal always names the step actually on screen. `(selectionChange)` is the richer',
          'event, carrying the steps either side of the move.',
          '',
          '### Theming and restyling',
          '',
          'The state icons, the ripples, the connecting lines and the animation are `<mat-stepper>`’s',
          'own, resolved from the M3 system tokens in `src/styles/_theme.scss` — there is not a literal',
          'colour in this component’s stylesheet, and every story below renders the exact palette a',
          'consuming app gets, dark mode included. `--ui-stepper-color`, `--ui-stepper-on-color`,',
          '`--ui-stepper-label-text-color`, `--ui-stepper-selected-label-text-color`,',
          '`--ui-stepper-error-color`, `--ui-stepper-line-color` and `--ui-stepper-container-color`',
          'restyle it from an ordinary CSS rule, with no `::ng-deep`.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: frame(`<ui-stepper ${argsToTemplate(args)}>${CHECKOUT_STEPS}</ui-stepper>`),
  }),
};

export default meta;
type Story = StoryObj<Stepper>;

/** The default: three steps, running horizontally, the first one selected. */
export const Default: Story = {};

// --- Orientation -----------------------------------------------------------

/**
 * The default. A horizontal stepper shows the whole path at a glance and keeps the
 * current step's content in one place, so it suits a short, predictable sequence —
 * a checkout — on a screen wide enough for the labels.
 */
export const Horizontal: Story = {
  name: 'orientation: horizontal (default)',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`<ui-stepper aria-label="Checkout">${CHECKOUT_STEPS}</ui-stepper>`),
  }),
};

/**
 * A vertical stepper stacks the steps and expands the selected one in place, so
 * each step's content sits directly under its own label. It reads better for
 * longer content, for more steps than fit across a row, and on a narrow screen.
 */
export const Vertical: Story = {
  name: 'orientation: vertical',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(
      `<ui-stepper orientation="vertical" aria-label="Checkout">${CHECKOUT_STEPS}</ui-stepper>`,
      '32rem',
    ),
  }),
};

/**
 * Both orientations side by side. The markup is identical — only `orientation`
 * differs, which is the point: this is Material's own layout rather than CSS of
 * ours, so the roles change with it (`tablist`/`tab` across, `button`/`region`
 * down) and the keyboard follows.
 */
export const Orientations: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 3rem; max-width: 44rem;">
        ${ORIENTATIONS.map(
          (orientation) => `
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${orientation}</span>
            <ui-stepper orientation="${orientation}" aria-label="Checkout, ${orientation}">
              <ui-step label="Address">${body('Where the order is going.')}</ui-step>
              <ui-step label="Payment">${body('How it is being paid for.')}</ui-step>
              <ui-step label="Review">${body('Three items, one box.')}</ui-step>
            </ui-stepper>
          </div>`,
        ).join('')}
      </div>`,
  }),
};

/**
 * `labelPosition="bottom"` puts a horizontal stepper's labels under their icons
 * rather than beside them, which buys back horizontal room when the labels are
 * long or there are several steps. It does nothing to a vertical stepper, where
 * there is nowhere else for the label to go.
 */
export const LabelPositionBottom: Story = {
  name: 'labelPosition: bottom',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(
      `<ui-stepper labelPosition="bottom" aria-label="Checkout">${CHECKOUT_STEPS}</ui-stepper>`,
    ),
  }),
};

// --- Linear ----------------------------------------------------------------

/**
 * The one every wizard wants. `linear` plus a `stepControl` per step means the
 * stepper will not move past a step whose form is invalid: press **Next** with the
 * field empty and nothing happens.
 *
 * Note the header of a step you leave invalid turns red and says what is wrong —
 * Material ships that off, and this library turns it on. Material never marks the
 * step you are *standing in*: the form in front of you is already saying so.
 *
 * The stepper marks each step done as its control turns valid, so the icons track
 * the form rather than being driven by hand.
 */
export const LinearWithValidation: Story = {
  name: 'linear: with validation',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      address: new FormGroup({
        line: new FormControl('', Validators.required),
      }),
      payment: new FormGroup({
        card: new FormControl('', Validators.required),
      }),
    },
    template: frame(`
      <ui-stepper linear aria-label="Checkout">
        <ui-step label="Address" [stepControl]="address" errorMessage="Add a delivery address">
          <form [formGroup]="address" style="padding-block-start: 0.5rem;">
            <ui-input label="Address line" formControlName="line" required />
          </form>
          ${nav({ back: false })}
        </ui-step>
        <ui-step label="Payment" [stepControl]="payment" errorMessage="Add a card number">
          <form [formGroup]="payment" style="padding-block-start: 0.5rem;">
            <ui-input label="Card number" formControlName="card" required />
          </form>
          ${nav()}
        </ui-step>
        <ui-step label="Review">
          ${body('Everything checks out — this step has no control to gate on.')}
          ${nav({ next: false })}
        </ui-step>
      </ui-stepper>`),
  }),
};

/**
 * The same three steps without `linear`: every header is reachable from the start,
 * and the forms still validate — nothing stops the user jumping ahead and coming
 * back. Use this when the parts are genuinely independent and the order is only a
 * suggestion.
 */
export const NonLinear: Story = {
  name: 'linear: off (default)',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      address: new FormGroup({ line: new FormControl('', Validators.required) }),
    },
    template: frame(`
      <ui-stepper aria-label="Checkout">
        <ui-step label="Address" [stepControl]="address" errorMessage="Add a delivery address">
          <form [formGroup]="address" style="padding-block-start: 0.5rem;">
            <ui-input label="Address line" formControlName="line" required />
          </form>
          ${nav({ back: false })}
        </ui-step>
        <ui-step label="Payment">
          ${body('Reachable straight away, even with the address empty.')}
          ${nav()}
        </ui-step>
        <ui-step label="Review">
          ${body('So is this one.')}
          ${nav({ next: false })}
        </ui-step>
      </ui-stepper>`),
  }),
};

// --- Optional and editable -------------------------------------------------

/**
 * An `optional` step is one a linear stepper will let the user walk past without
 * satisfying it — Material captions it "Optional" so that is visible rather than
 * something they have to discover by trying.
 *
 * Press **Next** on Delivery notes with the field empty and the stepper moves on;
 * the same press on Address does not.
 */
export const OptionalStep: Story = {
  name: 'With an optional step',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      address: new FormGroup({ line: new FormControl('', Validators.required) }),
      notes: new FormGroup({ note: new FormControl('') }),
    },
    template: frame(`
      <ui-stepper linear aria-label="Checkout">
        <ui-step label="Address" [stepControl]="address" errorMessage="Add a delivery address">
          <form [formGroup]="address" style="padding-block-start: 0.5rem;">
            <ui-input label="Address line" formControlName="line" required />
          </form>
          ${nav({ back: false })}
        </ui-step>
        <ui-step label="Delivery notes" [stepControl]="notes" optional>
          <form [formGroup]="notes" style="padding-block-start: 0.5rem;">
            <ui-input label="Leave it with a neighbour?" formControlName="note" />
          </form>
          ${nav()}
        </ui-step>
        <ui-step label="Review">
          ${body('Three items, one box.')}
          ${nav({ next: false })}
        </ui-step>
      </ui-stepper>`),
  }),
};

/**
 * `editable="false"` is for a step that cannot be retaken — a payment that has
 * gone through, a confirmation. The stepper stops accepting a backwards move onto
 * it and marks its header done rather than editable, so the user is not invited to
 * change something that is already settled.
 *
 * Everything is editable by default: a stepper is a form, and a user who cannot go
 * back and fix a typo has to start again.
 */
export const NonEditableStep: Story = {
  name: 'With a step that cannot be re-taken',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-stepper aria-label="Checkout" [selectedIndex]="2">
        <ui-step label="Address">
          ${body('Editable — go back and change it any time.')}
          ${nav({ back: false })}
        </ui-step>
        <ui-step label="Payment" editable="false">
          ${body('Taken. The stepper will not come back to this one.')}
          ${nav()}
        </ui-step>
        <ui-step label="Done">
          ${body('Try clicking Payment — the header is done, not editable.')}
        </ui-step>
      </ui-stepper>`),
  }),
};

/**
 * `completed` is the override for the cases the stepper cannot see for itself — a
 * server round-trip, an upload that finished. Left unset, Material works it out
 * from the step's control and whether the user has been there, which is what
 * almost every step wants.
 *
 * Here the first step is only complete once the button says so, and a linear
 * stepper will not pass it until then.
 */
export const CompletedOverride: Story = {
  name: 'completed: driving it by hand',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { uploaded: false },
    template: frame(`
      <ui-stepper linear aria-label="Upload">
        <ui-step label="Upload" [completed]="uploaded">
          ${body('The stepper cannot see an upload finish, so this one is told.')}
          <div style="display: flex; gap: 0.5rem; align-items: center; margin-block-start: 1rem;">
            <button matButton uiButton variant="filled" (click)="uploaded = true">Finish upload</button>
            <button matButton uiButton variant="text" uiStepperNext>Next</button>
            <span style="font: var(--mat-sys-body-medium);">completed is <strong>{{ uploaded }}</strong>.</span>
          </div>
        </ui-step>
        <ui-step label="Review">${body('Reachable once the upload is done.')}</ui-step>
      </ui-stepper>`),
  }),
};

// --- Selection -------------------------------------------------------------

/** A one-way `[selectedIndex]` opens the stepper on a step other than the first. */
export const SelectedIndex: Story = {
  name: 'selectedIndex: opening on a step',
  args: { selectedIndex: 1 },
};

/**
 * `[(selectedIndex)]` keeps a signal and the stepper in step in both directions:
 * the buttons below write to the same state a click on a header does.
 *
 * The binding always names the step actually on screen. Material's own setter
 * throws on an out-of-range index and silently refuses a move a linear stepper
 * disallows — `ui-stepper` clamps the first and reports the second back through
 * this signal, so the two cannot drift apart.
 */
export const TwoWaySelection: Story = {
  name: 'selectedIndex: two-way',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { index: 0 },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <ui-stepper [(selectedIndex)]="index" aria-label="Checkout">${CHECKOUT_STEPS}</ui-stepper>
        <div style="display: flex; gap: 0.5rem; align-items: center; font: var(--mat-sys-body-medium);">
          <button matButton uiButton variant="outlined" (click)="index = 0">Address</button>
          <button matButton uiButton variant="outlined" (click)="index = 2">Review</button>
          <span>selectedIndex is <strong>{{ index }}</strong>.</span>
        </div>
      </div>`),
  }),
};

/**
 * `(selectionChange)` is the richer half: it names the steps either side of the
 * move, not just the new index — and they are the `ui-step`s you wrote, so
 * `event.selectedStep.label()` is a label rather than a Material internal.
 */
export const SelectionChange: Story = {
  name: 'selectionChange',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { last: '—' },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <ui-stepper
          aria-label="Checkout"
          (selectionChange)="last = $event.previouslySelectedStep.label() + ' → ' + $event.selectedStep.label()"
        >${CHECKOUT_STEPS}</ui-stepper>
        <span style="font: var(--mat-sys-body-medium);">Last move: <strong>{{ last }}</strong>.</span>
      </div>`),
  }),
};

// --- Labels ----------------------------------------------------------------

/**
 * `uiStepLabel` renders a step's label as a template instead of its `label` string
 * (rule 7) — the header is the one part of a step a consumer cannot otherwise
 * project into. It renders inside Material's own header, so the ripple, the state
 * icon and the keyboard are untouched.
 *
 * `label` stays required alongside it: it is the step's plain-text name.
 */
export const LabelTemplate: Story = {
  name: 'uiStepLabel: a label with a count',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-stepper aria-label="Checkout">
        <ui-step label="Items">
          <ng-template uiStepLabel>
            <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
              Items
              <span style="
                min-width: 1.25rem;
                padding-inline: 0.375rem;
                border-radius: var(--mat-sys-corner-full);
                background: var(--mat-sys-primary);
                color: var(--mat-sys-on-primary);
                font: var(--mat-sys-label-small);
                text-align: center;">3</span>
            </span>
          </ng-template>
          ${body('Three items in the basket.')}
          ${nav({ back: false })}
        </ui-step>
        <ui-step label="Review">${body('Arriving Thursday.')}</ui-step>
      </ui-stepper>`),
  }),
};

// --- Accessibility ---------------------------------------------------------

/**
 * `aria-label` names Material's `tablist` — what the steps are *of*, not that they
 * are steps. It reaches the real element inside the header rather than sitting on
 * the `<ui-stepper>` host, which no assistive technology ever looks at.
 *
 * A step whose rendered label is not the whole story can be named on the step
 * itself; that lands on Material's own header element.
 */
export const AriaLabel: Story = {
  name: 'a11y: naming the stepper and its steps',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-stepper aria-label="Checkout">
        <ui-step label="Address" aria-label="Address, incomplete">
          ${body('Where the order is going.')}
          ${nav({ back: false })}
        </ui-step>
        <ui-step label="Review">${body('Three items, one box.')}</ui-step>
      </ui-stepper>`),
  }),
};

// --- Styling hooks and escape hatches --------------------------------------

/**
 * `--ui-stepper-color` is read off `<ui-stepper>`, so re-pointing the state icons
 * is an ordinary CSS rule on an ordinary selector — no `::ng-deep`, no
 * `!important`. Point it at another `--mat-sys-*` role rather than a literal, so it
 * survives a palette change and dark mode; `--ui-stepper-on-color` is its
 * legible-on partner and moves with it.
 */
export const CustomColour: Story = {
  name: 'Styling hook: --ui-stepper-color',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 2rem; max-width: 44rem;">
        ${['primary', 'tertiary', 'error']
          .map(
            (role) => `
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">--mat-sys-${role}${role === 'primary' ? ' (default)' : ''}</span>
              <ui-stepper
                aria-label="Checkout in ${role}"
                style="--ui-stepper-color: var(--mat-sys-${role}); --ui-stepper-on-color: var(--mat-sys-on-${role});">
                <ui-step label="Address">${body('Where the order is going.')}</ui-step>
                <ui-step label="Review">${body('Three items, one box.')}</ui-step>
              </ui-stepper>
            </div>`,
          )
          .join('')}
      </div>`,
  }),
};

/**
 * The labels and the connecting line are hooks of their own, for a header that
 * needs the selected step to carry more of the emphasis than M3's icon-only
 * default gives it.
 */
export const CustomLabelColours: Story = {
  name: 'Styling hook: labels and line',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-stepper
        aria-label="Checkout"
        style="
          --ui-stepper-color: var(--mat-sys-tertiary);
          --ui-stepper-on-color: var(--mat-sys-on-tertiary);
          --ui-stepper-selected-label-text-color: var(--mat-sys-tertiary);
          --ui-stepper-line-color: var(--mat-sys-outline-variant);">
        ${CHECKOUT_STEPS}
      </ui-stepper>`),
  }),
};

/**
 * A stepper on a coloured surface: the hooks take the legible-on-that-surface
 * roles, so contrast comes from the theme rather than from a hand-picked hex.
 * `--ui-stepper-container-color` keeps the stepper's own background transparent so
 * the surface below shows through.
 */
export const OnColouredSurface: Story = {
  name: 'Styling hook: on a coloured surface',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="
        max-width: 44rem;
        padding: 1.5rem;
        border-radius: var(--mat-sys-corner-medium);
        background: var(--mat-sys-surface-container-high);">
        <ui-stepper
          aria-label="Checkout"
          style="
            --ui-stepper-container-color: transparent;
            --ui-stepper-color: var(--mat-sys-tertiary);
            --ui-stepper-on-color: var(--mat-sys-on-tertiary);
            --ui-stepper-line-color: var(--mat-sys-outline-variant);">
          <ui-step label="Address">${body('Where the order is going.')}</ui-step>
          <ui-step label="Payment">${body('How it is being paid for.')}</ui-step>
          <ui-step label="Review">${body('Three items, one box.')}</ui-step>
        </ui-stepper>
      </div>`,
  }),
};

/**
 * `exportAs: 'uiStepper'` hands back the component, and `matStepper()` hands back
 * Material's own instance — the escape hatch for anything not wrapped here.
 * `next()`, `previous()` and `reset()` are the same verbs `uiStepperNext` uses, for
 * a consumer driving the stepper from code.
 */
export const EscapeHatch: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <ui-stepper #s="uiStepper" aria-label="Checkout">
          <ui-step label="Address">${body('Where the order is going.')}</ui-step>
          <ui-step label="Payment">${body('How it is being paid for.')}</ui-step>
          <ui-step label="Review">${body('Three items, one box.')}</ui-step>
        </ui-stepper>
        <div style="display: flex; gap: 0.5rem; align-items: center; font: var(--mat-sys-body-medium);">
          <button matButton uiButton variant="outlined" (click)="s.previous()">Previous</button>
          <button matButton uiButton variant="outlined" (click)="s.next()">Next</button>
          <button matButton uiButton variant="text" (click)="s.reset()">Reset</button>
          <span>{{ s.steps().length }} steps, on <strong>{{ s.selectedIndex() }}</strong>.</span>
        </div>
      </div>`),
  }),
};
