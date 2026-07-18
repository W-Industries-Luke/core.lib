import {
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  type AbstractControl,
  type ControlValueAccessor,
  type ValidationErrors,
  type Validator,
} from '@angular/forms';
import { DateAdapter } from '@angular/material/core';
import { MatChipsModule, type MatChipListboxChange } from '@angular/material/chips';
import {
  DateRange,
  MatDatepickerModule,
  MatDateRangeInput,
  MatDateRangePicker,
  type DateFilterFn,
} from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

/**
 * One named range offered next to the picker, e.g. "Last 30 days".
 *
 * A preset is a *label* plus a *function that builds a range*, not a pre-built
 * range: the function is handed the ambient {@link DateAdapter} and evaluated
 * lazily — on click, and every time the component decides which chip reads as
 * selected — so a preset is independent of the app's date library (Luxon,
 * date-fns, native `Date`) and of when the component happened to be created.
 *
 * ### Midnight
 *
 * Because presets are evaluated lazily and never cached or refreshed on a timer,
 * a page left open across midnight will show a previously-clicked chip as
 * deselected: "Last 7 days" clicked yesterday no longer equals today's "Last 7
 * days". This is accepted, not a bug — a filter should mean the same thing the
 * moment it is read as the moment it was written.
 */
export interface UiDateRangePreset<D = Date> {
  /** Chip label, shown verbatim. */
  readonly label: string;
  /**
   * Builds the range. Called with the ambient `DateAdapter` and evaluated lazily
   * (on click, and when deciding which chip reads as selected), so the preset is
   * independent of the app's date library and of when the component was created.
   */
  readonly range: (adapter: DateAdapter<D>) => DateRange<D>;
}

/** Normalises a date to the start of its day — see {@link uiDefaultDateRangePresets}. */
function startOfDay<D>(adapter: DateAdapter<D>, date: D): D {
  return adapter.createDate(adapter.getYear(date), adapter.getMonth(date), adapter.getDate(date));
}

/** Today, normalised to the start of the day. */
function startOfToday<D>(adapter: DateAdapter<D>): D {
  return startOfDay(adapter, adapter.today());
}

/**
 * The presets `ui-date-range-picker` offers unless `presets` says otherwise.
 *
 * All seven are **inclusive of today** and built only through `DateAdapter`
 * methods — never raw `Date` arithmetic — so they read correctly under any date
 * library and any locale's week start:
 *
 * | Label | Start | End |
 * | --- | --- | --- |
 * | Today | today | today |
 * | Last 7 days | today − 6 days | today |
 * | Last 30 days | today − 29 days | today |
 * | Last 90 days | today − 89 days | today |
 * | This month | 1st of this month | today |
 * | Last month | 1st of last month | last day of last month |
 * | Year to date | 1 Jan this year | today |
 *
 * "Last 30 days" spans 30 days **including** today (`today − 29 … today`); this is
 * the definition the fleet is held to, so four apps stop having four of them.
 *
 * ### Day-precision, deliberately
 *
 * `DateAdapter.today()` carries the current wall-clock time, but the endpoints
 * here are normalised to the start of the day via
 * `adapter.createDate(getYear, getMonth, getDate)`. That matters because
 * `compareDate`/`sameDate` ignore time while a consumer's raw `>=` does not: an
 * un-normalised `start` at 14:30 would silently drop everything earlier on its
 * own first day. End dates are day-precision too — a consumer wanting an
 * *exclusive* upper bound should add a day themselves (`adapter.addCalendarDays(
 * end, 1)`).
 *
 * Called as a function rather than shared as a module constant so each
 * `ui-date-range-picker` gets its own array identity (see {@link DateRangePicker.presets}).
 */
