import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Button } from '../button/button';
import { Slider } from './slider';

/**
 * A slider takes the width it is given, so every story gets a container to fill.
 * Nothing here is part of the component's own layout.
 */
const frame = (content: string) => `<div style="width: 22rem; max-width: 100%;">${content}</div>`;

/** Captions a slider, so a story is readable without opening the source. */
const caption = (text: string, content: string) => `
  <div style="display: flex; flex-direction: column;">
    ${content}
    <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${text}</span>
  </div>`;

/** Stacks captioned sliders, which is how one slider is compared with another. */
const stack = (content: string) =>
  `<div style="display: flex; flex-direction: column; gap: 1.5rem; width: 22rem; max-width: 100%;">${content}</div>`;

/** The label a slider needs from outside, since it carries none of its own. */
const labelled = (id: string, text: string, content: string) => `
  <div style="display: flex; flex-direction: column;">
    <label id="${id}" style="font: var(--mat-sys-label-large);">${text}</label>
    ${content}
  </div>`;

const meta: Meta<Slider> = {
  title: 'Components/Slider',
  component: Slider,
  tags: ['autodocs'],
  decorators: [
    // The forms directives the form stories are built from, plus Material's
    // button and this library's `uiButton` — which needs `MatButton` alongside
    // it, since it decorates Material's button rather than replacing it.
    moduleMetadata({ imports: [Slider, FormsModule, ReactiveFormsModule, MatButton, Button] }),
  ],
  args: {
    min: 0,
    max: 100,
    step: 1,
    value: 40,
    startValue: 20,
    endValue: 80,
    disabled: false,
    discrete: false,
    showTicks: false,
    range: false,
    disableRipple: false,
  },
  argTypes: {
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    value: { control: 'number' },
    startValue: { control: 'number' },
    endValue: { control: 'number' },
    disabled: { control: 'boolean' },
    discrete: { control: 'boolean' },
    showTicks: { control: 'boolean' },
    range: { control: 'boolean' },
    disableRipple: { control: 'boolean' },
    startAriaLabel: { control: 'text' },
    endAriaLabel: { control: 'text' },
    name: { control: 'text' },
    displayWith: { control: false },
    changed: { action: 'changed' },
    valueChange: { action: 'valueChange' },
    startValueChange: { action: 'startValueChange' },
    endValueChange: { action: 'endValueChange' },
    // Documented in the table but not knobs: their inputs are aliased to the
    // ARIA attributes, which `argsToTemplate` cannot bind — it writes the class
    // member name. The a11y stories cover them for real.
    ariaLabel: { name: 'aria-label', control: false },
    ariaLabelledby: { name: 'aria-labelledby', control: false },
    matSlider: { table: { disable: true } },
    thumb: { table: { disable: true } },
    startThumb: { table: { disable: true } },
    endThumb: { table: { disable: true } },
    sliderElement: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-slider` is the shared theme applied to Angular Material’s `<mat-slider>`, wired as a',
          'form control. Like `ui-toggle`, and unlike `uiButton`, it is a **component** rather than a',
          'directive: `MatSlider` is a component with an element selector, so there is no native',
          'element to decorate — the `<input type="range">` is what Material wants *inside* the track,',
          'the tick marks, the value indicator and the ripples it composes.',
          '',
          '### It is Material, not a re-implementation',
          '',
          'The track and its fill, the handle, the ripple and state layers, the tick marks, the',
          'discrete value indicator, the drag and keyboard handling, the RTL flip and every colour are',
          '`<mat-slider>`’s own, resolved from the `--mat-sys-*` tokens the shared theme emits. There',
          'is not a literal colour in `slider.scss` — so every story below renders the exact palette a',
          'consuming app gets. Toggle your OS light/dark preference to watch them follow.',
          '',
          'Each thumb is a **real `<input type="range">`**, so the arrow keys, Home/End and Page',
          'Up/Down work here because none of it is emulated. Tab to one and try it.',
          '',
          '`color` is not an input, because Material’s own `color` is an M2-only API that does nothing',
          'under an M3 theme. The `--ui-slider-*` hooks are the M3 answer — see **Theming**.',
          '',
          '### Forms',
          '',
          '`ui-slider` is a `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]` and',
          '`formControlName` work with no adapter — bind the host, not the input inside it. A `range`',
          'slider is still **one** control: its value is `{ start, end }`. `[(value)]` — or',
          '`[(startValue)]` / `[(endValue)]` — is the same state without a forms directive.',
          '',
          '### Naming it',
          '',
          'A slider carries no label of its own. Give a single-thumb one `aria-label` or',
          '`aria-labelledby`; give a `range` one `startAriaLabel` and `endAriaLabel`, because each',
          'thumb is a control of its own and "Price" names neither.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: frame(`<ui-slider aria-label="Volume" ${argsToTemplate(args)} />`),
  }),
};

export default meta;
type Story = StoryObj<Slider>;

/**
 * The basic slider: one thumb over `0`–`100`, moving in steps of one. The filled
 * half of the track and the handle are the theme’s `primary` role; the empty half
 * is the neutral `surface-variant` M3 gives it.
 */
export const Default: Story = {};

/**
 * `step` is what the arrow keys move by, and what a drag settles on — the browser
 * enforces it, because the thumb is a real range input. A slider over a
 * continuous quantity wants a fraction of a unit; one over a count wants an
 * integer.
 */
export const Steps: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: stack(
      [
        ['step="1" · the default', '<ui-slider aria-label="Percent" [value]="40" />'],
        [
          'step="0.1" · a continuous quantity',
          '<ui-slider aria-label="Opacity" [max]="1" [step]="0.1" [value]="0.4" discrete />',
        ],
        [
          'step="10" · a coarse choice',
          '<ui-slider aria-label="Volume" [step]="10" [value]="40" discrete />',
        ],
      ]
        .map(([name, content]) => caption(name, content))
        .join('\n'),
    ),
  }),
};

/**
 * `min` and `max` are the range the thumb moves over — they reach the real
 * input, so the browser is what enforces them.
 *
 * Note that `value` defaults to `0`, not to `min`: an input cannot read another
 * at construction. Give a slider that does not start at zero a value of its own.
 */
export const MinMax: Story = {
  name: 'min and max',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: stack(
      [
        ['0–100 · the default', '<ui-slider aria-label="Percent" [value]="40" />'],
        [
          '-50–50 · a signed range',
          '<ui-slider aria-label="Balance" [min]="-50" [max]="50" [value]="0" discrete />',
        ],
        [
          '1970–2026 · a year',
          '<ui-slider aria-label="Year" [min]="1970" [max]="2026" [value]="1999" discrete />',
        ],
      ]
        .map(([name, content]) => caption(name, content))
        .join('\n'),
    ),
  }),
};

/**
 * `discrete` shows Material’s value indicator over the handle while it moves, and
 * `showTicks` marks every step — the affordance for a slider whose exact value
 * matters, like a rating.
 *
 * Ticks are only meaningful where the steps are countable: at the default `step`
 * of `1` over `0`–`100` they are 101 dots, which is a texture rather than an
 * affordance. Pair them with a `step` coarse enough to see, as below.
 *
 * Drag a thumb to see the indicator.
 */
export const DiscreteWithTicks: Story = {
  name: 'Discrete with ticks',
  args: { discrete: true, showTicks: true, min: 0, max: 10, step: 1, value: 4 },
  render: (args) => ({
    props: args,
    template: frame(
      labelled(
        'rating-label',
        'Rating',
        `<ui-slider aria-labelledby="rating-label" ${argsToTemplate(args)} />`,
      ),
    ),
  }),
};

/**
 * `displayWith` formats what the indicator says — it is Material’s own input,
 * passed straight through (rule 4). It is a label, not the value: the control
 * still reports the number.
 */
export const DisplayWith: Story = {
  name: 'discrete: displayWith',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      asCurrency: (value: number) => `£${value}`,
      asPercent: (value: number) => `${value}%`,
    },
    template: stack(
      [
        // The captions spell the braces as entities: a caption is rendered as an
        // Angular template, and a bare `${value}` in one reads as a malformed ICU
        // expression rather than as the string it is quoting.
        caption(
          'displayWith: value =&gt; `£&#123;value&#125;`',
          '<ui-slider aria-label="Budget" discrete [max]="500" [step]="50" [value]="250" [displayWith]="asCurrency" />',
        ),
        caption(
          'displayWith: value =&gt; `&#123;value&#125;%`',
          '<ui-slider aria-label="Zoom" discrete [step]="10" [value]="60" [displayWith]="asPercent" />',
        ),
      ].join('\n'),
    ),
  }),
};

