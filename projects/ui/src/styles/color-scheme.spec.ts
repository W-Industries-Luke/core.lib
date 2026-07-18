import { applyScheme, DEFAULT_SCHEME, isScheme, SCHEMES } from '../../.storybook/color-scheme';

/**
 * The preview's light/dark switch.
 *
 * This is Storybook wiring rather than shipped API, so nothing else in the gate
 * covers it — but it is the only thing standing between "the theme claims to
 * support dark mode" and "every story is rendered in it". A regression here is
 * silent in the worst way: the toolbar still moves, the stories still pass, and
 * they are all quietly in light.
 */
describe('preview colour scheme', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('html');
  });

  it('offers exactly the schemes the theme can be in', () => {
    // `system` is the theme's `color-scheme: light dark` — the mode an app that
    // sets nothing ships, and so the one the preview must default to.
    expect([...SCHEMES]).toEqual(['system', 'light', 'dark']);
    expect(DEFAULT_SCHEME).toBe('system');
  });

  it('forces the scheme onto the root so `light-dark()` re-resolves', () => {
    // `color-scheme` is the whole mechanism: every `--mat-sys-*` / `--ui-sys-*`
    // role is a `light-dark()`, and this property is what picks a side.
    expect(applyScheme(root, 'dark')).toBe('dark');
    expect(root.style.colorScheme).toBe('dark');

    expect(applyScheme(root, 'light')).toBe('light');
    expect(root.style.colorScheme).toBe('light');
  });

  it('hands `system` back to the OS preference rather than pinning a side', () => {
    // Not an empty string: the root is the same `<html>` the theme wrote
    // `color-scheme: light dark` onto, so `system` has to restore that pair
    // explicitly — an inline style can override the theme's value but cannot
    // fall back to it.
    expect(applyScheme(root, 'system')).toBe('system');
    expect(root.style.colorScheme).toBe('light dark');
  });

  it('exposes the applied scheme as a queryable attribute', () => {
    // A used `color-scheme` leaves no trace in the DOM, so this is what a test
    // or a screenshot name can read back.
    applyScheme(root, 'dark');
    expect(root.dataset['theme']).toBe('dark');
  });

  it('falls back to the default rather than leaving the last story’s scheme', () => {
    // Globals come from the URL, so the value is a string from anywhere. An
    // unknown one assigned straight to `color-scheme` would be dropped by the CSS
    // parser, silently stranding the preview in whatever the previous story set —
    // dark mode that sticks, which reads as a component bug rather than a typo.
    applyScheme(root, 'dark');

    for (const bogus of ['sepia', '', null, undefined, 7]) {
      expect(applyScheme(root, bogus)).toBe(DEFAULT_SCHEME);
      expect(root.style.colorScheme).toBe('light dark');
      expect(root.dataset['theme']).toBe(DEFAULT_SCHEME);
    }
  });

  it('narrows only the schemes it can apply', () => {
    expect(SCHEMES.every(isScheme)).toBe(true);
    expect(isScheme('Dark')).toBe(false);
    expect(isScheme(undefined)).toBe(false);
  });
});
