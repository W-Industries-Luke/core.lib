import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Icon, type UiIconColor, type UiIconSizeName } from './icon';

const SIZES: UiIconSizeName[] = ['sm', 'md', 'lg'];
const COLORS: UiIconColor[] = ['inherit', 'primary', 'error'];

/**
 * A representative spread of Material Symbols names — navigation, commerce,
 * communication, media, files, status and destructive glyphs — here only to show
 * that `name` is the whole set at <https://fonts.google.com/icons> rather than a
 * list this library curates. Pick any name from that catalogue; these are a taste.
 */
const NAMES = [
  'home',
  'search',
  'settings',
  'shopping_cart',
  'favorite',
  'notifications',
  'mail',
  'calendar_today',
  'account_circle',
  'cloud_upload',
  'download',
  'edit',
  'content_copy',
  'delete',
  'check_circle',
  'warning',
];

/** The px each named step resolves to — for the captions below. */
const SIZE_PX: Record<UiIconSizeName, number> = { sm: 18, md: 24, lg: 36 };

/** Captions a glyph, so a grid is readable without reading its source. */
const caption = (text: string, content: string) => `
  <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
    ${content}
    <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${text}</span>
  </div>`;

const row = (content: string) =>
  `<div style="display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;">${content}</div>`;

const meta: Meta<Icon> = {
  title: 'Components/Icon',
  component: Icon,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [Icon] })],
  args: {
    name: 'home',
    size: 'md',
    filled: false,
    color: 'inherit',
  },
  argTypes: {
    name: { control: 'text' },
    size: { control: 'inline-radio', options: SIZES },
    filled: { control: 'boolean' },
    color: { control: 'inline-radio', options: COLORS },
    label: { control: 'text' },
    // Documented in the table but not a knob: its input is aliased to
    // `aria-label`, which `argsToTemplate` cannot bind — it writes the class
    // member name. The `a11y: aria-label` story covers it with a real template.
    ariaLabel: { name: 'aria-label', control: false },
    matIcon: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-icon` is the shared theme applied to Angular Material’s `<mat-icon>`, standardised',
          'on **Material Symbols**. Like `ui-spinner` and unlike `uiButton`, it is a **component**',
          'rather than a directive: an icon is not a decoration on a native element — there is no',
          'native element to decorate — it renders its own glyph.',
          '',
          'What it adds to `<mat-icon>` is the three decisions the fleet should not re-take at',
          'each call site: the font set (Material Symbols, not the older Material Icons font',
          'Material defaults to), the size scale, and the colour roles.',
          '',
          '### A consuming app must load the font ⚠️',
          '',
          'The font is **not bundled** — it is a webfont the *app* loads, exactly as Roboto is.',
          'Storybook loads it in `.storybook/preview-head.html`, and that file ships to nobody, so',
          'an app has to put this in its `index.html`:',
          '',
          '```html',
          '<link rel="preconnect" href="https://fonts.googleapis.com" />',
          '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
          '<link',
          '  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"',
          '  rel="stylesheet"',
          '/>',
          '```',
          '',
          'The axis ranges in that URL are load-bearing: they ask for the **variable** font, and',
          '`filled` is a variable axis (`FILL`). Under the static',
          '`…/icon?family=Material+Symbols+Outlined` form, `filled` silently does nothing. Without',
          'the font at all, an icon renders as an empty box.',
          '',
          'Names: <https://fonts.google.com/icons>.',
          '',
          '### Accessibility',
          '',
          'An icon is decorative by default — Material marks `<mat-icon>` `aria-hidden`, so a',
          '`home` glyph beside the word "Home" is not announced twice. When the glyph is the only',
          'carrier of meaning, name it with `label` (or `aria-label`) and the host becomes a named',
          '`role="img"`.',
          '',
          '### Theming and restyling',
          '',
          'Colours resolve from the shared M3 theme in `src/styles/_theme.scss` via Material system',
          'tokens — Material’s own `color` input is M2-only and does nothing under an M3 theme — so',
          'every story below renders the exact palette a consuming app gets, dark mode included.',
          '`--ui-icon-color` re-points a glyph from an ordinary CSS rule, with no `::ng-deep`.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<ui-icon ${argsToTemplate(args)}></ui-icon>`,
  }),
};

export default meta;
type Story = StoryObj<Icon>;

/** The default icon: `md` (24px), outlined, inheriting the text colour. */
export const Default: Story = {};

// --- Names -----------------------------------------------------------------

/**
 * `name` is any Material Symbols name — the set is Google's
 * (<https://fonts.google.com/icons>), not a list this library curates. These six
 * are only a representative spread.
 */
export const Icons: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      NAMES.map((name) => caption(name, `<ui-icon name="${name}"></ui-icon>`)).join(''),
    ),
  }),
};

// --- Sizes -----------------------------------------------------------------

/** The three named steps, side by side. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      SIZES.map((size) =>
        caption(`${size} (${SIZE_PX[size]}px)`, `<ui-icon name="home" size="${size}"></ui-icon>`),
      ).join(''),
    ),
  }),
};

/** 18px — inline with body text, or inside a dense control. */
export const SizeSm: Story = { name: 'Size: sm (18px)', args: { size: 'sm' } };

