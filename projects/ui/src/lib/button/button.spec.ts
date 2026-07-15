import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatButton } from '@angular/material/button';

import { Button, UiButtonColor, UiButtonVariant } from './button';

describe('Button', () => {
  let fixture: ComponentFixture<Button>;
  let component: Button;

  /** The `<button matButton>` that `ui-button` wraps. */
  const nativeButton = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('button') as HTMLButtonElement;

  /** The MatButton instance driving that button. */
  const matButton = (): MatButton =>
    fixture.debugElement.query(By.directive(MatButton)).injector.get(MatButton);

  const setInputs = async (inputs: Record<string, unknown>) => {
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Button] }).compileComponents();

    fixture = TestBed.createComponent(Button);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  describe('variant', () => {
    it('defaults to filled', () => {
      expect(component.variant()).toBe('filled');
      expect(matButton().appearance).toBe('filled');
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
        await setInputs({ variant });

        expect(matButton().appearance).toBe(variant);
        expect(nativeButton().classList).toContain(appearanceClass);
      });
    }
  });

  describe('color', () => {
    it('defaults to primary, which needs no marker class', () => {
      expect(component.color()).toBe('primary');
      expect(fixture.nativeElement.className).not.toContain('ui-button--');
    });

    const colorClasses: [UiButtonColor, string | null][] = [
      ['primary', null],
      ['accent', 'ui-button--accent'],
      ['warn', 'ui-button--warn'],
    ];

    for (const [color, expectedClass] of colorClasses) {
      it(`maps the ${color} color onto ${expectedClass ?? 'no class'}`, async () => {
        await setInputs({ color });

        const classes = fixture.nativeElement.className;
        if (expectedClass) {
          expect(classes).toContain(expectedClass);
        } else {
          expect(classes).not.toContain('ui-button--');
        }
      });
    }

    it('drops the previous color class when the color changes', async () => {
      await setInputs({ color: 'accent' });
      expect(fixture.nativeElement.className).toContain('ui-button--accent');

      await setInputs({ color: 'warn' });

      expect(fixture.nativeElement.className).toContain('ui-button--warn');
      expect(fixture.nativeElement.className).not.toContain('ui-button--accent');
    });
  });

  describe('type', () => {
    it('defaults to button so it cannot accidentally submit a surrounding form', () => {
      expect(component.type()).toBe('button');
      expect(nativeButton().type).toBe('button');
    });

    it('applies submit to the native button', async () => {
      await setInputs({ type: 'submit' });

      expect(nativeButton().type).toBe('submit');
    });
  });

  describe('disabled', () => {
    it('is enabled by default', () => {
      expect(component.disabled()).toBe(false);
      expect(nativeButton().disabled).toBe(false);
    });

    it('disables the native button', async () => {
      await setInputs({ disabled: true });

      expect(nativeButton().disabled).toBe(true);
    });

    // `disabled` is declared with `booleanAttribute`, so bare attribute usage
    // (`<ui-button disabled>`) must read as true rather than as the string.
    it('coerces a bare attribute to true', async () => {
      await setInputs({ disabled: '' });

      expect(component.disabled()).toBe(true);
      expect(nativeButton().disabled).toBe(true);
    });
  });

  describe('clicked', () => {
    it('emits the originating event when clicked', async () => {
      const events: MouseEvent[] = [];
      component.clicked.subscribe((event) => events.push(event));

      nativeButton().click();
      await fixture.whenStable();

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('click');
    });

    it('does not emit while disabled', async () => {
      const spy = vi.fn();
      component.clicked.subscribe(spy);
      await setInputs({ disabled: true });

      nativeButton().click();
      // A native disabled button suppresses the click, but the guard must hold
      // even when the event is dispatched straight at the element.
      nativeButton().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await fixture.whenStable();

      expect(spy).not.toHaveBeenCalled();
    });

    it('emits again once re-enabled', async () => {
      const spy = vi.fn();
      component.clicked.subscribe(spy);

      await setInputs({ disabled: true });
      nativeButton().click();
      await setInputs({ disabled: false });
      nativeButton().click();
      await fixture.whenStable();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('content projection', () => {
    @Component({
      imports: [Button],
      template: `<ui-button [variant]="variant()">Save changes</ui-button>`,
    })
    class TestHost {
      readonly variant = signal<UiButtonVariant>('filled');
    }

    it('projects its content into the Material button', async () => {
      const host = TestBed.createComponent(TestHost);
      await host.whenStable();

      expect((host.nativeElement.querySelector('button') as HTMLElement).textContent).toContain(
        'Save changes',
      );
    });
  });
});
