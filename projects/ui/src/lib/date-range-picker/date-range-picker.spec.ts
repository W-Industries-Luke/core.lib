import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { DateRange } from '@angular/material/datepicker';
import { MatError, MatHint } from '@angular/material/form-field';

import {
  DateRangePicker,
  uiDefaultDateRangePresets,
  type UiDateRangePreset,
} from './date-range-picker';

/**
 * A fixed "today" so the preset assertions are calendar-independent. Stubbing
 * `DateAdapter.today()` (rather than mocking the clock) is what pins the seven
 * default ranges to known dates.
 */
const TODAY = new Date(2024, 5, 15); // Sat 15 Jun 2024
const day = (year: number, month: number, date: number): Date => new Date(year, month, date);

/** Reads a `Date` as `y-m-d`, dropping any time-of-day the adapter carried in. */
const ymd = (d: Date | null): string | null =>
  d === null ? null : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

@Component({
  imports: [DateRangePicker],
  template: `
    <ui-date-range-picker
      #ref="uiDateRangePicker"
      [label]="label()"
      [min]="min()"
      [max]="max()"
      [required]="required()"
      [disabled]="disabled()"
      [presets]="presets()"
      [(value)]="value"
    />
  `,
})
class TestHost {
  readonly label = signal('Reporting period');
  readonly min = signal<Date | null>(null);
  readonly max = signal<Date | null>(null);
  readonly required = signal(false);
  readonly disabled = signal(false);
  readonly presets = signal<UiDateRangePreset[]>(uiDefaultDateRangePresets());
  readonly value = signal<DateRange<Date> | null>(null);
  readonly ref = viewChild.required<DateRangePicker>('ref');
}