/** 24px — Material's own default, and this component's. */
export const SizeMd: Story = { name: 'Size: md (24px)', args: { size: 'md' } };

/** 36px — a lead glyph, e.g. beside a heading. */
export const SizeLg: Story = { name: 'Size: lg (36px)', args: { size: 'lg' } };

/**
 * `size` also takes a number of px, for the cases the scale does not cover — so
 * a one-off 64px glyph is an input rather than a CSS override.
 */
export const SizeNumber: Story = {
  name: 'Size: a number (px)',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      [12, 20, 48, 64]
        .map((px) => caption(`${px}`, `<ui-icon name="home" size="${px}"></ui-icon>`))
        .join(''),
    ),
  }),
};

/**
 * The icon sits on the text baseline and takes the surrounding colour, so it
 * needs no wrapper or alignment hack to live in a sentence.
 */
export const InlineWithText: Story = {
  name: 'Size: inline with text',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <p style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface); max-width: 40ch;">
        Press <ui-icon name="settings" size="sm"></ui-icon> Settings to change your
        <ui-icon name="notifications" size="sm"></ui-icon> notification preferences.
      </p>`,
  }),
};

// --- Filled ----------------------------------------------------------------

/**
 * `filled` is the Material Symbols `FILL` variable axis, not a second font: it
 * costs no extra download, and it is the axis M3 intends for a selected state —
 * an outlined `favorite` that fills when favourited.
 */
export const FilledVsOutlined: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      ['favorite', 'star', 'bookmark', 'check_circle']
        .flatMap((name) => [
          caption(`${name} (outlined)`, `<ui-icon name="${name}" size="lg"></ui-icon>`),
          caption(`${name} (filled)`, `<ui-icon name="${name}" size="lg" filled></ui-icon>`),
        ])
        .join(''),
    ),
  }),
};

/** The default cut. */
export const Outlined: Story = { name: 'Filled: false (default)', args: { name: 'favorite' } };

/** The filled cut of the same glyph — the same name, one axis moved. */
export const Filled: Story = { name: 'Filled: true', args: { name: 'favorite', filled: true } };

// --- Colours ---------------------------------------------------------------

/**
 * The three roles, each shown on a line of body text so `inherit` is legible as
 * a decision rather than an absence.
 */
export const Colors: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      COLORS.map((color) =>
        caption(color, `<ui-icon name="shopping_cart" size="lg" color="${color}"></ui-icon>`),
      ).join(''),
    ),
  }),
};

/**
 * The default: the icon takes the surrounding text colour, because an icon
 * beside text is part of that text. Material's default too.
 */
export const ColorInherit: Story = {
  name: 'Color: inherit (default)',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; gap: 1.5rem;">
        <span style="display: inline-flex; align-items: center; gap: 0.5rem; font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface);">
          <ui-icon name="home"></ui-icon> on-surface
        </span>
        <span style="display: inline-flex; align-items: center; gap: 0.5rem; font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface-variant);">
          <ui-icon name="home"></ui-icon> on-surface-variant
        </span>
      </div>`,
  }),
};

/** The theme's primary palette. */
export const ColorPrimary: Story = {
  name: 'Color: primary',
  args: { name: 'check_circle', size: 'lg', color: 'primary' },
};

/** The theme's error palette — for destructive actions and failure states. */
export const ColorError: Story = {
  name: 'Color: error',
  args: { name: 'delete', size: 'lg', color: 'error' },
};

// --- Accessibility ---------------------------------------------------------

/**
 * The common case: the meaning is already in the adjacent text, so the glyph is
 * decorative and Material's `aria-hidden` is left alone. Naming it here would
 * make a screen reader say "Delete" twice.
 */
export const Decorative: Story = {
  name: 'a11y: decorative (default)',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <span style="display: inline-flex; align-items: center; gap: 0.5rem; font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface);">
        <ui-icon name="delete" color="error"></ui-icon> Delete order
      </span>`,
  }),
};

/**
 * When the glyph is the *only* carrier of meaning, `label` names it and the host
 * becomes a `role="img"` — so this reads as "Order delivered", not as nothing.
 */
export const Labelled: Story = {
  name: 'a11y: label',
  args: { name: 'check_circle', color: 'primary', label: 'Order delivered' },
};

/**
 * `aria-label` is accepted as an equivalent of `label`: rule 3 of the
 * extensibility contract — the attribute a consumer reaches for first has to
 * reach the real element and work, not be silently overwritten by the host
 * binding.
 */
export const AriaLabel: Story = {
  name: 'a11y: aria-label',
  parameters: { controls: { disable: true } },
  render: () => ({ template: `<ui-icon name="delete" aria-label="Delete order"></ui-icon>` }),
};

/**
 * An icon-only button: the *button* carries the name, so the glyph inside it
 * stays decorative. Naming both would announce the label twice.
 */
export const InAnIconButton: Story = {
  name: 'a11y: inside an icon-only button',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <button
        type="button"
        aria-label="Delete order"
        style="display: inline-flex; align-items: center; justify-content: center; padding: 0.5rem; border: 0; border-radius: var(--mat-sys-corner-full); background: transparent; color: var(--mat-sys-error); cursor: pointer;">
        <ui-icon name="delete"></ui-icon>
      </button>`,
  }),
};

