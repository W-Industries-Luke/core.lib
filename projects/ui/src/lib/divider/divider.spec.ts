import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatDivider } from '@angular/material/divider';
import { MatDividerHarness } from '@angular/material/divider/testing';

import { Divider, UiDividerSpacing } from './divider';

@Component({
  imports: [Divider],
  template: `
    <ui-divider #ref="uiDivider" [vertical]="vertical()" [inset]="inset()" [spacing]="spacing()" />
  `,
})
class TestHost {
  readonly vertical = signal(false);
  readonly inset = signal(false);
  readonly spacing = signal<UiDividerSpacing>('md');
  readonly ref = viewChild.required<Divider>('ref');
}

describe('Divider', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let loader: HarnessLoader;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  /** The `<ui-divider>` host — where the spacing lives. */
  const hostElement = (): HTMLElement => query('ui-divider')!;

  /** The `<mat-divider>` this component renders — the rule itself. */
  const matElement = (): HTMLElement => query('mat-divider')!;

  // The `MatDividerHarness` speaks Material's *public* test surface —
  // `getOrientation()`, `isInset()` — instead of the `mat-divider-*` class names
  // and `aria-orientation` attribute the old spec read directly. Everything the
  // harness cannot see — this library's own `ui-divider--*` host markers, the
  // theme-driven spacing scale, the `role="separator"` a11y contract — stays a
  // DOM assertion below.

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  it('renders Material’s divider rather than markup of its own', () => {
    expect(matElement()).not.toBeNull();
    expect(matElement().classList).toContain('mat-divider');
    expect(host.ref().matDivider()).toBeInstanceOf(MatDivider);
  });

  // The rule a screen reader reads is Material's, not a border of ours — which
  // only holds while the `<mat-divider>` is really there to carry it.
  it('is a separator to assistive technology, named by its orientation', async () => {
    const divider = await loader.getHarness(MatDividerHarness);
    // The `role` is Material's a11y contract the harness has no getter for, so it
    // stays a DOM read; the orientation the separator is *named* by comes off the
    // harness's `getOrientation()`, which is exactly the `aria-orientation` value.
    expect(matElement().getAttribute('role')).toBe('separator');
    expect(await divider.getOrientation()).toBe('horizontal');

    host.vertical.set(true);
    await fixture.whenStable();

    expect(await divider.getOrientation()).toBe('vertical');
  });

  describe('vertical', () => {
    it('defaults to a horizontal rule', async () => {
      expect(host.ref().vertical()).toBe(false);
      expect(await (await loader.getHarness(MatDividerHarness)).getOrientation()).toBe('horizontal');
      expect(hostElement().classList).not.toContain('ui-divider--vertical');
    });

    // Material draws the rule off its orientation, and the host class is what
    // moves the spacing onto the other axis — so both have to follow the input.
    it('reaches MatDivider and marks the host when set', async () => {
      host.vertical.set(true);
      await fixture.whenStable();

      expect(host.ref().matDivider().vertical).toBe(true);
      expect(await (await loader.getHarness(MatDividerHarness)).getOrientation()).toBe('vertical');
      expect(hostElement().classList).toContain('ui-divider--vertical');
    });

    it('goes back to horizontal when unset', async () => {
      host.vertical.set(true);
      await fixture.whenStable();
      host.vertical.set(false);
      await fixture.whenStable();

      expect(await (await loader.getHarness(MatDividerHarness)).getOrientation()).toBe('horizontal');
      expect(hostElement().classList).not.toContain('ui-divider--vertical');
    });

    // `booleanAttribute`: `<ui-divider vertical />` is the way a consumer writes
    // this, and an empty attribute string is `true` — not the truthy-string
    // accident of forwarding it raw.
    it('treats a bare attribute as true', async () => {
      @Component({ imports: [Divider], template: `<ui-divider vertical inset />` })
      class BareHost {}

      const f = TestBed.createComponent(BareHost);
      await f.whenStable();
      const divider = await TestbedHarnessEnvironment.loader(f).getHarness(MatDividerHarness);

      expect(await divider.getOrientation()).toBe('vertical');
      expect(await divider.isInset()).toBe(true);
    });
  });

  describe('inset', () => {
    it('defaults to a full-bleed rule', async () => {
      expect(host.ref().inset()).toBe(false);
      expect(await (await loader.getHarness(MatDividerHarness)).isInset()).toBe(false);
    });

    it('reaches MatDivider when set', async () => {
      host.inset.set(true);
      await fixture.whenStable();

      expect(host.ref().matDivider().inset).toBe(true);
      expect(await (await loader.getHarness(MatDividerHarness)).isInset()).toBe(true);
    });

    // The inset is an indent, not an orientation: the two are independent inputs
    // and a consumer may reasonably set both.
    it('is independent of vertical', async () => {
      host.inset.set(true);
      host.vertical.set(true);
      await fixture.whenStable();

      const divider = await loader.getHarness(MatDividerHarness);
      expect(await divider.isInset()).toBe(true);
      expect(await divider.getOrientation()).toBe('vertical');
    });
  });

  describe('spacing', () => {
    it('defaults to md', () => {
      expect(host.ref().spacing()).toBe('md');
      expect(hostElement().classList).toContain('ui-divider--spacing-md');
    });

    const steps: UiDividerSpacing[] = ['none', 'sm', 'md', 'lg'];

    for (const step of steps) {
      it(`marks the host for ${step}`, async () => {
        host.spacing.set(step);
        await fixture.whenStable();

        expect(hostElement().classList).toContain(`ui-divider--spacing-${step}`);
      });
    }

    // Two steps at once would stack two margins' worth of cascade and make the
    // rendered gap depend on rule order rather than on the input.
    it('carries exactly one step at a time', async () => {
      host.spacing.set('lg');
      await fixture.whenStable();

      const stepClasses = Array.from(hostElement().classList).filter((name) =>
        name.startsWith('ui-divider--spacing-'),
      );
      expect(stepClasses).toEqual(['ui-divider--spacing-lg']);
    });

    // The spacing is the host's, so it holds the *neighbours* apart. On the
    // `<mat-divider>` it would only move the line inside a box the same size.
    it('leaves Material’s own margin alone', async () => {
      host.spacing.set('lg');
      await fixture.whenStable();

      expect(matElement().className).not.toContain('spacing');
      expect(matElement().getAttribute('style')).toBeNull();
    });
  });

  // Rule 3 of the extensibility contract. The host is the real element here, and
  // nothing is bound to it that would overwrite what a consumer writes on it.
  it('does not swallow the attributes or classes a consumer writes', async () => {
    @Component({
      imports: [Divider],
      template: `<ui-divider id="rule" class="mine" data-testid="sep" aria-hidden="true" />`,
    })
    class AttrHost {}

    const f = TestBed.createComponent(AttrHost);
    await f.whenStable();
    const element = f.nativeElement.querySelector('ui-divider') as HTMLElement;

    expect(element.id).toBe('rule');
    expect(element.dataset['testid']).toBe('sep');
    expect(element.getAttribute('aria-hidden')).toBe('true');
    // The step classes are separate bindings rather than one `[class]`, so a
    // consumer's own class survives beside them.
    expect(element.classList).toContain('mine');
    expect(element.classList).toContain('ui-divider--spacing-md');
  });

  // The colour and width are Material's, resolved from the shared theme's tokens.
  // This component only re-points those tokens at hooks whose defaults are the
  // very tokens Material would have used anyway.
  describe('theming', () => {
    // These read the *declaration* rather than a painted colour, on purpose: `ng
    // test` runs in jsdom, which does not substitute `var()` at all. What a divider
    // resolves to under the real theme is asserted by the Storybook stories, which
    // run in Chromium.
    const declaration = (token: string) =>
      getComputedStyle(hostElement()).getPropertyValue(token);

    it('resolves the line’s colour from the theme, not a literal', () => {
      expect(declaration('--mat-divider-color')).toContain('var(--ui-divider-color');
      expect(declaration('--mat-divider-color')).toContain('var(--mat-sys-outline-variant)');
      expect(declaration('--mat-divider-color')).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(/i);
    });

    it('exposes the line’s width as a hook, defaulting to 1px', () => {
      expect(declaration('--mat-divider-width')).toContain('var(--ui-divider-width');
      expect(declaration('--mat-divider-width')).toContain('1px');
    });

    // The hooks are emitted on the host, which is what keeps a consumer off
    // `::ng-deep`: `--ui-divider-color` set by an ordinary rule on `ui-divider`
    // reaches `<mat-divider>` inside by CSS's own inheritance.
    it('exposes the hooks on the host, not on Material’s internals', () => {
      expect(declaration('--mat-divider-color')).not.toBe('');
      expect(getComputedStyle(matElement()).getPropertyValue('--mat-divider-color')).toBe('');
    });
  });

  /**
   * The spacing is only shared if it comes from the theme's scale. A literal
   * here builds, renders and passes every assertion above — and is a divider
   * that agrees with the fleet's rhythm only until the theme's changes.
   *
   * jsdom does not resolve `var()`, so a computed-style assertion cannot catch
   * that. A source-level one can, in the spirit of `theme-contract.spec.ts`.
   */
  describe('spacing comes from the theme, not from literals', () => {
    const styles = readFileSync(
      join(process.cwd(), 'projects', 'ui', 'src', 'lib', 'divider', 'divider.scss'),
      'utf8',
    );

    it('resolves every step from the theme’s spacing scale', () => {
      for (const step of ['sm', 'md', 'lg']) {
        expect(styles).toContain(`var(--ui-sys-spacing-${step})`);
      }
    });

    it('spends no length of its own on the space around the rule', () => {
      const spacing = styles
        .split('\n')
        .filter((line) => /--_ui-divider-spacing:/.test(line))
        .map((line) => line.trim());

      expect(spacing.length).toBeGreaterThanOrEqual(4);
      for (const declaration of spacing) {
        // Either the scale, or the `none` step's explicit zero.
        expect(declaration).toMatch(/var\(--ui-sys-spacing-(sm|md|lg)\)|:\s*0;/);
      }
    });
  });
});
