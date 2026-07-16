import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatCard, MatCardTitle } from '@angular/material/card';
import { MatCardHarness } from '@angular/material/card/testing';

import { Card, CardActions, CardHeader, UiCardActionsAlign, UiCardAppearance } from './card';

@Component({
  imports: [Card, CardHeader, CardActions, MatCardTitle],
  template: `
    <ui-card
      #ref="uiCard"
      [appearance]="appearance()"
      [padded]="padded()"
      [actionsAlign]="actionsAlign()"
    >
      @if (showHeader()) {
        <h2 uiCardHeader matCardTitle>Shipping address</h2>
      }
      <p id="body">1 Infinite Loop, Cupertino</p>
      <!--
        One root node per @if: a control-flow block with several roots cannot
        project into a named slot (NG8011), which is Angular's rule rather than
        this component's. Two blocks is what a consumer writes too.
      -->
      @if (showActions()) {
        <button uiCardActions id="save">Save</button>
      }
      @if (showActions()) {
        <button uiCardActions id="cancel">Cancel</button>
      }
    </ui-card>
  `,
})
class TestHost {
  readonly appearance = signal<UiCardAppearance>('outlined');
  readonly padded = signal(true);
  readonly actionsAlign = signal<UiCardActionsAlign>('start');
  readonly showHeader = signal(true);
  readonly showActions = signal(true);
  readonly ref = viewChild.required<Card>('ref');
}

