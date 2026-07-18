import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DateAdapter, NativeDateAdapter } from '@angular/material/core';
import { MatDatepicker, MatDatepickerInput } from '@angular/material/datepicker';
import {
  MatDatepickerInputHarness,
  MatDatepickerToggleHarness,
} from '@angular/material/datepicker/testing';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

import {
  Datepicker,
  DatepickerHint,
  DatepickerToggleIcon,
  type UiDatepickerAppearance,
  type UiDatepickerDateFilter,
} from './datepicker';

/** A fixed clock, so nothing here depends on the day the suite runs. */
const JAN_1 = new Date(2024, 0, 1);
const JUN_15 = new Date(2024, 5, 15);
const DEC_31 = new Date(2024, 11, 31);

@Component({
  imports: [Datepicker],
  template: `
    <ui-datepicker
      #ref="uiDatepicker"
      [label]="label()"
      [min]="min()"
      [max]="max()"
      [disabled]="disabled()"
      [error]="error()"
      [hint]="hint()"
      [appearance]="appearance()"
      [required]="required()"
      [readonly]="readonly()"
      [toggle]="toggle()"
      [(value)]="value"
      [(opened)]="opened"
    />
  `,
})
class TestHost {
  readonly label = signal<string | undefined>('Due date');
  readonly min = signal<Date | null>(null);
  readonly max = signal<Date | null>(null);
  readonly disabled = signal(false);
  readonly error = signal<string | undefined>(undefined);
  readonly hint = signal<string | undefined>(undefined);
  readonly appearance = signal<UiDatepickerAppearance>('outline');
  readonly required = signal(false);
  readonly readonly = signal(false);
  readonly toggle = signal(true);
  readonly value = signal<Date | null>(null);
  readonly opened = signal(false);
  readonly ref = viewChild.required<Datepicker>('ref');
}

