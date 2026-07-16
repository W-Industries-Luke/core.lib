import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatPaginator, MatPaginatorIntl } from '@angular/material/paginator';

import { Paginator, type UiPageChange } from './paginator';

@Component({
  imports: [Paginator],
  template: `
    <ui-paginator
      #ref="uiPaginator"
      [length]="length()"
      [(pageIndex)]="pageIndex"
      [(pageSize)]="pageSize"
      [pageSizeOptions]="pageSizeOptions()"
      [hidePageSize]="hidePageSize()"
      [showFirstLastButtons]="showFirstLastButtons()"
      [disabled]="disabled()"
      (pageChange)="changes.push($event)"
      aria-label="Orders"
    />
  `,
})
class TestHost {
  readonly length = signal(42);
  readonly pageIndex = signal(0);
  readonly pageSize = signal<number | undefined>(10);
  readonly pageSizeOptions = signal<readonly number[]>([10, 25, 50, 100]);
  readonly hidePageSize = signal(false);
  readonly showFirstLastButtons = signal(true);
  readonly disabled = signal(false);
  readonly changes: UiPageChange[] = [];
  readonly ref = viewChild.required<Paginator>('ref');
}

/**
 * Material's own switch for its animations. Without it the select panel's
 * transitions run on timers that no assertion here is waiting for. This is
 * Material's public token rather than `provideNoopAnimations()`, which is the same
 * thing plus an animations module.
 */
const noAnimations = { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } };

type Nav = 'first' | 'previous' | 'next' | 'last';

