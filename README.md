# core.lib

Shared Angular UI component library for the `*.web` apps
(`workspace.web`, `wms.web`, `core.web`, `ads.web`).

Angular 21 workspace, single library at `projects/ui`, published to GitHub
Packages as **`@w-industries/ui`** — see [Releasing](#releasing).

## Develop

```bash
npm ci
npx ng build ui                    # build the library -> dist/ui
npx ng test ui --watch=false       # run unit tests (vitest, headless)
npm run test:a11y                  # run every story through axe (needs chromium, see below)
npm run storybook                  # component catalogue on :6006
npm run build-storybook            # static catalogue -> storybook-static/
npx ng generate component my-thing --project=ui   # scaffold a component
```

## Storybook

Published from `main` to <https://w-industries-luke.github.io/core.lib/>.

Stories render against the **same** `src/styles/_theme.scss` the apps consume, so
the catalogue is an honest preview rather than a lookalike. The wiring:

| Concern            | Where                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| Theme in previews  | `styles` option on the storybook targets in `angular.json`, which pulls in `.storybook/preview.scss` |
| Roboto + icons     | `.storybook/preview-head.html`                                                                       |
| Light/dark toolbar | `.storybook/color-scheme.ts`, wired up as a global + decorator in `.storybook/preview.ts`            |
| Docs / args tables | compodoc (`compodoc: true` in `.storybook/main.ts`) -> `documentation.json` (generated, gitignored)  |
| Deploy             | `.github/workflows/storybook.yml`                                                                    |

Note the `styles` paths in `angular.json` are relative to the **project** root
(`projects/ui`) and must start with `./` — the Storybook builder passes any other
form through as a bare module import and the build fails to resolve it.

Those `styles` entries only reach `storybook dev` / `build-storybook`, because it
is the Storybook CLI that forwards them. A standalone `vitest` run (i.e.
`npm run test:a11y`) has no CLI in front of it, so it gets its copy from
`storybookAngularVitest({ styles: [...] })` in `vitest.config.ts` — keep the two
in step, or the stories under test render unthemed.

Every story renders in the scheme the **Scheme** toolbar selects (`System` by
default, which is the `color-scheme: light dark` the theme ships). It is a
decorator, so no story can opt out and a component that breaks in dark shows up
on the story it already has.

## Typography

The theme ships the Material 3 type scale, set by the `typography` entry in
`src/styles/_theme.scss` (`typography: Roboto` today). `Foundations/Typography`
in Storybook renders every role — display / headline / title / body / label, each
in its three sizes — with its `--mat-sys-*` token and the size the browser
computes from it, so it is a live reference rather than a table to keep in sync.

Use a role by pointing `font` at its token, never by hardcoding a size:

```scss
h1 {
  font: var(--mat-sys-headline-large);
}
.caption {
  font: var(--mat-sys-body-small);
}
```

### Overriding the scale

The scale is the theme's to own, so change it in one place — the `typography`
value passed to `mat.theme()` in `_theme.scss` — and every app follows, exactly
as the palette does. `Roboto` is the shorthand for "use this family everywhere";
for finer control pass the M3 typography config map instead:

```scss
@include mat.theme((
  color: ( /* … */ ),
  // A brand display face for the big roles, a separate face for body text, and
  // the weights the scale reaches for. Every key is optional — omit one and M3
  // keeps its default.
  typography: (
    brand-family: 'Poppins, sans-serif',   // display / headline / title
    plain-family: 'Inter, sans-serif',     // body / label
    bold-weight: 700,
    medium-weight: 500,
    regular-weight: 400,
  ),
  density: 0,
));
```

That regenerates every `--mat-sys-<role>-*` token from the config, so the whole
scale — and the `Foundations/Typography` story — moves together. An app that
needs to nudge a single role rather than the whole scale can override that role's
token at `:root` (`:root { --mat-sys-headline-large-size: 2.5rem; }`), but reach
for that sparingly: a per-role override lives outside the theme and so is invisible
to the fleet's single source of truth.

## Testing

Unit tests run on **vitest** through `@angular/build:unit-test` — headless, no
browser (`npx ng test ui --watch=false`). Every component ships a `.spec.ts` with
meaningful tests, not "should create".

### Test Material through its harnesses, not its DOM

A component that wraps a Material one is tested through **Material's own CDK test
harnesses** (`@angular/cdk/testing`), never by querying Material's internal
markup. The MDC class names (`mat-mdc-unelevated-button`), the overlay structure a
`<mat-select>` renders its panel into, the `<input>` buried inside a
`<mat-checkbox>` — those are Material's implementation details, and a spec that
asserts on them breaks the day Material renames one, on a detail no consumer
depends on. A harness is Material's *published* test surface; assert through it and
the spec survives the upgrade.

`projects/ui/src/lib/button/button.spec.ts` is the reference. The shape:

```ts
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';

let loader: HarnessLoader;

beforeEach(async () => {
  fixture = TestBed.createComponent(TestHost);
  loader = TestbedHarnessEnvironment.loader(fixture);
  await fixture.whenStable();
});

it('passes the variant through to MatButton', async () => {
  host.variant.set('outlined');
  await fixture.whenStable();

  const button = await loader.getHarness(MatButtonHarness);
  expect(await button.getAppearance()).toBe('outlined'); // not a `.mat-mdc-*` class
});
```

Harness methods are async — `await` them. Find a specific instance with a filter
(`loader.getHarness(MatButtonHarness.with({ text: 'Save' }))`) rather than indexing
a `querySelectorAll`. For a component that renders into a **CDK overlay** (dialog,
snackbar, menu, a select's panel), reach it with
`TestbedHarnessEnvironment.documentRootLoader(fixture)` — the overlay lives outside
the fixture's own element.

### What stays a DOM assertion

Harnesses speak Material's surface — appearance, `checked`, `value`, `disabled`,
open/close, the options in a panel. They have nothing to say about what *this*
library adds on top, so those assertions stay as DOM or instance reads:

- **Theme marker classes and styling hooks** — `ui-button--accent`, the `--ui-*`
  custom properties. These are how `_button.scss` re-points Material's tokens; the
  harness can't see them.
- **Native-attribute forwarding** — the proof that `aria-*`, `id`, `data-*`,
  `routerLink`, `form`/`name`/`value` land on the *real* element (and are taken off
  the wrapper). A harness abstracts the element away, which is the opposite of what
  that test asserts.
- **`id` / `<label for>` association** specifics.
- **`ControlValueAccessor` / `Validator` behaviour** — assert it through the bound
  `FormControl` (`control.valid`, `.errors`, `.touched`), not the harness.
- **Escape-hatch instance accessors** — the underlying Material instance a
  component exposes (`host.ref().matButton`, `matCheckbox()`, a returned
  `dialogRef`).

So a spec is usually *both*: harness calls for Material's own behaviour, DOM and
instance reads for the seams this library owns.

## Accessibility

This library is the a11y floor for every consuming app, so a11y is asserted
rather than claimed. `npm run test:a11y` renders **every story** in headless
Chromium and runs [axe](https://github.com/dequelabs/axe-core) against it via
`@storybook/addon-a11y`; any violation fails the run.

```bash
npx playwright install --with-deps chromium   # once, and in CI
npm run test:a11y        # as published — the theme's default scheme
npm run test:a11y:dark   # the same stories, forced dark
```

Each story is an assertion, so adding a story to a component adds a11y coverage
for that configuration for free. This is the reason to prefer one story per
meaningful variant over one story with knobs.

`test:a11y:dark` is the same run with `STORYBOOK_SCHEME=dark`, which the preview
reads into `initialGlobals` (the Vite builder's `envPrefix` exposes `STORYBOOK_*`
to it). That matters because axe's rules include colour contrast: a role that is
legible in light and muddy in dark is a real failure that only this run can see.
`Foundations/Dark mode > Follows the toolbar` asserts the scheme actually reached
the preview root, so a broken env seam fails loudly rather than re-testing light.

The gate is `test: 'error'` in `.storybook/preview.ts`. **Do not turn it down to
`'todo'` to go green** — fix the markup instead. For a genuine axe false
positive, disable that one rule on that one story, with a comment saying why:

```ts
export const SomeStory: Story = {
  // <reason this is a false positive here>
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
};
```

The runner is the `vitest.config.ts` at the project root, driven through
`@storybook/addon-vitest`. It must run with `--root projects/ui` (the npm script
does this): `storybookTest` pins Vite's root to the Storybook config's parent, and
the story globs are resolved against that same root, so pointing it anywhere else
finds zero stories. See the comment on `server.fs.allow` in that file for why the
hoisted `node_modules` has to be allowlisted.

### The CI step

**Not yet wired into `ci.yml`.** The agent that added this check is not permitted
to edit `.github/workflows`, so a human needs to append this to the `build-test`
job — until it lands the check is local-only and a11y regressions can still reach
`main`:

```yaml
- name: Install Chromium for a11y checks
  run: npx playwright install --with-deps chromium
- name: Accessibility checks
  run: npm run test:a11y
- name: Accessibility checks (dark)
  run: npm run test:a11y:dark
```

What `ci.yml` does cover is the source-level half of this: `theme-contract.spec.ts`
fails the build on a literal colour in any stylesheet, which is the one way to
break dark mode. It is not a substitute for the runs above — it cannot see
contrast — but it holds the invariant they check for.

## Releasing

The library publishes to **GitHub Packages** (`https://npm.pkg.github.com`) as
`@w-industries/ui`. That registry is the default here because the consuming apps
are all in this same org: access is the repo's existing permissions rather than a
second identity system, and CI authenticates with the `GITHUB_TOKEN` it already
has, so **there is no publish token to store or rotate**. npmjs.com would mean
either a public package or a paid private org plus a long-lived automation token
in secrets; neither buys anything for an internal fleet.

### Cutting a release

The **release tag is the version**. `projects/ui/package.json` carries a
placeholder that local builds use; the workflow overwrites it in `dist/ui` from
the tag, so there is no version-bump commit to forget.

1. Publish a GitHub Release tagged `vX.Y.Z` (semver, `v` prefix — the workflow
   rejects anything else).
2. `release.yml` builds and tests the library, stamps `X.Y.Z` into
   `dist/ui/package.json`, and runs `npm publish` from `dist/ui`.
3. The package appears under the repo's Packages tab.

Publishing is deliberately gated on a **published release**, not a bare pushed
tag: a release is a reviewable, human action with notes attached, and it can't
happen by accident from a mistyped `git tag`.

### Before the first release — three things a human must do

The workflow is inert until all three are true:

1. **Move the workflow into place.** It sits at
   `.github/pending-workflows/release.yml`; GitHub only runs workflows under
   `.github/workflows/`. The agent that wrote it may not edit that directory
   (same constraint as the a11y step above), so a human needs to
   `git mv .github/pending-workflows/release.yml .github/workflows/release.yml`.
   It is otherwise complete — review it, don't rewrite it.
2. **Reconcile the scope with the repo owner.** GitHub Packages requires an npm
   package's scope to match the account that owns the repo. This repo is owned by
   `w-industries-luke`, so `@w-industries/ui` will be **rejected with a 403**
   until either the repo moves to a `w-industries` org (the intent implied by the
   name, and the better end state), or the package is renamed
   `@w-industries-luke/ui` in `projects/ui/package.json`, the `scope:` in
   `release.yml`, and the `paths` entry in `tsconfig.json`. Nothing else in the
   repo depends on the name.
3. **Allow the workflow to publish.** No new secret is needed — `GITHUB_TOKEN` is
   built in and the workflow requests `packages: write` itself. But if the org
   sets default workflow permissions to read-only (Settings → Actions → General),
   that `permissions:` block is capped and publish fails with a 403.

### Consuming it from an app

Each consuming app needs an `.npmrc` telling npm where the scope lives:

```ini
@w-industries:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

`NODE_AUTH_TOKEN` is a PAT with `read:packages` locally, or `GITHUB_TOKEN` in
that app's CI. The `${...}` form is expanded by npm at read time — **commit the
`.npmrc`, never the token itself**. Then `npm i @w-industries/ui`.

## Layout

```
.
├── projects/ui/
│   ├── src/
│   │   ├── public-api.ts     # the library's public surface — export everything here
│   │   ├── lib/              # components live here (+ their .stories.ts)
│   │   └── styles/           # the shared M3 theme
│   ├── .storybook/           # storybook config, preview theme + fonts
│   └── ng-package.json
├── angular.json
└── .github/
    ├── workflows/
    │   ├── ci.yml            # builds + tests every PR
    │   └── storybook.yml     # publishes the catalogue to Pages on push to main
    └── pending-workflows/
        └── release.yml       # publishes @w-industries/ui on release — INERT
                              # until moved into workflows/, see Releasing
```

## Contributing

Every component should:

1. Live in `projects/ui/src/lib/<name>/`.
2. Be exported from `projects/ui/src/public-api.ts` — otherwise consumers can't
   import it and it's effectively dead code.
3. Ship a `.spec.ts` with meaningful tests (not just "should create"). If it wraps
   a Material component, test that component through its CDK harness — see
   [Testing](#testing).
4. Ship a `.stories.ts` with one story per meaningful configuration — the
   catalogue is how the app teams discover what exists, so an undocumented
   variant may as well not exist. See `src/lib/ui.stories.ts` for the pattern.
5. Be standalone (Angular 21 default), with `ui` as the selector prefix.
6. Keep `npx ng build ui`, `npx ng test ui --watch=false` and `npm run test:a11y`
   green — CI enforces the first two today, and the third once the a11y step
   above is added to `ci.yml`.

## Automation

This repo is the pilot for unattended agent work. Issues labelled `claude-task`
are picked up by a scheduled worker (twice daily, a batch at a time) which:

1. Branches off `main`, implements the issue, and runs build + tests.
2. Opens a PR that `Closes #<issue>`.
3. **Squash-merges it — but only once CI on the PR is green.** The merge gate is
   GitHub's own CI result, never the agent's claim that its work is fine.

If the build or tests fail, it instead leaves a **draft** PR titled `[FAILING]`
and labels the issue `claude-blocked` for a human. It never pushes to `main`
directly: the worker owns git, and the agent's git/gh tooling is removed
entirely so it _cannot_.

CI (`ci.yml`) is therefore load-bearing, not decorative — it is the only thing
standing between an unattended agent and `main`. See the `claude-sdk-workflows`
repo for the worker.
