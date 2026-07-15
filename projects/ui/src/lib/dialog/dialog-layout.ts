import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  contentChild,
  contentChildren,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';

/**
 * Which end of the actions row the buttons sit at. Mirrors `MatDialogActions.align`.
 *
 * `end` is both this component's default and M3's own
 * (`dialog-actions-alignment: flex-end`), so the default costs no override.
 */
export type UiDialogActionsAlign = 'start' | 'center' | 'end';

/**
 * Marks an element as the dialog's title.
 *
 * ```html
 * <ui-dialog>
 *   <h2 uiDialogTitle>Discard draft?</h2>
 *   This cannot be undone.
 * </ui-dialog>
 * ```
 *
 * Put it on the element itself — not on a wrapper around it: `ng-content select`
 * only matches the direct children of `<ui-dialog>`, so a marker nested any
 * deeper is never projected into the title slot.
 *
 * The element stays the consumer's, so use whichever heading level the
 * surrounding document outline calls for — a decision only the consumer can make.
 * This is the shape `matCardTitle` and `uiAlertTitle` have, for the same reason.
 *
 * ### It is Material's own title
 *
 * `MatDialogTitle` is pulled onto the host as a host directive, which is what
 * makes this element *the* thing the dialog is named by: Material registers it
 * with the `MatDialogRef` and points the container's `aria-labelledby` at its id.
 * So the accessible name comes from Material, and the heading is sticky at the
 * top of a scrolling dialog because Material's own styles say so.
 *
 * Material's `id` input is forwarded (rule 3): `<h2 uiDialogTitle id="my-title">`
 * puts *that* id on the element and `aria-labelledby` follows it, rather than
 * Material's generated one silently winning.
 */
@Directive({
  selector: '[uiDialogTitle]',
  exportAs: 'uiDialogTitle',
  hostDirectives: [{ directive: MatDialogTitle, inputs: ['id'] }],
})
export class DialogTitle {}

/**
 * Marks an element for the dialog's actions row.
 *
 * Mark each action rather than a wrapper around them: the slot is Material's own
 * `<mat-dialog-actions>` flex row, so the marked elements have to be its direct
 * children for `actionsAlign` and its spacing to apply to them.
 *
 * ```html
 * <button uiDialogActions matButton uiButton variant="text" matDialogClose>Cancel</button>
 * <button uiDialogActions matButton uiButton [matDialogClose]="true">Discard</button>
 * ```
 *
 * `matDialogClose` is Material's own close directive, untouched — this library
 * adds no equivalent, because Material's already works on the native button and
 * carries the result back through `afterClosed()`.
 */
@Directive({ selector: '[uiDialogActions]' })
export class DialogActions {}

/**
 * The M3 dialog layout: a title, a scrolling body, and an actions row.
 *
 * This is the *inside* of a dialog — the template of a component a consumer opens
 * with {@link Dialog.open}, not something to drop on a page:
 *
 * ```ts
 * @Component({
 *   imports: [DialogLayout, DialogTitle, DialogActions, MatButton, Button, MatDialogClose],
 *   template: `
 *     <ui-dialog>
 *       <h2 uiDialogTitle>Rename project</h2>
 *       <ui-input label="Name" [(ngModel)]="name" />
 *       <button uiDialogActions matButton uiButton variant="text" matDialogClose>Cancel</button>
 *       <button uiDialogActions matButton uiButton [matDialogClose]="name()">Rename</button>
 *     </ui-dialog>
 *   `,
 * })
 * export class RenameDialog { … }
 * ```
 *
 * Like `ui-card` and unlike `uiButton`, this is a component rather than a
 * directive: a dialog owns structure — three regions, in a fixed order, each with
 * its own box metrics and its own scroll behaviour — and there is no native
 * element to decorate. It is the same shape as `ui-card` on purpose.
 *
 * For the everyday "are you sure?" there is no need to write a component at all:
 * {@link Dialog.confirm} and {@link Dialog.alert} render this layout for you.
 *
 * ### Everything here is Material's
 *
 * The three slots project into `matDialogTitle`, `<mat-dialog-content>` and
 * `<mat-dialog-actions>`, so the sticky title, the scrolling body, the
 * `aria-labelledby` wiring and every colour, font and padding are Material's own,
 * resolved from the M3 system tokens `src/styles/_theme.scss` emits. There is not
 * a colour in `dialog-layout.scss` — only the flex plumbing this wrapper owes
 * Material for sitting between its surface and its sections.
 *
 * ### Empty slots collapse
 *
 * The title and actions regions render only when something is projected into
 * them, so a dialog with no actions has no stray 52px row where they would have
 * been.
 *
 * ### A body that scrolls is reachable from the keyboard
 *
 * The one thing here that is *not* Material's. `<mat-dialog-content>` scrolls a
 * long body with the wheel but gives a keyboard-only user nothing to focus, so
 * the rest of the text is unreachable — see {@link contentScrolls}. This adds the
 * tab stop, and only while the body actually overflows.
 *
 * ### Styling hooks
 *
 * A dialog renders into the CDK overlay, so its hooks hang off the panel rather
 * than off this element — see `src/styles/_dialog.scss` and {@link Dialog}. Pass
 * a `panelClass` and set `--ui-dialog-*` on it; no `::ng-deep` needed.
 */