describe('Card', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let loader: HarnessLoader;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  /** The `<mat-card>` this component renders — the element Material styles. */
  const matCardElement = (): HTMLElement => query('mat-card')!;

  // The `MatCardHarness` speaks Material's *public* test surface —
  // `getText()`, `getTitleText()`, `getSubtitleText()` — so wherever a test only
  // needs the rendered *text* of a region it reads it through the harness rather
  // than off Material's internal `.mat-mdc-card-*` markup. Everything the harness
  // cannot see — the `mat-mdc-card-outlined` appearance treatment, this library's
  // own `.ui-card__header` slot, projection *location*, `exportAs` — stays a DOM
  // or instance assertion below.

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  describe('appearance', () => {
    it('defaults to outlined', () => {
      expect(host.ref().appearance()).toBe('outlined');
      expect(host.ref().matCard().appearance).toBe('outlined');
    });

    // These are the classes Material's own stylesheet keys the container,
    // outline and elevation off, so they are what proves the appearance reached
    // Material rather than just being stored on our input. `raised` is
    // Material's base treatment and so has no modifier class of its own.
    const appearances: [UiCardAppearance, string | null][] = [
      ['outlined', 'mat-mdc-card-outlined'],
      ['raised', null],
    ];

    for (const [appearance, expectedClass] of appearances) {
      it(`passes the ${appearance} appearance through to MatCard`, async () => {
        host.appearance.set(appearance);
        await fixture.whenStable();

        expect(host.ref().matCard().appearance).toBe(appearance);
        expect(matCardElement().classList).toContain('mat-mdc-card');
        if (expectedClass) {
          expect(matCardElement().classList).toContain(expectedClass);
        } else {
          expect(matCardElement().classList).not.toContain('mat-mdc-card-outlined');
        }
      });
    }

    it('drops the outlined treatment when switched to raised', async () => {
      expect(matCardElement().classList).toContain('mat-mdc-card-outlined');

      host.appearance.set('raised');
      await fixture.whenStable();

      expect(matCardElement().classList).not.toContain('mat-mdc-card-outlined');
      expect(matCardElement().classList).not.toContain('mdc-card--outlined');
    });

    // `filled` is Material's third appearance and is deliberately not offered.
    it('never renders the filled treatment', () => {
      expect(matCardElement().classList).not.toContain('mat-mdc-card-filled');
    });
  });

  describe('content projection', () => {
    it('projects the body into Material’s card content region', async () => {
      const body = query('mat-card-content #body');
      expect(body).not.toBeNull();
      // The content text reads through the harness's `getText()`; the projection
      // *location* stays a DOM check, since the harness cannot say which region
      // the node landed in.
      expect(await (await loader.getHarness(MatCardHarness)).getText()).toContain('1 Infinite Loop');
    });

    it('projects a header marker into the header slot', async () => {
      const header = query('.ui-card__header');
      expect(header).not.toBeNull();
      // The title text reads through `getTitleText()` — the h2 carries
      // `matCardTitle` — while the `.ui-card__header` marker is this library's own
      // slot, invisible to the harness, so it stays a DOM assertion.
      expect(await (await loader.getHarness(MatCardHarness)).getTitleText()).toContain(
        'Shipping address',
      );
    });

    // The actions have to be the *direct* children of `<mat-card-actions>`, not
    // grandchildren behind a wrapper: that flex row is what spaces and aligns
    // them, and it can only do that to its own children.
    it('projects every action marker as a direct child of the actions row', () => {
      const actions = query('mat-card-actions')!;
      const children = Array.from(actions.children).map((child) => child.id);

      expect(children).toEqual(['save', 'cancel']);
    });

    it('keeps the slots in header, body, actions order', () => {
      const regions = Array.from(matCardElement().children).map((child) =>
        child.tagName.toLowerCase(),
      );

      expect(regions).toEqual(['div', 'mat-card-content', 'mat-card-actions']);
    });
  });

  // An empty region is not free: Material's header and actions carry padding and
  // a 52px min-height, so rendering them unconditionally would leave a card with
  // no header visibly top-heavy.
  describe('empty slots collapse', () => {
    it('renders no header region when nothing is projected into it', async () => {
      host.showHeader.set(false);
      await fixture.whenStable();

      expect(query('.ui-card__header')).toBeNull();
      expect(query('mat-card-content')).not.toBeNull();
    });

    it('renders no actions region when nothing is projected into it', async () => {
      host.showActions.set(false);
      await fixture.whenStable();

      expect(query('mat-card-actions')).toBeNull();
    });

    it('renders a body-only card as a single region', async () => {
      host.showHeader.set(false);
      host.showActions.set(false);
      await fixture.whenStable();

      expect(matCardElement().children.length).toBe(1);
      expect(await (await loader.getHarness(MatCardHarness)).getText()).toContain('1 Infinite Loop');
    });

    it('brings a slot back when its content appears later', async () => {
      host.showActions.set(false);
      await fixture.whenStable();
      expect(query('mat-card-actions')).toBeNull();

      host.showActions.set(true);
      await fixture.whenStable();

      expect(query('mat-card-actions')).not.toBeNull();
      expect(query('mat-card-actions')!.children.length).toBe(2);
    });

    // The slot markers select on direct children, because that is all
    // `ng-content select` will project. A deeper marker is not projected, so it
    // must not open the region either — that would render it empty.
    it('ignores a marker that is not a direct child of ui-card', async () => {
      @Component({
        imports: [Card, CardActions],
        template: `
          <ui-card>
            <p>Body</p>
            <div><button uiCardActions>Too deep to project</button></div>
          </ui-card>
        `,
      })
      class NestedHost {}

      const f = TestBed.createComponent(NestedHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('mat-card-actions')).toBeNull();
    });
  });

  describe('padded', () => {
    it('defaults to true, and carries no flush marker', () => {
      expect(host.ref().padded()).toBe(true);
      expect(query('ui-card')!.classList).not.toContain('ui-card--flush');
    });

    it('marks the host flush when turned off', async () => {
      host.padded.set(false);
      await fixture.whenStable();

      expect(host.ref().padded()).toBe(false);
      expect(query('ui-card')!.classList).toContain('ui-card--flush');
    });

    // `booleanAttribute` is what makes the bare attribute form work. Without it,
    // `<ui-card padded>` would bind the empty string and read as falsy — the
    // opposite of what the consumer wrote.
    it('reads a bare attribute as true', async () => {
      @Component({ imports: [Card], template: `<ui-card padded #ref="uiCard">B</ui-card>` })
      class BareHost {
        readonly ref = viewChild.required<Card>('ref');
      }

      const f = TestBed.createComponent(BareHost);
      await f.whenStable();

      expect(f.componentInstance.ref().padded()).toBe(true);
      expect(f.nativeElement.querySelector('ui-card').classList).not.toContain('ui-card--flush');
    });

    it('reads the string "false" as false', async () => {
      @Component({ imports: [Card], template: `<ui-card padded="false" #ref="uiCard">B</ui-card>` })
      class StringHost {
        readonly ref = viewChild.required<Card>('ref');
      }

      const f = TestBed.createComponent(StringHost);
      await f.whenStable();

      expect(f.componentInstance.ref().padded()).toBe(false);
      expect(f.nativeElement.querySelector('ui-card').classList).toContain('ui-card--flush');
    });
  });

  describe('actionsAlign', () => {
    it('defaults to start, matching Material', () => {
      expect(host.ref().actionsAlign()).toBe('start');
      expect(query('mat-card-actions')!.classList).not.toContain('mat-mdc-card-actions-align-end');
    });

    // Without this input, right-aligning a card's buttons would need `::ng-deep`
    // on Material's own class, so pin that it reaches MatCardActions.
    it('aligns the actions to the end on request', async () => {
      host.actionsAlign.set('end');
      await fixture.whenStable();

      expect(query('mat-card-actions')!.classList).toContain('mat-mdc-card-actions-align-end');
    });

    it('goes back to start', async () => {
      host.actionsAlign.set('end');
      await fixture.whenStable();
      host.actionsAlign.set('start');
      await fixture.whenStable();

      expect(query('mat-card-actions')!.classList).not.toContain('mat-mdc-card-actions-align-end');
    });
  });

  describe('escape hatches', () => {
    it('exposes the component instance via exportAs', () => {
      expect(host.ref()).toBeInstanceOf(Card);
    });

    // Rule 4 of the extensibility contract: Material's own instance is the way
    // out of anything this component chose not to wrap.
    it('exposes the underlying MatCard instance', () => {
      expect(host.ref().matCard()).toBeInstanceOf(MatCard);
    });
  });

  // A wrapper component must not become a place where attributes go to die: the
  // host is a real element, so everything a consumer writes on it stays on it.
  describe('native attributes reach the host', () => {
    @Component({
      imports: [Card],
      template: `
        <ui-card id="address" role="region" aria-label="Shipping address" data-testid="addr">
          Body
        </ui-card>
      `,
    })
    class AttrHost {}

    it('does not swallow id, role, aria-label or data-*', async () => {
      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      const card = f.nativeElement.querySelector('ui-card') as HTMLElement;

      expect(card.id).toBe('address');
      expect(card.getAttribute('role')).toBe('region');
      expect(card.getAttribute('aria-label')).toBe('Shipping address');
      expect(card.dataset['testid']).toBe('addr');
    });
  });

  // Material's card padding (16/8) is the same distance as the fleet's `md`/`sm`
  // spacing steps, so the defaults resolve from the shared scale rather than
  // pinning literals a retuned scale could drift from. jsdom does not resolve
  // `var()`, so this is a source-level assertion, in the spirit of `ui-toolbar`'s.
  describe('padding defaults come from the spacing scale, not literals', () => {
    const styles = readFileSync(join(process.cwd(), 'projects', 'ui', 'src', 'lib', 'card', 'card.scss'), 'utf8');

    it('resolves the default padding from the theme’s `md`/`sm` steps', () => {
      expect(styles).toContain('var(--ui-card-padding, var(--ui-sys-spacing-md))');
      expect(styles).toContain('var(--ui-card-actions-padding, var(--ui-sys-spacing-sm))');
    });

    it('leaves no hardcoded 16px/8px padding default behind', () => {
      expect(styles).not.toMatch(/--ui-card-padding,\s*16px/);
      expect(styles).not.toMatch(/--ui-card-actions-padding,\s*8px/);
    });
  });
});
