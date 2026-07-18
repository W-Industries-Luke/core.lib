import {
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  viewChild,
  type AfterViewInit,
  type Signal,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { MatSlider, MatSliderRangeThumb, MatSliderThumb } from '@angular/material/slider';

/**
 * The value of a two-thumb slider: the pair of numbers the thumbs sit at.
 *
 * This is the shape `[(ngModel)]`, `[formControl]` and {@link Slider.changed}
 * carry when `range` is set — one value, so a form holds a range in one control
 * rather than in two that have to be kept in step by hand.
 */
export interface UiSliderRange {
  /** The lower thumb. Never above {@link end}: Material bounds the two. */
  start: number;
  /** The upper thumb. Never below {@link start}. */
  end: number;
}

/**
 * What this control reports to a form: a number, or a {@link UiSliderRange} when
 * `range` is set.
 */
export type UiSliderValue = number | UiSliderRange;

/**
 * Attributes that belong to `<ui-slider>` itself and are therefore left alone by
 * {@link Slider.forwardAttributes}.
 *
 * Two groups, as in `ui-toggle`. The first is everything that describes the
 * *wrapper*: `class` and `style` are how a consumer targets it, `hidden` hides
 * the whole control rather than the input inside it, and `role` re-declares what
 * an element *is* — moving that onto the real input would strip its own `slider`
 * role, which is the opposite of what anyone writing it wants.
 *
 * The second is this component's own inputs, spelled as HTML lowercases them.
 * Angular has already read these into signals, and each one that has a place on
 * the real input is put there by a binding in `slider.html`, or by Material
 * itself. Leaving the attributes on the host costs nothing and buys a consumer
 * selectors that read well: `ui-slider[range]`, `ui-slider[disabled]`.
 *
 * `name` is in that second group for a reason of its own: it is handed to the
 * real input by a binding *and* left on the host, because `[(ngModel)]` inside a
 * `<form>` reads `name` off the element the directive sits on to register
 * itself. The host is not a form element, so a copy of it submits nothing and
 * collides with nothing.
 */
const HOST_ATTRIBUTES: ReadonlySet<string> = new Set([
  'class',
  'style',
  'hidden',
  'role',
  'name',
  'min',
  'max',
  'step',
  'value',
  'startvalue',
  'endvalue',
  'disabled',
  'discrete',
  'range',
  'showticks',
  'disableripple',
  'displaywith',
  'startarialabel',
  'endarialabel',
]);

/**
 * Attributes taken off the host but *not* copied onto the real control, because
 * a binding in `slider.html` already puts them there.
 *
 * They cannot simply stay put like the rest of {@link HOST_ATTRIBUTES}: an
 * `aria-label` written on `<ui-slider>` is read by the {@link Slider.ariaLabel}
 * input — Angular matches the alias to the attribute — and that input is what
 * puts it on the thumb. A copy left on the host would name an element that is
 * not the control, and a screen reader would meet the same string twice.
 */
const BOUND_ATTRIBUTES: ReadonlySet<string> = new Set(['aria-label', 'aria-labelledby']);

/** Whether an attribute on the host is one this component put there itself. */
function isAngularInternal(name: string): boolean {
  // `_nghost-*` / `_ngcontent-*` carry style encapsulation; `ng-reflect-*`,
  // `ng-version` and the `ng-untouched`-style state hooks are the framework's.
  return name.startsWith('_ng') || name.startsWith('ng-');
}

/**
 * Reads a form's value as the number a thumb sits at.
 *
 * A control can hold anything — `null` is a form's own empty value, and a query
 * parameter or a JSON payload arrives as a string — so the fallback is the
 * caller's, and it is where Material parks a thumb it was given no value for.
 */
function coerceValue(value: unknown, fallback: number): number {
  if (value == null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * The shared M3 theme applied to Angular Material's `<mat-slider>`, wired as a
 * form control.
 *
 * ```html
 * <ui-slider aria-label="Volume" [(ngModel)]="volume" />
 *
 * <ui-slider discrete showTicks [max]="10" [formControl]="rating" />
 *
 * <ui-slider range startAriaLabel="Cheapest" endAriaLabel="Dearest" [(ngModel)]="price" />
 * ```
 *
 * Like `ui-toggle`, and unlike `uiButton`, this is a component rather than a
 * directive: `MatSlider` is a *component* with an element selector, so there is
 * no native element to decorate. The `<input type="range">` is not it — that is
 * the element Material wants *inside* the track, the tick marks, the value
 * indicator and the ripples it composes, and Material's own slider is the only
 * thing that knows how to assemble them.
 *
 * ### It is Material, not a re-implementation
 *
 * The track and its fill, the handle, the ripple and state layers, the tick
 * marks, the discrete value indicator, the drag and keyboard handling, the RTL
 * flip and every colour are `<mat-slider>`'s own, resolved from the
 * `--mat-sys-*` tokens that `src/styles/_theme.scss` emits — so there is not a
 * literal colour in `slider.scss`, and a palette change there re-skins every
 * slider, in light and dark alike.
 *
 * That includes the control itself: each thumb is a real `<input type="range">`,
 * so the arrow keys, Home/End, Page Up/Down, and every assistive technology that
 * knows what a range input is, work because none of it is being emulated.
 *
 * ### Forms
 *
 * `ui-slider` is a `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]` and
 * `formControlName` work with no adapter (rule 5) — bind the host, not the input
 * inside it. The control's value is a `number`, or a {@link UiSliderRange} when
 * {@link range} is set, so a two-thumb slider is still *one* form control.
 *
 * `[(value)]` — or `[(startValue)]` / `[(endValue)]` — is the same state without
 * a forms directive.
 *
 * ### Naming the thumbs
 *
 * A slider carries no label of its own, so it needs one from outside — and which
 * input carries it depends on how many thumbs there are:
 *
 *   - one thumb: {@link ariaLabel} or {@link ariaLabelledby};
 *   - two thumbs: {@link startAriaLabel} and {@link endAriaLabel}, because each
 *     thumb is a control of its own and "Price" names neither of them.
 *
 * An unnamed slider is an accessibility violation, not a design choice.
 *
 * ### Styling hooks
 *
 * - `--ui-slider-color` — the active track, the handle, its ripple and state
 *   layers, and the discrete value indicator. Defaults to the theme's `primary`
 *   role.
 * - `--ui-slider-on-color` — what is drawn *on* that colour: the value
 *   indicator's text, the tick marks over the active track, and the outline of
 *   overlapping thumbs. Defaults to `on-primary`.
 *
 * The two are one M3 role pair, so re-point them together — to `error` /
 * `on-error`, or to the theme's own `--ui-sys-success` / `--ui-sys-on-success` —
 * rather than at literals, and they survive a palette change and dark mode. The
 * *inactive* track is deliberately not hooked: it is the theme's neutral
 * surface, and a slider whose empty half carries a colour of its own is one
 * nobody can read at a glance.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiSlider'` hands back the component, {@link matSlider} hands back
 * the Material instance underneath it, and {@link thumb} / {@link startThumb} /
 * {@link endThumb} hand back the real inputs — so `s.thumb()?.focus()`, or their
 * `dragStart` / `dragEnd` emitters, need no API here (rule 4).
 */
@Component({
  selector: 'ui-slider',
  exportAs: 'uiSlider',
  imports: [MatSlider, MatSliderThumb, MatSliderRangeThumb],
  templateUrl: './slider.html',
  styleUrl: './slider.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // A control is touched once the user has been in and out of it. `focusout`
    // rather than `blur`, because the element losing focus is an input inside
    // Material's template and `blur` does not bubble out to this host.
    '(focusout)': 'handleTouched()',
  },
  providers: [
    // The forms API resolves this off the element the directive sits on, so it
    // is what makes `<ui-slider [(ngModel)]>` bind the host rather than leaving
    // a consumer to reach for the input inside it.
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Slider), multi: true },
  ],
})
export class Slider implements ControlValueAccessor, AfterViewInit {
  /** The lowest value a thumb can take. Defaults to Material's own `0`. */
  readonly min = input(0, { transform: numberAttribute });

