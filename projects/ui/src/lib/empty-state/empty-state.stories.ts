import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Button } from '../button/button';
import { Card } from '../card/card';
import { Spinner } from '../spinner/spinner';
import { EmptyState, EmptyStateActions, EmptyStateIcon } from './empty-state';

/**
 * An empty state stands in for a region — a list, a table, a search — so every
 * story renders inside one rather than loose on the page.
 */
const frame = (content: string, width = '40rem') =>
  `<div style="max-width: ${width}; border: 1px solid var(--mat-sys-outline-variant);
               border-radius: var(--mat-sys-corner-medium);">${content}</div>`;

const meta: Meta<EmptyState> = {
  title: 'Components/Empty state',
  component: EmptyState,
  tags: ['autodocs'],
  decorators: [
    // EmptyStateIcon and EmptyStateActions are the projection markers; Button,
    // Card, MatIcon and Spinner appear in the slot stories, which are the reason
    // those slots exist.
    moduleMetadata({
      imports: [
        EmptyState,
        EmptyStateIcon,
        EmptyStateActions,
        MatIcon,
        MatButton,
        Button,
        Card,
        Spinner,
      ],
    }),
  ],
  args: {
    icon: 'inbox',
    title: 'No orders yet',
    message: 'Orders placed by your customers will show up here.',
    headingLevel: 3,
  },
  argTypes: {
    icon: { control: 'text' },
    title: { control: 'text' },
    message: { control: 'text' },
    headingLevel: { control: { type: 'number', min: 1, max: 6 } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-empty-state` is the placeholder for a list, table or search with nothing to show: an',
          'icon, a title, a message, and optionally the action that fills it. Material ships no empty',
          'state, so this component owns its own container — but not its own colours, and not its own',
          'parts.',
          '',
          '### Composed from Material',
          '',
          'The icon is `<mat-icon>` and the action is whatever Material control you project, so there',
          'is not a literal colour or font anywhere in the component: the title is M3’s `title-medium`',
          'on `on-surface`, the message and icon are `body-medium` on `on-surface-variant` — the role',
          'M3 gives secondary text and the glyphs beside it. Every story below therefore renders the',
          'exact palette a consuming app gets; toggle your OS light/dark preference to watch them all',
          'follow.',
          '',
          '### Surface roles, not status roles',
          '',
          'An empty state reports nothing being *wrong* — a search with no matches, a list not started',
          'yet — so it takes M3’s quiet surface roles and sits calmly on the page it is part of. An',
          'empty list is not an error, and colouring it like one (`ui-alert variant="error"`) tells the',
          'user something untrue.',
          '',
          '### Every part is optional',
          '',
          '`icon`, `title`, `message` and the actions row each render only when they have something to',
          'render, so an icon-less state has no gap where the glyph would have been.',
          '',
          '### Accessibility',
          '',
          'The host is a polite live region (`role="status"`), so an empty state replacing a list is',
          'announced without stealing focus from the search box the user is still typing in. The title',
          'is a real heading — reachable by heading navigation — and `headingLevel` places it in your',
          'document outline. The icon is `aria-hidden`, because the title already says what it says.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: frame(`<ui-empty-state ${argsToTemplate(args)}></ui-empty-state>`),
  }),
};

export default meta;
type Story = StoryObj<EmptyState>;

/** The default: an icon, a title and a message, centred in the region they fill. */
export const Default: Story = {};

// --- Icon ------------------------------------------------------------------

/**
 * `icon` names any Material Symbols ligature. Choose one that says *what* is
 * empty — `inbox` for a list not started, `search_off` for a search that missed,
 * `folder_off` for a directory — which is why the input has no default: a generic
 * glyph would be wrong more often than right.
 */
export const WithIcon: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem;">
        ${[
          ['inbox', 'No orders yet', 'Orders placed by your customers will show up here.'],
          ['search_off', 'No results', 'No orders match “brackets”. Check the spelling.'],
          ['folder_off', 'This folder is empty', 'Drop a file here, or upload one to get started.'],
        ]
          .map(
            ([icon, title, message]) =>
              `${frame(
                `<ui-empty-state icon="${icon}" title="${title}" message="${message}" />`,
                '100%',
              )}`,
          )
          .join('')}
      </div>`,
  }),
};

