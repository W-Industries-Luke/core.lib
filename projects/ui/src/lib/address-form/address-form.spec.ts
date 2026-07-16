import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectHarness } from '@angular/material/select/testing';

import { AddressForm } from './address-form';
import { type UiAddress } from './address-schema';

/** A complete, valid US address, for the write/validate paths. */
const VALID_US: UiAddress = {
  line1: '1 Infinite Loop',
  line2: '',
  city: 'Cupertino',
  region: 'CA',
  postalCode: '95014',
  country: 'US',
};

describe('AddressForm', () => {
  let fixture: ComponentFixture<AddressForm>;
  let component: AddressForm;

  /** The visible field labels, in order — proves which schema is rendered. */
  const labels = (root: HTMLElement = fixture.nativeElement): string[] =>
    Array.from(root.querySelectorAll('mat-label')).map((l) => l.textContent!.trim());

  /** A field's real `<input>`, found by the `autocomplete` token the schema gives it. */
  const inputFor = (token: string, root: HTMLElement = fixture.nativeElement): HTMLInputElement =>
    root.querySelector(`input[autocomplete="${token}"]`) as HTMLInputElement;

  /** Types into a text field and lets the change propagate. */
  const type = async (token: string, value: string): Promise<void> => {
    const el = inputFor(token);
    el.value = value;
    el.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(AddressForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  // The point of this component: it is built *from* the primitives, not from
  // scratch. If these fail, it is hand-rolling fields the library already owns.
  describe('composition', () => {
    it('renders every field as a ui-input or ui-select, never a raw control', () => {
      // US: a country picker + a state picker are selects; the four text fields
      // are inputs. No stray `<input>`/`<select>` outside the primitives.
      expect(fixture.nativeElement.querySelectorAll('ui-select').length).toBe(2);
      expect(fixture.nativeElement.querySelectorAll('ui-input').length).toBe(4);
      expect(fixture.nativeElement.querySelector('select')).toBeNull();
    });

    it('leads with a country picker, then the schema’s fields in order', () => {
      expect(labels()).toEqual([
        'Country',
        'Address line 1',
        'Address line 2',
        'City',
        'State',
        'ZIP code',
      ]);
    });
  });

  // Locale-awareness, and the requirement that the schema is data-driven: the
  // country decides the labels, the order, and which control each field uses.
  describe('country switching changes the schema', () => {
    it('shows US labels and a State dropdown by default', () => {
      expect(labels()).toContain('State');
      expect(labels()).toContain('ZIP code');
      // State is a select; region for the US is a closed list.
      expect(fixture.nativeElement.querySelectorAll('ui-select').length).toBe(2);
    });

    it('re-labels and re-shapes the fields for the UK', async () => {
      fixture.componentRef.setInput('country', 'GB');
      await fixture.whenStable();

      expect(labels()).toEqual([
        'Country',
        'Address line 1',
        'Address line 2',
        'Town/City',
        'County',
        'Postcode',
      ]);
      // The UK county is free text, so the state dropdown is gone — only the
      // country picker is a select now, and there are five text fields.
      expect(fixture.nativeElement.querySelectorAll('ui-select').length).toBe(1);
      expect(fixture.nativeElement.querySelectorAll('ui-input').length).toBe(5);
    });

    it('falls back to a generic schema for a country it does not know', async () => {
      fixture.componentRef.setInput('country', 'ZZ');
      await fixture.whenStable();

      expect(labels()).toContain('State/Province/Region');
      expect(labels()).toContain('Postal code');
    });

    it('drives the schema from the picked value, not just the input', async () => {
      const loader = TestbedHarnessEnvironment.loader(fixture);
      const country = await loader.getHarness(
        MatSelectHarness.with({ ancestor: 'ui-select[label="Country"]' }),
      );

      await country.open();
      await country.clickOptions({ text: 'United Kingdom' });
      await fixture.whenStable();

      expect(component.value().country).toBe('GB');
      expect(labels()).toContain('Postcode');
    });
  });

  // Rule 5: the whole address is one control, with no adapter.
  describe('ControlValueAccessor', () => {
    @Component({
      imports: [AddressForm, ReactiveFormsModule],
      template: `<ui-address-form [formControl]="control" />`,
    })
    class ReactiveHost {
      readonly control = new FormControl<UiAddress | null>(null);
    }

    let f: ComponentFixture<ReactiveHost>;
    let host: ReactiveHost;

    beforeEach(async () => {
      f = TestBed.createComponent(ReactiveHost);
      host = f.componentInstance;
      await f.whenStable();
    });

    // writeValue
    it('shows a value written to the control', async () => {
      host.control.setValue(VALID_US);
      await f.whenStable();

      expect(inputFor('address-line1', f.nativeElement).value).toBe('1 Infinite Loop');
      expect(inputFor('address-level2', f.nativeElement).value).toBe('Cupertino');
      expect(inputFor('postal-code', f.nativeElement).value).toBe('95014');
    });

    // registerOnChange — the whole object flows back, country included.
    it('writes the whole address back when a field changes', async () => {
      const line1 = f.nativeElement.querySelector('input[autocomplete="address-line1"]') as HTMLInputElement;
      line1.value = '1 Infinite Loop';
      line1.dispatchEvent(new Event('input'));
      await f.whenStable();

      expect(host.control.value).toEqual({
        line1: '1 Infinite Loop',
        line2: '',
        city: '',
        region: '',
        postalCode: '',
        country: 'US',
      });
    });

    // setDisabledState — a form disabling the control has no `disabled` attribute
    // in the template to read.
    it('disables every field when the form disables the control', async () => {
      host.control.disable();
      await f.whenStable();

      const disabled = Array.from(
        f.nativeElement.querySelectorAll('.mat-mdc-form-field'),
      ).every((field) => (field as HTMLElement).classList.contains('mat-form-field-disabled'));
      expect(disabled).toBe(true);
    });

    // reset writes null — the fields must empty rather than show the word "null".
    it('empties the fields when the control is reset', async () => {
      host.control.setValue(VALID_US);
      await f.whenStable();

      host.control.reset();
      await f.whenStable();

      expect(inputFor('address-line1', f.nativeElement).value).toBe('');
      expect(inputFor('postal-code', f.nativeElement).value).toBe('');
    });

    describe('with [(ngModel)]', () => {
      @Component({
        imports: [AddressForm, FormsModule],
        template: `<ui-address-form [(ngModel)]="address" />`,
      })
      class ModelHost {
        readonly address = signal<UiAddress>({ ...VALID_US });
      }

      it('round-trips through the model', async () => {
        const mf = TestBed.createComponent(ModelHost);
        await mf.whenStable();

        expect(inputFor('address-line1', mf.nativeElement).value).toBe('1 Infinite Loop');

        const city = inputFor('address-level2', mf.nativeElement);
        city.value = 'Palo Alto';
        city.dispatchEvent(new Event('input'));
        await mf.whenStable();

        expect(mf.componentInstance.address().city).toBe('Palo Alto');
      });
    });
  });

  // The requirement that validation is exposed through the CVA — validate() —
  // not merely styled red.
  describe('validate()', () => {
    it('reports every empty required field, keyed by field', () => {
      const errors = component.validate();

      expect(errors).not.toBeNull();
      expect(errors!['address']['line1']).toEqual({ required: true });
      expect(errors!['address']['city']).toEqual({ required: true });
      expect(errors!['address']['region']).toEqual({ required: true });
      expect(errors!['address']['postalCode']).toEqual({ required: true });
      // Line 2 is optional, so it is never an error.
      expect(errors!['address']['line2']).toBeUndefined();
    });

    it('passes once every required field is filled', async () => {
      component.writeValue(VALID_US);
      await fixture.whenStable();

      expect(component.validate()).toBeNull();
    });

    it('rejects a ZIP that does not match the US format', async () => {
      component.writeValue({ ...VALID_US, postalCode: '123' });
      await fixture.whenStable();

      expect(component.validate()!['address']['postalCode']).toEqual({
        pattern: expect.objectContaining({ actualValue: '123' }),
      });
    });

    it('accepts a ZIP+4', async () => {
      component.writeValue({ ...VALID_US, postalCode: '95014-2084' });
      await fixture.whenStable();

      expect(component.validate()).toBeNull();
    });

    // The pattern is the country's own — switching moves the goalposts.
    it('validates the postcode against the UK format after a switch', async () => {
      fixture.componentRef.setInput('country', 'GB');
      component.writeValue({ ...VALID_US, region: '', postalCode: '95014', country: 'GB' });
      await fixture.whenStable();

      // A US ZIP is not a UK postcode.
      expect(component.validate()!['address']['postalCode']['pattern']).toBeTruthy();

      component.writeValue({ ...VALID_US, region: '', postalCode: 'SW1A 1AA', country: 'GB' });
      await fixture.whenStable();
      expect(component.validate()).toBeNull();
    });

    it('surfaces its errors through a bound control’s validity', async () => {
      @Component({
        imports: [AddressForm, ReactiveFormsModule],
        template: `<ui-address-form [formControl]="control" />`,
      })
      class Host {
        readonly control = new FormControl<UiAddress | null>(null);
      }

      const hf = TestBed.createComponent(Host);
      await hf.whenStable();

      expect(hf.componentInstance.control.invalid).toBe(true);
      expect(hf.componentInstance.control.errors!['address']).toBeTruthy();

      hf.componentInstance.control.setValue(VALID_US);
      await hf.whenStable();
      expect(hf.componentInstance.control.valid).toBe(true);
    });

    // requiredFields overrides the schema's own defaults.
    it('honours a requiredFields override', async () => {
      fixture.componentRef.setInput('requiredFields', []);
      await fixture.whenStable();

      // Nothing required, so an empty address is valid.
      expect(component.validate()).toBeNull();
    });
  });

  // How the messages appear: per field, once blurred or when showErrors is set —
  // using the primitives' own `error` treatment, not a red class painted on.
  describe('error messages', () => {
    it('shows no error before a field is touched', () => {
      expect(fixture.nativeElement.querySelector('mat-error')).toBeNull();
    });

    it('reveals a field’s error on blur', async () => {
      // Focus in and back out of line 1 without typing.
      const line1 = inputFor('address-line1');
      line1.dispatchEvent(new Event('focusout', { bubbles: true }));
      await fixture.whenStable();

      const errors = Array.from(fixture.nativeElement.querySelectorAll('mat-error')).map(
        (e) => (e as HTMLElement).textContent!.trim(),
      );
      expect(errors).toContain('Address line 1 is required.');
    });

    it('reveals every error at once when showErrors is set', async () => {
      fixture.componentRef.setInput('showErrors', true);
      await fixture.whenStable();

      const errors = Array.from(fixture.nativeElement.querySelectorAll('mat-error')).map(
        (e) => (e as HTMLElement).textContent!.trim(),
      );
      expect(errors).toContain('ZIP code is required.');
      expect(errors).toContain('State is required.');
    });

    it('shows the schema’s own message for a bad format', async () => {
      fixture.componentRef.setInput('showErrors', true);
      await type('postal-code', '123');

      const errors = Array.from(fixture.nativeElement.querySelectorAll('mat-error')).map(
        (e) => (e as HTMLElement).textContent!.trim(),
      );
      expect(errors).toContain('Enter a ZIP code like 94103 or 94103-1234.');
    });
  });

  // Rule 5: the two-way value works with no forms directive at all.
  describe('[(value)]', () => {
    it('reflects a value written by the consumer', async () => {
      component.value.set({ ...VALID_US });
      await fixture.whenStable();

      expect(inputFor('address-line1').value).toBe('1 Infinite Loop');
    });

    it('updates the value when the user types', async () => {
      await type('address-line1', '10 Downing Street');

      expect(component.value().line1).toBe('10 Downing Street');
    });
  });

  describe('disabled input', () => {
    it('disables every field', async () => {
      fixture.componentRef.setInput('disabled', true);
      await fixture.whenStable();

      const fields = Array.from(fixture.nativeElement.querySelectorAll('.mat-mdc-form-field'));
      expect(fields.length).toBeGreaterThan(0);
      expect(
        fields.every((f) => (f as HTMLElement).classList.contains('mat-form-field-disabled')),
      ).toBe(true);
    });
  });
});
