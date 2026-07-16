import { join } from 'node:path';
import { compile } from 'sass';

/**
 * The theme is a `color-scheme` theme, not a light-only one.
 *
 * Dark mode in this library is a single mechanism: every `--mat-sys-*` /
 * `--ui-sys-*` colour role is emitted as a `light-dark()` pair, and forcing
 * `color-scheme` on `<html>` (what an app does with `:root { color-scheme: dark }`,
 * and what the Storybook toolbar does at runtime) re-resolves all of them at once.
 * A role that carries a single value instead has nothing to flip — dark renders
 * identically to light, which is precisely the failure this guards.
 *
 * It cannot be observed here: `ng test` runs in jsdom, whose `getComputedStyle`
 * does not resolve `light-dark()` against `color-scheme`. So the assertion is on
 * the *compiled* CSS — the same output the app's build consumes — that each role
 * is a two-valued `light-dark()` whose light and dark sides genuinely differ.
 * `_theme.scss` reads as though it emits pairs; this proves the compiler agrees,
 * so a regression to a light-only theme (a bare value, or `theme-type: light`)
 * fails the gate rather than only the deployed Storybook.
 *
 * (That the built *Storybook* keeps these pairs native rather than downleveling
 * them to a `prefers-color-scheme`-only polyfill is the job of `build.cssTarget`
 * in `.storybook/main.ts`, asserted end-to-end by `Foundations/Dark mode`.)
 */
describe('theme colour scheme', () => {
  // Compile the real theme the way an app consuming `styles/theme` does — the
  // `@use '@angular/material'` inside it resolves off `node_modules`.
  const css = compile(join(process.cwd(), 'projects', 'ui', 'src', 'styles', '_theme.scss'), {
    loadPaths: ['node_modules'],
  }).css;

  /** The value of a custom-property declaration in the compiled CSS, if present. */
  const declaration = (name: string): string | undefined =>
    new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1].trim();

  /** The `[light, dark]` sides of a `light-dark(a, b)`, or `null` if it is not one. */
  const schemes = (value: string | undefined): [string, string] | null => {
    const inner = value && /^light-dark\((.+)\)$/.exec(value)?.[1];
    if (!inner) return null;
    const [light, dark] = inner.split(',').map((side) => side.trim());
    return light && dark ? [light, dark] : null;
  };

  it('emits the representative surface role as a light-dark pair whose schemes differ', () => {
    // `--mat-sys-surface` is the page background every story sits on, so it is the
    // token whose failure to flip makes "dark looks exactly like light" literal.
    const pair = schemes(declaration('--mat-sys-surface'));

    expect(pair).not.toBeNull();
    const [light, dark] = pair!;
    expect(light).not.toBe(dark);
  });

  it('flips the hand-rolled status roles too, not only Material’s', () => {
    // `--ui-sys-success` / `--ui-sys-warning` are this library's own additions to
    // M3 (see `_status-role`); nothing upstream flips them, so they share the
    // light-only failure mode and need the same guard.
    for (const role of ['--ui-sys-success', '--ui-sys-warning']) {
      const pair = schemes(declaration(role));
      expect(pair, role).not.toBeNull();
      expect(pair![0], role).not.toBe(pair![1]);
    }
  });

  it('makes a color-scheme theme of it — the colour roles are differing pairs', () => {
    // Not just the sampled tokens: a light-only regression would strip the whole
    // set, so assert broadly. Every `--mat-sys-*` / `--ui-sys-*` role emitted as a
    // `light-dark()` must be a well-formed two-sided pair, and the bulk of them
    // must genuinely differ between schemes — a light-only theme would either drop
    // the `light-dark()` wrapper (so nothing matches) or leave both sides equal.
    const roles = [...css.matchAll(/(--(?:mat|ui)-sys-[\w-]+):\s*(light-dark\([^;]+);/g)];

    // A guard that matched nothing would pass by vacuum; M3 emits dozens.
    expect(roles.length).toBeGreaterThan(20);

    let differing = 0;
    for (const [, name, value] of roles) {
      const pair = schemes(value);
      // Structure holds for all of them, including the handful M3 keeps identical
      // across schemes on purpose (the `*-fixed` roles, `scrim`, `shadow`).
      expect(pair, name).not.toBeNull();
      if (pair![0] !== pair![1]) differing++;
    }

    // The overwhelming majority flip; only M3's deliberately-fixed roles do not.
    expect(differing).toBeGreaterThan(20);
    expect(differing).toBeGreaterThan(roles.length / 2);
  });
});
