import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  Directive,
  effect,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import {
  MatList,
  MatListItem,
  MatListItemAvatar,
  MatListItemIcon,
  MatListItemLine,
  MatListItemTitle,
  MatListOption,
  MatSelectionList,
  type MatListOptionTogglePosition,
  type MatSelectionListChange,
} from '@angular/material/list';

/**
 * One row in a {@link List}.
 *
 * `value` is what the list's selection carries — deliberately not constrained to a
 * string, because a list over people, files or filters is the common case, and forcing
 * an id in and a lookup out is exactly the adapter this library exists to remove.
 */
export interface UiListItem<T = unknown> {
  /** The row's primary text, and the name assistive tech announces for it. */
  label: string;

  /**
   * A second line of quieter text under the `label` — an email under a name, a path
   * under a filename.
   *
   * Giving it is what makes the row two-line: Material infers a row's height from the
   * lines actually rendered, so a list where only some rows have one is a list of mixed
   * heights, which is rarely what anyone wants. Give it for every row or for none.
   */
  sublabel?: string;

  /**
   * A Material icon *name* for the row's leading slot, e.g. `folder`.
   *
   * The convenience shape, for the common case. For anything an icon name cannot
   * spell — an avatar image, a status dot, a letter tile — project a
   * {@link ListItemAvatarDef} or {@link ListItemIconDef} template instead; either takes
   * the same slot and wins over this.
   */
  icon?: string;

  /**
   * Whether this one row cannot be chosen, while the rest still can.
   *
   * For a list where *nothing* can be chosen, disable the list itself — see
   * {@link List.disabled}.
   */
  disabled?: boolean;

  /** What the list's selection holds for this row. */
  value: T;
}

/**
 * Which side of the row a `selectable` list's checkbox or radio sits on. Aliased from
 * Material's own `MatListOptionTogglePosition` rather than re-declared, so that a
 * change to the union upstream is a compile error here rather than a value this
 * component forwards and `MatListOption` throws on.
 */
export type UiListTogglePosition = MatListOptionTogglePosition;

/**
 * How a value is judged to be an item's, for the case where the two are not the same
 * *instance* — a selection restored from a server response, say. Aliased from
 * `MatSelectionList.compareWith`.
 */
export type UiListCompareWith<T = unknown> = (o1: T, o2: T) => boolean;

/** What {@link List.selectionChange} carries. */
export interface UiListSelectionChange<T = unknown> {
  /**
   * The whole selection, as {@link List.value} now holds it: an array when `multiple`,
   * the single value or `null` otherwise.
   */
  value: T | readonly T[] | null;

  /** Every currently selected item — the rows themselves, whole, rather than their values. */
  selected: readonly UiListItem<T>[];

  /**
   * Only the rows whose selected state changed in *this* interaction — Material's own
   * `MatSelectionListChange.options`, mapped back to items.
   *
   * This is what "the row the user just touched" is, and what an undo toast names. Note
   * that a single-select change reports the row that was deselected alongside the one
   * that was chosen.
   */
  changed: readonly UiListItem<T>[];
}

/** The context every `ui-list` slot template is rendered with. */
export interface UiListItemContext<T = unknown> {
  /** The item being rendered — `let-item`. */
  $implicit: UiListItem<T>;

  /** Its position in `items` — `let-index="index"`. */
  index: number;

  /** Whether the item is currently selected — `let-selected="selected"`. */
  selected: boolean;
}

/**
 * Material's own default, and the one this component keeps: a value is an item's when
 * it is the same value.
 */
function defaultCompareWith<T>(o1: T, o2: T): boolean {
  return o1 === o2;
}

/**
 * Types `let-item`, `let-index` and `let-selected` on a slot template, rather than
 * leaving them `any`. @docs-private
 *
 * The signature is Angular's, and the compiler is its only caller — the parameters
 * exist to be named in the type predicate and nowhere else, which is exactly what
 * `no-unused-vars` reports. There is no shape of this function that both keeps the
 * guard and satisfies the rule; `ChipDef` and `SelectOptionDef` carry the same one for
 * the same reason. It is shared by the four slots below because their context is one
 * type — the row — rather than four.
 */
