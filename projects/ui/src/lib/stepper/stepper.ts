import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { STEPPER_GLOBAL_OPTIONS, type StepperSelectionEvent } from '@angular/cdk/stepper';
import { MatStep, MatStepLabel, MatStepper } from '@angular/material/stepper';

import { Step } from './step';

/** Which way the steps run. */
export type UiStepperOrientation = 'horizontal' | 'vertical';

/**
 * Where a horizontal stepper's labels sit relative to their state icons.
 *
 * Only meaningful while {@link Stepper.orientation} is `horizontal` — a vertical
 * stepper's label is always beside its icon, because there is nowhere else for it
 * to go. Material ignores it in that case rather than erroring.
 */
export type UiStepperLabelPosition = 'end' | 'bottom';

/**
 * Emitted by {@link Stepper.selectionChange} when the selected step changes.
 *
 * This is Material's own `StepperSelectionEvent` with the steps mapped back to
 * the {@link Step}s the consumer actually wrote: Material's event carries its
 * internal `MatStep`s, which are an implementation detail of this component's
 * template and have no `label()` a consumer could read.
 */
export interface UiStepperSelectionEvent {
  /** Index of the step now selected. */
  readonly selectedIndex: number;
  /** Index of the step that was selected before. */
  readonly previouslySelectedIndex: number;
  /** The step now selected. */
  readonly selectedStep: Step;
  /** The step that was selected before. */
  readonly previouslySelectedStep: Step;
}

/**
 * A themed Material stepper: `<mat-stepper>` over the {@link Step}s projected
 * into it.
 *
 * ```html
 * <ui-stepper linear [(selectedIndex)]="step">
 *   <ui-step label="Address" [stepControl]="address">
 *     <form [formGroup]="address">…</form>
 *     <button matButton uiButton matStepperNext>Next</button>
 *   </ui-step>
 *   <ui-step label="Review" editable="false">…</ui-step>
 * </ui-stepper>
 * ```
 *
 * Like `ui-tabs` and unlike `uiButton`, this is a component rather than a
 * directive: a stepper owns *composition* — a header of steps and the one body
 * they switch between. There is no single native element to decorate.
 *
 * ### It is Material, not a re-implementation
 *
 * The header, the state icons, the connecting lines, the ripples, the body's
 * animation, the roving focus and every colour are `<mat-stepper>`'s own,
 * resolved from the `--mat-sys-*` tokens that `src/styles/_theme.scss` emits — so
 * there is not a literal colour in `stepper.scss`, and a palette change there
 * re-skins every stepper in the fleet, in light and dark alike.
 *
 * That includes the keyboard: arrow keys move between headers, `Home`/`End` jump
 * to the ends, `Enter`/`Space` selects — all Material's, none re-implemented here.
 *
 * ### Navigation buttons
 *
 * Use `uiStepperNext` / `uiStepperPrevious` inside a step, not Material's
 * `matStepperNext` / `matStepperPrevious` — the latter cannot find a `CdkStepper`
 * from inside a `<ui-step>` and throw. See `StepperNext` for why, and for the
 * plain-Angular alternative. The move itself is Material's either way.
 *
 * {@link next}, {@link previous} and {@link reset} are the same verbs for a
 * consumer driving the stepper from its `exportAs` reference instead.
 *
 * ### Linear steppers and validation
 *
 * `linear` makes the stepper refuse to move past a step whose
 * {@link Step.stepControl} is invalid. Give each gated step a control — a
 * `FormGroup` from either `[(ngModel)]` or reactive forms — and the stepper does
 * the rest: it marks the step complete when the control turns valid, and shows an
 * error on its header once the user has tried to leave it invalid.
 *
 * The error state is on by default here, where Material ships it off (its
 * `showError` global option): a step the user filled in wrongly and moved on from
 * otherwise looks exactly like one they have not reached yet, so the header says
 * which step to go back to. Note Material only ever shows it on a step that is not
 * selected — the one you are standing in is never marked, on the grounds that the
 * form in front of you is already saying so. An app that disagrees can provide
 * `STEPPER_GLOBAL_OPTIONS` above the stepper and this component defers to it.
 *
 * ### Selection
 *
 * `[(selectedIndex)]` is a `model` (rule 5), so the index is one piece of state
 * rather than an input and an output that can disagree; `(selectedIndexChange)`
 * on its own is the read-only half, and {@link selectionChange} is the richer
 * event carrying the steps either side of the move.
 *
 * The index a consumer writes is always reconciled against the step actually on
 * screen, which is not something Material does for you — see the constructor.
 *
 * ### Styling hooks
 *
 * - `--ui-stepper-color` / `--ui-stepper-on-color` — the state icon of the
 *   selected, done and editable steps, and the glyph on it. Default to the
 *   theme's `primary` pair.
 * - `--ui-stepper-label-text-color` / `--ui-stepper-selected-label-text-color` —
 *   the header text.
 * - `--ui-stepper-error-color` — the error state's icon and label.
 * - `--ui-stepper-line-color` — the rule connecting the headers.
 * - `--ui-stepper-container-color` — the stepper's own background.
 *
 * Point the colours at another `--mat-sys-*` role rather than a literal, so they
 * survive a palette change and dark mode:
 * `ui-stepper { --ui-stepper-color: var(--mat-sys-tertiary); }`. That is an
 * ordinary rule on an ordinary selector — no `::ng-deep`.
 *
 * The header height is deliberately not a hook: it is Material's density token,
 * and density is a fleet-wide decision `_theme.scss` owns rather than one a single
 * stepper should re-take.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiStepper'` hands back the component, and {@link matStepper} hands
 * back Material's own instance — so `stepper.matStepper().animationDuration` or
 * `stepper.matStepper().selected` needs no API here (rule 4).
 */