export function uiDefaultDateRangePresets<D = Date>(): UiDateRangePreset<D>[] {
  return [
    {
      label: 'Today',
      range: (adapter) => {
        const today = startOfToday(adapter);
        return new DateRange(today, today);
      },
    },
    {
      label: 'Last 7 days',
      range: (adapter) => {
        const today = startOfToday(adapter);
        return new DateRange(adapter.addCalendarDays(today, -6), today);
      },
    },
    {
      label: 'Last 30 days',
      range: (adapter) => {
        const today = startOfToday(adapter);
        return new DateRange(adapter.addCalendarDays(today, -29), today);
      },
    },
    {
      label: 'Last 90 days',
      range: (adapter) => {
        const today = startOfToday(adapter);
        return new DateRange(adapter.addCalendarDays(today, -89), today);
      },
    },
    {
      label: 'This month',
      range: (adapter) => {
        const today = startOfToday(adapter);
        const first = adapter.createDate(adapter.getYear(today), adapter.getMonth(today), 1);
        return new DateRange(first, today);
      },
    },
    {
      label: 'Last month',
      range: (adapter) => {
        const today = startOfToday(adapter);
        const firstOfThisMonth = adapter.createDate(
          adapter.getYear(today),
          adapter.getMonth(today),
          1,
        );
        const firstOfLastMonth = adapter.addCalendarMonths(firstOfThisMonth, -1);
        // The day before the 1st of this month is the last day of last month —
        // reached through the adapter rather than by knowing how long a month is.
        const lastOfLastMonth = adapter.addCalendarDays(firstOfThisMonth, -1);
        return new DateRange(firstOfLastMonth, lastOfLastMonth);
      },
    },
    {
      label: 'Year to date',
      range: (adapter) => {
        const today = startOfToday(adapter);
        const firstOfYear = adapter.createDate(adapter.getYear(today), 0, 1);
        return new DateRange(firstOfYear, today);
      },
    },
  ];
}

/** Form-field appearances a `ui-date-range-picker` may take. */
export type UiDateRangePickerAppearance = 'fill' | 'outline';

/**
 * A themed Material **date range picker**, wired as a single reactive-forms
 * control whose value is a `DateRange<D>`, with a row of preset ranges ("Last 30
 * days" and friends) beside it.
 *
 * ```html
 * <!-- Reactive forms: one binding, and the range, presets, validation and
 *      keyboard support all come with it. -->
 * <ui-date-range-picker label="Reporting period" [formControl]="period" required>
 *   <mat-error>Pick a start and an end date.</mat-error>
 * </ui-date-range-picker>
 *
 * <!-- No forms: two-way [(value)]. -->
 * <ui-date-range-picker label="Showing" [(value)]="range" />
 * ```
 *
 * Every `*.web` app that filters a list or report by date otherwise assembles
 * `MatFormField` + `mat-date-range-input` + `matStartDate`/`matEndDate` +
 * `mat-date-range-picker` by hand, wires two `FormControl`s into a `FormGroup`,
 * and hand-rolls its own preset arithmetic — which is how four apps end up with
 * four different definitions of "last 30 days". This is the single answer.
 *
 * ### Setup: provide a `DateAdapter`
 *
 * Unlike `ui-datepicker`, this component **does not provide a date adapter** — it
 * injects one. That is what keeps it generic over `D` (`DateRangePicker<D = Date>`,
 * mirroring `MatDateRangeInput<D>`): an app on Luxon or date-fns keeps its own
 * adapter and gets a `DateRange` of its own date type. Provide one at your app
 * config with `provideNativeDateAdapter()` (or your library's equivalent).
 *
 * A missing adapter surfaces as Material's own error — *"MatDateRangePicker: No
 * provider found for DateAdapter"* — and that is on the consumer to fix.
 *
 * ### Forms and two-way value
 *
 * `ui-date-range-picker` is a `ControlValueAccessor` **and** a `Validator`, so a
 * single `[formControl]`/`formControlName` binding is all a reactive form needs.
 * {@link value} is also a `model`, so `[(value)]` works with no forms directive —
 * `writeValue()` writes the same model. The two are **mutually exclusive per
 * instance**: `[(value)]` together with `formControl` is not supported.
 *
 * Reactive-forms consumers should disable through the form (`control.disable()`)
 * rather than binding `[disabled]`, because Angular warns when a `disabled`
 * attribute is combined with a form directive.
 *
 * ### Validation
 *
 * {@link validate} returns the merge of the two endpoints' own errors — Material's
 * `matDatepickerParse`, `matDatepickerMin`, `matDatepickerMax`,
 * `matDatepickerFilter`, `matStartDateInvalid`, `matEndDateInvalid` — plus
 * `{ required: true }` when {@link required} and either endpoint is missing, and
 * `{ uiDateRangeIncomplete: true }` when exactly one endpoint is set and the
 * control is not required.
 *
 * ### The ::ng-deep test
 *
 * A hint, an error or a label never needs `::ng-deep`: {@link label} is an input,
 * and a projected `<mat-hint>` / `<mat-error>` lands inside the internal
 * `<mat-form-field>`. A `<mat-error>` only renders once the control is in an error
 * state, exactly as Material intends.
 */
