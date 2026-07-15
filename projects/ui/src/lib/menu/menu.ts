import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  Directive,
  forwardRef,
  inject,
  input,
  output,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger, type MenuCloseReason } from '@angular/material/menu';

/**
 * Where the panel sits on the X axis relative to its trigger.
 *
 * Aliased from Material's own `MenuPositionX` rather than re-declared, so that a
 * change to the union upstream is a compile error here rather than a position this
 * component forwards and Material rejects.
 *
 *   - `after` — the panel's leading edge lines up with the trigger's. Material's
 *     own default, and this library's.
 *   - `before` — the panel's trailing edge lines up with the trigger's.
 *
 * Both are direction-aware: they flip sides under RTL.
 */
export type UiMenuPositionX = 'before' | 'after';

/**
 * Where the panel sits on the Y axis relative to its trigger. Aliased from
 * Material's own `MenuPositionY`, for the same reason as {@link UiMenuPositionX}.
 */
export type UiMenuPositionY = 'above' | 'below';

/**
 * Why the menu closed. Aliased from Material's own `MenuCloseReason`: `'click'` for
 * a click on the panel, `'keydown'` for Escape, `'tab'` for Tab, and `undefined`
 * for a programmatic close.
 */
export type UiMenuCloseReason = MenuCloseReason;

/**
 * One item in a {@link Menu}.
 *
 * `value` is what {@link Menu.itemSelected} carries back — deliberately not
 * constrained to a string, because a menu over a list of objects is the common
 * case, and forcing an id in and a lookup out is exactly the adapter this library
 * exists to remove.
 */
export interface UiMenuItem<T = unknown> {
  /** The text shown for the item. */
  label: string;

  /**
   * The name of a Material icon ligature shown before the label, e.g. `edit`.
   *
   * Rendered into `MatMenuItem`'s own icon slot, so it gets Material's size and
   * spacing. It is decoration — the {@link label} is what names the item — so it is
   * hidden from assistive tech rather than announced twice.
   *
   * For an icon that is not a Material ligature — an avatar, an inline SVG, a
   * status dot — project a {@link MenuItemDef} template instead.
   */
  icon?: string;

  /**
   * Whether this one item cannot be chosen, while the rest still can.
   *
   * Material keeps a disabled item in the panel, marked `aria-disabled` and skipped
   * by the arrow-key navigation, so the menu does not change shape when one of its
   * items turns off.
   */
  disabled?: boolean;

  /** What {@link Menu.itemSelected} carries when this item is chosen. */
  value: T;

  /**
   * Items shown in a sub-menu hanging off this one.
   *
   * An item with children is a *branch*: choosing it opens the sub-menu rather than
   * emitting, so its `value` is never selected. Nesting is unbounded, and each
   * level is a real `<mat-menu>`, so the submenu arrow, the open-on-hover, the
   * roving focus and the close-the-whole-stack behaviour are Material's.
   */
  children?: readonly UiMenuItem<T>[];
}

/** The context a `uiMenuItem` template is rendered with. */
export interface UiMenuItemContext<T = unknown> {
  /** The item being rendered — `let-item`. */
  $implicit: UiMenuItem<T>;
}

/**
 * Renders each item in the panel, in place of its `icon` and `label` (rule 7).
 *
 * The item is the template's implicit context, so an avatar, a shortcut hint, a
 * two-line item or a swatch is a template rather than a string input this component
 * would have to grow:
 *
 * ```html
 * <ui-menu [items]="actions()">
 *   <ng-template uiMenuItem let-item>
 *     <span class="label">{{ item.label }}</span>
 *     <kbd>{{ item.value.shortcut }}</kbd>
 *   </ng-template>
 * </ui-menu>
 * ```
 *
 * It renders *inside* Material's own `<button mat-menu-item>`, so the ripple, the
 * roving focus, the `menuitem` role and the disabled handling are untouched — and
 * it applies at every level of a nested menu, branches included.
 *
 * Note it replaces the item's icon as well as its label, and renders into the
 * item's text slot rather than Material's leading icon slot — that slot is matched
 * against the static template, so nothing rendered from an `ng-template` can land
 * in it. For a Material icon in the proper slot, use {@link UiMenuItem.icon} and
 * leave this alone; reach for this when the icon is not a Material ligature, and
 * size it yourself.
 */
@Directive({ selector: 'ng-template[uiMenuItem]' })
export class MenuItemDef<T = unknown> {
  /** The template itself, rendered by `menu.html`. @docs-private */
  readonly template = inject<TemplateRef<UiMenuItemContext<T>>>(TemplateRef);

