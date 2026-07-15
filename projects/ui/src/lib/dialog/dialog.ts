import { _IdGenerator } from '@angular/cdk/a11y';
import type { ComponentType } from '@angular/cdk/portal';
import {
  inject,
  Injectable,
  InjectionToken,
  makeEnvironmentProviders,
  TemplateRef,
  type EnvironmentProviders,
} from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import type { Observable } from 'rxjs';

import {
  ConfirmDialog,
  type ConfirmDialogData,
  type UiAlertDialogData,
  type UiConfirmDialogData,
} from './confirm-dialog';

/**
 * Everything `MatDialogConfig` takes.
 *
 * An alias rather than a re-declaration (rule 4): `width`, `maxWidth`, `data`,
 * `disableClose`, `autoFocus`, `restoreFocus`, `position`, `direction`,
 * `scrollStrategy`, `injector`, `viewContainerRef`, `closePredicate` and the
 * `aria*` options all reach Material untouched, so nothing this service does not
 * know about is swallowed. `panelClass` is the one key not simply forwarded: it
 * is merged with this library's own class rather than replacing it, so a consumer
 * adding a class cannot silently strip the theme.
 */
export type UiDialogConfig<D = unknown> = MatDialogConfig<D>;

/**
 * The labels {@link Dialog.confirm} and {@link Dialog.alert} use when a call
 * names none.
 *
 * Injected through {@link UI_DIALOG_DEFAULTS} rather than baked in, because these
 * are the strings an app has to translate: a French app names them once with
 * {@link provideUiDialogDefaults} instead of passing `confirm`/`cancel` at every
 * call site.
 */
export interface UiDialogDefaults {
  /** The confirming button's label in {@link Dialog.confirm}. */
  confirmLabel: string;

  /** The cancelling button's label in {@link Dialog.confirm}. */
  cancelLabel: string;

  /** The single button's label in {@link Dialog.alert}, which has nothing to cancel. */
  dismissLabel: string;
}

/**
 * The shipped defaults.
 *
 * `Confirm` rather than `Yes`, and `OK` for an alert: a button label should say
 * what pressing it does, and "Yes" only makes sense to someone who still has the
 * question in view — which a screen-reader user tabbing to the button does not.
 * The best label is the verb from the title (`Discard`), which is why `confirm`
 * is a per-call argument at all; this is the fallback for when a caller has none.
 */
export const UI_DIALOG_DEFAULT_VALUES: UiDialogDefaults = {
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  dismissLabel: 'OK',
};

/**
 * The defaults {@link Dialog} resolves against. Override with
 * {@link provideUiDialogDefaults}.
 *
 * Material's own `MAT_DIALOG_DEFAULT_OPTIONS` still applies to everything this
 * service does not set — sizing, `autoFocus`, `restoreFocus`, `hasBackdrop` — and
 * is untouched by this token, which holds only the labels of the two built-in
 * dialogs. The two compose rather than compete.
 */
export const UI_DIALOG_DEFAULTS = new InjectionToken<UiDialogDefaults>('UI_DIALOG_DEFAULTS', {
  providedIn: 'root',
  factory: () => UI_DIALOG_DEFAULT_VALUES,
});

/**
 * Names the built-in confirm and alert buttons for an app.
 *
 * ```ts
 * bootstrapApplication(App, {
 *   providers: [
 *     provideUiDialogDefaults({ confirmLabel: 'Confirmer', cancelLabel: 'Annuler' }),
 *   ],
 * });
 * ```
 *
 * Merged over the shipped defaults, so an app that only renames one does not have
 * to restate the others.
 */
export function provideUiDialogDefaults(defaults: Partial<UiDialogDefaults>): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: UI_DIALOG_DEFAULTS,
      useValue: { ...UI_DIALOG_DEFAULT_VALUES, ...defaults } satisfies UiDialogDefaults,
    },
  ]);
}

/** The class every dialog this service opens carries, and `_dialog.scss` hangs off. */
const ROOT_CLASS = 'ui-dialog-panel';

const toClassArray = (panelClass: string | string[] | undefined): string[] =>
  panelClass == null ? [] : Array.isArray(panelClass) ? panelClass : [panelClass];

