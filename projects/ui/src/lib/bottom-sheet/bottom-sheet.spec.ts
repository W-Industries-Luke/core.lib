import { Component, inject, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import {
  MAT_BOTTOM_SHEET_DATA,
  MAT_BOTTOM_SHEET_DEFAULT_OPTIONS,
  MatBottomSheet,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { MatBottomSheetHarness } from '@angular/material/bottom-sheet/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';

import {
  BottomSheet,
  provideUiBottomSheetDefaults,
  UI_BOTTOM_SHEET_DEFAULT_VALUES,
} from './bottom-sheet';

/** The live sheet's container element, or null when none is open. */
const container = (): HTMLElement | null => document.querySelector('.mat-bottom-sheet-container');

/** The overlay pane the panel classes land on. */
const pane = (): HTMLElement | null => document.querySelector('.cdk-overlay-pane');

/** A throwaway host: `documentRootLoader` needs a fixture to hook into the TestBed,
 *  even though the sheet itself lives in the document-root overlay, not in it. */
@Component({ template: '' })
class HarnessHost {}

// `MatBottomSheetHarness` speaks Material's *public* test surface — `getAriaLabel()`,
// `dismiss()` — instead of reading the container's attributes and pressing Escape by
// hand. The harness locates the open sheet in the CDK overlay for us. The service
// ref and its config (`disableClose`, `maxHeight`, `autoFocus`), the
// `.ui-bottom-sheet-panel` theme class and the pane sizing are all beyond what the
// harness can see, so those stay ref/DOM assertions.
const bottomSheetHarness = (): Promise<MatBottomSheetHarness> =>
  TestbedHarnessEnvironment.documentRootLoader(TestBed.createComponent(HarnessHost)).getHarness(
    MatBottomSheetHarness,
  );

/**
 * Renders whatever the last call did, so the DOM assertions see it.
 *
 * The timeout is the point, and a microtask will not do. Material drives the
 * sheet's enter and exit off animation events, and when animations are disabled
 * it *simulates* them — the `start` phase synchronously, the `done` phase from a
 * `setTimeout(0)`. `afterDismissed()` only emits on `done`, so a spec that
 * awaited promises alone would see a sheet that never finishes closing and a
 * result that never arrives. Two rounds, because opening and dismissing each
 * take one.
 */
const settle = async (): Promise<void> => {
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
  await new Promise((resolve) => setTimeout(resolve));
  TestBed.tick();
};

/**
 * Material's own switch for its enter/exit animations.
 *
 * Without it a dismissed sheet stays in the DOM until an `animationend` that
 * never arrives in jsdom, so every dismissal assertion here would be racing
 * Material's fallback timer. This is Material's public token rather than
 * `provideNoopAnimations()`, which is the same thing plus an animations module.
 */
const noAnimations = { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } };

/**
 * Presses Escape the way a user does — on `body`, which is where the CDK's
 * overlay keyboard dispatcher listens.
 *
 * `keyCode` rather than `key`, because that is what the CDK actually reads
 * (`event.keyCode === ESCAPE`), and a `KeyboardEvent` built from `key` alone
 * reports `keyCode: 0` — an Escape the sheet would ignore.
 */
const pressEscape = (): void => {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
  Object.defineProperty(event, 'keyCode', { get: () => 27 });
  document.body.dispatchEvent(event);
};

/** A consumer's own sheet: an ordinary component that reads its data and dismisses. */
@Component({
  selector: 'ui-test-sheet',
  template: `
    <p>Share this post</p>
    @if (data) {
      <p class="data">{{ data.title }}</p>
    }
    <button (click)="ref.dismiss('email')">Email</button>
  `,
})
class TestSheet {
  readonly ref = inject<MatBottomSheetRef<TestSheet, string>>(MatBottomSheetRef);
  readonly data = inject<{ title: string } | null>(MAT_BOTTOM_SHEET_DATA);
}

describe('BottomSheet', () => {
  let sheet: BottomSheet;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [noAnimations] });
    sheet = TestBed.inject(BottomSheet);
  });

  afterEach(async () => {
    sheet.dismiss();
    await settle();
  });

  describe('open', () => {
    it('renders the component it is given', async () => {
      sheet.open(TestSheet);
      await settle();

      expect(container()!.textContent).toContain('Share this post');
    });

    // The ref is Material's own, so `afterDismissed()`, `afterOpened()`,
    // `backdropClick()` and `keydownEvents()` are all still there — this service
    // wraps the theme and the defaults, not the API.
    it('returns Material’s own ref', () => {
      expect(sheet.open(TestSheet)).toBeInstanceOf(MatBottomSheetRef);
    });

    it('carries a typed result back through afterDismissed', async () => {
      const ref = sheet.open<TestSheet, unknown, string>(TestSheet);
      await settle();

      let result: string | undefined;
      ref.afterDismissed().subscribe((value) => (result = value));
      ref.instance.ref.dismiss('email');
      await settle();

      expect(result).toBe('email');
    });

    // The other half of the result contract: everything that is not a choice
    // arrives as one value, so a call site only has to check for it once.
    it('reports undefined when dismissed without a result', async () => {
      const ref = sheet.open<TestSheet, unknown, string>(TestSheet);
      await settle();

      let result: string | undefined = 'untouched';
      ref.afterDismissed().subscribe((value) => (result = value));
      // The harness's `dismiss()` presses Escape on the sheet for us; the ref's
      // `afterDismissed()` is what proves it closed with no result.
      await (await bottomSheetHarness()).dismiss();
      await settle();

      expect(result).toBeUndefined();
      expect(container()).toBeNull();
    });

    it('passes typed data to the component', async () => {
      const ref = sheet.open<TestSheet, { title: string }>(TestSheet, {
        data: { title: 'Atlas' },
      });
      await settle();

      expect(ref.instance.data).toEqual({ title: 'Atlas' });
      expect(container()!.querySelector('.data')?.textContent).toBe('Atlas');
    });

    it('opens a template too, with the data as its context', async () => {
      @Component({
        template: `
          <ng-template #tpl let-data let-ref="bottomSheetRef">
            <button class="from-template" (click)="ref.dismiss('email')">
              Share {{ data.title }}
            </button>
          </ng-template>
        `,
      })
      class TemplateHost {
        readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');
      }

      const fixture = TestBed.createComponent(TemplateHost);
      await fixture.whenStable();

      const ref = sheet.open<unknown, { title: string }, string>(fixture.componentInstance.tpl(), {
        data: { title: 'Atlas' },
      });
      await settle();

      expect(container()!.textContent).toContain('Share Atlas');

      let result: string | undefined;
      ref.afterDismissed().subscribe((value) => (result = value));
      container()!.querySelector<HTMLButtonElement>('.from-template')!.click();
      await settle();

      expect(result).toBe('email');
    });
  });

  // The panel class is what `styles/_bottom-sheet.scss` hangs the
  // `--ui-bottom-sheet-*` hooks off, so a missing one is an unthemed sheet.
  describe('panel class', () => {
    it('marks every sheet it opens', async () => {
      sheet.open(TestSheet);
      await settle();

      expect(pane()!.classList).toContain('ui-bottom-sheet-panel');
    });

    // Rule 4: a consumer's class must not silently strip the theme — theirs is
    // added to ours rather than replacing it, and lands last so their rules win
    // on equal specificity.
    it('merges a panelClass string with its own', async () => {
      sheet.open(TestSheet, { panelClass: 'tall' });
      await settle();

      expect([...pane()!.classList]).toEqual(
        expect.arrayContaining(['ui-bottom-sheet-panel', 'tall']),
      );
    });

    it('merges a panelClass array too', async () => {
      sheet.open(TestSheet, { panelClass: ['tall', 'branded'] });
      await settle();

      expect([...pane()!.classList]).toEqual(
        expect.arrayContaining(['ui-bottom-sheet-panel', 'tall', 'branded']),
      );
    });
  });

  // Rule 4: the config is Material's own, so nothing a consumer sets is swallowed.
  describe('per-call config', () => {
    it('passes Material’s own options straight through', async () => {
      const ref = sheet.open(TestSheet, {
        disableClose: true,
        hasBackdrop: false,
        ariaLabel: 'Share this post',
      });
      await settle();

      expect(ref.disableClose).toBe(true);
      expect(document.querySelector('.cdk-overlay-backdrop')).toBeNull();
      expect(await (await bottomSheetHarness()).getAriaLabel()).toBe('Share this post');
    });

    // `disableClose` is only honoured if it actually reached Material, and the
    // observable proof is a sheet that survives an Escape.
    it('keeps a disableClose sheet open under Escape', async () => {
      sheet.open(TestSheet, { disableClose: true });
      await settle();

      pressEscape();
      await settle();

      expect(container()).not.toBeNull();
    });

    it('lets a call override the defaults this service applies', async () => {
      sheet.open(TestSheet, { maxHeight: '40vh' });
      await settle();

      expect(pane()!.style.maxHeight).toBe('40vh');
    });
  });

  describe('defaults', () => {
    // The sizing lands on the overlay pane rather than on the container: Material
    // hands `maxHeight` to the CDK dialog, which sizes the overlay around the
    // sheet.
    it('applies the shipped maxHeight', async () => {
      sheet.open(TestSheet);
      await settle();

      expect(pane()!.style.maxHeight).toBe(UI_BOTTOM_SHEET_DEFAULT_VALUES.maxHeight);
    });

    // `autoFocus` is asserted on the config Material is handed rather than on
    // `document.activeElement`, because jsdom has no layout: the CDK decides what
    // is tabbable partly from an element's rendered size, so every button here
    // reads as unfocusable and the trap falls back to the container — whatever the
    // setting. Where the focus actually lands is checked by `npm run test:a11y`,
    // in a browser that can answer that question. This one holds the half a jsdom
    // spec can: that the default reaches Material at all.
    it('asks Material for focus on the first action', () => {
      const open = vi.spyOn(sheet.matBottomSheet, 'open');

      sheet.open(TestSheet);

      expect(open.mock.calls[0][1]).toMatchObject({ autoFocus: 'first-tabbable' });
    });

    it('takes an app’s overrides through the provider', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [noAnimations, provideUiBottomSheetDefaults({ maxHeight: '40vh' })],
      });
      sheet = TestBed.inject(BottomSheet);

      sheet.open(TestSheet);
      await settle();

      expect(pane()!.style.maxHeight).toBe('40vh');
    });

    // Merged over the shipped defaults, so an app that renames one does not have
    // to restate the others.
    it('leaves the defaults an app does not name alone', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [noAnimations, provideUiBottomSheetDefaults({ maxHeight: '40vh' })],
      });
      sheet = TestBed.inject(BottomSheet);
      const open = vi.spyOn(sheet.matBottomSheet, 'open');

      sheet.open(TestSheet);

      expect(open.mock.calls[0][1]).toMatchObject({
        maxHeight: '40vh',
        autoFocus: UI_BOTTOM_SHEET_DEFAULT_VALUES.autoFocus,
      });
    });

    // The two defaults systems compose rather than compete: this service passes
    // `maxHeight` and `autoFocus` on every call and so beats Material's token on
    // those two, but everything it leaves alone still reaches Material.
    it('leaves Material’s own default options in force', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          noAnimations,
          { provide: MAT_BOTTOM_SHEET_DEFAULT_OPTIONS, useValue: { hasBackdrop: false } },
        ],
      });
      sheet = TestBed.inject(BottomSheet);

      sheet.open(TestSheet);
      await settle();

      expect(document.querySelector('.cdk-overlay-backdrop')).toBeNull();
    });
  });

  describe('dismiss', () => {
    it('closes the open sheet with a result', async () => {
      const ref = sheet.open<TestSheet, unknown, string>(TestSheet);
      await settle();

      let result: string | undefined;
      ref.afterDismissed().subscribe((value) => (result = value));
      sheet.dismiss('email');
      await settle();

      expect(result).toBe('email');
      expect(container()).toBeNull();
    });

    it('does nothing when no sheet is open', () => {
      expect(() => sheet.dismiss()).not.toThrow();
    });
  });

  // The escape hatch (rule 4): the `MatBottomSheet` underneath is the same
  // instance this service delegates to, so a consumer reaching past the wrapper
  // is not talking to a second, unrelated service.
  it('exposes the MatBottomSheet it delegates to', () => {
    expect(sheet.matBottomSheet).toBe(TestBed.inject(MatBottomSheet));
  });
});
