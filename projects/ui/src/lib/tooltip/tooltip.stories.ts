import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  afterNextRender,
  input,
  viewChild,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, waitFor } from 'storybook/test';

import { Button } from '../button/button';
import { Tooltip, type UiTooltipPosition } from './tooltip';

/** The four cardinal positions — the set `position` is normally choosing between. */
const POSITIONS: UiTooltipPosition[] = ['above', 'below', 'left', 'right'];

/** The direction-aware pair, which flips under RTL. */
const LOGICAL_POSITIONS: UiTooltipPosition[] = ['before', 'after'];

const LONG_MESSAGE =
  'Saves this draft to your workspace and shares it with everyone on the team, ' +
  'including the reviewers you added a moment ago.';

/**
 * The story args. `panelClass` is the directive's own signal input; the rest are
 * inputs it exposes through `hostDirectives`, so they are bindable on
 * `[uiTooltip]` but are not members of the class for Storybook to infer.
 */
type TooltipArgs = Tooltip & {
  uiTooltip: string;
  position: UiTooltipPosition;
  uiTooltipDisabled: boolean;
  uiTooltipShowDelay: number;
  uiTooltipHideDelay: number;
  uiTooltipPositionAtOrigin: boolean;
};

/**
 * A trigger that opens its own tooltip as soon as it renders.
 *
 * A tooltip is hover- and focus-only by nature, which makes it the one component
 * in this library that a static story cannot show: the page would be a row of
 * buttons and a note saying "trust us". So the stories that document what a
 * tooltip *looks* like — every position, long text wrapping, the colour hooks —
 * open it through `MatTooltip.show()`, which is the same escape hatch a consumer
 * reaches for through `exportAs`. The stories that document *behaviour* leave it
 * alone, so hovering does what a consumer will actually see.
 */
