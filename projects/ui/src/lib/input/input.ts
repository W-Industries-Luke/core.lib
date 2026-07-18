import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  Directive,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  signal,
  viewChild,
  type AfterViewInit,
  type DoCheck,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import {
  MatError,
  MatFormField,
  MatHint,
  MatLabel,
  MatPrefix,
  MatSuffix,
  type FloatLabelType,
  type MatFormFieldAppearance,
  type SubscriptSizing,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

/**
 * The kind of text the field collects.
 *
 * A deliberate subset of the types `matInput` accepts. Each one changes what the
 * browser does for the user — `email` swaps the on-screen keyboard and turns on
 * native validation, `password` masks the value and lets a password manager see
 * a field worth filling — which is exactly why this is not "any string": a type
 * Material rejects (`checkbox`, `file`, …) throws at runtime, and a type this
 * component has no story for is one nobody has looked at.
 *
 * Richer types (`number`, `date`, …) belong to controls of their own —
 * Material's own `<mat-datepicker>` is the reason `date` is not here.
 */
export type UiInputType = 'text' | 'email' | 'password';

/**
 * Visual style of the field's container.
 *
 * Aliased from Material's own `MatFormFieldAppearance` rather than re-declared,
 * so that a change to the union upstream is a compile error here rather than an
 * appearance this component forwards and `MatFormField` throws on.
 *
 *   - `outline` — the outlined box. This library's default.
 *   - `fill` — the filled box. Material's own default.
 */
export type UiInputAppearance = MatFormFieldAppearance;

/**
 * When the floating label sits above the field rather than inside it. Aliased
 * from Material's own `FloatLabelType`, for the same reason as
 * {@link UiInputAppearance}.
 */
export type UiInputFloatLabel = FloatLabelType;

/**
 * Whether the hint/error line below the field reserves its space permanently
 * (`fixed`, Material's default) or only while there is a message (`dynamic`).
 * Aliased from Material's own `SubscriptSizing`.
 */
export type UiInputSubscriptSizing = SubscriptSizing;

/**
 * Attributes that belong to `<ui-input>` itself and are therefore left alone by
 * {@link Input.forwardAttributes}.
 *
 * Two groups. The first is everything that describes the *wrapper*: `class` and
 * `style` are how a consumer targets it, `hidden` hides the whole field rather
 * than just the control inside it, and `role` re-declares what an element *is* —
 * moving that onto the real input would strip its own `textbox` role, which is
 * the opposite of what anyone writing it wants.
 *
 * The second is this component's own inputs, spelled as HTML lowercases them.
 * Angular has already read these into signals, and each one that has a place on
 * the real input is put there by a binding in `input.html`. Leaving the
 * attributes on the host costs nothing and buys a consumer selectors that read
 * well: `ui-input[disabled]`, `ui-input[appearance='fill']`.
 */
const HOST_ATTRIBUTES: ReadonlySet<string> = new Set([
  'class',
  'style',
  'hidden',
  'role',
  'label',
  'placeholder',
  'type',
  'disabled',
  'hint',
  'error',
  'appearance',
  'value',
  'floatlabel',
  'subscriptsizing',
  'hiderequiredmarker',
  'required',
  'readonly',
  'name',
]);

/**
 * Attributes taken off the host but *not* copied onto the input, because a
 * binding in `input.html` already puts them there.
 *
 * They cannot simply stay put like the rest of {@link HOST_ATTRIBUTES}:
 *
 *   - `id` would be a duplicate of the one on the real input — two elements with
 *     one id is invalid HTML, and it is the id `<mat-label for>` points at.
 *   - `aria-describedby` names the description of a *control*, and the control
 *     is the input. Material merges it with the ids of the hint and the error it
 *     renders (`MatInput.userAriaDescribedBy`), so it has to arrive through that
 *     input rather than as an attribute Material would overwrite.
 */
const BOUND_ATTRIBUTES: ReadonlySet<string> = new Set(['id', 'aria-describedby']);

/** Whether an attribute on the host is one this component put there itself. */
function isAngularInternal(name: string): boolean {
  // `_nghost-*` / `_ngcontent-*` carry style encapsulation; `ng-reflect-*`,
  // `ng-version` and the `ng-untouched`-style state hooks are the framework's.
  return name.startsWith('_ng') || name.startsWith('ng-');
}

/**
 * Marks an element for the field's leading slot, before the text.
 *
 * ```html
 * <ui-input label="Search"><mat-icon uiInputPrefix>search</mat-icon></ui-input>
 * ```
 *
 * Put it on the element itself — not on a wrapper around it: `ng-content select`
 * only matches the direct children of `<ui-input>`, so a marker nested any deeper
 * is never projected.
 *
 * The slot is Material's own `matIconPrefix`, so the element sits inside the
 * field's box with Material's spacing and the label floats over the text rather
 * than over the icon.
 */
@Directive({ selector: '[uiInputPrefix]' })
export class InputPrefix {}

/**
 * Marks an element for the field's trailing slot, after the text — a unit, a
 * clear button, a password reveal.
 *
 * ```html
 * <ui-input label="Password" type="password">
 *   <button matIconButton uiInputSuffix type="button" aria-label="Show password">
 *     <mat-icon>visibility</mat-icon>
 *   </button>
 * </ui-input>
 * ```
 *
 * Mark the element itself, for the same reason as {@link InputPrefix}.
 */
@Directive({ selector: '[uiInputSuffix]' })
export class InputSuffix {}

/**
 * Marks an element as the field's hint, replacing the `hint` string.
 *
 * For a hint a string cannot spell — one with a link in it, or a live count:
 *
 * ```html
 * <ui-input label="API token">
 *   <span uiInputHint>See the <a href="/docs/tokens">token docs</a>.</span>
 * </ui-input>
 * ```
 *
 * Mark the element itself, for the same reason as {@link InputPrefix}. Material
 * hides the hint line while an `error` is showing, projected or not, so the two
 * never stack.
 */
@Directive({ selector: '[uiInputHint]' })
export class InputHint {}

/**
 * A themed Material text field: `<mat-form-field>` around an `<input matInput>`,
 * wired as a form control.
 *
 * ```html
 * <ui-input label="Email" type="email" hint="We only use this to sign you in." [(ngModel)]="email" />
 *
 * <ui-input label="Password" type="password" [formControl]="password"
 *           [error]="password.touched && password.invalid ? 'At least 12 characters.' : ''" />
 * ```
 *
 * Like `ui-card` and unlike `uiButton`, this is a component rather than a
 * directive: a field owns *composition* — a container, a floating label, the
 * control, a subscript that is either a hint or an error, and the wiring that
 * keeps them consistent. There is no single native element to decorate, and the
 * pieces have to be assembled in one order to work.
 *
 * ### It is Material, not a re-implementation
 *
 * The box, the outline, the floating label and its animation, the focus ring and
 * every colour are `<mat-form-field>`'s own, resolved from the `--mat-sys-*`
 * tokens that `src/styles/_theme.scss` emits — so there is not a literal colour
 * in `input.scss`, and a palette change there re-skins every field, in light and
 * dark alike.
 *
 * That includes the label. `<mat-label>` and `<input matInput>` associate
 * themselves: Material generates the input's id and points the label's `for` at
 * it, so clicking the label focuses the field and a screen reader reads the two
 * as one control. This component does not reimplement that — {@link id} is
 * handed to `MatInput`, which keeps the association pointed at whatever id the
 * field ends up with.
 *
 * ### Forms
 *
 * `ui-input` is a `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]` and
 * `formControlName` work with no adapter (rule 5) — bind the host, not the input
 * inside it. `[(value)]` is the same state without a forms directive, for a field
 * that is not part of a form.
 *
 * The value is always a `string`, as the DOM's is. A control holding a number
 * displays it, but reports back what the user typed.
 *
 * ### Errors
 *
 * `error` is a string, and it shows when it is set — nothing else. It is a
 * `<mat-error>` under Material's own `ErrorStateMatcher`, so the field turns red,
 * `aria-invalid` flips, the hint gives way to the message and Material points the
 * input's `aria-describedby` at it.
 *
 * Deciding *when* that is deliberately stays with the consumer, because only they
 * know their validation: a `required` field usually reports on blur, a
 * username-taken check reports when the server answers, and a form may want
 * nothing to go red until it is submitted. So the common shape is a ternary over
 * a control's own state, as in the example above.
 *
 * ### Native attributes reach the real input
 *
 * Anything not listed below — `aria-label`, `autocomplete`, `maxlength`,
 * `pattern`, `inputmode`, `tabindex`, `data-*`, `autofocus` — is moved from
 * `<ui-input>` onto the `<input>` inside it, statically or bound (rule 3):
 *
 * ```html
 * <ui-input label="Email" autocomplete="email" maxlength="254" [attr.aria-label]="name()" />
 * ```
 *
 * `id`, `name`, `readonly`, `required` and `aria-describedby` have inputs of
 * their own instead, because Material's own host bindings own those attributes on
 * the input — an attribute copied onto it would be overwritten on the next change
 * detection, which is a bug that only shows up later.
 *
 * ### Styling hooks
 *
 * - `--ui-input-width` — width of the field inside the host. Defaults to `100%`,
 *   so `<ui-input>` is a block that sizes the field: `ui-input { width: 20rem; }`
 *   is the whole gesture, rather than the `::ng-deep` that reaching Material's own
 *   inline-flex box would otherwise take.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiInput'` hands back the component, and {@link matFormField} /
 * {@link matInput} hand back the Material instances underneath it — so
 * `field.matInput().focus()` needs no API here (rule 4).
 */
@Component({
  selector: 'ui-input',
  exportAs: 'uiInput',
  imports: [MatFormField, MatLabel, MatHint, MatError, MatInput, MatPrefix, MatSuffix],
  templateUrl: './input.html',
  styleUrl: './input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    // The forms API resolves this off the element the directive sits on, so it
    // is what makes `<ui-input [(ngModel)]>` bind the host rather than leaving a
    // consumer to reach for the input inside it.
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Input), multi: true },
  ],
})
export class Input implements ControlValueAccessor, ErrorStateMatcher, AfterViewInit, DoCheck {
  /**
   * The field's label — the name of the thing being collected, e.g. `Email`.
   *
   * Rendered as Material's `<mat-label>`, which floats above the field once it
   * has a value or focus, and is the input's accessible name. Leave it unset only
   * for a field named some other way (`aria-label`, or a `<label for>` of your
   * own pointed at {@link id}) — an unnamed text box is an accessibility
   * violation, not a design choice.
   */
  readonly label = input<string>();

