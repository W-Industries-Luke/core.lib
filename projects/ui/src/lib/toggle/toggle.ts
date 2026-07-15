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
import { MatSlideToggle, type MatSlideToggleChange } from '@angular/material/slide-toggle';

/**
 * Which side of the switch the label sits on.
 *
 * Aliased from `MatSlideToggle.labelPosition` rather than re-declared, so that a
 * change to the union upstream is a compile error here rather than a value this
 * component forwards and Material lays out wrong.
 *
 *   - `after` — the label to the right of the switch (in LTR). Material's
 *     default, and this library's.
 *   - `before` — the label to the left, which is the usual shape for a settings
 *     row: the label *is* the row, and the switch is its control, parked at the
 *     end of it.
 */
export type UiToggleLabelPosition = MatSlideToggle['labelPosition'];

/**
 * Attributes that belong to `<ui-toggle>` itself and are therefore left alone by
 * {@link Toggle.forwardAttributes}.
 *
 * Two groups. The first is everything that describes the *wrapper*: `class` and
 * `style` are how a consumer targets it, `hidden` hides the whole control rather
 * than just the switch inside it, and `role` re-declares what an element *is* —
 * moving that onto the real button would strip its own `switch` role, which is
 * the opposite of what anyone writing it wants.
 *
 * The second is this component's own inputs, spelled as HTML lowercases them.
 * Angular has already read these into signals, and each one that has a place on
 * the real button is put there by a binding in `toggle.html`. Leaving the
 * attributes on the host costs nothing and buys a consumer selectors that read
 * well: `ui-toggle[disabled]`, `ui-toggle[labelposition='before']`.
 *
 * `name` is in that second group for a reason of its own: it is handed to the
 * real button by a binding *and* left on the host, because `[(ngModel)]` inside
 * a `<form>` reads `name` off the element the directive sits on to register
 * itself. The host is not a form element, so a copy of it submits nothing and
 * collides with nothing.
 */
const HOST_ATTRIBUTES: ReadonlySet<string> = new Set([
  'class',
  'style',
  'hidden',
  'role',
  'name',
  'label',
  'checked',
  'disabled',
  'labelposition',
  'required',
  'hideicon',
  'disableripple',
  'disabledinteractive',
]);

/**
 * Attributes taken off the host but *not* copied onto the real button, because a
 * binding in `toggle.html` already puts them there.
 *
 * They cannot simply stay put like the rest of {@link HOST_ATTRIBUTES}, because
 * Material owns every one of them on the button it renders — an attribute copied
 * there would be overwritten on the next change detection, which is a bug that
 * only shows up later:
 *
 *   - `id` is Material's: `MatSlideToggle` puts it on its own host and derives
 *     the button's from it (`<id>-button`), which is what its `<label for>`
 *     points at. Two elements claiming one id is invalid HTML, so the host
 *     cannot keep a copy either.
 *   - `tabindex` is Material's, which drops it to `-1` while the switch is
 *     disabled. Left on the host it would also be a second tab stop, on an
 *     element that is not the control.
 *   - the `aria-*` below are bound from `MatSlideToggle`'s own inputs, and
 *     Material *removes* the attribute when the input is unset — so an attribute
 *     copied onto the button would not survive the first check.
 *
 * `aria-expanded` and `aria-controls` are deliberately absent, unlike in
 * `ui-checkbox`: Material binds neither on the switch, so a toggle that reveals
 * a section says so by writing them on the host and letting
 * {@link Toggle.forwardAttributes} move them — which is rule 3 doing exactly its
 * job, with no input needed here.
 */
