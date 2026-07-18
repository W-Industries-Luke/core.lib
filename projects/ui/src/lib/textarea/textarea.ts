import { CdkTextareaAutosize } from '@angular/cdk/text-field';
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
  numberAttribute,
  signal,
  viewChild,
  type AfterViewInit,
  type DoCheck,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import {
  MatError,
  MatFormField,
  MatHint,
  MatLabel,
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
export type UiTextareaAppearance = MatFormFieldAppearance;

/**
 * When the floating label sits above the field rather than inside it. Aliased
 * from Material's own `FloatLabelType`, for the same reason as
 * {@link UiTextareaAppearance}.
 */
export type UiTextareaFloatLabel = FloatLabelType;

/**
 * Whether the hint/error line below the field reserves its space permanently
 * (`fixed`, Material's default) or only while there is a message (`dynamic`).
 * Aliased from Material's own `SubscriptSizing`.
 */
export type UiTextareaSubscriptSizing = SubscriptSizing;

/**
 * Attributes that belong to `<ui-textarea>` itself and are therefore left alone
 * by {@link Textarea.forwardAttributes}.
 *
 * Two groups. The first is everything that describes the *wrapper*: `class` and
 * `style` are how a consumer targets it, `hidden` hides the whole field rather
 * than just the control inside it, and `role` re-declares what an element *is* —
 * moving that onto the real textarea would strip its own `textbox` role, which is
 * the opposite of what anyone writing it wants.
 *
 * The second is this component's own inputs, spelled as HTML lowercases them.
 * Angular has already read these into signals, and each one that has a place on
 * the real textarea is put there by a binding in `textarea.html`. Leaving the
 * attributes on the host costs nothing and buys a consumer selectors that read
 * well: `ui-textarea[disabled]`, `ui-textarea[appearance='fill']`.
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
  'rows',
  'autosize',
  'maxrows',
  'maxlength',
  'hidecounter',
  'floatlabel',
  'subscriptsizing',
  'hiderequiredmarker',
  'required',
  'readonly',
  'name',
]);

/**
 * Attributes taken off the host but *not* copied onto the textarea, because a
 * binding in `textarea.html` already puts them there.
 *
 * They cannot simply stay put like the rest of {@link HOST_ATTRIBUTES}:
 *
 *   - `id` would be a duplicate of the one on the real textarea — two elements
 *     with one id is invalid HTML, and it is the id `<mat-label for>` points at.
 *   - `aria-describedby` names the description of a *control*, and the control is
 *     the textarea. Material merges it with the ids of the hint, the counter and
 *     the error it renders (`MatInput.userAriaDescribedBy`), so it has to arrive
 *     through that input rather than as an attribute Material would overwrite.
 */
const BOUND_ATTRIBUTES: ReadonlySet<string> = new Set(['id', 'aria-describedby']);

/** How many rows tall a field is unless a consumer says otherwise. */
const DEFAULT_ROWS = 3;

/**
 * Reads a number that a consumer is allowed not to give — `maxLength`,
 * `maxRows` — from a template.
 *
 * `numberAttribute` alone is not enough: it answers `NaN` for anything it cannot
 * read, and `undefined` is one of those. That matters because a bound input is
 * *always* transformed, so `[maxLength]="user.bioLimit"` on an account with no
 * limit would set `maxlength="NaN"` on the control and count `0 / NaN` under it —
 * an unset input has to mean unset whether it is written as an absent attribute
 * or as a binding that happens to be `undefined` today.
 *
 * A value that is not a number at all (`maxRows="soon"`) reads as unset for the
 * same reason: `NaN` rows is not a ceiling anyone asked for, and dropping it
 * leaves the field at the default rather than in a state Material would paint.
 */
function optionalNumber(value: unknown): number | undefined {
  const parsed = numberAttribute(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** Whether an attribute on the host is one this component put there itself. */
function isAngularInternal(name: string): boolean {
  // `_nghost-*` / `_ngcontent-*` carry style encapsulation; `ng-reflect-*`,
  // `ng-version` and the `ng-untouched`-style state hooks are the framework's.
  return name.startsWith('_ng') || name.startsWith('ng-');
}

/**
 * Marks an element as the field's hint, replacing the `hint` string.
 *
 * For a hint a string cannot spell — one with a link in it:
 *
 * ```html
 * <ui-textarea label="Release notes">
 *   <span uiTextareaHint>Supports <a href="/docs/markdown">Markdown</a>.</span>
 * </ui-textarea>
 * ```
 *
 * Put it on the element itself — not on a wrapper around it: `ng-content select`
 * only matches the direct children of `<ui-textarea>`, so a marker nested any
 * deeper is never projected.
 *
 * Material hides the hint line while an `error` is showing, projected or not, so
 * the two never stack. The counter, when there is one, sits opposite it.
 */
@Directive({ selector: '[uiTextareaHint]' })
export class TextareaHint {}

/**
 * A themed Material multi-line text field: `<mat-form-field>` around a
 * `<textarea matInput cdkTextareaAutosize>`, wired as a form control.
 *
 * ```html
 * <ui-textarea label="Bio" rows="4" maxLength="280" [(ngModel)]="bio" />
 *
 * <ui-textarea label="Feedback" [autosize]="false" rows="6" [formControl]="feedback"
 *              [error]="feedback.touched && feedback.invalid ? 'Tell us what happened.' : ''" />
 * ```
 *
 * It is `ui-input`'s sibling, and nearly everything true there is true here — the
 * same inputs, the same forms wiring, the same attribute forwarding — with the
 * two things a multi-line field adds: it grows with its content, and it can count
 * characters.
 *
 * Like `ui-card` and unlike `uiButton`, this is a component rather than a
 * directive: a field owns *composition* — a container, a floating label, the
 * control, a subscript that is a hint, a counter or an error, and the wiring that
 * keeps them consistent. There is no single native element to decorate, and the
 * pieces have to be assembled in one order to work.
 *
 * ### It is Material, not a re-implementation
 *
 * The box, the outline, the floating label and its animation, the focus ring and
 * every colour are `<mat-form-field>`'s own, resolved from the `--mat-sys-*`
 * tokens that `src/styles/_theme.scss` emits — so there is not a literal colour
 * in `textarea.scss`, and a palette change there re-skins every field, in light
 * and dark alike.
 *
 * The growing is the CDK's own `cdkTextareaAutosize` rather than a scroll-height
 * loop of this component's, and the counter is a `<mat-hint align="end">` —
 * which is exactly the shape Material's own documentation gives it.
 *
 * ### Autosize
 *
 * On by default: the field is {@link rows} tall at rest and grows as the user
 * types, so nobody writes an essay through a three-line porthole. {@link maxRows}
 * caps the growth and hands back the scrollbar, which is what a field in a fixed
 * layout wants.
 *
 * `[autosize]="false"` pins the field at {@link rows} and gives the user back the
 * native resize grabber — the two are alternatives, since a height the CDK
 * recomputes on the next keystroke is not one a drag can hold.
 *
 * ### The counter
 *
 * Setting {@link maxLength} does both halves of the job: the browser stops
 * accepting input at the limit, and `12 / 280` appears under the field. It is a
 * `<mat-hint align="end">`, so it sits opposite the hint and the two share a line.
 *
 * Material renders one subscript at a time and an error wins it, so the counter
 * is hidden while an `error` is showing — Material's own rule, and the same one
 * that makes an error replace a hint. It costs little here: `maxLength` is
 * enforced by the browser, so a user cannot be over the limit and reading the
 * counter to find out by how much. {@link hideCounter} drops it for good, for a
 * limit that is a backstop rather than a budget the user should watch.
 *
 * ### Forms
 *
 * `ui-textarea` is a `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]`
 * and `formControlName` work with no adapter (rule 5) — bind the host, not the
 * textarea inside it. `[(value)]` is the same state without a forms directive,
 * for a field that is not part of a form.
 *
 * The value is always a `string`, as the DOM's is.
 *
 * ### Errors
 *
 * `error` is a string, and it shows when it is set — nothing else. It is a
 * `<mat-error>` under Material's own `ErrorStateMatcher`, so the field turns red,
 * `aria-invalid` flips, the subscript gives way to the message and Material
 * points the textarea's `aria-describedby` at it.
 *
 * Deciding *when* that is deliberately stays with the consumer, because only they
 * know their validation: a `required` field usually reports on blur, and a form
 * may want nothing to go red until it is submitted. So the common shape is a
 * ternary over a control's own state, as in the example above.
 *
 * ### Native attributes reach the real textarea
 *
 * Anything not named by an input — `aria-label`, `autocomplete`, `wrap`,
 * `spellcheck`, `tabindex`, `data-*`, `autofocus` — is moved from
 * `<ui-textarea>` onto the `<textarea>` inside it, statically or bound (rule 3):
 *
 * ```html
 * <ui-textarea label="Notes" spellcheck="false" wrap="hard" [attr.aria-label]="name()" />
 * ```
 *
 * `id`, `name`, `readonly`, `required`, `rows`, `maxlength` and
 * `aria-describedby` have inputs of their own instead, because Material's and the
 * CDK's own host bindings own those attributes on the textarea — an attribute
 * copied onto it would be overwritten on the next change detection, which is a
 * bug that only shows up later.
 *
 * ### Styling hooks
 *
 * - `--ui-textarea-width` — width of the field inside the host. Defaults to
 *   `100%`, so `<ui-textarea>` is a block that sizes the field:
 *   `ui-textarea { width: 30rem; }` is the whole gesture, rather than the
 *   `::ng-deep` that reaching Material's own inline-flex box would otherwise take.
 * - `--ui-textarea-resize` — the control's `resize`. Defaults to `vertical`, and
 *   to `none` while `autosize` is on, since the CDK owns the height then. Set it
 *   to have both, or to `none` to take the grabber away from a fixed field.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiTextarea'` hands back the component, and {@link matFormField},
 * {@link matInput} and {@link autosizeRef} hand back the Material and CDK
 * instances underneath it — so `field.matInput().focus()` and
 * `field.autosizeRef().resizeToFitContent(true)` need no API here (rule 4).
 */
@Component({
  selector: 'ui-textarea',
  exportAs: 'uiTextarea',
  imports: [MatFormField, MatLabel, MatHint, MatError, MatInput, CdkTextareaAutosize],
  templateUrl: './textarea.html',
  styleUrl: './textarea.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    // The forms API resolves this off the element the directive sits on, so it
    // is what makes `<ui-textarea [(ngModel)]>` bind the host rather than leaving
    // a consumer to reach for the textarea inside it.
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Textarea), multi: true },
  ],
})
export class Textarea implements ControlValueAccessor, ErrorStateMatcher, AfterViewInit, DoCheck {
  /**
   * The field's label — the name of the thing being collected, e.g. `Bio`.
   *
   * Rendered as Material's `<mat-label>`, which floats above the field once it
   * has a value or focus, and is the textarea's accessible name. Leave it unset
   * only for a field named some other way (`aria-label`, or a `<label for>` of
   * your own pointed at {@link id}) — an unnamed text box is an accessibility
   * violation, not a design choice.
   */
  readonly label = input<string>();

