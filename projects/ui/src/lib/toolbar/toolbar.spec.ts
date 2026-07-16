import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatToolbar } from '@angular/material/toolbar';
import { MatToolbarHarness } from '@angular/material/toolbar/testing';

import { Toolbar, ToolbarEnd, ToolbarStart, ToolbarTitle, type UiToolbarColor } from './toolbar';

@Component({
  imports: [Toolbar, ToolbarStart, ToolbarEnd],
  template: `
    <ui-toolbar #ref="uiToolbar" [color]="color()" [dense]="dense()">
      <button uiToolbarStart class="menu" aria-label="Open the menu">menu</button>
      <h1 class="title">Orders</h1>
      <button uiToolbarEnd class="search" aria-label="Search">search</button>
    </ui-toolbar>
  `,
})
class TestHost {
  readonly color = signal<UiToolbarColor>('surface');
  readonly dense = signal(false);
  readonly ref = viewChild.required<Toolbar>('ref');
}

describe('Toolbar', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let loader: HarnessLoader;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  const toolbarHost = (): HTMLElement => query('ui-toolbar')!;

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  it('renders Material’s toolbar rather than markup of its own', () => {
    expect(query('mat-toolbar')).not.toBeNull();
    expect(query('mat-toolbar')!.classList).toContain('mat-toolbar');
    expect(host.ref().matToolbar()).toBeInstanceOf(MatToolbar);
  });

  // The default slot is what makes it a single-row toolbar. A `mat-toolbar-row`
  // in there as well is an error Material throws on, so the two cannot be mixed.
  // `hasMultipleRows()` is the harness's reading of the same thing the old
  // `mat-toolbar-single-row` class check stood for — one row, not many — without
  // naming that class; the explicit `mat-toolbar-row` element check stays a DOM
  // read, since it is the structural detail the harness has no method for.
  it('renders it as a single-row toolbar', async () => {
    const bar = await loader.getHarness(MatToolbarHarness);

    expect(await bar.hasMultipleRows()).toBe(false);
    expect(await bar.getRowsAsText()).toHaveLength(1);
    expect(query('mat-toolbar-row')).toBeNull();
  });

  describe('slots', () => {
    it('projects each marked element into its own region, inside Material’s toolbar', () => {
      expect(query('.ui-toolbar__start')!.contains(query('.menu'))).toBe(true);
      expect(query('.ui-toolbar__title')!.contains(query('.title'))).toBe(true);
      expect(query('.ui-toolbar__end')!.contains(query('.search'))).toBe(true);
      expect(query('.menu')!.closest('mat-toolbar')).not.toBeNull();
    });

    it('lays the regions out in start, title, end order regardless of source order', async () => {
      @Component({
        imports: [Toolbar, ToolbarStart, ToolbarEnd, ToolbarTitle],
        template: `
          <ui-toolbar>
            <button uiToolbarEnd class="search">search</button>
            <h1 uiToolbarTitle class="title">Orders</h1>
            <button uiToolbarStart class="menu">menu</button>
          </ui-toolbar>
        `,
      })
      class ReorderedHost {}

      const f = TestBed.createComponent(ReorderedHost);
      await f.whenStable();
      // `querySelectorAll` returns document order, which is the order on screen:
      // the row is laid out by this component's template, not by the source.
      const regions: HTMLElement[] = Array.from(
        f.nativeElement.querySelectorAll('mat-toolbar > div'),
      );

      expect(regions.map((region) => region.className)).toEqual([
        'ui-toolbar__start',
        'ui-toolbar__title',
        'ui-toolbar__end',
      ]);
      expect(regions.map((region) => region.textContent?.trim())).toEqual([
        'menu',
        'Orders',
        'search',
      ]);
    });

    // Unmarked content is the everyday case — `<ui-toolbar><h1>Orders</h1></ui-toolbar>`
    // — so it has to land somewhere rather than being dropped on the floor.
    it('puts unmarked content in the title slot', () => {
      expect(query('.ui-toolbar__title')!.textContent).toContain('Orders');
    });

    it('puts an explicitly marked title in the same slot', async () => {
      @Component({
        imports: [Toolbar, ToolbarTitle],
        template: `<ui-toolbar><h1 uiToolbarTitle class="title">Orders</h1></ui-toolbar>`,
      })
      class MarkedHost {}

      const f = TestBed.createComponent(MarkedHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('.ui-toolbar__title').textContent).toContain('Orders');
    });

    // An empty region would be a box with the slot's gap around it, so a bar with
    // no leading action would be indented by a slot that is not there.
    it('renders no start or end region when nothing is projected into them', async () => {
      @Component({
        imports: [Toolbar],
        template: `<ui-toolbar><h1>Orders</h1></ui-toolbar>`,
      })
      class TitleOnlyHost {}

      const f = TestBed.createComponent(TitleOnlyHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('.ui-toolbar__start')).toBeNull();
      expect(f.nativeElement.querySelector('.ui-toolbar__end')).toBeNull();
      expect(f.nativeElement.querySelector('.ui-toolbar__title')).not.toBeNull();
    });

    // The title region is the flexible one, so it is what holds the trailing
    // actions against the far end — it has to be there even with nothing in it.
    it('keeps the title region on an untitled bar', async () => {
      @Component({
        imports: [Toolbar, ToolbarEnd],
        template: `<ui-toolbar><button uiToolbarEnd>Sign out</button></ui-toolbar>`,
      })
      class ActionsOnlyHost {}

      const f = TestBed.createComponent(ActionsOnlyHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('.ui-toolbar__title')).not.toBeNull();
      expect(f.nativeElement.querySelector('.ui-toolbar__end')).not.toBeNull();
    });

    it('lights up a slot that appears after the first render', async () => {
      @Component({
        imports: [Toolbar, ToolbarStart],
        template: `
          <ui-toolbar>
            @if (showMenu()) {
              <button uiToolbarStart class="menu">menu</button>
            }
            <h1>Orders</h1>
          </ui-toolbar>
        `,
      })
      class LateHost {
        readonly showMenu = signal(false);
      }

      const f = TestBed.createComponent(LateHost);
      await f.whenStable();
      expect(f.nativeElement.querySelector('.ui-toolbar__start')).toBeNull();

      f.componentInstance.showMenu.set(true);
      await f.whenStable();

      expect(f.nativeElement.querySelector('.ui-toolbar__start')).not.toBeNull();
      expect(f.nativeElement.querySelector('.menu')).not.toBeNull();
    });

    it('keeps several actions in one region, in order', async () => {
      @Component({
        imports: [Toolbar, ToolbarEnd],
        template: `
          <ui-toolbar>
            <h1>Orders</h1>
            <button uiToolbarEnd>Search</button>
            <button uiToolbarEnd>Sign out</button>
          </ui-toolbar>
        `,
      })
      class ManyActionsHost {}

      const f = TestBed.createComponent(ManyActionsHost);
      await f.whenStable();
      const actions = f.nativeElement.querySelectorAll('.ui-toolbar__end button');

      expect(Array.from(actions).map((a) => (a as HTMLElement).textContent)).toEqual([
        'Search',
        'Sign out',
      ]);
    });

    // `descendants: false` mirrors what `ng-content select` actually projects:
    // only direct children. A deeper marker is not projected, so it must not
    // light up an empty region either.
    it('ignores a marker that is not a direct child', async () => {
      @Component({
        imports: [Toolbar, ToolbarStart],
        template: `
          <ui-toolbar>
            <div>
              <button uiToolbarStart class="menu">menu</button>
            </div>
          </ui-toolbar>
        `,
      })
      class NestedHost {}

      const f = TestBed.createComponent(NestedHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('.ui-toolbar__start')).toBeNull();
      // It is unmatched content, so it falls to the catch-all in the title.
      expect(f.nativeElement.querySelector('.ui-toolbar__title').contains(
        f.nativeElement.querySelector('.menu'),
      )).toBe(true);
    });
  });

  describe('color', () => {
    it('defaults to surface, as Material does', () => {
      expect(host.ref().color()).toBe('surface');
      expect(toolbarHost().classList).not.toContain('ui-toolbar--primary');
    });

    it('marks the host for primary and unmarks it again', async () => {
      host.color.set('primary');
      await fixture.whenStable();
      expect(toolbarHost().classList).toContain('ui-toolbar--primary');

      host.color.set('surface');
      await fixture.whenStable();
      expect(toolbarHost().classList).not.toContain('ui-toolbar--primary');
    });

    // Material's own `color` input is an M2-only API that does nothing under an
    // M3 theme — driving it would look like it worked and change no pixel.
    it('does not touch Material’s M2-only color input', async () => {
      host.color.set('primary');
      await fixture.whenStable();

      expect(host.ref().matToolbar().color).toBeUndefined();
    });
  });

  describe('dense', () => {
    it('is off by default', () => {
      expect(host.ref().dense()).toBe(false);
      expect(toolbarHost().classList).not.toContain('ui-toolbar--dense');
    });

    it('marks the host when set and unmarks it when cleared', async () => {
      host.dense.set(true);
      await fixture.whenStable();
      expect(toolbarHost().classList).toContain('ui-toolbar--dense');

      host.dense.set(false);
      await fixture.whenStable();
      expect(toolbarHost().classList).not.toContain('ui-toolbar--dense');
    });

    // `booleanAttribute`: the bare attribute is what a template naturally writes.
    it('reads the bare dense attribute', async () => {
      @Component({
        imports: [Toolbar],
        template: `<ui-toolbar #ref="uiToolbar" dense><h1>Orders</h1></ui-toolbar>`,
      })
      class AttrHost {
        readonly ref = viewChild.required<Toolbar>('ref');
      }

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();

      expect(f.componentInstance.ref().dense()).toBe(true);
      expect(f.nativeElement.querySelector('ui-toolbar').classList).toContain('ui-toolbar--dense');
    });
  });

  describe('accessibility', () => {
    // Material's toolbar has no role of its own, and neither does this one:
    // `role="toolbar"` promises arrow-key navigation over a roving `tabindex`,
    // which is a promise this component cannot keep for controls it does not own.
    // A top app bar is a banner rather than a group of controls anyway.
    it('imposes no role on the host or on Material’s element', () => {
      expect(toolbarHost().hasAttribute('role')).toBe(false);
      expect(query('mat-toolbar')!.hasAttribute('role')).toBe(false);
    });

    // Rule 3: the host is a real element, so a consumer's own role and label reach
    // it and need no forwarding.
    it('takes a consumer’s role and aria-label on the host', async () => {
      @Component({
        imports: [Toolbar, ToolbarEnd],
        template: `
          <ui-toolbar role="toolbar" aria-label="Selected orders">
            <h1>3 selected</h1>
            <button uiToolbarEnd aria-label="Delete">delete</button>
          </ui-toolbar>
        `,
      })
      class RoleHost {}

      const f = TestBed.createComponent(RoleHost);
      await f.whenStable();
      const element = f.nativeElement.querySelector('ui-toolbar');

      expect(element.getAttribute('role')).toBe('toolbar');
      expect(element.getAttribute('aria-label')).toBe('Selected orders');
    });

    it('leaves other native attributes alone', async () => {
      @Component({
        imports: [Toolbar],
        template: `<ui-toolbar id="top-bar" data-testid="bar"><h1>Orders</h1></ui-toolbar>`,
      })
      class AttrHost {}

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      const element = f.nativeElement.querySelector('ui-toolbar');

      expect(element.id).toBe('top-bar');
      expect(element.getAttribute('data-testid')).toBe('bar');
    });
  });

  describe('escape hatches', () => {
    it('exposes the component instance via exportAs', () => {
      expect(host.ref()).toBeInstanceOf(Toolbar);
    });

    // Rule 4: Material's own instance is the way out of anything not wrapped here.
    it('exposes the underlying MatToolbar instance', () => {
      expect(host.ref().matToolbar()).toBeInstanceOf(MatToolbar);
    });
  });

  // The colours are Material's, resolved from the shared theme's tokens. This
  // component only re-points those tokens at hooks whose defaults are the roles
  // `color` names.
  describe('theming', () => {
    // These read the *declaration* rather than a painted colour, on purpose:
    // `ng test` runs in jsdom, which does not substitute `var()` at all. What a
    // toolbar resolves to under the real theme is asserted by the Storybook
    // stories, which run in Chromium.
    const declaration = (property: string) =>
      getComputedStyle(toolbarHost()).getPropertyValue(property);

    const noLiterals = /#[0-9a-f]{3,8}\b|\brgba?\(/i;

    it('resolves the container from the theme, not a literal', () => {
      expect(declaration('--mat-toolbar-container-background-color')).toContain(
        'var(--_ui-toolbar-background-color)',
      );
      expect(declaration('--_ui-toolbar-background-color')).toContain(
        'var(--ui-toolbar-background-color',
      );
      expect(declaration('--_ui-toolbar-background-color')).toContain('var(--mat-sys-surface)');
      expect(declaration('--_ui-toolbar-background-color')).not.toMatch(noLiterals);
    });

    it('resolves the text colour from the theme, not a literal', () => {
      expect(declaration('--mat-toolbar-container-text-color')).toContain(
        'var(--_ui-toolbar-text-color)',
      );
      expect(declaration('--_ui-toolbar-text-color')).toContain('var(--mat-sys-on-surface)');
      expect(declaration('--_ui-toolbar-text-color')).not.toMatch(noLiterals);
    });

    it('re-points both onto the primary pair for color="primary"', async () => {
      host.color.set('primary');
      await fixture.whenStable();

      expect(declaration('--_ui-toolbar-background-color')).toContain('var(--mat-sys-primary)');
      expect(declaration('--_ui-toolbar-text-color')).toContain('var(--mat-sys-on-primary)');
      expect(declaration('--_ui-toolbar-text-color')).not.toMatch(noLiterals);
    });

    // Material's toolbar only fixes up text and outlined buttons; an icon button
    // would keep `on-surface-variant` and vanish into a primary container.
    it('points the icon buttons at the toolbar’s own text colour', () => {
      expect(declaration('--mat-icon-button-icon-color')).toContain('var(--ui-toolbar-icon-color');
      expect(declaration('--mat-icon-button-icon-color')).toContain(
        'var(--_ui-toolbar-text-color)',
      );
      expect(declaration('--mat-icon-button-icon-color')).not.toMatch(noLiterals);
    });

    it('exposes Material’s two heights as hooks, at Material’s own defaults', () => {
      expect(declaration('--mat-toolbar-standard-height')).toContain('var(--_ui-toolbar-height)');
      expect(declaration('--_ui-toolbar-height')).toContain('var(--ui-toolbar-height');
      expect(declaration('--_ui-toolbar-height')).toContain('64px');
      expect(declaration('--_ui-toolbar-mobile-height')).toContain('56px');
    });

    // M3's own next height down, so `dense` moves the bar without the consumer
    // picking a number — and without touching the fleet's density.
    it('drops both heights for dense', async () => {
      host.dense.set(true);
      await fixture.whenStable();

      expect(declaration('--_ui-toolbar-height')).toContain('56px');
      expect(declaration('--_ui-toolbar-mobile-height')).toContain('48px');
    });

    // `dense` picks a *default* height rather than overruling the hook — the same
    // construction as `color`, so the two inputs cannot behave differently. A
    // consumer's own height wins on a dense bar rather than being outranked by it.
    it('lets a consumer’s height hook win over dense', async () => {
      host.dense.set(true);
      await fixture.whenStable();
      toolbarHost().style.setProperty('--ui-toolbar-height', '5rem');

      expect(declaration('--_ui-toolbar-height')).toContain('var(--ui-toolbar-height');
      expect(declaration('--ui-toolbar-height')).toBe('5rem');
    });

    // The hooks are emitted on the host, which is what keeps a consumer off
    // `::ng-deep`: `--ui-toolbar-background-color` set by an ordinary rule on
    // `ui-toolbar` reaches Material's own element by CSS's own inheritance.
    it('exposes the hooks on the host, not on Material’s internals', () => {
      expect(declaration('--mat-toolbar-container-background-color')).not.toBe('');
      expect(
        getComputedStyle(query('mat-toolbar')!).getPropertyValue(
          '--mat-toolbar-container-background-color',
        ),
      ).toBe('');
    });
  });

  /**
   * The gap between the elements within a slot is on the theme's `sm` step, so a
   * toolbar keeps the fleet's rhythm rather than a `8px` of its own — the drift
   * `--ui-sys-spacing-*` exists to prevent. The `16px` inline padding is
   * Material's own container metric and stays a literal, as its comment says.
   * jsdom does not resolve `var()`, so this is a source-level assertion, in the
   * spirit of `ui-divider`'s.
   */
  describe('spacing comes from the theme, not from literals', () => {
    const styles = readFileSync(
      join(process.cwd(), 'projects', 'ui', 'src', 'lib', 'toolbar', 'toolbar.scss'),
      'utf8',
    );

    it('resolves the slot gap from the theme’s `sm` step', () => {
      expect(styles).toContain('var(--ui-toolbar-gap, var(--ui-sys-spacing-sm))');
      expect(styles).not.toMatch(/--ui-toolbar-gap,\s*8px/);
    });
  });
});
