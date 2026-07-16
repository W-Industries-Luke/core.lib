import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmptyState, EmptyStateActions, EmptyStateIcon } from './empty-state';

@Component({
  imports: [EmptyState],
  template: `
    <ui-empty-state
      #ref="uiEmptyState"
      [icon]="icon()"
      [title]="title()"
      [message]="message()"
      [headingLevel]="headingLevel()"
    />
  `,
})
class TestHost {
  readonly icon = signal<string | null | undefined>('search_off');
  readonly title = signal<string | null | undefined>('No orders match your filters');
  readonly message = signal<string | null | undefined>('Try widening the date range.');
  readonly headingLevel = signal(3);
  readonly ref = viewChild.required<EmptyState>('ref');
}

describe('EmptyState', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  /** The `<ui-empty-state>` host — the centred column and the live region. */
  const hostElement = (): HTMLElement => query('ui-empty-state')!;

  /** The icon, or null on a state rendering none. */
  const iconElement = (): HTMLElement | null => query('.ui-empty-state__icon');

  const titleElement = (): HTMLElement | null => query('.ui-empty-state__title');

  const messageElement = (): HTMLElement | null => query('.ui-empty-state__message');

  const actionsRow = (): HTMLElement | null => query('.ui-empty-state__actions');

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('renders the icon, title and message it is given', () => {
    expect(iconElement()!.textContent?.trim()).toBe('search_off');
    expect(titleElement()!.textContent?.trim()).toBe('No orders match your filters');
    expect(messageElement()!.textContent?.trim()).toBe('Try widening the date range.');
  });

  // Material has no empty state, so this component owns its container — but not
  // its parts. The icon being Material's is what makes it follow the theme.
  it('composes its icon from Material rather than markup of its own', () => {
    expect(iconElement()!.tagName.toLowerCase()).toBe('mat-icon');
    expect(iconElement()!.classList).toContain('mat-icon');
  });

  describe('icon', () => {
    // No default: the glyph's whole job is to say *what* is empty, so a generic
    // one chosen by this library would be wrong more often than right.
    it('renders no icon until one is named', async () => {
      host.icon.set(undefined);
      await fixture.whenStable();

      expect(iconElement()).toBeNull();
    });

    it('renders any Material Symbols ligature', async () => {
      host.icon.set('folder_off');
      await fixture.whenStable();

      expect(iconElement()!.textContent?.trim()).toBe('folder_off');
    });

    it('drops the icon for an empty, blank or null value', async () => {
      for (const value of ['', '   ', null]) {
        host.icon.set(value);
        await fixture.whenStable();

        // Blank is the same instruction as empty, rather than a mat-icon
        // rendering a space where the glyph should be.
        expect(iconElement()).toBeNull();
      }
    });

    // A decorative icon that announced itself would have a screen reader read
    // "search off. No orders match your filters."
    it('hides the icon from assistive technology', () => {
      expect(iconElement()!.getAttribute('aria-hidden')).toBe('true');
    });

    // Rule 7: a string input cannot spell an SVG illustration or a brand mark, so
    // the slot has to win over the input rather than render beside it.
    it('lets a projected uiEmptyStateIcon replace the ligature', async () => {
      @Component({
        imports: [EmptyState, EmptyStateIcon],
        template: `<ui-empty-state icon="inbox" title="Nothing yet">
          <img uiEmptyStateIcon id="custom" src="/empty.svg" alt="" />
        </ui-empty-state>`,
      })
      class SlotHost {}

      const f = TestBed.createComponent(SlotHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('#custom')).not.toBeNull();
      expect(f.nativeElement.querySelector('mat-icon.ui-empty-state__icon')).toBeNull();
    });
  });

  describe('title', () => {
    it('renders no title when none is given', async () => {
      host.title.set(undefined);
      await fixture.whenStable();

      expect(titleElement()).toBeNull();
    });

    it('renders no title for a blank one', async () => {
      host.title.set('   ');
      await fixture.whenStable();

      expect(titleElement()).toBeNull();
    });

    // Heading navigation is how a screen reader user skims a page; a title that
    // was only a styled div would be invisible to it.
    it('marks the title as a heading', () => {
      expect(titleElement()!.getAttribute('role')).toBe('heading');
    });

    it('places the heading at level 3 by default', () => {
      expect(host.ref().headingLevel()).toBe(3);
      expect(titleElement()!.getAttribute('aria-level')).toBe('3');
    });

    // Where the title belongs in the outline is the consumer's decision: a
    // full-route empty state wants 2, one inside a dashboard card wants 4.
    it('lets a consumer place the heading in their own outline', async () => {
      host.headingLevel.set(1);
      await fixture.whenStable();
      expect(titleElement()!.getAttribute('aria-level')).toBe('1');

      host.headingLevel.set(6);
      await fixture.whenStable();
      expect(titleElement()!.getAttribute('aria-level')).toBe('6');
    });

    // `aria-level="0"` / `"9"` is not a level any screen reader can place, so a
    // bad value falls back rather than being passed through.
    it('falls back to the default for a level outside 1–6', async () => {
      for (const level of [0, 7, -1, 2.5, Number.NaN]) {
        host.headingLevel.set(level);
        await fixture.whenStable();

        expect(titleElement()!.getAttribute('aria-level')).toBe('3');
      }
    });

    // `numberAttribute` is what makes the attribute form work; without it
    // `headingLevel` would be the string '2' and fail the range check.
    it('reads the attribute form as a number', async () => {
      @Component({
        imports: [EmptyState],
        template: `<ui-empty-state title="Nothing yet" headingLevel="2" />`,
      })
      class AttrHost {}

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();

      expect(
        f.nativeElement.querySelector('.ui-empty-state__title').getAttribute('aria-level'),
      ).toBe('2');
    });
  });

  describe('message', () => {
    it('renders no message when none is given', async () => {
      host.message.set(undefined);
      await fixture.whenStable();

      expect(messageElement()).toBeNull();
    });

    it('renders no message for a blank one', async () => {
      host.message.set('   ');
      await fixture.whenStable();

      expect(messageElement()).toBeNull();
    });

    // Rule 7: a string cannot carry a link or a list, so the default slot takes
    // content the input cannot — below the message rather than instead of it.
    it('projects rich content below the message', async () => {
      @Component({
        imports: [EmptyState],
        template: `<ui-empty-state title="No results" message="Nothing matched.">
          <a id="docs" href="/docs">Read the search syntax</a>
        </ui-empty-state>`,
      })
      class ContentHost {}

      const f = TestBed.createComponent(ContentHost);
      await f.whenStable();

      const el = f.nativeElement.querySelector('ui-empty-state') as HTMLElement;
      const message = el.querySelector('.ui-empty-state__message')!;
      const link = el.querySelector('#docs')!;

      expect(link.textContent).toBe('Read the search syntax');
      // Below the message, not swallowed by it or hoisted above it.
      expect(message.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  // Every region is conditional, so a state with only some of them has no gap
  // where the rest would have been. The composition is the point of the API.
  describe('composition', () => {
    it('renders nothing but the container when given nothing', () => {
      @Component({ imports: [EmptyState], template: `<ui-empty-state />` })
      class BareHost {}

      const f = TestBed.createComponent(BareHost);
      f.detectChanges();
      const el = f.nativeElement.querySelector('ui-empty-state') as HTMLElement;

      expect(el.querySelector('.ui-empty-state__icon')).toBeNull();
      expect(el.querySelector('.ui-empty-state__title')).toBeNull();
      expect(el.querySelector('.ui-empty-state__message')).toBeNull();
      expect(el.querySelector('.ui-empty-state__actions')).toBeNull();
    });

    it('renders a title-only state', async () => {
      host.icon.set(null);
      host.message.set(null);
      await fixture.whenStable();

      expect(titleElement()).not.toBeNull();
      expect(iconElement()).toBeNull();
      expect(messageElement()).toBeNull();
    });
  });

  describe('actions', () => {
    @Component({
      imports: [EmptyState, EmptyStateActions],
      // One `@if` per action, not one around both: Angular only projects a node
      // into a `select` slot when it is the sole node of its control-flow block
      // (NG8011). That is Angular's own constraint on every `ng-content select`,
      // and it applies to `uiCardActions` and `uiAlertTitle` alike.
      template: `
        <ui-empty-state title="No orders yet">
          @if (withActions()) {
            <button uiEmptyStateActions id="primary" type="button">Add an order</button>
          }
          @if (withActions()) {
            <button uiEmptyStateActions id="secondary" type="button">Import a CSV</button>
          }
        </ui-empty-state>
      `,
    })
    class ActionHost {
      readonly withActions = signal(true);
    }

    let actionFixture: ComponentFixture<ActionHost>;

    beforeEach(async () => {
      actionFixture = TestBed.createComponent(ActionHost);
      await actionFixture.whenStable();
    });

    const row = (): HTMLElement | null =>
      actionFixture.nativeElement.querySelector('.ui-empty-state__actions');

    it('projects every marked action into the row', () => {
      const primary = actionFixture.nativeElement.querySelector('#primary');
      const secondary = actionFixture.nativeElement.querySelector('#secondary');

      // Direct children of the row, so its gap and wrapping apply to them.
      expect(primary.parentElement).toBe(row());
      expect(secondary.parentElement).toBe(row());
    });

    // The row is an element of this template, so an action-less state must not
    // pay for it — that is the whole reason it is a marker rather than a
    // catch-all slot.
    it('renders no actions row when nothing is projected', async () => {
      actionFixture.componentInstance.withActions.set(false);
      await actionFixture.whenStable();

      expect(row()).toBeNull();
    });

    it('renders no actions row on a state that projects none at all', () => {
      expect(actionsRow()).toBeNull();
    });

    // The elements stay the consumer's: the marker adds no behaviour, so a
    // (click), a routerLink or a type= keeps working.
    it('leaves the projected element the consumer’s own', () => {
      const primary = actionFixture.nativeElement.querySelector('#primary') as HTMLButtonElement;

      expect(primary.tagName.toLowerCase()).toBe('button');
      expect(primary.type).toBe('button');
    });
  });

  describe('accessibility', () => {
    // An empty state replacing a list is a change worth announcing, but "no
    // results" is a report, not an emergency — so it waits its turn rather than
    // cutting off the user who is still typing in the search box.
    it('announces itself as a polite live region', () => {
      expect(hostElement().getAttribute('role')).toBe('status');
    });

    // Rule 3: a `role` a consumer writes has to reach the element and win. The
    // host binding would otherwise silently overwrite it.
    it('honours a role written directly on the host', async () => {
      @Component({
        imports: [EmptyState],
        template: `<ui-empty-state role="none" title="Handled elsewhere" />`,
      })
      class RoleHost {}

      const f = TestBed.createComponent(RoleHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('ui-empty-state').getAttribute('role')).toBe('none');
    });

    // Angular leaves a static input attribute on the element, so `title="…"` —
    // the documented form — would otherwise hang a browser tooltip off the whole
    // column repeating the heading it already shows, and name the live region
    // after it. The attribute is a side effect of the input's name, not an
    // instruction the consumer wrote.
    it('does not leave a native title tooltip on the host', async () => {
      @Component({
        imports: [EmptyState],
        template: `<ui-empty-state title="No orders yet" message="Nothing here." />`,
      })
      class TitleHost {}

      const f = TestBed.createComponent(TitleHost);
      await f.whenStable();
      const el = f.nativeElement.querySelector('ui-empty-state') as HTMLElement;

      expect(el.getAttribute('title')).toBeNull();
      // ...and the heading it was meant for still renders.
      expect(el.querySelector('.ui-empty-state__title')!.textContent?.trim()).toBe('No orders yet');
    });
  });

  // A component must not become a place where attributes go to die: the host is a
  // real element, so everything a consumer writes on it stays on it.
  describe('native attributes reach the host', () => {
    it('does not swallow id, data-* or aria-*', async () => {
      @Component({
        imports: [EmptyState],
        template: `<ui-empty-state id="no-orders" data-testid="es" aria-label="No orders" />`,
      })
      class AttrHost {}

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      const el = f.nativeElement.querySelector('ui-empty-state') as HTMLElement;

      expect(el.id).toBe('no-orders');
      expect(el.dataset['testid']).toBe('es');
      expect(el.getAttribute('aria-label')).toBe('No orders');
    });
  });

  describe('escape hatches', () => {
    it('exposes the component instance via exportAs', () => {
      expect(host.ref()).toBeInstanceOf(EmptyState);
    });
  });

  // Every colour is an M3 role the shared theme emits, reached through a hook.
  describe('theming', () => {
    // These read the *declaration* rather than a painted colour, on purpose:
    // `ng test` runs in jsdom, which does not substitute `var()` at all. What
    // these resolve to under the real theme is asserted by the Storybook stories,
    // which run in Chromium.
    //
    // The whitespace a declaration is written with survives into its computed
    // value, so it is collapsed here: these assert which token a colour comes
    // from, not how the line it is declared on happens to be wrapped.
    const declaration = (element: Element, property: string): string =>
      getComputedStyle(element).getPropertyValue(property).replace(/\s+/g, '');

    const LITERAL_COLOUR = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i;

    it('resolves the text colours from the theme, not literals', () => {
      const title = declaration(hostElement(), '--_ui-empty-state-title-color');
      const message = declaration(hostElement(), '--_ui-empty-state-message-color');

      expect(title).toContain('var(--ui-empty-state-title-color');
      expect(title).toContain('var(--mat-sys-on-surface)');
      expect(message).toContain('var(--ui-empty-state-message-color');
      expect(message).toContain('var(--mat-sys-on-surface-variant)');
      expect(title).not.toMatch(LITERAL_COLOUR);
      expect(message).not.toMatch(LITERAL_COLOUR);
    });

    // The hook is emitted on our own element, which is what keeps a consumer off
    // `::ng-deep`: `--ui-empty-state-icon-color` set by an ordinary rule on
    // `ui-empty-state` reaches Material's icon by CSS's own inheritance.
    it('exposes the icon colour hook on Material’s own icon token', () => {
      expect(declaration(iconElement()!, '--mat-icon-color')).toContain(
        'var(--ui-empty-state-icon-color',
      );
    });
  });

  /**
   * The column gap, the actions gap and the step above the actions are on the
   * theme's `sm` step, so an empty state keeps the fleet's rhythm rather than
   * pinning `8px` of its own — the drift `--ui-sys-spacing-*` exists to prevent.
   * The 48px/24px block padding is deliberately bespoke and stays a literal.
   * jsdom does not resolve `var()`, so this is a source-level assertion, in the
   * spirit of `ui-divider`'s.
   */
  describe('spacing comes from the theme, not from literals', () => {
    const styles = readFileSync(
      join(process.cwd(), 'projects', 'ui', 'src', 'lib', 'empty-state', 'empty-state.scss'),
      'utf8',
    );

    it('resolves every gap from the theme’s `sm` step', () => {
      expect(styles).toContain('var(--ui-empty-state-gap, var(--ui-sys-spacing-sm))');
      expect(styles).toContain('var(--ui-empty-state-actions-gap, var(--ui-sys-spacing-sm))');
      expect(styles).toContain('margin-block-start: var(--ui-sys-spacing-sm)');
    });

    it('spends no bare on-grid literal on those gaps', () => {
      expect(styles).not.toMatch(/gap:\s*(?:var\([^,]+,\s*)?8px/);
      expect(styles).not.toMatch(/margin-block-start:\s*8px/);
    });
  });
});