  /** The highest value a thumb can take. Defaults to Material's own `100`. */
  readonly max = input(100, { transform: numberAttribute });

  /**
   * The interval between the values a thumb can stop at.
   *
   * Material's default is `1`, which is also what the arrow keys move by. A
   * slider over a continuous quantity — an opacity, a rate — wants a fraction
   * (`0.1`); one over a count wants an integer.
   */
  readonly step = input(1, { transform: numberAttribute });

  /**
   * Whether the slider is disabled.
   *
   * A reactive form's own `disable()` drives this too, through
   * `setDisabledState`, and either one is enough to disable the slider — so a
   * `FormControl({disabled: true})` needs nothing here, and this input still
   * works on a slider with no form at all.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Whether the slider shows Material's value indicator over the handle while it
   * is being moved.
   *
   * The affordance for a slider whose exact value matters — a rating, a count.
   * Leave it off where only the relative position does, like a volume.
   * {@link displayWith} formats what it says.
   */
  readonly discrete = input(false, { transform: booleanAttribute });

  /**
   * Whether the slider draws a tick mark at every step — Material's
   * `showTickMarks`.
   *
   * Only meaningful where the steps are countable: at the default `step` of `1`
   * across the default `0`–`100` this is 101 dots, which is a texture rather
   * than an affordance. Pair it with a `step` coarse enough to see.
   */
  readonly showTicks = input(false, { transform: booleanAttribute });

