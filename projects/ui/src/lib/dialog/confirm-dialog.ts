import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, TemplateRef } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogClose } from '@angular/material/dialog';

import { Button, type UiButtonColor } from '../button/button';
import { DialogActions, DialogLayout, DialogTitle } from './dialog-layout';

/**
 * What {@link Dialog.confirm} puts in the dialog.
 *
 * Every label is optional and falls back to the app's own — see
 * {@link UiDialogDefaults} and {@link provideUiDialogDefaults}, which is where a
 * non-English app names them once rather than at every call site.
 */
export interface UiConfirmDialogData {
  /**
   * The question, as a heading. Required: it is the dialog's accessible name, so
   * a confirm without one is a modal a screen-reader user cannot identify.
   *
   * Name the *action*, not the mechanism — "Discard draft?" rather than
   * "Are you sure?", which says nothing when read on its own.
   */
  title: string;

  /**
   * The consequence, spelled out under the title. Optional — a title that already
   * says everything needs no restatement.
   *
   * Pass a `TemplateRef` for anything a string cannot say — a list of what will be
   * deleted, a bolded filename (rule 7). Either way it is what the dialog's
   * `aria-describedby` points at.
   */
  message?: string | TemplateRef<unknown>;

  /** Label of the confirming button. Defaults to the app's `confirmLabel` (`Confirm`). */
  confirm?: string;

  /**
   * Label of the cancelling button. Defaults to the app's `cancelLabel`
   * (`Cancel`); `null` drops the button entirely, which is what
   * {@link Dialog.alert} is.
   */
  cancel?: string | null;

  /**
   * Semantic colour of the confirming button, resolved from the shared theme's
   * palettes exactly as `uiButton`'s own `color` is. Defaults to `primary`.
   *
   * Use `warn` for a destructive confirm — deleting, discarding, revoking — so the
   * button that cannot be undone does not look like the safe one.
   */
  confirmColor?: UiButtonColor;
}

/** What {@link Dialog.alert} puts in the dialog: a confirm with nothing to cancel. */
export type UiAlertDialogData = Omit<UiConfirmDialogData, 'cancel'>;

/**
 * The data actually injected into {@link ConfirmDialog} — *not* what a call site
 * passes, which is {@link UiConfirmDialogData}.
 *
 * {@link Dialog.confirm} builds this from that: the labels are resolved against
 * the app's defaults on the way through, so they are no longer optional by the
 * time they arrive here, and `messageId` is added. That id has to be generated
 * before the component exists, because it is also what the config's
 * `ariaDescribedBy` points at, and both ends of that reference have to be decided
 * in the same breath.
 */
export interface ConfirmDialogData extends UiConfirmDialogData {
  confirm: string;
  cancel: string | null;
  messageId: string;
}

/**
 * The dialog {@link Dialog.confirm} and {@link Dialog.alert} open: a question, an
 * optional consequence, and one or two buttons.
 *
 * Not for opening directly — reach for the service, which is what resolves the
 * labels against the app's defaults and wires up `role="alertdialog"` and
 * `aria-describedby`. It is exported because it is the type parameter of the ref
 * those methods hand back (`MatDialogRef<ConfirmDialog, boolean>`).
 *
 * It is `<ui-dialog>` and nothing else — the same layout a consumer writing their
 * own dialog component uses, so the everyday confirm cannot drift from the rest of
 * the fleet.
 *
 * ### Which button closes with what
 *
 * Both are Material's own `matDialogClose`, so the result reaches
 * `afterClosed()` with no wiring: `true` from the confirming button, `false` from
 * the cancelling one. Dismissing the dialog — Escape, the backdrop — is Material's
 * and closes with `undefined`, which is exactly why {@link Dialog.confirm} is
 * documented as "`true` means confirmed, anything else does not".
 *
 * Cancel comes first in the DOM, so Material's own `autoFocus: 'first-tabbable'`
 * lands on it. That is deliberate: the destructive button should not be the one
 * armed under a stray Enter.
 */
@Component({
  selector: 'ui-confirm-dialog',
  imports: [
    NgTemplateOutlet,
    MatButton,
    Button,
    MatDialogClose,
    DialogLayout,
    DialogTitle,
    DialogActions,
  ],
  templateUrl: './confirm-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  // Private rather than protected, so the internal data shape stays out of this
  // library's public types: the template reads the resolved fields below.
  private readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);

  protected readonly title = this.data.title;
  protected readonly confirmLabel = this.data.confirm;
  protected readonly cancelLabel = this.data.cancel;
  protected readonly confirmColor: UiButtonColor = this.data.confirmColor ?? 'primary';
  protected readonly messageId = this.data.messageId;

  // The two message forms, split once here rather than re-tested in the template.
  // `data` is injected and never changes, so these are plain fields: there is no
  // signal to track.
  protected readonly messageTemplate =
    this.data.message instanceof TemplateRef ? this.data.message : null;
  protected readonly messageText = typeof this.data.message === 'string' ? this.data.message : null;
  protected readonly hasMessage = this.messageTemplate !== null || this.messageText !== null;
}