  /**
   * Short text shown inside the field while it is empty.
   *
   * A placeholder is not a label: it disappears the moment someone types, so it
   * cannot say what the field is. Use it for the *shape* of an answer over a
   * `label` that says which answer it wants.
   */
  readonly placeholder = input<string>();

  /**
   * How many rows tall the field is. Defaults to 3.
   *
   * With `autosize` on this is the resting height and the floor — the field is
   * this tall when empty and grows from there, never below it. With autosize off
   * it is the height, full stop.
   *
   * Three is a compromise: tall enough to say "this wants a paragraph, not a
   * word", short enough not to dominate a form. Raise it for a field that is the
   * point of the page.
   */
  readonly rows = input<number, unknown>(DEFAULT_ROWS, {
    transform: (value) => optionalNumber(value) ?? DEFAULT_ROWS,
  });

  /**
   * Whether the field grows with its content. On by default.
   *
   * This is the CDK's `cdkTextareaAutosize`. Turn it off for a field whose height
   * must not change — one in a fixed layout, or one the user should be able to
   * drag to a size and have it stay.
   */
  readonly autosize = input(true, { transform: booleanAttribute });

  /**
   * The tallest the field grows while `autosize` is on, in rows. Unset by
   * default, which is no ceiling at all.
   *
   * Past this the content scrolls, as it would in an ordinary textarea. Set it
   * for a field that must not push the submit button off the screen.
   *
   * Ignored while `autosize` is off, where {@link rows} is the height.
   */
  readonly maxRows = input<number | undefined, unknown>(undefined, {
    transform: optionalNumber,
  });

