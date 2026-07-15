import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButton } from '@angular/material/button';
import { provideRouter, Router, RouterLink, RouterOutlet } from '@angular/router';

import { Button, UiButtonColor, UiButtonVariant } from './button';

@Component({
  imports: [Button, MatButton],
  template: `
    <button matButton uiButton [variant]="variant()" [color]="color()" #ref="uiButton">
      Save changes
    </button>
  `,
})
class TestHost {
  readonly variant = signal<UiButtonVariant>('filled');
  readonly color = signal<UiButtonColor>('primary');
  readonly ref = viewChild.required<Button>('ref');
}

/** Navigation target for the `a[uiButton] routerLink` test below. */
@Component({ template: `` })
class Settings {}

describe('Button', () => {
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

  describe('variant', () => {
    it('defaults to filled', () => {
      expect(host.ref().variant()).toBe('filled');
      expect(host.ref().matButton.appearance).toBe('filled');
    });

    // Every variant must reach MatButton verbatim — these are the appearance
    // names Material itself understands, so a typo is a silently unstyled button
    // rather than a compile error. The class assertion pins that Material really
    // restyles for each one, rather than just accepting the value.
    const variants: [UiButtonVariant, string][] = [
      ['filled', 'mat-mdc-unelevated-button'],
      ['outlined', 'mat-mdc-outlined-button'],
      ['text', 'mat-mdc-button'],
      ['elevated', 'mat-mdc-raised-button'],
      ['tonal', 'mat-tonal-button'],
    ];

    for (const [variant, appearanceClass] of variants) {
      it(`passes the ${variant} variant through to MatButton`, async () => {
        host.variant.set(variant);
        await fixture.whenStable();

        expect(host.ref().matButton.appearance).toBe(variant);
        expect(nativeButton().classList).toContain(appearanceClass);
      });
    }

    // `matButton` is itself an input alias for MatButton's appearance, so both
    // attributes can express one. `variant` is documented as the source of
    // truth; pin that, so the precedence is a decision rather than an accident
    // of whether an effect or an input binding ran last.
    it('wins over an appearance set on matButton directly', async () => {
      @Component({
        imports: [Button, MatButton],
        template: `<button matButton="outlined" uiButton variant="tonal">Save</button>`,
      })
      class ConflictHost {}

      const f = TestBed.createComponent(ConflictHost);
      await f.whenStable();
      const button = f.nativeElement.querySelector('button') as HTMLButtonElement;

      expect(button.classList).toContain('mat-tonal-button');
      expect(button.classList).not.toContain('mat-mdc-outlined-button');
    });
  });

  describe('color', () => {
    it('defaults to primary, which needs no marker class', () => {
      expect(host.ref().color()).toBe('primary');
      expect(nativeButton().className).not.toContain('ui-button--');
    });

    const colorClasses: [UiButtonColor, string | null][] = [
      ['primary', null],
      ['accent', 'ui-button--accent'],
      ['warn', 'ui-button--warn'],
    ];

    for (const [color, expectedClass] of colorClasses) {
      it(`maps the ${color} color onto ${expectedClass ?? 'no class'}`, async () => {
        host.color.set(color);
        await fixture.whenStable();

        const classes = nativeButton().className;
        if (expectedClass) {
          expect(classes).toContain(expectedClass);
        } else {
          expect(classes).not.toContain('ui-button--');
        }
      });
    }

    it('drops the previous color class when the color changes', async () => {
      host.color.set('accent');
      await fixture.whenStable();
      expect(nativeButton().className).toContain('ui-button--accent');

      host.color.set('warn');
      await fixture.whenStable();

      expect(nativeButton().className).toContain('ui-button--warn');
      expect(nativeButton().className).not.toContain('ui-button--accent');
    });

    // The marker class has to land on the button itself, not on some ancestor:
    // that is what lets `_button.scss` re-point Material's own tokens, and what
    // lets a consumer restyle via `button[uiButton]` without `::ng-deep`.
    it('puts the marker class on the native button, not on a wrapper', async () => {
      host.color.set('accent');
      await fixture.whenStable();

      expect(nativeButton().classList).toContain('ui-button--accent');
      expect(fixture.nativeElement.querySelector('ui-button')).toBeNull();
    });
  });

  describe('exportAs', () => {
    it('exposes the directive instance to a template ref', () => {
      expect(host.ref()).toBeInstanceOf(Button);
    });

    // Rule 4 of the extensibility contract: the underlying Material instance is
    // the escape hatch for everything this directive deliberately does not wrap.
    it('exposes the underlying MatButton instance', () => {
      expect(host.ref().matButton).toBeInstanceOf(MatButton);
      expect(typeof host.ref().matButton.focus).toBe('function');
    });
  });

  it('fails loudly when applied without matButton', () => {
    @Component({ imports: [Button], template: `<button uiButton>Nope</button>` })
    class Broken {}

    expect(() => TestBed.createComponent(Broken)).toThrowError(/must be applied to an element/);
  });

  // --- The whole point of the rewrite: native behaviour is not intercepted. ---

  describe('native attributes reach the element', () => {
    @Component({
      imports: [Button, MatButton],
      template: `
        <button
          matButton
          uiButton
          aria-label="Close dialog"
          id="close"
          name="action"
          value="close"
          tabindex="3"
          data-testid="close-btn"
        >
          ✕
        </button>
      `,
    })
    class AttrHost {}

    it('does not swallow aria-label, id, name, value, tabindex or data-*', async () => {
      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      const button = f.nativeElement.querySelector('button') as HTMLButtonElement;

      expect(button.getAttribute('aria-label')).toBe('Close dialog');
      expect(button.id).toBe('close');
      expect(button.name).toBe('action');
      expect(button.value).toBe('close');
      expect(button.tabIndex).toBe(3);
      expect(button.dataset['testid']).toBe('close-btn');
    });
  });

  describe('native type, disabled and click', () => {
    @Component({
      imports: [Button, MatButton],
      template: `
        <form id="editor" (submit)="onSubmit($event)"></form>
        <button matButton uiButton form="editor" type="submit" (click)="clicks.set(clicks() + 1)">
          Save
        </button>
        <button matButton uiButton type="button" [disabled]="disabled()">Cancel</button>
      `,
    })
    class FormHost {
      readonly disabled = signal(false);
      readonly clicks = signal(0);
      readonly submits = signal(0);
      onSubmit(event: Event) {
        event.preventDefault();
        this.submits.set(this.submits() + 1);
      }
    }

    let f: ComponentFixture<FormHost>;
    let submit: HTMLButtonElement;
    let cancel: HTMLButtonElement;

    beforeEach(async () => {
      f = TestBed.createComponent(FormHost);
      await f.whenStable();
      [submit, cancel] = Array.from(
        f.nativeElement.querySelectorAll('button'),
      ) as HTMLButtonElement[];
    });

    // `form="editor"` associates a button with a form it is not nested in — a
    // native feature the old wrapper could not forward at all.
    it('submits the form it is associated with by id', async () => {
      submit.click();
      await f.whenStable();

      expect(f.componentInstance.submits()).toBe(1);
      expect(submit.type).toBe('submit');
    });

    it('emits native click, with no `clicked` output to subscribe to', async () => {
      submit.click();
      await f.whenStable();

      expect(f.componentInstance.clicks()).toBe(1);
    });

    it('honours the native disabled attribute', async () => {
      expect(cancel.disabled).toBe(false);

      f.componentInstance.disabled.set(true);
      await f.whenStable();

      expect(cancel.disabled).toBe(true);
      // A disabled native button suppresses clicks with no guard of our own.
      cancel.click();
      await f.whenStable();
      expect(f.componentInstance.clicks()).toBe(0);
    });
  });

  describe('a[uiButton] with routerLink', () => {
    @Component({
      imports: [Button, MatButton, RouterLink, RouterOutlet],
      template: `
        <a matButton uiButton variant="outlined" routerLink="/settings">Settings</a>
        <router-outlet />
      `,
    })
    class LinkHost {}

    it('renders an href and navigates on click', async () => {
      const f = TestBed.createComponent(LinkHost);
      await f.whenStable();
      const anchor = f.nativeElement.querySelector('a') as HTMLAnchorElement;

      // routerLink resolving to an href is the proof: the old wrapper put the
      // attribute on <ui-button>, where RouterLink never saw a real anchor.
      expect(anchor.getAttribute('href')).toBe('/settings');
      expect(anchor.classList).toContain('mat-mdc-outlined-button');

      anchor.click();
      await f.whenStable();

      expect(TestBed.inject(Router).url).toBe('/settings');
    });
  });
});
