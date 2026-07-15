import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  contentChild,
  Directive,
  input,
  viewChild,
} from '@angular/core';
import { MatToolbar } from '@angular/material/toolbar';

/**
 * Semantic colour role of the toolbar's container.
 *
 * Material's own `color` input is an M2-only API and does nothing under an M3
 * theme (see `@angular/material/toolbar`: "This API is supported in M2 themes
 * only"), so these are resolved in `toolbar.scss` via `mat.toolbar-overrides()`
 * against the M3 system tokens that `src/styles/_theme.scss` emits:
 *
 *   - `surface` — the theme's `surface` / `on-surface` pair. Material's own
 *     default, and this library's: M3 puts a top app bar on the page's surface
 *     rather than on a colour, and keeps the bold role for emphasis.
 *   - `primary` — the theme's `primary` / `on-primary` pair, for a bar meant to
 *     read as a branded band across the top of the page.
 */
export type UiToolbarColor = 'surface' | 'primary';

/**
 * Marks an element for the toolbar's leading slot — what sits before the title: a
 * menu or back button, a logo.
 *
 * Mark each element rather than a wrapper around them: the slot is a flex row, so
 * the marked elements have to be its direct children for its spacing to apply to
 * them. `ng-content select` only matches the direct children of `<ui-toolbar>`
 * either way, so a marker nested any deeper is never projected here.
 *
 * ```html
 * <button matIconButton uiToolbarStart aria-label="Open the menu">
 *   <mat-icon>menu</mat-icon>
 * </button>
 * ```
 */
@Directive({ selector: '[uiToolbarStart]' })
export class ToolbarStart {}

/**
 * Marks an element for the toolbar's title slot.
 *
 * Optional: anything projected into `<ui-toolbar>` without a slot marker lands
 * here too, so the everyday case needs no marker at all. Reach for it when the
 * title is written *after* a trailing action in the source and should be in the
 * title slot regardless — projection follows this component's template, not the
 * consumer's source order.
 *
 * The slot is inside Material's own toolbar, so a heading in it takes the theme's
 * `title-large` type from `<mat-toolbar>`'s own rule with no help from here.
 *
 * ```html
 * <h1 uiToolbarTitle>Orders</h1>
 * ```
 */
@Directive({ selector: '[uiToolbarTitle]' })
export class ToolbarTitle {}

/**
 * Marks an element for the toolbar's trailing slot — the actions at the far end.
 *
 * Mark each action rather than a wrapper around them, for the same reason as
 * {@link ToolbarStart}.
 *
 * ```html
 * <button matIconButton uiToolbarEnd aria-label="Search"><mat-icon>search</mat-icon></button>
 * <button matButton uiToolbarEnd>Sign out</button>
 * ```
 */
@Directive({ selector: '[uiToolbarEnd]' })
export class ToolbarEnd {}