  /**
   * Short text shown inside the field while it is empty.
   *
   * A placeholder is not a label: it disappears the moment someone types, so it
   * cannot say what the field is. Use it for the *shape* of an answer —
   * `name@example.com` — over a `label` that says which answer it wants.
   */
  readonly placeholder = input<string>();

  /** The kind of text collected. Defaults to `text`. */
  readonly type = input<UiInputType>('text');

  /**
   * Whether the field is disabled.
   *
   * A reactive form's own `disable()` drives this too, through
   * `setDisabledState`, and either one is enough to disable the field — so a
   * `FormControl({disabled: true})` needs nothing here, and this input still
   * works on a field with no form at all.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Help shown under the field — a format, a rule, a reassurance.
   *
   * Material hides it while an `error` is showing, so the two never stack. For a
   * hint a string cannot spell, project a {@link InputHint} element instead.
   */
  readonly hint = input<string>();

  /**
   * The error message. The field shows it, and goes red, exactly while this is
   * set to a non-blank string.
   *
   * *When* to set it is the consumer's call — see the class docs. The message is
   * what a screen reader announces for the field, so say what to do about it
   * (`Enter an email address like name@example.com`) rather than what went wrong
   * (`Invalid`).
   */
  readonly error = input<string>();

  /** Visual style of the container. Defaults to `outline`. */
  readonly appearance = input<UiInputAppearance>('outline');

