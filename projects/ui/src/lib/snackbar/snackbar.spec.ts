import { Component, inject, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';

import {
  provideUiSnackbarDefaults,
  Snackbar,
  UI_SNACKBAR_DEFAULT_VALUES,
  type UiSnackbarVariant,
} from './snackbar';

const VARIANTS: readonly UiSnackbarVariant[] = ['success', 'error', 'info'];

/** The live snackbar's container element, or null when none is open. */
const container = (): HTMLElement | null => document.querySelector('.mat-mdc-snack-bar-container');

/** The action button, or null on a snackbar rendering none. */
const actionButton = (): HTMLButtonElement | null =>
  document.querySelector('.mat-mdc-snack-bar-container button');

/**
 * Renders whatever the last call did, so the DOM assertions see it.
 *
 * The microtask is Material's: a dismissed container reports its exit from a
 * `queueMicrotask`, and the overlay is only detached once it does — so a purely
 * synchronous tick would assert against a snackbar that is on its way out but
 * still in the DOM.
 */
const settle = async (): Promise<void> => {
  TestBed.tick();
  await Promise.resolve();
  TestBed.tick();
};

/**
 * Material's own switch for its enter/exit transitions.
 *
 * Without it a dismissed snackbar stays in the DOM until a `transitionend` that
 * never arrives in jsdom, so every close assertion here would be racing a
 * fallback timer. This is Material's public token rather than
 * `provideNoopAnimations()`, which is the same thing plus an animations module.
 */
const noAnimations = { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } };

describe('Snackbar', () => {
  let snackbar: Snackbar;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [noAnimations] });
    snackbar = TestBed.inject(Snackbar);
  });

  afterEach(async () => {
    // The overlay lives at the end of <body>, outside any fixture: a snackbar
    // left open would leak into the next spec's DOM queries.
    snackbar.dismiss();
    await settle();
  });

  describe('opening', () => {
    it('renders the message it is given', async () => {
      snackbar.success('Draft saved');
      await settle();

      expect(container()!.textContent).toContain('Draft saved');
    });

    it('renders the action label it is given', async () => {
      snackbar.info('Item archived', 'Undo');
      await settle();

      expect(actionButton()!.textContent?.trim()).toBe('Undo');
    });

    it('renders no action button for a message that needs none', async () => {
      snackbar.success('Draft saved');
      await settle();

      expect(actionButton()).toBeNull();
    });

    // The ref is Material's own, so `onAction()`, `afterDismissed()` and
    // `dismissWithAction()` are all still there — this service wraps the
    // defaults, not the API.
    it('returns Material’s own ref', () => {
      expect(snackbar.success('Draft saved')).toBeInstanceOf(MatSnackBarRef);
    });

    it('reports the action through the ref', async () => {
      const ref = snackbar.info('Item archived', 'Undo');
      await settle();

      let actioned = 0;
      ref.onAction().subscribe(() => actioned++);
      actionButton()!.click();
      await settle();

      expect(actioned).toBe(1);
    });

    // Material shows one snackbar at a time; the service must not change that.
    it('replaces the snackbar that is already open', async () => {
      snackbar.info('First');
      await settle();
      snackbar.success('Second');
      await settle();

      expect(container()!.textContent).toContain('Second');
      expect(container()!.textContent).not.toContain('First');
    });
  });

  // The panel classes are what `styles/_snackbar.scss` hangs the colour roles
  // off, so a missing or stale one is a snackbar painted as the wrong status.
  describe('variant', () => {
    for (const variant of VARIANTS) {
      it(`marks a ${variant} snackbar with its own class`, async () => {
        snackbar[variant]('Message');
        await settle();

        expect(container()!.classList).toContain('ui-snackbar');
        expect(container()!.classList).toContain(`ui-snackbar--${variant}`);
      });
    }

    it('carries exactly one variant class at a time', async () => {
      snackbar.error('Message');
      await settle();

      const classes = [...container()!.classList].filter((c) => c.startsWith('ui-snackbar--'));
      expect(classes).toEqual(['ui-snackbar--error']);
    });

    it('defaults to info when opened without a variant', async () => {
      snackbar.open('Message');
      await settle();

      expect(container()!.classList).toContain('ui-snackbar--info');
    });

    // `open()` is the one to call when the variant is a value rather than a
    // literal — the shorthands cannot be indexed by a signal.
    it('takes the variant from the config', async () => {
      snackbar.open('Message', undefined, { variant: 'error' });
      await settle();

      expect(container()!.classList).toContain('ui-snackbar--error');
    });
  });

  describe('defaults', () => {
    for (const variant of ['success', 'info'] as const) {
      it(`gives a ${variant} snackbar the 5s duration`, () => {
        const ref = snackbar[variant]('Message');

        expect(ref.containerInstance.snackBarConfig.duration).toBe(5000);
      });
    }

    // WCAG 2.2.1: a failure the user did not get to read before it timed out has
    // no recovery, so an error is the one message that waits for them.
    it('keeps an error up until it is dismissed', () => {
      const ref = snackbar.error('Could not reach the server');

      expect(ref.containerInstance.snackBarConfig.duration).toBe(0);
    });

    it('places every variant at the bottom centre', () => {
      for (const variant of VARIANTS) {
        const ref = snackbar[variant]('Message');

        expect(ref.containerInstance.snackBarConfig.horizontalPosition).toBe('center');
        expect(ref.containerInstance.snackBarConfig.verticalPosition).toBe('bottom');
      }
    });
  });

  // "Until dismissed" has to come with a way to dismiss it: a 0-duration toast
  // with no action sits over the page, and a keyboard or screen-reader user has
  // nothing to press.
  describe('a snackbar that never times out is always dismissible', () => {
    it('gives an error a Dismiss action when it is given none', async () => {
      snackbar.error('Could not reach the server');
      await settle();

      expect(actionButton()!.textContent?.trim()).toBe('Dismiss');
    });

    it('leaves the consumer’s own action alone', async () => {
      snackbar.error('Could not reach the server', 'Retry');
      await settle();

      expect(actionButton()!.textContent?.trim()).toBe('Retry');
    });

    it('dismisses the snackbar when the fallback action is pressed', async () => {
      snackbar.error('Could not reach the server');
      await settle();

      actionButton()!.click();
      await settle();

      expect(container()).toBeNull();
    });

    // The rule is about the duration, not about the variant: any snackbar a
    // consumer pins open needs the same guarantee.
    it('applies to any variant pinned open by config', async () => {
      snackbar.info('Working offline', undefined, { duration: 0 });
      await settle();

      expect(actionButton()!.textContent?.trim()).toBe('Dismiss');
    });

    it('adds nothing to a snackbar that times out on its own', async () => {
      snackbar.success('Draft saved');
      await settle();

      expect(actionButton()).toBeNull();
    });
  });

  // Rule 4: the config is Material's own, so nothing a consumer sets is
  // swallowed — and what they set wins over the variant's default.
  describe('per-call config', () => {
    it('lets the caller override the variant’s duration', () => {
      const ref = snackbar.error('Could not reach the server', 'Retry', { duration: 1000 });

      expect(ref.containerInstance.snackBarConfig.duration).toBe(1000);
    });

    it('lets the caller override the position', () => {
      const ref = snackbar.success('Draft saved', undefined, {
        verticalPosition: 'top',
        horizontalPosition: 'end',
      });

      expect(ref.containerInstance.snackBarConfig.verticalPosition).toBe('top');
      expect(ref.containerInstance.snackBarConfig.horizontalPosition).toBe('end');
    });

    it('lets the caller override the politeness', () => {
      const ref = snackbar.success('Draft saved', undefined, { politeness: 'assertive' });

      expect(ref.containerInstance.snackBarConfig.politeness).toBe('assertive');
    });

    it('passes Material’s own options straight through', () => {
      const ref = snackbar.info('Message', undefined, {
        direction: 'rtl',
        announcementMessage: 'Announced instead',
      });

      expect(ref.containerInstance.snackBarConfig.direction).toBe('rtl');
      expect(ref.containerInstance.snackBarConfig.announcementMessage).toBe('Announced instead');
    });

    // A consumer's class must not silently strip the variant's colours — theirs
    // is added to ours rather than replacing it, and lands last so their rules
    // win on equal specificity.
    it('merges a panelClass string with the variant’s classes', async () => {
      snackbar.success('Draft saved', undefined, { panelClass: 'wide' });
      await settle();

      expect([...container()!.classList]).toEqual(
        expect.arrayContaining(['ui-snackbar', 'ui-snackbar--success', 'wide']),
      );
    });

    it('merges a panelClass array too', async () => {
      snackbar.success('Draft saved', undefined, { panelClass: ['wide', 'sticky'] });
      await settle();

      expect([...container()!.classList]).toEqual(
        expect.arrayContaining(['ui-snackbar', 'ui-snackbar--success', 'wide', 'sticky']),
      );
    });

    it('does not leak the variant key into Material’s config', () => {
      const ref = snackbar.success('Draft saved');

      expect('variant' in ref.containerInstance.snackBarConfig).toBe(false);
    });
  });

  // Assertive interrupts a screen reader mid-sentence; polite waits its turn.
  // Announcing "Draft saved" by cutting the user off is the misuse the ARIA spec
  // warns about, so only the failure is assertive.
  describe('accessibility', () => {
    const EXPECTED: Record<UiSnackbarVariant, string> = {
      success: 'polite',
      info: 'polite',
      error: 'assertive',
    };

    for (const variant of VARIANTS) {
      it(`announces a ${variant} snackbar ${EXPECTED[variant]}ly`, () => {
        const ref = snackbar[variant]('Message');

        expect(ref.containerInstance.snackBarConfig.politeness).toBe(EXPECTED[variant]);
      });
    }
  });

  describe('dismiss', () => {
    it('closes the snackbar that is open', async () => {
      snackbar.info('Message');
      await settle();
      expect(container()).not.toBeNull();

      snackbar.dismiss();
      await settle();

      expect(container()).toBeNull();
    });

    it('does nothing when no snackbar is open', () => {
      expect(() => snackbar.dismiss()).not.toThrow();
    });
  });

  // Rule 7: a message and one action label cannot say everything — an icon, a
  // progress row, two actions. Material's own escape hatches, with our defaults.
  describe('custom content', () => {
    @Component({ template: `<span class="custom">Custom component</span>` })
    class CustomSnackbar {}

    it('opens a component with the variant’s defaults applied', async () => {
      const ref = snackbar.openFromComponent(CustomSnackbar, { variant: 'error' });
      await settle();

      expect(document.querySelector('.custom')).not.toBeNull();
      expect(container()!.classList).toContain('ui-snackbar--error');
      expect(ref.containerInstance.snackBarConfig.duration).toBe(0);
    });

    it('opens a template with the variant’s defaults applied', async () => {
      @Component({
        template: `<ng-template #tpl let-data>{{ data.message }}</ng-template>`,
      })
      class TemplateHost {
        readonly snackbar = inject(Snackbar);
        readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');
      }

      const fixture = TestBed.createComponent(TemplateHost);
      await fixture.whenStable();

      const ref = fixture.componentInstance.snackbar.openFromTemplate(
        fixture.componentInstance.tpl(),
        { variant: 'success', data: { message: 'From a template' } },
      );
      await settle();

      expect(container()!.textContent).toContain('From a template');
      expect(container()!.classList).toContain('ui-snackbar--success');
      expect(ref.containerInstance.snackBarConfig.duration).toBe(5000);
    });
  });

  describe('escape hatches', () => {
    it('exposes the MatSnackBar it delegates to', () => {
      expect(snackbar.matSnackBar).toBe(TestBed.inject(MatSnackBar));
    });
  });
});

