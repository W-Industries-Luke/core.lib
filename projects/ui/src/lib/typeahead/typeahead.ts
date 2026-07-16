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
  numberAttribute,
  output,
  signal,
  TemplateRef,
  viewChild,
  type AfterViewInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { from, of, Subject, timer, type Observable } from 'rxjs';
import { catchError, debounce, distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';

import { EmptyState } from '../empty-state/empty-state';
import { Spinner } from '../spinner/spinner';
import type { UiAutocompleteOption } from '../autocomplete/autocomplete';

/**
 * One result of a {@link Typeahead} search.
 *
 * Shared with `ui-autocomplete` (issue #16), because a suggestion is a suggestion
 * whether the list came from memory or a server: `value` is what the control holds
 * once it is chosen — an object, if that is what the API returns — and `label` is the
 * text shown for it and put in the box on selection. The difference between the two
 * components is *where the list comes from*, not what an item in it is, so re-declaring
 * this shape here would be two names for one thing.
 */
export type UiTypeaheadResult<T = unknown> = UiAutocompleteOption<T>;

/**
 * The remote search this component runs as the user types.
 *
 * It is handed the trimmed query — never blank, never shorter than {@link
 * Typeahead.minChars} — and returns the results, as either an `Observable` or a
 * `Promise`. This is the whole reason `ui-typeahead` exists rather than
 * `ui-autocomplete`: the list is fetched, not filtered in memory.
 *
 * An `Observable` is the better shape where the source can be cancelled — an
 * `HttpClient.get()` is one — because a search superseded by a newer keystroke is
 * *unsubscribed*, which aborts the request rather than merely ignoring its answer. A
 * `Promise` cannot be aborted, so its result is dropped instead; either way a stale
 * response never overwrites a newer one (see the class docs).
 *
 * Throwing — or an erroring `Observable`, or a rejected `Promise` — puts the field
 * into its error state. It is caught here, so one failed search does not tear down the
 * pipeline: the next keystroke tries again.
 *
 * @param query The text to search for — trimmed, and at least `minChars` long.
 */
export type UiTypeaheadSearch<T = unknown> = (
  query: string,
) => Observable<readonly UiTypeaheadResult<T>[]> | Promise<readonly UiTypeaheadResult<T>[]>;

/**
 * Turns the control's value into the text shown in the field. The value can be free
 * text the user typed rather than a result's, so this has to cope with a string it
 * never suggested.
 */
export type UiTypeaheadDisplayWith<T = unknown> = (value: T | string | null) => string;

/**
 * Visual style of the field's container. Aliased from Material's own
 * `MatFormFieldAppearance`, so a change to the union upstream is a compile error here
 * rather than an appearance this component forwards and `MatFormField` throws on.
 */
export type UiTypeaheadAppearance = MatFormFieldAppearance;

/** When the floating label sits above the field. Aliased from Material's `FloatLabelType`. */
export type UiTypeaheadFloatLabel = FloatLabelType;

/** Whether the subscript line reserves its space. Aliased from Material's `SubscriptSizing`. */
export type UiTypeaheadSubscriptSizing = SubscriptSizing;

/** Where the panel opens relative to the field. Aliased from `MatAutocompleteTrigger.position`. */
export type UiTypeaheadPanelPosition = 'auto' | 'above' | 'below';

/** Classes for the suggestions panel. Aliased from `MatAutocomplete.classList`. */
export type UiTypeaheadPanelClass = string | string[];

/** The context a `uiTypeaheadOption` template is rendered with. */
export interface UiTypeaheadOptionContext<T = unknown> {
  /** The result being rendered — `let-result`. */
  $implicit: UiTypeaheadResult<T>;

  /** The query the search was run for — `let-query="query"`, for highlighting the match. */
  query: string;
}

/** The context a `uiTypeaheadEmpty` template is rendered with. */
export interface UiTypeaheadEmptyContext {
  /** The query that matched nothing — `let-query`. */
  $implicit: string;
}

/** The context a `uiTypeaheadError` template is rendered with. */
export interface UiTypeaheadErrorContext {
  /** The error the search threw or emitted — `let-error`. */
  $implicit: unknown;

  /** The query the failed search was run for — `let-query="query"`. */
  query: string;
}

/**
 * Where the search is between keystrokes: nothing yet, waiting on a response, a list,
 * or a failure. Held as one signal so the template renders exactly one of them and the
 * four can never contradict each other — a spinner over stale results, say.
 */
type SearchState<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: unknown }
  | { readonly status: 'results'; readonly results: readonly UiTypeaheadResult<T>[] };

