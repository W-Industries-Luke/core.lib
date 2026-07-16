import { Component } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { expect } from 'storybook/test';

/**
 * The six M3 elevation levels, as the `--mat-sys-levelN` box-shadow tokens the
 * theme emits. Built by index rather than typed out so a level cannot be
 * forgotten and the list cannot disagree with itself: `mat.theme()` ships exactly
 * `level0`..`level5`, level0 being the flat "resting" shadow and each step after
 * it casting further.
 */
const ELEVATION_LEVELS: readonly string[] = Array.from(
  { length: 6 },
  (_, level) => `--mat-sys-level${level}`,
);

/**
 * The M3 surface roles, tonally from dimmest to brightest. `surface` is the page;
 * the `surface-container-*` ramp is what M3 raises a component onto instead of a
 * shadow (a menu sits on `surface-container`, a dialog on `surface-container-high`),
 * and `surface-dim`/`surface-bright` are the extremes the containers step between.
 * These are the roles a consumer paints a panel with — never a hardcoded grey.
 */
const SURFACE_TOKENS: readonly string[] = [
  '--mat-sys-surface-dim',
  '--mat-sys-surface',
  '--mat-sys-surface-bright',
  '--mat-sys-surface-container-lowest',
  '--mat-sys-surface-container-low',
  '--mat-sys-surface-container',
  '--mat-sys-surface-container-high',
  '--mat-sys-surface-container-highest',
];

/**
 * Renders every M3 elevation level as a raised tile and every surface-container
 * role as a painted swatch, each labelled with the token it is drawn from.
 *
 * Story support for `Foundations/Elevation`, and deliberately NOT a library
 * component — nothing here is exported from public-api.ts. Every shadow is
 * `box-shadow: var(--mat-sys-levelN)` and every fill is `background: var(...)` on
 * a `--mat-sys-surface*` role, so the catalogue shows what the theme emits rather
 * than a transcription of it: a renamed or dropped token renders as a flat tile
 * or a transparent swatch, not as a stale value that still looks right. Because
 * both the tiles' backing surface and the swatches' fills are `light-dark()`
 * roles, the whole story flips with the **Scheme** toolbar with no second markup.
 */
@Component({
  selector: 'ui-elevation-scale',
  template: `
    <section class="group" aria-labelledby="elevation-heading">
      <h3 id="elevation-heading" class="group__title">Elevation</h3>
      <p class="group__lead">
        The <code>--mat-sys-level0</code>…<code>--mat-sys-level5</code> shadow tokens. Raise an
        element with <code>box-shadow: var(--mat-sys-level3)</code>; never a hand-rolled shadow.
      </p>
      <div class="tiles">
        @for (token of levels; track token; let level = $index) {
          <figure class="tile-figure">
            <div class="tile" [style.box-shadow]="'var(' + token + ')'">level{{ level }}</div>
            <figcaption><code>{{ token }}</code></figcaption>
          </figure>
        }
      </div>
    </section>

    <section class="group" aria-labelledby="surface-heading">
      <h3 id="surface-heading" class="group__title">Surface tokens</h3>
      <p class="group__lead">
        The surface ramp, dimmest to brightest. M3 lifts a component by moving it up this ramp
        rather than by shadow alone — paint a panel with <code>background: var(--mat-sys-surface-container)</code>.
      </p>
      <div class="swatches">
        @for (token of surfaces; track token) {
          <div class="swatch" [style.background]="'var(' + token + ')'">
            <code>{{ token }}</code>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
      /* The whole showcase sits on the theme's own page surface so the tiles'
         shadows have something to fall on in either scheme — a shadow over the
         preview's bare background reads as half-rendered in dark. */
      padding: 1.5rem;
      border-radius: var(--mat-sys-corner-medium);
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
    }
    .group {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .group__title {
      margin: 0;
      font: var(--mat-sys-title-medium);
    }
    .group__lead {
      margin: 0;
      max-width: 48rem;
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
    }
    .tiles {
      display: flex;
      flex-wrap: wrap;
      gap: 2rem 1.5rem;
    }
    .tile-figure {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      margin: 0;
    }
    /* The tile carries no shadow of its own — its only shadow is the token bound
       inline, so a missing token shows as a flat card, not a lie. Its fill is a
       raised container role, which is how M3 pairs a shadow with a lighter tone. */
    .tile {
      display: flex;
      align-items: center;
      justify-content: center;
      inline-size: 7rem;
      block-size: 5rem;
      border-radius: var(--mat-sys-corner-medium);
      background: var(--mat-sys-surface-container-low);
      color: var(--mat-sys-on-surface);
      font: var(--mat-sys-label-large);
    }
    .swatches {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .swatch {
      display: flex;
      align-items: flex-end;
      inline-size: 11rem;
      block-size: 5rem;
      padding: 0.75rem;
      border-radius: var(--mat-sys-corner-small);
      /* An outline so a swatch whose fill is near the page surface is still a
         distinct rectangle rather than dissolving into the background. */
      border: 1px solid var(--mat-sys-outline-variant);
      color: var(--mat-sys-on-surface);
    }
    code {
      font-family: monospace;
      font-size: 0.8rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .swatch code {
      color: inherit;
      word-break: break-all;
    }
  `,
})
class ElevationScale {
  /** The elevation shadow tokens, level0 → level5. */
  readonly levels = ELEVATION_LEVELS;
  /** The surface roles, dimmest → brightest. */
  readonly surfaces = SURFACE_TOKENS;
}

