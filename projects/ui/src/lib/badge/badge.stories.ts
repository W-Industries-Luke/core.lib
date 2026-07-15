import { MatButton } from '@angular/material/button';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Badge, type UiBadgePosition, type UiBadgeSize, type UiBadgeVariant } from './badge';

const VARIANTS: UiBadgeVariant[] = ['neutral', 'success', 'warning', 'danger'];
const SIZES: UiBadgeSize[] = ['small', 'medium', 'large'];

/** The four corners, spelled the long way. Material also accepts the shorthands. */
const POSITIONS: UiBadgePosition[] = ['above after', 'above before', 'below after', 'below before'];

/**
 * The story args. `variant` is the directive's own signal input; the rest are
 * inputs it exposes through `hostDirectives`, so they are bindable on
 * `[uiBadge]` but are not members of the class for Storybook to infer.
 */
type BadgeArgs = Badge & {
  uiBadge: string;
  size: UiBadgeSize;
  uiBadgePosition: UiBadgePosition;
  uiBadgeOverlap: boolean;
  uiBadgeHidden: boolean;
  uiBadgeDisabled: boolean;
  uiBadgeDescription: string;
};

/** Badges overhang their host, so every host needs room around it to not clip. */
const row = (content: string) =>
  `<div style="display: flex; align-items: center; gap: 2.5rem; flex-wrap: wrap; padding: 1.5rem;">${content}</div>`;

/** Captions a cell, so a grid is readable without reading its source. */
const caption = (text: string, content: string) => `
  <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
    ${content}
    <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${text}</span>
  </div>`;

const meta: Meta<BadgeArgs> = {
  title: 'Components/Badge',
  component: Badge,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [Badge, MatButton] })],
  args: {
    uiBadge: '4',
    variant: 'neutral',
    size: 'medium',
    uiBadgeDescription: '4 unread messages',
  },
  argTypes: {
    uiBadge: { name: 'uiBadge (content)', control: 'text' },
    variant: { control: 'inline-radio', options: VARIANTS },
    size: { control: 'inline-radio', options: SIZES },
    uiBadgePosition: { control: 'select', options: POSITIONS },
    uiBadgeOverlap: { control: 'boolean' },
    uiBadgeHidden: { control: 'boolean' },
    uiBadgeDisabled: { control: 'boolean' },
    uiBadgeDescription: { control: 'text' },
    matBadge: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`uiBadge` is the shared theme applied to Angular Material’s `matBadge`.',
          '',
          'Like `uiButton` and unlike `ui-card`, it is a **directive**, not a wrapper component: a',
          'badge decorates something — an icon, a button, a tab label — and the thing it decorates is',
          'the consumer’s element. So the element you write is the element the browser gets, and',
          '`aria-*`, `id`, `routerLink`, `disabled` and `data-*` all keep working with no forwarding.',
          '',
          '`MatBadge` is a real directive, so `uiBadge` pulls it onto the host itself and you write a',
          'single attribute — no `matBadge` alongside it, unlike `uiButton`, where Material’s button',
          'is a *component* and has to be in the template.',
          '',
          '### Variants',
          '',
          'M3 has no `success` or `warning` colour role — its palette stops at',
          'primary/secondary/tertiary/error — and Material’s own `matBadgeColor` is an M2-only API',
          'that does nothing under an M3 theme. So `variant` resolves through `mat.badge-overrides()`',
          'in `src/styles/_badge.scss`, against roles the theme defines: `--ui-sys-success` and',
          '`--ui-sys-warning` are derived from Material’s prebuilt palettes exactly the way M3 derives',
          '`error`, so they track light/dark and a palette swap like every other role.',
          '',
          'Note that `neutral` — the default — carries a marker class of its own, unlike `uiButton`’s',
          '`primary`: M3’s badge defaults to the **error** palette, so an unmarked badge would be red.',
          '',
          '### Sizes',
          '',
          'Stock M3 does not give `matBadgeSize` a usable scale: `small` sets `text-size: 0` (a dot',
          'that renders the count invisibly) and `large` is token-for-token identical to `medium`.',
          '`src/styles/_badge.scss` makes the three steps real, keeping Material’s own offset ratio so',
          'a badge stays pinned to its host’s corner at every size.',
          '',
          '### Accessibility',
          '',
          'Material renders the badge content `aria-hidden`, because “4” alone is meaningless out of',
          'context. Name it with `uiBadgeDescription` — say what the count *means* (`4 unread',
          'messages`). Material attaches that via `AriaDescriber` on an interactive host, and as a',
          'visually-hidden span otherwise.',
          '',
          '### Input naming',
          '',
          '`variant` and `size` are this library’s theme API. The rest are straight pass-throughs to',
          'Material, keeping its `matBadge*` shape as `uiBadge*` — that prefix is *why* Material chose',
          'it: bare `hidden` and `disabled` are native HTML attributes, and an input claiming those',
          'names would quietly eat `[disabled]` on a real button.',
          '',
          '### Theming and restyling',
          '',
          'There is not a literal colour in this component’s styles, so every story below renders the',
          'exact palette a consuming app gets, dark mode included. `--ui-badge-background-color` and',
          '`--ui-badge-text-color` re-point a badge from an ordinary CSS rule, with no `::ng-deep`.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<div style="padding: 1.5rem;">
      <button matButton ${argsToTemplate(args)}>Inbox</button>
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<BadgeArgs>;

/** The default: a neutral, medium badge on a button. */
export const Default: Story = {};

// --- Variants ---------------------------------------------------------------

/** A count with no urgency — the default. */
export const Neutral: Story = {
  args: { variant: 'neutral', uiBadge: '4', uiBadgeDescription: '4 unread messages' },
};

/** Something completed or is healthy. */
export const Success: Story = {
  args: { variant: 'success', uiBadge: '12', uiBadgeDescription: '12 checks passed' },
};

/** Something needs attention, but has not failed. */
export const Warning: Story = {
  args: { variant: 'warning', uiBadge: '3', uiBadgeDescription: '3 warnings' },
};

/** Something failed, or is urgent. Material’s own badge default. */
export const Danger: Story = {
  args: { variant: 'danger', uiBadge: '9', uiBadgeDescription: '9 failures' },
};

/** Every variant side by side — the set a consumer is choosing between. */
export const Variants: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      VARIANTS.map((variant) =>
        caption(
          variant,
          `<button matButton uiBadge="4" variant="${variant}" uiBadgeDescription="4 ${variant} items">
             Inbox
           </button>`,
        ),
      ).join(''),
    ),
  }),
};