@Component({
  selector: 'ui-tooltip-open-demo',
  imports: [MatButton, Button, Tooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      matButton
      uiButton
      variant="filled"
      #tip="uiTooltip"
      [uiTooltip]="message()"
      [position]="position()"
      [panelClass]="panelClass()"
    >
      {{ label() }}
    </button>
  `,
})
class TooltipOpenDemo {
  readonly message = input.required<string>();
  readonly position = input<UiTooltipPosition>('below');
  readonly panelClass = input<string | string[]>([]);
  readonly label = input('Save');

  private readonly tip = viewChild.required<Tooltip>('tip');

  constructor() {
    // After the first render, so the `viewChild` has resolved and Material has a
    // laid-out host box to anchor the overlay to.
    afterNextRender(() => this.tip().matTooltip.show(0));
  }
}

/**
 * The colour hooks, set the way a consumer sets them: an ordinary rule in a
 * global stylesheet — here, a component with `ViewEncapsulation.None` — reached
 * through `panelClass`, which is *added* to `.ui-tooltip` rather than replacing
 * it, so the theme underneath survives.
 */
@Component({
  selector: 'ui-tooltip-styled-demo',
  imports: [TooltipOpenDemo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: `
    .demo-danger-tooltip {
      /* Pointed at theme roles rather than literals, so this still follows the
         palette and dark mode — and on-error is the role M3 guarantees is
         legible on error. */
      --ui-tooltip-container-color: var(--mat-sys-error);
      --ui-tooltip-text-color: var(--mat-sys-on-error);
    }
  `,
  template: `
    <div style="padding: 3rem; padding-bottom: 8rem; display: flex; justify-content: center;">
      <ui-tooltip-open-demo
        message="Deletes the draft for everyone"
        position="below"
        panelClass="demo-danger-tooltip"
        label="Delete"
      />
    </div>
  `,
})
class TooltipStyledDemo {}

/** `--ui-tooltip-max-width`, against Material's own 200px cap. */
@Component({
  selector: 'ui-tooltip-width-demo',
  imports: [TooltipOpenDemo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: `
    .demo-wide-tooltip {
      --ui-tooltip-max-width: 24rem;
    }
  `,
  template: `
    <div
      style="display: flex; gap: 10rem; justify-content: center; padding: 3rem; padding-bottom: 14rem;"
    >
      <ui-tooltip-open-demo [message]="message" position="below" label="200px (default)" />
      <ui-tooltip-open-demo
        [message]="message"
        position="below"
        panelClass="demo-wide-tooltip"
        label="24rem"
      />
    </div>
  `,
})
class TooltipWidthDemo {
  protected readonly message = LONG_MESSAGE;
}

const meta: Meta<TooltipArgs> = {
  title: 'Components/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [Tooltip, Button, MatButton, MatIconButton, MatIcon] })],
  args: {
    uiTooltip: 'Save the current draft',
    position: 'below',
    uiTooltipDisabled: false,
  },
  argTypes: {
    uiTooltip: { name: 'uiTooltip (message)', control: 'text' },
    position: { control: 'inline-radio', options: [...POSITIONS, ...LOGICAL_POSITIONS] },
    uiTooltipDisabled: { control: 'boolean' },
    uiTooltipShowDelay: { control: 'number' },
    uiTooltipHideDelay: { control: 'number' },
    uiTooltipPositionAtOrigin: { control: 'boolean' },
    panelClass: { control: 'text' },
    matTooltip: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`uiTooltip` is the shared theme applied to Angular Material’s `matTooltip`.',
          '',
          'Like `uiBadge` and unlike `ui-card`, it is a **directive**, not a wrapper component: a',
          'tooltip decorates something — a button, an icon, a link — and the thing it decorates is',
          'the consumer’s element. So the element you write is the element the browser gets, and',
          '`aria-*`, `id`, `disabled`, `routerLink` and `data-*` all keep working with no forwarding.',
          '',
          '`MatTooltip` is a real directive, so `uiTooltip` pulls it onto the host itself and you',
          'write a single attribute — no `matTooltip` alongside it, unlike `uiButton`, where',
          'Material’s button is a *component* and has to be in the template.',
          '',
          '### Inputs',
          '',
          'The message rides on the directive’s own attribute — `uiTooltip="…"` — the same shape as',
          '`matTooltip` itself. `position` (default `below`) and `panelClass` are bare, because',
          'neither is a native attribute name. Everything else keeps Material’s `matTooltip*` shape',
          'as `uiTooltip*`: that prefix is *why* Material chose it. `disabled` in particular is a',
          'native attribute, and an input claiming it would quietly eat `[disabled]` on a real button',
          '— in the very case a tooltip is most wanted for. Hence **`uiTooltipDisabled`**, which',
          'disables the *tooltip*; `disabled` still disables the *host*.',
          '',
          '### Theming',
          '',
          'Stock M3 already paints the tooltip from this theme’s roles (`inverse-surface` /',
          '`inverse-on-surface`, `body-small`), so there is no colour to correct — what the theme',
          'adds is the `.ui-tooltip` class on Material’s own container and the `--ui-tooltip-*` hooks',
          'that hang off it. There is not a literal colour in `src/styles/_tooltip.scss`, so every',
          'story below renders the exact palette a consuming app gets, dark mode included.',
          '',
          '### Restyling',
          '',
          'A tooltip renders into the CDK overlay at the end of `<body>`, so a hook set on the host',
          'would never reach it: pass a `panelClass` and set `--ui-tooltip-container-color`,',
          '`--ui-tooltip-text-color` or `--ui-tooltip-max-width` on that class from a global',
          'stylesheet. The overlay is outside every component’s encapsulation anyway — no',
          '`::ng-deep`, no `!important`.',
          '',
          '### Accessibility',
          '',
          'Material describes the host with the message, so a tooltip is not a name: an icon-only',
          'button still needs its own `aria-label`. It is hover- and focus-only, so it must never be',
          'the only place information lives.',
          '',
          'Most stories here need a hover to show anything — that is what a tooltip is. The ones',
          'documenting position, wrapping and the styling hooks open themselves, so the page shows',
          'what it is describing.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<div style="padding: 3rem; display: flex; justify-content: center;">
      <button matButton uiButton variant="filled" ${argsToTemplate(args)}>Save</button>
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<TooltipArgs>;

/** The default: a `below` tooltip on a button. Hover or tab to it. */
export const Default: Story = {};

// --- Positions --------------------------------------------------------------
//
// Each one opened, and each its own story, so every position is independently
// linkable and independently axe-asserted rather than only a cell in the grid.

/** Above the host. */
export const Above: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `<div style="padding: 6rem 3rem;">
      <ui-tooltip-open-demo message="Save the current draft" position="above" />
    </div>`,
    moduleMetadata: { imports: [TooltipOpenDemo] },
  }),
};

/** Below the host — the default, and Material’s own. */
export const Below: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `<div style="padding: 6rem 3rem;">
      <ui-tooltip-open-demo message="Save the current draft" position="below" />
    </div>`,
    moduleMetadata: { imports: [TooltipOpenDemo] },
  }),
};

/** Physically left, whatever the reading direction. */
export const Left: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `<div style="padding: 6rem 3rem; display: flex; justify-content: flex-end;">
      <ui-tooltip-open-demo message="Save the current draft" position="left" />
    </div>`,
    moduleMetadata: { imports: [TooltipOpenDemo] },
  }),
};

/** Physically right, whatever the reading direction. */
export const Right: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `<div style="padding: 6rem 3rem;">
      <ui-tooltip-open-demo message="Save the current draft" position="right" />
    </div>`,
    moduleMetadata: { imports: [TooltipOpenDemo] },
  }),
};

/**
 * The direction-aware pair. `before`/`after` follow the text direction — they are
 * `left`/`right` under LTR and swap under RTL — so prefer them for anything
 * anchored to reading order.
 */
export const BeforeAndAfter: Story = {
  name: 'Position: before / after',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `<div style="display: flex; gap: 8rem; justify-content: center; padding: 6rem 3rem;">
      ${LOGICAL_POSITIONS.map(
        (position) =>
          `<ui-tooltip-open-demo message="Tooltip ${position}" position="${position}" label="${position}" />`,
      ).join('')}
    </div>`,
    moduleMetadata: { imports: [TooltipOpenDemo] },
  }),
};

/** Every cardinal position at once — the set a consumer is choosing between. */
export const Positions: Story = {
  name: 'Position: every side',
  // The one story that asserts the opening itself works. Every story below that
  // shows a tooltip rather than describing one depends on `TooltipOpenDemo`, and
  // an overlay that quietly failed to open would leave a page of bare buttons
  // that still passes every other check — including the axe run, which only
  // renders. This is that guard, on the story with the most to lose.
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const open = canvasElement.ownerDocument.querySelectorAll('.ui-tooltip');
      expect(open.length).toBe(POSITIONS.length);
      expect(open[0].textContent?.trim()).toContain('Tooltip');
    });
  },
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8rem 10rem; padding: 6rem 5rem; justify-items: center;">
      ${POSITIONS.map(
        (position) =>
          `<ui-tooltip-open-demo message="Tooltip ${position}" position="${position}" label="${position}" />`,
      ).join('')}
    </div>`,
    moduleMetadata: { imports: [TooltipOpenDemo] },
  }),
};