  /**
   * The field's value, two-way and independent of the forms API.
   *
   * `[(value)]` is the no-forms shape (rule 5): a filter box, a search field —
   * anywhere `[(ngModel)]` would be a directive dragged in for one binding. It
   * stays in step when a form is bound, because both write the same signal.
   *
   * Always a string, as the DOM's value is.
   */
  readonly value = model('');

  /**
   * The real input's `id`, and therefore what `<mat-label for>` points at.
   *
   * Set it to point a `<label for>` or an `aria-*` reference of your own at the
   * control. Material generates one when this is unset, so the label association
   * works either way — this only makes it a *known* id.
   *
   * The attribute is moved off `<ui-input>` when it is written there, so the page
   * never has two elements claiming one id.
   */
  readonly id = input<string>();

  /**
   * The real input's `name`, for native form submission.
   *
   * `[(ngModel)]` inside a `<form>` reads the same attribute for its own
   * registration, so writing `name` once serves both.
   */
  readonly name = input<string>();

  /**
   * Whether the value can be read but not edited.
   *
   * Not the same as `disabled`: a readonly field stays focusable, stays in the
   * tab order, is announced normally, and is submitted with the form. It is the
   * one to reach for when a value is *shown* rather than *unavailable*.
   */
  readonly readonly = input(false, { transform: booleanAttribute });

