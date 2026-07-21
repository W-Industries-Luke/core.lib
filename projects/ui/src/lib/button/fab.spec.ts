import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatFabButton, MatMiniFabButton } from '@angular/material/button';

import { Fab, UiFabColor } from './fab';

@Component({
  imports: [Fab, MatFabButton],
  template: `
    <button matFab uiFab [color]="color()" aria-label="Add" #ref="uiFab">+</button>
  `,
})
class TestHost {
  readonly color = signal<UiFabColor>('primary');
  readonly ref = viewChild.required<Fab>('ref');
}

describe('Fab', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  /** The native element the consumer wrote — the directive's own host. */
  const nativeButton = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('button') as HTMLButtonElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  describe('color', () => {
    // `color` is this library's M3 theming, not Material's own API: the marker
    // class it maps onto is what `_fab.scss` re-points Material's tokens from, so
    // these are DOM assertions on the native host.
    it('defaults to primary, which needs no marker class', () => {
      expect(host.ref().color()).toBe('primary');
      expect(nativeButton().className).not.toContain('ui-fab--');
    });

    const colorClasses: [UiFabColor, string | null][] = [
      ['primary', null],
      ['accent', 'ui-fab--accent'],
      ['warn', 'ui-fab--warn'],
    ];

    for (const [color, expectedClass] of colorClasses) {
      it(`maps the ${color} color onto ${expectedClass ?? 'no class'}`, async () => {
        host.color.set(color);
        await fixture.whenStable();

        const classes = nativeButton().className;
        if (expectedClass) {
          expect(classes).toContain(expectedClass);
        } else {
          expect(classes).not.toContain('ui-fab--');
        }
      });
    }

    it('drops the previous color class when the color changes', async () => {
      host.color.set('accent');
      await fixture.whenStable();
      expect(nativeButton().className).toContain('ui-fab--accent');

      host.color.set('warn');
      await fixture.whenStable();

      expect(nativeButton().className).toContain('ui-fab--warn');
      expect(nativeButton().className).not.toContain('ui-fab--accent');
    });

    it('puts the marker class on the native button, not on a wrapper', async () => {
      host.color.set('accent');
      await fixture.whenStable();

      expect(nativeButton().classList).toContain('ui-fab--accent');
      expect(fixture.nativeElement.querySelector('ui-fab')).toBeNull();
    });
  });

  describe('exportAs', () => {
    it('exposes the directive instance to a template ref', () => {
      expect(host.ref()).toBeInstanceOf(Fab);
    });

    // Rule 4 of the extensibility contract: the underlying Material instance is
    // the escape hatch for everything this directive deliberately does not wrap.
    it('exposes the underlying MatFabButton instance for a regular FAB', () => {
      expect(host.ref().matFab).toBeInstanceOf(MatFabButton);
      expect(typeof host.ref().matFab.focus).toBe('function');
    });
  });

  // `matMiniFab` is a *different* Material component from `matFab`, so the
  // directive resolves whichever the consumer wrote — a mini FAB has to reach
  // `MatMiniFabButton`, not fall through to the throw.
  describe('mini FAB', () => {
    @Component({
      imports: [Fab, MatMiniFabButton],
      template: `<button matMiniFab uiFab color="accent" aria-label="Add" #ref="uiFab">+</button>`,
    })
    class MiniHost {
      readonly ref = viewChild.required<Fab>('ref');
    }

    it('resolves the MatMiniFabButton instance and still maps color', async () => {
      const f = TestBed.createComponent(MiniHost);
      await f.whenStable();

      expect(f.componentInstance.ref().matFab).toBeInstanceOf(MatMiniFabButton);
      expect((f.nativeElement.querySelector('button') as HTMLButtonElement).className).toContain(
        'ui-fab--accent',
      );
    });
  });

  // `extended` is Material's own input, on the same host, so it reaches
  // MatFabButton with no forwarding — the exported instance proves it took.
  describe('extended FAB', () => {
    @Component({
      imports: [Fab, MatFabButton],
      template: `<button matFab extended uiFab #ref="uiFab">Navigate</button>`,
    })
    class ExtendedHost {
      readonly ref = viewChild.required<Fab>('ref');
    }

    it('lets Material’s native extended input reach the FAB', async () => {
      const f = TestBed.createComponent(ExtendedHost);
      await f.whenStable();

      expect((f.componentInstance.ref().matFab as MatFabButton).extended).toBe(true);
    });
  });

  it('fails loudly when applied without matFab or matMiniFab', () => {
    @Component({ imports: [Fab], template: `<button uiFab aria-label="x">+</button>` })
    class Broken {}

    expect(() => TestBed.createComponent(Broken)).toThrowError(/must be applied to an element/);
  });

  describe('native attributes reach the element', () => {
    @Component({
      imports: [Fab, MatFabButton],
      template: `
        <button
          matFab
          uiFab
          aria-label="Compose"
          id="compose"
          tabindex="2"
          data-testid="compose-btn"
        >
          +
        </button>
      `,
    })
    class AttrHost {}

    it('does not swallow aria-label, id, tabindex or data-*', async () => {
      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      const button = f.nativeElement.querySelector('button') as HTMLButtonElement;

      expect(button.getAttribute('aria-label')).toBe('Compose');
      expect(button.id).toBe('compose');
      expect(button.tabIndex).toBe(2);
      expect(button.dataset['testid']).toBe('compose-btn');
    });

    it('honours the native disabled attribute', async () => {
      @Component({
        imports: [Fab, MatFabButton],
        template: `<button matFab uiFab aria-label="x" disabled>+</button>`,
      })
      class DisabledHost {}

      const f = TestBed.createComponent(DisabledHost);
      await f.whenStable();

      expect((f.nativeElement.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    });
  });
});
