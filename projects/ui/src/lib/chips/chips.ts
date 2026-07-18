import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  Directive,
  inject,
  input,
  model,
  output,
  TemplateRef,
  viewChild,
} from '@angular/core';
import {
  MatChip,
  MatChipGrid,
  MatChipInput,
  MatChipRemove,
  MatChipRow,
  MatChipSet,
  type MatChipInputEvent,
  type SeparatorKey,
} from '@angular/material/chips';
import {
  MatFormField,
  MatHint,
  MatLabel,
  type MatFormFieldAppearance,
} from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';

/**
 * One chip in a {@link Chips}.
 *
 * `value` is what {@link Chips.removed} and {@link Chips.added} carry back —
 * deliberately not constrained to a string, because a chip standing for a person, a
 * tag row or a filter over objects is the common case, and forcing an id in and a
 * lookup out is exactly the adapter this library exists to remove.
 */
export interface UiChip<T = string> {
  /** The text shown on the chip, and the name assistive tech announces for it. */
  label: string;

  /** What {@link Chips.removed} and {@link Chips.added} carry for this chip. */
  value: T;

  /**
   * Whether this one chip can be removed, while the rest cannot.
   *
   * Unset falls back to {@link Chips.removable}, which is the switch to reach for
   * when *every* chip in the set can go. Set it here for the odd chip that is
   * pinned — a required tag among optional ones.
   */
  removable?: boolean;
}

/**
 * Visual style of the field's container, for an `editable` set.
 *
 * Aliased from Material's own `MatFormFieldAppearance` rather than re-declared, so
 * that a change to the union upstream is a compile error here rather than an
 * appearance this component forwards and `MatFormField` throws on. `outline` is this
 * library's default, matching `ui-select` and `ui-input`; `fill` is Material's own.
 */
export type UiChipsAppearance = MatFormFieldAppearance;

/**
 * A key that ends a chip while typing in an `editable` set. Aliased from Material's
 * own `SeparatorKey` — a key code with modifiers.
 */
export type UiChipsSeparatorKey = SeparatorKey;

/**
 * Turns the text a user typed into the chip it becomes — see
 * {@link Chips.createChip}.
 *
 * Return `null` to reject the text: nothing is added, nothing is emitted, and the
 * text stays in the input for the user to amend.
 */
export type UiChipFactory<T = string> = (label: string) => UiChip<T> | null;

/** The context a `uiChipDef` template is rendered with. */
export interface UiChipContext<T = string> {
  /** The chip being rendered — `let-chip`. */
  $implicit: UiChip<T>;
}

/**
 * The chip a typed label becomes when no {@link Chips.createChip} says otherwise:
 * the text is both the label and the value.
 *
 * That is only a `T` when `T` *is* `string`, which is the default and the case an
 * unconfigured `editable` set is in. A set over objects has to say what a typed
 * label makes — see {@link Chips.createChip}.
 */
function defaultCreateChip<T>(label: string): UiChip<T> {
  return { label, value: label as unknown as T };
}

/** The name of a chip's remove button when no {@link Chips.removeAriaLabel} says otherwise. */
function defaultRemoveAriaLabel<T>(chip: UiChip<T>): string {
  return `Remove ${chip.label}`;
}

/**
 * The keys that end a chip when none are given: Enter, and a comma.
 *
 * Material's own default is Enter alone. The comma is the fleet's addition — it is
 * what a user typing a list types anyway, and a comma that makes a chip in one app
 * and a character in the next is exactly the drift this library exists to prevent.
 */
const DEFAULT_SEPARATOR_KEYS: readonly (number | SeparatorKey)[] = [ENTER, COMMA];

/**
 * Renders each chip, in place of its `label` (rule 7).
 *
 * The chip is the template's implicit context, so an avatar, a status dot, a count or
 * an icon is a template rather than a string input this component would have to grow:
 *
 * ```html
 * <ui-chips [chips]="people()">
 *   <ng-template uiChipDef let-chip>
 *     <span class="status" [class.online]="chip.value.online"></span>
 *     {{ chip.label }}
 *   </ng-template>
 * </ui-chips>
 * ```
 *
 * It renders *inside* Material's own `<mat-chip>` (or `<mat-chip-row>`), so the ripple,
 * the roving focus, the remove button and the disabled handling are untouched — and it
 * applies to a static set and an editable one alike.
 *
 * Note it renders into the chip's *text* slot, not Material's leading `matChipAvatar`
 * one: that slot is matched against the static template, so nothing rendered from an
 * `ng-template` can land in it. Size and space what you put here yourself. `MenuItemDef`
 * has the same shape, and the same caveat, for the same reason.
 */
