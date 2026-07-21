import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Ripple, type UiRippleColor } from './ripple';

const COLORS: UiRippleColor[] = ['primary', 'accent', 'warn'];

/**
 * The story args. `color` is the directive's own signal input; the rest are
 * inputs it exposes through `hostDirectives`, so they are bindable on `[uiRipple]`
 * but are not members of the class for Storybook to infer.
 */
type RippleArgs = Ripple & {
  disabled: boolean;
  centered: boolean;
  radius: number;
  uiRippleUnbounded: boolean;
};

/**
 * A generic interactive surface for a ripple to live on. A ripple is invisible
 * until pressed, so every story renders a real, keyboard-focusable box with a
 * hint — press it to see the tint. `role`/`tabindex`/`aria-label` are the same
 * native attributes a consumer would set; the directive forwards none of them,
 * so axe sees an ordinary accessible button.
 */
const surface = (attrs: string, label = 'Press me') => `
  <div
    uiRipple
    ${attrs}
    role="button"
    tabindex="0"
    aria-label="${label}"
    style="
      display: grid;
      place-items: center;
      width: 12rem;
      height: 7rem;
      padding: 1rem;
      cursor: pointer;
      user-select: none;
      border-radius: var(--mat-sys-corner-medium);
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface);
      font: var(--mat-sys-body-medium);
      outline: 1px solid var(--mat-sys-outline-variant);
    "
  >${label}</div>`;

/** Lays out several surfaces in a wrapping row with room to breathe. */
const row = (content: string) =>
  `<div style="display: flex; gap: 1.5rem; flex-wrap: wrap; padding: 1.5rem;">${content}</div>`;

/** Captions a surface, so a grid is readable without reading its source. */
const caption = (text: string, content: string) => `
  <div style="display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
    ${content}
    <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${text}</span>
  </div>`;

const meta: Meta<RippleArgs> = {
  title: 'Components/Ripple',
  component: Ripple,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [Ripple] })],
  args: {
    color: 'primary',
    disabled: false,
    centered: false,
    radius: 0,
    uiRippleUnbounded: false,
  },
  argTypes: {
    color: { control: 'inline-radio', options: COLORS },
    disabled: { control: 'boolean' },
    centered: { control: 'boolean' },
    radius: { control: 'number' },
    uiRippleUnbounded: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`uiRipple` applies the shared M3 theme to Angular Material’s `matRipple`, giving custom',
          'interactive surfaces — a card body, a list row, a bespoke tile — the same branded ripple',
          'the button family already gets.',
          '',
          'Like `uiBadge` and `uiTooltip`, it is a **directive** on the surface itself, not a wrapper:',
          'the element you write is the element the browser gets, so `role`, `tabindex`, `aria-*`,',
          '`id`, `data-*` and `routerLink` all keep working with no forwarding. Material also sets the',
          '`position: relative`/`overflow: hidden` the ripple needs, via its own `.mat-ripple` class.',
          '',
          '### Colour',
          '',
          'Material’s own `matRippleColor` takes a **literal CSS colour** — exactly the hardcoded',
          'value this library exists to prevent. So `color` is *not* routed through it: it re-points',
          '`--mat-ripple-color`, the token Material’s ripple element reads its background from, at an',
          'M3 system role in `src/styles/_ripple.scss`, at the theme’s pressed-state opacity — the',
          'same construction `uiButton`’s ripples use. `primary` maps to the primary palette, `accent`',
          'to tertiary, `warn` to error, and every tint tracks a palette swap and dark mode.',
          '',
          'Unlike `uiButton`’s `primary`, the default is **not** free: stock M3 paints a plain ripple',
          'from the neutral `on-surface` role, so `primary` carries a marker class of its own.',
          '',
          '### Input naming',
          '',
          '`color` is this library’s theme API. `disabled`, `centered` and `radius` are Material’s own',
          'ripple knobs, exposed bare because a ripple’s natural home is a *custom* surface where none',
          'of them is a native attribute. `uiRippleUnbounded`, `uiRippleAnimation` and',
          '`uiRippleTrigger` keep Material’s `matRipple*` shape, passed through rather than swallowed.',
          '',
          '### Styling hook and escape hatch',
          '',
          'There is not a literal colour here, so every story renders the exact palette a consuming',
          'app gets, dark mode included. `--ui-ripple-color` re-points the tint from an ordinary CSS',
          'rule on the host — no `::ng-deep`. And `exportAs: "uiRipple"` hands back the directive,',
          'whose `matRipple` is Material’s own instance — the escape hatch for `launch()`,',
          '`fadeOutAll()` and the literal-colour `color` input.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<div style="padding: 1.5rem;">${surface(argsToTemplate(args))}</div>`,
  }),
};