function itemContextGuard<T>(
  directive: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: unknown,
): context is UiListItemContext<T> {
  return true;
}

/**
 * Renders each row's leading slot as an avatar (rule 7).
 *
 * The item is the template's implicit context, so a photo, an initial tile or a status
 * dot is a template rather than a string input this component would have to grow:
 *
 * ```html
 * <ui-list [items]="people()">
 *   <ng-template uiListItemAvatar let-item>
 *     <img [src]="item.value.photo" alt="" />
 *   </ng-template>
 * </ui-list>
 * ```
 *
 * It renders inside Material's own `matListItemAvatar` slot, so the round 40px frame,
 * the spacing and the row height are Material's. It is the same slot
 * {@link ListItemIconDef} and {@link UiListItem.icon} use — an avatar wins over both.
 */
@Directive({ selector: 'ng-template[uiListItemAvatar]' })
export class ListItemAvatarDef<T = unknown> {
  /** The template itself, rendered by `list.html`. @docs-private */
  readonly template = inject<TemplateRef<UiListItemContext<T>>>(TemplateRef);

  /** @docs-private */
  static readonly ngTemplateContextGuard = itemContextGuard;
}

/**
 * Renders each row's leading slot as an icon (rule 7) — for an icon
 * {@link UiListItem.icon}'s name cannot spell: one that depends on the row's state, a
 * coloured glyph, an inline SVG.
 *
 * ```html
 * <ui-list [items]="files()">
 *   <ng-template uiListItemIcon let-item>
 *     <mat-icon [class.stale]="item.value.stale">description</mat-icon>
 *   </ng-template>
 * </ui-list>
 * ```
 *
 * It renders inside Material's own `matListItemIcon` slot, so the 24px sizing and the
 * spacing are Material's. A projected {@link ListItemAvatarDef} takes the same slot and
 * wins over this; this in turn wins over `item.icon`.
 */
@Directive({ selector: 'ng-template[uiListItemIcon]' })
export class ListItemIconDef<T = unknown> {
  /** The template itself, rendered by `list.html`. @docs-private */
  readonly template = inject<TemplateRef<UiListItemContext<T>>>(TemplateRef);

  /** @docs-private */
  static readonly ngTemplateContextGuard = itemContextGuard;
}

/**
 * Renders each row's first line, in place of {@link UiListItem.label} (rule 7).
 *
 * It renders inside Material's own `matListItemTitle`, which is the line that never
 * wraps and is the row's accessible name — so keep it text, and put a badge or a count
 * beside it rather than in place of it.
 */
@Directive({ selector: 'ng-template[uiListItemTitle]' })
export class ListItemTitleDef<T = unknown> {
  /** The template itself, rendered by `list.html`. @docs-private */
  readonly template = inject<TemplateRef<UiListItemContext<T>>>(TemplateRef);

  /** @docs-private */
  static readonly ngTemplateContextGuard = itemContextGuard;
}

/**
 * Renders each row's second line, in place of {@link UiListItem.sublabel} (rule 7).
 *
 * It renders inside Material's own `matListItemLine`, so the quieter
 * `on-surface-variant` type and the two-line row height are Material's.
 *
 * Note this decides the *rendering*, not whether there is a line at all: a row with no
 * `sublabel` renders no second line, template or not, so that a list does not silently
 * become two-line for rows with nothing to say. Give every item a `sublabel` — an empty
 * string is enough — for a list that is two-line throughout.
 */
@Directive({ selector: 'ng-template[uiListItemLine]' })
export class ListItemLineDef<T = unknown> {
  /** The template itself, rendered by `list.html`. @docs-private */
  readonly template = inject<TemplateRef<UiListItemContext<T>>>(TemplateRef);

  /** @docs-private */
  static readonly ngTemplateContextGuard = itemContextGuard;
}

