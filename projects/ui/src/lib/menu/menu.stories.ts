import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenuItem } from '@angular/material/menu';
import { provideRouter, RouterLink, withDisabledInitialNavigation } from '@angular/router';
import {
  applicationConfig,
  moduleMetadata,
  type Meta,
  type StoryObj,
} from '@storybook/angular-vite';
import { expect, waitFor } from 'storybook/test';

import { Button } from '../button/button';
import { Menu, MenuItemDef, type UiMenuItem } from './menu';
import { MenuTrigger } from './menu-trigger';

/** The everyday shape: a row of actions on a record. */
const ITEMS: UiMenuItem<string>[] = [
  { label: 'Edit', value: 'edit' },
  { label: 'Duplicate', value: 'duplicate' },
  { label: 'Archive', value: 'archive' },
];

const ICON_ITEMS: UiMenuItem<string>[] = [
  { label: 'Edit', icon: 'edit', value: 'edit' },
  { label: 'Duplicate', icon: 'content_copy', value: 'duplicate' },
  { label: 'Archive', icon: 'archive', value: 'archive' },
];

const DISABLED_ITEMS: UiMenuItem<string>[] = [
  { label: 'Edit', icon: 'edit', value: 'edit' },
  { label: 'Duplicate', icon: 'content_copy', value: 'duplicate' },
  { label: 'Delete', icon: 'delete', disabled: true, value: 'delete' },
];

const NESTED_ITEMS: UiMenuItem<string>[] = [
  { label: 'Edit', icon: 'edit', value: 'edit' },
  {
    label: 'Share',
    icon: 'share',
    value: 'share',
    children: [
      { label: 'Email', icon: 'mail', value: 'share.email' },
      { label: 'Copy link', icon: 'link', value: 'share.link' },
      {
        label: 'Social',
        icon: 'public',
        value: 'share.social',
        children: [
          { label: 'Bluesky', value: 'share.social.bluesky' },
          { label: 'Mastodon', value: 'share.social.mastodon' },
          { label: 'LinkedIn', disabled: true, value: 'share.social.linkedin' },
        ],
      },
    ],
  },
  { label: 'Delete', icon: 'delete', value: 'delete' },
];

/**
 * A trigger that opens its own menu as soon as it renders.
 *
 * A menu's panel lives in the CDK overlay and does not exist until it is opened,
 * which makes it the one thing a static story cannot show: the page would be a row
 * of buttons and a note saying "trust us". So the stories that document what a menu
 * *looks* like open it on render — the same shape `ui-tooltip`'s stories use, and
 * for the same reason. The stories that document *behaviour* leave it alone, so
 * clicking does what a consumer will actually see.
 *
 * `hasBackdrop` is off here only because these are open at once on the Docs page: a
 * backdrop is a full-page click-catcher, and half a dozen of them stacked over the
 * documentation would swallow every click on it. A real menu keeps Material's
 * backdrop — that is what closes it when you click away — which is why this is a
 * demo component rather than a default.
 *
 * The bottom padding is real too: the panel is ~150px tall and is drawn *over* the
 * page, so without room reserved for it each story would cover the next one down.
 */
