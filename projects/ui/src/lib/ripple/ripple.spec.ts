import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatRipple, type RippleAnimationConfig } from '@angular/material/core';

import { Ripple, UiRippleColor } from './ripple';

@Component({
  imports: [Ripple],
  template: `
    <div
      uiRipple
      #ref="uiRipple"
      [color]="color()"
      [disabled]="disabled()"
      [centered]="centered()"
      [radius]="radius()"
      [uiRippleUnbounded]="unbounded()"
      [uiRippleAnimation]="animation()"
    >
      Pressable surface
    </div>
  `,
})
class TestHost {
  readonly color = signal<UiRippleColor>('primary');
  readonly disabled = signal(false);
  readonly centered = signal(false);
  readonly radius = signal(0);
  readonly unbounded = signal(false);
  readonly animation = signal<RippleAnimationConfig>({});
  readonly ref = viewChild.required<Ripple>('ref');
}

describe('Ripple', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  /** The native element the consumer wrote — the directive's own host. */
  const nativeHost = (): HTMLElement => fixture.nativeElement.querySelector('div') as HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  describe('color', () => {
    // Unlike uiButton's `primary`, the default is not free: stock M3 paints a
    // plain ripple from the neutral `on-surface` role, so `primary` carries the
    // base class, and `_ripple.scss` re-points `--mat-ripple-color` off it.
    it('defaults to primary, carrying only the base ui-ripple class', () => {
      expect(host.ref().color()).toBe('primary');
      expect(nativeHost().classList).toContain('ui-ripple');
      expect(nativeHost().classList).not.toContain('ui-ripple--accent');
      expect(nativeHost().classList).not.toContain('ui-ripple--warn');
    });

    const variants: [UiRippleColor, string | null][] = [
      ['primary', null],
      ['accent', 'ui-ripple--accent'],
      ['warn', 'ui-ripple--warn'],
    ];

    for (const [color, expectedClass] of variants) {
      it(`maps the ${color} colour onto ${expectedClass ?? 'the base class only'}`, async () => {
        host.color.set(color);
        await fixture.whenStable();

        if (expectedClass) {
          expect(nativeHost().classList).toContain(expectedClass);
        } else {
          expect(nativeHost().classList).not.toContain('ui-ripple--accent');
          expect(nativeHost().classList).not.toContain('ui-ripple--warn');
        }
      });
    }

    it('drops the previous colour class when the colour changes', async () => {
      host.color.set('accent');
      await fixture.whenStable();
      expect(nativeHost().classList).toContain('ui-ripple--accent');

      host.color.set('warn');
      await fixture.whenStable();

      expect(nativeHost().classList).toContain('ui-ripple--warn');
      expect(nativeHost().classList).not.toContain('ui-ripple--accent');
    });

    // The marker class has to land on the ripple host itself, alongside
    // Material's own `mat-ripple`: that is what lets `_ripple.scss` re-point the
    // token, and what lets a consumer restyle via `[uiRipple]` with no `::ng-deep`.
    it("puts the marker class on the host, alongside Material's own", () => {
      expect(nativeHost().classList).toContain('ui-ripple');
      expect(nativeHost().classList).toContain('mat-ripple');
    });

    // `matRippleColor` is a literal-colour API; routing `color` through it would
    // reintroduce the hardcoded colour the theme exists to prevent. The colour is
    // resolved in CSS instead, so Material's own `color` stays untouched.
    it("does not route the colour through Material's literal color input", async () => {
      host.color.set('warn');
      await fixture.whenStable();

      expect(host.ref().matRipple.color).toBeUndefined();
    });
  });

  describe('Material ripple knobs', () => {
    it('forwards disabled to MatRipple, disabling pointer ripples', async () => {
      expect(host.ref().matRipple.disabled).toBe(false);
      expect(host.ref().matRipple.rippleDisabled).toBe(false);

      host.disabled.set(true);
      await fixture.whenStable();

      expect(host.ref().matRipple.disabled).toBe(true);
      expect(host.ref().matRipple.rippleDisabled).toBe(true);
    });

    it('forwards centered', async () => {
      expect(host.ref().matRipple.centered).toBe(false);

      host.centered.set(true);
      await fixture.whenStable();

      expect(host.ref().matRipple.centered).toBe(true);
    });

    it('forwards radius', async () => {
      expect(host.ref().matRipple.radius).toBe(0);

      host.radius.set(120);
      await fixture.whenStable();

      expect(host.ref().matRipple.radius).toBe(120);
    });

    it('forwards unbounded, which Material reflects onto its own class', async () => {
      expect(host.ref().matRipple.unbounded).toBe(false);
      expect(nativeHost().classList).not.toContain('mat-ripple-unbounded');

      host.unbounded.set(true);
      await fixture.whenStable();

      expect(host.ref().matRipple.unbounded).toBe(true);
      expect(nativeHost().classList).toContain('mat-ripple-unbounded');
    });

    it('forwards the animation config', async () => {
      const animation: RippleAnimationConfig = { enterDuration: 111, exitDuration: 222 };
      host.animation.set(animation);
      await fixture.whenStable();

      expect(host.ref().matRipple.animation).toEqual(animation);
      // ...and it reaches the config MatRipple actually launches ripples with.
      expect(host.ref().matRipple.rippleConfig.animation).toMatchObject(animation);
    });
  });

  // Manually launching a ripple is the integration proof that MatRipple is
  // genuinely wired onto the host and the container it needs is present.
  describe('launching', () => {
    it('renders a ripple element into the host on launch()', () => {
      const ref = host.ref().matRipple.launch(0, 0, { persistent: true });

      expect(nativeHost().querySelector('.mat-ripple-element')).toBeTruthy();
      expect(ref.config.persistent).toBe(true);

      ref.fadeOut();
    });

    it('carries the centered/radius config into a launched ripple', async () => {
      host.centered.set(true);
      host.radius.set(80);
      await fixture.whenStable();

      const config = host.ref().matRipple.rippleConfig;
      expect(config.centered).toBe(true);
      expect(config.radius).toBe(80);
    });
  });

  // --- The directive shape: native behaviour is not intercepted. -------------

  describe('native attributes reach the element', () => {
    @Component({
      imports: [Ripple],
      template: `
        <div
          uiRipple
          color="accent"
          role="button"
          aria-label="Open"
          id="tile"
          tabindex="0"
          data-testid="tile"
        >
          Tile
        </div>
      `,
    })
    class AttrHost {}

    it('does not swallow role, aria-label, id, tabindex or data-*', async () => {
      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      const el = f.nativeElement.querySelector('div') as HTMLElement;

      expect(el.getAttribute('role')).toBe('button');
      expect(el.getAttribute('aria-label')).toBe('Open');
      expect(el.id).toBe('tile');
      expect(el.tabIndex).toBe(0);
      expect(el.dataset['testid']).toBe('tile');
      expect(el.classList).toContain('ui-ripple--accent');
    });
  });

  describe('exportAs', () => {
    it('exposes the directive instance to a template ref', () => {
      expect(host.ref()).toBeInstanceOf(Ripple);
    });

    // Rule 4 of the extensibility contract: the underlying Material instance is
    // the escape hatch for everything this directive deliberately does not wrap —
    // `launch()`, `fadeOutAll()`, and the literal-colour `color` input.
    it('exposes the underlying MatRipple instance', () => {
      expect(host.ref().matRipple).toBeInstanceOf(MatRipple);
      expect(typeof host.ref().matRipple.launch).toBe('function');
      expect(typeof host.ref().matRipple.fadeOutAll).toBe('function');
    });
  });
});
