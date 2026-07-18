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
import {
  MatButtonToggle,
  MatButtonToggleGroup,
  type MatButtonToggleAppearance,
  type MatButtonToggleChange,
} from '@angular/material/button-toggle';

import { Icon } from '../icon/icon';

/**
 * One toggle in a {@link ButtonToggle}.
 *
 * `label` is the option's name — its text, and the name assistive tech announces
 * for it even when {@link ButtonToggle.iconOnly} leaves only the glyph on screen.
 * `value` is what the form control holds — deliberately not constrained to a
 * string, because a group over a list of objects is a common case, and forcing an
 * id in and a lookup out is exactly the adapter this library exists to remove.
 */
export interface UiButtonToggleOption<T = unknown> {
  /** What the control's value becomes when this toggle is chosen. */
  value: T;

  /** The option's name: its text, and what a screen reader announces for it. */
  label: string;

  /**
   * A Material Symbols icon *name* for the toggle's glyph, e.g. `format_bold`.
   *
   * Rendered as this library's own `<ui-icon>`, so it is the fleet's icon set and
   * takes the toggle's own colour. For anything an icon name cannot spell — a
   * glyph that depends on the state, an inline SVG, a count beside the label —
   * project a {@link ButtonToggleOptionDef} template instead, which wins over this.
   */
  icon?: string;

  /**
   * Whether this one toggle cannot be chosen, while the rest still can.
   *
   * For a group where *nothing* can be chosen, disable the group itself — see
   * {@link ButtonToggle.disabled}.
   */
  disabled?: boolean;
}

/**
 * The visual style of the group. Aliased from `MatButtonToggleGroup.appearance`
 * rather than re-declared, so that a change to the union upstream is a compile
 * error here rather than a value this component forwards and Material renders
 * wrong.
 *
 *   - `standard` — M3's own: an outlined bar of toggles. The default.
 *   - `legacy` — the M2-era elevated bar, for a surface that is already dense with
 *     outlines. Material leaves every `legacy-*` token unset under an M3 theme, so
 *     this library fills them in from the same `--mat-sys-*` roles the standard
 *     appearance uses — see `button-toggle.scss`.
 */
export type UiButtonToggleAppearance = MatButtonToggleAppearance;

/**
 * What a {@link ButtonToggle}'s value is: one option's `value`, an array of them
 * when `multiple`, or `null` when a single-select group has nothing chosen.
 */
export type UiButtonToggleValue<T = unknown> = T | readonly T[] | null;

/** The context a `uiButtonToggleOption` template is rendered with. */
export interface UiButtonToggleOptionContext<T = unknown> {
  /** The option being rendered — `let-option`. */
  $implicit: UiButtonToggleOption<T>;

  /** Whether this option is currently chosen — `let-selected="selected"`. */
  selected: boolean;
}

/** Distinguishes the generated label ids and names of two groups on one page. */
let nextUniqueId = 0;

/**
 * Attributes that belong to `<ui-button-toggle>` itself and are therefore left
 * alone by {@link ButtonToggle.forwardAttributes}.
 *
 * Two groups. The first is everything that describes the *wrapper*: `class` and
 * `style` are how a consumer targets it, `hidden` hides the whole control rather
 * than just the toggles inside it, and `role` re-declares what an element *is* —
 * moving that onto the real group would strip the `radiogroup`/`group` role
 * Material puts there, which is the opposite of what anyone writing it wants.
 *
 * The second is this component's own inputs, spelled as HTML lowercases them.
 * Angular has already read these into signals, and each one that has a place on
 * the real group is put there by a binding in `button-toggle.html`. Leaving the
 * attributes on the host costs nothing and buys a consumer selectors that read
 * well: `ui-button-toggle[disabled]`, `ui-button-toggle[appearance='legacy']`.
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
  'multiple',
  'appearance',
  'vertical',
  'icononly',
  'hideselectionindicator',
  'disableripple',
  'disabledinteractive',
]);

/**
 * Attributes taken off the host but *not* copied onto the real group, because a
 * binding in `button-toggle.html` already puts them there.
 *
 * `aria-label` and `aria-labelledby` are how the group is *named*, and this
 * component resolves both — {@link ButtonToggle.resolvedAriaLabelledby} falls back
 * to the id of the rendered {@link ButtonToggle.label}. An attribute forwarded
 * straight onto the group would sit alongside that binding rather than replacing
 * it, so a consumer's `aria-labelledby` and the generated one would fight, and the
 * loser would depend on change-detection order. They are inputs instead, and the
 * bindings are the only writer.
 */
