import { NgTemplateOutlet } from '@angular/common';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  Directive,
  inject,
  input,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatGridList, MatGridTile } from '@angular/material/grid-list';

/**
 * A row's height, in the shapes Material's own `rowHeight` takes:
 *
 *   - a ratio, `'4:3'` — each row is that fraction of a column's width, so the
 *     grid keeps its proportions as it reflows. The default, `'1:1'`, is square.
 *   - a length, `'100px'` / `100` — every row is exactly that tall (a bare number
 *     is read as `px`, Material's own rule).
 *   - `'fit'` — the rows share the list's own height between them, so the grid
 *     fills a container of a fixed height rather than growing past it.
 *
 * Aliased from what `MatGridList.rowHeight` accepts rather than re-declared, so a
 * change upstream is a compile error here rather than a value this component
 * forwards and Material throws on.
 */
export type UiGridListRowHeight = string | number;

/**
 * One tile in a {@link GridList}.
 *
 * `value` is what the tile carries — deliberately not constrained to a string,
 * because a grid over photos, cards or products is the common case. Render it with
 * a {@link GridListTileDef} template; the string fallback is only for the simplest
 * grids.
 */
export interface UiGridListTile<T = unknown> {
  /**
   * The tile's data — handed to the {@link GridListTileDef} slot as its implicit
   * context, or shown as text when there is no slot.
   */
  value?: T;

  /**
   * How many columns the tile straddles. Defaults to `1`. Material flows the rest
   * of the tiles around a wider one, and clamps a span past the column count.
   */
  colspan?: number;

  /** How many rows the tile straddles. Defaults to `1`. */
  rowspan?: number;
}

/**
 * The context every {@link GridListTileDef} template is rendered with.
 */
export interface UiGridListTileContext<T = unknown> {
  /** The tile's `value` — `let-value`. */
  $implicit: T | undefined;

  /** The whole tile, including its span — `let-tile="tile"`. */
  tile: UiGridListTile<T>;

  /** Its position in `tiles` — `let-index="index"`. */
  index: number;
}

/**
 * How many columns the grid takes at each of the CDK's breakpoints, when the grid
 * is {@link GridList.responsive}. Every key is optional — an omitted one falls back
 * to {@link DEFAULT_RESPONSIVE_COLS}, so a consumer overrides only the widths they
 * care about.
 */
export interface UiGridListResponsiveCols {
  /** Phones in portrait — the `Breakpoints.XSmall` range. */
  xsmall?: number;
  /** Phones in landscape and small tablets — `Breakpoints.Small`. */
  small?: number;
  /** Tablets — `Breakpoints.Medium`. */
  medium?: number;
  /** Laptops — `Breakpoints.Large`. */
  large?: number;
  /** Desktops and up — `Breakpoints.XLarge`. */
  xlarge?: number;
}

/**
 * The column count this library reaches for at each breakpoint when nothing is
 * said. It climbs roughly every step up the ladder — one column on a phone, six
 * on a wide desktop — which is the shape a card grid usually wants.
 */
export const DEFAULT_RESPONSIVE_COLS: Required<UiGridListResponsiveCols> = {
  xsmall: 1,
  small: 2,
  medium: 3,
  large: 4,
  xlarge: 6,
};

/**
 * The CDK breakpoint queries, smallest range first, paired with the
 * {@link UiGridListResponsiveCols} key each drives. The CDK's five `Breakpoints`
 * are mutually exclusive ranges, so exactly one matches the current viewport.
 */
const BREAKPOINTS: readonly [string, keyof Required<UiGridListResponsiveCols>][] = [
  [Breakpoints.XSmall, 'xsmall'],
  [Breakpoints.Small, 'small'],
  [Breakpoints.Medium, 'medium'],
  [Breakpoints.Large, 'large'],
  [Breakpoints.XLarge, 'xlarge'],
];

