import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  applicationConfig,
  moduleMetadata,
  type Meta,
  type StoryObj,
} from '@storybook/angular-vite';
import { expect, waitFor } from 'storybook/test';

import { Button } from '../button/button';
import {
  provideUiSnackbarDefaults,
  Snackbar,
  type UiSnackbarConfig,
  type UiSnackbarVariant,
} from './snackbar';

const VARIANTS: UiSnackbarVariant[] = ['success', 'error', 'info'];

/** What each variant is actually for, said in the snackbar itself. */
const MESSAGES: Record<UiSnackbarVariant, string> = {
  success: 'Draft saved',
  error: 'We could not reach the server',
  info: 'Working offline — changes will sync when you reconnect',
};

/**
 * The consumer, as a consumer actually writes it: a component that injects the
 * service and calls it from a click handler. Every story on this page is one of
 * these — a snackbar has no element to render, so there is nothing else to show.
 *
 * The `switch` is the point. `success()`, `error()` and `info()` are three
 * methods rather than one method with a variant argument, so a call site reads
 * as what happened — `this.snackbar.success('Draft saved')` — rather than as a
 * configuration. (`open()` exists for the case this demo is really in: a variant
 * that is a *value*, which a literal method name cannot express.)
 */
@Component({
  selector: 'ui-snackbar-demo',
  imports: [MatButton, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      @for (variant of variants(); track variant) {
        <button matButton uiButton variant="filled" (click)="show(variant)">{{ variant }}</button>
      }

      <button matButton uiButton variant="text" (click)="snackbar.dismiss()">Dismiss</button>
    </div>
  `,
})
class SnackbarDemo {
  protected readonly snackbar = inject(Snackbar);

  /** Which buttons to render. */
  readonly variants = input<UiSnackbarVariant[]>(VARIANTS);

  /** The action label to offer, or nothing for a message with no action. */
  readonly action = input<string | undefined>(undefined);

  /** Anything else to hand the service — duration, position, panelClass. */
  readonly config = input<UiSnackbarConfig>({});

  protected show(variant: UiSnackbarVariant): void {
    const message = MESSAGES[variant];
    const action = this.action();
    const config = this.config();

    switch (variant) {
      case 'success':
        this.snackbar.success(message, action, config);
        break;
      case 'error':
        this.snackbar.error(message, action, config);
        break;
      case 'info':
        this.snackbar.info(message, action, config);
        break;
    }
  }
}

/**
 * The two messages that are worth an action, wired to what the action does.
 *
 * The ref is Material's own, so `onAction()` is where the work goes — this is
 * the whole of "undo" and "retry", and it is Material's API untouched.
 */
@Component({
  selector: 'ui-snackbar-action-demo',
  imports: [MatButton, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <button matButton uiButton variant="filled" (click)="archive()">Archive item</button>
      <button matButton uiButton variant="outlined" (click)="sync()">Sync now</button>
    </div>

    <p style="font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant);">
      {{ log() }}
    </p>
  `,
})
class SnackbarActionDemo {
  private readonly snackbar = inject(Snackbar);
  protected readonly log = signal('Press a button, then press the action in the snackbar.');

  protected archive(): void {
    this.snackbar
      .success('Item archived', 'Undo')
      .onAction()
      .subscribe(() => this.log.set('Undo pressed — the item is back.'));
  }

  protected sync(): void {
    this.snackbar
      .error('We could not reach the server', 'Retry')
      .onAction()
      .subscribe(() => this.log.set('Retry pressed — syncing again.'));
  }
}

/**
 * Restyling, with no `::ng-deep` and no `!important`.
 *
 * A snackbar renders into the CDK overlay at the end of `<body>`, so it is
 * outside every component's encapsulation already — which is why this demo is
 * `ViewEncapsulation.None`, exactly as a consumer's own global stylesheet would
 * be. The class reaches the container through `panelClass`, which is Material's
 * own config and is *merged* with the variant's classes rather than replacing
 * them, and the `--ui-snackbar-*` hooks do the rest.
 */
@Component({
  selector: 'ui-snackbar-styled-demo',
  imports: [MatButton, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: `
    .demo-branded {
      /* Pointed at another theme role rather than a literal, so this still
         follows the palette and dark mode. */
      --ui-snackbar-container-color: var(--mat-sys-tertiary);
      --ui-snackbar-text-color: var(--mat-sys-on-tertiary);
    }
  `,
  template: `
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <button matButton uiButton variant="filled" (click)="branded()">Branded snackbar</button>
    </div>
  `,
})
class SnackbarStyledDemo {
  private readonly snackbar = inject(Snackbar);

  protected branded(): void {
    this.snackbar.info('Painted from --ui-snackbar-* on a panelClass', 'Nice', {
      panelClass: 'demo-branded',
    });
  }
}

/**
 * Rule 7: a message and one action label cannot say everything — an icon, two
 * actions, a progress row. `openFromTemplate` is Material's own escape hatch,
 * with this library's defaults applied; the template's context is `config.data`
 * and the ref, so dismissing is `ref.dismiss()`.
 */
@Component({
  selector: 'ui-snackbar-template-demo',
  imports: [MatButton, Button, MatIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #tpl let-data let-ref="snackBarRef">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <mat-icon aria-hidden="true">cloud_off</mat-icon>
        <span style="flex: 1;">{{ data.message }}</span>
        <button matButton (click)="ref.dismiss()">Later</button>
        <button matButton (click)="ref.dismissWithAction()">Reconnect</button>
      </div>
    </ng-template>

    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <button matButton uiButton variant="filled" (click)="show()">Lose the connection</button>
    </div>
  `,
})
class SnackbarTemplateDemo {
  private readonly snackbar = inject(Snackbar);
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');

  protected show(): void {
    this.snackbar.openFromTemplate(this.tpl(), {
      variant: 'error',
      data: { message: 'The connection dropped' },
    });
  }
}

const meta: Meta<SnackbarDemo> = {
  title: 'Services/Snackbar',
  component: SnackbarDemo,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [SnackbarDemo, SnackbarActionDemo, SnackbarStyledDemo, SnackbarTemplateDemo],
    }),
  ],
  args: { variants: VARIANTS, action: undefined, config: {} },
  argTypes: {
    variants: { control: 'check', options: VARIANTS },
    action: { control: 'text' },
    config: { control: 'object' },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`Snackbar` is an injectable service rather than a component: a snackbar has no element in',
          'anyone’s template — it is opened from code, into the CDK overlay. So there is nothing to',
          'render on this page directly, and every story below is a *consumer*: a component that does',
          '`inject(Snackbar)` and calls it from a click handler, which is exactly how an app uses it.',
          'Press the buttons.',
          '',
          '### It is `MatSnackBar`, themed',
          '',
          'Every method mirrors one of Material’s, takes Material’s own `MatSnackBarConfig` (plus',
          '`variant`), and returns Material’s own `MatSnackBarRef` — so `onAction()`,',
          '`afterDismissed()` and `dismissWithAction()` are all still there. The variant is a class on',
          'Material’s own container, and that class re-points Material’s own tokens at the shared',
          'theme’s roles: there is not a literal colour in `styles/_snackbar.scss`, so every story',
          'below shows the exact palette a consuming app gets. Toggle your OS light/dark preference',
          'and watch them follow.',
          '',
          '### Colour comes from M3’s *bold* roles',
          '',
          'The opposite of `ui-alert`, which takes the quiet `-container` pair. A snackbar is a small',
          'floating chip over unrelated content, so it has to separate itself from whatever is behind',
          'it — which is why M3’s own snackbar is `inverse-surface`, the boldest surface in the',
          'system. `info` therefore adds no colour at all: a neutral toast is what Material’s snackbar',
          'already is. `error` takes M3’s own `error` role, and `success` the theme’s `--ui-sys-success`',
          '— the role this library adds because M3’s palette stops at primary/secondary/tertiary/error.',
          '',
          '### Defaults, and where to change them',
          '',
          '5 seconds and `polite` for `success` and `info`; `error` is `assertive` and stays until it is',
          'dismissed (see the Error story for why). Bottom centre. Override per call with the `config`',
          'argument, per app with `provideUiSnackbarDefaults()`, and anything else through',
          '`snackbar.matSnackBar` — the `MatSnackBar` underneath, unwrapped.',
        ].join('\n'),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<ui-snackbar-demo [variants]="variants" [action]="action" [config]="config" />`,
  }),
};

export default meta;
type Story = StoryObj<SnackbarDemo>;

/**
 * The three variants, each triggered from a button — the consumer this service
 * exists for. `success` and `info` fade after 5 seconds; `error` waits, and gets
 * a `Dismiss` action so that waiting is never a trap.
 *
 * Material shows one snackbar at a time, so each press replaces the last.
 */
export const Default: Story = {};

// --- Variants --------------------------------------------------------------

/**
 * `snackbar.success('Draft saved')` — the theme’s `--ui-sys-success` role,
 * announced politely, gone in 5 seconds. Nothing failed, so nothing is
 * interrupted and nothing has to be acknowledged.
 */
export const Success: Story = { args: { variants: ['success'] } };

/**
 * `snackbar.error('We could not reach the server')` — M3’s own `error` role,
 * announced assertively, and **it stays until dismissed**.
 *
 * A failure is the one message a user must not miss by looking away, and usually
 * the one they need to read twice before deciding what to do. WCAG 2.2.1 says as
 * much: a timed message the user cannot extend is a failure, and “it timed out
 * before I could read it” has no recovery. Since it never times out, it is given
 * a `Dismiss` action — see AlwaysDismissible.
 */
export const Error: Story = { args: { variants: ['error'] } };

/**
 * `snackbar.info('Working offline…')` — M3’s own snackbar colours
 * (`inverse-surface`), which is what a neutral toast already is. This variant
 * ships no colour override at all, the same way `uiButton`’s `primary` ships
 * none: it is already what Material’s tokens resolve to.
 */
export const Info: Story = { args: { variants: ['info'] } };

// --- Actions ---------------------------------------------------------------

/**
 * The second argument is the action label, and the returned ref is Material’s
 * own — so `onAction()` is where the work goes:
 *
 * ```ts
 * this.snackbar.success('Item archived', 'Undo').onAction().subscribe(() => this.restore());
 * ```
 *
 * Press a button, then press the action in the snackbar.
 */
export const WithAction: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({ template: `<ui-snackbar-action-demo />` }),
};

/**
 * An error given no action of its own still gets a `Dismiss` one, because it
 * never times out: a toast that cannot be dismissed sits over the page until a
 * route change, and a keyboard or screen-reader user has nothing to press.
 *
 * The rule follows the *duration*, not the variant — this story pins every
 * variant open with `duration: 0`, and all three get the action.
 */
export const AlwaysDismissible: Story = { args: { config: { duration: 0 } } };

// --- Config ----------------------------------------------------------------

/**
 * The `config` argument is Material’s own `MatSnackBarConfig` plus `variant`, so
 * nothing is swallowed — and what a call sets wins over the variant’s default.
 * Here every variant is pinned at 1.5 seconds, `error` included.
 */
export const Durations: Story = { args: { config: { duration: 1500 } } };

/**
 * `verticalPosition` / `horizontalPosition` are Material’s own, passed straight
 * through. The default is bottom centre — M3’s placement, and the one that keeps
 * a toast clear of the app bar and of a right-hand rail.
 */
export const Position: Story = {
  args: { config: { verticalPosition: 'top', horizontalPosition: 'end' } },
};

/**
 * `provideUiSnackbarDefaults()` moves a default once for a whole app instead of
 * at every call site. This story’s app is bootstrapped with top-positioned
 * snackbars and a 2-second success — and note the calls themselves pass no config
 * at all. The durations it does not name keep the shipped ones, so `error` still
 * waits.
 */
export const AppDefaults: Story = {
  name: 'provideUiSnackbarDefaults',
  parameters: { controls: { disable: true } },
  decorators: [
    applicationConfig({
      providers: [
        provideUiSnackbarDefaults({ verticalPosition: 'top', duration: { success: 2000 } }),
      ],
    }),
  ],
};

// --- Styling hooks ---------------------------------------------------------

/**
 * Rule 2, the `::ng-deep` test: restyling a snackbar is an ordinary rule on an
 * ordinary class. Pass a `panelClass` — Material’s own config, merged with the
 * variant’s classes rather than replacing them — and set the `--ui-snackbar-*`
 * hooks on it:
 *
 * ```css
 * .branded {
 *   --ui-snackbar-container-color: var(--mat-sys-tertiary);
 *   --ui-snackbar-text-color: var(--mat-sys-on-tertiary);
 * }
 * ```
 *
 * ```ts
 * this.snackbar.info('…', 'Nice', { panelClass: 'branded' });
 * ```
 *
 * `--ui-snackbar-button-color` is there too, for the action alone. Point them at
 * another `--mat-sys-*` / `--ui-sys-*` role rather than a literal, as this does,
 * so they survive a palette change and dark mode.
 */
export const StylingHooks: Story = {
  name: 'Styling hooks: --ui-snackbar-*',
  parameters: { controls: { disable: true } },
  render: () => ({ template: `<ui-snackbar-styled-demo />` }),
};

// --- Custom content --------------------------------------------------------

/**
 * Rule 7: a message and one action label cannot say everything — an icon, two
 * actions, a progress row. `openFromComponent` and `openFromTemplate` are
 * Material’s own escape hatches with this library’s defaults applied, so the
 * variant’s colours still come from the theme.
 *
 * The template’s implicit context is `config.data`, and `snackBarRef` is the ref
 * — so a button is `(click)="ref.dismiss()"`. Nothing is added to custom content,
 * which is why *this* snackbar owns its own dismissal.
 */
export const CustomContent: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({ template: `<ui-snackbar-template-demo />` }),
};

