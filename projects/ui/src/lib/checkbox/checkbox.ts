import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
  type AfterViewInit,
  type Signal,
} from '@angular/core';
import {
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  type AbstractControl,
  type ControlValueAccessor,
  type ValidationErrors,
  type Validator,
} from '@angular/forms';
import { MatCheckbox, type MatCheckboxChange } from '@angular/material/checkbox';

/**
 * Which side of the box the label sits on.
 *
 * Aliased from `MatCheckbox.labelPosition` rather than re-declared, so that a
 * change to the union upstream is a compile error here rather than a value this
 * component forwards and Material lays out wrong.
 *
 *   - `after` — the label to the right of the box (in LTR). Material's default,
 *     and this library's: it is what a form's checkboxes should almost always be.
 *   - `before` — the label to the left, for a settings row where the label is the
 *     row and the box is its control.
 */
export type UiCheckboxLabelPosition = MatCheckbox['labelPosition'];

/**
 * Attributes that belong to `<ui-checkbox>` itself and are therefore left alone
 * by {@link Checkbox.forwardAttributes}.
 *
 * Two groups. The first is everything that describes the *wrapper*: `class` and
 * `style` are how a consumer targets it, `hidden` hides the whole control rather
 * than just the box inside it, and `role` re-declares what an element *is* —
 * moving that onto the real input would strip its own `checkbox` role, which is
 * the opposite of what anyone writing it wants.
 *
 * The second is this component's own inputs, spelled as HTML lowercases them.
 * Angular has already read these into signals, and each one that has a place on
 * the real input is put there by a binding in `checkbox.html`. Leaving the
 * attributes on the host costs nothing and buys a consumer selectors that read
 * well: `ui-checkbox[disabled]`, `ui-checkbox[labelposition='before']`.
 *
 * `name` and `value` are in that second group for a reason of their own: they are
 * handed to the real input by a binding *and* left on the host, because
 * `[(ngModel)]` inside a `<form>` reads `name` off the element the directive sits
 * on to register itself. The host is not a form element, so a copy of either
 * attribute on it submits nothing and collides with nothing.
 */
const HOST_ATTRIBUTES: ReadonlySet<string> = new Set([
  'class',
  'style',
  'hidden',
  'role',
  'name',
  'value',
  'label',
  'checked',
  'disabled',
  'indeterminate',
  'labelposition',
  'required',
  'disableripple',
  'disabledinteractive',
]);

/**
 * Attributes taken off the host but *not* copied onto the real input, because a
 * binding in `checkbox.html` already puts them there.
 *
 * They cannot simply stay put like the rest of {@link HOST_ATTRIBUTES}, because
 * Material owns every one of them on the input it renders — an attribute copied
 * there would be overwritten on the next change detection, which is a bug that
 * only shows up later:
 *
 *   - `id` is Material's: `MatCheckbox` puts it on its own host and derives the
 *     input's from it (`<id>-input`), which is what its `<label for>` points at.
 *     Two elements claiming one id is invalid HTML, so the host cannot keep a
 *     copy either.
 *   - `tabindex` is Material's, which drops it to `-1` while the box is disabled.
 *     Left on the host it would also be a second tab stop, on an element that is
 *     not the control.
 *   - the `aria-*` below are bound from `MatCheckbox`'s own inputs, and Material
 *     *removes* the attribute when the input is unset — so an attribute copied
 *     onto the input would not survive the first check.
 */
const BOUND_ATTRIBUTES: ReadonlySet<string> = new Set([
  'id',
  'tabindex',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-expanded',
  'aria-controls',
  'aria-owns',
]);

/** Whether an attribute on the host is one this component put there itself. */
function isAngularInternal(name: string): boolean {
  // `_nghost-*` / `_ngcontent-*` carry style encapsulation; `ng-reflect-*`,
  // `ng-version` and the `ng-untouched`-style state hooks are the framework's.
  return name.startsWith('_ng') || name.startsWith('ng-');
}

