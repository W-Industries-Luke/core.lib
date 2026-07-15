import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';

/**
 * Visual style of the button, in Material 3 terms.
 *
 * These map 1:1 onto `MatButton`'s own appearances, so `variant` is passed
 * straight through to `matButton` rather than translated.
 */
export type UiButtonVariant = 'filled' | 'outlined' | 'text' | 'elevated' | 'tonal';

/**
 * Semantic colour role of the button.
 *
 * Material's own `color` input is an M2-only API and does nothing under an M3
 * theme, so these are resolved in `button.scss` via `mat.button-overrides()`
 * against the M3 system tokens emitted by `src/styles/_theme.scss`:
 *
 *   - `primary` — the theme's primary palette (Material's default; no override)
 *   - `accent`  — the theme's tertiary palette
 *   - `warn`    — the theme's error palette
 */
export type UiButtonColor = 'primary' | 'accent' | 'warn';

/** Native `type` values a `ui-button` may take. */
export type UiButtonType = 'button' | 'submit';

/**
 * Themed wrapper around Angular Material's button.
 *
 * Renders a `<button matButton>` and projects its content, so consumers get the
 * shared M3 theme's palette, typography, ripples and a11y behaviour without
 * importing `MatButtonModule` or knowing which system tokens back each colour.
 */
@Component({
  selector: 'ui-button',
  imports: [MatButton],
  templateUrl: './button.html',
  styleUrl: './button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // `primary` is Material's default, so it needs no marker class.
    '[class.ui-button--accent]': 'color() === "accent"',
    '[class.ui-button--warn]': 'color() === "warn"',
  },
})
export class Button {
  /** Visual style of the button. Defaults to the high-emphasis filled button. */
  readonly variant = input<UiButtonVariant>('filled');

  /** Semantic colour role, resolved from the shared theme's palettes. */
  readonly color = input<UiButtonColor>('primary');

  /** Whether the button is disabled. Disabled buttons never emit `clicked`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Native button `type`. Defaults to `button` so a `ui-button` inside a form
   * does not submit it by accident.
   */
  readonly type = input<UiButtonType>('button');

  /** Emits the originating `MouseEvent` when an enabled button is clicked. */
  readonly clicked = output<MouseEvent>();

  protected handleClick(event: MouseEvent): void {
    if (this.disabled()) {
      return;
    }

    this.clicked.emit(event);
  }
}
