import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  numberAttribute,
  output,
  viewChild,
} from '@angular/core';
import {
  MatPaginator,
  type MatPaginatorSelectConfig,
  type PageEvent,
} from '@angular/material/paginator';

/**
 * The page a {@link Paginator} moved to: which page, and how big.
 *
 * Aliased from Material's own `PageEvent` rather than re-declared, so that a
 * change to it upstream is a compile error here rather than a shape this component
 * quietly stops filling in. `pageIndex` and `pageSize` are the two a consumer
 * reaches for — the slice is `data.slice(pageIndex * pageSize, …)` — and
 * `previousPageIndex` and `length` come along because Material emits them, and
 * dropping them would be this wrapper swallowing Material's own API (rule 4).
 */
export type UiPageChange = PageEvent;

/**
 * How the page size selector is configured. Material's own
 * `MatPaginatorSelectConfig`, re-exported — see {@link Paginator.selectConfig}.
 */
export type UiPaginatorSelectConfig = MatPaginatorSelectConfig;

/**
 * The page sizes offered when none are given.
 *
 * Material's own default is an empty list, i.e. a paginator with no choice at all.
 * This is the fleet's answer instead: a ramp that covers a table of a few rows and
 * a report of thousands, and — because it is the same list in every app — one a
 * user only has to learn once.
 */
const DEFAULT_PAGE_SIZE_OPTIONS: readonly number[] = [10, 25, 50, 100];

/**
 * The size for a paginator given neither a {@link Paginator.pageSize} nor any
 * {@link Paginator.pageSizeOptions} to take a first entry from — Material's own
 * fallback, kept so that `[pageSizeOptions]="[]"` still has a page size rather
 * than a division by zero. Unreachable via the defaults above.
 */
const FALLBACK_PAGE_SIZE = 50;