const BOUND_ATTRIBUTES: ReadonlySet<string> = new Set(['aria-label', 'aria-labelledby']);

/** Whether an attribute on the host is one this component put there itself. */
function isAngularInternal(name: string): boolean {
  // `_nghost-*` / `_ngcontent-*` carry style encapsulation; `ng-reflect-*`,
  // `ng-version` and the `ng-untouched`-style state hooks are the framework's.
  return name.startsWith('_ng') || name.startsWith('ng-');
}

/**
 * Renders a toggle's content, in place of its icon and label (rule 7).
 *
 * The option is the template's implicit context, and whether it is chosen is
 * `let-selected` — so a toggle with a count beside its name, or a glyph that fills
 * when it is chosen, is a template rather than another input this component would
 * have to grow:
 *
 * ```html
 * <ui-button-toggle label="Folder" [options]="folders()">
 *   <ng-template uiButtonToggleOption let-option let-selected="selected">
 *     <ui-icon [name]="option.icon" [filled]="selected" size="sm" />
 *     {{ option.label }} ({{ option.value.count }})
 *   </ng-template>
 * </ui-button-toggle>
 * ```
 *
 * It renders *inside* Material's own `<mat-button-toggle>`, so the button, the
 * ripple, the state layers, the selection checkmark and the keyboard are untouched.
 */
@Directive({ selector: 'ng-template[uiButtonToggleOption]' })
export class ButtonToggleOptionDef<T = unknown> {
  /** The template itself, rendered by `button-toggle.html`. @docs-private */
  readonly template = inject<TemplateRef<UiButtonToggleOptionContext<T>>>(TemplateRef);

