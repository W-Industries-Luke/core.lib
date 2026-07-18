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
  type AfterViewInit,
  type DoCheck,
  type Signal,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { ErrorStateMatcher, MatOption } from '@angular/material/core';
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
import { MatSelect, MatSelectTrigger, type MatSelectChange } from '@angular/material/select';

/**
 * One choice in a {@link Select}.
 *
 * `label` is the text shown in the panel and, unless a `uiSelectTrigger` says
 * otherwise, in the closed field once the option is chosen. `value` is what the
 * form control holds — deliberately not constrained to a string, because a select
 * over a list of objects is the common case, and forcing an id in and a lookup
 * out is exactly the adapter this library exists to remove.
 */
export interface UiSelectOption<T = unknown> {
  /** What the control's value becomes when this option is chosen. */
  value: T;

  /** The text shown for the option. */
  label: string;

  /**
   * Whether this one option cannot be chosen, while the rest still can.
   *
   * For a control where *nothing* can be chosen, disable the field itself — see
   * {@link Select.disabled}.
   */
  disabled?: boolean;
}

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
export type UiSelectAppearance = MatFormFieldAppearance;

/**
 * When the floating label sits above the field rather than inside it. Aliased
 * from Material's own `FloatLabelType`, for the same reason as
 * {@link UiSelectAppearance}.
 */
export type UiSelectFloatLabel = FloatLabelType;

/**
 * Whether the hint/error line below the field reserves its space permanently
 * (`fixed`, Material's default) or only while there is a message (`dynamic`).
 * Aliased from Material's own `SubscriptSizing`.
 */
export type UiSelectSubscriptSizing = SubscriptSizing;

/**
 * Classes for the options panel, spelled the way Material spells them. Aliased
 * from `MatSelect.panelClass`.
 */
export type UiSelectPanelClass = string | string[] | Set<string> | Record<string, unknown>;

/**
 * How a value is judged to be an option's, for the case where the two are not the
 * same *instance* — a form patched from a server response, say. Aliased from
 * `MatSelect.compareWith`.
 */
export type UiSelectCompareWith<T = unknown> = (o1: T, o2: T) => boolean;

/** The context a `uiSelectOption` template is rendered with. */
export interface UiSelectOptionContext<T = unknown> {
  /** The option being rendered — `let-option`. */
  $implicit: UiSelectOption<T>;
}

/** The context a `uiSelectTrigger` template is rendered with. */
export interface UiSelectTriggerContext<T = unknown> {
  /** The chosen value — `let-value`. An array when `multiple`. */
  $implicit: T | readonly T[] | null;

  /** The chosen options themselves, always an array — `let-options="options"`. */
  options: readonly UiSelectOption<T>[];
}

/**
 * Material's own default, and the one this component keeps: a value is an
 * option's when it is the same value.
 */
function defaultCompareWith<T>(o1: T, o2: T): boolean {
  return o1 === o2;
}

/**
 * Attributes that belong to `<ui-select>` itself and are therefore left alone by
 * {@link Select.forwardAttributes}.
 *
 * Three groups. The first is everything that describes the *wrapper*: `class` and
 * `style` are how a consumer targets it, `hidden` hides the whole field rather
 * than just the control inside it, and `role` re-declares what an element *is* —
 * moving that onto the real control would strip its own `combobox` role, which is
 * the opposite of what anyone writing it wants.
 *
 * The second is this component's own inputs, spelled as HTML lowercases them.
 * Angular has already read these into signals, and each one that has a place on
 * the real control is put there by a binding in `select.html`. Leaving the
 * attributes on the host costs nothing and buys a consumer selectors that read
 * well: `ui-select[disabled]`, `ui-select[appearance='fill']`.
 *
 * The third is `name`, which is here for a reason of its own: `<mat-select>`
 * renders no native form element, so there is nowhere to move it to — and
 * `[(ngModel)]` inside a `<form>` reads the attribute off this host to register
 * itself, which is the only thing `name` does for a select at all.
 */