/**
 * Opens themed Material dialogs.
 *
 * ```ts
 * private readonly dialog = inject(Dialog);
 *
 * async discard(): Promise<void> {
 *   const confirmed = await firstValueFrom(
 *     this.dialog
 *       .confirm({
 *         title: 'Discard draft?',
 *         message: 'Everything you have written since the last save will be lost.',
 *         confirm: 'Discard',
 *         confirmColor: 'warn',
 *       })
 *       .afterClosed(),
 *   );
 *
 *   if (confirmed) {
 *     this.draft.set(null);
 *   }
 * }
 * ```
 *
 * A dialog has no element in anyone's template — it is opened from code, into the
 * CDK overlay — so this is a service rather than a component, the same shape as
 * {@link Snackbar}. It is `MatDialog` with this library's theme and defaults
 * applied: every method mirrors one of Material's, takes Material's own config,
 * and returns Material's own `MatDialogRef`, so `afterClosed()`, `backdropClick()`,
 * `keydownEvents()`, `updateSize()` and `close()` are all still there.
 *
 * ### What it adds
 *
 * - **{@link confirm} and {@link alert}.** The everyday "are you sure?" without
 *   writing a component for it. Both render `<ui-dialog>`, the same layout a
 *   hand-written dialog uses, so they cannot drift from the rest of the fleet.
 * - **The theme.** Every dialog gets `.ui-dialog-panel`, which is what
 *   `src/styles/_dialog.scss` hangs the `--ui-dialog-*` hooks off. It re-points
 *   Material's own tokens, so there is not a literal colour anywhere.
 *
 * ### Accessibility is Material's, not this library's
 *
 * The focus trap, the focus restore on close, Escape, the backdrop, the scroll
 * block and marking the rest of the page `aria-hidden` are all `MatDialog`'s and
 * are not reimplemented here. `<ui-dialog>`'s title slot is Material's own
 * `matDialogTitle`, so `aria-labelledby` points at the real heading.
 *
 * {@link confirm} and {@link alert} add the two things Material cannot infer:
 * `role="alertdialog"` — a confirm interrupts and demands a response, which is
 * what that role means — and an `aria-describedby` pointing at the message, so
 * the consequence is announced with the name rather than only on arrow-down.
 *
 * `aria-modal` is Material's own decision and is **off** by default: the dialog
 * already marks outside content `aria-hidden`, which is the same guarantee, and
 * `aria-modal="true"` would hide the CDK overlays that a `<ui-select>` or
 * `<ui-datepicker>` *inside* the dialog renders into. Turn it on per call with
 * `ariaModal: true` if a dialog has no such content — it reaches Material
 * untouched.
 *
 * ### Escape hatches
 *
 * - **Per call** — the `config` argument, which is Material's own
 *   `MatDialogConfig`. `panelClass` is merged with this library's class, not
 *   replaced.
 * - **Per app** — {@link provideUiDialogDefaults} for the built-in labels;
 *   Material's own `MAT_DIALOG_DEFAULT_OPTIONS` for sizing, focus and the
 *   backdrop, which this service leaves alone.
 * - **Everything else** — {@link matDialog} is the `MatDialog` this service
 *   delegates to, unwrapped.
 *
 * Restyling needs no `::ng-deep`: a dialog renders in the CDK overlay at the end
 * of `<body>`, so it is outside every component's encapsulation already. Pass a
 * `panelClass` and set the `--ui-dialog-*` hooks on it (see `_dialog.scss`).
 */
@Injectable({ providedIn: 'root' })
export class Dialog {
  /**
   * The `MatDialog` underneath, exposed as the escape hatch for anything this
   * service does not wrap.
   */
  readonly matDialog = inject(MatDialog);

  private readonly defaults = inject(UI_DIALOG_DEFAULTS);
  private readonly idGenerator = inject(_IdGenerator);

  /** The dialogs that are currently open. Material's own array, untouched. */
  get openDialogs(): MatDialogRef<unknown>[] {
    return this.matDialog.openDialogs;
  }

  /** Emits when every open dialog has closed — Material's own stream. */
  get afterAllClosed(): Observable<void> {
    return this.matDialog.afterAllClosed;
  }

  /**
   * Opens a component or a template in a dialog — `MatDialog.open` with this
   * library's theme applied.
   *
   * The component is an ordinary component; render `<ui-dialog>` in it for the
   * shared layout, and inject `MatDialogRef` to close with a result:
   *
   * ```ts
   * const ref = this.dialog.open<RenameDialog, Project, string>(RenameDialog, {
   *   data: this.project(),
   *   width: '28rem',
   * });
   *
   * ref.afterClosed().subscribe((name) => name && this.rename(name));
   * ```
   */
  open<T, D = unknown, R = unknown>(
    componentOrTemplate: ComponentType<T> | TemplateRef<T>,
    config?: UiDialogConfig<D>,
  ): MatDialogRef<T, R> {
    return this.matDialog.open<T, D, R>(componentOrTemplate, this.resolveConfig(config));
  }