  /**
   * Whether the slider has two thumbs, and so selects a range rather than a
   * value.
   *
   * This changes the shape of the control's value — a {@link UiSliderRange}
   * rather than a `number` — and which inputs name the thumbs
   * ({@link startAriaLabel} / {@link endAriaLabel} rather than
   * {@link ariaLabel}). Material fixes the number of thumbs when it initialises,
   * so flipping this rebuilds the slider underneath: it is a shape, not a state
   * to animate between.
   */
  readonly range = input(false, { transform: booleanAttribute });

  /** Whether Material's ripple is suppressed. */
  readonly disableRipple = input(false, { transform: booleanAttribute });

  /**
   * Formats the number the {@link discrete} value indicator shows, e.g.
   * `` value => `£${value}` ``.
   *
   * Material's own `displayWith`, passed straight through (rule 4). It is a
   * label, not the value: the control still reports the number.
   */
  readonly displayWith = input<(value: number) => string>();

  /**
   * Where the thumb sits, two-way and independent of the forms API — the
   * single-thumb shape, so it is ignored while {@link range} is set.
   *
   * `[(value)]` is the no-forms shape (rule 5): a volume in a toolbar, a zoom
   * level — anywhere `[(ngModel)]` would be a directive dragged in for one
   * binding. It stays in step when a form is bound, because both write the same
   * signal.
   *
   * A `model()` rather than the `input()` + `valueChange` pair rule 5 rules
   * out — which is also why it takes no `numberAttribute`: Angular's model
   * signals accept no transform, so this one is a number and `[value]="20"` is
   * how a slider starts at twenty. A bare `<ui-slider value="20">` does not
   * compile, rather than quietly reading as the string the HTML parser produces.
   *
   * It defaults to `0` rather than to {@link min}, because an input cannot read
   * another at construction — so give a slider that does not start at zero a
   * value of its own.
   */
  readonly value = model(0);

  /** Where the lower thumb sits while {@link range} is set. Two-way, as {@link value}. */
  readonly startValue = model(0);

  /** Where the upper thumb sits while {@link range} is set. Two-way, as {@link value}. */
  readonly endValue = model(100);

  /**
   * Emits when the *user* has finished moving a thumb — a pointer released, or a
   * key pressed.
   *
   * Material's own `valueChange`, forwarded: it is the native `change` event of
   * the real `<input type="range">`, so it fires once per gesture rather than on
   * every pixel of a drag, and never for a value moved from code.
   * `valueChange` / `startValueChange` / `endValueChange` — the `model()`s'
   * outputs — are the live ones, and fire however the value moved, including a
   * `writeValue` from a form patch. Reach for this one when the point is that
   * someone chose, which for a slider is usually the request that saves the
   * setting.
   *
   * It carries the whole control value, so a range slider reports both thumbs.
   */
  readonly changed = output<UiSliderValue>();

  /**
   * The `name` on the real input, for a slider inside a native `<form>` —
   * single-thumb only, since a range is two inputs and has no one name.
   *
   * `[(ngModel)]` inside a `<form>` reads the same attribute for its own
   * registration, so writing `name` once serves both.
   */
  readonly name = input<string>();