  /**
   * The most characters the field accepts. Unset by default, which is no limit.
   *
   * Setting it does both halves of the job: it is the textarea's native
   * `maxlength`, so the browser stops accepting input at the limit, *and* it
   * turns on the character counter below the field. {@link hideCounter} keeps the
   * limit and drops the counter.
   */
  readonly maxLength = input<number | undefined, unknown>(undefined, {
    transform: optionalNumber,
  });

  /**
   * Whether the character counter is hidden on a field that has a `maxLength`.
   *
   * For a limit that is a backstop — a database column's width — rather than a
   * budget the user is meant to spend. The limit still applies.
   */
  readonly hideCounter = input(false, { transform: booleanAttribute });

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
   * Help shown under the field — a format, a rule, a reassurance.
   *
   * Material hides it while an `error` is showing, so the two never stack. It
   * sits opposite the counter, so a field can have both. For a hint a string
   * cannot spell, project a {@link TextareaHint} element instead.
   */
  readonly hint = input<string>();

  /**
   * The error message. The field shows it, and goes red, exactly while this is
   * set to a non-blank string.
   *
   * *When* to set it is the consumer's call — see the class docs. The message is
   * what a screen reader announces for the field, so say what to do about it
   * (`Describe the problem in a sentence or two`) rather than what went wrong
   * (`Invalid`).
   */
  readonly error = input<string>();

