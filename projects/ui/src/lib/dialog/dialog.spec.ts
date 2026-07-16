import { Component, inject, signal, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';

import { ConfirmDialog } from './confirm-dialog';
import { Dialog, provideUiDialogDefaults, UI_DIALOG_DEFAULT_VALUES } from './dialog';
import { DialogActions, DialogLayout, DialogTitle } from './dialog-layout';

/** The live dialog's container element, or null when none is open. */
const container = (): HTMLElement | null => document.querySelector('.mat-mdc-dialog-container');

/** The overlay pane the panel classes land on. */
const pane = (): HTMLElement | null => document.querySelector('.cdk-overlay-pane');

/** A throwaway host: `documentRootLoader` needs a fixture to hook into the TestBed,
 *  even though the dialog itself lives in the document-root overlay, not in it. */
@Component({ template: '' })
class HarnessHost {}

// `MatDialogHarness` speaks Material's *public* test surface — `getRole()`,
// `getAriaLabelledby()`, `getContentText()` — instead of reading the dialog
// container's attributes and MDC class names by hand. The harness locates the open
// dialog in the CDK overlay for us. The service ref (`afterClosed()`, `id`,
// `disableClose`), the `.ui-dialog-panel` theme class, focus management and the
// Escape-to-close mechanism are all things the harness has no say over, so those
// stay ref/DOM assertions.
const dialogHarness = (): Promise<MatDialogHarness> =>
  TestbedHarnessEnvironment.documentRootLoader(TestBed.createComponent(HarnessHost)).getHarness(
    MatDialogHarness,
  );

/** Every button in the open dialog, in DOM order — cancel first, confirm last. */
const buttons = (): HTMLButtonElement[] => [
  ...(container()?.querySelectorAll('button') ?? []),
];

const buttonLabels = (): string[] => buttons().map((b) => b.textContent!.trim());

/**
 * Renders whatever the last call did, so the DOM assertions see it.
 *
 * The microtask matters twice over here: Material's dialog attaches and detaches
 * its overlay from promise callbacks, and `MatDialogTitle` registers itself with
 * the container from a `Promise.resolve().then()` — so `aria-labelledby` is not
 * set until one has drained. A purely synchronous tick would assert against a
 * half-built dialog.
 */
const settle = async (): Promise<void> => {
  TestBed.tick();
  await Promise.resolve();
  TestBed.tick();
  await Promise.resolve();
  TestBed.tick();
};

/**
 * Material's own switch for its enter/exit transitions.
 *
 * Without it a closed dialog stays in the DOM until a `transitionend` that never
 * arrives in jsdom, so every close assertion here would be racing a fallback
 * timer. This is Material's public token rather than `provideNoopAnimations()`,
 * which is the same thing plus an animations module.
 */
const noAnimations = { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } };

/**
 * Presses Escape the way a user does — on `body`, which is where the CDK's
 * overlay keyboard dispatcher listens.
 *
 * `keyCode` rather than `key`, because that is what the CDK actually reads
 * (`event.keyCode === ESCAPE`), and a `KeyboardEvent` built from `key` alone
 * reports `keyCode: 0` — an Escape the dialog would ignore.
 */
const pressEscape = (): void => {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
  Object.defineProperty(event, 'keyCode', { get: () => 27 });
  document.body.dispatchEvent(event);
};

/** A consumer's own dialog component: `<ui-dialog>` in an ordinary component. */
@Component({
  selector: 'ui-test-dialog',
  imports: [DialogLayout, DialogTitle, DialogActions],
  template: `
    <ui-dialog [actionsAlign]="align()">
      @if (withTitle()) {
        <!-- Two spellings of the same heading: id is an input on Material's
             title directive, so there is no "unset" value to bind - leaving the
             attribute off is what lets Material generate one. -->
        @if (titleId(); as id) {
          <h2 uiDialogTitle [id]="id">Rename project</h2>
        } @else {
          <h2 uiDialogTitle>Rename project</h2>
        }
      }
      <p>Body copy</p>
      @if (data) {
        <p class="data">{{ data.name }}</p>
      }
      @if (withActions()) {
        <button uiDialogActions (click)="ref.close('renamed')">Rename</button>
      }
    </ui-dialog>
  `,
})
class TestDialog {
  readonly ref = inject<MatDialogRef<TestDialog, string>>(MatDialogRef);
  readonly data = inject<{ name: string } | null>(MAT_DIALOG_DATA, { optional: true });
  readonly align = signal<'start' | 'center' | 'end'>('end');
  readonly withTitle = signal(true);
  readonly withActions = signal(true);
  readonly titleId = signal('');
}

