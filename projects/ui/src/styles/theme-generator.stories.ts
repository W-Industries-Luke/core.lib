import { Component, computed, input, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { expect } from 'storybook/test';

import {
  DEFAULT_PRIMARY_COLOR,
  generateSchemeRoles,
  generateThemePalettes,
  PALETTE_TONES,
  themeColorCommand,
} from './theme-generator';

/**
 * Interactive M3 theme previewer for `Foundations/Theme Generator`.
 *
 * Deliberately NOT a library component — nothing here is exported from
 * public-api.ts, and the colour maths lives in the `theme-generator` **story
 * support** module, whose one dependency (`@material/material-color-utilities`) is
 * a devDependency so it never ships to consumers. This story only *previews*
 * candidate themes: it does not touch `_theme.scss`, and turning a pick into a
 * real theme is the `ng generate` command it prints, run in a separate change.
 */
@Component({
  selector: 'ui-theme-generator',
  template: `
    <section class="tg">
      <!-- The pick, as a runnable command. Copying this and running it is how a
           colour chosen here becomes a committed theme. -->
      <div class="tg__command">
        <code class="tg__command-text">{{ command() }}</code>
        <button type="button" class="tg__copy" (click)="copy()">
          {{ copied() ? 'Copied' : 'Copy' }}
        </button>
      </div>

      <!-- The six tonal palettes. These are scheme-independent: the same ramps
           feed both light and dark below. -->
      <div class="tg__palettes">
        @for (palette of palettes(); track palette.name) {
          <div class="tg__palette">
            <span class="tg__palette-name">{{ palette.name }}</span>
            <div class="tg__ramp">
              @for (swatch of palette.tones; track swatch.tone) {
                <span
                  class="tg__swatch"
                  [style.background]="swatch.hex"
                  [style.color]="swatch.onHex"
                >
                  <span class="tg__tone">{{ swatch.tone }}</span>
                  <span class="tg__hex">{{ swatch.hex }}</span>
                </span>
              }
            </div>
          </div>
        }
      </div>

      <!-- The same palettes, resolved into roles, in both schemes side by side:
           each pair reads one palette at a low tone (light) and a high tone
           (dark), which is how one tonal palette produces both. The toggle rings
           the active scheme; both are always shown so the derivation is visible. -->
      <div class="tg__schemes">
        @for (panel of schemePanels(); track panel.key) {
          <div
            class="tg__scheme"
            [class.tg__scheme--active]="panel.key === scheme()"
            [style.background]="panel.bg"
            [style.color]="panel.fg"
          >
            <h3 class="tg__scheme-name">{{ panel.name }}</h3>
            <div class="tg__roles">
              @for (role of panel.swatches; track role.label) {
                <span class="tg__role" [style.background]="role.hex" [style.color]="role.onHex">
                  <span class="tg__role-label">{{ role.label }}</span>
                  <span class="tg__hex">{{ role.tone }} · {{ role.hex }}</span>
                </span>
              }
            </div>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .tg {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface);
    }
    .tg__command {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
      padding: 0.75rem 1rem;
      border-radius: var(--mat-sys-corner-medium);
      background: var(--mat-sys-surface-container);
      border: 1px solid var(--mat-sys-outline-variant);
    }
    .tg__command-text {
      flex: 1 1 20rem;
      font-family: monospace;
      font-size: 0.85rem;
      word-break: break-all;
      color: var(--mat-sys-on-surface);
    }
    /* A plain themed button — the copy affordance, not a library surface. */
    .tg__copy {
      flex: 0 0 auto;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: var(--mat-sys-corner-full);
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
      font: var(--mat-sys-label-large);
      cursor: pointer;
    }
    .tg__palettes {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .tg__palette {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .tg__palette-name {
      flex: 0 0 8rem;
      font: var(--mat-sys-title-small);
    }
    .tg__ramp {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }
    .tg__swatch {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      inline-size: 4.5rem;
      block-size: 3.25rem;
      padding: 0.35rem 0.4rem;
      border-radius: var(--mat-sys-corner-extra-small);
      /* A hairline outline so a near-white/near-black tone is still a rectangle
         rather than dissolving into the page. */
      border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
    }
    .tg__tone {
      font: var(--mat-sys-label-medium);
      font-weight: 600;
    }
    .tg__hex {
      font-family: monospace;
      font-size: 0.65rem;
    }
    .tg__schemes {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .tg__scheme {
      flex: 1 1 20rem;
      padding: 1.25rem;
      border-radius: var(--mat-sys-corner-large);
      border: 2px solid transparent;
    }
    /* The toolbar toggle rings the scheme it selects; the other stays visible so
       the two can be compared. */
    .tg__scheme--active {
      border-color: var(--mat-sys-primary);
    }
    .tg__scheme-name {
      margin: 0 0 1rem;
      font: var(--mat-sys-title-medium);
    }
    .tg__roles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
      gap: 0.5rem;
    }
    .tg__role {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.6rem 0.7rem;
      border-radius: var(--mat-sys-corner-small);
    }
    .tg__role-label {
      font: var(--mat-sys-label-large);
    }
  `,
})
class ThemeGenerator {
  /** The brand source colour. Every other palette is derived from it. */
  readonly primaryColor = input<string>(DEFAULT_PRIMARY_COLOR);
  /** An optional pinned secondary; empty means "let Material derive it". */
  readonly secondaryColor = input<string>('');
  /** Which scheme the toggle emphasises. Both are always rendered. */
  readonly scheme = input<'light' | 'dark'>('light');

  /** The six tonal palettes for the current source colour(s). */
  readonly palettes = computed(() =>
    generateThemePalettes(this.primaryColor(), this.secondaryColor() || undefined),
  );

  /** The `ng generate` command that would commit the current pick. */
  readonly command = computed(() =>
    themeColorCommand(this.primaryColor(), this.secondaryColor() || undefined),
  );

  /** Light and dark role panels, each reading the same palettes at its own tones. */
  readonly schemePanels = computed(() => {
    const roles = generateSchemeRoles(this.primaryColor(), this.secondaryColor() || undefined);
    const surface = roles.find((r) => r.label === 'surface')!;
    const onSurface = roles.find((r) => r.label === 'on-surface')!;
    return [
      {
        key: 'light' as const,
        name: 'Light',
        bg: surface.light.hex,
        fg: onSurface.light.hex,
        swatches: roles.map((r) => ({ label: r.label, ...r.light })),
      },
      {
        key: 'dark' as const,
        name: 'Dark',
        bg: surface.dark.hex,
        fg: onSurface.dark.hex,
        swatches: roles.map((r) => ({ label: r.label, ...r.dark })),
      },
    ];
  });

  /** Whether the last copy succeeded — flips the button label briefly. */
  readonly copied = signal(false);

  /** Copy the `ng generate` command to the clipboard, tolerating its absence. */
  async copy(): Promise<void> {
    try {
      await navigator.clipboard?.writeText(this.command());
      this.copied.set(true);
    } catch {
      // A denied or missing clipboard is fine — the command is on screen to copy
      // by hand. Leave the label unchanged rather than claim a copy that failed.
    }
  }
}

const meta: Meta<ThemeGenerator> = {
  title: 'Foundations/Theme Generator',
  component: ThemeGenerator,
  decorators: [moduleMetadata({ imports: [ThemeGenerator] })],
  args: {
    primaryColor: DEFAULT_PRIMARY_COLOR,
    secondaryColor: '',
    scheme: 'light',
  },
  argTypes: {
    primaryColor: { control: 'color' },
    // The colour control has no "empty" state, so a text control keeps the
    // "leave blank to derive" behaviour reachable.
    secondaryColor: { control: 'text' },
    scheme: { control: 'inline-radio', options: ['light', 'dark'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Pick one or two colours and see the full Material 3 theme they produce — every tonal ' +
          'palette, and how light and dark schemes read the same palettes at different tones — ' +
          'generated **in the browser** with `@material/material-color-utilities` (a devDependency, ' +
          'the same colour maths as `ng generate @angular/material:theme-color`). Set **primaryColor** ' +
          'and optionally pin **secondaryColor** (leave it blank to let Material derive one); tertiary, ' +
          'neutral, neutral-variant and error are always derived. Nothing here is applied to the shipped ' +
          'theme — copy the printed command to turn a pick into a committed `_theme.scss`.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<ThemeGenerator>;

/** Material's baseline purple, with a derived secondary. The default starting point. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    // The maths ran client-side and produced real, distinct colours — not a
    // screenshot that would keep passing if the palette engine returned nothing.
    const ramps = canvasElement.querySelectorAll('.tg__ramp');
    expect(ramps).toHaveLength(6);

    const firstRamp = ramps[0]!.querySelectorAll<HTMLElement>('.tg__swatch');
    expect(firstRamp).toHaveLength(PALETTE_TONES.length);
    const fills = [...firstRamp].map((s) => getComputedStyle(s).backgroundColor);
    // tone 0 and tone 100 are black and white, so the ramp cannot be flat.
    expect(new Set(fills).size).toBeGreaterThan(1);

    // Both schemes render, and the command carries the high-contrast flag.
    expect(canvasElement.querySelectorAll('.tg__scheme')).toHaveLength(2);
    expect(canvasElement.querySelector('.tg__command-text')?.textContent).toContain(
      '--include-high-contrast',
    );
  },
};

/** A pinned secondary colour instead of the derived one — note the command gains `--secondary-color`. */
export const PinnedSecondary: Story = {
  args: { primaryColor: '#1565c0', secondaryColor: '#00695c' },
};

/** The dark scheme emphasised. Both panels still render — the toggle only rings one. */
export const DarkEmphasis: Story = {
  args: { primaryColor: '#b3261e', scheme: 'dark' },
};