// The defaults are injected rather than baked in, so an app tunes them once
// instead of passing the same config at every call site.
describe('provideUiSnackbarDefaults', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [noAnimations] });
  });

  afterEach(async () => {
    TestBed.inject(Snackbar).dismiss();
    await settle();
  });

  it('overrides the durations it names and keeps the rest', () => {
    TestBed.configureTestingModule({
      providers: [provideUiSnackbarDefaults({ duration: { success: 1000 } })],
    });
    const snackbar = TestBed.inject(Snackbar);

    expect(snackbar.success('Draft saved').containerInstance.snackBarConfig.duration).toBe(1000);
    expect(snackbar.info('Message').containerInstance.snackBarConfig.duration).toBe(
      UI_SNACKBAR_DEFAULT_VALUES.duration.info,
    );
    expect(snackbar.error('Failed').containerInstance.snackBarConfig.duration).toBe(0);
  });

  it('overrides the position for every variant', () => {
    TestBed.configureTestingModule({
      providers: [provideUiSnackbarDefaults({ verticalPosition: 'top' })],
    });
    const snackbar = TestBed.inject(Snackbar);

    expect(snackbar.info('Message').containerInstance.snackBarConfig.verticalPosition).toBe('top');
    expect(snackbar.info('Message').containerInstance.snackBarConfig.horizontalPosition).toBe(
      'center',
    );
  });

  it('renames the fallback dismiss action', async () => {
    TestBed.configureTestingModule({
      providers: [provideUiSnackbarDefaults({ dismissAction: 'Close' })],
    });
    TestBed.inject(Snackbar).error('Could not reach the server');
    await settle();

    expect(actionButton()!.textContent?.trim()).toBe('Close');
  });
});
