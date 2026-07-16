import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { MAT_ICON_DEFAULT_OPTIONS } from '@angular/material/icon';

import { UI_ICON_FONT_SET } from './icon';

/**
 * Makes Material Symbols the default font set for **every** `<mat-icon>`, not
 * just `ui-icon`.
 *
 * A bare `<mat-icon>NAME</mat-icon>` otherwise asks for Angular Material's
 * default font set — `['material-icons', 'mat-ligature-font']`, i.e. the older
 * *Material Icons* font. The fleet loads *Material Symbols* instead (the font
 * `ui-icon` already pins via {@link UI_ICON_FONT_SET}), so with no `@font-face`
 * for Material Icons the class inherits the body font and the ligature paints as
 * its literal name — the word "info" rather than the glyph.
 *
 * Registering this option once makes bare `<mat-icon>` agree with `ui-icon`:
 * both draw from the one font the library standardises on. Add it to an app's
 * bootstrap providers:
 *
 * ```ts
 * bootstrapApplication(App, {
 *   providers: [provideUiIcons()],
 * });
 * ```
 *
 * ### The app must still load the font
 *
 * This chooses the font set; it does not bundle the webfont. The app has to load
 * a Material Symbols stylesheet in its `index.html` exactly as it loads Roboto —
 * see the font note on `ui-icon` for the `<link>` (the *variable* axis form, so
 * `ui-icon`'s `filled` and the `--ui-icon-*` axis hooks keep working).
 */
export function provideUiIcons(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: MAT_ICON_DEFAULT_OPTIONS, useValue: { fontSet: UI_ICON_FONT_SET } },
  ]);
}
