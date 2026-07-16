import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { MatIcon, MatIconRegistry } from '@angular/material/icon';

/**
 * The font set every `ui-icon` renders from: Material Symbols, outlined.
 *
 * Material Symbols is the fleet's icon set rather than the older Material Icons
 * font that `<mat-icon>` defaults to, so the choice is made here, once, instead
 * of at every call site across the apps. It is exported because a consumer
 * reaching past this component for a raw `<mat-icon>` should be able to ask for
 * the same font set by name rather than retyping the string.
 */
export const UI_ICON_FONT_SET = 'material-symbols-outlined';

/**
 * The class that makes Material render the icon name as a *ligature* — the glyph
 * is drawn from the `fontIcon` attribute via `::before`, so the name never
 * becomes selectable text or search-engine fodder.
 *
 * Material requires it alongside any custom font set class (see the class docs
 * on `MatIcon`), and `MatIcon` only honours it when it arrives as part of the
 * font set's classes — hence the alias registered in the constructor below.
 */
const LIGATURE_FONT_CLASS = 'mat-ligature-font';

/** The named steps of the icon scale, in px. */
const NAMED_SIZES = { sm: 18, md: 24, lg: 36 } as const;

/** A named step on the icon scale. */
export type UiIconSizeName = keyof typeof NAMED_SIZES;

/**
 * How large the icon renders.
 *
 *   - `sm` (18px) — inline with body text, or inside a dense control.
 *   - `md` (24px) — Material's own default, and this component's.
 *   - `lg` (36px) — a lead glyph, e.g. beside a heading.
 *   - any number — the size in px, for the cases the scale does not cover.
 */
export type UiIconSize = UiIconSizeName | number;

/**
 * Semantic colour role of the icon.
 *
 * Material's own `color` input is an M2-only API and does nothing under an M3
 * theme (see `@angular/material/icon`: "This API is supported in M2 themes
 * only"), so these are resolved in `icon.scss` via `mat.icon-overrides()`
 * against the M3 system tokens emitted by `src/styles/_theme.scss`:
 *
 *   - `inherit` — the icon takes the surrounding text colour. The default, and
 *     Material's own: an icon beside text is part of that text.
 *   - `primary` — the theme's primary palette.
 *   - `error`   — the theme's error palette.
 */
export type UiIconColor = 'inherit' | 'primary' | 'error';

/**
 * Coerces the `size` input, which arrives as a number from a binding but as a
 * string from a static attribute (`size="32"`), so both spell the same thing.
 *
 * An unrecognised value falls back to the default step rather than throwing: the
 * union already makes a mistyped size a compile error, and a runtime throw would
 * turn a cosmetic mistake into a blank page.
 */
function coerceIconSize(value: unknown): UiIconSize {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : 'md';
  }

  if (typeof value === 'string') {
    const named = value.trim();
    if (named in NAMED_SIZES) {
      return named as UiIconSizeName;
    }

    const parsed = Number(named);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 'md';
}

/**
 * A themed Material Symbols icon.
 *
 * ```html
 * <ui-icon name="home" />
 * <ui-icon name="delete" color="error" size="lg" label="Delete order" />
 * <ui-icon name="favorite" filled />
 * ```
 *
 * Like `ui-spinner` and unlike `uiButton`, this is a component rather than a
 * directive: an icon is not a decoration on a native element — there is no
 * native element to decorate — it renders its own glyph.
 *
 * That glyph is `<mat-icon>`'s own. What this component adds is the three
 * decisions the fleet should not re-take at each call site: the font set
 * (Material Symbols, not the older Material Icons font Material defaults to),
 * the size scale, and the colour roles.
 *
 * ### The consuming app must load the font
 *
 * The font is not bundled — it is a webfont the *app* loads, exactly as Roboto
 * is. Storybook loads it in `.storybook/preview-head.html`, and that file ships
 * to nobody, so an app has to add this to its `index.html`:
 *
 * ```html
 * <link rel="preconnect" href="https://fonts.googleapis.com" />
 * <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
 * <link
 *   href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
 *   rel="stylesheet"
 * />
 * ```
 *
 * The axis ranges in that URL are load-bearing: they ask for the *variable*
 * font, and `filled` is a variable axis (`FILL`). The static
 * `…/icon?family=Material+Symbols+Outlined` form carries no axes, so under it
 * `filled` — and the `--ui-icon-weight`/`--ui-icon-grade` hooks — silently do
 * nothing.
 *
 * Browse the names at <https://fonts.google.com/icons>.
 *
 * ### Accessibility
 *
 * An icon is decorative by default: Material marks `<mat-icon>` `aria-hidden`,
 * so a `home` glyph beside the word "Home" is not announced twice. When the icon
 * is the *only* carrier of meaning — an icon-only control, a status glyph — name
 * it with `label` (or the equivalent `aria-label`) and the host becomes a named
 * `role="img"`.
 *
 * ### Styling hooks
 *
 * - `--ui-icon-color` — the glyph's colour, overriding `color`. Point it at
 *   another `--mat-sys-*`/`--ui-sys-*` role rather than a literal, so it
 *   survives a palette change and dark mode:
 *   `ui-icon { --ui-icon-color: var(--ui-sys-success); }`
 * - `--ui-icon-weight` (default `400`), `--ui-icon-grade` (default `0`) and
 *   `--ui-icon-optical-size` (default `24`) — the Material Symbols variable font
 *   axes this component does not put an input on.
 *
 * Those are ordinary rules on an ordinary selector — no `::ng-deep`.
 */
