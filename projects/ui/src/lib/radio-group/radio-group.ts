import { NgTemplateOutlet } from '@angular/common';
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
  output,
  signal,
  TemplateRef,
  viewChild,
  viewChildren,
  type AfterViewInit,
  type Signal,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { MatRadioButton, MatRadioGroup, type MatRadioChange } from '@angular/material/radio';

/**
 * One choice in a {@link RadioGroup}.
 *
 * `label` is the text shown beside the button. `value` is what the form control
 * holds — deliberately not constrained to a string, because a group over a list of
 * objects is a common case, and forcing an id in and a lookup out is exactly the
 * adapter this library exists to remove.
 */
export interface UiRadioOption<T = unknown> {
  /** What the control's value becomes when this option is chosen. */
  value: T;

  /** The text shown for the option. */
  label: string;

  /**
   * Whether this one button cannot be chosen, while the rest still can.
   *
   * For a group where *nothing* can be chosen, disable the group itself — see
   * {@link RadioGroup.disabled}.
   */
  disabled?: boolean;
}

/**
 * How the buttons are laid out.
 *
 *   - `column` — stacked, one per line. This library's default, and what a form
 *     almost always wants: a column is scannable at any label length, and it is the
 *     only layout that survives a narrow viewport without reflowing.
 *   - `row` — side by side, for two or three short labels (`Yes` / `No`).
 */
export type UiRadioGroupDirection = 'row' | 'column';

/**
 * Which side of the button its label sits on. Aliased from
 * `MatRadioGroup.labelPosition` rather than re-declared, so that a change to the
 * union upstream is a compile error here rather than a value this component
 * forwards and Material lays out wrong.
 */
export type UiRadioGroupLabelPosition = MatRadioGroup['labelPosition'];

/** The context a `uiRadioOption` template is rendered with. */
export interface UiRadioOptionContext<T = unknown> {
  /** The option being rendered — `let-option`. */
  $implicit: UiRadioOption<T>;

  /** Whether this option is the chosen one — `let-checked="checked"`. */
  checked: boolean;
}

/** Distinguishes the generated label ids of two groups on one page. */
let nextUniqueId = 0;

/**
 * Attributes that belong to `<ui-radio-group>` itself and are therefore left alone
 * by {@link RadioGroup.forwardAttributes}.
 *
 * Two groups. The first is everything that describes the *wrapper*: `class` and
 * `style` are how a consumer targets it, `hidden` hides the whole control rather
 * than just the buttons inside it, and `role` re-declares what an element *is* —
 * moving that onto the real group would strip its own `radiogroup` role, which is
 * the opposite of what anyone writing it wants.
 *
 * The second is this component's own inputs, spelled as HTML lowercases them.
 * Angular has already read these into signals, and each one that has a place on the
 * real group is put there by a binding in `radio-group.html`. Leaving the
 * attributes on the host costs nothing and buys a consumer selectors that read
 * well: `ui-radio-group[disabled]`, `ui-radio-group[direction='row']`.
 *
 * `name` is in that second group for a reason of its own: it is handed to the real
 * group by a binding *and* left on the host, because `[(ngModel)]` inside a
 * `<form>` reads `name` off the element the directive sits on to register itself.
 * The host is not a form element, so a copy of the attribute on it submits nothing
 * and collides with nothing.
 */
const HOST_ATTRIBUTES: ReadonlySet<string> = new Set([
  'class',
  'style',
  'hidden',
  'role',
  'name',
  'label',
  'options',
  'value',
  'disabled',
  'direction',
  'labelposition',
  'required',
  'disableripple',
  'disabledinteractive',
]);

/**
 * Attributes taken off the host but *not* copied onto the real group, because a
 * binding in `radio-group.html` already puts them there.
 *
 * `aria-label` and `aria-labelledby` are how the group is *named*, and this
 * component resolves both — {@link RadioGroup.resolvedAriaLabelledby} falls back to
 * the id of the rendered {@link RadioGroup.label}. An attribute forwarded straight
 * onto the group would sit alongside that binding rather than replacing it, so a
 * consumer's `aria-labelledby` and the generated one would fight, and the loser
 * would depend on change-detection order. They are inputs instead, and the bindings
 * are the only writer.
 */
