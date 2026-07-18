import { BreakpointObserver, Breakpoints, type BreakpointState } from '@angular/cdk/layout';
import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatSidenav, MatSidenavContainer } from '@angular/material/sidenav';
import { MatSidenavHarness } from '@angular/material/sidenav/testing';
import { BehaviorSubject, map, type Observable } from 'rxjs';

import { Sidenav, SidenavDrawer, type UiSidenavMode, type UiSidenavPosition } from './sidenav';

/**
 * A `BreakpointObserver` the test drives directly.
 *
 * jsdom's `matchMedia` never evaluates a query — it answers `false` to everything
 * and its listeners never fire — so the real observer cannot be made to report a
 * narrow screen. This stands in for it: `narrow()` is the resize, and `queries`
 * records what was actually observed, which is how the `compactBreakpoint` input
 * is checked to reach the observer rather than being quietly ignored.
 */
class FakeBreakpointObserver {
  private readonly state = new BehaviorSubject(false);

  /** Every query passed to `observe`, in subscription order. */
  readonly queries: (string | readonly string[])[] = [];

  narrow(matches: boolean): void {
    this.state.next(matches);
  }

  observe(query: string | readonly string[]): Observable<BreakpointState> {
    this.queries.push(query);
    return this.state.pipe(map((matches) => ({ matches, breakpoints: {} })));
  }

  isMatched(): boolean {
    return this.state.value;
  }
}

/**
 * Material's own switch for the drawer's slide.
 *
 * Without it the container waits 200ms before enabling transitions and then hangs
 * its open/close on a `transitionend` that never arrives in jsdom, so every
 * assertion about the drawer would be racing a timer. This is Material's public
 * token rather than `provideNoopAnimations()`, which is the same thing plus an
 * animations module.
 */
const noAnimations = { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } };

@Component({
  imports: [Sidenav, SidenavDrawer],
  template: `
    <ui-sidenav
      #ref="uiSidenav"
      [(opened)]="opened"
      [mode]="mode()"
      [position]="position()"
      [responsive]="responsive()"
      [compactBreakpoint]="compactBreakpoint()"
      [disableClose]="disableClose()"
      [hasBackdrop]="hasBackdrop()"
    >
      <nav uiSidenavDrawer aria-label="Main" class="drawer">Orders</nav>
      <main class="main">Order 4213</main>
    </ui-sidenav>
  `,
})
class TestHost {
  readonly opened = signal(false);
  readonly mode = signal<UiSidenavMode>('side');
  readonly position = signal<UiSidenavPosition>('start');
  readonly responsive = signal(true);
  readonly compactBreakpoint = signal<string | readonly string[]>(Breakpoints.Handset);
  readonly disableClose = signal(false);
  readonly hasBackdrop = signal<boolean | null>(null);
  readonly ref = viewChild.required<Sidenav>('ref');
}