  /**
   * Types `let-option` and `let-selected`, rather than as `any`. @docs-private
   *
   * The signature is Angular's, and the compiler is its only caller — the
   * parameters exist to be named in the type predicate and nowhere else, which is
   * exactly what `no-unused-vars` reports. There is no shape of this function that
   * both keeps the guard and satisfies the rule; `RadioOptionDef` carries the same
   * one for the same reason.
   */
  static ngTemplateContextGuard<T>(
    directive: ButtonToggleOptionDef<T>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is UiButtonToggleOptionContext<T> {
    return true;
  }
}

/**
 * A themed Material button toggle group: `<mat-button-toggle-group>` over
 * `<mat-button-toggle>`s, wired as a form control.
 *
 * ```html
 * <ui-button-toggle label="View" [options]="views" [(ngModel)]="view" />
 *
 * <ui-button-toggle label="Style" multiple iconOnly [options]="styles" [formControl]="style" />
 * ```
 *
 * Like `ui-radio-group` and `ui-list`, and unlike `uiButton`, this is a component
 * rather than a directive: a toggle group owns *composition* — a label naming the
 * set, and the toggles themselves, which only mean anything as a group. There is no
 * single native element to decorate.
 *
 * ### Which control this is
 *
 * A button toggle is a radio group — or a set of checkboxes, when `multiple` — that
 * looks like a bar of buttons: it is for a choice that is *shown* rather than one
 * that is filled in, and whose options are few and short. A view switcher, a text
 * alignment, a date range. For a choice in a form, reach for `ui-radio-group`; for
 * one over more than a handful of options, `ui-select`.
 *
 * ### It is Material, not a re-implementation
 *
 * The buttons and their shared outline, the ripples, the state layers, the focus
 * rings, the selection checkmark, the exclusivity, the roving arrow-key focus, the
 * `radiogroup`/`radio` roles a single-select group takes and the `group`/`button`
 * plus `aria-pressed` ones a `multiple` group takes, and every colour are
 * `<mat-button-toggle-group>`'s and `<mat-button-toggle>`'s own, resolved from the
 * `--mat-sys-*` tokens that `src/styles/_theme.scss` emits — so there is not a
 * literal colour in `button-toggle.scss`, and a palette change there re-skins every
 * group in the fleet, in light and dark alike.
 *
 * ### Accessibility
 *
 * Material's group carries the role; this component names it. {@link label} is
 * rendered with an id of its own and the group's `aria-labelledby` points at it, so a
 * screen reader announces "View, List, radio button, 1 of 3" rather than a bare
 * "List". For a group named by something already on the page use
 * {@link ariaLabelledby}; for one with no visible name, {@link ariaLabel}. An unnamed
 * toggle group is an accessibility violation, not a design choice.
 *
 * Each option's `label` becomes its toggle's accessible name whenever the text is not
 * on screen — which is what keeps {@link iconOnly} a visual decision rather than a row
 * of unnamed glyphs.
 *
 * ### Forms
 *
 * `ui-button-toggle` is a `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]`
 * and `formControlName` work with no adapter (rule 5) — bind the host, not the group
 * inside it. `[(value)]` is the same state without a forms directive.
 *
 * The value is the chosen option's `value`; an array of them when {@link multiple},
 * and `null` when a single-select group has nothing chosen. A value written for the
 * other mode is reconciled rather than rejected — see {@link groupValue}.
 *
 * Note there is no `compareWith`: Material matches a value to its toggle by `===`, so
 * a value that is not the same *instance* as the one in `options` leaves the group
 * looking empty. Hold the option's own object (or an id) in the control rather than a
 * copy of it.
 *
 * ### Native attributes reach the real group
 *
 * Anything no input names — `data-*`, `aria-describedby`, `tabindex` — is moved from
 * `<ui-button-toggle>` onto the `<mat-button-toggle-group>` inside it, statically or
 * bound (rule 3), which is the element carrying the role. `aria-label` and
 * `aria-labelledby` have inputs of their own instead, because this component resolves
 * them against the rendered {@link label}.
 *
 * ### Styling hooks
 *
 * - `--ui-button-toggle-selected-container-color` /
 *   `--ui-button-toggle-on-selected-container-color` — the fill of a chosen toggle and
 *   the text and checkmark on it. A pair: set both, or the text stops being legible on
 *   the fill.
 * - `--ui-button-toggle-shape` — the group's corners. Defaults to the fleet's own
 *   `--ui-button-shape`, so a group and the buttons beside it agree.
 * - `--ui-button-toggle-gap` — the space between the label and the group.
 *
 * Point a colour at a `--mat-sys-*` / `--ui-sys-*` role rather than a literal, so it
 * survives a palette change and dark mode. All are ordinary declarations on an
 * ordinary selector — no `::ng-deep`, no `!important` (rules 2 and 6).
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiButtonToggle'` hands back the component, and
 * {@link matButtonToggleGroup} / {@link matButtonToggles} hand back the Material
 * instances underneath it — so `group.matButtonToggleGroup().selected` or
 * `group.matButtonToggles()[0].focus()` needs no API here (rule 4).
 */
@Component({
  selector: 'ui-button-toggle',
  exportAs: 'uiButtonToggle',
  imports: [MatButtonToggleGroup, MatButtonToggle, Icon, NgTemplateOutlet],
  templateUrl: './button-toggle.html',
  styleUrl: './button-toggle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // A control is touched once the user has been in and out of it. `focusout`
    // rather than `blur`, because the element losing focus is the button inside
    // Material's template and `blur` does not bubble out to this host.
    '(focusout)': 'handleTouched()',
  },
  providers: [
    // The forms API resolves this off the element the directive sits on, so it is
    // what makes `<ui-button-toggle [(ngModel)]>` bind the host rather than leaving
    // a consumer to reach for the group inside it.
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ButtonToggle), multi: true },
  ],
})
export class ButtonToggle<T = unknown> implements ControlValueAccessor, AfterViewInit {
  /**
   * The group's label — what the toggles are a choice *of*, e.g. `View`.
   *
   * Rendered above the group, and its accessible name: the group's `aria-labelledby`
   * is pointed at it, so a screen reader announces it before the option. Leave it
   * unset only for a group named some other way ({@link ariaLabel} or
   * {@link ariaLabelledby}).
   */
  readonly label = input<string>();

