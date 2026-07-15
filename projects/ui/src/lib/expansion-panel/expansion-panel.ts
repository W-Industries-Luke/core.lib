import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  contentChild,
  contentChildren,
  Directive,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import {
  MatExpansionPanel,
  MatExpansionPanelActionRow,
  MatExpansionPanelDescription,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
  type MatAccordionTogglePosition,
} from '@angular/material/expansion';

/**
 * Which side of the header the expand/collapse chevron sits on.
 *
 * Material's own `MatAccordionTogglePosition`, re-exported under this library's
 * name rather than restated as a fresh union, so a change upstream is a compile
 * error here rather than a silently ignored value.
 */
export type UiExpansionPanelTogglePosition = MatAccordionTogglePosition;

/**
 * Marks an element as the panel's title, in place of the `title` string (rule 7).
 *
 * ```html
 * <ui-expansion-panel>
 *   <span uiExpansionPanelTitle>Items <span uiBadge="3"></span></span>
 *   …
 * </ui-expansion-panel>
 * ```
 *
 * Put it on the element itself rather than on a wrapper around it: `ng-content
 * select` only matches the direct children of `<ui-expansion-panel>`, so a marker
 * nested any deeper is never projected. It lands inside Material's own
 * `<mat-panel-title>`, so the header's typography and layout are untouched.
 */
@Directive({ selector: '[uiExpansionPanelTitle]' })
export class ExpansionPanelTitle {}

/**
 * Marks an element as the panel's description — the secondary text beside the
 * title — in place of the `description` string (rule 7).
 *
 * As with {@link ExpansionPanelTitle}, mark the element itself, not a wrapper. It
 * lands inside Material's own `<mat-panel-description>`.
 */
@Directive({ selector: '[uiExpansionPanelDescription]' })
export class ExpansionPanelDescription {}

/**
 * Marks an element for the panel's action row — the buttons under the body,
 * behind a divider.
 *
 * Mark each action rather than a wrapper around them: the slot is Material's own
 * `<mat-action-row>` flex row, so the marked elements have to be its direct
 * children for its alignment and button spacing to apply to them.
 *
 * ```html
 * <button matButton uiButton uiExpansionPanelActions>Save</button>
 * <button matButton uiButton uiExpansionPanelActions variant="text">Cancel</button>
 * ```
 */
@Directive({ selector: '[uiExpansionPanelActions]' })
export class ExpansionPanelActions {}

/**
 * A themed Material expansion panel: a header that names some content, over the
 * content it shows and hides.
 *
 * ```html
 * <ui-expansion-panel title="Shipping address" description="1 Infinite Loop">
 *   <p>Sam Carter, 1 Infinite Loop, Cupertino</p>
 * </ui-expansion-panel>
 * ```
 *
 * Like `ui-card` and unlike `uiButton`, this is a component rather than a
 * directive: a panel owns *composition* — a header holding a title, a description
 * and a chevron, over a body that expands — and that structure is the thing being
 * shared. There is no single native element to decorate.
 *
 * ### It is Material, not a re-implementation
 *
 * The header, the chevron and its rotation, the ripple, the body's expand and
 * collapse, the elevation, the `role="button"` header with its `aria-expanded` /
 * `aria-controls` wiring, and every colour are `<mat-expansion-panel>`'s own,
 * resolved from the `--mat-sys-*` tokens that `src/styles/_theme.scss` emits — so
 * there is not a literal colour in `expansion-panel.scss`, and a palette change
 * there re-skins every panel in the fleet, in light and dark alike.
 *
 * That includes the keyboard: `Enter` and `Space` toggle the panel from its
 * header, and inside an accordion the arrow keys, `Home` and `End` move between
 * headers.
 *
 * ### Content
 *
 * The body is ordinary projected content, so anything a consumer can write in a
 * template can go in a panel — a form, a table, another component. It is not a
 * string input.
 *
 * The title and description are strings for the common case, and slots for when a
 * string is not enough: project `[uiExpansionPanelTitle]` or
 * `[uiExpansionPanelDescription]` to render an icon, a count or a status dot in
 * the header (rule 7). A projected slot replaces the matching string input.
 *
 * ### Expanded state
 *
 * `[(expanded)]` is a `model` (rule 5), so the open/closed state is one piece of
 * state rather than an input and an output that can disagree; `[expanded]` drives
 * it one way and `(expandedChange)` observes it. Inside a single-open accordion, a
 * panel closed by its sibling opening reports that back through this same signal,
 * so a bound value cannot drift from what is on screen.
 *
 * ### Styling hooks
 *
 * - `--ui-expansion-panel-shape` — the container's corners. Defaults to the same
 *   `corner-medium` that `uiButton` and `ui-alert` use.
 * - `--ui-expansion-panel-background-color` / `--ui-expansion-panel-text-color` —
 *   the container's surface and its body text.
 * - `--ui-expansion-panel-header-text-color` — the title.
 * - `--ui-expansion-panel-description-color` — the description beside it.
 * - `--ui-expansion-panel-indicator-color` — the chevron.
 * - `--ui-expansion-panel-divider-color` — the rule above the action row.
 *
 * Point the colours at another `--mat-sys-*` role rather than a literal, so they
 * survive a palette change and dark mode:
 * `ui-expansion-panel { --ui-expansion-panel-indicator-color: var(--mat-sys-primary); }`.
 * That is an ordinary rule on an ordinary selector — no `::ng-deep`.
 *
 * The header's height is deliberately not a hook: it is Material's density token,
 * and density is a fleet-wide decision `_theme.scss` owns rather than one a single
 * panel should re-take.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiExpansionPanel'` hands back the component, and
 * {@link matExpansionPanel} hands back Material's own instance — so
 * `panel.matExpansionPanel().accordion` needs no API here (rule 4).
 */
