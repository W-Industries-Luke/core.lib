import {
  argbFromHex,
  DislikeAnalyzer,
  DynamicScheme,
  Hct,
  hexFromArgb,
  TemperatureCache,
  TonalPalette,
  Variant,
} from '@material/material-color-utilities';

/**
 * Runtime M3 palette maths for the `Foundations/Theme Generator` story.
 *
 * This is story support and is deliberately NOT a library component — nothing
 * here is exported from public-api.ts. `@material/material-color-utilities` is a
 * **devDependency**: it is the exact colour library Angular Material's own
 * `ng generate @angular/material:theme-color` schematic bundles, so the palettes
 * this previews are the palettes that command would commit — but it must never
 * leak into the published library's runtime, which ships hand-picked tokens from
 * `_theme.scss`, not a colour engine.
 *
 * `generateThemePalettes` reimplements the schematic's `getColorPalettes`
 * (`@angular/material/schematics/ng-generate/theme-color/index_bundled.js`) against
 * the same primitives so a preview cannot drift from what gets generated:
 * secondary/tertiary/neutral/neutral-variant/error are all *derived* from the
 * source colour by the algorithm — never asked for.
 */

/** The names of the six palettes an M3 theme is built from, in reading order. */
export type PaletteName =
  'primary' | 'secondary' | 'tertiary' | 'neutral' | 'neutral-variant' | 'error';

/** The palettes in the order they are worth reading. */
export const PALETTE_NAMES: readonly PaletteName[] = [
  'primary',
  'secondary',
  'tertiary',
  'neutral',
  'neutral-variant',
  'error',
];

/**
 * The M3-standard tone stops, dark → light. This is the schematic's own
 * `HUE_TONES`: a tonal palette is continuous, but these are the stops the roles
 * are actually picked from (tone 40 → light `primary`, tone 80 → dark `primary`,
 * and so on), so they are the stops worth showing.
 */
export const PALETTE_TONES: readonly number[] = [
  0, 10, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100,
];

/** One resolved swatch: a tone number and the hex it produces in this palette. */
export interface ToneSwatch {
  /** The HCT tone, 0 (black) → 100 (white). */
  readonly tone: number;
  /** The hex colour at this tone, e.g. `#6750a4`. */
  readonly hex: string;
  /** `#000` or `#fff`, whichever is legible on {@link hex} — for the label. */
  readonly onHex: string;
}

/** One generated palette: its name and every {@link PALETTE_TONES} tone resolved. */
export interface GeneratedPalette {
  readonly name: PaletteName;
  readonly tones: readonly ToneSwatch[];
}

/** The full generated theme: the six palettes, each a tonal ramp. */
export type GeneratedTheme = readonly GeneratedPalette[];

/**
 * One M3 colour role and the tone each scheme picks for it from a palette. This
 * is what makes "the same tonal palettes produce both light and dark" concrete:
 * light reads a role low on the ramp and dark reads it high, off the identical
 * palette. Tones from the M3 baseline scheme (`primary` 40/80, its container
 * 90/30, and so on).
 */
export interface SchemeRole {
  /** The role label, e.g. `primary` or `on-primary-container`. */
  readonly label: string;
  /** Which palette the tone is read from. */
  readonly palette: PaletteName;
  /** The tone the light scheme assigns this role. */
  readonly lightTone: number;
  /** The tone the dark scheme assigns this role. */
  readonly darkTone: number;
}

/**
 * The headline roles and the tones each scheme reads for them, in M3's own
 * mapping. Not every role — enough to show a full container pairing per palette
 * and the surface/outline neutrals, which is what demonstrates the derivation.
 */
