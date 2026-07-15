import { Directive, inject, input } from '@angular/core';
import { MatBadge, type MatBadgePosition, type MatBadgeSize } from '@angular/material/badge';

/**
 * Semantic status the badge reports.
 *
 * Material's own `matBadgeColor` is an M2-only API that does nothing under an M3
 * theme (see `@angular/material/badge`: "This API is supported in M2 themes
 * only"), and M3 has no `success` or `warning` colour role at all — its palette
 * stops at primary/secondary/tertiary/error. So these are resolved in
 * `src/styles/_badge.scss` via `mat.badge-overrides()` against the system tokens
 * emitted by `src/styles/_theme.scss`:
 *
 *   - `neutral` — a count with no urgency, on the theme's inverse-surface roles
 *   - `success` — the theme's `--ui-sys-success` role
 *   - `warning` — the theme's `--ui-sys-warning` role
 *   - `danger`  — the theme's `error` palette (Material's own badge default)
 *
 * `success` and `warning` are roles this library adds to the theme, derived from
 * Material's prebuilt palettes exactly the way M3 derives `error`. See
 * `_theme.scss`.
 */
export type UiBadgeVariant = 'neutral' | 'success' | 'warning' | 'danger';

/**
 * How large the badge renders.
 *
 * Aliased from Material's own `MatBadgeSize` rather than re-declared, so that a
 * change to the union upstream is a compile error here rather than a size this
 * directive forwards and Material silently ignores.
 *
 * The three steps are a real scale, which they are not in stock M3 — see the
 * size section of `src/styles/_badge.scss`.
 */
export type UiBadgeSize = MatBadgeSize;

/**
 * Where the badge sits relative to its host. Aliased from Material's own
 * `MatBadgePosition`, for the same reason as {@link UiBadgeSize}.
 */
export type UiBadgePosition = MatBadgePosition;

/**
 * Applies the shared M3 theme to a Material badge.
 *
 * This is a directive on the element being badged rather than a wrapper
 * component, because a badge *decorates* something — an icon, a button, a tab
 * label — and the thing it decorates is the consumer's element, not ours. The
 * element a consumer writes is the element the browser gets, so `aria-*`, `id`,
 * `routerLink`, `disabled`, `data-*` and `(click)` all keep working with no
 * forwarding, and Material positions the badge against the real host box.
 *
 * ```html
 * <mat-icon uiBadge="4" variant="danger" uiBadgeDescription="4 unread messages">
 *   notifications
 * </mat-icon>
 *
 * <button matButton uiBadge="12" variant="neutral" size="large">Inbox</button>
 *
 * <span uiBadge="Live" variant="success" size="small">Stream</span>
 * ```
 *
 * ### Why this one can use `hostDirectives` and `uiButton` cannot
 *
 * `MatBadge` is a real directive, so `uiBadge` pulls it onto the host itself and
 * a consumer writes one attribute. (`uiButton` cannot do that: `MatButton` is a
 * *component* with an attribute selector, and Angular rejects a component as a
 * host directive, which is why `matButton` has to appear in the template
 * alongside it.) Binding is therefore Angular's own — there is no effect pushing
 * values into Material behind the scenes, and so no ordering to get wrong.
 *
 * ### Input naming
 *
 * `variant` and `size` are this library's theme API, named the same bare way as
 * `uiButton`'s `variant`/`color`. Everything else is a straight pass-through to
 * Material and keeps Material's own `matBadge*` shape as `uiBadge*` — both
 * because a reader who knows Material recognises it instantly, and because that
 * prefix is *why* Material chose it: bare `hidden` and `disabled` are native
 * HTML attributes, and an input claiming those names would quietly eat
 * `[disabled]` on a real button (rule 3).
 *
 * ### Accessibility
 *
 * Material renders the badge content `aria-hidden`, because "4" on its own is
 * meaningless out of context. Name it with `uiBadgeDescription` — say what the
 * count *means* (`4 unread messages`). Material attaches that via `AriaDescriber`
 * on an interactive host, and as a visually-hidden span otherwise.
 *
 * ### Styling hooks
 *
 * - `--ui-badge-background-color` / `--ui-badge-text-color` — the badge's
 *   colours, defaulting to the `variant`'s roles. Point them at another
 *   `--mat-sys-*`/`--ui-sys-*` role rather than a literal, so they survive a
 *   palette change and dark mode:
 *   `mat-icon[uiBadge] { --ui-badge-background-color: var(--mat-sys-tertiary); }`
 *
 * That is an ordinary rule on an ordinary selector — no `::ng-deep`.
 */
@Directive({
  selector: '[uiBadge]',
  exportAs: 'uiBadge',
  hostDirectives: [
    {
      directive: MatBadge,
      inputs: [
        // The content, carried by the directive's own attribute — the same shape
        // as `matBadge` itself, so `<mat-icon uiBadge="4">` reads naturally.
        'matBadge: uiBadge',
        // `size` is handed straight to Material: `MatBadgeSize` is exactly this
        // library's scale, so there is nothing to translate, and Material's own
        // default is already `medium` — the documented default costs no code.
        // What the three sizes *look* like is a theme decision, made in
        // `_badge.scss`.
        'matBadgeSize: size',
        // The rest of Material's API, passed through rather than swallowed
        // (rule 4), so reaching for any of it needs no escape hatch.
        'matBadgePosition: uiBadgePosition',
        'matBadgeOverlap: uiBadgeOverlap',
        'matBadgeHidden: uiBadgeHidden',
        'matBadgeDisabled: uiBadgeDisabled',
        'matBadgeDescription: uiBadgeDescription',
      ],
    },
  ],
  host: {
    // Scopes this library's badge defaults (the size scale, the variant colour
    // roles) to `uiBadge` hosts, so a plain `matBadge` elsewhere in an app keeps
    // stock Material behaviour.
    class: 'ui-badge',
    '[class.ui-badge--neutral]': 'variant() === "neutral"',
    '[class.ui-badge--success]': 'variant() === "success"',
    '[class.ui-badge--warning]': 'variant() === "warning"',
    '[class.ui-badge--danger]': 'variant() === "danger"',
  },
})
export class Badge {
  /**
   * Semantic status the badge reports. Defaults to `neutral`.
   *
   * Unlike `uiButton`'s `primary`, the default here is *not* free: Material's M3
   * badge resolves to the `error` palette out of the box, so a badge with no
   * variant would be red. Every variant therefore carries a marker class.
   */
  readonly variant = input<UiBadgeVariant>('neutral');

  /**
   * The `MatBadge` on this host — the escape hatch for anything this directive
   * does not wrap, such as `getBadgeElement()`. Reach it with `#badge="uiBadge"`
   * and `badge.matBadge`.
   */
  readonly matBadge = inject(MatBadge, { self: true });
}
