import { Directive, inject, input } from '@angular/core';
import { MatRipple, type RippleAnimationConfig, type RippleConfig } from '@angular/material/core';

/**
 * Semantic colour role of the ripple.
 *
 * Material's own `matRippleColor` takes a *literal* CSS colour and paints it
 * straight onto the ripple element, which is exactly the hardcoded colour this
 * library exists to prevent. So `color` is not forwarded to it — it is resolved
 * in `src/styles/_ripple.scss` by re-pointing Material's own `--mat-ripple-color`
 * token at an M3 system role, at the theme's pressed-state opacity, the same
 * construction `uiButton`'s ripple colours use:
 *
 *   - `primary` — the theme's primary palette
 *   - `accent`  — the theme's tertiary palette
 *   - `warn`    — the theme's error palette
 *
 * Unlike `uiButton`'s `primary`, the default here is *not* free: stock M3 paints
 * a plain ripple from the neutral `on-surface` role, so `primary` carries a
 * marker class of its own.
 */
export type UiRippleColor = 'primary' | 'accent' | 'warn';

/**
 * Ripple animation timings. Aliased from Material's own `RippleAnimationConfig`
 * rather than re-declared, so a change to the shape upstream is a compile error
 * here rather than a value this directive forwards and Material rejects.
 */
export type UiRippleAnimationConfig = RippleAnimationConfig;

/**
 * Per-ripple options for a manual {@link MatRipple.launch}. Aliased from
 * Material's own `RippleConfig`, for the same reason as
 * {@link UiRippleAnimationConfig}.
 */
export type UiRippleConfig = RippleConfig;

/**
 * Applies the shared M3 theme to a Material ripple, giving custom interactive
 * surfaces — a card body, a list row, a bespoke tile — the same branded ripple
 * the button family already gets.
 *
 * ```html
 * <div uiRipple tabindex="0" role="button">A custom pressable surface</div>
 * <div uiRipple color="accent" [radius]="120" centered>Centred, accent-tinted</div>
 * ```
 *
 * This is a directive on the surface itself rather than a wrapper component,
 * because a ripple *decorates* something — the element a consumer makes
 * interactive is theirs, not ours. So the element a consumer writes is the
 * element the browser gets: `aria-*`, `id`, `role`, `tabindex`, `data-*`,
 * `routerLink` and `(click)` all apply natively and need no forwarding, and
 * Material anchors the ripple container to the real host box (it also sets the
 * `position: relative`/`overflow: hidden` the ripple needs, via its own
 * `.mat-ripple` class).
 *
 * `MatRipple` is a real directive, so `uiRipple` pulls it onto the host itself
 * and a consumer writes one attribute — the same shape as `uiBadge`/`uiTooltip`,
 * and unlike `uiButton`, where Material's button is a *component* and `matButton`
 * therefore has to appear in the template alongside it.
 *
 * ### What the theme adds
 *
 * Only the colour. Stock M3 already paints a plain ripple from the theme's
 * neutral `on-surface` role, so the ripple *works* untouched — what `color` adds
 * is a branded, palette-aware tint, resolved through `--mat-ripple-color` in
 * `src/styles/_ripple.scss` with no literal in sight. See {@link UiRippleColor}.
 *
 * ### Input naming
 *
 * `color` is this library's theme API, named the same bare way as `uiButton`'s.
 * `disabled`, `centered` and `radius` are Material's own ripple knobs, exposed
 * bare because a ripple's natural home is a *custom* surface — a `<div>` or
 * `<span>` — where none of them is a native attribute. Everything else keeps
 * Material's `matRipple*` shape as `uiRipple*`, passed through rather than
 * swallowed (rule 4) so reaching any of it needs no escape hatch.
 *
 * `matRippleColor` is deliberately the one input *not* forwarded — it is the
 * literal-colour API this library replaces. It stays reachable through the
 * exposed {@link matRipple} instance for the rare case a consumer truly needs a
 * one-off literal.
 *
 * ### Styling hook
 *
 * `--ui-ripple-color` re-points the tint from an ordinary CSS rule on the host —
 * no `::ng-deep`. Point it at a `--mat-sys-*`/`--ui-sys-*` role rather than a
 * literal, so it survives a palette change and dark mode:
 *
 * ```scss
 * .danger-surface[uiRipple] { --ui-ripple-color: var(--mat-sys-error); }
 * ```
 */
@Directive({
  selector: '[uiRipple]',
  exportAs: 'uiRipple',
  hostDirectives: [
    {
      directive: MatRipple,
      inputs: [
        // Material's own ripple knobs, exposed bare — none is a native attribute
        // on the custom surfaces a ripple decorates. Material coerces none of
        // these, so a bare `centered`/`disabled` attribute is an empty string
        // (truthy) exactly as `booleanAttribute` would give, and `radius` should
        // be bound (`[radius]="120"`) rather than written as a literal attribute.
        'matRippleDisabled: disabled',
        'matRippleCentered: centered',
        'matRippleRadius: radius',
        // The rest of Material's API, passed through rather than swallowed
        // (rule 4). `matRippleColor` is the deliberate omission — see the class
        // doc — reachable via the exposed instance if ever needed.
        'matRippleUnbounded: uiRippleUnbounded',
        'matRippleAnimation: uiRippleAnimation',
        'matRippleTrigger: uiRippleTrigger',
      ],
    },
  ],
  host: {
    // Scopes this library's colour roles to `uiRipple` hosts, so a plain
    // `matRipple` elsewhere in an app keeps stock Material behaviour.
    class: 'ui-ripple',
    // `primary` needs a class of its own — stock M3 paints from `on-surface`.
    '[class.ui-ripple--accent]': 'color() === "accent"',
    '[class.ui-ripple--warn]': 'color() === "warn"',
  },
})
export class Ripple {
  /** Semantic colour role, resolved from the shared theme's palettes. */
  readonly color = input<UiRippleColor>('primary');

  /**
   * The `MatRipple` on this host — the escape hatch for anything this directive
   * does not wrap, such as `launch()`, `fadeOutAll()` and the literal-colour
   * `color` input. Reach it with `#ripple="uiRipple"` and `ripple.matRipple`.
   */
  readonly matRipple = inject(MatRipple, { self: true });
}