const HOST_ATTRIBUTES: ReadonlySet<string> = new Set([
  'class',
  'style',
  'hidden',
  'role',
  'name',
  'label',
  'options',
  'placeholder',
  'multiple',
  'disabled',
  'hint',
  'error',
  'appearance',
  'value',
  'floatlabel',
  'subscriptsizing',
  'hiderequiredmarker',
  'hidesingleselectionindicator',
  'required',
  'panelclass',
  'panelwidth',
  'comparewith',
  'disableoptioncentering',
]);

/**
 * Attributes taken off the host but *not* copied onto the control, because a
 * binding in `select.html` already puts them there.
 *
 * They cannot simply stay put like the rest of {@link HOST_ATTRIBUTES}, because
 * `MatSelect` owns every one of them on its own host element — an attribute
 * copied there would be overwritten on the next change detection, which is a bug
 * that only shows up later:
 *
 *   - `id` would be a duplicate of the one on the real control — two elements
 *     with one id is invalid HTML, and it is the id Material's own generated
 *     `aria-*` references are pointed at.
 *   - `tabindex` is Material's, which drops it to `-1` while the field is
 *     disabled.
 *   - `aria-label` and `aria-labelledby` are re-derived from the label and the
 *     value on every check (`MatSelect.ngDoCheck`).
 *   - `aria-describedby` names the description of a *control*. Material merges it
 *     with the ids of the hint and the error it renders, so it has to arrive
 *     through that input rather than as an attribute Material would overwrite.
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
 * Marks an element for the field's leading slot, before the value.
 *
 * ```html
 * <ui-select label="Currency"><mat-icon uiSelectPrefix>payments</mat-icon></ui-select>
 * ```
 *
 * Put it on the element itself — not on a wrapper around it: `ng-content select`
 * only matches the direct children of `<ui-select>`, so a marker nested any
 * deeper is never projected.
 *
 * The slot is Material's own `matIconPrefix`, so the element sits inside the
 * field's box with Material's spacing and the label floats over the value rather
 * than over the icon.
 */
@Directive({ selector: '[uiSelectPrefix]' })
export class SelectPrefix {}

/**
 * Marks an element for the field's trailing slot, after the value.
 *
 * Mark the element itself, for the same reason as {@link SelectPrefix}. Note that
 * the dropdown arrow is Material's own and always there — a suffix sits beside
 * it, it does not replace it.
 */
@Directive({ selector: '[uiSelectSuffix]' })
export class SelectSuffix {}

/**
 * Marks an element as the field's hint, replacing the `hint` string.
 *
 * For a hint a string cannot spell — one with a link in it, or a live count:
 *
 * ```html
 * <ui-select label="Region">
 *   <span uiSelectHint>Not sure? <a href="/docs/regions">Read this</a>.</span>
 * </ui-select>
 * ```
 *
 * Mark the element itself, for the same reason as {@link SelectPrefix}. Material
 * hides the hint line while an `error` is showing, projected or not, so the two
 * never stack.
 */
@Directive({ selector: '[uiSelectHint]' })
export class SelectHint {}

/**
 * Renders each option in the panel, in place of its `label` (rule 7).
 *
 * The option is the template's implicit context, so an avatar, a swatch, a
 * two-line option or a flag is a template rather than a string input this
 * component would have to grow:
 *
 * ```html
 * <ui-select label="Assignee" [options]="people()">
 *   <ng-template uiSelectOption let-option>
 *     <img [src]="option.value.avatar" alt="" /> {{ option.label }}
 *   </ng-template>
 * </ui-select>
 * ```
 *
 * It renders *inside* Material's own `<mat-option>`, so selection, keyboard
 * navigation, the ripple and the checkbox in `multiple` mode are untouched.
 */
@Directive({ selector: '[uiSelectOption]' })
export class SelectOptionDef<T = unknown> {
  /** The template itself, rendered by `select.html`. @docs-private */
  readonly template = inject<TemplateRef<UiSelectOptionContext<T>>>(TemplateRef);

