# core.lib

Shared Angular UI component library for the `*.web` apps
(`workspace.web`, `wms.web`, `core.web`, `ads.web`).

Angular 21 workspace, single library at `projects/ui`, published as `ui`.

## Develop

```bash
npm ci
npx ng build ui                    # build the library -> dist/ui
npx ng test ui --watch=false       # run unit tests (vitest, headless)
npx ng generate component my-thing --project=ui   # scaffold a component
```

## Layout

```
.
├── projects/ui/
│   ├── src/
│   │   ├── public-api.ts     # the library's public surface — export everything here
│   │   └── lib/              # components live here
│   └── ng-package.json
├── angular.json
└── .github/workflows/ci.yml  # builds + tests every PR
```

## Contributing

Every component should:

1. Live in `projects/ui/src/lib/<name>/`.
2. Be exported from `projects/ui/src/public-api.ts` — otherwise consumers can't
   import it and it's effectively dead code.
3. Ship a `.spec.ts` with meaningful tests (not just "should create").
4. Be standalone (Angular 21 default), with `ui` as the selector prefix.
5. Keep `npx ng build ui` and `npx ng test ui --watch=false` green — CI enforces both.

## Automation

This repo is the pilot for unattended agent work. Issues labelled `claude-task`
are picked up by a scheduled agent, which opens a **draft PR** for review — it
never merges and never pushes to `main`. See the `claude-sdk-workflows` repo.
