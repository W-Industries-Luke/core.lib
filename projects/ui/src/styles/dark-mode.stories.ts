import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { expect } from 'storybook/test';

import { TokenSwatches } from './token-swatches';

/**
 * The theme's roles in both schemes at once, so the pair can be compared rather
 * than remembered.
 *
 * The two panels are the same markup under two `color-scheme` values, which is
 * the whole mechanism: the theme emits every role as a `light-dark()` (see
 * `_theme.scss`), and a custom property's `light-dark()` is resolved against the
 * `color-scheme` of the element that *uses* it — not of the element that declared
 * it. So a subtree can be pinned to a scheme with one property, no second
 * stylesheet and no re-render, and this story is the proof of it.
 *
 * This is deliberately NOT a library component — nothing here is exported from
 * public-api.ts.
 */
@Component({
  selector: 'ui-dark-mode-showcase',
  imports: [MatButtonModule, MatCardModule, TokenSwatches],
  template: `
    <div class="panes">
      @for (scheme of schemes; track scheme) {
        <!-- color-scheme is set inline, per panel, rather than on the preview
             root the toolbar drives: this story's job is showing both at once,
             so it pins each half. Every other story follows the toolbar. -->
        <section class="pane" [style.color-scheme]="scheme" [attr.data-theme]="scheme">
          <h3 class="pane__title">{{ scheme }}</h3>

          <!-- Real components, not only swatches: a role can be correct while a
               component that fails to read it is not, and the pair of cards is
               where that shows up. -->
          <mat-card appearance="outlined">
            <mat-card-content>
              <div class="row">
                <button matButton="filled">Filled</button>
                <button matButton="outlined">Outlined</button>
                <button matButton>Text</button>
              </div>
            </mat-card-content>
          </mat-card>

          <ui-token-swatches />
        </section>
      }
    </div>
  `,
  styles: `
    .panes {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
      gap: 1rem;
    }
    /* Each panel paints its own surface from the tokens, because that is what an
       app's page does — without it both halves would sit on the preview's single
       background and the dark one would only be half-rendered. */
    .pane {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      border-radius: var(--mat-sys-corner-medium);
      border: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
    }
    .pane__title {
      margin: 0;
      font: var(--mat-sys-title-medium);
      text-transform: capitalize;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }
  `,
})
class DarkModeShowcase {
  protected readonly schemes = ['light', 'dark'] as const;
}

const meta: Meta<DarkModeShowcase> = {
  title: 'Foundations/Dark mode',
  component: DarkModeShowcase,
  decorators: [moduleMetadata({ imports: [DarkModeShowcase, TokenSwatches] })],
  parameters: {
    docs: {
      description: {
        component:
          'The shared theme in both schemes, side by side. The theme ships ' +
          '`color-scheme: light dark` and resolves every `--mat-sys-*` / `--ui-sys-*` role ' +
          'through `light-dark()`, so a scheme costs one CSS property — an app pins one with ' +
          '`:root { color-scheme: dark; }` and every component follows. Use the **Scheme** ' +
          'toolbar above to put any other story into light or dark; this story pins both ' +
          'panels itself so the two can be compared at once.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<DarkModeShowcase>;

/**
 * Both schemes, side by side.
 *
 * The play function is the assertion the story is making: that the panels really
 * do resolve to different colours. Without it this is a screenshot that would
 * keep passing if `light-dark()` stopped flipping — the two halves would simply
 * render identically, and identical is exactly what a broken dark mode looks
 * like.
 */
export const SideBySide: Story = {
  name: 'Side by side',
  play: async ({ canvasElement }) => {
    const pane = (scheme: string) =>
      canvasElement.querySelector<HTMLElement>(`.pane[data-theme='${scheme}']`)!;

    const light = getComputedStyle(pane('light'));
    const dark = getComputedStyle(pane('dark'));

    // The tokens are `light-dark()`; if the pinned `color-scheme` did not reach
    // them, both panels would compute the same surface.
    expect(light.backgroundColor).not.toBe(dark.backgroundColor);
    expect(light.color).not.toBe(dark.color);

    // ...and the flip is the right way round: M3's light surface is near-white
    // with near-black text on it, and dark is the inverse. `not.toBe` alone would
    // pass on any two colours at all, including a swap that made dark lighter.
    expect(luminance(light.backgroundColor)).toBeGreaterThan(luminance(dark.backgroundColor));
    expect(luminance(light.color)).toBeLessThan(luminance(dark.color));
  },
};

/**
 * The same roles, following the **Scheme** toolbar instead of pinning a side —
 * i.e. what every other story in this Storybook does.
 *
 * Its play function is what makes `npm run test:a11y:dark` mean anything. That
 * run renders all 500-odd stories through axe with `STORYBOOK_SCHEME=dark`, and
 * a green result is only evidence if the run was actually in dark: if the env
 * seam ever stops reaching `initialGlobals`, the suite would quietly re-test
 * light and still pass. This asserts the scheme the toolbar selected is the one
 * on the preview root, so that failure is loud and lands here.
 */
export const FollowsToolbar: Story = {
  name: 'Follows the toolbar',
  render: () => ({ template: '<ui-token-swatches />' }),
  play: async ({ globals }) => {
    const scheme = globals['scheme'];
    const root = document.documentElement;

    expect(root.dataset['theme']).toBe(scheme);
    // `system` is the theme's own `color-scheme: light dark` — the OS decides,
    // so there is no side to assert, only that neither was forced.
    expect(getComputedStyle(root).colorScheme).toBe(
      scheme === 'system' ? 'light dark' : (scheme as string),
    );
  },
};

/** Rough relative brightness of a computed `rgb(...)`; ordering is all this needs. */
function luminance(color: string): number {
  const [r = 0, g = 0, b = 0] = color.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