const BOUND_ATTRIBUTES: ReadonlySet<string> = new Set(['aria-label', 'aria-labelledby']);

/** Whether an attribute on the host is one this component put there itself. */
function isAngularInternal(name: string): boolean {
  // `_nghost-*` / `_ngcontent-*` carry style encapsulation; `ng-reflect-*`,
  // `ng-version` and the `ng-untouched`-style state hooks are the framework's.
  return name.startsWith('_ng') || name.startsWith('ng-');
}

/**
 * Renders each button's label, in place of its `label` string (rule 7).
 *
 * The option is the template's implicit context, and whether it is the chosen one
 * is `let-checked` — so a plan picker with a price under each name is a template
 * rather than a string input this component would have to grow:
 *
 * ```html
 * <ui-radio-group label="Plan" [options]="plans()">
 *   <ng-template uiRadioOption let-option let-checked="checked">
 *     <strong>{{ option.label }}</strong>
 *     <small>{{ option.value.price }}/month</small>
 *   </ng-template>
 * </ui-radio-group>
 * ```
 *
 * It renders *inside* Material's own `<mat-radio-button>`, and therefore inside the
 * `<label for>` tied to the real input — so clicking the custom content still
 * chooses the option, and the keyboard navigation and the ripple are untouched.
 */
@Directive({ selector: '[uiRadioOption]' })
export class RadioOptionDef<T = unknown> {
  /** The template itself, rendered by `radio-group.html`. @docs-private */
  readonly template = inject<TemplateRef<UiRadioOptionContext<T>>>(TemplateRef);