@Component({
  selector: 'ui-menu-open-demo',
  imports: [MatButton, Button, Menu, MenuTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [style.padding-bottom]="reserve()">
      <button
        matButton
        uiButton
        variant="outlined"
        [uiMenuTriggerFor]="menu"
        #trigger="uiMenuTrigger"
      >
        {{ label() }}
      </button>
      <ui-menu
        #menu
        [items]="items()"
        [panelClass]="panelClass()"
        [hasBackdrop]="false"
        [aria-label]="ariaLabel()"
        (itemSelected)="itemSelected.emit($event)"
      />
    </div>
  `,
})
class MenuOpenDemo {
  readonly items = input.required<readonly UiMenuItem<string>[]>();
  readonly label = input('Actions');
  readonly ariaLabel = input('Record actions');
  readonly panelClass = input<string | readonly string[]>([]);
  readonly reserve = input('13rem');
  readonly itemSelected = output<UiMenuItem<string>>();

  private readonly trigger = viewChild.required<MenuTrigger<string>>('trigger');

  constructor() {
    // After the first render, so the `viewChild` has resolved, `<ui-menu>` has a
    // panel, and Material has a laid-out host box to anchor the overlay to.
    afterNextRender(() => this.trigger().matMenuTrigger.openMenu());
  }
}

/**
 * `uiMenuItem`: each item rendered as a template rather than a label, with the item
 * as its context. Its own component because a projected `<ng-template>` cannot be
 * passed through an input.
 */
@Component({
  selector: 'ui-menu-template-demo',
  imports: [MatButton, Button, Menu, MenuTrigger, MenuItemDef],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="padding-bottom: 13rem;">
      <button
        matButton
        uiButton
        variant="outlined"
        [uiMenuTriggerFor]="menu"
        #trigger="uiMenuTrigger"
      >
        Edit
      </button>
      <ui-menu #menu [items]="items" [hasBackdrop]="false" aria-label="Edit actions">
        <ng-template uiMenuItem let-item>
          <span style="display: flex; gap: 2rem; justify-content: space-between; width: 100%;">
            <span>{{ item.label }}</span>
            <span style="color: var(--mat-sys-on-surface-variant);">{{ item.value.shortcut }}</span>
          </span>
        </ng-template>
      </ui-menu>
    </div>
  `,
})
class MenuTemplateDemo {
  readonly items: UiMenuItem<{ id: string; shortcut: string }>[] = [
    { label: 'Cut', value: { id: 'cut', shortcut: '⌘X' } },
    { label: 'Copy', value: { id: 'copy', shortcut: '⌘C' } },
    { label: 'Paste', value: { id: 'paste', shortcut: '⌘V' } },
  ];

  private readonly trigger =
    viewChild.required<MenuTrigger<{ id: string; shortcut: string }>>('trigger');

  constructor() {
    afterNextRender(() => this.trigger().matMenuTrigger.openMenu());
  }
}

/** Projected content in the same panel as the items — a divider and a routerLink. */
@Component({
  selector: 'ui-menu-projection-demo',
  imports: [MatButton, Button, MatIcon, MatMenuItem, MatDivider, RouterLink, Menu, MenuTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="padding-bottom: 16rem;">
      <button
        matButton
        uiButton
        variant="outlined"
        [uiMenuTriggerFor]="menu"
        #trigger="uiMenuTrigger"
      >
        Account
      </button>
      <ui-menu #menu [items]="items" [hasBackdrop]="false" aria-label="Account">
        <mat-divider />
        <a mat-menu-item routerLink="/settings">
          <mat-icon>settings</mat-icon>
          Settings (routerLink)
        </a>
      </ui-menu>
    </div>
  `,
})
class MenuProjectionDemo {
  readonly items = ICON_ITEMS;

  private readonly trigger = viewChild.required<MenuTrigger<string>>('trigger');

  constructor() {
    afterNextRender(() => this.trigger().matMenuTrigger.openMenu());
  }
}

/**
 * The `--ui-menu-*` hooks, set the way a consumer sets them: an ordinary rule in a
 * global stylesheet — here, a component with `ViewEncapsulation.None` — reached
 * through `panelClass`, which is *added* to `.ui-menu` rather than replacing it, so
 * the theme underneath survives.
 */
@Component({
  selector: 'ui-menu-styled-demo',
  imports: [MenuOpenDemo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: `
    .demo-danger-menu {
      /* Pointed at theme roles rather than literals, so this still follows the
         palette and dark mode — and on-error-container is the role M3 guarantees
         is legible on error-container. */
      --ui-menu-container-color: var(--mat-sys-error-container);
      --ui-menu-item-label-color: var(--mat-sys-on-error-container);
      --ui-menu-item-icon-color: var(--mat-sys-on-error-container);
      --ui-menu-shape: var(--mat-sys-corner-large);
      --ui-menu-min-width: 16rem;
    }
  `,
  template: `
    <ui-menu-open-demo
      [items]="items"
      label="Danger zone"
      ariaLabel="Danger zone"
      panelClass="demo-danger-menu"
    />
  `,
})
class MenuStyledDemo {
  readonly items: UiMenuItem<string>[] = [
    { label: 'Revoke every session', icon: 'logout', value: 'revoke' },
    { label: 'Delete this record', icon: 'delete_forever', value: 'delete' },
  ];
}

const meta: Meta<Menu<string>> = {
  title: 'Components/Menu',
  component: Menu,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        Menu,
        MenuTrigger,
        MenuItemDef,
        Button,
        MatButton,
        MatIconButton,
        MatIcon,
        MatMenuItem,
        MatDivider,
        RouterLink,
        MenuOpenDemo,
        MenuTemplateDemo,
        MenuProjectionDemo,
        MenuStyledDemo,
      ],
    }),
    // `routerLink` needs a Router to resolve an href against, and
    // `withDisabledInitialNavigation()` keeps that Router from navigating against
    // the Storybook iframe's own URL — which no route matches. See the same note in
    // `button.stories.ts`, where the failure mode is spelled out.
    applicationConfig({
      providers: [provideRouter([], withDisabledInitialNavigation())],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-menu` is a themed Material menu: a `<mat-menu>` over the items given to it, opened by',
          '`uiMenuTriggerFor` on a button of your own.',
          '',
          'The **items are an input** rather than projected content, because `itemSelected` is only',
          'implementable if the component knows what each item is — a projected `<button mat-menu-item>`',
          'would carry your own `(click)`, and the wrapper would be earning nothing. That is not a',
          'string-only API: `value` holds an object, a `uiMenuItem` template renders an item as anything',
          'a template can express, and projected content is still accepted for a divider or a',
          '`routerLink` item (see the stories below).',
          '',
          '**Sub-menus are in scope** and are data too — give an item `children`. Nesting is unbounded,',
          'and every level is a real `<mat-menu>`, so the arrow, the hover-to-open and the keyboard are',
          "Material's. A choice at any depth arrives on the one `itemSelected`.",
          '',
          'Colours resolve from the shared M3 theme in `src/styles/_theme.scss` via Material system',
          'tokens, so every story below renders the exact palette a consuming app gets — including in',
          'dark mode, which the theme follows from the OS preference.',
          '',
          "A menu's panel is drawn in the CDK overlay and does not exist until it opens, so the stories",
          'that show one open it on render (and drop the backdrop, which would otherwise cover this',
          'page). The stories under **Behaviour** leave it alone — click those.',
        ].join(' '),
      },
    },
  },
};

