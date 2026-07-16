import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatProgressSpinnerHarness } from '@angular/material/progress-spinner/testing';

import { Spinner, UiSpinnerMode } from './spinner';

@Component({
  imports: [Spinner],
  template: `
    <ui-spinner
      #ref="uiSpinner"
      [mode]="mode()"
      [value]="value()"
      [diameter]="diameter()"
      [strokeWidth]="strokeWidth()"
      [label]="label()"
    />
  `,
})
class TestHost {
  readonly mode = signal<UiSpinnerMode>('indeterminate');
  readonly value = signal(0);
  readonly diameter = signal(40);
  readonly strokeWidth = signal<number | undefined>(undefined);
  readonly label = signal<string | undefined>(undefined);
  readonly ref = viewChild.required<Spinner>('ref');
}

describe('Spinner', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let loader: HarnessLoader;

  // The `MatProgressSpinnerHarness` speaks Material's *public* test surface —
  // `getMode()` and `getValue()` — instead of reading the `mode` attribute and
  // `aria-valuenow` off Material's rendered markup, as the old spec did. Those
  // are Material's internal wiring: the harness exists precisely so that when
  // Material reworks how it exposes its state, this spec keeps passing rather
  // than breaking on a detail no consumer depends on. Everything the harness
  // *cannot* see — the SVG diameter and stroke width, the live-region ARIA this
  // component adds, and its `--ui-*` theme hooks — stays a DOM or instance
  // assertion below.
  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  /** The `<ui-spinner>` host — the live region. */
  const hostElement = (): HTMLElement => query('ui-spinner')!;

  /** The `<mat-progress-spinner>` this component renders — Material's progressbar. */
  const matElement = (): HTMLElement => query('mat-progress-spinner')!;

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  it('renders Material’s spinner rather than markup of its own', () => {
    expect(matElement()).not.toBeNull();
    expect(matElement().classList).toContain('mat-mdc-progress-spinner');
    expect(host.ref().matProgressSpinner()).toBeInstanceOf(MatProgressSpinner);
  });

  describe('mode', () => {
    it('defaults to indeterminate', async () => {
      const spinner = await loader.getHarness(MatProgressSpinnerHarness);

      expect(host.ref().mode()).toBe('indeterminate');
      expect(host.ref().matProgressSpinner().mode).toBe('indeterminate');
      expect(await spinner.getMode()).toBe('indeterminate');
    });

    it('passes determinate through to MatProgressSpinner', async () => {
      host.mode.set('determinate');
      await fixture.whenStable();

      expect(host.ref().matProgressSpinner().mode).toBe('determinate');
      expect(await (await loader.getHarness(MatProgressSpinnerHarness)).getMode()).toBe(
        'determinate',
      );
    });

    it('switches back to indeterminate', async () => {
      host.mode.set('determinate');
      await fixture.whenStable();
      host.mode.set('indeterminate');
      await fixture.whenStable();

      expect(await (await loader.getHarness(MatProgressSpinnerHarness)).getMode()).toBe(
        'indeterminate',
      );
    });
  });

  describe('value', () => {
    it('defaults to 0', () => {
      expect(host.ref().value()).toBe(0);
    });

    // `aria-valuenow` is the whole point of determinate mode: it is what a
    // screen reader reads out, so it is what proves `value` reached Material
    // rather than just being stored on our input.
    for (const value of [0, 25, 50, 75, 100]) {
      it(`reports ${value} on the progressbar in determinate mode`, async () => {
        host.mode.set('determinate');
        host.value.set(value);
        await fixture.whenStable();

        expect(host.ref().matProgressSpinner().value).toBe(value);
        // `getValue()` reads the same `aria-valuenow` the old assertion did — what
        // a screen reader reads out — without naming the attribute.
        expect(await (await loader.getHarness(MatProgressSpinnerHarness)).getValue()).toBe(value);
      });
    }

    // Material reports 0 and omits `aria-valuenow` while indeterminate, so a
    // consumer can keep binding a real value across a mode switch rather than
    // having to null it out.
    it('is not reported while indeterminate', async () => {
      host.value.set(60);
      await fixture.whenStable();

      expect(host.ref().value()).toBe(60);
      expect(await (await loader.getHarness(MatProgressSpinnerHarness)).getValue()).toBeNull();
    });

    it('starts reporting the bound value as soon as the mode becomes determinate', async () => {
      host.value.set(60);
      await fixture.whenStable();
      expect(await (await loader.getHarness(MatProgressSpinnerHarness)).getValue()).toBeNull();

      host.mode.set('determinate');
      await fixture.whenStable();

      expect(await (await loader.getHarness(MatProgressSpinnerHarness)).getValue()).toBe(60);
    });

    it('clamps out-of-range values to 0–100', async () => {
      host.mode.set('determinate');
      host.value.set(140);
      await fixture.whenStable();
      expect(await (await loader.getHarness(MatProgressSpinnerHarness)).getValue()).toBe(100);

      host.value.set(-20);
      await fixture.whenStable();
      expect(await (await loader.getHarness(MatProgressSpinnerHarness)).getValue()).toBe(0);
    });

    // `numberAttribute` is what makes the plain attribute form work. Without it
    // the string '40' would reach Material's arithmetic and draw nothing.
    it('reads a string attribute as a number', async () => {
      @Component({
        imports: [Spinner],
        template: `<ui-spinner #ref="uiSpinner" mode="determinate" value="40" />`,
      })
      class AttrHost {
        readonly ref = viewChild.required<Spinner>('ref');
      }

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();

      expect(f.componentInstance.ref().value()).toBe(40);
      const spinner = await TestbedHarnessEnvironment.loader(f).getHarness(
        MatProgressSpinnerHarness,
      );
      expect(await spinner.getValue()).toBe(40);
    });
  });

  describe('diameter', () => {
    it('defaults to 40', () => {
      expect(host.ref().diameter()).toBe(40);
      expect(host.ref().matProgressSpinner().diameter).toBe(40);
      expect(matElement().style.width).toBe('40px');
      expect(matElement().style.height).toBe('40px');
    });

    for (const diameter of [16, 24, 32, 40, 64, 96]) {
      it(`sizes the spinner to ${diameter}px`, async () => {
        host.diameter.set(diameter);
        await fixture.whenStable();

        expect(host.ref().matProgressSpinner().diameter).toBe(diameter);
        expect(matElement().style.width).toBe(`${diameter}px`);
        expect(matElement().style.height).toBe(`${diameter}px`);
      });
    }

    it('reads a string attribute as a number', async () => {
      @Component({ imports: [Spinner], template: `<ui-spinner #ref="uiSpinner" diameter="24" />` })
      class AttrHost {
        readonly ref = viewChild.required<Spinner>('ref');
      }

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();

      expect(f.componentInstance.ref().diameter()).toBe(24);
      expect(f.nativeElement.querySelector('mat-progress-spinner').style.width).toBe('24px');
    });
  });

  describe('strokeWidth', () => {
    // Material's own default is diameter/10, but only while its input is never
    // bound — its setter turns `undefined` into 0. This component always binds
    // it, so the default has to be reproduced rather than deferred to, and these
    // are what catch a 0-width (invisible) arc if that ever regresses.
    it('defaults to a tenth of the diameter', () => {
      expect(host.ref().strokeWidth()).toBeUndefined();
      expect(host.ref().matProgressSpinner().strokeWidth).toBe(4);
    });

    it('keeps the ratio when the diameter changes', async () => {
      host.diameter.set(96);
      await fixture.whenStable();

      expect(host.ref().matProgressSpinner().strokeWidth).toBe(9.6);
    });

    it('lets a consumer override it', async () => {
      host.strokeWidth.set(8);
      await fixture.whenStable();

      expect(host.ref().matProgressSpinner().strokeWidth).toBe(8);
    });

    it('goes back to the ratio when unset again', async () => {
      host.strokeWidth.set(8);
      await fixture.whenStable();
      host.strokeWidth.set(undefined);
      await fixture.whenStable();

      expect(host.ref().matProgressSpinner().strokeWidth).toBe(4);
    });
  });

  // The spinner is a graphic: the accessible name is the only thing a screen
  // reader user gets, so an unnamed one is a bug rather than a style choice.
  describe('accessibility', () => {
    it('makes the host a status live region', () => {
      expect(hostElement().getAttribute('role')).toBe('status');
    });

    it('keeps Material’s progressbar role on the inner element', () => {
      expect(matElement().getAttribute('role')).toBe('progressbar');
      expect(matElement().getAttribute('aria-valuemin')).toBe('0');
      expect(matElement().getAttribute('aria-valuemax')).toBe('100');
    });

    it('names both the live region and the progressbar from label', async () => {
      host.label.set('Loading orders');
      await fixture.whenStable();

      expect(hostElement().getAttribute('aria-label')).toBe('Loading orders');
      expect(matElement().getAttribute('aria-label')).toBe('Loading orders');
    });

    it('updates the name when label changes', async () => {
      host.label.set('Loading orders');
      await fixture.whenStable();
      host.label.set('Saving');
      await fixture.whenStable();

      expect(hostElement().getAttribute('aria-label')).toBe('Saving');
      expect(matElement().getAttribute('aria-label')).toBe('Saving');
    });

    it('falls back to a generic name when label is unset', () => {
      expect(host.ref().label()).toBeUndefined();
      expect(hostElement().getAttribute('aria-label')).toBe('Loading');
      expect(matElement().getAttribute('aria-label')).toBe('Loading');
    });

    // A blank label would leave an anonymous status region and an anonymous
    // progressbar — an axe violation on every story. There is no way to spell
    // "no name" here, and that is deliberate.
    it('falls back to a generic name when label is blank', async () => {
      host.label.set('   ');
      await fixture.whenStable();

      expect(hostElement().getAttribute('aria-label')).toBe('Loading');
    });

    // Rule 3 of the extensibility contract: `aria-*` has to reach the element
    // and work. The host binding would otherwise overwrite whatever a consumer
    // wrote, silently leaving them with the generic fallback.
    it('honours an aria-label written directly on the host', async () => {
      @Component({
        imports: [Spinner],
        template: `<ui-spinner aria-label="Fetching results" />`,
      })
      class AriaHost {}

      const f = TestBed.createComponent(AriaHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('ui-spinner').getAttribute('aria-label'))
        .toBe('Fetching results');
      expect(f.nativeElement.querySelector('mat-progress-spinner').getAttribute('aria-label'))
        .toBe('Fetching results');
    });

    it('prefers label over aria-label when both are given', async () => {
      @Component({
        imports: [Spinner],
        template: `<ui-spinner label="Loading orders" aria-label="Fetching results" />`,
      })
      class BothHost {}

      const f = TestBed.createComponent(BothHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('ui-spinner').getAttribute('aria-label'))
        .toBe('Loading orders');
    });
  });

  // A wrapper component must not become a place where attributes go to die: the
  // host is a real element, so everything a consumer writes on it stays on it.
  describe('native attributes reach the host', () => {
    it('does not swallow id, data-* or a consumer’s own role', async () => {
      @Component({
        imports: [Spinner],
        template: `<ui-spinner id="orders" role="progressbar" data-testid="sp" label="Loading" />`,
      })
      class AttrHost {}

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      const el = f.nativeElement.querySelector('ui-spinner') as HTMLElement;

      expect(el.id).toBe('orders');
      expect(el.dataset['testid']).toBe('sp');
      // A static attribute in the consumer's template outranks the static host
      // attribute, so `role="status"` is a default rather than a cage.
      expect(el.getAttribute('role')).toBe('progressbar');
    });
  });

  describe('escape hatches', () => {
    it('exposes the component instance via exportAs', () => {
      expect(host.ref()).toBeInstanceOf(Spinner);
    });

    // Rule 4 of the extensibility contract: Material's own instance is the way
    // out of anything this component chose not to wrap.
    it('exposes the underlying MatProgressSpinner instance', () => {
      expect(host.ref().matProgressSpinner()).toBeInstanceOf(MatProgressSpinner);
    });
  });

  // The arc's colour is Material's, resolved from the shared theme's tokens.
  // This component only re-points that token at a hook whose default is the
  // token Material would have used anyway.
  describe('theming', () => {
    // These read the *declaration* rather than a painted colour, on purpose:
    // `ng test` runs in jsdom, which does not substitute `var()` at all, and an
    // unregistered custom property's computed value keeps its `var()` references
    // unsubstituted even in a real browser. What the arc resolves to under the
    // real theme is asserted by the Storybook stories, which run in Chromium.
    //
    // The declaration is the half this component owns, and it is the half worth
    // pinning: hook → theme token, with no literal colour anywhere in the chain.
    it('resolves the arc colour from the theme, not a literal', () => {
      const token = getComputedStyle(hostElement()).getPropertyValue(
        '--mat-progress-spinner-active-indicator-color',
      );

      expect(token).toContain('var(--ui-spinner-color');
      expect(token).toContain('var(--mat-sys-primary)');
      expect(token).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(/i);
    });

    // The override is emitted on the host, which is what keeps a consumer off
    // `::ng-deep`: `--ui-spinner-color` set by an ordinary rule on `ui-spinner`
    // — or inherited from any ancestor — reaches the SVG inside Material's
    // template by CSS's own inheritance, with no `!important` and no wrapper.
    it('exposes the arc colour hook on the host, not on Material’s internals', () => {
      expect(
        getComputedStyle(hostElement()).getPropertyValue(
          '--mat-progress-spinner-active-indicator-color',
        ),
      ).not.toBe('');
      expect(
        getComputedStyle(matElement()).getPropertyValue(
          '--mat-progress-spinner-active-indicator-color',
        ),
      ).toBe('');
    });
  });
});
