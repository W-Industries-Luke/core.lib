import { Directive, effect, inject, input } from '@angular/core';
import {
  MatTooltip,
  type TooltipPosition,
  type TooltipTouchGestures,
} from '@angular/material/tooltip';

/**
 * Where the tooltip sits relative to its host.
 *
 * Aliased from Material's own `TooltipPosition` rather than re-declared, so that
 * a change to the union upstream is a compile error here rather than a position
 * this directive forwards and Material rejects at runtime — it throws on a
 * position it does not know.
 *
 * The four cardinal values are the everyday set:
 *
 *   - `below` — the default, and Material's own
 *   - `above`
 *   - `left`  — physically left, whatever the reading direction
 *   - `right` — physically right, whatever the reading direction
 *
 * `before` and `after` come with the alias: they are the direction-aware pair,
 * flipping sides under RTL. Prefer them over `left`/`right` for anything that
 * should follow the text direction — a tooltip on a "next" control, say.
 */
export type UiTooltipPosition = TooltipPosition;

/**
 * How the tooltip responds to touch. Aliased from Material's own
 * `TooltipTouchGestures`, for the same reason as {@link UiTooltipPosition}.
 */
export type UiTooltipTouchGestures = TooltipTouchGestures;

/** The class every tooltip this directive opens carries, and `_tooltip.scss` hangs off. */
const ROOT_CLASS = 'ui-tooltip';

const toClassArray = (panelClass: string | string[] | undefined): string[] =>
  panelClass == null ? [] : Array.isArray(panelClass) ? panelClass : [panelClass];

/**
 * Applies the shared M3 theme to a Material tooltip.
 *
 * ```html
 * <button matButton uiTooltip="Save the current draft">Save</button>
 * <a uiTooltip="Back to the inbox" position="right" routerLink="/inbox">Inbox</a>
 * ```
 *
 * This is a directive on the element being described rather than a wrapper
 * component, because a tooltip *decorates* something — a button, an icon, a link
 * — and the thing it decorates is the consumer's element, not ours. So the
 * element a consumer writes is the element the browser gets: `aria-*`, `id`,
 * `disabled`, `type`, `data-*`, `tabindex`, `routerLink` and `(click)` all apply
 * natively and need no forwarding, and Material anchors the overlay to the real
 * host box.
 *
 * `MatTooltip` is a real directive, so `uiTooltip` pulls it onto the host itself
 * and a consumer writes one attribute — the same shape as `uiBadge`, and unlike
 * `uiButton`, where Material's button is a *component* and `matButton` therefore
 * has to appear in the template alongside it.
 *
 * ### What the theme adds
 *
 * Stock M3 already paints the tooltip from the shared theme's roles
 * (`inverse-surface` / `inverse-on-surface`, `body-small`), so there is no colour
 * to correct here — what this adds is the `.ui-tooltip` class on Material's own
 * container and the `--ui-tooltip-*` hooks that hang off it. See
 * `src/styles/_tooltip.scss`.
 *
 * ### Input naming
 *
 * The message is carried by the directive's own attribute — `uiTooltip="…"` —
 * the same shape as `matTooltip` itself, so the common case is one attribute.
 * `position` and `panelClass` are bare, because neither is a native attribute
 * name. Everything else keeps Material's `matTooltip*` shape as `uiTooltip*`:
 * that prefix is *why* Material chose it. `disabled` in particular is a native
 * attribute, and an input claiming it would quietly eat `[disabled]` on a real
 * button (rule 3) — which is the very case a tooltip is most often wanted for
 * ("why is this button disabled?"). Hence `uiTooltipDisabled`, which disables the
 * *tooltip*, not the host.
 *
 * ### Accessibility
 *
 * Material describes the host with the message via `AriaDescriber`, so a tooltip
 * is not a substitute for a name: an icon-only button still needs its own
 * `aria-label`. It is hover- and focus-only by nature, so it must not be the only
 * place information lives either.
 *
 * ### Styling hooks
 *
 * A tooltip renders into the CDK overlay at the end of `<body>`, not into the
 * template of whoever triggered it, so a hook set on the host element would never
 * reach it. Pass a `panelClass` and set the hooks on that class from a global
 * stylesheet — the overlay is outside every component's encapsulation anyway, so
 * this needs no `::ng-deep`:
 *
 * ```html
 * <button matButton uiTooltip="Delete for everyone" panelClass="danger-tooltip">…</button>
 * ```
 * ```scss
 * .danger-tooltip {
 *   --ui-tooltip-container-color: var(--mat-sys-error);
 *   --ui-tooltip-text-color: var(--mat-sys-on-error);
 *   --ui-tooltip-max-width: 20rem;
 * }
 * ```
 *
 * Point the colours at `--mat-sys-*` / `--ui-sys-*` roles rather than literals,
 * so they survive a palette change and dark mode.
 */
@Directive({
  selector: '[uiTooltip]',
  exportAs: 'uiTooltip',
  hostDirectives: [
    {
      directive: MatTooltip,
      inputs: [
        // The message, carried by the directive's own attribute — the same shape
        // as `matTooltip` itself, so `<button uiTooltip="Save">` reads naturally.
        'matTooltip: uiTooltip',
        // Material's default is already `below`, so the documented default costs
        // no code and no override.
        'matTooltipPosition: position',
        // The rest of Material's API, passed through rather than swallowed
        // (rule 4), so reaching for any of it needs no escape hatch. Material
        // coerces these in its own setters — `disabled` and `positionAtOrigin`
        // through `coerceBooleanProperty`, the delays through
        // `coerceNumberProperty` — so a bare `uiTooltipDisabled` attribute works
        // exactly as `booleanAttribute` would, with no second layer of coercion
        // to disagree with it.
        'matTooltipDisabled: uiTooltipDisabled',
        'matTooltipShowDelay: uiTooltipShowDelay',
        'matTooltipHideDelay: uiTooltipHideDelay',
        'matTooltipTouchGestures: uiTooltipTouchGestures',
        'matTooltipPositionAtOrigin: uiTooltipPositionAtOrigin',
      ],
    },
  ],
})
export class Tooltip {
  /**
   * The `MatTooltip` on this host — the escape hatch for anything this directive
   * does not wrap, such as `show()`, `hide()` and `toggle()`. Reach it with
   * `#tip="uiTooltip"` and `tip.matTooltip`.
   */
  readonly matTooltip = inject(MatTooltip, { self: true });

  /**
   * Classes for the tooltip Material renders into the overlay — which is where
   * the `--ui-tooltip-*` hooks are set, the overlay being nowhere near the host.
   *
   * Material's own `matTooltipClass` is not forwarded directly, because
   * `.ui-tooltip` is what carries this library's theme: a consumer's class has to
   * be *added* to it rather than replace it (rule 4). Theirs come last, so their
   * rules win on equal specificity — the same merge `Snackbar` does with
   * `panelClass`.
   */
  readonly panelClass = input<string | string[]>([]);

  constructor() {
    // `tooltipClass` is a plain setter rather than a signal input, so the merged
    // value has to be pushed into it. Material re-reads it every time the tooltip
    // opens, and applies it live to one that is already open.
    effect(() => {
      this.matTooltip.tooltipClass = [ROOT_CLASS, ...toClassArray(this.panelClass())];
    });
  }
}