describe('Dialog', () => {
  let dialog: Dialog;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [noAnimations] });
    dialog = TestBed.inject(Dialog);
  });

  afterEach(async () => {
    // The overlay lives at the end of <body>, outside any fixture: a dialog left
    // open would leak into the next spec's DOM queries.
    dialog.closeAll();
    await settle();
  });

  describe('open', () => {
    it('renders the component it is given', async () => {
      dialog.open(TestDialog);
      await settle();

      expect(container()!.textContent).toContain('Rename project');
      expect(container()!.textContent).toContain('Body copy');
    });

    // The ref is Material's own, so `afterClosed()`, `backdropClick()`,
    // `keydownEvents()` and `updateSize()` are all still there — this service
    // wraps the theme and the defaults, not the API.
    it('returns Material’s own ref', () => {
      expect(dialog.open(TestDialog)).toBeInstanceOf(MatDialogRef);
    });

    it('carries the result back through afterClosed', async () => {
      const ref = dialog.open<TestDialog, unknown, string>(TestDialog);
      await settle();

      let result: string | undefined;
      ref.afterClosed().subscribe((value) => (result = value));
      ref.componentInstance.ref.close('renamed');
      await settle();

      expect(result).toBe('renamed');
    });

    it('opens a template too', async () => {
      @Component({ template: `<ng-template #tpl>From a template</ng-template>` })
      class TemplateHost {
        readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');
      }

      const fixture = TestBed.createComponent(TemplateHost);
      await fixture.whenStable();

      dialog.open(fixture.componentInstance.tpl());
      await settle();

      expect(container()!.textContent).toContain('From a template');
    });
  });

  // The panel class is what `styles/_dialog.scss` hangs the `--ui-dialog-*` hooks
  // off, so a missing one is an unthemed dialog.
  describe('panel class', () => {
    it('marks every dialog it opens', async () => {
      dialog.open(TestDialog);
      await settle();

      expect(pane()!.classList).toContain('ui-dialog-panel');
    });

    it('marks the built-in confirm too', async () => {
      dialog.confirm({ title: 'Discard draft?' });
      await settle();

      expect(pane()!.classList).toContain('ui-dialog-panel');
    });

    // Rule 4: a consumer's class must not silently strip the theme — theirs is
    // added to ours rather than replacing it, and lands last so their rules win
    // on equal specificity.
    it('merges a panelClass string with its own', async () => {
      dialog.open(TestDialog, { panelClass: 'wide' });
      await settle();

      expect([...pane()!.classList]).toEqual(
        expect.arrayContaining(['ui-dialog-panel', 'wide']),
      );
    });

    it('merges a panelClass array too', async () => {
      dialog.open(TestDialog, { panelClass: ['wide', 'branded'] });
      await settle();

      expect([...pane()!.classList]).toEqual(
        expect.arrayContaining(['ui-dialog-panel', 'wide', 'branded']),
      );
    });
  });

  // Rule 4: the config is Material's own, so nothing a consumer sets is swallowed.
  describe('per-call config', () => {
    it('passes Material’s own options straight through', async () => {
      const ref = dialog.open(TestDialog, {
        id: 'rename',
        width: '30rem',
        disableClose: true,
        direction: 'rtl',
        hasBackdrop: false,
      });
      await settle();

      expect(ref.id).toBe('rename');
      expect(ref.componentInstance.ref.disableClose).toBe(true);
      expect(pane()!.style.width).toBe('30rem');
      expect(document.querySelector('.cdk-overlay-backdrop')).toBeNull();
    });

    it('passes data to the component', async () => {
      const ref = dialog.open<TestDialog, { name: string }>(TestDialog, {
        data: { name: 'Atlas' },
      });
      await settle();

      expect(ref.componentInstance.data).toEqual({ name: 'Atlas' });
      expect(container()!.querySelector('.data')?.textContent).toBe('Atlas');
    });
  });

  describe('confirm', () => {
    it('renders the title and the message', async () => {
      dialog.confirm({ title: 'Discard draft?', message: 'This cannot be undone.' });
      await settle();

      expect(container()!.textContent).toContain('Discard draft?');
      expect(container()!.textContent).toContain('This cannot be undone.');
    });

    // The order is the whole of the "focus lands on the safe button" guarantee:
    // Material's own `autoFocus: 'first-tabbable'` is left alone, so whichever
    // button is first in the DOM is the one armed under a stray Enter. Cancel is.
    it('renders a cancel and a confirm button, cancel first', async () => {
      dialog.confirm({ title: 'Discard draft?' });
      await settle();

      expect(buttonLabels()).toEqual(['Cancel', 'Confirm']);
    });

    it('uses the labels it is given', async () => {
      dialog.confirm({ title: 'Discard draft?', confirm: 'Discard', cancel: 'Keep editing' });
      await settle();

      expect(buttonLabels()).toEqual(['Keep editing', 'Discard']);
    });

    it('closes with true when the confirming button is pressed', async () => {
      const ref = dialog.confirm({ title: 'Discard draft?' });
      await settle();

      let result: boolean | undefined;
      ref.afterClosed().subscribe((value) => (result = value));
      buttons()[1].click();
      await settle();

      expect(result).toBe(true);
      expect(container()).toBeNull();
    });

    it('closes with false when the cancelling button is pressed', async () => {
      const ref = dialog.confirm({ title: 'Discard draft?' });
      await settle();

      let result: boolean | undefined;
      ref.afterClosed().subscribe((value) => (result = value));
      buttons()[0].click();
      await settle();

      expect(result).toBe(false);
    });

    // Documented as "true means confirmed, anything else does not" — this is the
    // "anything else".
    it('closes with undefined when it is dismissed', async () => {
      const ref = dialog.confirm({ title: 'Discard draft?' });
      await settle();

      let closed = false;
      let result: boolean | undefined = true;
      ref.afterClosed().subscribe((value) => {
        closed = true;
        result = value;
      });
      pressEscape();
      await settle();

      expect(closed).toBe(true);
      expect(result).toBeUndefined();
    });

    it('renders no message when it is given none', async () => {
      dialog.confirm({ title: 'Discard draft?' });
      await settle();

      expect(container()!.textContent).toContain('Discard draft?');
      expect(container()!.querySelector('[id^="ui-dialog-message-"]')).toBeNull();
    });

    // Rule 7: a string cannot say everything — a list of what will be deleted, a
    // bolded filename.
    it('renders a TemplateRef message', async () => {
      @Component({
        template: `<ng-template #tpl><b class="custom">report.pdf</b></ng-template>`,
      })
      class TemplateHost {
        readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');
      }

      const fixture = TestBed.createComponent(TemplateHost);
      await fixture.whenStable();

      dialog.confirm({ title: 'Delete file?', message: fixture.componentInstance.tpl() });
      await settle();

      expect(container()!.querySelector('.custom')?.textContent).toBe('report.pdf');
    });

    // The colour is resolved from the theme's palettes by `styles/_button.scss`,
    // off the class `uiButton` puts on the host — so a missing class is a
    // destructive button that looks like the safe one.
    it('colours the confirming button from the theme', async () => {
      dialog.confirm({ title: 'Delete?', confirmColor: 'warn' });
      await settle();

      expect(buttons()[1].classList).toContain('ui-button--warn');
    });

    it('leaves the confirming button primary by default', async () => {
      dialog.confirm({ title: 'Discard draft?' });
      await settle();

      expect(buttons()[1].classList).not.toContain('ui-button--warn');
    });

    it('drops the cancel button when cancel is null', async () => {
      dialog.confirm({ title: 'Session expired', cancel: null });
      await settle();

      expect(buttonLabels()).toEqual(['Confirm']);
    });

    it('takes Material’s config, minus data', async () => {
      const ref = dialog.confirm({ title: 'Discard draft?' }, { id: 'discard', width: '20rem' });
      await settle();

      expect(ref.id).toBe('discard');
      expect(pane()!.style.width).toBe('20rem');
    });
  });

  describe('alert', () => {
    it('renders a single button', async () => {
      dialog.alert({ title: 'Your session has expired' });
      await settle();

      expect(buttonLabels()).toEqual(['OK']);
    });

    it('uses the label it is given', async () => {
      dialog.alert({ title: 'Your session has expired', confirm: 'Sign in' });
      await settle();

      expect(buttonLabels()).toEqual(['Sign in']);
    });

    it('closes with true when the button is pressed', async () => {
      const ref = dialog.alert({ title: 'Your session has expired' });
      await settle();

      let result: boolean | undefined;
      ref.afterClosed().subscribe((value) => (result = value));
      buttons()[0].click();
      await settle();

      expect(result).toBe(true);
    });

    it('renders the message', async () => {
      dialog.alert({ title: 'Session expired', message: 'Sign in again to continue.' });
      await settle();

      expect(container()!.textContent).toContain('Sign in again to continue.');
    });
  });

  /**
   * The point of building on `MatDialog`: none of this is reimplemented here, so
   * these assert that the wiring reaches Material rather than that this library
   * re-solved a solved problem.
   */
  describe('accessibility', () => {
    it('names the dialog by the projected title element', async () => {
      dialog.open(TestDialog);
      await settle();

      const labelledBy = await (await dialogHarness()).getAriaLabelledby();
      expect(labelledBy).toBeTruthy();
      expect(document.getElementById(labelledBy!)?.textContent).toBe('Rename project');
    });

    // Rule 3: an `id` a consumer writes on their own heading has to be the id
    // Material then names the dialog by — not one their attribute silently lost
    // to Material's generated default.
    it('honours an id written on the title', async () => {
      const ref = dialog.open(TestDialog);
      ref.componentInstance.titleId.set('my-title');
      await settle();

      expect(await (await dialogHarness()).getAriaLabelledby()).toBe('my-title');
    });

    it('gives a dialog with no title no name to point at', async () => {
      const ref = dialog.open(TestDialog);
      ref.componentInstance.withTitle.set(false);
      await settle();

      expect(await (await dialogHarness()).getAriaLabelledby()).toBeNull();
    });

    it('marks a confirm as an alertdialog', async () => {
      dialog.confirm({ title: 'Discard draft?' });
      await settle();

      expect(await (await dialogHarness()).getRole()).toBe('alertdialog');
    });

    it('leaves an ordinary dialog on Material’s own role', async () => {
      dialog.open(TestDialog);
      await settle();

      expect(await (await dialogHarness()).getRole()).toBe('dialog');
    });

    it('describes a confirm by its message', async () => {
      dialog.confirm({ title: 'Discard draft?', message: 'This cannot be undone.' });
      await settle();

      const describedBy = await (await dialogHarness()).getAriaDescribedby();
      expect(describedBy).toBeTruthy();
      expect(document.getElementById(describedBy!)?.textContent?.trim()).toBe(
        'This cannot be undone.',
      );
    });

    // A dangling `aria-describedby` is worse than none: it points at nothing.
    it('describes a message-less confirm by nothing', async () => {
      dialog.confirm({ title: 'Discard draft?' });
      await settle();

      expect(await (await dialogHarness()).getAriaDescribedby()).toBeNull();
    });

    it('lets the caller override the description', async () => {
      dialog.confirm({ title: 'Discard draft?', message: 'Gone.' }, { ariaDescribedBy: 'mine' });
      await settle();

      expect(await (await dialogHarness()).getAriaDescribedby()).toBe('mine');
    });

    /**
     * Material's, not ours: focus lands inside the dialog rather than being left
     * behind the backdrop on a control the user can no longer see.
     *
     * Which element inside it cannot be asserted here. Material's default is
     * `autoFocus: 'first-tabbable'`, and the CDK decides what is tabbable from
     * layout — which jsdom does not do, so every candidate measures 0×0, none
     * qualifies, and the focus trap falls back to the container. In a real browser
     * this is the cancel button, because it is first in the DOM (see the confirm
     * tests). So this asserts the part that holds in both: focus moved, and it
     * moved into the dialog.
     */
    it('moves focus into the dialog on open', async () => {
      dialog.confirm({ title: 'Discard draft?' });
      await settle();

      expect(container()!.contains(document.activeElement)).toBe(true);
    });

    it('restores focus to the element that opened it', async () => {
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      trigger.focus();

      const ref = dialog.confirm({ title: 'Discard draft?' });
      await settle();
      expect(document.activeElement).not.toBe(trigger);

      ref.close(false);
      await settle();

      expect(document.activeElement).toBe(trigger);
      trigger.remove();
    });

    it('closes on Escape', async () => {
      dialog.open(TestDialog);
      await settle();

      pressEscape();
      await settle();

      expect(container()).toBeNull();
    });

    it('does not close on Escape when the caller disables it', async () => {
      dialog.open(TestDialog, { disableClose: true });
      await settle();

      pressEscape();
      await settle();

      expect(container()).not.toBeNull();
    });

    // Material's answer to `aria-modal`: the rest of the page is hidden from a
    // screen reader outright, which is why `ariaModal` is off by default and this
    // library does not turn it on — it would also hide the overlays a `ui-select`
    // inside the dialog renders into.
    it('hides the rest of the page from assistive tech', async () => {
      const outside = document.createElement('div');
      document.body.appendChild(outside);

      dialog.open(TestDialog);
      await settle();
      expect(outside.getAttribute('aria-hidden')).toBe('true');

      dialog.closeAll();
      await settle();

      expect(outside.getAttribute('aria-hidden')).toBeNull();
      outside.remove();
    });

    it('passes ariaModal through for a dialog that wants it', async () => {
      dialog.open(TestDialog, { ariaModal: true });
      await settle();

      expect(container()!.getAttribute('aria-modal')).toBe('true');
    });
  });

  describe('managing open dialogs', () => {
    it('tracks the dialogs that are open', async () => {
      expect(dialog.openDialogs.length).toBe(0);

      dialog.open(TestDialog);
      dialog.confirm({ title: 'Discard draft?' });
      await settle();

      expect(dialog.openDialogs.length).toBe(2);
    });

    it('finds a dialog by its id', async () => {
      const ref = dialog.open(TestDialog, { id: 'rename' });
      await settle();

      expect(dialog.getDialogById('rename')).toBe(ref);
      expect(dialog.getDialogById('nope')).toBeUndefined();
    });

    it('closes every open dialog', async () => {
      dialog.open(TestDialog);
      dialog.confirm({ title: 'Discard draft?' });
      await settle();

      dialog.closeAll();
      await settle();

      expect(dialog.openDialogs.length).toBe(0);
      expect(container()).toBeNull();
    });

    // Subscribed *after* opening on purpose: Material's stream replays a
    // `startWith(undefined)` to anyone who subscribes while nothing is open, so
    // subscribing first would count an emission that is not a close.
    it('reports when the last dialog has closed', async () => {
      dialog.open(TestDialog);
      await settle();

      let allClosed = 0;
      dialog.afterAllClosed.subscribe(() => allClosed++);
      dialog.closeAll();
      await settle();

      expect(allClosed).toBe(1);
    });
  });

  describe('escape hatches', () => {
    it('exposes the MatDialog it delegates to', () => {
      expect(dialog.matDialog).toBe(TestBed.inject(MatDialog));
    });
  });
});

