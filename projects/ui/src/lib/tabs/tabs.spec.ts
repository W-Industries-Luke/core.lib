import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatTabGroup } from '@angular/material/tabs';
import { MatTabGroupHarness, MatTabHarness } from '@angular/material/tabs/testing';

import { Tab, TabLabelDef } from './tab';
import { Tabs, type UiTabsAlign } from './tabs';

interface TabSpec {
  label: string;
  body: string;
  disabled?: boolean;
}

const TABS: TabSpec[] = [
  { label: 'Details', body: 'Order 4213' },
  { label: 'Items', body: 'Three items' },
  { label: 'History', body: 'Created yesterday' },
];

@Component({
  imports: [Tabs, Tab],
  template: `
    <ui-tabs
      #ref="uiTabs"
      [(selectedIndex)]="selectedIndex"
      [alignTabs]="alignTabs()"
      [preserveContent]="preserveContent()"
      aria-label="Order"
    >
      @for (tab of tabs(); track tab.label) {
        <ui-tab [label]="tab.label" [disabled]="!!tab.disabled">
          <p class="body">{{ tab.body }}</p>
        </ui-tab>
      }
    </ui-tabs>
  `,
})
class TestHost {
  readonly tabs = signal<TabSpec[]>(TABS);
  readonly selectedIndex = signal(0);
  readonly alignTabs = signal<UiTabsAlign>('stretch');
  readonly preserveContent = signal(false);
  readonly ref = viewChild.required<Tabs>('ref');
}

/**
 * Material's own switch for the tab body's slide.
 *
 * Without it a tab's content is only attached once a `transitionstart` that never
 * arrives in jsdom has fired — or, failing that, once Material's 100ms fallback
 * timer does — so every assertion about what is on screen would be racing that
 * timer. This is Material's public token rather than `provideNoopAnimations()`,
 * which is the same thing plus an animations module.
 */
const noAnimations = { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } };

