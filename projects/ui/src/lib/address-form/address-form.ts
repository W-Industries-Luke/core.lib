import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  input,
  model,
  signal,
} from '@angular/core';
import {
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  type ControlValueAccessor,
  type ValidationErrors,
  type Validator,
} from '@angular/forms';

import { Input } from '../input/input';
import { Select, type UiSelectOption } from '../select/select';
import {
  EMPTY_ADDRESS,
  resolveAddressSchema,
  UI_ADDRESS_COUNTRIES,
  UI_ADDRESS_SCHEMAS,
  type UiAddress,
  type UiAddressCountrySchema,
  type UiAddressField,
  type UiAddressFieldSchema,
} from './address-schema';

/** Coerces whatever a form control holds for a field into the string the DOM wants. */
function asString(value: unknown): string {
  return value == null ? '' : String(value);
}

/**
 * A locale-aware address form, composed from `ui-input` and `ui-select` and wired
 * as a single form control over a typed {@link UiAddress}.
 *
 * ```html
 * <ui-address-form [(ngModel)]="address" country="US" />
 *
 * <ui-address-form
 *   [formControl]="address"
 *   [requiredFields]="['line1', 'city', 'region', 'postalCode']"
 * />
 * ```
 *
 * This is the library's first *composite*: unlike `ui-input` or `ui-select`, which
 * each wrap one Material control, this assembles several of them into one control
 * of its own. It builds on the primitives rather than re-implementing fields —
 * every box below is a `ui-input` or a `ui-select`, so the theme, the error
 * treatment, the `--mat-sys-*` colours and the a11y wiring are all inherited, not
 * repeated. There is not a literal colour in `address-form.scss`.
 *
 * ### Locale-aware, and data-driven
 *
 * The field set, its order, the labels (`State`/`ZIP code` vs `County`/`Postcode`)
 * and the per-field validation all come from a {@link UiAddressCountrySchema},
 * chosen by the selected {@link country}. There is no US-shaped markup — the
 * template is generated from whichever schema is active, so adding a country is
 * adding a schema to {@link schemas}, never editing this component. The US, UK and
 * Canadian schemas ship; anything else falls back to a generic layout.
 *
 * ### Forms
 *
 * `ui-address-form` is a `ControlValueAccessor` *and* a `Validator`, so
 * `[(ngModel)]`, `[formControl]` and `formControlName` bind the whole address with
 * no adapter (rule 5), and the field-level errors surface through the bound
 * control's own validity — `validate()` reports them, so a parent form is invalid
 * exactly when a field is. `[(value)]` is the same address without a forms
 * directive.
 *
 * ### Errors
 *
 * Each field shows its own message — through the same `error` input `ui-input`
 * and `ui-select` already expose — once it has been blurred, or immediately when
 * {@link showErrors} is set (which is how a parent reveals every error on submit).
 * The messages come from the schema, so they read in the country's own terms.
 *
 * ### Styling hooks
 *
 * - `--ui-address-form-columns` — the grid's column count (default `2`). A field's
 *   `span` decides whether it fills the row or shares it, so `State` and `ZIP`
 *   sit side by side at two columns and stack at one.
 * - `--ui-address-form-gap` — the gap between fields.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiAddressForm'` hands the component back, and {@link value} /
 * {@link errors} are public signals — so a template can read the live address and
 * its validity without a form directive at all.
 */
@Component({
  selector: 'ui-address-form',
  exportAs: 'uiAddressForm',
  imports: [Input, Select],
  templateUrl: './address-form.html',
  styleUrl: './address-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    // Bind the host, not the fields inside it: this is what makes
    // `<ui-address-form [(ngModel)]>` write the whole address.
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AddressForm), multi: true },
    // The field-level validation is the control's validation — so a parent form is
    // invalid exactly when a field is, with no second source of truth.
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => AddressForm), multi: true },
  ],
})
export class AddressForm implements ControlValueAccessor, Validator {
  /**
   * The countries offered in the picker, as `<ui-select>` options.
   *
   * Defaults to the countries that have a shipped schema. Pass your own to widen
   * or narrow the list — a value with no matching {@link schemas} entry still
   * works, falling back to the generic layout.
   */
  readonly countries = input<readonly UiSelectOption<string>[]>(UI_ADDRESS_COUNTRIES);