  /**
   * The thumb's accessible name, spelled as the ARIA attribute.
   *
   * An input rather than a forwarded attribute because Material renders the
   * element it belongs on: `<ui-slider aria-label="Volume">` has to reach the
   * `<input type="range">` inside the template, and an attribute sitting on this
   * host names nothing.
   *
   * Single-thumb only: two thumbs are two controls, and {@link startAriaLabel}
   * and {@link endAriaLabel} name them.
   */
  readonly ariaLabel = input<string | undefined, unknown>(undefined, {
    alias: 'aria-label',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The id of the element naming the thumb, spelled as the ARIA attribute — for
   * a slider labelled by something already on the page, which is the usual shape
   * for a form row.
   *
   * Single-thumb only, for the same reason as {@link ariaLabel}.
   */
  readonly ariaLabelledby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-labelledby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /** The lower thumb's accessible name, while {@link range} is set. */
  readonly startAriaLabel = input<string>();

  /** The upper thumb's accessible name, while {@link range} is set. */
  readonly endAriaLabel = input<string>();

  /**
   * The `MatSlider` this component renders — the escape hatch for anything not
   * wrapped here (rule 4). Reach it with `#s="uiSlider"`.
   */
  readonly matSlider = viewChild.required(MatSlider);

  /**
   * The single thumb's `MatSliderThumb`, or `undefined` while {@link range} is
   * set — for `s.thumb()?.focus()`, its `dragStart` / `dragEnd` emitters, and
   * anything else this does not wrap.
   */
  readonly thumb = viewChild('thumb', { read: MatSliderThumb });

  /** The lower thumb's `MatSliderRangeThumb`, or `undefined` unless {@link range} is set. */
  readonly startThumb = viewChild('startThumb', { read: MatSliderRangeThumb });

  /** The upper thumb's `MatSliderRangeThumb`, or `undefined` unless {@link range} is set. */
  readonly endThumb = viewChild('endThumb', { read: MatSliderRangeThumb });

  /**
   * The `<mat-slider>` host element, for anything neither Material nor this
   * wraps.
   *
   * `read: ElementRef` because `#slider` sits on a component, and a template
   * reference to one is the *instance* by default — which is `matSlider()`
   * already, and has no `nativeElement`.
   */
  readonly sliderElement: Signal<ElementRef<HTMLElement>> = viewChild.required('slider', {
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
   * {@link displayWith}, with Material's own default behind it.
   *
   * `MatSlider.displayWith` is a plain property Material *calls* rather than one
   * it null-checks, so binding `undefined` at it would throw the moment a
   * discrete thumb moved. Defaulting here is what keeps `displayWith` optional
   * on this component.
   */
  protected readonly matDisplayWith = computed(
    () => this.displayWith() ?? ((value: number) => `${value}`),
  );

  /**
   * The attributes moved off the host, kept so that they can be re-applied.
   *
   * Flipping {@link range} destroys the element they were forwarded to and
   * builds a new one, and by then the host has nothing left to move — so what
   * was forwarded is remembered rather than re-read.
   */
  private readonly forwarded = new Map<string, string>();

  private onChange: (value: UiSliderValue) => void = () => {
    // Replaced by `registerOnChange` when a forms directive binds this control.
    // Until then there is nobody to report a change to — a slider with
    // `[(value)]` and no form is a supported shape, not a mistake.
  };

  private onTouched: () => void = () => {
    // Replaced by `registerOnTouched`, for the same reason as `onChange`.
  };

  constructor() {
    // The forwarding target is inside Material's template, and `range` decides
    // which element it is — so this re-runs whenever that view is rebuilt,
    // rather than once at `ngAfterViewInit` like `ui-toggle`'s. It only removes
    // attributes from the host and writes them to an element it does not
    // observe, so it cannot loop.
    //
    // `afterRenderEffect` rather than `effect`, because the target has to exist
    // to be written to: a plain effect first runs before the view is created,
    // and would read a view query that has nothing in it yet.
    afterRenderEffect(() => {
      this.sliderElement();
      this.range();
      this.forwardAttributes();
    });
  }

  ngAfterViewInit(): void {
    // Static attributes are on the host before the effect above first runs, but
    // a bound one (`[attr.data-state]="…"`) lands there again every time it
    // changes, and a consumer's binding must not stop working after the first
    // paint. Observing the host is what keeps rule 3 true for the dynamic case.
    //
    // This terminates: the callback only ever *removes* attributes from the
    // host, and a run that finds nothing to move makes no mutations to observe.
    if (typeof MutationObserver === 'undefined') {
      return;
    }
    const observer = new MutationObserver(() => this.forwardAttributes());
    observer.observe(this.hostElement, { attributes: true });
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  writeValue(value: unknown): void {
    if (!this.range()) {
      this.value.set(coerceValue(value, this.min()));
      return;
    }

    // A range's empty value is the whole range: it is the state a filter starts
    // in, and the one a `reset()` should put it back to.
    const range = (value ?? {}) as Partial<UiSliderRange>;
    this.startValue.set(coerceValue(range.start, this.min()));
    this.endValue.set(coerceValue(range.end, this.max()));
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  registerOnChange(fn: (value: UiSliderValue) => void): void {
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

  /** What a form holds: the number, or both thumbs while `range` is set. */
  protected controlValue(): UiSliderValue {
    return this.range() ? { start: this.startValue(), end: this.endValue() } : this.value();
  }

  /**
   * Reports the value the user is dragging *through*, live.
   *
   * The native `input` event rather than Material's `valueChange`, which is the
   * `change` event and so only fires once the gesture ends: a form bound to a
   * slider should follow the thumb rather than jump when it is let go.
   * {@link changed} is the end-of-gesture signal for anyone who wants that
   * instead.
   *
   * The value is read back off the real input rather than taken from the event,
   * because it is the input that applies `min`, `max` and `step` — and, for a
   * range, the sibling thumb — so this is the value the slider is actually
   * showing.
   */
  protected handleInput(value: number): void {
    this.value.set(value);
    this.onChange(value);
  }

  /** As {@link handleInput}, for the lower thumb of a range. */
  protected handleStartInput(value: number): void {
    this.startValue.set(value);
    this.onChange(this.controlValue());
  }

  /** As {@link handleInput}, for the upper thumb of a range. */
  protected handleEndInput(value: number): void {
    this.endValue.set(value);
    this.onChange(this.controlValue());
  }

  /** Reports that the user has finished moving a thumb — see {@link changed}. */
  protected handleChanged(): void {
    this.changed.emit(this.controlValue());
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
   * Moves every attribute that is not this component's own from `<ui-slider>`
   * onto the real control, so that a consumer's `data-*`, `id`, `form`,
   * `tabindex` or `autofocus` reaches the element it is about (rule 3).
   *
   * *Moves* rather than copies: two elements carrying one `data-testid` is an
   * ambiguous query.
   */
  private forwardAttributes(): void {
    // A live NamedNodeMap, and this loop removes from it — hence the copy.
    for (const { name, value } of Array.from(this.hostElement.attributes)) {
      if (HOST_ATTRIBUTES.has(name) || isAngularInternal(name)) {
        continue;
      }
      this.forwarded.set(name, value);
      this.hostElement.removeAttribute(name);
    }

    const target = this.forwardTarget();
    if (!target) {
      return;
    }
    for (const [name, value] of this.forwarded) {
      if (!BOUND_ATTRIBUTES.has(name)) {
        target.setAttribute(name, value);
      }
    }
  }

  /**
   * The element a forwarded attribute belongs on.
   *
   * A single-thumb slider has exactly one control, and it is the
   * `<input type="range">` — an `id` or a `tabindex` left anywhere else would
   * describe an element the user never reaches, and a `<label for>` would point
   * at nothing.
   *
   * A range slider has two, so there is no such element and the attribute goes
   * on `<mat-slider>` — the group, exactly as `ui-radio-group` forwards to
   * `<mat-radio-group>` rather than picking one of its buttons. Anything that
   * *has* to name a thumb has an input of its own ({@link startAriaLabel},
   * {@link endAriaLabel}) rather than being guessed at from here.
   *
   * The input is queried rather than read off `MatSliderThumb`, whose reference
   * to it (`_hostElement`) is private API this should not lean on.
   */
  private forwardTarget(): HTMLElement | null {
    const slider = this.sliderElement().nativeElement;
    return this.range() ? slider : slider.querySelector('input');
  }
}
