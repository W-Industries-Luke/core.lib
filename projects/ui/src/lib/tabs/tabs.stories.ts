import { MatButton } from '@angular/material/button';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Button } from '../button/button';
import { Tab, TabLabelDef } from './tab';
import { Tabs, type UiTabsAlign } from './tabs';

const ALIGNMENTS: UiTabsAlign[] = ['stretch', 'start', 'center', 'end'];

/** A tab body reads as prose, so every story's content is styled like prose. */
const body = (text: string) =>
  `<p style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface);">${text}</p>`;

/** The three tabs most stories use — a plausible order detail rather than "Tab 1". */
const ORDER_TABS = `
  <ui-tab label="Details">${body('Order 4213, placed on 2 March.')}</ui-tab>
  <ui-tab label="Items">${body('Three items, packed in one box.')}</ui-tab>
  <ui-tab label="History">${body('Created yesterday by Sam.')}</ui-tab>`;

/**
 * Stories render at a realistic width rather than filling the canvas: a tab group
 * spans its container, and how the header behaves — stretched, aligned, paginated
 * — is only legible against a container that has an edge.
 */
const frame = (content: string, width = '32rem') =>
  `<div style="max-width: ${width};">${content}</div>`;

const meta: Meta<Tabs> = {
  title: 'Components/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  decorators: [
    // Button (and the MatButton it decorates) is here for the content and two-way
    // stories: a tab body with real actions in it, and something to drive the
    // selection from, are what those look like in an app.
    moduleMetadata({ imports: [Tabs, Tab, TabLabelDef, MatButton, Button] }),
  ],
  args: {
    alignTabs: 'stretch',
    selectedIndex: 0,
    dynamicHeight: false,
    preserveContent: false,
    disableRipple: false,
  },
  argTypes: {
    alignTabs: { control: 'inline-radio', options: ALIGNMENTS },
    selectedIndex: { control: { type: 'number', min: 0, max: 2, step: 1 } },
    dynamicHeight: { control: 'boolean' },
    preserveContent: { control: 'boolean' },
    disableRipple: { control: 'boolean' },
    // Documented in the table but not knobs: their inputs are aliased to the ARIA
    // attributes, which `argsToTemplate` cannot bind — it writes the class member
    // name. The `a11y:` stories cover them with real templates.
    ariaLabel: { name: 'aria-label', control: false },
    ariaLabelledby: { name: 'aria-labelledby', control: false },
    tabs: { table: { disable: true } },
    matTabGroup: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-tabs` is the shared theme applied to Angular Material’s `<mat-tab-group>`. Like',
          '`ui-radio-group` and unlike `uiButton`, it is a **component** rather than a directive:',
          'a tab group owns composition — a header of tabs, and the one body they switch between —',
          'so there is no native element to decorate.',
          '',
          'Tabs are for **sibling views of one subject**: the same order, seen as details, items and',
          'history. They are not navigation between unrelated pages, and they are not a way to hide',
          'a long form — a user who cannot see a field cannot fill it in.',
          '',
          '### Declaring tabs',
          '',
          'Each tab is a `<ui-tab label="…">` with its content projected inside it. The content is',
          'ordinary template content, not a string input, so anything can go in a tab — a form, a',
          'table, another component. `<ui-tab>` renders nothing itself: it hands its content to the',
          'group, which puts it inside Material’s own `role="tabpanel"`.',
          '',
          '### Selection',
          '',
          '`[(selectedIndex)]` is a `model`, so the index is one piece of state rather than an input',
          'and an output that can disagree; `(selectedIndexChange)` alone is the read-only half. An',
          'index past the end is clamped to a tab that exists and the clamped value is reported back',
          'through the same signal, so the binding and the header cannot drift apart.',
          '',
          '### Alignment',
          '',
          '`alignTabs` is one input covering what Material spells as two (`mat-stretch-tabs` and',
          '`mat-align-tabs`), because Material’s pair has a combination that silently does nothing:',
          'stretched tabs fill the row, leaving no space for an alignment to move them into. Here',
          '`stretch` *(default)* shares the width between the tabs, and `start` / `center` / `end`',
          'let them keep their natural width and pack the row to that edge.',
          '',
          '### Accessibility',
          '',
          'The header is Material’s `role="tablist"`: arrow keys move between tabs, `Home`/`End` jump',
          'to the ends, `Enter`/`Space` selects, and a disabled tab is skipped. Name the list with',
          '`aria-label` — say what the tabs are *of* (`Order`), not that they are tabs.',
          '',
          '### Theming and restyling',
          '',
          'The ink bar, the ripples, the sliding body and the pagination arrows are',
          '`<mat-tab-group>`’s own, resolved from the M3 system tokens in `src/styles/_theme.scss` —',
          'there is not a literal colour in this component’s stylesheet, and every story below',
          'renders the exact palette a consuming app gets, dark mode included. `--ui-tabs-color`,',
          '`--ui-tabs-active-label-color`, `--ui-tabs-inactive-label-color`, `--ui-tabs-divider-color`,',
          '`--ui-tabs-indicator-height` and `--ui-tabs-indicator-shape` restyle it from an ordinary',
          'CSS rule, with no `::ng-deep`.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: frame(`<ui-tabs ${argsToTemplate(args)}>${ORDER_TABS}</ui-tabs>`),
  }),
};

export default meta;
type Story = StoryObj<Tabs>;

/** The default: three tabs, stretched across the header, the first one selected. */
export const Default: Story = {};

/**
 * The everyday shape — a few tabs over sibling views of one subject, named by the
 * thing they are views *of*.
 */
export const Basic: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`<ui-tabs aria-label="Order">${ORDER_TABS}</ui-tabs>`),
  }),
};

/**
 * A tab's content is projected, so it is not limited to text: this one holds a
 * real form control set and its actions, laid out by the consumer.
 */
export const RichContent: Story = {
  name: 'Content: anything, not a string',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-tabs aria-label="Account">
        <ui-tab label="Profile">
          <div style="display: flex; flex-direction: column; gap: 1rem; padding-block: 1rem; font: var(--mat-sys-body-medium);">
            <span>Signed in as sam@example.com.</span>
            <div style="display: flex; gap: 0.5rem;">
              <button matButton uiButton variant="filled">Save</button>
              <button matButton uiButton variant="text">Cancel</button>
            </div>
          </div>
        </ui-tab>
        <ui-tab label="Security">${body('Two-factor authentication is on.')}</ui-tab>
      </ui-tabs>`),
  }),
};