  /**
   * Types `let-option` and `let-checked`, rather than as `any`. @docs-private
   *
   * The signature is Angular's, and the compiler is its only caller — the
   * parameters exist to be named in the type predicate and nowhere else, which is
   * exactly what `no-unused-vars` reports. There is no shape of this function that
   * both keeps the guard and satisfies the rule.
   */
  static ngTemplateContextGuard<T>(
    directive: RadioOptionDef<T>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is UiRadioOptionContext<T> {
    return true;
  }
}

/**
 * A themed Material radio group: `<mat-radio-group>` over `<mat-radio-button>`s,
 * wired as a form control.
 *
 * ```html
 * <ui-radio-group label="Delivery" [options]="methods" [(ngModel)]="method" />
 *
 * <ui-radio-group label="Answer" direction="row" [options]="yesNo" [formControl]="answer" />
 * ```
 *
 * Like `ui-select` and `ui-input`, and unlike `uiButton`, this is a component
 * rather than a directive: a radio group owns *composition* — a legend naming the
 * set, and the buttons themselves, which only mean anything as a group. There is no
 * single native element to decorate, and an `<input type="radio">` is not one: that
 * is what Material renders *inside* each button, beside the ripple, the touch
 * target and the label it composes.
 *
 * ### It is Material, not a re-implementation
 *
 * The circles, the dot and its animation, the ripple, the state layers, the touch
 * targets, the focus rings, the shared `name` that makes the buttons exclusive, the
 * arrow-key roving focus and every colour are `<mat-radio-group>`'s and
 * `<mat-radio-button>`'s own, resolved from the `--mat-sys-*` tokens that
 * `src/styles/_theme.scss` emits — so there is not a literal colour in
 * `radio-group.scss`, and a palette change there re-skins every radio group, in
 * light and dark alike.
 *
 * That includes each button's label association: Material generates the input's id
 * and points its own `<label for>` at it, so clicking a label chooses that option.
 * This component does not reimplement that — an option's `label` is content for
 * Material's label, not a label of its own.
 *
 * ### Accessibility
 *
 * `<mat-radio-group>` carries `role="radiogroup"`, and this component names it:
 * {@link label} is rendered with an id of its own and the group's `aria-labelledby`
 * points at it, so a screen reader announces the legend before the option —
 * "Delivery, Standard, radio button, 1 of 3" rather than a bare "Standard".
 *
 * A `<legend>` would not do this job: `<fieldset>`/`<legend>` names a *fieldset*,
 * and the element with the `radiogroup` role here is the `<mat-radio-group>` inside
 * it — so the association has to be `aria-labelledby`, which is what ARIA specifies
 * for the role. For a group named by something already on the page, use
 * {@link ariaLabelledby}; for one with no visible name, {@link ariaLabel}. An
 * unnamed radio group is an accessibility violation, not a design choice.
 *
 * ### Forms
 *
 * `ui-radio-group` is a `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]`
 * and `formControlName` work with no adapter (rule 5) — bind the host, not the
 * group inside it. `[(value)]` is the same state without a forms directive.
 *
 * The value is the chosen option's `value` — an object, if that is what
 * {@link options} holds, and `null` when nothing is chosen.
 *
 * Note there is no `compareWith`: Material's radio group matches a value to its
 * button by `===`, so a value that is not the same *instance* as the one in
 * `options` leaves the group looking empty. Hold the option's own object (or an id)
 * in the control rather than a copy of it.
 *
 * ### Native attributes reach the real group
 *
 * Anything no input names — `data-*`, `aria-describedby`, `tabindex` — is moved
 * from `<ui-radio-group>` onto the `<mat-radio-group>` inside it, statically or
 * bound (rule 3), which is the element carrying the `radiogroup` role. `aria-label`
 * and `aria-labelledby` have inputs of their own instead, because this component
 * resolves them against the rendered {@link label}.
 *
 * ### Styling hooks
 *
 * - `--ui-radio-group-color` — the fill of the chosen button and its ripple.
 *   Defaults to the theme's `primary` role.
 * - `--ui-radio-group-gap` — the space between buttons, and between the legend and
 *   the first of them.
 *
 * Point the colour at another `--mat-sys-*` role rather than a literal, so it
 * survives a palette change and dark mode:
 * `--ui-radio-group-color: var(--mat-sys-error)`.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiRadioGroup'` hands back the component, and {@link matRadioGroup} /
 * {@link matRadioButtons} hand back the Material instances underneath it — so
 * `group.matRadioGroup().selected` or `group.matRadioButtons()[0].focus()` needs no
 * API here (rule 4).
 */
@Component({
  selector: 'ui-radio-group',
  exportAs: 'uiRadioGroup',
  imports: [MatRadioGroup, MatRadioButton, NgTemplateOutlet],
  templateUrl: './radio-group.html',
  styleUrl: './radio-group.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // A control is touched once the user has been in and out of it. `focusout`
    // rather than `blur`, because the element losing focus is an input inside
    // Material's template and `blur` does not bubble out to this host.
    '(focusout)': 'handleTouched()',
  },
  providers: [
    // The forms API resolves this off the element the directive sits on, so it is
    // what makes `<ui-radio-group [(ngModel)]>` bind the host rather than leaving a
    // consumer to reach for the group inside it.
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RadioGroup), multi: true },
  ],
})
export class RadioGroup<T = unknown> implements ControlValueAccessor, AfterViewInit {
  /**
   * The group's legend — the question the options answer, e.g. `Delivery`.
   *
   * Rendered above the buttons, and the group's accessible name: its
   * `aria-labelledby` is pointed at it, so a screen reader announces it before each
   * option. See the class docs for why that rather than a `<legend>`.
   *
   * Leave it unset only for a group named some other way ({@link ariaLabel} or
   * {@link ariaLabelledby}).
   */
  readonly label = input<string>();

  /**
   * The choices, in the order they are shown.
   *
   * Rendered as Material's own `<mat-radio-button>` elements, so the exclusivity,
   * the arrow-key navigation and the ripples are Material's. To render a button as
   * something other than its `label`, project a {@link RadioOptionDef} template —
   * the list itself stays this input either way.
   */
  readonly options = input<readonly UiRadioOption<T>[]>([]);

  /**
   * The chosen value, two-way and independent of the forms API.
   *
   * `[(value)]` is the no-forms shape (rule 5): a sort order, a filter — anywhere
   * `[(ngModel)]` would be a directive dragged in for one binding. It stays in step
   * when a form is bound, because both write the same signal.
   *
   * `null` when nothing is chosen, which is what a group starts at unless an option
   * matches.
   */
  readonly value = model<T | null>(null);