describe('Tabs', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let loader: HarnessLoader;

  // The `MatTabGroupHarness`/`MatTabHarness` speak Material's *public* test
  // surface — `getTabs()`, `getSelectedTab()`, and each tab's `getLabel()`,
  // `isSelected()`, `isDisabled()` and `select()` — instead of scraping
  // `.mat-mdc-tab` text and `aria-selected`/`aria-disabled` off Material's
  // rendered header, as the old spec did. Those class names and attributes are
  // Material's internal wiring: the harness exists precisely so that when
  // Material reworks its header markup, this spec keeps passing rather than
  // breaking on a detail no consumer depends on. Everything the harness *cannot*
  // see — which content is projected into the tabpanel, the tab/tabpanel ARIA
  // wiring, this component's `alignTabs` classes, its `labelClass`/`bodyClass`
  // forwarding and its `--ui-*` theme hooks — stays a DOM or instance assertion
  // below.
  const queryAll = (selector: string): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll(selector));

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  /**
   * The tab group harness — how a reader would locate the group too. Defaults to
   * the shared `loader`; a secondary fixture gets its own environment.
   */
  const tabGroup = (f?: ComponentFixture<unknown>): Promise<MatTabGroupHarness> =>
    (f ? TestbedHarnessEnvironment.loader(f) : loader).getHarness(MatTabGroupHarness);

  /** Each tab's label, read through the harness rather than off the header markup. */
  const labels = async (f?: ComponentFixture<unknown>): Promise<string[]> => {
    const tabs: MatTabHarness[] = await (await tabGroup(f)).getTabs();
    return Promise.all(tabs.map((tab) => tab.getLabel()));
  };

  /** The `role="tab"` elements Material renders in the header, in order. */
  const tabElements = (): HTMLElement[] => queryAll('.mat-mdc-tab');

  /** The `role="tabpanel"` bodies, in order. */
  const panels = (): HTMLElement[] => queryAll('mat-tab-body');

  /** Whatever content is currently rendered into a tab body. */
  const bodyText = (): string => query('.mat-mdc-tab-body-wrapper')?.textContent?.trim() ?? '';

  /** Select a tab by index through the harness, exactly as a user's click would. */
  const select = async (index: number) => {
    const tabs = await (await tabGroup()).getTabs();
    await tabs[index].select();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [noAnimations] });
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  it('renders Material’s tab group rather than markup of its own', () => {
    expect(query('mat-tab-group')).not.toBeNull();
    expect(query('mat-tab-group')!.classList).toContain('mat-mdc-tab-group');
    expect(host.ref().matTabGroup()).toBeInstanceOf(MatTabGroup);
  });

  describe('projected tabs', () => {
    it('renders one Material tab per ui-tab, labelled and in order', async () => {
      expect(await labels()).toEqual(['Details', 'Items', 'History']);
      expect(host.ref().tabs().length).toBe(3);
    });

    // The body has to end up *inside* Material's tabpanel rather than in a box of
    // ours beside it: that is what ties the content to its tab through
    // `aria-labelledby`, and what the sliding animation moves.
    it('renders a tab’s content inside Material’s tabpanel', () => {
      const body = query('.body')!;

      expect(body.textContent).toBe('Order 4213');
      expect(body.closest('mat-tab-body')).not.toBeNull();
      expect(panels()[0].getAttribute('role')).toBe('tabpanel');
    });

    it('renders only the selected tab’s content', async () => {
      expect(bodyText()).toBe('Order 4213');

      await select(1);

      expect(bodyText()).toBe('Three items');
    });

    // `<ui-tab>` is a declaration, not a box — it captures its content in a
    // template for the group to render. If it rendered anything itself, every
    // tab's content would also be sitting on the page outside the tab group.
    it('renders nothing on the ui-tab host itself', () => {
      for (const element of queryAll('ui-tab')) {
        expect(element.textContent).toBe('');
      }
    });

    it('keeps every visited tab’s content in the DOM when preserveContent is set', async () => {
      host.preserveContent.set(true);
      await fixture.whenStable();
      await select(1);
      await select(0);

      expect(host.ref().matTabGroup().preserveContent).toBe(true);
      expect(bodyText()).toContain('Order 4213');
      expect(bodyText()).toContain('Three items');
    });

    it('picks up a tab added after the first render', async () => {
      host.tabs.update((tabs) => [...tabs, { label: 'Notes', body: 'None' }]);
      await fixture.whenStable();

      expect(await labels()).toEqual(['Details', 'Items', 'History', 'Notes']);
    });

    it('drops a tab that is removed', async () => {
      host.tabs.update((tabs) => tabs.slice(0, 2));
      await fixture.whenStable();

      expect(await labels()).toEqual(['Details', 'Items']);
    });
  });

  describe('selectedIndex', () => {
    it('defaults to the first tab', async () => {
      expect(host.ref().selectedIndex()).toBe(0);
      expect(await (await (await tabGroup()).getSelectedTab()).getLabel()).toBe('Details');
    });

    it('selects the bound index', async () => {
      host.selectedIndex.set(2);
      await fixture.whenStable();

      expect(await (await (await tabGroup()).getSelectedTab()).getLabel()).toBe('History');
      expect(bodyText()).toBe('Created yesterday');
    });

    // The `model` half of rule 5: a click has to write back through the same
    // signal the template bound, or a consumer's state silently diverges from
    // what is on screen.
    it('writes a user’s click back through the two-way binding', async () => {
      await select(1);

      expect(host.selectedIndex()).toBe(1);
      expect(host.ref().selectedIndex()).toBe(1);
      expect(await (await (await tabGroup()).getSelectedTab()).getLabel()).toBe('Items');
    });

    it('emits selectedIndexChange for a user’s click but not for a one-way write', async () => {
      const emitted: number[] = [];

      @Component({
        imports: [Tabs, Tab],
        template: `
          <ui-tabs [selectedIndex]="index()" (selectedIndexChange)="changed($event)">
            <ui-tab label="One">1</ui-tab>
            <ui-tab label="Two">2</ui-tab>
          </ui-tabs>
        `,
      })
      class OneWayHost {
        readonly index = signal(1);
        changed(index: number) {
          emitted.push(index);
        }
      }

      const f = TestBed.createComponent(OneWayHost);
      await f.whenStable();
      // A one-way write is the consumer's own state arriving; echoing it back
      // would be a loop, so nothing is emitted for it.
      f.componentInstance.index.set(0);
      await f.whenStable();
      expect(emitted).toEqual([]);

      await (await (await tabGroup(f)).getTabs())[1].select();
      await f.whenStable();

      expect(emitted).toEqual([1]);
    });

    // Material clamps rather than blanking the group, and reports the clamped
    // value back — so the binding and the header cannot drift apart.
    it('settles on the last tab when bound past the end', async () => {
      host.selectedIndex.set(5);
      await fixture.whenStable();

      expect(host.selectedIndex()).toBe(2);
      expect(await (await (await tabGroup()).getSelectedTab()).getLabel()).toBe('History');
    });

    it('settles on the first tab when bound below zero', async () => {
      host.selectedIndex.set(-1);
      await fixture.whenStable();

      expect(host.selectedIndex()).toBe(0);
      expect(await (await (await tabGroup()).getSelectedTab()).getLabel()).toBe('Details');
    });
  });

  describe('disabled tabs', () => {
    beforeEach(async () => {
      host.tabs.set([
        { label: 'Details', body: 'Order 4213' },
        { label: 'Items', body: 'Three items', disabled: true },
        { label: 'History', body: 'Created yesterday' },
      ]);
      await fixture.whenStable();
    });

    // Material marks it rather than removing it: the set of tabs a user sees does
    // not change shape when one of them turns off, and a screen reader still
    // announces that it is there.
    it('marks the tab disabled and keeps it in the header', async () => {
      const tabs = await (await tabGroup()).getTabs();

      expect(await labels()).toEqual(['Details', 'Items', 'History']);
      expect(await tabs[1].isDisabled()).toBe(true);
      expect(await tabs[0].isDisabled()).toBe(false);
    });

    // No harness surface for a tab's tabindex, so this stays a DOM read.
    it('takes the disabled tab out of the tab order', () => {
      expect(tabElements()[1].getAttribute('tabIndex')).toBe('-1');
    });

    it('ignores a click on it', async () => {
      // `select()` clicks the tab like a user would; Material ignores the click
      // because the tab is disabled, so the selection does not move.
      await select(1);

      expect(host.selectedIndex()).toBe(0);
      expect(bodyText()).toBe('Order 4213');
    });

    // A deep link into a tab that has since been turned off: Material shows its
    // content and leaves the tab unclickable, rather than blanking the group or
    // moving the selection. Only an *out-of-range* index is clamped, not a
    // disabled one.
    it('shows a disabled tab’s content when it is the selected one', async () => {
      host.selectedIndex.set(1);
      await fixture.whenStable();

      expect(host.selectedIndex()).toBe(1);
      expect(bodyText()).toBe('Three items');
      expect(await (await (await tabGroup()).getTabs())[1].isDisabled()).toBe(true);
    });

    it('re-enables it when the input flips back', async () => {
      host.tabs.update((tabs) => tabs.map((tab) => ({ ...tab, disabled: false })));
      await fixture.whenStable();

      await select(1);

      expect(host.selectedIndex()).toBe(1);
    });

    // `booleanAttribute`: the bare attribute is what a template naturally writes.
    it('reads the bare disabled attribute', async () => {
      @Component({
        imports: [Tabs, Tab],
        template: `
          <ui-tabs>
            <ui-tab label="One">1</ui-tab>
            <ui-tab #ref="uiTab" label="Two" disabled>2</ui-tab>
          </ui-tabs>
        `,
      })
      class AttrHost {
        readonly ref = viewChild.required<Tab>('ref');
      }

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();

      expect(f.componentInstance.ref().disabled()).toBe(true);
      expect(await (await (await tabGroup(f)).getTabs())[1].isDisabled()).toBe(true);
    });
  });

  // Alignment and stretching are one input here, because Material's own pair has
  // a combination that does nothing: stretched tabs leave no space to align into.
  describe('alignTabs', () => {
    const group = (): HTMLElement => query('mat-tab-group')!;

    it('stretches the tabs by default, as Material does', () => {
      expect(host.ref().alignTabs()).toBe('stretch');
      expect(group().classList).toContain('mat-mdc-tab-group-stretch-tabs');
      expect(group().hasAttribute('mat-align-tabs')).toBe(false);
    });

    for (const align of ['start', 'center', 'end'] as const) {
      it(`aligns to ${align} and stops stretching`, async () => {
        host.alignTabs.set(align);
        await fixture.whenStable();

        expect(group().getAttribute('mat-align-tabs')).toBe(align);
        expect(group().classList).not.toContain('mat-mdc-tab-group-stretch-tabs');
      });
    }

    it('goes back to stretching', async () => {
      host.alignTabs.set('center');
      await fixture.whenStable();
      host.alignTabs.set('stretch');
      await fixture.whenStable();

      expect(group().classList).toContain('mat-mdc-tab-group-stretch-tabs');
      expect(group().hasAttribute('mat-align-tabs')).toBe(false);
    });
  });

  // These are Material's own layout switches, forwarded verbatim (rule 4). Their
  // effect is a matter of layout Material owns, so the assertion is that each
  // reaches `MatTabGroup` — the same thing the `preserveContent` test does.
  describe('forwarded layout inputs', () => {
    @Component({
      imports: [Tabs, Tab],
      template: `
        <ui-tabs #ref="uiTabs" [dynamicHeight]="dynamicHeight()" [disableRipple]="disableRipple()">
          <ui-tab label="One">1</ui-tab>
          <ui-tab label="Two">2</ui-tab>
        </ui-tabs>
      `,
    })
    class LayoutHost {
      readonly dynamicHeight = signal(false);
      readonly disableRipple = signal(false);
      readonly ref = viewChild.required<Tabs>('ref');
    }

    it('leaves dynamicHeight and disableRipple off by default, as Material does', () => {
      expect(host.ref().matTabGroup().dynamicHeight).toBe(false);
      expect(host.ref().matTabGroup().disableRipple).toBe(false);
    });

    it('forwards dynamicHeight to Material when set', async () => {
      const f = TestBed.createComponent(LayoutHost);
      f.componentInstance.dynamicHeight.set(true);
      await f.whenStable();

      expect(f.componentInstance.ref().matTabGroup().dynamicHeight).toBe(true);
    });

    it('forwards disableRipple to Material when set', async () => {
      const f = TestBed.createComponent(LayoutHost);
      f.componentInstance.disableRipple.set(true);
      await f.whenStable();

      expect(f.componentInstance.ref().matTabGroup().disableRipple).toBe(true);
    });
  });

  describe('custom label templates', () => {
    @Component({
      imports: [Tabs, Tab, TabLabelDef],
      template: `
        <ui-tabs>
          <ui-tab label="Inbox">
            <ng-template uiTabLabel>
              <span class="custom-label">Inbox<em>4</em></span>
            </ng-template>
            Messages
          </ui-tab>
          <ui-tab label="Archive">Archived</ui-tab>
        </ui-tabs>
      `,
    })
    class LabelHost {}

    let f: ComponentFixture<LabelHost>;

    beforeEach(async () => {
      f = TestBed.createComponent(LabelHost);
      await f.whenStable();
    });

    // Rule 7: the header is the one part of a tab a consumer cannot project into,
    // so it is a template rather than a string-only input.
    it('renders the template inside Material’s tab, in place of the label', () => {
      const tabs = f.nativeElement.querySelectorAll('.mat-mdc-tab');
      const custom = f.nativeElement.querySelector('.custom-label');

      expect(custom).not.toBeNull();
      expect(custom.closest('.mat-mdc-tab')).toBe(tabs[0]);
      expect(tabs[0].textContent).toContain('4');
    });

    it('leaves the tab’s body where it was', () => {
      expect(f.nativeElement.querySelector('.mat-mdc-tab-body-wrapper').textContent).toContain(
        'Messages',
      );
    });

    it('leaves a tab without one on its label string', async () => {
      const tabs = await (await tabGroup(f)).getTabs();

      expect(await tabs[1].getLabel()).toBe('Archive');
    });
  });

  describe('accessibility', () => {
    it('names Material’s tablist from aria-label', () => {
      expect(query('[role="tablist"]')!.getAttribute('aria-label')).toBe('Order');
    });

    it('names it from aria-labelledby instead when given one', async () => {
      @Component({
        imports: [Tabs, Tab],
        template: `
          <h2 id="heading">Order</h2>
          <ui-tabs aria-labelledby="heading">
            <ui-tab label="One">1</ui-tab>
          </ui-tabs>
        `,
      })
      class LabelledbyHost {}

      const f = TestBed.createComponent(LabelledbyHost);
      await f.whenStable();

      expect(
        f.nativeElement.querySelector('[role="tablist"]').getAttribute('aria-labelledby'),
      ).toBe('heading');
    });

    it('leaves no empty aria-label behind when unnamed', async () => {
      @Component({
        imports: [Tabs, Tab],
        template: `<ui-tabs><ui-tab label="One">1</ui-tab></ui-tabs>`,
      })
      class UnnamedHost {}

      const f = TestBed.createComponent(UnnamedHost);
      await f.whenStable();
      const tablist = f.nativeElement.querySelector('[role="tablist"]');

      expect(tablist.hasAttribute('aria-label')).toBe(false);
      expect(tablist.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('keeps Material’s tab/tabpanel wiring', () => {
      const tab = tabElements()[0];
      const panel = panels()[0];

      expect(tab.getAttribute('role')).toBe('tab');
      expect(panel.getAttribute('role')).toBe('tabpanel');
      expect(tab.getAttribute('aria-controls')).toBe(panel.id);
      expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
    });

    // Roving focus, Material's own: exactly one tab is in the tab order at a time
    // — the selected one — so a keyboard user tabs into the header once and then
    // arrows between tabs, rather than tabbing through every tab in turn. The
    // arrow-key movement itself is Material's `FocusKeyManager`, exercised by the
    // built Storybook's axe pass; here the roving tabindex it maintains is the
    // structural contract asserted.
    it('keeps a single roving tabindex on the selected tab', async () => {
      const tabIndices = () => tabElements().map((tab) => tab.getAttribute('tabindex'));

      expect(tabIndices()).toEqual(['0', '-1', '-1']);

      host.selectedIndex.set(2);
      await fixture.whenStable();

      expect(tabIndices()).toEqual(['-1', '-1', '0']);
    });

    // A tab whose rendered label is not the whole story — an icon, a count — can
    // still be named, and the name has to reach Material's `role="tab"` rather
    // than sit on a `<ui-tab>` host that no assistive tech ever sees.
    it('puts a ui-tab’s aria-label on Material’s tab element', async () => {
      @Component({
        imports: [Tabs, Tab],
        template: `
          <ui-tabs>
            <ui-tab label="Inbox" aria-label="Inbox, 4 unread">Messages</ui-tab>
          </ui-tabs>
        `,
      })
      class AriaHost {}

      const f = TestBed.createComponent(AriaHost);
      await f.whenStable();

      const tab = (await (await tabGroup(f)).getTabs())[0];
      expect(await tab.getAriaLabel()).toBe('Inbox, 4 unread');
    });
  });

  describe('escape hatches', () => {
    it('exposes the component instance via exportAs', () => {
      expect(host.ref()).toBeInstanceOf(Tabs);
    });

    // Rule 4: Material's own instance is the way out of anything not wrapped here.
    it('exposes the underlying MatTabGroup instance', () => {
      expect(host.ref().matTabGroup()).toBeInstanceOf(MatTabGroup);
      expect(host.ref().matTabGroup().selectedIndex).toBe(0);
    });

    it('exposes the projected tabs', () => {
      expect(
        host
          .ref()
          .tabs()
          .map((tab) => tab.label()),
      ).toEqual(['Details', 'Items', 'History']);
    });

    // A class hook rather than `::ng-deep`: the header's tab element is inside
    // this component's template, so a consumer cannot select it from outside.
    it('forwards labelClass and bodyClass onto Material’s own elements', async () => {
      @Component({
        imports: [Tabs, Tab],
        template: `
          <ui-tabs>
            <ui-tab label="One" labelClass="my-label" bodyClass="my-body">1</ui-tab>
          </ui-tabs>
        `,
      })
      class ClassHost {}

      const f = TestBed.createComponent(ClassHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('.mat-mdc-tab').classList).toContain('my-label');
      expect(f.nativeElement.querySelector('mat-tab-body').classList).toContain('my-body');
    });
  });

  // The colours are Material's, resolved from the shared theme's tokens. This
  // component only re-points those tokens at hooks whose defaults are the tokens
  // Material would have used anyway.
  describe('theming', () => {
    // These read the *declaration* rather than a painted colour, on purpose:
    // `ng test` runs in jsdom, which does not substitute `var()` at all. What the
    // group resolves to under the real theme is asserted by the Storybook
    // stories, which run in Chromium.
    const declaration = (token: string) =>
      getComputedStyle(query('ui-tabs')!).getPropertyValue(`--mat-tab-${token}`);

    it('resolves the ink bar from the theme, not a literal', () => {
      expect(declaration('active-indicator-color')).toContain('var(--ui-tabs-color');
      expect(declaration('active-indicator-color')).toContain('var(--mat-sys-primary)');
      expect(declaration('active-indicator-color')).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(/i);
    });

    // Hover and focus must not re-colour the ink bar: one hook drives all three.
    it('keeps the ink bar’s hover and focus states on the same hook', () => {
      expect(declaration('active-hover-indicator-color')).toBe(
        declaration('active-indicator-color'),
      );
      expect(declaration('active-focus-indicator-color')).toBe(
        declaration('active-indicator-color'),
      );
    });

    it('resolves the label colours from the theme, not a literal', () => {
      expect(declaration('active-label-text-color')).toContain('var(--ui-tabs-active-label-color');
      expect(declaration('active-label-text-color')).toContain('var(--mat-sys-on-surface)');
      expect(declaration('inactive-label-text-color')).toContain(
        'var(--ui-tabs-inactive-label-color',
      );
      expect(declaration('inactive-label-text-color')).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(/i);
    });

    it('resolves the divider from the theme, not a literal', () => {
      expect(declaration('divider-color')).toContain('var(--ui-tabs-divider-color');
      expect(declaration('divider-color')).toContain('var(--mat-sys-surface-variant)');
    });

    it('exposes the ink bar’s geometry, defaulting to M3’s 2px underline', () => {
      expect(declaration('active-indicator-height')).toContain('var(--ui-tabs-indicator-height');
      expect(declaration('active-indicator-height')).toContain('2px');
      expect(declaration('active-indicator-shape')).toContain('var(--ui-tabs-indicator-shape');
    });

    // Density is the theme's decision, not this component's: a height hook here
    // would be a second way to set it, and a way for two apps to disagree.
    it('leaves the tab height to the theme’s density token', () => {
      expect(declaration('container-height')).toBe('');
    });

    // The overrides are emitted on the host, which is what keeps a consumer off
    // `::ng-deep`: `--ui-tabs-color` set by an ordinary rule on `ui-tabs` — or
    // inherited from any ancestor — reaches the elements inside Material's
    // template by CSS's own inheritance.
    it('exposes the hooks on the host, not on Material’s internals', () => {
      expect(declaration('active-indicator-color')).not.toBe('');
      expect(
        getComputedStyle(query('mat-tab-group')!).getPropertyValue(
          '--mat-tab-active-indicator-color',
        ),
      ).toBe('');
    });
  });
});
