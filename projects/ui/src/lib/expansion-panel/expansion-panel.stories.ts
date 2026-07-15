import { MatButton } from '@angular/material/button';
import { expect } from 'storybook/test';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Button } from '../button/button';
import { Accordion } from './accordion';
import {
  ExpansionPanel,
  ExpansionPanelActions,
  ExpansionPanelDescription,
  ExpansionPanelTitle,
  type UiExpansionPanelTogglePosition,
} from './expansion-panel';

const TOGGLE_POSITIONS: UiExpansionPanelTogglePosition[] = ['after', 'before'];

/** A panel body reads as prose, so every story's content is styled like prose. */
const body = (text: string) =>
  `<p style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface); margin: 0;">${text}</p>`;

/** A caption over a specimen, for the stories that show several at once. */
const caption = (text: string) =>
  `<span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${text}</span>`;

/**
 * Stories render at a realistic width rather than filling the canvas: a panel spans
 * its container, and how a header lays its title out against its description is
 * only legible against a container that has an edge.
 */
const frame = (content: string, width = '32rem') =>
  `<div style="max-width: ${width};">${content}</div>`;

/** The three panels the accordion stories use — a plausible order rather than "Panel 1". */
const ORDER_PANELS = `
  <ui-expansion-panel title="Details" description="Placed 2 March">
    ${body('Order 4213, placed on 2 March by Sam Carter.')}
  </ui-expansion-panel>
  <ui-expansion-panel title="Items" description="3 items">
    ${body('Three items, packed in one box.')}
  </ui-expansion-panel>
  <ui-expansion-panel title="History" description="Last updated yesterday">
    ${body('Created yesterday by Sam.')}
  </ui-expansion-panel>`;

const meta: Meta<ExpansionPanel> = {
  title: 'Components/Expansion panel',
  component: ExpansionPanel,
  tags: ['autodocs'],
  decorators: [
    // Accordion is here for the stories that stack panels, and Button (with the
    // MatButton it decorates) for the action-row and two-way stories: a panel with
    // real actions in it, and something to drive it from, are what those look like
    // in an app.
    moduleMetadata({
      imports: [
        ExpansionPanel,
        ExpansionPanelTitle,
        ExpansionPanelDescription,
        ExpansionPanelActions,
        Accordion,
        MatButton,
        Button,
      ],
    }),
  ],
  args: {
    title: 'Shipping address',
    description: '1 Infinite Loop',
    expanded: false,
    disabled: false,
    hideToggle: false,
    togglePosition: 'after',
  },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    expanded: { control: 'boolean' },
    disabled: { control: 'boolean' },
    hideToggle: { control: 'boolean' },
    togglePosition: { control: 'inline-radio', options: TOGGLE_POSITIONS },
    matExpansionPanel: { table: { disable: true } },
    matHeader: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-expansion-panel` is the shared theme applied to Angular Material’s',
          '`<mat-expansion-panel>`: a header that names some content, over the content it shows',
          'and hides. Like `ui-card` and unlike `uiButton`, it is a **component** rather than a',
          'directive — a panel owns composition, and there is no native element to decorate.',
          '',
          'Reach for one to let a user **defer** detail they do not need yet — a summary they can',
          'open when it matters. A panel is not a way to hide a required field: a user who cannot',
          'see a field cannot fill it in, and a form that hides its own errors is worse than a long',
          'one.',
          '',
          '### Content',
          '',
          'The body is ordinary projected content, so anything can go in a panel — a form, a table,',
          'another component. The `title` and `description` are strings for the common case; when a',
          'string is not enough, project `[uiExpansionPanelTitle]` or',
          '`[uiExpansionPanelDescription]` to put an icon, a count or a status dot in the header,',
          'and `[uiExpansionPanelActions]` to put buttons under the body behind a divider.',
          '',
          '### Expanded state',
          '',
          '`[(expanded)]` is a `model`, so the open/closed state is one piece of state rather than an',
          'input and an output that can disagree; `(expandedChange)` alone is the read-only half.',
          'It takes a binding rather than a bare attribute (`[expanded]="true"`, not `expanded`),',
          'because Angular’s `model()` has no `transform` to coerce one.',
          '',
          '### Stacking panels',
          '',
          'A lone panel opens and closes on its own. Wrap a set of them in `<ui-accordion>` to make',
          'them behave as one: by default opening any panel closes the one that was open, and',
          '`multi` lets them open independently. See the accordion stories below.',
          '',
          '### Accessibility',
          '',
          'The header is Material’s `role="button"`, wired to the body with `aria-expanded` and',
          '`aria-controls`: `Enter` and `Space` toggle it, and inside an accordion the arrow keys,',
          '`Home` and `End` move between headers. Say what the panel *holds* in its title —',
          '`Shipping address`, not `Section 2`.',
          '',
          '### Theming and restyling',
          '',
          'The header, the chevron and its rotation, the ripple, the expand and collapse, and the',
          'elevation are `<mat-expansion-panel>`’s own, resolved from the M3 system tokens in',
          '`src/styles/_theme.scss` — there is not a literal colour in this component’s stylesheet,',
          'and every story below renders the exact palette a consuming app gets, dark mode included.',
          '`--ui-expansion-panel-shape`, `--ui-expansion-panel-background-color`,',
          '`--ui-expansion-panel-text-color`, `--ui-expansion-panel-header-text-color`,',
          '`--ui-expansion-panel-description-color`, `--ui-expansion-panel-indicator-color` and',
          '`--ui-expansion-panel-divider-color` restyle it from an ordinary CSS rule, with no',
          '`::ng-deep`.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: frame(
      `<ui-expansion-panel ${argsToTemplate(args)}>${body('Sam Carter, 1 Infinite Loop, Cupertino, CA 95014.')}</ui-expansion-panel>`,
    ),
  }),
};

export default meta;
type Story = StoryObj<ExpansionPanel>;

/** The default: a single panel, closed, with its title and description in the header. */
export const Default: Story = {};

// --- The states the issue calls for ----------------------------------------

/**
 * Closed — the resting state. The header is the whole panel until a user asks for
 * more, which is the point: a title and a description that summarise what is
 * inside, so it can be read without being opened.
 */
export const Collapsed: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-expansion-panel title="Shipping address" description="1 Infinite Loop">
        ${body('Sam Carter, 1 Infinite Loop, Cupertino, CA 95014.')}
      </ui-expansion-panel>`),
  }),
};