@Directive({ selector: 'ng-template[uiChipDef]' })
export class ChipDef<T = string> {
  /** The template itself, rendered by `chips.html`. @docs-private */
  readonly template = inject<TemplateRef<UiChipContext<T>>>(TemplateRef);

  /**
   * Types `let-chip` as the chip, rather than as `any`. @docs-private
   *
   * The signature is Angular's, and the compiler is its only caller — the parameters
   * exist to be named in the type predicate and nowhere else, which is exactly what
   * `no-unused-vars` reports. There is no shape of this function that both keeps the
   * guard and satisfies the rule. The same shape as `MenuItemDef`'s.
   */
  static ngTemplateContextGuard<T>(
    directive: ChipDef<T>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is UiChipContext<T> {
    return true;
  }
}

/**
 * A themed Material chip set: the {@link UiChip}s given to it, optionally removable,
 * and optionally with an input to add more.
 *
 * ```html
 * <ui-chips [chips]="tags()" aria-label="Tags" />
 *
 * <ui-chips [(chips)]="tags" removable (removed)="save()" aria-label="Tags" />
 *
 * <ui-chips [(chips)]="tags" editable removable label="Tags" placeholder="New tag…" />
 * ```
 *
 * Like `ui-menu` and `ui-select`, and unlike `uiButton`, this is a component rather
 * than a directive: a chip set owns *composition* — a container, a chip per value,
 * the remove button on each, and (when `editable`) a field with an input that turns
 * text into another chip. There is no single native element to decorate.
 *
 * ### It is Material, not a re-implementation
 *
 * The chips and their shape, outline, ripple and state layers, the remove button, the
 * roving focus and the arrow keys across the set, the Backspace/Delete that removes
 * the focused chip, the `role="grid"` an editable set puts around its rows, the focus
 * that moves on after a chip is taken away, and every colour and font are
 * `<mat-chip-set>`'s, `<mat-chip>`'s, `<mat-chip-grid>`'s, `<mat-chip-row>`'s and
 * `<input matChipInputFor>`'s own, resolved from the `--mat-sys-*` tokens that
 * `src/styles/_theme.scss` emits — so there is not a literal colour in `chips.scss`,
 * and a palette change there re-skins every chip in the fleet, in light and dark
 * alike.
 *
 * What this adds is the fleet's defaults (a comma ends a chip as well as Enter; text
 * left in the input on blur is kept rather than dropped), a remove button that names
 * itself after its chip, and state that is *signals* rather than a widget holding its
 * own.
 *
 * ### The two shapes it takes
 *
 * {@link editable} decides which of Material's two chip containers is rendered,
 * because they are different widgets rather than one with a switch:
 *
 *   - Without it, a `<mat-chip-set role="list">` of `<mat-chip role="listitem">` —
 *     static chips, which is what a row of tags on a card is.
 *   - With it, a `<mat-form-field>` around a `<mat-chip-grid>` of `<mat-chip-row>`
 *     with an `<input matChipInputFor>` — the `role="grid"` a user types into, which
 *     is Material's own chips-with-input.
 *
 * ### State
 *
 * {@link chips} is a `model` (rule 5), so the list is one piece of state rather than
 * an input and an output that can disagree: a removed chip and an added one both
 * write it, and `[(chips)]` keeps a consumer's signal and the screen as one list.
 * {@link removed} and {@link added} are *events* alongside it — what to save, what to
 * offer an undo for — rather than the way to keep the list up to date.
 *
 * Bind it two-way whenever the set is `removable` or `editable`. Under a one-way
 * `[chips]` the set still adds and removes, but the consumer's next write replaces
 * the list wholesale — which is that binding saying the consumer owns the list, and
 * is the shape to reach for when they mean to apply the change themselves (a server
 * round-trip, a confirmation).
 *
 * This is deliberately not a `ControlValueAccessor` (rule 5's other half): a form's
 * value would be the chips' *values*, and a value cannot say what its chip is called,
 * so `writeValue` could not rebuild the list it was handed. Material draws the same
 * line — `MatChipGrid.writeValue` stores the value and creates no chips. `[(chips)]`
 * is the state; it keeps the labels.
 *
 * ### Adding
 *
 * An `editable` set turns typed text into a chip on Enter or a comma
 * ({@link separatorKeys}), and on blur ({@link addOnBlur}). What the text *becomes*
 * is {@link createChip}: by default the label and the value are both the text, which
 * is why `T` defaults to `string`. A set over objects gives a factory — and that is
 * the same place a duplicate is turned away, by returning `null`.
 *
 * ### Accessibility
 *
 * Name the set with `aria-label` (or `aria-labelledby`) — say what the chips *are*
 * (`Tags`), not that they are chips. A static set is a `list` of `listitem`s, which
 * is what Material's own docs prescribe for chips that are content rather than
 * controls; an editable one is Material's `grid`, and its input is named by the
 * {@link label}. Each remove button is named `Remove {label}` — see
 * {@link removeAriaLabel} to reword or translate that.
 *
 * ### Styling hooks
 *
 * - `--ui-chips-container-color` — the chip's fill. Transparent by default, which is
 *   M3's outlined chip.
 * - `--ui-chips-label-text-color` — the chip's text.
 * - `--ui-chips-outline-color` / `--ui-chips-outline-width` — the chip's border.
 * - `--ui-chips-trailing-icon-color` — the remove button's icon.
 * - `--ui-chips-shape` — the chip's corners.
 * - `--ui-chips-width` — the width of an `editable` set's field.
 *
 * All are read off `<ui-chips>`, so a consumer sets them from an ordinary rule on an
 * ordinary selector (`ui-chips { --ui-chips-container-color: … }`) — no `::ng-deep`,
 * no `!important` (rules 2 and 6). Point a colour at a `--mat-sys-*` / `--ui-sys-*`
 * role rather than a literal, so it survives a palette change and dark mode.
 *
 * The chip's height is deliberately not a hook: it is Material's density token, and
 * density is a fleet-wide decision `_theme.scss` owns rather than one a single chip
 * set should re-take.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiChips'` hands back the component, and {@link matChipSet},
 * {@link matChipGrid} and {@link matChipInput} hand back Material's own instances — so
 * `chips.matChipInput()?.focus()` or `chips.matChipSet()?.focus()` needs no API here
 * (rule 4).
 */
@Component({
  selector: 'ui-chips',
  exportAs: 'uiChips',
  imports: [
    MatChipSet,
    MatChip,
    MatChipGrid,
    MatChipRow,
    MatChipRemove,
    MatChipInput,
    MatFormField,
    MatLabel,
    MatHint,
    MatIcon,
    NgTemplateOutlet,
  ],
  templateUrl: './chips.html',
  styleUrl: './chips.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // The ARIA names are inputs here, aliased to the attributes a consumer already
    // knows how to spell — but `<ui-chips>` is not the element they describe. The
    // `list` / `grid` is Material's container inside this component, and `chips.html`
    // puts them on it.
    //
    // Left behind on this host they would not merely be inert, they would be a real
    // violation: an ARIA name on an element with no role. axe reports exactly that
    // (`aria-prohibited-attr`), and it is right to — so they are taken back off the
    // DOM once Angular has read them into the signals, as `ui-menu` does.
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
  },
})
export class Chips<T = string> {
  /**
   * The chips, in the order they are shown — and the set's state (rule 5).
   *
   * A `model` rather than an input and an output that can disagree: a removed chip
   * and an added one both write it, so `[(chips)]` keeps a consumer's signal and the
   * screen as one list. See the class docs for what a one-way `[chips]` means here.
   *
   * To render a chip as something other than its `label`, project a {@link ChipDef}
   * template — the list itself stays this model either way.
   */
  readonly chips = model<readonly UiChip<T>[]>([]);

