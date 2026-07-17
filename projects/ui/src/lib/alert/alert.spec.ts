import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Alert, AlertIcon, AlertTitle, UiAlertVariant } from './alert';

@Component({
  imports: [Alert],
  template: `
    <ui-alert
      #ref="uiAlert"
      [variant]="variant()"
      [dismissible]="dismissible()"
      [(open)]="open"
      [icon]="icon()"
      [dismissLabel]="dismissLabel()"
      (dismissed)="onDismissed()"
    >
      Your changes have been saved.
    </ui-alert>
  `,
})
class TestHost {
  readonly variant = signal<UiAlertVariant>('info');
  readonly dismissible = signal(false);
  readonly open = signal(true);
  readonly icon = signal<string | null | undefined>(undefined);
  readonly dismissLabel = signal<string | undefined>(undefined);
  readonly ref = viewChild.required<Alert>('ref');

  /** How many times `(dismissed)` has fired — a counter rather than a spy, so
   * these specs need no mocking library. */
  dismissedCount = 0;

  onDismissed(): void {
    this.dismissedCount++;
  }
}

const VARIANTS: readonly UiAlertVariant[] = ['info', 'success', 'warning', 'error'];

describe('Alert', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  /** The `<ui-alert>` host — the banner and the live region. */
  const hostElement = (): HTMLElement => query('ui-alert')!;

  /** The leading `<mat-icon>`, or null on an alert rendering none. */
  const iconElement = (): HTMLElement | null => query('.ui-alert__icon');

  /** The dismiss button, or null while `dismissible` is false. */
  const dismissButton = (): HTMLButtonElement | null =>
    query('.ui-alert__dismiss') as HTMLButtonElement | null;

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('renders the message it is given', () => {
    expect(hostElement().textContent).toContain('Your changes have been saved.');
  });

  // Material has no inline alert, so this component owns its container — but not
  // its parts. The icon being Material's is what makes it follow the theme.
  it('composes its icon from Material rather than markup of its own', () => {
    expect(iconElement()!.tagName.toLowerCase()).toBe('mat-icon');
    expect(iconElement()!.classList).toContain('mat-icon');
  });

  describe('variant', () => {
    it('defaults to info', () => {
      expect(host.ref().variant()).toBe('info');
      expect(hostElement().classList).toContain('ui-alert--info');
    });

    // The marker class is what `alert.scss` hangs the container roles off, so a
    // missing or stale one is an alert painted as the wrong status.
    for (const variant of VARIANTS) {
      it(`marks the host for the ${variant} variant`, async () => {
        host.variant.set(variant);
        await fixture.whenStable();

        expect(hostElement().classList).toContain(`ui-alert--${variant}`);
      });
    }

    it('carries exactly one variant class at a time', async () => {
      host.variant.set('error');
      await fixture.whenStable();
      host.variant.set('success');
      await fixture.whenStable();

      const classes = [...hostElement().classList].filter((c) => c.startsWith('ui-alert--'));
      expect(classes).toEqual(['ui-alert--success']);
    });
  });

  // The icon carries the same meaning as the colour, which is what keeps the
  // variant legible to someone who cannot separate green from orange.
  describe('icon', () => {
    const EXPECTED: Record<UiAlertVariant, string> = {
      info: 'info',
      success: 'check_circle',
      warning: 'warning',
      error: 'error',
    };

    for (const variant of VARIANTS) {
      it(`leads the ${variant} variant with the ${EXPECTED[variant]} glyph`, async () => {
        host.variant.set(variant);
        await fixture.whenStable();

        expect(iconElement()!.textContent?.trim()).toBe(EXPECTED[variant]);
      });
    }

    // #121: alert is one of the two components where the icon-as-text bug surfaced.
    // jsdom applies no icon font, so this pins the structural half a regression in
    // this family would break — the leading icon is a real Material <mat-icon>
    // drawing the variant's ligature (not a <span> of prose the font never reaches),
    // and it is hidden from assistive tech so "info" is never announced as a word.
    it('renders the leading icon as a Material glyph, not ligature text', () => {
      const icon = iconElement()!;

      expect(icon.tagName.toLowerCase()).toBe('mat-icon');
      expect(icon.classList).toContain('mat-icon');
      expect(icon.textContent?.trim()).toBe('info');
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });

    it('lets a consumer name another ligature', async () => {
      host.icon.set('cloud_off');
      await fixture.whenStable();

      expect(iconElement()!.textContent?.trim()).toBe('cloud_off');
    });

    it('drops the icon entirely for an empty or null value', async () => {
      host.icon.set('');
      await fixture.whenStable();
      expect(iconElement()).toBeNull();

      host.icon.set(null);
      await fixture.whenStable();
      expect(iconElement()).toBeNull();

      // Blank is the same instruction as empty, rather than a mat-icon rendering
      // a space where the glyph should be.
      host.icon.set('   ');
      await fixture.whenStable();
      expect(iconElement()).toBeNull();
    });

    it('goes back to the variant’s own glyph when unset again', async () => {
      host.icon.set('cloud_off');
      await fixture.whenStable();
      host.icon.set(undefined);
      await fixture.whenStable();

      expect(iconElement()!.textContent?.trim()).toBe('info');
    });

    it('follows the variant when the icon is not pinned', async () => {
      host.variant.set('error');
      await fixture.whenStable();

      expect(iconElement()!.textContent?.trim()).toBe('error');
    });

    // Rule 7: a string input cannot spell an SVG, an avatar or a spinner, so the
    // slot has to win over the default rather than render beside it.
    it('lets a projected uiAlertIcon replace the variant’s icon', async () => {
      @Component({
        imports: [Alert, AlertIcon],
        template: `<ui-alert variant="error"><span uiAlertIcon id="custom">!</span>Nope</ui-alert>`,
      })
      class SlotHost {}

      const f = TestBed.createComponent(SlotHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('#custom')).not.toBeNull();
      expect(f.nativeElement.querySelector('mat-icon.ui-alert__icon')).toBeNull();
    });

    it('lets a projected uiAlertIcon win over the icon input too', async () => {
      @Component({
        imports: [Alert, AlertIcon],
        template: `<ui-alert icon="cloud_off"><span uiAlertIcon id="custom">!</span>Nope</ui-alert>`,
      })
      class SlotHost {}

      const f = TestBed.createComponent(SlotHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('#custom')).not.toBeNull();
      expect(f.nativeElement.querySelector('mat-icon.ui-alert__icon')).toBeNull();
    });

    // A decorative icon that announced itself would make a screen reader read
    // "error error" — the glyph repeats what the message already says.
    it('hides the icon from assistive technology', () => {
      expect(iconElement()!.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('title', () => {
    @Component({
      imports: [Alert, AlertTitle],
      template: `
        <ui-alert variant="error">
          <h3 uiAlertTitle>Upload failed</h3>
          The file was larger than the 10 MB limit.
        </ui-alert>
      `,
    })
    class TitleHost {}

    it('projects a title above the message', async () => {
      const f = TestBed.createComponent(TitleHost);
      await f.whenStable();

      const title = f.nativeElement.querySelector('[uiAlertTitle]');
      expect(title.textContent.trim()).toBe('Upload failed');
      // The element stays the consumer's, so the document outline stays theirs.
      expect(title.tagName.toLowerCase()).toBe('h3');
      expect(title.closest('.ui-alert__content')).not.toBeNull();
    });

    it('renders no title region when none is projected', () => {
      expect(query('[uiAlertTitle]')).toBeNull();
      expect(query('.ui-alert__content')).not.toBeNull();
    });
  });

  describe('dismissible', () => {
    it('renders no dismiss button by default', () => {
      expect(host.ref().dismissible()).toBe(false);
      expect(dismissButton()).toBeNull();
    });

    it('renders the button when set', async () => {
      host.dismissible.set(true);
      await fixture.whenStable();

      expect(dismissButton()).not.toBeNull();
    });

    // `booleanAttribute` is what makes the bare attribute form work; without it
    // `dismissible` would be the string 'false' and therefore truthy.
    it('reads the bare attribute as true', async () => {
      @Component({ imports: [Alert], template: `<ui-alert dismissible>Hi</ui-alert>` })
      class AttrHost {}

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('.ui-alert__dismiss')).not.toBeNull();
    });

    // An alert very often sits inside a form, where a bare button submits it:
    // dismissing a validation summary must not re-submit what produced it.
    it('gives the button type=button', async () => {
      host.dismissible.set(true);
      await fixture.whenStable();

      expect(dismissButton()!.type).toBe('button');
    });

    it('builds the button from Material’s icon button', async () => {
      host.dismissible.set(true);
      await fixture.whenStable();

      expect(dismissButton()!.classList).toContain('mat-mdc-icon-button');
    });

    // #121, again: the dismiss affordance is Material's `close` glyph, not the word.
    // As with the leading icon, jsdom cannot render the font, so this pins the
    // structural half — a real <mat-icon> drawing the ligature, hidden from AT so
    // the button announces its `aria-label` alone rather than "Dismiss close".
    it('draws the dismiss affordance as a hidden close glyph', async () => {
      host.dismissible.set(true);
      await fixture.whenStable();

      const icon = dismissButton()!.querySelector('mat-icon')!;

      expect(icon.tagName.toLowerCase()).toBe('mat-icon');
      expect(icon.classList).toContain('mat-icon');
      expect(icon.textContent?.trim()).toBe('close');
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });

    it('names the button Dismiss by default', async () => {
      host.dismissible.set(true);
      await fixture.whenStable();

      expect(dismissButton()!.getAttribute('aria-label')).toBe('Dismiss');
    });

    it('lets a consumer name it for what dismissing does', async () => {
      host.dismissible.set(true);
      host.dismissLabel.set('Dismiss the outage notice');
      await fixture.whenStable();

      expect(dismissButton()!.getAttribute('aria-label')).toBe('Dismiss the outage notice');
    });

    // A blank label would leave an icon-only button with no accessible name at
    // all — an axe violation, and unusable by voice control.
    it('falls back to the default name when the label is blank', async () => {
      host.dismissible.set(true);
      host.dismissLabel.set('   ');
      await fixture.whenStable();

      expect(dismissButton()!.getAttribute('aria-label')).toBe('Dismiss');
    });
  });

  describe('dismissing', () => {
    beforeEach(async () => {
      host.dismissible.set(true);
      await fixture.whenStable();
    });

    // The default has to work with no wiring: an X that visibly does nothing is
    // the failure mode `open` being a model() exists to prevent.
    it('closes the alert when the button is pressed', async () => {
      dismissButton()!.click();
      await fixture.whenStable();

      expect(host.ref().open()).toBe(false);
      expect(hostElement().classList).toContain('ui-alert--closed');
    });

    it('emits dismissed once when the button is pressed', async () => {
      dismissButton()!.click();
      await fixture.whenStable();

      expect(host.dismissedCount).toBe(1);
    });

    // `open` is a model, so closing it writes back to the consumer's own signal
    // rather than stranding them with state that disagrees with the DOM.
    it('writes the new state back through [(open)]', async () => {
      expect(host.open()).toBe(true);

      dismissButton()!.click();
      await fixture.whenStable();

      expect(host.open()).toBe(false);
    });

    // `dismissed` means *a person did this*. A programmatic close firing it would
    // make that untrue — and would loop straight back through any consumer who
    // handles `(dismissed)` by closing the alert.
    it('does not emit dismissed when closed programmatically', async () => {
      host.open.set(false);
      await fixture.whenStable();

      expect(hostElement().classList).toContain('ui-alert--closed');
      expect(host.dismissedCount).toBe(0);
    });

    it('can be re-opened after a dismissal', async () => {
      dismissButton()!.click();
      await fixture.whenStable();

      host.open.set(true);
      await fixture.whenStable();

      expect(hostElement().classList).not.toContain('ui-alert--closed');
      expect(host.dismissedCount).toBe(1);
    });

    it('is open and unmarked by default', async () => {
      expect(host.ref().open()).toBe(true);
      expect(hostElement().classList).not.toContain('ui-alert--closed');
    });
  });

  describe('accessibility', () => {
    // The whole point of the role split: `alert` interrupts a screen reader,
    // `status` waits its turn. Announcing "saved" by cutting the user off
    // mid-sentence is the misuse the ARIA spec warns about.
    const EXPECTED_ROLE: Record<UiAlertVariant, string> = {
      info: 'status',
      success: 'status',
      warning: 'alert',
      error: 'alert',
    };

    for (const variant of VARIANTS) {
      it(`announces the ${variant} variant as role=${EXPECTED_ROLE[variant]}`, async () => {
        host.variant.set(variant);
        await fixture.whenStable();

        expect(hostElement().getAttribute('role')).toBe(EXPECTED_ROLE[variant]);
      });
    }

    it('updates the role when the variant changes', async () => {
      expect(hostElement().getAttribute('role')).toBe('status');

      host.variant.set('error');
      await fixture.whenStable();
      expect(hostElement().getAttribute('role')).toBe('alert');

      host.variant.set('success');
      await fixture.whenStable();
      expect(hostElement().getAttribute('role')).toBe('status');
    });

    // Rule 3: a `role` a consumer writes has to reach the element and win. The
    // host binding would otherwise silently overwrite it.
    it('honours a role written directly on the host', async () => {
      @Component({
        imports: [Alert],
        template: `<ui-alert variant="error" role="none">Handled elsewhere</ui-alert>`,
      })
      class RoleHost {}

      const f = TestBed.createComponent(RoleHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('ui-alert').getAttribute('role')).toBe('none');
    });

    it('keeps the consumer’s role across a variant change', async () => {
      @Component({
        imports: [Alert],
        template: `<ui-alert [variant]="variant()" role="none">Handled elsewhere</ui-alert>`,
      })
      class RoleHost {
        readonly variant = signal<UiAlertVariant>('info');
      }

      const f = TestBed.createComponent(RoleHost);
      await f.whenStable();
      f.componentInstance.variant.set('error');
      await f.whenStable();

      expect(f.nativeElement.querySelector('ui-alert').getAttribute('role')).toBe('none');
    });
  });

  // A component must not become a place where attributes go to die: the host is a
  // real element, so everything a consumer writes on it stays on it.
  describe('native attributes reach the host', () => {
    it('does not swallow id, data-* or aria-*', async () => {
      @Component({
        imports: [Alert],
        template: `
          <ui-alert id="outage" data-testid="al" aria-label="Outage notice">Down</ui-alert>
        `,
      })
      class AttrHost {}

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      const el = f.nativeElement.querySelector('ui-alert') as HTMLElement;

      expect(el.id).toBe('outage');
      expect(el.dataset['testid']).toBe('al');
      expect(el.getAttribute('aria-label')).toBe('Outage notice');
    });
  });

  describe('escape hatches', () => {
    it('exposes the component instance via exportAs', () => {
      expect(host.ref()).toBeInstanceOf(Alert);
    });
  });

  // Every colour is Material's own token, re-pointed at a hook whose default is a
  // role the shared theme emits.
  describe('theming', () => {
    // These read the *declaration* rather than a painted colour, on purpose:
    // `ng test` runs in jsdom, which does not substitute `var()` at all. What the
    // container resolves to under the real theme is asserted by the Storybook
    // stories, which run in Chromium.
    const declaration = (element: Element, property: string): string =>
      getComputedStyle(element).getPropertyValue(property);

    const NO_LITERAL_COLOUR = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i;

    it('resolves the container colours from the theme, not literals', () => {
      const background = declaration(hostElement(), '--_ui-alert-background-color');
      const text = declaration(hostElement(), '--_ui-alert-text-color');

      expect(background).toContain('var(--ui-alert-background-color');
      expect(text).toContain('var(--ui-alert-text-color');
      expect(background).not.toMatch(NO_LITERAL_COLOUR);
      expect(text).not.toMatch(NO_LITERAL_COLOUR);
    });

    // The dismiss button's Material default is `on-surface-variant`, a *surface*
    // role: on a tinted container it is the one part that would not follow the
    // variant. This is Material's own token rather than a rule on its internals.
    it('re-points Material’s icon-button colour at the alert’s text colour', () => {
      expect(declaration(hostElement(), '--_ui-alert-text-color')).not.toBe('');

      host.dismissible.set(true);
      fixture.detectChanges();

      expect(declaration(dismissButton()!, '--mat-icon-button-icon-color')).toContain(
        'var(--_ui-alert-text-color)',
      );
    });

    // The hook is emitted on our own elements, which is what keeps a consumer off
    // `::ng-deep`: `--ui-alert-icon-color` set by an ordinary rule on `ui-alert`
    // reaches Material's icon by CSS's own inheritance.
    it('exposes the icon colour hook on Material’s icon token', () => {
      expect(declaration(iconElement()!, '--mat-icon-color')).toContain(
        'var(--ui-alert-icon-color',
      );
    });
  });
});
