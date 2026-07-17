import { MatButton } from '@angular/material/button';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, waitFor } from 'storybook/test';

import { Button } from '../button/button';
import { Sidenav, SidenavDrawer, type UiSidenavMode } from './sidenav';

const MODES: UiSidenavMode[] = ['side', 'over', 'push'];

/**
 * The drawer's content: the navigation a sidenav almost always holds.
 *
 * The links take the theme's own roles rather than the UA's link blue, so they are
 * legible on the drawer's surface in light and dark alike — and every story below
 * is an axe assertion that says so.
 *
 * Each nav is named, and named *differently* per instance: a story with three
 * sidenavs in it has three `<nav>` landmarks, and landmarks that share a name are
 * landmarks a screen-reader user cannot tell apart.
 */
const drawer = (label: string, items = ['Orders', 'Inventory', 'Shipments', 'Reports']) => `
  <nav uiSidenavDrawer aria-label="${label}" style="display: flex; flex-direction: column; gap: 0.25rem; padding: 0.75rem;">
    ${items
      .map(
        (item) => `
      <a href="#" style="
        padding: 0.625rem 1rem;
        border-radius: var(--mat-sys-corner-full);
        color: var(--mat-sys-on-surface-variant);
        text-decoration: none;
        font: var(--mat-sys-label-large);">${item}</a>`,
      )
      .join('')}
  </nav>`;

/** The main content beside it — unmarked, because the page is what needs no marker. */
const main = (text: string) => `
  <div style="padding: 1.5rem; font: var(--mat-sys-body-medium); color: var(--mat-sys-on-background);">
    ${text}
  </div>`;

/**
 * Stories render in a box with an edge and, crucially, a *height*: Material's
 * container takes the height it is given, so a sidenav in a frame with none is a
 * drawer with none — which looks like a drawer that failed to render. An app shell
 * gets this from `height: 100dvh`; a story gets it from here.
 */
const frame = (content: string, height = '18rem') => `
  <div style="
    height: ${height};
    border: 1px solid var(--mat-sys-outline-variant);
    border-radius: var(--mat-sys-corner-medium);
    overflow: hidden;">${content}</div>`;

/** Fills the frame, and trims M3's 360px phone-sized sheet to a rail that fits one. */
const fit = 'height: 100%; --ui-sidenav-width: 11rem;';

/**
 * Switches off axe's `aria-hidden-focus` — for the stories that render an *open
 * modal* drawer, and only those.
 *
 * When Material enables a drawer's focus trap, CDK wraps it in two sentinels:
 * `<div tabindex="0" aria-hidden="true" class="cdk-focus-trap-anchor">`. axe sees a
 * focusable element hidden from assistive tech and flags it — but those two *are*
 * the focus trap: they exist to catch Tab as it leaves the drawer and send it back
 * to the other end, so focus never rests on one, and a screen reader is right to
 * skip them. The thing axe is protecting against here is the thing they implement.
 *
 * This is CDK's markup, not this library's — there is nothing in `ui-sidenav` to
 * fix — and the only other route to a green story is to leave the drawer closed,
 * which is not a story about an open drawer. Every other rule stays on, and this
 * one stays on for every story whose drawer is `side` or shut.
 *
 * Note this is per-mode rather than per-story-name: `side` is Material's only
 * non-modal mode, so `over` *and* `push` both get a trap.
 */
const cdkFocusTrapAnchors = {
  a11y: { config: { rules: [{ id: 'aria-hidden-focus', enabled: false }] } },
};