describe('Sidenav', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let breakpoints: FakeBreakpointObserver;
  let loader: HarnessLoader;

  // The `MatSidenavHarness` speaks Material's *public* test surface —
  // `isOpen()`, `getMode()`, `getPosition()` — instead of reading Material's
  // `mat-drawer-opened`/`mat-drawer-<mode>`/`mat-drawer-end` classes off the
  // rendered drawer, as the old spec did. Those class names are Material's
  // internal markup: the harness exists precisely so that when Material renames
  // one, this spec keeps passing rather than breaking on a detail no consumer
  // depends on. Everything the harness *cannot* see — content projection into
  // the drawer and the main, the scrim (`.mat-drawer-backdrop`) this component
  // toggles, the responsive/model plumbing driven through the component's own
  // instance, and its `--ui-*` theme hooks — stays a DOM or instance assertion
  // below.
  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  const drawer = (): HTMLElement => query('mat-sidenav')!;
  const backdrop = (): HTMLElement | null => query('.mat-drawer-backdrop');

  /** The sidenav (drawer) harness — Material's public window onto its state. */
  const sidenav = (): Promise<MatSidenavHarness> => loader.getHarness(MatSidenavHarness);

  /**
   * Settles the fixture *and* the macrotask queue.
   *
   * Material reports a drawer's new state through `openedChange` from a
   * `setTimeout`, not synchronously — so a plain `whenStable()`, which only drains
   * microtasks, would assert on the state from before the toggle.
   */
  const settle = async () => {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    breakpoints = new FakeBreakpointObserver();
    TestBed.configureTestingModule({
      providers: [noAnimations, { provide: BreakpointObserver, useValue: breakpoints }],
    });
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await settle();
  });

  it('renders Material’s sidenav container rather than markup of its own', () => {
    expect(query('mat-sidenav-container')).not.toBeNull();
    expect(drawer().classList).toContain('mat-drawer');
    expect(query('mat-sidenav-content')).not.toBeNull();
    expect(host.ref().matSidenav()).toBeInstanceOf(MatSidenav);
  });

  describe('content projection', () => {
    // The drawer's content has to end up *inside* Material's drawer rather than in
    // a box of ours beside it: that is what puts it in the focus trap and in the
    // drawer's own scroll container, and what the slide moves.
    it('projects the marked element into Material’s drawer', () => {
      const nav = query('.drawer')!;

      expect(nav.textContent).toBe('Orders');
      expect(nav.closest('mat-sidenav')).not.toBeNull();
      expect(nav.closest('mat-sidenav-content')).toBeNull();
    });

    it('projects everything unmarked into the main content', () => {
      const main = query('.main')!;

      expect(main.textContent).toBe('Order 4213');
      expect(main.closest('mat-sidenav-content')).not.toBeNull();
      expect(main.closest('mat-sidenav')).toBeNull();
    });

    // Rule 3: the projected element is the real element, so a consumer's own
    // attributes reach it with no forwarding — there is nothing here to swallow
    // `aria-label` or turn `<nav>` into a `<div>`.
    it('leaves the projected element’s own attributes on it', () => {
      const nav = query('.drawer')!;

      expect(nav.tagName).toBe('NAV');
      expect(nav.getAttribute('aria-label')).toBe('Main');
    });
  });

  describe('mode', () => {
    it('defaults to side, so the content keeps its own space', async () => {
      expect(host.ref().mode()).toBe('side');
      expect(await (await sidenav()).getMode()).toBe('side');
      expect(host.ref().matSidenav().mode).toBe('side');
    });

    for (const mode of ['over', 'push', 'side'] as const) {
      it(`hands ${mode} to Material`, async () => {
        host.mode.set(mode);
        await settle();

        expect(host.ref().matSidenav().mode).toBe(mode);
        expect(await (await sidenav()).getMode()).toBe(mode);
      });
    }
  });

  describe('position', () => {
    it('defaults to start, as Material does', async () => {
      expect(host.ref().matSidenav().position).toBe('start');
      expect(await (await sidenav()).getPosition()).toBe('start');
    });

    it('anchors the drawer to the end edge when asked', async () => {
      host.position.set('end');
      await settle();

      expect(host.ref().matSidenav().position).toBe('end');
      expect(await (await sidenav()).getPosition()).toBe('end');
    });
  });

  describe('opened', () => {
    it('starts closed', async () => {
      expect(host.ref().opened()).toBe(false);
      expect(host.ref().matSidenav().opened).toBe(false);
      expect(await (await sidenav()).isOpen()).toBe(false);
    });

    it('opens the drawer when the binding is set', async () => {
      host.opened.set(true);
      await settle();

      expect(host.ref().matSidenav().opened).toBe(true);
      expect(await (await sidenav()).isOpen()).toBe(true);
    });

    // The `model` half of rule 5: a dismissal has to write back through the same
    // signal the template bound, or a consumer's state silently diverges from what
    // is on screen.
    it('writes a scrim dismissal back through the two-way binding', async () => {
      host.mode.set('over');
      host.opened.set(true);
      await settle();

      backdrop()!.click();
      await settle();

      expect(host.opened()).toBe(false);
      expect(host.ref().opened()).toBe(false);
      expect(host.ref().matSidenav().opened).toBe(false);
    });

    it('emits openedChange for a dismissal but not for a one-way write', async () => {
      const emitted: boolean[] = [];

      @Component({
        imports: [Sidenav, SidenavDrawer],
        template: `
          <ui-sidenav mode="over" [opened]="open()" (openedChange)="changed($event)">
            <nav uiSidenavDrawer>Orders</nav>
            <main>Order</main>
          </ui-sidenav>
        `,
      })
      class OneWayHost {
        readonly open = signal(true);
        changed(opened: boolean) {
          emitted.push(opened);
        }
      }

      const f = TestBed.createComponent(OneWayHost);
      await f.whenStable();
      await new Promise((resolve) => setTimeout(resolve));
      await f.whenStable();
      // A one-way write is the consumer's own state arriving; echoing it back
      // would be a loop, so nothing is emitted for it.
      expect(emitted).toEqual([]);

      (f.nativeElement.querySelector('.mat-drawer-backdrop') as HTMLElement).click();
      await new Promise((resolve) => setTimeout(resolve));
      await f.whenStable();

      expect(emitted).toEqual([false]);
    });

    it('opens, closes and toggles through the model, so a binding follows', async () => {
      host.ref().open();
      await settle();
      expect(host.opened()).toBe(true);

      host.ref().toggle();
      await settle();
      expect(host.opened()).toBe(false);
      expect(host.ref().matSidenav().opened).toBe(false);

      host.ref().toggle();
      await settle();
      expect(host.opened()).toBe(true);

      host.ref().close();
      await settle();
      expect(host.opened()).toBe(false);
    });

    it('keeps an open drawer put when disableClose is set', async () => {
      host.mode.set('over');
      host.disableClose.set(true);
      host.opened.set(true);
      await settle();

      backdrop()!.click();
      await settle();

      expect(host.opened()).toBe(true);
      expect(host.ref().matSidenav().opened).toBe(true);
    });
  });

  // The rule every app hand-rolls, here once: a 360px column out of a 360px
  // viewport leaves no content, so a narrow screen gets the drawer as an overlay.
  describe('responsive', () => {
    it('observes the handset breakpoint by default', () => {
      expect(breakpoints.queries).toEqual([Breakpoints.Handset]);
    });

    it('is not compact on a wide screen, and leaves mode alone', () => {
      expect(host.ref().compact()).toBe(false);
      expect(host.ref().matSidenav().mode).toBe('side');
    });

    it('forces a side drawer to over on a narrow screen', async () => {
      breakpoints.narrow(true);
      await settle();

      expect(host.ref().compact()).toBe(true);
      expect(host.ref().mode()).toBe('side');
      expect(host.ref().matSidenav().mode).toBe('over');
      expect(await (await sidenav()).getMode()).toBe('over');
    });

    it('gives the mode back when the screen widens again', async () => {
      breakpoints.narrow(true);
      await settle();
      breakpoints.narrow(false);
      await settle();

      expect(host.ref().compact()).toBe(false);
      expect(host.ref().matSidenav().mode).toBe('side');
    });

    it('leaves an already-over drawer as it was', async () => {
      host.mode.set('over');
      breakpoints.narrow(true);
      await settle();

      expect(host.ref().matSidenav().mode).toBe('over');
    });

    // Going compact turns a column into a sheet over the content behind a scrim,
    // which the user never asked for — so it closes, through the model rather than
    // around it, and the wide layout's state is given back on the way out.
    it('closes an open drawer on the way in, and reports it through the model', async () => {
      host.opened.set(true);
      await settle();

      breakpoints.narrow(true);
      await settle();

      expect(host.opened()).toBe(false);
      expect(host.ref().matSidenav().opened).toBe(false);
    });

    it('restores the wide layout’s open state on the way out', async () => {
      host.opened.set(true);
      await settle();

      breakpoints.narrow(true);
      await settle();
      breakpoints.narrow(false);
      await settle();

      expect(host.opened()).toBe(true);
      expect(host.ref().matSidenav().opened).toBe(true);
    });

    it('leaves a closed drawer closed across the whole round trip', async () => {
      breakpoints.narrow(true);
      await settle();
      breakpoints.narrow(false);
      await settle();

      expect(host.opened()).toBe(false);
    });

    // A user who opens the drawer on a phone has not changed what the desktop
    // layout should look like, so it must not overwrite what is being held.
    it('does not let a drawer opened while compact overwrite the held state', async () => {
      host.opened.set(true);
      await settle();
      breakpoints.narrow(true);
      await settle();

      host.ref().open();
      await settle();
      expect(host.opened()).toBe(true);

      host.ref().close();
      await settle();

      breakpoints.narrow(false);
      await settle();

      expect(host.opened()).toBe(true);
    });

    it('opts out entirely when responsive is off', async () => {
      host.responsive.set(false);
      host.opened.set(true);
      breakpoints.narrow(true);
      await settle();

      expect(host.ref().compact()).toBe(false);
      expect(host.ref().matSidenav().mode).toBe('side');
      expect(host.opened()).toBe(true);
    });

    it('re-observes when the breakpoint input changes, and drops the old query', async () => {
      host.compactBreakpoint.set('(max-width: 60rem)');
      await settle();

      expect(breakpoints.queries).toEqual([Breakpoints.Handset, '(max-width: 60rem)']);

      breakpoints.narrow(true);
      await settle();

      expect(host.ref().compact()).toBe(true);
    });
  });

  describe('hasBackdrop', () => {
    // Material's own rule is "a scrim for everything that is not `side`" rather
    // than "a scrim for `over`" — `push` is modal too. Worth pinning: it is the
    // kind of thing that reads as an implementation detail right up until a `push`
    // drawer traps focus and someone calls it a bug. The `null` default is what
    // leaves the rule alone.
    it('follows the mode by default', async () => {
      host.opened.set(true);
      await settle();
      expect(backdrop()).toBeNull();

      host.mode.set('over');
      await settle();
      expect(backdrop()).not.toBeNull();

      host.mode.set('push');
      await settle();

      expect(backdrop()).not.toBeNull();
    });

    it('puts a scrim behind a side drawer when forced on', async () => {
      host.hasBackdrop.set(true);
      host.opened.set(true);
      await settle();

      expect(backdrop()).not.toBeNull();
      expect(host.ref().matSidenavContainer().hasBackdrop).toBe(true);
    });

    it('takes the scrim away from an over drawer when forced off', async () => {
      host.mode.set('over');
      host.hasBackdrop.set(false);
      host.opened.set(true);
      await settle();

      expect(backdrop()).toBeNull();
    });
  });

  describe('escape hatches', () => {
    it('exposes the component instance via exportAs', () => {
      expect(host.ref()).toBeInstanceOf(Sidenav);
    });

    // Rule 4: Material's own instances are the way out of anything not wrapped here.
    it('exposes the underlying MatSidenav and MatSidenavContainer', () => {
      expect(host.ref().matSidenav()).toBeInstanceOf(MatSidenav);
      expect(host.ref().matSidenavContainer()).toBeInstanceOf(MatSidenavContainer);
      expect(host.ref().matSidenavContainer().scrollable).toBeTruthy();
    });

    // Reaching past the wrapper still has to land back in the model, or the escape
    // hatch is a way to desync a consumer's state.
    it('reports a drawer opened on Material’s own instance back through the model', async () => {
      await host.ref().matSidenav().open();
      await settle();

      expect(host.opened()).toBe(true);
    });
  });

  // The colours are Material's, resolved from the shared theme's tokens. This
  // component only re-points those tokens at hooks whose defaults are the tokens
  // Material would have used anyway.
  describe('theming', () => {
    // These read the *declaration* rather than a painted colour, on purpose:
    // `ng test` runs in jsdom, which does not substitute `var()` at all. What the
    // sidenav resolves to under the real theme is asserted by the Storybook
    // stories, which run in Chromium.
    const declaration = (token: string) =>
      getComputedStyle(query('ui-sidenav')!).getPropertyValue(`--mat-sidenav-${token}`);

    const LITERAL = /#[0-9a-f]{3,8}\b|\brgba?\(/i;

    it('resolves the drawer from the theme, not a literal', () => {
      expect(declaration('container-background-color')).toContain(
        'var(--ui-sidenav-background-color',
      );
      expect(declaration('container-background-color')).toContain('var(--mat-sys-surface)');
      expect(declaration('container-background-color')).not.toMatch(LITERAL);
      expect(declaration('container-text-color')).toContain('var(--mat-sys-on-surface-variant)');
      expect(declaration('container-text-color')).not.toMatch(LITERAL);
    });

    it('resolves the main content from the theme, not a literal', () => {
      expect(declaration('content-background-color')).toContain(
        'var(--ui-sidenav-content-background-color',
      );
      expect(declaration('content-background-color')).toContain('var(--mat-sys-background)');
      expect(declaration('content-text-color')).toContain('var(--mat-sys-on-background)');
      expect(declaration('content-text-color')).not.toMatch(LITERAL);
    });

    it('resolves the scrim from the theme, not a literal', () => {
      expect(declaration('scrim-color')).toContain('var(--ui-sidenav-scrim-color');
      expect(declaration('scrim-color')).toContain('var(--mat-sys-neutral-variant20)');
      expect(declaration('scrim-color')).not.toMatch(LITERAL);
    });

    it('exposes the drawer’s width, shape and elevation, defaulting to M3’s own', () => {
      expect(declaration('container-width')).toContain('var(--ui-sidenav-width');
      expect(declaration('container-width')).toContain('360px');
      expect(declaration('container-shape')).toContain('var(--mat-sys-corner-large)');
      expect(declaration('container-elevation-shadow')).toContain('none');
      expect(declaration('container-divider-color')).toContain('transparent');
    });

    // The overrides are emitted on the host, which is what keeps a consumer off
    // `::ng-deep`: `--ui-sidenav-width` set by an ordinary rule on `ui-sidenav` — or
    // inherited from any ancestor — reaches the elements inside Material's template
    // by CSS's own inheritance.
    it('exposes the hooks on the host, not on Material’s internals', () => {
      expect(declaration('container-width')).not.toBe('');
      expect(
        getComputedStyle(query('mat-sidenav-container')!).getPropertyValue(
          '--mat-sidenav-container-width',
        ),
      ).toBe('');
    });
  });
});
