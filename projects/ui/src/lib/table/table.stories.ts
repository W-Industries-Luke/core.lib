import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Button } from '../button/button';
import { EmptyState, EmptyStateActions } from '../empty-state/empty-state';
import {
  Table,
  TableCellDef,
  TableEmptyDef,
  TableHeaderDef,
  type UiTableColumn,
} from './table';

interface Order {
  id: string;
  customer: string;
  status: 'shipped' | 'packing' | 'held';
  quantity: number;
  total: number;
  placed: Date;
}

/**
 * A plausible order book rather than "Row 1" — the widths, the ragged text and
 * the mixed types are what a real table has to cope with, and what the stories
 * are here to show it coping with.
 */
const ORDERS: Order[] = [
  {
    id: '4213',
    customer: 'Sam Okafor',
    status: 'shipped',
    quantity: 3,
    total: 148.2,
    placed: new Date('2024-03-02'),
  },
  {
    id: '4214',
    customer: 'alex Duarte',
    status: 'packing',
    quantity: 10,
    total: 1204.0,
    placed: new Date('2024-01-15'),
  },
  {
    id: '4215',
    customer: 'Rae Lindqvist',
    status: 'held',
    quantity: 2,
    total: 39.99,
    placed: new Date('2024-05-20'),
  },
  {
    id: '4216',
    customer: 'Jo Mensah',
    status: 'shipped',
    quantity: 24,
    total: 2870.5,
    placed: new Date('2024-02-08'),
  },
];

/** The everyday column set: an id, a name, and a number worth ordering by. */
const COLUMNS: UiTableColumn<Order>[] = [
  { key: 'id', header: 'Order', width: '6rem' },
  { key: 'customer', header: 'Customer', sortable: true },
  { key: 'quantity', header: 'Quantity', sortable: true, width: '8rem' },
];

/** Stories render against a container with an edge, so column widths are legible. */
const frame = (content: string, width = '48rem') =>
  `<div style="max-width: ${width};">${content}</div>`;

const caption = (text: string) =>
  `<p style="font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant); margin: 0 0 0.5rem;">${text}</p>`;

