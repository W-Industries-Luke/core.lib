import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  Directive,
  inject,
  input,
  model,
  TemplateRef,
  viewChild,
  type TrackByFunction,
} from '@angular/core';
import { MatSort, MatSortHeader, type Sort, type SortDirection } from '@angular/material/sort';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatNoDataRow,
  MatRow,
  MatRowDef,
  MatTable,
  MatTableDataSource,
} from '@angular/material/table';

import { EmptyState } from '../empty-state/empty-state';
import { Spinner } from '../spinner/spinner';

/**
 * The sort state of a {@link Table}: which column, and which way.
 *
 * Aliased from Material's own `Sort` rather than re-declared, so that a change to
 * it upstream is a compile error here rather than a shape this component hands to
 * `MatSort` and Material silently ignores. `direction` is `''` for "sorted by
 * nothing", which is the state Material's own third click on a header returns to.
 */
export type UiTableSort = Sort;

/** Which way a column is sorted. Material's own `SortDirection`, re-exported. */
export type UiTableSortDirection = SortDirection;

/**
 * One column of a {@link Table}.
 *
 * The columns are data rather than markup — a `[columns]` array instead of a
 * `<ui-column>` per column — because the fleet's tables are built from a config
 * an app already has: the fields of a form definition, a user's chosen columns, a
 * report's shape. Declaring them as markup would put an `@for` and a
 * `<ng-container matColumnDef>` in every consumer, which is the boilerplate this
 * component exists to delete.
 *
 * What a config cannot carry is *rendering* — a status chip, a link, a formatted
 * date — so that stays a template: see {@link TableCellDef}, which takes over a
 * column's cells without taking over the rest of the table (rule 7).
 */
export interface UiTableColumn<T = unknown> {
  /**
   * The column's id, unique within the table.
   *
   * Doubles as the default property read from each row — a `key` of `'name'`
   * renders `row.name` and sorts on it — so a column that maps 1:1 onto a field
   * needs no other wiring. For one that does not, give {@link value}; `key` is
   * then only the id.
   */
  key: string;

  /** The column's heading, e.g. `Ordered on`. */
  header: string;

  /**
   * Whether the user can sort by this column.
   *
   * Off by default: a sortable header is a control, and a column of free text
   * that no one would order by should not look like one. Turning it on gives the
   * header Material's own sort control — the arrow, the click, the keyboard and
   * the `aria-sort` — and lets {@link Table.sort} settle on this column.
   */
  sortable?: boolean;

  /**
   * The column's width, as any CSS length — `'8rem'`, `'20%'`, `'120px'`.
   *
   * A hint rather than a guarantee: it lands on the `<th>`, and the browser's own
   * table layout still has the last word when the widths cannot all be honoured.
   * Leave it unset to let the content size the column, which is right more often
   * than not.
   */
  width?: string;

  /**
   * What this column's datum *is*, for a column that is not a plain field of the
   * row — a derived total, a nested `row.customer.name`, a joined address.
   *
   * This is the value the default cell renders and, more to the point, the value
   * the column sorts on: a cell template alone would leave a derived column
   * sorting on a `row[key]` that does not exist. Return the underlying value (a
   * `Date`, a number), not a formatted string — formatting is the cell template's
   * job, and a string sorts lexically.
   *
   * It is also the knob for an ordering Material's comparator does not give: a
   * `(row) => row.name.toLowerCase()` sorts a column case-insensitively. Pair it
   * with a {@link TableCellDef} when the value the column should *sort* on is not
   * the one it should *show*.
   */
  value?: (row: T) => unknown;
}

/** The context of a {@link TableCellDef} template — what its `let-`s bind to. */
export interface UiTableCellContext<T = unknown> {
  /** The row, so that a bare `let-row` works. */
  $implicit: T;
  /** The row this cell belongs to. */
  row: T;
  /** The column this cell belongs to. */
  column: UiTableColumn<T>;
  /** The row's index in the *rendered* order, i.e. after sorting. */
  index: number;
}