describe('DialogLayout', () => {
  let dialog: Dialog;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [noAnimations] });
    dialog = TestBed.inject(Dialog);
  });

  afterEach(async () => {
    dialog.closeAll();
    await settle();
  });

  it('projects the body into Material’s scrolling content', async () => {
    dialog.open(TestDialog);
    await settle();

    // `getContentText()` reads Material's own `mat-dialog-content` region — the
    // proof the body was projected into it rather than left loose in the container.
    expect(await (await dialogHarness()).getContentText()).toContain('Body copy');
  });

  it('projects the actions into Material’s actions row', async () => {
    dialog.open(TestDialog);
    await settle();

    expect(await (await dialogHarness()).getActionsText()).toBe('Rename');
  });

  // The heading is Material's title element itself, not something wrapped in one
  // — which is what lets `aria-labelledby` point at the real heading.
  it('makes the projected heading Material’s own title', async () => {
    dialog.open(TestDialog);
    await settle();

    const title = container()!.querySelector('h2');
    expect(title?.classList).toContain('mat-mdc-dialog-title');
  });

  // The alignment is a class Material puts on its own actions row from its
  // `align` input — so these assert that `actionsAlign` reaches that input,
  // rather than that this library laid the row out itself.
  it('aligns the actions at the end by default', async () => {
    dialog.open(TestDialog);
    await settle();

    expect(container()!.querySelector('.mat-mdc-dialog-actions')?.classList).toContain(
      'mat-mdc-dialog-actions-align-end',
    );
  });

  it('aligns the actions where it is told', async () => {
    const ref = dialog.open(TestDialog);
    ref.componentInstance.align.set('start');
    await settle();

    const actions = container()!.querySelector('.mat-mdc-dialog-actions')!;
    expect(actions.classList).toContain('mat-mdc-dialog-actions-align-start');
    expect(actions.classList).not.toContain('mat-mdc-dialog-actions-align-end');
  });

  // An empty region would still cost its padding — 52px of it for the actions row.
  it('renders no actions row when nothing is marked', async () => {
    const ref = dialog.open(TestDialog);
    ref.componentInstance.withActions.set(false);
    await settle();

    expect(container()!.querySelector('.mat-mdc-dialog-actions')).toBeNull();
  });

  it('renders no title when nothing is marked', async () => {
    const ref = dialog.open(TestDialog);
    ref.componentInstance.withTitle.set(false);
    await settle();

    expect(container()!.querySelector('.mat-mdc-dialog-title')).toBeNull();
    expect(container()!.textContent).toContain('Body copy');
  });

  /**
   * A scrolling body has to be reachable from the keyboard, and a body that fits
   * must not be a tab stop. Material does neither, so `<ui-dialog>` does.
   *
   * The overflow has to be faked: jsdom does no layout, so every element reports
   * `scrollHeight` and `clientHeight` as 0 and nothing ever appears to scroll.
   * Stubbing the two properties the component actually reads is what lets the
   * decision be tested here at all — the real measurement is covered by the
   * Scrolling story, which axe checks in a real browser.
   */
  describe('a scrolling body is keyboard-reachable', () => {
    /**
     * Fakes the layout jsdom does not do.
     *
     * Every element there reports `scrollHeight` and `clientHeight` as 0, so
     * nothing ever appears to overflow. Stubbed on the prototype and *before* the
     * dialog opens, because the measurement happens as the body first renders —
     * an element-level stub applied afterwards would arrive too late.
     */
    const stubLayout = (scrollHeight: number, clientHeight: number): void => {
      vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(scrollHeight);
      vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(clientHeight);
    };

    afterEach(() => vi.restoreAllMocks());

    const content = (): Element => container()!.querySelector('.mat-mdc-dialog-content')!;

    it('leaves a body that fits out of the tab order', async () => {
      stubLayout(100, 100);
      dialog.open(TestDialog);
      await settle();

      expect(content().hasAttribute('tabindex')).toBe(false);
    });

    it('makes an overflowing body focusable', async () => {
      stubLayout(500, 100);
      dialog.open(TestDialog);
      await settle();

      expect(content().getAttribute('tabindex')).toBe('0');
    });
  });
});

