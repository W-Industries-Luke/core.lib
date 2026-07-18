# Contributing to core.lib

This is the shared Angular Material / M3 theme library for the `*.web` fleet.
Everything here ships to other teams, so a component is not "done" when it works
in isolation — it is done when it upholds the conventions below, which every
existing component already follows.

These conventions are not invented here; they are what the code already does.
The canonical examples are cited inline — read them before you start. The
[README](./README.md) covers how to build, test, publish and consume the library
and is not repeated here; this file is the *how to build a component that fits*.

**The reference implementation is [`projects/ui/src/lib/button/`](./projects/ui/src/lib/button/).**
A directive on the native element, theming via system tokens, a harness-driven
spec, one story per variant. When in doubt, do what `button/` does.

---

## The component checklist

Every new surface must satisfy all of this before it merges. It is the same list
the README's [Contributing](./README.md#contributing) section summarises, with
the *why* attached.

1. **Live in `projects/ui/src/lib/<name>/`** — the component (or directive), its
   `.spec.ts`, and its `.stories.ts` together.

2. **Be exported from [`projects/ui/src/public-api.ts`](./projects/ui/src/public-api.ts).**
   Export the class *and every public type* (the variant/color unions, option
   interfaces, etc.). Nothing outside `public-api.ts` exists to a consumer — an
   unexported symbol is dead code, and an unexported type forces `any` at the
   call site.

3. **Be standalone** (the Angular 21 default — do not add `standalone: true`, and
   never a `NgModule`) with **`ui` as the selector prefix**: `ui-<name>` for a
   component, `uiName` for a directive.

4. **Use `ChangeDetectionStrategy.OnPush`** on every component (see
   `card/card.ts`, `checkbox/checkbox.ts`). The whole library is signal-driven,
   so OnPush is correct and free.

5. **Be signal-based.** Inputs are `input()` / `input.required()`; two-way state
   is `model()`, **never** an `input()` + `Output` pair (see `Checkbox.checked`).
   Reach for `viewChild`/`contentChild`/`contentChildren` signal queries, not the
   decorator forms. Push a signal into a Material setter with an `effect()` when
   Material exposes no signal input — that is exactly what `Button` does for
   `MatButton.setAppearance()`.

