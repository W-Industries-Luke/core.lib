import { MatButton } from '@angular/material/button';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Button } from '../button/button';
import { Table, type UiTableColumn } from '../table/table';
import { Paginator } from './paginator';

interface Order {
  id: string;
  customer: string;
  quantity: number;
}

/** A plausible order book to page through, rather than "Row 1". */
const CUSTOMERS = [
  'Sam Okafor',
  'Alex Duarte',
  'Rae Lindqvist',
  'Jo Mensah',
  'Priya Raman',
  'Tom Bergström',
];

const ORDERS: Order[] = Array.from({ length: 42 }, (_, index) => ({
  id: String(4200 + index),
  customer: CUSTOMERS[index % CUSTOMERS.length],
  quantity: ((index * 7) % 24) + 1,
}));

const COLUMNS: UiTableColumn<Order>[] = [
  { key: 'id', header: 'Order', width: '6rem' },
  { key: 'customer', header: 'Customer' },
  { key: 'quantity', header: 'Quantity', width: '8rem' },
];

/**
 * A paginator spans whatever it is paging through, so every story renders against a
 * container with an edge — a paginator filling the canvas is not what an app has.
 */
const frame = (content: string, width = '40rem') =>
  `<div style="max-width: ${width};">${content}</div>`;

const caption = (text: string) =>
  `<p style="font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant); margin: 0 0 0.5rem;">${text}</p>`;