  /**
   * Whether the field is required, which adds Material's asterisk to the label
   * and sets `aria-required` on the input.
   *
   * This is presentation and semantics, not validation: it says the field is
   * required, it does not enforce it. Angular's own `required` validator matches
   * the same attribute on `<ui-input [(ngModel)] required>`, so writing it once
   * gets both.
   */
  readonly required = input(false, { transform: booleanAttribute });

  /** Whether Material's required asterisk is hidden on a `required` field. */
  readonly hideRequiredMarker = input(false, { transform: booleanAttribute });

  /**
   * When the label floats above the field. Defaults to Material's `auto` — it
   * floats once the field has focus or a value.
   *
   * `always` keeps it up, which is what a field with a `placeholder` wants: the
   * two occupy the same space, so an `auto` label hides the placeholder it is
   * meant to explain.
   */
  readonly floatLabel = input<UiInputFloatLabel>('auto');

  /**
   * Whether the subscript line reserves its space when empty.
   *
   * Material's `fixed` default keeps a row of fields from jumping when one of
   * them shows an error. `dynamic` gives the space back, for a field standing on
   * its own where nothing below it would move.
   */
  readonly subscriptSizing = input<UiInputSubscriptSizing>('fixed');

  /**
   * The ids of elements describing the control, spelled as the ARIA attribute.
   *
   * An input rather than a forwarded attribute because Material owns this one on
   * the real input: it merges these ids with the hint's and the error's, so all
   * of them are announced. An attribute copied onto the input would be
   * overwritten the moment either of those changed.
   */
  readonly ariaDescribedby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-describedby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The `MatFormField` this component renders — the escape hatch for anything not
   * wrapped here. Reach it with `#field="uiInput"` and `field.matFormField()`.
   */
  readonly matFormField = viewChild.required(MatFormField);

  /**
   * The `MatInput` on the real `<input>` — the escape hatch for the control
   * itself, e.g. `field.matInput().focus()` or `disabledInteractive`.
   */
  readonly matInput = viewChild.required(MatInput);

  /** The real `<input>` element, for anything neither Material nor this wraps. */
  readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('input');

  /** Whether an `error` is set, and therefore whether the field is in an error state. */
  readonly hasError = computed(() => !!this.error()?.trim());

  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  /** Whether a reactive form has disabled this control — see `setDisabledState`. */
  private readonly disabledByForm = signal(false);

  /**
   * Whether the control is disabled by either route.
   *
   * The two are independent on purpose: a form disabling a control must not
   * silently un-set a `disabled` a template wrote, and vice versa.
   */
  protected readonly isDisabled = computed(() => this.disabled() || this.disabledByForm());

  protected readonly prefixSlot = contentChild(InputPrefix, { descendants: false });
  protected readonly suffixSlot = contentChild(InputSuffix, { descendants: false });
  protected readonly hintSlot = contentChild(InputHint, { descendants: false });

  /**
   * Handed to `MatInput` as its `errorStateMatcher`, so that the error state is
   * Material's own mechanism rather than a class this component paints on.
   *
   * A property rather than `[errorStateMatcher]="this"`, which the template
   * expression parser has no receiver for.
   */
  protected readonly errorStateMatcher: ErrorStateMatcher = this;

