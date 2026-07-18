import { BreakpointObserver, Breakpoints, type BreakpointState } from '@angular/cdk/layout';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatGridList, MatGridTileFooterCssMatStyler } from '@angular/material/grid-list';
import { MatGridListHarness } from '@angular/material/grid-list/testing';
import { BehaviorSubject, type Observable } from 'rxjs';

import {
  GridList,
  GridListTileDef,
  type UiGridListResponsiveCols,
  type UiGridListRowHeight,
  type UiGridListTile,
} from './grid-list';

/**
 * A `BreakpointObserver` whose matched range the test drives directly, so the
 * responsive tests do not depend on a real `matchMedia` (jsdom ships none) or on
 * resizing a window that has no size.
 */
class FakeBreakpointObserver {
  private readonly state$ = new BehaviorSubject<BreakpointState>({
    matches: false,
    breakpoints: {},
  });

  observe(): Observable<BreakpointState> {
    return this.state$;
  }

  /** Make exactly one CDK breakpoint the matching one, as the real observer does. */
  activate(query: string): void {
    this.state$.next({ matches: true, breakpoints: { [query]: true } });
  }

  /** Match nothing — the state before the first report, or a size no range covers. */
  clear(): void {
    this.state$.next({ matches: false, breakpoints: {} });
  }
}

@Component({
  imports: [GridList],
  template: `
    <ui-grid-list
      [tiles]="tiles()"
      [cols]="cols()"
      [rowHeight]="rowHeight()"
      [gutterSize]="gutterSize()"
      [responsive]="responsive()"
      [responsiveCols]="responsiveCols()"
      #ref="uiGridList"
    />
  `,
})
class TestHost {
  readonly tiles = signal<UiGridListTile<string>[]>([
    { value: 'One' },
    { value: 'Two' },
    { value: 'Three' },
  ]);
  readonly cols = signal(4);
  readonly rowHeight = signal<UiGridListRowHeight>('1:1');
  readonly gutterSize = signal('1px');
  readonly responsive = signal(false);
  readonly responsiveCols = signal<UiGridListResponsiveCols>({});
  readonly ref = viewChild.required<GridList<string>>('ref');
}

/** A host that renders each tile through the `uiGridListTile` slot. */
@Component({
  imports: [GridList, GridListTileDef],
  template: `
    <ui-grid-list [tiles]="tiles()" #ref="uiGridList">
      <ng-template uiGridListTile let-value let-tile="tile" let-index="index">
        <span class="cell">{{ index }}:{{ value }}:{{ tile.colspan ?? 1 }}</span>
      </ng-template>
    </ui-grid-list>
  `,
})
class SlotHost {
  readonly tiles = signal<UiGridListTile<string>[]>([
    { value: 'A', colspan: 2 },
    { value: 'B' },
  ]);
  readonly ref = viewChild.required<GridList<string>>('ref');
}