/**
 * A themed Material list: the {@link UiListItem}s given to it, optionally selectable.
 *
 * ```html
 * <ui-list [items]="files()" aria-label="Files" />
 *
 * <ui-list selectable [items]="views()" [(value)]="view" aria-label="View" />
 *
 * <ui-list selectable multiple [items]="tags()" [(ngModel)]="picked" aria-label="Tags" />
 * ```
 *
 * Like `ui-select` and `ui-chips`, and unlike `uiButton`, this is a component rather
 * than a directive: a list owns *composition* — a container, a row per item, the lines
 * inside each row, a leading avatar or icon, and (when `selectable`) the checkbox or
 * radio that makes the row an option. There is no single native element to decorate.
 *
 * ### It is Material, not a re-implementation
 *
 * The rows and their heights, the ripple and state layers, the roving tabindex and the
 * arrow keys across the list, the typeahead, the checkbox and radio indicators, the
 * `listbox`/`option` roles a selectable list takes and the `list`/`listitem` ones a
 * static list takes, and every colour and font are `<mat-list>`'s,
 * `<mat-selection-list>`'s, `<mat-list-item>`'s and `<mat-list-option>`'s own, resolved
 * from the `--mat-sys-*` tokens that `src/styles/_theme.scss` emits — so there is not a
 * literal colour in `list.scss`, and a palette change there re-skins every list in the
 * fleet, in light and dark alike.
 *
 * What this adds is the slots below, and state that is *signals* rather than a widget
 * holding its own.
 *
 * ### The two shapes it takes
 *
 * {@link selectable} decides which of Material's two list containers is rendered,
 * because they are different widgets rather than one with a switch:
 *
 *   - Without it, a `<mat-list role="list">` of `<mat-list-item role="listitem">` —
 *     content, which is what a list of details on a card is. It is not focusable and
 *     emits nothing: nothing is being chosen.
 *   - With it, a `<mat-selection-list role="listbox">` of
 *     `<mat-list-option role="option">` — Material's own selection list, with the
 *     keyboard, the indicators and the roles that come with it.
 *
 * {@link multiple} then decides whether that listbox takes one row or many, and
 * therefore whether its indicator is a radio or a checkbox. Material reads it as the
 * list initialises and throws if it changes afterwards — like `<select multiple>`, it
 * is what the control *is* rather than a state it moves between.
 *
 * ### State and forms
 *
 * {@link value} is a `model` (rule 5): `[(value)]` is the no-forms shape, and
 * {@link selectionChange} is the *event* beside it — what to save, what to log — rather
 * than the way to keep the value up to date.
 *
 * `ui-list` is also a `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]` and
 * `formControlName` work with no adapter (rule 5) — bind the host, not the list inside
 * it. The value is the chosen row's `value`, an array of them when `multiple` (always
 * an array, empty rather than `null` when nothing is chosen). For a value that is not
 * the same *instance* as the one in `items`, see {@link compareWith}.
 *
 * A list that is not `selectable` holds no selection, so a form bound to one has
 * nothing to read and writing to it changes nothing on screen.
 *
 * ### Slots
 *
 * Each row's parts are `ng-template`s rather than string inputs (rule 7), and each is
 * handed the item, its index and whether it is selected: {@link ListItemAvatarDef},
 * {@link ListItemIconDef}, {@link ListItemTitleDef} and {@link ListItemLineDef}. They
 * render *inside* Material's own slots, so the row's structure, height and keyboard
 * stay Material's. The leading slot resolves in one order: an avatar template, else an
 * icon template, else {@link UiListItem.icon}.
 *
 * ### Accessibility
 *
 * Name the list with `aria-label` (or `aria-labelledby`) — say what the rows *are*
 * (`Files`), not that they are a list. The name is put on Material's own container
 * inside this component, which is the element with the role.
 *
 * ### Styling hooks
 *
 * - `--ui-list-item-container-color` — a row's fill.
 * - `--ui-list-selected-container-color` — a selected row's fill.
 * - `--ui-list-item-shape` — a row's corners.
 * - `--ui-list-label-text-color` / `--ui-list-supporting-text-color` — the two lines.
 * - `--ui-list-leading-icon-color` / `--ui-list-leading-avatar-color` — the leading slot.
 *
 * All are read off `<ui-list>`, so a consumer sets them from an ordinary rule on an
 * ordinary selector (`ui-list { --ui-list-item-shape: … }`) — no `::ng-deep`, no
 * `!important` (rules 2 and 6). Point a colour at a `--mat-sys-*` / `--ui-sys-*` role
 * rather than a literal, so it survives a palette change and dark mode.
 *
 * The row's height is deliberately not a hook: it is Material's density token, and
 * density is a fleet-wide decision `_theme.scss` owns.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiList'` hands back the component, and {@link matList} /
 * {@link matSelectionList} hand back Material's own instances — so
 * `list.matSelectionList()?.selectAll()` or `.focus()` needs no API here (rule 4).
 *
 * A selection made that way is still a selection: `selectAll()` and `deselectAll()`
 * write {@link value} like a click does, so the escape hatch cannot leave this
 * component's state disagreeing with the screen. They do not emit
 * {@link selectionChange} — Material raises that for a user's own doing, and code that
 * called `selectAll()` already knows it did.
 */
