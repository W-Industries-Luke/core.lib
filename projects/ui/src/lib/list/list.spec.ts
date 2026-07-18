import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatList, MatSelectionList } from '@angular/material/list';
import { MatListHarness } from '@angular/material/list/testing';

import {
  List,
  ListItemAvatarDef,
  ListItemIconDef,
  ListItemLineDef,
  ListItemTitleDef,
  type UiListItem,
  type UiListSelectionChange,
} from './list';

/**
 * Material's own switch for its animations. Without it the rows' state-layer and ripple
 * transitions run on timers that no assertion here is waiting for. This is Material's
 * public token rather than `provideNoopAnimations()`, which is the same thing plus an
 * animations module.
 */
const noAnimations = { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } };

const ITEMS: readonly UiListItem<string>[] = [
  { label: 'Inbox', sublabel: '12 unread', icon: 'inbox', value: 'inbox' },
  { label: 'Starred', sublabel: 'Nothing yet', icon: 'star', value: 'starred' },
  { label: 'Archive', sublabel: '3 items', icon: 'archive', value: 'archive' },
];

@Component({
  imports: [List],
  template: `
    <ui-list
      #ref="uiList"
      [items]="items()"
      [selectable]="selectable()"
      [multiple]="multiple()"
      [disabled]="disabled()"
      [(value)]="value"
      (selectionChange)="changes.push($event)"
      aria-label="Mailboxes"
    />
  `,
})
class TestHost {
  readonly items = signal<readonly UiListItem<string>[]>(ITEMS);
  readonly selectable = signal(false);
  readonly multiple = signal(false);
  readonly disabled = signal(false);
  readonly value = signal<string | readonly string[] | null>(null);
  readonly changes: UiListSelectionChange<string>[] = [];
  readonly ref = viewChild.required<List<string>>('ref');
}