/**
 * Types `let-value`, `let-tile` and `let-index` on the tile template, rather than
 * leaving them `any`. @docs-private
 *
 * The signature is Angular's, and the compiler is its only caller — the parameters
 * exist to be named in the type predicate and nowhere else, which is exactly what
 * `no-unused-vars` reports. `ListItemAvatarDef` in `../list/list.ts` carries the
 * same guard for the same reason.
 */
function tileContextGuard<T>(
  directive: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: unknown,
): context is UiGridListTileContext<T> {
  return true;
}

/**
 * Renders each tile's content (rule 7) — a photo, a card, a stat, whatever a tile
 * holds — handed the tile's `value`, the tile itself and its index.
 *
 * ```html
 * <ui-grid-list [tiles]="photos()">
 *   <ng-template uiGridListTile let-photo>
 *     <img [src]="photo.src" [alt]="photo.alt" />
 *     <mat-grid-tile-footer>{{ photo.caption }}</mat-grid-tile-footer>
 *   </ng-template>
 * </ui-grid-list>
 * ```
 *
 * It renders *inside* Material's own `<mat-grid-tile>`, so the placement, the span
 * and the `<mat-grid-tile-header>` / `<mat-grid-tile-footer>` slots a consumer puts
 * in the template are Material's. Without it, a tile shows its `value` as text.
 */
@Directive({ selector: 'ng-template[uiGridListTile]' })
export class GridListTileDef<T = unknown> {
  /** The template itself, rendered by `grid-list.html`. @docs-private */
  readonly template = inject<TemplateRef<UiGridListTileContext<T>>>(TemplateRef);

  /** @docs-private */
  static readonly ngTemplateContextGuard = tileContextGuard;
}

/**
 * A themed Material grid list: the {@link UiGridListTile}s given to it, laid out
 * over a fixed or a viewport-driven number of columns.
 *
 * ```html
 * <ui-grid-list [tiles]="tiles()" cols="4" rowHeight="120px" gutterSize="12px">
 *   <ng-template uiGridListTile let-value>{{ value.title }}</ng-template>
 * </ui-grid-list>
 *
 * <ui-grid-list [tiles]="photos()" responsive rowHeight="4:3">
 *   <ng-template uiGridListTile let-photo>
 *     <img [src]="photo.src" [alt]="photo.alt" />
 *   </ng-template>
 * </ui-grid-list>
 * ```
 *
 * Like `ui-list` and unlike `uiButton`, this is a **component** rather than a
 * directive: a grid owns *composition* — a container, a `<mat-grid-tile>` per tile,
 * and the content inside each. There is no single native element to decorate.
 *
 * ### It is Material, not a re-implementation
 *
 * The tile placement, the row/column arithmetic that turns `cols`, `rowHeight` and
 * `gutterSize` into positions, the `colspan`/`rowspan` a tile straddles and the
 * header/footer type scale are all `<mat-grid-list>`'s and `<mat-grid-tile>`'s own,
 * resolved from the `--mat-sys-*` tokens `src/styles/_theme.scss` emits — so there
 * is not a literal in `grid-list.scss`, and a type or density change there follows
 * here.
 *
 * ### Why the tiles are data, not projected content
 *
 * The tiles are a {@link tiles} input rendered as Material's own `<mat-grid-tile>`
 * in this component's template, with a {@link GridListTileDef} slot for each tile's
 * content — the same shape `ui-list` takes, and for the same reason. `MatGridList`
 * finds its tiles with a content query, which does not see through a wrapper's
 * `<ng-content>`: tiles projected into `<ui-grid-list>` would land in Material's
 * grid but never be counted, so none would be placed. Declaring them here is what
 * keeps the layout Material's.
 *
 * ### Responsive columns
 *
 * {@link cols} is the fixed count. Set {@link responsive} and it is instead driven
 * by the CDK's `BreakpointObserver`: {@link responsiveCols} maps each breakpoint to
 * a column count, defaulting to {@link DEFAULT_RESPONSIVE_COLS}, and
 * {@link activeCols} is the one in force. A grid that is not `responsive` never lets
 * the observer decide its width.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiGridList'` hands back the component, {@link matGridList} hands back
 * Material's own instance, and {@link activeCols} reads out the column count in
 * force — so anything this component does not wrap needs no API here (rule 4).
 */