const BOUND_ATTRIBUTES: ReadonlySet<string> = new Set([
  'id',
  'tabindex',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
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
 * A themed Material slide toggle: `<mat-slide-toggle>`, wired as a form control.
 *
 * ```html
 * <ui-toggle label="Dark mode" [(ngModel)]="dark" />
 *
 * <ui-toggle label="Enable notifications" [formControl]="notifications" />
 *
 * <ui-toggle [(checked)]="wifi" labelPosition="before">Wi-Fi</ui-toggle>
 * ```
 *
 * Like `ui-checkbox`, and unlike `uiButton`, this is a component rather than a
 * directive: `MatSlideToggle` is a *component* with an element selector, so
 * there is no native element to decorate. The `<button role="switch">` is not
 * it — that is the element Material renders *inside* the track, the handle, the
 * icons, the ripple, the touch target and the label it composes, and Material's
 * own slide toggle is the only thing that knows how to assemble them.
 *
 * ### Toggle or checkbox?
 *
 * A toggle applies its change *immediately* — it is a setting, and flipping it
 * is the act. A checkbox is a value the surrounding form submits later. If there
 * is a Save button, it is a `ui-checkbox`.
 *
 * ### It is Material, not a re-implementation
 *
 * The track, the handle and its slide, the on/off icons, the ripple, the state
 * layers, the touch target, the focus ring and every colour are
 * `<mat-slide-toggle>`'s own, resolved from the `--mat-sys-*` tokens that
 * `src/styles/_theme.scss` emits — so there is not a literal colour in
 * `toggle.scss`, and a palette change there re-skins every toggle, in light and
 * dark alike.
 *
 * That includes the label association: Material generates the button's id and
 * points its own `<label for>` at it, so clicking the label flips the switch and
 * a screen reader reads the two as one control. This component does not
 * reimplement that — {@link label} is content for Material's label, not a label
 * of its own.
 *
 * ### Forms
 *
 * `ui-toggle` is a `ControlValueAccessor` and a `Validator`, so `[(ngModel)]`,
 * `[formControl]` and `formControlName` work with no adapter (rule 5) — bind the
 * host, not the toggle inside it. `[(checked)]` is the same state without a
 * forms directive.
 *
 * `required` validates the way a switch means it: the control is invalid until
 * it is *on*. See {@link validate}.
 *
 * ### Custom content
 *
 * The label is projected content with the {@link label} string as its fallback
 * (rule 7), so a label with a description under it needs no second input and no
 * `::ng-deep`:
 *
 * ```html
 * <ui-toggle labelPosition="before" [(checked)]="sync">
 *   Sync over cellular
 *   <span class="hint">May use your data allowance.</span>
 * </ui-toggle>
 * ```
 *
 * It renders *inside* Material's own `<label for>`, so clicking it still flips
 * the switch.
 *
 * ### Native attributes reach the real switch
 *
 * Anything no input names — `data-*`, `form`, `autofocus`, and the
 * `aria-expanded` / `aria-controls` of a toggle that reveals a section — is
 * moved from `<ui-toggle>` onto the `<button role="switch">` inside it,
 * statically or bound (rule 3). `id`, `name`, `tabindex` and the three `aria-*`
 * attributes Material binds have inputs of their own instead, because Material's
 * own bindings own those on the button — an attribute copied onto it would be
 * overwritten on the next change detection.
 *
 * ### Styling hooks
 *
 * - `--ui-toggle-color` — the track when the switch is on, and its state layer.
 *   Defaults to the theme's `primary` role.
 * - `--ui-toggle-handle-color` — the handle resting on that track. Defaults to
 *   `on-primary`, the role that is legible against it.
 * - `--ui-toggle-handle-accent-color` — the handle while hovered, focused or
 *   pressed. Defaults to `primary-container`.
 * - `--ui-toggle-icon-color` — the checkmark drawn on the handle. Defaults to
 *   `on-primary-container`.
 *
 * The four are one M3 role family, so re-point them as a set — to `error` /
 * `on-error` / `error-container` / `on-error-container`, or to the theme's own
 * `--ui-sys-success-*` roles — rather than at literals, and they survive a
 * palette change and dark mode. The `off` half of the switch is deliberately not
 * hooked: it is the theme's neutral surface, and a switch whose *off* state
 * carries a colour of its own is one nobody can read at a glance.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiToggle'` hands back the component, and {@link matSlideToggle}
 * hands back the Material instance underneath it — so `sw.matSlideToggle().focus()`
 * or `.toggle()` needs no API here (rule 4).
 */
@Component({
  selector: 'ui-toggle',
  exportAs: 'uiToggle',
  imports: [MatSlideToggle],
  templateUrl: './toggle.html',
  styleUrl: './toggle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // A control is touched once the user has been in and out of it. `focusout`
    // rather than `blur`, because the element losing focus is the button inside
    // Material's template and `blur` does not bubble out to this host.
    '(focusout)': 'handleTouched()',
  },
  providers: [
    // The forms API resolves these off the element the directive sits on, so they
    // are what make `<ui-toggle [(ngModel)]>` bind the host rather than leaving a
    // consumer to reach for the toggle inside it.
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Toggle), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => Toggle), multi: true },
  ],
})
export class Toggle implements ControlValueAccessor, Validator, AfterViewInit {
  /**
   * The label — what the switch turns on, e.g. `Dark mode`.
   *
   * Rendered as the content of Material's own `<label for>`, so clicking it
   * flips the switch, and it is the control's accessible name. It is the
   * *fallback* for projected content: for a label a string cannot spell — one
   * with a hint under it — write the content instead and leave this unset.
   *
   * Leave it unset with no content only for a switch named some other way
   * ({@link ariaLabel} or {@link ariaLabelledby}) — an unnamed toggle is an
   * accessibility violation, not a design choice.
   */
  readonly label = input<string>();

