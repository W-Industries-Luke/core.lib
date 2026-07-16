import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatInputHarness } from '@angular/material/input/testing';

import { Mask } from './mask';

@Component({
  imports: [ReactiveFormsModule, Mask],
  template: `
    <input
      #input
      [formControl]="control"
      [uiMask]="mask()"
      [unmaskedValue]="unmasked()"
      [placeholderChar]="placeholderChar()"
    />
  `,
})
class TestHost {
  readonly control = new FormControl('');
  readonly mask = signal('phone');
  readonly unmasked = signal(true);
  readonly placeholderChar = signal('_');
}

describe('Mask', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let el: HTMLInputElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
    el = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  });

  /** Types `text` one character at a time at the current caret, as a keyboard would. */
  function type(text: string): void {
    for (const ch of text) {
      const caret = el.selectionStart ?? el.value.length;
      el.value = el.value.slice(0, caret) + ch + el.value.slice(caret);
      el.setSelectionRange(caret + 1, caret + 1);
      el.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
    }
  }

  /** Pastes `text` at `at` (end by default), as the clipboard would. */
  function paste(text: string, at = el.value.length): void {
    el.value = el.value.slice(0, at) + text + el.value.slice(at);
    el.setSelectionRange(at + text.length, at + text.length);
    el.dispatchEvent(new InputEvent('input', { inputType: 'insertFromPaste' }));
  }

  /** Presses backspace at the current caret. */
  function backspace(): void {
    const caret = el.selectionStart ?? 0;
    if (caret === 0) {
      return;
    }
    el.value = el.value.slice(0, caret - 1) + el.value.slice(caret);
    el.setSelectionRange(caret - 1, caret - 1);
    el.dispatchEvent(new InputEvent('input', { inputType: 'deleteContentBackward' }));
  }

  // The whole reason the directive exists: the two values must not be the same
  // string. Getting this boundary wrong is the classic mask bug.
  describe('raw value vs display value', () => {
    it('shows the masked value but reports the raw value to the form', () => {
      type('5551234567');

      expect(el.value).toBe('(555) 123-4567');
      expect(host.control.value).toBe('5551234567');
    });

    it('reports the masked value when unmaskedValue is false', () => {
      host.unmasked.set(false);
      fixture.detectChanges();

      type('5551234567');

      expect(el.value).toBe('(555) 123-4567');
      expect(host.control.value).toBe('(555) 123-4567');
    });

    it('formats a raw value written from the form (writeValue)', async () => {
      host.control.setValue('5551234567');
      await fixture.whenStable();

      expect(el.value).toBe('(555) 123-4567');
    });

    it('normalises an already-formatted value written from the form', async () => {
      host.control.setValue('(555) 123-4567');
      await fixture.whenStable();

      expect(el.value).toBe('(555) 123-4567');
      // Editing from there reports the raw value, not the formatted string it started as.
      el.setSelectionRange(14, 14);
      type('8'); // the mask is already full, so this is a no-op edit
      expect(host.control.value).toBe('5551234567');
    });

    it('drops characters that do not fit the mask', () => {
      type('5a5b5c!!');

      expect(el.value).toBe('(555');
      expect(host.control.value).toBe('555');
    });
  });

  describe('paste', () => {
    it('reformats a pasted, already-formatted value and keeps the raw value clean', () => {
      paste('(555) 123-4567');

      expect(el.value).toBe('(555) 123-4567');
      expect(host.control.value).toBe('5551234567');
    });

    it('formats a pasted run of raw digits', () => {
      paste('5551234567');

      expect(el.value).toBe('(555) 123-4567');
      expect(host.control.value).toBe('5551234567');
    });

    it('ignores separators and letters in a messy paste', () => {
      paste('555.123.4567 ext');

      expect(el.value).toBe('(555) 123-4567');
      expect(host.control.value).toBe('5551234567');
    });
  });

  describe('caret handling', () => {
    it('places the caret after auto-inserted literals so typing continues cleanly', () => {
      type('555');
      // The `) ` was inserted for the user; the caret must sit past it.
      expect(el.value).toBe('(555');
      expect(el.selectionStart).toBe(4);

      type('1');
      expect(el.value).toBe('(555) 1');
      expect(el.selectionStart).toBe(7);
    });

    it('keeps the caret in place when editing mid-string', () => {
      type('5551234567'); // (555) 123-4567
      // Put the caret just after the area code's first digit and insert a 9.
      el.setSelectionRange(2, 2); // (5|55) 123-4567
      el.value = '(5955) 123-4567';
      el.setSelectionRange(3, 3);
      el.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));

      // The new digit stays where it was typed; the overflow digit falls off the end.
      expect(el.value).toBe('(595) 512-3456');
      expect(el.selectionStart).toBe(3);
    });
  });

  describe('backspace', () => {
    it('deletes a normal character', () => {
      type('5551'); // (555) 1
      backspace();

      expect(el.value).toBe('(555');
      expect(host.control.value).toBe('555');
    });

    it('deletes the character before a separator when backspacing the separator', () => {
      type('55512'); // (555) 12
      el.setSelectionRange(6, 6); // (555) |12 — caret sits right after the space
      backspace(); // removes the space, and so the digit before it

      expect(host.control.value).toBe('5512');
      expect(el.value).toBe('(551) 2');
    });
  });

  describe('presets', () => {
    const cases: [string, string, string, string][] = [
      // preset, typed, display, raw
      ['phone', '5551234567', '(555) 123-4567', '5551234567'],
      ['date', '12312024', '12/31/2024', '12312024'],
      ['postcode', '123456789', '12345-6789', '123456789'],
      ['currency', '1234.56', '$1,234.56', '1234.56'],
    ];

    for (const [preset, typed, display, raw] of cases) {
      it(`formats the ${preset} preset`, () => {
        host.mask.set(preset);
        fixture.detectChanges();

        type(typed);

        expect(el.value).toBe(display);
        expect(host.control.value).toBe(raw);
      });
    }

    it('leaves a partial postcode unpadded (lazy) until the +4 begins', () => {
      host.mask.set('postcode');
      fixture.detectChanges();

      type('12345');
      expect(el.value).toBe('12345');

      type('6');
      expect(el.value).toBe('12345-6');
    });

    it('groups currency thousands as digits arrive', () => {
      host.mask.set('currency');
      fixture.detectChanges();

      type('1234567');
      expect(el.value).toBe('$1,234,567');
      expect(host.control.value).toBe('1234567');
    });
  });

  describe('custom patterns and inputs', () => {
    it('treats an unknown value as a literal token pattern', () => {
      host.mask.set('AA-0000');
      fixture.detectChanges();

      type('ab1234');
      expect(el.value).toBe('ab-1234');
      expect(host.control.value).toBe('ab1234');
    });

    it('offers the mask template as the placeholder using placeholderChar', () => {
      expect(el.getAttribute('placeholder')).toBe('(___) ___-____');

      host.placeholderChar.set('#');
      fixture.detectChanges();
      expect(el.getAttribute('placeholder')).toBe('(###) ###-####');
    });

    it('sets an inputmode appropriate to the mask', () => {
      expect(el.getAttribute('inputmode')).toBe('tel');

      host.mask.set('currency');
      fixture.detectChanges();
      expect(el.getAttribute('inputmode')).toBe('decimal');
    });

    it('reformats what is already in the field when the mask changes', () => {
      type('1234567890');
      expect(el.value).toBe('(123) 456-7890');

      host.mask.set('date');
      fixture.detectChanges();
      expect(el.value).toBe('12/34/5678');
    });

    it('sets the disabled state from the form', async () => {
      host.control.disable();
      await fixture.whenStable();
      expect(el.disabled).toBe(true);

      host.control.enable();
      await fixture.whenStable();
      expect(el.disabled).toBe(false);
    });
  });

  // Proves the directive is at home on a real `matInput` inside a themed
  // `<mat-form-field>` — the acceptance-criteria integration — with the raw/display
  // split intact through Material's own control.
  describe('on a Material input', () => {
    @Component({
      imports: [ReactiveFormsModule, Mask, MatFormField, MatInput],
      template: `
        <mat-form-field>
          <input matInput uiMask="phone" [formControl]="control" />
        </mat-form-field>
      `,
    })
    class MatHost {
      readonly control = new FormControl('');
    }

    it('masks the display while the control holds the raw value', async () => {
      const f = TestBed.createComponent(MatHost);
      await f.whenStable();
      const input = f.nativeElement.querySelector('input') as HTMLInputElement;

      input.value = '5551234567';
      input.setSelectionRange(10, 10);
      input.dispatchEvent(new InputEvent('input', { inputType: 'insertFromPaste' }));
      await f.whenStable();

      const harness = await TestbedHarnessEnvironment.loader(f).getHarness(MatInputHarness);
      expect(await harness.getValue()).toBe('(555) 123-4567');
      expect(f.componentInstance.control.value).toBe('5551234567');
    });
  });
});