/**
 * Reads a `tabindex` the way the DOM does, with `0` for anything that is not a
 * number — rather than Angular's own `numberAttribute`, whose `NaN` would reach
 * Material and render `tabindex="NaN"`.
 */
function tabIndexAttribute(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * A themed Material checkbox: `<mat-checkbox>`, wired as a form control.
 *
 * ```html
 * <ui-checkbox label="Email me about new features" [(ngModel)]="subscribed" />
 *
 * <ui-checkbox label="I accept the terms" required [formControl]="terms" />
 *
 * <ui-checkbox [(checked)]="all" [(indeterminate)]="some">Select all</ui-checkbox>
 * ```
 *
 * Like `ui-input` and `ui-select`, and unlike `uiButton`, this is a component
 * rather than a directive: `MatCheckbox` is a *component* with an element
 * selector, so there is no native element to decorate. An `<input
 * type="checkbox">` is not it — that is the element Material renders *inside* the
 * box, the ripple, the touch target and the label it composes, and Material's own
 * checkbox is the only thing that knows how to assemble them.
 *
 * ### It is Material, not a re-implementation
 *
 * The box, the checkmark and its animation, the mixed mark, the ripple, the state
 * layers, the touch target, the focus ring and every colour are `<mat-checkbox>`'s
 * own, resolved from the `--mat-sys-*` tokens that `src/styles/_theme.scss`
 * emits — so there is not a literal colour in `checkbox.scss`, and a palette
 * change there re-skins every checkbox, in light and dark alike.
 *
 * That includes the label association: Material generates the input's id and
 * points its own `<label for>` at it, so clicking the label toggles the box and a
 * screen reader reads the two as one control. This component does not reimplement
 * that — {@link label} is content for Material's label, not a label of its own.
 *
 * ### Forms
 *
 * `ui-checkbox` is a `ControlValueAccessor` and a `Validator`, so `[(ngModel)]`,
 * `[formControl]` and `formControlName` work with no adapter (rule 5) — bind the
 * host, not the checkbox inside it. `[(checked)]` is the same state without a
 * forms directive.
 *
 * `required` validates the way a checkbox means it: the control is invalid until
 * the box is *checked*, which is the "accept the terms" case. See
 * {@link validate}.
 *
 * ### Indeterminate
 *
 * `indeterminate` is M3's mixed state — a parent checkbox whose children
 * disagree. It is two-way because Material clears it the moment the user clicks
 * (a click is an answer, so the mixed state is over), and a one-way input would
 * leave a parent's signal claiming a state the DOM has already left:
 *
 * ```html
 * <ui-checkbox [(checked)]="allChosen" [(indeterminate)]="someChosen">Select all</ui-checkbox>
 * ```
 *
 * ### Custom content
 *
 * The label is projected content with the {@link label} string as its fallback
 * (rule 7), so a label with a link in it — the usual case for consent — needs no
 * second input and no `::ng-deep`:
 *
 * ```html
 * <ui-checkbox required [formControl]="terms">
 *   I accept the <a href="/terms">terms of service</a>
 * </ui-checkbox>
 * ```
 *
 * It renders *inside* Material's own `<label for>`, so clicking it still toggles
 * the box.
 *
 * ### Native attributes reach the real input
 *
 * Anything no input names — `data-*`, `form`, `autofocus` — is moved from
 * `<ui-checkbox>` onto the `<input type="checkbox">` inside it, statically or
 * bound (rule 3). `id`, `name`, `value`, `tabindex` and the `aria-*` attributes
 * have inputs of their own instead, because Material's own bindings own those on
 * the input — an attribute copied onto it would be overwritten on the next change
 * detection.
 *
 * ### Styling hooks
 *
 * - `--ui-checkbox-color` — the box's fill when it is checked or indeterminate,
 *   and its ripple. Defaults to the theme's `primary` role.
 * - `--ui-checkbox-checkmark-color` — the mark drawn on that fill. Defaults to
 *   the theme's `on-primary` role, which is the one legible against it.
 *
 * Point them at another `--mat-sys-*` role rather than a literal, so they survive
 * a palette change and dark mode: `--ui-checkbox-color: var(--mat-sys-error)`.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiCheckbox'` hands back the component, and {@link matCheckbox}
 * hands back the Material instance underneath it — so `box.matCheckbox().focus()`
 * or `.toggle()` needs no API here (rule 4).
 */
@Component({
  selector: 'ui-checkbox',
  exportAs: 'uiCheckbox',
  imports: [MatCheckbox],
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // A control is touched once the user has been in and out of it. `focusout`
    // rather than `blur`, because the element losing focus is the input inside
    // Material's template and `blur` does not bubble out to this host.
    '(focusout)': 'handleTouched()',
  },
  providers: [
    // The forms API resolves these off the element the directive sits on, so they
    // are what make `<ui-checkbox [(ngModel)]>` bind the host rather than leaving
    // a consumer to reach for the checkbox inside it.
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Checkbox), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => Checkbox), multi: true },
  ],
})
export class Checkbox implements ControlValueAccessor, Validator, AfterViewInit {
  /**
   * The label — what the box means when it is ticked, e.g. `Remember me`.
   *
   * Rendered as the content of Material's own `<label for>`, so clicking it
   * toggles the box, and it is the control's accessible name. It is the
   * *fallback* for projected content: for a label a string cannot spell — one
   * with a link in it — write the content instead and leave this unset.
   *
   * Leave it unset with no content only for a box named some other way
   * ({@link ariaLabel} or {@link ariaLabelledby}) — an unnamed checkbox is an
   * accessibility violation, not a design choice.
   */
  readonly label = input<string>();