const meta: Meta<Sidenav> = {
  title: 'Components/Sidenav',
  component: Sidenav,
  tags: ['autodocs'],
  decorators: [
    // Button (and the MatButton it decorates) is here for the stories that drive
    // the drawer: a menu button is what opens a sidenav in an app, so it is what
    // opens one here.
    moduleMetadata({ imports: [Sidenav, SidenavDrawer, MatButton, Button] }),
  ],
  args: {
    mode: 'side',
    opened: true,
    position: 'start',
    responsive: true,
    disableClose: false,
    fixedInViewport: false,
    hasBackdrop: null,
  },
  argTypes: {
    mode: { control: 'inline-radio', options: MODES },
    position: { control: 'inline-radio', options: ['start', 'end'] },
    opened: { control: 'boolean' },
    responsive: { control: 'boolean' },
    disableClose: { control: 'boolean' },
    fixedInViewport: { control: 'boolean' },
    hasBackdrop: { control: 'inline-radio', options: [null, true, false] },
    compactBreakpoint: { control: 'text' },
    // Read-only surfaces, documented in the table but not knobs.
    compact: { table: { disable: true } },
    matSidenav: { table: { disable: true } },
    matSidenavContainer: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-sidenav` is the shared theme applied to Angular Material’s',
          '`<mat-sidenav-container>`, plus the one rule every app was hand-rolling on top of it.',
          'Like `ui-toolbar` and unlike `uiButton`, it is a **component** rather than a directive: a',
          'sidenav owns composition — two regions whose relationship *is* the widget — so there is no',
          'native element to decorate.',
          '',
          '### The two regions',
          '',
          'Mark the drawer’s content with `uiSidenavDrawer`; everything else is the main content, so',
          'the everyday shell marks one element. The marked element is projected into Material’s own',
          '`<mat-sidenav>`, which puts it inside the focus trap and the drawer’s scroll container —',
          'your `<nav aria-label="Main">` stays the real element, attributes and all.',
          '',
          '### Sizing',
          '',
          'Material’s container takes the height it is given, so **give it one**: an app shell wants',
          '`ui-sidenav { height: 100dvh; }`. A container with no height is a drawer with no height,',
          'which reads as a drawer that did not render. Every story below sits in a frame for exactly',
          'this reason.',
          '',
          '### Responsive',
          '',
          '`mode` is what the layout asks for; `compact` is whether the screen can give it. Below',
          '`compactBreakpoint` *(CDK’s `Breakpoints.Handset` by default)* the drawer is forced to',
          '`over`, because a 360px column out of a 360px viewport leaves no content. Going compact',
          'also closes the drawer and re-opens it on the way back out, so the wide layout’s state',
          'survives a rotation — and it does that **through `opened`**, so a two-way binding is never',
          'left holding a `true` for a drawer that is shut. `[responsive]="false"` opts out.',
          '',
          '### State',
          '',
          '`[(opened)]` is a `model`, so the drawer is one piece of state rather than an input and an',
          'output that can disagree. A click on the scrim, `Escape`, and the compact switch all write',
          'back through it; `(openedChange)` alone is the read-only half. `open()`, `close()` and',
          '`toggle()` go through the same signal, so a menu button and a binding cannot drift apart.',
          '',
          '### Accessibility',
          '',
          'No role is imposed on the drawer — what it *is* depends on what you put in it, so say so:',
          '`<nav uiSidenavDrawer aria-label="Main">`. `side` is Material’s only non-modal mode: in',
          '`over` **and `push`** it traps focus in the drawer and closes it on `Escape`, and in `side`',
          'it does neither, because the content beside it is still in use.',
          '',
          '### Theming and restyling',
          '',
          'The drawer, the scrim, the slide and the content’s margin are `<mat-sidenav-container>`’s',
          'own, resolved from the M3 system tokens in `src/styles/_theme.scss` — there is not a',
          'literal colour in this component’s stylesheet, and every story below renders the exact',
          'palette a consuming app gets, dark mode included. `--ui-sidenav-width`,',
          '`--ui-sidenav-background-color`, `--ui-sidenav-text-color`,',
          '`--ui-sidenav-content-background-color`, `--ui-sidenav-content-text-color`,',
          '`--ui-sidenav-scrim-color`, `--ui-sidenav-shape`, `--ui-sidenav-divider-color` and',
          '`--ui-sidenav-elevation` restyle it from an ordinary CSS rule, with no `::ng-deep`.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: frame(`
      <ui-sidenav ${argsToTemplate(args)} style="${fit}">
        ${drawer('Main')}
        ${main('Order 4213, placed on 2 March.')}
      </ui-sidenav>`),
  }),
};

export default meta;
type Story = StoryObj<Sidenav>;

/** The default: a `side` drawer in its own column, open, with the content beside it. */
export const Default: Story = {};

/**
 * The everyday shape — a shell whose drawer is navigation and whose main content
 * has the button that opens it.
 */
export const Basic: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { open: true },
    template: frame(`
      <ui-sidenav [(opened)]="open" style="${fit}">
        ${drawer('Main')}
        <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; align-items: start;">
          <button matButton uiButton variant="filled" (click)="open = !open">
            {{ open ? 'Hide' : 'Show' }} navigation
          </button>
          <p style="margin: 0; font: var(--mat-sys-body-medium); color: var(--mat-sys-on-background);">
            Order 4213, placed on 2 March.
          </p>
        </div>
      </ui-sidenav>`),
  }),
};

// --- Modes -----------------------------------------------------------------

/**
 * `side` *(the default)* — the drawer takes its own column and the content shrinks
 * beside it. No scrim, so the content stays usable: this is a navigation rail, and
 * it is what a screen with room for one should show.
 */
export const ModeSide: Story = {
  name: 'mode: side (default)',
  args: { mode: 'side' },
};

/**
 * `over` — the drawer floats above the content behind a scrim. Material traps focus
 * in it and closes it on `Escape` or a click on the scrim, all of which write back
 * through `[(opened)]`. This is what a narrow screen gets, automatically.
 */
export const ModeOver: Story = {
  name: 'mode: over',
  args: { mode: 'over' },
  parameters: cdkFocusTrapAnchors,
};

/**
 * `push` — the drawer takes its own column and shoves the content sideways rather
 * than shrinking it. For content that cannot reflow — a fixed-width canvas, a wide
 * table you would rather scroll than squeeze.
 *
 * Note it is modal like `over`, not like `side`: Material scrims everything that is
 * not `side`, so this drawer takes a scrim and a focus trap even though it has a
 * column of its own. `[hasBackdrop]="false"` is the way out if you want the push
 * without the modality.
 */
export const ModePush: Story = {
  name: 'mode: push',
  args: { mode: 'push' },
  parameters: cdkFocusTrapAnchors,
};

/**
 * All three side by side, each open, so the difference is in what happens to the
 * *content*: `side` shrinks it, `push` shoves it, `over` covers it.
 */
export const Modes: Story = {
  parameters: { controls: { disable: true }, ...cdkFocusTrapAnchors },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        ${MODES.map(
          (mode) => `
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${mode}</span>
            ${frame(
              `<ui-sidenav mode="${mode}" opened [responsive]="false" style="${fit}">
                ${drawer(`Main, ${mode} drawer`, ['Orders', 'Inventory'])}
                ${main(`The content beside a <strong>${mode}</strong> drawer.`)}
              </ui-sidenav>`,
              '10rem',
            )}
          </div>`,
        ).join('')}
      </div>`,
  }),
};