const meta: Meta<ElevationScale> = {
  title: 'Foundations/Elevation',
  component: ElevationScale,
  decorators: [moduleMetadata({ imports: [ElevationScale] })],
  parameters: {
    docs: {
      description: {
        component:
          'The Material 3 elevation and surface roles the shared theme ships. Each tile is ' +
          'raised with the theme\'s own shadow token (`box-shadow: var(--mat-sys-level3)`) and ' +
          'each swatch is filled with a surface role (`background: var(--mat-sys-surface-container)`), ' +
          'so the catalogue shows what the theme emits rather than a copy of it. Reach for a level ' +
          'or a surface role by its token — never a hand-rolled shadow or a hardcoded grey. Both are ' +
          '`light-dark()` roles, so use the **Scheme** toolbar to see them flip; `Foundations/Dark mode` ' +
          'shows the colour roles in both schemes at once.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<ElevationScale>;

/** Sum of the absolute pixel magnitudes in a computed `box-shadow`; ordering is all this needs. */
function shadowMagnitude(boxShadow: string): number {
  return (boxShadow.match(/-?\d*\.?\d+px/g) ?? []).reduce((sum, px) => sum + Math.abs(parseFloat(px)), 0);
}

/** The alpha channel of a computed `rgb/rgba(...)`, or 1 for an opaque `rgb()`. */
function alpha(color: string): number {
  const parts = color.match(/[\d.]+/g)?.map(Number) ?? [];
  return parts.length >= 4 ? parts[3]! : 1;
}

/**
 * The full elevation + surface catalogue.
 *
 * The play function is the assertion the story makes, not decoration. Without it
 * this is a screenshot that would keep passing if every token stopped resolving:
 * the tiles would all fall flat and the swatches all fall transparent, render
 * identically, and look like nothing was wrong. It instead reads the resolved
 * values back off the DOM and checks they are real and distinct.
 */
export const Scale: Story = {
  play: async ({ canvasElement }) => {
    const tiles = [...canvasElement.querySelectorAll<HTMLElement>('.tile')];
    const swatches = [...canvasElement.querySelectorAll<HTMLElement>('.swatch')];

    // One tile per level and one swatch per surface role — a token dropped from
    // either list would render one fewer.
    expect(tiles).toHaveLength(ELEVATION_LEVELS.length);
    expect(swatches).toHaveLength(SURFACE_TOKENS.length);

    // Every level resolved to a real box-shadow value, and the ladder actually
    // climbs: level0 is the flat resting shadow (magnitude 0) and each step casts
    // strictly further. Had the tokens all collapsed to the inherited default,
    // this strict ordering would fail rather than pass.
    const magnitudes = tiles.map((tile) => shadowMagnitude(getComputedStyle(tile).boxShadow));
    expect(magnitudes[0]).toBe(0);
    for (let i = 1; i < magnitudes.length; i++) {
      expect(magnitudes[i]!).toBeGreaterThan(magnitudes[i - 1]!);
    }

    // Every surface role resolved to an opaque fill (a dropped token would paint
    // transparent), and the ramp is not flat: its dimmest and brightest ends
    // differ, which they cannot if the tokens stopped resolving to distinct tones.
    const backgrounds = swatches.map((swatch) => getComputedStyle(swatch).backgroundColor);
    for (const background of backgrounds) {
      expect(alpha(background)).toBe(1);
    }
    expect(backgrounds[0]).not.toBe(backgrounds.at(-1));
  },
};