@Component({
  selector: 'ui-date-range-picker',
  exportAs: 'uiDateRangePicker',
  // `focusout` bubbles, so one listener on the host catches focus leaving either
  // input, either chip, or the toggle — and `handleFocusOut` ignores the moves
  // that stay inside the control.
  host: { '(focusout)': 'handleFocusOut($event)' },
  imports: [
    MatFormFieldModule,
    MatDatepickerModule,
    MatInputModule,
    MatChipsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './date-range-picker.html',
  styleUrl: './date-range-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateRangePicker), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => DateRangePicker), multi: true },
  ],
})
export class DateRangePicker<D = Date> implements ControlValueAccessor, Validator {
  // --- content ---

  /** The field's label — the name of the period being collected, e.g. `Date range`. */
  readonly label = input<string>('Date range');

  /** Placeholder shown in the start input while it is empty. */
  readonly startPlaceholder = input<string>('Start date');

  /** Placeholder shown in the end input while it is empty. */
  readonly endPlaceholder = input<string>('End date');

  /** Separator drawn between the two inputs; Material's own default. */
  readonly separator = input<string>('–');

  /** Visual style of the field's container. Defaults to `fill`. */
  readonly appearance = input<UiDateRangePickerAppearance>('fill');

  // --- presets ---

  /**
   * The preset ranges offered beside the field. Defaults to
   * {@link uiDefaultDateRangePresets}.
   *
   * Pass `[]` to hide the preset row entirely — the chip listbox is removed from
   * the DOM, not merely hidden, so an empty a11y landmark is never left behind.
   *
   * The default is evaluated per instance (see the function's docs), so every
   * picker gets its own array rather than sharing one identity.
   */
  readonly presets = input<UiDateRangePreset<D>[]>(uiDefaultDateRangePresets<D>());

  /** Accessible name for the preset chip listbox. */
  readonly presetsAriaLabel = input<string>('Date range presets');

  // --- constraints ---

  /** The earliest date that can be picked. Enforced and reported as `matDatepickerMin`. */
  readonly min = input<D | null>(null);

  /** The latest date that can be picked. Enforced and reported as `matDatepickerMax`. */
  readonly max = input<D | null>(null);

  /** Decides which dates can be picked, e.g. weekdays only. Reported as `matDatepickerFilter`. */
  readonly dateFilter = input<DateFilterFn<D> | null>(null);

  /**
   * Whether the field is required. Adds `{ required: true }` to {@link validate}
   * while either endpoint is missing.
   */
  readonly required = input(false, { transform: booleanAttribute });

  /**
   * Whether the field, its toggle and its chips are disabled.
   *
   * Reactive-forms consumers should prefer `control.disable()` — Angular warns
   * when a `disabled` attribute is combined with a form directive. Either route
   * disables everything; see {@link setDisabledState}.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Opens the calendar as a fullscreen dialog — for touch layouts. */
  readonly touchUi = input(false, { transform: booleanAttribute });

  // --- state ---

  /**
   * The selected range, two-way and independent of the forms API.
   *
   * `writeValue()` sets this too, so a `[formControl]` and `[(value)]` never
   * disagree — but do not use both on one instance. `null` is the empty value.
   */
  readonly value = model<DateRange<D> | null>(null);

  /**
   * The `MatDateRangePicker` behind the field — the escape hatch for the calendar
   * itself, e.g. `picker.matDateRangePicker().open()`.
   */
  readonly matDateRangePicker = viewChild.required<MatDateRangePicker<D>>(MatDateRangePicker);

  /** The `MatDateRangeInput` on the two inputs — the escape hatch for the range control. */
  readonly matDateRangeInput = viewChild.required<MatDateRangeInput<D>>(MatDateRangeInput);

  private readonly dateAdapter = inject<DateAdapter<D>>(DateAdapter);
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * The single source of truth for the two endpoints. Its `valueChanges` is what
   * drives {@link value} and the CVA's `onChange`; `matStartDate`/`matEndDate` bind
   * to its two controls.
   */
  protected readonly range = new FormGroup({
    start: new FormControl<D | null>(null),
    end: new FormControl<D | null>(null),
  });