  /**
   * Types `let-item` as the item, rather than as `any`. @docs-private
   *
   * The signature is Angular's, and the compiler is its only caller — the
   * parameters exist to be named in the type predicate and nowhere else, which is
   * exactly what `no-unused-vars` reports. There is no shape of this function that
   * both keeps the guard and satisfies the rule. The same shape as
   * `SelectOptionDef`'s.
   */
  static ngTemplateContextGuard<T>(
    directive: MenuItemDef<T>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is UiMenuItemContext<T> {
    return true;
  }
}

/** The class every panel this component renders carries, and `_menu.scss` hangs off. */
const ROOT_CLASS = 'ui-menu';

const toClassArray = (panelClass: string | readonly string[] | undefined): readonly string[] =>
  panelClass == null ? [] : Array.isArray(panelClass) ? panelClass : [panelClass as string];

/**
 * A themed Material menu: a `<mat-menu>` over the {@link UiMenuItem}s given to it.
 *
 * ```html
 * <button matButton uiButton [uiMenuTriggerFor]="actions">Actions</button>
 * <ui-menu #actions [items]="items" (itemSelected)="run($event.value)" />
 * ```
 *
 * Like `ui-tabs` and `ui-select`, and unlike `uiButton`, this is a component rather
 * than a directive: a menu owns *composition* — an overlay panel, the items in it,
 * and the sub-panels hanging off them. There is no single native element to
 * decorate; the panel does not exist in the page at all until a trigger opens it.
 *
 * The trigger, on the other hand, *does* decorate an existing element, so that half
 * is a directive — see `MenuTrigger`. `<ui-menu>` itself renders nothing where it
 * is written.
 *
 * ### Items are an input, not projected content
 *
 * `items` is the API rather than `<ng-content>`, because {@link itemSelected} is
 * only implementable if this component knows what each item *is*. A projected
 * `<button mat-menu-item>` would carry the consumer's own `(click)` — at which
 * point `itemSelected` has nothing to emit, and no menu is any better off for the
 * wrapper. The list is data here, exactly as `ui-select`'s `options` is, and for
 * the same reason.
 *
 * That is not a string-only API (rule 7). A {@link MenuItemDef} template renders an
 * item as anything a template can express, with the item as its context, and
 * `value` holds an object rather than an id. And projected content is still
 * accepted — it lands in the same panel, after the items — so a divider, a section
 * header or a `routerLink` item needs no fork of this component:
 *
 * ```html
 * <ui-menu #menu [items]="items" (itemSelected)="run($event.value)">
 *   <mat-divider />
 *   <a mat-menu-item routerLink="/settings">Settings</a>
 * </ui-menu>
 * ```
 *
 * ### It is Material, not a re-implementation
 *
 * The panel, its elevation and animation, the overlay and its backdrop, the
 * repositioning that keeps it on screen, the ripples, the roving focus, the
 * typeahead, the `menu`/`menuitem` roles, the Escape/Tab/arrow handling, the focus
 * restored to the trigger on close, and every colour are `<mat-menu>`'s and
 * `<button mat-menu-item>`'s own, resolved from the `--mat-sys-*` tokens that
 * `src/styles/_theme.scss` emits — so there is not a literal colour in
 * `src/styles/_menu.scss`, and a palette change there re-skins every menu in the
 * fleet, in light and dark alike.
 *
 * ### Sub-menus
 *
 * In scope, and they are data too: give an item {@link UiMenuItem.children} and it
 * becomes a branch that opens a nested panel instead of emitting. Nesting is
 * unbounded, and every level is a real `<mat-menu>`, so Material's own submenu
 * arrow, hover-to-open and focus management apply. A choice at any depth emits from
 * this one {@link itemSelected}, so a consumer listens in one place rather than per
 * level.
 *
 * ### Accessibility
 *
 * Material renders the `role="menu"` panel, and this component names it: pass
 * `aria-label` (or `aria-labelledby`) to say what the menu is *of* — `Order
 * actions`, not `Menu`. Each item is named by its own `label`; an `icon` is
 * decoration and is hidden from assistive tech, so it is never announced twice.
 *
 * ### Styling hooks
 *
 * The panel renders into the CDK overlay at the end of `<body>`, not where
 * `<ui-menu>` is written, so a hook set on the host would never reach it. These are
 * set on the panel itself, so an ordinary rule in a global stylesheet — narrowed
 * with a {@link panelClass} — reaches them with no `::ng-deep` (rules 2 and 6):
 *
 * - `--ui-menu-container-color` — the panel's background.
 * - `--ui-menu-item-label-color` / `--ui-menu-item-icon-color` — the item text and
 *   its icon.
 * - `--ui-menu-divider-color` — a projected `<mat-divider>`.
 * - `--ui-menu-shape` — the panel's corners.
 * - `--ui-menu-min-width` / `--ui-menu-max-width` — the panel's width bounds.
 *
 * ```html
 * <ui-menu #menu [items]="items" panelClass="danger-menu" />
 * ```
 * ```scss
 * .danger-menu { --ui-menu-item-label-color: var(--mat-sys-error); }
 * ```
 *
 * Point the colours at a `--mat-sys-*` / `--ui-sys-*` role rather than a literal,
 * so they survive a palette change and dark mode.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiMenu'` hands back the component, and {@link matMenu} hands back
 * Material's own instance — so `menu.matMenu()?.focusFirstItem()` needs no API here
 * (rule 4). To open or close the panel, reach for the trigger instead: that is what
 * owns the overlay.
 */
@Component({
  selector: 'ui-menu',
  exportAs: 'uiMenu',
  imports: [
    MatMenu,
    MatMenuItem,
    // For the *sub-menu* branches `menu.html` renders: a branch item triggers its
    // own nested panel. The trigger a consumer puts on their own button is
    // `MenuTrigger`, in `menu-trigger.ts`.
    MatMenuTrigger,
    MatIcon,
    NgTemplateOutlet,
    // This component renders itself, once per branch — see `menu.html`. The
    // `forwardRef` is because the class is not defined yet at the point its own
    // decorator is evaluated.
    forwardRef(() => Menu),
  ],
  templateUrl: './menu.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // The ARIA names are inputs here, aliased to the attributes a consumer already
    // knows how to spell — but `<ui-menu>` is not the element they describe.
    // Material renders the `role="menu"` panel into the overlay, and `menu.html`
    // puts them on it.
    //
    // Left behind on this host they would not merely be inert, they would be a real
    // violation: an ARIA name on an element with no role that renders nothing at
    // all. axe reports exactly that (`aria-prohibited-attr`), and it is right to —
    // so they are taken back off the DOM once Angular has read them into the
    // signals. `ui-select` does the same thing for the same reason, by hand in
    // `forwardAttributes()`; here a host binding is enough, because these three are
    // the only attributes this element has any business carrying.
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
  },
})
export class Menu<T = unknown> {
  /**
   * The items in the panel, in the order they are shown.
   *
   * Rendered as Material's own `<button mat-menu-item>` elements, so the ripple,
   * the roving focus and the typeahead are Material's. An item with
   * {@link UiMenuItem.children} becomes a sub-menu branch. To render an item as
   * something other than its icon and label, project a {@link MenuItemDef}
   * template — the list itself stays this input either way.
   */
  readonly items = input<readonly UiMenuItem<T>[]>([]);

