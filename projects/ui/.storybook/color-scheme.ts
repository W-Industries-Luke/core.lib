// The light/dark switch behind the preview's `Scheme` toolbar.
//
// The theme ships `color-scheme: light dark` and resolves every colour through
// `light-dark()` (see `src/styles/_theme.scss`), so a scheme is not a second
// stylesheet to load — it is one CSS property on the preview root. Forcing it is
// exactly what a consuming app does when it opts out of the OS preference:
//
//   :root { color-scheme: dark; }
//
// ...which is why the toolbar drives that same property rather than some
// Storybook-only mechanism. If dark mode looks right here, it looks right in an
// app.
//
// This lives beside `preview.ts` rather than in `src/` because it is preview
// wiring, not shippable API — nothing here is exported from public-api.ts. It is
// a module of its own so that `preview.ts` stays declarative and the resolution
// rules below are unit-testable without booting Storybook (see
// `src/styles/color-scheme.spec.ts`).

/**
 * `system` is the theme's own default — it hands the decision back to
 * `prefers-color-scheme`, which is what an app that sets nothing gets. It is the
 * initial value for that reason: the preview's default has to be the fleet's
 * default, or the toolbar would document a mode nobody ships.
 */
export const SCHEMES = ['system', 'light', 'dark'] as const;

export type Scheme = (typeof SCHEMES)[number];

export const DEFAULT_SCHEME: Scheme = 'system';

/**
 * The `color-scheme` each toolbar value forces. `system` restores the pair the
 * theme declares, rather than deleting the property — the preview root is the
 * same `<html>` the theme wrote `color-scheme: light dark` onto, so an inline
 * style is only ever overriding it, never removing it.
 */
const COLOR_SCHEME: Record<Scheme, string> = {
  system: 'light dark',
  light: 'light',
  dark: 'dark',
};

/** Narrows an unvalidated global (a URL param is a string from anywhere). */
export function isScheme(value: unknown): value is Scheme {
  return SCHEMES.includes(value as Scheme);
}

/**
 * Forces `scheme` on the preview root, and reports back what it applied.
 *
 * Two things land on the element, and only one of them does the work:
 *
 *   - `color-scheme` is the mechanism. Every `--mat-sys-*` and `--ui-sys-*`
 *     token is a `light-dark()`, and a custom property's `light-dark()` resolves
 *     against the `color-scheme` of the element that *uses* it — so setting it on
 *     the root re-resolves every token in the preview, including inside CDK
 *     overlays, with no re-render and nothing for a component to opt into.
 *   - `data-theme` is a hook, not a mechanism: it gives tests and screenshots
 *     something to assert on and read, since a used `color-scheme` is otherwise
 *     invisible in the DOM. Nothing in the library styles selects on it, because
 *     a component that needed to would be one that is not using the tokens.
 *
 * An unknown value falls back to {@link DEFAULT_SCHEME} rather than writing
 * garbage into `color-scheme` (which the parser would drop, silently leaving the
 * previous story's scheme in place).
 */
export function applyScheme(root: HTMLElement, scheme: unknown): Scheme {
  const resolved = isScheme(scheme) ? scheme : DEFAULT_SCHEME;

  root.style.colorScheme = COLOR_SCHEME[resolved];
  root.dataset['theme'] = resolved;

  return resolved;
}