const meta: Meta<Table<Order>> = {
  title: 'Components/Table',
  component: Table,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        Table,
        TableCellDef,
        TableHeaderDef,
        TableEmptyDef,
        EmptyState,
        EmptyStateActions,
        MatButton,
        Button,
        // A real table formats: the cell-template stories render a currency and a
        // date rather than printing a raw number and a `Date`'s `toString()`.
        CurrencyPipe,
        DatePipe,
      ],
    }),
  ],
  args: {
    columns: COLUMNS,
    data: ORDERS,
    loading: false,
    emptyMessage: 'Nothing to show',
    sort: null,
  },
  argTypes: {
    loading: { control: 'boolean' },
    emptyMessage: { control: 'text' },
    loadingLabel: { control: 'text' },
    sort: { control: 'object' },
    columns: { control: 'object' },
    data: { control: 'object' },
    // Documented in the table but not knobs: their inputs are aliased to the
    // ARIA attributes, which `argsToTemplate` cannot bind — it writes the class
    // member name. The `a11y:` stories cover them with real templates.
    ariaLabel: { name: 'aria-label', control: false },
    ariaLabelledby: { name: 'aria-labelledby', control: false },
    trackBy: { table: { disable: true } },
    matTable: { table: { disable: true } },
    matSort: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-table` is the shared theme applied to Angular Material’s `<mat-table>`, over a',
          '**column config**: `[columns]` and `[data]` in, a table out, instead of the twenty lines',
          'of `<ng-container matColumnDef>` boilerplate every app was otherwise going to write for',
          'itself. Like `ui-tabs` and unlike `uiButton`, it is a **component** rather than a',
          'directive: a table owns composition — a header, a row per datum, a cell per column.',
          '',
          '### Columns',
          '',
          'A column is `{ key, header, sortable?, width?, value? }`. `key` is its id *and* the field',
          'read from each row, so a column that maps 1:1 onto a property needs nothing else. `value`',
          'is for a column that is not a plain field — a derived total, a nested name — and is what',
          'the column both shows and **sorts on**.',
          '',
          '### Rendering a cell',
          '',
          'A config can say what a cell’s value is; it cannot say the value should be a chip, a link',
          'or a formatted date. That is `uiTableCell`, one column at a time — every other column',
          'keeps the default rendering. `uiTableHeader` does the same for a heading, and',
          '`uiTableEmpty` for the whole empty state.',
          '',
          '### Sorting',
          '',
          'Mark a column `sortable` and its header becomes Material’s sort control — the arrow, the',
          'click, the keyboard and the `aria-sort`, none of it re-implemented here. `[(sort)]` is a',
          '`model`, so the sort is one piece of state rather than an input and an output that can',
          'disagree, and it is the single source of truth: the rows are derived from it, so a sort',
          'set from code re-orders the table exactly as a click does. Sorting is client-side; a',
          'server-side table binds `(sortChange)`, re-queries, and passes the rows back through',
          '`[data]`.',
          '',
          'The comparator is Material’s own, which means numbers sort numerically and strings sort',
          '**case-sensitively** — `Zoe` before `alex`. That is what every other Material table in the',
          'fleet does, so it is kept rather than quietly improved on. See *Sorting: case-insensitive*',
          'below for the way out.',
          '',
          '### Pagination',
          '',
          'Deliberately not here — it is `ui-paginator`’s. A paginator is a control in its own right',
          'that belongs *beside* a table rather than inside it: it is just as often over a list of',
          'cards. Bind its page to `[data]` and this table renders it.',
          '',
          '### Loading and empty',
          '',
          '`loading` shows a `ui-spinner` and `emptyMessage` a `ui-empty-state`, both in a cell',
          'spanning every column, so the headers stay put and the table does not collapse and',
          're-expand as its rows arrive. `loading` wins over the empty state: saying “no orders”',
          'while the orders are still in flight is a lie.',
          '',
          '### Theming and restyling',
          '',
          'The table, its rows and its sort control are Material’s own, resolved from the M3 system',
          'tokens in `src/styles/_theme.scss` — there is not a literal colour in this component’s',
          'stylesheet, and every story below renders the exact palette a consuming app gets, dark',
          'mode included. `--ui-table-background`, `--ui-table-header-text-color`,',
          '`--ui-table-text-color`, `--ui-table-divider-color`, `--ui-table-sort-arrow-color` and',
          '`--ui-table-loading-padding` restyle it from an ordinary CSS rule, with no `::ng-deep`.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: frame(`<ui-table ${argsToTemplate(args)} aria-label="Orders" />`),
  }),
};

export default meta;
type Story = StoryObj<Table<Order>>;

/** The default: three columns over four orders, two of them sortable. */
export const Default: Story = {};

/**
 * The everyday shape — a column config and an array. Nothing is bound but the
 * data and the columns, and every cell reads its column's `key` off the row.
 */
export const Basic: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { columns: COLUMNS, data: ORDERS },
    template: frame(`<ui-table [columns]="columns" [data]="data" aria-label="Orders" />`),
  }),
};

// --- Sorting ---------------------------------------------------------------

/**
 * A `sortable` column's header is Material's sort control: click it to order the
 * rows, click again to reverse, and a third time to put them back in the order
 * the data arrived in. `Order` is not sortable, so it stays a plain heading —
 * no arrow, and nothing for the keyboard to land on.
 */
export const Sortable: Story = {
  name: 'Sorting: click a header',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { columns: COLUMNS, data: ORDERS },
    template: frame(`
      ${caption('Customer and Quantity sort; Order does not.')}
      <ui-table [columns]="columns" [data]="data" aria-label="Orders" />`),
  }),
};

/** A one-way `[sort]` opens the table already ordered by a column. */
export const SortedOnOpen: Story = {
  name: 'Sorting: opening on a column',
  args: { sort: { active: 'quantity', direction: 'desc' } },
  parameters: { controls: { disable: true } },
  render: (args) => ({
    props: args,
    template: frame(`<ui-table ${argsToTemplate(args)} aria-label="Orders" />`),
  }),
};

/**
 * `[(sort)]` keeps a signal and the headers in step in both directions: the
 * buttons below write to the same state a click on a header does, and the table
 * re-orders either way. This is the half a `MatTableDataSource` cannot do on its
 * own — it only ever hears about a sort the user *clicked*.
 */
export const TwoWaySort: Story = {
  name: 'Sorting: two-way',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { columns: COLUMNS, data: ORDERS, sort: null },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <ui-table [columns]="columns" [data]="data" [(sort)]="sort" aria-label="Orders" />
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; font: var(--mat-sys-body-medium);">
          <button matButton uiButton variant="outlined" (click)="sort = { active: 'customer', direction: 'asc' }">
            By customer
          </button>
          <button matButton uiButton variant="outlined" (click)="sort = { active: 'quantity', direction: 'desc' }">
            Most items first
          </button>
          <button matButton uiButton variant="text" (click)="sort = null">Clear</button>
          <span>sort is <strong>{{ sort ? sort.active + ' ' + sort.direction : 'null' }}</strong>.</span>
        </div>
      </div>`),
  }),
};