/**
 * `range` gives the slider two thumbs, and so a range rather than a value. Its
 * form value is one `{ start, end }` object, not two controls to keep in step by
 * hand.
 *
 * Each thumb is a control of its own, so each needs its own name:
 * `startAriaLabel` and `endAriaLabel`. Material stops them crossing — try
 * dragging one past the other.
 */
export const Range: Story = {
  args: {
    range: true,
    startValue: 20,
    endValue: 80,
    startAriaLabel: 'Cheapest',
    endAriaLabel: 'Dearest',
  },
  render: (args) => ({
    props: args,
    template: frame(
      labelled(
        'price-label',
        'Price',
        `<ui-slider aria-labelledby="price-label" ${argsToTemplate(args)} />`,
      ),
    ),
  }),
};

/** A range slider with the value indicator and ticks — a filter over a small, countable range. */
export const RangeDiscrete: Story = {
  name: 'Range: discrete with ticks',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { nights: { start: 2, end: 5 } },
    template: frame(
      labelled(
        'nights-label',
        'Nights',
        `<ui-slider
         aria-labelledby="nights-label"
         range
         discrete
         showTicks
         [min]="1"
         [max]="14"
         startAriaLabel="From"
         endAriaLabel="To"
         [(ngModel)]="nights"
       />
       <p style="font: var(--mat-sys-body-small); margin: 0.5rem 0 0;">
         nights: <strong>{{ nights.start }} – {{ nights.end }}</strong>
       </p>`,
      ),
    ),
  }),
};

