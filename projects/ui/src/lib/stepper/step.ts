import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  contentChild,
  Directive,
  inject,
  input,
  TemplateRef,
  viewChild,
  type Signal,
} from '@angular/core';
import type { AbstractControl } from '@angular/forms';

/**
 * Renders a step's label in place of its `label` string (rule 7).
 *
 * The header is the one part of a step a consumer cannot reach by projecting
 * content — the body is projected into `<ui-step>`, but the label is a string
 * input. This template is how an icon, a count or a status dot gets in there:
 *
 * ```html
 * <ui-stepper>
 *   <ui-step label="Address">
 *     <ng-template uiStepLabel>
 *       Address
 *       <span uiBadge="2"></span>
 *     </ng-template>
 *     …
 *   </ui-step>
 * </ui-stepper>
 * ```
 *
 * It renders inside Material's own step header, so the ripple, the state icon and
 * the keyboard navigation are untouched. {@link Step.label} stays required
 * alongside it: it is the step's plain-text name, and the fallback for anything
 * that reads a step without rendering it.
 */
@Directive({ selector: 'ng-template[uiStepLabel]' })
export class StepLabelDef {
  /** The template itself, rendered by `stepper.html`. @docs-private */
  readonly template = inject<TemplateRef<void>>(TemplateRef);
}

/**
 * One step in a {@link Stepper}: its label, and the content shown when it is
 * selected.
 *
 * ```html
 * <ui-stepper>
 *   <ui-step label="Address" [stepControl]="address">…</ui-step>
 *   <ui-step label="Payment" [stepControl]="payment">…</ui-step>
 *   <ui-step label="Review" editable="false">…</ui-step>
 * </ui-stepper>
 * ```
 *
 * The body is ordinary projected content, so anything a consumer can write in a
 * template can go in a step — a form, a table, another component. It is not a
 * string input, and there is no `content` to marshal (rule 7).
 *
 * ### It renders nothing itself
 *
 * `<ui-step>` is a declaration, not a box: it captures its content in a template
 * and {@link Stepper} renders that template inside Material's own step body,
 * where the animation and the `role="tabpanel"` / `role="region"` wiring back to
 * the header live. This is exactly how `<mat-step>` itself works — see
 * `@angular/material/stepper`, whose template is the same
 * `<ng-template><ng-content/></ng-template>`.
 *
 * That is why a `ui-step` outside a `ui-stepper` shows nothing at all rather than
 * dumping its content on the page.
 */
@Component({
  selector: 'ui-step',
  exportAs: 'uiStep',
  // The content is captured rather than rendered here, so that `ui-stepper` can
  // put it inside Material's step body. `<ng-content>` inside an `<ng-template>`
  // is Material's own construction for this, not a trick of ours.
  template: `<ng-template #content><ng-content /></ng-template>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Step {
  /**
   * The step's plain-text label, e.g. `Address`.
   *
   * Required: a step with no name is an unusable target for a mouse and an
   * anonymous one for a screen reader. To render something richer than a string,
   * project a {@link StepLabelDef} — this stays the step's text either way.
   */
  readonly label = input.required<string>();

  /**
   * The control whose validity says whether this step is done — usually the
   * `FormGroup` of the form projected into it.
   *
   * This is what makes {@link Stepper.linear} mean anything: with a `stepControl`
   * the stepper refuses to move past an invalid step, marks it completed once the
   * control is valid, and shows the error state on its header. Without one, a
   * linear stepper treats a step as done the moment the user tries to leave it,
   * which is a sequence rather than a gate.
   *
   * `[(ngModel)]` and reactive forms both produce one of these, so neither needs
   * an adapter (rule 5).
   */
  readonly stepControl = input<AbstractControl>();

  /**
   * Whether this step counts as done, overriding what the stepper would work out
   * for itself.
   *
   * Left unset, Material derives it: a step is complete once the user has tried
   * to leave it and its {@link stepControl} is valid (or it has no control at
   * all). Set it only when completion is decided by something the stepper cannot
   * see — a server round-trip, a file that finished uploading — and take on
   * driving it from then on. `undefined` hands the decision back.
   */
  readonly completed = input<boolean | undefined, unknown>(undefined, {
    // Not plain `booleanAttribute`: that maps `undefined` onto `false`, which is
    // a different thing entirely. `false` means "this step is not done, whatever
    // its control says"; `undefined` means "you work it out". Collapsing the two
    // would make an untouched `<ui-step>` permanently incomplete, so a linear
    // stepper could never advance.
    transform: (value: unknown) => (value === undefined ? undefined : booleanAttribute(value)),
  });

  /**
   * Whether the user can come back and change this step once it is done.
   *
   * `true` by default, as in Material: a stepper is a form, and a user who cannot
   * go back and fix a typo has to start again. Turn it off for a step that cannot
   * be retaken — a submitted payment, a confirmation — and Material stops
   * accepting a backwards move onto it and marks its header done rather than
   * editable.
   */
  readonly editable = input(true, { transform: booleanAttribute });

  /**
   * Whether the step can be left incomplete.
   *
   * Material renders an "Optional" caption under the label and, in a linear
   * stepper, lets the user move past it without satisfying its
   * {@link stepControl}.
   */
  readonly optional = input(false, { transform: booleanAttribute });

  /**
   * What the header says when this step is in its error state — e.g.
   * `Check the postcode`.
   *
   * Shown in place of the label once the user has tried to leave the step and its
   * {@link stepControl} is invalid. Say what is wrong, not that something is:
   * `Required` on its own is a step the user has to open to understand.
   */
  readonly errorMessage = input<string>();

  /**
   * The step's accessible name, spelled as the ARIA attribute — for a step whose
   * rendered label is not the whole story, e.g. an icon-only
   * {@link StepLabelDef}.
   *
   * An input rather than an attribute left on the host, because the host is not
   * the element with the `tab`/`button` role — that one is rendered by Material
   * in the header, and this is put on it.
   *
   * Leave it unset when the label already reads as the name: an `aria-label` that
   * disagrees with the visible text is worse than none at all.
   */
  readonly ariaLabel = input<string | undefined, unknown>(undefined, {
    alias: 'aria-label',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The id of the element naming this step's header — for a step named by a
   * heading already on the page. Material prefers {@link ariaLabel} over this.
   */
  readonly ariaLabelledby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-labelledby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /** The projected label template, when a consumer gives one. @docs-private */
  readonly labelDef = contentChild(StepLabelDef);

  /**
   * The step's projected body, captured as a template for `ui-stepper` to render.
   * @docs-private
   */
  readonly content: Signal<TemplateRef<void>> = viewChild.required('content', {
    read: TemplateRef,
  });
}
