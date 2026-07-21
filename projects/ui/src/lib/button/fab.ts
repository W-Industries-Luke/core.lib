import { Directive, inject, input } from '@angular/core';
import { MatFabButton, MatMiniFabButton } from '@angular/material/button';

/**
 * Semantic colour role of a FAB.
 *
 * The same vocabulary as {@link UiButtonColor}. A FAB is a low-emphasis
 * *container* surface, so — unlike a filled button, but like the tonal one —
 * each role resolves to its palette's `container` / `on-container` pair.
 * Material's own `color` input is an M2-only API and does nothing under an M3
 * theme, so these are resolved in `src/styles/_fab.scss` via
 * `mat.fab-overrides()` against the M3 system tokens emitted by
 * `src/styles/_theme.scss`:
 *
 *   - `primary` — Material's default `primary-container` pair (no override)
 *   - `accent`  — the theme's tertiary-container pair
 *   - `warn`    — the theme's error-container pair
 */
export type UiFabColor = 'primary' | 'accent' | 'warn';

function missingMatFab(): never {
  throw new Error(
    '`uiFab` must be applied to an element that is also a Material FAB. Add `matFab` ' +
      '(or `matMiniFab`) alongside it: `<button matFab uiFab aria-label="Add">`.',
  );
}

/**
 * Applies the shared M3 theme to a Material FAB — regular, mini or extended.
 *
 * Like {@link Button}, this is a directive on the *native* element rather than a
 * wrapper component, so the element a consumer writes is the element the browser
 * gets: `aria-label`, `id`, `disabled`, `data-*`, `tabindex`, `(click)` and
 * `routerLink` all apply natively and need no forwarding. Restyling needs no
 * `::ng-deep` either — `button[uiFab]` is a selector consumers can target
 * directly.
 *
 * ```html
 * <button matFab uiFab color="accent" aria-label="Compose"><mat-icon>edit</mat-icon></button>
 * <button matMiniFab uiFab aria-label="Add"><mat-icon>add</mat-icon></button>
 * <button matFab extended uiFab><mat-icon>navigation</mat-icon> Navigate</button>
 * ```
 *
 * ### Why `matFab` / `matMiniFab` has to be there too
 *
 * `MatFabButton` and `MatMiniFabButton` are *components* with attribute
 * selectors, not directives. Angular rejects a component as a host directive and
 * refuses two components on one element, so this directive cannot pull one onto
 * the host by itself — the attribute has to be in the consumer's template for
 * Angular to match it. Rather than fork Material's markup, `uiFab` decorates the
 * real thing and only maps `color` onto the theme's palettes. The regular/mini
 * split is Material's own component boundary (`matFab` vs `matMiniFab`) and
 * `extended` is Material's own input, so `uiFab` sits over all three unchanged.
 */
@Directive({
  selector: 'button[uiFab], a[uiFab]',
  exportAs: 'uiFab',
  host: {
    // `primary` is Material's default, so it needs no marker class.
    '[class.ui-fab--accent]': 'color() === "accent"',
    '[class.ui-fab--warn]': 'color() === "warn"',
  },
})
export class Fab {
  /**
   * The `MatFabButton` or `MatMiniFabButton` on this host — whichever the
   * consumer wrote — exposed as the escape hatch for anything this directive
   * does not wrap (`focus()`, `extended`, `disabledInteractive`).
   */
  readonly matFab: MatFabButton | MatMiniFabButton =
    inject(MatFabButton, { self: true, optional: true }) ??
    inject(MatMiniFabButton, { self: true, optional: true }) ??
    missingMatFab();

  /** Semantic colour role, resolved from the shared theme's palettes. */
  readonly color = input<UiFabColor>('primary');
}