  /**
   * Whether the switch is on, two-way and independent of the forms API.
   *
   * `[(checked)]` is the no-forms shape (rule 5): a settings row, a feature
   * switch — anywhere `[(ngModel)]` would be a directive dragged in for one
   * binding. It stays in step when a form is bound, because both write the same
   * signal.
   *
   * A `model()` rather than the `input()` + `checkedChange` pair that rule 5
   * rules out — which is also why it takes no `booleanAttribute`: Angular's model
   * signals accept no transform, so this one is a boolean and `[checked]="true"`
   * is how a switch starts on. A bare `<ui-toggle checked>` does not compile,
   * rather than quietly reading as the empty string the HTML parser produces.
   */
  readonly checked = model(false);

  /**
   * Whether the switch is disabled.
   *
   * A reactive form's own `disable()` drives this too, through
   * `setDisabledState`, and either one is enough to disable the switch — so a
   * `FormControl({disabled: true})` needs nothing here, and this input still
   * works on a toggle with no form at all.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Which side of the switch the label sits on. Defaults to `after`. */
  readonly labelPosition = input<UiToggleLabelPosition>('after');

  /**
   * Emits the new `checked` state when the *user* flips the switch.
   *
   * Material's own `change`, forwarded — and deliberately not the same event as
   * the `checkedChange` that {@link checked} emits, which fires however the state
   * moved, including a `writeValue` from a form patch. This one is a click or a
   * keypress and nothing else, which is what the "apply it now" a toggle
   * implies — the request that saves the setting — actually wants.
   */
  readonly changed = output<boolean>();

  /**
   * Emits when the user acts on the switch, whether or not the state moved.
   *
   * Material's own `toggleChange`, forwarded. It is the same moment as
   * {@link changed} unless the app provides `MAT_SLIDE_TOGGLE_DEFAULT_OPTIONS`
   * with `disableToggleValue`, which stops Material flipping the switch itself —
   * the "are you sure?" shape, where the state is the answer's to move. Under
   * that option `changed` never fires, and this is the only signal there is
   * (rule 4).
   */
  readonly toggled = output<void>();

  /**
   * Whether the switch must be on, which sets `aria-required` on the button.
   *
   * Unlike the other controls in this library, this one both says it and
   * enforces it — see {@link validate}.
   */
  readonly required = input(false, { transform: booleanAttribute });

  /**
   * The `id` Material puts on its own host, and derives the real button's from
   * (`<id>-button`, which is what its `<label for>` points at).
   *
   * Set it to point an `aria-*` reference of your own at the control. Material
   * generates one when this is unset, so the label association works either
   * way — this only makes it a *known* id.
   *
   * The attribute is moved off `<ui-toggle>` when it is written there, so the
   * page never has two elements claiming one id.
   */
  readonly id = input<string>();

  /**
   * The real button's `name`.
   *
   * `[(ngModel)]` inside a `<form>` reads the same attribute for its own
   * registration, so writing `name` once serves both.
   *
   * Note that a switch is a `<button>` rather than an `<input>`, so — unlike
   * `ui-checkbox` — there is nothing here for a *native* form submission to
   * send, and no `value` input to send it with. Angular's forms read the
   * boolean, which is the only consumer of this control's state.
   */
  readonly name = input<string>();

  /**
   * Whether Material's on/off icons on the handle are hidden.
   *
   * They are M3's own affordance for telling the two states apart without
   * relying on colour, which is what a bare coloured track asks a colour-blind
   * user to do. Hide them only where the state is unambiguous some other way.
   */
  readonly hideIcon = input(false, { transform: booleanAttribute });

  /** Whether Material's ripple is suppressed. */
  readonly disableRipple = input(false, { transform: booleanAttribute });

  /**
   * Whether a disabled switch stays interactive — focusable and announced,
   * marked with `aria-disabled` rather than the native `disabled`.
   *
   * Material's own answer to the disabled control that still has to explain
   * itself: a natively disabled button is skipped by the tab order, so a screen
   * reader user never reaches the tooltip saying why it is off.
   */
  readonly disabledInteractive = input(false, { transform: booleanAttribute });