  /**
   * The toggles, in the order they are shown.
   *
   * Rendered as Material's own `<mat-button-toggle>` elements, so the exclusivity,
   * the arrow-key navigation and the ripples are Material's. To render one as
   * something other than its icon and label, project a {@link ButtonToggleOptionDef}
   * template — the list itself stays this input either way.
   */
  readonly options = input<readonly UiButtonToggleOption<T>[]>([]);

  /**
   * The chosen value, two-way and independent of the forms API.
   *
   * `[(value)]` is the no-forms shape (rule 5): a view switcher, a filter — anywhere
   * `[(ngModel)]` would be a directive dragged in for one binding. It stays in step
   * when a form is bound, because both write the same signal.
   *
   * An array when {@link multiple} — empty rather than `null` when nothing is chosen
   * — and the option's own `value`, or `null`, otherwise.
   */
  readonly value = model<UiButtonToggleValue<T>>(null);

  /**
   * Whether more than one toggle can be chosen at a time, which makes {@link value}
   * an array and each toggle a `button` with `aria-pressed` rather than a `radio`.
   *
   * Off by default: a bar of buttons reads as one choice until it says otherwise.
   *
   * Material builds the group's selection model as the group initialises and reads
   * this to size it, so — like `<select multiple>`, and like `ui-list`'s own
   * `multiple` — it is what the control *is* rather than a state it moves between.
   * Set it in the template; a group that has to change mode is two controls, and
   * `@if` is how to say so.
   */
  readonly multiple = input(false, { transform: booleanAttribute });

  /**
   * The group's visual style. Defaults to M3's own `standard`; see
   * {@link UiButtonToggleAppearance} for what `legacy` is for.
   */
  readonly appearance = input<UiButtonToggleAppearance>('standard');

  /**
   * Whether the whole group is disabled.
   *
   * A reactive form's own `disable()` drives this too, through `setDisabledState`,
   * and either one is enough to disable the group — so a `FormControl({disabled:
   * true})` needs nothing here, and this input still works on a group with no form at
   * all.
   *
   * To disable one toggle while the rest stay live, mark it on the option instead —
   * see {@link UiButtonToggleOption.disabled}.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Whether the toggles stack vertically rather than sitting in a bar. Material's own
   * switch, forwarded — it keeps the shared outline and turns the dividers.
   */
  readonly vertical = input(false, { transform: booleanAttribute });

  /**
   * Whether each toggle shows only its {@link UiButtonToggleOption.icon}, with its
   * `label` becoming the toggle's accessible name rather than its text.
   *
   * For the toolbar case — bold/italic/underline, a text alignment — where the glyphs
   * are the vocabulary and the words would be noise. An option with no icon still
   * renders its label, so a group is never a row of blank buttons.
   */
  readonly iconOnly = input(false, { transform: booleanAttribute });

  /**
   * Whether the checkmark Material puts on a chosen toggle is hidden, leaving it
   * marked by its fill alone.
   *
   * Material's own switch — one input here rather than its two
   * (`hideSingleSelectionIndicator` / `hideMultipleSelectionIndicator`), because a
   * group is only ever one of the two modes, so a consumer setting them per mode is
   * configuring a group that does not exist. Reach for it when the toggles are narrow
   * — an {@link iconOnly} bar, where the checkmark crowds the glyph.
   */
  readonly hideSelectionIndicator = input(false, { transform: booleanAttribute });

  /** Whether Material's ripple is suppressed on every toggle. */
  readonly disableRipple = input(false, { transform: booleanAttribute });

  /**
   * Whether disabled toggles stay interactive — focusable and announced, marked with
   * `aria-disabled` rather than the native `disabled`.
   *
   * Material's own answer to the disabled control that still has to explain itself: a
   * natively disabled button is skipped by the tab order, so a screen reader user
   * never reaches the tooltip saying why it is off.
   */
  readonly disabledInteractive = input(false, { transform: booleanAttribute });

  /**
   * The `name` shared by the toggles of a single-select group, for native form
   * submission. One is generated when this is unset — see {@link resolvedName} — so
   * the group works either way.
   */
  readonly name = input<string>();