describe('List', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let loader: HarnessLoader;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  const queryAll = (selector: string): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll(selector));

  /** The rows on screen, whichever container is rendered. */
  const rows = (): HTMLElement[] => queryAll('mat-list-item, mat-list-option');

  // The `MatListHarness` speaks Material's *public* test surface — `getItems()`,
  // and each item's `getTitle()` / `getSecondaryText()` — instead of the MDC class
  // names (`.mat-mdc-list-item-title`, `.mat-mdc-list-item-line`) the old spec read
  // the rows' text off. Those classes are Material's internal markup; the harness is
  // how a static list's content is read here. Everything the harness *cannot* see —
  // a selectable list's `aria-selected`, the roles, the radio/checkbox indicators,
  // the leading icon/avatar slots, this component's own escape hatches — stays a DOM
  // assertion below. (Content reads run against the default, non-selectable list,
  // which is Material's plain `<mat-list>`.)

  /** The rows' first lines, in order — read through the list harness. */
  const titles = async (): Promise<string[]> => {
    const items = await (await loader.getHarness(MatListHarness)).getItems();
    return Promise.all(items.map((item) => item.getTitle()));
  };

  /** The rows' second lines, in order — only the rows that have one appear. */
  const lines = async (): Promise<string[]> => {
    const items = await (await loader.getHarness(MatListHarness)).getItems();
    const secondary = await Promise.all(items.map((item) => item.getSecondaryText()));
    return secondary.filter((text): text is string => text !== null);
  };

  /** Clicks a row the way a user does: on the element Material listens to. */
  const clickRow = async (index: number): Promise<void> => {
    const row = rows()[index];
    (row.querySelector<HTMLElement>('.mdc-list-item__content') ?? row).click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [noAnimations] });

    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  describe('items', () => {
    it('renders a row per item, with its label as the title', async () => {
      const items = await (await loader.getHarness(MatListHarness)).getItems();

      expect(items).toHaveLength(3);
      expect(await titles()).toEqual(['Inbox', 'Starred', 'Archive']);
    });

    it('renders a second line only for an item that has a sublabel', async () => {
      expect(await lines()).toEqual(['12 unread', 'Nothing yet', '3 items']);

      host.items.set([{ label: 'Inbox', value: 'inbox' }]);
      await fixture.whenStable();

      // A row with nothing to say on a second line does not get one — Material infers
      // the row's height from the lines it finds, so an empty line is a taller row.
      expect(await titles()).toEqual(['Inbox']);
      expect(await lines()).toEqual([]);
    });

    it('renders an empty sublabel as a line, so a list can be two-line throughout', async () => {
      host.items.set([
        { label: 'Inbox', sublabel: '12 unread', value: 'inbox' },
        { label: 'Drafts', sublabel: '', value: 'drafts' },
      ]);
      await fixture.whenStable();

      expect(await lines()).toHaveLength(2);
    });

    it("renders the item's icon name into Material's leading slot", () => {
      const icons = queryAll('mat-icon[matlistitemicon], mat-icon.mat-mdc-list-item-icon');
      expect(icons.map((icon) => icon.textContent!.trim())).toEqual(['inbox', 'star', 'archive']);
    });

    it('tracks rows by value, so re-ordering moves rows rather than rebuilding them', async () => {
      const before = rows()[0];

      host.items.set([ITEMS[1], ITEMS[0], ITEMS[2]]);
      await fixture.whenStable();

      expect(await titles()).toEqual(['Starred', 'Inbox', 'Archive']);
      // Row identity across a re-order is a DOM fact the harness abstracts away.
      expect(rows()[1]).toBe(before);
    });

    // A list with nothing in it is still a list: the container renders, and it
    // keeps its name, rather than collapsing to nothing on screen.
    it('renders the container with no rows when items is empty', async () => {
      host.items.set([]);
      await fixture.whenStable();

      expect(query('mat-list')).not.toBeNull();
      expect(rows()).toEqual([]);
      expect(query('mat-list')!.getAttribute('aria-label')).toBe('Mailboxes');
    });
  });

  describe('selectable', () => {
    it('renders a plain list of listitems by default — content, not a control', () => {
      expect(query('mat-list')).not.toBeNull();
      expect(query('mat-selection-list')).toBeNull();
      expect(query('mat-list')!.getAttribute('role')).toBe('list');
      expect(rows()[0].getAttribute('role')).toBe('listitem');
    });

    it('renders a selection list of options when set', async () => {
      host.selectable.set(true);
      await fixture.whenStable();

      expect(query('mat-selection-list')).not.toBeNull();
      expect(query('mat-list')).toBeNull();
      expect(query('mat-selection-list')!.getAttribute('role')).toBe('listbox');
      expect(rows()[0].getAttribute('role')).toBe('option');
    });

    it('emits nothing when a static list is clicked', async () => {
      await clickRow(0);

      expect(host.changes).toEqual([]);
      expect(host.value()).toBeNull();
    });
  });

  describe('single select', () => {
    beforeEach(async () => {
      host.selectable.set(true);
      await fixture.whenStable();
    });

    it('writes the clicked row’s value, unwrapped rather than in an array', async () => {
      await clickRow(1);

      expect(host.value()).toBe('starred');
    });

    it('replaces the selection rather than adding to it', async () => {
      await clickRow(1);
      await clickRow(2);

      expect(host.value()).toBe('archive');
      expect(rows()[1].getAttribute('aria-selected')).toBe('false');
      expect(rows()[2].getAttribute('aria-selected')).toBe('true');
    });

    it('gives each row a radio rather than a checkbox', () => {
      expect(query('mat-selection-list')!.querySelector('.mat-mdc-list-option-checkbox-before'))
        .toBeNull();
      expect(rows()[0].querySelector('.mdc-radio')).not.toBeNull();
    });

    it('marks the row for a value written from code', async () => {
      host.value.set('archive');
      await fixture.whenStable();

      expect(rows()[2].getAttribute('aria-selected')).toBe('true');
      expect(host.ref().selectedItems()).toEqual([ITEMS[2]]);
    });

    it('does not echo a value written from code back through selectionChange', async () => {
      host.value.set('archive');
      await fixture.whenStable();

      expect(host.changes).toEqual([]);
    });

    // Replacing a single-select value emits a change carrying the row the user
    // touched: `changed` is Material's own `options`, which for a single-select
    // click is the newly-chosen row (Material does not put the deselected one in
    // it). `value` and `selected` report the whole selection after the swap.
    it('reports the chosen row through selectionChange when the value is replaced', async () => {
      await clickRow(0);
      await clickRow(1);

      const last = host.changes.at(-1)!;
      expect(last.value).toBe('starred');
      expect(last.selected).toEqual([ITEMS[1]]);
      expect(last.changed).toEqual([ITEMS[1]]);
    });
  });

  describe('multiple', () => {
    beforeEach(async () => {
      host.selectable.set(true);
      host.multiple.set(true);
      await fixture.whenStable();
    });

    it('accumulates the clicked values into an array', async () => {
      await clickRow(0);
      await clickRow(2);

      expect(host.value()).toEqual(['inbox', 'archive']);
    });

    it('removes a value when its row is clicked again', async () => {
      await clickRow(0);
      await clickRow(2);
      await clickRow(0);

      expect(host.value()).toEqual(['archive']);
    });

    it('gives each row a checkbox rather than a radio', () => {
      expect(rows()[0].querySelector('.mdc-checkbox')).not.toBeNull();
      expect(rows()[0].querySelector('.mdc-radio')).toBeNull();
    });

    it('marks every row of a value written from code', async () => {
      host.value.set(['inbox', 'archive']);
      await fixture.whenStable();

      expect(rows().map((row) => row.getAttribute('aria-selected'))).toEqual([
        'true',
        'false',
        'true',
      ]);
    });

    // The reason the selection is pushed into Material wholesale rather than bound per
    // row: a per-row `[selected]` applies a multi-row value one row at a time, and
    // Material reports each intermediate state — which would clobber the value with the
    // first row alone.
    it('does not clobber a multi-row value while applying it', async () => {
      host.value.set(['inbox', 'starred', 'archive']);
      await fixture.whenStable();

      expect(host.value()).toEqual(['inbox', 'starred', 'archive']);
      expect(host.changes).toEqual([]);
    });

    it('keeps a row selected when an unrelated row is added', async () => {
      host.value.set(['archive']);
      await fixture.whenStable();

      host.items.set([...ITEMS, { label: 'Spam', value: 'spam' }]);
      await fixture.whenStable();

      expect(host.value()).toEqual(['archive']);
      expect(rows()[2].getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('togglePosition', () => {
    @Component({
      imports: [List],
      template: `
        <ui-list selectable multiple [items]="items" [togglePosition]="position()" aria-label="Mailboxes" />
      `,
    })
    class PositionHost {
      readonly items = ITEMS;
      readonly position = signal<'before' | 'after'>('after');
    }

    // Material only marks the *leading* position with a class; the default `after`
    // leaves the indicator trailing the text, so the leading slot is free for an
    // icon or avatar.
    it('trails the text by default, leaving the leading slot free', async () => {
      const f = TestBed.createComponent(PositionHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('.mat-mdc-list-option-checkbox-before')).toBeNull();
    });

    it('moves the checkbox to the leading edge for before', async () => {
      const f = TestBed.createComponent(PositionHost);
      f.componentInstance.position.set('before');
      await f.whenStable();

      expect(f.nativeElement.querySelector('.mat-mdc-list-option-checkbox-before')).not.toBeNull();
    });
  });

  describe('hideSingleSelectionIndicator', () => {
    @Component({
      imports: [List],
      template: `
        <ui-list
          selectable
          [items]="items"
          [value]="value"
          [hideSingleSelectionIndicator]="hidden()"
          aria-label="View"
        />
      `,
    })
    class HideHost {
      readonly items = ITEMS;
      readonly value = 'starred';
      readonly hidden = signal(false);
    }

    it('shows a radio on each row by default', async () => {
      const f = TestBed.createComponent(HideHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('mat-list-option .mdc-radio')).not.toBeNull();
    });

    // For a list of *views* rather than of choices, where a column of radios reads
    // as a form: the radio goes, and the chosen row is marked by its fill alone.
    it('drops the radio when hidden, leaving the chosen row still selected', async () => {
      const f = TestBed.createComponent(HideHost);
      f.componentInstance.hidden.set(true);
      await f.whenStable();

      expect(f.nativeElement.querySelector('.mdc-radio')).toBeNull();
      const options = f.nativeElement.querySelectorAll('mat-list-option');
      expect((options[1] as HTMLElement).getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('selectionChange', () => {
    beforeEach(async () => {
      host.selectable.set(true);
      host.multiple.set(true);
      await fixture.whenStable();
    });

    it('carries the value, the whole selection and only what changed', async () => {
      await clickRow(0);
      await clickRow(2);

      expect(host.changes).toHaveLength(2);
      expect(host.changes[1]).toEqual({
        value: ['inbox', 'archive'],
        selected: [ITEMS[0], ITEMS[2]],
        changed: [ITEMS[2]],
      });
    });

    it('emits after the value has been written, so a handler reads the new one', async () => {
      const seen: (string | readonly string[] | null)[] = [];
      const subscription = host.ref().selectionChange.subscribe(() => seen.push(host.value()));

      await clickRow(1);
      subscription.unsubscribe();

      expect(seen).toEqual([['starred']]);
    });
  });

  describe('disabled', () => {
    it('disables every row and takes the list out of the tab order', async () => {
      host.selectable.set(true);
      host.disabled.set(true);
      await fixture.whenStable();

      expect(rows().every((row) => row.getAttribute('aria-disabled') === 'true')).toBe(true);

      await clickRow(0);
      expect(host.value()).toBeNull();
    });

    it('disables one row while the rest stay selectable', async () => {
      host.selectable.set(true);
      host.items.set([ITEMS[0], { ...ITEMS[1], disabled: true }, ITEMS[2]]);
      await fixture.whenStable();

      expect(rows()[1].getAttribute('aria-disabled')).toBe('true');

      await clickRow(1);
      expect(host.value()).toBeNull();

      await clickRow(0);
      expect(host.value()).toBe('inbox');
    });
  });

  describe('compareWith', () => {
    interface Mailbox {
      id: string;
    }

    @Component({
      imports: [List],
      template: `
        <ui-list
          selectable
          [items]="items"
          [value]="value()"
          [compareWith]="byId"
          aria-label="Mailboxes"
        />
      `,
    })
    class CompareHost {
      readonly items: readonly UiListItem<Mailbox>[] = [
        { label: 'Inbox', value: { id: 'inbox' } },
        { label: 'Archive', value: { id: 'archive' } },
      ];
      readonly value = signal<Mailbox | null>(null);
      protected readonly byId = (a: Mailbox, b: Mailbox) => a?.id === b?.id;
    }

    // The point of the input: a value restored from a server response is a different
    // object to the one in `items`, and `===` would leave the list looking empty.
    it('marks the row for an equal-but-not-identical value', async () => {
      const f = TestBed.createComponent(CompareHost);
      await f.whenStable();

      f.componentInstance.value.set({ id: 'archive' });
      await f.whenStable();

      const options = Array.from(f.nativeElement.querySelectorAll('mat-list-option'));
      expect((options[1] as HTMLElement).getAttribute('aria-selected')).toBe('true');
      expect((options[0] as HTMLElement).getAttribute('aria-selected')).toBe('false');
    });
  });

  describe('forms', () => {
    @Component({
      imports: [List, ReactiveFormsModule],
      template: `<ui-list selectable multiple [items]="items" [formControl]="control" aria-label="Mailboxes" />`,
    })
    class FormHost {
      readonly items = ITEMS;
      readonly control = new FormControl<string[]>([]);
    }

    let f: ComponentFixture<FormHost>;

    const options = (): HTMLElement[] =>
      Array.from(f.nativeElement.querySelectorAll('mat-list-option'));

    beforeEach(async () => {
      f = TestBed.createComponent(FormHost);
      await f.whenStable();
    });

    it('renders the control’s value as the selection', async () => {
      f.componentInstance.control.setValue(['starred']);
      await f.whenStable();

      expect(options()[1].getAttribute('aria-selected')).toBe('true');
    });

    it('writes the control when a user picks a row', async () => {
      (options()[0].querySelector('.mdc-list-item__content') as HTMLElement).click();
      await f.whenStable();

      expect(f.componentInstance.control.value).toEqual(['inbox']);
    });

    // `reset()` writes `null`, and a multiple list's value is an array — always, so
    // that the rows are never matched against a value of the wrong shape.
    it('reads a reset to null as an empty selection rather than a broken one', async () => {
      f.componentInstance.control.setValue(['inbox']);
      await f.whenStable();

      f.componentInstance.control.reset();
      await f.whenStable();

      expect(options().every((o) => o.getAttribute('aria-selected') === 'false')).toBe(true);
    });

    // A form patched with a single value plainly means an array of one.
    it('reads a lone value written to a multiple list as an array of one', async () => {
      f.componentInstance.control.setValue('archive' as unknown as string[]);
      await f.whenStable();

      expect(options()[2].getAttribute('aria-selected')).toBe('true');
    });

    it('disables the list when the control is disabled', async () => {
      f.componentInstance.control.disable();
      await f.whenStable();

      expect(options().every((o) => o.getAttribute('aria-disabled') === 'true')).toBe(true);
    });

    it('reports touched when focus leaves the list', async () => {
      expect(f.componentInstance.control.touched).toBe(false);

      f.nativeElement
        .querySelector('mat-selection-list')!
        .dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      await f.whenStable();

      expect(f.componentInstance.control.touched).toBe(true);
    });
  });

  describe('slots', () => {
    @Component({
      imports: [List, ListItemAvatarDef, ListItemIconDef, ListItemTitleDef, ListItemLineDef],
      template: `
        <ui-list [selectable]="selectable()" [items]="items" [value]="value()" aria-label="People">
          @if (withAvatar()) {
            <ng-template uiListItemAvatar let-item>
              <img class="avatar" [src]="'/' + item.value + '.png'" alt="" />
            </ng-template>
          }
          @if (withIcon()) {
            <ng-template uiListItemIcon let-item let-selected="selected">
              <span class="icon" [class.on]="selected">{{ item.value }}</span>
            </ng-template>
          }
          @if (withTitle()) {
            <ng-template uiListItemTitle let-item let-index="index">
              <b class="title">{{ index }}: {{ item.label }}</b>
            </ng-template>
          }
          @if (withLine()) {
            <ng-template uiListItemLine let-item>
              <i class="line">{{ item.sublabel }}!</i>
            </ng-template>
          }
        </ui-list>
      `,
    })
    class SlotHost {
      readonly items = ITEMS;
      readonly selectable = signal(false);
      readonly value = signal<string | null>(null);
      readonly withAvatar = signal(false);
      readonly withIcon = signal(false);
      readonly withTitle = signal(false);
      readonly withLine = signal(false);
    }

    let f: ComponentFixture<SlotHost>;

    beforeEach(async () => {
      f = TestBed.createComponent(SlotHost);
      await f.whenStable();
    });

    it('renders the title template in place of the label, with the index', async () => {
      f.componentInstance.withTitle.set(true);
      await f.whenStable();

      const rendered = Array.from(f.nativeElement.querySelectorAll('.title')).map((el) =>
        (el as HTMLElement).textContent!.trim(),
      );
      expect(rendered).toEqual(['0: Inbox', '1: Starred', '2: Archive']);
      // It renders *inside* Material's title line, not beside it.
      expect(f.nativeElement.querySelector('.mat-mdc-list-item-title .title')).not.toBeNull();
    });

    it('renders the line template in place of the sublabel', async () => {
      f.componentInstance.withLine.set(true);
      await f.whenStable();

      expect(f.nativeElement.querySelector('.mat-mdc-list-item-line .line')!.textContent).toBe(
        '12 unread!',
      );
    });

    it('renders the icon template into the leading slot, in place of the icon name', async () => {
      f.componentInstance.withIcon.set(true);
      await f.whenStable();

      expect(f.nativeElement.querySelectorAll('.icon')).toHaveLength(3);
      // The convenience `icon` name gives way to the template.
      expect(f.nativeElement.querySelector('mat-icon')).toBeNull();
      expect(f.nativeElement.querySelector('[matlistitemicon] .icon')).not.toBeNull();
    });

    it('hands the slot the row’s selected state', async () => {
      f.componentInstance.selectable.set(true);
      f.componentInstance.withIcon.set(true);
      f.componentInstance.value.set('starred');
      await f.whenStable();

      const flags = Array.from(f.nativeElement.querySelectorAll('.icon')).map((el) =>
        (el as HTMLElement).classList.contains('on'),
      );
      expect(flags).toEqual([false, true, false]);
    });

    // The two share one Material slot, so the precedence has to be a decision rather
    // than an accident of template order.
    it('gives the leading slot to an avatar over an icon', async () => {
      f.componentInstance.withAvatar.set(true);
      f.componentInstance.withIcon.set(true);
      await f.whenStable();

      expect(f.nativeElement.querySelectorAll('.avatar')).toHaveLength(3);
      expect(f.nativeElement.querySelector('.icon')).toBeNull();
      expect(f.nativeElement.querySelector('[matlistitemavatar] .avatar')).not.toBeNull();
    });
  });

  describe('accessibility', () => {
    // An ARIA name on `<ui-list>` would be a name on an element with no role, which axe
    // reports as `aria-prohibited-attr`. The name belongs on Material's container.
    it('moves the accessible name onto the element that has the role', () => {
      const hostElement = fixture.nativeElement.querySelector('ui-list') as HTMLElement;

      expect(hostElement.hasAttribute('aria-label')).toBe(false);
      expect(query('mat-list')!.getAttribute('aria-label')).toBe('Mailboxes');
    });

    it('names the listbox too', async () => {
      host.selectable.set(true);
      await fixture.whenStable();

      expect(query('mat-selection-list')!.getAttribute('aria-label')).toBe('Mailboxes');
    });
  });

  // The colours are Material's, resolved from the shared theme's tokens. This
  // component only re-points those tokens at hooks whose defaults are the tokens
  // Material would have used anyway.
  describe('theming', () => {
    // These read the *declaration* rather than a painted colour, on purpose: `ng
    // test` runs in jsdom, which does not substitute `var()` at all. What a list
    // resolves to under the real theme is asserted by the Storybook stories, which
    // run in Chromium.
    const declaration = (token: string) =>
      getComputedStyle(query('ui-list')!).getPropertyValue(token);

    const noLiterals = /#[0-9a-f]{3,8}\b|\brgba?\(/i;

    it('resolves the two lines from the theme, not a literal', () => {
      expect(declaration('--mat-list-list-item-label-text-color')).toContain(
        'var(--ui-list-label-text-color',
      );
      expect(declaration('--mat-list-list-item-label-text-color')).toContain(
        'var(--mat-sys-on-surface)',
      );
      expect(declaration('--mat-list-list-item-supporting-text-color')).toContain(
        'var(--ui-list-supporting-text-color',
      );
      expect(declaration('--mat-list-list-item-supporting-text-color')).toContain(
        'var(--mat-sys-on-surface-variant)',
      );
      expect(declaration('--mat-list-list-item-supporting-text-color')).not.toMatch(noLiterals);
    });

    it('resolves the leading icon and avatar from the theme, not a literal', () => {
      expect(declaration('--mat-list-list-item-leading-icon-color')).toContain(
        'var(--ui-list-leading-icon-color',
      );
      expect(declaration('--mat-list-list-item-leading-icon-color')).toContain(
        'var(--mat-sys-on-surface-variant)',
      );
      expect(declaration('--mat-list-list-item-leading-avatar-color')).toContain(
        'var(--ui-list-leading-avatar-color',
      );
      expect(declaration('--mat-list-list-item-leading-avatar-color')).toContain(
        'var(--mat-sys-primary-container)',
      );
    });

    // Material's own M3 default is `transparent` — kept, so a list takes the colour
    // of the card or sheet it sits on rather than punching a hole in it.
    it('defaults a row’s fill and a selected row’s fill to transparent', () => {
      expect(declaration('--mat-list-list-item-container-color')).toContain(
        'var(--ui-list-item-container-color',
      );
      expect(declaration('--mat-list-list-item-container-color')).toContain('transparent');
      expect(declaration('--mat-list-list-item-selected-container-color')).toContain(
        'var(--ui-list-selected-container-color',
      );
    });

    it('exposes the row’s corners as a hook, defaulting to M3’s square', () => {
      expect(declaration('--mat-list-list-item-container-shape')).toContain(
        'var(--ui-list-item-shape',
      );
      expect(declaration('--mat-list-list-item-container-shape')).toContain(
        'var(--mat-sys-corner-none)',
      );
    });

    // The hooks are emitted on the host, which is what keeps a consumer off
    // `::ng-deep`: `--ui-list-item-shape` set by an ordinary rule on `ui-list` —
    // or inherited from any ancestor — reaches the elements inside Material's
    // template by CSS's own inheritance.
    it('exposes the hooks on the host, not on Material’s internals', () => {
      expect(declaration('--mat-list-list-item-label-text-color')).not.toBe('');
      expect(
        getComputedStyle(query('mat-list')!).getPropertyValue(
          '--mat-list-list-item-label-text-color',
        ),
      ).toBe('');
    });
  });

  describe('escape hatches', () => {
    it('exposes the MatList of a static list, and no selection list', () => {
      expect(host.ref().matList()).toBeInstanceOf(MatList);
      expect(host.ref().matSelectionList()).toBeUndefined();
    });

    // Rule 4: the underlying Material instance is the escape hatch for everything this
    // component deliberately does not wrap — `selectAll()`, `focus()`, `disableRipple`.
    it('exposes the MatSelectionList of a selectable list, and no plain list', async () => {
      host.selectable.set(true);
      await fixture.whenStable();

      expect(host.ref().matSelectionList()).toBeInstanceOf(MatSelectionList);
      expect(host.ref().matList()).toBeUndefined();
      expect(typeof host.ref().matSelectionList()!.selectAll).toBe('function');
    });

    // Material's own `selectionChange` does not fire for `selectAll()` — only for a
    // click or the keyboard. If the value were synced from that event, the escape hatch
    // would leave this component's state disagreeing with the screen.
    it('writes the value when the selection is made through the escape hatch', async () => {
      host.selectable.set(true);
      host.multiple.set(true);
      await fixture.whenStable();

      host.ref().matSelectionList()!.selectAll();
      await fixture.whenStable();

      expect(host.value()).toEqual(['inbox', 'starred', 'archive']);
      expect(rows().every((row) => row.getAttribute('aria-selected') === 'true')).toBe(true);

      host.ref().matSelectionList()!.deselectAll();
      await fixture.whenStable();

      expect(host.value()).toEqual([]);
    });

    // It is not a *user's* selection, and the code that called it already knows.
    it('does not emit selectionChange for a selection made from code', async () => {
      host.selectable.set(true);
      host.multiple.set(true);
      await fixture.whenStable();

      host.ref().matSelectionList()!.selectAll();
      await fixture.whenStable();

      expect(host.changes).toEqual([]);
    });
  });
});
