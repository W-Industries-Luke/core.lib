import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatBadge } from '@angular/material/badge';
import { MatBadgeHarness } from '@angular/material/badge/testing';

import { Badge, UiBadgePosition, UiBadgeSize, UiBadgeVariant } from './badge';

@Component({
  imports: [Badge],
  template: `
    <span
      uiBadge="4"
      #ref="uiBadge"
      [variant]="variant()"
      [size]="size()"
      [uiBadgeDescription]="description()"
    >
      Inbox
    </span>
  `,
})
class TestHost {
  readonly variant = signal<UiBadgeVariant>('neutral');
  readonly size = signal<UiBadgeSize>('medium');
  readonly description = signal('');
  readonly ref = viewChild.required<Badge>('ref');
}

describe('Badge', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let loader: HarnessLoader;

  /** The native element the consumer wrote — the directive's own host. */
  const nativeHost = (): HTMLElement => fixture.nativeElement.querySelector('span') as HTMLElement;

  /** The badge Material renders inside the host. */
  const badgeElement = (): HTMLElement | undefined => host.ref().matBadge.getBadgeElement();

  // The `MatBadgeHarness` speaks Material's *public* test surface —
  // `getText()`, `getSize()`, `getPosition()`, `isOverlapping()`, `isHidden()`,
  // `isDisabled()` — instead of the `mat-badge-*` class names the old spec keyed
  // off. Those are Material's internal markup: the harness reads through them so
  // this spec keeps passing if Material renames one. Everything the harness
  // cannot see — this library's own `ui-badge--*` variant classes, the
  // description a11y wiring, `exportAs`, native-attribute forwarding — stays a
  // DOM assertion below.
  const badge = (
    f: ComponentFixture<unknown> = fixture,
    filter?: Parameters<typeof MatBadgeHarness.with>[0],
  ): Promise<MatBadgeHarness> =>
    TestbedHarnessEnvironment.loader(f).getHarness(MatBadgeHarness.with(filter ?? {}));

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  describe('content', () => {
    it('renders the uiBadge value into the badge Material creates', async () => {
      // The rendered value reads off the harness's `getText()`; the structural
      // proof that it lives in Material's badge element stays an escape-hatch read
      // via the instance's `getBadgeElement()`.
      expect(await (await loader.getHarness(MatBadgeHarness)).getText()).toBe('4');
      expect(badgeElement()?.classList).toContain('mat-badge-content');
    });

    // The whole point of the directive shape: the element the consumer wrote is
    // the element Material positions the badge against.
    it('renders the badge inside the host, not in a wrapper element', () => {
      expect(nativeHost().contains(badgeElement()!)).toBe(true);
      expect(fixture.nativeElement.querySelector('ui-badge')).toBeNull();
    });

    it('updates the rendered content when the binding changes', async () => {
      @Component({
        imports: [Badge],
        template: `<span [uiBadge]="count()">Inbox</span>`,
      })
      class CountHost {
        readonly count = signal(4);
      }

      const f = TestBed.createComponent(CountHost);
      await f.whenStable();
      const b = await badge(f);

      expect(await b.getText()).toBe('4');

      f.componentInstance.count.set(12);
      await f.whenStable();

      expect(await b.getText()).toBe('12');
    });

    // `mat-badge-hidden` is Material's own `hidden || !content`. An empty count
    // collapsing to nothing is what lets a consumer bind a real value without
    // guarding for the empty case in the template.
    it('hides the badge when the content is empty', async () => {
      @Component({
        imports: [Badge],
        template: `<span [uiBadge]="count()">Inbox</span>`,
      })
      class EmptyHost {
        readonly count = signal('');
      }

      const f = TestBed.createComponent(EmptyHost);
      await f.whenStable();
      const b = await badge(f);

      expect(await b.isHidden()).toBe(true);

      f.componentInstance.count.set('4');
      await f.whenStable();

      expect(await b.isHidden()).toBe(false);
    });
  });

  describe('variant', () => {
    // Unlike uiButton's `primary`, the default is not free: M3's badge resolves
    // to the error palette out of the box, so `neutral` must carry a class of
    // its own or an unmarked badge is red.
    it('defaults to neutral, which carries a marker class of its own', () => {
      expect(host.ref().variant()).toBe('neutral');
      expect(nativeHost().classList).toContain('ui-badge--neutral');
    });

    const variants: [UiBadgeVariant, string][] = [
      ['neutral', 'ui-badge--neutral'],
      ['success', 'ui-badge--success'],
      ['warning', 'ui-badge--warning'],
      ['danger', 'ui-badge--danger'],
    ];

    for (const [variant, expectedClass] of variants) {
      it(`maps the ${variant} variant onto ${expectedClass}`, async () => {
        host.variant.set(variant);
        await fixture.whenStable();

        expect(nativeHost().classList).toContain(expectedClass);
      });
    }

    it('drops the previous variant class when the variant changes', async () => {
      host.variant.set('success');
      await fixture.whenStable();
      expect(nativeHost().classList).toContain('ui-badge--success');

      host.variant.set('danger');
      await fixture.whenStable();

      expect(nativeHost().classList).toContain('ui-badge--danger');
      expect(nativeHost().classList).not.toContain('ui-badge--success');
    });

    // The marker class has to land on the badged element itself: that is what
    // lets `_badge.scss` re-point Material's own tokens, and what lets a
    // consumer restyle via `[uiBadge]` with no `::ng-deep`.
    it("puts the marker class on the badged element, alongside Material's own", () => {
      expect(nativeHost().classList).toContain('ui-badge');
      expect(nativeHost().classList).toContain('mat-badge');
    });

    // `matBadgeColor` is M2-only and does nothing under an M3 theme, so the
    // variant deliberately does not route through it. If a future change did,
    // the colour would silently stop working.
    it("does not route the variant through Material's M2-only color input", async () => {
      host.variant.set('danger');
      await fixture.whenStable();

      expect(nativeHost().classList).not.toContain('mat-badge-warn');
      expect(nativeHost().classList).not.toContain('mat-badge-accent');
    });
  });

  describe('size', () => {
    it('defaults to medium', async () => {
      expect(host.ref().matBadge.size).toBe('medium');
      expect(await (await badge()).getSize()).toBe('medium');
    });

    // Every size must reach MatBadge verbatim — these are the size names
    // Material itself understands, so a typo is a silently unsized badge rather
    // than a compile error. `getSize()` pins that Material really restyled for
    // each one, rather than just accepting the value — the same claim the old
    // `mat-badge-*` class assertion made.
    const sizes: UiBadgeSize[] = ['small', 'medium', 'large'];

    for (const size of sizes) {
      it(`passes the ${size} size through to MatBadge`, async () => {
        host.size.set(size);
        await fixture.whenStable();

        expect(host.ref().matBadge.size).toBe(size);
        expect(await (await badge()).getSize()).toBe(size);
      });
    }

    it('drops the previous size class when the size changes', async () => {
      host.size.set('large');
      await fixture.whenStable();
      expect(await (await badge()).getSize()).toBe('large');

      host.size.set('small');
      await fixture.whenStable();

      // `getSize()` returns a single size, so reading `small` back is also the
      // proof that `large` no longer applies.
      expect(await (await badge()).getSize()).toBe('small');
    });

    // Stock M3 renders `small` at `text-size: 0`, so the count would be
    // invisible at one of the three sizes. `_badge.scss` overrides that; the
    // content must survive the size change regardless.
    it('keeps rendering the content at the small size', async () => {
      host.size.set('small');
      await fixture.whenStable();

      const b = await badge();
      expect(await b.getText()).toBe('4');
      expect(await b.isHidden()).toBe(false);
    });
  });

  describe('Material pass-through inputs', () => {
    @Component({
      imports: [Badge],
      template: `
        <span
          uiBadge="4"
          #ref="uiBadge"
          [uiBadgePosition]="position()"
          [uiBadgeOverlap]="overlap()"
          [uiBadgeHidden]="badgeHidden()"
          [uiBadgeDisabled]="badgeDisabled()"
        >
          Inbox
        </span>
      `,
    })
    class PassThroughHost {
      readonly position = signal<UiBadgePosition>('above after');
      readonly overlap = signal(true);
      readonly badgeHidden = signal(false);
      readonly badgeDisabled = signal(false);
      readonly ref = viewChild.required<Badge>('ref');
    }

    let f: ComponentFixture<PassThroughHost>;
    let b: MatBadgeHarness;

    beforeEach(async () => {
      f = TestBed.createComponent(PassThroughHost);
      await f.whenStable();
      b = await badge(f);
    });

    it('forwards the position, so the badge can move off the default corner', async () => {
      expect(await b.getPosition()).toBe('above after');

      f.componentInstance.position.set('below before');
      await f.whenStable();

      expect(await b.getPosition()).toBe('below before');
    });

    it('forwards overlap', async () => {
      expect(await b.isOverlapping()).toBe(true);

      f.componentInstance.overlap.set(false);
      await f.whenStable();

      expect(await b.isOverlapping()).toBe(false);
    });

    it('forwards hidden', async () => {
      expect(await b.isHidden()).toBe(false);

      f.componentInstance.badgeHidden.set(true);
      await f.whenStable();

      expect(await b.isHidden()).toBe(true);
    });

    it('forwards disabled', async () => {
      expect(await b.isDisabled()).toBe(false);

      f.componentInstance.badgeDisabled.set(true);
      await f.whenStable();

      expect(await b.isDisabled()).toBe(true);
    });
  });

  describe('accessibility', () => {
    // Material renders the badge content aria-hidden, because "4" alone is
    // meaningless out of context — the description is what a screen reader
    // actually gets, so it has to reach the host.
    it('keeps the badge content out of the accessibility tree', () => {
      expect(badgeElement()?.getAttribute('aria-hidden')).toBe('true');
    });

    it('describes a non-interactive host with a visually hidden span', async () => {
      host.description.set('4 unread messages');
      await fixture.whenStable();

      const hidden = nativeHost().querySelector('.cdk-visually-hidden');
      expect(hidden?.textContent).toBe('4 unread messages');
    });

    it('describes an interactive host via aria-describedby', async () => {
      @Component({
        imports: [Badge],
        template: `<button uiBadge="4" uiBadgeDescription="4 unread messages">Inbox</button>`,
      })
      class ButtonHost {}

      const f = TestBed.createComponent(ButtonHost);
      await f.whenStable();
      const button = f.nativeElement.querySelector('button') as HTMLButtonElement;

      const describedBy = button.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();

      // The id has to resolve to real text, not merely be present.
      const description = document.getElementById(describedBy!.split(' ')[0]);
      expect(description?.textContent).toBe('4 unread messages');
    });
  });

  // --- The directive shape: native behaviour is not intercepted. -------------

  describe('native attributes reach the element', () => {
    @Component({
      imports: [Badge],
      template: `
        <a
          uiBadge="4"
          variant="danger"
          href="/inbox"
          aria-label="Inbox"
          id="inbox"
          tabindex="3"
          data-testid="inbox-link"
        >
          Inbox
        </a>
      `,
    })
    class AttrHost {}

    it('does not swallow href, aria-label, id, tabindex or data-*', async () => {
      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      const anchor = f.nativeElement.querySelector('a') as HTMLAnchorElement;

      expect(anchor.getAttribute('href')).toBe('/inbox');
      expect(anchor.getAttribute('aria-label')).toBe('Inbox');
      expect(anchor.id).toBe('inbox');
      expect(anchor.tabIndex).toBe(3);
      expect(anchor.dataset['testid']).toBe('inbox-link');
      expect(anchor.classList).toContain('ui-badge--danger');
    });
  });

  // This is why the pass-through inputs are named `uiBadgeDisabled`/
  // `uiBadgeHidden` rather than bare `disabled`/`hidden`: those are native
  // attribute names, and an input claiming them would bind the directive
  // instead of the element. Material prefixes its own for the same reason.
  describe('does not claim native attribute names', () => {
    @Component({
      imports: [Badge],
      template: `<button uiBadge="4" [disabled]="disabled()" [hidden]="hidden()">Inbox</button>`,
    })
    class NativeHost {
      readonly disabled = signal(true);
      readonly hidden = signal(true);
    }

    it('leaves native disabled and hidden bound to the element itself', async () => {
      const f = TestBed.createComponent(NativeHost);
      await f.whenStable();
      const button = f.nativeElement.querySelector('button') as HTMLButtonElement;

      // If `uiBadge` declared inputs called `disabled`/`hidden`, these bindings
      // would have been eaten by the directive and the button would be neither.
      expect(button.disabled).toBe(true);
      expect(button.hidden).toBe(true);
      // ...and the badge's own disabled state is untouched by the native one.
      expect(await (await badge(f)).isDisabled()).toBe(false);
    });
  });

  describe('exportAs', () => {
    it('exposes the directive instance to a template ref', () => {
      expect(host.ref()).toBeInstanceOf(Badge);
    });

    // Rule 4 of the extensibility contract: the underlying Material instance is
    // the escape hatch for everything this directive deliberately does not wrap.
    it('exposes the underlying MatBadge instance', () => {
      expect(host.ref().matBadge).toBeInstanceOf(MatBadge);
      expect(typeof host.ref().matBadge.getBadgeElement).toBe('function');
    });
  });
});