  /**
   * Whether a user can add chips by typing, which renders the set as a
   * `<mat-form-field>` around Material's `<mat-chip-grid>` and its input.
   *
   * Note this is about *adding to the set*, not about editing a chip's text in
   * place — which is `MatChipRow`'s own `editable`, and is not wrapped here. Removing
   * is {@link removable}, and the two are independent: an editable set whose existing
   * chips are pinned is `editable` without `removable`.
   */
  readonly editable = input(false, { transform: booleanAttribute });

  /**
   * Whether every chip carries a remove button. Off by default.
   *
   * This is the switch for the whole set. A single chip overrides it either way with
   * {@link UiChip.removable} — a pinned chip among removable ones, or the one chip
   * that can go.
   */
  readonly removable = input(false, { transform: booleanAttribute });

  /**
   * Whether the whole set is inert: no chip can be removed, and an `editable` set's
   * input cannot be typed into.
   *
   * The chips are still shown, and still read out — a disabled set is one a user
   * cannot change, not one they cannot see.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * The field's label, for an `editable` set — the name of what is being collected,
   * e.g. `Tags`.
   *
   * Rendered as Material's `<mat-label>`, which floats above the field, and used to
   * name the input a user types into. Leave it unset only for a field named some
   * other way ({@link ariaLabel} or {@link ariaLabelledby}): an unnamed control is an
   * accessibility violation, not a design choice. It has no place on a static set,
   * which is a list rather than a field — name that one with `aria-label`.
   */
  readonly label = input<string>();