  /**
   * Types `let-option` as the option, rather than as `any`. @docs-private
   *
   * The signature is Angular's, and the compiler is its only caller — the
   * parameters exist to be named in the type predicate and nowhere else, which
   * is exactly what `no-unused-vars` reports. There is no shape of this function
   * that both keeps the guard and satisfies the rule.
   */
  static ngTemplateContextGuard<T>(
    directive: SelectOptionDef<T>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is UiSelectOptionContext<T> {
    return true;
  }
}

/**
 * Renders the *closed* field's value, in place of the chosen labels (rule 7).
 *
 * The usual reason is `multiple`, where Material's own default — every label,
 * comma-separated — overflows the moment someone picks a few:
 *
 * ```html
 * <ui-select label="Toppings" multiple [options]="toppings" [(ngModel)]="picked">
 *   <ng-template uiSelectTrigger let-options="options">
 *     {{ options[0]?.label }}
 *     @if (options.length > 1) {
 *       <span>(+{{ options.length - 1 }} more)</span>
 *     }
 *   </ng-template>
 * </ui-select>
 * ```
 *
 * It renders into Material's own `<mat-select-trigger>`, which shows only once
 * there is a value — an empty field is still Material's placeholder.
 */
@Directive({ selector: '[uiSelectTrigger]' })
export class SelectTriggerDef<T = unknown> {
  /** The template itself, rendered by `select.html`. @docs-private */
  readonly template = inject<TemplateRef<UiSelectTriggerContext<T>>>(TemplateRef);