// --- Opened ----------------------------------------------------------------

/** Open: the drawer is in place and the content has made room for it. */
export const Opened: Story = {
  name: 'opened: true',
  args: { opened: true },
};

/**
 * Closed: the drawer is out of the layout entirely — Material hides it rather than
 * leaving an empty column, so the content takes the whole width and nothing in the
 * drawer is focusable.
 */
export const Closed: Story = {
  name: 'opened: false',
  args: { opened: false },
};

/**
 * `[(opened)]` keeps a signal and the drawer in step in both directions: the button
 * writes to the same state a click on the scrim does, so the readout below can
 * never disagree with what is on screen.
 */
export const TwoWay: Story = {
  name: 'opened: two-way',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { open: false },
    template: frame(`
      <ui-sidenav mode="over" [(opened)]="open" style="${fit}">
        ${drawer('Main')}
        <div style="padding: 1.5rem; display: flex; gap: 1rem; align-items: center;">
          <button matButton uiButton variant="outlined" (click)="open = !open">Toggle</button>
          <span style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-background);">
            opened is <strong>{{ open }}</strong>.
          </span>
        </div>
      </ui-sidenav>`),
  }),
};

// --- Position --------------------------------------------------------------

/** The default: the drawer is anchored to the start edge — the left, in LTR. */
export const PositionStart: Story = {
  name: 'position: start (default)',
  args: { position: 'start' },
};

/**
 * `end` anchors it to the trailing edge instead — for a drawer that is not the
 * page's navigation but its detail panel, filters or help. It is direction-aware:
 * `end` is the right in LTR and the left in RTL, which is Material's, not ours.
 */
export const PositionEnd: Story = {
  name: 'position: end',
  args: { position: 'end' },
  render: (args) => ({
    props: args,
    template: frame(`
      <ui-sidenav ${argsToTemplate(args)} style="${fit}">
        ${drawer('Filters', ['Status', 'Date', 'Warehouse'])}
        ${main('Order 4213, placed on 2 March.')}
      </ui-sidenav>`),
  }),
};

// --- Responsive ------------------------------------------------------------

