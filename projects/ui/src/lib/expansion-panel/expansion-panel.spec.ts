import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatAccordion, MatExpansionPanel } from '@angular/material/expansion';

import { Accordion } from './accordion';
import {
  ExpansionPanel,
  ExpansionPanelActions,
  ExpansionPanelDescription,
  ExpansionPanelTitle,
} from './expansion-panel';

interface PanelSpec {
  title: string;
  body: string;
  disabled?: boolean;
}

const PANELS: PanelSpec[] = [
  { title: 'Details', body: 'Order 4213' },
  { title: 'Items', body: 'Three items' },
  { title: 'History', body: 'Created yesterday' },
];

/**
 * Material's own switch for the panel's expand/collapse transition.
 *
 * Without it the body's height is animated behind a `transitionend` that never
 * arrives in jsdom, so `afterExpand` would never fire and every assertion about
 * what is on screen would be racing an animation. This is Material's public token
 * rather than `provideNoopAnimations()`, which is the same thing plus an animations
 * module.
 */
const noAnimations = { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } };

/**
 * A keydown Material will actually read.
 *
 * `MatExpansionPanelHeader` and the CDK's key manager switch on `event.keyCode`,
 * and a `KeyboardEvent` built from `key` alone reports `keyCode: 0` — a keypress
 * they would ignore. Same construction as `dialog.spec.ts`.
 */
const keydown = (key: string, keyCode: number) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true });
  Object.defineProperty(event, 'keyCode', { get: () => keyCode });
  return event;
};

const ARROW_DOWN = () => keydown('ArrowDown', 40);
const ARROW_UP = () => keydown('ArrowUp', 38);
const END = () => keydown('End', 35);
const ENTER = () => keydown('Enter', 13);

@Component({
  imports: [ExpansionPanel],
  template: `
    <ui-expansion-panel
      #ref="uiExpansionPanel"
      [title]="title()"
      [description]="description()"
      [(expanded)]="expanded"
      [disabled]="disabled()"
      [hideToggle]="hideToggle()"
      (afterExpand)="afterExpand = afterExpand + 1"
      (afterCollapse)="afterCollapse = afterCollapse + 1"
    >
      <p class="body">Sam Carter, 1 Infinite Loop</p>
    </ui-expansion-panel>
  `,
})
class TestHost {
  readonly title = signal<string | undefined>('Shipping address');
  readonly description = signal<string | undefined>('1 Infinite Loop');
  readonly expanded = signal(false);
  readonly disabled = signal(false);
  readonly hideToggle = signal(false);
  afterExpand = 0;
  afterCollapse = 0;
  readonly ref = viewChild.required<ExpansionPanel>('ref');
}

