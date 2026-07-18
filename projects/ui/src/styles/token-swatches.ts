import { Component, input } from '@angular/core';

/** One M3 colour role, paired with the role M3 guarantees is legible on it. */
export interface TokenSwatch {
  /** The custom property carrying the colour, e.g. `--mat-sys-primary`. */
  readonly background: string;
  /** The `on-` role for {@link background}, e.g. `--mat-sys-on-primary`. */
  readonly foreground: string;
}

/**
 * The theme's colour roles, in the order they are worth reading: the bold pairs,
 * then the two roles this library adds, then the quiet container pairs.
 *
 * Each swatch pairs a role with the `on-` role M3 guarantees is legible against
 * it. Painting every swatch with a single foreground (e.g. `on-surface`) is what
 * M3 pairing exists to prevent — it drops label contrast to ~2.7:1 over
 * `primary`/`error`, which the a11y check fails on.
 *
 * This list is shared by `Foundations/Theme` and `Foundations/Dark mode` rather
 * than written out twice: the two stories exist to answer "what roles are there"
 * and "do those roles survive dark mode", and they can only answer the second
 * about the roles the first shows.
 */
export const TOKEN_SWATCHES: readonly TokenSwatch[] = [
  { background: '--mat-sys-primary', foreground: '--mat-sys-on-primary' },
  { background: '--mat-sys-secondary', foreground: '--mat-sys-on-secondary' },
  { background: '--mat-sys-tertiary', foreground: '--mat-sys-on-tertiary' },
  { background: '--mat-sys-error', foreground: '--mat-sys-on-error' },
  // The two roles this library adds, because M3's colour system has no notion of
  // success or warning and `tertiary` is whatever the brand happens to be. They
  // are derived from Material's prebuilt palettes with the same tones M3 gives
  // `error`, so they pair and contrast like every role above — and, being
  // `light-dark()` like every role above, they flip with the rest.
  { background: '--ui-sys-success', foreground: '--ui-sys-on-success' },
  { background: '--ui-sys-warning', foreground: '--ui-sys-on-warning' },
  { background: '--mat-sys-surface-container', foreground: '--mat-sys-on-surface' },
  // The quiet half of each role: what an inline banner (`ui-alert`) sits on.
  // M3's own container roles are here beside the two this library derives, so
  // that a green that does not belong with them is visible rather than argued
  // about — which is exactly how `$green-palette`'s chroma-maxed tone 90 was
  // caught. See the `_status-role` mixin in `_theme.scss`.
  { background: '--mat-sys-secondary-container', foreground: '--mat-sys-on-secondary-container' },
  { background: '--ui-sys-success-container', foreground: '--ui-sys-on-success-container' },
  { background: '--ui-sys-warning-container', foreground: '--ui-sys-on-warning-container' },
  { background: '--mat-sys-error-container', foreground: '--mat-sys-on-error-container' },
];

/**
 * Renders {@link TOKEN_SWATCHES} as labelled chips, each painted with the role it
 * names.
 *
 * Story support for the two `Foundations/*` stories, and deliberately NOT a
 * library component — nothing here is exported from public-api.ts. Every colour
 * comes from a `var()` on the theme's own tokens, so a swatch cannot show a
 * colour the theme does not actually emit; a renamed or dropped token renders as
 * a transparent chip rather than as a stale hex that still looks right.
 */
@Component({
  selector: 'ui-token-swatches',
  template: `
    @for (swatch of swatches(); track swatch.background) {
      <span
        class="swatch"
        [style.background]="'var(' + swatch.background + ')'"
        [style.color]="'var(' + swatch.foreground + ')'"
      >
        {{ swatch.background }}
      </span>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }
    .swatch {
      display: inline-flex;
      align-items: center;
      padding: 0.75rem;
      border-radius: var(--mat-sys-corner-small);
      border: 1px solid var(--mat-sys-outline-variant);
      font: var(--mat-sys-label-small);
      font-family: monospace;
    }
  `,
})
export class TokenSwatches {
  /** The roles to paint. Defaults to the theme's full set. */
  readonly swatches = input<readonly TokenSwatch[]>(TOKEN_SWATCHES);
}