/**
 * The responsive rule, forced on so the story is deterministic:
 * `compactBreakpoint="(min-width: 0px)"` always matches, so this sidenav is always
 * compact. The `mode` is still `side` — but a compact layout has no room for a
 * column, so Material is handed `over` instead, and the drawer arrives as a sheet
 * behind a scrim.
 *
 * In an app you would leave `compactBreakpoint` alone and let CDK's
 * `Breakpoints.Handset` decide. **Narrow the browser window and watch the stories
 * above do this on their own.**
 */
export const Responsive: Story = {
  name: 'responsive: compact forces over',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { open: false },
    template: frame(`
      <ui-sidenav
        #nav="uiSidenav"
        mode="side"
        [(opened)]="open"
        compactBreakpoint="(min-width: 0px)"
        style="${fit}">
        ${drawer('Main')}
        <div style="padding: 1.5rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
          <button matButton uiButton variant="filled" (click)="nav.toggle()">Menu</button>
          <span style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-background);">
            compact is <strong>{{ nav.compact() }}</strong>, so mode is
            <strong>over</strong> rather than the <strong>side</strong> that was asked for.
          </span>
        </div>
      </ui-sidenav>`),
  }),
};

/**
 * `[responsive]="false"` opts out: the same always-matching breakpoint, and the
 * drawer keeps the `side` column it was given.
 *
 * For a sidenav that is not the page's shell — a panel inside a pane that is
 * already sized — where the viewport's width says nothing about the space this
 * drawer is in.
 */
export const ResponsiveOff: Story = {
  name: 'responsive: false',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-sidenav
        mode="side"
        opened
        [responsive]="false"
        compactBreakpoint="(min-width: 0px)"
        style="${fit}">
        ${drawer('Main')}
        ${main('Still a column, however narrow the screen gets.')}
      </ui-sidenav>`),
  }),
};

// --- Dismissal and the scrim -----------------------------------------------

/**
 * `disableClose` keeps an open drawer put: the scrim and `Escape` stop dismissing
 * it, so only the app can close it.
 *
 * Off by default, and worth leaving off — a drawer is usually navigation, and
 * navigation a user cannot dismiss is a trap. Reach for it when closing would lose
 * something, like a drawer holding an unsaved edit, and give the user a way out.
 */
export const DisableClose: Story = {
  name: 'disableClose',
  parameters: { controls: { disable: true }, ...cdkFocusTrapAnchors },
  render: () => ({
    props: { open: true },
    template: frame(`
      <ui-sidenav mode="over" [(opened)]="open" disableClose style="${fit}">
        <nav uiSidenavDrawer aria-label="Main" style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem; align-items: start;">
          <span style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface-variant);">
            The scrim and Escape will not close this.
          </span>
          <button matButton uiButton variant="filled" (click)="open = false">Done</button>
        </nav>
        ${main('Order 4213, placed on 2 March.')}
      </ui-sidenav>`),
  }),
};

/**
 * `hasBackdrop` overrides what the mode implies. `null` *(the default)* leaves
 * Material's own rule alone — a scrim for every mode that is not `side`; `true`
 * puts one behind a `side` drawer as well, for a column that should still read as
 * modal, and `false` takes it away from an `over` or `push` one.
 */
export const HasBackdrop: Story = {
  name: 'hasBackdrop: a scrim behind a side drawer',
  args: { mode: 'side', hasBackdrop: true },
  parameters: cdkFocusTrapAnchors,
};

// --- Styling hooks and escape hatches --------------------------------------

/**
 * `--ui-sidenav-width` is read off `<ui-sidenav>`, so retuning M3's 360px
 * phone-sized sheet into a desktop rail is an ordinary CSS rule on an ordinary
 * selector — no `::ng-deep`, no `!important`.
 */
export const CustomWidth: Story = {
  name: 'Styling hook: --ui-sidenav-width',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        ${['8rem', '11rem', '16rem']
          .map(
            (width) => `
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">--ui-sidenav-width: ${width}</span>
            ${frame(
              `<ui-sidenav opened [responsive]="false" style="height: 100%; --ui-sidenav-width: ${width};">
                ${drawer(`Main, ${width} wide`, ['Orders', 'Inventory'])}
                ${main('The content takes what is left.')}
              </ui-sidenav>`,
              '9rem',
            )}
          </div>`,
          )
          .join('')}
      </div>`,
  }),
};

