import { TestBed } from '@angular/core/testing';
import {
  MAT_ICON_DEFAULT_OPTIONS,
  type MatIconDefaultOptions,
} from '@angular/material/icon';

import { UI_ICON_FONT_SET } from './icon';
import { provideUiIcons } from './provide-icons';

describe('provideUiIcons', () => {
  // The whole point of the provider: a bare `<mat-icon>` — every component that
  // is not `ui-icon` — must default to Material Symbols, the one font the fleet
  // loads. Angular Material otherwise defaults to `material-icons`, which is
  // never loaded, so the ligature paints as its literal name.
  it('defaults MAT_ICON_DEFAULT_OPTIONS.fontSet to the Material Symbols font set', () => {
    TestBed.configureTestingModule({ providers: [provideUiIcons()] });

    const options = TestBed.inject<MatIconDefaultOptions>(MAT_ICON_DEFAULT_OPTIONS);

    expect(options.fontSet).toBe(UI_ICON_FONT_SET);
  });

  // The font set must not be a stray literal: it is the same constant `ui-icon`
  // pins, so bare `<mat-icon>` and `ui-icon` cannot drift onto different fonts.
  it('reuses the single UI_ICON_FONT_SET constant rather than a repeated literal', () => {
    TestBed.configureTestingModule({ providers: [provideUiIcons()] });

    const options = TestBed.inject<MatIconDefaultOptions>(MAT_ICON_DEFAULT_OPTIONS);

    expect(options.fontSet).toBe('material-symbols-outlined');
    expect(UI_ICON_FONT_SET).toBe('material-symbols-outlined');
  });
});