/**
 * The comparator is Material's, so `10` sorts after `3` rather than between `1`
 * and `2` — the thing a hand-rolled string comparison gets wrong, and the reason
 * this component borrows Material's rather than writing its own.
 */
export const SortingNumbers: Story = {
  name: 'Sorting: numbers, numerically',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      columns: [
        { key: 'id', header: 'Order', width: '6rem' },
        { key: 'quantity', header: 'Quantity', sortable: true, width: '8rem' },
        { key: 'total', header: 'Total', sortable: true },
      ] satisfies UiTableColumn<Order>[],
      data: ORDERS,
      sort: { active: 'quantity', direction: 'asc' },
    },
    template: frame(`
      ${caption('2, 3, 10, 24 — not 10, 2, 24, 3.')}
      <ui-table [columns]="columns" [data]="data" [sort]="sort" aria-label="Orders by quantity" />`),
  }),
};

/**
 * Material compares strings by code point, so every capital sorts before every
 * lowercase: `alex Duarte` lands *after* `Sam Okafor`. That is what every other
 * Material table in the fleet does, so `ui-table` keeps it rather than quietly
 * improving on it.
 *
 * The way out is `value`, which is what a column sorts on: point it at a
 * lowercased name and pair it with a `uiTableCell` that still renders the real
 * one. The left table is the default; the right is the same data, sorted
 * case-insensitively.
 */
export const SortingCaseInsensitive: Story = {
  name: 'Sorting: case-insensitive',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      columns: [
        { key: 'id', header: 'Order', width: '6rem' },
        { key: 'customer', header: 'Customer', sortable: true },
      ] satisfies UiTableColumn<Order>[],
      insensitive: [
        { key: 'id', header: 'Order', width: '6rem' },
        {
          key: 'customer',
          header: 'Customer',
          sortable: true,
          value: (order: Order) => order.customer.toLowerCase(),
        },
      ] satisfies UiTableColumn<Order>[],
      data: ORDERS,
      sort: { active: 'customer', direction: 'asc' },
    },
    template: `
      <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 18rem;">
          ${caption('Material’s own order: capitals first.')}
          <ui-table [columns]="columns" [data]="data" [sort]="sort" aria-label="Orders, case-sensitive" />
        </div>
        <div style="flex: 1; min-width: 18rem;">
          ${caption('value: (row) => row.customer.toLowerCase()')}
          <ui-table [columns]="insensitive" [data]="data" [sort]="sort" aria-label="Orders, case-insensitive">
            <ng-template uiTableCell="customer" [uiTableCellData]="data" let-row>
              {{ row.customer }}
            </ng-template>
          </ui-table>
        </div>
      </div>`,
  }),
};

// --- Loading and empty -----------------------------------------------------

/**
 * `loading` puts a `ui-spinner` where the rows go, under the headers that are
 * already there — so the table does not collapse to nothing and then re-expand
 * as its rows land.
 */
export const Loading: Story = {
  name: 'loading',
  args: { loading: true, loadingLabel: 'Loading orders' },
  parameters: { controls: { disable: true } },
  render: (args) => ({
    props: args,
    template: frame(`<ui-table ${argsToTemplate(args)} aria-label="Orders" />`),
  }),
};