// The labels are injected rather than baked in, because they are the strings a
// non-English app has to translate — once, rather than at every call site.
describe('provideUiDialogDefaults', () => {
  afterEach(async () => {
    TestBed.inject(Dialog).closeAll();
    await settle();
  });

  it('renames the confirm and cancel buttons', async () => {
    TestBed.configureTestingModule({
      providers: [noAnimations, provideUiDialogDefaults({ confirmLabel: 'Confirmer', cancelLabel: 'Annuler' })],
    });
    TestBed.inject(Dialog).confirm({ title: 'Abandonner le brouillon ?' });
    await settle();

    expect(buttonLabels()).toEqual(['Annuler', 'Confirmer']);
  });

  it('renames the alert button', async () => {
    TestBed.configureTestingModule({
      providers: [noAnimations, provideUiDialogDefaults({ dismissLabel: "D'accord" })],
    });
    TestBed.inject(Dialog).alert({ title: 'Session expirée' });
    await settle();

    expect(buttonLabels()).toEqual(["D'accord"]);
  });

  it('keeps the labels it does not name', async () => {
    TestBed.configureTestingModule({
      providers: [noAnimations, provideUiDialogDefaults({ confirmLabel: 'Yes' })],
    });
    TestBed.inject(Dialog).confirm({ title: 'Discard draft?' });
    await settle();

    expect(buttonLabels()).toEqual([UI_DIALOG_DEFAULT_VALUES.cancelLabel, 'Yes']);
  });

  it('still lets a call name its own', async () => {
    TestBed.configureTestingModule({
      providers: [noAnimations, provideUiDialogDefaults({ confirmLabel: 'Confirmer' })],
    });
    TestBed.inject(Dialog).confirm({ title: 'Discard draft?', confirm: 'Discard' });
    await settle();

    expect(buttonLabels()).toEqual(['Cancel', 'Discard']);
  });
});

// The type parameter of the ref `confirm()` hands back, so it has to stay
// exported for a consumer to name that ref.
describe('ConfirmDialog', () => {
  it('is what confirm opens', async () => {
    TestBed.configureTestingModule({ providers: [noAnimations] });
    const dialog = TestBed.inject(Dialog);

    const ref = dialog.confirm({ title: 'Discard draft?' });
    await settle();

    expect(ref.componentInstance).toBeInstanceOf(ConfirmDialog);

    dialog.closeAll();
    await settle();
  });
});
