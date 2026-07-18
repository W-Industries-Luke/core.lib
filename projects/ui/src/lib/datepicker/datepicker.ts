import {
  afterRenderEffect,
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
  type Provider,
} from '@angular/core';
import {
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  type AbstractControl,
  type ControlValueAccessor,
  type ValidationErrors,
  type Validator,
} from '@angular/forms';
import {
  DateAdapter,
  ErrorStateMatcher,
  MAT_DATE_FORMATS,
  MAT_NATIVE_DATE_FORMATS,
  NativeDateAdapter,
} from '@angular/material/core';
import {
  MatDatepicker,
  MatDatepickerInput,
  MatDatepickerToggle,
  MatDatepickerToggleIcon,
  type DateFilterFn,
  type DatepickerDropdownPositionX,
  type DatepickerDropdownPositionY,
  type MatCalendarCellClassFunction,
  type MatCalendarView,
  type MatDatepickerInputEvent,
} from '@angular/material/datepicker';
import {
  MatError,
  MatFormField,
  MatHint,
  MatLabel,
  MatSuffix,
  type FloatLabelType,
  type MatFormFieldAppearance,
  type SubscriptSizing,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

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
export type UiDatepickerAppearance = MatFormFieldAppearance;

/**
 * When the floating label sits above the field rather than inside it. Aliased
 * from Material's own `FloatLabelType`, for the same reason as
 * {@link UiDatepickerAppearance}.
 */
export type UiDatepickerFloatLabel = FloatLabelType;

/**
 * Whether the hint/error line below the field reserves its space permanently
 * (`fixed`, Material's default) or only while there is a message (`dynamic`).
 * Aliased from Material's own `SubscriptSizing`.
 */
export type UiDatepickerSubscriptSizing = SubscriptSizing;

/**
 * Which calendar view opens first. Aliased from Material's own `MatCalendarView`.
 *
 *   - `month` — the day grid. Material's default, and the right one for a date
 *     near today (a delivery date, an appointment).
 *   - `year` — the twelve months of a year.
 *   - `multi-year` — a grid of years, which is the one a date far from today
 *     wants: a birthday reached through `month` is two dozen taps of the back
 *     arrow.
 */
export type UiDatepickerStartView = MatCalendarView;

/**
 * Decides whether a given date can be picked, e.g. weekdays only.
 *
 * Aliased from Material's own `DateFilterFn`. It is called for every cell the
 * calendar renders, so keep it cheap and pure — a filter that hits the network or
 * allocates per call is one the user feels while paging through months.
 *
 * Material passes `null` when nothing is selected yet; that is not a date to
 * judge, so return `true` for it rather than treating it as a rejection.
 */
export type UiDatepickerDateFilter = DateFilterFn<Date>;

/**
 * Adds CSS classes to individual calendar cells, e.g. to mark holidays. Aliased
 * from Material's own `MatCalendarCellClassFunction`.
 */
export type UiDatepickerDateClass = MatCalendarCellClassFunction<Date>;

/** Which horizontal edge of the field the calendar is anchored to. */
export type UiDatepickerPositionX = DatepickerDropdownPositionX;

/** Whether the calendar opens above or below the field. */
export type UiDatepickerPositionY = DatepickerDropdownPositionY;

/**
 * The date adapter `<ui-datepicker>` provides for itself, and the formats it
 * parses and prints with.
 *
 * This is what makes "a consumer should not have to wire `MatNativeDateModule`"
 * true: `<ui-datepicker>` carries these in its own `providers`, so importing the
 * component is the whole setup and nothing is needed in an app's bootstrap.
 *
 * ### The adapter is native, deliberately and always
 *
 * `NativeDateAdapter` is provided on the component itself rather than deferred to
 * whatever an app may have provided at its root, because this component's API is
 * *typed* in `Date`: {@link Datepicker.value}, {@link Datepicker.min} and
 * {@link Datepicker.max} all say `Date`. A Luxon or Moment adapter reached from an
 * ancestor injector would have the calendar hand back a `DateTime` through a
 * signal that claims to be a `Date` — a type lie that fails at the first
 * `.getFullYear()`. An app that wants a different date library wants a different
 * control; this one is honest about being the native-`Date` one.
 *
 * ### Formats and locale are still the app's to set
 *
 * The two things a consumer legitimately configures are left reachable:
 *
 *   - `MAT_DATE_FORMATS` is resolved with `skipSelf`, so an app that provides its
 *     own formats at the root gets them here and only falls back to Material's
 *     `MAT_NATIVE_DATE_FORMATS` if it has not. Formats decide how a date is parsed
 *     and printed, not what type it is, so there is no lie to tell.
 *   - `MAT_DATE_LOCALE` is not re-provided at all, so `NativeDateAdapter` injects
 *     it from the app's root the way it always would — `{provide: MAT_DATE_LOCALE,
 *     useValue: 'en-GB'}` in an app's bootstrap reaches every `<ui-datepicker>`.
 *
 * Exported so that a consumer who needs the same wiring somewhere else — a
 * `<mat-datepicker>` of their own, a service that formats dates the same way — can
 * reuse it rather than rebuild it.
 */
export function provideUiDateAdapter(): Provider[] {
  return [
    // `useClass` rather than a `skipSelf` fallback: see the doc block above.
    // `NativeDateAdapter` injects `MAT_DATE_LOCALE` itself, and this provider does
    // not shadow that token, so the app's locale still reaches it.
    { provide: DateAdapter, useClass: NativeDateAdapter },
    {
      provide: MAT_DATE_FORMATS,
      // `skipSelf` looks past this component's own injector, so an app-level
      // `MAT_DATE_FORMATS` wins and this is only the default. Without it, a
      // consumer wanting `DD/MM/YYYY` would have no way in that was not
      // re-providing the token at every call site — rule 2.
      useFactory: () =>
        inject(MAT_DATE_FORMATS, { optional: true, skipSelf: true }) ?? MAT_NATIVE_DATE_FORMATS,
    },
  ];
}

/** The default {@link Datepicker.dateFilter}: every date can be picked. */
const ACCEPTS_ANY_DATE: UiDatepickerDateFilter = () => true;

/** The default {@link Datepicker.dateClass}: no cell gets a class of its own. */
const NO_CELL_CLASSES: UiDatepickerDateClass = () => '';

/**
 * Attributes that belong to `<ui-datepicker>` itself and are therefore left alone
 * by {@link Datepicker.forwardAttributes}.
 *
 * Two groups. The first is everything that describes the *wrapper*: `class` and
 * `style` are how a consumer targets it, `hidden` hides the whole field rather
 * than just the control inside it, and `role` re-declares what an element *is* —
 * moving that onto the real input would strip its own `textbox` role, which is the
 * opposite of what anyone writing it wants.
 *
 * The second is this component's own inputs, spelled as HTML lowercases them.
 * Angular has already read these into signals, and each one that has a place on
 * the real input is put there by a binding in `datepicker.html`. Leaving the
 * attributes on the host costs nothing and buys a consumer selectors that read
 * well: `ui-datepicker[disabled]`, `ui-datepicker[appearance='fill']`.
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
  'min',
  'max',
  'value',
  'opened',
  'touchui',
  'startview',
  'startat',
  'datefilter',
  'dateclass',
  'panelclass',
  'xposition',
  'yposition',
  'restorefocus',
  'floatlabel',
  'subscriptsizing',
  'hiderequiredmarker',
  'required',
  'readonly',
  'name',
  'toggle',
  'togglearialabel',
]);

/**
 * Attributes taken off the host but *not* copied onto the input, because a binding
 * in `datepicker.html` already puts them there.
 *
 * They cannot simply stay put like the rest of {@link HOST_ATTRIBUTES}:
 *
 *   - `id` would be a duplicate of the one on the real input — two elements with
 *     one id is invalid HTML, and it is the id `<mat-label for>` points at.
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
 * Marks an element as the field's hint, replacing the `hint` string.
 *
 * For a hint a string cannot spell — one with a link in it, or a live count:
 *
 * ```html
 * <ui-datepicker label="Return date">
 *   <span uiDatepickerHint>See the <a href="/policy">refund policy</a>.</span>
 * </ui-datepicker>
 * ```
 *
 * Put it on the element itself — not on a wrapper around it: `ng-content select`
 * only matches the direct children of `<ui-datepicker>`, so a marker nested any
 * deeper is never projected. Material hides the hint line while an `error` is
 * showing, projected or not, so the two never stack.
 */
@Directive({ selector: '[uiDatepickerHint]' })
export class DatepickerHint {}

/**
 * Replaces the calendar icon on the toggle button.
 *
 * ```html
 * <ui-datepicker label="Due date">
 *   <mat-icon uiDatepickerToggleIcon>event_available</mat-icon>
 * </ui-datepicker>
 * ```
 *
 * The element is projected into Material's own `matDatepickerToggleIcon` slot, so
 * it lands *inside* the toggle's button and keeps the button's ripple, focus ring
 * and accessible name — rather than sitting next to the icon it was meant to
 * replace. Mark the element itself, for the same reason as {@link DatepickerHint}.
 */
@Directive({ selector: '[uiDatepickerToggleIcon]' })
export class DatepickerToggleIcon {}

/**
 * A themed Material datepicker: `<mat-form-field>` around an `<input matInput
 * [matDatepicker]>`, with Material's own toggle and calendar, wired as a form
 * control.
 *
 * ```html
 * <ui-datepicker label="Due date" [(ngModel)]="due" />
 *
 * <ui-datepicker label="Start date" [formControl]="start" [min]="today" [max]="endOfYear"
 *                [error]="start.hasError('matDatepickerMin') ? 'Pick a date from today onwards.' : ''" />
 * ```
 *
 * Like `ui-input` and unlike `uiButton`, this is a component rather than a
 * directive: a datepicker owns *composition* — a form field, a floating label, a
 * text input, a toggle button, the calendar overlay it opens, and the wiring that
 * keeps all four agreeing on one date. There is no single native element to
 * decorate, and the pieces have to be assembled in one order to work.
 *
 * ### It is Material, not a re-implementation
 *
 * The calendar, its overlay and keyboard handling, the toggle, the box, the
 * floating label and every colour are Material's own, resolved from the
 * `--mat-sys-*` tokens that `src/styles/_theme.scss` emits — so there is not a
 * literal colour in `datepicker.scss`, and a palette change there re-skins every
 * datepicker, in light and dark alike.
 *
 * Parsing and formatting are the `DateAdapter`'s, min/max/filter validation is
 * `MatDatepickerInput`'s (see {@link validate}), and the label association is
 * `MatFormField`'s. This component assembles them and hands them its signals.
 *
 * ### Setup: none
 *
 * The date adapter is provided by the component, so importing `Datepicker` is the
 * whole setup — there is no `MatNativeDateModule` to remember in an app's
 * bootstrap. Dates are native `Date`s.
 *
 * What an app may still want to provide at its root, both of which reach every
 * `<ui-datepicker>`:
 *
 *   - `{provide: MAT_DATE_LOCALE, useValue: 'en-GB'}` — how dates are printed and
 *     parsed, and which day the week starts on. Defaults to the app's `LOCALE_ID`.
 *   - `{provide: MAT_DATE_FORMATS, useValue: …}` — the format strings themselves,
 *     for when the locale's defaults are not what a field wants.
 *
 * See {@link provideUiDateAdapter} for why the adapter is not one of them.
 *
 * ### Forms
 *
 * `ui-datepicker` is a `ControlValueAccessor` and a `Validator`, so `[(ngModel)]`,
 * `[formControl]` and `formControlName` work with no adapter (rule 5) — bind the
 * host, not the input inside it. `[(value)]` is the same state without a forms
 * directive.
 *
 * The value is a `Date` or `null`. `null` is both "nothing picked yet" and "what
 * is typed is not a date", which is what a form's empty value means.
 *
 * ### Validation comes for free
 *
 * {@link min}, {@link max} and {@link dateFilter} are enforced, not just drawn:
 * the calendar greys the dates out *and* the bound control gets Material's own
 * `matDatepickerMin`, `matDatepickerMax`, `matDatepickerFilter` and
 * `matDatepickerParse` errors, because this component forwards `validate()` to
 * `MatDatepickerInput` (rule 5). A user can always type past a calendar, so a
 * picker that only greyed dates out would be one that let an out-of-range date
 * through.
 *
 * ### Errors
 *
 * `error` is a string, and it shows when it is set — nothing else. It is a
 * `<mat-error>` under Material's own `ErrorStateMatcher`, so the field turns red,
 * `aria-invalid` flips, the hint gives way to the message and Material points the
 * input's `aria-describedby` at it.
 *
 * Deciding *when* that is deliberately stays with the consumer, because only they
 * know their validation. The common shape is a ternary over the control's own
 * state — and since the errors above are already on the control, that is usually
 * `control.hasError('matDatepickerMin') ? … : ''`.
 *
 * ### Native attributes reach the real input
 *
 * Anything not listed below — `aria-label`, `tabindex`, `data-*`, `autofocus` — is
 * moved from `<ui-datepicker>` onto the `<input>` inside it, statically or bound
 * (rule 3):
 *
 * ```html
 * <ui-datepicker label="Due date" data-testid="due" [attr.aria-label]="name()" />
 * ```
 *
 * `id`, `name`, `readonly`, `required` and `aria-describedby` have inputs of their
 * own instead, because Material's own host bindings own those attributes on the
 * input — an attribute copied onto it would be overwritten on the next change
 * detection, which is a bug that only shows up later.
 *
 * ### Styling hooks
 *
 * - `--ui-datepicker-width` — width of the field inside the host. Defaults to
 *   `100%`, so `<ui-datepicker>` is a block that sizes the field:
 *   `ui-datepicker { width: 20rem; }` is the whole gesture, rather than the
 *   `::ng-deep` that reaching Material's own inline-flex box would otherwise take.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiDatepicker'` hands back the component, and {@link matDatepicker} /
 * {@link matDatepickerInput} / {@link matFormField} hand back the Material
 * instances underneath it — so `picker.matDatepicker().open()` needs no API here
 * (rule 4). {@link panelClass}, {@link xPosition}, {@link yPosition},
 * {@link touchUi}, {@link startAt}, {@link startView}, {@link dateClass} and
 * {@link restoreFocus} are passed through for the same reason.
 */
@Component({
  selector: 'ui-datepicker',
  exportAs: 'uiDatepicker',
  imports: [
    MatFormField,
    MatLabel,
    MatHint,
    MatError,
    MatInput,
    MatSuffix,
    MatDatepicker,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatDatepickerToggleIcon,
  ],
  templateUrl: './datepicker.html',
  styleUrl: './datepicker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    // The forms API resolves these off the element the directive sits on, so they
    // are what make `<ui-datepicker [(ngModel)]>` bind the host rather than
    // leaving a consumer to reach for the input inside it.
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Datepicker), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => Datepicker), multi: true },
    // Why the component carries its own adapter: see `provideUiDateAdapter`.
    ...provideUiDateAdapter(),
  ],
})
export class Datepicker
  implements ControlValueAccessor, Validator, ErrorStateMatcher, AfterViewInit, DoCheck
{
  /**
   * The field's label — the name of the date being collected, e.g. `Due date`.
   *
   * Rendered as Material's `<mat-label>`, which floats above the field once it has
   * a value or focus, and is the input's accessible name. Leave it unset only for
   * a field named some other way (`aria-label`, or a `<label for>` of your own
   * pointed at {@link id}) — an unnamed date field is an accessibility violation,
   * not a design choice.
   */
  readonly label = input<string>();

  /**
   * The earliest date that can be picked.
   *
   * Enforced, not just drawn: the calendar greys out everything before it *and*
   * the bound control gets Material's `matDatepickerMin` error if a user types an
   * earlier one — see the class docs. `null` (the default) means no floor.
   */
  readonly min = input<Date | null>(null);

  /**
   * The latest date that can be picked.
   *
   * Enforced the same way as {@link min}, reporting `matDatepickerMax`. `null`
   * (the default) means no ceiling.
   */
  readonly max = input<Date | null>(null);

  /**
   * Whether the field, its toggle and its calendar are disabled.
   *
   * A reactive form's own `disable()` drives this too, through
   * `setDisabledState`, and either one is enough — so a
   * `FormControl({disabled: true})` needs nothing here, and this input still works
   * on a field with no form at all.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * The error message. The field shows it, and goes red, exactly while this is set
   * to a non-blank string.
   *
   * *When* to set it is the consumer's call — see the class docs. The message is
   * what a screen reader announces for the field, so say what to do about it
   * (`Pick a date from today onwards`) rather than what went wrong (`Invalid`).
   */
  readonly error = input<string>();

  /**
   * Help shown under the field — the format expected, the range allowed.
   *
   * Material hides it while an `error` is showing, so the two never stack. For a
   * hint a string cannot spell, project a {@link DatepickerHint} element instead.
   */
  readonly hint = input<string>();

  /**
   * Short text shown inside the field while it is empty — usually the shape of an
   * answer, e.g. `DD/MM/YYYY`.
   *
   * A placeholder is not a label: it disappears the moment someone types, so it
   * cannot say what the field is. Pair it with {@link floatLabel} set to `always`,
   * or the label sits on top of it.
   */
  readonly placeholder = input<string>();

  /** Visual style of the container. Defaults to `outline`. */
  readonly appearance = input<UiDatepickerAppearance>('outline');

  /**
   * Decides which dates can be picked, e.g. weekdays only.
   *
   * Enforced the same way as {@link min}, reporting `matDatepickerFilter`. Keep it
   * cheap and pure — see {@link UiDatepickerDateFilter}.
   *
   * Defaults to accepting every date. That is a function rather than `undefined`
   * because Material's own input is not nullable, and a constant is one shared
   * reference — a new `() => true` per change detection would have the calendar
   * re-render its cells on every tick.
   */
  readonly dateFilter = input<UiDatepickerDateFilter>(ACCEPTS_ANY_DATE);

  /**
   * The date the calendar opens on when nothing is picked yet. Defaults to today.
   *
   * This only decides where the calendar *starts* — it does not select anything,
   * and it is ignored once the field has a value, which the calendar opens on
   * instead.
   */
  readonly startAt = input<Date | null>(null);

  /**
   * Which calendar view opens first. Defaults to `month`.
   *
   * Use `multi-year` for a date far from today — a birthday reached through
   * `month` is two dozen taps of the back arrow.
   */
  readonly startView = input<UiDatepickerStartView>('month');

  /**
   * Whether the calendar opens as a modal dialog with larger touch targets instead
   * of a dropdown.
   *
   * For touch devices, where a dropdown's cells are smaller than a fingertip. A
   * deliberate choice rather than a media query, because only the consumer knows
   * whether their app is one people use on a phone.
   */
  readonly touchUi = input(false, { transform: booleanAttribute });

  /**
   * The value, two-way and independent of the forms API.
   *
   * `[(value)]` is the no-forms shape (rule 5): a filter on a report, a date on a
   * dashboard — anywhere `[(ngModel)]` would be a directive dragged in for one
   * binding. It stays in step when a form is bound, because both write the same
   * signal.
   *
   * `null` is both "nothing picked" and "what is typed is not a date".
   */
  readonly value = model<Date | null>(null);

  /**
   * Whether the calendar is open, two-way.
   *
   * `[(opened)]` is the state, not a command (rule 5), so a consumer who opens the
   * calendar from a button of their own gets told when the user closes it — which
   * `open()` / `close()` alone could not do. Those still exist on
   * {@link matDatepicker} for the imperative case.
   */
  readonly opened = model(false);

  /**
   * The real input's `id`, and therefore what `<mat-label for>` points at.
   *
   * Set it to point a `<label for>` or an `aria-*` reference of your own at the
   * control. Material generates one when this is unset, so the label association
   * works either way — this only makes it a *known* id.
   *
   * The attribute is moved off `<ui-datepicker>` when it is written there, so the
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
   * Whether the date can be read but not edited.
   *
   * Not the same as `disabled`: a readonly field stays focusable, stays in the tab
   * order, is announced normally, and is submitted with the form.
   *
   * It applies to the *text input* only — the toggle stays live on purpose, which
   * is the established shape for a field whose date should come from the calendar
   * rather than the keyboard. Set {@link toggle} to `false` alongside it for a
   * field that is genuinely display-only.
   */
  readonly readonly = input(false, { transform: booleanAttribute });

  /**
   * Whether the field is required, which adds Material's asterisk to the label and
   * sets `aria-required` on the input.
   *
   * This is presentation and semantics, not validation: it says the field is
   * required, it does not enforce it. Angular's own `required` validator matches
   * the same attribute on `<ui-datepicker [(ngModel)] required>`, so writing it
   * once gets both.
   */
  readonly required = input(false, { transform: booleanAttribute });

  /** Whether Material's required asterisk is hidden on a `required` field. */
  readonly hideRequiredMarker = input(false, { transform: booleanAttribute });

  /**
   * Whether the calendar toggle button is shown. Defaults to `true`.
   *
   * Turning it off leaves a text-only date field, which is the shape a
   * keyboard-first form (an expiry date, a date of birth) sometimes wants. The
   * calendar is still reachable from {@link matDatepicker} for a toggle of your
   * own.
   */
  readonly toggle = input(true, { transform: booleanAttribute });

  /**
   * The toggle button's accessible name. Defaults to Material's own ("Open
   * calendar"), translated through `MatDatepickerIntl`.
   *
   * Set it when one page has several date fields: "Open calendar" three times over
   * tells a screen-reader user which button they are on but not which date it
   * picks.
   */
  readonly toggleAriaLabel = input<string>();

  /**
   * When the label floats above the field. Defaults to Material's `auto` — it
   * floats once the field has focus or a value.
   *
   * `always` keeps it up, which is what a field with a `placeholder` wants: the two
   * occupy the same space, so an `auto` label hides the placeholder it is meant to
   * explain.
   */
  readonly floatLabel = input<UiDatepickerFloatLabel>('auto');

  /**
   * Whether the subscript line reserves its space when empty.
   *
   * Material's `fixed` default keeps a row of fields from jumping when one of them
   * shows an error. `dynamic` gives the space back, for a field standing on its own
   * where nothing below it would move.
   */
  readonly subscriptSizing = input<UiDatepickerSubscriptSizing>('fixed');

  /**
   * Classes put on the calendar's overlay panel.
   *
   * Material's own `panelClass`, passed through (rule 4): the calendar renders in
   * an overlay at the document root, outside this component's encapsulation, so a
   * consumer styling it has no selector that reaches it otherwise — and rule 2 says
   * `::ng-deep` is not the answer.
   */
  readonly panelClass = input<string | string[]>('');

  /** Which horizontal edge of the field the calendar is anchored to. */
  readonly xPosition = input<UiDatepickerPositionX>('start');

  /** Whether the calendar opens above or below the field. */
  readonly yPosition = input<UiDatepickerPositionY>('below');

  /**
   * Whether focus returns to whatever had it before the calendar opened.
   *
   * Defaults to `true`, and leaving it there is the accessible choice — it is what
   * puts a keyboard user back on the field they came from. Material's own note
   * applies: turn it off only if you restore focus yourself.
   */
  readonly restoreFocus = input(true, { transform: booleanAttribute });

  /**
   * Adds CSS classes to individual calendar cells, e.g. to mark holidays.
   *
   * Defaults to adding none — a constant, for the same reason as
   * {@link dateFilter}.
   */
  readonly dateClass = input<UiDatepickerDateClass>(NO_CELL_CLASSES);

  /**
   * The ids of elements describing the control, spelled as the ARIA attribute.
   *
   * An input rather than a forwarded attribute because Material owns this one on
   * the real input: it merges these ids with the hint's and the error's, so all of
   * them are announced. An attribute copied onto the input would be overwritten the
   * moment either of those changed.
   */
  readonly ariaDescribedby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-describedby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The `MatFormField` this component renders — the escape hatch for anything not
   * wrapped here. Reach it with `#field="uiDatepicker"` and `field.matFormField()`.
   */
  readonly matFormField = viewChild.required(MatFormField);

  /**
   * The `MatDatepicker` behind the field — the escape hatch for the calendar
   * itself, e.g. `picker.matDatepicker().open()`.
   */
  readonly matDatepicker = viewChild.required<MatDatepicker<Date>>(MatDatepicker);

  /**
   * The `MatDatepickerInput` on the real `<input>` — the escape hatch for the
   * control, and the source of this component's validation.
   */
  readonly matDatepickerInput = viewChild.required<MatDatepickerInput<Date>>(MatDatepickerInput);

  /** The `MatInput` on the real `<input>`, e.g. `picker.matInput().focus()`. */
  readonly matInput = viewChild.required(MatInput);

  /** The real `<input>` element, for anything neither Material nor this wraps. */
  readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('input');

  /** Whether an `error` is set, and therefore whether the field is in an error state. */
  readonly hasError = computed(() => !!this.error()?.trim());

  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroyRef = inject(DestroyRef);

  /**
   * The adapter this component provides for itself — see {@link provideUiDateAdapter}.
   * Used to read whatever a form wrote into a `Date`.
   */
  private readonly dateAdapter = inject<DateAdapter<Date>>(DateAdapter);

  /** Whether a reactive form has disabled this control — see `setDisabledState`. */
  private readonly disabledByForm = signal(false);

  /**
   * Whether the view exists yet, and therefore whether {@link matDatepickerInput}
   * can be read. A forms directive binds this control — and can ask it to
   * validate — before the view it delegates to is created.
   */
  private readonly viewInitialized = signal(false);

  /**
   * Whether the control is disabled by either route.
   *
   * The two are independent on purpose: a form disabling a control must not
   * silently un-set a `disabled` a template wrote, and vice versa.
   */
  protected readonly isDisabled = computed(() => this.disabled() || this.disabledByForm());

  protected readonly hintSlot = contentChild(DatepickerHint, { descendants: false });
  protected readonly toggleIconSlot = contentChild(DatepickerToggleIcon, { descendants: false });

  /**
   * Handed to `MatInput` as its `errorStateMatcher`, so that the error state is
   * Material's own mechanism rather than a class this component paints on.
   *
   * A property rather than `[errorStateMatcher]="this"`, which the template
   * expression parser has no receiver for.
   */
  protected readonly errorStateMatcher: ErrorStateMatcher = this;

  private onChange: (value: Date | null) => void = () => {
    // Replaced by `registerOnChange` when a forms directive binds this control.
    // Until then there is nobody to report a change to — a field with `[(value)]`
    // and no form is a supported shape, not a mistake.
  };

  private onTouched: () => void = () => {
    // Replaced by `registerOnTouched`, for the same reason as `onChange`.
  };

  private onValidatorChange: () => void = () => {
    // Replaced by `registerOnValidatorChange`, for the same reason as `onChange`.
  };

  constructor() {
    // Angular re-runs a validator when the *value* changes, not when a bound `min`
    // does, so a range that changed after the value was set would otherwise leave a
    // stale verdict on the control: a date that was valid under the old `max`
    // staying valid under a new, earlier one. Material drives its own re-validation
    // from these setters for the same reason; this is that signal, from this side.
    //
    // `afterRenderEffect` rather than `effect`, and the distinction is load-bearing.
    // `validate()` delegates to `MatDatepickerInput`, which learns the new range from
    // the `[min]`/`[max]` bindings in this component's *own* template. A plain
    // `effect` declared here belongs to the view that hosts `<ui-datepicker>`, and
    // Angular refreshes a view's effects before it refreshes that view's child
    // components — so re-validating from one would ask Material the question before
    // it had been told the new range, and get the old answer. After render, the
    // bindings have landed.
    afterRenderEffect(() => {
      this.min();
      this.max();
      this.dateFilter();
      this.onValidatorChange();
    });
  }

  /**
   * Re-checks Material's error state on every change detection pass.
   *
   * `MatInput` does this itself in its own `ngDoCheck`, but only for an input that
   * has an `NgControl` of its own (see `@angular/material/input`). Here the
   * `NgControl` is on `<ui-datepicker>` — that is what makes `[(ngModel)]` bind the
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
    if (this.viewInitialized()) {
      this.matInput().updateErrorState();
    }
  }

  ngAfterViewInit(): void {
    this.forwardAttributes();
    this.viewInitialized.set(true);

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

  /**
   * Reports Material's own `matDatepickerMin` / `matDatepickerMax` /
   * `matDatepickerFilter` / `matDatepickerParse` errors on the bound control.
   *
   * Delegated to `MatDatepickerInput` rather than reimplemented: it already owns the
   * range and filter rules the calendar draws with, and re-deriving them here is how
   * a picker ends up greying out a date it still accepts (rule 5, and the class
   * docs).
   *
   * @docs-private
   */
  validate(control: AbstractControl): ValidationErrors | null {
    // A forms directive binds this control — and asks it to validate — before the
    // view it delegates to exists, so there is nothing to ask yet. The
    // `afterRenderEffect` in the constructor runs once the view has rendered and
    // re-runs validation then, which is what turns this `null` into a real answer.
    return this.viewInitialized() ? this.matDatepickerInput().validate(control) : null;
  }

  /** Implemented as part of `Validator`. @docs-private */
  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  writeValue(value: unknown): void {
    this.value.set(this.coerceDate(value));
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  registerOnChange(fn: (value: Date | null) => void): void {
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
   * Takes the date from Material — whether the user typed it or picked it from the
   * calendar, both of which reach `dateChange`.
   */
  protected handleDateChange(event: MatDatepickerInputEvent<Date, Date | null>): void {
    this.value.set(event.value);
    this.onChange(event.value);
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
   * Turns whatever a form wrote into the `Date | null` this component's API
   * promises.
   *
   * A control can hold anything — an ISO string from a JSON payload is the common
   * one — and the adapter is what knows how to read it, which is the same
   * `deserialize` Material's own input uses. An unparseable or invalid value becomes
   * `null` rather than an `Invalid Date`, because `null` is what a form means by
   * empty and an `Invalid Date` poisons every comparison downstream.
   */
  private coerceDate(value: unknown): Date | null {
    const date = this.dateAdapter.deserialize(value);
    return date && this.dateAdapter.isValid(date) ? date : null;
  }

  /**
   * Moves every attribute that is not this component's own from `<ui-datepicker>`
   * onto the real `<input>`, so that a consumer's `aria-label`, `tabindex` or
   * `data-*` reaches the element it is about (rule 3).
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