/** The context of a {@link TableHeaderDef} template. */
export interface UiTableHeaderContext<T = unknown> {
  /** The column, so that a bare `let-column` works. */
  $implicit: UiTableColumn<T>;
  /** The column this heading belongs to. */
  column: UiTableColumn<T>;
}

/**
 * Renders one column's cells, in place of the value {@link UiTableColumn.key} or
 * {@link UiTableColumn.value} would have printed (rule 7).
 *
 * A column config can say what a cell's *value* is; it cannot say that the value
 * should be a chip, a link, or a date in the user's locale. This is how that gets
 * in, one column at a time — every other column keeps the default rendering:
 *
 * ```html
 * <ui-table [columns]="columns" [data]="orders()">
 *   <ng-template uiTableCell="status" let-row>
 *     <span uiBadge [variant]="row.status === 'shipped' ? 'success' : 'warning'">
 *       {{ row.status }}
 *     </span>
 *   </ng-template>
 * </ui-table>
 * ```
 *
 * The template renders inside Material's own `<td mat-cell>`, so the row, its
 * hover state and the cell's padding are untouched — this replaces the cell's
 * *content*, not the cell.
 *
 * Sorting still reads {@link UiTableColumn.value} (or `row[key]`) rather than
 * whatever this prints, which is what keeps a date column ordering
 * chronologically while it renders as `2 March`.
 *
 * ### Typing `let-row`
 *
 * A column is named by a string, and a string carries no type, so there is
 * nothing for `let-row` to be inferred *from*: it is `any` by default, exactly as
 * Material's own `<td *matCellDef="let row">` is. Bind `uiTableCellData` to the
 * same array as the table's `[data]` to get the row type back:
 *
 * ```html
 * <ng-template uiTableCell="status" [uiTableCellData]="orders()" let-row>
 *   {{ row.status }}  <!-- row is an Order, and a typo here is a build error -->
 * </ng-template>
 * ```
 *
 * It is a type hint and nothing else — it renders nothing and costs nothing at
 * runtime. Optional, because a cell template that only prints a field should not
 * have to name the array twice to compile.
 */
@Directive({ selector: 'ng-template[uiTableCell]' })
// `any` is the fallback when a consumer gives no `uiTableCellData` to infer from.
// It is what Material's own `matCellDef` hands to `let row`, and narrowing it to
// `unknown` would make the *untyped* case — the common one — a build error that
// no cast in the template could fix.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TableCellDef<T = any> {
  /** The {@link UiTableColumn.key} of the column whose cells this renders. */
  readonly column = input.required<string>({ alias: 'uiTableCell' });

  /**
   * The table's `data`, purely so that `let-row` can be typed from it — the row
   * type is inferred from this array and nothing else. Renders nothing, and is
   * read by nothing: bind it or leave it, see *Typing `let-row`* above.
   *
   * Named for its binding rather than aliased to it, because an alias here would
   * be a rename `no-input-rename` is right to object to: there is no better name
   * for this that a consumer would recognise in a template.
   */
  readonly uiTableCellData = input<readonly T[]>([]);

  /** The template itself, rendered by `table.html`. @docs-private */
  readonly template = inject<TemplateRef<UiTableCellContext<T>>>(TemplateRef);

  /**
   * Types `let-row` as the row, rather than as `any`. @docs-private
   *
   * The signature is Angular's, and the compiler is its only caller — the
   * parameters exist to be named in the type predicate and nowhere else, which is
   * exactly what `no-unused-vars` reports. There is no shape of this function
   * that both keeps the guard and satisfies the rule. The same shape as
   * `MenuItemDef`'s.
   */
  static ngTemplateContextGuard<T>(
    directive: TableCellDef<T>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is UiTableCellContext<T> {
    return true;
  }
}

