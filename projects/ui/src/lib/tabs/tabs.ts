import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  effect,
  input,
  model,
  viewChild,
} from '@angular/core';
import { MatTab, MatTabContent, MatTabGroup, MatTabLabel } from '@angular/material/tabs';

import { Tab } from './tab';

/**
 * Where the tabs sit in the header.
 *
 *   - `stretch` — every tab grows to share the full width. Material's own
 *     default, and this library's: it is what M3 shows for a small, fixed set of
 *     tabs, and it gives each one the widest possible target.
 *   - `start` / `center` / `end` — the tabs keep their natural width and the row
 *     is packed to that edge.
 *
 * The four are one input rather than Material's two (`mat-stretch-tabs` and
 * `mat-align-tabs`), because Material's pair has a combination that silently does
 * nothing: stretched tabs fill the row, so there is no free space left for an
 * alignment to move them into, and `mat-align-tabs="center"` on a stretched group
 * — which is the default — changes nothing. Alignment and stretching are the same
 * decision, so they are the same input, and every value of it does something.
 */
export type UiTabsAlign = 'stretch' | 'start' | 'center' | 'end';

/**
 * A themed Material tab group: `<mat-tab-group>` over the {@link Tab}s projected
 * into it.
 *
 * ```html
 * <ui-tabs aria-label="Order">
 *   <ui-tab label="Details">…</ui-tab>
 *   <ui-tab label="Items">…</ui-tab>
 *   <ui-tab label="History" disabled>…</ui-tab>
 * </ui-tabs>
 *
 * <ui-tabs [(selectedIndex)]="tab" alignTabs="start"> … </ui-tabs>
 * ```
 *
 * Like `ui-radio-group` and unlike `uiButton`, this is a component rather than a
 * directive: a tab group owns *composition* — a header of tabs, and the one body
 * they switch between. There is no single native element to decorate, and the
 * thing being shared is the structure itself.
 *
 * ### It is Material, not a re-implementation
 *
 * The header, the ink bar and its animation, the ripples, the body's slide, the
 * pagination that appears when the tabs outgrow their row, the `tablist` / `tab` /
 * `tabpanel` roles and every colour are `<mat-tab-group>`'s own, resolved from the
 * `--mat-sys-*` tokens that `src/styles/_theme.scss` emits — so there is not a
 * literal colour in `tabs.scss`, and a palette change there re-skins every tab
 * group in the fleet, in light and dark alike.
 *
 * That includes the keyboard: arrow keys move between tabs, `Home`/`End` jump to
 * the ends, `Enter`/`Space` selects, and a disabled tab is skipped — all
 * Material's, none re-implemented here.
 *
 * ### Accessibility
 *
 * Material renders the `role="tablist"`, and this component names it: pass
 * `aria-label` (or `aria-labelledby`) to say what the tabs are *of* — `Order`,
 * not `Tabs`. Each tab is named by its own {@link Tab.label}.
 *
 * ### Selection
 *
 * `[(selectedIndex)]` is a `model` (rule 5), so the index is one piece of state
 * rather than an input and an output that can disagree; `(selectedIndexChange)`
 * on its own is the read-only half. Material clamps an out-of-range index to a
 * tab that exists and reports the clamped value back through the same signal, so
 * the binding and what is on screen cannot drift apart.
 *
 * ### Styling hooks
 *
 * - `--ui-tabs-color` — the ink bar under the selected tab. Defaults to the
 *   theme's `primary` role.
 * - `--ui-tabs-active-label-color` / `--ui-tabs-inactive-label-color` — the label
 *   text of the selected tab and of the rest.
 * - `--ui-tabs-divider-color` — the rule under the header.
 * - `--ui-tabs-indicator-height` / `--ui-tabs-indicator-shape` — the ink bar's
 *   thickness and its corners.
 *
 * Point the colours at another `--mat-sys-*` role rather than a literal, so they
 * survive a palette change and dark mode:
 * `ui-tabs { --ui-tabs-color: var(--mat-sys-tertiary); }`. That is an ordinary
 * rule on an ordinary selector — no `::ng-deep`.
 *
 * The tab height is deliberately not a hook: it is Material's density token, and
 * density is a fleet-wide decision `_theme.scss` owns rather than one a single tab
 * group should re-take.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiTabs'` hands back the component, and {@link matTabGroup} hands
 * back Material's own instance — so `tabs.matTabGroup().realignInkBar()` or
 * `tabs.matTabGroup().focusTab(1)` needs no API here (rule 4).
 */