@Component({
  selector: 'ui-list',
  exportAs: 'uiList',
  imports: [
    MatList,
    MatListItem,
    MatSelectionList,
    MatListOption,
    MatListItemAvatar,
    MatListItemIcon,
    MatListItemLine,
    MatListItemTitle,
    MatIcon,
    NgTemplateOutlet,
  ],
  templateUrl: './list.html',
  styleUrl: './list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    // The forms API resolves this off the element the directive sits on, so it is what
    // makes `<ui-list [(ngModel)]>` bind the host rather than leaving a consumer to
    // reach for the selection list inside it.
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => List), multi: true },
  ],
  host: {
    // The ARIA names are inputs here, aliased to the attributes a consumer already
    // knows how to spell — but `<ui-list>` is not the element they describe. The
    // `list` / `listbox` is Material's container inside this component, and `list.html`
    // puts them on it.
    //
    // Left behind on this host they would not merely be inert, they would be a real
    // violation: an ARIA name on an element with no role. axe reports exactly that
    // (`aria-prohibited-attr`), and it is right to — so they are taken back off the DOM
    // once Angular has read them into the signals, as `ui-chips` does.
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
  },
})
export class List<T = unknown> implements ControlValueAccessor {
  /**
   * The rows, in the order they are shown.
   *
   * Rendered as Material's own `<mat-list-item>` (or `<mat-list-option>`), so the row
   * structure, the keyboard and the indicators are Material's. To render a row's parts
   * as something other than its strings, project the slot templates — the list itself
   * stays this input either way.
   */
  readonly items = input<readonly UiListItem<T>[]>([]);

  /**
   * Whether rows can be chosen, which renders Material's `<mat-selection-list>` rather
   * than a plain `<mat-list>` — a `listbox` of `option`s rather than a `list` of
   * `listitem`s.
   *
   * Off by default: a list is content until someone says it is a control.
   */
  readonly selectable = input(false, { transform: booleanAttribute });

  /**
   * Whether more than one row can be chosen, which makes {@link value} an array and
   * gives every row a checkbox rather than a radio. Only meaningful on a
   * {@link selectable} list.
   *
   * Material reads this as the list initialises and throws if it changes afterwards:
   * like `<select multiple>`, it is what the control *is* rather than a state it moves
   * between.
   */
  readonly multiple = input(false, { transform: booleanAttribute });

  /**
   * Whether the whole list is inert: no row can be chosen, and none is in the tab
   * order.
   *
   * The rows are still shown, and still read out — a disabled list is one a user cannot
   * change, not one they cannot see. A reactive form's own `disable()` drives this too,
   * through `setDisabledState`, and either one is enough — so a
   * `FormControl({disabled: true})` needs nothing here, and this input still works on a
   * list with no form at all.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * The chosen value, two-way and independent of the forms API.
   *
   * `[(value)]` is the no-forms shape (rule 5): a view switcher, a filter — anywhere
   * `[(ngModel)]` would be a directive dragged in for one binding. It stays in step
   * when a form is bound, because both write the same signal.
   *
   * An array in `multiple` mode; `null` when a single-select list has nothing chosen.
   */
  readonly value = model<T | readonly T[] | null>(null);