// --- Sizes ------------------------------------------------------------------

/** The smallest step. Stock M3 would render this count invisibly; the theme does not. */
export const Small: Story = {
  args: { size: 'small', uiBadge: '4', uiBadgeDescription: '4 unread messages' },
};

/** The default step — Material’s own 16px badge. */
export const Medium: Story = {
  args: { size: 'medium', uiBadge: '4', uiBadgeDescription: '4 unread messages' },
};

/** The largest step. Identical to `medium` in stock M3; a real step here. */
export const Large: Story = {
  args: { size: 'large', uiBadge: '4', uiBadgeDescription: '4 unread messages' },
};

/** Every size side by side, so the scale is visible as a scale. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      SIZES.map((size) =>
        caption(
          size,
          `<button matButton uiBadge="4" size="${size}" uiBadgeDescription="4 unread messages">
             Inbox
           </button>`,
        ),
      ).join(''),
    ),
  }),
};

// --- Every variant x size ---------------------------------------------------
//
// Each combination as its own story, so every one is independently linkable and
// independently axe-asserted rather than only a cell in the grid at the bottom.

export const NeutralSmall: Story = {
  name: 'neutral / small',
  args: { variant: 'neutral', size: 'small', uiBadgeDescription: '4 unread messages' },
};
export const NeutralMedium: Story = {
  name: 'neutral / medium',
  args: { variant: 'neutral', size: 'medium', uiBadgeDescription: '4 unread messages' },
};
export const NeutralLarge: Story = {
  name: 'neutral / large',
  args: { variant: 'neutral', size: 'large', uiBadgeDescription: '4 unread messages' },
};

export const SuccessSmall: Story = {
  name: 'success / small',
  args: { variant: 'success', size: 'small', uiBadgeDescription: '4 checks passed' },
};
export const SuccessMedium: Story = {
  name: 'success / medium',
  args: { variant: 'success', size: 'medium', uiBadgeDescription: '4 checks passed' },
};
export const SuccessLarge: Story = {
  name: 'success / large',
  args: { variant: 'success', size: 'large', uiBadgeDescription: '4 checks passed' },
};

export const WarningSmall: Story = {
  name: 'warning / small',
  args: { variant: 'warning', size: 'small', uiBadgeDescription: '4 warnings' },
};
export const WarningMedium: Story = {
  name: 'warning / medium',
  args: { variant: 'warning', size: 'medium', uiBadgeDescription: '4 warnings' },
};
export const WarningLarge: Story = {
  name: 'warning / large',
  args: { variant: 'warning', size: 'large', uiBadgeDescription: '4 warnings' },
};

export const DangerSmall: Story = {
  name: 'danger / small',
  args: { variant: 'danger', size: 'small', uiBadgeDescription: '4 failures' },
};
export const DangerMedium: Story = {
  name: 'danger / medium',
  args: { variant: 'danger', size: 'medium', uiBadgeDescription: '4 failures' },
};
export const DangerLarge: Story = {
  name: 'danger / large',
  args: { variant: 'danger', size: 'large', uiBadgeDescription: '4 failures' },
};

// --- Content ----------------------------------------------------------------

/** Badges are not only counts: short status text works the same way. */
export const TextContent: Story = {
  name: 'Content: text',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      [
        ['Live', 'success'],
        ['Beta', 'neutral'],
        ['Soon', 'warning'],
        ['Down', 'danger'],
      ]
        .map(([text, variant]) =>
          caption(
            text,
            `<button matButton uiBadge="${text}" variant="${variant}" size="large"
                     uiBadgeDescription="Status: ${text}">Stream</button>`,
          ),
        )
        .join(''),
    ),
  }),
};