@Component({
  selector: 'ui-tabs',
  exportAs: 'uiTabs',
  imports: [MatTabGroup, MatTab, MatTabLabel, MatTabContent, NgTemplateOutlet],
  templateUrl: './tabs.html',
  styleUrl: './tabs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tabs {
  /**
   * The index of the selected tab, two-way.
   *
   * A `model` rather than an input/output pair (rule 5): `[(selectedIndex)]`
   * keeps a signal in step with the header, `[selectedIndex]` drives it one way,
   * and `(selectedIndexChange)` observes it — all from one declaration, with no
   * way for the two halves to disagree.
   *
   * Material clamps this to a tab that exists, and the clamped value comes back
   * through this same signal — so a `5` bound to a three-tab group settles at `2`
   * rather than leaving the group blank.
   */
  readonly selectedIndex = model(0);

  /**
   * Where the tabs sit in the header. Defaults to `stretch`, as Material does.
   *
   * See {@link UiTabsAlign} for the values, and for why alignment and stretching
   * are one input here rather than Material's two.
   */
  readonly alignTabs = input<UiTabsAlign>('stretch');

  /**
   * Whether the group takes the height of the selected tab's content rather than
   * staying the height of the tallest.
   *
   * Material's own default is `false`, which is kept: a group that resizes on
   * every switch moves whatever is below it down the page.
   */
  readonly dynamicHeight = input(false, { transform: booleanAttribute });

  /**
   * Whether an unselected tab's content stays in the DOM rather than being
   * removed.
   *
   * Off by default, as in Material. Turn it on for content that cannot survive
   * being torn down and rebuilt — an `<iframe>`, a video, a map — at the cost of
   * every tab's content staying live.
   */
  readonly preserveContent = input(false, { transform: booleanAttribute });

  /** Whether Material's ripple is suppressed on every tab in the header. */
  readonly disableRipple = input(false, { transform: booleanAttribute });

  /**
   * The `tablist`'s accessible name, spelled as the ARIA attribute — what the tabs
   * are *of*, e.g. `Order`.
   *
   * An input rather than an attribute left on the host, because the host is not
   * the element with `role="tablist"`: Material renders that one inside the
   * header, and this is put on it.
   */
  readonly ariaLabel = input<string | undefined, unknown>(undefined, {
    alias: 'aria-label',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The id of the element naming the `tablist` — for a group named by a heading
   * already on the page. Material prefers this over {@link ariaLabel}.
   */
  readonly ariaLabelledby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-labelledby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The tabs projected into this group, in the order they are declared.
   *
   * Direct children only, so a `ui-tabs` nested inside a tab's content keeps its
   * own tabs rather than donating them to this header.
   */
  readonly tabs = contentChildren(Tab);

  /**
   * The `MatTabGroup` this component renders — the escape hatch for anything not
   * wrapped here (rule 4), e.g. `tabs.matTabGroup().focusTab(1)`. Reach it with
   * `#tabs="uiTabs"`.
   */
  readonly matTabGroup = viewChild.required(MatTabGroup);

  /** Whether the tabs share the header's full width — see {@link UiTabsAlign}. */
  protected readonly stretchTabs = computed(() => this.alignTabs() === 'stretch');

  /**
   * What is handed to Material's `mat-align-tabs`.
   *
   * `null` while stretching, because there is then no free space to align the tabs
   * in — and because Material reflects this onto an attribute, so a value that
   * does nothing would still be a selector a consumer's CSS could match.
   */
  protected readonly matAlignTabs = computed(() => (this.stretchTabs() ? null : this.alignTabs()));

  constructor() {
    // Material clamps an out-of-range index to a tab that exists, but only reports
    // the clamped value back when the clamp *changed the selection*: a `-1` bound
    // to a group already sitting on tab 0 moves nothing, so Material stays quiet
    // and the binding is left holding an index that is not the one on screen.
    // Normalising here closes that gap, so `selectedIndex()` is always the tab a
    // user is actually looking at — and a consumer whose value was clamped hears
    // about it through `selectedIndexChange` rather than having to re-derive it.
    effect(() => {
      const count = this.tabs().length;
      if (count === 0) {
        // Nothing to clamp against — an index bound before the tabs arrive is
        // clamped as soon as they do, on this effect's next run.
        return;
      }
      const index = this.selectedIndex();
      const clamped = Math.min(Math.max(index, 0), count - 1);
      if (clamped !== index) {
        this.selectedIndex.set(clamped);
      }
    });
  }
}