/**
 * Leave `icon` unset — or set `icon=""` / `[icon]="null"` — for a text-only
 * state. There is no gap where the glyph would have been: the column only spaces
 * the parts that render.
 */
export const WithoutIcon: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-empty-state
        title="No orders yet"
        message="Orders placed by your customers will show up here."
      />`),
  }),
};

/**
 * Rule 7: a string input cannot spell an SVG illustration, a brand mark or a
 * spinner. Project a `uiEmptyStateIcon` element and it replaces the ligature —
 * here a live `<ui-spinner>` on a list that is still resolving.
 *
 * A projected `<img>` or `<svg>` is held to the same box as the glyph, so it
 * still follows `--ui-empty-state-icon-size`.
 */
export const ProjectedIcon: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-empty-state title="Still looking" message="Fetching your orders from the warehouse.">
        <ui-spinner uiEmptyStateIcon [diameter]="48" label="Loading orders" />
      </ui-empty-state>`),
  }),
};

// --- Actions ---------------------------------------------------------------

/**
 * `uiEmptyStateActions` marks the way out of the empty state. Mark each action
 * rather than a wrapper around them — the row is a flex container, so they have
 * to be its direct children for its spacing to apply.
 *
 * The button is a real `<button matButton uiButton>`, so it keeps `routerLink`,
 * `(click)` and every native attribute: an empty state composes with the rest of
 * this library rather than re-implementing a piece of it.
 */
export const WithAction: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-empty-state
        icon="inbox"
        title="No orders yet"
        message="Orders placed by your customers will show up here."
      >
        <button matButton uiButton uiEmptyStateActions variant="filled">Add an order</button>
      </ui-empty-state>`),
  }),
};

/**
 * Two actions: the thing to do, and the other thing to do. They wrap rather than
 * overflow a narrow column — a table on a phone.
 */
export const WithTwoActions: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-empty-state
        icon="inbox"
        title="No orders yet"
        message="Orders placed by your customers will show up here."
      >
        <button matButton uiButton uiEmptyStateActions variant="filled">Add an order</button>
        <button matButton uiButton uiEmptyStateActions variant="text">Import a CSV</button>
      </ui-empty-state>`),
  }),
};

/**
 * Without an action the row does not render, so there is no empty band under the
 * message. This is the right shape when there is nothing for the user to *do* —
 * a report with no rows for the range they picked.
 */
export const WithoutAction: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-empty-state
        icon="query_stats"
        title="No activity in this period"
        message="Nothing was recorded between 1 and 7 March."
      />`),
  }),
};

// --- Content ---------------------------------------------------------------

/**
 * A long message wraps at a readable measure (`44ch` by default) rather than
 * running the full width of the region: a centred line much past ~45 characters
 * is hard to track back to the start of the next one. `--ui-empty-state-message-max-width`
 * moves it.
 */
export const LongMessage: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-empty-state icon="search_off" title="No orders match your filters">
        <p style="margin: 0; max-width: 44ch;">
          Nothing matched “brackets” between 1 January and 31 March in the Manchester warehouse.
          Filters are combined with AND, so an order has to satisfy every one of them to appear —
          try widening the date range, removing the warehouse, or searching the whole catalogue
          instead. Saved filters can be edited from the toolbar above.
        </p>
        <button matButton uiButton uiEmptyStateActions variant="outlined">Clear all filters</button>
      </ui-empty-state>`),
  }),
};

/**
 * The default slot lands directly under the message, for what a string input
 * cannot carry: a link, a list, anything formatted (rule 7). Use `message` for
 * the plain sentence and the slot for the rest.
 */
