# core.lib

Shared Angular UI component library for the `*.web` apps
(`workspace.web`, `wms.web`, `core.web`, `ads.web`).

Angular 21 workspace, single library at `projects/ui`, published as `ui`.

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

**Not yet wired into `ci.yml`.** The agent that added this check is not permitted
to edit `.github/workflows`, so a human needs to append this to the `build-test`
job — until it lands the check is local-only and a11y regressions can still reach
`main`:

```yaml
- name: Install Chromium for a11y checks
  run: npx playwright install --with-deps chromium
- name: Accessibility checks
  run: npm run test:a11y
```

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
└── .github/workflows/
    ├── ci.yml                # builds + tests every PR
    └── storybook.yml         # publishes the catalogue to Pages on push to main
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