describe('ExpansionPanel', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  const header = (): HTMLElement => query('mat-expansion-panel-header')!;
  const panel = (): HTMLElement => query('mat-expansion-panel')!;

  const clickHeader = async () => {
    header().click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [noAnimations] });
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('renders Material’s expansion panel rather than markup of its own', () => {
    expect(panel()).not.toBeNull();
    expect(panel().classList).toContain('mat-expansion-panel');
    expect(host.ref().matExpansionPanel()).toBeInstanceOf(MatExpansionPanel);
  });

  describe('header', () => {
    it('renders the title and description strings', () => {
      expect(query('mat-panel-title')!.textContent!.trim()).toBe('Shipping address');
      expect(query('mat-panel-description')!.textContent!.trim()).toBe('1 Infinite Loop');
    });

    it('updates them when the inputs change', async () => {
      host.title.set('Billing address');
      host.description.set('2 Infinite Loop');
      await fixture.whenStable();

      expect(query('mat-panel-title')!.textContent!.trim()).toBe('Billing address');
      expect(query('mat-panel-description')!.textContent!.trim()).toBe('2 Infinite Loop');
    });

    // An empty `<mat-panel-description>` still takes its share of the header's
    // width, so a panel with no description would push its title over for nothing.
    it('renders no description container when there is no description', async () => {
      host.description.set(undefined);
      await fixture.whenStable();

      expect(query('mat-panel-description')).toBeNull();
      expect(query('mat-panel-title')).not.toBeNull();
    });

    it('renders no title container when there is no title', async () => {
      host.title.set(undefined);
      await fixture.whenStable();

      expect(query('mat-panel-title')).toBeNull();
    });

    // `title` is a global HTML attribute: left on the host it becomes a native
    // tooltip over the whole panel, repeating the heading the user is reading.
    it('does not leave a title attribute on the host', async () => {
      @Component({
        imports: [ExpansionPanel],
        template: `<ui-expansion-panel title="Details">Body</ui-expansion-panel>`,
      })
      class AttrHost {}

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      const element: HTMLElement = f.nativeElement.querySelector('ui-expansion-panel');

      expect(element.hasAttribute('title')).toBe(false);
      expect(f.nativeElement.querySelector('mat-panel-title').textContent.trim()).toBe('Details');
    });
  });

  describe('projected content', () => {
    // The body has to land *inside* Material's content region: that is the element
    // the panel expands and the one the header's `aria-controls` points at.
    it('renders the body inside Material’s panel content', () => {
      const body = query('.body')!;

      expect(body.textContent).toBe('Sam Carter, 1 Infinite Loop');
      expect(body.closest('.mat-expansion-panel-content')).not.toBeNull();
    });

    it('renders no action row when nothing is projected into it', () => {
      expect(query('mat-action-row')).toBeNull();
    });

    it('projects actions into Material’s action row', async () => {
      @Component({
        imports: [ExpansionPanel, ExpansionPanelActions],
        template: `
          <ui-expansion-panel title="Details">
            Body
            <button uiExpansionPanelActions class="save">Save</button>
          </ui-expansion-panel>
        `,
      })
      class ActionHost {}

      const f = TestBed.createComponent(ActionHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('.save').closest('mat-action-row')).not.toBeNull();
    });
  });

  // Rule 7: the header is the one part of a panel a consumer cannot otherwise
  // project into, so a string input is not the only way in.
  describe('title and description slots', () => {
    @Component({
      imports: [ExpansionPanel, ExpansionPanelTitle, ExpansionPanelDescription],
      template: `
        <ui-expansion-panel title="Ignored" description="Also ignored">
          <span uiExpansionPanelTitle class="custom-title">Items <em>3</em></span>
          <span uiExpansionPanelDescription class="custom-description">Packed</span>
          Body
        </ui-expansion-panel>
      `,
    })
    class SlotHost {}

    let f: ComponentFixture<SlotHost>;

    beforeEach(async () => {
      f = TestBed.createComponent(SlotHost);
      await f.whenStable();
    });

    it('renders the projected title inside Material’s panel title', () => {
      const custom = f.nativeElement.querySelector('.custom-title');

      expect(custom.closest('mat-panel-title')).not.toBeNull();
      expect(custom.textContent).toContain('3');
    });

    it('renders the projected description inside Material’s panel description', () => {
      expect(
        f.nativeElement.querySelector('.custom-description').closest('mat-panel-description'),
      ).not.toBeNull();
    });

    // A consumer who projected a slot is saying the string cannot express what they
    // need; rendering both would be a duplicated header.
    it('replaces the string inputs rather than rendering both', () => {
      expect(f.nativeElement.querySelector('mat-panel-title').textContent).not.toContain('Ignored');
      expect(f.nativeElement.querySelector('mat-panel-description').textContent).not.toContain(
        'Also ignored',
      );
    });
  });

  describe('expanded', () => {
    it('starts collapsed', () => {
      expect(host.ref().expanded()).toBe(false);
      expect(header().getAttribute('aria-expanded')).toBe('false');
    });

    it('opens when the bound value is set', async () => {
      host.expanded.set(true);
      await fixture.whenStable();

      expect(header().getAttribute('aria-expanded')).toBe('true');
      expect(panel().classList).toContain('mat-expanded');
    });

    // The `model` half of rule 5: a click has to write back through the same signal
    // the template bound, or a consumer's state silently diverges from the screen.
    it('writes a user’s click back through the two-way binding', async () => {
      await clickHeader();

      expect(host.expanded()).toBe(true);
      expect(host.ref().expanded()).toBe(true);
      expect(header().getAttribute('aria-expanded')).toBe('true');
    });

    it('closes again on a second click', async () => {
      await clickHeader();
      await clickHeader();

      expect(host.expanded()).toBe(false);
      expect(header().getAttribute('aria-expanded')).toBe('false');
    });

    it('toggles from the keyboard, as Material’s header does', async () => {
      header().dispatchEvent(ENTER());
      await fixture.whenStable();

      expect(host.expanded()).toBe(true);
    });

    it('emits expandedChange for a user’s click but not for a one-way write', async () => {
      const emitted: boolean[] = [];

      @Component({
        imports: [ExpansionPanel],
        template: `
          <ui-expansion-panel title="Details" [expanded]="open()" (expandedChange)="changed($event)">
            Body
          </ui-expansion-panel>
        `,
      })
      class OneWayHost {
        readonly open = signal(false);
        changed(open: boolean) {
          emitted.push(open);
        }
      }

      const f = TestBed.createComponent(OneWayHost);
      await f.whenStable();
      // A one-way write is the consumer's own state arriving; echoing it back would
      // be a loop, so nothing is emitted for it.
      f.componentInstance.open.set(true);
      await f.whenStable();
      expect(emitted).toEqual([]);

      (f.nativeElement.querySelector('mat-expansion-panel-header') as HTMLElement).click();
      await f.whenStable();

      expect(emitted).toEqual([false]);
    });

    it('forwards Material’s afterExpand and afterCollapse', async () => {
      expect(host.afterExpand).toBe(0);

      await clickHeader();
      expect(host.afterExpand).toBe(1);
      expect(host.afterCollapse).toBe(0);

      await clickHeader();

      expect(host.afterCollapse).toBe(1);
    });
  });

  describe('disabled', () => {
    beforeEach(async () => {
      host.disabled.set(true);
      await fixture.whenStable();
    });

    // Material marks it rather than removing it: the set of panels a user sees does
    // not change shape when one of them turns off.
    it('marks the header disabled and keeps it on the page', () => {
      expect(header().getAttribute('aria-disabled')).toBe('true');
      expect(query('mat-panel-title')!.textContent!.trim()).toBe('Shipping address');
    });

    it('takes the header out of the tab order', () => {
      expect(header().getAttribute('tabindex')).toBe('-1');
    });

    it('ignores a click on it', async () => {
      await clickHeader();

      expect(host.expanded()).toBe(false);
      expect(header().getAttribute('aria-expanded')).toBe('false');
    });

    it('re-enables it when the input flips back', async () => {
      host.disabled.set(false);
      await fixture.whenStable();

      await clickHeader();

      expect(host.expanded()).toBe(true);
    });

    // `booleanAttribute`: the bare attribute is what a template naturally writes.
    it('reads the bare disabled attribute', async () => {
      @Component({
        imports: [ExpansionPanel],
        template: `
          <ui-expansion-panel #ref="uiExpansionPanel" title="Details" disabled>
            Body
          </ui-expansion-panel>
        `,
      })
      class BareHost {
        readonly ref = viewChild.required<ExpansionPanel>('ref');
      }

      const f = TestBed.createComponent(BareHost);
      await f.whenStable();

      expect(f.componentInstance.ref().disabled()).toBe(true);
      expect(
        f.nativeElement.querySelector('mat-expansion-panel-header').getAttribute('aria-disabled'),
      ).toBe('true');
    });
  });

  describe('the toggle', () => {
    it('shows Material’s chevron by default', () => {
      expect(query('.mat-expansion-indicator')).not.toBeNull();
    });

    it('hides it when hideToggle is set', async () => {
      host.hideToggle.set(true);
      await fixture.whenStable();

      expect(query('.mat-expansion-indicator')).toBeNull();
    });

    it('moves it before the header content when asked', async () => {
      @Component({
        imports: [ExpansionPanel],
        template: `
          <ui-expansion-panel title="Details" togglePosition="before">Body</ui-expansion-panel>
        `,
      })
      class BeforeHost {}

      const f = TestBed.createComponent(BeforeHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('mat-expansion-panel-header').classList).toContain(
        'mat-expansion-toggle-indicator-before',
      );
    });
  });

  describe('accessibility', () => {
    it('keeps Material’s header/body wiring', () => {
      const controlled = header().getAttribute('aria-controls');

      expect(header().getAttribute('role')).toBe('button');
      expect(controlled).toBeTruthy();
      expect(query(`#${controlled}`)).not.toBeNull();
      expect(query(`#${controlled}`)!.getAttribute('aria-labelledby')).toBe(header().id);
    });

    it('keeps the header in the tab order while it is enabled', () => {
      expect(header().getAttribute('tabindex')).toBe('0');
    });
  });

  describe('escape hatches', () => {
    it('exposes the component instance via exportAs', () => {
      expect(host.ref()).toBeInstanceOf(ExpansionPanel);
    });

    // Rule 4: Material's own instance is the way out of anything not wrapped here.
    it('exposes the underlying MatExpansionPanel instance', async () => {
      host.expanded.set(true);
      await fixture.whenStable();

      expect(host.ref().matExpansionPanel().expanded).toBe(true);
      expect(host.ref().matExpansionPanel().accordion).toBeNull();
    });
  });

  // The colours are Material's, resolved from the shared theme's tokens. This
  // component only re-points those tokens at hooks whose defaults are the tokens
  // Material would have used anyway.
  describe('theming', () => {
    // These read the *declaration* rather than a painted colour, on purpose: `ng
    // test` runs in jsdom, which does not substitute `var()` at all. What the panel
    // resolves to under the real theme is asserted by the Storybook stories, which
    // run in Chromium.
    const declaration = (token: string) =>
      getComputedStyle(query('ui-expansion-panel')!).getPropertyValue(`--mat-expansion-${token}`);

    const literalColour = /#[0-9a-f]{3,8}\b|\brgba?\(/i;

    it('resolves the container from the theme, not a literal', () => {
      expect(declaration('container-background-color')).toContain(
        'var(--ui-expansion-panel-background-color',
      );
      expect(declaration('container-background-color')).toContain('var(--mat-sys-surface)');
      expect(declaration('container-background-color')).not.toMatch(literalColour);
      expect(declaration('container-text-color')).toContain('var(--mat-sys-on-surface)');
    });

    it('resolves the header, description and chevron from the theme, not a literal', () => {
      expect(declaration('header-text-color')).toContain(
        'var(--ui-expansion-panel-header-text-color',
      );
      expect(declaration('header-text-color')).toContain('var(--mat-sys-on-surface)');
      expect(declaration('header-description-color')).toContain('var(--mat-sys-on-surface-variant)');
      expect(declaration('header-indicator-color')).toContain('var(--mat-sys-on-surface-variant)');
      expect(declaration('header-indicator-color')).not.toMatch(literalColour);
    });

    it('resolves the action row divider from the theme, not a literal', () => {
      expect(declaration('actions-divider-color')).toContain(
        'var(--ui-expansion-panel-divider-color',
      );
      expect(declaration('actions-divider-color')).toContain('var(--mat-sys-outline)');
    });

    // The fleet's corner role, not Material's own 12px literal — and the same one
    // `uiButton` and `ui-alert` default to.
    it('takes its corner from the theme’s shape role', () => {
      expect(declaration('container-shape')).toContain('var(--ui-expansion-panel-shape');
      expect(declaration('container-shape')).toContain('var(--mat-sys-corner-medium)');
    });

    // Density is the theme's decision, not this component's: a height hook here
    // would be a second way to set it, and a way for two apps to disagree.
    it('leaves the header heights to the theme’s density tokens', () => {
      expect(declaration('header-collapsed-state-height')).toBe('');
      expect(declaration('header-expanded-state-height')).toBe('');
    });

    // The overrides are emitted on the host, which is what keeps a consumer off
    // `::ng-deep`: `--ui-expansion-panel-indicator-color` set by an ordinary rule on
    // `ui-expansion-panel` — or inherited from any ancestor — reaches the elements
    // inside Material's template by CSS's own inheritance.
    it('exposes the hooks on the host, not on Material’s internals', () => {
      expect(declaration('header-indicator-color')).not.toBe('');
      expect(
        getComputedStyle(query('mat-expansion-panel')!).getPropertyValue(
          '--mat-expansion-header-indicator-color',
        ),
      ).toBe('');
    });
  });
});