export const ProjectedContent: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-empty-state
        icon="search_off"
        title="No results"
        message="No orders match “status:shipped AND brackets”."
      >
        <a href="#" style="font: var(--mat-sys-body-small); color: var(--mat-sys-primary);">
          Read the search syntax
        </a>
      </ui-empty-state>`),
  }),
};

// --- In place --------------------------------------------------------------

/**
 * What it is actually for: the placeholder inside the region whose content has
 * not arrived. It takes the width of whatever it is dropped into, and its padding
 * is what gives a short state presence in a tall region.
 */
export const InACard: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="max-width: 40rem;">
        <ui-card appearance="outlined" [padded]="false">
          <ui-empty-state
            icon="receipt_long"
            title="No invoices"
            message="Invoices are generated on the first of each month."
          >
            <button matButton uiButton uiEmptyStateActions variant="text">Learn more</button>
          </ui-empty-state>
        </ui-card>
      </div>`,
  }),
};

// --- Accessibility ---------------------------------------------------------

/**
 * The title is a real heading, so heading navigation finds it — but at your
 * level, because only your page knows the outline it sits in. An empty state
 * filling a whole route wants `1` or `2`; one inside a card on a dashboard wants
 * `4`. Inspect these in the DOM: the level is on `aria-level`.
 *
 * A value outside 1–6 falls back to the default rather than emitting a level no
 * screen reader could place.
 */
export const HeadingLevel: Story = {
  name: 'Accessibility: headingLevel',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 40rem;">
        ${[2, 3, 4]
          .map((level) =>
            frame(
              `<ui-empty-state
                 icon="inbox"
                 [headingLevel]="${level}"
                 title="headingLevel = ${level}"
                 message="The title is role=heading with aria-level=${level}."
               />`,
              '100%',
            ),
          )
          .join('')}
      </div>`,
  }),
};

// --- Styling hooks ---------------------------------------------------------

/**
 * The `--ui-empty-state-*` hooks are read off `<ui-empty-state>`, so restyling is
 * an ordinary rule on an ordinary selector — no `::ng-deep`, no `!important`, no
 * wrapper.
 *
 * Point a colour at another `--mat-sys-*` / `--ui-sys-*` role rather than a
 * literal, so it survives a palette change and dark mode — as the last two here
 * do with `primary` and the theme's own `success` role.
 */
export const StylingHooks: Story = {
  name: 'Styling hooks: --ui-empty-state-*',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 40rem;">
        ${[
          [
            '--ui-empty-state-padding: 16px;',
            '--ui-empty-state-padding',
            'A compact state, for an empty region inside a dense table.',
          ],
          [
            '--ui-empty-state-icon-size: 96px;',
            '--ui-empty-state-icon-size',
            'A larger glyph, for a state that fills a whole route.',
          ],
          [
            '--ui-empty-state-icon-color: var(--mat-sys-primary);',
            '--ui-empty-state-icon-color',
            'The brand’s own role, so it still follows the palette and dark mode.',
          ],
          [
            '--ui-empty-state-title-color: var(--ui-sys-success);',
            '--ui-empty-state-title-color',
            'The theme’s success role — for an inbox that is empty because you finished.',
          ],
        ]
          .map(([style, hook, note]) =>
            frame(
              `<ui-empty-state
                 icon="inbox"
                 style="${style}"
                 title="${hook}"
                 message="${note}"
               />`,
              '100%',
            ),
          )
          .join('')}
      </div>`,
  }),
};

// --- The full matrix -------------------------------------------------------

/**
 * Every icon × message × action combination. This is the reference grid: if a
 * combination does not hold together here, the layout is wrong.
 */
export const AllConfigurations: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 22rem)); gap: 1rem;">
        ${[true, false]
          .flatMap((withIcon) =>
            [true, false].flatMap((withMessage) =>
              [true, false].map((withAction) =>
                frame(
                  `<ui-empty-state
                     ${withIcon ? 'icon="inbox"' : ''}
                     title="No orders yet"
                     ${withMessage ? 'message="Orders placed by your customers show up here."' : ''}
                   >
                     ${
                       withAction
                         ? '<button matButton uiButton uiEmptyStateActions variant="filled">Add an order</button>'
                         : ''
                     }
                   </ui-empty-state>`,
                  '100%',
                ),
              ),
            ),
          )
          .join('')}
      </div>`,
  }),
};
