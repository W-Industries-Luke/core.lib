import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatProgressBarHarness } from '@angular/material/progress-bar/testing';

import { ProgressBar, UiProgressAnimationEnd, UiProgressBarMode } from './progress-bar';

@Component({
  imports: [ProgressBar],
  template: `
    <ui-progress-bar
      #ref="uiProgressBar"
      [mode]="mode()"
      [value]="value()"
      [bufferValue]="bufferValue()"
      [label]="label()"
      (animationEnd)="ended.push($event)"
    />
  `,
})
class TestHost {
  readonly mode = signal<UiProgressBarMode>('indeterminate');
  readonly value = signal(0);
  readonly bufferValue = signal(0);
  readonly label = signal<string | undefined>(undefined);
  readonly ended: UiProgressAnimationEnd[] = [];
  readonly ref = viewChild.required<ProgressBar>('ref');
}

describe('ProgressBar', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let loader: HarnessLoader;

  // The `MatProgressBarHarness` speaks Material's *public* test surface —
  // `getMode()` and `getValue()` — instead of reading the `mode` attribute and
  // `aria-valuenow` off Material's rendered markup, as the old spec did. Those
  // are Material's internal wiring: the harness exists precisely so that when
  // Material reworks how it exposes its state, this spec keeps passing rather
  // than breaking on a detail no consumer depends on. Everything the harness
  // *cannot* see — the transform Material scales the primary bar by, the buffer
  // bar's flex-basis, the live-region ARIA this component adds, its `--ui-*`
  // theme hooks and its `animationEnd` forwarding — stays a DOM or instance
  // assertion below.
  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  /** The `<ui-progress-bar>` host — the live region. */
  const hostElement = (): HTMLElement => query('ui-progress-bar')!;

  /** The `<mat-progress-bar>` this component renders — Material's progressbar. */
  const matElement = (): HTMLElement => query('mat-progress-bar')!;

  /** The element Material scales to `value`; the source of its `transitionend`. */
  const primaryBar = (): HTMLElement => query('.mdc-linear-progress__primary-bar')!;

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  it('renders Material’s progress bar rather than markup of its own', () => {
    expect(matElement()).not.toBeNull();
    expect(matElement().classList).toContain('mat-mdc-progress-bar');
    expect(host.ref().matProgressBar()).toBeInstanceOf(MatProgressBar);
  });

  describe('mode', () => {
    // Material's own default is `determinate`, so this is a deliberate
    // divergence rather than a pass-through: a bar bound to no value should read
    // as "working", not sit silently at 0%.
    it('defaults to indeterminate, unlike MatProgressBar itself', async () => {
      const bar = await loader.getHarness(MatProgressBarHarness);

      expect(host.ref().mode()).toBe('indeterminate');
      expect(host.ref().matProgressBar().mode).toBe('indeterminate');
      expect(await bar.getMode()).toBe('indeterminate');
    });

    for (const mode of ['determinate', 'indeterminate', 'buffer', 'query'] as const) {
      it(`passes ${mode} through to MatProgressBar`, async () => {
        host.mode.set(mode);
        await fixture.whenStable();

        expect(host.ref().matProgressBar().mode).toBe(mode);
        expect(await (await loader.getHarness(MatProgressBarHarness)).getMode()).toBe(mode);
      });
    }

    it('switches back to indeterminate', async () => {
      host.mode.set('determinate');
      await fixture.whenStable();
      host.mode.set('indeterminate');
      await fixture.whenStable();

      expect(await (await loader.getHarness(MatProgressBarHarness)).getMode()).toBe('indeterminate');
    });
  });

  describe('value', () => {
    it('defaults to 0', () => {
      expect(host.ref().value()).toBe(0);
    });

    // `aria-valuenow` is the whole point of determinate mode: it is what a
    // screen reader reads out, so it is what proves `value` reached Material
    // rather than just being stored on our input. The transform is what a
    // sighted user gets, so both are asserted.
    for (const value of [0, 25, 50, 75, 100]) {
      it(`reports ${value} on the progressbar in determinate mode`, async () => {
        host.mode.set('determinate');
        host.value.set(value);
        await fixture.whenStable();

        expect(host.ref().matProgressBar().value).toBe(value);
        // `getValue()` reads the same `aria-valuenow` the old assertion did — what
        // a screen reader reads out — without naming the attribute. The transform
        // is what a sighted user gets and the harness has no window onto it, so it
        // stays a DOM read.
        expect(await (await loader.getHarness(MatProgressBarHarness)).getValue()).toBe(value);
        expect(primaryBar().style.transform).toBe(`scaleX(${value / 100})`);
      });
    }

    // Material reports 0 and omits `aria-valuenow` in the two continuous modes,
    // so a consumer can keep binding a real value across a mode switch rather
    // than having to null it out.
    for (const mode of ['indeterminate', 'query'] as const) {
      it(`is not reported while ${mode}`, async () => {
        host.mode.set(mode);
        host.value.set(60);
        await fixture.whenStable();

        expect(host.ref().value()).toBe(60);
        expect(await (await loader.getHarness(MatProgressBarHarness)).getValue()).toBeNull();
      });
    }

    it('starts reporting the bound value as soon as the mode becomes determinate', async () => {
      host.value.set(60);
      await fixture.whenStable();
      expect(await (await loader.getHarness(MatProgressBarHarness)).getValue()).toBeNull();

      host.mode.set('determinate');
      await fixture.whenStable();

      expect(await (await loader.getHarness(MatProgressBarHarness)).getValue()).toBe(60);
    });

    it('clamps out-of-range values to 0–100', async () => {
      host.mode.set('determinate');
      host.value.set(140);
      await fixture.whenStable();
      expect(await (await loader.getHarness(MatProgressBarHarness)).getValue()).toBe(100);

      host.value.set(-20);
      await fixture.whenStable();
      expect(await (await loader.getHarness(MatProgressBarHarness)).getValue()).toBe(0);
    });

    // `numberAttribute` is what makes the plain attribute form work. Without it
    // the string '40' would reach Material's arithmetic and draw nothing.
    it('reads a string attribute as a number', async () => {
      @Component({
        imports: [ProgressBar],
        template: `<ui-progress-bar #ref="uiProgressBar" mode="determinate" value="40" />`,
      })
      class AttrHost {
        readonly ref = viewChild.required<ProgressBar>('ref');
      }

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();

      expect(f.componentInstance.ref().value()).toBe(40);
      const bar = await TestbedHarnessEnvironment.loader(f).getHarness(MatProgressBarHarness);
      expect(await bar.getValue()).toBe(40);
    });
  });

  describe('bufferValue', () => {
    it('defaults to 0', () => {
      expect(host.ref().bufferValue()).toBe(0);
    });

    // The buffer bar's flex-basis is the only place `bufferValue` becomes
    // visible — it has no ARIA of its own — so it is what proves the input
    // reached Material.
    for (const bufferValue of [25, 50, 75, 100]) {
      it(`sizes the buffer bar to ${bufferValue}% in buffer mode`, async () => {
        host.mode.set('buffer');
        host.value.set(20);
        host.bufferValue.set(bufferValue);
        await fixture.whenStable();

        expect(host.ref().matProgressBar().bufferValue).toBe(bufferValue);
        expect(query('.mdc-linear-progress__buffer-bar')!.style.flexBasis).toBe(`${bufferValue}%`);
      });
    }

    it('clamps out-of-range buffer values to 0–100', async () => {
      host.mode.set('buffer');
      host.bufferValue.set(140);
      await fixture.whenStable();
      expect(host.ref().matProgressBar().bufferValue).toBe(100);

      host.bufferValue.set(-20);
      await fixture.whenStable();
      expect(host.ref().matProgressBar().bufferValue).toBe(0);
    });

    // Material fills the buffer bar to 100% outside buffer mode regardless of
    // the value bound, so binding one in every mode is safe.
    it('is ignored outside buffer mode', async () => {
      host.mode.set('determinate');
      host.bufferValue.set(40);
      await fixture.whenStable();

      expect(query('.mdc-linear-progress__buffer-bar')!.style.flexBasis).toBe('100%');
    });

    it('reads a string attribute as a number', async () => {
      @Component({
        imports: [ProgressBar],
        template: `<ui-progress-bar #ref="uiProgressBar" mode="buffer" bufferValue="70" />`,
      })
      class AttrHost {
        readonly ref = viewChild.required<ProgressBar>('ref');
      }

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();

      expect(f.componentInstance.ref().bufferValue()).toBe(70);
      expect(
        f.nativeElement.querySelector('.mdc-linear-progress__buffer-bar').style.flexBasis,
      ).toBe('70%');
    });
  });

  // Material fires this off a `transitionend` on the primary bar. Dispatching
  // that event is the only way to reach it without a real browser, and it is
  // still worth reaching: the forwarding in the template is this component's
  // code, and a swallowed output leaves a consumer unable to tell when a
  // finished bar is safe to remove.
  describe('animationEnd', () => {
    const endTransition = (target: HTMLElement = primaryBar()) =>
      target.dispatchEvent(new Event('transitionend', { bubbles: true }));

    it('forwards Material’s animationEnd with the current value', async () => {
      host.mode.set('determinate');
      host.value.set(65);
      await fixture.whenStable();

      endTransition();
      await fixture.whenStable();

      expect(host.ended).toEqual([{ value: 65 }]);
    });

    it('emits once per transition', async () => {
      host.mode.set('determinate');
      host.value.set(30);
      await fixture.whenStable();
      endTransition();

      host.value.set(90);
      await fixture.whenStable();
      endTransition();
      await fixture.whenStable();

      expect(host.ended).toEqual([{ value: 30 }, { value: 90 }]);
    });

    it('emits in buffer mode too', async () => {
      host.mode.set('buffer');
      host.value.set(45);
      await fixture.whenStable();

      endTransition();
      await fixture.whenStable();

      expect(host.ended).toEqual([{ value: 45 }]);
    });

    // The continuous modes never settle on a value, so an `animationEnd` there
    // would be meaningless — Material does not emit one, and nor must we.
    for (const mode of ['indeterminate', 'query'] as const) {
      it(`does not emit in ${mode} mode`, async () => {
        host.mode.set(mode);
        host.value.set(65);
        await fixture.whenStable();

        endTransition();
        await fixture.whenStable();

        expect(host.ended).toEqual([]);
      });
    }

    it('ignores a transition on any element other than the primary bar', async () => {
      host.mode.set('determinate');
      host.value.set(65);
      await fixture.whenStable();

      endTransition(query('.mdc-linear-progress__buffer-bar')!);
      await fixture.whenStable();

      expect(host.ended).toEqual([]);
    });
  });

  // The bar is a graphic: the accessible name is the only thing a screen reader
  // user gets, so an unnamed one is a bug rather than a style choice.
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
        imports: [ProgressBar],
        template: `<ui-progress-bar aria-label="Fetching results" />`,
      })
      class AriaHost {}

      const f = TestBed.createComponent(AriaHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('ui-progress-bar').getAttribute('aria-label')).toBe(
        'Fetching results',
      );
      expect(f.nativeElement.querySelector('mat-progress-bar').getAttribute('aria-label')).toBe(
        'Fetching results',
      );
    });

    it('prefers label over aria-label when both are given', async () => {
      @Component({
        imports: [ProgressBar],
        template: `<ui-progress-bar label="Loading orders" aria-label="Fetching results" />`,
      })
      class BothHost {}

      const f = TestBed.createComponent(BothHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('ui-progress-bar').getAttribute('aria-label')).toBe(
        'Loading orders',
      );
    });
  });

  // A wrapper component must not become a place where attributes go to die: the
  // host is a real element, so everything a consumer writes on it stays on it.
  describe('native attributes reach the host', () => {
    it('does not swallow id, data-* or a consumer’s own role', async () => {
      @Component({
        imports: [ProgressBar],
        template: `
          <ui-progress-bar id="orders" role="progressbar" data-testid="pb" label="Loading" />
        `,
      })
      class AttrHost {}

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      const el = f.nativeElement.querySelector('ui-progress-bar') as HTMLElement;

      expect(el.id).toBe('orders');
      expect(el.dataset['testid']).toBe('pb');
      // A static attribute in the consumer's template outranks the static host
      // attribute, so `role="status"` is a default rather than a cage.
      expect(el.getAttribute('role')).toBe('progressbar');
    });
  });

  describe('escape hatches', () => {
    it('exposes the component instance via exportAs', () => {
      expect(host.ref()).toBeInstanceOf(ProgressBar);
    });

    // Rule 4 of the extensibility contract: Material's own instance is the way
    // out of anything this component chose not to wrap.
    it('exposes the underlying MatProgressBar instance', () => {
      expect(host.ref().matProgressBar()).toBeInstanceOf(MatProgressBar);
    });
  });

  // The bar's colours are Material's, resolved from the shared theme's tokens.
  // This component only re-points those tokens at hooks whose defaults are the
  // tokens Material would have used anyway.
  describe('theming', () => {
    // These read the *declaration* rather than a painted colour, on purpose:
    // `ng test` runs in jsdom, which does not substitute `var()` at all, and an
    // unregistered custom property's computed value keeps its `var()` references
    // unsubstituted even in a real browser. What the bar resolves to under the
    // real theme is asserted by the Storybook stories, which run in Chromium.
    //
    // The declaration is the half this component owns, and it is the half worth
    // pinning: hook → theme token, with no literal colour anywhere in the chain.
    const declaration = (token: string) =>
      getComputedStyle(hostElement()).getPropertyValue(`--mat-progress-bar-${token}`);

    it('resolves the indicator colour from the theme, not a literal', () => {
      expect(declaration('active-indicator-color')).toContain('var(--ui-progress-bar-color');
      expect(declaration('active-indicator-color')).toContain('var(--mat-sys-primary)');
      expect(declaration('active-indicator-color')).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(/i);
    });

    it('resolves the track colour from the theme, not a literal', () => {
      expect(declaration('track-color')).toContain('var(--ui-progress-bar-track-color');
      expect(declaration('track-color')).toContain('var(--mat-sys-surface-variant)');
      expect(declaration('track-color')).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(/i);
    });

    // One hook drives both heights: a fill thinner than its track is a bug
    // rather than a design, so the two must not be separately settable.
    it('drives the indicator and track heights from a single hook', () => {
      expect(declaration('active-indicator-height')).toContain('var(--ui-progress-bar-height');
      expect(declaration('track-height')).toBe(declaration('active-indicator-height'));
    });

    it('exposes the shape hook, defaulting to Material’s square bar', () => {
      expect(declaration('track-shape')).toContain('var(--ui-progress-bar-shape');
      expect(declaration('track-shape')).toContain('var(--mat-sys-corner-none)');
    });

    // The overrides are emitted on the host, which is what keeps a consumer off
    // `::ng-deep`: `--ui-progress-bar-color` set by an ordinary rule on
    // `ui-progress-bar` — or inherited from any ancestor — reaches the elements
    // inside Material's template by CSS's own inheritance, with no `!important`
    // and no wrapper.
    it('exposes the hooks on the host, not on Material’s internals', () => {
      expect(declaration('active-indicator-color')).not.toBe('');
      expect(
        getComputedStyle(matElement()).getPropertyValue(
          '--mat-progress-bar-active-indicator-color',
        ),
      ).toBe('');
    });
  });
});