describe('Datepicker', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let loader: HarnessLoader;

  // The datepicker harnesses speak Material's public test surface — the input's
  // `getValue()`/`setValue()`/`isDisabled()`/`isRequired()` and the toggle's
  // `openCalendar()`/`isDisabled()` — instead of poking at the rendered `<input>` and
  // `.mat-datepicker-toggle button`. The MDC subscript markup this component wraps
  // (`mat-error`, `mat-hint`, the required marker, the form field's classes), the ARIA
  // associations and the Material instances reached through the escape hatches all stay
  // DOM/instance assertions.

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  /** The real `<input>` Material renders into. */
  const inputElement = (): HTMLInputElement => query('input') as HTMLInputElement;

  /** Material's datepicker input, through the harness. */
  const datepickerInput = (l: HarnessLoader = loader): Promise<MatDatepickerInputHarness> =>
    l.getHarness(MatDatepickerInputHarness);

  /** Material's calendar toggle, through the harness. */
  const datepickerToggle = (l: HarnessLoader = loader): Promise<MatDatepickerToggleHarness> =>
    l.getHarness(MatDatepickerToggleHarness);

  /**
   * Types into the real input the way a user would: the harness sends the keys and
   * commits with a `change`, exactly the input/change the old spec dispatched by hand.
   */
  const type = async (text: string): Promise<void> => {
    await (await datepickerInput()).setValue(text);
    await fixture.whenStable();
  };

  /**
   * Waits out the macrotask Material defers a close by while it restores focus,
   * then lets the resulting change detection settle.
   */
  const closeToSettle = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  // The point of this library: the field is Material's, not a box painted to look
  // like one. If these fail, everything below is testing a lookalike.
  describe('composition', () => {
    it('renders Material’s form field around Material’s datepicker input', () => {
      expect(query('mat-form-field')).not.toBeNull();
      expect(inputElement().classList).toContain('mat-mdc-input-element');
      expect(host.ref().matFormField()).toBeInstanceOf(MatFormField);
      expect(host.ref().matInput()).toBeInstanceOf(MatInput);
      expect(host.ref().matDatepicker()).toBeInstanceOf(MatDatepicker);
      expect(host.ref().matDatepickerInput()).toBeInstanceOf(MatDatepickerInput);
    });

    it('renders exactly one control', () => {
      expect(fixture.nativeElement.querySelectorAll('input').length).toBe(1);
    });

    it('connects the input to the calendar it opens', () => {
      expect(host.ref().matDatepickerInput()._datepicker).toBe(host.ref().matDatepicker());
    });
  });

  // The acceptance criterion this component exists for: a consumer imports the
  // component and nothing else. No `MatNativeDateModule` in an app's bootstrap —
  // note this TestBed provides no date adapter at all.
  describe('date adapter', () => {
    it('provides a native date adapter without the consumer wiring one', () => {
      const adapter = fixture.debugElement
        .query((node) => node.name === 'ui-datepicker')
        .injector.get(DateAdapter);

      expect(adapter).toBeInstanceOf(NativeDateAdapter);
    });

    it('formats a Date into the field with that adapter', async () => {
      host.value.set(JUN_15);
      await fixture.whenStable();

      const value = await (await datepickerInput()).getValue();
      expect(value).not.toBe('');
      expect(new Date(value).getTime()).toBe(JUN_15.getTime());
    });
  });

  describe('label', () => {
    it('renders the label as Material’s own', () => {
      expect(query('mat-label')!.textContent!.trim()).toBe('Due date');
    });

    it('renders no label element when none is given', async () => {
      host.label.set(undefined);
      await fixture.whenStable();

      expect(query('mat-label')).toBeNull();
    });

    // Verifying Material's association rather than reimplementing it: the label is
    // a real `<label for>` pointed at the control's id, which is what makes
    // clicking it focus the field.
    it('is associated with the control by MatFormField', () => {
      const label = query('label') as HTMLLabelElement;

      expect(inputElement().id).not.toBe('');
      expect(label.htmlFor).toBe(inputElement().id);
    });
  });

  describe('min and max', () => {
    it('has no range by default', () => {
      expect(host.ref().matDatepickerInput().min).toBeNull();
      expect(host.ref().matDatepickerInput().max).toBeNull();
    });

    // The range has to reach Material's own input: that is the one object the
    // calendar and the validators both read it from.
    it('hands the range to Material’s input', async () => {
      host.min.set(JAN_1);
      host.max.set(DEC_31);
      await fixture.whenStable();

      expect(host.ref().matDatepickerInput().min).toEqual(JAN_1);
      expect(host.ref().matDatepickerInput().max).toEqual(DEC_31);
    });
  });

  describe('disabled', () => {
    it('is enabled by default', async () => {
      expect(await (await datepickerInput()).isDisabled()).toBe(false);
    });

    // The toggle has to go with it, or the calendar is a way around a disabled
    // field.
    it('disables the control, the toggle and the calendar', async () => {
      host.disabled.set(true);
      await fixture.whenStable();

      expect(await (await datepickerInput()).isDisabled()).toBe(true);
      expect(await (await datepickerToggle()).isDisabled()).toBe(true);
      expect(host.ref().matDatepicker().disabled).toBe(true);
    });
  });

  describe('error', () => {
    it('shows no message and is not in an error state by default', () => {
      expect(query('mat-error')).toBeNull();
      expect(host.ref().hasError()).toBe(false);
      expect(inputElement().getAttribute('aria-invalid')).toBe('false');
    });

    it('shows the message and puts the field in Material’s error state', async () => {
      host.error.set('Pick a date from today onwards.');
      await fixture.whenStable();

      expect(query('mat-error')!.textContent!.trim()).toBe('Pick a date from today onwards.');
      expect(host.ref().hasError()).toBe(true);
      expect(inputElement().getAttribute('aria-invalid')).toBe('true');
      expect(query('.mat-form-field-invalid')).not.toBeNull();
    });

    // The message is the description of the control, so a screen reader has to
    // reach it from the input.
    it('points the control’s aria-describedby at the message', async () => {
      host.error.set('Pick a date from today onwards.');
      await fixture.whenStable();

      expect(inputElement().getAttribute('aria-describedby')).toContain(query('mat-error')!.id);
    });

    it('is not in an error state for a blank string', async () => {
      host.error.set('   ');
      await fixture.whenStable();

      expect(host.ref().hasError()).toBe(false);
      expect(query('mat-error')).toBeNull();
    });

    // Material renders one subscript message: the error replaces the hint rather
    // than stacking on it.
    it('replaces the hint while it is showing', async () => {
      host.hint.set('DD/MM/YYYY');
      await fixture.whenStable();
      expect(query('mat-hint')).not.toBeNull();

      host.error.set('Not a date.');
      await fixture.whenStable();

      expect(query('mat-hint')).toBeNull();
      expect(query('mat-error')).not.toBeNull();
    });
  });

  describe('value', () => {
    it('is empty by default', async () => {
      expect(host.ref().value()).toBeNull();
      expect(await (await datepickerInput()).getValue()).toBe('');
    });

    it('shows a date written through the binding', async () => {
      host.value.set(JUN_15);
      await fixture.whenStable();

      expect(host.ref().matDatepickerInput().value).toEqual(JUN_15);
    });

    it('writes what the user types back through the binding', async () => {
      await type('6/15/2024');

      expect(host.value()).toEqual(JUN_15);
      expect(host.ref().value()).toEqual(JUN_15);
    });

    // Typing nonsense is not a date, and `null` is what a form means by empty.
    it('reports null when what is typed is not a date', async () => {
      host.value.set(JUN_15);
      await fixture.whenStable();

      await type('not a date');

      expect(host.value()).toBeNull();
    });
  });

  describe('opened', () => {
    it('is closed by default', () => {
      expect(host.ref().matDatepicker().opened).toBe(false);
    });

    it('opens the calendar from the binding', async () => {
      host.opened.set(true);
      await fixture.whenStable();

      expect(host.ref().matDatepicker().opened).toBe(true);
    });

    // Rule 5: two-way state, not a write-only command. Material owns *when* the
    // calendar closes, so the binding has to hear about it.
    it('reports back when the calendar closes itself', async () => {
      host.opened.set(true);
      await fixture.whenStable();

      host.ref().matDatepicker().close();
      // Material restores focus to whatever had it before the calendar opened and
      // only then reports the close, a macrotask later — so awaiting stability
      // alone would read the flag before Material had set it.
      await closeToSettle();

      expect(host.opened()).toBe(false);
    });

    it('reports back when the toggle opens the calendar', async () => {
      await (await datepickerToggle()).openCalendar();
      await fixture.whenStable();

      expect(host.opened()).toBe(true);
      expect(host.ref().matDatepicker().opened).toBe(true);
    });
  });

  describe('toggle', () => {
    it('shows the calendar toggle by default', async () => {
      expect(await loader.getHarnessOrNull(MatDatepickerToggleHarness)).not.toBeNull();
    });

    it('hides it when asked, leaving a text-only date field', async () => {
      host.toggle.set(false);
      await fixture.whenStable();

      expect(await loader.getHarnessOrNull(MatDatepickerToggleHarness)).toBeNull();
      expect(await loader.getHarnessOrNull(MatDatepickerInputHarness)).not.toBeNull();
    });

    it('falls back to Material’s own translated name for the button', () => {
      expect(query('.mat-datepicker-toggle button')!.getAttribute('aria-label')).toBe(
        'Open calendar',
      );
    });

    it('names the button when a consumer says what it picks', async () => {
      @Component({
        imports: [Datepicker],
        template: `<ui-datepicker label="Due date" toggleAriaLabel="Choose a due date" />`,
      })
      class ToggleHost {}

      const f = TestBed.createComponent(ToggleHost);
      await f.whenStable();

      expect(
        f.nativeElement.querySelector('.mat-datepicker-toggle button').getAttribute('aria-label'),
      ).toBe('Choose a due date');
    });
  });

  describe('readonly', () => {
    it('is editable by default', () => {
      expect(inputElement().readOnly).toBe(false);
    });

    // Unlike `disabled`, a readonly field stays focusable and is still submitted —
    // and its toggle stays live, so the date can still come from the calendar.
    it('makes the control readonly but not disabled, and leaves the toggle live', async () => {
      host.readonly.set(true);
      await fixture.whenStable();

      // `readonly` has no harness method — it stays a DOM read; disabled state, which the
      // harness does expose, comes off the input and the toggle.
      expect(inputElement().readOnly).toBe(true);
      expect(await (await datepickerInput()).isDisabled()).toBe(false);
      expect(await (await datepickerToggle()).isDisabled()).toBe(false);
    });
  });

  describe('required', () => {
    it('is optional by default', async () => {
      expect(await (await datepickerInput()).isRequired()).toBe(false);
      expect(query('.mat-mdc-form-field-required-marker')).toBeNull();
    });

    it('marks the control required for assistive technology and marks the label', async () => {
      host.required.set(true);
      await fixture.whenStable();

      expect(await (await datepickerInput()).isRequired()).toBe(true);
      expect(inputElement().getAttribute('aria-required')).toBe('true');
      expect(query('.mat-mdc-form-field-required-marker')).not.toBeNull();
    });
  });

  describe('appearance', () => {
    it('defaults to outline, not Material’s fill', () => {
      expect(host.ref().appearance()).toBe('outline');
      expect(host.ref().matFormField().appearance).toBe('outline');
    });

    it('forwards fill to Material’s form field', async () => {
      host.appearance.set('fill');
      await fixture.whenStable();

      expect(host.ref().matFormField().appearance).toBe('fill');
    });
  });

  // Rule 5: `[(ngModel)]`, `[formControl]` and `formControlName` with no adapter.
  describe('forms', () => {
    @Component({
      imports: [Datepicker, ReactiveFormsModule],
      template: `<ui-datepicker
        #ref="uiDatepicker"
        label="Due date"
        [formControl]="control"
        [min]="min()"
        [max]="max()"
        [dateFilter]="dateFilter()"
      />`,
    })
    class FormHost {
      readonly control = new FormControl<Date | null>(null);
      readonly min = signal<Date | null>(null);
      readonly max = signal<Date | null>(null);
      readonly dateFilter = signal<UiDatepickerDateFilter>(() => true);
      readonly ref = viewChild.required<Datepicker>('ref');
    }

    let f: ComponentFixture<FormHost>;
    let formHost: FormHost;
    let formLoader: HarnessLoader;

    const formInput = (): HTMLInputElement => f.nativeElement.querySelector('input');

    const typeInForm = async (text: string): Promise<void> => {
      await (await datepickerInput(formLoader)).setValue(text);
      await f.whenStable();
    };

    beforeEach(async () => {
      f = TestBed.createComponent(FormHost);
      formHost = f.componentInstance;
      formLoader = TestbedHarnessEnvironment.loader(f);
      await f.whenStable();
    });

    it('shows a date the control already holds', async () => {
      formHost.control.setValue(JUN_15);
      await f.whenStable();

      expect(formHost.ref().value()).toEqual(JUN_15);
      expect(await (await datepickerInput(formLoader)).getValue()).not.toBe('');
    });

    it('reports a picked date to the control as a Date', async () => {
      await typeInForm('6/15/2024');

      expect(formHost.control.value).toBeInstanceOf(Date);
      expect(formHost.control.value).toEqual(JUN_15);
    });

    // A control can hold anything — an ISO string out of a JSON payload is the
    // common one — and the adapter is what knows how to read it.
    it('reads an ISO string a form wrote into a Date', async () => {
      formHost.control.setValue('2024-06-15T00:00:00.000Z' as unknown as Date);
      await f.whenStable();

      expect(formHost.ref().value()).toBeInstanceOf(Date);
      expect(formHost.ref().value()!.toISOString()).toBe('2024-06-15T00:00:00.000Z');
    });

    it('reads an unparseable value as empty rather than an Invalid Date', async () => {
      formHost.control.setValue('rhubarb' as unknown as Date);
      await f.whenStable();

      expect(formHost.ref().value()).toBeNull();
    });

    it('empties the field when the control is reset', async () => {
      formHost.control.setValue(JUN_15);
      await f.whenStable();

      formHost.control.reset();
      await f.whenStable();

      expect(formHost.ref().value()).toBeNull();
      expect(await (await datepickerInput(formLoader)).getValue()).toBe('');
    });

    it('is disabled by the control, with no `disabled` input in sight', async () => {
      formHost.control.disable();
      await f.whenStable();

      expect(await (await datepickerInput(formLoader)).isDisabled()).toBe(true);
      expect(formHost.ref().matDatepicker().disabled).toBe(true);
    });

    it('is untouched until the user has been in and out of the field', async () => {
      expect(formHost.control.touched).toBe(false);

      formInput().dispatchEvent(new Event('blur'));
      await f.whenStable();

      expect(formHost.control.touched).toBe(true);
    });

    it('works with ngModel too', async () => {
      @Component({
        imports: [Datepicker, FormsModule],
        template: `<ui-datepicker label="Due date" [(ngModel)]="due" />`,
      })
      class ModelHost {
        due: Date | null = null;
      }

      const mf = TestBed.createComponent(ModelHost);
      await mf.whenStable();
      await (await datepickerInput(TestbedHarnessEnvironment.loader(mf))).setValue('6/15/2024');
      await mf.whenStable();

      expect(mf.componentInstance.due).toEqual(JUN_15);
    });

    // Rule 5, and the reason this component is a `Validator` at all: a user can
    // always type past a calendar, so a range that is only drawn is not enforced.
    describe('validation', () => {
      it('accepts a date inside the range', async () => {
        formHost.min.set(JAN_1);
        formHost.max.set(DEC_31);
        await f.whenStable();

        await typeInForm('6/15/2024');

        expect(formHost.control.valid).toBe(true);
        expect(formHost.control.errors).toBeNull();
      });

      it('reports Material’s own matDatepickerMin for a date before min', async () => {
        formHost.min.set(JUN_15);
        await f.whenStable();

        await typeInForm('1/1/2024');

        expect(formHost.control.hasError('matDatepickerMin')).toBe(true);
      });

      it('reports Material’s own matDatepickerMax for a date after max', async () => {
        formHost.max.set(JUN_15);
        await f.whenStable();

        await typeInForm('12/31/2024');

        expect(formHost.control.hasError('matDatepickerMax')).toBe(true);
      });

      it('reports matDatepickerFilter for a date the filter rejects', async () => {
        // Weekdays only. 15 June 2024 is a Saturday.
        formHost.dateFilter.set((date) => !date || (date.getDay() !== 0 && date.getDay() !== 6));
        await f.whenStable();

        await typeInForm('6/15/2024');

        expect(formHost.control.hasError('matDatepickerFilter')).toBe(true);
      });

      it('reports matDatepickerParse for text that is not a date', async () => {
        await typeInForm('rhubarb');

        expect(formHost.control.hasError('matDatepickerParse')).toBe(true);
      });

      // Angular re-runs a validator when the *value* changes, not when a bound
      // `min` does. Without the component driving it, this control would keep a
      // stale verdict from the range it was validated against.
      it('re-validates when the range changes under a value that is already set', async () => {
        await typeInForm('1/1/2024');
        expect(formHost.control.valid).toBe(true);

        formHost.min.set(JUN_15);
        await f.whenStable();

        expect(formHost.control.hasError('matDatepickerMin')).toBe(true);

        formHost.min.set(null);
        await f.whenStable();

        expect(formHost.control.valid).toBe(true);
      });
    });
  });

  // Rule 3. A wrapper must not be where attributes go to die: the control is the
  // real element, so what a consumer writes has to reach it.
  describe('native attributes reach the real input', () => {
    @Component({
      imports: [Datepicker],
      template: `
        <ui-datepicker
          class="mine"
          label="Due date"
          name="due"
          tabindex="3"
          data-testid="due-field"
          aria-label="Invoice due date"
        />
      `,
    })
    class AttrHost {}

    let f: ComponentFixture<AttrHost>;
    let wrapper: HTMLElement;
    let input: HTMLInputElement;

    beforeEach(async () => {
      f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      wrapper = f.nativeElement.querySelector('ui-datepicker');
      input = f.nativeElement.querySelector('input');
    });

    it('moves aria-* onto the control', () => {
      expect(input.getAttribute('aria-label')).toBe('Invoice due date');
      expect(wrapper.hasAttribute('aria-label')).toBe(false);
    });

    it('moves data-* onto the control', () => {
      expect(input.dataset['testid']).toBe('due-field');
      expect(wrapper.hasAttribute('data-testid')).toBe(false);
    });

    // A tabindex left on the wrapper would be a second tab stop on something that
    // is not a control.
    it('moves tabindex onto the control', () => {
      expect(input.tabIndex).toBe(3);
      expect(wrapper.hasAttribute('tabindex')).toBe(false);
    });

    it('gives the control the name, for native form submission', () => {
      expect(input.name).toBe('due');
    });

    // `class` is how a consumer targets the wrapper — the one thing that must not
    // move.
    it('leaves class on the wrapper', () => {
      expect(wrapper.classList).toContain('mine');
      expect(input.classList).not.toContain('mine');
    });

    // Two elements claiming one id is invalid HTML, and the id is the one the
    // label's `for` points at.
    it('moves the id off the wrapper onto the control', async () => {
      @Component({
        imports: [Datepicker],
        template: `<ui-datepicker label="Due date" id="due" />`,
      })
      class IdHost {}

      const idFixture = TestBed.createComponent(IdHost);
      await idFixture.whenStable();
      const idInput = idFixture.nativeElement.querySelector('input') as HTMLInputElement;
      const label = idFixture.nativeElement.querySelector('label') as HTMLLabelElement;

      expect(idInput.id).toBe('due');
      expect(label.htmlFor).toBe('due');
      expect(idFixture.nativeElement.querySelector('ui-datepicker').hasAttribute('id')).toBe(false);
    });

    // Rule 3 for the bound case: a binding that only worked on the first paint is a
    // bug that shows up later.
    it('moves an attribute bound after the first render', async () => {
      @Component({
        imports: [Datepicker],
        template: `<ui-datepicker label="Due date" [attr.aria-label]="name()" />`,
      })
      class BoundHost {
        readonly name = signal('Invoice due date');
      }

      const bf = TestBed.createComponent(BoundHost);
      await bf.whenStable();
      const boundInput = bf.nativeElement.querySelector('input') as HTMLInputElement;
      expect(boundInput.getAttribute('aria-label')).toBe('Invoice due date');

      bf.componentInstance.name.set('Payment due date');
      await bf.whenStable();
      // The move happens in a MutationObserver callback — a microtask after the
      // binding writes the attribute.
      await Promise.resolve();

      expect(boundInput.getAttribute('aria-label')).toBe('Payment due date');
    });

    // Material merges these ids with the hint's and the error's, so it has to
    // arrive through its input rather than as an attribute it would overwrite.
    it('keeps a consumer’s aria-describedby alongside Material’s messages', async () => {
      @Component({
        imports: [Datepicker],
        template: `
          <p id="policy">Invoices are due 30 days after issue.</p>
          <ui-datepicker label="Due date" hint="DD/MM/YYYY" aria-describedby="policy" />
        `,
      })
      class DescribedHost {}

      const df = TestBed.createComponent(DescribedHost);
      await df.whenStable();
      const describedInput = df.nativeElement.querySelector('input') as HTMLInputElement;
      const ids = describedInput.getAttribute('aria-describedby')!.split(' ');

      expect(ids).toContain('policy');
      expect(ids).toContain(df.nativeElement.querySelector('mat-hint').id);
    });
  });

  // Rule 7: a string input cannot spell a hint with a link in it, or a custom icon.
  describe('slots', () => {
    it('projects a hint into Material’s own hint, replacing the string', async () => {
      @Component({
        imports: [Datepicker, DatepickerHint],
        template: `
          <ui-datepicker label="Return date" hint="ignored">
            <span uiDatepickerHint>See the <a href="/policy">refund policy</a>.</span>
          </ui-datepicker>
        `,
      })
      class HintHost {}

      const f = TestBed.createComponent(HintHost);
      await f.whenStable();
      const hint = f.nativeElement.querySelector('mat-hint') as HTMLElement;

      expect(hint.querySelector('a')).not.toBeNull();
      expect(hint.textContent).not.toContain('ignored');
    });

    // The icon has to land *inside* the toggle's button, or it is an icon next to
    // the one it was meant to replace.
    it('projects a toggle icon into Material’s own slot, replacing the default', async () => {
      @Component({
        imports: [Datepicker, DatepickerToggleIcon],
        template: `
          <ui-datepicker label="Due date">
            <span uiDatepickerToggleIcon class="my-icon">📅</span>
          </ui-datepicker>
        `,
      })
      class IconHost {}

      const f = TestBed.createComponent(IconHost);
      await f.whenStable();

      expect(
        f.nativeElement.querySelector('.mat-datepicker-toggle button .my-icon'),
      ).not.toBeNull();
      expect(f.nativeElement.querySelector('.mat-datepicker-toggle-default-icon')).toBeNull();
    });

    it('keeps Material’s default icon when nothing is projected', () => {
      expect(query('.mat-datepicker-toggle-default-icon')).not.toBeNull();
    });
  });

  // Rule 4: the Material instances are reachable, so nothing here has to be
  // re-exposed one method at a time.
  describe('escape hatches', () => {
    it('opens the calendar through Material’s own instance', async () => {
      host.ref().matDatepicker().open();
      await fixture.whenStable();

      expect(host.ref().matDatepicker().opened).toBe(true);
      expect(host.opened()).toBe(true);
    });

    it('exposes the real input element', () => {
      expect(host.ref().inputElement().nativeElement).toBe(inputElement());
    });

    it('passes Material’s panelClass through to the calendar overlay', async () => {
      @Component({
        imports: [Datepicker],
        template: `<ui-datepicker #ref="uiDatepicker" label="Due date" panelClass="mine" />`,
      })
      class PanelHost {
        readonly ref = viewChild.required<Datepicker>('ref');
      }

      const f = TestBed.createComponent(PanelHost);
      await f.whenStable();

      // Material normalises a single class to an array of one.
      expect(f.componentInstance.ref().matDatepicker().panelClass).toEqual(['mine']);
    });
  });
});