  /**
   * The default country, as an ISO 3166-1 alpha-2 code — the schema used until the
   * value carries a country of its own.
   *
   * This is a *default*, not an override: once the bound value has a `country`, or
   * the user picks one, that wins. Defaults to `US`.
   */
  readonly country = input<string>('US');

  /**
   * The address layouts to choose from, keyed by country code.
   *
   * Defaults to {@link UI_ADDRESS_SCHEMAS} (US, UK, Canada, and a generic
   * fallback). Because locale-awareness is entirely these records, adding or
   * changing a country is passing a new list here — no change to this component.
   */
  readonly schemas = input<readonly UiAddressCountrySchema[]>(UI_ADDRESS_SCHEMAS);

  /**
   * Which fields are required, overriding the active schema's own defaults.
   *
   * Leave unset to use each schema's `required` flags (a US address needs a state
   * and a ZIP; line 2 never does). Set it to take control — an empty array makes
   * every field optional.
   */
  readonly requiredFields = input<readonly UiAddressField[] | undefined>(undefined);

  /**
   * Whether the whole form is disabled. A reactive form's own `disable()` drives
   * this too, through `setDisabledState`, so a `FormControl({disabled: true})`
   * needs nothing here.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Show every field's error at once, rather than waiting for each to be blurred.
   *
   * The usual trigger is a submit: a parent that wants all outstanding errors
   * revealed sets this instead of reaching into each field. Untouched fields still
   * validate the same way — this only decides *when* the message is shown.
   */
  readonly showErrors = input(false, { transform: booleanAttribute });

  /**
   * An accessible name for the group of fields, set as the group's `aria-label`
   * — e.g. `Billing address`, to tell two address forms on a page apart.
   */
  readonly ariaLabel = input<string | undefined>(undefined, { alias: 'aria-label' });

  /**
   * The address, two-way and independent of the forms API (rule 5).
   *
   * `[(value)]` is the no-forms shape; it stays in step with `[(ngModel)]` or a
   * `[formControl]` when one is bound, because both write this signal. Always a
   * full {@link UiAddress} — every key present, every value a string.
   */
  readonly value = model<UiAddress>({ ...EMPTY_ADDRESS });

  /** The active country — the value's own, or {@link country} until it has one. */
  readonly activeCountry = computed(() => this.value().country || this.country());

  /** The schema in force, resolved from {@link activeCountry} against {@link schemas}. */
  readonly schema = computed<UiAddressCountrySchema>(() =>
    resolveAddressSchema(this.activeCountry(), this.schemas()),
  );

  /**
   * The current address, with {@link activeCountry} resolved into it — what the
   * control reports and what {@link errors} validates.
   */
  readonly currentValue = computed<UiAddress>(() => ({
    ...this.value(),
    country: this.activeCountry(),
  }));

  /**
   * The validation errors, keyed by field, in the shape Angular's own validators
   * produce (`{ required: true }`, `{ pattern: {...} }`). Empty when the address
   * is valid. This is the source both {@link validate} and the field messages read.
   */
  readonly errors = computed<Readonly<Record<string, ValidationErrors>>>(() => {
    const value = this.currentValue();
    const result: Record<string, ValidationErrors> = {};

    for (const field of this.schema().fields) {
      const raw = value[field.key] ?? '';
      const trimmed = raw.trim();

      if (this.isRequired(field) && !trimmed) {
        result[field.key] = { required: true };
      } else if (trimmed && field.pattern && !field.pattern.test(trimmed)) {
        result[field.key] = {
          pattern: { requiredPattern: String(field.pattern), actualValue: raw },
        };
      }
    }

    return result;
  });