/** The default {@link Typeahead.minChars}: two, the point at which a search is worth running. */
const DEFAULT_MIN_CHARS = 2;

/** The default {@link Typeahead.debounceMs}: 300ms, long enough to skip mid-word keystrokes. */
const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Attributes that belong to `<ui-typeahead>` itself and are therefore left alone by
 * {@link Typeahead.forwardAttributes}. The wrapper's own describers, plus this
 * component's inputs spelled as HTML lowercases them. Mirrors `ui-autocomplete`.
 */
const HOST_ATTRIBUTES: ReadonlySet<string> = new Set([
  'class',
  'style',
  'hidden',
  'role',
  'label',
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
  'search',
  'displaywith',
  'minchars',
  'debouncems',
  'loadingtext',
  'noresultstext',
  'errortext',
  'panelclass',
  'panelwidth',
  'panelposition',
  'panelarialabel',
  'autoactivefirstoption',
]);

/**
 * Attributes taken off the host but *not* copied onto the input, because a binding in
 * `typeahead.html` already puts them there. `id` would duplicate the input's own; and
 * `aria-describedby` has to arrive through Material's input so it is merged with the
 * hint/error rather than overwritten. Mirrors `ui-autocomplete`.
 */
const BOUND_ATTRIBUTES: ReadonlySet<string> = new Set(['id', 'aria-describedby']);

/** Whether an attribute on the host is one this component put there itself. */
function isAngularInternal(name: string): boolean {
  return name.startsWith('_ng') || name.startsWith('ng-');
}

/**
 * Marks an element for the field's leading slot, before the text — a search icon, most
 * often.
 *
 * Put it on the element itself — not a wrapper: `ng-content select` only matches the
 * direct children of `<ui-typeahead>`. The slot is Material's own `matIconPrefix`.
 */
@Directive({ selector: '[uiTypeaheadPrefix]' })
export class TypeaheadPrefix {}

/**
 * Marks an element for the field's trailing slot, after the text — a clear button.
 * Mark the element itself, for the same reason as {@link TypeaheadPrefix}.
 */
@Directive({ selector: '[uiTypeaheadSuffix]' })
export class TypeaheadSuffix {}

/**
 * Marks an element as the field's hint, replacing the `hint` string — for a hint a
 * string cannot spell. Mark the element itself, for the same reason as {@link
 * TypeaheadPrefix}.
 */
@Directive({ selector: '[uiTypeaheadHint]' })
export class TypeaheadHint {}

/**
 * Renders each result in the panel, in place of its `label` (rule 7).
 *
 * The result is the template's implicit context and the query is alongside it, so an
 * avatar, a two-line result or the matched substring in bold is a template:
 *
 * ```html
 * <ui-typeahead label="User" [search]="searchUsers">
 *   <ng-template uiTypeaheadOption let-user let-query="query">
 *     <img [src]="user.value.avatar" alt="" /> {{ user.label }}
 *   </ng-template>
 * </ui-typeahead>
 * ```
 *
 * It renders *inside* Material's own `<mat-option>`, so selection and the keyboard are
 * untouched.
 */
@Directive({ selector: '[uiTypeaheadOption]' })
export class TypeaheadOptionDef<T = unknown> {
  /** The template itself, rendered by `typeahead.html`. @docs-private */
  readonly template = inject<TemplateRef<UiTypeaheadOptionContext<T>>>(TemplateRef);

  /** Types `let-result` and `let-query`, rather than as `any`. @docs-private */
  static ngTemplateContextGuard<T>(
    directive: TypeaheadOptionDef<T>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is UiTypeaheadOptionContext<T> {
    return true;
  }
}

/**
 * Renders the panel when a search comes back empty, in place of the default
 * `<ui-empty-state>` and the `noResultsText` string (rule 7). Handed the query that
 * matched nothing, so the empty state can name it and offer the way out.
 */
@Directive({ selector: '[uiTypeaheadEmpty]' })
export class TypeaheadEmptyDef {
  /** The template itself, rendered by `typeahead.html`. @docs-private */
  readonly template = inject<TemplateRef<UiTypeaheadEmptyContext>>(TemplateRef);