/**
 * Open from the start, for the panel a user is most likely to want — the first step
 * of a form, or the section a deep link points at.
 *
 * `[expanded]="true"` rather than a bare `expanded`: `expanded` is a `model`, and
 * Angular's `model()` has no `transform` to coerce an empty attribute.
 */
export const Expanded: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-expansion-panel title="Shipping address" description="1 Infinite Loop" [expanded]="true">
        ${body('Sam Carter, 1 Infinite Loop, Cupertino, CA 95014.')}
      </ui-expansion-panel>`),
  }),
};

/**
 * A disabled panel stays on the page rather than disappearing: the set of panels a
 * user sees does not change shape when one of them turns off, and a screen reader
 * still announces that it is there — `aria-disabled`, out of the tab order.
 *
 * Disable a panel when it exists but cannot be opened *yet* — a payment section on
 * an order with no items. If it will never apply, do not render it at all.
 */
export const Disabled: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <ui-expansion-panel title="Payment" description="Add an item first" disabled>
          ${body('Nothing to pay for yet.')}
        </ui-expansion-panel>
        <ui-expansion-panel title="Payment" description="Frozen while the order ships" disabled [expanded]="true">
          ${body('A panel that was already open when it was disabled stays open.')}
        </ui-expansion-panel>
      </div>`),
  }),
};

// --- Accordion -------------------------------------------------------------

/**
 * Several panels in a `<ui-accordion>`. By default only one is open at a time:
 * opening any panel closes the one that was open, so a user is never scrolling past
 * three open bodies to find the fourth header.
 *
 * The accordion is what makes a *set* of panels behave as one — a lone panel needs
 * none of it. Note the panels join into a single surface rather than sitting as
 * separate rounded cards: only the two ends of the stack keep their outer corners.
 */