/** A count that outgrows its circle: the badge grows into a pill rather than clipping. */
export const LongContent: Story = {
  name: 'Content: long',
  args: { uiBadge: '999+', variant: 'danger', size: 'large', uiBadgeDescription: 'Over 999 unread' },
};

/**
 * Empty content hides the badge — Material's own `hidden || !content`. That is
 * what lets a consumer bind a real value straight through without guarding for
 * the empty case in the template.
 */
export const EmptyContent: Story = {
  name: 'Content: empty (hidden)',
  args: { uiBadge: '', uiBadgeDescription: '' },
};

// --- States -----------------------------------------------------------------

/**
 * `uiBadgeHidden` hides the badge while leaving the host alone — for a count
 * that comes and goes without the element moving.
 */
export const Hidden: Story = {
  name: 'State: hidden',
  args: { uiBadgeHidden: true },
};

/**
 * `uiBadgeDisabled` fades the badge to match a disabled host. The faded colour is
 * the *variant's* colour at Material's own 38%, not Material's stock red — which
 * is what a disabled `success` badge would otherwise turn into.
 */
export const Disabled: Story = {
  name: 'State: disabled',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      VARIANTS.map((variant) =>
        caption(
          variant,
          `<button matButton uiBadge="4" variant="${variant}" uiBadgeDisabled disabled
                   uiBadgeDescription="4 ${variant} items">Inbox</button>`,
        ),
      ).join(''),
    ),
  }),
};

/** Both badge states side by side, against a normal one. */
export const States: Story = {
  name: 'State: all',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      [
        ['default', ''],
        ['disabled', 'uiBadgeDisabled disabled'],
        ['hidden', 'uiBadgeHidden'],
      ]
        .map(([label, attrs]) =>
          caption(
            label,
            `<button matButton uiBadge="4" variant="danger" ${attrs}
                     uiBadgeDescription="4 unread messages">Inbox</button>`,
          ),
        )
        .join(''),
    ),
  }),
};

// --- Position and overlap ---------------------------------------------------

/** Each corner. Material also accepts the `above`/`below`/`before`/`after` shorthands. */
export const Positions: Story = {
  name: 'Position: every corner',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      POSITIONS.map((position) =>
        caption(
          position,
          `<button matButton uiBadge="4" variant="danger" uiBadgePosition="${position}"
                   uiBadgeDescription="4 unread messages">Inbox</button>`,
        ),
      ).join(''),
    ),
  }),
};

/**
 * `uiBadgeOverlap` decides whether the badge sits on the host or beside it.
 * Material defaults it to `true`, which suits an icon; `false` suits text.
 */