  /** Types `let-query`, rather than as `any`. @docs-private */
  static ngTemplateContextGuard(
    directive: TypeaheadEmptyDef,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is UiTypeaheadEmptyContext {
    return true;
  }
}

/**
 * Renders the panel when a search fails, in place of the default `<ui-empty-state>` and
 * the `errorText` string (rule 7). Handed the error and the query, so a "retry" button
 * or a message derived from the failure is a template rather than an input.
 */
@Directive({ selector: '[uiTypeaheadError]' })
export class TypeaheadErrorDef {
  /** The template itself, rendered by `typeahead.html`. @docs-private */
  readonly template = inject<TemplateRef<UiTypeaheadErrorContext>>(TemplateRef);

  /** Types `let-error` and `let-query`, rather than as `any`. @docs-private */
  static ngTemplateContextGuard(
    directive: TypeaheadErrorDef,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is UiTypeaheadErrorContext {
    return true;
  }
}

/**
 * Renders the panel while a search is in flight, in place of the default
 * `<ui-spinner>` (rule 7). For a skeleton row, or a spinner with a message of its own.
 */
@Directive({ selector: '[uiTypeaheadLoading]' })
export class TypeaheadLoadingDef {
  /** The template itself, rendered by `typeahead.html`. @docs-private */
  readonly template = inject<TemplateRef<unknown>>(TemplateRef);
}

/**
 * A themed Material autocomplete wired to a **remote** search: type, and after a beat
 * this hits an API and shows what comes back, with a spinner while it waits, an empty
 * state when nothing matches, and an error state when the search fails.
 *
 * ```html
 * <ui-typeahead label="User" [search]="searchUsers" [(ngModel)]="user" />
 * ```
 *
 * ```ts
 * protected readonly searchUsers = (query: string) =>
 *   this.http.get<User[]>('/api/users', { params: { q: query } }).pipe(
 *     map((users) => users.map((u) => ({ value: u, label: u.name }))),
 *   );
 * ```
 *
 * ### It is `ui-autocomplete`'s remote sibling, not a re-implementation of either
 *
 * The box, the outline, the floating label, the overlay, the options and their
 * ripples, the `combobox`/`listbox` roles, the keyboard and every colour are
 * `<mat-form-field>`'s, `<mat-autocomplete>`'s and `MatAutocompleteTrigger`'s own,
 * resolved from the `--mat-sys-*` tokens `src/styles/_theme.scss` emits — so there is
 * not a literal colour in `typeahead.scss`. It shares `ui-autocomplete`'s result shape
 * ({@link UiTypeaheadResult} *is* `UiAutocompleteOption`) and its Material composition.
 *
 * The one difference is the whole point: `ui-autocomplete` filters a list it already
 * holds; `ui-typeahead` fetches the list as you type. So where that component takes an
 * `options` array, this takes a {@link search} function — and owns the async plumbing
 * that comes with it.
 *
 * ### The async pipeline
 *
 * Every keystroke runs the same course, and each stage is why the field feels right:
 *
 *  - **debounce** ({@link debounceMs}, 300ms) — a search per *pause*, not per key, so a
 *    fast typist fires one request rather than eight.
 *  - **minimum length** ({@link minChars}, 2) — no request for `a`, which would match
 *    half the world; the panel stays closed until the query is worth running.
 *  - **switchMap** — a keystroke that arrives while a search is still out **cancels**
 *    it. This is the load-bearing guarantee: results for `reac` can never land after,
 *    and overwrite, results for `react`, however the two requests race on the wire. An
 *    `Observable` search is unsubscribed (aborting an `HttpClient` request); a
 *    `Promise` search has its result dropped. Either way the field shows the latest
 *    query's answer, only.
 *  - **catch** — a failed search is caught, so the pipeline survives it and the next
 *    keystroke tries again, rather than the field going dead on one dropped request.
 *
 * ### The four states
 *
 * The panel shows exactly one thing at a time, and each is Material's own `<mat-option>`
 * machinery so the panel opens, elevates and is announced the same way it always is:
 *
 *  - **loading** — a `<ui-spinner>` (or a `uiTypeaheadLoading` template).
 *  - **results** — the list, as `<mat-option>`s (or a `uiTypeaheadOption` template each).
 *  - **empty** — a `<ui-empty-state>` (or `noResultsText`, or a `uiTypeaheadEmpty` template).
 *  - **error** — a `<ui-empty-state>` (or `errorText`, or a `uiTypeaheadError` template).
 *
 * `loading()` and `searchError()` are exposed as signals too, for a consumer who wants
 * to reflect the state outside the panel.
 *
 * ### Forms and the value
 *
 * `ui-typeahead` is a `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]` and
 * `formControlName` work with no adapter (rule 5) — bind the host, not the input. As in
 * `ui-autocomplete`, **while the user types the value is the text they typed**; when
 * they choose a result it becomes that result's `value` — an object, if that is what
 * {@link search} returns. {@link displayWith} turns a value back into the field's text.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiTypeahead'` hands back the component, and {@link matFormField} /
 * {@link matInput} / {@link matAutocomplete} / {@link matAutocompleteTrigger} hand back
 * the Material instances underneath it (rule 4).
 */
@Component({
  selector: 'ui-typeahead',
  exportAs: 'uiTypeahead',
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
    Spinner,
    EmptyState,
  ],
  templateUrl: './typeahead.html',
  styleUrl: './typeahead.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Typeahead), multi: true },
  ],
})
export class Typeahead<T = unknown>
  implements ControlValueAccessor, ErrorStateMatcher, AfterViewInit
{
  /**
   * The field's label — the name of the thing being searched for, e.g. `User`.
   * Rendered as Material's `<mat-label>`, and the control's accessible name.
   */
  readonly label = input<string>();

  /**
   * The remote search, run as the user types — the reason this component exists.
   *
   * Handed the trimmed query (at least {@link minChars} long) and returns the results
   * as an `Observable` or a `Promise`. See {@link UiTypeaheadSearch} for the semantics
   * of cancellation and errors.
   */
  readonly search = input<UiTypeaheadSearch<T>>();

  /**
   * How many characters must be typed before a search runs. Defaults to 2.
   *
   * A single character matches too much to be worth a request; the panel stays closed
   * until the query reaches this length, and reopens if it drops back under.
   */
  readonly minChars = input(DEFAULT_MIN_CHARS, { transform: numberAttribute });

  /**
   * How long typing must pause before a search runs, in milliseconds. Defaults to 300.
   *
   * This is what turns a burst of keystrokes into one request. Raise it for a slow or
   * costly API, lower it for a snappy local one; `0` searches on every settled keystroke.
   */
  readonly debounceMs = input(DEFAULT_DEBOUNCE_MS, { transform: numberAttribute });

  /**
   * Turns the control's value into the text shown in the field.
   *
   * Defaults to the `label` of the last chosen result when the value is still it, and
   * otherwise the value itself — which is what typed text is. Set it when the value is
   * an object no default `===` would match — a form patched from a server response.
   *
   * ```ts
   * protected readonly userName = (value: User | string | null) =>
   *   typeof value === 'string' ? value : (value?.name ?? '');
   * ```
   */
  readonly displayWith = input<UiTypeaheadDisplayWith<T>>();

  /**
   * Whether the field is disabled. A reactive form's own `disable()` drives this too,
   * through `setDisabledState`, and either route is enough.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * The error message. The field shows it, and goes red, exactly while this is a
   * non-blank string. This is the *form validation* error — distinct from a failed
   * *search*, which the panel reports with its own error state. See the class docs.
   */
  readonly error = input<string>();

  /** Short text shown inside the field while it is empty — the shape of a query. */
  readonly placeholder = input<string>();

  /** Help shown under the field. Material hides it while an `error` is showing. */
  readonly hint = input<string>();

  /**
   * The message the default empty state shows when a search matches nothing. Defaults
   * to `No results found`. Project a {@link TypeaheadEmptyDef} for anything richer.
   */
  readonly noResultsText = input('No results found');

  /**
   * The message the default error state shows when a search fails. Defaults to
   * `Something went wrong. Try again.`. Project a {@link TypeaheadErrorDef} for a retry.
   */
  readonly errorText = input('Something went wrong. Try again.');

  /**
   * The accessible name the default spinner announces while a search is in flight.
   * Defaults to `Searching`. Not shown — a spinner is a graphic.
   */
  readonly loadingText = input('Searching');

  /** Visual style of the container. Defaults to `outline`. */
  readonly appearance = input<UiTypeaheadAppearance>('outline');

  /**
   * The field's value, two-way and independent of the forms API (rule 5). The typed
   * text while the user types, the result's `value` once one is chosen.
   */
  readonly value = model<T | string | null>(null);

  /**
   * Emits the result the user chose, whole — `value` and `label` both. Emits on
   * choosing only, not for text the user types.
   */
  readonly selected = output<UiTypeaheadResult<T>>();

  /** Emits when the suggestions panel opens (`true`) and closes (`false`). */
  readonly openedChange = output<boolean>();

  /** The real input's `id`, and therefore what `<mat-label for>` points at. */
  readonly id = input<string>();

  /** The real input's `name`, for native form submission. */
  readonly name = input<string>();

  /** Whether the value can be read but not edited. Stays focusable, unlike `disabled`. */
  readonly readonly = input(false, { transform: booleanAttribute });

  /** Whether the field is required — Material's asterisk, plus `aria-required`. */
  readonly required = input(false, { transform: booleanAttribute });

  /** Whether Material's required asterisk is hidden on a `required` field. */
  readonly hideRequiredMarker = input(false, { transform: booleanAttribute });

  /** When the label floats above the field. Defaults to Material's `auto`. */
  readonly floatLabel = input<UiTypeaheadFloatLabel>('auto');

  /** Whether the subscript line reserves its space when empty. Defaults to `fixed`. */
  readonly subscriptSizing = input<UiTypeaheadSubscriptSizing>('fixed');

  /** Classes for the suggestions panel — Material's own `classList`, forwarded (rule 2). */
  readonly panelClass = input<UiTypeaheadPanelClass>('');

  /** Width of the suggestions panel. Defaults to Material's own, which matches the field. */
  readonly panelWidth = input<string | number>('');

  /** Where the panel opens relative to the field. Defaults to Material's `auto`. */
  readonly panelPosition = input<UiTypeaheadPanelPosition>('auto');

  /**
   * Whether the first result is highlighted as it arrives, so Enter takes it without an
   * arrow key first. Material's default is `false`.
   */
  readonly autoActiveFirstOption = input(false, { transform: booleanAttribute });

  /** The suggestions panel's accessible name, for a panel not named by the field's label. */
  readonly panelAriaLabel = input<string>();

  /**
   * The ids of elements describing the control, spelled as the ARIA attribute. An input
   * rather than a forwarded attribute because Material owns this one on the real input.
   */
  readonly ariaDescribedby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-describedby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /** The `MatFormField` this component renders — the escape hatch (rule 4). */
  readonly matFormField = viewChild.required(MatFormField);

  /** The `MatInput` on the real `<input>` — the escape hatch for the text box. */
  readonly matInput = viewChild.required(MatInput);

  /** The `MatAutocomplete` panel — the escape hatch for the panel (rule 4). */
  readonly matAutocomplete = viewChild.required(MatAutocomplete);

  /** The `MatAutocompleteTrigger` on the real input — the escape hatch for the interaction. */
  readonly matAutocompleteTrigger = viewChild.required(MatAutocompleteTrigger);

  /** The real `<input>` element, for anything neither Material nor this wraps. */
  readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('input');

  /** Whether a form-validation `error` is set — the field's error state (rule: `ErrorStateMatcher`). */
  readonly hasError = computed(() => !!this.error()?.trim());

  /** The text currently in the field — what the box shows. */
  readonly text = computed(() => this.currentText());

  /** The query the search pipeline is currently reporting on — what a template highlights. */
  readonly query = computed(() => this.currentQuery());

  /** Whether a search is in flight — exposed so a consumer can reflect it outside the panel. */
  readonly loading = computed(() => this.searchState().status === 'loading');

  /** The error of the last failed search, or `null` — exposed for the same reason as {@link loading}. */
  readonly searchError = computed(() => {
    const state = this.searchState();
    return state.status === 'error' ? state.error : null;
  });

  /** The results of the last completed search, in the order the server returned them. */
  readonly results = computed<readonly UiTypeaheadResult<T>[]>(() => {
    const state = this.searchState();
    return state.status === 'results' ? state.results : [];
  });

  /** Whether the last search returned an empty list — the panel's empty state. */
  readonly hasNoResults = computed(() => {
    const state = this.searchState();
    return state.status === 'results' && state.results.length === 0;
  });

  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  /** The text in the field. Written by the user's typing, and by the value effect below. */
  private readonly currentText = signal('');

  /** The query the last search ran for — what a `uiTypeaheadOption` template highlights. */
  private readonly currentQuery = signal('');

  /** Feeds the async pipeline. `handleInput` pushes each keystroke's text here. */
  private readonly queries = new Subject<string>();

  /** The one thing the panel shows: idle, loading, a list, or a failure. */
  private readonly searchState = signal<SearchState<T>>({ status: 'idle' });

  /**
   * Whether the value in hand is text the user typed, rather than one written by a
   * form, a `[(value)]` binding, or a chosen result — so the value effect does not
   * rewrite the box under the user's cursor. Mirrors `ui-autocomplete`.
   */
  private valueIsTyped = false;

  /** The last result chosen, kept so `display` can name an object value the results no longer hold. */
  private lastSelected: UiTypeaheadResult<T> | null = null;

  /** Whether a reactive form has disabled this control — see `setDisabledState`. */
  private readonly disabledByForm = signal(false);

  /** Whether the control is disabled by either route. The two are independent on purpose. */
  protected readonly isDisabled = computed(() => this.disabled() || this.disabledByForm());

  protected readonly prefixSlot = contentChild(TypeaheadPrefix, { descendants: false });
  protected readonly suffixSlot = contentChild(TypeaheadSuffix, { descendants: false });
  protected readonly hintSlot = contentChild(TypeaheadHint, { descendants: false });
  protected readonly optionDef = contentChild(TypeaheadOptionDef<T>, { descendants: false });
  protected readonly emptyDef = contentChild(TypeaheadEmptyDef, { descendants: false });
  protected readonly errorDef = contentChild(TypeaheadErrorDef, { descendants: false });
  protected readonly loadingDef = contentChild(TypeaheadLoadingDef, { descendants: false });

  /** The status the template switches on — the discriminant of {@link searchState}. */
  protected readonly status = computed(() => this.searchState().status);

  /** The context handed to a projected `uiTypeaheadEmpty` template. */
  protected readonly emptyContext = computed<UiTypeaheadEmptyContext>(() => ({
    $implicit: this.currentQuery(),
  }));

  /** The context handed to a projected `uiTypeaheadError` template. */
  protected readonly errorContext = computed<UiTypeaheadErrorContext>(() => ({
    $implicit: this.searchError(),
    query: this.currentQuery(),
  }));

  /**
   * Handed to Material's `<mat-autocomplete displayWith>`, so the text Material puts in
   * the box when a result is chosen is the same text this component would. A stable
   * property, not a `computed`, because it is a plain Material input.
   */
  protected readonly displayFn: UiTypeaheadDisplayWith<T> = (value) => this.display(value);

  /** Handed to `MatInput` as its `errorStateMatcher`, so error state is Material's own mechanism. */
  protected readonly errorStateMatcher: ErrorStateMatcher = this;

  private onChange: (value: T | string | null) => void = () => {
    // Replaced by `registerOnChange` when a forms directive binds this control.
  };

  private onTouched: () => void = () => {
    // Replaced by `registerOnTouched`, for the same reason as `onChange`.
  };

  constructor() {
    // The async heart of the component. Every keystroke debounces, drops if it is too
    // short, and then `switchMap`s into the search — which is what cancels a search
    // still in flight when the next keystroke arrives, so a stale response can never
    // overwrite a newer one. `startWith('loading')` paints the spinner the instant the
    // request goes out; `catchError` keeps one failure from tearing down the stream.
    this.queries
      .pipe(
        debounce(() => timer(this.debounceMs())),
        map((text) => text.trim()),
        distinctUntilChanged(),
        switchMap((text): Observable<SearchState<T>> => {
          const search = this.search();
          if (text.length < this.minChars() || !search) {
            return of<SearchState<T>>({ status: 'idle' });
          }
          return from(search(text)).pipe(
            map((results): SearchState<T> => ({ status: 'results', results })),
            catchError((error): Observable<SearchState<T>> => of({ status: 'error', error })),
            startWith<SearchState<T>>({ status: 'loading' }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.searchState.set(state));

    // `MatInput` re-checks its error state in `ngDoCheck`, but only for an input with
    // its own `NgControl`. Here the `NgControl` is on `<ui-typeahead>`, so the re-check
    // is driven from this side. See `ui-autocomplete` for the full note.
    effect(() => {
      this.error();
      this.matInput().updateErrorState();
    });

    // Renders the value into the box — for a form's `writeValue`, a `[(value)]`, or a
    // chosen result — but leaves the user's own typing exactly as typed.
    effect(() => {
      const text = this.display(this.value());
      if (this.valueIsTyped) {
        return;
      }
      this.currentText.set(text);
    });
  }

  ngAfterViewInit(): void {
    this.forwardAttributes();

    // A bound attribute lands on the host again every time it changes, so the host is
    // observed to keep rule 3 true for the dynamic case. This terminates: the callback
    // only ever removes attributes, and a run with nothing to move mutates nothing.
    if (typeof MutationObserver === 'undefined') {
      return;
    }
    const observer = new MutationObserver(() => this.forwardAttributes());
    observer.observe(this.hostElement, { attributes: true });
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  /**
   * Whether the field is in an error state, as Material's `ErrorStateMatcher`. The
   * control and form are ignored — `error` being set *is* the error state, so a
   * consumer's own rule for when to show a message is the only rule.
   */
  isErrorState(): boolean {
    return this.hasError();
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  writeValue(value: unknown): void {
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
   * The text a value shows as: `displayWith` when a consumer set one; otherwise the
   * label of the last chosen result while the value is still it, falling back to the
   * value itself — which is what typed text is.
   */
  private display(value: T | string | null): string {
    const displayWith = this.displayWith();
    if (displayWith) {
      return displayWith(value) ?? '';
    }
    if (this.lastSelected && this.lastSelected.value === value) {
      return this.lastSelected.label;
    }
    return value == null ? '' : String(value);
  }

  protected handleInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;

    // The typed text *is* the value — Material's own model for a box someone can type
    // anything into. See the class docs.
    this.valueIsTyped = true;
    this.currentText.set(text);
    this.currentQuery.set(text.trim());
    this.value.set(text);
    this.onChange(text);
    this.queries.next(text);
  }

  protected handleOptionSelected(event: MatAutocompleteSelectedEvent): void {
    // The option carries the result's *value* (so Material's `displayWith` is handed the
    // same value the form holds); the whole result is looked back up for the `selected`
    // event, so a consumer that needs the label has it without a lookup of its own.
    const value = event.option.value as T;
    const result = this.results().find((r) => r.value === value);
    if (!result) {
      return;
    }

    // Not typed: the box shows the result's label from here on. `currentText` is set
    // directly rather than left to the value effect, because the chosen value can equal
    // the text that was typed to find it (a search for `grace` that resolves to the
    // value `'grace'`) — the effect would then not re-run, and the `[value]` binding
    // would leave the raw query in the box instead of the label.
    this.valueIsTyped = false;
    this.lastSelected = result;
    this.currentText.set(this.display(value));
    this.currentQuery.set('');
    this.value.set(value);
    this.onChange(value);
    this.selected.emit(result);
  }

  protected handleOpened(): void {
    this.openedChange.emit(true);
  }

  protected handleClosed(): void {
    this.openedChange.emit(false);
  }

  /** Reports that the user has been in and out of the field — a form's "touched". */
  protected handleBlur(): void {
    this.onTouched();
  }

  /**
   * Moves every attribute that is not this component's own from `<ui-typeahead>` onto
   * the real `<input>`, so a consumer's `aria-label`, `maxlength`, `tabindex` or
   * `data-*` reaches the element it is about (rule 3). Mirrors `ui-autocomplete`.
   */
  private forwardAttributes(): void {
    const input = this.inputElement().nativeElement;

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