@Component({
  selector: 'ui-stepper',
  exportAs: 'uiStepper',
  imports: [MatStepper, MatStep, MatStepLabel, NgTemplateOutlet],
  templateUrl: './stepper.html',
  styleUrl: './stepper.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      // Material ships `showError` off, so a step the user left half-filled looks
      // exactly like one they have not reached yet. Turning it on is the kind of
      // fleet-wide default this library exists to set.
      //
      // `skipSelf` rather than a flat value so this is a *default* and not a
      // ceiling: an app that provides `STEPPER_GLOBAL_OPTIONS` anywhere above a
      // `<ui-stepper>` still wins, including turning `showError` back off.
      provide: STEPPER_GLOBAL_OPTIONS,
      useFactory: () => ({
        showError: true,
        ...inject(STEPPER_GLOBAL_OPTIONS, { optional: true, skipSelf: true }),
      }),
    },
  ],
})
export class Stepper {
  /**
   * The index of the selected step, two-way.
   *
   * A `model` rather than an input/output pair (rule 5): `[(selectedIndex)]` keeps
   * a signal in step with the stepper, `[selectedIndex]` drives it one way, and
   * `(selectedIndexChange)` observes it — all from one declaration, with no way
   * for the two halves to disagree.
   *
   * Whatever a consumer writes here, this signal settles on the step that is
   * actually selected: an out-of-range index, or a move a linear stepper refuses,
   * comes back corrected through this same signal. See the constructor.
   */
  readonly selectedIndex = model(0);

  /** Which way the steps run. Defaults to `horizontal`, as Material does. */
  readonly orientation = input<UiStepperOrientation>('horizontal');

  /**
   * Whether the user has to complete each step before moving to the next.
   *
   * Off by default, as in Material. A linear stepper only gates on steps that have
   * a {@link Step.stepControl} to gate on — see the class docs.
   */
  readonly linear = input(false, { transform: booleanAttribute });

  /**
   * Where a horizontal stepper's labels sit relative to their icons. Defaults to
   * `end`, as Material does. See {@link UiStepperLabelPosition}.
   */
  readonly labelPosition = input<UiStepperLabelPosition>('end');

  /** Whether Material's ripple is suppressed on every header. */
  readonly disableRipple = input(false, { transform: booleanAttribute });

