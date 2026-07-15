import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Button } from '../button/button';
import { Toolbar, ToolbarEnd, ToolbarStart, ToolbarTitle, type UiToolbarColor } from './toolbar';

const COLORS: UiToolbarColor[] = ['surface', 'primary'];

/**
 * A toolbar spans the thing it heads, so every story renders it over a page-like
 * box rather than loose on the canvas: its width, and where its actions land, are
 * only legible against a container that has an edge.
 */
const page = (content: string, body = '') => `
  <div style="max-width: 48rem; border: 1px solid var(--mat-sys-outline-variant);
              border-radius: var(--mat-sys-corner-medium); overflow: hidden;">
    ${content}
    ${
      body &&
      `<div style="padding: 1.5rem; font: var(--mat-sys-body-medium);
                   color: var(--mat-sys-on-surface); background: var(--mat-sys-surface);">${body}</div>`
    }
  </div>`;

const iconButton = (icon: string, label: string, slot: string) =>
  `<button matIconButton ${slot} aria-label="${label}"><mat-icon>${icon}</mat-icon></button>`;

const meta: Meta<Toolbar> = {
  title: 'Components/Toolbar',
  component: Toolbar,
  tags: ['autodocs'],
  decorators: [
    // The slot markers, plus the Material buttons and icons that go in them: a
    // toolbar's actions are the reason its slots exist.
    moduleMetadata({
      imports: [
        Toolbar,
        ToolbarStart,
        ToolbarTitle,
        ToolbarEnd,
        MatIcon,
        MatIconButton,
        MatButton,
        Button,
      ],
    }),
  ],
  args: {
    color: 'surface',
    dense: false,
  },
  argTypes: {
    color: { control: 'inline-radio', options: COLORS },
    dense: { control: 'boolean' },
    matToolbar: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-toolbar` is the shared theme applied to Angular Material’s `<mat-toolbar>`. Like',
          '`ui-card` and unlike `uiButton`, it is a **component** rather than a directive: a toolbar',
          'owns composition — a leading slot, a title, and trailing actions — and there is no native',
          'element to decorate. HTML has no `<toolbar>`.',
          '',
          '### Slots',
          '',
          'Mark the leading and trailing elements with `uiToolbarStart` / `uiToolbarEnd`; everything',
          'else lands in the title slot in the middle, so the everyday',
          '`<ui-toolbar><h1>Orders</h1></ui-toolbar>` needs no marker. The title takes all the space',
          'the other two do not, which is what holds the trailing actions against the far end — even',
          'on a bar with no title. A slot with nothing in it renders nothing.',
          '',
          '### Colour',
          '',
          '`color` is `surface` *(default)* or `primary`. Material’s own `color` input is an M2-only',
          'API that does nothing under an M3 theme, so this one resolves through',
          '`mat.toolbar-overrides()` against the theme’s system tokens instead — there is not a',
          'literal colour in this component’s stylesheet, and every story below renders the exact',
          'palette a consuming app gets, dark mode included.',
          '',
          'M3 puts a top app bar on `surface` and keeps the bold role for emphasis, which is why that',
          'is the default. On `primary`, the title, any text or outlined button and the icon buttons',
          'all take `on-primary` — so nothing on the bar is left on a role it cannot be read against.',
          '',
          '### Density',
          '',
          '`dense` drops the bar to M3’s next height down (56px, and 48px below Material’s 599px',
          'breakpoint) for a bar that is not the page’s top app bar — a bar over a table, a panel’s',
          'own header. It moves that toolbar only; the fleet’s density stays `_theme.scss`’s.',
          '',
          '### Accessibility',
          '',
          'No role is imposed — Material’s own choice for `<mat-toolbar>`, and the honest one: what',
          'the bar *is* depends on what you put in it, and `role="toolbar"` promises arrow-key',
          'navigation over a roving `tabindex` that this component cannot implement for controls it',
          'does not own. So say what it is at the call site: wrap a page’s top app bar in a',
          '`<header>`, or put `role="toolbar"` and an `aria-label` on a genuine group of controls and',
          'own the focus contract. The host is a real element, so both — and `id`, `data-*` and the',
          'rest — reach it with no forwarding. Give every icon button an `aria-label`: an icon is not',
          'a name.',
          '',
          '### Restyling',
          '',
          '`--ui-toolbar-background-color`, `--ui-toolbar-text-color`, `--ui-toolbar-icon-color`,',
          '`--ui-toolbar-height`, `--ui-toolbar-mobile-height`, `--ui-toolbar-padding` and',
          '`--ui-toolbar-gap` are read off `<ui-toolbar>`, so restyling is an ordinary CSS rule on an',
          'ordinary selector — no `::ng-deep`, no `!important`.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: page(`
      <ui-toolbar ${argsToTemplate(args)}>
        ${iconButton('menu', 'Open the menu', 'uiToolbarStart')}
        <h1>Orders</h1>
        ${iconButton('search', 'Search', 'uiToolbarEnd')}
      </ui-toolbar>`),
  }),
};

export default meta;
type Story = StoryObj<Toolbar>;

/** The default: a leading menu button, a title, and one trailing action, on `surface`. */
export const Default: Story = {};

// --- The everyday shapes ---------------------------------------------------

/**
 * The simplest bar there is: a title and nothing else. No slot marker is needed —
 * unmarked content lands in the title.
 */
export const TitleOnly: Story = {
  name: 'Title only',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: page(
      `<ui-toolbar><h1>Orders</h1></ui-toolbar>`,
      'A page header with nothing on it but its name.',
    ),
  }),
};

/**
 * The M3 top app bar: a leading navigation button, the title, and the actions at
 * the far end. The title region takes the space between them, so the actions stay
 * against the edge however long the title is.
 */
export const WithActions: Story = {
  name: 'With actions',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: page(
      `<ui-toolbar>
        ${iconButton('menu', 'Open the menu', 'uiToolbarStart')}
        <h1>Orders</h1>
        ${iconButton('search', 'Search', 'uiToolbarEnd')}
        ${iconButton('more_vert', 'More actions', 'uiToolbarEnd')}
      </ui-toolbar>`,
      '42 orders, 3 awaiting payment.',
    ),
  }),
};

/**
 * The actions do not have to be icons — a text button is what M3 shows for an
 * action whose icon would be a guess. Material points an unthemed text or outlined
 * button on a toolbar at the bar's own text colour, so it stays legible on either
 * colour with nothing set here.
 */
export const TextActions: Story = {
  name: 'With actions: text buttons',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: page(`
      <ui-toolbar>
        ${iconButton('arrow_back', 'Back to orders', 'uiToolbarStart')}
        <h1>Draft order</h1>
        <button matButton uiButton variant="text" uiToolbarEnd>Discard</button>
        <button matButton uiButton variant="text" uiToolbarEnd>Save</button>
      </ui-toolbar>`),
  }),
};

/**
 * With no title, the middle region is empty space rather than a gap in the middle
 * of the row — so the actions still sit against the far end.
 */
export const ActionsOnly: Story = {
  name: 'Actions only, no title',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: page(`
      <ui-toolbar>
        ${iconButton('close', 'Clear the selection', 'uiToolbarStart')}
        ${iconButton('delete', 'Delete', 'uiToolbarEnd')}
        ${iconButton('archive', 'Archive', 'uiToolbarEnd')}
      </ui-toolbar>`),
  }),
};

// --- Accessibility ---------------------------------------------------------

/**
 * A page's top app bar is a *banner*, not a group of controls, so it goes in a
 * `<header>` — which is a landmark a screen reader user can jump to, and needs no
 * ARIA at all. The heading in the title slot names the page.
 *
 * This is why no role is imposed on `<ui-toolbar>`: the bar cannot know which of
 * these two it is, and the consumer always does.
 */
export const AsBanner: Story = {
  name: 'a11y: a top app bar is a header',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: page(
      `<header>
        <ui-toolbar color="primary">
          ${iconButton('menu', 'Open the menu', 'uiToolbarStart')}
          <h1>Orders</h1>
          ${iconButton('search', 'Search', 'uiToolbarEnd')}
        </ui-toolbar>
      </header>`,
      'The bar above is the page’s banner landmark.',
    ),
  }),
};

/**
 * A genuine toolbar — a group of controls acting on something — takes
 * `role="toolbar"` and a name saying what it acts *on*. The attributes land on the
 * host, because it is a real element (rule 3).
 *
 * Take the role deliberately: ARIA's toolbar pattern expects the arrow keys to
 * move between the controls over a roving `tabindex`, which is yours to own. Left
 * off, every control is simply its own tab stop — which is fine, and is why this
 * is not the default.
 */
export const AsToolbar: Story = {
  name: 'a11y: a real toolbar of controls',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: page(
      `<ui-toolbar dense role="toolbar" aria-label="Selected orders">
        <h1>3 selected</h1>
        ${iconButton('delete', 'Delete', 'uiToolbarEnd')}
        ${iconButton('archive', 'Archive', 'uiToolbarEnd')}
      </ui-toolbar>`,
      'The rows the controls above act on.',
    ),
  }),
};

// --- Slots -----------------------------------------------------------------

/**
 * The leading slot is projected content, so it is not limited to a button: a logo,
 * an avatar, anything.
 */
export const LeadingContent: Story = {
  name: 'Leading slot: anything, not a button',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: page(`
      <ui-toolbar color="primary">
        <span uiToolbarStart style="display: inline-flex; align-items: center; justify-content: center;
                                    width: 2rem; height: 2rem; border-radius: var(--mat-sys-corner-full);
                                    background: var(--mat-sys-on-primary); color: var(--mat-sys-primary);
                                    font: var(--mat-sys-label-large);">W</span>
        <h1>Warehouse</h1>
        <button matButton uiButton variant="text" uiToolbarEnd>Sign out</button>
      </ui-toolbar>`),
  }),
};

/**
 * A title written after the trailing action still lands in the title slot when it
 * is marked with `uiToolbarTitle`: projection follows the component's template, not
 * the consumer's source order.
 */
export const ExplicitTitle: Story = {
  name: 'uiToolbarTitle: explicit marker',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: page(`
      <ui-toolbar>
        ${iconButton('search', 'Search', 'uiToolbarEnd')}
        <h1 uiToolbarTitle>Orders</h1>
      </ui-toolbar>`),
  }),
};

/**
 * A title longer than the bar is clipped rather than pushing the actions off the
 * end — Material's row does not wrap.
 */
export const LongTitle: Story = {
  name: 'A title longer than the bar',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: page(`
      <ui-toolbar>
        ${iconButton('arrow_back', 'Back to orders', 'uiToolbarStart')}
        <h1>Order 4213 for Acme Logistics, placed on 2 March and packed in one box</h1>
        ${iconButton('more_vert', 'More actions', 'uiToolbarEnd')}
      </ui-toolbar>`),
  }),
};

// --- Colour ----------------------------------------------------------------

/**
 * The default. M3 puts a top app bar on the page's `surface` rather than on a
 * colour, and keeps the bold role for emphasis.
 */
export const ColorSurface: Story = {
  name: 'color: surface (default)',
  args: { color: 'surface' },
};

/** The theme's `primary` / `on-primary` pair — a branded band across the top of the page. */
export const ColorPrimary: Story = {
  name: 'color: primary',
  args: { color: 'primary' },
};

/**
 * Both colours side by side, each carrying the same actions. Neither is a colour
 * decision made here: they are the theme's `surface` and `primary` roles, so both
 * follow a palette change and dark mode — and on each, the title, the text button
 * and the icon buttons take the role that is legible against it.
 */
export const Colors: Story = {
  name: 'Both colours',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 2rem; max-width: 48rem;">
        ${COLORS.map(
          (color) => `
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${color}</span>
            <ui-toolbar color="${color}">
              ${iconButton('menu', 'Open the menu', 'uiToolbarStart')}
              <h1>Orders</h1>
              <button matButton uiButton variant="text" uiToolbarEnd>Sign out</button>
              ${iconButton('more_vert', 'More actions', 'uiToolbarEnd')}
            </ui-toolbar>
          </div>`,
        ).join('')}
      </div>`,
  }),
};