// --- Styling hooks and escape hatches --------------------------------------

/**
 * `--ui-icon-color` is read off `<ui-icon>`, so a role this component puts no
 * input on — `tertiary`, or the theme's own `--ui-sys-success`/`--ui-sys-warning`
 * — is an ordinary CSS rule rather than a reason to fork the `color` union. It
 * beats `color` without `!important`. Point it at a role rather than a literal,
 * so it survives a palette change and dark mode.
 */
export const CustomProperties: Story = {
  name: 'Styling hook: --ui-icon-color',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      [
        ['--mat-sys-tertiary', 'palette'],
        ['--ui-sys-success', 'check_circle'],
        ['--ui-sys-warning', 'warning'],
      ]
        .map(([role, name]) =>
          caption(
            role,
            `<ui-icon name="${name}" size="lg" style="--ui-icon-color: var(${role});"></ui-icon>`,
          ),
        )
        .join(''),
    ),
  }),
};

/**
 * An icon on a coloured surface: the hook takes the legible-on-that-surface
 * role, so contrast comes from the theme rather than from a hand-picked hex.
 */
export const OnColouredSurface: Story = {
  name: 'Styling hook: on a coloured surface',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1.5rem;
        border-radius: var(--mat-sys-corner-medium);
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
        font: var(--mat-sys-body-medium);">
        <ui-icon name="info" style="--ui-icon-color: var(--mat-sys-on-primary-container);"></ui-icon>
        Your order is on its way.
      </div>`,
  }),
};

/**
 * The other Material Symbols axes, as hooks: `--ui-icon-weight` (`wght`),
 * `--ui-icon-grade` (`GRAD`) and `--ui-icon-optical-size` (`opsz`). They need
 * the variable font — see the font note at the top.
 */
export const FontAxes: Story = {
  name: 'Styling hook: the other font axes',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      [100, 300, 400, 600, 700]
        .map((weight) =>
          caption(
            `wght ${weight}`,
            `<ui-icon name="home" size="lg" style="--ui-icon-weight: ${weight};"></ui-icon>`,
          ),
        )
        .join(''),
    ),
  }),
};

/**
 * Rule 7: `name` covers the Material Symbols set, and content projection covers
 * everything else — an inline SVG, a brand mark — sized and coloured by the same
 * host, so a one-off icon is not a reason to drop out of the component.
 */
export const ProjectedContent: Story = {
  name: 'Escape hatch: projected content',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <ui-icon size="lg" color="primary" label="Brand mark">
        <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden="true">
          <path d="M12 2 2 22h20L12 2Zm0 5 6 13H6l6-13Z" />
        </svg>
      </ui-icon>`,
  }),
};

/**
 * `exportAs: 'uiIcon'` hands back the component, and `matIcon()` hands back
 * Material's own instance — the escape hatch for anything not wrapped here, such
 * as `svgIcon` or `inline`.
 */
export const TemplateRef: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 1rem; font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface);">
        <ui-icon #icon="uiIcon" name="shopping_cart" size="lg"></ui-icon>
        <span>MatIcon is rendering <strong>{{ icon.matIcon().fontIcon }}</strong> from
        <strong>{{ icon.matIcon().fontSet }}</strong>.</span>
      </div>`,
  }),
};

// --- The full matrix -------------------------------------------------------

/**
 * Every size × colour combination, outlined and filled. This is the reference
 * grid: if a combination is not legible here, the theme is wrong.
 */
export const AllSizesAndColors: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <table style="border-collapse: collapse; font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface);">
        <thead>
          <tr>
            <!-- The corner cell labels nothing — it is the blank intersection of the
                 size and colour axes, so it is a spacer td, not an empty th. -->
            <td style="padding: 0.75rem;"></td>
            ${COLORS.map(
              (c) =>
                `<th style="text-align: left; padding: 0.75rem; font: var(--mat-sys-title-small);">${c}</th>`,
            ).join('\n            ')}
          </tr>
        </thead>
        <tbody>
          ${SIZES.map(
            (size) => `
          <tr>
            <th style="text-align: left; padding: 0.75rem; font: var(--mat-sys-title-small);">${size}</th>
            ${COLORS.map(
              (color) => `<td style="padding: 0.75rem;">
              <div style="display: flex; gap: 0.75rem; align-items: center;">
                <ui-icon name="favorite" size="${size}" color="${color}"></ui-icon>
                <ui-icon name="favorite" size="${size}" color="${color}" filled></ui-icon>
              </div>
            </td>`,
            ).join('\n            ')}
          </tr>`,
          ).join('')}
        </tbody>
      </table>`,
  }),
};