@Component({
  selector: 'ui-dialog',
  exportAs: 'uiDialog',
  imports: [MatDialogContent, MatDialogActions],
  templateUrl: './dialog-layout.html',
  styleUrl: './dialog-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogLayout {
  /** Which end of the actions row the buttons sit at. Defaults to M3's own `end`. */
  readonly actionsAlign = input<UiDialogActionsAlign>('end');

  // `descendants: false` mirrors what `ng-content select` actually projects:
  // only direct children of `<ui-dialog>`. A deeper marker is not projected, so
  // it must not light up the slot either — that would render an empty region.
  protected readonly titleSlot = contentChild(DialogTitle, { descendants: false });
  protected readonly actionSlots = contentChildren(DialogActions, { descendants: false });

  private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');

  /**
   * Whether the body currently overflows, and is therefore a scrolling region.
   *
   * Which makes it a keyboard trap of the quiet kind: `<mat-dialog-content>` is
   * `overflow: auto` with a `max-height`, so a long body scrolls with the wheel
   * and with a touch drag — but a keyboard-only user has nothing to focus and no
   * way to reach the rest of the text. Axe flags exactly this
   * (`scrollable-region-focusable`), and it is the one thing on this page Material
   * does not already handle: it tokenises the padding and pins the title, but
   * never makes the region focusable. So `<ui-dialog>` does, and every consuming
   * app gets it — a terms-of-service dialog is not an exotic case.
   *
   * Conditional rather than a bare `tabindex="0"`, because a region that does not
   * scroll must not be a tab stop: an ordinary confirm would otherwise put a
   * pointless stop between the title and the buttons, and — since Material's
   * `autoFocus` is `first-tabbable` — it would swallow the opening focus that
   * belongs on the cancel button.
   */
  protected readonly contentScrolls = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Measured from the `read` phase, once the body it is measuring exists.
    //
    // Not `afterRenderEffect`, which looks like the closer fit and is not: it is
    // an *effect*, so it re-runs only when a signal it read changes — and
    // `scrollHeight` is not a signal, so it would measure once and never again.
    // (`afterRender`, which did run every cycle, is gone in v21.) Hence an
    // explicit measurement plus an observer for what changes it.
    afterNextRender({
      read: () => {
        const el = this.content().nativeElement;
        const measure = (): void => this.contentScrolls.set(el.scrollHeight > el.clientHeight);

        measure();

        // Keeps the measurement honest as the body changes — an expanding
        // section, an async list. Observing the box catches it because the box
        // grows *with* its content until it hits the `max-height` that makes it
        // scroll: the crossing is a resize, even though growth beyond it is not
        // (and needs no second answer, the region already scrolling).
        //
        // Guarded because `ResizeObserver` does not exist under jsdom or on the
        // server, and a library that constructs one unguarded breaks the unit
        // tests of every app that renders a dialog in one. Where it is missing,
        // the measurement above still stands for the body the dialog opened with,
        // which is the case that matters — and neither jsdom nor the server has a
        // keyboard to trap.
        if (typeof ResizeObserver === 'undefined') {
          return;
        }

        const observer = new ResizeObserver(measure);
        observer.observe(el);
        destroyRef.onDestroy(() => observer.disconnect());
      },
    });
  }
}