/**
 * A themed Material paginator: `<mat-paginator>` — the page size selector, the
 * range label and the navigation buttons.
 *
 * ```html
 * <ui-paginator [length]="orders().length" [(pageIndex)]="page" aria-label="Orders" />
 *
 * <ui-paginator
 *   [length]="total()"
 *   [(pageIndex)]="page"
 *   [(pageSize)]="size"
 *   [pageSizeOptions]="[5, 10, 20]"
 *   (pageChange)="fetch($event)"
 *   aria-label="Orders"
 * />
 * ```
 *
 * Like `ui-table` and unlike `uiButton`, this is a component rather than a
 * directive: a paginator owns *composition* — a select, a label and four buttons —
 * and there is no single native element to decorate.
 *
 * ### It is Material, not a re-implementation
 *
 * The buttons and their icons, the page size `<mat-select>`, the `Items per page`
 * and `1 – 10 of 42` labels, the tooltips, the `role="group"`, the polite live
 * region that announces a new range, the keyboard, and every colour and font are
 * `<mat-paginator>`'s own, resolved from the `--mat-sys-*` tokens that
 * `src/styles/_theme.scss` emits — so there is not a literal colour in
 * `paginator.scss`, and a palette change there re-skins every paginator in the
 * fleet, in light and dark alike.
 *
 * What this component adds is the fleet's defaults — a page size ramp
 * ({@link pageSizeOptions}) and the first/last buttons, neither of which Material
 * ships — and state that is *signals* rather than a widget holding its own.
 *
 * ### Paging is yours to do
 *
 * A paginator is a control, not a data source: it says which slice a user asked
 * for, and nothing here touches the rows. Take the slice from `pageIndex` and
 * `pageSize`:
 *
 * ```ts
 * readonly page = signal(0);
 * readonly size = signal(10);
 * readonly shown = computed(() =>
 *   this.orders().slice(this.page() * this.size(), (this.page() + 1) * this.size()),
 * );
 * ```
 *
 * ...or, for rows that live on a server, bind `(pageChange)` and re-query with the
 * `pageIndex` and `pageSize` it carries.
 *
 * ### State
 *
 * {@link pageIndex} and {@link pageSize} are `model`s (rule 5), so each is one
 * piece of state rather than an input and an output that can disagree: `[pageSize]`
 * drives it one way, `(pageSizeChange)` observes it, and `[(pageSize)]` does both.
 * A user's click writes back through the same signal that a `.set()` from code
 * drives, so the two cannot drift — including Material's own rule that *changing
 * the page size keeps the first visible item on screen*, which moves `pageIndex`
 * as well and reports both back.
 *
 * ### It does not know how many rows there are
 *
 * {@link length} is required, and it is the count of *everything* being paged
 * through rather than of the current page. It is the one thing here that can be got
 * wrong in a way a user sees: a `length` of one page's worth leaves the next button
 * disabled on the first page. For server-side paging that is the response's total,
 * not `rows.length`.
 *
 * ### Wording and translation
 *
 * `Items per page`, `Next page`, `1 – 10 of 42` and the rest are Material's
 * `MatPaginatorIntl`, which is a provider rather than an input — one set of words
 * per app, not per paginator. Reword or translate them by providing a subclass:
 *
 * ```ts
 * providers: [{ provide: MatPaginatorIntl, useFactory: ordersIntl }]
 * ```
 *
 * ### Accessibility
 *
 * Material renders the `role="group"`, names every button from the intl above, and
 * makes the range label a polite live region, so moving a page is announced. Name
 * the group with `aria-label` (or `aria-labelledby`): say what is being paged, e.g.
 * `Orders`, not that it is a paginator.
 *
 * ### Styling hooks
 *
 * - `--ui-paginator-background` — the paginator's surface.
 * - `--ui-paginator-text-color` — the range and `Items per page` labels.
 * - `--ui-paginator-icon-color` / `--ui-paginator-disabled-icon-color` — the
 *   navigation arrows, and the arrows once the range runs out.
 * - `--ui-paginator-page-size-width` — the page size select's width. Default `84px`,
 *   which a three-digit option outgrows.
 *
 * All are read off `<ui-paginator>`, so a consumer sets them from an ordinary rule
 * on an ordinary selector (`ui-paginator { --ui-paginator-background: … }`) — no
 * `::ng-deep`, no `!important`. Point a colour at another `--mat-sys-*` role rather
 * than a literal, so it survives a palette change and dark mode.
 *
 * The paginator's height is deliberately not a hook: it is Material's density
 * token, and density is a fleet-wide decision `_theme.scss` owns rather than one a
 * single paginator should re-take.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiPaginator'` hands back the component, and {@link matPaginator} hands
 * back Material's own instance — so `paginator.matPaginator().lastPage()` or
 * `.getNumberOfPages()` needs no API here (rule 4).
 */