// --- Many tabs -------------------------------------------------------------

/**
 * When the tabs outgrow their row, Material paginates: the header scrolls and a
 * chevron appears at each end. Nothing here configures that — it is Material's,
 * and it is why a tab group is a wrapper rather than a re-implementation.
 *
 * Note the tabs keep their natural width once there are this many of them, so
 * `alignTabs` stops mattering: there is no spare room left to align into.
 */
export const ManyTabs: Story = {
  name: 'Many tabs (scrolling)',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(
      `<ui-tabs aria-label="Warehouse">
        ${[
          'Receiving',
          'Putaway',
          'Picking',
          'Packing',
          'Shipping',
          'Returns',
          'Cycle counts',
          'Adjustments',
          'Transfers',
          'Reports',
        ]
          .map((label) => `<ui-tab label="${label}">${body(`The ${label} view.`)}</ui-tab>`)
          .join('')}
      </ui-tabs>`,
      '28rem',
    ),
  }),
};

/**
 * The same tabs in a wide container: they fit, so the pagination arrows are gone
 * and the header is an ordinary row. The two stories are the same markup — only
 * the container's width differs, which is the point: paginating is Material's
 * response to the space it is given, not a mode to switch on.
 */
export const ManyTabsWide: Story = {
  name: 'Many tabs (room to fit)',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(
      `<ui-tabs aria-label="Warehouse">
        ${['Receiving', 'Putaway', 'Picking', 'Packing', 'Shipping']
          .map((label) => `<ui-tab label="${label}">${body(`The ${label} view.`)}</ui-tab>`)
          .join('')}
      </ui-tabs>`,
      '60rem',
    ),
  }),
};