export const SCHEME_ROLES: readonly SchemeRole[] = [
  { label: 'primary', palette: 'primary', lightTone: 40, darkTone: 80 },
  { label: 'on-primary', palette: 'primary', lightTone: 100, darkTone: 20 },
  { label: 'primary-container', palette: 'primary', lightTone: 90, darkTone: 30 },
  { label: 'on-primary-container', palette: 'primary', lightTone: 10, darkTone: 90 },
  { label: 'secondary', palette: 'secondary', lightTone: 40, darkTone: 80 },
  { label: 'secondary-container', palette: 'secondary', lightTone: 90, darkTone: 30 },
  { label: 'tertiary', palette: 'tertiary', lightTone: 40, darkTone: 80 },
  { label: 'tertiary-container', palette: 'tertiary', lightTone: 90, darkTone: 30 },
  { label: 'error', palette: 'error', lightTone: 40, darkTone: 80 },
  { label: 'error-container', palette: 'error', lightTone: 90, darkTone: 30 },
  { label: 'surface', palette: 'neutral', lightTone: 98, darkTone: 6 },
  { label: 'on-surface', palette: 'neutral', lightTone: 10, darkTone: 90 },
  { label: 'surface-container', palette: 'neutral', lightTone: 94, darkTone: 12 },
  { label: 'outline', palette: 'neutral-variant', lightTone: 50, darkTone: 60 },
];

/** The default source colour — Material's baseline primary, so an unset control still previews. */
export const DEFAULT_PRIMARY_COLOR = '#6750a4';

/**
 * Normalise a CSS colour from a Storybook colour control to `#rrggbb`.
 *
 * The colour control can hand back `#rgb`, `#rrggbb`, `#rrggbbaa` or
 * `rgb()/rgba()` depending on how the user picked it; the palette maths only
 * speaks 6-digit hex. Alpha is dropped — a tonal palette is opaque. Returns
 * `null` for anything unparseable so callers can fall back rather than throw.
 */
export function parseColorToHex(input: string): string | null {
  const value = input.trim().toLowerCase();

  const rgb = value.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (rgb) {
    const channels = [rgb[1], rgb[2], rgb[3]].map((c) => {
      const n = Math.round(Number(c));
      return Math.max(0, Math.min(255, n));
    });
    return '#' + channels.map((c) => c.toString(16).padStart(2, '0')).join('');
  }

  const hex = value.match(/^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3) {
      digits = digits
        .split('')
        .map((d) => d + d)
        .join('');
    }
    return '#' + digits.slice(0, 6);
  }

  return null;
}

/** WCAG relative luminance of an opaque `#rrggbb`. */
function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const srgb = parseInt(hex.slice(i, i + 2), 16) / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * `#000` or `#fff`, whichever has the higher WCAG contrast against `hex` — so a
 * swatch's own label is always the legible one. This follows M3's "tones 0–40
 * are dark, 60–100 light" rule but decides by measured contrast rather than by
 * the tone number, which keeps a saturated mid-tone label readable too and keeps
 * the story passing `test:a11y`.
 */
export function legibleTextColor(hex: string): string {
  const bg = relativeLuminance(hex);
  const onWhite = (1 + 0.05) / (bg + 0.05);
  const onBlack = (bg + 0.05) / 0.05;
  return onBlack >= onWhite ? '#000000' : '#ffffff';
}

/** Resolve one palette to a swatch per {@link PALETTE_TONES} tone. */
function toSwatches(name: PaletteName, palette: TonalPalette): GeneratedPalette {
  const tones = PALETTE_TONES.map((tone) => toSwatch(palette, tone));
  return { name, tones };
}

/** Resolve a single tone of a palette to a labelled swatch. */
function toSwatch(palette: TonalPalette, tone: number): ToneSwatch {
  const hex = hexFromArgb(palette.tone(tone));
  return { tone, hex, onHex: legibleTextColor(hex) };
}

/**
 * Build the six M3 tonal palettes from a source colour — the runtime twin of the
 * schematic's `getColorPalettes`.
 *
 * `secondaryColor` is optional: pass a hex to pin it, or omit it to let the
 * algorithm derive a muted-sibling secondary from the primary. Tertiary
 * (analogous, de-disliked), neutral, neutral-variant and error are always
 * derived — the whole point being to *see* what a single brand colour implies.
 *
 * @param primaryColor A CSS colour string (hex or `rgb()`), the brand source.
 * @param secondaryColor Optional hex/`rgb()` to pin secondary; falsy to derive.
 */