  private readonly disabledByForm = signal(false);

  /** Disabled by the template input or by a reactive form — either is enough. */
  protected readonly isDisabled = computed(() => this.disabled() || this.disabledByForm());

  /** The fields the user has blurred, so an error is not shown before then. */
  private readonly touchedFields = signal<ReadonlySet<UiAddressField>>(new Set());

  private onChange: (value: UiAddress) => void = () => {
    // Replaced by `registerOnChange` when a forms directive binds this control.
  };

  private onTouched: () => void = () => {
    // Replaced by `registerOnTouched`.
  };

  private onValidatorChange: () => void = () => {
    // Replaced by `registerOnValidatorChange` — see the constructor effect.
  };

  constructor() {
    // A change to the schema, the required set or the value changes what
    // `validate()` returns, so the bound control has to be told to re-run it —
    // otherwise a parent form's validity would lag a country switch.
    effect(() => {
      this.errors();
      this.onValidatorChange();
    });
  }

  /** Whether a field is required — the {@link requiredFields} override, or the schema's flag. */
  protected isRequired(field: UiAddressFieldSchema): boolean {
    const override = this.requiredFields();
    return override ? override.includes(field.key) : !!field.required;
  }

  /**
   * The message to show under a field: its schema error, but only once the field
   * has been blurred or {@link showErrors} is set. Blank means no message.
   */
  protected errorFor(field: UiAddressFieldSchema): string {
    const error = this.errors()[field.key];
    if (!error || (!this.showErrors() && !this.touchedFields().has(field.key))) {
      return '';
    }
    if (error['required']) {
      return `${field.label} is required.`;
    }
    if (error['pattern']) {
      return field.patternError ?? `Enter a valid ${field.label.toLowerCase()}.`;
    }
    return '';
  }

  /**
   * Writes one field, keeping the rest, and reports the whole address to the form.
   *
   * `fieldValue` is `unknown` because it arrives from two different controls: a
   * `ui-input` emits a string, a `ui-select` its option value — both coerced to
   * the string the address holds.
   */
  protected patch(key: keyof UiAddress, fieldValue: unknown): void {
    this.value.set({ ...this.value(), [key]: asString(fieldValue) });
    this.onChange(this.currentValue());
  }

  /**
   * Marks a field blurred, which is what reveals its error and what "touched"
   * means to a bound control — a form's `control.touched && …` rule waits on it.
   */
  protected markTouched(field: UiAddressField): void {
    if (!this.touchedFields().has(field)) {
      this.touchedFields.set(new Set(this.touchedFields()).add(field));
    }
    this.onTouched();
  }

  /** @docs-private */
  writeValue(value: unknown): void {
    const partial = (value ?? {}) as Partial<UiAddress>;
    this.value.set({
      line1: asString(partial.line1),
      line2: asString(partial.line2),
      city: asString(partial.city),
      region: asString(partial.region),
      postalCode: asString(partial.postalCode),
      country: asString(partial.country),
    });
  }

  /** @docs-private */
  registerOnChange(fn: (value: UiAddress) => void): void {
    this.onChange = fn;
  }

  /** @docs-private */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /** @docs-private */
  setDisabledState(isDisabled: boolean): void {
    this.disabledByForm.set(isDisabled);
  }

  /**
   * Reports the field errors to the bound control, in the shape reactive forms
   * expect: `{ address: { <field>: <errors> } }`, or `null` when valid. This is
   * what makes a parent form invalid exactly when a field is — the validation is
   * exposed through the CVA, not just painted on (rule 5).
   *
   * @docs-private
   */
  validate(): ValidationErrors | null {
    const errors = this.errors();
    return Object.keys(errors).length > 0 ? { address: errors } : null;
  }

  /** @docs-private */
  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }
}