  /** Whether a reactive form has disabled this control — see {@link setDisabledState}. */
  private readonly disabledByForm = signal(false);

  /** Effective disabled: the input, or a form's own `disable()`, either one. */
  protected readonly isDisabled = () => this.disabled() || this.disabledByForm();

  /**
   * The last range this component reported. Material's own range-input parts echo
   * a programmatic `setValue` back through the shared selection model — so one
   * `setValue` produces several `valueChanges`, all carrying the *same* range.
   * Collapsing on this makes `onChange` fire once per real change, and re-applying
   * an equal range (re-clicking the selected chip) a genuine no-op.
   */
  private lastRange: DateRange<D> | null = null;

  /** Suppresses `onChange` while `writeValue` writes — a forms `setValue` is not a user edit. */
  private writingValue = false;

  /** Whether a `flushRangeChange` microtask is already queued (see the `valueChanges` sub). */
  private syncScheduled = false;

  private onChange: (value: DateRange<D> | null) => void = () => {
    // Replaced by `registerOnChange` when a forms directive binds this control.
    // A picker with `[(value)]` and no form is a supported shape, not a mistake.
  };

  private onTouched: () => void = () => {
    // Replaced by `registerOnTouched`, for the same reason as `onChange`.
  };

  private onValidatorChange: () => void = () => {
    // Replaced by `registerOnValidatorChange`, for the same reason as `onChange`.
  };