// --- Disabled --------------------------------------------------------------

/**
 * A disabled tab stays in the header rather than disappearing: the set of tabs a
 * user sees does not change shape when one of them turns off, and a screen reader
 * still announces that it is there — `aria-disabled`, skipped by the arrow keys.
 *
 * Disable a tab when it exists but cannot be opened *yet* — a history tab on an
 * order with no history. If it will never apply, do not render it at all.
 */
export const DisabledTab: Story = {
  name: 'With a disabled tab',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-tabs aria-label="Order">
        <ui-tab label="Details">${body('Order 4213, placed on 2 March.')}</ui-tab>
        <ui-tab label="Items">${body('Three items, packed in one box.')}</ui-tab>
        <ui-tab label="History" disabled>${body('This order has no history yet.')}</ui-tab>
      </ui-tabs>`),
  }),
};

/**
 * The selected tab can be a disabled one — Material shows its content and leaves
 * the tab unclickable — which is what a deep link into a tab that has since been
 * turned off looks like.
 */
export const DisabledTabSelected: Story = {
  name: 'With a disabled tab: selected',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-tabs aria-label="Order" [selectedIndex]="2">
        <ui-tab label="Details">${body('Order 4213, placed on 2 March.')}</ui-tab>
        <ui-tab label="Items">${body('Three items, packed in one box.')}</ui-tab>
        <ui-tab label="History" disabled>${body('Frozen while the order is being edited.')}</ui-tab>
      </ui-tabs>`),
  }),
};

// --- Alignment -------------------------------------------------------------

/** The default: every tab grows to share the header's full width. */
export const AlignStretch: Story = {
  name: 'alignTabs: stretch (default)',
  args: { alignTabs: 'stretch' },
};

/** The tabs keep their natural width and sit at the start of the row. */
export const AlignStart: Story = {
  name: 'alignTabs: start',
  args: { alignTabs: 'start' },
};

/** The same tabs, centred in the row. */
export const AlignCenter: Story = {
  name: 'alignTabs: center',
  args: { alignTabs: 'center' },
};

/** The same tabs, packed to the end of the row. */
export const AlignEnd: Story = {
  name: 'alignTabs: end',
  args: { alignTabs: 'end' },
};

/**
 * Every alignment side by side. `stretch` is one input with the other three
 * because Material's own `mat-stretch-tabs` + `mat-align-tabs` pair can be set to
 * a combination that does nothing: stretched tabs leave no space to align into.
 * Here every value of the one input changes what is on screen.
 */
export const Alignments: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 2rem; max-width: 32rem;">
        ${ALIGNMENTS.map(
          (align) => `
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${align}</span>
            <ui-tabs alignTabs="${align}" aria-label="Order, aligned ${align}">
              <ui-tab label="Details">${body('Order 4213.')}</ui-tab>
              <ui-tab label="Items">${body('Three items.')}</ui-tab>
            </ui-tabs>
          </div>`,
        ).join('')}
      </div>`,
  }),
};

// --- Selection -------------------------------------------------------------

/** A one-way `[selectedIndex]` opens the group on a tab other than the first. */
export const SelectedIndex: Story = {
  name: 'selectedIndex: opening on a tab',
  args: { selectedIndex: 1 },
};

/**
 * `[(selectedIndex)]` keeps a signal and the header in step in both directions:
 * the buttons below write to the same state a click on a tab does.
 */
export const TwoWaySelection: Story = {
  name: 'selectedIndex: two-way',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { index: 0 },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <ui-tabs [(selectedIndex)]="index" aria-label="Order">${ORDER_TABS}</ui-tabs>
        <div style="display: flex; gap: 0.5rem; align-items: center; font: var(--mat-sys-body-medium);">
          <button matButton uiButton variant="outlined" (click)="index = 0">Details</button>
          <button matButton uiButton variant="outlined" (click)="index = 2">History</button>
          <span>selectedIndex is <strong>{{ index }}</strong>.</span>
        </div>
      </div>`),
  }),
};

