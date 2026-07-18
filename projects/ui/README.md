# @w-industries-luke/ui

Shared Angular Material component library and M3 theme for the `*.web` apps.

Browse the components: <https://w-industries-luke.github.io/core.lib/>

## Install

The package lives in GitHub Packages, so npm has to be told where the scope
resolves. Add to the app's `.npmrc`:

```ini
@w-industries-luke:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

`NODE_AUTH_TOKEN` is a PAT with `read:packages` locally, or `GITHUB_TOKEN` in
CI. Commit the `.npmrc`; never the token.

```bash
npm i @w-industries-luke/ui
```

Angular, CDK and Material are peer dependencies — the app supplies them. Keep
Material and CDK on **v21** to match the fleet.

## Use

Apply the theme once, at the app's style entry point:

```scss
@use '@w-industries-luke/ui/styles/theme';
```

It is the single source of truth for palette, typography and density, and it
emits the `--ui-sys-success` / `--ui-sys-warning` roles that M3 itself lacks.
Apps should not define their own Material theme.

Then import what you need — everything is standalone:

```ts
import { Button } from '@w-industries-luke/ui';
```

```html
<button matButton uiButton variant="filled">Save changes</button>
```

Anything that decorates an existing element is a directive on the native
element, so `routerLink`, `aria-*`, `form` and friends keep working as they
normally would.

## Dark mode

You get it by applying the theme. Every role — Material's `--mat-sys-*` and this
library's `--ui-sys-*` alike — is emitted as a CSS `light-dark()` pair under
`color-scheme: light dark`, so there is no second stylesheet to load, nothing to
toggle at runtime, and no component to opt in. By default the app follows the
user's OS preference. To pin a scheme instead:

```scss
:root {
  color-scheme: dark; // or `light`
}
```

That is the whole API, and it works on any subtree — `color-scheme` on an element
re-resolves the tokens its subtree uses, so a permanently-dark sidebar is one
declaration rather than an override.

One thing the theme cannot do for you: it emits tokens onto `html`, but it does
not paint your page. An app owns its own shell, so set the page surface from the
same tokens, or dark mode will be dark text on a white page:

```scss
html,
body {
  background: var(--mat-sys-surface);
  color: var(--mat-sys-on-surface);
}
```

See `Foundations/Dark mode` in [Storybook][storybook] for the roles in both
schemes side by side, and the **Scheme** toolbar to view any story in either.

[storybook]: https://w-industries-luke.github.io/core.lib/

## Fonts

Fonts are webfonts the **app** loads, not something this package bundles — a
library cannot put a `<link>` in your `index.html`. Two are needed:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- The theme's typography. -->
<link
  href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
  rel="stylesheet"
/>

<!-- Material Symbols, for `ui-icon` and every Material component that shows an
     icon (the datepicker toggle, the paginator arrows, `ui-alert`, …). -->
<link
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
  rel="stylesheet"
/>
```

Without Roboto, `typography: Roboto` in the theme falls back to a system font.
Without Material Symbols, every icon renders as an empty box.

The stylesheet loads the font; `provideUiIcons()` picks it. Angular Material's
own default font set for a bare `<mat-icon>NAME</mat-icon>` is the older
*Material Icons* font (`material-icons`), which this library does not load — so
without the provider a bare `<mat-icon>` inherits the body font and paints the
ligature's literal name (the word "info") instead of the glyph. Add it once to
your bootstrap so every `<mat-icon>` agrees with `ui-icon` on Material Symbols:

```ts
import { provideUiIcons } from '@w-industries-luke/ui';

bootstrapApplication(App, {
  providers: [provideUiIcons()],
});
```

The axis ranges on the Symbols URL are load-bearing: they ask for the
**variable** font. `<ui-icon filled>` moves that font's `FILL` axis, and the
`--ui-icon-weight` / `--ui-icon-grade` / `--ui-icon-optical-size` hooks move
`wght` / `GRAD` / `opsz`. The shorter, axis-less
`https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined` form loads
a static font under which all four silently do nothing.

```html
<ui-icon name="home" />
<ui-icon name="favorite" filled color="error" size="lg" label="Favourited" />
```

Icon names come from <https://fonts.google.com/icons> (with **Material Symbols**
selected). To self-host instead — an offline or locked-down app — serve the same
variable font under the `material-symbols-outlined` class and nothing else
changes.

## Develop

This library is developed in the
[core.lib](https://github.com/w-industries-luke/core.lib) workspace rather than
standalone. See that repo's README for build, test, Storybook and the release
process.