  /** Visual style of the container. Defaults to `outline`. */
  readonly appearance = input<UiTextareaAppearance>('outline');

  /**
   * The field's value, two-way and independent of the forms API.
   *
   * `[(value)]` is the no-forms shape (rule 5): a comment box, a scratch note —
   * anywhere `[(ngModel)]` would be a directive dragged in for one binding. It
   * stays in step when a form is bound, because both write the same signal.
   *
   * Always a string, as the DOM's value is.
   */
  readonly value = model('');

  /**
   * The real textarea's `id`, and therefore what `<mat-label for>` points at.
   *
   * Set it to point a `<label for>` or an `aria-*` reference of your own at the
   * control. Material generates one when this is unset, so the label association
   * works either way — this only makes it a *known* id.
   *
   * The attribute is moved off `<ui-textarea>` when it is written there, so the
   * page never has two elements claiming one id.
   */
  readonly id = input<string>();

  /**
   * The real textarea's `name`, for native form submission.
   *
   * `[(ngModel)]` inside a `<form>` reads the same attribute for its own
   * registration, so writing `name` once serves both.
   */
  readonly name = input<string>();

  /**
   * Whether the value can be read but not edited.
   *
   * Not the same as `disabled`: a readonly field stays focusable, stays in the
   * tab order, is announced normally, and is submitted with the form. It is the
   * one to reach for when a value is *shown* rather than *unavailable*.
   */
  readonly readonly = input(false, { transform: booleanAttribute });

  /**
   * Whether the field is required, which adds Material's asterisk to the label
   * and sets `aria-required` on the textarea.
   *
   * This is presentation and semantics, not validation: it says the field is
   * required, it does not enforce it. Angular's own `required` validator matches
   * the same attribute on `<ui-textarea [(ngModel)] required>`, so writing it
   * once gets both.
   */
  readonly required = input(false, { transform: booleanAttribute });

  /** Whether Material's required asterisk is hidden on a `required` field. */
  readonly hideRequiredMarker = input(false, { transform: booleanAttribute });

  /**
   * When the label floats above the field. Defaults to Material's `auto` — it
   * floats once the field has focus or a value.
   *
   * `always` keeps it up, which is what a field with a `placeholder` wants: the
   * two occupy the same space, so an `auto` label hides the placeholder it is
   * meant to explain.
   */
  readonly floatLabel = input<UiTextareaFloatLabel>('auto');

  /**
   * Whether the subscript line reserves its space when empty.
   *
   * Material's `fixed` default keeps a form from jumping when a field shows an
   * error. `dynamic` gives the space back, for a field standing on its own where
   * nothing below it would move.
   */
  readonly subscriptSizing = input<UiTextareaSubscriptSizing>('fixed');

  /**
   * The ids of elements describing the control, spelled as the ARIA attribute.
   *
   * An input rather than a forwarded attribute because Material owns this one on
   * the real textarea: it merges these ids with the hint's, the counter's and the
   * error's, so all of them are announced. An attribute copied onto the textarea
   * would be overwritten the moment any of those changed.
   */
  readonly ariaDescribedby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-describedby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The `MatFormField` this component renders — the escape hatch for anything not
   * wrapped here. Reach it with `#field="uiTextarea"` and `field.matFormField()`.
   */
  readonly matFormField = viewChild.required(MatFormField);