@Component({
  selector: 'ui-grid-list',
  exportAs: 'uiGridList',
  imports: [MatGridList, MatGridTile, NgTemplateOutlet],
  templateUrl: './grid-list.html',
  styleUrl: './grid-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridList<T = unknown> {
  private readonly breakpointObserver = inject(BreakpointObserver);

  /**
   * The tiles, in the order they are placed. Each carries its `value` and,
   * optionally, the `colspan`/`rowspan` it straddles.
   */
  readonly tiles = input<readonly UiGridListTile<T>[]>([]);

  /**
   * The number of columns, when the grid is not {@link responsive}. Material
   * requires one — a grid with no column count has no width to divide — so this
   * defaults to `4` rather than leaving Material to throw.
   */
  readonly cols = input(4);

  /** How tall each row is. Defaults to Material's square `'1:1'` ratio. */
  readonly rowHeight = input<UiGridListRowHeight>('1:1');

  /**
   * The gap between tiles, as a CSS length. Defaults to Material's own `'1px'` —
   * point it at `--ui-sys-spacing-*` for a gap that matches the rest of the fleet,
   * e.g. `gutterSize="var(--ui-sys-spacing-sm)"`.
   */
  readonly gutterSize = input<string>('1px');

  /**
   * Whether {@link cols} is ignored in favour of a count driven by the viewport,
   * through the CDK's `BreakpointObserver` and {@link responsiveCols}.
   *
   * Off by default: a grid has a fixed column count until someone says it reflows.
   */
  readonly responsive = input(false, { transform: booleanAttribute });

  /**
   * The column count at each breakpoint, for a {@link responsive} grid. Merged over
   * {@link DEFAULT_RESPONSIVE_COLS}, so a partial map overrides only the widths it
   * names and the rest keep their defaults.
   */
  readonly responsiveCols = input<UiGridListResponsiveCols>(DEFAULT_RESPONSIVE_COLS);

  /**
   * The `MatGridList` this component renders — the escape hatch for Material's own
   * API (rule 4). Reach it with `#grid="uiGridList"` and `grid.matGridList()`.
   */
  readonly matGridList = viewChild.required(MatGridList);

  /** The tile-content slot, or `undefined` when tiles render their `value` as text. */
  protected readonly tileDef = contentChild(GridListTileDef<T>);

  /**
   * The current breakpoint state, or `undefined` before the observer has reported.
   * It is read only through {@link activeCols}, which ignores it for a fixed grid.
   */
  private readonly breakpointState = toSignal(
    this.breakpointObserver.observe(BREAKPOINTS.map(([query]) => query)),
  );

  /**
   * The column count actually in force: {@link cols} for a fixed grid, or the
   * {@link responsiveCols} entry for the matched breakpoint for a responsive one.
   *
   * Falls back to {@link cols} when no breakpoint matches — before the observer's
   * first report, or in an environment with no `matchMedia` — so a responsive grid
   * still renders a sensible number of columns rather than none.
   */
  readonly activeCols = computed<number>(() => {
    if (!this.responsive()) {
      return this.cols();
    }

    const state = this.breakpointState();
    const cols = { ...DEFAULT_RESPONSIVE_COLS, ...this.responsiveCols() };
    const matched = BREAKPOINTS.find(([query]) => state?.breakpoints[query]);

    return matched ? cols[matched[1]] : this.cols();
  });

  /** The context handed to the tile slot for one tile. @docs-private */
  protected contextFor(tile: UiGridListTile<T>, index: number): UiGridListTileContext<T> {
    return { $implicit: tile.value, tile, index };
  }
}