const meta: Meta<Paginator> = {
  title: 'Components/Paginator',
  component: Paginator,
  tags: ['autodocs'],
  decorators: [
    // Table is here for the story that pages one, and Button (with the MatButton it
    // decorates) for the story that drives the page from code — which is what
    // `[(pageIndex)]` looks like in an app.
    moduleMetadata({ imports: [Paginator, Table, MatButton, Button] }),
  ],
  args: {
    length: 42,
    pageIndex: 0,
    pageSize: 10,
    pageSizeOptions: [10, 25, 50, 100],
    hidePageSize: false,
    showFirstLastButtons: true,
    disabled: false,
  },
  argTypes: {
    length: { control: { type: 'number', min: 0, step: 1 } },
    pageIndex: { control: { type: 'number', min: 0, step: 1 } },
    pageSize: { control: { type: 'number', min: 1, step: 1 } },
    pageSizeOptions: { control: 'object' },
    hidePageSize: { control: 'boolean' },
    showFirstLastButtons: { control: 'boolean' },
    disabled: { control: 'boolean' },
    selectConfig: { control: 'object' },
    // Documented in the table but not knobs: their inputs are aliased to the ARIA
    // attributes, which `argsToTemplate` cannot bind — it writes the class member
    // name. The `a11y:` stories cover them with real templates.
    ariaLabel: { name: 'aria-label', control: false },
    ariaLabelledby: { name: 'aria-labelledby', control: false },
    matPaginator: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-paginator` is the shared theme applied to Angular Material’s `<mat-paginator>`. Like',
          '`ui-table` and unlike `uiButton`, it is a **component** rather than a directive: a',
          'paginator owns composition — a size select, a range label and four buttons — so there is',
          'no native element to decorate. The buttons, the select, the `Items per page` and',
          '`1 – 10 of 42` labels, the tooltips, the `role="group"` and the polite live region that',
          'announces a new range are all Material’s own, none of it re-implemented here.',
          '',
          'What this adds is the fleet’s defaults — a `[10, 25, 50, 100]` page size ramp and the',
          'first/last buttons, neither of which Material ships — and state that is **signals**.',
          '',
          '### Paging is yours to do',
          '',
          'A paginator is a control, not a data source: it says which slice a user asked for, and',
          'nothing in it touches the rows. Take the slice from `pageIndex` and `pageSize`',
          '(`data.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)`), or bind `(pageChange)`',
          'and re-query a server with the page it carries. See *Paging a table* below.',
          '',
          '### length is the total, not the page',
          '',
          '`[length]` is required, and it is the count of **everything** being paged through. It is',
          'the one thing here that can be got wrong in a way a user sees: a `length` of one page’s',
          'worth leaves the next button disabled on the first page. For server-side paging that is',
          'the response’s total count, not `rows.length`.',
          '',
          '### State',
          '',
          '`[(pageIndex)]` and `[(pageSize)]` are `model`s, so each is one piece of state rather',
          'than an input and an output that can disagree: a user’s click writes back through the',
          'same signal a `.set()` from code drives. That includes Material’s own rule that changing',
          'the page size keeps the first visible item on screen — which moves `pageIndex` too, and',
          'reports both back. Leave `[pageSize]` unset and it settles on the first of',
          '`[pageSizeOptions]`, reporting that back rather than leaving you to re-derive it.',
          '',
          '### Wording and translation',
          '',
          '`Items per page`, `Next page` and `1 – 10 of 42` are Material’s `MatPaginatorIntl`, which',
          'is a provider rather than an input — one set of words per app, not per paginator. Reword',
          'or translate them by providing a subclass.',
          '',
          '### Theming and restyling',
          '',
          'Every colour and font is resolved from the M3 system tokens in `src/styles/_theme.scss`',
          '— there is not a literal colour in this component’s stylesheet, and every story below',
          'renders the exact palette a consuming app gets, dark mode included.',
          '`--ui-paginator-background`, `--ui-paginator-text-color`, `--ui-paginator-icon-color`,',
          '`--ui-paginator-disabled-icon-color` and `--ui-paginator-page-size-width` restyle it from',
          'an ordinary CSS rule, with no `::ng-deep`.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: frame(`<ui-paginator ${argsToTemplate(args)} aria-label="Orders" />`),
  }),
};

export default meta;
type Story = StoryObj<Paginator>;

/** The default: 42 items, ten a page, with every knob live in the controls panel. */
export const Default: Story = {};

/**
 * The everyday shape — how many items there are, and which page is showing. Nothing
 * else is bound: the page sizes are the fleet's `[10, 25, 50, 100]`, and the
 * first/last buttons are there because this library turns them on.
 */
export const Basic: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { total: ORDERS.length, page: 0 },
    template: frame(`<ui-paginator [length]="total" [(pageIndex)]="page" aria-label="Orders" />`),
  }),
};

// --- Where the range is ----------------------------------------------------

/**
 * On the **first page** both backwards buttons are off — there is nowhere behind it
 * to go — and Material greys their arrows rather than removing them, so the control
 * does not change shape as the user moves through it.
 */
export const FirstPage: Story = {
  name: 'On the first page',
  args: { pageIndex: 0 },
  parameters: { controls: { disable: true } },
  render: (args) => ({
    props: args,
    template: frame(`
      ${caption('Page 1 of 5. “First” and “Previous” are off; “Next” and “Last” are live.')}
      <ui-paginator ${argsToTemplate(args)} aria-label="Orders" />`),
  }),
};

/**
 * On the **last page** it is the forwards pair that is off, and the range label
 * shows the short page — `41 – 42 of 42`, not `41 – 50`.
 */
export const LastPage: Story = {
  name: 'On the last page',
  args: { pageIndex: 4 },
  parameters: { controls: { disable: true } },
  render: (args) => ({
    props: args,
    template: frame(`
      ${caption('Page 5 of 5. The last page holds two items, and the label says so.')}
      <ui-paginator ${argsToTemplate(args)} aria-label="Orders" />`),
  }),
};

/**
 * The jump-to-first and jump-to-last buttons are on by default — the one place this
 * library's default is not Material's, which hides them. A paginator knows exactly
 * how many pages there are, so "back to the start" should be one click rather than
 * however many `pageIndex` happens to be.
 *
 * Turn them off for a paginator squeezed somewhere narrow. Both are shown here on
 * page 3, where all four buttons are live.
 */
export const FirstLastButtons: Story = {
  name: 'showFirstLastButtons',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { total: ORDERS.length },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div>
          ${caption('showFirstLastButtons (the default) — four buttons.')}
          <ui-paginator [length]="total" [pageIndex]="2" aria-label="Orders, with first and last" />
        </div>
        <div>
          ${caption('[showFirstLastButtons]="false" — Material’s own default, two buttons.')}
          <ui-paginator
            [length]="total"
            [pageIndex]="2"
            [showFirstLastButtons]="false"
            aria-label="Orders, without first and last"
          />
        </div>
      </div>`),
  }),
};

/**
 * A list short enough to fit on one page still shows its range — `1 – 7 of 7` — with
 * every button off. It is deliberately not hidden: a control that vanishes as rows
 * are filtered away moves everything under it up the page.
 */
