import { Directive, inject, input } from '@angular/core';
import { MatIconButton } from '@angular/material/button';

/**
 * Semantic colour role of an icon button.
 *
 * The same vocabulary as {@link UiButtonColor}. Material's own `color` input is
 * an M2-only API and does nothing under an M3 theme, so these are resolved in
 * `src/styles/_icon-button.scss` via `mat.icon-button-overrides()` against the
 * M3 system tokens emitted by `src/styles/_theme.scss`:
 *
 *   - `primary` — Material's default icon-button colour, the neutral
 *     `on-surface-variant` role (no override); this is the standard icon-button
 *     look, and reusing the `primary` name keeps the family's vocabulary.
 *   - `accent`  — the theme's tertiary palette
 *   - `warn`    — the theme's error palette
 */
export type UiIconButtonColor = 'primary' | 'accent' | 'warn';

function missingMatIconButton(): never {
  throw new Error(
    '`uiIconButton` must be applied to an element that is also a Material icon button. ' +
      'Add `matIconButton` alongside it: `<button matIconButton uiIconButton aria-label="Menu">`.',
  );
}

/**
 * Applies the shared M3 theme to a Material icon button.
 *
 * Like {@link Button}, this is a directive on the *native* element rather than a
 * wrapper component, so the element a consumer writes is the element the browser
 * gets: `aria-label` (which an icon-only button needs for a screen reader),
 * `id`, `disabled`, `data-*`, `tabindex`, `(click)` and `routerLink` all apply
 * natively and need no forwarding. Restyling needs no `::ng-deep` either —
 * `button[uiIconButton]` is a selector consumers can target directly.
 *
 * ```html
 * <button matIconButton uiIconButton color="warn" aria-label="Delete">
 *   <ui-icon name="delete" />
 * </button>
 * ```
 *
 * ### Why `matIconButton` has to be there too
 *
 * `MatIconButton` is a *component* with an attribute selector, not a directive.
 * Angular rejects a component as a host directive and refuses two components on
 * one element, so this directive cannot pull `MatIconButton` onto the host by
 * itself — its attribute has to be in the consumer's template for Angular to
 * match it. Rather than fork Material's markup, `uiIconButton` decorates the
 * real thing and only maps `color` onto the theme's palettes. There is no
 * `variant`: Material icon buttons have a single appearance.
 */
@Directive({
  selector: 'button[uiIconButton], a[uiIconButton]',
  exportAs: 'uiIconButton',
  host: {
    // `primary` is Material's default, so it needs no marker class.
    '[class.ui-icon-button--accent]': 'color() === "accent"',
    '[class.ui-icon-button--warn]': 'color() === "warn"',
  },
})
export class IconButton {
  /**
   * The `MatIconButton` on this host, exposed as the escape hatch for anything
   * this directive does not wrap — `focus()`, `disabledInteractive`,
   * `disableRipple`.
   */
  readonly matIconButton: MatIconButton =
    inject(MatIconButton, { self: true, optional: true }) ?? missingMatIconButton();

  /** Semantic colour role, resolved from the shared theme's palettes. */
  readonly color = input<UiIconButtonColor>('primary');
}