  /**
   * The template that renders each item, as an input rather than as projected
   * content — the same job as a projected {@link MenuItemDef}, for a template that
   * comes from somewhere other than this menu's own content:
   *
   * ```html
   * <ng-template #row let-item>…</ng-template>
   * <ui-menu [items]="items" [itemTemplate]="row" />
   * ```
   *
   * A projected `<ng-template uiMenuItem>` is the shape to reach for by default;
   * this is what a sub-menu inherits its parent's template through, and it is here
   * because a template held in a variable should not have to be re-declared inside
   * every `<ui-menu>` that wants it. When both are given, this one wins.
   */
  readonly itemTemplate = input<TemplateRef<UiMenuItemContext<T>> | null>(null);

  /**
   * Emits the item a user chose, at any depth.
   *
   * A branch — an item with {@link UiMenuItem.children} — never emits: choosing it
   * opens its sub-menu. Neither does a disabled item.
   *
   * The whole item is emitted rather than just its `value`, because the label is
   * usually what a confirmation or an undo toast needs to say, and re-finding the
   * item from its value is a lookup a consumer should not have to write. Take
   * `$event.value` for the value alone.
   */
  readonly itemSelected = output<UiMenuItem<T>>();

  /**
   * Emits when the panel closes, with Material's own reason — `'click'`,
   * `'keydown'` (Escape), `'tab'`, or `undefined` for a programmatic close.
   *
   * Material's own `closed`, forwarded. For the moment a menu *opens*, listen to
   * the trigger's `menuOpened`: the trigger owns the overlay.
   */
  readonly closed = output<UiMenuCloseReason>();

  /**
   * Where the panel sits on the X axis. Defaults to Material's `after`.
   *
   * Direction-aware: `after` is to the right under LTR and to the left under RTL.
   */
  readonly xPosition = input<UiMenuPositionX>('after');

  /** Where the panel sits on the Y axis. Defaults to Material's `below`. */
  readonly yPosition = input<UiMenuPositionY>('below');