function buildTonalPalettes(
  primaryColor: string,
  secondaryColor?: string,
): Record<PaletteName, TonalPalette> {
  const primaryHex = parseColorToHex(primaryColor) ?? DEFAULT_PRIMARY_COLOR;
  const primaryColorHct = Hct.fromInt(argbFromHex(primaryHex));
  const primaryPalette = TonalPalette.fromHct(primaryColorHct);

  const secondaryHex = secondaryColor ? parseColorToHex(secondaryColor) : null;
  const secondaryPalette = secondaryHex
    ? TonalPalette.fromHct(Hct.fromInt(argbFromHex(secondaryHex)))
    : TonalPalette.fromHueAndChroma(
        primaryColorHct.hue,
        Math.max(primaryColorHct.chroma - 32, primaryColorHct.chroma * 0.5),
      );

  const tertiaryPalette = TonalPalette.fromInt(
    DislikeAnalyzer.fixIfDisliked(new TemperatureCache(primaryColorHct).analogous(3, 6)[2]).toInt(),
  );

  const neutralPalette = TonalPalette.fromHueAndChroma(
    primaryColorHct.hue,
    primaryColorHct.chroma / 8,
  );

  const neutralVariantPalette = TonalPalette.fromHueAndChroma(
    primaryColorHct.hue,
    primaryColorHct.chroma / 8 + 4,
  );

  const errorPalette = new DynamicScheme({
    sourceColorHct: primaryPalette.keyColor,
    variant: Variant.FIDELITY,
    contrastLevel: 0,
    isDark: false,
    primaryPalette,
    secondaryPalette,
    tertiaryPalette,
    neutralPalette,
    neutralVariantPalette,
  }).errorPalette;

  return {
    primary: primaryPalette,
    secondary: secondaryPalette,
    tertiary: tertiaryPalette,
    neutral: neutralPalette,
    'neutral-variant': neutralVariantPalette,
    error: errorPalette,
  };
}

/**
 * The six M3 tonal palettes for a source colour, sampled at {@link PALETTE_TONES}.
 * See {@link buildTonalPalettes} for how each is derived.
 */
export function generateThemePalettes(
  primaryColor: string,
  secondaryColor?: string,
): GeneratedTheme {
  const palettes = buildTonalPalettes(primaryColor, secondaryColor);
  return PALETTE_NAMES.map((name) => toSwatches(name, palettes[name]));
}

/** A role resolved in both schemes — the same palette read at two tones. */
export interface ResolvedRole {
  /** The role label, e.g. `primary-container`. */
  readonly label: string;
  /** The tone the light scheme reads, and the hex + legible label colour there. */
  readonly light: ToneSwatch;
  /** The tone the dark scheme reads, and the hex + legible label colour there. */
  readonly dark: ToneSwatch;
}

/**
 * Resolve {@link SCHEME_ROLES} against a source colour, giving each role its light
 * and dark hex. This is what makes "one tonal palette, two schemes" concrete: both
 * hexes come from the *same* palette, read at a low tone for light and a high tone
 * for dark.
 */
export function generateSchemeRoles(
  primaryColor: string,
  secondaryColor?: string,
): readonly ResolvedRole[] {
  const palettes = buildTonalPalettes(primaryColor, secondaryColor);
  return SCHEME_ROLES.map(({ label, palette, lightTone, darkTone }) => ({
    label,
    light: toSwatch(palettes[palette], lightTone),
    dark: toSwatch(palettes[palette], darkTone),
  }));
}

/**
 * The `ng generate @angular/material:theme-color` command that turns this preview
 * into a committed theme, with `--include-high-contrast` as the story always
 * recommends. `--secondary-color` is only emitted when the user pinned one — an
 * empty secondary means "let Material derive it", which is the flag's absence.
 */
export function themeColorCommand(primaryColor: string, secondaryColor?: string): string {
  const primaryHex = parseColorToHex(primaryColor) ?? DEFAULT_PRIMARY_COLOR;
  const secondaryHex = secondaryColor ? parseColorToHex(secondaryColor) : null;

  const parts = ['ng generate @angular/material:theme-color', `--primary-color ${primaryHex}`];
  if (secondaryHex) {
    parts.push(`--secondary-color ${secondaryHex}`);
  }
  parts.push('--include-high-contrast');
  return parts.join(' ');
}