/**
 * Not editable, not focusable. The track, the handle and the ticks all drop to
 * the theme’s disabled tones — not one of which is a colour this library picked.
 */
export const Disabled: Story = { args: { disabled: true } };

/** Every shape of the control, disabled — the state a form in flight puts them in. */
export const DisabledStates: Story = {
  name: 'Disabled: every shape',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: stack(
      [
        caption('basic', '<ui-slider aria-label="Volume" [value]="40" disabled />'),
        caption(
          'discrete with ticks',
          '<ui-slider aria-label="Rating" [max]="10" [value]="4" discrete showTicks disabled />',
        ),
        caption(
          'range',
          '<ui-slider range startAriaLabel="From" endAriaLabel="To" [startValue]="20" [endValue]="80" disabled />',
        ),
      ].join('\n'),
    ),
  }),
};

// --- Forms -----------------------------------------------------------------

/**
 * `[(ngModel)]` binds the host — `ui-slider` is a `ControlValueAccessor`, so there
 * is no adapter and nothing to reach inside for (rule 5). Drag the thumb and watch
 * the model follow it: the value is live, not deferred to the end of the gesture.
 */
export const NgModel: Story = {
  name: 'Forms: [(ngModel)]',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { volume: 40 },
    template: frame(
      labelled(
        'volume-label',
        'Volume',
        `<ui-slider aria-labelledby="volume-label" [(ngModel)]="volume" />
         <p style="font: var(--mat-sys-body-small); margin: 0.5rem 0 0;">
           volume: <strong>{{ volume }}</strong>
         </p>`,
      ),
    ),
  }),
};

/**
 * A range is **one** form control holding `{ start, end }` — not two controls an
 * app has to keep in step. `reset()` opens the thumbs back out to `min` and
 * `max`, which is the state a filter starts in.
 */
export const RangeForm: Story = {
  name: 'Forms: range is one control',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      price: new FormControl<{ start: number; end: number } | null>({ start: 20, end: 80 }),
    },
    template: frame(
      labelled(
        'budget-label',
        'Budget',
        `<ui-slider
           aria-labelledby="budget-label"
           range
           startAriaLabel="Cheapest"
           endAriaLabel="Dearest"
           [formControl]="price"
         />
         <p style="font: var(--mat-sys-body-small); margin: 0.5rem 0 1rem;">
           value:
           <strong>
             @if (price.value) {
               &#123; start: {{ price.value.start }}, end: {{ price.value.end }} &#125;
             } @else {
               null — reset, so the thumbs open back out to min and max
             }
           </strong>
         </p>
         <button matButton uiButton variant="outlined" (click)="price.reset()">Reset</button>`,
      ),
    ),
  }),
};

/**
 * `changed` is the *user*, and only the user, and only once per gesture: it is
 * Material’s own `valueChange` — the real input’s native `change` event —
 * forwarded. `[(value)]` follows the thumb live; `changed` fires when it is let
 * go, or on a keypress.
 *
 * Reach for it when the point is that someone chose, which for a slider is
 * usually the request that saves the setting: one per drag, not one per pixel.
 * The button below moves the value from code, and does not fire it.
 */
export const Changed: Story = {
  name: 'changed vs valueChange',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { volume: 40, saves: 0 },
    template: frame(
      labelled(
        'changed-label',
        'Volume',
        `<ui-slider aria-labelledby="changed-label" [(value)]="volume" (changed)="saves = saves + 1" />
         <p style="font: var(--mat-sys-body-small); margin: 0.5rem 0 1rem;">
           volume: <strong>{{ volume }}</strong> · changed fired <strong>{{ saves }}</strong> time(s)
         </p>
         <button matButton uiButton variant="outlined" (click)="volume = 40">Reset from code</button>`,
      ),
    ),
  }),
};

