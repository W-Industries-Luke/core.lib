import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconButton } from '@angular/material/button';
import { provideRouter, Router, RouterLink, RouterOutlet } from '@angular/router';

import { IconButton, UiIconButtonColor } from './icon-button';

@Component({
  imports: [IconButton, MatIconButton],
  template: `
    <button matIconButton uiIconButton [color]="color()" aria-label="Menu" #ref="uiIconButton">
      ★
    </button>
  `,
})
class TestHost {
  readonly color = signal<UiIconButtonColor>('primary');
  readonly ref = viewChild.required<IconButton>('ref');
}

/** Navigation target for the `a[uiIconButton] routerLink` test below. */
@Component({ template: `` })
class Settings {}

describe('IconButton', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  /** The native element the consumer wrote — the directive's own host. */
  const nativeButton = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('button') as HTMLButtonElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'settings', component: Settings }])],
    });

    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  describe('color', () => {
    // `color` is this library's M3 theming, not Material's own API: the marker
    // class it maps onto is what `_icon-button.scss` re-points Material's tokens
    // from, so these are DOM assertions on the native host.
    it('defaults to primary, which needs no marker class', () => {
      expect(host.ref().color()).toBe('primary');
      expect(nativeButton().className).not.toContain('ui-icon-button--');
    });

    const colorClasses: [UiIconButtonColor, string | null][] = [
      ['primary', null],
      ['accent', 'ui-icon-button--accent'],
      ['warn', 'ui-icon-button--warn'],
    ];

    for (const [color, expectedClass] of colorClasses) {
      it(`maps the ${color} color onto ${expectedClass ?? 'no class'}`, async () => {
        host.color.set(color);
        await fixture.whenStable();

        const classes = nativeButton().className;
        if (expectedClass) {
          expect(classes).toContain(expectedClass);
        } else {
          expect(classes).not.toContain('ui-icon-button--');
        }
      });
    }

    it('drops the previous color class when the color changes', async () => {
      host.color.set('accent');
      await fixture.whenStable();
      expect(nativeButton().className).toContain('ui-icon-button--accent');

      host.color.set('warn');
      await fixture.whenStable();

      expect(nativeButton().className).toContain('ui-icon-button--warn');
      expect(nativeButton().className).not.toContain('ui-icon-button--accent');
    });

    // The marker class has to land on the button itself, not on a wrapper: that
    // is what lets `_icon-button.scss` re-point Material's own tokens, and what
    // lets a consumer restyle via `button[uiIconButton]` without `::ng-deep`.
    it('puts the marker class on the native button, not on a wrapper', async () => {
      host.color.set('accent');
      await fixture.whenStable();

      expect(nativeButton().classList).toContain('ui-icon-button--accent');
      expect(fixture.nativeElement.querySelector('ui-icon-button')).toBeNull();
    });
  });

  describe('exportAs', () => {
    it('exposes the directive instance to a template ref', () => {
      expect(host.ref()).toBeInstanceOf(IconButton);
    });

    // Rule 4 of the extensibility contract: the underlying Material instance is
    // the escape hatch for everything this directive deliberately does not wrap.
    it('exposes the underlying MatIconButton instance', () => {
      expect(host.ref().matIconButton).toBeInstanceOf(MatIconButton);
      expect(typeof host.ref().matIconButton.focus).toBe('function');
    });
  });

  it('fails loudly when applied without matIconButton', () => {
    @Component({ imports: [IconButton], template: `<button uiIconButton aria-label="x">✕</button>` })
    class Broken {}

    expect(() => TestBed.createComponent(Broken)).toThrowError(/must be applied to an element/);
  });

  // --- Native behaviour is not intercepted. ---

  describe('native attributes reach the element', () => {
    @Component({
      imports: [IconButton, MatIconButton],
      template: `
        <button
          matIconButton
          uiIconButton
          aria-label="Close dialog"
          id="close"
          tabindex="3"
          data-testid="close-btn"
        >
          ✕
        </button>
      `,
    })
    class AttrHost {}

    it('does not swallow aria-label, id, tabindex or data-*', async () => {
      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      const button = f.nativeElement.querySelector('button') as HTMLButtonElement;

      expect(button.getAttribute('aria-label')).toBe('Close dialog');
      expect(button.id).toBe('close');
      expect(button.tabIndex).toBe(3);
      expect(button.dataset['testid']).toBe('close-btn');
    });

    it('honours the native disabled attribute', async () => {
      @Component({
        imports: [IconButton, MatIconButton],
        template: `<button matIconButton uiIconButton aria-label="x" disabled>✕</button>`,
      })
      class DisabledHost {}

      const f = TestBed.createComponent(DisabledHost);
      await f.whenStable();

      expect((f.nativeElement.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('a[uiIconButton] with routerLink', () => {
    @Component({
      imports: [IconButton, MatIconButton, RouterLink, RouterOutlet],
      template: `
        <a matIconButton uiIconButton routerLink="/settings" aria-label="Settings">⚙</a>
        <router-outlet />
      `,
    })
    class LinkHost {}

    it('renders an href and navigates on click', async () => {
      const f = TestBed.createComponent(LinkHost);
      await f.whenStable();
      const anchor = f.nativeElement.querySelector('a') as HTMLAnchorElement;

      expect(anchor.getAttribute('href')).toBe('/settings');

      anchor.click();
      await f.whenStable();

      expect(TestBed.inject(Router).url).toBe('/settings');
    });
  });
});