/**
 * `loading` wins over the empty state: a table that has not loaded is not a
 * table that is empty, and saying "no orders" while the orders are still in
 * flight is a lie. Both are set here; only the spinner shows.
 */
export const LoadingBeatsEmpty: Story = {
  name: 'loading: over an empty table',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { columns: COLUMNS },
    template: frame(`
      <ui-table
        [columns]="columns"
        [data]="[]"
        loading
        loadingLabel="Loading orders"
        emptyMessage="No orders yet"
        aria-label="Orders"
      />`),
  }),
};

/**
 * With no rows, the table shows a `ui-empty-state` carrying `emptyMessage`,
 * spanning every column. Say what is missing in the user's words — "No orders
 * match your filters" rather than "No data" — and, where you can, why.
 */
export const Empty: Story = {
  name: 'emptyMessage',
  args: { data: [], emptyMessage: 'No orders match your filters' },
  parameters: { controls: { disable: true } },
  render: (args) => ({
    props: args,
    template: frame(`<ui-table ${argsToTemplate(args)} aria-label="Orders" />`),
  }),
};

/**
 * An empty state that needs more than a sentence — an icon, a message, the
 * action that fills it — is a template rather than a string (rule 7).
 * `uiTableEmpty` replaces the whole thing, in the same cell.
 */
export const EmptyTemplate: Story = {
  name: 'uiTableEmpty: a way out of it',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { columns: COLUMNS },
    template: frame(`
      <ui-table [columns]="columns" [data]="[]" aria-label="Orders">
        <ng-template uiTableEmpty>
          <ui-empty-state
            icon="inbox"
            title="No orders yet"
            message="Orders placed in the last 90 days will appear here."
          >
            <button matButton uiButton uiEmptyStateActions variant="filled">Add an order</button>
            <button matButton uiButton uiEmptyStateActions variant="text">Import a CSV</button>
          </ui-empty-state>
        </ng-template>
      </ui-table>`),
  }),
};

// --- Columns ---------------------------------------------------------------

/**
 * Every column of the order book, with the `width` hints that keep the ids and
 * the numbers from being pushed around by the names. The table fills the width it
 * is given and the browser's own table layout shares it out, so a table this wide
 * wants a container to match — put it in a scrolling one (`overflow-x: auto`) if
 * it has to live somewhere narrow.
 */
export const ManyColumns: Story = {
  name: 'Many columns',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      columns: [
        { key: 'id', header: 'Order', width: '6rem' },
        { key: 'customer', header: 'Customer', sortable: true },
        { key: 'status', header: 'Status', sortable: true, width: '8rem' },
        { key: 'quantity', header: 'Items', sortable: true, width: '6rem' },
        { key: 'total', header: 'Total', sortable: true, width: '8rem' },
        { key: 'placed', header: 'Placed', sortable: true, width: '10rem' },
      ] satisfies UiTableColumn<Order>[],
      data: ORDERS,
    },
    template: frame(
      `<ui-table [columns]="columns" [data]="data" aria-label="Orders" />`,
      '60rem',
    ),
  }),
};

/**
 * `width` is a hint on the `<th>`, in any CSS length — `'6rem'`, `'20%'`,
 * `'120px'`. The table fills the space it is given, so a width is a share of
 * that rather than of whatever the text happened to need. Leave it unset to let
 * the content size the column, which is right more often than not.
 */
export const ColumnWidths: Story = {
  name: 'Column widths',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      columns: [
        { key: 'id', header: 'Order', width: '20%' },
        { key: 'customer', header: 'Customer' },
        { key: 'quantity', header: 'Quantity', width: '20%' },
      ] satisfies UiTableColumn<Order>[],
      data: ORDERS,
    },
    template: frame(`
      ${caption('20% / auto / 20%.')}
      <ui-table [columns]="columns" [data]="data" aria-label="Orders" />`),
  }),
};

/**
 * A column whose datum is not a field of the row at all — a total per item,
 * computed from two — is a `value`. It is what the column shows *and* what it
 * sorts on, which a cell template alone could not do: sorting would be left
 * reading a `row.perItem` that does not exist.
 */
