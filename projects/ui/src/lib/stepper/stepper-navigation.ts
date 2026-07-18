import { Directive, inject, input } from '@angular/core';

import { Stepper } from './stepper';

function missingStepper(directive: string): never {
  throw new Error(
    `\`${directive}\` must be used inside a \`<ui-stepper>\`. ` +
      'It moves the stepper it is written in, so there has to be one above it.',
  );
}

/**
 * A button that moves a {@link Stepper} to its next step — Material's
 * `matStepperNext`, for `<ui-stepper>`.
 *
 * ```html
 * <ui-step label="Address">
 *   <form [formGroup]="address">…</form>
 *   <button matButton uiButton uiStepperNext>Next</button>
 * </ui-step>
 * ```
 *
 * The move itself is Material's `CdkStepper.next()`, so a linear stepper's
 * validation, the focus handling and the animation are unchanged — this directive
 * only finds the stepper and calls it.
 *
 * ### Why this exists rather than `matStepperNext`
 *
 * Material's own `matStepperNext` injects `CdkStepper` from wherever it is
 * *written*, and a consumer writes it inside `<ui-step>` — which is above this
 * library's template, where `<mat-stepper>` actually lives. There is no `CdkStepper`
 * to be found from there, so `matStepperNext` inside a `<ui-step>` throws.
 *
 * Nor can `ui-stepper` simply re-provide `CdkStepper` for its projected content:
 * Angular builds that content *before* the component's own view, so at the moment
 * `matStepperNext` asks, the `<mat-stepper>` does not exist yet to hand over.
 *
 * So this is the same directive against the boundary Material could not have known
 * about, and the API a consumer is looking for when they reach for
 * `matStepperNext` (rule 2 — a Next button in a step must not need a workaround).
 * The alternative is the ordinary Angular idiom, which needs nothing from this
 * library: `<ui-stepper #s="uiStepper">` and `(click)="s.next()"`.
 */
@Directive({
  selector: 'button[uiStepperNext]',
  exportAs: 'uiStepperNext',
  host: {
    '(click)': 'stepper.next()',
    '[attr.type]': 'type()',
  },
})
export class StepperNext {
  /**
   * The stepper this button moves, exposed for a consumer that wants to read it —
   * e.g. to disable the button on the last step.
   */
  readonly stepper: Stepper = inject(Stepper, { optional: true }) ?? missingStepper('uiStepperNext');

  /**
   * The button's `type`. Defaults to `submit`, as Material's does, so a Next
   * button inside a `<form>` submits it — which is what runs the form's validators
   * and is why a linear step's control is up to date by the time the stepper looks
   * at it. Set `type="button"` for a step whose content is not a form.
   */
  readonly type = input<string>('submit');
}

/**
 * A button that moves a {@link Stepper} back to its previous step — Material's
 * `matStepperPrevious`, for `<ui-stepper>`.
 *
 * ```html
 * <ui-step label="Payment">
 *   <button matButton uiButton variant="text" uiStepperPrevious>Back</button>
 *   <button matButton uiButton uiStepperNext>Next</button>
 * </ui-step>
 * ```
 *
 * See {@link StepperNext} for why this exists rather than `matStepperPrevious`.
 * The move is Material's `CdkStepper.previous()`, so it still respects a step that
 * is not {@link Step.editable}.
 */
@Directive({
  selector: 'button[uiStepperPrevious]',
  exportAs: 'uiStepperPrevious',
  host: {
    '(click)': 'stepper.previous()',
    '[attr.type]': 'type()',
  },
})
export class StepperPrevious {
  /** The stepper this button moves. See {@link StepperNext.stepper}. */
  readonly stepper: Stepper =
    inject(Stepper, { optional: true }) ?? missingStepper('uiStepperPrevious');

  /**
   * The button's `type`. Defaults to `button`, as Material's does: going back must
   * not submit the form the user is standing in.
   */
  readonly type = input<string>('button');
}