// --- Density ---------------------------------------------------------------

/**
 * `dense` drops the bar to M3's next height down — for a bar that is not the
 * page's top app bar, where the full 64px is a band of empty space.
 */
export const Dense: Story = {
  name: 'dense',
  args: { dense: true },
};

/**
 * Both heights side by side. `dense` moves this toolbar only: the fleet's density
 * stays `_theme.scss`'s decision, so a dense bar over a table does not turn every
 * other bar in the app short.
 */
export const Densities: Story = {
  name: 'dense: against the default height',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 2rem; max-width: 48rem;">
        ${[
          ['64px — the default', ''],
          ['56px — dense', 'dense'],
        ]
          .map(
            ([caption, attr]) => `
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${caption}</span>
            <ui-toolbar color="primary" ${attr}>
              ${iconButton('menu', 'Open the menu', 'uiToolbarStart')}
              <h1>Orders</h1>
              ${iconButton('search', 'Search', 'uiToolbarEnd')}
            </ui-toolbar>
          </div>`,
          )
          .join('')}
      </div>`,
  }),
};

/**
 * What `dense` is for: a bar heading a region rather than the page. The shorter
 * height is what keeps it reading as part of the panel below it.
 */
export const DenseInPanel: Story = {
  name: 'dense: heading a panel',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: page(
      `<ui-toolbar dense>
        <h1>3 selected</h1>
        ${iconButton('delete', 'Delete', 'uiToolbarEnd')}
        ${iconButton('archive', 'Archive', 'uiToolbarEnd')}
      </ui-toolbar>`,
      'The rows the actions above apply to.',
    ),
  }),
};

// --- Styling hooks and escape hatches --------------------------------------

/**
 * `--ui-toolbar-background-color` and `--ui-toolbar-text-color` are read off
 * `<ui-toolbar>`, so a bar off the two named roles is an ordinary CSS rule — no
 * `::ng-deep`. Point them at another `--mat-sys-*` pair rather than at literals, so
 * they survive a palette change and dark mode; the icons follow the text colour on
 * their own.
 */
export const CustomColour: Story = {
  name: 'Styling hook: colours',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 2rem; max-width: 48rem;">
        ${['tertiary', 'error', 'surface-container-high']
          .map((role) => {
            const on = role.startsWith('surface') ? 'on-surface' : `on-${role}`;
            return `
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">--mat-sys-${role}</span>
              <ui-toolbar
               
                style="--ui-toolbar-background-color: var(--mat-sys-${role});
                       --ui-toolbar-text-color: var(--mat-sys-${on});">
                ${iconButton('menu', 'Open the menu', 'uiToolbarStart')}
                <h1>Orders</h1>
                ${iconButton('search', 'Search', 'uiToolbarEnd')}
              </ui-toolbar>
            </div>`;
          })
          .join('')}
      </div>`,
  }),
};

