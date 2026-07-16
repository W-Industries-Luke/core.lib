import { BreakpointObserver, Breakpoints, type BreakpointState } from '@angular/cdk/layout';
import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatGridList } from '@angular/material/grid-list';
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
  let breakpoints: FakeBreakpointObserver;

  const grid = (): GridList<string> => host.ref();
  const matGridList = (): MatGridList => grid().matGridList();
  const tileEls = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('mat-grid-tile'));

  beforeEach(async () => {
    breakpoints = new FakeBreakpointObserver();
    TestBed.configureTestingModule({
      providers: [{ provide: BreakpointObserver, useValue: breakpoints }],
    });

    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  describe('tiles are Material’s own, placed by Material', () => {
    it('renders one Material grid with a tile per item', () => {
      expect(fixture.nativeElement.querySelectorAll('mat-grid-list')).toHaveLength(1);
      expect(tileEls()).toHaveLength(3);
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
      expect(matGridList()._tiles.length).toBe(4);

      host.tiles.set([{ value: 'Only' }]);
      await fixture.whenStable();
      expect(matGridList()._tiles.length).toBe(1);
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

      const tiles = matGridList()._tiles.toArray();
      expect(tiles.map((tile) => tile.colspan)).toEqual([2, 1, 1]);
      expect(tiles.map((tile) => tile.rowspan)).toEqual([1, 3, 1]);

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