  /**
   * Emits the new value when the *user* changes the selection.
   *
   * Material's own `change`, forwarded — and deliberately not the same event as the
   * `valueChange` that {@link value} emits, which fires however the value moved,
   * including a `writeValue` from a form patch. This one is a click or a keypress and
   * nothing else, which is what an analytics call or a "save now" wants.
   */
  readonly changed = output<UiButtonToggleValue<T>>();

  /**
   * The group's accessible name, spelled as the ARIA attribute — for a group with no
   * visible {@link label}.
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
   * Takes precedence over the id of the rendered {@link label}, so this is also how to
   * name the group with something other than its own label.
   */
  readonly ariaLabelledby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-labelledby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The `MatButtonToggleGroup` this component renders — the escape hatch for anything
   * not wrapped here (rule 4), e.g. `group.matButtonToggleGroup().selected`. Reach it
   * with `#group="uiButtonToggle"`.
   */
  readonly matButtonToggleGroup = viewChild.required(MatButtonToggleGroup);

  /**
   * The `MatButtonToggle`s themselves, in the order of {@link options} — the escape
   * hatch for a single toggle, e.g. `group.matButtonToggles()[0].focus()`.
   */
  readonly matButtonToggles = viewChildren(MatButtonToggle);

  /**
   * The `<mat-button-toggle-group>` host element, for anything neither Material nor
   * this wraps. It is the element carrying the `radiogroup` / `group` role.
   *
   * `read: ElementRef` because `#group` sits on a directive, and a template reference
   * to one is the *instance* by default — which is `matButtonToggleGroup()` already,
   * and has no `nativeElement`.
   */
  readonly groupElement: Signal<ElementRef<HTMLElement>> = viewChild.required('group', {
    read: ElementRef,
  });

  /**
   * The chosen values as an array, whether or not the group is {@link multiple} — the
   * shape a consumer counting or iterating the selection wants, with no mode check.
   */
  readonly selectedValues = computed<readonly T[]>(() => {
    const value = this.value();
    if (value == null) {
      return [];
    }
    return Array.isArray(value) ? (value as readonly T[]) : [value as T];
  });

  /** The chosen options — the ones whose `value` the group holds, in `options` order. */
  readonly selectedOptions = computed<readonly UiButtonToggleOption<T>[]>(() => {
    const values = this.selectedValues();
    return this.options().filter((option) => values.some((value) => value === option.value));
  });

  /** Distinguishes this instance's generated id and name from another group's on the page. */
  private readonly uid = nextUniqueId++;

  /** The id of the rendered {@link label}, which the group's `aria-labelledby` points at. */
  protected readonly labelId = `ui-button-toggle-${this.uid}-label`;

  /**
   * The `name` handed to the real group: the consumer's, or a generated one unique to
   * this instance.
   *
   * The fallback is this component's rather than Material's, even though
   * `MatButtonToggleGroup` generates one of its own — because that generated name
   * lives behind the same `name` input this component has to bind, and binding it at
   * all replaces the generated value. Passing `''` for "unset" is what a template
   * would naturally write, and it is exactly the bug: every toggle would carry
   * `name=""`, which submits nothing natively and throws away the uniqueness that
   * keeps two groups on one page from colliding. So if the binding must have a value,
   * the value has to be a real name.
   */
  protected readonly resolvedName = computed(() => this.name() ?? `ui-button-toggle-${this.uid}`);

  /**
   * The value handed to Material, in the shape its mode demands: an array when
   * `multiple` — it throws on anything else — and a single value or `null` otherwise.
   *
   * This is where a value written for the *other* mode is reconciled rather than
   * rejected: a `multiple` group handed `'list'` selects that one toggle, and a
   * single-select group handed `['list']` takes the first. A control patched before
   * `multiple` was known, or one whose mode changed with the screen, is a real shape —
   * and throwing at it would be this component's doing, not Material's.
   */
  protected readonly groupValue = computed<T | readonly T[] | null>(() => {
    const values = this.selectedValues();
    return this.multiple() ? values : (values[0] ?? null);
  });

  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  /** Whether a reactive form has disabled this control — see `setDisabledState`. */
  private readonly disabledByForm = signal(false);