// --- Interaction -----------------------------------------------------------

/**
 * The whole lifecycle, asserted in a real browser: press the `success` button,
 * the toast opens into the CDK overlay with its message in a `polite` live
 * region, and the `Dismiss` button closes it.
 *
 * A snackbar is the one overlay this page can only *describe* until something
 * presses a button — it is opened from code, into an overlay outside the story's
 * canvas. This runs that button, reads the live message back out of the overlay,
 * and asserts it is gone again, so "opens → content present → dismisses" fails
 * loudly rather than sitting in the prose.
 */
export const OpenContentDismiss: Story = {
  name: 'Interaction: open → content → dismiss',
  args: { variants: ['success'] },
  parameters: { controls: { disable: true } },
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    const buttons = Array.from(canvasElement.querySelectorAll('button'));

    // The success variant's own button, not the trailing `Dismiss` control.
    buttons.find((b) => b.textContent?.trim() === 'success')!.click();

    // The message is what a success toast reports, and it is announced politely
    // — nothing failed, so nothing interrupts a screen reader mid-sentence.
    const container = await waitFor(() => {
      const el = doc.querySelector<HTMLElement>('.mat-mdc-snack-bar-container');
      expect(el).toBeTruthy();
      expect(el!.textContent).toContain('Draft saved');
      expect(el!.querySelector('[aria-live="polite"]')).toBeTruthy();
      return el!;
    });

    buttons.find((b) => b.textContent?.trim() === 'Dismiss')!.click();

    await waitFor(() => expect(container.isConnected).toBe(false));
  },
};