export const DerivedColumn: Story = {
  name: 'value: a derived column',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      columns: [
        { key: 'id', header: 'Order', width: '6rem' },
        { key: 'quantity', header: 'Items', width: '6rem' },
        { key: 'total', header: 'Total', sortable: true, width: '8rem' },
        {
          key: 'perItem',
          header: 'Per item',
          sortable: true,
          value: (order: Order) => order.total / order.quantity,
        },
      ] satisfies UiTableColumn<Order>[],
      data: ORDERS,
      sort: { active: 'perItem', direction: 'desc' },
    },
    template: frame(`
      ${caption('“Per item” is total ÷ quantity — a value, sorted like any other column.')}
      <ui-table [columns]="columns" [data]="data" [sort]="sort" aria-label="Orders by unit price" />`),
  }),
};

// --- Templates -------------------------------------------------------------

/**
 * `uiTableCell` takes over one column's cells and leaves the rest alone (rule 7):
 * the status is a chip, the total is a currency, the date is readable — and
 * `Order` and `Items` are still the plain default rendering.
 *
 * Sorting still reads the column's value rather than what the template prints,
 * which is what keeps `Placed` ordering chronologically while it renders as
 * "2 Mar 2024".
 */
export const CellTemplates: Story = {
  name: 'uiTableCell: rendering a cell',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      columns: [
        { key: 'id', header: 'Order', width: '6rem' },
        { key: 'status', header: 'Status', sortable: true, width: '9rem' },
        { key: 'total', header: 'Total', sortable: true, width: '8rem' },
        { key: 'placed', header: 'Placed', sortable: true, width: '10rem' },
      ] satisfies UiTableColumn<Order>[],
      data: ORDERS,
      sort: { active: 'placed', direction: 'asc' },
      // `success` and `warning` are the roles M3 itself lacks and `_theme.scss`
      // fills in; `error` is M3's own. A literal hex here would be a colour that
      // survives neither a palette change nor dark mode.
      chip: (status: Order['status']) =>
        ({
          shipped: 'background: var(--ui-sys-success-container); color: var(--ui-sys-on-success-container);',
          packing: 'background: var(--ui-sys-warning-container); color: var(--ui-sys-on-warning-container);',
          held: 'background: var(--mat-sys-error-container); color: var(--mat-sys-on-error-container);',
        })[status] +
        'display: inline-block; padding: 0.125rem 0.5rem; border-radius: var(--mat-sys-corner-full); font: var(--mat-sys-label-small);',
    },
    template: frame(`
      <ui-table [columns]="columns" [data]="data" [sort]="sort" aria-label="Orders">
        <ng-template uiTableCell="status" [uiTableCellData]="data" let-row>
          <span [style]="chip(row.status)">{{ row.status }}</span>
        </ng-template>
        <ng-template uiTableCell="total" [uiTableCellData]="data" let-row>
          {{ row.total | currency: 'GBP' }}
        </ng-template>
        <ng-template uiTableCell="placed" [uiTableCellData]="data" let-row>
          {{ row.placed | date: 'd MMM y' }}
        </ng-template>
      </ui-table>`),
  }),
};

/**
 * `uiTableHeader` does for a heading what `uiTableCell` does for a cell: a
 * heading a string cannot carry — a unit, an icon, an explanation. On a sortable
 * column it renders inside Material's own sort control, so the arrow, the click
 * target and the keyboard still work.
 */
export const HeaderTemplates: Story = {
  name: 'uiTableHeader: rendering a heading',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      columns: [
        { key: 'id', header: 'Order', width: '6rem' },
        { key: 'customer', header: 'Customer', sortable: true },
        { key: 'total', header: 'Total', sortable: true, width: '10rem' },
      ] satisfies UiTableColumn<Order>[],
      data: ORDERS,
    },
    template: frame(`
      <ui-table [columns]="columns" [data]="data" aria-label="Orders">
        <ng-template uiTableHeader="total" let-column>
          {{ column.header }}
          <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant); margin-inline-start: 0.25rem;">
            (incl. VAT)
          </span>
        </ng-template>
      </ui-table>`),
  }),
};

