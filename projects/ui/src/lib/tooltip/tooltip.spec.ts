import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatTooltip } from '@angular/material/tooltip';
import { MatTooltipHarness } from '@angular/material/tooltip/testing';

import { Tooltip, UiTooltipPosition, UiTooltipTouchGestures } from './tooltip';

@Component({
  imports: [Tooltip],
  template: `
    <button
      #ref="uiTooltip"
      [uiTooltip]="message()"
      [position]="position()"
      [uiTooltipDisabled]="tooltipDisabled()"
      [panelClass]="panelClass()"
    >
      Save
    </button>
  `,
})
class TestHost {
  readonly message = signal('Save the current draft');
  readonly position = signal<UiTooltipPosition>('below');
  readonly tooltipDisabled = signal(false);
  readonly panelClass = signal<string | string[]>([]);
  readonly ref = viewChild.required<Tooltip>('ref');
}

/** Waits `ms` of real time. The suite is zoneless, so there is no `tick()`. */
const delay = (ms = 0): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('Tooltip', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  /** The native element the consumer wrote — the directive's own host. */
  const trigger = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('button') as HTMLButtonElement;

  /** The tooltip container Material renders into the CDK overlay, if one is attached. */
  const overlay = (): HTMLElement | null => document.querySelector('.mat-mdc-tooltip');

  // `MatTooltipHarness` speaks Material's *public* test surface — `isOpen()`,
  // `getTooltipText()` — instead of reaching into the overlay markup or the
  // directive's private `_isTooltipVisible()`. It finds the trigger on the fixture
  // and its panel in the CDK overlay for us, so whether the tooltip is showing and
  // what it says are read the way a consumer's own test would. What the harness
  // cannot see — the `.ui-tooltip` theme class on Material's container, the
  // `aria-describedby` wiring, native-attribute forwarding — stays a DOM assertion.
  const tooltipHarness = (): Promise<MatTooltipHarness> =>
    TestbedHarnessEnvironment.loader(fixture).getHarness(MatTooltipHarness);

  /** Whether Material's tooltip panel is showing, via the harness. */
  const isOpen = (): Promise<boolean> => tooltipHarness().then((t) => t.isOpen());

  /** The text of the open tooltip panel, via the harness. */
  const tooltipText = (): Promise<string> => tooltipHarness().then((t) => t.getTooltipText());

  /**
   * Lets a binding reach Material, waits out the macrotask it defers every
   * show/hide by, then lets the change detection that follows settle.
   *
   * The first `whenStable()` is what makes this work for a binding as well as for
   * a direct call: `disabled` and `message` only reach `MatTooltip` during change
   * detection, and each of them can start a hide of its own — which is the
   * macrotask the `delay()` then waits out.
   */
  const settle = async (): Promise<void> => {
    await fixture.whenStable();
    await delay();
    await fixture.whenStable();
  };

  /**
   * Opens the tooltip with no delay and lets the overlay render.
   *
   * Still driven through the Material instance rather than the harness's own
   * `show()`: the harness opens by hovering, which honours the show delay, and this
   * zoneless suite would then be racing the macrotask that delay defers by — the
   * very thing `settle()` exists to wait out. Opening with an explicit `0` keeps the
   * timing deterministic; the harness reads the result (`isOpen()`, `getTooltipText()`).
   */
  const show = async (): Promise<void> => {
    host.ref().matTooltip.show(0);
    await settle();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  describe('message', () => {
    it('reaches MatTooltip from the directive’s own attribute', () => {
      expect(host.ref().matTooltip.message).toBe('Save the current draft');
    });

    it('renders the message into the overlay when shown', async () => {
      await show();

      expect(await isOpen()).toBe(true);
      expect(await tooltipText()).toBe('Save the current draft');
    });

    it('updates an open tooltip when the binding changes', async () => {
      await show();
      expect(await tooltipText()).toBe('Save the current draft');

      host.message.set('Save and close');
      await settle();

      expect(await tooltipText()).toBe('Save and close');
    });

    // Material's own `!message` guard. An empty message never opening is what
    // lets a consumer bind a real value through without guarding in the template.
    it('does not open for an empty message', async () => {
      host.message.set('');
      await settle();

      await show();

      expect(await isOpen()).toBe(false);
    });
  });

  describe('position', () => {
    it('defaults to below', () => {
      expect(host.ref().matTooltip.position).toBe('below');
    });

    // Every position must reach MatTooltip verbatim: Material *throws* on a
    // position it does not know, so a mistranslation here would surface as a
    // runtime error in a consumer's app rather than a compile error here.
    const positions: UiTooltipPosition[] = ['above', 'below', 'left', 'right', 'before', 'after'];

    for (const position of positions) {
      it(`passes the ${position} position through to MatTooltip`, async () => {
        host.position.set(position);
        await settle();

        expect(host.ref().matTooltip.position).toBe(position);

        // Opening pins that Material acts on the value rather than merely storing
        // it: an unknown position throws out of `_getOrigin()` on the way up.
        await show();
        expect(await isOpen()).toBe(true);
      });
    }

    it('repositions a tooltip that is already open', async () => {
      await show();
      expect(host.ref().matTooltip.position).toBe('below');

      host.position.set('above');
      await settle();

      expect(host.ref().matTooltip.position).toBe('above');
      expect(await isOpen()).toBe(true);
    });
  });

  describe('uiTooltipDisabled', () => {
    it('defaults to enabled', () => {
      expect(host.ref().matTooltip.disabled).toBe(false);
    });

    it('stops the tooltip from opening', async () => {
      host.tooltipDisabled.set(true);
      await settle();

      await show();

      expect(await isOpen()).toBe(false);
    });

    it('hides a tooltip that is already open', async () => {
      await show();
      expect(await isOpen()).toBe(true);

      host.tooltipDisabled.set(true);
      await settle();

      expect(await isOpen()).toBe(false);
    });

    // A bare attribute has to mean `true`, the way `booleanAttribute` would.
    // Material coerces it in its own setter, so this pins that the alias keeps
    // that working rather than handing the setter an empty string.
    it('treats a bare attribute as true', async () => {
      @Component({
        imports: [Tooltip],
        template: `<button uiTooltip="Save" #ref="uiTooltip" uiTooltipDisabled>Save</button>`,
      })
      class BareHost {
        readonly ref = viewChild.required<Tooltip>('ref');
      }

      const f = TestBed.createComponent(BareHost);
      await f.whenStable();

      expect(f.componentInstance.ref().matTooltip.disabled).toBe(true);
    });
  });

  describe('panelClass', () => {
    // `.ui-tooltip` is what `_tooltip.scss` hangs the theme off, so it has to
    // land on Material's own container whether or not a consumer passes a class.
    it('puts the theme’s class on Material’s container', async () => {
      await show();

      expect(overlay()?.classList).toContain('ui-tooltip');
      expect(overlay()?.classList).toContain('mat-mdc-tooltip');
    });

    it('adds a consumer’s class rather than replacing the theme’s', async () => {
      host.panelClass.set('danger-tooltip');
      await settle();

      await show();

      expect(overlay()?.classList).toContain('ui-tooltip');
      expect(overlay()?.classList).toContain('danger-tooltip');
    });

    it('accepts an array of classes', async () => {
      host.panelClass.set(['danger-tooltip', 'wide-tooltip']);
      await settle();

      await show();

      expect(overlay()?.classList).toContain('ui-tooltip');
      expect(overlay()?.classList).toContain('danger-tooltip');
      expect(overlay()?.classList).toContain('wide-tooltip');
    });

    it('applies a class change to a tooltip that is already open', async () => {
      await show();
      expect(overlay()?.classList).not.toContain('danger-tooltip');

      host.panelClass.set('danger-tooltip');
      await settle();

      expect(overlay()?.classList).toContain('danger-tooltip');
      expect(overlay()?.classList).toContain('ui-tooltip');
    });
  });

  describe('Material pass-through inputs', () => {
    @Component({
      imports: [Tooltip],
      template: `
        <button
          uiTooltip="Save"
          #ref="uiTooltip"
          [uiTooltipShowDelay]="showDelay()"
          [uiTooltipHideDelay]="hideDelay()"
          [uiTooltipTouchGestures]="touchGestures()"
          [uiTooltipPositionAtOrigin]="positionAtOrigin()"
        >
          Save
        </button>
      `,
    })
    class PassThroughHost {
      readonly showDelay = signal(150);
      readonly hideDelay = signal(500);
      readonly touchGestures = signal<UiTooltipTouchGestures>('auto');
      readonly positionAtOrigin = signal(false);
      readonly ref = viewChild.required<Tooltip>('ref');
    }

    let f: ComponentFixture<PassThroughHost>;
    let matTooltip: MatTooltip;

    beforeEach(async () => {
      f = TestBed.createComponent(PassThroughHost);
      await f.whenStable();
      matTooltip = f.componentInstance.ref().matTooltip;
    });

    it('forwards the show and hide delays', () => {
      expect(matTooltip.showDelay).toBe(150);
      expect(matTooltip.hideDelay).toBe(500);
    });

    // The delay is only real if Material waits it out — a forwarded number that
    // opened instantly would pass the assertion above and still be broken.
    it('waits the show delay out rather than opening immediately', async () => {
      matTooltip.show();
      await delay();
      await f.whenStable();

      expect(matTooltip._isTooltipVisible()).toBe(false);

      await delay(200);
      await f.whenStable();

      expect(matTooltip._isTooltipVisible()).toBe(true);
    });

    it('forwards the touch gestures', async () => {
      expect(matTooltip.touchGestures).toBe('auto');

      f.componentInstance.touchGestures.set('off');
      await f.whenStable();

      expect(matTooltip.touchGestures).toBe('off');
    });

    it('forwards positionAtOrigin', async () => {
      expect(matTooltip.positionAtOrigin).toBe(false);

      f.componentInstance.positionAtOrigin.set(true);
      await f.whenStable();

      expect(matTooltip.positionAtOrigin).toBe(true);
    });
  });

  describe('accessibility', () => {
    // The tooltip's whole job for a screen reader: describing the host. If the
    // alias broke this, the message would be visual-only.
    it('describes the host with the message', () => {
      const describedBy = trigger().getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();

      // The id has to resolve to real text, not merely be present.
      const description = document.getElementById(describedBy!.split(' ')[0]);
      expect(description?.textContent).toBe('Save the current draft');
    });

    it('drops the description when the tooltip is disabled', async () => {
      host.tooltipDisabled.set(true);
      await settle();

      expect(trigger().getAttribute('aria-describedby')).toBeFalsy();
    });
  });

  // --- The directive shape: native behaviour is not intercepted. -------------

  describe('native attributes reach the element', () => {
    @Component({
      imports: [Tooltip],
      template: `
        <a
          uiTooltip="Back to the inbox"
          position="right"
          href="/inbox"
          aria-label="Inbox"
          id="inbox"
          tabindex="3"
          data-testid="inbox-link"
        >
          Inbox
        </a>
      `,
    })
    class AttrHost {}

    it('does not swallow href, aria-label, id, tabindex or data-*', async () => {
      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      const anchor = f.nativeElement.querySelector('a') as HTMLAnchorElement;

      expect(anchor.getAttribute('href')).toBe('/inbox');
      expect(anchor.getAttribute('aria-label')).toBe('Inbox');
      expect(anchor.id).toBe('inbox');
      expect(anchor.tabIndex).toBe(3);
      expect(anchor.dataset['testid']).toBe('inbox-link');
    });

    it('decorates the element the consumer wrote, with no wrapper around it', () => {
      expect(fixture.nativeElement.querySelector('ui-tooltip')).toBeNull();
      expect(trigger().textContent?.trim()).toBe('Save');
    });
  });

  // This is why the pass-through input is named `uiTooltipDisabled` rather than a
  // bare `disabled`: `disabled` is a native attribute name, and an input claiming
  // it would bind the directive instead of the button — in the very case a
  // tooltip is most wanted for, explaining why a control is disabled.
  describe('does not claim native attribute names', () => {
    @Component({
      imports: [Tooltip],
      template: `
        <button uiTooltip="Fill in the form first" #ref="uiTooltip" [disabled]="disabled()">
          Save
        </button>
      `,
    })
    class NativeHost {
      readonly disabled = signal(true);
      readonly ref = viewChild.required<Tooltip>('ref');
    }

    it('leaves native disabled bound to the button itself', async () => {
      const f = TestBed.createComponent(NativeHost);
      await f.whenStable();
      const button = f.nativeElement.querySelector('button') as HTMLButtonElement;

      // If `uiTooltip` declared an input called `disabled`, this binding would
      // have been eaten by the directive and the button would still be live.
      expect(button.disabled).toBe(true);
      // ...and the tooltip's own disabled state is untouched by the native one:
      // a disabled control is exactly when the tooltip must still explain itself.
      expect(f.componentInstance.ref().matTooltip.disabled).toBe(false);
    });
  });

  describe('exportAs', () => {
    it('exposes the directive instance to a template ref', () => {
      expect(host.ref()).toBeInstanceOf(Tooltip);
    });

    // Rule 4 of the extensibility contract: the underlying Material instance is
    // the escape hatch for everything this directive deliberately does not wrap.
    it('exposes the underlying MatTooltip instance', () => {
      expect(host.ref().matTooltip).toBeInstanceOf(MatTooltip);
      expect(typeof host.ref().matTooltip.show).toBe('function');
      expect(typeof host.ref().matTooltip.toggle).toBe('function');
    });

    it('opens and closes through the Material instance', async () => {
      host.ref().matTooltip.toggle();
      await settle();

      expect(await isOpen()).toBe(true);

      host.ref().matTooltip.toggle();
      await settle();

      expect(await isOpen()).toBe(false);
    });
  });
});
