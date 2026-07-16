import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDivider } from '@angular/material/divider';

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

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  /** The `<ui-divider>` host — where the spacing lives. */
  const hostElement = (): HTMLElement => query('ui-divider')!;

  /** The `<mat-divider>` this component renders — the rule itself. */
  const matElement = (): HTMLElement => query('mat-divider')!;

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
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
    expect(matElement().getAttribute('role')).toBe('separator');
    expect(matElement().getAttribute('aria-orientation')).toBe('horizontal');

    host.vertical.set(true);
    await fixture.whenStable();

    expect(matElement().getAttribute('aria-orientation')).toBe('vertical');
  });

  describe('vertical', () => {
    it('defaults to a horizontal rule', () => {
      expect(host.ref().vertical()).toBe(false);
      expect(matElement().classList).toContain('mat-divider-horizontal');
      expect(hostElement().classList).not.toContain('ui-divider--vertical');
    });

    // Material draws the rule off these classes, and the host class is what
    // moves the spacing onto the other axis — so both have to follow the input.
    it('reaches MatDivider and marks the host when set', async () => {
      host.vertical.set(true);
      await fixture.whenStable();

      expect(host.ref().matDivider().vertical).toBe(true);
      expect(matElement().classList).toContain('mat-divider-vertical');
      expect(matElement().classList).not.toContain('mat-divider-horizontal');
      expect(hostElement().classList).toContain('ui-divider--vertical');
    });

    it('goes back to horizontal when unset', async () => {
      host.vertical.set(true);
      await fixture.whenStable();
      host.vertical.set(false);
      await fixture.whenStable();

      expect(matElement().classList).toContain('mat-divider-horizontal');
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
      const rule = f.nativeElement.querySelector('mat-divider') as HTMLElement;

      expect(rule.classList).toContain('mat-divider-vertical');
      expect(rule.classList).toContain('mat-divider-inset');
    });
  });

  describe('inset', () => {
    it('defaults to a full-bleed rule', () => {
      expect(host.ref().inset()).toBe(false);
      expect(matElement().classList).not.toContain('mat-divider-inset');
    });

    it('reaches MatDivider when set', async () => {
      host.inset.set(true);
      await fixture.whenStable();

      expect(host.ref().matDivider().inset).toBe(true);
      expect(matElement().classList).toContain('mat-divider-inset');
    });

    // The inset is an indent, not an orientation: the two are independent inputs
    // and a consumer may reasonably set both.
    it('is independent of vertical', async () => {
      host.inset.set(true);
      host.vertical.set(true);
      await fixture.whenStable();

      expect(matElement().classList).toContain('mat-divider-inset');
      expect(matElement().classList).toContain('mat-divider-vertical');
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