  /** Short text shown in an `editable` set's input while it is empty, e.g. `New tag…`. */
  readonly placeholder = input<string>();

  /**
   * Help shown under an `editable` set's field — a rule, a limit, a reassurance, e.g.
   * `Enter or comma to add`.
   */
  readonly hint = input<string>();

  /** Visual style of an `editable` set's container. Defaults to `outline`. */
  readonly appearance = input<UiChipsAppearance>('outline');

  /**
   * Whether text left in an `editable` set's input becomes a chip when the input
   * loses focus. On by default.
   *
   * This is the one place the fleet's default is not Material's, which is `false`.
   * Text a user typed and then clicked away from is text they meant — dropping it
   * silently is the bug every app that turns this on is fixing.
   */
  readonly addOnBlur = input(true, { transform: booleanAttribute });

  /**
   * The keys that end a chip while typing. Defaults to Enter and a comma.
   *
   * Material's own default is Enter alone; the comma is the fleet's, because it is
   * what a user typing a list types anyway. Material's `SeparatorKey` shape —
   * `{ keyCode, modifiers }` — is accepted here too, for a separator that takes a
   * modifier.
   */
  readonly separatorKeys = input<readonly (number | UiChipsSeparatorKey)[]>(DEFAULT_SEPARATOR_KEYS);

  /**
   * What the text a user typed becomes.
   *
   * By default the label and the value are both the text, which is why `T` defaults
   * to `string`. A set whose chips stand for something else says so here — and it is
   * the same place a duplicate is turned away, by returning `null`:
   *
   * ```ts
   * protected readonly toTag = (label: string): UiChip<Tag> | null =>
   *   this.tags().some((tag) => tag.label === label) ? null : { label, value: { name: label } };
   * ```
   *
   * The text is trimmed before it gets here, and a blank one never does. Rejecting it
   * leaves it in the input for the user to amend, rather than swallowing what they
   * typed.
   */
  readonly createChip = input<UiChipFactory<T>>(defaultCreateChip);

  /**
   * The accessible name of a chip's remove button. Defaults to `Remove {label}`.
   *
   * A function of the chip rather than a string, because the name has to say *which*
   * chip: a row of buttons all called `Remove` is a screen reader user guessing.
   * Reword or translate it by giving one:
   *
   * ```ts
   * protected readonly removeLabel = (chip: UiChip) => `Dileu ${chip.label}`;
   * ```
   */
  readonly removeAriaLabel = input<(chip: UiChip<T>) => string>(defaultRemoveAriaLabel);