/**
 * The colour hooks. Point them at another `--mat-sys-*` role rather than a literal,
 * so they survive a palette change and dark mode — this drawer is the theme's
 * `surface-container-high` with the role that is legible on it, and the scrim is
 * the theme's own `scrim`.
 */
export const CustomColours: Story = {
  name: 'Styling hook: colours',
  parameters: { controls: { disable: true }, ...cdkFocusTrapAnchors },
  render: () => ({
    template: frame(`
      <ui-sidenav
        mode="over"
        opened
        [responsive]="false"
        style="
          ${fit}
          --ui-sidenav-background-color: var(--mat-sys-surface-container-high);
          --ui-sidenav-text-color: var(--mat-sys-on-surface);
          --ui-sidenav-scrim-color: color-mix(in srgb, var(--mat-sys-scrim) 50%, transparent);">
        <nav uiSidenavDrawer aria-label="Main" style="display: flex; flex-direction: column; gap: 0.25rem; padding: 0.75rem;">
          ${['Orders', 'Inventory', 'Shipments']
            .map(
              (item) => `
            <a href="#" style="
              padding: 0.625rem 1rem;
              border-radius: var(--mat-sys-corner-full);
              color: var(--mat-sys-on-surface);
              text-decoration: none;
              font: var(--mat-sys-label-large);">${item}</a>`,
            )
            .join('')}
        </nav>
        ${main('Order 4213, placed on 2 March.')}
      </ui-sidenav>`),
  }),
};

/**
 * The drawer's shape, divider and elevation. M3's own values are the defaults —
 * unlike `uiButton`'s capsule, a drawer's shape is not a house-style decision the
 * fleet needs re-taken — so these hooks are here for the one shell that wants a
 * squared-off rail with a rule down its edge.
 */
export const CustomShape: Story = {
  name: 'Styling hook: shape, divider and elevation',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-sidenav
        opened
        [responsive]="false"
        style="
          ${fit}
          --ui-sidenav-shape: 0;
          --ui-sidenav-divider-color: var(--mat-sys-outline-variant);
          --ui-sidenav-elevation: var(--mat-sys-level2);">
        ${drawer('Main')}
        ${main('A squared-off rail, ruled off from the content.')}
      </ui-sidenav>`),
  }),
};

/**
 * `exportAs: 'uiSidenav'` hands back the component — `toggle()` is what a shell's
 * menu button calls, and it goes through `[(opened)]` so a binding follows. For
 * anything not wrapped here, `matSidenav()` and `matSidenavContainer()` hand back
 * Material's own instances (rule 4): opening with a `FocusOrigin` is one of them.
 */
export const EscapeHatch: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true }, ...cdkFocusTrapAnchors },
  // The whole lifecycle, asserted in a real browser: `toggle()` opens the `over`
  // drawer, its navigation is in place inside Material's own drawer, and a click
  // on the scrim closes it again — Material's own dismissal, written back through
  // `[(opened)]`. A `side` drawer is always in the layout, so `over` is the mode
  // where "opens → content present → dismisses" is a real transition to assert.
  play: async ({ canvasElement }) => {
    const drawer = canvasElement.querySelector('mat-sidenav') as HTMLElement;
    const toggle = Array.from(canvasElement.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Toggle',
    )!;

    toggle.click();

    await waitFor(() => expect(drawer.classList).toContain('mat-drawer-opened'));

    // The marked content lands inside Material's own drawer — the focus trap and
    // the scroll container — rather than in a box beside it.
    const nav = drawer.querySelector('nav[aria-label="Main"]');
    expect(nav).toBeTruthy();
    expect(nav!.textContent).toContain('Orders');

    // The scrim is Material's own dismissal for a modal drawer; it writes the
    // close back through the model, so the readout below cannot drift from it.
    (canvasElement.querySelector('.mat-drawer-backdrop') as HTMLElement).click();

    await waitFor(() => expect(drawer.classList).not.toContain('mat-drawer-opened'));
  },
  render: () => ({
    template: frame(`
      <ui-sidenav #nav="uiSidenav" mode="over" style="${fit}">
        ${drawer('Main')}
        <div style="padding: 1.5rem; display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          <button matButton uiButton variant="outlined" (click)="nav.toggle()">Toggle</button>
          <button matButton uiButton variant="outlined" (click)="nav.matSidenav().open('keyboard')">
            Open via Material
          </button>
          <span style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-background);">
            opened is <strong>{{ nav.opened() }}</strong>.
          </span>
        </div>
      </ui-sidenav>`),
  }),
};