// --- Content ----------------------------------------------------------------

/**
 * Long text wraps rather than clipping: Material caps the surface at 200px wide
 * and centres it, and it grows down. Past `max-height: 40vh` it *is* clipped, so
 * this is the point at which to widen it (below) or to stop using a tooltip.
 */
export const LongText: Story = {
  name: 'Content: long text wraps',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `<div style="padding: 3rem; padding-bottom: 12rem;">
      <ui-tooltip-open-demo message="${LONG_MESSAGE}" position="below" />
    </div>`,
    moduleMetadata: { imports: [TooltipOpenDemo] },
  }),
};

/** The everyday case: a few words, one line. */
export const ShortText: Story = {
  name: 'Content: short text',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `<div style="padding: 3rem; padding-bottom: 8rem;">
      <ui-tooltip-open-demo message="Save" position="below" />
    </div>`,
    moduleMetadata: { imports: [TooltipOpenDemo] },
  }),
};

/**
 * An empty message never opens — Material's own guard. That is what lets a
 * consumer bind a real value straight through without guarding for the empty
 * case in the template. Hovering this button does nothing.
 */
export const EmptyMessage: Story = {
  name: 'Content: empty (never opens)',
  args: { uiTooltip: '' },
};

// --- States -----------------------------------------------------------------

/**
 * `uiTooltipDisabled` turns the tooltip off and leaves the host alone — for a
 * hint that only applies in some states. The message is also dropped from the
 * host's accessible description while disabled, so nothing is announced that is
 * no longer shown. Hovering this button does nothing.
 */
export const Disabled: Story = {
  name: 'State: uiTooltipDisabled',
  args: { uiTooltipDisabled: true },
};

/**
 * The two `disabled`s, side by side — and the reason the tooltip's is not called
 * `disabled`.
 *
 * `disabled` is the *button's*: an input claiming that name would have eaten this
 * binding and left the button live. The catch is a native one, not this
 * library's: a disabled button fires no pointer events, so its tooltip cannot
 * open on hover. Material's own answer is `disabledInteractive` — the button
 * stays `aria-disabled` and unclickable, but still hoverable and focusable — so
 * "why is this disabled?" can finally be answered, which is the commonest reason
 * to want a tooltip at all.
 */