  /**
   * Whether the box is ticked, two-way and independent of the forms API.
   *
   * `[(checked)]` is the no-forms shape (rule 5): a filter toggle, a "select all"
   * — anywhere `[(ngModel)]` would be a directive dragged in for one binding. It
   * stays in step when a form is bound, because both write the same signal.
   *
   * A `model()` rather than the `input()` + `checkedChange` pair that rule 5
   * rules out — which is also why it takes no `booleanAttribute`: Angular's model
   * signals accept no transform, so this one is a boolean and `[checked]="true"`
   * is how a box starts ticked. A bare `<ui-checkbox checked>` does not compile,
   * rather than quietly reading as the empty string the HTML parser produces.
   */
  readonly checked = model(false);

  /**
   * Whether the box is disabled.
   *
   * A reactive form's own `disable()` drives this too, through
   * `setDisabledState`, and either one is enough to disable the box — so a
   * `FormControl({disabled: true})` needs nothing here, and this input still
   * works on a checkbox with no form at all.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Whether the box shows M3's mixed mark rather than a tick or nothing — the
   * state of a parent checkbox whose children disagree.
   *
   * Two-way: Material clears it the moment the user clicks, because a click is an
   * answer. See the class docs for the "select all" shape, and {@link checked}
   * for why a `model()` takes no `booleanAttribute`.
   *
   * It is a *display* state, not a third value: the control's value is still
   * {@link checked}, and a form never sees "mixed".
   */
  readonly indeterminate = model(false);

  /** Which side of the box the label sits on. Defaults to `after`. */
  readonly labelPosition = input<UiCheckboxLabelPosition>('after');

  /**
   * Emits the new `checked` state when the *user* toggles the box.
   *
   * Material's own `change`, forwarded — and deliberately not the same event as
   * the `checkedChange` that {@link checked} emits, which fires however the state
   * moved, including a `writeValue` from a form patch. This one is a click or a
   * keypress and nothing else, which is what an analytics call or a "save now"
   * wants.
   */
  readonly changed = output<boolean>();

  /**
   * Whether the box must be ticked, which sets `aria-required` on the input.
   *
   * Unlike the other controls in this library, this one both says it and enforces
   * it — see {@link validate}.
   */
  readonly required = input(false, { transform: booleanAttribute });