@Component({
  selector: 'ui-icon',
  exportAs: 'uiIcon',
  imports: [MatIcon],
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.ui-icon--filled]': 'filled()',
    // `inherit` is the default and needs no marker class — see `icon.scss`.
    '[class.ui-icon--primary]': 'color() === "primary"',
    '[class.ui-icon--error]': 'color() === "error"',
    // Named only when the caller says the glyph carries meaning; an unnamed icon
    // stays the decoration Material already treats it as.
    '[attr.role]': 'resolvedLabel() ? "img" : null',
    '[attr.aria-label]': 'resolvedLabel()',
  },
})
export class Icon {
  private readonly iconRegistry = inject(MatIconRegistry);

  /**
   * The Material Symbols name, e.g. `home`, `shopping_cart`, `delete`.
   *
   * Rendered as a ligature from the `fontIcon` attribute, so the name is not
   * selectable text. Leave it unset to project custom content instead — an
   * inline SVG, a brand mark — which the host still sizes and colours.
   */
  readonly name = input<string>('');

  /** How large the icon renders. Defaults to the 24px `md` step. */
  readonly size = input<UiIconSize, unknown>('md', { transform: coerceIconSize });

  /**
   * Whether to render the filled cut of the glyph rather than the outlined one.
   *
   * This is the Material Symbols `FILL` variable axis rather than a second font,
   * so it costs no extra download — and it is the axis Material intends for a
   * selected/active state: an outlined `favorite` that fills when favourited.
   *
   * Needs the variable font; see the font note on this class.
   */
  readonly filled = input(false, { transform: booleanAttribute });

  /** Semantic colour role, resolved from the shared theme's palettes. */
  readonly color = input<UiIconColor>('inherit');

  /**
   * The icon's accessible name — what the glyph *means*, e.g. `Delete order`.
   *
   * Leave it unset for a decorative icon (one whose meaning is already in
   * adjacent text): Material renders `<mat-icon>` `aria-hidden`, so an unnamed
   * icon is correctly ignored rather than announced as an anonymous image.
   */
  readonly label = input<string>();

  /**
   * The accessible name, spelled as the ARIA attribute. Equivalent to `label`,
   * which wins if both are somehow set.
   *
   * Rule 3 of the extensibility contract: `aria-*` has to reach the real element
   * and work. The host *is* the real element here, but `[attr.aria-label]`
   * outranks a static attribute a consumer writes, so this input catches that
   * attribute rather than letting the host binding overwrite it.
   */
  readonly ariaLabel = input<string | undefined, unknown>(undefined, {
    alias: 'aria-label',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The `MatIcon` this component renders — the escape hatch for anything not
   * wrapped here, such as `svgIcon` or `inline`. Reach it with `#icon="uiIcon"`
   * and `icon.matIcon()`.
   */
  readonly matIcon = viewChild.required(MatIcon);

  /** The font set handed to `<mat-icon>`; see {@link UI_ICON_FONT_SET}. */
  protected readonly fontSet = UI_ICON_FONT_SET;

  /** The resolved size in px, whether `size` named a step or gave a number. */
  protected readonly sizePx = computed(() => {
    const size = this.size();
    return typeof size === 'number' ? size : NAMED_SIZES[size];
  });

  /** The name put on the host, or `null` for a decorative icon. */
  protected readonly resolvedLabel = computed(
    () => this.label()?.trim() || this.ariaLabel()?.trim() || null,
  );

  constructor() {
    // Teaches Material that this font set also wants `mat-ligature-font`.
    //
    // `MatIcon` only draws the `fontIcon` attribute as a ligature when that
    // class arrives as part of the font set's own classes, and its `fontSet`
    // input takes a single class name (it splits on whitespace and keeps the
    // first). Registering the alias is Material's own supported way to say "this
    // font set is these classes", so the ligature rendering stays Material's
    // rather than becoming a hardcoded class in this component's template.
    //
    // The registry is app-scoped and the call is idempotent: the alias always
    // maps to the same pair, so doing it per instance is a map write, not a
    // decision anything else can observe.
    this.iconRegistry.registerFontClassAlias(
      UI_ICON_FONT_SET,
      `${UI_ICON_FONT_SET} ${LIGATURE_FONT_CLASS}`,
    );
  }
}