/**
 * A themed Material toolbar: a leading slot, a title, and trailing actions.
 *
 * ```html
 * <ui-toolbar color="primary">
 *   <button matIconButton uiToolbarStart aria-label="Open the menu">
 *     <mat-icon>menu</mat-icon>
 *   </button>
 *   <h1>Orders</h1>
 *   <button matIconButton uiToolbarEnd aria-label="Search"><mat-icon>search</mat-icon></button>
 * </ui-toolbar>
 * ```
 *
 * Like `ui-card` and unlike `uiButton`, this is a component rather than a
 * directive: a toolbar owns *composition* — three regions, in a fixed order, with
 * the title taking whatever space the actions do not. There is no native element
 * to decorate; HTML has no `<toolbar>`.
 *
 * ### It is Material, not a re-implementation
 *
 * The container, its height, its type scale and its colours are `<mat-toolbar>`'s
 * own, resolved from the `--mat-sys-*` tokens that `src/styles/_theme.scss`
 * emits — so there is not a literal colour in `toolbar.scss`, and a palette change
 * there re-skins every toolbar in the fleet, in light and dark alike. This
 * component owns only the three regions' layout and the hooks below.
 *
 * ### Slots
 *
 * Mark the leading and trailing elements with `uiToolbarStart` / `uiToolbarEnd`;
 * everything else lands in the title slot in the middle, so the everyday
 * `<ui-toolbar><h1>Orders</h1></ui-toolbar>` needs no marker. The title slot takes
 * all the space the other two do not, which is what holds the trailing actions
 * against the far end — including on a bar with no title at all. A slot with
 * nothing in it renders nothing, so an actions-only toolbar has no empty box where
 * the leading slot would have been.
 *
 * ### Accessibility
 *
 * No role is imposed, which is Material's own choice for `<mat-toolbar>` and the
 * honest one: what this bar *is* depends on what a consumer puts in it, and
 * `role="toolbar"` carries a keyboard contract — arrow keys moving between the
 * controls over a roving `tabindex` — that this component does not implement and
 * cannot implement for projected content it does not own.
 *
 * So say what it is, at the call site. The host is a real element, so the
 * attributes reach it with no forwarding (rule 3):
 *
 * ```html
 * <!-- A page's top app bar is a banner, not a group of controls. -->
 * <header><ui-toolbar><h1>Orders</h1></ui-toolbar></header>
 *
 * <!-- A genuine toolbar of controls: name it, and own the roving tabindex. -->
 * <ui-toolbar role="toolbar" aria-label="Selected orders"> … </ui-toolbar>
 * ```
 *
 * Either way, give every icon button an `aria-label`: an icon is not a name.
 *
 * ### Styling hooks
 *
 * - `--ui-toolbar-background-color` / `--ui-toolbar-text-color` — the container
 *   and what sits on it; {@link color}'s roles are the defaults.
 * - `--ui-toolbar-icon-color` — the icon buttons in the slots. Defaults to the
 *   toolbar's own text colour.
 * - `--ui-toolbar-height` / `--ui-toolbar-mobile-height` — the row's height, above
 *   and below Material's 599px breakpoint. {@link dense} moves both.
 * - `--ui-toolbar-padding` — the inline padding. Material's `16px` by default.
 * - `--ui-toolbar-gap` — the space between the elements within a slot.
 *
 * All are read off `<ui-toolbar>`, so a consumer sets them from an ordinary rule
 * (`ui-toolbar { --ui-toolbar-gap: 1rem; }`) with no `::ng-deep`. Point the
 * colours at another `--mat-sys-*` role rather than a literal, so they survive a
 * palette change and dark mode.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiToolbar'` hands back the component, and {@link matToolbar} hands
 * back Material's own instance (rule 4).
 */
@Component({
  selector: 'ui-toolbar',
  exportAs: 'uiToolbar',
  imports: [MatToolbar],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // No `role` here on purpose — see the accessibility note above: `role="toolbar"`
    // promises arrow-key navigation over a roving `tabindex`, and a role is a
    // promise this component cannot keep for controls a consumer projects into it.
    // The host is a real element, so a consumer's own `role` and `aria-label` land
    // on it with no forwarding.
    //
    // `surface` is the default, so it needs no marker class: an untouched toolbar
    // ships zero extra CSS.
    '[class.ui-toolbar--primary]': 'color() === "primary"',
    '[class.ui-toolbar--dense]': 'dense()',
  },
})
export class Toolbar {
  /**
   * Semantic colour role of the container. Defaults to `surface`, as M3 and
   * Material do — see {@link UiToolbarColor}.
   */
  readonly color = input<UiToolbarColor>('surface');

  /**
   * Whether the bar takes the shorter of M3's heights.
   *
   * For a toolbar that is not the page's top app bar — a bar over a table, a
   * panel's own header — where the full 64px is a band of empty space. It moves
   * this toolbar only: the fleet's density stays `_theme.scss`'s decision, and
   * `--ui-toolbar-height` is the hook for a one-off in between.
   */
  readonly dense = input(false, { transform: booleanAttribute });

  /**
   * The `MatToolbar` this component renders — the escape hatch for anything not
   * wrapped here (rule 4). Reach it with `#bar="uiToolbar"` and `bar.matToolbar()`.
   */
  readonly matToolbar = viewChild.required(MatToolbar);

  // `descendants: false` mirrors what `ng-content select` actually projects: only
  // direct children of `<ui-toolbar>`. A deeper marker is not projected, so it
  // must not light up the slot either — that would render an empty region.
  protected readonly startSlot = contentChild(ToolbarStart, { descendants: false });
  protected readonly endSlot = contentChild(ToolbarEnd, { descendants: false });
}
