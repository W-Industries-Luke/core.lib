import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { MatTableHarness } from '@angular/material/table/testing';

import {
  Table,
  TableCellDef,
  TableEmptyDef,
  TableHeaderDef,
  type UiTableColumn,
  type UiTableSort,
} from './table';

interface Order {
  id: string;
  customer: string;
  quantity: number;
  placed: Date;
}

const ORDERS: Order[] = [
  { id: '4213', customer: 'Sam', quantity: 3, placed: new Date('2024-03-02') },
  { id: '4214', customer: 'alex', quantity: 10, placed: new Date('2024-01-15') },
  { id: '4215', customer: 'Rae', quantity: 2, placed: new Date('2024-05-20') },
];

const COLUMNS: UiTableColumn<Order>[] = [
  { key: 'id', header: 'Order' },
  { key: 'customer', header: 'Customer', sortable: true },
  { key: 'quantity', header: 'Quantity', sortable: true, width: '8rem' },
];

@Component({
  imports: [Table],
  template: `
    <ui-table
      #ref="uiTable"
      [columns]="columns()"
      [data]="data()"
      [(sort)]="sort"
      [loading]="loading()"
      [emptyMessage]="emptyMessage()"
      aria-label="Orders"
    />
  `,
})
class TestHost {
  readonly columns = signal<UiTableColumn<Order>[]>(COLUMNS);
  readonly data = signal<Order[]>(ORDERS);
  readonly sort = signal<UiTableSort | null>(null);
  readonly loading = signal(false);
  readonly emptyMessage = signal('No orders match your filters');
  readonly ref = viewChild.required<Table<Order>>('ref');
}

/**
 * Material's own switch for the sort arrow's animation. Without it the arrow's
 * transitions run on timers that no assertion here is waiting for. This is
 * Material's public token rather than `provideNoopAnimations()`, which is the
 * same thing plus an animations module.
 */
const noAnimations = { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } };

describe('Table', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let loader: HarnessLoader;

  const queryAll = (selector: string): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll(selector));

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  /** The header cells Material renders, in order. */
  const headers = (): HTMLElement[] => queryAll('th.mat-mdc-header-cell');

  // The `MatTableHarness` speaks Material's *public* test surface —
  // `getHeaderRows()`, `getRows()`, `getCellTextByIndex()` — instead of the MDC
  // class names (`th.mat-mdc-header-cell`, `tr.mat-mdc-row`) the old spec read the
  // cells' text off. Reading the rows through it also gets the no-data row exclusion
  // for free: the harness's `getRows()` is the data rows only, so the spinner and
  // the empty state no longer read as a row of data the way the raw `tr.mat-mdc-row`
  // query used to risk. Everything the harness *cannot* see — a header's `style.width`
  // and `aria-sort`, the sort control's arrow and `role="button"`, this component's
  // spinner/empty-state, its theme hooks and escape hatches — stays a DOM assertion.
  const table = (): Promise<MatTableHarness> => loader.getHarness(MatTableHarness);

  /** The header text of each column, read through the table harness. */
  const headerText = async (): Promise<string[]> => {
    const [header] = await (await table()).getHeaderRows();
    return header.getCellTextByIndex();
  };

  /** The body rows, each as its cells' text — the data rows only. */
  const rows = async (): Promise<string[][]> => (await table()).getCellTextByIndex();

  /** One column's cells, top to bottom — the reading a sort assertion wants. */
  const column = async (index: number): Promise<string[]> =>
    (await rows()).map((cells) => cells[index]);

  const clickHeader = async (index: number) => {
    headers()[index].click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [noAnimations] });
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  it('renders Material’s table rather than markup of its own', () => {
    expect(query('table')!.classList).toContain('mat-mdc-table');
    expect(host.ref().matTable()).toBeInstanceOf(MatTable);
    expect(host.ref().matSort()).toBeInstanceOf(MatSort);
  });

  describe('columns', () => {
    it('renders one header per column, in order', async () => {
      expect(await headerText()).toEqual(['Order', 'Customer', 'Quantity']);
    });

    it('renders a cell per column per row, reading each column’s key off the row', async () => {
      expect(await rows()).toEqual([
        ['4213', 'Sam', '3'],
        ['4214', 'alex', '10'],
        ['4215', 'Rae', '2'],
      ]);
    });

    it('puts a column’s width on its header', () => {
      expect(headers()[2].style.width).toBe('8rem');
      expect(headers()[0].style.width).toBe('');
    });

    it('reads a column’s value accessor instead of the key when it has one', async () => {
      host.columns.set([
        { key: 'id', header: 'Order' },
        // A column whose datum is not a field of the row at all.
        { key: 'summary', header: 'Summary', value: (order) => `${order.customer} × ${order.quantity}` },
      ]);
      await fixture.whenStable();

      expect(await rows()).toEqual([
        ['4213', 'Sam × 3'],
        ['4214', 'alex × 10'],
        ['4215', 'Rae × 2'],
      ]);
    });

    it('renders nothing in a cell whose key is not on the row', async () => {
      host.columns.set([{ key: 'missing', header: 'Missing' }]);
      await fixture.whenStable();

      expect(await rows()).toEqual([[''], [''], ['']]);
    });

    it('picks up a column added after the first render', async () => {
      host.columns.set([...COLUMNS, { key: 'placed', header: 'Placed' }]);
      await fixture.whenStable();

      expect(await headerText()).toEqual(['Order', 'Customer', 'Quantity', 'Placed']);
    });

    it('drops a column that is removed', async () => {
      host.columns.set(COLUMNS.slice(0, 2));
      await fixture.whenStable();

      expect(await headerText()).toEqual(['Order', 'Customer']);
      expect(await rows()).toEqual([
        ['4213', 'Sam'],
        ['4214', 'alex'],
        ['4215', 'Rae'],
      ]);
    });
  });

  describe('data', () => {
    it('re-renders when the rows change', async () => {
      host.data.set([{ id: '9', customer: 'Jo', quantity: 1, placed: new Date('2024-06-01') }]);
      await fixture.whenStable();

      expect(await rows()).toEqual([['9', 'Jo', '1']]);
    });

    it('renders the rows in the data’s own order until it is sorted', async () => {
      expect(await column(0)).toEqual(['4213', '4214', '4215']);
    });

    it('leaves the consumer’s array alone when it sorts', async () => {
      const data = [...ORDERS];
      host.data.set(data);
      host.sort.set({ active: 'quantity', direction: 'asc' });
      await fixture.whenStable();

      expect(data).toEqual(ORDERS);
    });
  });

  describe('sorting', () => {
    it('gives a sortable column Material’s sort control', () => {
      const customer = headers()[1];

      expect(customer.classList).toContain('mat-sort-header');
      expect(customer.querySelector('[role="button"]')).not.toBeNull();
      expect(customer.querySelector('.mat-sort-header-arrow')).not.toBeNull();
    });

    // A non-sortable header is a heading, not a control: no arrow, no role, and
    // nothing for the keyboard to land on.
    it('leaves a column that is not sortable inert', () => {
      const id = headers()[0];

      expect(id.classList).toContain('mat-sort-header-disabled');
      expect(id.querySelector('[role="button"]')).toBeNull();
      expect(id.querySelector('.mat-sort-header-arrow')).toBeNull();
    });

    it('sorts strings by a click on the header, and writes the sort back', async () => {
      await clickHeader(1);

      expect(host.sort()).toEqual({ active: 'customer', direction: 'asc' });
      expect(await column(1)).toEqual(['Rae', 'Sam', 'alex']);
    });

    it('reverses on a second click', async () => {
      await clickHeader(1);
      await clickHeader(1);

      expect(host.sort()).toEqual({ active: 'customer', direction: 'desc' });
      expect(await column(1)).toEqual(['alex', 'Sam', 'Rae']);
    });

    // Pinned rather than fixed: Material compares strings with `>`, i.e. by code
    // point, so every capital sorts before every lowercase. That is what every
    // other Material table in the fleet does, and re-deriving the comparator to
    // change it here would make `ui-table` the odd one out. A column that wants
    // case-insensitive ordering says so with `value`, which is the documented way
    // out — see the story of the same name.
    it('sorts strings case-sensitively, as Material does', async () => {
      await clickHeader(1);

      expect(await column(1)).toEqual(['Rae', 'Sam', 'alex']);
    });

    it('takes a case-insensitive order from a column’s value accessor', async () => {
      host.columns.set([
        { key: 'id', header: 'Order' },
        {
          key: 'customer',
          header: 'Customer',
          sortable: true,
          value: (order) => order.customer.toLowerCase(),
        },
      ]);
      host.sort.set({ active: 'customer', direction: 'asc' });
      await fixture.whenStable();

      expect(await column(0)).toEqual(['4214', '4215', '4213']);
    });

    // Material's third click clears the sort, which has to put the rows back in
    // the order the data arrived in rather than leaving them where they were.
    it('returns to the data’s own order on a third click', async () => {
      await clickHeader(1);
      await clickHeader(1);
      await clickHeader(1);

      expect(host.sort()).toEqual({ active: 'customer', direction: '' });
      expect(await column(0)).toEqual(['4213', '4214', '4215']);
    });

    // Material's comparator, which is the reason this component borrows it rather
    // than comparing values itself: 10 sorts after 3, not before it.
    it('sorts numbers numerically rather than lexically', async () => {
      await clickHeader(2);

      expect(await column(2)).toEqual(['2', '3', '10']);
    });

    it('sorts on a column’s value accessor when it has one', async () => {
      host.columns.set([
        { key: 'id', header: 'Order' },
        { key: 'placed', header: 'Placed', sortable: true, value: (order) => order.placed },
      ]);
      host.sort.set({ active: 'placed', direction: 'asc' });
      await fixture.whenStable();

      expect(await column(0)).toEqual(['4214', '4213', '4215']);
    });

    // The half of rule 5 a data source cannot do: Material's own
    // `MatTableDataSource` only re-orders when `MatSort` *emits*, which it does
    // not for a sort set from code. The rows are derived from the signal instead,
    // so this works.
    it('re-orders when the sort is set from code', async () => {
      host.sort.set({ active: 'quantity', direction: 'desc' });
      await fixture.whenStable();

      expect(await column(2)).toEqual(['10', '3', '2']);
    });

    it('shows a sort set from code on the header', async () => {
      host.sort.set({ active: 'customer', direction: 'asc' });
      await fixture.whenStable();

      expect(headers()[1].getAttribute('aria-sort')).toBe('ascending');
      expect(host.ref().matSort().active).toBe('customer');
    });

    it('re-sorts when the data changes under a sort', async () => {
      host.sort.set({ active: 'quantity', direction: 'asc' });
      await fixture.whenStable();

      host.data.set([...ORDERS, { id: '9', customer: 'Jo', quantity: 1, placed: new Date() }]);
      await fixture.whenStable();

      expect(await column(2)).toEqual(['1', '2', '3', '10']);
    });

    // A column with no arrow cannot be un-sorted by the user, so it must never be
    // the thing the rows are ordered by.
    it('ignores a sort naming a column that is not sortable', async () => {
      host.sort.set({ active: 'id', direction: 'desc' });
      await fixture.whenStable();

      expect(await column(0)).toEqual(['4213', '4214', '4215']);
    });

    it('ignores a sort naming a column that does not exist', async () => {
      host.sort.set({ active: 'nope', direction: 'asc' });
      await fixture.whenStable();

      expect(await column(0)).toEqual(['4213', '4214', '4215']);
    });

    it('re-sorts when a column becomes sortable', async () => {
      host.sort.set({ active: 'id', direction: 'desc' });
      await fixture.whenStable();
      expect(await column(0)).toEqual(['4213', '4214', '4215']);

      host.columns.set([{ key: 'id', header: 'Order', sortable: true }]);
      await fixture.whenStable();

      expect(await column(0)).toEqual(['4215', '4214', '4213']);
    });

    it('emits sortChange for a click but not for a one-way write', async () => {
      const emitted: (UiTableSort | null)[] = [];

      @Component({
        imports: [Table],
        template: `
          <ui-table [columns]="columns" [data]="data" [sort]="sort()" (sortChange)="changed($event)" />
        `,
      })
      class OneWayHost {
        readonly columns = COLUMNS;
        readonly data = ORDERS;
        readonly sort = signal<UiTableSort | null>(null);
        changed(sort: UiTableSort | null) {
          emitted.push(sort);
        }
      }

      const f = TestBed.createComponent(OneWayHost);
      await f.whenStable();
      // A one-way write is the consumer's own state arriving; echoing it back
      // would be a loop, so nothing is emitted for it.
      f.componentInstance.sort.set({ active: 'customer', direction: 'asc' });
      await f.whenStable();
      expect(emitted).toEqual([]);

      (f.nativeElement.querySelectorAll('th.mat-mdc-header-cell')[2] as HTMLElement).click();
      await f.whenStable();

      expect(emitted).toEqual([{ active: 'quantity', direction: 'asc' }]);
    });
  });

  describe('loading', () => {
    beforeEach(async () => {
      host.loading.set(true);
      await fixture.whenStable();
    });

    it('shows a spinner instead of the rows', async () => {
      expect(query('ui-spinner')).not.toBeNull();
      // The harness's `getRows()` is the data rows only, so the spinner's no-data row
      // does not read as one here.
      expect(await rows()).toEqual([]);
    });

    it('keeps the headers, so the table does not collapse', async () => {
      expect(await headerText()).toEqual(['Order', 'Customer', 'Quantity']);
    });

    it('spans the spinner across every column', () => {
      expect(query('.ui-table__message-cell')!.getAttribute('colspan')).toBe('3');
    });

    // Saying "no orders" while the orders are still in flight is a lie.
    it('wins over the empty state', () => {
      expect(query('ui-empty-state')).toBeNull();
    });

    it('names the spinner from loadingLabel', async () => {
      @Component({
        imports: [Table],
        template: `<ui-table [columns]="columns" loading loadingLabel="Loading orders" />`,
      })
      class LabelHost {
        readonly columns = COLUMNS;
      }

      const f = TestBed.createComponent(LabelHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('ui-spinner').getAttribute('aria-label')).toBe(
        'Loading orders',
      );
    });

    it('shows the rows again when it finishes', async () => {
      host.loading.set(false);
      await fixture.whenStable();

      expect(query('ui-spinner')).toBeNull();
      expect(await rows()).toHaveLength(3);
    });

    // `booleanAttribute`: the bare attribute is what a template naturally writes.
    it('reads the bare loading attribute', async () => {
      @Component({
        imports: [Table],
        template: `<ui-table #ref="uiTable" [columns]="columns" [data]="data" loading />`,
      })
      class AttrHost {
        readonly columns = COLUMNS;
        readonly data = ORDERS;
        readonly ref = viewChild.required<Table<Order>>('ref');
      }

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();

      expect(f.componentInstance.ref().loading()).toBe(true);
      expect(f.nativeElement.querySelector('ui-spinner')).not.toBeNull();
    });
  });

  describe('empty', () => {
    beforeEach(async () => {
      host.data.set([]);
      await fixture.whenStable();
    });

    it('shows an empty state carrying the message', () => {
      expect(query('ui-empty-state')).not.toBeNull();
      expect(query('ui-empty-state')!.textContent).toContain('No orders match your filters');
    });

    it('keeps the headers, so the table does not collapse', async () => {
      expect(await headerText()).toEqual(['Order', 'Customer', 'Quantity']);
      expect(await rows()).toEqual([]);
    });

    it('falls back to a default message', async () => {
      @Component({
        imports: [Table],
        template: `<ui-table [columns]="columns" />`,
      })
      class DefaultHost {
        readonly columns = COLUMNS;
      }

      const f = TestBed.createComponent(DefaultHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('ui-empty-state').textContent).toContain(
        'Nothing to show',
      );
    });

    it('goes away when rows arrive', async () => {
      host.data.set(ORDERS);
      await fixture.whenStable();

      expect(query('ui-empty-state')).toBeNull();
      expect(await rows()).toHaveLength(3);
    });

    // Rule 7: an empty state that needs a way out of it is not a string.
    it('renders a projected uiTableEmpty instead of the message', async () => {
      @Component({
        imports: [Table, TableEmptyDef],
        template: `
          <ui-table [columns]="columns" [data]="[]" emptyMessage="ignored">
            <ng-template uiTableEmpty>
              <p class="custom-empty">Nothing here yet</p>
            </ng-template>
          </ui-table>
        `,
      })
      class EmptyHost {
        readonly columns = COLUMNS;
      }

      const f = TestBed.createComponent(EmptyHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('.custom-empty')).not.toBeNull();
      expect(f.nativeElement.querySelector('ui-empty-state')).toBeNull();
      expect(f.nativeElement.textContent).not.toContain('ignored');
    });
  });

  describe('cell templates', () => {
    @Component({
      imports: [Table, TableCellDef],
      template: `
        <ui-table [columns]="columns" [data]="data" [sort]="sort()">
          <ng-template uiTableCell="customer" let-row let-index="index" let-column="column">
            <span class="custom-cell">{{ index }}:{{ column.key }}:{{ row.customer }}</span>
          </ng-template>
        </ui-table>
      `,
    })
    class CellHost {
      readonly columns = COLUMNS;
      readonly data = ORDERS;
      readonly sort = signal<UiTableSort | null>(null);
    }

    let f: ComponentFixture<CellHost>;

    beforeEach(async () => {
      f = TestBed.createComponent(CellHost);
      await f.whenStable();
    });

    it('renders the template inside Material’s cell, in place of the value', () => {
      const cell = f.nativeElement.querySelector('.custom-cell');

      expect(cell.textContent).toBe('0:customer:Sam');
      expect(cell.closest('td')!.classList).toContain('mat-mdc-cell');
    });

    it('leaves every other column on the default rendering', () => {
      const first = f.nativeElement.querySelectorAll('tr.mat-mdc-row')[0];

      expect(first.querySelectorAll('td')[0].textContent.trim()).toBe('4213');
      expect(first.querySelectorAll('td')[2].textContent.trim()).toBe('3');
    });

    it('gives the index of the rendered order, not the data’s', async () => {
      f.componentInstance.sort.set({ active: 'customer', direction: 'asc' });
      await f.whenStable();

      const cells = Array.from<HTMLElement>(
        f.nativeElement.querySelectorAll('.custom-cell'),
      ).map((cell) => cell.textContent);

      expect(cells).toEqual(['0:customer:Rae', '1:customer:Sam', '2:customer:alex']);
    });

    // `uiTableCellData` is a type hint and nothing else: it types `let-row` and
    // must not change what renders.
    it('renders the same cells with the uiTableCellData type hint bound', async () => {
      @Component({
        imports: [Table, TableCellDef],
        template: `
          <ui-table [columns]="columns" [data]="data">
            <ng-template uiTableCell="customer" [uiTableCellData]="data" let-row>
              <span class="typed-cell">{{ row.customer.toUpperCase() }}</span>
            </ng-template>
          </ui-table>
        `,
      })
      class TypedHost {
        readonly columns = COLUMNS;
        readonly data = ORDERS;
      }

      const typedFixture = TestBed.createComponent(TypedHost);
      await typedFixture.whenStable();
      const cells = Array.from<HTMLElement>(
        typedFixture.nativeElement.querySelectorAll('.typed-cell'),
      ).map((cell) => cell.textContent);

      expect(cells).toEqual(['SAM', 'ALEX', 'RAE']);
    });

    // The template renders the datum; the comparator still reads the column. A
    // date that renders as "2 March" has to keep sorting chronologically.
    it('sorts on the column’s value rather than on what the template prints', async () => {
      @Component({
        imports: [Table, TableCellDef],
        template: `
          <ui-table [columns]="columns" [data]="data" [sort]="{ active: 'placed', direction: 'asc' }">
            <ng-template uiTableCell="placed" [uiTableCellData]="data" let-row>
              <span class="date">{{ row.placed.getFullYear() }}</span>
            </ng-template>
          </ui-table>
        `,
      })
      class DateHost {
        readonly columns: UiTableColumn<Order>[] = [
          { key: 'id', header: 'Order' },
          { key: 'placed', header: 'Placed', sortable: true },
        ];
        readonly data = ORDERS;
      }

      const dateFixture = TestBed.createComponent(DateHost);
      await dateFixture.whenStable();
      const ids = Array.from<HTMLElement>(
        dateFixture.nativeElement.querySelectorAll('tr.mat-mdc-row td:first-child'),
      ).map((td) => td.textContent?.trim());

      expect(ids).toEqual(['4214', '4213', '4215']);
    });
  });

  describe('header templates', () => {
    @Component({
      imports: [Table, TableHeaderDef],
      template: `
        <ui-table [columns]="columns" [data]="data">
          <ng-template uiTableHeader="customer" let-column>
            <span class="custom-header">{{ column.header }} ★</span>
          </ng-template>
        </ui-table>
      `,
    })
    class HeaderHost {
      readonly columns = COLUMNS;
      readonly data = ORDERS;
    }

    let f: ComponentFixture<HeaderHost>;

    beforeEach(async () => {
      f = TestBed.createComponent(HeaderHost);
      await f.whenStable();
    });

    it('renders the template in place of the header string', () => {
      const custom = f.nativeElement.querySelector('.custom-header');

      expect(custom.textContent).toBe('Customer ★');
      expect(custom.closest('th')!.classList).toContain('mat-mdc-header-cell');
    });

    // The heading is inside Material's sort control, so the column is still one
    // the user can order by.
    it('keeps the column sortable', () => {
      const th = f.nativeElement.querySelector('.custom-header').closest('th')!;

      expect(th.querySelector('[role="button"]')).not.toBeNull();
    });

    it('leaves every other column on its header string', () => {
      const ths = f.nativeElement.querySelectorAll('th.mat-mdc-header-cell');

      expect(ths[0].textContent.trim()).toBe('Order');
    });
  });

  describe('accessibility', () => {
    it('names Material’s table from aria-label', () => {
      expect(query('table')!.getAttribute('aria-label')).toBe('Orders');
    });

    it('names it from aria-labelledby instead when given one', async () => {
      @Component({
        imports: [Table],
        template: `
          <h2 id="heading">Orders</h2>
          <ui-table [columns]="columns" [data]="data" aria-labelledby="heading" />
        `,
      })
      class LabelledbyHost {
        readonly columns = COLUMNS;
        readonly data = ORDERS;
      }

      const f = TestBed.createComponent(LabelledbyHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('table').getAttribute('aria-labelledby')).toBe(
        'heading',
      );
    });

    it('leaves no empty aria-label behind when unnamed', async () => {
      @Component({
        imports: [Table],
        template: `<ui-table [columns]="columns" [data]="data" />`,
      })
      class UnnamedHost {
        readonly columns = COLUMNS;
        readonly data = ORDERS;
      }

      const f = TestBed.createComponent(UnnamedHost);
      await f.whenStable();
      const table = f.nativeElement.querySelector('table');

      expect(table.hasAttribute('aria-label')).toBe(false);
      expect(table.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('reports the sorted column through aria-sort, and only that one', async () => {
      await clickHeader(1);

      expect(headers()[1].getAttribute('aria-sort')).toBe('ascending');
      expect(headers()[2].getAttribute('aria-sort')).toBe('none');

      await clickHeader(1);

      expect(headers()[1].getAttribute('aria-sort')).toBe('descending');
    });

    it('keeps Material’s real table structure', () => {
      expect(query('table')!.tagName).toBe('TABLE');
      expect(queryAll('thead').length).toBe(1);
      expect(headers().every((th) => th.tagName === 'TH')).toBe(true);
    });
  });

  describe('escape hatches', () => {
    it('exposes the component instance via exportAs', () => {
      expect(host.ref()).toBeInstanceOf(Table);
    });

    // Rule 4: Material's own instances are the way out of anything not wrapped.
    it('exposes the underlying MatTable and MatSort instances', () => {
      expect(host.ref().matTable()).toBeInstanceOf(MatTable);
      expect(host.ref().matSort()).toBeInstanceOf(MatSort);
    });

    it('forwards trackBy to Material, keeping a row’s DOM across a data swap', async () => {
      @Component({
        imports: [Table],
        template: `<ui-table [columns]="columns" [data]="data()" [trackBy]="trackById" />`,
      })
      class TrackHost {
        readonly columns = COLUMNS;
        readonly data = signal<Order[]>(ORDERS);
        readonly trackById = (_index: number, order: Order) => order.id;
      }

      const f = TestBed.createComponent(TrackHost);
      await f.whenStable();
      const before = f.nativeElement.querySelector('tr.mat-mdc-row');

      // Structurally identical rows, but every object is new: without trackBy
      // Material would tear down and rebuild every row.
      f.componentInstance.data.set(ORDERS.map((order) => ({ ...order })));
      await f.whenStable();

      expect(f.nativeElement.querySelector('tr.mat-mdc-row')).toBe(before);
    });
  });

  // The colours are Material's, resolved from the shared theme's tokens. This
  // component only re-points those tokens at hooks whose defaults are the tokens
  // Material would have used anyway.
  describe('theming', () => {
    // These read the *declaration* rather than a painted colour, on purpose:
    // `ng test` runs in jsdom, which does not substitute `var()` at all. What the
    // table resolves to under the real theme is asserted by the Storybook
    // stories, which run in Chromium.
    const declaration = (token: string) =>
      getComputedStyle(query('ui-table')!).getPropertyValue(token);

    it('resolves the surface and text from the theme, not a literal', () => {
      expect(declaration('--mat-table-background-color')).toContain('var(--ui-table-background');
      expect(declaration('--mat-table-background-color')).toContain('var(--mat-sys-surface)');
      expect(declaration('--mat-table-header-headline-color')).toContain(
        'var(--mat-sys-on-surface)',
      );
      expect(declaration('--mat-table-row-item-label-text-color')).toContain(
        'var(--ui-table-text-color',
      );
    });

    it('resolves the row divider from the theme, not a literal', () => {
      expect(declaration('--mat-table-row-item-outline-color')).toContain(
        'var(--ui-table-divider-color',
      );
      expect(declaration('--mat-table-row-item-outline-color')).not.toMatch(
        /#[0-9a-f]{3,8}\b|\brgba?\(/i,
      );
    });

    it('resolves the sort arrow from the theme, not a literal', () => {
      expect(declaration('--mat-sort-arrow-color')).toContain('var(--ui-table-sort-arrow-color');
      expect(declaration('--mat-sort-arrow-color')).toContain('var(--mat-sys-on-surface)');
    });

    // Density is the theme's decision, not this component's: a height hook here
    // would be a second way to set it, and a way for two apps to disagree.
    it('leaves the row height to the theme’s density token', () => {
      expect(declaration('--mat-table-row-item-container-height')).toBe('');
    });

    // The overrides are emitted on the host, which is what keeps a consumer off
    // `::ng-deep`: `--ui-table-divider-color` set by an ordinary rule on
    // `ui-table` — or inherited from any ancestor — reaches the elements inside
    // Material's template by CSS's own inheritance.
    it('exposes the hooks on the host, not on Material’s internals', () => {
      expect(declaration('--mat-table-background-color')).not.toBe('');
      expect(
        getComputedStyle(query('table')!).getPropertyValue('--mat-table-background-color'),
      ).toBe('');
    });
  });
});