  constructor() {
    // The group is the single source that updates `value` and reports user edits.
    //
    // Setting the group's two controls writes them through Material's shared
    // selection model one at a time, so a *complete* range set at once (a preset,
    // or `writeValue`) briefly passes through a half-written `{ start, null }` and
    // fires `valueChanges` twice. Coalescing to a microtask reports only the
    // settled range: a preset emits once, while typing a start and leaving the end
    // empty — two separate turns — still emits its genuine partial range.
    this.range.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.syncScheduled) {
        return;
      }
      this.syncScheduled = true;
      queueMicrotask(() => this.flushRangeChange());
    });

    // The outer control's status goes stale unless it is told the group's did —
    // typing an unparseable date changes the group's validity, not its value.
    this.range.statusChanges.pipe(takeUntilDestroyed()).subscribe(() => this.onValidatorChange());

    // Reflect an externally-set `value` (`[(value)]`, or `writeValue`) into the
    // group, without echoing it back out as a user edit (`emitEvent: false`). The
    // guard makes this idempotent, so the group→value→group round trip terminates.
    effect(() => {
      const current = this.value();
      const start = current?.start ?? null;
      const end = current?.end ?? null;
      const group = this.range.getRawValue();
      if (!this.sameEndpoint(group.start, start) || !this.sameEndpoint(group.end, end)) {
        this.range.setValue({ start, end }, { emitEvent: false });
      }
    });

    // Either disabled route drives the group, the toggle and the chips — the
    // template binds `isDisabled` for the latter two.
    effect(() => {
      if (this.isDisabled()) {
        this.range.disable({ emitEvent: false });
      } else {
        this.range.enable({ emitEvent: false });
      }
    });

    // Angular re-runs a validator on value change, not when a bound `min`/`max`/
    // filter/required does — so a range that changed after the value was set would
    // leave a stale verdict. `afterRenderEffect` so Material's own parts have
    // learned the new range from this component's `[min]`/`[max]` bindings before
    // this asks the outer control to re-validate (the same ordering `ui-datepicker`
    // relies on).
    afterRenderEffect(() => {
      this.min();
      this.max();
      this.dateFilter();
      this.required();
      this.onValidatorChange();
    });
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  writeValue(value: DateRange<D> | null): void {
    // `{ emitEvent: false }` suppresses the group's *own* emission, but Material's
    // parts still echo the write back through the selection model with a normal
    // emit — so `writingValue` guards `onChange` across that synchronous cascade: a
    // `setValue()` from the forms layer must not echo back as a user edit.
    this.writingValue = true;
    this.range.setValue(
      { start: value?.start ?? null, end: value?.end ?? null },
      { emitEvent: false },
    );
    this.writingValue = false;
    this.lastRange = value ?? null;
    this.value.set(value ?? null);
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  registerOnChange(fn: (value: DateRange<D> | null) => void): void {
    this.onChange = fn;
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  setDisabledState(isDisabled: boolean): void {
    this.disabledByForm.set(isDisabled);
  }

  /**
   * Reports the endpoints' own Material errors — `matDatepickerParse`,
   * `matDatepickerMin`, `matDatepickerMax`, `matDatepickerFilter`,
   * `matStartDateInvalid`, `matEndDateInvalid` — merged with this component's own
   * `required` / `uiDateRangeIncomplete`.
   *
   * @docs-private
   */
  validate(_control: AbstractControl): ValidationErrors | null {
    const start = this.range.controls.start;
    const end = this.range.controls.end;
    const errors: ValidationErrors = { ...start.errors, ...end.errors };

    const startMissing = start.value === null;
    const endMissing = end.value === null;
    if (this.required() && (startMissing || endMissing)) {
      errors['required'] = true;
    } else if (!this.required() && startMissing !== endMissing) {
      errors['uiDateRangeIncomplete'] = true;
    }

    return Object.keys(errors).length ? errors : null;
  }

  /** Implemented as part of `Validator`. @docs-private */
  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  /** Whether a preset reads as selected: both endpoints of the current value match its range. */
  protected isPresetSelected(preset: UiDateRangePreset<D>): boolean {
    const current = this.value();
    if (!current || current.start === null || current.end === null) {
      return false;
    }
    const range = preset.range(this.dateAdapter);
    return (
      range.start !== null &&
      range.end !== null &&
      this.dateAdapter.sameDate(current.start, range.start) &&
      this.dateAdapter.sameDate(current.end, range.end)
    );
  }

  /**
   * Applies whichever preset the user picked from the listbox. The listbox emits
   * on both mouse and keyboard selection, so this is the one seam.
   *
   * Re-picking the already-selected chip emits an empty value — Material's
   * single-select toggle — which is a no-op here rather than a clear to `null`:
   * the chip's `[selected]` binding re-derives from {@link value} and re-selects
   * it on the next change detection.
   */
  protected onPresetSelected(event: MatChipListboxChange): void {
    const preset = event.value as UiDateRangePreset<D> | null | undefined;
    if (!preset) {
      return;
    }
    const range = preset.range(this.dateAdapter);
    // Emits normally, so `value` and `onChange` both see the range.
    this.range.setValue({ start: range.start, end: range.end });
    this.onTouched();
  }

  /**
   * Reports that focus has left the *whole* control. Moving between the start and
   * end inputs is not a blur of the group — `relatedTarget` is still inside the
   * host — so `onTouched` fires only when focus leaves for good.
   */
  protected handleFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.hostElement.contains(next)) {
      this.onTouched();
    }
  }

  /** The calendar closing is also a "touched" — a range was considered, then left. */
  protected handleClosed(): void {
    this.onTouched();
  }

  /** The group's current value as a `DateRange`, or `null` when both endpoints are empty. */
  private currentRange(): DateRange<D> | null {
    const { start, end } = this.range.getRawValue();
    return start == null && end == null ? null : new DateRange<D>(start, end);
  }

  /**
   * Reports the settled range once per microtask: updates {@link value} and, unless
   * this was a forms `writeValue`, calls `onChange`. Guarded by {@link lastRange}
   * so an idempotent re-set (re-clicking the selected chip) is a genuine no-op.
   */
  private flushRangeChange(): void {
    this.syncScheduled = false;
    const settled = this.currentRange();
    if (this.rangesEqual(settled, this.lastRange)) {
      return;
    }
    this.lastRange = settled;
    this.value.set(settled);
    if (!this.writingValue) {
      this.onChange(settled);
    }
  }

  /** Day-precision endpoint equality that also handles the `null` endpoints. */
  private sameEndpoint(a: D | null, b: D | null): boolean {
    if (a === null || b === null) {
      return a === b;
    }
    return this.dateAdapter.sameDate(a, b);
  }

  /** Day-precision range equality; a `null` range and `DateRange(null, null)` are equal. */
  private rangesEqual(a: DateRange<D> | null, b: DateRange<D> | null): boolean {
    return (
      this.sameEndpoint(a?.start ?? null, b?.start ?? null) &&
      this.sameEndpoint(a?.end ?? null, b?.end ?? null)
    );
  }
}