// --- Labels ----------------------------------------------------------------

/**
 * `uiTabLabel` renders a tab's label as a template instead of its `label` string
 * (rule 7) — the header is the one part of a tab a consumer cannot otherwise
 * project into. It renders inside Material's own `role="tab"`, so the ripple, the
 * ink bar and the keyboard are untouched.
 *
 * `label` stays required alongside it: it is the tab's plain-text name.
 */
export const LabelTemplate: Story = {
  name: 'uiTabLabel: a label with a count',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-tabs aria-label="Messages">
        <ui-tab label="Inbox">
          <ng-template uiTabLabel>
            <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
              Inbox
              <span style="
                min-width: 1.25rem;
                padding-inline: 0.375rem;
                border-radius: var(--mat-sys-corner-full);
                background: var(--mat-sys-primary);
                color: var(--mat-sys-on-primary);
                font: var(--mat-sys-label-small);">4</span>
            </span>
          </ng-template>
          ${body('Four unread messages.')}
        </ui-tab>
        <ui-tab label="Archive">${body('Nothing archived yet.')}</ui-tab>
      </ui-tabs>`),
  }),
};

// --- Accessibility ---------------------------------------------------------

/**
 * `aria-label` names Material's `tablist` — what the tabs are *of*, not that they
 * are tabs. It reaches the real `role="tablist"` inside the header rather than
 * sitting on the `<ui-tabs>` host, which no assistive technology ever looks at.
 */
export const AriaLabel: Story = {
  name: 'a11y: aria-label',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`<ui-tabs aria-label="Order">${ORDER_TABS}</ui-tabs>`),
  }),
};

/**
 * For a group already named by something on the page, point `aria-labelledby` at
 * that heading rather than repeating it.
 */
export const AriaLabelledby: Story = {
  name: 'a11y: aria-labelledby',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <div>
        <h2 id="order-heading" style="font: var(--mat-sys-title-medium); color: var(--mat-sys-on-surface);">Order 4213</h2>
        <ui-tabs aria-labelledby="order-heading">${ORDER_TABS}</ui-tabs>
      </div>`),
  }),
};

/**
 * A tab whose rendered label is not the whole story can be named on the tab
 * itself: `aria-label` on a `<ui-tab>` lands on Material's `role="tab"`.
 */
export const TabAriaLabel: Story = {
  name: 'a11y: naming one tab',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-tabs aria-label="Messages">
        <ui-tab label="Inbox" aria-label="Inbox, 4 unread">${body('Four unread messages.')}</ui-tab>
        <ui-tab label="Archive">${body('Nothing archived yet.')}</ui-tab>
      </ui-tabs>`),
  }),
};

// --- Layout ----------------------------------------------------------------

/**
 * `dynamicHeight` lets the group take the height of the selected tab's content
 * rather than staying the height of the tallest. Off by default: a group that
 * resizes on every switch moves whatever is below it down the page.
 */
export const DynamicHeight: Story = {
  name: 'dynamicHeight',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-tabs aria-label="Order" dynamicHeight>
        <ui-tab label="Details">${body('One short line.')}</ui-tab>
        <ui-tab label="History">
          ${body('A much longer tab.')}${body('With several paragraphs.')}${body('Which the group grows to fit.')}
        </ui-tab>
      </ui-tabs>`),
  }),
};

// --- Styling hooks and escape hatches --------------------------------------

