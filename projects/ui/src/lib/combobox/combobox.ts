import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  Directive,
  effect,
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
  type Signal,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { ErrorStateMatcher, MatOptgroup, MatOption } from '@angular/material/core';
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
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatSelect, MatSelectTrigger, type MatSelectChange } from '@angular/material/select';

import { Chips, type UiChip } from '../chips/chips';

/**
 * One choice in a {@link Combobox}.
 *
 * `label` is the text shown in the panel, the text the search field matches against,
 * and — in `multiple` mode — the text on the chip once the option is chosen. `value`
 * is what the form control holds — deliberately not constrained to a string, because
 * a combobox over a list of objects is the common case, and forcing an id in and a
 * lookup out is exactly the adapter this library exists to remove.
 */
export interface UiComboboxOption<T = unknown> {
  /** What the control's value becomes when this option is chosen. */
  value: T;

  /** The text shown for the option, and what the search field matches against. */
  label: string;

  /**
   * The heading this option is filed under, if any. Options sharing a `group` are
   * gathered under one Material `<mat-optgroup>`, in the order the group first
   * appears in {@link Combobox.options}. Leave it unset for an option that stands on
   * its own, above the groups.
   */
  group?: string;

  /**
   * Whether this one option cannot be chosen, while the rest still can.
   *
   * For a control where *nothing* can be chosen, disable the field itself — see
   * {@link Combobox.disabled}.
   */
  disabled?: boolean;
}

/**
 * Visual style of the field's container.
 *
 * Aliased from Material's own `MatFormFieldAppearance` rather than re-declared, so
 * that a change to the union upstream is a compile error here rather than an
 * appearance this component forwards and `MatFormField` throws on.
 *
 *   - `outline` — the outlined box. This library's default.
 *   - `fill` — the filled box. Material's own default.
 */
export type UiComboboxAppearance = MatFormFieldAppearance;

/**
 * When the floating label sits above the field rather than inside it. Aliased from
 * Material's own `FloatLabelType`, for the same reason as {@link UiComboboxAppearance}.
 */
export type UiComboboxFloatLabel = FloatLabelType;

/**
 * Whether the hint/error line below the field reserves its space permanently
 * (`fixed`, Material's default) or only while there is a message (`dynamic`). Aliased
 * from Material's own `SubscriptSizing`.
 */
export type UiComboboxSubscriptSizing = SubscriptSizing;

/**
 * Classes for the options panel, spelled the way Material spells them. Aliased from
 * `MatSelect.panelClass`.
 */
export type UiComboboxPanelClass = string | string[] | Set<string> | Record<string, unknown>;

/**
 * How a value is judged to be an option's, for the case where the two are not the
 * same *instance* — a form patched from a server response, say. Aliased from
 * `MatSelect.compareWith`.
 */
export type UiComboboxCompareWith<T = unknown> = (o1: T, o2: T) => boolean;

/**
 * Whether an option survives the search for the text the user has typed.
 *
 * The default is a case-insensitive "contains" over the option's `label`; this is the
 * hook for anything else — a `startsWith`, a fuzzy match, or a search over a field the
 * label does not show.
 *
 * @param option The option being judged.
 * @param text The text currently in the search field, exactly as typed.
 */
export type UiComboboxFilter<T = unknown> = (option: UiComboboxOption<T>, text: string) => boolean;

/** The context a `uiComboboxOption` template is rendered with. */
export interface UiComboboxOptionContext<T = unknown> {
  /** The option being rendered — `let-option`. */
  $implicit: UiComboboxOption<T>;

  /** The text currently in the search field — `let-search="search"`, for highlighting the match. */
  search: string;
}

/** A run of options gathered under one heading, or under none. @docs-private */
interface UiComboboxGroup<T = unknown> {
  /** The group's heading, or `null` for the ungrouped options above the groups. */
  label: string | null;

  /** The options in this group that survive the current search. */
  options: readonly UiComboboxOption<T>[];
}

/**
 * The default {@link UiComboboxFilter}: case-insensitive, contains, over the option's
 * label — what "search this list" means to everyone who has not said otherwise.
 */
function defaultFilter<T>(option: UiComboboxOption<T>, text: string): boolean {
  return option.label.toLowerCase().includes(text.trim().toLowerCase());
}