export const InAnAccordion: Story = {
  name: 'Accordion: one open at a time (default)',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`<ui-accordion>${ORDER_PANELS}</ui-accordion>`),
  }),
  play: async ({ canvasElement }) => {
    const hosts = Array.from(canvasElement.querySelectorAll('ui-expansion-panel'));
    const rules = Array.from(document.styleSheets)
      .flatMap((sheet) => {
        try {
          return Array.from(sheet.cssRules);
        } catch {
          return [];
        }
      })
      .map((rule) => rule.cssText)
      .filter((text) => text.includes('first-of-type') || text.includes('__panel'));
    const first = hosts[0].querySelector('.mat-expansion-panel')!;
    const restore = rules.find((r) => r.includes('first-of-type') && r.includes('__panel'))!;
    const selector = restore.slice(0, restore.indexOf('{')).trim();
    expect({
      panelClasses: first.className,
      matchesRestore: first.matches(selector),
      selector,
      computed: getComputedStyle(first).borderTopLeftRadius,
      rules,
    }).toEqual('DEBUG');
  },
};

/**
 * `multi` lets the panels open independently, for a set a user needs to compare
 * across rather than read one at a time.
 */
export const AccordionMulti: Story = {
  name: 'Accordion: multi',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`<ui-accordion multi>${ORDER_PANELS}</ui-accordion>`),
  }),
};

/**
 * `openAll()` and `closeAll()` are Material's own, exposed on the accordion.
 * `openAll()` only applies to a `multi` accordion — opening every panel of a
 * single-open one would contradict the mode, so Material ignores it.
 */
export const AccordionOpenAll: Story = {
  name: 'Accordion: openAll / closeAll',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="display: flex; gap: 0.5rem;">
          <button matButton uiButton variant="outlined" (click)="acc.openAll()">Open all</button>
          <button matButton uiButton variant="outlined" (click)="acc.closeAll()">Close all</button>
        </div>
        <ui-accordion #acc="uiAccordion" multi>${ORDER_PANELS}</ui-accordion>
      </div>`),
  }),
};

/**
 * `displayMode="flat"` drops the gutter that an open panel otherwise lifts away
 * with, so every panel stays at the same elevation and the stack reads as one
 * surface. Material's `default` is on the left for comparison — both have their
 * first panel open.
 *
 * Each panel names the mode it is demonstrating, rather than the two stacks
 * repeating one title: Material marks an open panel's body `role="region"`, named by
 * its header, and two landmarks on a page cannot share an accessible name (axe's
 * `landmark-unique`). That is a rule about this story showing two specimens at once,
 * not about the panel.
 */
export const AccordionDisplayMode: Story = {
  name: 'Accordion: displayMode',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; gap: 2rem; align-items: start;">
        ${['default', 'flat']
          .map(
            (mode) => `
          <div style="display: flex; flex-direction: column; gap: 0.5rem; flex: 1;">
            ${caption(`displayMode: ${mode}${mode === 'default' ? ' (default)' : ''}`)}
            <ui-accordion displayMode="${mode}">
              <ui-expansion-panel title="Details (${mode})" [expanded]="true">${body('Order 4213.')}</ui-expansion-panel>
              <ui-expansion-panel title="Items (${mode})">${body('Three items.')}</ui-expansion-panel>
            </ui-accordion>
          </div>`,
          )
          .join('')}
      </div>`,
  }),
};

/**
 * A disabled panel inside a stack: its neighbours still work, and the arrow keys
 * skip nothing — Material keeps a disabled header reachable so it can still be read.
 */
export const AccordionWithDisabledPanel: Story = {
  name: 'Accordion: with a disabled panel',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-accordion>
        <ui-expansion-panel title="Details" description="Placed 2 March">${body('Order 4213.')}</ui-expansion-panel>
        <ui-expansion-panel title="Items" description="3 items">${body('Three items.')}</ui-expansion-panel>
        <ui-expansion-panel title="Payment" description="Not until it ships" disabled>
          ${body('Frozen while the order is being edited.')}
        </ui-expansion-panel>
      </ui-accordion>`),
  }),
};

// --- Content ---------------------------------------------------------------

/**
 * A panel's body is projected, so it is not limited to text: this one holds a real
 * action set, laid out by the consumer.
 */
export const RichContent: Story = {
  name: 'Content: anything, not a string',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-expansion-panel title="Account" description="sam@example.com" [expanded]="true">
        <div style="display: flex; flex-direction: column; gap: 1rem; font: var(--mat-sys-body-medium);">
          <span>Signed in as sam@example.com. Two-factor authentication is on.</span>
          <div style="display: flex; gap: 0.5rem;">
            <button matButton uiButton variant="filled">Save</button>
            <button matButton uiButton variant="text">Cancel</button>
          </div>
        </div>
      </ui-expansion-panel>`),
  }),
};

