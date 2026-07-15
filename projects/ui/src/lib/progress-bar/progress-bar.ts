import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
  output,
  viewChild,
} from '@angular/core';
import {
  MatProgressBar,
  type ProgressAnimationEnd,
  type ProgressBarMode,
} from '@angular/material/progress-bar';

/**
 * How the progress bar reports progress.
 *
 * Aliased from Material's own `ProgressBarMode` rather than re-declared, so that
 * a change to the union upstream is a compile error here rather than a mode this
 * component forwards and Material silently ignores.
 *
 *   - `indeterminate` — the work has no measurable progress. The default.
 *   - `determinate` — the bar is filled to `value`.
 *   - `buffer` — `value` fills the bar and `bufferValue` marks how much has been
 *     buffered ahead of it, over a dotted remainder.
 *   - `query` — the bar runs backwards, for the "still working out how much work
 *     there is" phase that precedes a `determinate` one.
 */
export type UiProgressBarMode = ProgressBarMode;

/**
 * The payload of `animationEnd`. Re-exported from Material so a consumer can
 * type a handler without importing from `@angular/material` themselves.
 */
export type UiProgressAnimationEnd = ProgressAnimationEnd;

/** The accessible name used when a consumer gives neither `label` nor `aria-label`. */
const DEFAULT_LABEL = 'Loading';

/**
 * A themed Material progress bar.
 *
 * ```html
 * <ui-progress-bar label="Loading orders" />
 * <ui-progress-bar mode="determinate" [value]="uploaded()" label="Uploading" />
 * <ui-progress-bar mode="buffer" [value]="played()" [bufferValue]="buffered()" label="Buffering" />
 * ```
 *
 * Like `ui-spinner` and unlike `uiButton`, this is a component rather than a
 * directive: a progress bar is not a decoration on a native element — there is
 * no native element to decorate — it renders its own track and indicator, and
 * that is the thing being shared.
 *
 * The track, the indicator, every mode's animation and all of their colours are
 * `<mat-progress-bar>`'s own, resolved from the `--mat-sys-*` tokens that
 * `src/styles/_theme.scss` emits, so there is not a literal colour in
 * `progress-bar.scss`: a palette change there re-colours every progress bar, in
 * light and dark alike.
 *
 * ### Accessibility
 *
 * The host is a `role="status"` live region carrying the accessible name, so a
 * progress bar appearing is announced politely, without stealing focus. Inside
 * it, Material's own `role="progressbar"` carries `aria-valuenow` in the modes
 * that have a measurable value (`determinate` and `buffer`). Both are named, so
 * neither reads as an anonymous widget.
 *
 * Name it with `label` — or with `aria-label`, which is accepted as an
 * equivalent. Only the caller knows what is loading, so the fallback is a bare
 * `Loading`.
 *
 * ### Styling hooks
 *
 * - `--ui-progress-bar-color` — the active indicator. Defaults to the theme's
 *   `primary` role.
 * - `--ui-progress-bar-track-color` — the track behind it. Defaults to the
 *   theme's `surface-variant` role.
 * - `--ui-progress-bar-height` — the thickness of both. Defaults to Material's 4px.
 * - `--ui-progress-bar-shape` — the corner radius. Defaults to Material's square
 *   `corner-none`.
 *
 * Point the colours at another `--mat-sys-*` role rather than a literal, so they
 * survive a palette change and dark mode:
 * `ui-progress-bar { --ui-progress-bar-color: var(--mat-sys-tertiary); }`
 *
 * That is an ordinary rule on an ordinary selector — no `::ng-deep`.
 */
@Component({
  selector: 'ui-progress-bar',
  exportAs: 'uiProgressBar',
  imports: [MatProgressBar],
  templateUrl: './progress-bar.html',
  styleUrl: './progress-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // A live region rather than a bare graphic: the moment worth announcing is
    // the bar *appearing*, and `status` does that politely, without moving
    // focus. This is a static host attribute, so a consumer's own `role` in the
    // template still outranks it.
    role: 'status',
    '[attr.aria-label]': 'resolvedLabel()',
  },
})
export class ProgressBar {
  /**
   * How progress is reported. Defaults to `indeterminate`.
   *
   * Note this differs from `MatProgressBar`'s own `determinate` default: a bar
   * bound to no value should read as "working" rather than sit silently at 0%,
   * and it matches `ui-spinner`, so the two loading indicators in this library
   * agree on what an unconfigured one means.
   */
  readonly mode = input<UiProgressBarMode>('indeterminate');

  /**
   * How far along the work is, 0–100, in `determinate` and `buffer` modes.
   *
   * Ignored while `mode` is `indeterminate` or `query` — Material omits
   * `aria-valuenow` there — so a real value can keep being bound across a mode
   * switch. Out-of-range numbers are clamped by Material.
   */
  readonly value = input(0, { transform: numberAttribute });

  /**
   * How much has been buffered ahead of `value`, 0–100, in `buffer` mode.
   *
   * Ignored in every other mode. Out-of-range numbers are clamped by Material.
   */
  readonly bufferValue = input(0, { transform: numberAttribute });

  /**
   * The bar's accessible name — what is loading, e.g. `Loading orders`.
   *
   * Not rendered: the bar is a graphic, and this is the text a screen reader
   * announces in its place. Falls back to `Loading` when it and `aria-label` are
   * both unset or blank; an unnamed `status`/`progressbar` is an accessibility
   * violation, so there is deliberately no way to spell "no name" here.
   */
  readonly label = input<string>();

  /**
   * The accessible name, spelled as the ARIA attribute. Equivalent to `label`,
   * which wins if both are somehow set.
   *
   * Rule 3 of the extensibility contract: `aria-*` has to reach the real element
   * and work. The host *is* the real element here, but `[attr.aria-label]`
   * outranks a static attribute a consumer writes, so this input catches that
   * attribute rather than letting the host binding overwrite it.
   */
  readonly ariaLabel = input<string | undefined, unknown>(undefined, {
    alias: 'aria-label',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * Emits when the primary bar finishes animating to a new `value`.
   *
   * Material's own output, forwarded rather than swallowed — it is what a
   * consumer waits on before tearing a finished bar down, so that the fill is
   * seen reaching 100% rather than vanishing at 90%.
   *
   * Never emits in `indeterminate` or `query` mode, whose animations are
   * continuous, nor when animations are disabled.
   */
  readonly animationEnd = output<UiProgressAnimationEnd>();

  /**
   * The `MatProgressBar` this component renders — the escape hatch for anything
   * not wrapped here. Reach it with `#bar="uiProgressBar"` and
   * `bar.matProgressBar()`.
   */
  readonly matProgressBar = viewChild.required(MatProgressBar);

  /** The name actually put on the host and on Material's progressbar. */
  protected readonly resolvedLabel = computed(
    () => this.label()?.trim() || this.ariaLabel()?.trim() || DEFAULT_LABEL,
  );
}