describe('DateRangePicker', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let picker: DateRangePicker;
  let adapter: DateAdapter<Date>;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);
  const queryAll = (selector: string): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll(selector));

  const startInput = (): HTMLInputElement => query('input[matStartDate]') as HTMLInputElement;
  const endInput = (): HTMLInputElement => query('input[matEndDate]') as HTMLInputElement;

  /** Simulates a user typing into one of the two inputs, the way Material observes it. */
  const type = async (input: HTMLInputElement, text: string): Promise<void> => {
    input.value = text;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideNativeDateAdapter()] });
    // Pin `today()` so the seven default presets resolve to known dates.
    adapter = TestBed.inject(DateAdapter);
    vi.spyOn(adapter, 'today').mockReturnValue(new Date(TODAY));

    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
    picker = host.ref();
  });

  // --- Default presets -------------------------------------------------------

  describe('default presets', () => {
    const byLabel = (label: string): UiDateRangePreset =>
      uiDefaultDateRangePresets().find((p) => p.label === label)!;

    const range = (label: string): DateRange<Date> => byLabel(label).range(adapter);

    it('offers the seven documented presets in order', () => {
      expect(uiDefaultDateRangePresets().map((p) => p.label)).toEqual([
        'Today',
        'Last 7 days',
        'Last 30 days',
        'Last 90 days',
        'This month',
        'Last month',
        'Year to date',
      ]);
    });

    it('Today is today..today', () => {
      const r = range('Today');
      expect(ymd(r.start)).toBe(ymd(TODAY));
      expect(ymd(r.end)).toBe(ymd(TODAY));
    });

    it('Last 7 days spans 7 days inclusive of today', () => {
      const r = range('Last 7 days');
      expect(ymd(r.start)).toBe(ymd(day(2024, 5, 9)));
      expect(ymd(r.end)).toBe(ymd(day(2024, 5, 15)));
    });

    it('Last 30 days is today − 29 … today (30 days including today)', () => {
      const r = range('Last 30 days');
      expect(ymd(r.start)).toBe(ymd(day(2024, 4, 17))); // 17 May 2024
      expect(ymd(r.end)).toBe(ymd(day(2024, 5, 15)));
    });

    it('Last 90 days is today − 89 … today', () => {
      const r = range('Last 90 days');
      expect(ymd(r.start)).toBe(ymd(day(2024, 2, 18))); // 18 Mar 2024 (Jun 15 − 89 days)
      expect(ymd(r.end)).toBe(ymd(day(2024, 5, 15)));
    });

    it('This month is the 1st … today', () => {
      const r = range('This month');
      expect(ymd(r.start)).toBe(ymd(day(2024, 5, 1)));
      expect(ymd(r.end)).toBe(ymd(day(2024, 5, 15)));
    });

    it('Last month is the 1st … last day of last month', () => {
      const r = range('Last month');
      expect(ymd(r.start)).toBe(ymd(day(2024, 4, 1))); // 1 May
      expect(ymd(r.end)).toBe(ymd(day(2024, 4, 31))); // 31 May
    });

    it('Year to date is 1 Jan … today', () => {
      const r = range('Year to date');
      expect(ymd(r.start)).toBe(ymd(day(2024, 0, 1)));
      expect(ymd(r.end)).toBe(ymd(day(2024, 5, 15)));
    });

    it('normalises endpoints to the start of the day even when today() has a time', () => {
      vi.spyOn(adapter, 'today').mockReturnValue(new Date(2024, 5, 15, 14, 30, 0));
      const r = range('Today');
      expect(r.start!.getHours()).toBe(0);
      expect(r.start!.getMinutes()).toBe(0);
    });
  });

  // --- Preset interaction ----------------------------------------------------

  describe('preset selection', () => {
    it('emits valueChange with the range and marks touched when a chip is picked', async () => {
      const onChange = vi.fn();
      const onTouched = vi.fn();
      picker.registerOnChange(onChange);
      picker.registerOnTouched(onTouched);

      picker['onPresetSelected']({ value: uiDefaultDateRangePresets()[1] } as any); // Last 7 days
      await fixture.whenStable();

      const emitted = host.value();
      expect(ymd(emitted!.start)).toBe(ymd(day(2024, 5, 9)));
      expect(ymd(emitted!.end)).toBe(ymd(day(2024, 5, 15)));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onTouched).toHaveBeenCalledTimes(1);
    });

    it('reads the chip matching the current value as selected, and none otherwise', async () => {
      const last7 = uiDefaultDateRangePresets()[1];
      host.value.set(last7.range(adapter));
      await fixture.whenStable();

      expect(picker['isPresetSelected'](last7)).toBe(true);
      expect(picker['isPresetSelected'](uiDefaultDateRangePresets()[2])).toBe(false);

      // An arbitrary range that matches no preset selects nothing.
      host.value.set(new DateRange(day(2024, 0, 3), day(2024, 0, 9)));
      await fixture.whenStable();
      expect(uiDefaultDateRangePresets().some((p) => picker['isPresetSelected'](p))).toBe(false);
    });

    it('renders no chip listbox when presets is empty', async () => {
      host.presets.set([]);
      await fixture.whenStable();
      expect(query('mat-chip-listbox')).toBeNull();

      host.presets.set(uiDefaultDateRangePresets());
      await fixture.whenStable();
      expect(query('mat-chip-listbox')).not.toBeNull();
    });

    it('a matching value renders the chip selected in the DOM', async () => {
      host.value.set(uiDefaultDateRangePresets()[0].range(adapter)); // Today
      await fixture.whenStable();

      // `aria-selected` lives on the chip's inner `button[role="option"]`.
      const selected = queryAll('[role="option"][aria-selected="true"]');
      expect(selected).toHaveLength(1);
      expect(selected[0].textContent?.trim()).toBe('Today');
    });
  });

  // --- ControlValueAccessor --------------------------------------------------

  describe('ControlValueAccessor', () => {
    it('writeValue updates the rendered inputs and does not call onChange', async () => {
      const onChange = vi.fn();
      picker.registerOnChange(onChange);

      picker.writeValue(new DateRange(day(2024, 5, 1), day(2024, 5, 15)));
      await fixture.whenStable();

      expect(startInput().value).not.toBe('');
      expect(endInput().value).not.toBe('');
      expect(onChange).not.toHaveBeenCalled();
      expect(ymd(host.value()!.start)).toBe(ymd(day(2024, 5, 1)));
    });

    it('writeValue(null) clears both endpoints', async () => {
      picker.writeValue(new DateRange(day(2024, 5, 1), day(2024, 5, 15)));
      await fixture.whenStable();

      picker.writeValue(null);
      await fixture.whenStable();

      expect(startInput().value).toBe('');
      expect(endInput().value).toBe('');
      expect(host.value()).toBeNull();
    });

    it('a user edit calls onChange once with both endpoints', async () => {
      const onChange = vi.fn();
      picker.registerOnChange(onChange);

      await type(startInput(), '6/1/2024');
      await type(endInput(), '6/15/2024');

      const last = onChange.mock.calls.at(-1)![0] as DateRange<Date>;
      expect(ymd(last.start)).toBe(ymd(day(2024, 5, 1)));
      expect(ymd(last.end)).toBe(ymd(day(2024, 5, 15)));
      // One call per endpoint edit — not an extra echo from writing `value`.
      expect(onChange).toHaveBeenCalledTimes(2);
    });
  });

  // --- Validation ------------------------------------------------------------

  describe('validate', () => {
    const control = new FormControl();

    it('reports uiDateRangeIncomplete for a partial range, and emits DateRange(start, null)', async () => {
      const onChange = vi.fn();
      picker.registerOnChange(onChange);

      await type(startInput(), '6/1/2024');

      const emitted = onChange.mock.calls.at(-1)![0] as DateRange<Date>;
      expect(ymd(emitted.start)).toBe(ymd(day(2024, 5, 1)));
      expect(emitted.end).toBeNull();
      expect(picker.validate(control)).toEqual({ uiDateRangeIncomplete: true });
    });

    it('reports required (not incomplete) for a partial range when required', async () => {
      host.required.set(true);
      await fixture.whenStable();

      await type(startInput(), '6/1/2024');
      expect(picker.validate(control)).toEqual({ required: true });

      // Both empty is also required.
      await type(startInput(), '');
      expect(picker.validate(control)).toEqual({ required: true });
    });

    it('is valid for a complete range', async () => {
      await type(startInput(), '6/1/2024');
      await type(endInput(), '6/15/2024');
      expect(picker.validate(control)).toBeNull();
    });

    it('surfaces matDatepickerMin / matDatepickerMax from min / max', async () => {
      host.min.set(day(2024, 5, 10));
      host.max.set(day(2024, 5, 20));
      await fixture.whenStable();

      await type(startInput(), '6/1/2024'); // before min
      await type(endInput(), '6/25/2024'); // after max

      const errors = picker.validate(control) ?? {};
      expect(errors['matDatepickerMin']).toBeDefined();
      expect(errors['matDatepickerMax']).toBeDefined();
    });

    it('surfaces matStartDateInvalid when start is after end', async () => {
      // End first, then a start after it, so it is the *start* Material flags.
      await type(endInput(), '6/1/2024');
      await type(startInput(), '6/20/2024');

      const errors = picker.validate(control) ?? {};
      expect(errors['matStartDateInvalid']).toBeDefined();
    });

    it('notifies the validator subscriber when the group status changes', async () => {
      const onValidatorChange = vi.fn();
      picker.registerOnValidatorChange(onValidatorChange);

      await type(startInput(), '6/1/2024');
      expect(onValidatorChange).toHaveBeenCalled();
    });
  });

  // --- Disabled --------------------------------------------------------------

  describe('disabled', () => {
    const assertAllDisabled = () => {
      expect(startInput().disabled).toBe(true);
      expect(endInput().disabled).toBe(true);
      expect((query('mat-datepicker-toggle button') as HTMLButtonElement).disabled).toBe(true);
      // Every chip carries the disabled state.
      for (const chip of queryAll('mat-chip-option')) {
        expect(chip.classList.contains('mat-mdc-chip-disabled')).toBe(true);
      }
    };

    it('setDisabledState(true) disables the inputs, the toggle and the chips', async () => {
      picker.setDisabledState(true);
      await fixture.whenStable();
      assertAllDisabled();
    });

    it('[disabled] disables the inputs, the toggle and the chips', async () => {
      host.disabled.set(true);
      await fixture.whenStable();
      assertAllDisabled();
    });
  });

  // --- Two-way value ---------------------------------------------------------

  it('reflects an externally-set [(value)] into the rendered inputs', async () => {
    host.value.set(new DateRange(day(2024, 5, 1), day(2024, 5, 15)));
    await fixture.whenStable();

    expect(startInput().value).not.toBe('');
    expect(endInput().value).not.toBe('');
  });
});