export const SinglePage: Story = {
  name: 'A single page',
  args: { length: 7 },
  parameters: { controls: { disable: true } },
  render: (args) => ({
    props: args,
    template: frame(`<ui-paginator ${argsToTemplate(args)} aria-label="Orders" />`),
  }),
};

/** Nothing to page through at all: `0 of 0`, and nowhere to go. */
export const Empty: Story = {
  name: 'An empty list',
  args: { length: 0 },
  parameters: { controls: { disable: true } },
  render: (args) => ({
    props: args,
    template: frame(`<ui-paginator ${argsToTemplate(args)} aria-label="Orders" />`),
  }),
};

// --- Page sizes ------------------------------------------------------------

/**
 * `[pageSizeOptions]` is the list the select offers. It defaults to the fleet's
 * `[10, 25, 50, 100]` — the same ramp in every app, so a user only learns it once —
 * and a custom list replaces it wholesale.
 *
 * Picking a size re-pages in place: Material keeps the first item that was on screen
 * on screen, which moves `pageIndex` as well and reports both back through the
 * two-way bindings.
 */
export const CustomPageSizes: Story = {
  name: 'Custom page sizes',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { total: ORDERS.length, page: 0, size: 5 },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${caption('[pageSizeOptions]="[5, 10, 20]" — a smaller ramp for a shorter list.')}
        <ui-paginator
          [length]="total"
          [(pageIndex)]="page"
          [(pageSize)]="size"
          [pageSizeOptions]="[5, 10, 20]"
          aria-label="Orders"
        />
        <p style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface); margin: 0;">
          pageIndex is <strong>{{ page }}</strong>, pageSize is <strong>{{ size }}</strong>.
        </p>
      </div>`),
  }),
};

/**
 * With `[pageSize]` left unset, the paginator takes the first of its options — and
 * says so through `pageSizeChange`, so a consumer never has to re-derive the size it
 * chose. Here that is `20`.
 */
export const UnsetPageSize: Story = {
  name: 'An unset page size',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { total: ORDERS.length, size: undefined },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${caption('[pageSizeOptions]="[20, 40]" with no [pageSize].')}
        <ui-paginator
          [length]="total"
          [(pageSize)]="size"
          [pageSizeOptions]="[20, 40]"
          aria-label="Orders"
        />
        <p style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface); margin: 0;">
          pageSize settled on <strong>{{ size }}</strong>.
        </p>
      </div>`),
  }),
};

/**
 * `hidePageSize` drops the selector and keeps the range and the buttons — for a page
 * size the user has no say in, like a fixed grid or a print layout. The size still
 * applies; it is only the control that goes.
 */
export const HidePageSize: Story = {
  name: 'hidePageSize',
  args: { hidePageSize: true },
  parameters: { controls: { disable: true } },
  render: (args) => ({
    props: args,
    template: frame(`<ui-paginator ${argsToTemplate(args)} aria-label="Orders" />`),
  }),
};

// --- State -----------------------------------------------------------------

/**
 * `[(pageIndex)]` keeps a signal and the buttons in step in both directions: the
 * buttons below write to the same state a click on an arrow does, and the paginator
 * moves either way.
 */
