import { Directive, effect, inject, input } from '@angular/core';
import { MatButton } from '@angular/material/button';

/**
 * Visual style of the button, in Material 3 terms.
 *
 * These map 1:1 onto `MatButton`'s own appearances, so `variant` is handed
 * straight to `MatButton.setAppearance()` rather than translated.
 */
export type UiButtonVariant = 'filled' | 'outlined' | 'text' | 'elevated' | 'tonal';

/**
 * Semantic colour role of the button.
 *
 * Material's own `color` input is an M2-only API and does nothing under an M3
 * theme, so these are resolved in `src/styles/_button.scss` via
 * `mat.button-overrides()` against the M3 system tokens emitted by
 * `src/styles/_theme.scss`:
 *
 *   - `primary` — the theme's primary palette (Material's default; no override)
 *   - `accent`  — the theme's tertiary palette
 *   - `warn`    — the theme's error palette
 */
export type UiButtonColor = 'primary' | 'accent' | 'warn';

function missingMatButton(): never {
  throw new Error(
    '`uiButton` must be applied to an element that is also a Material button. ' +
      'Add `matButton` alongside it: `<button matButton uiButton variant="filled">`.',
  );
}

/**
 * Applies the shared M3 theme to a Material button.
 *
 * This is a directive on the *native* element rather than a wrapper component,
 * so the element a consumer writes is the element the browser gets:
 * `aria-label`, `id`, `form`/`name`/`value`, `type`, `disabled`, `data-*`,
 * `tabindex`, `(click)` and `routerLink` all apply natively and need no
 * forwarding. Restyling needs no `::ng-deep` either — `button[uiButton]` is a
 * selector consumers can target directly.
 *
 * ```html
 * <button matButton uiButton variant="filled" color="accent">Save</button>
 * <a matButton uiButton variant="outlined" routerLink="/settings">Settings</a>
 * ```
 *
 * ### Why `matButton` has to be there too
 *
 * `MatButton` is a *component* with an attribute selector, not a directive
 * (see `@angular/material/button`). Angular rejects a component as a host
 * directive (NG2015) and refuses two components on one element, so a directive
 * cannot pull `MatButton` onto the host by itself — its attribute has to be in
 * the consumer's template for Angular to match it. Rather than fork Material's
 * button template and MDC styles to work around that, `uiButton` decorates the
 * real thing: it drives the appearance, maps `color` onto the theme's palettes,
 * and leaves everything else to Material. `variant` is the single source of
 * truth for the appearance — write `matButton` bare and let `variant` set it.
 */
@Directive({
  selector: 'button[uiButton], a[uiButton]',
  exportAs: 'uiButton',
  host: {
    // `primary` is Material's default, so it needs no marker class.
    '[class.ui-button--accent]': 'color() === "accent"',
    '[class.ui-button--warn]': 'color() === "warn"',
  },
})
export class Button {
  /**
   * The `MatButton` on this host, exposed as the escape hatch for anything this
   * directive does not wrap — `focus()`, `disabledInteractive`, `disableRipple`.
   */
  readonly matButton: MatButton =
    inject(MatButton, { self: true, optional: true }) ?? missingMatButton();

  /** Visual style of the button. Defaults to the high-emphasis filled button. */
  readonly variant = input<UiButtonVariant>('filled');

  /** Semantic colour role, resolved from the shared theme's palettes. */
  readonly color = input<UiButtonColor>('primary');

  constructor() {
    // MatButton's appearance is a plain setter rather than a signal input, so
    // the signal has to be pushed into it. This runs before paint, so there is
    // no flash of Material's own default appearance.
    effect(() => this.matButton.setAppearance(this.variant()));
  }
}