export default meta;
type Story = StoryObj<Menu<string>>;

// --- What it looks like (opened on render) ---------------------------------

/** The default menu: a list of labels, opened from a button. */
export const Default: Story = {
  render: () => ({ template: `<ui-menu-open-demo [items]="items" />`, props: { items: ITEMS } }),
};

/**
 * An `icon` on an item renders a Material icon into `MatMenuItem`'s own leading
 * slot, so it gets Material's size, spacing and `on-surface-variant` colour. It is
 * decoration — the label names the item — so it is `aria-hidden` and never
 * announced twice.
 */
export const WithIcons: Story = {
  name: 'With icons',
  render: () => ({
    template: `<ui-menu-open-demo [items]="items" />`,
    props: { items: ICON_ITEMS },
  }),
};

/**
 * A disabled item stays in the panel, marked `aria-disabled` and skipped by the
 * arrow keys — the menu does not change shape when one action turns off. It cannot
 * be clicked, and `itemSelected` never fires for it.
 */
export const WithADisabledItem: Story = {
  name: 'With a disabled item',
  render: () => ({
    template: `<ui-menu-open-demo [items]="items" />`,
    props: { items: DISABLED_ITEMS },
  }),
};

/**
 * Sub-menus are data: an item with `children` becomes a branch that opens a nested
 * panel instead of emitting. Nesting is unbounded — `Share ▸ Social ▸ Bluesky` is
 * three levels — and a choice at any depth arrives on the same `itemSelected`.
 *
 * The root is open here; hover or arrow-key into **Share** to walk down it.
 */
export const WithSubMenus: Story = {
  name: 'With sub-menus',
  render: () => ({
    template: `<ui-menu-open-demo [items]="items" />`,
    props: { items: NESTED_ITEMS },
  }),
};

/**
 * A `uiMenuItem` template renders each item as anything a template can express —
 * here a label with its keyboard shortcut — with the item as its context (rule 7).
 * The template applies at every level of a nested menu, and selection still works
 * through it.
 */
export const CustomItemTemplate: Story = {
  name: 'Custom item template',
  render: () => ({ template: `<ui-menu-template-demo />` }),
};

/**
 * `items` is the API, but it is not a dead end: projected content lands in the same
 * Material panel, after the items, in the same roving focus ring. So a
 * `<mat-divider>` and an `<a mat-menu-item routerLink>` — which no `items` array
 * can express — need no fork of the component and no `::ng-deep` (rules 2 and 7).
 */
export const ProjectedContent: Story = {
  name: 'Projected content',
  render: () => ({ template: `<ui-menu-projection-demo />` }),
};