/**
 * Material's own default, and the one this component keeps: a value is an option's
 * when it is the same value.
 */
function defaultCompareWith<T>(o1: T, o2: T): boolean {
  return o1 === o2;
}

/**
 * The keys the search field lets bubble to `<mat-select>` rather than typing into
 * itself — so the arrow keys move the active option, Enter chooses it, Escape and Tab
 * close the panel, all of it Material's own, while every other key is a character the
 * user is searching with. See {@link Combobox.handleSearchKeydown}.
 */
const PASSTHROUGH_KEYS: ReadonlySet<string> = new Set([
  'ArrowDown',
  'ArrowUp',
  'Enter',
  'Escape',
  'Tab',
]);

/**
 * Attributes that belong to `<ui-combobox>` itself and are therefore left alone by
 * {@link Combobox.forwardAttributes}.
 *
 * Three groups, exactly as `ui-select`: the wrapper's own attributes (`class`,
 * `style`, `hidden`, `role`), this component's inputs spelled as HTML lowercases them,
 * and `name` — which has nowhere else to go, because `<mat-select>` renders no native
 * form element, and is where `[(ngModel)]` inside a `<form>` reads it from.
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
  'searchplaceholder',
  'noresultstext',
  'multiple',
  'clearable',
  'disabled',
  'hint',
  'error',
  'appearance',
  'value',
  'floatlabel',
  'subscriptsizing',
  'hiderequiredmarker',
  'required',
  'panelclass',
  'comparewith',
  'filterwith',
]);

/**
 * Attributes taken off the host but *not* copied onto the control, because a binding
 * in `combobox.html` already puts them there — for the same reasons as `ui-select`:
 * Material owns each of these on the `<mat-select>` host and would overwrite a copy.
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
 * Put it on the element itself — not on a wrapper around it: `ng-content select` only
 * matches the direct children of `<ui-combobox>`, so a marker nested any deeper is
 * never projected. The slot is Material's own `matIconPrefix`.
 */
@Directive({ selector: '[uiComboboxPrefix]' })
export class ComboboxPrefix {}

/**
 * Marks an element for the field's trailing slot, after the value.
 *
 * Mark the element itself, for the same reason as {@link ComboboxPrefix}. Note the
 * dropdown arrow and the `clearable` button are Material's/this component's own and
 * sit beside a suffix, they do not replace it.
 */
@Directive({ selector: '[uiComboboxSuffix]' })
export class ComboboxSuffix {}

/**
 * Marks an element as the field's hint, replacing the `hint` string — for a hint a
 * string cannot spell, one with a link in it or a live count.
 *
 * Mark the element itself, for the same reason as {@link ComboboxPrefix}. Material
 * hides the hint line while an `error` is showing, projected or not, so the two never
 * stack.
 */
@Directive({ selector: '[uiComboboxHint]' })
export class ComboboxHint {}

/**
 * Renders each option in the panel, in place of its `label` (rule 7).
 *
 * The option is the template's implicit context and the search text is alongside it,
 * so an avatar, a swatch, a two-line option or the matched substring in bold is a
 * template rather than a string input this component would have to grow:
 *
 * ```html
 * <ui-combobox label="Assignee" [options]="people()">
 *   <ng-template uiComboboxOption let-option let-search="search">
 *     <img [src]="option.value.avatar" alt="" /> {{ option.label }}
 *   </ng-template>
 * </ui-combobox>
 * ```
 *
 * It renders *inside* Material's own `<mat-option>`, so selection, keyboard
 * navigation, the ripple and the checkbox in `multiple` mode are untouched.
 */
@Directive({ selector: '[uiComboboxOption]' })
export class ComboboxOptionDef<T = unknown> {
  /** The template itself, rendered by `combobox.html`. @docs-private */
  readonly template = inject<TemplateRef<UiComboboxOptionContext<T>>>(TemplateRef);