  private onChange: (value: string) => void = () => {
    // Replaced by `registerOnChange` when a forms directive binds this control.
    // Until then there is nobody to report a change to — a field with `[(value)]`
    // and no form is a supported shape, not a mistake.
  };

  private onTouched: () => void = () => {
    // Replaced by `registerOnTouched`, for the same reason as `onChange`.
  };

  /** Whether the view — and therefore {@link matInput} — has been created. */
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.forwardAttributes();

    // Static attributes are on the host before this runs, but a bound one
    // (`[attr.aria-label]="…"`) lands there again every time it changes, and a
    // consumer's binding must not stop working after the first paint. Observing
    // the host is what keeps rule 3 true for the dynamic case.
    //
    // This terminates: the callback only ever *removes* attributes from the host,
    // and a run that finds nothing to move makes no mutations to observe.
    if (typeof MutationObserver === 'undefined') {
      return;
    }
    const observer = new MutationObserver(() => this.forwardAttributes());
    observer.observe(this.hostElement, { attributes: true });
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  /**
   * Re-checks Material's error state on every change detection pass.
   *
   * `MatInput` does this itself in its own `ngDoCheck`, but only for an input that
   * has an `NgControl` of its own (see `@angular/material/input`). Here the
   * `NgControl` is on `<ui-input>` — that is what makes `[(ngModel)]` bind the host
   * rather than the input — so `MatInput` never sees one and the re-check has to be
   * driven from this side.
   *
   * It runs here rather than in an `effect()` so that it is *synchronous with*
   * change detection: `error()` is read in the template, so a change to it already
   * schedules the pass this hook runs in, and Material's `errorState` — the field's
   * red outline, `aria-invalid`, and whether `<mat-form-field>` shows the error
   * subscript at all — is updated in that same pass. An effect's flush is not tied
   * to the render, so under a host that drives change detection manually and never
   * flushes effects (Storybook's own renderer among them) the message would render
   * but the field would stay valid — issue #122.
   */
  ngDoCheck(): void {
    // `matInput` is a `viewChild.required`, so it must not be read before the view
    // that holds it exists — the first `ngDoCheck` runs before `ngAfterViewInit`.
    if (this.viewReady) {
      this.matInput().updateErrorState();
    }
  }

  /**
   * Whether the field is in an error state, as Material's `ErrorStateMatcher`.
   *
   * The control and form are ignored — `error` being set *is* the error state, so
   * that a consumer's own rule for when to show a message is the only rule, and
   * the message and the red box can never disagree about whether there is one.
   */
  isErrorState(): boolean {
    return this.hasError();
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  writeValue(value: unknown): void {
    // Coerced rather than trusted: a control can hold anything, and the DOM's
    // value is a string. `null` is a form's empty value, and `String(null)` is
    // the word "null" — which is what a user would see in the field.
    this.value.set(value == null ? '' : String(value));
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  registerOnChange(fn: (value: string) => void): void {
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

  protected handleInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    this.onChange(value);
  }

  /**
   * Reports that the user has been in and out of the field, which is what a form
   * means by "touched" — and what a consumer's `control.touched && …` rule for
   * showing an error is usually waiting on.
   */
  protected handleBlur(): void {
    this.onTouched();
  }

  /**
   * Moves every attribute that is not this component's own from `<ui-input>` onto
   * the real `<input>`, so that a consumer's `aria-label`, `autocomplete`,
   * `maxlength`, `tabindex` or `data-*` reaches the element it is about (rule 3).
   *
   * *Moves* rather than copies: two elements carrying one `data-testid` is an
   * ambiguous query, and a `tabindex` left behind would be a second tab stop on a
   * wrapper that is not a control.
   */
  private forwardAttributes(): void {
    const input = this.inputElement().nativeElement;

    // A live NamedNodeMap, and this loop removes from it — hence the copy.
    for (const { name, value } of Array.from(this.hostElement.attributes)) {
      if (HOST_ATTRIBUTES.has(name) || isAngularInternal(name)) {
        continue;
      }
      this.hostElement.removeAttribute(name);
      if (!BOUND_ATTRIBUTES.has(name)) {
        input.setAttribute(name, value);
      }
    }
  }
}