@Component({
  imports: [Accordion, ExpansionPanel],
  template: `
    <ui-accordion #ref="uiAccordion" [multi]="multi()" [hideToggle]="hideToggle()">
      @for (panel of panels(); track panel.title) {
        <ui-expansion-panel [title]="panel.title" [disabled]="!!panel.disabled">
          <p class="body">{{ panel.body }}</p>
        </ui-expansion-panel>
      }
    </ui-accordion>
  `,
})
class AccordionHost {
  readonly panels = signal<PanelSpec[]>(PANELS);
  readonly multi = signal(false);
  readonly hideToggle = signal(false);
  readonly ref = viewChild.required<Accordion>('ref');
}

describe('Accordion', () => {
  let fixture: ComponentFixture<AccordionHost>;
  let host: AccordionHost;

  const queryAll = (selector: string): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll(selector));

  const headers = (): HTMLElement[] => queryAll('mat-expansion-panel-header');
  const expandedStates = (): boolean[] =>
    headers().map((header) => header.getAttribute('aria-expanded') === 'true');

  const click = async (index: number) => {
    headers()[index].click();
    await fixture.whenStable();
  };

  const focusedIndex = () => headers().indexOf(document.activeElement as HTMLElement);

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [noAnimations] });
    fixture = TestBed.createComponent(AccordionHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('renders one Material panel per ui-expansion-panel, in order', () => {
    expect(queryAll('mat-expansion-panel').length).toBe(3);
    expect(queryAll('mat-panel-title').map((title) => title.textContent!.trim())).toEqual([
      'Details',
      'Items',
      'History',
    ]);
  });

  // The panels find the accordion by DI rather than by DOM position, which is what
  // lets `<ui-expansion-panel>` render Material's panel a level deeper than a
  // hand-written one without losing any of this.
  it('is found by every panel it contains', () => {
    const matAccordion = host.ref().matAccordion;

    expect(matAccordion).toBeInstanceOf(MatAccordion);
    for (const panel of host.ref().panels()) {
      expect(panel.matExpansionPanel().accordion).toBe(matAccordion);
    }
  });

  it('finds a panel a consumer’s own markup nests deeper', async () => {
    @Component({
      imports: [Accordion, ExpansionPanel],
      template: `
        <ui-accordion #ref="uiAccordion">
          <div class="group">
            <ui-expansion-panel title="Nested">Body</ui-expansion-panel>
          </div>
        </ui-accordion>
      `,
    })
    class NestedMarkupHost {
      readonly ref = viewChild.required<Accordion>('ref');
    }

    const f = TestBed.createComponent(NestedMarkupHost);
    await f.whenStable();
    const accordion = f.componentInstance.ref();

    expect(accordion.panels().length).toBe(1);
    expect(accordion.panels()[0].matExpansionPanel().accordion).toBe(accordion.matAccordion);
  });

  describe('single-open (the default)', () => {
    it('closes the open panel when another opens', async () => {
      await click(0);
      expect(expandedStates()).toEqual([true, false, false]);

      await click(1);

      expect(expandedStates()).toEqual([false, true, false]);
    });

    // The panel closed by its sibling has to report that through its own `expanded`
    // model, or a consumer's bound signal is left claiming it is still open.
    it('reports the forced close back through the closed panel’s model', async () => {
      await click(0);
      const first = host.ref().panels()[0];
      expect(first.expanded()).toBe(true);

      await click(1);

      expect(first.expanded()).toBe(false);
      expect(host.ref().panels()[1].expanded()).toBe(true);
    });
  });

  describe('multi', () => {
    beforeEach(async () => {
      host.multi.set(true);
      await fixture.whenStable();
    });

    it('lets panels open independently', async () => {
      await click(0);
      await click(1);

      expect(expandedStates()).toEqual([true, true, false]);
    });

    it('opens and closes every panel at once', async () => {
      host.ref().openAll();
      await fixture.whenStable();
      expect(expandedStates()).toEqual([true, true, true]);

      host.ref().closeAll();
      await fixture.whenStable();

      expect(expandedStates()).toEqual([false, false, false]);
    });

    // Material's own rule: opening every panel of a single-open accordion would
    // contradict the mode, so it does nothing.
    it('ignores openAll on a single-open accordion', async () => {
      host.multi.set(false);
      await fixture.whenStable();

      host.ref().openAll();
      await fixture.whenStable();

      expect(expandedStates()).toEqual([false, false, false]);
    });
  });

  // Wrapping Material's panel hides its header from `MatAccordion`'s own content
  // query, so `ui-accordion` hands the headers to Material's key manager itself.
  // Without that, none of this works.
  describe('keyboard navigation across the stack', () => {
    it('moves focus with the arrow keys', async () => {
      headers()[0].focus();
      expect(focusedIndex()).toBe(0);

      headers()[0].dispatchEvent(ARROW_DOWN());
      await fixture.whenStable();
      expect(focusedIndex()).toBe(1);

      headers()[1].dispatchEvent(ARROW_UP());
      await fixture.whenStable();

      expect(focusedIndex()).toBe(0);
    });

    it('jumps to the last header with End', async () => {
      headers()[0].focus();
      headers()[0].dispatchEvent(END());
      await fixture.whenStable();

      expect(focusedIndex()).toBe(2);
    });

    it('wraps around at the end of the stack, as Material does', async () => {
      headers()[2].focus();
      headers()[2].dispatchEvent(ARROW_DOWN());
      await fixture.whenStable();

      expect(focusedIndex()).toBe(0);
    });

    it('keeps working after a panel is added', async () => {
      host.panels.update((panels) => [...panels, { title: 'Notes', body: 'None' }]);
      await fixture.whenStable();

      headers()[0].focus();
      headers()[0].dispatchEvent(END());
      await fixture.whenStable();

      expect(headers().length).toBe(4);
      expect(focusedIndex()).toBe(3);
    });

    it('keeps working after a panel is removed', async () => {
      host.panels.update((panels) => panels.slice(0, 2));
      await fixture.whenStable();

      headers()[0].focus();
      headers()[0].dispatchEvent(END());
      await fixture.whenStable();

      expect(headers().length).toBe(2);
      expect(focusedIndex()).toBe(1);
    });
  });

  describe('nested accordions', () => {
    @Component({
      imports: [Accordion, ExpansionPanel],
      template: `
        <ui-accordion #outer="uiAccordion">
          <ui-expansion-panel title="Outer" [expanded]="true">
            <ui-accordion #inner="uiAccordion">
              <ui-expansion-panel title="Inner">Body</ui-expansion-panel>
            </ui-accordion>
          </ui-expansion-panel>
        </ui-accordion>
      `,
    })
    class NestedHost {
      readonly outer = viewChild.required<Accordion>('outer');
      readonly inner = viewChild.required<Accordion>('inner');
    }

    // A nested panel must belong to the accordion nearest it, or opening it would
    // close a panel in the accordion above.
    it('gives a nested panel to the nearest accordion', async () => {
      const f = TestBed.createComponent(NestedHost);
      await f.whenStable();
      const { outer, inner } = f.componentInstance;

      expect(inner().panels().length).toBe(1);
      expect(inner().panels()[0].matExpansionPanel().accordion).toBe(inner().matAccordion);
      expect(outer().panels()[0].matExpansionPanel().accordion).toBe(outer().matAccordion);
    });

    // `panels()` is greedy (`descendants: true`), so the outer accordion sees the
    // inner panel too — Material filters it out of the key manager by the accordion
    // each panel actually belongs to.
    it('keeps a nested panel’s header out of the outer key manager', async () => {
      const f = TestBed.createComponent(NestedHost);
      await f.whenStable();
      const outer = f.componentInstance.outer();
      const ownHeaders = (outer.matAccordion as unknown as { _ownHeaders: { length: number } })
        ._ownHeaders;

      expect(outer.panels().length).toBe(2);
      expect(ownHeaders.length).toBe(1);
    });
  });

  describe('accordion-wide inputs', () => {
    // These are Material's own inputs, exposed off the host directive so that
    // Angular binds them: `MatExpansionPanelHeader` re-renders its chevron off
    // `MatAccordion`'s `ngOnChanges`, which only fires for inputs Angular binds.
    it('hides every chevron when hideToggle is set, and brings them back', async () => {
      expect(queryAll('.mat-expansion-indicator').length).toBe(3);

      host.hideToggle.set(true);
      await fixture.whenStable();
      expect(queryAll('.mat-expansion-indicator').length).toBe(0);

      host.hideToggle.set(false);
      await fixture.whenStable();

      expect(queryAll('.mat-expansion-indicator').length).toBe(3);
    });

    it('marks the host as multi for Material’s own styling', async () => {
      const element: HTMLElement = fixture.nativeElement.querySelector('ui-accordion');
      expect(element.classList).toContain('mat-accordion');
      expect(element.classList).not.toContain('mat-accordion-multi');

      host.multi.set(true);
      await fixture.whenStable();

      expect(element.classList).toContain('mat-accordion-multi');
    });
  });

  describe('disabled panels', () => {
    beforeEach(async () => {
      host.panels.update((panels) =>
        panels.map((panel, index) => (index === 1 ? { ...panel, disabled: true } : panel)),
      );
      await fixture.whenStable();
    });

    it('keeps the disabled panel in the stack but unopenable', async () => {
      await click(1);

      expect(headers().length).toBe(3);
      expect(headers()[1].getAttribute('aria-disabled')).toBe('true');
      expect(expandedStates()).toEqual([false, false, false]);
    });
  });
});