  /**
   * Which side of the row the checkbox or radio sits on. Defaults to Material's
   * `after` — the indicator trails the text, which leaves the leading slot for an
   * avatar or an icon.
   */
  readonly togglePosition = input<UiListTogglePosition>('after');

  /**
   * Whether the radio on a single-select list's rows is hidden, leaving the chosen row
   * marked by its fill alone.
   *
   * Material's own switch, forwarded — for the list of *views* rather than of choices,
   * where a column of radios reads as a form.
   */
  readonly hideSingleSelectionIndicator = input(false, { transform: booleanAttribute });

  /**
   * How a value is matched to an item, for when the value is an object that is not the
   * same *instance* as the one in `items` — a selection restored from a server
   * response, say, where the default `===` would leave the list looking empty.
   *
   * ```ts
   * protected readonly byId = (a: File, b: File) => a?.id === b?.id;
   * ```
   */
  readonly compareWith = input<UiListCompareWith<T>>(defaultCompareWith);

  /**
   * The list's accessible name, spelled as the ARIA attribute — what the rows *are*,
   * e.g. `Files`.
   *
   * An input rather than an attribute left on the host, because the host is not the
   * element with the role: Material's `list` / `listbox` is inside this component, and
   * this is put on it.
   */
  readonly ariaLabel = input<string | undefined, unknown>(undefined, {
    alias: 'aria-label',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The id of the element naming the list — for rows named by a heading already on the
   * page. Preferred over {@link ariaLabel} where one exists.
   */
  readonly ariaLabelledby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-labelledby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * Emits when a *user* changes the selection, after {@link value} has been written —
   * so a consumer reading `value()` from inside it sees the new selection.
   *
   * A selection written from code is the consumer's own state arriving, so it is not
   * echoed back here. Only a `selectable` list ever emits.
   */
  readonly selectionChange = output<UiListSelectionChange<T>>();

  /**
   * The `MatList` a static list renders, or `undefined` for a selectable one — the
   * escape hatch for Material's own API (rule 4), e.g. `disableRipple`.
   */
  readonly matList = viewChild(MatList);

  /**
   * The `MatSelectionList` a selectable list renders, or `undefined` for a static one —
   * the escape hatch for the control (rule 4), e.g. `list.matSelectionList()?.focus()`
   * or `.selectAll()`.
   */
  readonly matSelectionList = viewChild(MatSelectionList);

  /** The chosen value as an array, whether or not the list is `multiple`. */
  readonly selectedValues = computed<readonly T[]>(() => {
    const value = this.value();
    if (value == null) {
      return [];
    }
    return Array.isArray(value) ? (value as readonly T[]) : [value as T];
  });

  /**
   * The chosen items — the rows whose `value` the list holds, matched under
   * {@link compareWith} rather than `===`, so that an object value compared by id still
   * finds its row.
   */
  readonly selectedItems = computed<readonly UiListItem<T>[]>(() =>
    this.itemsFor(this.selectedValues()),
  );

  /** Whether a reactive form has disabled this control — see `setDisabledState`. */
  private readonly disabledByForm = signal(false);

  /**
   * Whether the list is disabled by either route.
   *
   * The two are independent on purpose: a form disabling a control must not silently
   * un-set a `disabled` a template wrote, and vice versa.
   */
  protected readonly isDisabled = computed(() => this.disabled() || this.disabledByForm());

  protected readonly avatarDef = contentChild(ListItemAvatarDef<T>);
  protected readonly iconDef = contentChild(ListItemIconDef<T>);
  protected readonly titleDef = contentChild(ListItemTitleDef<T>);
  protected readonly lineDef = contentChild(ListItemLineDef<T>);

  private onChange: (value: T | readonly T[] | null) => void = () => {
    // Replaced by `registerOnChange` when a forms directive binds this control. Until
    // then there is nobody to report a change to — a list with `[(value)]` and no form
    // is a supported shape, not a mistake.
  };

  private onTouched: () => void = () => {
    // Replaced by `registerOnTouched`, for the same reason as `onChange`.
  };

  constructor() {
    // The selection is `value`, and Material's list is told what it is — rather than
    // each row being bound to `[selected]` and the value inferred back from the rows.
    //
    // `MatSelectionList` is a `ControlValueAccessor` of its own, so this is the pair it
    // is built to be driven by, and it is what `writeValue`'s docs mean: the whole
    // selection lands in one call, atomically. A `[selected]` per row would instead
    // apply the value one row at a time, and Material reports every intermediate state
    // — so a two-row selection would be reported back as a one-row one mid-render, and
    // the value would clobber itself.
    //
    // `items()` is read so that the value is re-applied when the rows change: a row
    // that appears for an already-chosen value has to come up selected.
    effect(() => {
      const list = this.matSelectionList();
      this.items();
      // `writeValue`'s parameter is typed `string[]`, which its own implementation does
      // not mean: it matches with `compareWith`, and `MatListOption.value` is `any` — a
      // selection list over objects is Material's own documented case. The cast is that
      // signature being narrower than the method, not a value of the wrong shape.
      list?.writeValue(this.selectedValues() as unknown as string[]);
    });

    // The other half: everything Material does to the selection reports back here.
    // This is `MatSelectionList._reportValueChange`, which a click, the keyboard's
    // select-all *and* an imperative `selectAll()` through the escape hatch all reach —
    // so `value` cannot drift from what is on screen, whichever of them moved it. Note
    // Material's own `selectionChange` covers only the first two, which is why it is
    // not what this listens to.
    //
    // It does not echo `writeValue` above: that applies the selection with
    // `_setSelected`, which deliberately does not report.
    effect(() => {
      this.matSelectionList()?.registerOnChange((values: T[]) =>
        this.handleListValueChange(values),
      );
    });
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

  /** Whether an item is in the current selection, under {@link compareWith}. @docs-private */
  protected isSelected(item: UiListItem<T>): boolean {
    const compare = this.compareWith();
    return this.selectedValues().some((value) => compare(item.value, value));
  }

  /** The context handed to every slot template for a row. @docs-private */
  protected contextFor(item: UiListItem<T>, index: number): UiListItemContext<T> {
    return { $implicit: item, index, selected: this.isSelected(item) };
  }

  /**
   * Records a selection Material made — see the constructor for who calls this.
   *
   * The values arrive in row order rather than in the order they were chosen, because
   * they are read off the rows; that is Material's shape, and the one a list's value
   * should have.
   */
  private handleListValueChange(values: readonly T[]): void {
    const value = this.multiple() ? [...values] : (values[0] ?? null);

    this.value.set(value);
    this.onChange(value);
  }

  /**
   * Reports what a *user* just did.
   *
   * `value` has already been written by the time this runs — Material reports the value
   * change before it raises this event — so the emitted selection is read straight off
   * this component's own state rather than rebuilt from the event. The event's own
   * `options` are the one thing only it knows: what changed, as opposed to what is now
   * chosen.
   */
  protected handleSelectionChange(event: MatSelectionListChange): void {
    this.selectionChange.emit({
      value: this.value(),
      selected: this.selectedItems(),
      changed: this.itemsFor(event.options.map((option) => option.value as T)),
    });
  }

  /** Reports touched when focus leaves the list, for a form waiting on it. */
  protected handleFocusout(): void {
    this.onTouched();
  }

  /** The items holding any of the given values, under {@link compareWith}. */
  private itemsFor(values: readonly T[]): readonly UiListItem<T>[] {
    const compare = this.compareWith();
    return this.items().filter((item) => values.some((value) => compare(item.value, value)));
  }

  /**
   * Squares what a form may hold with what the list's mode accepts.
   *
   * A multiple list's value is an array — always, and empty rather than `null` when
   * nothing is chosen, because `reset()` writes `null` and the rows would otherwise be
   * matched against a value of the wrong shape for the mode they are in. A lone value
   * written to a multiple list is read as an array of one, which is what a form patched
   * with a single value plainly means.
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
}