  /**
   * Whether the control is disabled by either route.
   *
   * The two are independent on purpose: a form disabling a control must not silently
   * un-set a `disabled` a template wrote, and vice versa.
   */
  protected readonly isDisabled = computed(() => this.disabled() || this.disabledByForm());

  protected readonly optionDef = contentChild(ButtonToggleOptionDef<T>, { descendants: false });

  /**
   * What names the group, in ARIA's own order of precedence.
   *
   * A consumer's {@link ariaLabelledby} wins, because they are pointing at something
   * more specific than the label this component rendered. Failing that it is the
   * label, when there is one. Failing *that* it is `null` — Material renders no
   * attribute, and the group is named by {@link ariaLabel} or not at all.
   */
  protected readonly resolvedAriaLabelledby = computed<string | null>(() => {
    const explicit = this.ariaLabelledby();
    if (explicit) {
      return explicit;
    }
    return this.label() ? this.labelId : null;
  });

  private onChange: (value: UiButtonToggleValue<T>) => void = () => {
    // Replaced by `registerOnChange` when a forms directive binds this control. Until
    // then there is nobody to report a change to — a group with `[(value)]` and no
    // form is a supported shape, not a mistake.
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
    // This terminates: the callback only ever *removes* attributes from the host, and
    // a run that finds nothing to move makes no mutations to observe.
    if (typeof MutationObserver === 'undefined') {
      return;
    }
    const observer = new MutationObserver(() => this.forwardAttributes());
    observer.observe(this.hostElement, { attributes: true });
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  writeValue(value: unknown): void {
    // `undefined` is normalised to `null` — a group with nothing chosen has one empty
    // value, not two, so `reset()` and a patch of `null` land in the same state and
    // `value()` never reads as "not yet set".
    this.value.set((value ?? null) as UiButtonToggleValue<T>);
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  registerOnChange(fn: (value: UiButtonToggleValue<T>) => void): void {
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

  /** The context handed to a projected `uiButtonToggleOption` template for one option. */
  protected optionContext(option: UiButtonToggleOption<T>): UiButtonToggleOptionContext<T> {
    return {
      $implicit: option,
      selected: this.selectedValues().some((value) => value === option.value),
    };
  }

  /** Whether an option's `label` is rendered as the toggle's text. */
  protected showsLabel(option: UiButtonToggleOption<T>): boolean {
    return !this.iconOnly() || !option.icon;
  }

  /**
   * The accessible name handed to Material's toggle: the option's `label`, but only
   * when the label is not already on screen as text.
   *
   * An `aria-label` alongside visible text *replaces* it as the name, so a projected
   * template rendering more than the label — "Bold (3)" — would announce less than it
   * shows, which is the `label-in-name` failure. `''` is how ARIA spells "no name of
   * my own": the name then comes from the content, which is exactly where it should
   * come from when there is content to read.
   */
  protected toggleAriaLabel(option: UiButtonToggleOption<T>): string {
    return !this.optionDef() && !this.showsLabel(option) ? option.label : '';
  }

  protected handleChange(event: MatButtonToggleChange): void {
    // Material's own value, in the shape its mode already put it in: an array when
    // `multiple`, the single value otherwise. Copied, because the array is built from
    // Material's selection model — a consumer holding it in a signal must not have it
    // change under them, and `value()` must not compare equal to its own last value.
    const value: UiButtonToggleValue<T> = this.multiple()
      ? [...((event.value ?? []) as readonly T[])]
      : ((event.value ?? null) as T | null);

    this.value.set(value);
    this.onChange(value);
    this.changed.emit(value);
  }

  /**
   * Reports that the user has been in and out of the control, which is what a form
   * means by "touched" — and what a consumer's `control.touched && …` rule for showing
   * an error is usually waiting on.
   */
  protected handleTouched(): void {
    this.onTouched();
  }

  /**
   * Moves every attribute that is not this component's own from `<ui-button-toggle>`
   * onto the `<mat-button-toggle-group>`, so that a consumer's `data-*` or
   * `aria-describedby` reaches the element it is about — the one with the role
   * (rule 3).
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