  /**
   * Whether the whole group is disabled.
   *
   * A reactive form's own `disable()` drives this too, through `setDisabledState`,
   * and either one is enough to disable the group — so a `FormControl({disabled:
   * true})` needs nothing here, and this input still works on a group with no form
   * at all.
   *
   * To disable one option while the rest stay live, mark it on the option instead —
   * see {@link UiRadioOption.disabled}.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * How the buttons are laid out. Defaults to `column`.
   *
   * This is layout, not Material's — a radio group is a plain container, so the
   * direction is a flex rule in `radio-group.scss` rather than an input Material
   * has. See {@link UiRadioGroupDirection} for which to pick.
   */
  readonly direction = input<UiRadioGroupDirection>('column');

  /** Which side of each button its label sits on. Defaults to `after`. */
  readonly labelPosition = input<UiRadioGroupLabelPosition>('after');

  /**
   * Whether the group is required, which sets `aria-required` on each button.
   *
   * This is semantics, not validation: it says a choice is required, it does not
   * enforce it. Angular's own `required` validator matches the same attribute on
   * `<ui-radio-group [(ngModel)] required>`, so writing it once gets both.
   */
  readonly required = input(false, { transform: booleanAttribute });

  /**
   * The `name` shared by the real inputs, for native form submission.
   *
   * One is generated when this is unset — see {@link resolvedName} — so the group
   * works either way. Set it for a *native* submission, or because `[(ngModel)]`
   * inside a `<form>` reads the same attribute for its own registration.
   */
  readonly name = input<string>();

  /** Whether Material's ripple is suppressed on every button. */
  readonly disableRipple = input(false, { transform: booleanAttribute });

  /**
   * Whether disabled buttons stay interactive — focusable and announced, marked
   * with `aria-disabled` rather than the native `disabled`.
   *
   * Material's own answer to the disabled control that still has to explain itself:
   * a natively disabled input is skipped by the tab order, so a screen reader user
   * never reaches the tooltip saying why it is off.
   */
  readonly disabledInteractive = input(false, { transform: booleanAttribute });

  /**
   * Emits the new value when the *user* chooses an option.
   *
   * Material's own `change`, forwarded — and deliberately not the same event as the
   * `valueChange` that {@link value} emits, which fires however the value moved,
   * including a `writeValue` from a form patch. This one is a click or a keypress
   * and nothing else, which is what an analytics call or a "save now" wants.
   */
  readonly changed = output<T | null>();

