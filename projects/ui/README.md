# @w-industries/ui

Shared Angular Material component library and M3 theme for the `*.web` apps.

Browse the components: <https://w-industries-luke.github.io/core.lib/>

## Install

The package lives in GitHub Packages, so npm has to be told where the scope
resolves. Add to the app's `.npmrc`:

```ini
@w-industries:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

`NODE_AUTH_TOKEN` is a PAT with `read:packages` locally, or `GITHUB_TOKEN` in
CI. Commit the `.npmrc`; never the token.

```bash
npm i @w-industries/ui
```

Angular, CDK and Material are peer dependencies — the app supplies them. Keep
Material and CDK on **v21** to match the fleet.

## Use

Apply the theme once, at the app's style entry point:

```scss
@use "@w-industries/ui/styles/theme";
```

It is the single source of truth for palette, typography and density, and it
emits the `--ui-sys-success` / `--ui-sys-warning` roles that M3 itself lacks.
Apps should not define their own Material theme.

Then import what you need — everything is standalone:

```ts
import { Button } from "@w-industries/ui";
```

```html
<button matButton uiButton variant="filled">Save changes</button>
```

Anything that decorates an existing element is a directive on the native
element, so `routerLink`, `aria-*`, `form` and friends keep working as they
normally would.

## Develop

This library is developed in the
[core.lib](https://github.com/w-industries-luke/core.lib) workspace rather than
standalone. See that repo's README for build, test, Storybook and the release
process.