/**
 * `[uiExpansionPanelActions]` puts buttons in Material's own action row — under the
 * body, behind a divider, aligned to the end. Mark each button rather than a wrapper
 * around them, so Material's spacing applies to the buttons themselves.
 */
export const ActionRow: Story = {
  name: 'uiExpansionPanelActions: an action row',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-expansion-panel title="Shipping address" description="1 Infinite Loop" [expanded]="true">
        ${body('Sam Carter, 1 Infinite Loop, Cupertino, CA 95014.')}
        <button matButton uiButton uiExpansionPanelActions variant="text">Cancel</button>
        <button matButton uiButton uiExpansionPanelActions variant="filled">Save</button>
      </ui-expansion-panel>`),
  }),
};

/**
 * `uiExpansionPanelTitle` renders the title as projected content instead of the
 * `title` string (rule 7) — the header is the one part of a panel a consumer cannot
 * otherwise reach. It lands inside Material's own `<mat-panel-title>`, so the
 * header's typography and layout are untouched.
 *
 * `uiExpansionPanelDescription` does the same for the description. Either one
 * replaces the matching string.
 */
export const TitleSlot: Story = {
  name: 'uiExpansionPanelTitle: a header with a count',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-accordion>
        <ui-expansion-panel>
          <span uiExpansionPanelTitle style="display: inline-flex; align-items: center; gap: 0.5rem;">
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
          <span uiExpansionPanelDescription style="display: inline-flex; align-items: center; gap: 0.375rem;">
            <span style="
              width: 0.5rem;
              height: 0.5rem;
              border-radius: var(--mat-sys-corner-full);
              background: var(--ui-sys-success);"></span>
            Packed
          </span>
          ${body('Three items, packed in one box.')}
        </ui-expansion-panel>
        <ui-expansion-panel title="History" description="Last updated yesterday">
          ${body('Created yesterday by Sam.')}
        </ui-expansion-panel>
      </ui-accordion>`),
  }),
};

/**
 * The description is optional. Without one the title takes the whole header rather
 * than leaving an empty container beside itself — so a panel whose name says
 * everything does not have to invent a summary.
 */
export const TitleOnly: Story = {
  name: 'Content: no description',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-accordion>
        <ui-expansion-panel title="Details">${body('Order 4213, placed on 2 March.')}</ui-expansion-panel>
        <ui-expansion-panel title="Items">${body('Three items, packed in one box.')}</ui-expansion-panel>
      </ui-accordion>`),
  }),
};

// --- The toggle ------------------------------------------------------------

/** The chevron sits at the end of the header by default, or before it. */
export const TogglePosition: Story = {
  name: 'togglePosition',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 2rem; max-width: 32rem;">
        ${TOGGLE_POSITIONS.map(
          (position) => `
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${caption(`togglePosition: ${position}${position === 'after' ? ' (default)' : ''}`)}
            <ui-expansion-panel title="Shipping address" description="1 Infinite Loop" togglePosition="${position}">
              ${body('Sam Carter, 1 Infinite Loop.')}
            </ui-expansion-panel>
          </div>`,
        ).join('')}
      </div>`,
  }),
};

/**
 * `hideToggle` drops the chevron. It is the panel's only affordance that it opens at
 * all, so hide it only where something else in the header already says so — and note
 * the header still toggles on click and on `Enter`.
 */
export const HideToggle: Story = {
  name: 'hideToggle',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-accordion hideToggle>
        <ui-expansion-panel title="Details" description="Placed 2 March">${body('Order 4213.')}</ui-expansion-panel>
        <ui-expansion-panel title="Items" description="3 items">${body('Three items.')}</ui-expansion-panel>
      </ui-accordion>`),
  }),
};

// --- State -----------------------------------------------------------------

/**
 * `[(expanded)]` keeps a signal and the panel in step in both directions: the button
 * below writes to the same state a click on the header does, and a click on the
 * header updates the read-out.
 */
export const TwoWayExpanded: Story = {
  name: 'expanded: two-way',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { open: false },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <ui-expansion-panel title="Shipping address" description="1 Infinite Loop" [(expanded)]="open">
          ${body('Sam Carter, 1 Infinite Loop, Cupertino.')}
        </ui-expansion-panel>
        <div style="display: flex; gap: 0.5rem; align-items: center; font: var(--mat-sys-body-medium);">
          <button matButton uiButton variant="outlined" (click)="open = !open">Toggle</button>
          <span>expanded is <strong>{{ open }}</strong>.</span>
        </div>
      </div>`),
  }),
};