  /**
   * The stepper's accessible name, spelled as the ARIA attribute — what the steps
   * are *of*, e.g. `Checkout`.
   *
   * An input rather than an attribute left on the host, because the host is not
   * the element carrying the role: Material renders the `role="tablist"` inside
   * the header, and this is put on it.
   */
  readonly ariaLabel = input<string | undefined, unknown>(undefined, {
    alias: 'aria-label',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * Emits when the selected step changes, with the steps either side of the move.
   *
   * The narrower `(selectedIndexChange)` from {@link selectedIndex} is the same
   * event with only the new index; this one is for a consumer that needs to know
   * what was left as well as what was arrived at.
   */
  readonly selectionChange = output<UiStepperSelectionEvent>();

  /**
   * The steps projected into this stepper, in the order they are declared.
   *
   * Direct children only, so a `ui-stepper` nested inside a step's content keeps
   * its own steps rather than donating them to this header.
   */
  readonly steps = contentChildren(Step);

  /**
   * The `MatStepper` this component renders — the escape hatch for anything not
   * wrapped here (rule 4), e.g. `stepper.matStepper().animationDuration = '0ms'`.
   * Reach it with `#stepper="uiStepper"`.
   */
  readonly matStepper = viewChild.required(MatStepper);

  /** Selects the next step, subject to a linear stepper's validation. */
  next(): void {
    this.matStepper().next();
  }

  /** Selects the previous step, if it is {@link Step.editable}. */
  previous(): void {
    this.matStepper().previous();
  }

  /**
   * Returns the stepper to its first step and clears every step's state —
   * including resetting the forms behind their {@link Step.stepControl}s.
   */
  reset(): void {
    this.matStepper().reset();
  }

  /**
   * The `MatStep`s Material currently has, as a signal.
   *
   * Not the same list as `steps()`, and the difference matters: `steps()` is the
   * `<ui-step>`s a consumer projected, while these are the `<mat-step>`s this
   * component's template generates from them — which do not exist until that
   * template has run, a change-detection pass later. Material validates an index
   * against *its* list, so that is the list the reconciliation below has to wait
   * for and clamp against; using ours throws the moment a step is added.
   *
   * The two are one-for-one and in the same order, because the template's `@for`
   * generates them that way.
   */
  private readonly matSteps = signal<readonly MatStep[]>([]);

  constructor() {
    // Material's `steps` is a QueryList rather than a signal, so it is mirrored
    // into one here. The QueryList instance is stable — Material resets it in
    // place — so this subscribes once.
    effect((onCleanup) => {
      const steps = this.matStepper().steps;
      const sync = () => this.matSteps.set(steps.toArray());

      sync();
      const subscription = steps.changes.subscribe(sync);
      onCleanup(() => subscription.unsubscribe());
    });

    // `completed` is pushed onto Material rather than bound in the template.
    //
    // Material declares the input with a `booleanAttribute` transform, and that
    // transform runs on whatever a binding carries — so `[completed]="undefined"`
    // arrives at `MatStep` as `false`. The two are not the same thing: `false`
    // means "this step is not done, whatever its control says", which pins a
    // linear stepper in place forever, while unset means "work it out from the
    // control and whether the user has been here". Assigning the property
    // directly skips the transform, so `undefined` survives and Material keeps
    // deciding — which is what an untouched `<ui-step>` must get.
    effect(() => {
      const matSteps = this.matSteps();

      this.steps().forEach((step, index) => {
        const matStep = matSteps[index];
        if (matStep) {
          // `undefined` is exactly the value that hands the decision back — see
          // `CdkStep.completed`, which treats a null-ish override as "unset".
          matStep.completed = step.completed() as boolean;
        }
      });
    });

    // Material's `selectedIndex` setter is unusually sharp for a two-way binding
    // to sit on, in two ways this reconciles.
    //
    // 1. It *throws* on an out-of-range index rather than clamping — unlike
    //    `<mat-tab-group>`, which is why `ui-tabs` needs nothing like this. A `5`
    //    bound to a three-step stepper would take the app down.
    // 2. It *silently refuses* a move it does not like — past an invalid step in a
    //    linear stepper, or backwards onto a non-editable one — leaving the
    //    binding holding an index that is not the step on screen, and emitting
    //    nothing to say so.
    //
    // So the index is written through here rather than bound in the template:
    // clamped on the way in, and read straight back out so that whatever Material
    // settled on is what `selectedIndex()` reports. A refused move corrects itself
    // through the same signal, and a consumer hears about it on
    // `selectedIndexChange` rather than having to re-derive it.
    effect(() => {
      const requested = this.selectedIndex();
      const count = this.matSteps().length;
      if (count === 0) {
        // Nothing to select against — an index bound before the steps arrive is
        // applied as soon as they do, on this effect's next run.
        return;
      }

      // Everything below reads Material's own state, which is signal-backed:
      // tracking it would make this effect re-run on a user's click and fight the
      // selection it just made.
      untracked(() => {
        const stepper = this.matStepper();
        stepper.selectedIndex = Math.min(Math.max(requested, 0), count - 1);

        const actual = stepper.selectedIndex;
        if (actual !== requested) {
          this.selectedIndex.set(actual);
        }
      });
    });
  }

  /**
   * Re-emits Material's selection event against the steps the consumer wrote.
   * @docs-private
   */
  protected onSelectionChange(event: StepperSelectionEvent): void {
    const steps = this.steps();
    const selectedStep = steps[event.selectedIndex];
    const previouslySelectedStep = steps[event.previouslySelectedIndex];

    // Both are found for every move of a stepper that is settled, because the
    // `<mat-step>`s are generated one-for-one from `steps()`. The guard is for the
    // frame in which a step is removed: Material can report an index against the
    // list it had, and an event naming a step that no longer exists would be a
    // lie a consumer's `event.selectedStep.label()` would crash on.
    if (selectedStep && previouslySelectedStep) {
      this.selectionChange.emit({
        selectedIndex: event.selectedIndex,
        previouslySelectedIndex: event.previouslySelectedIndex,
        selectedStep,
        previouslySelectedStep,
      });
    }
  }
}