  /**
   * Types `let-value` and `let-options`, rather than as `any`. @docs-private
   *
   * Disabled for the same reason as {@link SelectOptionDef.ngTemplateContextGuard}.
   */
  static ngTemplateContextGuard<T>(
    directive: SelectTriggerDef<T>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is UiSelectTriggerContext<T> {
    return true;
  }
}

/**
 * A themed Material select: `<mat-form-field>` around a `<mat-select>`, wired as
 * a form control.
 *
 * ```html
 * <ui-select label="Country" [options]="countries" [(ngModel)]="country" />
 *
 * <ui-select label="Toppings" multiple [options]="toppings" [formControl]="picked"
 *            [error]="picked.touched && picked.invalid ? 'Choose at least one.' : ''" />
 * ```
 *
 * Like `ui-card` and `ui-input`, and unlike `uiButton`, this is a component
 * rather than a directive: a select owns *composition* — a container, a floating
 * label, the trigger, an overlay panel of options, and a subscript that is either
 * a hint or an error. There is no single native element to decorate, and
 * `<select>` is not one: Material's select is a `combobox` over an overlay
 * `listbox`, which is what lets an option hold an object rather than a string,
 * and render something other than text.
 *
 * ### It is Material, not a re-implementation
 *
 * The box, the outline, the floating label, the arrow, the panel and its
 * elevation and animation, the ripple, the checkboxes of `multiple` mode, the
 * typeahead and every colour are `<mat-form-field>`'s and `<mat-select>`'s own,
 * resolved from the `--mat-sys-*` tokens that `src/styles/_theme.scss` emits — so
 * there is not a literal colour in `select.scss`, and a palette change there
 * re-skins every select, in light and dark alike.
 *
 * ### Forms
 *
 * `ui-select` is a `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]` and
 * `formControlName` work with no adapter (rule 5) — bind the host, not the select
 * inside it. `[(value)]` is the same state without a forms directive.
 *
 * The value is the chosen option's `value` — an object, if that is what `options`
 * holds. In `multiple` mode it is an array of them, always an array, empty rather
 * than `null` when nothing is chosen. For a value that is not the same *instance*
 * as the one in `options`, see {@link compareWith}.
 *
 * ### Errors
 *
 * `error` is a string, and it shows when it is set — nothing else. It is a
 * `<mat-error>` under Material's own `ErrorStateMatcher`, so the field turns red,
 * `aria-invalid` flips, the hint gives way to the message and Material points the
 * control's `aria-describedby` at it.
 *
 * Deciding *when* that is deliberately stays with the consumer, because only they
 * know their validation — the common shape is a ternary over a control's own
 * state, as in the example above.
 *
 * ### Native attributes reach the real control
 *
 * Anything no input names — `data-*`, `aria-haspopup`, an overlay hook — is moved
 * from `<ui-select>` onto the `<mat-select>` inside it, statically or bound
 * (rule 3). `id`, `tabindex`, `aria-label`, `aria-labelledby` and
 * `aria-describedby` have inputs of their own instead, because Material's own
 * host bindings own those attributes on the control — an attribute copied onto it
 * would be overwritten on the next change detection.
 *
 * ### Styling hooks
 *
 * - `--ui-select-width` — width of the field inside the host. Defaults to `100%`,
 *   so `<ui-select>` is a block that sizes the field: `ui-select { width: 20rem; }`
 *   is the whole gesture, rather than a `::ng-deep`.
 *
 * The panel is in an overlay at the document root, outside this component's style
 * encapsulation — so it is styled through {@link panelClass}, which is Material's
 * own answer and needs no `::ng-deep` either.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiSelect'` hands back the component, and {@link matFormField} /
 * {@link matSelect} hand back the Material instances underneath it — so
 * `field.matSelect().open()`, `.focus()` or `.selectionChange` need no API here
 * (rule 4).
 */
@Component({
  selector: 'ui-select',
  exportAs: 'uiSelect',
  imports: [
    MatFormField,
    MatLabel,
    MatHint,
    MatError,
    MatPrefix,
    MatSuffix,
    MatSelect,
    MatSelectTrigger,
    MatOption,
    NgTemplateOutlet,
  ],
  templateUrl: './select.html',
  styleUrl: './select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    // The forms API resolves this off the element the directive sits on, so it
    // is what makes `<ui-select [(ngModel)]>` bind the host rather than leaving a
    // consumer to reach for the select inside it.
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Select), multi: true },
  ],
})
export class Select<T = unknown>
  implements ControlValueAccessor, ErrorStateMatcher, AfterViewInit, DoCheck
{
  /**
   * The field's label — the name of the thing being chosen, e.g. `Country`.
   *
   * Rendered as Material's `<mat-label>`, which floats above the field once it
   * has a value or focus, and is the control's accessible name — Material points
   * the combobox's `aria-labelledby` at it. Leave it unset only for a field named
   * some other way ({@link ariaLabel} or {@link ariaLabelledby}): an unnamed
   * control is an accessibility violation, not a design choice.
   */
  readonly label = input<string>();

  /**
   * The choices, in the order they are shown.
   *
   * Rendered as Material's own `<mat-option>` elements, so the keyboard
   * navigation, the typeahead and the `multiple` checkboxes are Material's. To
   * render an option as something other than its `label`, project a
   * {@link SelectOptionDef} template — the list itself stays this input either
   * way.
   */
  readonly options = input<readonly UiSelectOption<T>[]>([]);

  /**
   * Short text shown in the closed field while nothing is chosen.
   *
   * A placeholder is not a label: it disappears the moment something is chosen,
   * so it cannot say what the field is. With the default `floatLabel="auto"` the
   * label sits where the placeholder would be, so pair this with
   * `floatLabel="always"` to show both at rest.
   */
  readonly placeholder = input<string>();

  /**
   * Whether more than one option can be chosen, which makes the value an array
   * and gives every option Material's checkbox.
   *
   * Material reads this once, as the select initialises: like `<select multiple>`,
   * it is what the control *is* rather than a state it moves between, and
   * changing it afterwards throws.
   */
  readonly multiple = input(false, { transform: booleanAttribute });

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
   * Help shown under the field — a rule, a consequence, a reassurance.
   *
   * Material hides it while an `error` is showing, so the two never stack. For a
   * hint a string cannot spell, project a {@link SelectHint} element instead.
   */
  readonly hint = input<string>();

  /**
   * The error message. The field shows it, and goes red, exactly while this is
   * set to a non-blank string.
   *
   * *When* to set it is the consumer's call — see the class docs. The message is
   * what a screen reader announces for the field, so say what to do about it
   * (`Choose the country your card was issued in`) rather than what went wrong
   * (`Invalid`).
   */
  readonly error = input<string>();

  /** Visual style of the container. Defaults to `outline`. */
  readonly appearance = input<UiSelectAppearance>('outline');

  /**
   * The chosen value, two-way and independent of the forms API.
   *
   * `[(value)]` is the no-forms shape (rule 5): a sort order, a filter — anywhere
   * `[(ngModel)]` would be a directive dragged in for one binding. It stays in
   * step when a form is bound, because both write the same signal.
   *
   * An array in `multiple` mode; `null` when a single select has nothing chosen.
   */
  readonly value = model<T | readonly T[] | null>(null);

  /**
   * Emits when the options panel opens (`true`) and when it closes (`false`).
   *
   * Material's own `openedChange`, forwarded — for the lazy load that should not
   * run until someone actually looks at the list.
   */
  readonly openedChange = output<boolean>();

  /**
   * The real control's `id`.
   *
   * Set it to point an `aria-*` reference of your own at the control. Material
   * generates one when this is unset, so the label association works either
   * way — this only makes it a *known* id.
   *
   * The attribute is moved off `<ui-select>` when it is written there, so the
   * page never has two elements claiming one id.
   *
   * Note a `<label for>` of your own is *not* how to name this control: `for`
   * only associates with a native form element, and a `<mat-select>` is a
   * `combobox` over an overlay `listbox`. Material knows that, and names the
   * control with `aria-labelledby` instead — use {@link label}, or
   * {@link ariaLabelledby} for a label already on the page.
   */
  readonly id = input<string>();

  /**
   * Whether the field is required, which adds Material's asterisk to the label
   * and sets `aria-required` on the control.
   *
   * This is presentation and semantics, not validation: it says the field is
   * required, it does not enforce it. Angular's own `required` validator matches
   * the same attribute on `<ui-select [(ngModel)] required>`, so writing it once
   * gets both.
   */
  readonly required = input(false, { transform: booleanAttribute });

  /** Whether Material's required asterisk is hidden on a `required` field. */
  readonly hideRequiredMarker = input(false, { transform: booleanAttribute });

  /**
   * When the floating label sits above the field. Defaults to Material's `auto` —
   * it floats once the field has focus or a value.
   *
   * `always` keeps it up, which is what a field with a `placeholder` wants: the
   * two occupy the same space, so an `auto` label hides the placeholder it is
   * meant to explain.
   */
  readonly floatLabel = input<UiSelectFloatLabel>('auto');

  /**
   * Whether the subscript line reserves its space when empty.
   *
   * Material's `fixed` default keeps a row of fields from jumping when one of
   * them shows an error. `dynamic` gives the space back, for a field standing on
   * its own where nothing below it would move.
   */
  readonly subscriptSizing = input<UiSelectSubscriptSizing>('fixed');

  /**
   * Classes for the options panel — Material's own `panelClass`, forwarded.
   *
   * The panel is rendered in an overlay at the document root, outside this
   * component's style encapsulation, so this is how it is styled: a class here
   * and a rule in a global stylesheet, rather than the `::ng-deep` that reaching
   * into the overlay would otherwise take (rule 2).
   */
  readonly panelClass = input<UiSelectPanelClass>('');

  /**
   * Width of the options panel. Defaults to Material's `auto`, which matches the
   * field.
   *
   * `null` lets the panel grow to its longest option instead — for a field
   * narrower than the choices it holds.
   */
  readonly panelWidth = input<string | number | null>('auto');

  /**
   * How a value is matched to an option, for when the value is an object that is
   * not the same *instance* as the one in `options` — a form patched from a
   * server response, say, where the default `===` would leave the field looking
   * empty.
   *
   * ```ts
   * protected readonly byId = (a: Country, b: Country) => a?.id === b?.id;
   * ```
   */
  readonly compareWith = input<UiSelectCompareWith<T>>(defaultCompareWith);

  /**
   * Whether Material centres the active option over the trigger as the panel
   * opens, rather than dropping the panel below it.
   */
  readonly disableOptionCentering = input(false, { transform: booleanAttribute });

  /** Whether the checkmark on the chosen option of a *single* select is hidden. */
  readonly hideSingleSelectionIndicator = input(false, { transform: booleanAttribute });

  /**
   * The control's `tabindex`.
   *
   * An input rather than a forwarded attribute because Material owns this one on
   * the real control: it drops it to `-1` while the field is disabled.
   *
   * Spelled as the HTML attribute rather than aliased to it, so that both
   * `<ui-select tabindex="3">` and `[tabindex]="n"` reach the control — an input
   * named `tabIndex` would silently ignore the lowercase attribute a consumer
   * would actually write.
   */
  readonly tabindex = input(0, { transform: tabIndexAttribute });

  /**
   * The control's accessible name, spelled as the ARIA attribute — for a field
   * with no visible {@link label}.
   *
   * An input rather than a forwarded attribute because Material owns this one on
   * the real control.
   */
  readonly ariaLabel = input<string | undefined, unknown>(undefined, {
    alias: 'aria-label',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The id of the element naming this control, spelled as the ARIA attribute —
   * for a field labelled by something already on the page.
   *
   * An input rather than a forwarded attribute for the same reason as
   * {@link ariaLabel}: Material re-derives this one from the label and the value
   * on every check.
   */
  readonly ariaLabelledby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-labelledby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The ids of elements describing the control, spelled as the ARIA attribute.
   *
   * An input rather than a forwarded attribute because Material owns this one on
   * the real control: it merges these ids with the hint's and the error's, so all
   * of them are announced. An attribute copied onto the control would be
   * overwritten the moment either of those changed.
   */
  readonly ariaDescribedby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-describedby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The `MatFormField` this component renders — the escape hatch for anything not
   * wrapped here. Reach it with `#field="uiSelect"` and `field.matFormField()`.
   */
  readonly matFormField = viewChild.required(MatFormField);

  /**
   * The `MatSelect` itself — the escape hatch for the control (rule 4), e.g.
   * `field.matSelect().open()`, `.focus()`, `.panelOpen` or `.selectionChange`.
   */
  readonly matSelect = viewChild.required(MatSelect);

  /**
   * The `<mat-select>` host element, for anything neither Material nor this
   * wraps.
   *
   * `read: ElementRef` because `#select` sits on a component, and a template
   * reference to one is the *instance* by default — which is `matSelect()`
   * already, and has no `nativeElement`.
   */
  readonly selectElement: Signal<ElementRef<HTMLElement>> = viewChild.required('select', {
    read: ElementRef,
  });

  /** Whether an `error` is set, and therefore whether the field is in an error state. */
  readonly hasError = computed(() => !!this.error()?.trim());

  /** The chosen value as an array, whether or not the field is `multiple`. */
  readonly selectedValues = computed<readonly T[]>(() => {
    const value = this.value();
    if (value == null) {
      return [];
    }
    return Array.isArray(value) ? (value as readonly T[]) : [value as T];
  });

  /**
   * The chosen options — the ones whose `value` the field holds, matched under
   * {@link compareWith} rather than `===`, so that an object value compared by id
   * still finds its option.
   */
  readonly selectedOptions = computed<readonly UiSelectOption<T>[]>(() => {
    const chosen = this.selectedValues();
    const compare = this.compareWith();
    return this.options().filter((option) => chosen.some((value) => compare(option.value, value)));
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

  protected readonly prefixSlot = contentChild(SelectPrefix, { descendants: false });
  protected readonly suffixSlot = contentChild(SelectSuffix, { descendants: false });
  protected readonly hintSlot = contentChild(SelectHint, { descendants: false });
  protected readonly optionDef = contentChild(SelectOptionDef<T>, { descendants: false });
  protected readonly triggerDef = contentChild(SelectTriggerDef<T>, { descendants: false });

  /** The context handed to a projected `uiSelectTrigger` template. */
  protected readonly triggerContext = computed<UiSelectTriggerContext<T>>(() => ({
    $implicit: this.value(),
    options: this.selectedOptions(),
  }));

  /**
   * Handed to `MatSelect` as its `errorStateMatcher`, so that the error state is
   * Material's own mechanism rather than a class this component paints on.
   *
   * A property rather than `[errorStateMatcher]="this"`, which the template
   * expression parser has no receiver for.
   */
  protected readonly errorStateMatcher: ErrorStateMatcher = this;

  private onChange: (value: T | readonly T[] | null) => void = () => {
    // Replaced by `registerOnChange` when a forms directive binds this control.
    // Until then there is nobody to report a change to — a field with `[(value)]`
    // and no form is a supported shape, not a mistake.
  };

  private onTouched: () => void = () => {
    // Replaced by `registerOnTouched`, for the same reason as `onChange`.
  };

  /** Whether the view — and therefore {@link matSelect} — has been created. */
  private viewReady = false;

  /**
   * Re-checks Material's error state on every change detection pass.
   *
   * `MatSelect` does this itself in its own `ngDoCheck`, but only for a select that
   * has an `NgControl` of its own (see `@angular/material/select`). Here the
   * `NgControl` is on `<ui-select>` — that is what makes `[(ngModel)]` bind the host
   * rather than the select inside it — so `MatSelect` never sees one and the
   * re-check has to be driven from this side.
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
    // `matSelect` is a `viewChild.required`, so it must not be read before the view
    // that holds it exists — the first `ngDoCheck` runs before `ngAfterViewInit`.
    if (this.viewReady) {
      this.matSelect().updateErrorState();
    }
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
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
    this.value.set(this.coerceValue(value));
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  registerOnChange(fn: (value: T | readonly T[] | null) => void): void {
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
   * Squares what a form may hold with what the select's mode accepts.
   *
   * A multiple select's value is an array — always, and empty rather than `null`
   * when nothing is chosen, because `reset()` writes `null` and Material would
   * otherwise be handed a value of the wrong shape for the mode it is in. A lone
   * value written to a multiple select is read as an array of one, which is what
   * a form patched with a single value plainly means.
   */
  private coerceValue(value: unknown): T | readonly T[] | null {
    if (!this.multiple()) {
      return (value ?? null) as T | null;
    }
    if (value == null) {
      return [];
    }
    return (Array.isArray(value) ? value : [value]) as readonly T[];
  }

  protected handleSelectionChange(event: MatSelectChange<T | T[]>): void {
    const value = event.value as T | readonly T[] | null;
    this.value.set(value);
    this.onChange(value);
  }

  protected handleOpenedChange(opened: boolean): void {
    this.openedChange.emit(opened);

    // Closing the panel is what "has been in and out of this field" means for a
    // select: the user has looked at the options and either chosen or not. It is
    // what Material's own select reports as touched, and what a consumer's
    // `control.touched && …` rule for showing an error is usually waiting on.
    if (!opened) {
      this.onTouched();
    }
  }

  /** Reports touched for the user who tabbed through the field without opening it. */
  protected handleBlur(): void {
    this.onTouched();
  }

  /**
   * Moves every attribute that is not this component's own from `<ui-select>`
   * onto the `<mat-select>`, so that a consumer's `data-*` or overlay hook
   * reaches the element it is about (rule 3).
   *
   * *Moves* rather than copies: two elements carrying one `data-testid` is an
   * ambiguous query.
   */
  private forwardAttributes(): void {
    const select = this.selectElement().nativeElement;

    // A live NamedNodeMap, and this loop removes from it — hence the copy.
    for (const { name, value } of Array.from(this.hostElement.attributes)) {
      if (HOST_ATTRIBUTES.has(name) || isAngularInternal(name)) {
        continue;
      }
      this.hostElement.removeAttribute(name);
      if (!BOUND_ATTRIBUTES.has(name)) {
        select.setAttribute(name, value);
      }
    }
  }
}