  /**
   * The `id` Material puts on its own host, and derives the real input's from
   * (`<id>-input`, which is what its `<label for>` points at).
   *
   * Set it to point an `aria-*` reference of your own at the control. Material
   * generates one when this is unset, so the label association works either
   * way — this only makes it a *known* id.
   *
   * The attribute is moved off `<ui-checkbox>` when it is written there, so the
   * page never has two elements claiming one id.
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
   * The real input's `value` — the string a ticked box submits with a *native*
   * form. The DOM's own default is `on`.
   *
   * It is not the control's value: a `ControlValueAccessor` checkbox reports a
   * boolean, which is what Angular's forms see. This is for the server reading a
   * native submission.
   */
  readonly value = input<string>();

  /** Whether Material's ripple is suppressed. */
  readonly disableRipple = input(false, { transform: booleanAttribute });

  /**
   * Whether a disabled box stays interactive — focusable and announced, marked
   * with `aria-disabled` rather than the native `disabled`.
   *
   * Material's own answer to the disabled control that still has to explain
   * itself: a natively disabled input is skipped by the tab order, so a screen
   * reader user never reaches the tooltip saying why it is off.
   */
  readonly disabledInteractive = input(false, { transform: booleanAttribute });

  /**
   * The input's `tabindex`.
   *
   * An input rather than a forwarded attribute because Material owns this one on
   * the real input: it drops it to `-1` while the box is disabled.
   *
   * Spelled as the HTML attribute rather than aliased to it, so that both
   * `<ui-checkbox tabindex="3">` and `[tabindex]="n"` reach the input — an input
   * named `tabIndex` would silently ignore the lowercase attribute a consumer
   * would actually write.
   */
  readonly tabindex = input(0, { transform: tabIndexAttribute });

