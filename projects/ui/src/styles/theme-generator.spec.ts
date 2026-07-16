import { argbFromHex, Hct } from '@material/material-color-utilities';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PRIMARY_COLOR,
  generateSchemeRoles,
  generateThemePalettes,
  legibleTextColor,
  PALETTE_NAMES,
  PALETTE_TONES,
  parseColorToHex,
  SCHEME_ROLES,
  themeColorCommand,
  type PaletteName,
} from './theme-generator';

/** WCAG relative luminance of an opaque `#rrggbb`, for the ordering assertions. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const srgb = parseInt(hex.slice(i, i + 2), 16) / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Chroma of a hex, for asserting the derived secondary is a muted sibling. */
function chromaOf(hex: string): number {
  return Hct.fromInt(argbFromHex(hex)).chroma;
}

describe('parseColorToHex', () => {
  it('normalises the hex forms a colour control emits to #rrggbb', () => {
    expect(parseColorToHex('#6750A4')).toBe('#6750a4');
    expect(parseColorToHex('6750a4')).toBe('#6750a4');
    expect(parseColorToHex('#abc')).toBe('#aabbcc');
    // 8-digit: alpha is dropped, a tonal palette is opaque.
    expect(parseColorToHex('#6750a4ff')).toBe('#6750a4');
  });

  it('normalises rgb() and rgba() to #rrggbb', () => {
    expect(parseColorToHex('rgb(103, 80, 164)')).toBe('#6750a4');
    expect(parseColorToHex('rgba(103, 80, 164, 0.5)')).toBe('#6750a4');
    // An over-range channel is clamped to the byte range rather than overflowing.
    expect(parseColorToHex('rgb(300, 20, 5)')).toBe('#ff1405');
  });

  it('returns null for anything it cannot parse', () => {
    expect(parseColorToHex('rebeccapurple')).toBeNull();
    expect(parseColorToHex('#12')).toBeNull();
    expect(parseColorToHex('')).toBeNull();
  });
});