export const Overlap: Story = {
  name: 'Position: overlap',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      [true, false]
        .map((overlap) =>
          caption(
            `overlap: ${overlap}`,
            `<button matButton uiBadge="4" variant="danger" [uiBadgeOverlap]="${overlap}"
                     uiBadgeDescription="4 unread messages">Inbox</button>`,
          ),
        )
        .join(''),
    ),
  }),
};

// --- Hosts ------------------------------------------------------------------

/**
 * The directive goes on whatever is being badged — the host keeps being itself.
 * The anchor here is a real `<a href>`: it still navigates, and would still take
 * a `routerLink`, because nothing wraps it.
 */
export const Hosts: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      [
        caption('button', `<button matButton uiBadge="4" variant="danger" uiBadgeDescription="4 unread messages">Inbox</button>`),
        caption('anchor', `<a href="#" uiBadge="2" variant="neutral" uiBadgeDescription="2 new items" style="font: var(--mat-sys-body-medium); color: var(--mat-sys-primary);">Archive</a>`),
        caption('text', `<span uiBadge="Live" variant="success" size="small" uiBadgeDescription="Status: live" style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface);">Stream</span>`),
      ].join(''),
    ),
  }),
};

// --- Accessibility ----------------------------------------------------------

/**
 * The badge content is `aria-hidden`, so `uiBadgeDescription` is what a screen
 * reader actually gets. Say what the count means, not what it says: `4 unread
 * messages`, not `4`.
 *
 * On an interactive host Material wires it up with `aria-describedby`; on a
 * non-interactive one it uses a visually-hidden span. Both are covered here.
 */
export const Described: Story = {
  name: 'a11y: uiBadgeDescription',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      [
        caption('interactive host', `<button matButton uiBadge="4" variant="danger" uiBadgeDescription="4 unread messages">Inbox</button>`),
        caption('non-interactive host', `<span uiBadge="4" variant="danger" uiBadgeDescription="4 unread messages" style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface);">Inbox</span>`),
      ].join(''),
    ),
  }),
};

// --- Styling hooks and escape hatches ---------------------------------------

/**
 * `--ui-badge-background-color` and `--ui-badge-text-color` are read off the
 * badged element, so re-pointing a badge is an ordinary CSS rule on an ordinary
 * selector — no `::ng-deep`, no `!important`. Point them at `--mat-sys-*` or
 * `--ui-sys-*` roles rather than literals, so they survive a palette change and
 * dark mode.
 */
export const CustomProperties: Story = {
  name: 'Styling hook: --ui-badge-*',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      ['primary', 'tertiary', 'secondary']
        .map((role) =>
          caption(
            `--mat-sys-${role}`,
            `<button matButton uiBadge="4" uiBadgeDescription="4 unread messages"
                     style="--ui-badge-background-color: var(--mat-sys-${role});
                            --ui-badge-text-color: var(--mat-sys-on-${role});">Inbox</button>`,
          ),
        )
        .join(''),
    ),
  }),
};

/**
 * `exportAs: 'uiBadge'` hands back the directive, and `matBadge` hands back
 * Material's own instance — the escape hatch for anything not wrapped here.
 */
export const TemplateRef: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; align-items: center; gap: 2rem; padding: 1.5rem; font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface);">
        <button matButton uiBadge="4" #badge="uiBadge" variant="danger" uiBadgeDescription="4 unread messages">Inbox</button>
        <span>MatBadge.position is currently <strong>{{ badge.matBadge.position }}</strong>.</span>
      </div>`,
  }),
};

// --- The full matrix --------------------------------------------------------

/**
 * Every variant × size. This is the reference grid: if a combination does not
 * hold together here, the theme is wrong.
 */
export const AllConfigurations: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: grid; grid-template-columns: auto repeat(${SIZES.length}, auto); gap: 2.5rem; align-items: center; justify-items: center; padding: 1.5rem; font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">
        <span></span>
        ${SIZES.map((size) => `<span>${size}</span>`).join('')}
        ${VARIANTS.map(
          (variant) => `
          <span>${variant}</span>
          ${SIZES.map(
            (size) =>
              `<button matButton uiBadge="4" variant="${variant}" size="${size}"
                       uiBadgeDescription="4 ${variant} items, ${size}">Inbox</button>`,
          ).join('')}`,
        ).join('')}
      </div>`,
  }),
};