  /**
   * Asks the user to confirm something, and reports what they chose.
   *
   * ```ts
   * this.dialog
   *   .confirm({
   *     title: 'Delete 3 items?',
   *     message: 'They will not be recoverable.',
   *     confirm: 'Delete',
   *     confirmColor: 'warn',
   *   })
   *   .afterClosed()
   *   .subscribe((confirmed) => confirmed && this.delete());
   * ```
   *
   * **`true` means confirmed; anything else does not.** `afterClosed()` emits
   * `true` from the confirming button, `false` from the cancelling one, and
   * `undefined` when the dialog is dismissed with Escape or the backdrop — so
   * treat the result as a boolean and only act on `true`.
   *
   * Focus lands on the cancelling button, not the confirming one, so a stray
   * Enter cannot go through with something destructive.
   *
   * `config` is Material's own, minus `data`: what goes in the dialog is the first
   * argument. For anything this cannot say — a form, a preview, three choices —
   * write a component and use {@link open}.
   */
  confirm(
    data: UiConfirmDialogData,
    config?: Omit<UiDialogConfig<never>, 'data'>,
  ): MatDialogRef<ConfirmDialog, boolean> {
    return this.openConfirm(
      {
        ...data,
        confirm: data.confirm ?? this.defaults.confirmLabel,
        cancel: data.cancel === undefined ? this.defaults.cancelLabel : data.cancel,
      },
      config,
    );
  }

  /**
   * States something the user has to acknowledge, with a single button.
   *
   * ```ts
   * this.dialog.alert({
   *   title: 'Your session has expired',
   *   message: 'Sign in again to pick up where you left off.',
   *   confirm: 'Sign in',
   * });
   * ```
   *
   * A confirm with nothing to cancel, so `afterClosed()` emits `true` from the
   * button and `undefined` from Escape or the backdrop — both mean "seen".
   *
   * This is the heavyweight option: a modal blocks the page and takes focus, which
   * is a lot to charge for a message nobody has to answer. If the user does not
   * have to *decide* anything, `inject(Snackbar).info(…)` or a `<ui-alert>` says
   * it without stopping them.
   */
  alert(
    data: UiAlertDialogData,
    config?: Omit<UiDialogConfig<never>, 'data'>,
  ): MatDialogRef<ConfirmDialog, boolean> {
    return this.openConfirm(
      { ...data, confirm: data.confirm ?? this.defaults.dismissLabel, cancel: null },
      config,
    );
  }

  /** Finds an open dialog by its config `id` — Material's own lookup. */
  getDialogById(id: string): MatDialogRef<unknown> | undefined {
    return this.matDialog.getDialogById(id);
  }

  /** Closes every open dialog. */
  closeAll(): void {
    this.matDialog.closeAll();
  }

  /**
   * Opens {@link ConfirmDialog} with the a11y both built-ins need.
   *
   * The message id is generated *here*, before the component exists, because the
   * container's `aria-describedby` comes off the config rather than off anything
   * the component can set once it is rendered — so both ends of the reference have
   * to be decided in the same breath.
   */
  private openConfirm(
    data: Omit<ConfirmDialogData, 'messageId'>,
    config?: Omit<UiDialogConfig<never>, 'data'>,
  ): MatDialogRef<ConfirmDialog, boolean> {
    const messageId = this.idGenerator.getId('ui-dialog-message-');

    return this.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      // A dialog that interrupts and demands a response is ARIA's `alertdialog`,
      // not a plain `dialog`. Material cannot infer that — it does not know what
      // is in the dialog — but these two always are one.
      role: 'alertdialog',
      // Only when there is something to describe: pointing `aria-describedby` at
      // an element that was never rendered leaves a dangling reference.
      ariaDescribedBy: data.message ? messageId : undefined,
      ...config,
      data: { ...data, messageId },
    });
  }

  /**
   * Puts this library's panel class on the config.
   *
   * `panelClass` is the one key not simply forwarded: `.ui-dialog-panel` is what
   * carries the theme's hooks, so a consumer adding a class of their own must not
   * silently strip them (rule 4). Theirs come last, so their rules win on equal
   * specificity.
   */
  private resolveConfig<D>(config: UiDialogConfig<D> | undefined): MatDialogConfig<D> {
    return {
      ...config,
      panelClass: [ROOT_CLASS, ...toClassArray(config?.panelClass)],
    };
  }
}