/**
 * Renders one column's heading, in place of the {@link UiTableColumn.header}
 * string (rule 7) — for a heading a string cannot carry: an icon, a unit, a
 * tooltip explaining what the column means.
 *
 * ```html
 * <ng-template uiTableHeader="total">
 *   Total <span uiTooltip="Including tax">(incl. VAT)</span>
 * </ng-template>
 * ```
 *
 * On a sortable column it renders inside Material's own sort control, so the
 * arrow, the click target and the keyboard still work. `header` stays required
 * alongside it: it is the column's plain-text name.
 */
@Directive({ selector: 'ng-template[uiTableHeader]' })
export class TableHeaderDef<T = unknown> {
  /** The {@link UiTableColumn.key} of the column whose heading this renders. */
  readonly column = input.required<string>({ alias: 'uiTableHeader' });

  /** The template itself, rendered by `table.html`. @docs-private */
  readonly template = inject<TemplateRef<UiTableHeaderContext<T>>>(TemplateRef);

  /**
   * Types `let-column` as the column. @docs-private
   *
   * Needs no type hint of its own, unlike {@link TableCellDef}'s: a heading reads
   * the *column*, and `UiTableColumn<unknown>`'s own fields — `key`, `header` —
   * are typed whatever the row turns out to be.
   *
   * Disabled for the same reason as {@link TableCellDef.ngTemplateContextGuard}.
   */
  static ngTemplateContextGuard<T>(
    directive: TableHeaderDef<T>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is UiTableHeaderContext<T> {
    return true;
  }
}

/**
 * Replaces the whole empty state, for a table whose "nothing here" is more than a
 * sentence — the action that fills it, a link to the filters that are hiding the
 * rows (rule 7).
 *
 * ```html
 * <ng-template uiTableEmpty>
 *   <ui-empty-state icon="inbox" title="No orders yet" message="They will appear here.">
 *     <button matButton uiButton uiEmptyStateActions>Add an order</button>
 *   </ui-empty-state>
 * </ng-template>
 * ```
 *
 * It renders in the same cell {@link Table.emptyMessage} would have, spanning
 * every column, so the table keeps its headers and its shape while it is empty.
 */
@Directive({ selector: 'ng-template[uiTableEmpty]' })
export class TableEmptyDef {
  /** The template itself, rendered by `table.html`. @docs-private */
  readonly template = inject<TemplateRef<void>>(TemplateRef);
}

/** The heading shown when a table is empty and no `emptyMessage` was given. */
const DEFAULT_EMPTY_MESSAGE = 'Nothing to show';

/**
 * Identity tracking — the row object itself is its own id.
 *
 * Spelled out rather than left to Material, whose `trackBy` is typed as required
 * and whose own fallback (an `IterableDiffer` with no `trackBy`) is this exact
 * function. So the default behaviour is unchanged and the input still has a
 * value a consumer can reason about.
 */
const TRACK_BY_IDENTITY: TrackByFunction<unknown> = (_index, row) => row;

/**
 * A themed Material table over a column config: `<table mat-table>`, its header
 * and rows built from `columns` and `data` rather than from a
 * `<ng-container matColumnDef>` per column.
 *
 * ```html
 * <ui-table [columns]="columns" [data]="orders()" aria-label="Orders" />
 *
 * <ui-table
 *   [columns]="columns"
 *   [data]="orders()"
 *   [(sort)]="sort"
 *   [loading]="pending()"
 *   emptyMessage="No orders match your filters"
 *   aria-label="Orders"
 * />
 * ```
 *
 * Like `ui-tabs` and unlike `uiButton`, this is a component rather than a
 * directive: a table owns *composition* — a header, a row per datum, a cell per
 * column — and there is no single native element to decorate.
 *
 * ### It is Material, not a re-implementation
 *
 * The `<table>`, its rows and cells, the sort control with its arrow, its
 * keyboard and its `aria-sort`, the comparator that orders the rows, and every
 * colour and font are Material's own, resolved from the `--mat-sys-*` tokens that
 * `src/styles/_theme.scss` emits — so there is not a literal colour in
 * `table.scss`, and a palette change there re-skins every table in the fleet, in
 * light and dark alike. The empty state and the spinner are this library's own
 * `ui-empty-state` and `ui-spinner`, so a table agrees with the rest of the fleet
 * about what "empty" and "loading" look like.
 *
 * What this component adds is the *config*: `columns` and `data` in, a table out,
 * instead of the twenty lines of `matColumnDef` boilerplate every app was
 * otherwise going to write for itself.
 *
 * ### Sorting
 *
 * Mark a column `sortable` and its header becomes Material's sort control.
 * `[(sort)]` is a `model` (rule 5), so the sort is one piece of state rather than
 * an input and an output that can disagree: `[sort]` opens the table on a column,
 * `(sortChange)` observes the user's clicks, and `[(sort)]` does both. It is the
 * single source of truth — the rows are derived from it — so a sort set from code
 * re-orders the table exactly as a click on the header does. Material's own third
 * click returns to `direction: ''`, which is `data`'s original order back.
 *
 * A `sort` naming a column that is missing or not `sortable` leaves the rows in
 * their original order, so a table can never be ordered by a column whose header
 * shows no arrow — a state a user could see but not undo.
 *
 * The ordering is Material's own comparator, which means numbers sort
 * numerically and strings sort **case-sensitively**, by code point: `Zoe` before
 * `alex`. That is what every other Material table in the fleet does, so it is
 * kept rather than quietly improved on here. A column that wants a different
 * order says so with {@link UiTableColumn.value} — `(row) => row.name
 * .toLowerCase()` for a case-insensitive one — and keeps its own rendering with
 * a {@link TableCellDef}.
 *
 * Sorting is client-side, over the whole of `data`. A table whose rows live on a
 * server should bind `(sortChange)`, re-query, and pass the new rows back through
 * `data`: the sort state is still this component's, only the ordering moves.
 *
 * ### Pagination
 *
 * Deliberately not here — it is `ui-paginator`'s. A paginator is a control in its
 * own right that belongs *beside* a table rather than inside it: it is just as
 * often over a list of cards. Bind its page to `data` and this table renders it.
 *
 * ### Loading and empty
 *
 * `loading` shows a `ui-spinner` in the table's body and `emptyMessage` a
 * `ui-empty-state`, both in a cell spanning every column — so the headers stay
 * put and the table does not collapse and re-expand as its rows arrive.
 * `loading` wins over the empty state: a table that has not loaded is not a table
 * that is empty, and saying "no orders" while the orders are still in flight is a
 * lie.
 *
 * ### Accessibility
 *
 * Material renders a real `<table>` with real `<th>` headers, so a screen
 * reader's table mode works — Material's own, none of it re-implemented here.
 * Name it with `aria-label` (or `aria-labelledby`): say what the rows *are*, e.g.
 * `Orders`, not that they are a table.
 *
 * ### Styling hooks
 *
 * - `--ui-table-background` — the table's surface.
 * - `--ui-table-header-text-color` / `--ui-table-text-color` — the header and cell text.
 * - `--ui-table-divider-color` — the rule under each row.
 * - `--ui-table-sort-arrow-color` — the sort header's arrow.
 * - `--ui-table-loading-padding` — the space around the spinner. Default `2rem`.
 *
 * All are read off `<ui-table>`, so a consumer sets them from an ordinary rule on
 * an ordinary selector (`ui-table { --ui-table-divider-color: … }`) — no
 * `::ng-deep`, no `!important`. Point a colour at another `--mat-sys-*` role
 * rather than a literal, so it survives a palette change and dark mode.
 *
 * The row height is deliberately not a hook: it is Material's density token, and
 * density is a fleet-wide decision `_theme.scss` owns rather than one a single
 * table should re-take.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiTable'` hands back the component, and {@link matTable} /
 * {@link matSort} hand back Material's own instances — so
 * `table.matTable().renderRows()` needs no API here (rule 4).
 */
@Component({
  selector: 'ui-table',
  exportAs: 'uiTable',
  imports: [
    MatTable,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderCellDef,
    MatCell,
    MatCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    MatNoDataRow,
    MatSort,
    MatSortHeader,
    NgTemplateOutlet,
    EmptyState,
    Spinner,
  ],
  templateUrl: './table.html',
  styleUrl: './table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Table<T> {
  /**
   * The columns, in the order they are shown. See {@link UiTableColumn}.
   *
   * Required: a table with no columns renders nothing at all, which is a mistake
   * rather than a configuration.
   */
  readonly columns = input.required<readonly UiTableColumn<T>[]>();

  /**
   * The rows. One row per item, in this order unless {@link sort} says otherwise.
   *
   * Defaults to empty rather than being required, so that a table can render its
   * headers and its spinner before the first response has landed.
   */
  readonly data = input<readonly T[]>([]);

  /**
   * The sort state, two-way. See {@link UiTableSort}, and *Sorting* above.
   *
   * `null` — the default — is `data`'s own order. A `model` rather than an
   * input/output pair (rule 5): `[(sort)]` keeps a signal and the headers in
   * step, `[sort]` drives them one way, and `(sortChange)` observes them.
   */
  readonly sort = model<UiTableSort | null>(null);

  /**
   * Whether the rows are still on their way.
   *
   * Shows a `ui-spinner` in place of the rows, under the headers. Wins over
   * {@link emptyMessage}: a table that has not loaded is not one that is empty.
   */
  readonly loading = input(false, { transform: booleanAttribute });

  /**
   * The spinner's accessible name while {@link loading} — what is loading, e.g.
   * `Loading orders`. Falls back to `ui-spinner`'s own `Loading`.
   */
  readonly loadingLabel = input<string>();

  /**
   * The heading of the `ui-empty-state` shown when there are no rows.
   *
   * Say what is missing in the user's words — "No orders match your filters"
   * rather than "No data" — and, where you can, why. For an empty state with an
   * icon, a message or a way out of it, project a {@link TableEmptyDef} instead.
   */
  readonly emptyMessage = input(DEFAULT_EMPTY_MESSAGE);

  /**
   * How Angular identifies a row across renders. Material's own `trackBy`,
   * forwarded — the escape hatch for rows replaced wholesale by every poll, where
   * tracking by an id keeps the DOM (and the user's text selection) still.
   * Defaults to Material's own identity tracking.
   */
  readonly trackBy = input<TrackByFunction<T>>(TRACK_BY_IDENTITY);

  /**
   * The table's accessible name, spelled as the ARIA attribute — what the rows
   * are, e.g. `Orders`.
   *
   * An input rather than an attribute left on the host, because the host is not
   * the `<table>`: Material renders that inside this component, and this is put
   * on it.
   */
  readonly ariaLabel = input<string | undefined, unknown>(undefined, {
    alias: 'aria-label',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The id of the element naming the table — for a table named by a heading
   * already on the page. Preferred over {@link ariaLabel} where one exists.
   */
  readonly ariaLabelledby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-labelledby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The `MatTable` this component renders — the escape hatch for anything not
   * wrapped here (rule 4), e.g. `table.matTable().renderRows()`. Reach it with
   * `#table="uiTable"`.
   */
  readonly matTable = viewChild.required<MatTable<T>>(MatTable);

  /** Material's `MatSort`, for the same reason as {@link matTable}. */
  readonly matSort = viewChild.required(MatSort);

  /** The cell templates a consumer projected. */
  protected readonly cellDefs = contentChildren(TableCellDef<T>);

  /** The header templates a consumer projected. */
  protected readonly headerDefs = contentChildren(TableHeaderDef<T>);

  /** The projected empty state, which replaces {@link emptyMessage} when given. */
  protected readonly emptySlot = contentChild(TableEmptyDef);

  /**
   * Material's own client-side sort, kept for its comparator.
   *
   * `MatTableDataSource` is where Material implements ordering a plain array —
   * numbers numerically rather than lexically, mixed types compared as strings,
   * nulls last — and re-deriving those rules here is exactly the hand-rolling
   * this library exists to avoid: a `ui-table` has to order rows the same way as
   * every other Material table in the fleet.
   *
   * Only the comparator is used. The *plumbing* is not: `MatTableDataSource` is
   * an RxJS `DataSource` that re-orders when `MatSort` emits, and `MatSort` emits
   * only for a sort the user *clicked* — a `[sort]` set from code moves its state
   * silently, so a data source would sit there holding the old order. {@link rows}
   * is derived from the same signal the template binds, so it cannot.
   */
  private readonly sortEngine = new MatTableDataSource<T>();

  /** The column ids handed to Material's row defs, in order. */
  protected readonly displayedColumns = computed(() => this.columns().map((column) => column.key));

  /** The columns by id, for the per-row lookups the cell and sort paths do. */
  private readonly columnsByKey = computed(
    () => new Map(this.columns().map((column) => [column.key, column])),
  );

  protected readonly cellTemplates = computed(
    () => new Map(this.cellDefs().map((def) => [def.column(), def.template])),
  );

  protected readonly headerTemplates = computed(
    () => new Map(this.headerDefs().map((def) => [def.column(), def.template])),
  );

  /**
   * The sort actually applied, or `null` for `data`'s own order.
   *
   * A sort is honoured only when it names a column that exists *and* is
   * `sortable`, so the rows can never be ordered by a column whose header shows
   * no arrow. `direction: ''` is Material's "sorted by nothing" — the third click
   * on a header — which is the original order.
   */
  private readonly appliedSort = computed(() => {
    const sort = this.sort();
    if (!sort?.active || (sort.direction !== 'asc' && sort.direction !== 'desc')) {
      return null;
    }
    return this.columnsByKey().get(sort.active)?.sortable ? sort : null;
  });

  /**
   * The rows in the order they are rendered.
   *
   * Derived rather than pushed: the sort state, the data and the rows are one
   * chain of signals, so there is no order in which a `[sort]` and a `[data]`
   * arriving together can leave the table showing yesterday's ordering.
   */
  protected readonly rows = computed<readonly T[]>(() => {
    // A loading table has no rows to show — the spinner has the body — and
    // ordering data on its way out is work no one will ever see.
    if (this.loading()) {
      return [];
    }

    const sort = this.appliedSort();
    if (!sort) {
      return this.data();
    }

    // `sortData` is typed for the `MatSort` directive but reads only the `active`
    // and `direction` that `Sort` — the type Material itself emits from
    // `sortChange` — is made of. The copy is because it sorts in place, and
    // `data` is the consumer's array rather than ours to reorder.
    return this.sortEngine.sortData([...this.data()], sort as MatSort);
  });

  constructor() {
    // What a column's datum *is*, which is what the comparator orders on. The
    // default reads `row[key]`, exactly as Material's own accessor does; a column
    // with a `value` is one whose datum is not a field of the row at all, so this
    // is the only thing that knows how to find it.
    //
    // This runs inside `rows`'s computation, so the signals it reads are tracked
    // there: an edit to `columns` re-sorts.
    this.sortEngine.sortingDataAccessor = (row, key) =>
      this.cellValue(row, this.columnsByKey().get(key)) as string | number;
  }

  /**
   * The value a column shows for a row: its `value` accessor, or the field named
   * by its `key`. Used by the default cell *and* by the comparator, so that a
   * column always sorts on the same thing it renders.
   */
  protected cellValue(row: T, column: UiTableColumn<T> | undefined): unknown {
    if (!column) {
      return undefined;
    }
    return column.value ? column.value(row) : (row as Record<string, unknown>)[column.key];
  }
}