  /**
   * Types `let-option` and `let-search`, rather than as `any`. @docs-private
   *
   * The signature is Angular's, and the compiler is its only caller — the parameters
   * exist to be named in the type predicate and nowhere else, which is exactly what
   * `no-unused-vars` reports.
   */
  static ngTemplateContextGuard<T>(
    directive: ComboboxOptionDef<T>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is UiComboboxOptionContext<T> {
    return true;
  }
}

/**
 * A themed Material select whose option list is searchable: `<mat-form-field>` around
 * a `<mat-select>` with a search field at the top of its panel, wired as a form
 * control.
 *
 * ```html
 * <ui-combobox label="Country" [options]="countries" [(ngModel)]="country" />
 *
 * <ui-combobox label="Toppings" multiple clearable [options]="toppings"
 *              [formControl]="picked" />
 * ```
 *
 * ### What it is, and is not
 *
 * A combobox is the middle of three widgets this library ships, and choosing between
 * them is choosing what the value *is*:
 *
 *   - `ui-select` — a constrained list, no search. The right tool up to a screenful of
 *     options.
 *   - `ui-combobox` — a **constrained list you can search within**. The value is
 *     always an option's `value`; the search field only narrows what is shown. This.
 *   - `ui-autocomplete` — a **free-text box** that suggests. The value can be text the
 *     user typed that no option holds.
 *
 * So the search field here never becomes the value: it filters, and it is emptied when
 * the panel closes. What the user picks is an option, every time.
 *
 * ### It is Material, not a re-implementation
 *
 * The box, the outline, the floating label, the arrow, the overlay panel and its
 * elevation and animation, the options and their ripples, the `multiple` checkboxes,
 * the `combobox`/`listbox` roles, the roving `aria-activedescendant`, the arrow keys,
 * Enter, Escape and every colour are `<mat-form-field>`'s and `<mat-select>`'s own,
 * resolved from the `--mat-sys-*` tokens that `src/styles/_theme.scss` emits — so
 * there is not a literal colour in `combobox.scss`, and a palette change there
 * re-skins every combobox, in light and dark alike.
 *
 * What this adds over `ui-select` is the search field inside the panel and the
 * filtering behind it (case-insensitive contains over the label by default — see
 * {@link filterWith}), and, in `multiple` mode, the selected options shown as
 * `ui-chips` in the closed field.
 *
 * ### Keyboard
 *
 * The panel opens focused on the search field, so the user can just type. The keys
 * that drive the list — the arrows, Enter, Escape and Tab — are let through to
 * `<mat-select>`, so navigation, selection and closing stay Material's own ARIA
 * combobox behaviour; every other key types into the search field.
 *
 * ### Forms
 *
 * `ui-combobox` is a `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]` and
 * `formControlName` work with no adapter (rule 5) — bind the host, not the select
 * inside it. `[(value)]` is the same state without a forms directive.
 *
 * The value is the chosen option's `value` — an object, if that is what `options`
 * holds. In `multiple` mode it is an array of them, always an array, empty rather than
 * `null` when nothing is chosen. For a value that is not the same *instance* as the one
 * in `options`, see {@link compareWith}.
 *
 * ### Errors
 *
 * `error` is a string, and it shows when it is set — nothing else. It is a
 * `<mat-error>` under Material's own `ErrorStateMatcher`, so the field turns red,
 * `aria-invalid` flips, the hint gives way to the message and Material points the
 * control's `aria-describedby` at it. *When* to set it stays with the consumer.
 *
 * ### Native attributes reach the real control
 *
 * Anything no input names — `data-*`, `aria-haspopup`, an overlay hook — is moved from
 * `<ui-combobox>` onto the `<mat-select>` inside it (rule 3). `id`, `tabindex` and the
 * `aria-*` names have inputs of their own, because Material owns those on the control.
 *
 * ### Styling hooks
 *
 * - `--ui-combobox-width` — width of the field inside the host. Defaults to `100%`, so
 *   `ui-combobox { width: 20rem; }` is the whole gesture, rather than a `::ng-deep`.
 *
 * The panel is in an overlay at the document root — style it through {@link panelClass},
 * Material's own answer, rather than reaching in with `::ng-deep`.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiCombobox'` hands back the component, and {@link matFormField} /
 * {@link matSelect} hand back the Material instances underneath it — so
 * `field.matSelect().open()`, `.focus()` or `.selectionChange` need no API here (rule 4).
 */
@Component({
  selector: 'ui-combobox',
  exportAs: 'uiCombobox',
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
    MatOptgroup,
    MatIcon,
    MatIconButton,
    Chips,
    NgTemplateOutlet,
  ],
  templateUrl: './combobox.html',
  styleUrl: './combobox.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Combobox), multi: true }],
})
export class Combobox<T = unknown>
  implements ControlValueAccessor, ErrorStateMatcher, AfterViewInit
{
  /**
   * The field's label — the name of the thing being chosen, e.g. `Country`.
   *
   * Rendered as Material's `<mat-label>`, and the control's accessible name. Leave it
   * unset only for a field named some other way ({@link ariaLabel} or
   * {@link ariaLabelledby}): an unnamed control is an accessibility violation.
   */
  readonly label = input<string>();

  /**
   * The choices, in the order they are shown — before the search.
   *
   * Rendered as Material's own `<mat-option>` elements (grouped by
   * {@link UiComboboxOption.group} under `<mat-optgroup>`), so the keyboard navigation
   * and the `multiple` checkboxes are Material's. The search field narrows this list as
   * the user types; to render an option as something other than its `label`, project a
   * {@link ComboboxOptionDef}.
   */
  readonly options = input<readonly UiComboboxOption<T>[]>([]);

  /**
   * Short text shown in the closed field while nothing is chosen. A placeholder is not
   * a label — pair it with `floatLabel="always"` to show both at rest.
   */
  readonly placeholder = input<string>();

  /** Short text shown in the empty search field inside the panel. Defaults to `Search…`. */
  readonly searchPlaceholder = input('Search…');

  /** What the panel shows when the search matches no option. Defaults to `No results`. */
  readonly noResultsText = input('No results');

  /**
   * Whether more than one option can be chosen, which makes the value an array, gives
   * every option Material's checkbox, and shows the chosen options as `ui-chips` in the
   * closed field.
   *
   * Material reads this once, as the select initialises: like `<select multiple>`, it
   * is what the control *is* rather than a state it moves between, and changing it
   * afterwards throws.
   */
  readonly multiple = input(false, { transform: booleanAttribute });

  /**
   * Whether the field carries a button that clears the whole selection back to empty.
   *
   * The button shows only while there is something to clear, and clearing does not open
   * the panel. Off by default.
   */
  readonly clearable = input(false, { transform: booleanAttribute });

  /**
   * Whether the field is disabled. A reactive form's own `disable()` drives this too,
   * through `setDisabledState`, and either one is enough.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Help shown under the field. Material hides it while an `error` is showing. For a
   * hint a string cannot spell, project a {@link ComboboxHint} element instead.
   */
  readonly hint = input<string>();

  /**
   * The error message. The field shows it, and goes red, exactly while this is set to a
   * non-blank string. *When* to set it is the consumer's call — see the class docs.
   */
  readonly error = input<string>();

  /** Visual style of the container. Defaults to `outline`. */
  readonly appearance = input<UiComboboxAppearance>('outline');

  /**
   * The chosen value, two-way and independent of the forms API (rule 5). An array in
   * `multiple` mode; `null` when a single combobox has nothing chosen.
   */
  readonly value = model<T | readonly T[] | null>(null);

  /**
   * Whether an option survives the search for the text the user has typed. Defaults to
   * a case-insensitive "contains" over the option's `label`. Replace it for a
   * `startsWith`, a fuzzy match, or a search over a field the label does not show.
   */
  readonly filterWith = input<UiComboboxFilter<T>>(defaultFilter);

  /**
   * How a value is matched to an option, for when the value is an object that is not the
   * same *instance* as the one in `options` — a form patched from a server response.
   */
  readonly compareWith = input<UiComboboxCompareWith<T>>(defaultCompareWith);

  /** Emits when the options panel opens (`true`) and when it closes (`false`). */
  readonly openedChange = output<boolean>();

  /**
   * The real control's `id`. Set it to point an `aria-*` reference of your own at the
   * control; Material generates one when this is unset. The attribute is moved off the
   * wrapper when written there, so the page never has two elements claiming one id.
   */
  readonly id = input<string>();

  /**
   * Whether the field is required, which adds Material's asterisk to the label and sets
   * `aria-required` on the control. This is presentation and semantics, not validation.
   */
  readonly required = input(false, { transform: booleanAttribute });

  /** Whether Material's required asterisk is hidden on a `required` field. */
  readonly hideRequiredMarker = input(false, { transform: booleanAttribute });

  /** When the floating label sits above the field. Defaults to Material's `auto`. */
  readonly floatLabel = input<UiComboboxFloatLabel>('auto');

  /** Whether the subscript line reserves its space when empty. Defaults to `fixed`. */
  readonly subscriptSizing = input<UiComboboxSubscriptSizing>('fixed');

  /**
   * Classes for the options panel — Material's own `panelClass`, forwarded. The panel
   * renders in an overlay at the document root, so this is how it is styled (rule 2).
   */
  readonly panelClass = input<UiComboboxPanelClass>('');

  /**
   * The control's `tabindex`. An input rather than a forwarded attribute because
   * Material owns this one on the real control — it drops it to `-1` while disabled.
   */
  readonly tabindex = input(0, { transform: tabIndexAttribute });

  /** The control's accessible name, spelled as the ARIA attribute — for a field with no visible {@link label}. */
  readonly ariaLabel = input<string | undefined, unknown>(undefined, {
    alias: 'aria-label',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /** The id of the element naming this control, spelled as the ARIA attribute. */
  readonly ariaLabelledby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-labelledby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /** The ids of elements describing the control, spelled as the ARIA attribute. */
  readonly ariaDescribedby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-describedby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /** The `MatFormField` this component renders — the escape hatch for anything not wrapped here. */
  readonly matFormField = viewChild.required(MatFormField);

  /** The `MatSelect` itself — the escape hatch for the control (rule 4). */
  readonly matSelect = viewChild.required(MatSelect);

  /** The `<mat-select>` host element, for anything neither Material nor this wraps. */
  readonly selectElement: Signal<ElementRef<HTMLElement>> = viewChild.required('select', {
    read: ElementRef,
  });

  /** The search `<input>` inside the panel, focused when the panel opens. @docs-private */
  private readonly searchField = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  /** Whether an `error` is set, and therefore whether the field is in an error state. */
  readonly hasError = computed(() => !!this.error()?.trim());

  /** The text currently in the search field — what the filter reads. */
  readonly search = signal('');

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
   * {@link compareWith} rather than `===`. Independent of the search, so the chips in a
   * `multiple` field stay put while the list below is narrowed.
   */
  readonly selectedOptions = computed<readonly UiComboboxOption<T>[]>(() => {
    const chosen = this.selectedValues();
    const compare = this.compareWith();
    return this.options().filter((option) => chosen.some((value) => compare(option.value, value)));
  });

  /** The chosen options as chips, for the closed field of a `multiple` combobox. @docs-private */
  protected readonly selectedChips = computed<readonly UiChip<T>[]>(() =>
    this.selectedOptions().map((option) => ({ label: option.label, value: option.value })),
  );

  /** The options that survive the current search, in `options` order. @docs-private */
  private readonly filteredOptions = computed<readonly UiComboboxOption<T>[]>(() => {
    const text = this.search().trim();
    const options = this.options();
    if (!text) {
      return options;
    }
    const filter = this.filterWith();
    return options.filter((option) => filter(option, text));
  });

  /**
   * The surviving options, gathered into their groups in first-appearance order — what
   * `combobox.html` iterates. Ungrouped options come first, under a `null` heading that
   * renders no `<mat-optgroup>`. @docs-private
   */
  protected readonly groups = computed<readonly UiComboboxGroup<T>[]>(() => {
    const grouped: UiComboboxGroup<T>[] = [];
    const buckets = new Map<string | null, UiComboboxOption<T>[]>();
    for (const option of this.filteredOptions()) {
      const label = option.group ?? null;
      let bucket = buckets.get(label);
      if (!bucket) {
        bucket = [];
        buckets.set(label, bucket);
        grouped.push({ label, options: bucket });
      }
      bucket.push(option);
    }
    // Ungrouped options belong above the headings, whatever order they arrived in.
    return grouped.sort((a, b) => (a.label === null ? -1 : b.label === null ? 1 : 0));
  });

  /** Whether the search matched no option — the panel's empty state. @docs-private */
  protected readonly hasNoResults = computed(() => this.filteredOptions().length === 0);

  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  /** Whether a reactive form has disabled this control — see `setDisabledState`. */
  private readonly disabledByForm = signal(false);

  /** Whether the control is disabled by either route. */
  protected readonly isDisabled = computed(() => this.disabled() || this.disabledByForm());

  protected readonly prefixSlot = contentChild(ComboboxPrefix, { descendants: false });
  protected readonly suffixSlot = contentChild(ComboboxSuffix, { descendants: false });
  protected readonly hintSlot = contentChild(ComboboxHint, { descendants: false });
  protected readonly optionDef = contentChild(ComboboxOptionDef<T>, { descendants: false });

  /** Whether the closed field has a selection — when {@link clearable} shows its button. */
  protected readonly hasValue = computed(() => this.selectedValues().length > 0);

  /**
   * Handed to `MatSelect` as its `errorStateMatcher`, so that the error state is
   * Material's own mechanism rather than a class this component paints on.
   */
  protected readonly errorStateMatcher: ErrorStateMatcher = this;

  private onChange: (value: T | readonly T[] | null) => void = () => {
    // Replaced by `registerOnChange` when a forms directive binds this control.
  };

  private onTouched: () => void = () => {
    // Replaced by `registerOnTouched`, for the same reason as `onChange`.
  };

  constructor() {
    // `MatSelect` re-checks its error state in `ngDoCheck`, but only for a select that
    // has an `NgControl` of its own. Here the `NgControl` is on `<ui-combobox>`, so the
    // re-check has to be driven from this side, as `ui-select` does.
    effect(() => {
      this.error();
      this.matSelect().updateErrorState();
    });
  }

  ngAfterViewInit(): void {
    this.forwardAttributes();

    if (typeof MutationObserver === 'undefined') {
      return;
    }
    const observer = new MutationObserver(() => this.forwardAttributes());
    observer.observe(this.hostElement, { attributes: true });
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  /**
   * Whether the field is in an error state, as Material's `ErrorStateMatcher`: `error`
   * being set *is* the error state, so the message and the red box can never disagree.
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
   * Squares what a form may hold with what the combobox's mode accepts — a multiple
   * combobox's value is always an array, empty rather than `null`, and a lone value
   * written to it is read as an array of one. The same rule as `ui-select`.
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

    if (opened) {
      // Land the caret in the search field so the user can just start typing. Material
      // has only rendered the panel's content this tick, so wait a frame for the
      // projected `<input>` to exist before reaching for it.
      setTimeout(() => this.searchField()?.nativeElement.focus());
    } else {
      // The search is a filter, not part of the value — a reopened panel shows the
      // whole list rather than the last thing that was searched for.
      this.search.set('');
      this.onTouched();
    }
  }

  /** Reports touched for the user who tabbed through the field without opening it. */
  protected handleBlur(): void {
    this.onTouched();
  }

  /** Mirrors the search field's text into the {@link search} signal for the filter. */
  protected handleSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  /**
   * Keeps typing in the search field from reaching `<mat-select>` — while letting the
   * keys that drive the list through to it.
   *
   * `<mat-select>` listens for keydown on the panel the search field sits in, and would
   * otherwise treat a letter as its own type-ahead and Space as "choose the active
   * option". Stopping every key but the navigation ones ({@link PASSTHROUGH_KEYS}) hands
   * Material the arrows, Enter, Escape and Tab it needs and leaves the rest to type.
   */
  protected handleSearchKeydown(event: KeyboardEvent): void {
    if (!PASSTHROUGH_KEYS.has(event.key)) {
      event.stopPropagation();
    }
  }

  /**
   * Clears the whole selection, without opening the panel.
   *
   * `stopPropagation` keeps the click off `<mat-select>`'s own trigger, which would
   * otherwise open the panel the user is trying to empty.
   */
  protected clear(event: Event): void {
    event.stopPropagation();
    const empty = this.coerceValue(null);
    this.value.set(empty);
    this.onChange(empty);
  }

  /**
   * Removes one option from a `multiple` selection — the chip's remove button in the
   * closed field. Reports the new value to the form.
   */
  protected removeChip(chip: UiChip<T>): void {
    const compare = this.compareWith();
    const next = this.selectedValues().filter((value) => !compare(value, chip.value));
    this.value.set(next);
    this.onChange(next);
  }

  /** Swallows a click on the chips so removing one does not open the panel. @docs-private */
  protected stopClick(event: Event): void {
    event.stopPropagation();
  }

  /**
   * Moves every attribute that is not this component's own from `<ui-combobox>` onto the
   * `<mat-select>`, so a consumer's `data-*` or overlay hook reaches the element it is
   * about (rule 3). The same mechanism as `ui-select`.
   */
  private forwardAttributes(): void {
    const select = this.selectElement().nativeElement;

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
