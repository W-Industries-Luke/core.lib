import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * The contract that makes dark mode work.
 *
 * Dark mode is not a feature any component implements — it is what happens for
 * free when every colour comes from a `--mat-sys-*` / `--ui-sys-*` token, because
 * the theme resolves each of those through `light-dark()`. So there is exactly
 * one way to break it: write a literal colour. That one is a `#fff` in a
 * stylesheet nobody looks at again, and it ships to every app in the fleet as a
 * white box on a dark page.
 *
 * Nothing else in the gate can catch this — a literal colour builds, renders, and
 * passes every component's own tests, and is only wrong in a scheme those tests
 * never enter. Hence a source-level assertion, in the spirit of `release.spec.ts`:
 * some contracts are cheaper to hold than to observe.
 */
/** A `--ui-sys-spacing-*` declaration — the one `--ui-sys-*` role that is not a colour. */
const SPACING_ROLE = /^\s*--ui-sys-spacing-[\w#{}$.-]*:/;

describe('theme contract', () => {
  const src = join(process.cwd(), 'projects', 'ui', 'src');

  // `_theme.scss` is the one file allowed to name a colour: it is where the
  // palettes are chosen and where every token's light/dark pair is derived from
  // them. That is the point of it existing — see the assertions on it below.
  const THEME = join('styles', '_theme.scss');

  const stylesheets = scssFilesUnder(src)
    .map((file) => relative(src, file))
    .filter((file) => file !== THEME)
    .sort();

  const read = (file: string) => readFileSync(join(src, file), 'utf8');

  it('finds the stylesheets to check', () => {
    // A glob that silently matched nothing would make every assertion below pass
    // by vacuum. These two are the shapes that exist: a component's encapsulated
    // stylesheet, and a directive's partial (a directive cannot carry a
    // `styleUrl`, so its theming lives in `styles/` and is emitted by the theme).
    expect(stylesheets).toContain(join('lib', 'card', 'card.scss'));
    expect(stylesheets).toContain(join('styles', '_button.scss'));
    expect(stylesheets.length).toBeGreaterThan(20);
  });

  describe.each(stylesheets)('%s', (file) => {
    it('resolves every colour from a theme token, never a literal', () => {
      expect(literalColours(read(file))).toEqual([]);
    });
  });

  describe('src/styles/_theme.scss', () => {
    const theme = readFileSync(join(src, THEME), 'utf8');

    it('leaves the scheme to the OS by default', () => {
      // The whole fleet inherits this line: it is what lets an app pin a side
      // with `:root { color-scheme: dark; }` and lets it ship neither.
      expect(theme).toMatch(/color-scheme:\s*light dark/);
    });

    it('gives its own colour roles the same light/dark pairing Material’s roles have', () => {
      // `--ui-sys-success` / `--ui-sys-warning` are this library's additions to
      // M3, so nothing upstream flips them — they only track the scheme because
      // they are emitted as `light-dark()` like every `--mat-sys-*` role. A tone
      // written as a bare `map.get()` here would be a role that is correct in
      // light and wrong in dark.
      // The names are interpolated (`--ui-sys-#{$name}`), since the roles are
      // emitted by a mixin per status palette rather than written out.
      const roles = theme
        .split('\n')
        .filter((line) => /^\s*--ui-sys-[\w#{}$.-]+:/.test(line))
        // `--ui-sys-spacing-*` is the exception, and the only kind of exception
        // there is: it carries a length rather than a colour, and a gap is a gap
        // in the dark. Pairing it through `light-dark()` would be noise, not
        // rigour — see the assertion below, which holds it to its own contract.
        .filter((line) => !SPACING_ROLE.test(line))
        .map((line) => line.trim());

      expect(roles.length).toBeGreaterThanOrEqual(4);
      for (const role of roles) {
        expect(role).toContain('light-dark(');
      }
    });

    it('emits a spacing scale for the fleet to lay out against', () => {
      // M3's 4dp grid is not a token Material emits, so this is the fleet's only
      // shared answer to "how far apart" — a component reaching for a literal
      // instead is how the apps drift. It is asserted here rather than in
      // `ui-divider`'s own spec because the scale is the theme's, and the next
      // component to need a gap has to find these three already defined.
      const scale = theme.split('\n').filter((line) => SPACING_ROLE.test(line));

      expect(scale.length).toBeGreaterThanOrEqual(1);
      // Steps on M3's own 4dp unit, not hand-picked numbers.
      expect(theme).toMatch(/\$spacing-unit:\s*4px/);
      expect(theme).toMatch(/sm:\s*2,[\s\S]*?md:\s*4,[\s\S]*?lg:\s*6,/);
    });
  });
});

/** Every `.scss` under `dir`, recursively. */
function scssFilesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.scss'))
    .map((entry) => join(entry.parentPath, entry.name));
}

/**
 * The literal colours in a stylesheet, if any.
 *
 * Comments are stripped first: this library documents its colour decisions in
 * prose, so the tones and hexes an explanation cites (`#ffdad4`, "fade to red")
 * are the norm rather than the exception, and matching them would make the rule
 * unkeepable.
 */
function literalColours(scss: string): string[] {
  const code = scss
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // `(^|\s)` so a `//` inside a value — a `url(https://…)` — is not a comment.
    .replace(/(^|\s)\/\/.*$/gm, '$1');

  const patterns = [
    /#[0-9a-f]{3,8}\b/i,
    /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\s*\(/i,
    // Only as a value (after `:`, `,` or `(`), so a token or class name that
    // merely contains a colour word — `--ui-tabs-inactive-label-color` — is not a
    // hit. `(?![-\w])` keeps `white-space: nowrap` out of it.
    /[:,(]\s*(?:white|black|gr[ae]y|silver|red|green|blue|orange|yellow|purple|pink|brown)(?![-\w])/i,
  ];

  return code
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => patterns.some((pattern) => pattern.test(line)));
}
