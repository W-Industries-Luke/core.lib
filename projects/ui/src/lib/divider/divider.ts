import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  viewChild,
} from '@angular/core';
import { MatDivider } from '@angular/material/divider';

/**
 * How much room the divider keeps between itself and the content it separates.
 *
 * A rule with nothing around it reads as a border on the thing above it rather
 * than as a break between two things, so the space is part of the divider — not
 * a margin every caller remembers to add. The steps resolve to the theme's
 * spacing scale (`--ui-sys-spacing-*` in `src/styles/_tokens.scss`), so the whole
 * fleet breaks its content at the same distances:
 *
 *   - `none` — no space at all. For a divider whose neighbours already own the
 *     space around it, e.g. between the rows of a list or inside a `ui-card`.
 *   - `sm` — the tight step, for dividing the rows of a dense list.
 *   - `md` — the default: the step between blocks in a column of content.
 *   - `lg` — the loose step, for separating whole sections of a page.
 */
export type UiDividerSpacing = 'none' | 'sm' | 'md' | 'lg';

/**
 * A themed Material divider: the line that separates two pieces of content.
 *
 * ```html
 * <ui-divider />
 * <ui-divider inset spacing="none" />
 * <ui-divider vertical spacing="sm" />
 * ```
 *
 * Like `ui-progress-bar` and unlike `uiButton`, this is a component rather than
 * a directive: a divider is not a decoration on a native element — there is no
 * native element to decorate — it *is* the element, and Material's own
 * `<mat-divider>` renders it: the rule, its orientation, its inset, its colour
 * and the `role="separator"` / `aria-orientation` a screen reader reads it by.
 * Nothing here re-draws any of that.
 *
 * What this adds is the {@link spacing} the line sits in. Material ships a
 * divider at `margin: 0`, which leaves every caller to invent the gap around
 * it — exactly the drift this library exists to prevent.
 *
 * ### Styling hooks
 *
 * - `--ui-divider-spacing` — the space along the divider's own axis, overriding
 *   the {@link spacing} step (except at `spacing="none"`, which is an explicit
 *   instruction and wins).
 * - `--ui-divider-color` — the line's colour. Defaults to the theme's
 *   `outline-variant` role, which is M3's role for exactly this.
 * - `--ui-divider-width` — its thickness. Defaults to Material's 1px.
 * - `--ui-divider-length` — the minimum length of a `vertical` divider, for
 *   somewhere it has no flex row to take its height from.
 *
 * Point the colour at another `--mat-sys-*` role rather than a literal, so it
 * survives a palette change and dark mode:
 * `ui-divider { --ui-divider-color: var(--mat-sys-outline); }`
 *
 * That is an ordinary rule on an ordinary selector — no `::ng-deep`.
 */
@Component({
  selector: 'ui-divider',
  exportAs: 'uiDivider',
  imports: [MatDivider],
  templateUrl: './divider.html',
  styleUrl: './divider.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // One binding per state rather than a single `[class]` binding, so a class a
    // consumer writes on `<ui-divider class="…">` survives alongside them.
    '[class.ui-divider--vertical]': 'vertical()',
    '[class.ui-divider--spacing-none]': 'spacing() === "none"',
    '[class.ui-divider--spacing-sm]': 'spacing() === "sm"',
    '[class.ui-divider--spacing-md]': 'spacing() === "md"',
    '[class.ui-divider--spacing-lg]': 'spacing() === "lg"',
  },
})
export class Divider {
  /**
   * Whether the line runs down rather than across. Defaults to across.
   *
   * A vertical divider takes its length from the row it is in — it stretches to
   * a flex parent's height, which is where one belongs. Somewhere that gives it
   * no height, set `--ui-divider-length`.
   */
  readonly vertical = input(false, { transform: booleanAttribute });

  /**
   * Whether the line is indented past the leading content it aligns under —
   * Material's own inset, and its 80px: the indent of a list row's text, so a
   * divider starts where that text does rather than under the avatar beside it.
   */
  readonly inset = input(false, { transform: booleanAttribute });

  /** How much room the divider keeps around itself. Defaults to `md`. */
  readonly spacing = input<UiDividerSpacing>('md');

  /**
   * The `MatDivider` this component renders — the escape hatch for anything not
   * wrapped here. Reach it with `#rule="uiDivider"` and `rule.matDivider()`.
   */
  readonly matDivider = viewChild.required(MatDivider);
}