@Component({
  selector: 'ui-expansion-panel',
  exportAs: 'uiExpansionPanel',
  imports: [
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelDescription,
    MatExpansionPanelActionRow,
  ],
  templateUrl: './expansion-panel.html',
  styleUrl: './expansion-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // `title` is a global HTML attribute, so `<ui-expansion-panel title="Items">`
    // both sets this component's input *and* leaves a `title` attribute on the
    // host — which the browser turns into a tooltip over the whole panel,
    // duplicating the heading the user is already looking at. This input is the
    // panel's heading, not a tooltip, so the stray attribute is dropped here. A
    // panel that really does want a tooltip has `uiTooltip` for it.
    '[attr.title]': 'null',
  },
})
export class ExpansionPanel {
  /**
   * The panel's title — the header's primary text, e.g. `Shipping address`.
   *
   * To render something richer than a string, project a
   * {@link ExpansionPanelTitle} instead; it replaces this.
   */
  readonly title = input<string>();

  /**
   * The panel's description — secondary text beside the title, e.g. a summary of
   * what is inside, so the panel can be read without being opened.
   *
   * To render something richer than a string, project a
   * {@link ExpansionPanelDescription} instead; it replaces this.
   */
  readonly description = input<string>();

  /**
   * Whether the panel is open, two-way.
   *
   * A `model` rather than an input/output pair (rule 5): `[(expanded)]` keeps a
   * signal in step with the panel, `[expanded]` drives it one way, and
   * `(expandedChange)` observes it — all from one declaration, with no way for the
   * two halves to disagree.
   *
   * Inside a single-open accordion, opening one panel closes its siblings; each of
   * them reports its own close back through this signal.
   *
   * Note this takes a binding rather than a bare attribute — `[expanded]="true"`,
   * not `expanded`. Angular's `model()` has no `transform`, so unlike
   * {@link disabled} it cannot run `booleanAttribute` over an empty attribute
   * value. A bare `expanded` is a compile error rather than a panel that quietly
   * stays shut.
   */
  readonly expanded = model(false);

  /**
   * Whether the panel cannot be opened or closed.
   *
   * Material keeps a disabled panel on the page, marked `aria-disabled` and out of
   * the tab order, rather than removing it — so the set of panels a user sees does
   * not change shape when one of them turns off. A panel that is already open when
   * it is disabled stays open.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Whether the expand/collapse chevron is hidden.
   *
   * Off by default. The chevron is the panel's only affordance that it opens at
   * all, so hide it only where something else in the header already says so.
   */
  readonly hideToggle = input(false, { transform: booleanAttribute });

  /**
   * Which side of the header the chevron sits on. Defaults to Material's `after` —
   * the end of the header.
   */
  readonly togglePosition = input<UiExpansionPanelTogglePosition>('after');

  /**
   * Emitted once the panel has finished expanding, rather than when it starts.
   *
   * Material's own `afterExpand`, forwarded: it is the point at which the body has
   * its final height, which is what code that measures it or moves focus into it
   * has to wait for.
   */
  readonly afterExpand = output<void>();

  /** Emitted once the panel has finished collapsing. Material's own `afterCollapse`. */
  readonly afterCollapse = output<void>();

  /**
   * The `MatExpansionPanel` this component renders — the escape hatch for anything
   * not wrapped here (rule 4). Reach it with `#panel="uiExpansionPanel"`.
   */
  readonly matExpansionPanel = viewChild.required(MatExpansionPanel);

  /**
   * Material's own header for this panel.
   *
   * `ui-accordion` hands these to Material's focus key manager, which is what makes
   * the arrow keys work across a stack of panels — see the note there.
   * @docs-private
   */
  readonly matHeader = viewChild.required(MatExpansionPanelHeader);

  // `descendants: false` mirrors what `ng-content select` actually projects: only
  // direct children of `<ui-expansion-panel>`. A deeper marker is not projected, so
  // it must not light up the slot either — that would render an empty
  // `<mat-panel-title>` in place of the string it was meant to replace.
  protected readonly titleSlot = contentChild(ExpansionPanelTitle, { descendants: false });
  protected readonly descriptionSlot = contentChild(ExpansionPanelDescription, {
    descendants: false,
  });
  protected readonly actionSlots = contentChildren(ExpansionPanelActions, { descendants: false });
}