describe('Paginator', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  /** The navigation buttons Material renders, by what they do. */
  const button = (which: Nav): HTMLButtonElement | null =>
    query(`.mat-mdc-paginator-navigation-${which}`) as HTMLButtonElement | null;

  const click = async (which: Nav) => {
    button(which)!.click();
    await fixture.whenStable();
  };

  /**
   * Whether a button is off. Material's paginator buttons are `disabledInteractive`
   * — they keep focus rather than dropping it on the body — so "disabled" is
   * `aria-disabled` rather than the native attribute.
   */
  const isDisabled = (which: Nav): boolean =>
    button(which)!.getAttribute('aria-disabled') === 'true';

  /** The `1 – 10 of 42` Material prints. */
  const rangeLabel = (): string => query('.mat-mdc-paginator-range-label')!.textContent!.trim();

  /** The panel lives in an overlay at the document root, not inside the fixture. */
  const panelOptions = (): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>('mat-option'));

  /** The page sizes on offer — what a user can actually pick, from the open panel. */
  const sizeOptions = async (): Promise<string[]> => {
    (query('.mat-mdc-select-trigger') as HTMLElement).click();
    await fixture.whenStable();
    return panelOptions().map((option) => option.textContent!.trim());
  };

  /** Picks a page size the way a user does: open the panel, click the option. */
  const chooseSize = async (size: number) => {
    if (!document.querySelector('.mat-mdc-select-panel')) {
      await sizeOptions();
    }
    const option = panelOptions().find((o) => o.textContent!.trim() === String(size));
    if (!option) {
      throw new Error(`No page size option "${size}" in the panel.`);
    }
    option.click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [noAnimations] });
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  // The point of this library: the control is Material's, not a row of buttons
  // painted to look like one. If these fail, everything below is testing a
  // lookalike.
  describe('composition', () => {
    it('renders Material’s paginator rather than markup of its own', () => {
      expect(query('mat-paginator')).not.toBeNull();
      expect(query('mat-paginator')!.classList).toContain('mat-mdc-paginator');
      expect(host.ref().matPaginator()).toBeInstanceOf(MatPaginator);
    });

    it('renders Material’s range label, its size select and its buttons', () => {
      expect(rangeLabel()).toBe('1 – 10 of 42');
      expect(query('mat-select')).not.toBeNull();
      expect(button('previous')).not.toBeNull();
      expect(button('next')).not.toBeNull();
    });
  });

  describe('length', () => {
    it('is the total being paged through, not the page — it sets the range', () => {
      expect(rangeLabel()).toBe('1 – 10 of 42');
    });

    it('leaves the next button live while there are pages left', () => {
      expect(isDisabled('next')).toBe(false);
    });

    it('turns the next button off on the last page', async () => {
      host.pageIndex.set(4); // 42 items, 10 a page — page 5 of 5.
      await fixture.whenStable();

      expect(rangeLabel()).toBe('41 – 42 of 42');
      expect(isDisabled('next')).toBe(true);
    });

    it('re-reads the range when the total changes under it', async () => {
      host.length.set(7);
      await fixture.whenStable();

      expect(rangeLabel()).toBe('1 – 7 of 7');
      expect(isDisabled('next')).toBe(true);
    });

    it('shows an empty list as such, with nowhere to go', async () => {
      host.length.set(0);
      await fixture.whenStable();

      expect(rangeLabel()).toBe('0 of 0');
      expect(isDisabled('next')).toBe(true);
      expect(isDisabled('previous')).toBe(true);
    });
  });

  describe('pageIndex', () => {
    it('is zero-based', () => {
      expect(host.ref().pageIndex()).toBe(0);
      expect(rangeLabel()).toBe('1 – 10 of 42');
    });

    it('moves on a click, and writes the new page back to the binding', async () => {
      await click('next');

      expect(host.pageIndex()).toBe(1);
      expect(rangeLabel()).toBe('11 – 20 of 42');
    });

    it('comes back on the previous button', async () => {
      await click('next');
      await click('next');
      await click('previous');

      expect(host.pageIndex()).toBe(1);
    });

    it('turns the backwards buttons off on the first page', () => {
      expect(isDisabled('previous')).toBe(true);
      expect(isDisabled('first')).toBe(true);
    });

    // The half of rule 5 an input/output pair cannot do: a page set from code has to
    // move the buttons and the range exactly as a click does.
    it('moves the paginator when it is set from code', async () => {
      host.pageIndex.set(2);
      await fixture.whenStable();

      expect(rangeLabel()).toBe('21 – 30 of 42');
      expect(isDisabled('previous')).toBe(false);
    });
  });

  describe('first/last buttons', () => {
    it('shows them by default, unlike Material', async () => {
      @Component({
        imports: [Paginator],
        template: `<ui-paginator [length]="42" />`,
      })
      class DefaultHost {}

      const f = TestBed.createComponent(DefaultHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('.mat-mdc-paginator-navigation-first')).not.toBeNull();
      expect(f.nativeElement.querySelector('.mat-mdc-paginator-navigation-last')).not.toBeNull();
    });

    it('jumps to the last page in one click', async () => {
      await click('last');

      expect(host.pageIndex()).toBe(4);
      expect(rangeLabel()).toBe('41 – 42 of 42');
      expect(isDisabled('last')).toBe(true);
    });

    it('jumps back to the first page in one click', async () => {
      host.pageIndex.set(3);
      await fixture.whenStable();

      await click('first');

      expect(host.pageIndex()).toBe(0);
      expect(rangeLabel()).toBe('1 – 10 of 42');
    });

    it('drops them when they are turned off', async () => {
      host.showFirstLastButtons.set(false);
      await fixture.whenStable();

      expect(button('first')).toBeNull();
      expect(button('last')).toBeNull();
      // The pair that is always there stays there.
      expect(button('previous')).not.toBeNull();
      expect(button('next')).not.toBeNull();
    });
  });

  describe('pageSize and pageSizeOptions', () => {
    it('offers [10, 25, 50, 100] by default', async () => {
      @Component({
        imports: [Paginator],
        template: `<ui-paginator #ref="uiPaginator" [length]="500" />`,
      })
      class DefaultHost {
        readonly ref = viewChild.required<Paginator>('ref');
      }

      const f = TestBed.createComponent(DefaultHost);
      await f.whenStable();

      expect(f.componentInstance.ref().pageSizeOptions()).toEqual([10, 25, 50, 100]);
      expect(
        f.nativeElement.querySelector('.mat-mdc-paginator-range-label').textContent.trim(),
      ).toBe('1 – 10 of 500');
    });

    it('renders one option per page size, in order', async () => {
      expect(await sizeOptions()).toEqual(['10', '25', '50', '100']);
    });

    it('renders custom page sizes instead when given some', async () => {
      host.pageSizeOptions.set([5, 15]);
      host.pageSize.set(5);
      await fixture.whenStable();

      expect(await sizeOptions()).toEqual(['5', '15']);
      expect(rangeLabel()).toBe('1 – 5 of 42');
    });

    it('re-pages on a size the user picks, and writes it back', async () => {
      await chooseSize(25);

      expect(host.pageSize()).toBe(25);
      expect(rangeLabel()).toBe('1 – 25 of 42');
    });

    it('re-pages on a size set from code', async () => {
      host.pageSize.set(50);
      await fixture.whenStable();

      expect(rangeLabel()).toBe('1 – 42 of 42');
      expect(isDisabled('next')).toBe(true);
    });

    // Material's own rule, kept rather than re-derived: changing the page size keeps
    // the item the user was looking at on screen, which moves the page index.
    it('keeps the first visible item on screen when the size changes, moving pageIndex', async () => {
      host.pageIndex.set(2); // Items 21–30, at a size of 10.
      await fixture.whenStable();

      await chooseSize(25);

      // Item 21 is on the first page of 25.
      expect(host.pageIndex()).toBe(0);
      expect(rangeLabel()).toBe('1 – 25 of 42');
    });

    // Rule 5: an unset size resolves to a real number rather than leaving the
    // consumer's binding holding `undefined` while the select shows a size.
    it('settles an unset size on the first option, and reports it back', async () => {
      @Component({
        imports: [Paginator],
        template: `
          <ui-paginator
            #ref="uiPaginator"
            [length]="42"
            [(pageSize)]="size"
            [pageSizeOptions]="[5, 15]"
          />
        `,
      })
      class UnsetHost {
        readonly size = signal<number | undefined>(undefined);
        readonly ref = viewChild.required<Paginator>('ref');
      }

      const f = TestBed.createComponent(UnsetHost);
      await f.whenStable();

      expect(f.componentInstance.size()).toBe(5);
      expect(f.componentInstance.ref().pageSize()).toBe(5);
      expect(
        f.nativeElement.querySelector('.mat-mdc-paginator-range-label').textContent.trim(),
      ).toBe('1 – 5 of 42');
    });

    it('hides the size selector when asked, keeping the range and the buttons', async () => {
      host.hidePageSize.set(true);
      await fixture.whenStable();

      expect(query('mat-select')).toBeNull();
      expect(query('.mat-mdc-paginator-page-size')).toBeNull();
      expect(rangeLabel()).toBe('1 – 10 of 42');
      expect(button('next')).not.toBeNull();
    });

    // `booleanAttribute`: the bare attribute is what a template naturally writes.
    it('reads the bare hidePageSize attribute', async () => {
      @Component({
        imports: [Paginator],
        template: `<ui-paginator #ref="uiPaginator" [length]="42" hidePageSize />`,
      })
      class AttrHost {
        readonly ref = viewChild.required<Paginator>('ref');
      }

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();

      expect(f.componentInstance.ref().hidePageSize()).toBe(true);
      expect(f.nativeElement.querySelector('mat-select')).toBeNull();
    });
  });

  describe('pageChange', () => {
    it('emits the page and the size for a click', async () => {
      await click('next');

      expect(host.changes).toEqual([
        { previousPageIndex: 0, pageIndex: 1, pageSize: 10, length: 42 },
      ]);
    });

    it('emits for a page size the user picked', async () => {
      await chooseSize(25);

      expect(host.changes.length).toBe(1);
      expect(host.changes[0].pageIndex).toBe(0);
      expect(host.changes[0].pageSize).toBe(25);
    });

    // A one-way write is the consumer's own state arriving; echoing it back would be
    // a loop.
    it('stays quiet for a page and a size set from code', async () => {
      host.pageIndex.set(3);
      await fixture.whenStable();
      host.pageSize.set(25);
      await fixture.whenStable();

      expect(host.changes).toEqual([]);
    });

    // The models are written before the output fires, so a handler that reads them
    // sees the page it was told about rather than the one before it.
    it('has already moved pageIndex by the time it fires', async () => {
      const seen: number[] = [];

      @Component({
        imports: [Paginator],
        template: `
          <ui-paginator [length]="42" [(pageIndex)]="page" (pageChange)="record()" />
        `,
      })
      class ReadHost {
        readonly page = signal(0);
        record() {
          seen.push(this.page());
        }
      }

      const f = TestBed.createComponent(ReadHost);
      await f.whenStable();
      (f.nativeElement.querySelector('.mat-mdc-paginator-navigation-next') as HTMLElement).click();
      await f.whenStable();

      expect(seen).toEqual([1]);
    });

    it('does not fire for a click on a button with nowhere to go', async () => {
      await click('previous'); // Already on the first page.

      expect(host.changes).toEqual([]);
      expect(host.pageIndex()).toBe(0);
    });
  });

  describe('disabled', () => {
    beforeEach(async () => {
      host.pageIndex.set(2);
      host.disabled.set(true);
      await fixture.whenStable();
    });

    it('turns every button off, including the ones with somewhere to go', () => {
      expect(isDisabled('first')).toBe(true);
      expect(isDisabled('previous')).toBe(true);
      expect(isDisabled('next')).toBe(true);
      expect(isDisabled('last')).toBe(true);
    });

    it('ignores a click while it is off', async () => {
      await click('next');

      expect(host.pageIndex()).toBe(2);
      expect(host.changes).toEqual([]);
    });

    it('turns the size selector off too', () => {
      expect(query('mat-select')!.getAttribute('aria-disabled')).toBe('true');
    });

    it('comes back when it is turned on again', async () => {
      host.disabled.set(false);
      await fixture.whenStable();

      await click('next');

      expect(host.pageIndex()).toBe(3);
    });
  });

  describe('accessibility', () => {
    it('names Material’s group from aria-label', () => {
      const group = query('mat-paginator')!;

      expect(group.getAttribute('role')).toBe('group');
      expect(group.getAttribute('aria-label')).toBe('Orders');
    });

    it('names it from aria-labelledby instead when given one', async () => {
      @Component({
        imports: [Paginator],
        template: `
          <h2 id="heading">Orders</h2>
          <ui-paginator [length]="42" aria-labelledby="heading" />
        `,
      })
      class LabelledbyHost {}

      const f = TestBed.createComponent(LabelledbyHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('mat-paginator').getAttribute('aria-labelledby')).toBe(
        'heading',
      );
    });

    it('leaves no empty aria-label behind when unnamed', async () => {
      @Component({
        imports: [Paginator],
        template: `<ui-paginator [length]="42" />`,
      })
      class UnnamedHost {}

      const f = TestBed.createComponent(UnnamedHost);
      await f.whenStable();
      const group = f.nativeElement.querySelector('mat-paginator');

      expect(group.hasAttribute('aria-label')).toBe(false);
      expect(group.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('names every button, and announces the range politely', () => {
      expect(button('first')!.getAttribute('aria-label')).toBe('First page');
      expect(button('previous')!.getAttribute('aria-label')).toBe('Previous page');
      expect(button('next')!.getAttribute('aria-label')).toBe('Next page');
      expect(button('last')!.getAttribute('aria-label')).toBe('Last page');

      const range = query('.mat-mdc-paginator-range-label')!;

      expect(range.getAttribute('aria-live')).toBe('polite');
      expect(range.getAttribute('role')).toBe('status');
    });

    // The words are Material's `MatPaginatorIntl` — a provider, so an app rewords or
    // translates every paginator at once rather than passing strings to each one.
    it('takes its wording from MatPaginatorIntl', async () => {
      const intl = new MatPaginatorIntl();
      intl.itemsPerPageLabel = 'Eitemau fesul tudalen:';
      intl.nextPageLabel = 'Tudalen nesaf';
      intl.getRangeLabel = (page, size, length) => `${page + 1} o ${Math.ceil(length / size)}`;

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [noAnimations, { provide: MatPaginatorIntl, useValue: intl }],
      });

      @Component({
        imports: [Paginator],
        template: `<ui-paginator [length]="42" />`,
      })
      class IntlHost {}

      const f = TestBed.createComponent(IntlHost);
      await f.whenStable();

      expect(
        f.nativeElement.querySelector('.mat-mdc-paginator-range-label').textContent.trim(),
      ).toBe('1 o 5');
      expect(
        f.nativeElement.querySelector('.mat-mdc-paginator-page-size-label').textContent.trim(),
      ).toBe('Eitemau fesul tudalen:');
      expect(
        f.nativeElement
          .querySelector('.mat-mdc-paginator-navigation-next')
          .getAttribute('aria-label'),
      ).toBe('Tudalen nesaf');
    });
  });

  describe('escape hatches', () => {
    it('exposes the component instance via exportAs', () => {
      expect(host.ref()).toBeInstanceOf(Paginator);
    });

    // Rule 4: Material's own instance is the way out of anything not wrapped.
    it('exposes the underlying MatPaginator', () => {
      expect(host.ref().matPaginator()).toBeInstanceOf(MatPaginator);
      expect(host.ref().matPaginator().getNumberOfPages()).toBe(5);
    });

    it('writes a move made through the MatPaginator back to the bindings', async () => {
      host.ref().matPaginator().lastPage();
      await fixture.whenStable();

      expect(host.pageIndex()).toBe(4);
      expect(host.changes.length).toBe(1);
    });

    // Rule 4: Material's own select config reaches the select rather than being
    // swallowed here.
    it('forwards selectConfig to Material’s select', async () => {
      @Component({
        imports: [Paginator],
        template: `<ui-paginator [length]="42" [selectConfig]="{ panelClass: 'tall-panel' }" />`,
      })
      class ConfigHost {}

      const f = TestBed.createComponent(ConfigHost);
      await f.whenStable();
      (f.nativeElement.querySelector('.mat-mdc-select-trigger') as HTMLElement).click();
      await f.whenStable();

      expect(document.querySelector('.mat-mdc-select-panel')!.classList).toContain('tall-panel');
    });
  });

  // The colours are Material's, resolved from the shared theme's tokens. This
  // component only re-points those tokens at hooks whose defaults are the tokens
  // Material would have used anyway.
  describe('theming', () => {
    // These read the *declaration* rather than a painted colour, on purpose: `ng
    // test` runs in jsdom, which does not substitute `var()` at all. What the
    // paginator resolves to under the real theme is asserted by the Storybook
    // stories, which run in Chromium.
    const declaration = (token: string) =>
      getComputedStyle(query('ui-paginator')!).getPropertyValue(token);

    it('resolves the surface and the label text from the theme, not a literal', () => {
      expect(declaration('--mat-paginator-container-background-color')).toContain(
        'var(--ui-paginator-background',
      );
      expect(declaration('--mat-paginator-container-background-color')).toContain(
        'var(--mat-sys-surface)',
      );
      expect(declaration('--mat-paginator-container-text-color')).toContain(
        'var(--ui-paginator-text-color',
      );
      expect(declaration('--mat-paginator-container-text-color')).toContain(
        'var(--mat-sys-on-surface)',
      );
    });

    it('resolves both arrow states from the theme, not a literal', () => {
      expect(declaration('--mat-paginator-enabled-icon-color')).toContain(
        'var(--mat-sys-on-surface-variant)',
      );
      expect(declaration('--mat-paginator-disabled-icon-color')).toContain(
        'var(--mat-sys-on-surface)',
      );
      expect(declaration('--mat-paginator-disabled-icon-color')).not.toMatch(
        /#[0-9a-f]{3,8}\b|\brgba?\(/i,
      );
    });

    // Density is the theme's decision, not this component's: a height hook here
    // would be a second way to set it, and a way for two apps to disagree.
    it('leaves the height to the theme’s density token', () => {
      expect(declaration('--mat-paginator-container-size')).toBe('');
    });

    // The overrides are emitted on the host, which is what keeps a consumer off
    // `::ng-deep`: `--ui-paginator-background` set by an ordinary rule on
    // `ui-paginator` — or inherited from any ancestor — reaches the elements inside
    // Material's template by CSS's own inheritance.
    it('exposes the hooks on the host, not on Material’s internals', () => {
      expect(declaration('--mat-paginator-container-background-color')).not.toBe('');
      expect(
        getComputedStyle(query('mat-paginator')!).getPropertyValue(
          '--mat-paginator-container-background-color',
        ),
      ).toBe('');
    });
  });
});