/**
 * The box metrics are hooks too: a roomier bar is a declaration rather than a
 * reach into Material's internals.
 */
export const CustomMetrics: Story = {
  name: 'Styling hook: height, padding and gap',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: page(`
      <ui-toolbar
        color="primary"
       
        style="--ui-toolbar-height: 5rem; --ui-toolbar-padding: 2rem; --ui-toolbar-gap: 1.5rem;">
        ${iconButton('menu', 'Open the menu', 'uiToolbarStart')}
        <h1>Orders</h1>
        ${iconButton('search', 'Search', 'uiToolbarEnd')}
        ${iconButton('more_vert', 'More actions', 'uiToolbarEnd')}
      </ui-toolbar>`),
  }),
};

/**
 * `exportAs: 'uiToolbar'` hands back the component, and `matToolbar()` hands back
 * Material's own instance — the escape hatch for anything not wrapped here.
 */
export const EscapeHatch: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { dense: false },
    template: page(
      `<ui-toolbar #bar="uiToolbar" [dense]="dense">
        <h1>Orders</h1>
        <button matButton uiButton variant="text" uiToolbarEnd (click)="dense = !dense">
          {{ bar.dense() ? 'Taller' : 'Shorter' }}
        </button>
      </ui-toolbar>`,
      'The component is `bar`; Material’s own toolbar instance is `bar.matToolbar()`.',
    ),
  }),
};