// --- Styling hooks and escape hatches --------------------------------------

/**
 * `--ui-expansion-panel-indicator-color` is read off `<ui-expansion-panel>`, so
 * re-pointing the chevron is an ordinary CSS rule on an ordinary selector — no
 * `::ng-deep`, no `!important`. Point it at another `--mat-sys-*` role rather than a
 * literal, so it survives a palette change and dark mode.
 */
export const CustomColour: Story = {
  name: 'Styling hook: colours',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 2rem; max-width: 32rem;">
        ${[
          ['on-surface-variant (default)', ''],
          ['primary', '--ui-expansion-panel-indicator-color: var(--mat-sys-primary);'],
          [
            'tertiary, with a matching title',
            '--ui-expansion-panel-indicator-color: var(--mat-sys-tertiary); --ui-expansion-panel-header-text-color: var(--mat-sys-tertiary);',
          ],
        ]
          .map(
            ([label, style]) => `
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${caption(label)}
            <ui-expansion-panel title="Shipping address" description="1 Infinite Loop" style="${style}">
              ${body('Sam Carter, 1 Infinite Loop.')}
            </ui-expansion-panel>
          </div>`,
          )
          .join('')}
      </div>`,
  }),
};

/**
 * `--ui-expansion-panel-shape` retunes the corners. It defaults to the theme's
 * `corner-medium` — the same corner `uiButton` and `ui-alert` use — so the library
 * agrees with itself; an app can move every panel in one declaration.
 */
export const CustomShape: Story = {
  name: 'Styling hook: --ui-expansion-panel-shape',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 2rem; max-width: 32rem;">
        ${[
          ['corner-medium (default)', 'var(--mat-sys-corner-medium)'],
          ['corner-extra-small', 'var(--mat-sys-corner-extra-small)'],
          ['corner-large', 'var(--mat-sys-corner-large)'],
        ]
          .map(
            ([label, shape]) => `
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${caption(label)}
            <ui-accordion style="--ui-expansion-panel-shape: ${shape};">
              <ui-expansion-panel title="Details" description="Placed 2 March">${body('Order 4213.')}</ui-expansion-panel>
              <ui-expansion-panel title="Items" description="3 items">${body('Three items.')}</ui-expansion-panel>
            </ui-accordion>
          </div>`,
          )
          .join('')}
      </div>`,
  }),
};

/**
 * A panel on a coloured surface: the hooks take the legible-on-that-surface roles,
 * so contrast comes from the theme rather than from a hand-picked hex.
 */
export const OnColouredSurface: Story = {
  name: 'Styling hook: on a coloured surface',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="
        max-width: 32rem;
        padding: 1.5rem;
        border-radius: var(--mat-sys-corner-medium);
        background: var(--mat-sys-surface-container-high);">
        <ui-accordion style="--ui-expansion-panel-background-color: var(--mat-sys-surface-container-lowest);">
          ${ORDER_PANELS}
        </ui-accordion>
      </div>`,
  }),
};

/**
 * `exportAs: 'uiExpansionPanel'` hands back the component, and `matExpansionPanel()`
 * hands back Material's own instance — the escape hatch for anything not wrapped
 * here (rule 4).
 */
export const EscapeHatch: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <ui-expansion-panel #panel="uiExpansionPanel" title="Shipping address" description="1 Infinite Loop">
          ${body('Sam Carter, 1 Infinite Loop.')}
        </ui-expansion-panel>
        <div style="display: flex; gap: 0.5rem; align-items: center; font: var(--mat-sys-body-medium);">
          <button matButton uiButton variant="outlined" (click)="panel.matExpansionPanel().toggle()">
            Toggle through Material’s own instance
          </button>
          <span>expanded is <strong>{{ panel.expanded() }}</strong>.</span>
        </div>
      </div>`),
  }),
};
