import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
  viewChild,
} from '@angular/core';
import { MatProgressSpinner, type ProgressSpinnerMode } from '@angular/material/progress-spinner';

/**
 * Whether the spinner reports a known amount of progress.
 *
 * Aliased from Material's own `ProgressSpinnerMode` rather than re-declared, so
 * that a change to the union upstream is a compile error here rather than a mode
 * this component forwards and Material silently ignores.
 *
 *   - `indeterminate` — the work has no measurable progress. The default.
 *   - `determinate` — the arc is drawn to `value`.
 */
export type UiSpinnerMode = ProgressSpinnerMode;

/** The accessible name used when a consumer gives neither `label` nor `aria-label`. */
const DEFAULT_LABEL = 'Loading';

/**
 * Material's own default stroke width, as a fraction of the diameter.
 *
 * `MatProgressSpinner.strokeWidth` defaults to `diameter / 10`, but only while
 * the input is never bound: its setter coerces `undefined` to `0` (`value || 0`)
 * and the getter's `??` then reads that `0` as a width the consumer chose. So
 * "leave it to Material" has to be spelled out here rather than expressed by
 * binding `undefined`.
 */
const STROKE_WIDTH_RATIO = 10;

/**
 * A themed Material progress spinner.
 *
 * ```html
 * <ui-spinner label="Loading orders" />
 * <ui-spinner mode="determinate" [value]="uploaded()" [diameter]="24" label="Uploading" />
 * ```
 *
 * Like `ui-card` and unlike `uiButton`, this is a component rather than a
 * directive: a spinner is not a decoration on a native element — there is no
 * native element to decorate — it renders its own SVG, and that is the thing
 * being shared.
 *
 * The arc, its animation and its colour are `<mat-progress-spinner>`'s own,
 * resolved from the `--mat-sys-*` tokens that `src/styles/_theme.scss` emits, so
 * there is not a literal colour in `spinner.scss`: a palette change there
 * re-colours every spinner, in light and dark alike.
 *
 * ### Accessibility
 *
 * The host is a `role="status"` live region carrying the accessible name, so a
 * spinner appearing is announced politely, without stealing focus. Inside it,
 * Material's own `role="progressbar"` carries `aria-valuenow` in `determinate`
 * mode. Both are named, so neither reads as an anonymous widget.
 *
 * Name it with `label` — or with `aria-label`, which is accepted as an
 * equivalent. Only the caller knows what is loading, so the fallback is a bare
 * `Loading`.
 *
 * ### Styling hooks
 *
 * - `--ui-spinner-color` — the arc's colour. Defaults to the theme's `primary`
 *   role. Point it at another `--mat-sys-*` role rather than a literal, so it
 *   survives a palette change and dark mode:
 *   `ui-spinner { --ui-spinner-color: var(--mat-sys-tertiary); }`
 *
 * That is an ordinary rule on an ordinary selector — no `::ng-deep`.
 */
@Component({
  selector: 'ui-spinner',
  exportAs: 'uiSpinner',
  imports: [MatProgressSpinner],
  templateUrl: './spinner.html',
  styleUrl: './spinner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // A live region rather than a bare graphic: the moment worth announcing is
    // the spinner *appearing*, and `status` does that politely, without moving
    // focus. This is a static host attribute, so a consumer's own `role` in the
    // template still outranks it.
    role: 'status',
    '[attr.aria-label]': 'resolvedLabel()',
  },
})
export class Spinner {
  /** Whether the spinner reports known progress. Defaults to `indeterminate`. */
  readonly mode = input<UiSpinnerMode>('indeterminate');

  /**
   * How far along the work is, 0–100, in `determinate` mode.
   *
   * Ignored while `mode` is `indeterminate` — Material reports `0` and omits
   * `aria-valuenow` there — so a real value can keep being bound across a mode
   * switch. Out-of-range numbers are clamped by Material.
   */
  readonly value = input(0, { transform: numberAttribute });

  /** Width and height of the spinner in px. Defaults to Material's own 40. */
  readonly diameter = input(40, { transform: numberAttribute });

  /**
   * Thickness of the arc in px. Defaults to a tenth of `diameter`, which is
   * Material's own ratio, so a spinner keeps its proportions at every size.
   *
   * Material exposes this and this component would otherwise swallow it, leaving
   * a consumer to reach into the SVG for a heavier arc.
   */
  readonly strokeWidth = input<number | undefined, unknown>(undefined, {
    transform: (value) => (value == null ? undefined : numberAttribute(value)),
  });

  /**
   * The spinner's accessible name — what is loading, e.g. `Loading orders`.
   *
   * Not rendered: the spinner is a graphic, and this is the text a screen reader
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
   * The `MatProgressSpinner` this component renders — the escape hatch for
   * anything not wrapped here. Reach it with `#spinner="uiSpinner"` and
   * `spinner.matProgressSpinner()`.
   */
  readonly matProgressSpinner = viewChild.required(MatProgressSpinner);

  /** The name actually put on the host and on Material's progressbar. */
  protected readonly resolvedLabel = computed(
    () => this.label()?.trim() || this.ariaLabel()?.trim() || DEFAULT_LABEL,
  );

  protected readonly resolvedStrokeWidth = computed(
    () => this.strokeWidth() ?? this.diameter() / STROKE_WIDTH_RATIO,
  );
}