/**
 * `--ui-tabs-color` is read off `<ui-tabs>`, so re-pointing the ink bar is an
 * ordinary CSS rule on an ordinary selector — no `::ng-deep`, no `!important`.
 * Point it at another `--mat-sys-*` role rather than a literal, so it survives a
 * palette change and dark mode.
 */
export const CustomColour: Story = {
  name: 'Styling hook: --ui-tabs-color',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 2rem; max-width: 32rem;">
        ${['primary (default)', 'tertiary', 'error']
          .map((role) => {
            const token = role.split(' ')[0];
            return `
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">--mat-sys-${role}</span>
              <ui-tabs aria-label="Order in ${token}" style="--ui-tabs-color: var(--mat-sys-${token});">
                <ui-tab label="Details">${body('Order 4213.')}</ui-tab>
                <ui-tab label="Items">${body('Three items.')}</ui-tab>
              </ui-tabs>
            </div>`;
          })
          .join('')}
      </div>`,
  }),
};

/**
 * The labels are hooks of their own, for a header that needs the selected tab to
 * carry more of the emphasis than M3's ink-bar-only default gives it.
 */
export const CustomLabelColours: Story = {
  name: 'Styling hook: label colours',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-tabs
        aria-label="Order"
        style="
          --ui-tabs-color: var(--mat-sys-tertiary);
          --ui-tabs-active-label-color: var(--mat-sys-tertiary);
          --ui-tabs-inactive-label-color: var(--mat-sys-on-surface-variant);">
        ${ORDER_TABS}
      </ui-tabs>`),
  }),
};

/**
 * The ink bar's geometry: M3's 2px square underline is the default, and these
 * hooks make a heavier or rounded one a declaration rather than a reach into
 * Material's internals.
 */
export const CustomIndicator: Story = {
  name: 'Styling hook: ink bar geometry',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 2rem; max-width: 32rem;">
        ${[
          ['2px, square (default)', '--ui-tabs-indicator-height: 2px;'],
          [
            '4px, rounded',
            '--ui-tabs-indicator-height: 4px; --ui-tabs-indicator-shape: var(--mat-sys-corner-full);',
          ],
          [
            '6px, rounded',
            '--ui-tabs-indicator-height: 6px; --ui-tabs-indicator-shape: var(--mat-sys-corner-full);',
          ],
        ]
          .map(
            ([caption, style]) => `
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${caption}</span>
              <ui-tabs aria-label="Order, ${caption}" style="${style}">
                <ui-tab label="Details">${body('Order 4213.')}</ui-tab>
                <ui-tab label="Items">${body('Three items.')}</ui-tab>
              </ui-tabs>
            </div>`,
          )
          .join('')}
      </div>`,
  }),
};

/**
 * A tab group on a coloured surface: the hooks take the legible-on-that-surface
 * roles, so contrast comes from the theme rather than from a hand-picked hex.
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
        <ui-tabs
          aria-label="Order"
          style="
            --ui-tabs-color: var(--mat-sys-tertiary);
            --ui-tabs-divider-color: var(--mat-sys-outline-variant);">
          ${ORDER_TABS}
        </ui-tabs>
      </div>`,
  }),
};

/**
 * `exportAs: 'uiTabs'` hands back the component, and `matTabGroup()` hands back
 * Material's own instance — the escape hatch for anything not wrapped here, like
 * moving focus into the header.
 */
export const EscapeHatch: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <ui-tabs #group="uiTabs" aria-label="Order">${ORDER_TABS}</ui-tabs>
        <div style="display: flex; gap: 0.5rem; align-items: center; font: var(--mat-sys-body-medium);">
          <button matButton uiButton variant="outlined" (click)="group.matTabGroup().focusTab(2)">
            Focus the last tab
          </button>
          <span>{{ group.tabs().length }} tabs.</span>
        </div>
      </div>`),
  }),
};
