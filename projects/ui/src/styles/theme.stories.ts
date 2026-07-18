import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';

import { TokenSwatches } from './token-swatches';

// A live proof that the shared theme is actually wired into the preview.
//
// This is deliberately NOT a library component — nothing here is exported from
// public-api.ts. It exists so that a regression in the theme pipeline (missing
// styles entry, broken font link, renamed token) is visible on the published
// Storybook instead of silently degrading every consuming app.
@Component({
  selector: 'ui-theme-showcase',
  imports: [MatButtonModule, MatCardModule, MatIconModule, TokenSwatches],
  template: `
    <mat-card appearance="outlined" class="showcase">
      <mat-card-header>
        <mat-card-title>Material 3 theme</mat-card-title>
        <mat-card-subtitle> Rendered from <code>src/styles/_theme.scss</code> </mat-card-subtitle>
      </mat-card-header>

      <mat-card-content>
        <!-- If these are unstyled/oddly coloured, mat.theme() did not reach the
             preview. If the icon renders as the literal word "check_circle",
             the Material Symbols font failed to load. -->
        <div class="row">
          <button matButton="filled">Filled</button>
          <button matButton="outlined">Outlined</button>
          <button matButton>Text</button>
          <mat-icon>check_circle</mat-icon>
        </div>

        <!-- The theme's roles, from the list Foundations/Dark mode shows in both
             schemes — one list, so the two stories cannot disagree about what
             the theme emits. -->
        <ui-token-swatches />
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .showcase {
      max-width: 40rem;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
      margin-block: 1rem;
    }
    /* The swatches lay themselves out; this only spaces them from the row of
       buttons above, to the same rhythm. */
    ui-token-swatches {
      margin-block: 1rem;
    }
  `,
})
class ThemeShowcase {}

const meta: Meta<ThemeShowcase> = {
  title: 'Foundations/Theme',
  component: ThemeShowcase,
  decorators: [moduleMetadata({ imports: [ThemeShowcase] })],
  parameters: {
    docs: {
      description: {
        component:
          'Smoke test for the shared M3 theme. The theme partial is applied to ' +
          'the preview via the `styles` entry on the `build-storybook` target in ' +
          '`angular.json`; Roboto and Material Symbols are loaded in ' +
          '`.storybook/preview-head.html`. Use the **Scheme** toolbar to force light ' +
          'or dark — the default, `System`, is the `color-scheme: light dark` the ' +
          'theme ships, so it follows your OS preference. `Foundations/Dark mode` ' +
          'shows these same roles in both schemes at once.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<ThemeShowcase>;

export const Default: Story = {};