describe('GridList', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let loader: HarnessLoader;
  let breakpoints: FakeBreakpointObserver;

  const grid = (): GridList<string> => host.ref();
  const matGridList = (): MatGridList => grid().matGridList();
  const tileEls = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('mat-grid-tile'));

  // `MatGridListHarness` speaks Material's *public* test surface — `getTiles()`,
  // and each tile's `getColspan()` / `getRowspan()` — rather than reaching into
  // Material's tile-coordinator internals or its inline layout styles. What the
  // harness cannot see — the escape-hatch `matGridList()` instance and `_tiles`
  // content query, a tile's body text, the widths Material writes — stays below.
  const gridHarness = (): Promise<MatGridListHarness> => loader.getHarness(MatGridListHarness);

  beforeEach(async () => {
    breakpoints = new FakeBreakpointObserver();
    TestBed.configureTestingModule({
      providers: [{ provide: BreakpointObserver, useValue: breakpoints }],
    });

    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  describe('tiles are Material’s own, placed by Material', () => {
    it('renders one Material grid with a tile per item', async () => {
      expect(fixture.nativeElement.querySelectorAll('mat-grid-list')).toHaveLength(1);
      expect(await (await gridHarness()).getTiles()).toHaveLength(3);
    });

    // The tiles have to reach Material's own content query, or none are laid out.
    // Declaring them in this component's template (rather than projecting) is what
    // makes that query see them — see the `grid-list.html` comment.
    it('places the tiles in Material’s content query so they are laid out', () => {
      expect(matGridList()._tiles.length).toBe(3);
      // Material sets an inline width on every tile it places; an unplaced tile has none.
      expect(tileEls().every((el) => el.style.width !== '')).toBe(true);
    });

    it('reflects tiles added and removed after first render', async () => {
      host.tiles.update((tiles) => [...tiles, { value: 'Four' }]);
      await fixture.whenStable();
      expect(await (await gridHarness()).getTiles()).toHaveLength(4);

      host.tiles.set([{ value: 'Only' }]);
      await fixture.whenStable();
      expect(await (await gridHarness()).getTiles()).toHaveLength(1);
    });

    it('renders a tile’s value as text when there is no slot', () => {
      expect(tileEls().map((el) => el.textContent?.trim())).toEqual(['One', 'Two', 'Three']);
    });

    // colspan/rowspan are Material's own tile inputs; a tile that straddles must be
    // wider/taller in the layout Material computes.
    it('gives a tile the colspan and rowspan it declares', async () => {
      host.tiles.set([
        { value: 'Wide', colspan: 2 },
        { value: 'Tall', rowspan: 3 },
        { value: 'One' },
      ]);
      await fixture.whenStable();

      // The harness reports the span Material actually laid each tile out with —
      // the same claim the old `_tiles` internal read made, off Material's public
      // test surface rather than its content query.
      const tiles = await (await gridHarness()).getTiles();
      expect(await Promise.all(tiles.map((tile) => tile.getColspan()))).toEqual([2, 1, 1]);
      expect(await Promise.all(tiles.map((tile) => tile.getRowspan()))).toEqual([1, 3, 1]);

      // Material sizes a colspan-2 tile differently from a colspan-1 one at the same
      // cols — the widths it writes are not the same value.
      const [wide, , single] = tileEls();
      expect(wide.style.width).not.toBe('');
      expect(wide.style.width).not.toBe(single.style.width);
    });
  });

  describe('the tile slot', () => {
    it('renders each tile through uiGridListTile with value, tile and index', async () => {
      const slotFixture = TestBed.createComponent(SlotHost);
      await slotFixture.whenStable();

      const cells = Array.from(
        slotFixture.nativeElement.querySelectorAll('.cell'),
      ) as HTMLElement[];
      // index:value:colspan — proves all three context values reach the template.
      expect(cells.map((el) => el.textContent?.trim())).toEqual(['0:A:2', '1:B:1']);
    });

    // The slot renders *inside* Material's placed `<mat-grid-tile>`, so Material's
    // own `<mat-grid-tile-footer>` works within it — the caption bar the
    // `Tile header & footer` story shows over each tile.
    it('renders a footer projected through the slot inside the placed tile', async () => {
      @Component({
        imports: [GridList, GridListTileDef, MatGridTileFooterCssMatStyler],
        template: `
          <ui-grid-list [tiles]="tiles" [cols]="3">
            <ng-template uiGridListTile let-value>
              <mat-grid-tile-footer>{{ value }}</mat-grid-tile-footer>
            </ng-template>
          </ui-grid-list>
        `,
      })
      class FooterHost {
        readonly tiles: UiGridListTile<string>[] = [{ value: 'Sunrise' }, { value: 'Harbour' }];
      }

      const f = TestBed.createComponent(FooterHost);
      await f.whenStable();
      const footers = f.nativeElement.querySelectorAll('mat-grid-tile-footer');

      expect(footers).toHaveLength(2);
      expect(footers[0].closest('mat-grid-tile')).not.toBeNull();
      expect(footers[0].textContent).toContain('Sunrise');
    });
  });

  describe('cols / rowHeight / gutterSize forward to MatGridList', () => {
    it('hands the fixed cols straight to Material', async () => {
      host.cols.set(6);
      await fixture.whenStable();
      expect(matGridList().cols).toBe(6);
      expect(grid().activeCols()).toBe(6);
    });

    it('forwards rowHeight and gutterSize verbatim', async () => {
      host.rowHeight.set('4:3');
      host.gutterSize.set('16px');
      await fixture.whenStable();

      expect(matGridList().rowHeight).toBe('4:3');
      expect(matGridList().gutterSize).toBe('16px');
    });

    // `'fit'` is a distinct Material row-height mode — the rows share the list's own
    // height rather than sizing off the columns — so it is worth pinning on its own
    // alongside the ratio the story of the same name also shows.
    it('forwards the fit row-height mode to Material', async () => {
      host.rowHeight.set('fit');
      await fixture.whenStable();

      expect(matGridList().rowHeight).toBe('fit');
    });

    it('defaults to a 4-column square grid so it renders without configuration', () => {
      // `MatGridList` throws without a cols value; the wrapper's default is what
      // keeps a bare `<ui-grid-list>` from being that error.
      expect(grid().cols()).toBe(4);
      expect(grid().rowHeight()).toBe('1:1');
      expect(matGridList().cols).toBe(4);
    });
  });

  describe('responsive cols', () => {
    it('ignores the observer entirely while not responsive', async () => {
      host.cols.set(4);
      breakpoints.activate(Breakpoints.XSmall);
      await fixture.whenStable();

      // XSmall would be 1 column if it were consulted; a fixed grid stays at cols.
      expect(grid().activeCols()).toBe(4);
      expect(matGridList().cols).toBe(4);
    });

    it('drives cols from the matched breakpoint once responsive', async () => {
      host.cols.set(4);
      host.responsive.set(true);

      breakpoints.activate(Breakpoints.XSmall);
      await fixture.whenStable();
      expect(grid().activeCols()).toBe(1);
      expect(matGridList().cols).toBe(1);

      breakpoints.activate(Breakpoints.Medium);
      await fixture.whenStable();
      expect(grid().activeCols()).toBe(3);
      expect(matGridList().cols).toBe(3);

      breakpoints.activate(Breakpoints.XLarge);
      await fixture.whenStable();
      expect(grid().activeCols()).toBe(6);
      expect(matGridList().cols).toBe(6);
    });

    it('merges a partial responsiveCols over the defaults', async () => {
      host.responsive.set(true);
      host.responsiveCols.set({ medium: 5 });

      breakpoints.activate(Breakpoints.Medium);
      await fixture.whenStable();
      expect(grid().activeCols()).toBe(5); // overridden

      breakpoints.activate(Breakpoints.Small);
      await fixture.whenStable();
      expect(grid().activeCols()).toBe(2); // untouched default
    });

    it('falls back to cols when no breakpoint matches', async () => {
      host.cols.set(3);
      host.responsive.set(true);
      breakpoints.clear();
      await fixture.whenStable();

      expect(grid().activeCols()).toBe(3);
      expect(matGridList().cols).toBe(3);
    });
  });

  describe('escape hatch', () => {
    it('exposes the component via exportAs', () => {
      expect(grid()).toBeInstanceOf(GridList);
    });

    // Rule 4: the underlying Material instance is the escape hatch for anything
    // this wrapper does not surface.
    it('exposes the underlying MatGridList instance', () => {
      expect(matGridList()).toBeInstanceOf(MatGridList);
    });
  });
});