  /**
   * The button's `tabindex`.
   *
   * An input rather than a forwarded attribute because Material owns this one on
   * the real button: it drops it to `-1` while the switch is disabled.
   *
   * Spelled as the HTML attribute rather than aliased to it, so that both
   * `<ui-toggle tabindex="3">` and `[tabindex]="n"` reach the button — an input
   * named `tabIndex` would silently ignore the lowercase attribute a consumer
   * would actually write.
   */
  readonly tabindex = input(0, { transform: tabIndexAttribute });

  /**
   * The control's accessible name, spelled as the ARIA attribute — for a switch
   * with no visible {@link label} and no projected content.
   *
   * An input rather than a forwarded attribute because Material owns this one on
   * the real button.
   */
  readonly ariaLabel = input<string | undefined, unknown>(undefined, {
    alias: 'aria-label',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The id of the element naming this control, spelled as the ARIA attribute —
   * for a switch labelled by something already on the page.
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
   * the hint under a settings row, say.
   *
   * An input rather than a forwarded attribute for the same reason as
   * {@link ariaLabel}.
   */
  readonly ariaDescribedby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-describedby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The `MatSlideToggle` this component renders — the escape hatch for anything
   * not wrapped here (rule 4), e.g. `sw.matSlideToggle().focus()` or
   * `.toggle()`. Reach it with `#sw="uiToggle"`.
   */
  readonly matSlideToggle = viewChild.required(MatSlideToggle);

  /**
   * The `<mat-slide-toggle>` host element, for anything neither Material nor
   * this wraps.
   *
   * `read: ElementRef` because `#toggle` sits on a component, and a template
   * reference to one is the *instance* by default — which is `matSlideToggle()`
   * already, and has no `nativeElement`.
   */
  readonly toggleElement: Signal<ElementRef<HTMLElement>> = viewChild.required('toggle', {
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
   * The `aria-describedby` pass-through, typed as Material declares it.
   *
   * `MatSlideToggle` declares it `string` but leaves it uninitialised, and
   * renders it with `[attr.aria-describedby]` — so `undefined` is exactly what
   * makes Material *omit* the attribute, and `''` would point a screen reader at
   * nothing. The cast says that out loud rather than scattering `$any()` through
   * the template.
   */
  protected readonly matAriaDescribedby = computed(() => this.ariaDescribedby() as string);

  private onChange: (value: boolean) => void = () => {
    // Replaced by `registerOnChange` when a forms directive binds this control.
    // Until then there is nobody to report a change to — a toggle with
    // `[(checked)]` and no form is a supported shape, not a mistake.
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
    // (`[attr.aria-expanded]="…"`) lands there again every time it changes, and a
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
    // Coerced rather than trusted: a control can hold anything, and a switch is
    // a boolean. `null` is a form's empty value and reads as off, as does the
    // `''` a query parameter or a JSON `0` arrives as.
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
   * Whether a `required` switch is off, as Angular's `Validator`.
   *
   * `Validators.required` cannot do this job: it rejects an *empty* value, and
   * `false` is not empty — so a `required` toggle under Angular's own validator
   * is valid while off. Material's own slide toggle implements this for the same
   * reason, and rule 5 asks for it here so that `required` needs no
   * `Validators.requiredTrue` beside it.
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

  protected handleChange(event: MatSlideToggleChange): void {
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
   * Moves every attribute that is not this component's own from `<ui-toggle>`
   * onto the real `<button role="switch">`, so that a consumer's `data-*`,
   * `form`, `autofocus` or `aria-expanded` reaches the element it is about
   * (rule 3).
   *
   * *Moves* rather than copies: two elements carrying one `data-testid` is an
   * ambiguous query.
   */
  private forwardAttributes(): void {
    // Material's own switch, queried rather than read off `MatSlideToggle`, whose
    // reference to it (`_switchElement`) is private API this should not lean on.
    const button = this.toggleElement().nativeElement.querySelector('button');
    if (!button) {
      return;
    }

    // A live NamedNodeMap, and this loop removes from it — hence the copy.
    for (const { name, value } of Array.from(this.hostElement.attributes)) {
      if (HOST_ATTRIBUTES.has(name) || isAngularInternal(name)) {
        continue;
      }
      this.hostElement.removeAttribute(name);
      if (!BOUND_ATTRIBUTES.has(name)) {
        button.setAttribute(name, value);
      }
    }
  }
}