/**
 * The whole thing together, as an app would write it: a config, a sort the table
 * opens on, cells that render, and a header that explains itself.
 */
export const Everything: Story = {
  name: 'Everything at once',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      columns: [
        { key: 'id', header: 'Order', width: '6rem' },
        { key: 'customer', header: 'Customer', sortable: true },
        { key: 'status', header: 'Status', sortable: true, width: '9rem' },
        { key: 'total', header: 'Total', sortable: true, width: '9rem' },
      ] satisfies UiTableColumn<Order>[],
      data: ORDERS,
      sort: { active: 'total', direction: 'desc' },
    },
    template: frame(`
      <ui-table [columns]="columns" [data]="data" [sort]="sort" aria-label="Orders">
        <ng-template uiTableCell="total" [uiTableCellData]="data" let-row>
          <strong>{{ row.total | currency: 'GBP' }}</strong>
        </ng-template>
        <ng-template uiTableHeader="status" let-column>
          {{ column.header }}
        </ng-template>
      </ui-table>`),
  }),
};

// --- Accessibility ---------------------------------------------------------

/**
 * `aria-label` names Material's `<table>` — say what the rows *are* (`Orders`),
 * not that they are a table. It reaches the real `<table>` inside the component
 * rather than sitting on the `<ui-table>` host, which no assistive technology
 * ever looks at.
 */
export const AriaLabel: Story = {
  name: 'a11y: aria-label',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { columns: COLUMNS, data: ORDERS },
    template: frame(`<ui-table [columns]="columns" [data]="data" aria-label="Orders" />`),
  }),
};

/**
 * For a table already named by something on the page, point `aria-labelledby` at
 * that heading rather than repeating it.
 */
export const AriaLabelledby: Story = {
  name: 'a11y: aria-labelledby',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { columns: COLUMNS, data: ORDERS },
    template: frame(`
      <div>
        <h2 id="orders-heading" style="font: var(--mat-sys-title-medium); color: var(--mat-sys-on-surface);">
          Open orders
        </h2>
        <ui-table [columns]="columns" [data]="data" aria-labelledby="orders-heading" />
      </div>`),
  }),
};

// --- Styling hooks and escape hatches --------------------------------------

/**
 * The hooks are read off `<ui-table>`, so restyling one is an ordinary CSS rule
 * on an ordinary selector — no `::ng-deep`, no `!important`. Point a colour at
 * another `--mat-sys-*` role rather than a literal, so it survives a palette
 * change and dark mode.
 */
export const StylingHooks: Story = {
  name: 'Styling hooks',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { columns: COLUMNS, data: ORDERS },
    template: `
      <div style="display: flex; flex-direction: column; gap: 2rem; max-width: 48rem;">
        ${[
          ['Default', ''],
          [
            'A tertiary-accented header and arrow',
            '--ui-table-header-text-color: var(--mat-sys-tertiary); --ui-table-sort-arrow-color: var(--mat-sys-tertiary);',
          ],
          [
            'A quieter divider, on a container surface',
            '--ui-table-background: var(--mat-sys-surface-container); --ui-table-divider-color: var(--mat-sys-outline-variant);',
          ],
        ]
          .map(
            ([label, style]) => `
            <div>
              ${caption(label)}
              <ui-table [columns]="columns" [data]="data" aria-label="Orders — ${label}" style="${style}" />
            </div>`,
          )
          .join('')}
      </div>`,
  }),
};

/**
 * `exportAs: 'uiTable'` hands back the component, and `matTable()` / `matSort()`
 * hand back Material's own instances — the escape hatch for anything not wrapped
 * here (rule 4).
 */
export const EscapeHatch: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { columns: COLUMNS, data: ORDERS },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <ui-table #table="uiTable" [columns]="columns" [data]="data" aria-label="Orders" />
        <div style="display: flex; gap: 0.5rem; align-items: center; font: var(--mat-sys-body-medium);">
          <button matButton uiButton variant="outlined" (click)="table.matTable().renderRows()">
            matTable().renderRows()
          </button>
          <span>{{ table.columns().length }} columns, {{ table.data().length }} rows.</span>
        </div>
      </div>`),
  }),
};
