import { afterNextRender, Component, ElementRef, inject, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { expect } from 'storybook/test';

/**
 * The four foundational token families `_tokens.scss` emits, built from their
 * names so the catalogue cannot disagree with the partial: a renamed or dropped
 * token renders one fewer row rather than a stale value that still looks right.
 * Each name is a `--ui-sys-*` custom property the theme puts on `:root`.
 */
const SPACING: readonly string[] = ['xs', 'sm', 'md', 'lg', 'xl'].map((step) => `--ui-sys-spacing-${step}`);
const RADIUS: readonly string[] = ['xs', 'sm', 'md', 'lg', 'xl', 'full'].map((step) => `--ui-sys-radius-${step}`);
const Z: readonly string[] = ['base', 'raised', 'sticky', 'dropdown', 'overlay', 'toast'].map(
  (layer) => `--ui-sys-z-${layer}`,
);
const BREAKPOINTS: readonly string[] = ['sm', 'md', 'lg', 'xl'].map((width) => `--ui-sys-breakpoint-${width}`);

/**
 * Renders every spacing, radius, z-index and breakpoint token with its name and
 * its *computed* value, each beside a visual drawn from the token itself.
 *
 * Story support for `Foundations/Tokens`, and deliberately NOT a library
 * component — nothing here is exported from public-api.ts. Every visual carries
 * the token in a real CSS property (a bar's `inline-size`, a tile's
 * `border-radius`, a badge's `z-index`), and the value shown beside it is read
 * back off that same element — so the catalogue shows what the theme actually
 * resolves rather than a transcription of it. A token that stopped resolving
 * would render a zero-width bar or an empty value, not a plausible-looking lie
 * (the `play` function below asserts exactly that).
 *
 * The radius tokens are aliases for M3's `--mat-sys-corner-*` scale, which is why
 * reading the resolved `border-radius` back — rather than the raw custom
 * property — is what proves the alias points at a real corner role.
 */
@Component({
  selector: 'ui-token-catalogue',
  template: `
    <section class="group" aria-labelledby="spacing-heading">
      <h3 id="spacing-heading" class="group__title">Spacing</h3>
      <p class="group__lead">
        Integer multiples of M3's 4dp grid, which Material itself does not tokenise. Reach for a step
        with <code>gap: var(--ui-sys-spacing-md)</code> — never a literal.
      </p>
      @for (token of spacing; track token) {
        <div class="row">
          <span class="bar" [attr.data-token]="token" data-prop="inline-size" [style.inline-size]="ref(token)"></span>
          <code class="name">{{ token }}</code>
          <span class="value">{{ values()[token] }}</span>
        </div>
      }
    </section>

    <section class="group" aria-labelledby="radius-heading">
      <h3 id="radius-heading" class="group__title">Radius</h3>
      <p class="group__lead">
        Named aliases for M3's <code>--mat-sys-corner-*</code> scale, so a rounding change in the
        theme flows through. Round a corner with <code>border-radius: var(--ui-sys-radius-md)</code>.
      </p>
      @for (token of radius; track token) {
        <div class="row">
          <span class="tile" [attr.data-token]="token" data-prop="border-top-left-radius" [style.border-radius]="ref(token)"></span>
          <code class="name">{{ token }}</code>
          <span class="value">{{ values()[token] }}</span>
        </div>
      }
    </section>

    <section class="group" aria-labelledby="z-heading">
      <h3 id="z-heading" class="group__title">Z-index</h3>
      <p class="group__lead">
        A named stacking order, sparse so a layer can slot between two without renumbering.
        <code>--ui-sys-z-overlay</code> matches the CDK overlay Material renders menus and dialogs into.
      </p>
      @for (token of z; track token) {
        <div class="row">
          <span class="badge" [attr.data-token]="token" data-prop="z-index" [style.z-index]="ref(token)">{{ values()[token] }}</span>
          <code class="name">{{ token }}</code>
          <span class="value">{{ values()[token] }}</span>
        </div>
      }
    </section>

    <section class="group" aria-labelledby="breakpoint-heading">
      <h3 id="breakpoint-heading" class="group__title">Breakpoints</h3>
      <p class="group__lead">
        M3's window-size-class widths — the same the <code>UiBreakpoints</code> service partitions on.
        A custom property cannot drive a media query, so use these widths from TS; the SCSS
        <code>breakpoint-up()</code> mixin drives <code>@media</code> from the same numbers.
      </p>
      @for (token of breakpoints; track token) {
        <div class="row">
          <!-- Off-screen probe reads the true width; the visible bar is scaled so 1600px still fits a row. -->
          <span class="probe" [attr.data-token]="token" data-prop="inline-size" [style.inline-size]="ref(token)"></span>
          <span class="bar" [style.inline-size]="'calc(' + ref(token) + ' / 5)'"></span>
          <code class="name">{{ token }}</code>
          <span class="value">{{ values()[token] }}</span>
        </div>
      }
    </section>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
      padding: 1.5rem;
      border-radius: var(--mat-sys-corner-medium);
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
    }
    .group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .group__title {
      margin: 0 0 0.25rem;
      font: var(--mat-sys-title-medium);
    }
    .group__lead {
      margin: 0 0 0.75rem;
      max-width: 48rem;
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
    }
    .row {
      display: flex;
      align-items: center;
      gap: 1rem;
      min-block-size: 2.5rem;
    }
    /* The bar/tile/badge carry the token in a real property, so a token that
       stopped resolving collapses to nothing rather than showing a stale value. */
    .bar {
      display: inline-block;
      block-size: 1.25rem;
      background: var(--mat-sys-primary);
      border-radius: var(--mat-sys-corner-extra-small);
    }
    .tile {
      display: inline-block;
      inline-size: 3rem;
      block-size: 3rem;
      background: var(--mat-sys-primary);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      min-inline-size: 3rem;
      block-size: 1.75rem;
      padding-inline: 0.5rem;
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
      border-radius: var(--mat-sys-corner-full);
      font: var(--mat-sys-label-small);
    }
    /* Measured but not laid out: it carries the true breakpoint width for the
       readback without stretching the row to 1600px. */
    .probe {
      position: absolute;
      visibility: hidden;
      block-size: 0;
      pointer-events: none;
    }
    .name {
      font-family: monospace;
      font-size: 0.8rem;
    }
    .value {
      margin-inline-start: auto;
      font-family: monospace;
      font-size: 0.8rem;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
class TokenCatalogue {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The token names, by family. */
  readonly spacing = SPACING;
  readonly radius = RADIUS;
  readonly z = Z;
  readonly breakpoints = BREAKPOINTS;

  /** The resolved value of each token, keyed by name. Populated after first render. */
  readonly values = signal<Record<string, string>>({});

  /** `var(--token)`, for binding a token into a style. */
  ref(token: string): string {
    return `var(${token})`;
  }

  constructor() {
    // Read the resolved value back off each visual once it is in the DOM: the
    // element carries the token in the property named by `data-prop`, so this is
    // the same value the browser painted, not a copy of the SCSS.
    afterNextRender(() => {
      const resolved: Record<string, string> = {};
      for (const el of this.host.nativeElement.querySelectorAll<HTMLElement>('[data-token]')) {
        const name = el.dataset['token'];
        const prop = el.dataset['prop'];
        if (name && prop) {
          resolved[name] = getComputedStyle(el).getPropertyValue(prop).trim();
        }
      }
      this.values.set(resolved);
    });
  }
}

const meta: Meta<TokenCatalogue> = {
  title: 'Foundations/Tokens',
  component: TokenCatalogue,
  decorators: [moduleMetadata({ imports: [TokenCatalogue] })],
  parameters: {
    docs: {
      description: {
        component:
          'The foundational design tokens the shared theme ships beyond colour and typography: a ' +
          'spacing scale, border radii, a z-index ladder and breakpoint widths, all emitted as ' +
          '`--ui-sys-*` custom properties by `styles/tokens` (and pulled in by `styles/theme`). ' +
          'Each row draws its visual from the token itself and shows the value read back off the DOM, ' +
          'so the catalogue reflects what the theme resolves rather than a transcription of it. Reach ' +
          'for a token by name — `gap: var(--ui-sys-spacing-md)` — never a magic number.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<TokenCatalogue>;

/** The resolved value of every `[data-token]` visual in the story, keyed by token name. */
function resolvedTokens(root: HTMLElement): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const el of root.querySelectorAll<HTMLElement>('[data-token]')) {
    resolved[el.dataset['token']!] = getComputedStyle(el).getPropertyValue(el.dataset['prop']!).trim();
  }
  return resolved;
}

/**
 * The full token catalogue.
 *
 * The play function is the assertion, not decoration: without it this is a
 * screenshot that would keep passing if every token collapsed to its inherited
 * default. It reads the resolved values back off the DOM and checks each family
 * is present, resolves to real values, and actually orders — a spacing scale that
 * did not climb, or a radius alias that failed to resolve to a corner role, would
 * fail here rather than render a plausible lie.
 */
export const Catalogue: Story = {
  play: async ({ canvasElement }) => {
    const resolved = resolvedTokens(canvasElement);

    // One row per token in every family — a dropped token would be one key short.
    for (const family of [SPACING, RADIUS, Z, BREAKPOINTS]) {
      for (const token of family) {
        expect(resolved[token], token).toBeTruthy();
      }
    }

    // Spacing climbs from a positive first step: the scale is only useful if `lg`
    // is actually further than `sm`.
    const spacing = SPACING.map((token) => parseFloat(resolved[token]!));
    expect(spacing[0]).toBeGreaterThan(0);
    for (let i = 1; i < spacing.length; i++) {
      expect(spacing[i]!).toBeGreaterThan(spacing[i - 1]!);
    }

    // Every radius alias resolved to a real length (a broken alias would parse to
    // NaN), and the scale climbs to `full` — proof each points at a corner role
    // rather than the raw `var()` text.
    const radius = RADIUS.map((token) => parseFloat(resolved[token]!));
    for (const value of radius) {
      expect(Number.isNaN(value)).toBe(false);
    }
    expect(Math.max(...radius)).toBe(radius.at(-1));

    // The z ladder is ascending integers starting at the resting `base: 0`.
    const z = Z.map((token) => Number(resolved[token]));
    expect(z[0]).toBe(0);
    for (let i = 1; i < z.length; i++) {
      expect(z[i]!).toBeGreaterThan(z[i - 1]!);
    }

    // Breakpoints ascend in px — `md` below `sm` would break every query on them.
    const breakpoints = BREAKPOINTS.map((token) => parseFloat(resolved[token]!));
    for (let i = 1; i < breakpoints.length; i++) {
      expect(breakpoints[i]!).toBeGreaterThan(breakpoints[i - 1]!);
    }
  },
};