  /**
   * The set's accessible name, spelled as the ARIA attribute — what the chips *are*,
   * e.g. `Tags`.
   *
   * An input rather than an attribute left on the host, because the host is not the
   * element with the role: Material's `list` / `grid` is inside this component, and
   * this is put on it.
   */
  readonly ariaLabel = input<string | undefined, unknown>(undefined, {
    alias: 'aria-label',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The id of the element naming the set — for chips named by a heading already on the
   * page. Preferred over {@link ariaLabel} where one exists.
   */
  readonly ariaLabelledby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-labelledby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * Emits the chip a user removed, *after* it has left {@link chips}.
   *
   * The whole chip rather than just its `value`, because the label is usually what an
   * undo toast needs to say, and re-finding the chip in a list it is no longer in is a
   * lookup a consumer should not have to write. Take `$event.value` for the value
   * alone.
   *
   * A chip taken out of `chips` from code is the consumer's own state arriving, so it
   * is not echoed back here.
   */
  readonly removed = output<UiChip<T>>();

  /**
   * Emits the chip a user added, *after* it has joined {@link chips}.
   *
   * The chip is whatever {@link createChip} made of the typed text; a rejected one
   * never emits.
   */
  readonly added = output<UiChip<T>>();

  /**
   * The `MatChipGrid` an `editable` set renders, or `undefined` for a static one — the
   * escape hatch for the grid's own API (rule 4), e.g. `.focus()`.
   */
  readonly matChipGrid = viewChild(MatChipGrid);

  /**
   * The `MatChipInput` an `editable` set renders, or `undefined` for a static one —
   * the escape hatch for the input (rule 4), e.g. `chips.matChipInput()?.focus()`
   * after adding a chip from code.
   */
  readonly matChipInput = viewChild(MatChipInput);

  /** The `<mat-chip-set>` of a static set. {@link matChipSet} is what to read. @docs-private */
  private readonly staticChipSet = viewChild(MatChipSet);

  /**
   * The `MatChipSet` this component renders — Material's own instance, and the escape
   * hatch for anything not wrapped here (rule 4), e.g. `chips.matChipSet()?.focus()`.
   * Reach it with `#tags="uiChips"`.
   *
   * An `editable` set renders a `<mat-chip-grid>`, which *is* a `MatChipSet` but does
   * not answer to that token — Material aliases it to `MatFormFieldControl` and
   * nothing else — so this reports the grid too, and is the one property that means
   * "the container, whichever it is". It is `undefined` only before the first paint:
   * one branch or the other is always rendered.
   */
  readonly matChipSet = computed<MatChipSet | undefined>(
    () => this.matChipGrid() ?? this.staticChipSet(),
  );

  /** A projected `uiChipDef` template, when a consumer gives one. @docs-private */
  protected readonly chipDef = contentChild(ChipDef<T>);

  /**
   * The name for an `editable` set's grid — or nothing, while it has no chips.
   *
   * Material drops a chip container's `role` while it is empty, and an ARIA name on an
   * element with no role is a violation in itself (`aria-prohibited-attr`) rather than
   * merely useless — so the name has to come and go with the role. Nothing is lost by
   * it: an empty grid holds nothing to navigate, and the input beside it — which is
   * what a user is actually in — carries the name either way.
   *
   * The static branch needs none of this: it names its own `role="list"` explicitly, so
   * the role is always there. @docs-private
   */
  protected readonly gridAriaLabel = computed(() =>
    this.chips().length ? (this.ariaLabel() ?? this.label()) : undefined,
  );

  /** The grid's `aria-labelledby`, on the same terms as {@link gridAriaLabel}. @docs-private */
  protected readonly gridAriaLabelledby = computed(() =>
    this.chips().length ? this.ariaLabelledby() : undefined,
  );

  /**
   * Whether a chip carries a remove button: its own answer, or the set's.
   *
   * Also what Material's `[removable]` is bound from — a `MatChip` only emits
   * `removed` while it is removable, so the button and the behaviour are one decision
   * rather than two that could part company. @docs-private
   */
  protected isRemovable(chip: UiChip<T>): boolean {
    return chip.removable ?? this.removable();
  }

  /**
   * Removes a chip a user took away, and reports it.
   *
   * The model is written before the output fires, so a consumer reading `chips()` from
   * inside `(removed)` sees the list without it rather than the one before.
   *
   * By identity rather than by index or label: `MatChip.removed` carries the chip
   * itself, and two chips with the same label are still two chips — only the one whose
   * button was pressed goes.
   */
  protected remove(chip: UiChip<T>): void {
    this.chips.update((chips) => chips.filter((existing) => existing !== chip));
    this.removed.emit(chip);
  }

  /**
   * Turns the text a user typed into a chip, if {@link createChip} makes one of it.
   *
   * Blank text is nothing to add — it is what Enter on an empty input, or a blur that
   * was never typed into, produces — so it is cleared and dropped rather than becoming
   * an empty chip. A rejected label is left in the input for the user to amend; a chip
   * that was made clears it, ready for the next.
   */
  protected add(event: MatChipInputEvent): void {
    const label = event.value.trim();
    if (!label) {
      event.chipInput.clear();
      return;
    }

    const chip = this.createChip()(label);
    if (!chip) {
      return;
    }

    this.chips.update((chips) => [...chips, chip]);
    event.chipInput.clear();
    this.added.emit(chip);
  }
}
