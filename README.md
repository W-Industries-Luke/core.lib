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
npm run test:storybook-console     # load the built catalogue, fail on console errors (see below)
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
| Docs / args tables | compodoc (`compodoc: true` in `.storybook/main.ts`) -> `documentation.json` (generated, gitignored)  |
| Deploy             | `.github/workflows/storybook.yml`                                                                    |

Note the `styles` paths in `angular.json` are relative to the **project** root
(`projects/ui`) and must start with `./` — the Storybook builder passes any other
form through as a bare module import and the build fails to resolve it.

## Accessibility

This library is the a11y floor for every consuming app, so a11y is asserted
rather than claimed. `npm run test:a11y` renders **every story** in headless
Chromium and runs [axe](https://github.com/dequelabs/axe-core) against it via
`@storybook/addon-a11y`; any violation fails the run.

```bash
npx playwright install --with-deps chromium   # once, and in CI
npm run test:a11y
```

Each story is an assertion, so adding a story to a component adds a11y coverage
for that configuration for free. This is the reason to prefer one story per
meaningful variant over one story with knobs.

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

Wired into the `build-test` job in `ci.yml` (issue #80), alongside the console
check below — both reuse the one `npx playwright install --with-deps chromium`
step.

## Console errors in the built Storybook

`npm run test:storybook-console` serves `storybook-static/` and loads **every**
entry in its `index.json` in headless Chromium — each story at `viewMode=story`
and each autodocs page at `viewMode=docs` — failing on any `console.error` or
uncaught page error.

```bash
npm run build-storybook
npm run test:storybook-console
```

This exists because the other gates cannot see what it sees. `ng build`, `ng test`
and `test:a11y` all render components **inside a test harness**; they ask "does it
render without throwing" and "does axe pass", never "what does the real iframe
log". A bare `provideRouter([])` in `button.stories.ts` threw `NG04002` on every
button story and blanked the Docs previews with all four gates green and 363/363
a11y tests passing — a human found it on the published site. This check drives the
same artefact that ships to Pages, so that class of bug fails CI instead.

The runner is `tools/check-storybook-console.mjs`. It reuses the Chromium that
`test:a11y` installs — deliberately no second browser toolchain.

**Do not make a failure go away by widening the allowlist.** An error here is a
real error on the published site. `ALLOWED_CONSOLE_ERRORS` in that file is for
noise genuinely outside our control and is **empty** — the catalogue loads clean
today, so the bar for adding a narrow, commented regex is "we cannot fix this",
not "this is failing CI". `REQUIRED_ENTRY_IDS` pins the ids the original
regression broke, so a rename cannot silently drop that coverage.

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
3. Ship a `.spec.ts` with meaningful tests (not just "should create").
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