  /**
   * The group's accessible name, spelled as the ARIA attribute — for a group with
   * no visible {@link label}.
   *
   * An input rather than a forwarded attribute because this component resolves the
   * group's naming against the rendered label — see {@link resolvedAriaLabelledby}.
   */
  readonly ariaLabel = input<string | undefined, unknown>(undefined, {
    alias: 'aria-label',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The id of the element naming this group, spelled as the ARIA attribute — for a
   * group named by a heading already on the page.
   *
   * Takes precedence over the id of the rendered {@link label}, so this is also how
   * to name the group with something other than its own legend.
   */
  readonly ariaLabelledby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-labelledby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The `MatRadioGroup` this component renders — the escape hatch for anything not
   * wrapped here (rule 4), e.g. `group.matRadioGroup().selected`. Reach it with
   * `#group="uiRadioGroup"`.
   */
  readonly matRadioGroup = viewChild.required(MatRadioGroup);

  /**
   * The `MatRadioButton`s themselves, in the order of {@link options} — the escape
   * hatch for a single button, e.g. `group.matRadioButtons()[0].focus()`.
   */
  readonly matRadioButtons = viewChildren(MatRadioButton);

  /**
   * The `<mat-radio-group>` host element, for anything neither Material nor this
   * wraps. It is the element carrying `role="radiogroup"`.
   *
   * `read: ElementRef` because `#group` sits on a directive, and a template
   * reference to one is the *instance* by default — which is `matRadioGroup()`
   * already, and has no `nativeElement`.
   */
  readonly groupElement: Signal<ElementRef<HTMLElement>> = viewChild.required('group', {
    read: ElementRef,
  });

  /** The chosen option — the one whose `value` the group holds, if any. */
  readonly selectedOption = computed<UiRadioOption<T> | undefined>(() => {
    const value = this.value();
    return this.options().find((option) => option.value === value);
  });

  /** Distinguishes this instance's generated id and name from another group's on the page. */
  private readonly uid = nextUniqueId++;

  /** The id of the rendered {@link label}, which the group's `aria-labelledby` points at. */
  protected readonly labelId = `ui-radio-group-${this.uid}-label`;

  /**
   * The `name` handed to the real group: the consumer's, or a generated one unique
   * to this instance.
   *
   * The fallback is this component's rather than Material's, even though
   * `MatRadioGroup` generates one of its own — because that generated name lives
   * behind the same `name` input this component has to bind, and binding it at all
   * replaces the generated value. Passing `''` for "unset" is what a template would
   * naturally write, and it is exactly the bug: every radio in the group would
   * carry `name=""`, which submits nothing natively and throws away the uniqueness
   * that keeps two groups on one page from colliding. So if the binding must have a
   * value, the value has to be a real name.
   */
  protected readonly resolvedName = computed(() => this.name() ?? `ui-radio-group-${this.uid}`);

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

  protected readonly optionDef = contentChild(RadioOptionDef<T>, { descendants: false });

  /**
   * What names the group, in ARIA's own order of precedence.
   *
   * A consumer's {@link ariaLabelledby} wins, because they are pointing at
   * something more specific than the legend this component rendered. Failing that
   * it is the legend, when there is one. Failing *that* it is `null` — Material
   * renders no attribute, and the group is named by {@link ariaLabel} or not at
   * all.
   */
  protected readonly resolvedAriaLabelledby = computed<string | null>(() => {
    const explicit = this.ariaLabelledby();
    if (explicit) {
      return explicit;
    }
    return this.label() ? this.labelId : null;
  });

  private onChange: (value: T | null) => void = () => {
    // Replaced by `registerOnChange` when a forms directive binds this control.
    // Until then there is nobody to report a change to — a group with `[(value)]`
    // and no form is a supported shape, not a mistake.
  };

  private onTouched: () => void = () => {
    // Replaced by `registerOnTouched`, for the same reason as `onChange`.
  };

  ngAfterViewInit(): void {
    this.forwardAttributes();

    // Static attributes are on the host before this runs, but a bound one
    // (`[attr.data-state]="…"`) lands there again every time it changes, and a
    // consumer's binding must not stop working after the first paint. Observing the
    // host is what keeps rule 3 true for the dynamic case.
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
    // `undefined` is normalised to `null` — a group with nothing chosen has one
    // empty value, not two, so `reset()` and a patch of `null` land in the same
    // state and `value()` never reads as "not yet set".
    this.value.set((value ?? null) as T | null);
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  registerOnChange(fn: (value: T | null) => void): void {
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

  /** The context handed to a projected `uiRadioOption` template for one option. */
  protected optionContext(option: UiRadioOption<T>): UiRadioOptionContext<T> {
    return { $implicit: option, checked: option.value === this.value() };
  }

  protected handleChange(event: MatRadioChange<T>): void {
    this.value.set(event.value);
    this.onChange(event.value);
    this.changed.emit(event.value);
  }

  /**
   * Reports that the user has been in and out of the control, which is what a form
   * means by "touched" — and what a consumer's `control.touched && …` rule for
   * showing an error is usually waiting on.
   */
  protected handleTouched(): void {
    this.onTouched();
  }

  /**
   * Moves every attribute that is not this component's own from `<ui-radio-group>`
   * onto the `<mat-radio-group>`, so that a consumer's `data-*` or
   * `aria-describedby` reaches the element it is about — the one with the
   * `radiogroup` role (rule 3).
   *
   * *Moves* rather than copies: two elements carrying one `data-testid` is an
   * ambiguous query.
   */
  private forwardAttributes(): void {
    const group = this.groupElement().nativeElement;

    // A live NamedNodeMap, and this loop removes from it — hence the copy.
    for (const { name, value } of Array.from(this.hostElement.attributes)) {
      if (HOST_ATTRIBUTES.has(name) || isAngularInternal(name)) {
        continue;
      }
      this.hostElement.removeAttribute(name);
      if (!BOUND_ATTRIBUTES.has(name)) {
        group.setAttribute(name, value);
      }
    }
  }
}