export const DisabledHost: Story = {
  name: 'State: disabled host',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; gap: 3rem; align-items: center; padding: 3rem; padding-bottom: 8rem;">
        <button matButton uiButton variant="filled" uiTooltip="Fill in the form first" disabled>
          disabled (no hover)
        </button>
        <button
          matButton
          uiButton
          variant="filled"
          uiTooltip="Fill in the form first"
          disabled
          disabledInteractive
        >
          disabled + disabledInteractive
        </button>
        <button matButton uiButton variant="filled" uiTooltip="Saves your draft">
          enabled
        </button>
      </div>`,
  }),
};

// --- Delays -----------------------------------------------------------------

/**
 * `uiTooltipShowDelay` and `uiTooltipHideDelay` are Material's, passed straight
 * through. A show delay keeps tooltips from flashing as the pointer crosses a
 * toolbar; a hide delay gives the user a moment to move onto the tooltip itself.
 */
export const Delays: Story = {
  name: 'Delay: show and hide',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; gap: 3rem; align-items: center; padding: 3rem; padding-bottom: 8rem;">
        <button matButton uiButton variant="filled" uiTooltip="Opens at once">
          no delay
        </button>
        <button
          matButton
          uiButton
          variant="filled"
          uiTooltip="Waited 500ms for you to settle"
          [uiTooltipShowDelay]="500"
        >
          500ms show
        </button>
        <button
          matButton
          uiButton
          variant="filled"
          uiTooltip="Sticks around for a second after you leave"
          [uiTooltipHideDelay]="1000"
        >
          1s hide
        </button>
      </div>`,
  }),
};

// --- Hosts ------------------------------------------------------------------

/**
 * The directive goes on whatever is being described — the host keeps being
 * itself. The anchor here is a real `<a href>`: it still navigates, and would
 * still take a `routerLink`, because nothing wraps it.
 *
 * Note the icon button: the tooltip repeats its `aria-label` rather than
 * replacing it. A tooltip is a *description*, not a name.
 */
export const Hosts: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; gap: 3rem; align-items: center; padding: 3rem; padding-bottom: 8rem;
                  font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface);">
        <button matButton uiButton variant="filled" uiTooltip="Saves your draft">Save</button>

        <button matIconButton uiTooltip="Delete this draft" aria-label="Delete this draft">
          <mat-icon>delete</mat-icon>
        </button>

        <a href="#" uiTooltip="Back to the inbox" style="color: var(--mat-sys-primary);">Inbox</a>

        <span uiTooltip="Counted at 09:00 this morning" tabindex="0">12 open items</span>
      </div>`,
  }),
};

// --- Styling hooks and escape hatches ---------------------------------------

/**
 * The colour hooks. A tooltip renders into the CDK overlay at the end of
 * `<body>`, so a custom property set on the host would never reach it — pass a
 * `panelClass` and set the hooks on that class instead. The class is *added* to
 * `.ui-tooltip` rather than replacing it, so the theme survives.
 *
 * The rule below is an ordinary one in a global stylesheet (here, a component
 * with `ViewEncapsulation.None`, exactly as a consumer's own would be). No
 * `::ng-deep`, no `!important`. Point the colours at `--mat-sys-*` / `--ui-sys-*`
 * roles rather than literals, so they survive a palette change and dark mode.
 */
export const CustomProperties: Story = {
  name: 'Styling hook: --ui-tooltip-*',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `<ui-tooltip-styled-demo />`,
    moduleMetadata: { imports: [TooltipStyledDemo] },
  }),
};

/**
 * `--ui-tooltip-max-width` is the one hook that is not a colour. Material caps
 * the surface at 200px and hard-codes it, with no token and an `overflow: hidden`
 * behind it — so a long message that would clip has nowhere to go without this.
 */
export const MaxWidth: Story = {
  name: 'Styling hook: --ui-tooltip-max-width',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `<ui-tooltip-width-demo />`,
    moduleMetadata: { imports: [TooltipWidthDemo] },
  }),
};

/**
 * `exportAs: 'uiTooltip'` hands back the directive, and `matTooltip` hands back
 * Material's own instance — the escape hatch for everything this directive does
 * not wrap. `show()`, `hide()` and `toggle()` are how a tooltip is opened from
 * code, for a hint that has to appear without a pointer.
 */
export const TemplateRef: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; gap: 1rem; align-items: center; padding: 3rem; padding-bottom: 8rem;">
        <button
          matButton
          uiButton
          variant="filled"
          uiTooltip="Opened from code, not from a hover"
          #tip="uiTooltip"
        >
          Target
        </button>
        <button matButton uiButton variant="outlined" (click)="tip.matTooltip.toggle()">
          Toggle it
        </button>
      </div>`,
  }),
};