describe('legibleTextColor', () => {
  it('picks white text on dark colours and black on light', () => {
    expect(legibleTextColor('#000000')).toBe('#ffffff');
    expect(legibleTextColor('#1a1a2e')).toBe('#ffffff');
    expect(legibleTextColor('#ffffff')).toBe('#000000');
    expect(legibleTextColor('#eaddff')).toBe('#000000');
  });

  it('meets a 4.5:1 contrast ratio against its swatch', () => {
    // Every generated swatch is labelled with this colour, so a11y depends on it.
    for (const palette of generateThemePalettes(DEFAULT_PRIMARY_COLOR)) {
      for (const { hex, onHex } of palette.tones) {
        const [a, b] = [luminance(hex), luminance(onHex)];
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        expect(ratio, `${onHex} on ${hex}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe('generateThemePalettes', () => {
  it('produces the six M3 palettes in reading order, each a full tonal ramp', () => {
    const theme = generateThemePalettes(DEFAULT_PRIMARY_COLOR);
    expect(theme.map((p) => p.name)).toEqual([...PALETTE_NAMES]);
    for (const palette of theme) {
      expect(palette.tones.map((t) => t.tone)).toEqual([...PALETTE_TONES]);
      for (const { hex } of palette.tones) {
        expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it('anchors every palette at pure black (tone 0) and pure white (tone 100)', () => {
    for (const palette of generateThemePalettes('#00695c')) {
      expect(palette.tones.at(0)).toMatchObject({ tone: 0, hex: '#000000' });
      expect(palette.tones.at(-1)).toMatchObject({ tone: 100, hex: '#ffffff' });
    }
  });

  it('increases luminance monotonically with tone within every palette', () => {
    // A tonal palette is a lightness ramp; if this ordering broke, the maths did.
    for (const palette of generateThemePalettes('#b3261e')) {
      const lums = palette.tones.map((t) => luminance(t.hex));
      for (let i = 1; i < lums.length; i++) {
        expect(lums[i], `${palette.name} tone ${palette.tones[i].tone}`).toBeGreaterThan(
          lums[i - 1],
        );
      }
    }
  });

  it('reproduces the source colour at its own tone', () => {
    const source = '#1565c0';
    const sourceHct = Hct.fromInt(argbFromHex(source));
    const nearestTone = PALETTE_TONES.reduce((best, tone) =>
      Math.abs(tone - sourceHct.tone) < Math.abs(best - sourceHct.tone) ? tone : best,
    );
    const primary = generateThemePalettes(source)[0];
    const swatch = primary.tones.find((t) => t.tone === nearestTone)!;
    // Same hue and chroma at the same tone → within a few tone-units of the source.
    expect(chromaOf(swatch.hex)).toBeCloseTo(sourceHct.chroma, -1);
  });

  it('derives a muted secondary from the primary when none is pinned', () => {
    const [primary, secondary] = generateThemePalettes('#1565c0');
    const at40 = (name: PaletteName, tone: number) =>
      [primary, secondary].find((p) => p.name === name)!.tones.find((t) => t.tone === tone)!.hex;
    // The schematic derives secondary at roughly half the primary's chroma.
    expect(chromaOf(at40('secondary', 40))).toBeLessThan(chromaOf(at40('primary', 40)));
  });

  it('honours a pinned secondary colour instead of deriving one', () => {
    const derived = generateThemePalettes('#1565c0');
    const pinned = generateThemePalettes('#1565c0', '#00695c');
    const secondaryOf = (theme: ReturnType<typeof generateThemePalettes>) =>
      theme.find((p) => p.name === 'secondary')!.tones.find((t) => t.tone === 40)!.hex;
    expect(secondaryOf(pinned)).not.toBe(secondaryOf(derived));
    // The primary is untouched by pinning the secondary.
    expect(derived[0]).toEqual(pinned[0]);
  });

  it('falls back to the default source for an unparseable colour', () => {
    expect(generateThemePalettes('not-a-colour')).toEqual(
      generateThemePalettes(DEFAULT_PRIMARY_COLOR),
    );
  });
});

describe('generateSchemeRoles', () => {
  it('resolves every role in both schemes from the same palettes', () => {
    const roles = generateSchemeRoles(DEFAULT_PRIMARY_COLOR);
    expect(roles.map((r) => r.label)).toEqual(SCHEME_ROLES.map((r) => r.label));
    for (const role of roles) {
      expect(role.light.hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(role.dark.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('reads a lighter tone for light and a darker tone for dark on the bold roles', () => {
    // primary is tone 40 in light, tone 80 in dark — so the dark swatch is lighter.
    const primary = generateSchemeRoles(DEFAULT_PRIMARY_COLOR).find((r) => r.label === 'primary')!;
    expect(luminance(primary.dark.hex)).toBeGreaterThan(luminance(primary.light.hex));
    // ...while the surface flips the other way: bright in light, near-black in dark.
    const surface = generateSchemeRoles(DEFAULT_PRIMARY_COLOR).find((r) => r.label === 'surface')!;
    expect(luminance(surface.light.hex)).toBeGreaterThan(luminance(surface.dark.hex));
  });
});

describe('themeColorCommand', () => {
  it('emits the primary colour and always includes high contrast', () => {
    const cmd = themeColorCommand('#6750a4');
    expect(cmd).toContain('ng generate @angular/material:theme-color');
    expect(cmd).toContain('--primary-color #6750a4');
    expect(cmd).toContain('--include-high-contrast');
    expect(cmd).not.toContain('--secondary-color');
  });

  it('emits --secondary-color only when a secondary is pinned', () => {
    const cmd = themeColorCommand('#6750a4', '#b58392');
    expect(cmd).toContain('--secondary-color #b58392');
    // Empty secondary means "let Material derive it" — the flag's absence.
    expect(themeColorCommand('#6750a4', '')).not.toContain('--secondary-color');
  });

  it('normalises non-hex inputs before writing the command', () => {
    expect(themeColorCommand('rgb(103, 80, 164)')).toContain('--primary-color #6750a4');
  });
});
