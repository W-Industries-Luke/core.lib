import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';

import { Menu, MenuItemDef, type UiMenuItem } from './menu';
import { MenuTrigger } from './menu-trigger';

const ITEMS: UiMenuItem<string>[] = [
  { label: 'Edit', icon: 'edit', value: 'edit' },
  { label: 'Duplicate', value: 'duplicate' },
  { label: 'Delete', icon: 'delete', disabled: true, value: 'delete' },
];

@Component({
  imports: [Menu, MenuTrigger],
  template: `
    <button [uiMenuTriggerFor]="ref" #trigger="uiMenuTrigger">Actions</button>
    <ui-menu
      #ref="uiMenu"
      [items]="items()"
      [panelClass]="panelClass()"
      [xPosition]="xPosition()"
      [overlapTrigger]="overlapTrigger()"
      (itemSelected)="selected.push($event)"
      (closed)="closeReasons.push($event)"
      aria-label="Order actions"
    />
  `,
})
class TestHost {
  readonly items = signal<UiMenuItem<string>[]>(ITEMS);
  readonly panelClass = signal<string | readonly string[]>([]);
  readonly xPosition = signal<'before' | 'after'>('after');
  readonly overlapTrigger = signal(false);
  readonly selected: UiMenuItem<string>[] = [];
  readonly closeReasons: (string | void)[] = [];
  readonly ref = viewChild.required<Menu<string>>('ref');
  readonly trigger = viewChild.required<MenuTrigger<string>>('trigger');
}

/**
 * Material's own switch for the menu's enter/exit animation.
 *
 * Without it the panel is only settled once an `animationstart` that never arrives
 * in jsdom has fired, so assertions about what is on screen would be racing
 * Material's fallback timer — and a closed menu would linger in the overlay through
 * its exit animation. This is Material's public token rather than
 * `provideNoopAnimations()`, which is the same thing plus an animations module.
 */
const noAnimations = { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } };

describe('Menu', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  /**
   * The menu renders into the CDK overlay at the end of `<body>`, not into the
   * fixture — so every query here goes through the document rather than
   * `fixture.nativeElement`. That is the whole nature of the component, and the
   * reason its theming lives in `styles/_menu.scss` rather than a `menu.scss`.
   */
  const queryAll = (selector: string): HTMLElement[] =>
    Array.from(document.querySelectorAll(selector));

  const query = (selector: string): HTMLElement | null => document.querySelector(selector);

  /** The `role="menu"` panels currently in the overlay, outermost first. */
  const panels = (): HTMLElement[] => queryAll('.mat-mdc-menu-panel');

  /** The `role="menuitem"` buttons of one panel, in order. */
  const itemsIn = (panel: HTMLElement): HTMLElement[] =>
    Array.from(panel.querySelectorAll('.mat-mdc-menu-item'));

  /** The items of the outermost open panel. */
  const openItems = (): HTMLElement[] => (panels()[0] ? itemsIn(panels()[0]) : []);

  /**
   * The label of each item in the outermost panel.
   *
   * Read from Material's own `.mat-mdc-menu-item-text` span rather than the
   * button's `textContent`, because an icon ligature is text too: a
   * `<mat-icon>edit</mat-icon>` in Material's icon slot would otherwise make the
   * Edit item read as `edit Edit`.
   */
  const labels = (): string[] =>
    openItems().map(
      (item) => item.querySelector('.mat-mdc-menu-item-text')?.textContent?.trim() ?? '',
    );

  const triggerButton = (): HTMLElement => fixture.nativeElement.querySelector('button');

  const open = async () => {
    triggerButton().click();
    await fixture.whenStable();
  };

  const clickItem = async (index: number) => {
    openItems()[index].click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [noAnimations] });
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('renders Material’s menu rather than markup of its own', async () => {
    expect(host.ref().matMenu()).toBeInstanceOf(MatMenu);

    await open();

    expect(panels().length).toBe(1);
    expect(panels()[0].getAttribute('role')).toBe('menu');
    expect(panels()[0].classList).toContain('mat-mdc-menu-panel');
  });

  it('renders nothing where <ui-menu> is written until it is opened', () => {
    expect(fixture.nativeElement.querySelector('ui-menu').textContent.trim()).toBe('');
    expect(panels().length).toBe(0);
  });

  describe('items', () => {
    it('renders one Material menu item per item, labelled and in order', async () => {
      await open();

      expect(labels()).toEqual(['Edit', 'Duplicate', 'Delete']);
      expect(openItems()[0].getAttribute('role')).toBe('menuitem');
    });

    // The icon has to land in Material's own icon slot, or it is just text before
    // the label with none of Material's size or spacing.
    it('renders an icon into Material’s icon slot, hidden from assistive tech', async () => {
      await open();
      const icon = openItems()[0].querySelector('mat-icon')!;

      expect(icon).not.toBeNull();
      expect(icon.textContent).toBe('edit');
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      // Material's slot is `<ng-content select="mat-icon, …">`, which renders
      // before the label's `.mat-mdc-menu-item-text` span.
      expect(icon.nextElementSibling!.classList).toContain('mat-mdc-menu-item-text');
    });

    it('leaves an item without an icon without one', async () => {
      await open();

      expect(openItems()[1].querySelector('mat-icon')).toBeNull();
    });

    it('picks up items that change after the first render', async () => {
      host.items.set([{ label: 'Archive', value: 'archive' }]);
      await open();

      expect(labels()).toEqual(['Archive']);
    });

    it('renders an empty panel for no items rather than throwing', async () => {
      host.items.set([]);
      await open();

      expect(openItems()).toEqual([]);
      expect(panels().length).toBe(1);
    });

    // Material finds its items with a *content* query, which follows a template's
    // declaration site — so an item rendered from a template declared outside
    // `<mat-menu>` looks perfectly right and is invisible to Material: no arrow
    // keys, no typeahead, no focus on open. Nothing else here would notice, so this
    // asserts the wiring rather than the markup.
    it('registers its items with Material, so the keyboard works', async () => {
      await open();
      const menu = host.ref().matMenu()!;

      expect(menu._allItems.map((item) => item.getLabel().trim())).toEqual([
        'Edit',
        'Duplicate',
        'Delete',
      ]);
    });

    it('focuses the first item when opened by keyboard', async () => {
      await open();
      host.ref().matMenu()!.focusFirstItem('keyboard');
      await fixture.whenStable();

      expect(document.activeElement).toBe(openItems()[0]);
    });
  });

  describe('itemSelected', () => {
    it('emits the chosen item, and closes the menu', async () => {
      await open();
      await clickItem(0);

      expect(host.selected).toEqual([ITEMS[0]]);
      expect(panels().length).toBe(0);
    });

    it('emits the whole item, so the value and the label both survive', async () => {
      await open();
      await clickItem(1);

      expect(host.selected[0].value).toBe('duplicate');
      expect(host.selected[0].label).toBe('Duplicate');
    });

    it('does not emit for a disabled item', async () => {
      await open();
      await clickItem(2);

      expect(host.selected).toEqual([]);
    });

    it('emits nothing merely for opening the menu', async () => {
      await open();

      expect(host.selected).toEqual([]);
    });

    // An object value is the case the `value: T` generic exists for: the item comes
    // back by identity, rather than marshalled through an id and a lookup.
    it('carries an object value back by identity', async () => {
      const target = { id: 7 };
      const seen: UiMenuItem<{ id: number }>[] = [];

      @Component({
        imports: [Menu, MenuTrigger],
        template: `
          <button [uiMenuTriggerFor]="menu">Open</button>
          <ui-menu #menu [items]="items" (itemSelected)="seen.push($event)" />
        `,
      })
      class ObjectHost {
        readonly items: UiMenuItem<{ id: number }>[] = [{ label: 'Seven', value: target }];
        readonly seen = seen;
      }

      const f = TestBed.createComponent(ObjectHost);
      await f.whenStable();
      f.nativeElement.querySelector('button').click();
      await f.whenStable();
      openItems()[0].click();
      await f.whenStable();

      expect(seen[0].value).toBe(target);
    });
  });

  describe('disabled items', () => {
    // Material marks it rather than removing it: the menu does not change shape
    // when one item turns off, and a screen reader still announces it is there.
    it('marks the item disabled and keeps it in the panel', async () => {
      await open();

      expect(labels()).toEqual(['Edit', 'Duplicate', 'Delete']);
      expect(openItems()[2].getAttribute('aria-disabled')).toBe('true');
      expect(openItems()[0].getAttribute('aria-disabled')).toBe('false');
    });

    it('takes it out of the tab order', async () => {
      await open();

      expect(openItems()[2].getAttribute('tabindex')).toBe('-1');
      expect(openItems()[0].getAttribute('tabindex')).toBe('0');
    });

    it('re-enables it when the input flips back', async () => {
      host.items.set(ITEMS.map((item) => ({ ...item, disabled: false })));
      await open();
      await clickItem(2);

      expect(host.selected.map((item) => item.value)).toEqual(['delete']);
    });
  });

  describe('sub-menus', () => {
    const NESTED: UiMenuItem<string>[] = [
      { label: 'Edit', value: 'edit' },
      {
        label: 'Share',
        icon: 'share',
        value: 'share',
        children: [
          { label: 'Email', value: 'share.email' },
          {
            label: 'Social',
            value: 'share.social',
            children: [{ label: 'Bluesky', value: 'share.social.bluesky' }],
          },
        ],
      },
    ];

    beforeEach(async () => {
      host.items.set(NESTED);
      await open();
    });

    it('marks a branch as a submenu trigger rather than a plain item', () => {
      expect(openItems()[1].classList).toContain('mat-mdc-menu-item-submenu-trigger');
      expect(openItems()[0].classList).not.toContain('mat-mdc-menu-item-submenu-trigger');
      expect(openItems()[1].getAttribute('aria-haspopup')).toBe('menu');
    });

    it('opens a nested panel from a branch instead of emitting', async () => {
      await clickItem(1);

      expect(host.selected).toEqual([]);
      expect(panels().length).toBe(2);
      expect(itemsIn(panels()[1]).map((item) => item.textContent?.trim())).toEqual([
        'Email',
        'Social',
      ]);
    });

    it('emits a leaf chosen from a sub-menu through the same output', async () => {
      await clickItem(1);
      itemsIn(panels()[1])[0].click();
      await fixture.whenStable();

      expect(host.selected.map((item) => item.value)).toEqual(['share.email']);
    });

    // The recursion is the point: nesting is unbounded, and every level is a real
    // `<mat-menu>` rather than a flattened list with indentation.
    it('nests without a depth limit, and emits from the deepest level', async () => {
      await clickItem(1);
      itemsIn(panels()[1])[1].click();
      await fixture.whenStable();

      expect(panels().length).toBe(3);

      itemsIn(panels()[2])[0].click();
      await fixture.whenStable();

      expect(host.selected.map((item) => item.value)).toEqual(['share.social.bluesky']);
    });

    it('renders a branch’s own icon and label', () => {
      expect(openItems()[1].querySelector('mat-icon')!.textContent).toBe('share');
      expect(openItems()[1].textContent).toContain('Share');
    });
  });

  describe('projected content', () => {
    @Component({
      imports: [Menu, MenuTrigger, MatMenuItem],
      template: `
        <button [uiMenuTriggerFor]="menu">Open</button>
        <ui-menu #menu [items]="items">
          <button mat-menu-item class="projected">Settings</button>
        </ui-menu>
      `,
    })
    class ProjectionHost {
      readonly items: UiMenuItem<string>[] = [{ label: 'Edit', value: 'edit' }];
    }

    // Rule 7: `items` is the API, but a divider or a routerLink item must not need
    // a fork of the component — projected content lands in the same Material panel,
    // in the same roving focus ring.
    it('renders projected content into Material’s panel, after the items', async () => {
      const f = TestBed.createComponent(ProjectionHost);
      await f.whenStable();
      f.nativeElement.querySelector('button').click();
      await f.whenStable();

      expect(labels()).toEqual(['Edit', 'Settings']);
      expect(query('.projected')!.closest('.mat-mdc-menu-panel')).toBe(panels()[0]);
    });
  });

  describe('custom item templates', () => {
    @Component({
      imports: [Menu, MenuTrigger, MenuItemDef],
      template: `
        <button [uiMenuTriggerFor]="menu">Open</button>
        <ui-menu #menu [items]="items" (itemSelected)="seen.push($event)">
          <ng-template uiMenuItem let-item>
            <span class="custom">{{ item.label }}·{{ item.value }}</span>
          </ng-template>
        </ui-menu>
      `,
    })
    class TemplateHost {
      readonly items: UiMenuItem<string>[] = [
        { label: 'Edit', icon: 'edit', value: 'e' },
        { label: 'Share', value: 's', children: [{ label: 'Email', value: 's.e' }] },
      ];
      readonly seen: UiMenuItem<string>[] = [];
    }

    let f: ComponentFixture<TemplateHost>;

    beforeEach(async () => {
      f = TestBed.createComponent(TemplateHost);
      await f.whenStable();
      f.nativeElement.querySelector('button').click();
      await f.whenStable();
    });

    // Rule 7: an item's inside is a template rather than a string-only input.
    it('renders the template inside Material’s menu item, in place of icon and label', () => {
      const custom = query('.custom')!;

      expect(custom).not.toBeNull();
      expect(custom.closest('.mat-mdc-menu-item')).toBe(openItems()[0]);
      expect(custom.textContent).toBe('Edit·e');
      // The template replaces the default rendering rather than adding to it.
      expect(openItems()[0].querySelector('mat-icon')).toBeNull();
    });

    it('applies at every level, branches included', async () => {
      expect(openItems()[1].textContent).toContain('Share·s');

      openItems()[1].click();
      await f.whenStable();

      expect(itemsIn(panels()[1])[0].textContent).toContain('Email·s.e');
    });

    it('leaves selection working through the template', async () => {
      openItems()[0].click();
      await f.whenStable();

      expect(f.componentInstance.seen.map((item) => item.value)).toEqual(['e']);
    });
  });

  describe('closed', () => {
    it('reports Material’s reason for a click', async () => {
      await open();
      await clickItem(0);

      expect(host.closeReasons).toEqual(['click']);
    });

    it('reports a programmatic close', async () => {
      await open();
      host.trigger().matMenuTrigger.closeMenu();
      await fixture.whenStable();

      expect(host.closeReasons).toEqual([undefined]);
      expect(panels().length).toBe(0);
    });

    it('does not report anything merely for opening', async () => {
      await open();

      expect(host.closeReasons).toEqual([]);
    });
  });

  describe('the trigger', () => {
    // Rule 1: the trigger decorates the consumer's own element, so their button is
    // the button the browser gets — and Material anchors the overlay to it.
    it('opens the menu from the consumer’s own native button', async () => {
      expect(triggerButton().tagName).toBe('BUTTON');

      await open();

      expect(host.trigger().matMenuTrigger.menuOpen).toBe(true);
    });

    // Rule 2: this is why `uiMenuTriggerFor` takes the `<ui-menu>` rather than
    // making every consumer reach through it for `matMenu()`.
    it('wires the ui-menu’s own MatMenu into Material’s trigger', () => {
      expect(host.trigger().matMenuTrigger.menu).toBe(host.ref().matMenu());
    });

    it('toggles closed again', async () => {
      await open();
      triggerButton().click();
      await fixture.whenStable();

      expect(panels().length).toBe(0);
    });

    it('carries Material’s ARIA wiring on the trigger', async () => {
      expect(triggerButton().getAttribute('aria-haspopup')).toBe('menu');
      expect(triggerButton().getAttribute('aria-expanded')).toBe('false');

      await open();

      expect(triggerButton().getAttribute('aria-expanded')).toBe('true');
      expect(triggerButton().getAttribute('aria-controls')).toBe(panels()[0].id);
    });

    // A `null` menu is how a conditional trigger is written, without an `@if`
    // around the consumer's own button.
    it('opens nothing when pointed at null', async () => {
      @Component({
        imports: [MenuTrigger],
        template: `<button [uiMenuTriggerFor]="null">Open</button>`,
      })
      class NullHost {}

      const f = TestBed.createComponent(NullHost);
      await f.whenStable();
      f.nativeElement.querySelector('button').click();
      await f.whenStable();

      expect(panels().length).toBe(0);
    });

    it('follows the ui-menu it is pointed at when that changes', async () => {
      @Component({
        imports: [Menu, MenuTrigger],
        template: `
          <button [uiMenuTriggerFor]="useFirst() ? first : second">Open</button>
          <ui-menu #first [items]="firstItems" />
          <ui-menu #second [items]="secondItems" />
        `,
      })
      class SwapHost {
        readonly useFirst = signal(true);
        readonly firstItems: UiMenuItem<number>[] = [{ label: 'First', value: 1 }];
        readonly secondItems: UiMenuItem<number>[] = [{ label: 'Second', value: 2 }];
      }

      const f = TestBed.createComponent(SwapHost);
      await f.whenStable();
      f.componentInstance.useFirst.set(false);
      await f.whenStable();
      f.nativeElement.querySelector('button').click();
      await f.whenStable();

      expect(labels()).toEqual(['Second']);
    });
  });

  describe('accessibility', () => {
    it('names Material’s menu panel from aria-label', async () => {
      await open();

      expect(panels()[0].getAttribute('aria-label')).toBe('Order actions');
    });

    // An ARIA name on `<ui-menu>` itself would be a real violation rather than a
    // harmless leftover: the host has no role and renders nothing, which is exactly
    // what axe's `aria-prohibited-attr` fails (and `npm run test:a11y` did, before
    // the host binding that takes these back off).
    it('leaves no ARIA name behind on the ui-menu host, which has no role', async () => {
      await open();
      const uiMenu: HTMLElement = fixture.nativeElement.querySelector('ui-menu');

      expect(uiMenu.hasAttribute('aria-label')).toBe(false);
      expect(uiMenu.hasAttribute('role')).toBe(false);
      // …and the name is on the element that does have the role.
      expect(panels()[0].getAttribute('aria-label')).toBe('Order actions');
    });

    it('names a sub-menu’s panel after the branch item it hangs off', async () => {
      host.items.set([
        { label: 'Share', value: 'share', children: [{ label: 'Email', value: 'email' }] },
      ]);
      await open();
      await clickItem(0);

      expect(panels()[1].getAttribute('aria-label')).toBe('Share');
    });

    it('names it from aria-labelledby instead when given one', async () => {
      @Component({
        imports: [Menu, MenuTrigger],
        template: `
          <h2 id="heading">Order actions</h2>
          <button [uiMenuTriggerFor]="menu">Open</button>
          <ui-menu #menu aria-labelledby="heading" [items]="items" />
        `,
      })
      class LabelledbyHost {
        readonly items: UiMenuItem<string>[] = [{ label: 'Edit', value: 'edit' }];
      }

      const f = TestBed.createComponent(LabelledbyHost);
      await f.whenStable();
      f.nativeElement.querySelector('button').click();
      await f.whenStable();

      expect(panels()[0].getAttribute('aria-labelledby')).toBe('heading');
    });

    it('leaves no empty aria-label behind when unnamed', async () => {
      @Component({
        imports: [Menu, MenuTrigger],
        template: `
          <button [uiMenuTriggerFor]="menu">Open</button>
          <ui-menu #menu [items]="items" />
        `,
      })
      class UnnamedHost {
        readonly items: UiMenuItem<string>[] = [{ label: 'Edit', value: 'edit' }];
      }

      const f = TestBed.createComponent(UnnamedHost);
      await f.whenStable();
      f.nativeElement.querySelector('button').click();
      await f.whenStable();

      expect(panels()[0].hasAttribute('aria-label')).toBe(false);
      expect(panels()[0].hasAttribute('aria-labelledby')).toBe(false);
    });
  });

  describe('Material’s API, passed through', () => {
    it('forwards xPosition', async () => {
      host.xPosition.set('before');
      await open();

      expect(host.ref().matMenu()!.xPosition).toBe('before');
    });

    // The one departure from Material's own defaults: a menu that covers the button
    // a user just pointed at hides it.
    it('does not overlap the trigger by default, unlike Material', async () => {
      await open();

      expect(host.ref().overlapTrigger()).toBe(false);
      expect(host.ref().matMenu()!.overlapTrigger).toBe(false);
    });

    it('overlaps when asked to', async () => {
      host.overlapTrigger.set(true);
      await open();

      expect(host.ref().matMenu()!.overlapTrigger).toBe(true);
    });

    // Rule 4: Material's own instances are the way out of anything not wrapped here.
    it('exposes the component and Material’s instances via exportAs', () => {
      expect(host.ref()).toBeInstanceOf(Menu);
      expect(host.ref().matMenu()).toBeInstanceOf(MatMenu);
      expect(host.trigger()).toBeInstanceOf(MenuTrigger);
      expect(host.trigger().matMenuTrigger).toBeInstanceOf(MatMenuTrigger);
    });
  });

  // The colours are Material's, resolved from the shared theme's tokens. This
  // component only re-points those tokens at hooks whose defaults are the tokens
  // Material would have used anyway — see `styles/_menu.scss`.
  describe('theming', () => {
    // The panel is in the overlay, so `.ui-menu` on it is what gives a consumer
    // something to select from a global stylesheet — without it, restyling a menu
    // would mean `::ng-deep` (rule 2).
    it('puts .ui-menu on Material’s own panel', async () => {
      await open();

      expect(panels()[0].classList).toContain('ui-menu');
      expect(panels()[0].classList).toContain('mat-mdc-menu-panel');
    });

    it('adds a consumer’s panelClass rather than replacing .ui-menu', async () => {
      host.panelClass.set('danger-menu');
      await open();

      expect(panels()[0].classList).toContain('ui-menu');
      expect(panels()[0].classList).toContain('danger-menu');
    });

    it('accepts several panel classes', async () => {
      host.panelClass.set(['danger-menu', 'wide-menu']);
      await open();

      expect(panels()[0].classList).toContain('ui-menu');
      expect(panels()[0].classList).toContain('danger-menu');
      expect(panels()[0].classList).toContain('wide-menu');
    });

    // A sub-panel is a separate overlay panel, so it needs the classes too — or a
    // consumer's restyle would stop at the first level.
    it('carries the same classes onto nested sub-panels', async () => {
      host.panelClass.set('danger-menu');
      host.items.set([
        { label: 'Share', value: 'share', children: [{ label: 'Email', value: 'email' }] },
      ]);
      await open();
      await clickItem(0);

      expect(panels()[1].classList).toContain('ui-menu');
      expect(panels()[1].classList).toContain('danger-menu');
    });
  });
});