  /**
   * Whether the panel is allowed to cover its trigger.
   *
   * `false` by default, which is the one place this component departs from
   * Material — whose own default is `true`. A menu that covers the button a user
   * just pointed at hides it, and M3's menu spec anchors the panel below its
   * trigger. Set it to `true` for the select-like case where the panel is meant to
   * sit over the field.
   */
  readonly overlapTrigger = input(false, { transform: booleanAttribute });

  /**
   * Whether the overlay lays a backdrop over the page — which is what catches the
   * click that closes the menu.
   *
   * Material's own default is kept when this is unset: `true` for a top-level menu,
   * `false` for a sub-menu, which is why this is `undefined` rather than `false`
   * here. Setting it is rarely right — without a backdrop the menu stays open when
   * a user clicks away.
   */
  readonly hasBackdrop = input<boolean | undefined, unknown>(undefined, {
    transform: (value) => (value == null ? undefined : booleanAttribute(value)),
  });

  /**
   * Classes for the panel Material renders into the overlay — which is where the
   * `--ui-menu-*` hooks are set, the overlay being nowhere near the host.
   *
   * Material's own `panelClass` is not forwarded directly, because `.ui-menu` is
   * what carries this library's theme: a consumer's class has to be *added* to it
   * rather than replace it (rule 4). Theirs come last, so their rules win on equal
   * specificity — the same merge `uiTooltip` and `Snackbar` do.
   */
  readonly panelClass = input<string | readonly string[]>([]);

  /** The class on the overlay's backdrop — Material's own `backdropClass`, forwarded. */
  readonly backdropClass = input<string>('');

  /**
   * The panel's accessible name, spelled as the ARIA attribute — what the menu is
   * *of*, e.g. `Order actions`.
   *
   * An input rather than an attribute left on the host, because the host is not the
   * element with `role="menu"`: Material renders that one into the overlay, and this
   * is put on it.
   */
  readonly ariaLabel = input<string | undefined, unknown>(undefined, {
    alias: 'aria-label',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The id of the element naming the panel — for a menu named by something already
   * on the page. Material prefers this over {@link ariaLabel}.
   */
  readonly ariaLabelledby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-labelledby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /** The ids of elements describing the panel, spelled as the ARIA attribute. */
  readonly ariaDescribedby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-describedby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The `MatMenu` this component renders — the escape hatch for anything not
   * wrapped here (rule 4), e.g. `menu.matMenu()?.focusFirstItem()`. Reach it with
   * `#menu="uiMenu"`.
   *
   * Not `viewChild.required`, unlike `ui-tabs`' `matTabGroup`, because
   * `MenuTrigger` reads it from an effect that can run before this component's view
   * queries have resolved — a parent's view effects flush before its child
   * components are refreshed — and a required query *throws* when read that early
   * rather than reporting `undefined`. From a consumer's point of view it is always
   * there: it resolves before the first paint, and the panel cannot open until a
   * trigger has one.
   */
  readonly matMenu = viewChild(MatMenu);

  /** A projected `uiMenuItem` template, when a consumer gives one. @docs-private */
  protected readonly itemDef = contentChild(MenuItemDef<T>);

  /**
   * The template each item renders through, from either route — or `null` for
   * Material's own icon-and-label rendering. Passed down to every sub-menu, so a
   * custom item looks the same at every depth. @docs-private
   */
  protected readonly activeItemTemplate = computed(
    () => this.itemTemplate() ?? this.itemDef()?.template ?? null,
  );

  /**
   * The classes handed to every panel this component renders, the nested ones
   * included: `.ui-menu` first, so a consumer's rules win on equal specificity.
   *
   * A space-separated string because that is what Material's `panelClass` setter
   * splits — it is aliased to `class`, which is how `menu.html` binds it.
   */
  protected readonly panelClasses = computed(() =>
    [ROOT_CLASS, ...toClassArray(this.panelClass())].join(' '),
  );

  /**
   * Emits a chosen item, for the two kinds of item that must not emit.
   *
   * A branch opens its sub-menu instead — Material stops the click's propagation
   * for a submenu trigger, but a `(click)` bound on that same element still runs,
   * so "it is a branch" has to be decided here rather than by not binding.
   *
   * The disabled guard is belt and braces: Material renders a disabled item as a
   * real `<button disabled>`, which the browser never fires a click on. It stays
   * because "no click" is the browser's promise about a `<button>` specifically,
   * and this template could grow an `<a>` item — where `disabled` is not a native
   * attribute and the browser makes no such promise — without anyone rereading this
   * method.
   */
  protected select(item: UiMenuItem<T>): void {
    if (item.disabled || item.children?.length) {
      return;
    }
    this.itemSelected.emit(item);
  }
}
