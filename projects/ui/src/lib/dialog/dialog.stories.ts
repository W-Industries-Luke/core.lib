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
import { MAT_DIALOG_DATA, MatDialogClose } from '@angular/material/dialog';
import {
  applicationConfig,
  moduleMetadata,
  type Meta,
  type StoryObj,
} from '@storybook/angular-vite';
import { expect, waitFor } from 'storybook/test';

import { Button, type UiButtonColor } from '../button/button';
import { Input } from '../input/input';
import { Dialog, provideUiDialogDefaults, type UiDialogConfig } from './dialog';
import {
  DialogActions,
  DialogLayout,
  DialogTitle,
  type UiDialogActionsAlign,
} from './dialog-layout';

/**
 * The consumer, as a consumer actually writes it: a component that injects the
 * service and calls it from a click handler. Every story on this page is one of
 * these — a dialog has no element to render, so there is nothing else to show.
 *
 * The result is the point. `afterClosed()` is Material's own, and `confirm()`
 * closes with `true` from the confirming button, `false` from the cancelling one
 * and `undefined` from Escape or the backdrop — so a call site only ever acts on
 * `true`.
 */
@Component({
  selector: 'ui-dialog-demo',
  imports: [MatButton, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <button matButton uiButton variant="filled" (click)="ask()">{{ trigger() }}</button>
    </div>

    <p style="font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant);">
      {{ log() }}
    </p>
  `,
})
class DialogDemo {
  private readonly dialog = inject(Dialog);

  /** The label of the button that opens the dialog. */
  readonly trigger = input('Discard draft');

  /** The question, as a heading. */
  readonly title = input('Discard draft?');

  /** The consequence, under the title. */
  readonly message = input<string | undefined>(
    'Everything you have written since the last save will be lost.',
  );

  /** The confirming button's label. Leave unset for the app's own default. */
  readonly confirm = input<string | undefined>(undefined);

  /** The cancelling button's label, or `null` for a dialog with nothing to cancel. */
  readonly cancel = input<string | null | undefined>(undefined);

  /** The confirming button's semantic colour, resolved from the theme's palettes. */
  readonly confirmColor = input<UiButtonColor | undefined>(undefined);

  /** Anything else to hand Material — width, disableClose, panelClass, position. */
  readonly config = input<Omit<UiDialogConfig<never>, 'data'>>({});

  protected readonly log = signal('Press the button.');

  protected ask(): void {
    this.dialog
      .confirm(
        {
          title: this.title(),
          message: this.message(),
          confirm: this.confirm(),
          cancel: this.cancel(),
          confirmColor: this.confirmColor(),
        },
        this.config(),
      )
      .afterClosed()
      .subscribe((confirmed) =>
        this.log.set(
          confirmed === true
            ? 'Confirmed — this is where the work goes.'
            : `Not confirmed (the result was ${confirmed}), so nothing happened.`,
        ),
      );
  }
}

/**
 * `alert()`: a statement with a single button and nothing to cancel.
 *
 * Deliberately paired with the snackbar it is usually the wrong answer to — a
 * modal blocks the page and takes focus, which is a lot to charge for a message
 * nobody has to answer.
 */
@Component({
  selector: 'ui-dialog-alert-demo',
  imports: [MatButton, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <button matButton uiButton variant="filled" (click)="expire()">Expire the session</button>
    </div>
  `,
})
class DialogAlertDemo {
  private readonly dialog = inject(Dialog);

  protected expire(): void {
    this.dialog.alert({
      title: 'Your session has expired',
      message: 'Sign in again to pick up where you left off.',
      confirm: 'Sign in',
    });
  }
}

/**
 * Rule 7: a string cannot say everything — a list of what will be deleted, a
 * bolded filename. `message` takes a `TemplateRef`, and the dialog's
 * `aria-describedby` still points at it, so the consequence is announced with the
 * name.
 */
@Component({
  selector: 'ui-dialog-template-demo',
  imports: [MatButton, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #tpl>
      <p style="margin-top: 0;">These <b>3 files</b> will be deleted for everyone:</p>
      <ul style="margin: 0; padding-left: 1.25rem;">
        @for (file of files; track file) {
          <li>{{ file }}</li>
        }
      </ul>
    </ng-template>

    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <button matButton uiButton variant="filled" (click)="remove()">Delete files</button>
    </div>
  `,
})
class DialogTemplateDemo {
  private readonly dialog = inject(Dialog);
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');

  protected readonly files = ['q3-report.pdf', 'balance-sheet.xlsx', 'notes.txt'];

  protected remove(): void {
    this.dialog.confirm({
      title: 'Delete 3 files?',
      message: this.tpl(),
      confirm: 'Delete',
      confirmColor: 'warn',
    });
  }
}

/** A consumer's own dialog component — `<ui-dialog>` and a form, opened with `open()`. */
@Component({
  selector: 'ui-rename-dialog',
  imports: [DialogLayout, DialogTitle, DialogActions, MatButton, Button, MatDialogClose, Input],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog>
      <h2 uiDialogTitle>Rename project</h2>

      <ui-input label="Project name" [(value)]="name" hint="Shown in the sidebar" />

      <button uiDialogActions matButton uiButton variant="text" matDialogClose>Cancel</button>
      <button uiDialogActions matButton uiButton [matDialogClose]="name()">Rename</button>
    </ui-dialog>
  `,
})
class RenameDialog {
  readonly name = signal('Atlas');
}

/**
 * The other half of the API: `open()` with a component of your own, for anything
 * a title, a message and two buttons cannot say.
 *
 * `<ui-dialog>` is the same layout the built-in confirm uses, so a hand-written
 * dialog cannot drift from the rest of the fleet — and `matDialogClose` is
 * Material's own, so the typed result reaches `afterClosed()` with no wiring.
 */
@Component({
  selector: 'ui-dialog-custom-demo',
  imports: [MatButton, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <button matButton uiButton variant="filled" (click)="rename()">Rename “{{ name() }}”</button>
    </div>

    <p style="font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant);">
      {{ log() }}
    </p>
  `,
})
class DialogCustomDemo {
  private readonly dialog = inject(Dialog);

  protected readonly name = signal('Atlas');
  protected readonly log = signal('The dialog owns a real form — Tab and Escape both work.');

  protected rename(): void {
    this.dialog
      .open<RenameDialog, never, string>(RenameDialog, { width: '28rem' })
      .afterClosed()
      .subscribe((renamed) => {
        if (renamed) {
          this.name.set(renamed);
          this.log.set(`Renamed to “${renamed}”.`);
        } else {
          this.log.set('Cancelled — the name is unchanged.');
        }
      });
  }
}

/** A dialog whose actions row alignment comes from the data it is opened with. */
@Component({
  selector: 'ui-align-dialog',
  imports: [DialogLayout, DialogTitle, DialogActions, MatButton, Button, MatDialogClose],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog [actionsAlign]="align">
      <h2 uiDialogTitle>actionsAlign="{{ align }}"</h2>
      <p>The buttons below sit at the {{ align }} of the row.</p>

      <button uiDialogActions matButton uiButton variant="text" matDialogClose>Cancel</button>
      <button uiDialogActions matButton uiButton matDialogClose>OK</button>
    </ui-dialog>
  `,
})
class AlignDialog {
  protected readonly align = inject<UiDialogActionsAlign>(MAT_DIALOG_DATA);
}

@Component({
  selector: 'ui-dialog-align-demo',
  imports: [MatButton, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      @for (align of aligns; track align) {
        <button matButton uiButton variant="filled" (click)="show(align)">{{ align }}</button>
      }
    </div>
  `,
})
class DialogAlignDemo {
  private readonly dialog = inject(Dialog);

  protected readonly aligns: UiDialogActionsAlign[] = ['start', 'center', 'end'];

  protected show(align: UiDialogActionsAlign): void {
    this.dialog.open<AlignDialog, UiDialogActionsAlign>(AlignDialog, {
      data: align,
      width: '26rem',
    });
  }
}

/** A dialog with more body than fits, to show Material's own sticky title and actions. */
@Component({
  selector: 'ui-terms-dialog',
  imports: [DialogLayout, DialogTitle, DialogActions, MatButton, Button, MatDialogClose],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog>
      <h2 uiDialogTitle>Terms of service</h2>

      @for (paragraph of paragraphs; track $index) {
        <p>{{ paragraph }}</p>
      }

      <button uiDialogActions matButton uiButton variant="text" [matDialogClose]="false">
        Decline
      </button>
      <button uiDialogActions matButton uiButton [matDialogClose]="true">Accept</button>
    </ui-dialog>
  `,
})
class TermsDialog {
  protected readonly paragraphs = Array.from(
    { length: 12 },
    (_, i) =>
      `${i + 1}. This clause exists to make the body taller than the dialog, so that the ` +
      'title stays pinned to the top and the actions to the bottom while the middle scrolls. ' +
      'All of that is Material’s own layout, resolved from the shared theme.',
  );
}

@Component({
  selector: 'ui-dialog-scroll-demo',
  imports: [MatButton, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <button matButton uiButton variant="filled" (click)="show()">Read the terms</button>
    </div>
  `,
})
class DialogScrollDemo {
  private readonly dialog = inject(Dialog);

  protected show(): void {
    this.dialog.open(TermsDialog, { width: '32rem' });
  }
}

/**
 * Restyling, with no `::ng-deep` and no `!important`.
 *
 * A dialog renders into the CDK overlay at the end of `<body>`, so it is outside
 * every component's encapsulation already — which is why this demo is
 * `ViewEncapsulation.None`, exactly as a consumer's own global stylesheet would
 * be. The class reaches the panel through `panelClass`, which is Material's own
 * config and is *merged* with `.ui-dialog-panel` rather than replacing it, and the
 * `--ui-dialog-*` hooks do the rest.
 */
@Component({
  selector: 'ui-dialog-styled-demo',
  imports: [MatButton, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: `
    .demo-branded {
      /* Pointed at other theme roles rather than literals, so this still follows
         the palette and dark mode. */
      --ui-dialog-container-color: var(--mat-sys-surface-container-highest);
      --ui-dialog-title-color: var(--mat-sys-tertiary);
      --ui-dialog-radius: 4px;
    }
  `,
  template: `
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <button matButton uiButton variant="filled" (click)="branded()">Branded dialog</button>
    </div>
  `,
})
class DialogStyledDemo {
  private readonly dialog = inject(Dialog);

  protected branded(): void {
    this.dialog.confirm(
      {
        title: 'Painted from --ui-dialog-*',
        message: 'A panelClass and three custom properties — no ::ng-deep anywhere.',
        confirm: 'Nice',
      },
      { panelClass: 'demo-branded' },
    );
  }
}

/**
 * Opens the story's dialog by pressing its trigger, and waits for it to arrive.
 *
 * Every story on this page runs this, which is what makes each of them a real axe
 * assertion on an open, focus-trapped dialog in a real browser: the role, the
 * `aria-labelledby` pointing at the projected heading, the `aria-describedby`
 * pointing at the message, and the contrast of every colour the theme resolved.
 *
 * Without it, a dialog story renders a *button* — the dialog is opened from code
 * and lives in the CDK overlay, so it is simply not there until something presses
 * the trigger, and `npm run test:a11y` would be checking the trigger rather than
 * the thing this page documents. That matters more here than anywhere else in the
 * library: the jsdom specs next door cannot see any of this, because jsdom has no
 * layout and no colour. This is where "verify Material's a11y works rather than
 * reimplementing it" is actually verified.
 *
 * It does not run on the Docs page — Storybook's `docs.story.autoplay` is `false`
 * by default — so the autodocs page below stays a page rather than fifteen
 * stacked modals.
 */
async function openOnLoad({ canvasElement }: { canvasElement: HTMLElement }): Promise<void> {
  canvasElement.querySelector('button')!.click();

  // The overlay lands at the end of <body>, outside the story's own canvas — so
  // this waits on the document rather than on the canvas.
  await waitFor(() => expect(document.querySelector('.mat-mdc-dialog-container')).toBeTruthy());
}

const meta: Meta<DialogDemo> = {
  title: 'Services/Dialog',
  component: DialogDemo,
  tags: ['autodocs'],
  play: openOnLoad,
  decorators: [
    moduleMetadata({
      imports: [
        DialogDemo,
        DialogAlertDemo,
        DialogTemplateDemo,
        DialogCustomDemo,
        DialogAlignDemo,
        DialogScrollDemo,
        DialogStyledDemo,
      ],
    }),
  ],
  args: {
    trigger: 'Discard draft',
    title: 'Discard draft?',
    message: 'Everything you have written since the last save will be lost.',
    confirm: undefined,
    cancel: undefined,
    confirmColor: undefined,
    config: {},
  },
  argTypes: {
    trigger: { control: 'text' },
    title: { control: 'text' },
    message: { control: 'text' },
    confirm: { control: 'text' },
    cancel: { control: 'text' },
    confirmColor: { control: 'inline-radio', options: ['primary', 'accent', 'warn'] },
    config: { control: 'object' },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`Dialog` is an injectable service rather than a component: a dialog has no element in',
          'anyone’s template — it is opened from code, into the CDK overlay. So there is nothing to',
          'render on this page directly, and every story below is a *consumer*: a component that does',
          '`inject(Dialog)` and calls it from a click handler, which is exactly how an app uses it.',
          'Press the buttons.',
          '',
          '### It is `MatDialog`, themed',
          '',
          'Every method mirrors one of Material’s, takes Material’s own `MatDialogConfig`, and returns',
          'Material’s own `MatDialogRef` — so `afterClosed()`, `backdropClick()`, `keydownEvents()` and',
          '`updateSize()` are all still there. Every dialog gets a `.ui-dialog-panel` class, and that',
          'class re-points Material’s own tokens at the shared theme’s roles: there is not a literal',
          'colour in `styles/_dialog.scss`, so every story below shows the exact palette a consuming',
          'app gets. Toggle your OS light/dark preference and watch them follow.',
          '',
          '### Two ways in',
          '',
          '- **`confirm()` / `alert()`** — the everyday “are you sure?”, with no component to write.',
          '  `afterClosed()` emits `true` from the confirming button, `false` from the cancelling one,',
          '  and `undefined` from Escape or the backdrop: **`true` means confirmed, anything else does',
          '  not.**',
          '- **`open()`** — your own component, for anything a title, a message and two buttons cannot',
          '  say. Render `<ui-dialog>` inside it for the same layout the built-ins use.',
          '',
          '### Accessibility is Material’s',
          '',
          'The focus trap, the focus restore on close, Escape, the backdrop, the scroll block and',
          'marking the rest of the page `aria-hidden` are all `MatDialog`’s, and none of them is',
          'reimplemented here. `<ui-dialog>`’s title slot *is* Material’s `matDialogTitle`, so',
          '`aria-labelledby` points at the real heading.',
          '',
          'The two things Material cannot infer, `confirm()` and `alert()` add: `role="alertdialog"`,',
          'because both interrupt and demand a response, and an `aria-describedby` pointing at the',
          'message. Focus lands on the *cancelling* button, because it is first in the DOM — so a stray',
          'Enter never goes through with something destructive.',
          '',
          '`aria-modal` is Material’s own decision and is **off** by default: the dialog already marks',
          'outside content `aria-hidden`, which is the same guarantee, and `aria-modal="true"` would',
          'hide the overlays that a `<ui-select>` or `<ui-datepicker>` *inside* the dialog renders',
          'into. Pass `ariaModal: true` per call for a dialog with no such content.',
        ].join('\n'),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `
      <ui-dialog-demo
        [trigger]="trigger"
        [title]="title"
        [message]="message"
        [confirm]="confirm"
        [cancel]="cancel"
        [confirmColor]="confirmColor"
        [config]="config"
      />`,
  }),
};

export default meta;
type Story = StoryObj<DialogDemo>;

/**
 * `dialog.confirm({ title, message })` — a question, a consequence, and the app’s
 * own `Cancel` / `Confirm` labels. The result comes back through Material’s own
 * `afterClosed()`.
 *
 * Try Escape and the backdrop as well as the buttons: both are Material’s, and
 * both report `undefined` rather than a confirmation.
 *
 * Every story on this page opens its own dialog on load, so that axe has an
 * *open* one to check — see `openOnLoad`. Close it to get back to the trigger.
 */
export const Default: Story = {};

// --- confirm ---------------------------------------------------------------

/**
 * Label the confirming button with **the verb from the title** — `Discard`, not
 * `Yes`. “Yes” only makes sense to someone who still has the question in view,
 * which a screen-reader user tabbing to the button does not.
 */
export const CustomLabels: Story = {
  args: { confirm: 'Discard', cancel: 'Keep editing' },
};

/**
 * `confirmColor` is `uiButton`’s own `color`, resolved from the shared theme’s
 * palettes — so `warn` is the theme’s error role, not a hex.
 *
 * Reach for it whenever the confirming button cannot be undone, so it does not
 * look like the safe one. Note what is still true here: focus is on **Cancel**,
 * because it comes first in the DOM and Material’s `autoFocus: 'first-tabbable'`
 * is left alone. The destructive button is never the one armed under a stray
 * Enter.
 */
export const Destructive: Story = {
  name: 'Destructive (confirmColor: warn)',
  args: {
    trigger: 'Delete 3 items',
    title: 'Delete 3 items?',
    message: 'They will not be recoverable.',
    confirm: 'Delete',
    confirmColor: 'warn',
  },
};

/**
 * `confirmColor="accent"` — the theme’s tertiary palette, for a confirm that
 * wants emphasis without meaning danger.
 */
export const AccentConfirm: Story = {
  name: 'confirmColor: accent',
  args: { confirm: 'Discard', confirmColor: 'accent' },
};

/**
 * `message` is optional: a title that already says everything needs no
 * restatement. The dialog then has nothing to describe, so it ships no
 * `aria-describedby` rather than one pointing at an element that was never
 * rendered.
 */
export const TitleOnly: Story = { args: { message: undefined } };

/**
 * `cancel: null` drops the cancelling button — which is all {@link alert} is.
 * Prefer `alert()` itself, which also gives the remaining button the app’s
 * `dismissLabel`.
 */
export const NoCancelButton: Story = {
  name: 'cancel: null',
  args: { title: 'Session expired', message: 'Sign in again to continue.', cancel: null },
};

// --- alert -----------------------------------------------------------------

/**
 * `dialog.alert({ title, message })` — a statement with a single button and
 * nothing to cancel. `afterClosed()` emits `true` from the button and `undefined`
 * from Escape; both mean “seen”.
 *
 * **This is the heavyweight option.** A modal blocks the page and takes focus,
 * which is a lot to charge for a message nobody has to answer. If the user does
 * not have to *decide* anything, `inject(Snackbar).info(…)` or a `<ui-alert>`
 * says it without stopping them.
 */
export const Alert: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({ template: `<ui-dialog-alert-demo />` }),
};

// --- Custom content --------------------------------------------------------

/**
 * Rule 7: a string cannot say everything — a list of what will be deleted, a
 * bolded filename. `message` takes a `TemplateRef` as well as a string, and the
 * `aria-describedby` still points at it.
 */
export const TemplateMessage: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({ template: `<ui-dialog-template-demo />` }),
};

/**
 * The other half of the API: `open()` with a component of your own, for anything
 * a title, a message and two buttons cannot say — a form, a preview, three
 * choices.
 *
 * ```ts
 * @Component({
 *   imports: [DialogLayout, DialogTitle, DialogActions, MatButton, Button, MatDialogClose],
 *   template: `
 *     <ui-dialog>
 *       <h2 uiDialogTitle>Rename project</h2>
 *       <ui-input label="Project name" [(value)]="name" />
 *       <button uiDialogActions matButton uiButton variant="text" matDialogClose>Cancel</button>
 *       <button uiDialogActions matButton uiButton [matDialogClose]="name()">Rename</button>
 *     </ui-dialog>
 *   `,
 * })
 * export class RenameDialog { readonly name = signal('Atlas'); }
 * ```
 *
 * `<ui-dialog>` is the same layout the built-in confirm uses, so a hand-written
 * dialog cannot drift from the rest of the fleet. `matDialogClose` is Material’s
 * own — this library adds no equivalent, because Material’s already works on the
 * native button and carries the typed result back through `afterClosed()`.
 */
export const CustomDialog: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({ template: `<ui-dialog-custom-demo />` }),
};

/**
 * `<ui-dialog>`’s one input: which end of the actions row the buttons sit at.
 *
 * `end` is the default and M3’s own, so the everyday dialog needs no attribute.
 * `start` and `center` are Material’s own `MatDialogActions.align` values, passed
 * straight through — the row is `<mat-dialog-actions>`, so the alignment is
 * Material’s to do.
 */
export const ActionsAlign: Story = {
  name: 'actionsAlign',
  parameters: { controls: { disable: true } },
  render: () => ({ template: `<ui-dialog-align-demo />` }),
};

/**
 * A body taller than the dialog: the title stays pinned to the top, the actions
 * to the bottom, and only the middle scrolls. All of it is Material’s own layout —
 * `<ui-dialog>` projects into `matDialogTitle`, `<mat-dialog-content>` and
 * `<mat-dialog-actions>` rather than reinventing them.
 */
export const Scrolling: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({ template: `<ui-dialog-scroll-demo />` }),
};

// --- Config ----------------------------------------------------------------

/**
 * The `config` argument is Material’s own `MatDialogConfig`, so nothing is
 * swallowed. `width` here; `maxWidth`, `height`, `position`, `direction`,
 * `hasBackdrop`, `autoFocus`, `restoreFocus` and `scrollStrategy` all reach
 * Material untouched too.
 *
 * M3 already floors the dialog at `min-width: 280px` and caps it at `560px`, so
 * reach for `width` only when the content genuinely needs it.
 */
export const Sizing: Story = {
  args: { config: { width: '24rem' } },
};

/**
 * `disableClose: true` — Material’s own, and it turns off **both** Escape and the
 * backdrop. Only the buttons close this one.
 *
 * Use it for the rare dialog where dismissing has no sensible meaning (an
 * irreversible step mid-flow), and never as a way to force a read: a modal the
 * keyboard cannot escape is a trap, so if you disable close, one of the buttons
 * has to be a way out.
 */
export const DisableClose: Story = {
  name: 'disableClose',
  args: {
    title: 'Finish setting up your account',
    message: 'Escape and the backdrop are off — only the buttons close this one.',
    confirm: 'Continue',
    cancel: 'Sign out',
    config: { disableClose: true },
  },
};

/**
 * `provideUiDialogDefaults()` names the built-in buttons once for a whole app
 * instead of at every call site — which is the case they exist for: they are the
 * only strings this library puts on screen, so they are the ones a non-English app
 * has to translate.
 *
 * This story’s app is bootstrapped in French, and the call itself passes no labels
 * at all. A call that *does* name one still wins.
 */
export const AppDefaults: Story = {
  name: 'provideUiDialogDefaults',
  decorators: [
    applicationConfig({
      providers: [
        provideUiDialogDefaults({
          confirmLabel: 'Confirmer',
          cancelLabel: 'Annuler',
          dismissLabel: "D'accord",
        }),
      ],
    }),
  ],
  args: {
    trigger: 'Abandonner le brouillon',
    title: 'Abandonner le brouillon ?',
    message: 'Tout ce que vous avez écrit depuis la dernière sauvegarde sera perdu.',
  },
};

// --- Styling hooks ---------------------------------------------------------

/**
 * Rule 2, the `::ng-deep` test: restyling a dialog is an ordinary rule on an
 * ordinary class. Pass a `panelClass` — Material’s own config, merged with
 * `.ui-dialog-panel` rather than replacing it — and set the `--ui-dialog-*` hooks
 * on it:
 *
 * ```css
 * .branded {
 *   --ui-dialog-container-color: var(--mat-sys-surface-container-highest);
 *   --ui-dialog-title-color: var(--mat-sys-tertiary);
 *   --ui-dialog-radius: 4px;
 * }
 * ```
 *
 * ```ts
 * this.dialog.confirm({ title: '…' }, { panelClass: 'branded' });
 * ```
 *
 * `--ui-dialog-text-color` and the three padding hooks
 * (`--ui-dialog-title-padding`, `--ui-dialog-content-padding`,
 * `--ui-dialog-actions-padding`) are there too — the padding ones for a full-bleed
 * body, where the content padding insets the content rather than the dialog. Point
 * the colours at another `--mat-sys-*` / `--ui-sys-*` role rather than a literal,
 * as this does, so they survive a palette change and dark mode.
 */
export const StylingHooks: Story = {
  name: 'Styling hooks: --ui-dialog-*',
  parameters: { controls: { disable: true } },
  render: () => ({ template: `<ui-dialog-styled-demo />` }),
};