/**
 * The panel renders into the CDK overlay, far from `<ui-menu>` — so it is styled
 * with a `panelClass` and the `--ui-menu-*` hooks, which is Material's own answer
 * and needs no `::ng-deep` (rules 2 and 6). `.ui-menu` is *added* to, never
 * replaced, so the theme underneath survives, and the classes carry onto sub-panels
 * too.
 *
 * Every value points at a `--mat-sys-*` role rather than a literal, so it survives a
 * palette change and dark mode.
 */
export const Restyled: Story = {
  render: () => ({ template: `<ui-menu-styled-demo />` }),
};

// --- Behaviour (click these) -----------------------------------------------

/**
 * The trigger is a directive on *your* element, so an icon button works with no
 * wrapper — and `aria-label` lands on the `<button>` a screen reader actually
 * reads, which is exactly what an icon-only trigger needs.
 */
export const IconButtonTrigger: Story = {
  name: 'Trigger: icon button',
  // The whole lifecycle, asserted in a real browser: click the trigger, the
  // panel opens into the CDK overlay with its named items in it, and a click on
  // the backdrop closes it — Material's own dismissal, which restores focus to
  // the trigger. The panel does not exist in the page until it opens, so this is
  // what turns "opens → content present → dismisses" from prose into a check
  // that fails loudly.
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;

    (canvasElement.querySelector('button') as HTMLButtonElement).click();

    // The panel names itself from the trigger's `aria-label`, and its items are
    // the content the story is documenting; the role binding lands a tick after
    // the element, so the whole assertion retries.
    const panel = await waitFor(() => {
      const el = doc.querySelector<HTMLElement>('.mat-mdc-menu-panel');
      expect(el).toBeTruthy();
      expect(el!.getAttribute('role')).toBe('menu');
      expect(el!.getAttribute('aria-label')).toBe('Record actions');
      expect(el!.querySelectorAll('.mat-mdc-menu-item').length).toBe(ICON_ITEMS.length);
      expect(el!.textContent).toContain('Edit');
      return el!;
    });

    (doc.querySelector('.cdk-overlay-backdrop') as HTMLElement).click();

    await waitFor(() => expect(panel.isConnected).toBe(false));
  },
  render: () => ({
    template: `
      <button matIconButton [uiMenuTriggerFor]="menu" aria-label="Record actions">
        <mat-icon>more_vert</mat-icon>
      </button>
      <ui-menu #menu [items]="items" aria-label="Record actions" />
    `,
    props: { items: ICON_ITEMS },
  }),
};

/**
 * `xPosition` and `yPosition` are Material's own, forwarded. Note `overlapTrigger`
 * defaults to `false` here where Material's own default is `true`: a menu that
 * covers the button you just pointed at hides it.
 */
export const Positions: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; padding: 6rem 0;">
        <button matButton uiButton variant="outlined" [uiMenuTriggerFor]="belowAfter">below / after</button>
        <ui-menu #belowAfter [items]="items" aria-label="Below after" />

        <button matButton uiButton variant="outlined" [uiMenuTriggerFor]="belowBefore">below / before</button>
        <ui-menu #belowBefore [items]="items" xPosition="before" aria-label="Below before" />

        <button matButton uiButton variant="outlined" [uiMenuTriggerFor]="aboveAfter">above / after</button>
        <ui-menu #aboveAfter [items]="items" yPosition="above" aria-label="Above after" />

        <button matButton uiButton variant="outlined" [uiMenuTriggerFor]="overlapping">overlapping</button>
        <ui-menu #overlapping [items]="items" overlapTrigger aria-label="Overlapping" />
      </div>
    `,
    props: { items: ITEMS },
  }),
};

/**
 * `exportAs: 'uiMenuTrigger'` hands back the directive and `.matMenuTrigger` hands
 * back Material's own instance — the escape hatch for anything not wrapped here,
 * such as opening the menu from elsewhere (rule 4). `#menu="uiMenu"` and
 * `.matMenu()` do the same for the panel.
 */
export const EscapeHatch: Story = {
  name: 'Escape hatch: exportAs',
  render: () => ({
    template: `
      <div style="display: flex; gap: 1rem; align-items: center;">
        <button matButton uiButton variant="outlined" [uiMenuTriggerFor]="menu" #trigger="uiMenuTrigger">
          Actions
        </button>
        <button matButton uiButton variant="text" (click)="trigger.matMenuTrigger.openMenu()">
          Open it from over here
        </button>
      </div>
      <ui-menu #menu [items]="items" aria-label="Record actions" />
    `,
    props: { items: ITEMS },
  }),
};