6. **Ship a `.spec.ts` with meaningful tests** — assert behaviour, not "should
   create". If it wraps a Material component, drive that component through its CDK
   harness (see [Testing through harnesses](#testing-through-harnesses)).

7. **Ship a `.stories.ts` (CSF3) with one story per meaningful configuration.**
   The published [Storybook](https://w-industries-luke.github.io/core.lib/) is
   how app teams discover what exists, so an undocumented variant may as well not
   exist. Prefer one story per variant over one story with knobs: each story is
   also an axe assertion (see [How CI gates a merge](#how-ci-gates-a-merge)), so
   a story per variant is a11y coverage per variant for free.

8. **Keep the gate green:** `npx ng build ui`, `npx ng test ui --watch=false`,
   and `npm run test:a11y` all pass.

---

## The extensibility contract

A consumer must never need a hack — `::ng-deep`, `!important`, a wrapper, an
adapter — to do something reasonable. If they would, **the API is wrong: fix the
API, don't document the workaround.** This is the single most important rule
here, and it drives every choice below.

### Directive-first

If the thing **decorates an existing element**, write a **directive on the native
element**, not a wrapper component:

```html
<button matButton uiButton variant="filled" color="accent">Save</button>
```

not `<ui-button>`. Angular Material does exactly this (`<button matButton>`)
precisely so that native attributes, `routerLink` and a11y keep working. Wrapping
a native element inside a custom tag breaks all of that — `aria-*`, `id`, `form` /
`name` / `value`, `data-*`, `routerLink`, `tabindex` and `(click)` stop reaching
the real element. `button/` is a directive for this reason; its doc comment and
spec (`native attributes reach the element`) spell out what a wrapper used to
break. Restyling a directive's host needs no `::ng-deep` either —
`button[uiButton]` is a selector a consumer can target directly.

Use a **component** only when it genuinely **owns structure or composition** — a
card, dialog, table, address form, a select that renders its own options.

### When a wrapper component *is* correct

It must not become a wall the consumer has to climb over:

- **Forward native attributes** to the inner element (host bindings / attribute
  inheritance), never swallow them.
- **Expose the underlying Material instance** as an escape hatch: `exportAs` plus
  a public `readonly` reference to the Material component. `button/` does this
  with `exportAs: 'uiButton'` and `readonly matButton` — the hatch for
  `focus()`, `disableRipple`, `disabledInteractive`, everything the directive
  deliberately does not wrap. `Checkbox` (`matCheckbox`) and `Select`
  (`matFormField` / the `dialogRef` a `Dialog` returns) do the same.
- **Pass through Material's own useful API** — `panelClass`, overlay position,
  and the like — rather than hiding it.

### Forms

A form control **implements `ControlValueAccessor`** (and `Validator` via
`validate()` where validation applies), so `[(ngModel)]`, `[formControl]` and
reactive forms Just Work with no adapter. `checkbox/checkbox.ts` and
`select/select.ts` are the templates: the writable state is a `model()` that both
the template and `writeValue` set, so the two stay in step.

### Styling hooks and content projection

- Expose **CSS custom properties (`--ui-*`)** for anything a consumer might
  reasonably restyle, instead of forcing an override. `_button.scss` exposes
  `--ui-button-shape` so an app retunes every button's corner in one declaration
  rather than reaching past the library.
- Prefer **content projection / `ng-template`** over string-only inputs wherever
  a consumer might want custom content — option rendering, empty states, icons,
  triggers. `select/select.ts` projects `uiSelectOption` and `uiSelectTrigger`
  templates; `card/card.ts` projects header and action slots.

### The `::ng-deep` test

Before you finish, ask: *to do something reasonable with this component, would a
consumer have to write `::ng-deep`, `!important`, or wrap it?* If yes, the API is
wrong. Add the input, the styling hook, the projection slot, or the escape-hatch
ref — do not ship the workaround.

---

## Theming: never hand-roll what the theme owns

The shared M3 theme at
[`projects/ui/src/styles/_theme.scss`](./projects/ui/src/styles/_theme.scss) is
the single source of truth for palette, typography and density across the whole
fleet. Build on Material and this theme.

### Never hardcode a colour

Every colour resolves from a `--mat-sys-*` (Material) or `--ui-sys-*` (this
library's additions) token, because the theme resolves each token through
`light-dark()` — that, and only that, is what makes dark mode work. A literal
`#fff` builds, renders and passes its component's own tests, then ships to every
app as a white box on a dark page.

This is enforced, not trusted:
[`styles/theme-contract.spec.ts`](./projects/ui/src/styles/theme-contract.spec.ts)
scans every stylesheet and **fails the build on any literal colour** (hex,
`rgb()`/`hsl()`/`oklch()`/…, or a bare colour keyword used as a value). Only
`_theme.scss` — where the palettes are chosen — may name a colour. Prose in
comments is stripped before the scan, so you can still *explain* a tone.

### Material's `color` input does nothing under M3

`MatButton`'s (and friends') `color="primary|accent|warn"` input is an **M2-only
API and is inert under an M3 theme** (Material's own docs: "supported in M2
themes only"). Do **not** rely on it. Resolve a colour role yourself via
`mat.*-overrides()` against the `--mat-sys-*` system tokens. The established
pattern is [`styles/_button.scss`](./projects/ui/src/styles/_button.scss):

- A marker class per role goes on the host — `Button` toggles
  `ui-button--accent` / `ui-button--warn` via host bindings; `primary` is
  Material's default and needs no class or CSS.
- The class re-points Material's tokens with `mat.button-overrides(...)`, reading
  the palette's `--mat-sys-*` roles (`tertiary` / `on-tertiary` / … for
  `accent`, `error` / … for `warn`). Swapping a palette in `_theme.scss`
  re-colours every button, in light and dark alike.

### A directive's theming lives in a `styles/` partial

A directive cannot carry a `styleUrl`. So a directive's theming — like a Material
container rendered into the CDK overlay, or content projected from a consumer —
lives in a partial under `projects/ui/src/styles/` that `_theme.scss` `@use`s.
`_button.scss` is the reference; `_theme.scss` `@use`s it alongside `_badge`,
`_alert`, `_menu`, and the rest. A component that owns its DOM uses an ordinary
encapsulated `styleUrl` instead.

### Use the theme's extra roles; don't invent a parallel system

M3 itself lacks `success` / `warning` and a spacing scale, so the theme emits
them: `--ui-sys-success` / `--ui-sys-warning` (with their `on-` and `-container`
partners, derived to behave like every other M3 role in both schemes) and
`--ui-sys-spacing-{sm,md,lg}` on M3's 4dp grid. Reach for these rather than
hand-picking a green or a `16px`. If you find yourself wanting a token the theme
doesn't emit, add it to `_theme.scss` so the whole fleet gets it — don't localise
it into one component.

---

## Testing through harnesses

Unit tests run on **vitest** through `@angular/build:unit-test` — headless, no
browser (`npx ng test ui --watch=false`).

A component that wraps a Material one is tested through **Material's own CDK test
harnesses** (`@angular/cdk/testing`), never by querying Material's internal
markup. MDC class names (`mat-mdc-unelevated-button`), a select's overlay
structure, the `<input>` buried inside a `<mat-checkbox>` — those are Material's
implementation details; a spec that asserts on them breaks the day Material
renames one, on a detail no consumer depends on. A harness is Material's
*published* test surface, so a harness-driven spec survives the upgrade.

[`button/button.spec.ts`](./projects/ui/src/lib/button/button.spec.ts) is the
reference. The shape:

```ts
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';

const loader = TestbedHarnessEnvironment.loader(fixture);
await fixture.whenStable();

const button = await loader.getHarness(MatButtonHarness);
expect(await button.getAppearance()).toBe('outlined'); // not a `.mat-mdc-*` class
```

- Harness methods are **async** — `await` them.
- Find a specific instance with a **filter**
  (`MatButtonHarness.with({ text: 'Save' })`), not by indexing a
  `querySelectorAll`.
- For a component that renders into a **CDK overlay** (dialog, snackbar, menu, a
  select's panel), reach it with
  `TestbedHarnessEnvironment.documentRootLoader(fixture)` — the overlay lives
  outside the fixture's element.

### What stays a DOM or instance assertion

Harnesses speak Material's surface (appearance, `checked`, `value`, `disabled`,
open/close, panel options). They have nothing to say about what *this* library
adds on top, so those assertions stay DOM/instance reads:

- **Theme marker classes and `--ui-*` styling hooks** — `ui-button--accent` etc.
  The harness can't see them.
- **Native-attribute forwarding** — the proof that `aria-*`, `id`, `data-*`,
  `routerLink`, `form` / `name` / `value` land on the *real* element. A harness
  abstracts the element away, which is the opposite of what that test asserts.
- **`ControlValueAccessor` / `Validator` behaviour** — assert through the bound
  `FormControl` (`control.valid`, `.errors`, `.touched`), not the harness.
- **Escape-hatch instance accessors** — the exposed Material instance
  (`host.ref().matButton`, a returned `dialogRef`).

A good spec is usually **both**: harness calls for Material's behaviour, DOM and
instance reads for the seams this library owns. The README's
[Testing section](./README.md#testing) has more.

---

## How CI gates a merge

CI (`.github/workflows/ci.yml`) is **load-bearing, not decorative** — this repo
is the pilot for unattended agent work, and CI is the only thing standing between
an agent's PR and `main`. A task branch is squash-merged **only once CI on the PR
is green**; a failing run leaves a `[FAILING]` draft PR for a human instead. The
merge gate is GitHub's own CI result, never any claim that the work is fine.

`ci.yml`'s `build-test` job, on every PR, runs:

1. `npx ng build ui` — the library must build.
2. `npx ng test ui --watch=false` — the vitest suite, **with a coverage
   threshold** wired into `angular.json`'s `test` options. The job fails if
   coverage drops below the threshold, so new code needs tests, not just a
   passing build. This run also executes `theme-contract.spec.ts`, so a **literal
   colour fails the build** here.

**Run all three commands locally before you finish** — they are the gate your
work is judged by whether you run them or not.

### The a11y run

`npm run test:a11y` renders **every story** through
[axe](https://github.com/dequelabs/axe-core) in headless Chromium; any violation
fails. `npm run test:a11y:dark` runs the same stories forced dark, which is the
only check that catches a role legible in light and muddy in dark. This is why
one story per variant matters: each is an assertion. Do **not** silence axe by
turning the gate down to `'todo'` — fix the markup; for a genuine false positive,
disable that one rule on that one story with a comment saying why (see the
README's [Accessibility section](./README.md#accessibility)).

> Note: the a11y step is not yet wired into `ci.yml` (the agent that added it may
> not edit `.github/workflows`), so today it is a local gate a human must keep.
> Treat it as required regardless. `theme-contract.spec.ts` holds the source-level
> half of dark-mode correctness in CI in the meantime.

---

## Before you open a PR

- [ ] `npx ng build ui` passes.
- [ ] `npx ng test ui --watch=false` passes (coverage threshold included).
- [ ] `npm run test:a11y` passes (and `:dark` if you touched anything visual).
- [ ] The component is exported from `public-api.ts` — class and public types.
- [ ] It's a directive if it decorates an element; a component only if it owns
      structure.
- [ ] No literal colours; roles resolved via `--mat-sys-*` / `--ui-sys-*` and, for
      Material colour, `mat.*-overrides()`.
- [ ] A consumer needs no `::ng-deep` / `!important` / wrapper to do anything
      reasonable.
- [ ] One story per meaningful variant; a harness-driven spec with real
      assertions.

Scaffold with the Angular CLI so a component matches this workspace's conventions
from the start, then edit — don't create files by hand:

```bash
npx ng generate component <name> --project=ui
```