export default meta;
type Story = StoryObj<RippleArgs>;

/** The default: a primary-tinted ripple on a plain surface. Press it. */
export const Default: Story = {};

// --- Colours ----------------------------------------------------------------

/** The theme’s primary palette — the default. */
export const Primary: Story = { args: { color: 'primary' } };

/** The theme’s tertiary palette, exposed under the M2-era name `accent`. */
export const Accent: Story = { args: { color: 'accent' } };

/** The theme’s error palette — for a destructive surface. */
export const Warn: Story = { args: { color: 'warn' } };

/** Every colour side by side — the set a consumer is choosing between. */
export const Colors: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      COLORS.map((color) => caption(color, surface(`color="${color}"`, color))).join(''),
    ),
  }),
};

// --- Configuration ----------------------------------------------------------

/**
 * `centered` launches every ripple from the middle of the surface rather than
 * the pointer, for a symmetric press.
 */
export const Centered: Story = { args: { centered: true } };

/**
 * `radius` fixes the ripple’s fully-expanded radius in pixels. Unset (`0`),
 * Material sizes it to reach the surface’s furthest corner.
 */
export const FixedRadius: Story = {
  name: 'Fixed radius',
  args: { radius: 90, centered: true },
};

/**
 * `uiRippleUnbounded` lets the ripple spill past the surface — a circular ripple
 * for an icon-sized target, the way `matIconButton` ripples.
 */
export const Unbounded: Story = {
  args: { uiRippleUnbounded: true },
  render: (args) => ({
    props: args,
    template: `<div style="padding: 2.5rem;">
      ${surface(argsToTemplate(args), 'Icon')}
    </div>`,
  }),
};

/**
 * `disabled` stops pointer ripples. It is exposed bare because a ripple’s home is
 * a custom surface (`<div>`/`<span>`), where `disabled` is not a native
 * attribute — on a real form control, drive it through the `matRipple` instance.
 */
export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => ({
    props: args,
    template: row(
      [
        caption('enabled', surface('color="primary"', 'Press me')),
        caption('disabled', surface('color="primary" disabled', 'No ripple')),
      ].join(''),
    ),
  }),
};

// --- Styling hook and escape hatch ------------------------------------------

/**
 * `--ui-ripple-color` re-points the tint from an ordinary CSS rule on the host —
 * no `::ng-deep`. Point it at a `--mat-sys-*`/`--ui-sys-*` role rather than a
 * literal, so it survives a palette change and dark mode.
 */
export const StylingHook: Story = {
  name: 'Styling hook: --ui-ripple-color',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      ['secondary', 'tertiary', 'error']
        .map((role) =>
          caption(
            `--mat-sys-${role}`,
            surface(`style="--ui-ripple-color: var(--mat-sys-${role});"`, role),
          ),
        )
        .join(''),
    ),
  }),
};

/**
 * `exportAs: "uiRipple"` hands back the directive; `matRipple` hands back
 * Material’s own instance — the escape hatch for anything not wrapped here. Here
 * the buttons drive `launch()` and `fadeOutAll()` on it directly.
 */
export const EscapeHatch: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; align-items: flex-start;">
        <div
          uiRipple
          #ripple="uiRipple"
          color="accent"
          role="button"
          tabindex="0"
          aria-label="Programmatic ripple surface"
          style="
            display: grid; place-items: center; width: 16rem; height: 7rem;
            border-radius: var(--mat-sys-corner-medium);
            background: var(--mat-sys-surface-container);
            color: var(--mat-sys-on-surface); font: var(--mat-sys-body-medium);
            outline: 1px solid var(--mat-sys-outline-variant);
          "
        >Launched from the buttons below</div>
        <div style="display: flex; gap: 0.75rem;">
          <button type="button" (click)="ripple.matRipple.launch(112, 56, { centered: true })">Launch()</button>
          <button type="button" (click)="ripple.matRipple.fadeOutAll()">fadeOutAll()</button>
        </div>
      </div>`,
  }),
};

// --- The full matrix --------------------------------------------------------

/**
 * Every colour on a real surface. This is the reference grid: if a tint does not
 * hold together against the surface here, the theme is wrong.
 */
export const AllConfigurations: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: row(
      COLORS.map((color) =>
        caption(color, surface(`color="${color}"`, color)),
      ).join(''),
    ),
  }),
};