/**
 * A form’s own `disable()` reaches the slider through `setDisabledState`, so a
 * `FormControl` that starts disabled — or is disabled later — needs nothing in the
 * template.
 */
export const FormDisabled: Story = {
  name: 'Forms: control.disable()',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { control: new FormControl({ value: 40, disabled: true }) },
    template: frame(
      labelled(
        'form-disabled-label',
        'Volume',
        `<ui-slider aria-labelledby="form-disabled-label" [formControl]="control" />
         <button matButton uiButton variant="outlined" style="margin-top: 1rem;"
                 (click)="control.enabled ? control.disable() : control.enable()">
           Toggle
         </button>`,
      ),
    ),
  }),
};

// --- Theming ---------------------------------------------------------------

/**
 * Rule 6. Material’s `color` input is an M2-only API that does nothing under an M3
 * theme, so the colour is two CSS custom properties resolved through
 * `mat.slider-overrides()` against the theme’s own tokens:
 *
 * - `--ui-slider-color` — the active track, the handle, its ripple and state layers,
 *   and the value indicator
 * - `--ui-slider-on-color` — what is drawn on that colour: the indicator’s text, the
 *   ticks over the active track, the outline between overlapping thumbs
 *
 * The two are one M3 role pair, so re-point them together (`error` / `on-error`, or
 * the theme’s own `--ui-sys-success` / `--ui-sys-on-success`) rather than at
 * literals, and they survive a palette change and dark mode. No `::ng-deep`, no
 * `!important`.
 *
 * The *inactive* track is deliberately not hooked: it is the theme’s neutral
 * surface, and a slider whose empty half carries a colour of its own is one nobody
 * can read at a glance.
 */
export const Theming: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: stack(
      [
        ['default (primary)', ''],
        [
          'tertiary',
          'style="--ui-slider-color: var(--mat-sys-tertiary); --ui-slider-on-color: var(--mat-sys-on-tertiary);"',
        ],
        [
          'success (--ui-sys-*)',
          'style="--ui-slider-color: var(--ui-sys-success); --ui-slider-on-color: var(--ui-sys-on-success);"',
        ],
        [
          'error',
          'style="--ui-slider-color: var(--mat-sys-error); --ui-slider-on-color: var(--mat-sys-on-error);"',
        ],
      ]
        .map(([name, style]) =>
          caption(
            name,
            `<ui-slider aria-label="${name}" [max]="10" [value]="4" discrete showTicks ${style} />`,
          ),
        )
        .join('\n'),
    ),
  }),
};

// --- Accessibility ---------------------------------------------------------

/**
 * A slider carries no label of its own, so it takes one from outside. The usual
 * shape for a form row is `aria-labelledby` pointing at the visible label —
 * `aria-label` is for a slider whose meaning is carried by something else, like an
 * icon beside it in a toolbar.
 *
 * Both are inputs rather than forwarded attributes, because the element they
 * belong on is the `<input type="range">` inside Material’s template. Inspect the
 * DOM: the wrapper does not keep a copy.
 */
export const Labelling: Story = {
  name: 'a11y: naming the slider',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: stack(
      [
        labelled('zoom-label', 'Zoom', '<ui-slider aria-labelledby="zoom-label" [value]="60" />'),
        caption('aria-label="Volume"', '<ui-slider aria-label="Volume" [value]="40" />'),
      ].join('\n'),
    ),
  }),
};

/**
 * Rule 3. Everything this component does not name is moved onto the real control —
 * inspect the DOM here: `id`, `data-*` and `tabindex` are on the `<input
 * type="range">`, not stranded on the wrapper, so a `<label for>` points at
 * something and the tab order is the control’s.
 *
 * A `range` slider has two inputs and therefore no single control, so its
 * forwarded attributes go on `<mat-slider>` instead — the group, exactly as
 * `ui-radio-group` forwards to `<mat-radio-group>` rather than picking one of its
 * buttons. Anything that has to name a thumb has an input of its own.
 */
export const NativeAttributes: Story = {
  name: 'Native attributes',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: stack(
      [
        `<div style="display: flex; flex-direction: column;">
           <label for="brightness" style="font: var(--mat-sys-label-large);">Brightness</label>
           <ui-slider id="brightness" data-testid="brightness" [value]="60" />
           <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">
             The <code>&lt;label for&gt;</code> works because <code>id</code> reaches the real input.
           </span>
         </div>`,
      ].join('\n'),
    ),
  }),
};