@Component({
  selector: 'ui-paginator',
  exportAs: 'uiPaginator',
  imports: [MatPaginator],
  templateUrl: './paginator.html',
  styleUrl: './paginator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Paginator {
  /**
   * How many items there are in total — across every page, not on this one.
   *
   * Required: a paginator that does not know how long the list is cannot say
   * whether there is a next page, and would sit there with both arrows disabled.
   * For server-side paging this is the response's total count.
   */
  readonly length = input.required<number, unknown>({ transform: numberAttribute });

  /**
   * The zero-based index of the page being shown, two-way.
   *
   * A `model` rather than an input/output pair (rule 5): `[(pageIndex)]` keeps a
   * signal and the buttons in step, `[pageIndex]` drives them one way, and
   * `(pageIndexChange)` observes them. Material moves it on its own when
   * {@link pageSize} changes, to keep the first visible item on screen, and that
   * lands here too.
   */
  readonly pageIndex = model(0);

  /**
   * How many items are on a page, two-way.
   *
   * A `model` for the same reason as {@link pageIndex}: the user picks this from the
   * select, so an input alone would be a value the paginator immediately disagreed
   * with.
   *
   * Leave it unset and it settles on the first of {@link pageSizeOptions} — as
   * Material does — reporting that back through `pageSizeChange` rather than leaving
   * a consumer to re-derive the size the paginator chose.
   */
  readonly pageSize = model<number | undefined>(undefined);

  /**
   * The page sizes a user can choose between. Defaults to `[10, 25, 50, 100]`.
   *
   * Material adds the current {@link pageSize} to this list when it is not already
   * in it, so a size set from code is always one the select can show. Give a single
   * option — or set {@link hidePageSize} — for a paginator whose size is not the
   * user's to choose.
   */
  readonly pageSizeOptions = input<readonly number[]>(DEFAULT_PAGE_SIZE_OPTIONS);

  /**
   * Whether to hide the page size selector, leaving the range and the buttons.
   *
   * For a page size the user has no say in — a fixed grid, a print layout. The size
   * still applies; it is only the control that goes.
   */
  readonly hidePageSize = input(false, { transform: booleanAttribute });

  /**
   * Whether the jump-to-first and jump-to-last buttons are shown. On by default.
   *
   * This is the one place the fleet's default is not Material's, which hides them.
   * A paginator knows exactly how many pages there are — it prints the number — so
   * "back to the start" should be one click rather than however many `pageIndex`
   * happens to be, and every paginator in the fleet should offer it in the same
   * place. Turn it off for one squeezed somewhere narrow.
   */
  readonly showFirstLastButtons = input(true, { transform: booleanAttribute });

  /**
   * Whether the whole control is inert — the select and all four buttons.
   *
   * For a page mid-fetch, where moving again would race the response.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Material's own configuration for the page size `<mat-select>` — its `panelClass`
   * and `disableOptionCentering` — forwarded rather than swallowed (rule 4).
   */
  readonly selectConfig = input<UiPaginatorSelectConfig>({});

  /**
   * The group's accessible name, spelled as the ARIA attribute — what is being
   * paged, e.g. `Orders`.
   *
   * An input rather than an attribute left on the host, because the host is not the
   * element with `role="group"`: Material puts that on the `<mat-paginator>` inside
   * this component, and this is put on it.
   */
  readonly ariaLabel = input<string | undefined, unknown>(undefined, {
    alias: 'aria-label',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The id of the element naming the group — for a paginator named by a heading
   * already on the page. Preferred over {@link ariaLabel} where one exists.
   */
  readonly ariaLabelledby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-labelledby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The page the user moved to — see {@link UiPageChange}.
   *
   * Emitted for a click on a button and for a page size the user picked, i.e. for
   * every change the *paginator* made. A `pageIndex` written from code is the
   * consumer's own state arriving, so it is not echoed back here; the `model`s above
   * are the way to observe that.
   */
  readonly pageChange = output<UiPageChange>();

  /**
   * The `MatPaginator` this component renders — the escape hatch for anything not
   * wrapped here (rule 4), e.g. `paginator.matPaginator().getNumberOfPages()`. Reach
   * it with `#pager="uiPaginator"`.
   */
  readonly matPaginator = viewChild.required(MatPaginator);

  /**
   * The page size actually in force: the one that was set, or the first offered.
   *
   * Material resolves an unset size the same way, but only *internally* — its
   * `pageSize` becomes a number that never reaches the binding it came from. It is
   * resolved up here instead, so that the size the paginator pages by, the size the
   * select shows and the size {@link pageSize} reports are one value.
   */
  protected readonly resolvedPageSize = computed(
    () => this.pageSize() ?? this.pageSizeOptions()[0] ?? FALLBACK_PAGE_SIZE,
  );

  constructor() {
    // Settle an unset `pageSize` on the size the paginator is actually paging by,
    // so that a consumer reading it — or bound with `[(pageSize)]` — gets the number
    // on screen rather than `undefined`. This cannot loop: it writes only when the
    // signal is unset, and what it writes is never `undefined`.
    effect(() => {
      if (this.pageSize() === undefined) {
        this.pageSize.set(this.resolvedPageSize());
      }
    });
  }

  /**
   * A page Material moved to, written back into the `model`s and re-emitted.
   *
   * Both signals are set before the output fires, so a consumer reading
   * `pageIndex()` from inside `(pageChange)` sees the page that was moved to rather
   * than the one before it. Material's page size change moves `pageIndex` too — to
   * keep the first visible item on screen — which is why both are written for either
   * event.
   */
  protected onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.pageChange.emit(event);
  }
}