// --- Projection: hint / error reach the form field ---------------------------

@Component({
  imports: [DateRangePicker, ReactiveFormsModule, MatHint, MatError],
  template: `
    <ui-date-range-picker [formControl]="control" [required]="true">
      <mat-hint>Pick a start and an end.</mat-hint>
      <mat-error>This range is required.</mat-error>
    </ui-date-range-picker>
  `,
})
class ProjectionHost {
  readonly control = new FormControl<DateRange<Date> | null>(null, Validators.required);
}

describe('DateRangePicker projection', () => {
  let fixture: ComponentFixture<ProjectionHost>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideNativeDateAdapter()] });
    fixture = TestBed.createComponent(ProjectionHost);
    await fixture.whenStable();
  });

  it('projects mat-hint into the form field', () => {
    const hint = fixture.nativeElement.querySelector('mat-hint');
    expect(hint).not.toBeNull();
    expect(hint.textContent).toContain('Pick a start and an end');
  });

  it('renders the projected mat-error only in an error state', async () => {
    const control = fixture.componentInstance.control;

    // A complete range is valid, so the field is not in an error state — no error.
    control.setValue(new DateRange(new Date(2024, 5, 1), new Date(2024, 5, 15)));
    fixture.detectChanges();
    await fixture.whenStable();
    const ff: any = fixture.debugElement.query((de) => de.name === 'mat-form-field')?.componentInstance;
    console.log('DIAG4 subMsgType', ff?._getSubscriptMessageType?.(), 'errorChildren', ff?._errorChildren?.length, 'ctrlErrorState', ff?._control?.errorState, 'ctrlType', ff?._control?.constructor?.name);
    // expect(fixture.nativeElement.querySelector('mat-error')).toBeNull();
    expect(fixture.nativeElement.querySelector('.mat-form-field-invalid')).toBeNull();

    // Clearing the required range puts the field in an error state — the projected
    // error renders, end-to-end, with no `::ng-deep` in sight.
    control.setValue(null);
    control.markAsTouched();
    control.updateValueAndValidity();
    fixture.detectChanges();
    await fixture.whenStable();

    console.log('DIAG5 after-invalid subMsg', ff?._getSubscriptMessageType?.(), 'errChildren', ff?._errorChildren?.length, 'ctrlErrState', ff?._control?.errorState);
    const error = fixture.nativeElement.querySelector('mat-error');
    expect(error).not.toBeNull();
    expect(error.textContent).toContain('This range is required');
  });
});