  /**
   * The `MatInput` on the real `<textarea>` — the escape hatch for the control
   * itself, e.g. `field.matInput().focus()`.
   */
  readonly matInput = viewChild.required(MatInput);

  /**
   * The CDK's `CdkTextareaAutosize` — the escape hatch for the growing itself.
   *
   * `resizeToFitContent(true)` is the one worth knowing: the directive re-measures
   * on its own for anything Angular sees, but a field first rendered inside a
   * collapsed tab or expansion panel was measured while it had no layout, and that
   * is the call that fixes it.
   */
  readonly autosizeRef = viewChild.required(CdkTextareaAutosize);

  /** The real `<textarea>`, for anything neither Material, the CDK nor this wraps. */
  readonly textareaElement = viewChild.required<ElementRef<HTMLTextAreaElement>>('textarea');

  /** Whether an `error` is set, and therefore whether the field is in an error state. */
  readonly hasError = computed(() => !!this.error()?.trim());

  /** How many characters the value is — the number the counter shows. */
  readonly length = computed(() => this.value().length);

  /**
   * Whether the field has a counter: a `maxLength` is set and it is not hidden.
   *
   * Material may still not paint it — an `error` takes the subscript over — which
   * is its own rule rather than this component's, and the reason this says
   * *counter* rather than *visible*.
   */
  readonly hasCounter = computed(() => this.maxLength() != null && !this.hideCounter());

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

  protected readonly hintSlot = contentChild(TextareaHint, { descendants: false });

  /**
   * Handed to `MatInput` as its `errorStateMatcher`, so that the error state is
   * Material's own mechanism rather than a class this component paints on.
   *
   * A property rather than `[errorStateMatcher]="this"`, which the template
   * expression parser has no receiver for.
   */
  protected readonly errorStateMatcher: ErrorStateMatcher = this;

  private onChange: (value: string) => void = () => {
    // Replaced by `registerOnChange` when a forms directive binds this control.
    // Until then there is nobody to report a change to — a field with `[(value)]`
    // and no form is a supported shape, not a mistake.
  };

  private onTouched: () => void = () => {
    // Replaced by `registerOnTouched`, for the same reason as `onChange`.
  };

  /** Whether the view — and therefore {@link matInput} — has been created. */
  private viewReady = false;

  /**
   * Re-checks Material's error state on every change detection pass.
   *
   * `MatInput` does this itself in its own `ngDoCheck`, but only for a control that
   * has an `NgControl` of its own (see `@angular/material/input`). Here the
   * `NgControl` is on `<ui-textarea>` — that is what makes `<ui-textarea [(ngModel)]>`
   * bind the host rather than the textarea inside it — so `MatInput` never sees one
   * and the re-check has to be driven from this side.
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
    // Coerced rather than trusted: a control can hold anything, and the DOM's
    // value is a string. `null` is a form's empty value, and `String(null)` is
    // the word "null" — which is what a user would see in the field.
    this.value.set(value == null ? '' : String(value));
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  registerOnChange(fn: (value: string) => void): void {
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

  protected handleInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.value.set(value);
    this.onChange(value);
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
   * Moves every attribute that is not this component's own from `<ui-textarea>`
   * onto the real `<textarea>`, so that a consumer's `aria-label`, `spellcheck`,
   * `wrap`, `tabindex` or `data-*` reaches the element it is about (rule 3).
   *
   * *Moves* rather than copies: two elements carrying one `data-testid` is an
   * ambiguous query, and a `tabindex` left behind would be a second tab stop on a
   * wrapper that is not a control.
   */
  private forwardAttributes(): void {
    const textarea = this.textareaElement().nativeElement;

    // A live NamedNodeMap, and this loop removes from it — hence the copy.
    for (const { name, value } of Array.from(this.hostElement.attributes)) {
      if (HOST_ATTRIBUTES.has(name) || isAngularInternal(name)) {
        continue;
      }
      this.hostElement.removeAttribute(name);
      if (!BOUND_ATTRIBUTES.has(name)) {
        textarea.setAttribute(name, value);
      }
    }
  }
}