  /**
   * The control's accessible name, spelled as the ARIA attribute — for a box with
   * no visible {@link label} and no projected content.
   *
   * An input rather than a forwarded attribute because Material owns this one on
   * the real input.
   */
  readonly ariaLabel = input<string | undefined, unknown>(undefined, {
    alias: 'aria-label',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The id of the element naming this control, spelled as the ARIA attribute —
   * for a box labelled by something already on the page.
   *
   * An input rather than a forwarded attribute for the same reason as
   * {@link ariaLabel}.
   */
  readonly ariaLabelledby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-labelledby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The ids of elements describing the control, spelled as the ARIA attribute —
   * the help text under a consent box, say.
   *
   * An input rather than a forwarded attribute for the same reason as
   * {@link ariaLabel}.
   */
  readonly ariaDescribedby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-describedby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * Whether the section this box controls is expanded, spelled as the ARIA
   * attribute — for a checkbox that also reveals one.
   *
   * An input rather than a forwarded attribute for the same reason as
   * {@link ariaLabel}.
   */
  readonly ariaExpanded = input<boolean | undefined, unknown>(undefined, {
    alias: 'aria-expanded',
    transform: (value) => (value == null ? undefined : booleanAttribute(value)),
  });

  /**
   * The ids of the elements this box controls, spelled as the ARIA attribute.
   *
   * An input rather than a forwarded attribute for the same reason as
   * {@link ariaLabel}.
   */
  readonly ariaControls = input<string | undefined, unknown>(undefined, {
    alias: 'aria-controls',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The ids of elements this box owns, spelled as the ARIA attribute — for a
   * relationship the DOM's own nesting cannot express.
   *
   * An input rather than a forwarded attribute for the same reason as
   * {@link ariaLabel}.
   */
  readonly ariaOwns = input<string | undefined, unknown>(undefined, {
    alias: 'aria-owns',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The `MatCheckbox` this component renders — the escape hatch for anything not
   * wrapped here (rule 4), e.g. `box.matCheckbox().focus()` or `.toggle()`.
   * Reach it with `#box="uiCheckbox"`.
   */
  readonly matCheckbox = viewChild.required(MatCheckbox);

  /**
   * The `<mat-checkbox>` host element, for anything neither Material nor this
   * wraps.
   *
   * `read: ElementRef` because `#checkbox` sits on a component, and a template
   * reference to one is the *instance* by default — which is `matCheckbox()`
   * already, and has no `nativeElement`.
   */
  readonly checkboxElement: Signal<ElementRef<HTMLElement>> = viewChild.required('checkbox', {
    read: ElementRef,
  });

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

  /**
   * The pass-through inputs whose "unset" is `undefined`, typed as Material
   * declares them.
   *
   * `MatCheckbox` declares each of these `string` but leaves it uninitialised, and
   * renders it with `[attr.…]` — so `undefined` is exactly what makes Material
   * *omit* the attribute, and any stand-in would be worse: `''` renders an empty
   * `value` where the DOM's own default is `on`, and an empty `aria-describedby`
   * points a screen reader at nothing. The cast says that out loud rather than
   * scattering `$any()` through the template.
   */
  protected readonly matValue = computed(() => this.value() as string);
  protected readonly matAriaDescribedby = computed(() => this.ariaDescribedby() as string);
  protected readonly matAriaControls = computed(() => this.ariaControls() as string);
  protected readonly matAriaOwns = computed(() => this.ariaOwns() as string);

  private onChange: (value: boolean) => void = () => {
    // Replaced by `registerOnChange` when a forms directive binds this control.
    // Until then there is nobody to report a change to — a box with `[(checked)]`
    // and no form is a supported shape, not a mistake.
  };

  private onTouched: () => void = () => {
    // Replaced by `registerOnTouched`, for the same reason as `onChange`.
  };

  private onValidatorChange: () => void = () => {
    // Replaced by `registerOnValidatorChange`, for the same reason as `onChange`.
  };

  constructor() {
    // `required` decides this control's validity, so a form that has already
    // computed its status has to be told to compute it again — Angular calls
    // `validate()` when the *value* moves, not when the rule does. This is what
    // the callback exists for.
    effect(() => {
      this.required();
      this.onValidatorChange();
    });
  }

  ngAfterViewInit(): void {
    this.forwardAttributes();

    // Static attributes are on the host before this runs, but a bound one
    // (`[attr.data-state]="…"`) lands there again every time it changes, and a
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

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  writeValue(value: unknown): void {
    // Coerced rather than trusted: a control can hold anything, and a checkbox is
    // a boolean. `null` is a form's empty value and reads as unticked, as does
    // the `''` a query parameter or a JSON `0` arrives as.
    this.checked.set(!!value);
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  registerOnChange(fn: (value: boolean) => void): void {
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
   * Whether a `required` box is unticked, as Angular's `Validator`.
   *
   * `Validators.required` cannot do this job: it rejects an *empty* value, and
   * `false` is not empty — so a `required` checkbox under Angular's own validator
   * is valid while unticked, which is precisely the bug on a consent box.
   * Material's own checkbox implements this for the same reason, and rule 5 asks
   * for it here so that `required` needs no `Validators.requiredTrue` beside it.
   *
   * @docs-private
   */
  validate(control: AbstractControl<unknown>): ValidationErrors | null {
    return this.required() && !control.value ? { required: true } : null;
  }

  /** Implemented as part of `Validator`. @docs-private */
  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  protected handleChange(event: MatCheckboxChange): void {
    this.checked.set(event.checked);
    this.onChange(event.checked);
    this.changed.emit(event.checked);
  }

  /**
   * Reports that the user has been in and out of the control, which is what a
   * form means by "touched" — and what a consumer's `control.touched && …` rule
   * for showing an error is usually waiting on.
   */
  protected handleTouched(): void {
    this.onTouched();
  }

  /**
   * Moves every attribute that is not this component's own from `<ui-checkbox>`
   * onto the real `<input type="checkbox">`, so that a consumer's `data-*`,
   * `form` or `autofocus` reaches the element it is about (rule 3).
   *
   * *Moves* rather than copies: two elements carrying one `data-testid` is an
   * ambiguous query.
   */
  private forwardAttributes(): void {
    // Material's own `<input>`, queried rather than read off `MatCheckbox`, whose
    // reference to it (`_inputElement`) is private API this should not lean on.
    const input = this.checkboxElement().nativeElement.querySelector('input');
    if (!input) {
      return;
    }

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
