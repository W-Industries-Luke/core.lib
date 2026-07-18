import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  effect,
  inject,
  type AfterContentInit,
} from '@angular/core';
import {
  MatAccordion,
  type MatAccordionDisplayMode,
  type MatExpansionPanelHeader,
} from '@angular/material/expansion';

import { ExpansionPanel } from './expansion-panel';

/**
 * How an open panel is separated from the rest of the stack.
 *
 *   - `default` — an open panel lifts away from its neighbours, gaining a gutter
 *     and its own elevation. Material's own default, and this library's.
 *   - `flat` — no gutter; every panel stays at the same elevation and the stack
 *     reads as one surface.
 *
 * Material's own `MatAccordionDisplayMode`, re-exported under this library's name
 * rather than restated as a fresh union, so a change upstream is a compile error
 * here rather than a silently ignored value.
 */
export type UiAccordionDisplayMode = MatAccordionDisplayMode;

/**
 * A themed Material accordion: a stack of {@link ExpansionPanel}s that know about
 * each other.
 *
 * ```html
 * <ui-accordion>
 *   <ui-expansion-panel title="Details">…</ui-expansion-panel>
 *   <ui-expansion-panel title="Items">…</ui-expansion-panel>
 *   <ui-expansion-panel title="History">…</ui-expansion-panel>
 * </ui-accordion>
 *
 * <ui-accordion multi> … </ui-accordion>
 * ```
 *
 * A lone `<ui-expansion-panel>` needs none of this — it opens and closes on its
 * own. An accordion is what makes a *set* of panels behave as one: by default,
 * opening any panel closes the one that was open, so only one body is on screen at
 * a time. Add `multi` to let them open independently.
 *
 * ### It is Material, not a re-implementation
 *
 * Single-open behaviour, `openAll()` / `closeAll()`, the gutter around an open
 * panel and the arrow-key navigation across the headers are all `MatAccordion`'s,
 * applied to this host as a directive. Nothing here re-implements any of it.
 *
 * ### Why the panels find it, and how
 *
 * `<ui-expansion-panel>` renders Material's panel inside its own view, so the panel
 * is a level deeper in the DOM than a hand-written `<mat-expansion-panel>` would
 * be. That does not matter to `MatExpansionPanel`, which finds its accordion by
 * *dependency injection* rather than by looking at the DOM: it injects
 * `MAT_ACCORDION` from its element injector, which walks up through the
 * `<ui-expansion-panel>` host to this one. Applying `MatAccordion` as a host
 * directive here is what puts that token on this element, so every panel projected
 * into this accordion — however deeply a consumer's own markup nests it — finds it.
 *
 * ### Why the inputs are Material's own rather than signal inputs
 *
 * `multi`, `hideToggle`, `displayMode` and `togglePosition` are exposed straight
 * off the host directive instead of being re-declared here and copied across.
 * That is not shorthand: `MatExpansionPanelHeader` re-renders its chevron off
 * `MatAccordion`'s `ngOnChanges` (via `CdkAccordion._stateChanges`), which only
 * fires for inputs Angular itself binds. Re-declaring them and assigning the
 * values in an `effect` would set the fields without ever firing that hook, and a
 * `hideToggle` flipped at runtime would leave every header's chevron stale.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiAccordion'` hands back the component, and {@link matAccordion}
 * hands back Material's own instance (rule 4).
 */
@Component({
  selector: 'ui-accordion',
  exportAs: 'uiAccordion',
  hostDirectives: [
    {
      directive: MatAccordion,
      inputs: ['multi', 'hideToggle', 'displayMode', 'togglePosition'],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './accordion.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Accordion implements AfterContentInit {
  /**
   * The `MatAccordion` on this host — the escape hatch for anything not wrapped
   * here (rule 4), e.g. `accordion.matAccordion.openAll()`. Reach it with
   * `#acc="uiAccordion"`.
   */
  readonly matAccordion = inject(MatAccordion, { self: true });

  /**
   * The panels in this accordion, in the order they are declared.
   *
   * `descendants: true`, so a consumer's own markup can wrap or repeat the panels
   * without hiding them. That also picks up the panels of a *nested* accordion, but
   * they are filtered out downstream — see {@link syncHeaders}.
   */
  readonly panels = contentChildren(ExpansionPanel, { descendants: true });

  constructor() {
    // Keeps the key manager honest as panels are added and removed.
    effect(() => this.syncHeaders());
  }

  ngAfterContentInit() {
    // The effect above runs before the content query has been resolved for the
    // first time, and it only re-runs when `panels()` changes afterwards — which,
    // for a static list of panels, is never. This is the first pass.
    this.syncHeaders();
  }

  /** Opens every panel at once. Only has an effect on a `multi` accordion. */
  openAll() {
    this.matAccordion.openAll();
  }

  /** Closes every panel at once. */
  closeAll() {
    this.matAccordion.closeAll();
  }

  /**
   * Hands Material's own headers to Material's own focus key manager.
   *
   * `MatAccordion` collects the headers it drives with a `@ContentChildren` query,
   * which finds nothing here: a content query cannot see into a child component's
   * view, and every header is inside a `<ui-expansion-panel>`'s. Left alone, the
   * key manager would be empty and the arrow keys, `Home` and `End` would do
   * nothing across the stack — the one part of Material's accordion that wrapping
   * the panel silently costs. (Tab, and `Enter`/`Space` to toggle, are the header's
   * own and are unaffected.)
   *
   * So the query's result list is populated from `panels()` instead. `MatAccordion`
   * subscribes to that list and rebuilds its key manager from it, exactly as it
   * would from its own query — including dropping any header whose panel belongs to
   * a nested accordion rather than this one, which is why `panels()` can afford to
   * be greedy.
   */
  private syncHeaders() {
    const headers = this.panels().map((panel) => panel.matHeader());
    // Undefined until Angular has resolved the host directive's content query,
    // which is after this effect's first run.
    const query: typeof this.matAccordion._headers | undefined = this.matAccordion._headers;
    if (!query) {
      return;
    }

    query.reset(headers as MatExpansionPanelHeader[]);
    query.notifyOnChanges();
  }
}
