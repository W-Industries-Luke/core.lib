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
  type DoCheck,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import {
  MatAutocomplete,
  MatAutocompleteTrigger,
  type MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
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
import { MatInput } from '@angular/material/input';

/**
 * One suggestion in an {@link Autocomplete}.
 *
 * `label` is the text shown in the panel and, unless a {@link Autocomplete.displayWith}
 * says otherwise, the text put in the box once the option is chosen. It is also what
 * the default filter matches against. `value` is what the control holds after the
 * choice — deliberately not constrained to a string, because suggesting a list of
 * objects is the common case, and forcing an id in and a lookup out is exactly the
 * adapter this library exists to remove.
 */
export interface UiAutocompleteOption<T = unknown> {
  /** What the control's value becomes when this option is chosen. */
  value: T;

  /** The text shown for the option, and what the default filter matches against. */
  label: string;

  /**
   * Whether this one suggestion cannot be chosen, while the rest still can.
   *
   * For a field where *nothing* can be chosen, disable the field itself — see
   * {@link Autocomplete.disabled}.
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
export type UiAutocompleteAppearance = MatFormFieldAppearance;

/**
 * When the floating label sits above the field rather than inside it. Aliased from
 * Material's own `FloatLabelType`, for the same reason as
 * {@link UiAutocompleteAppearance}.
 */
export type UiAutocompleteFloatLabel = FloatLabelType;

/**
 * Whether the hint/error line below the field reserves its space permanently
 * (`fixed`, Material's default) or only while there is a message (`dynamic`).
 * Aliased from Material's own `SubscriptSizing`.
 */
export type UiAutocompleteSubscriptSizing = SubscriptSizing;

/**
 * Where the panel opens relative to the field. Aliased from
 * `MatAutocompleteTrigger.position`.
 *
 *   - `auto` — below if it fits, above if it does not.
 *   - `above` / `below` — always there, fit or not.
 */
export type UiAutocompletePanelPosition = 'auto' | 'above' | 'below';

/**
 * Classes for the suggestions panel, spelled the way Material spells them. Aliased
 * from `MatAutocomplete.classList`.
 */
export type UiAutocompletePanelClass = string | string[];

/**
 * Turns the control's value into the text shown in the field. Aliased from
 * `MatAutocomplete.displayWith`.
 *
 * The value can be free text the user typed rather than an option's — see the
 * {@link Autocomplete} class docs — so this has to cope with a string it never
 * suggested.
 */
export type UiAutocompleteDisplayWith<T = unknown> = (value: T | string | null) => string;

/**
 * Whether an option survives the filter for the text the user has typed.
 *
 * The default is a case-insensitive "contains" over the option's `label`; this is
 * the hook for anything else — a `startsWith`, a fuzzy match, a search over a field
 * the label does not show, or `() => true` for a list an API has already filtered.
 *
 * @param option The option being judged.
 * @param text The text currently in the field, exactly as typed.
 */
export type UiAutocompleteFilter<T = unknown> = (
  option: UiAutocompleteOption<T>,
  text: string,
) => boolean;

/** The context a `uiAutocompleteOption` template is rendered with. */
export interface UiAutocompleteOptionContext<T = unknown> {
  /** The option being rendered — `let-option`. */
  $implicit: UiAutocompleteOption<T>;

  /** The text currently in the field — `let-text="text"`, for highlighting the match. */
  text: string;
}

/** The context a `uiAutocompleteEmpty` template is rendered with. */
export interface UiAutocompleteEmptyContext {
  /** The text that matched nothing — `let-text`. */
  $implicit: string;
}

/**
 * The default {@link UiAutocompleteFilter}: case-insensitive, contains, over the
 * option's label — what "filters as you type" means to everyone who has not said
 * otherwise.
 */
function defaultFilter<T>(option: UiAutocompleteOption<T>, text: string): boolean {
  return option.label.toLowerCase().includes(text.trim().toLowerCase());
}

/**
 * Attributes that belong to `<ui-autocomplete>` itself and are therefore left alone
 * by {@link Autocomplete.forwardAttributes}.
 *
 * Two groups. The first is everything that describes the *wrapper*: `class` and
 * `style` are how a consumer targets it, `hidden` hides the whole field rather than
 * just the control inside it, and `role` re-declares what an element *is* — moving
 * that onto the real input would strip the `combobox` role Material's own trigger
 * puts there, which is the opposite of what anyone writing it wants.
 *
 * The second is this component's own inputs, spelled as HTML lowercases them.
 * Angular has already read these into signals, and each one that has a place on the
 * real input is put there by a binding in `autocomplete.html`. Leaving the
 * attributes on the host costs nothing and buys a consumer selectors that read well:
 * `ui-autocomplete[disabled]`, `ui-autocomplete[appearance='fill']`.
 */
const HOST_ATTRIBUTES: ReadonlySet<string> = new Set([
  'class',
  'style',
  'hidden',
  'role',
  'label',
  'options',
  'placeholder',
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
  'displaywith',
  'filterwith',
  'noresultstext',
  'panelclass',
  'panelwidth',
  'panelposition',
  'panelarialabel',
  'autoactivefirstoption',
  'autoselectactiveoption',
  'hidesingleselectionindicator',
]);

/**
 * Attributes taken off the host but *not* copied onto the input, because a binding
 * in `autocomplete.html` already puts them there.
 *
 * They cannot simply stay put like the rest of {@link HOST_ATTRIBUTES}:
 *
 *   - `id` would be a duplicate of the one on the real input — two elements with one
 *     id is invalid HTML, and it is the id `<mat-label for>` points at.
 *   - `aria-describedby` names the description of a *control*, and the control is
 *     the input. Material merges it with the ids of the hint and the error it
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
 * <ui-autocomplete label="Airport">
 *   <mat-icon uiAutocompletePrefix>search</mat-icon>
 * </ui-autocomplete>
 * ```
 *
 * Put it on the element itself — not on a wrapper around it: `ng-content select`
 * only matches the direct children of `<ui-autocomplete>`, so a marker nested any
 * deeper is never projected.
 *
 * The slot is Material's own `matIconPrefix`, so the element sits inside the field's
 * box with Material's spacing and the label floats over the text rather than over
 * the icon.
 */
@Directive({ selector: '[uiAutocompletePrefix]' })
export class AutocompletePrefix {}

/**
 * Marks an element for the field's trailing slot, after the text — a clear button, a
 * spinner while suggestions load.
 *
 * Mark the element itself, for the same reason as {@link AutocompletePrefix}.
 */
@Directive({ selector: '[uiAutocompleteSuffix]' })
export class AutocompleteSuffix {}

/**
 * Marks an element as the field's hint, replacing the `hint` string.
 *
 * For a hint a string cannot spell — one with a link in it, or a live count:
 *
 * ```html
 * <ui-autocomplete label="Airport">
 *   <span uiAutocompleteHint>Can’t find it? <a href="/docs/airports">See the list</a>.</span>
 * </ui-autocomplete>
 * ```
 *
 * Mark the element itself, for the same reason as {@link AutocompletePrefix}.
 * Material hides the hint line while an `error` is showing, projected or not, so the
 * two never stack.
 */
@Directive({ selector: '[uiAutocompleteHint]' })
export class AutocompleteHint {}

/**
 * Renders each suggestion in the panel, in place of its `label` (rule 7).
 *
 * The option is the template's implicit context and the text the user has typed is
 * alongside it, so an avatar, a two-line suggestion, or the matched substring in
 * bold is a template rather than a string input this component would have to grow:
 *
 * ```html
 * <ui-autocomplete label="Assignee" [options]="people()">
 *   <ng-template uiAutocompleteOption let-option let-text="text">
 *     <img [src]="option.value.avatar" alt="" /> {{ option.label }}
 *   </ng-template>
 * </ui-autocomplete>
 * ```
 *
 * It renders *inside* Material's own `<mat-option>`, so selection, keyboard
 * navigation and the ripple are untouched.
 */
@Directive({ selector: '[uiAutocompleteOption]' })
export class AutocompleteOptionDef<T = unknown> {
  /** The template itself, rendered by `autocomplete.html`. @docs-private */
  readonly template = inject<TemplateRef<UiAutocompleteOptionContext<T>>>(TemplateRef);

  /**
   * Types `let-option` and `let-text`, rather than as `any`. @docs-private
   *
   * The signature is Angular's, and the compiler is its only caller — the parameters
   * exist to be named in the type predicate and nowhere else, which is exactly what
   * `no-unused-vars` reports. There is no shape of this function that both keeps the
   * guard and satisfies the rule.
   */
  static ngTemplateContextGuard<T>(
    directive: AutocompleteOptionDef<T>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is UiAutocompleteOptionContext<T> {
    return true;
  }
}

/**
 * Renders the panel when the filter matches nothing, in place of the `noResultsText`
 * string (rule 7).
 *
 * The text that matched nothing is the template's implicit context, so the empty
 * state can name it — and can offer the way out, which is the point of one:
 *
 * ```html
 * <ui-autocomplete label="Airport" [options]="airports()">
 *   <ng-template uiAutocompleteEmpty let-text>
 *     No airport matches “{{ text }}”. <a href="/support">Ask us to add it</a>.
 *   </ng-template>
 * </ui-autocomplete>
 * ```
 *
 * Note Material hides a panel with no options in it at all, so with neither this nor
 * `noResultsText` set, a search that matches nothing simply closes the panel — which
 * is Material's own behaviour, and the default here.
 */
@Directive({ selector: '[uiAutocompleteEmpty]' })
export class AutocompleteEmptyDef {
  /** The template itself, rendered by `autocomplete.html`. @docs-private */
  readonly template = inject<TemplateRef<UiAutocompleteEmptyContext>>(TemplateRef);

  /**
   * Types `let-text`, rather than as `any`. @docs-private
   *
   * Disabled for the same reason as {@link AutocompleteOptionDef.ngTemplateContextGuard}.
   */
  static ngTemplateContextGuard(
    directive: AutocompleteEmptyDef,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is UiAutocompleteEmptyContext {
    return true;
  }
}

/**
 * A themed Material autocomplete: `<mat-form-field>` around an `<input matInput>`
 * with a `<mat-autocomplete>` panel, wired as a form control and filtered as the
 * user types.
 *
 * ```html
 * <ui-autocomplete label="Country" [options]="countries" [(ngModel)]="country" />
 *
 * <ui-autocomplete label="Airport" [options]="airports()" [formControl]="airport"
 *                  [error]="airport.touched && airport.invalid ? 'Pick an airport from the list.' : ''" />
 * ```
 *
 * Like `ui-input` and `ui-select`, and unlike `uiButton`, this is a component rather
 * than a directive: an autocomplete owns *composition* — a container, a floating
 * label, a text box, an overlay panel of suggestions, and a subscript that is either
 * a hint or an error. There is no single native element to decorate, and `<input
 * list>` is not one: a native datalist cannot be styled, cannot suggest an object,
 * and cannot render a suggestion as anything but text.
 *
 * ### It is Material, not a re-implementation
 *
 * The box, the outline, the floating label, the overlay and its elevation and
 * animation, the options and their ripples, the `combobox`/`listbox` roles, the
 * roving `aria-activedescendant`, the arrow keys, Enter, Escape and every colour are
 * `<mat-form-field>`'s, `<mat-autocomplete>`'s and `MatAutocompleteTrigger`'s own,
 * resolved from the `--mat-sys-*` tokens that `src/styles/_theme.scss` emits — so
 * there is not a literal colour in `autocomplete.scss`, and a palette change there
 * re-skins every autocomplete, in light and dark alike.
 *
 * What this adds is the filtering, which Material deliberately leaves to the
 * consumer — every one of its own examples ships a `startWith`/`map` pipeline over a
 * form control. Here, `options` in, filtered as the user types.
 *
 * ### Filtering
 *
 * The default is case-insensitive and matches anywhere in an option's `label`.
 * {@link filterWith} replaces it — a `startsWith`, a fuzzy match, a search over a
 * field the label does not show, or `() => true` for a list a server filters as the
 * user types.
 *
 * Once an option is chosen the panel shows the *whole* list again rather than the
 * one option whose label is now sitting in the box: reopening a field to change your
 * mind is not a search for what you already picked. Editing the text filters again
 * from that keystroke on.
 *
 * ### Forms and the value
 *
 * `ui-autocomplete` is a `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]`
 * and `formControlName` work with no adapter (rule 5) — bind the host, not the input
 * inside it. `[(value)]` is the same state without a forms directive.
 *
 * The value is Material's own model, and it is worth being plain about: **while the
 * user types, the value is the text they typed**; when they choose a suggestion it
 * becomes that option's `value` — an object, if that is what `options` holds. A box
 * someone can type anything into cannot report otherwise without throwing away what
 * they wrote.
 *
 * So a field that must end up holding an option's value wants a validator, which is
 * the consumer's own rule rather than something to configure here:
 *
 * ```ts
 * const fromList =
 *   (options: UiAutocompleteOption<string>[]): ValidatorFn =>
 *   (c) => options.some((o) => o.value === c.value) ? null : { notInList: true };
 * ```
 *
 * {@link displayWith} turns a value back into the field's text, and defaults to the
 * matching option's `label` — so a control holding `'fr'` shows `France` with no
 * configuration at all.
 *
 * ### Errors
 *
 * `error` is a string, and it shows when it is set — nothing else. It is a
 * `<mat-error>` under Material's own `ErrorStateMatcher`, so the field turns red,
 * `aria-invalid` flips, the hint gives way to the message and Material points the
 * input's `aria-describedby` at it.
 *
 * Deciding *when* that is deliberately stays with the consumer, because only they
 * know their validation — the common shape is a ternary over a control's own state,
 * as in the example above.
 *
 * ### Native attributes reach the real input
 *
 * Anything no input names — `aria-label`, `maxlength`, `inputmode`, `tabindex`,
 * `data-*` — is moved from `<ui-autocomplete>` onto the `<input>` inside it,
 * statically or bound (rule 3). `id`, `name`, `readonly`, `required` and
 * `aria-describedby` have inputs of their own instead, because Material's own host
 * bindings own those attributes on the input — an attribute copied onto it would be
 * overwritten on the next change detection.
 *
 * ### Styling hooks
 *
 * - `--ui-autocomplete-width` — width of the field inside the host. Defaults to
 *   `100%`, so `<ui-autocomplete>` is a block that sizes the field:
 *   `ui-autocomplete { width: 20rem; }` is the whole gesture, rather than a
 *   `::ng-deep`.
 *
 * The panel is in an overlay at the document root, outside this component's style
 * encapsulation — so it is styled through {@link panelClass}, which is Material's
 * own answer and needs no `::ng-deep` either.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiAutocomplete'` hands back the component, and {@link matFormField} /
 * {@link matInput} / {@link matAutocomplete} / {@link matAutocompleteTrigger} hand
 * back the Material instances underneath it — so
 * `field.matAutocompleteTrigger().openPanel()`, `.closePanel()`, `.activeOption` or
 * `.optionActivated` need no API here (rule 4).
 */
@Component({
  selector: 'ui-autocomplete',
  exportAs: 'uiAutocomplete',
  imports: [
    MatFormField,
    MatLabel,
    MatHint,
    MatError,
    MatPrefix,
    MatSuffix,
    MatInput,
    MatAutocomplete,
    MatAutocompleteTrigger,
    MatOption,
    NgTemplateOutlet,
  ],
  templateUrl: './autocomplete.html',
  styleUrl: './autocomplete.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    // The forms API resolves this off the element the directive sits on, so it is
    // what makes `<ui-autocomplete [(ngModel)]>` bind the host rather than leaving a
    // consumer to reach for the input inside it.
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Autocomplete), multi: true },
  ],
})
export class Autocomplete<T = unknown>
  implements ControlValueAccessor, ErrorStateMatcher, AfterViewInit, DoCheck
{
  /**
   * The field's label — the name of the thing being collected, e.g. `Country`.
   *
   * Rendered as Material's `<mat-label>`, which floats above the field once it has a
   * value or focus. It is the input's accessible name, and Material names the
   * suggestions panel with it too. Leave it unset only for a field named some other
   * way (`aria-label`, or a `<label for>` of your own pointed at {@link id}): an
   * unnamed combobox is an accessibility violation, not a design choice.
   */
  readonly label = input<string>();

  /**
   * The suggestions, in the order they are shown — before the filter.
   *
   * Rendered as Material's own `<mat-option>` elements, so the keyboard navigation
   * and the ripples are Material's. This is the *whole* list: the field filters it
   * as the user types (see {@link filterWith}). For suggestions a server returns as
   * the user types, keep this the list it last returned and turn the local filter
   * off with `[filterWith]="() => true"`.
   *
   * To render a suggestion as something other than its `label`, project an
   * {@link AutocompleteOptionDef} template — the list itself stays this input either
   * way.
   */
  readonly options = input<readonly UiAutocompleteOption<T>[]>([]);

  /**
   * Turns the control's value into the text shown in the field.
   *
   * Defaults to the `label` of the option whose `value` this is, falling back to the
   * value itself — which is what text the user typed is. So a control holding `'fr'`
   * shows `France`, and a half-typed `Fran` stays `Fran`, with no configuration.
   *
   * Set it when the value is one no option holds: an object patched in from a server
   * response, say, where the default's `===` lookup finds nothing.
   *
   * ```ts
   * protected readonly airportName = (value: Airport | string | null) =>
   *   typeof value === 'string' ? value : (value?.name ?? '');
   * ```
   *
   * It is handed to Material's own `<mat-autocomplete displayWith>`, so this is the
   * one function deciding the field's text, whichever side puts it there.
   */
  readonly displayWith = input<UiAutocompleteDisplayWith<T>>();

  /**
   * Whether an option survives the filter for the text the user has typed.
   *
   * Defaults to a case-insensitive "contains" over the option's `label`. Replace it
   * for a `startsWith`, a fuzzy match, a search over a field the label does not
   * show — or `() => true` for a list a server has already filtered.
   *
   * ```ts
   * protected readonly startsWith = (o: UiAutocompleteOption<string>, text: string) =>
   *   o.label.toLowerCase().startsWith(text.trim().toLowerCase());
   * ```
   */
  readonly filterWith = input<UiAutocompleteFilter<T>>(defaultFilter);

  /**
   * Whether the field is disabled.
   *
   * A reactive form's own `disable()` drives this too, through `setDisabledState`,
   * and either one is enough to disable the field — so a `FormControl({disabled:
   * true})` needs nothing here, and this input still works on a field with no form
   * at all.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * The error message. The field shows it, and goes red, exactly while this is set
   * to a non-blank string.
   *
   * *When* to set it is the consumer's call — see the class docs. The message is
   * what a screen reader announces for the field, so say what to do about it (`Pick
   * an airport from the list`) rather than what went wrong (`Invalid`).
   */
  readonly error = input<string>();

  /**
   * Short text shown inside the field while it is empty.
   *
   * A placeholder is not a label: it disappears the moment someone types, so it
   * cannot say what the field is. Use it for the *shape* of an answer — `Start
   * typing a city…` — over a `label` that says which answer it wants.
   */
  readonly placeholder = input<string>();

  /**
   * Help shown under the field — a rule, a consequence, a reassurance.
   *
   * Material hides it while an `error` is showing, so the two never stack. For a
   * hint a string cannot spell, project an {@link AutocompleteHint} element instead.
   */
  readonly hint = input<string>();

  /**
   * What the panel says when the filter matches nothing.
   *
   * Unset by default, which is Material's own behaviour: a panel with nothing in it
   * is hidden, so a search that matches nothing simply closes the panel. Set this
   * and the panel stays open to say so — as a disabled option, so it is announced
   * with the list but cannot be chosen.
   *
   * For an empty state a string cannot spell — one naming the text that missed, or
   * offering a way out — project an {@link AutocompleteEmptyDef} template instead.
   */
  readonly noResultsText = input<string>();

  /** Visual style of the container. Defaults to `outline`. */
  readonly appearance = input<UiAutocompleteAppearance>('outline');

  /**
   * The field's value, two-way and independent of the forms API.
   *
   * `[(value)]` is the no-forms shape (rule 5): a filter box, a search field —
   * anywhere `[(ngModel)]` would be a directive dragged in for one binding. It stays
   * in step when a form is bound, because both write the same signal.
   *
   * The typed text while the user types, the option's `value` once one is chosen —
   * see the class docs.
   */
  readonly value = model<T | string | null>(null);

  /**
   * Emits the option the user chose, whole — `value` and `label` both, so a consumer
   * that needs the text has it without a lookup of its own.
   *
   * It emits on choosing only. It does *not* emit for text the user types, which is
   * what `[(value)]`, `valueChange` and a bound form control report.
   */
  readonly optionSelected = output<UiAutocompleteOption<T>>();

  /**
   * Emits when the suggestions panel opens (`true`) and when it closes (`false`).
   *
   * Material's own `opened`/`closed`, forwarded as one event — for the lazy load
   * that should not run until someone actually looks at the list.
   */
  readonly openedChange = output<boolean>();

  /**
   * The real input's `id`, and therefore what `<mat-label for>` points at.
   *
   * Set it to point a `<label for>` or an `aria-*` reference of your own at the
   * control. Material generates one when this is unset, so the label association
   * works either way — this only makes it a *known* id.
   *
   * The attribute is moved off `<ui-autocomplete>` when it is written there, so the
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
   * Whether the value can be read but not edited.
   *
   * Not the same as `disabled`: a readonly field stays focusable, stays in the tab
   * order, is announced normally, and is submitted with the form.
   */
  readonly readonly = input(false, { transform: booleanAttribute });

  /**
   * Whether the field is required, which adds Material's asterisk to the label and
   * sets `aria-required` on the input.
   *
   * This is presentation and semantics, not validation: it says the field is
   * required, it does not enforce it. Angular's own `required` validator matches the
   * same attribute on `<ui-autocomplete [(ngModel)] required>`, so writing it once
   * gets both.
   */
  readonly required = input(false, { transform: booleanAttribute });

  /** Whether Material's required asterisk is hidden on a `required` field. */
  readonly hideRequiredMarker = input(false, { transform: booleanAttribute });

  /**
   * When the label floats above the field. Defaults to Material's `auto` — it floats
   * once the field has focus or a value.
   *
   * `always` keeps it up, which is what a field with a `placeholder` wants: the two
   * occupy the same space, so an `auto` label hides the placeholder it is meant to
   * explain.
   */
  readonly floatLabel = input<UiAutocompleteFloatLabel>('auto');

  /**
   * Whether the subscript line reserves its space when empty.
   *
   * Material's `fixed` default keeps a row of fields from jumping when one of them
   * shows an error. `dynamic` gives the space back, for a field standing on its own
   * where nothing below it would move.
   */
  readonly subscriptSizing = input<UiAutocompleteSubscriptSizing>('fixed');

  /**
   * Classes for the suggestions panel — Material's own `classList`, forwarded.
   *
   * The panel is rendered in an overlay at the document root, outside this
   * component's style encapsulation, so this is how it is styled: a class here and a
   * rule in a global stylesheet, rather than the `::ng-deep` that reaching into the
   * overlay would otherwise take (rule 2).
   */
  readonly panelClass = input<UiAutocompletePanelClass>('');

  /**
   * Width of the suggestions panel. Defaults to Material's own behaviour, which
   * matches the field.
   *
   * Any CSS width — for a field narrower than the suggestions it holds.
   */
  readonly panelWidth = input<string | number>('');

  /** Where the panel opens relative to the field. Defaults to Material's `auto`. */
  readonly panelPosition = input<UiAutocompletePanelPosition>('auto');

  /**
   * Whether the first suggestion is highlighted as the panel opens, so that Enter
   * takes it without an arrow key first.
   *
   * Material's default is `false`. Highlighting is not choosing: the value does not
   * change until the user takes it — unless {@link autoSelectActiveOption}.
   */
  readonly autoActiveFirstOption = input(false, { transform: booleanAttribute });

  /**
   * Whether arrowing onto a suggestion chooses it there and then, rather than only
   * highlighting it.
   *
   * Material's default is `false`. It makes the field's value follow the arrow keys,
   * which suits a preview of what the choice does — it also means the user cannot
   * pass over a suggestion without picking it up.
   */
  readonly autoSelectActiveOption = input(false, { transform: booleanAttribute });

  /** Whether Material's checkmark on the chosen suggestion is hidden. */
  readonly hideSingleSelectionIndicator = input(false, { transform: booleanAttribute });

  /**
   * The suggestions panel's accessible name, for a panel that should not be named by
   * the field's own label.
   *
   * Material names the panel with {@link label} by default, which is almost always
   * right — this is the escape hatch, and it names the *listbox*, not the text box.
   * For the text box, write `aria-label` on `<ui-autocomplete>`: it is forwarded onto
   * the real input like any other native attribute (rule 3).
   */
  readonly panelAriaLabel = input<string>();

  /**
   * The ids of elements describing the control, spelled as the ARIA attribute.
   *
   * An input rather than a forwarded attribute because Material owns this one on the
   * real input: it merges these ids with the hint's and the error's, so all of them
   * are announced. An attribute copied onto the input would be overwritten the
   * moment either of those changed.
   */
  readonly ariaDescribedby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-describedby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The `MatFormField` this component renders — the escape hatch for anything not
   * wrapped here. Reach it with `#field="uiAutocomplete"` and `field.matFormField()`.
   */
  readonly matFormField = viewChild.required(MatFormField);

  /**
   * The `MatInput` on the real `<input>` — the escape hatch for the text box itself,
   * e.g. `field.matInput().focus()`.
   */
  readonly matInput = viewChild.required(MatInput);

  /**
   * The `MatAutocomplete` panel — the escape hatch for the panel (rule 4), e.g.
   * `.isOpen`, `.options` or `.optionActivated`.
   */
  readonly matAutocomplete = viewChild.required(MatAutocomplete);

  /**
   * The `MatAutocompleteTrigger` on the real input — the escape hatch for the
   * interaction (rule 4), e.g. `field.matAutocompleteTrigger().openPanel()`,
   * `.closePanel()`, `.panelOpen` or `.activeOption`.
   */
  readonly matAutocompleteTrigger = viewChild.required(MatAutocompleteTrigger);

  /** The real `<input>` element, for anything neither Material nor this wraps. */
  readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('input');

  /** Whether an `error` is set, and therefore whether the field is in an error state. */
  readonly hasError = computed(() => !!this.error()?.trim());

  /**
   * The text currently in the field — what the filter reads, and what a
   * `uiAutocompleteOption` template is handed to highlight a match with.
   */
  readonly text = computed(() => this.currentText());

  /**
   * The suggestions that survive the filter for {@link text} — what the panel shows,
   * in `options` order.
   *
   * The whole list once a value has just been written or chosen: the text in the box
   * is then the field's own answer rather than a query, and filtering a list down to
   * the thing you already picked is no help to someone reopening it to change their
   * mind.
   */
  readonly filteredOptions = computed<readonly UiAutocompleteOption<T>[]>(() => {
    const text = this.currentText();
    const options = this.options();
    if (text === this.textFromValue()) {
      return options;
    }
    const filter = this.filterWith();
    return options.filter((option) => filter(option, text));
  });

  /** Whether the filter matched nothing — the panel's empty state, if there is one. */
  readonly hasNoResults = computed(() => this.filteredOptions().length === 0);

  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  /** The text in the field. Written by the user's typing, and by the effect below. */
  private readonly currentText = signal('');

  /**
   * The text the field's *value* renders as — the last text put in the box by
   * anything other than the user's own typing.
   *
   * {@link filteredOptions} compares the two to tell a query from a value: equal
   * means nothing has been typed since the value was set, so there is no query and
   * nothing to filter by.
   */
  private readonly textFromValue = signal('');

  /**
   * Whether the value in hand is text the user typed, rather than one written by a
   * form, a `[(value)]` binding, or a chosen option.
   *
   * This is what stops the effect below from rewriting the box under the user's
   * cursor: `fr` is a value like any other, and it must not turn into `France`
   * because an option happens to hold it — the user is mid-word.
   */
  private valueIsTyped = false;

  /** Whether a reactive form has disabled this control — see `setDisabledState`. */
  private readonly disabledByForm = signal(false);

  /**
   * Whether the control is disabled by either route.
   *
   * The two are independent on purpose: a form disabling a control must not silently
   * un-set a `disabled` a template wrote, and vice versa.
   */
  protected readonly isDisabled = computed(() => this.disabled() || this.disabledByForm());

  protected readonly prefixSlot = contentChild(AutocompletePrefix, { descendants: false });
  protected readonly suffixSlot = contentChild(AutocompleteSuffix, { descendants: false });
  protected readonly hintSlot = contentChild(AutocompleteHint, { descendants: false });
  protected readonly optionDef = contentChild(AutocompleteOptionDef<T>, { descendants: false });
  protected readonly emptyDef = contentChild(AutocompleteEmptyDef, { descendants: false });

  /** Whether there is an empty state to show when the filter matches nothing. */
  protected readonly hasEmptyState = computed(() => !!this.emptyDef() || !!this.noResultsText());

  /** The context handed to a projected `uiAutocompleteEmpty` template. */
  protected readonly emptyContext = computed<UiAutocompleteEmptyContext>(() => ({
    $implicit: this.currentText(),
  }));

  /**
   * Handed to Material's `<mat-autocomplete displayWith>`, so that the text Material
   * puts in the box when an option is chosen is the same text this component would —
   * one function, whichever side calls it.
   *
   * A stable property rather than a `computed`: `MatAutocomplete.displayWith` is a
   * plain input, and a new function on every read would be a new value on every
   * check. The signals it reads are read when Material calls it.
   */
  protected readonly displayFn: UiAutocompleteDisplayWith<T> = (value) => this.display(value);

  /**
   * Handed to `MatInput` as its `errorStateMatcher`, so that the error state is
   * Material's own mechanism rather than a class this component paints on.
   *
   * A property rather than `[errorStateMatcher]="this"`, which the template
   * expression parser has no receiver for.
   */
  protected readonly errorStateMatcher: ErrorStateMatcher = this;

  private onChange: (value: T | string | null) => void = () => {
    // Replaced by `registerOnChange` when a forms directive binds this control.
    // Until then there is nobody to report a change to — a field with `[(value)]`
    // and no form is a supported shape, not a mistake.
  };

  private onTouched: () => void = () => {
    // Replaced by `registerOnTouched`, for the same reason as `onChange`.
  };

  /** Whether the view — and therefore {@link matInput} — has been created. */
  private viewReady = false;

  constructor() {
    // Renders the value into the box — for a form's `writeValue`, a `[(value)]` a
    // consumer wrote, a chosen option, and a late-arriving `options` list that turns
    // a value the field could until now only show as `fr` into `France`.
    //
    // Everything but the user's own typing, that is. `display()` is called before
    // the check so that `options` and `displayWith` are tracked whichever way this
    // run goes, but a typed value is left exactly as it was typed — see
    // {@link valueIsTyped}.
    effect(() => {
      const text = this.display(this.value());
      if (this.valueIsTyped) {
        return;
      }
      this.currentText.set(text);
      this.textFromValue.set(text);
    });
  }

  /**
   * Re-checks Material's error state on every change detection pass.
   *
   * `MatInput` does this itself in its own `ngDoCheck`, but only for an input that
   * has an `NgControl` of its own (see `@angular/material/input`). Here the
   * `NgControl` is on `<ui-autocomplete>` — that is what makes `[(ngModel)]` bind the
   * host rather than the input — so `MatInput` never sees one and the re-check has to
   * be driven from this side.
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

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.forwardAttributes();

    // Static attributes are on the host before this runs, but a bound one
    // (`[attr.aria-label]="…"`) lands there again every time it changes, and a
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

  /**
   * Whether the field is in an error state, as Material's `ErrorStateMatcher`.
   *
   * The control and form are ignored — `error` being set *is* the error state, so
   * that a consumer's own rule for when to show a message is the only rule, and the
   * message and the red box can never disagree about whether there is one.
   */
  isErrorState(): boolean {
    return this.hasError();
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  writeValue(value: unknown): void {
    // A form's empty value is `null`, and the field's is too — unlike `ui-input`,
    // whose value is a string because the DOM's is. Here a value is an *option's*
    // until the user types over it, so it keeps the shape the consumer gave it.
    this.valueIsTyped = false;
    this.value.set((value ?? null) as T | string | null);
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  registerOnChange(fn: (value: T | string | null) => void): void {
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
   * The text a value shows as: `displayWith` when a consumer set one, and otherwise
   * the label of the option holding this value — falling back to the value itself,
   * which is what text the user typed is.
   */
  private display(value: T | string | null): string {
    const displayWith = this.displayWith();
    if (displayWith) {
      return displayWith(value) ?? '';
    }
    const option = this.options().find((o) => o.value === value);
    if (option) {
      return option.label;
    }
    return value == null ? '' : String(value);
  }

  protected handleInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;

    // The typed text *is* the value — Material's own model for a box someone can
    // type anything into. See the class docs.
    this.valueIsTyped = true;
    this.currentText.set(text);
    this.value.set(text);
    this.onChange(text);
  }

  protected handleOptionSelected(event: MatAutocompleteSelectedEvent): void {
    const value = event.option.value as T;

    // The panel only renders options this component was given, so the chosen one is
    // in there — but a `find` that came back empty must not become an emit of
    // `undefined` typed as an option.
    const option = this.options().find((o) => o.value === value);
    if (!option) {
      return;
    }

    // Not typed: the effect renders the option's own text into the box, which is the
    // same text `displayFn` has just had Material put there.
    this.valueIsTyped = false;
    this.value.set(value);
    this.onChange(value);
    this.optionSelected.emit(option);
  }

  protected handleOpened(): void {
    this.openedChange.emit(true);
  }

  protected handleClosed(): void {
    this.openedChange.emit(false);
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
   * Moves every attribute that is not this component's own from `<ui-autocomplete>`
   * onto the real `<input>`, so that a consumer's `aria-label`, `maxlength`,
   * `tabindex` or `data-*` reaches the element it is about (rule 3).
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