export const TwoWay: Story = {
  name: 'Two-way pageIndex',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { total: ORDERS.length, page: 0 },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <ui-paginator [length]="total" [(pageIndex)]="page" aria-label="Orders" />
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface);">
          <button matButton uiButton variant="outlined" (click)="page = 0">Start</button>
          <button matButton uiButton variant="outlined" (click)="page = 2">Page 3</button>
          <button matButton uiButton variant="text" (click)="page = 4">End</button>
          <span>pageIndex is <strong>{{ page }}</strong>.</span>
        </div>
      </div>`),
  }),
};

/**
 * `disabled` makes the whole control inert — the select and all four buttons — for a
 * page mid-fetch, where moving again would race the response.
 */
export const Disabled: Story = {
  name: 'disabled',
  args: { disabled: true, pageIndex: 2 },
  parameters: { controls: { disable: true } },
  render: (args) => ({
    props: args,
    template: frame(`
      ${caption('Every button is off, including the ones with somewhere to go.')}
      <ui-paginator ${argsToTemplate(args)} aria-label="Orders" />`),
  }),
};

// --- With a table ----------------------------------------------------------

/**
 * What this is for. The paginator is a control, not a data source: it says which
 * slice was asked for, and the app takes it —
 * `orders.slice(page * size, (page + 1) * size)`. The table renders whatever it is
 * given, which is why pagination lives here rather than inside `ui-table`: a
 * paginator is just as often over a list of cards.
 *
 * It sits **after** the table, which is where a user expects it, and is named for
 * what it pages.
 */
export const WithATable: Story = {
  name: 'Paging a table',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      columns: COLUMNS,
      orders: ORDERS,
      page: 0,
      size: 10,
      slice: (orders: Order[], page: number, size: number) =>
        orders.slice(page * size, (page + 1) * size),
    },
    template: frame(
      `
      <div style="display: flex; flex-direction: column;">
        <ui-table [columns]="columns" [data]="slice(orders, page, size)" aria-label="Orders" />
        <ui-paginator
          [length]="orders.length"
          [(pageIndex)]="page"
          [(pageSize)]="size"
          [pageSizeOptions]="[5, 10, 25]"
          aria-label="Orders"
        />
      </div>`,
      '44rem',
    ),
  }),
};

// --- Accessibility ---------------------------------------------------------

/**
 * `aria-label` names Material's `role="group"` — say what is being paged (`Orders`),
 * not that it is a paginator. It reaches the real `<mat-paginator>` inside the
 * component rather than sitting on the `<ui-paginator>` host, which no assistive
 * technology looks at. Every button is named by Material's own `MatPaginatorIntl`,
 * and the range label is a polite live region, so moving a page is announced.
 */
export const AriaLabel: Story = {
  name: 'a11y: aria-label',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { total: ORDERS.length },
    template: frame(`<ui-paginator [length]="total" aria-label="Orders" />`),
  }),
};

/**
 * For a paginator already named by something on the page, point `aria-labelledby` at
 * that heading rather than repeating it.
 */
export const AriaLabelledby: Story = {
  name: 'a11y: aria-labelledby',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { total: ORDERS.length },
    template: frame(`
      <div>
        <h2 id="orders-heading" style="font: var(--mat-sys-title-medium); color: var(--mat-sys-on-surface);">
          Open orders
        </h2>
        <ui-paginator [length]="total" aria-labelledby="orders-heading" />
      </div>`),
  }),
};

// --- Styling hooks and escape hatches --------------------------------------

/**
 * The hooks are read off `<ui-paginator>`, so restyling one is an ordinary CSS rule
 * on an ordinary selector — no `::ng-deep`, no `!important`. Point a colour at
 * another `--mat-sys-*` role rather than a literal, so it survives a palette change
 * and dark mode.
 */
export const StylingHooks: Story = {
  name: 'Styling hooks',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { total: ORDERS.length },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 40rem;">
        ${[
          ['Default', ''],
          [
            'Tertiary-accented arrows',
            '--ui-paginator-icon-color: var(--mat-sys-tertiary);',
          ],
          [
            'On a container surface, with quieter labels',
            '--ui-paginator-background: var(--mat-sys-surface-container); --ui-paginator-text-color: var(--mat-sys-on-surface-variant);',
          ],
          [
            'A wider size select, for four-digit pages',
            '--ui-paginator-page-size-width: 7rem;',
          ],
        ]
          .map(
            ([label, style]) => `
            <div>
              ${caption(label)}
              <ui-paginator
                [length]="total"
                [pageIndex]="1"
                [pageSizeOptions]="[100, 500, 1000]"
                [pageSize]="100"
                aria-label="Orders — ${label}"
                style="${style}"
              />
            </div>`,
          )
          .join('')}
      </div>`,
  }),
};

/**
 * `exportAs: 'uiPaginator'` hands back the component, and `matPaginator()` hands back
 * Material's own instance — the escape hatch for anything not wrapped here. A move
 * made through it still writes back to the bindings, because it is the same
 * paginator.
 */
export const EscapeHatch: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { total: ORDERS.length, page: 0 },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <ui-paginator #pager="uiPaginator" [length]="total" [(pageIndex)]="page" aria-label="Orders" />
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface);">
          <button matButton uiButton variant="outlined" (click)="pager.matPaginator().lastPage()">
            matPaginator().lastPage()
          </button>
          <span>
            {{ pager.matPaginator().getNumberOfPages() }} pages, and pageIndex is
            <strong>{{ page }}</strong>.
          </span>
        </div>
      </div>`),
  }),
};
