import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatStepper } from '@angular/material/stepper';

import { StepperNext, StepperPrevious } from './stepper-navigation';

import { Step, StepLabelDef } from './step';
import { Stepper, type UiStepperOrientation, type UiStepperSelectionEvent } from './stepper';

interface StepSpec {
  label: string;
  body: string;
  editable?: boolean;
  optional?: boolean;
}

const STEPS: StepSpec[] = [
  { label: 'Address', body: '12 Mill Lane' },
  { label: 'Payment', body: 'Card ending 4213' },
  { label: 'Review', body: 'Three items, one box' },
];

@Component({
  imports: [Stepper, Step],
  template: `
    <ui-stepper
      #ref="uiStepper"
      [(selectedIndex)]="selectedIndex"
      [orientation]="orientation()"
      [linear]="linear()"
      (selectionChange)="events.push($event)"
      aria-label="Checkout"
    >
      @for (step of steps(); track step.label) {
        <ui-step [label]="step.label" [editable]="step.editable ?? true" [optional]="!!step.optional">
          <p class="body">{{ step.body }}</p>
        </ui-step>
      }
    </ui-stepper>
  `,
})
class TestHost {
  readonly steps = signal<StepSpec[]>(STEPS);
  readonly selectedIndex = signal(0);
  readonly orientation = signal<UiStepperOrientation>('horizontal');
  readonly linear = signal(false);
  readonly ref = viewChild.required<Stepper>('ref');
  readonly events: UiStepperSelectionEvent[] = [];
}

/**
 * Material's own switch for the stepper's animations.
 *
 * Without it the body's transition never resolves in jsdom, so every assertion
 * about what is on screen would be racing a `transitionend` that does not arrive.
 * This is Material's public token rather than `provideNoopAnimations()`, which is
 * the same thing plus an animations module.
 */
const noAnimations = { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } };

describe('Stepper', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  const queryAll = (selector: string): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll(selector));

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  /** The step header elements Material renders, in order. */
  const headers = (): HTMLElement[] => queryAll('.mat-step-header');

  /** The label text of each header. */
  const labels = (): string[] =>
    queryAll('.mat-step-text-label').map((label) => label.textContent?.trim() ?? '');

  const click = async (index: number) => {
    headers()[index].click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [noAnimations] });
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('renders Material’s stepper rather than markup of its own', () => {
    expect(query('mat-stepper')).not.toBeNull();
    expect(host.ref().matStepper()).toBeInstanceOf(MatStepper);
  });

  describe('projected steps', () => {
    it('renders one Material step per ui-step, labelled and in order', () => {
      expect(labels()).toEqual(['Address', 'Payment', 'Review']);
      expect(host.ref().steps().length).toBe(3);
    });

    // The body has to end up *inside* Material's step content rather than in a box
    // of ours beside it: that is what ties the content to its header through
    // `aria-labelledby`, and what the animation moves.
    it('renders a step’s content inside Material’s step body', () => {
      const body = query('.body')!;

      expect(body.textContent).toBe('12 Mill Lane');
      expect(body.closest('.mat-horizontal-stepper-content')).not.toBeNull();
    });

    // `<ui-step>` is a declaration, not a box — it captures its content in a
    // template for the stepper to render. If it rendered anything itself, every
    // step's content would also be sitting on the page outside the stepper.
    it('renders nothing on the ui-step host itself', () => {
      for (const element of queryAll('ui-step')) {
        expect(element.textContent).toBe('');
      }
    });

    it('picks up a step added after the first render', async () => {
      host.steps.update((steps) => [...steps, { label: 'Done', body: 'Thanks' }]);
      await fixture.whenStable();

      expect(labels()).toEqual(['Address', 'Payment', 'Review', 'Done']);
    });

    it('drops a step that is removed', async () => {
      host.steps.update((steps) => steps.slice(0, 2));
      await fixture.whenStable();

      expect(labels()).toEqual(['Address', 'Payment']);
    });

    it('marks an optional step as such', async () => {
      host.steps.update((steps) =>
        steps.map((step) => (step.label === 'Payment' ? { ...step, optional: true } : step)),
      );
      await fixture.whenStable();

      expect(headers()[1].textContent).toContain('Optional');
      expect(headers()[0].textContent).not.toContain('Optional');
    });
  });

  describe('orientation', () => {
    it('runs horizontally by default, as Material does', () => {
      expect(host.ref().orientation()).toBe('horizontal');
      expect(query('mat-stepper')!.classList).toContain('mat-stepper-horizontal');
    });

    it('runs vertically when asked', async () => {
      host.orientation.set('vertical');
      await fixture.whenStable();

      expect(query('mat-stepper')!.classList).toContain('mat-stepper-vertical');
      expect(query('mat-stepper')!.classList).not.toContain('mat-stepper-horizontal');
      // The content moves into Material's vertical container rather than merely
      // being re-styled, which is why this is Material's input and not our CSS.
      expect(query('.body')!.closest('.mat-vertical-content')).not.toBeNull();
    });

    it('goes back to horizontal', async () => {
      host.orientation.set('vertical');
      await fixture.whenStable();
      host.orientation.set('horizontal');
      await fixture.whenStable();

      expect(query('mat-stepper')!.classList).toContain('mat-stepper-horizontal');
    });
  });

  describe('selectedIndex', () => {
    it('defaults to the first step', () => {
      expect(host.ref().selectedIndex()).toBe(0);
      expect(headers()[0].getAttribute('aria-selected')).toBe('true');
    });

    it('selects the bound index', async () => {
      host.selectedIndex.set(2);
      await fixture.whenStable();

      expect(headers()[2].getAttribute('aria-selected')).toBe('true');
    });

    // The `model` half of rule 5: a click has to write back through the same
    // signal the template bound, or a consumer's state silently diverges from
    // what is on screen.
    it('writes a user’s click back through the two-way binding', async () => {
      await click(1);

      expect(host.selectedIndex()).toBe(1);
      expect(host.ref().selectedIndex()).toBe(1);
      expect(headers()[1].getAttribute('aria-selected')).toBe('true');
    });

    // Material's setter *throws* on an out-of-range index rather than clamping —
    // unlike `<mat-tab-group>`. An unclamped binding would take the app down.
    it('settles on the last step when bound past the end', async () => {
      host.selectedIndex.set(5);
      await fixture.whenStable();

      expect(host.selectedIndex()).toBe(2);
      expect(headers()[2].getAttribute('aria-selected')).toBe('true');
    });

    it('settles on the first step when bound below zero', async () => {
      host.selectedIndex.set(-1);
      await fixture.whenStable();

      expect(host.selectedIndex()).toBe(0);
      expect(headers()[0].getAttribute('aria-selected')).toBe('true');
    });

    it('applies an index bound before the steps arrive', async () => {
      @Component({
        imports: [Stepper, Step],
        template: `
          <ui-stepper [selectedIndex]="2">
            @for (label of labels(); track label) {
              <ui-step [label]="label">{{ label }}</ui-step>
            }
          </ui-stepper>
        `,
      })
      class LateHost {
        readonly labels = signal<string[]>([]);
      }

      const f = TestBed.createComponent(LateHost);
      await f.whenStable();
      f.componentInstance.labels.set(['One', 'Two', 'Three']);
      await f.whenStable();

      expect(
        f.nativeElement.querySelectorAll('.mat-step-header')[2].getAttribute('aria-selected'),
      ).toBe('true');
    });

    it('emits selectedIndexChange for a user’s click but not for a one-way write', async () => {
      const emitted: number[] = [];

      @Component({
        imports: [Stepper, Step],
        template: `
          <ui-stepper [selectedIndex]="index()" (selectedIndexChange)="changed($event)">
            <ui-step label="One">1</ui-step>
            <ui-step label="Two">2</ui-step>
          </ui-stepper>
        `,
      })
      class OneWayHost {
        readonly index = signal(1);
        changed(index: number) {
          emitted.push(index);
        }
      }

      const f = TestBed.createComponent(OneWayHost);
      await f.whenStable();
      // A one-way write is the consumer's own state arriving; echoing it back
      // would be a loop, so nothing is emitted for it.
      f.componentInstance.index.set(0);
      await f.whenStable();
      expect(emitted).toEqual([]);

      (f.nativeElement.querySelectorAll('.mat-step-header')[1] as HTMLElement).click();
      await f.whenStable();

      expect(emitted).toEqual([1]);
    });
  });

  describe('selectionChange', () => {
    it('reports the steps either side of the move, not Material’s internals', async () => {
      await click(2);

      expect(host.events.length).toBe(1);
      const event = host.events[0];
      expect(event.selectedIndex).toBe(2);
      expect(event.previouslySelectedIndex).toBe(0);
      // The steps a consumer can actually read — `ui-step`, not `mat-step`.
      expect(event.selectedStep).toBeInstanceOf(Step);
      expect(event.selectedStep.label()).toBe('Review');
      expect(event.previouslySelectedStep.label()).toBe('Address');
    });

    it('does not fire when the selection does not move', async () => {
      host.selectedIndex.set(0);
      await fixture.whenStable();

      expect(host.events).toEqual([]);
    });
  });

  describe('linear', () => {
    @Component({
      imports: [Stepper, Step, ReactiveFormsModule, StepperNext, StepperPrevious],
      template: `
        <ui-stepper #ref="uiStepper" linear [(selectedIndex)]="selectedIndex">
          <ui-step label="Address" [stepControl]="address">
            <button class="next" uiStepperNext>Next</button>
          </ui-step>
          <ui-step label="Payment" [stepControl]="payment">
            <button class="back" uiStepperPrevious>Back</button>
          </ui-step>
          <ui-step label="Review">Done</ui-step>
        </ui-stepper>
      `,
    })
    class LinearHost {
      readonly address = new FormGroup({
        line: new FormControl('', Validators.required),
      });
      readonly payment = new FormGroup({
        card: new FormControl('', Validators.required),
      });
      readonly selectedIndex = signal(0);
      readonly ref = viewChild.required<Stepper>('ref');
    }

    let f: ComponentFixture<LinearHost>;
    let linear: LinearHost;

    const linearHeaders = (): HTMLElement[] =>
      Array.from(f.nativeElement.querySelectorAll('.mat-step-header'));

    beforeEach(async () => {
      f = TestBed.createComponent(LinearHost);
      linear = f.componentInstance;
      await f.whenStable();
    });

    it('refuses to advance past a step whose control is invalid', async () => {
      linearHeaders()[1].click();
      await f.whenStable();

      expect(linear.selectedIndex()).toBe(0);
      expect(linearHeaders()[0].getAttribute('aria-selected')).toBe('true');
    });

    // Material *silently refuses* a move it does not like, emitting nothing — so a
    // consumer's `[(selectedIndex)]` would be left holding an index that is not
    // the step on screen. Rule 5: the two halves must not be able to disagree.
    it('snaps a programmatic move it refuses back to the step on screen', async () => {
      linear.selectedIndex.set(2);
      await f.whenStable();

      expect(linear.selectedIndex()).toBe(0);
      expect(linear.ref().matStepper().selectedIndex).toBe(0);
      expect(linearHeaders()[0].getAttribute('aria-selected')).toBe('true');
    });

    it('advances once the control is valid', async () => {
      linear.address.setValue({ line: '12 Mill Lane' });
      await f.whenStable();

      linear.selectedIndex.set(1);
      await f.whenStable();

      expect(linear.selectedIndex()).toBe(1);
      expect(linearHeaders()[1].getAttribute('aria-selected')).toBe('true');
    });

    it('marks a step done once its control is valid and the user has left it', async () => {
      linear.address.setValue({ line: '12 Mill Lane' });
      await f.whenStable();
      linear.selectedIndex.set(1);
      await f.whenStable();

      expect(linear.ref().matStepper().steps.toArray()[0].completed).toBe(true);
      expect(f.nativeElement.querySelector('.mat-step-icon-state-edit')).not.toBeNull();
    });

    // Rule 2: needing a workaround to put a Next button in a step would mean the
    // API was wrong. Material's own directives inject `CdkStepper` from where they
    // are *written* — inside `<ui-step>`, above this component's template — so
    // `ui-stepper` re-provides it for them.
    describe('uiStepperNext / uiStepperPrevious', () => {
      it('advances on uiStepperNext', async () => {
        linear.address.setValue({ line: '12 Mill Lane' });
        await f.whenStable();

        f.nativeElement.querySelector('.next').click();
        await f.whenStable();

        expect(linear.selectedIndex()).toBe(1);
      });

      it('is gated by the same validation as everything else', async () => {
        f.nativeElement.querySelector('.next').click();
        await f.whenStable();

        expect(linear.selectedIndex()).toBe(0);
      });

      it('goes back on uiStepperPrevious', async () => {
        linear.address.setValue({ line: '12 Mill Lane' });
        await f.whenStable();
        f.nativeElement.querySelector('.next').click();
        await f.whenStable();

        f.nativeElement.querySelector('.back').click();
        await f.whenStable();

        expect(linear.selectedIndex()).toBe(0);
      });
    });

    it('exposes next/previous/reset on the component', async () => {
      linear.address.setValue({ line: '12 Mill Lane' });
      await f.whenStable();

      linear.ref().next();
      await f.whenStable();
      expect(linear.selectedIndex()).toBe(1);

      linear.ref().previous();
      await f.whenStable();
      expect(linear.selectedIndex()).toBe(0);

      linear.ref().next();
      await f.whenStable();
      linear.ref().reset();
      await f.whenStable();

      expect(linear.selectedIndex()).toBe(0);
      // reset() clears the forms behind the step controls, not just the position.
      expect(linear.address.value).toEqual({ line: null });
    });
  });

  // Material derives completion for itself; the input is an override for the cases
  // it cannot see. Collapsing "unset" onto `false` would leave a step permanently
  // incomplete and a linear stepper unable to advance.
  describe('completed', () => {
    @Component({
      imports: [Stepper, Step],
      template: `
        <ui-stepper #ref="uiStepper" linear>
          <ui-step label="Upload" [completed]="done()">One</ui-step>
          <ui-step label="Review">Two</ui-step>
        </ui-stepper>
      `,
    })
    class CompletedHost {
      readonly done = signal<boolean | undefined>(false);
      readonly ref = viewChild.required<Stepper>('ref');
    }

    let f: ComponentFixture<CompletedHost>;
    let completedHost: CompletedHost;

    const select = async (index: number) => {
      (f.nativeElement.querySelectorAll('.mat-step-header')[index] as HTMLElement).click();
      await f.whenStable();
    };

    beforeEach(async () => {
      f = TestBed.createComponent(CompletedHost);
      completedHost = f.componentInstance;
      await f.whenStable();
    });

    it('holds a linear stepper on a step the consumer says is not done', async () => {
      await select(1);

      expect(f.componentInstance.ref().matStepper().selectedIndex).toBe(0);
    });

    it('lets it move once the consumer says the step is done', async () => {
      completedHost.done.set(true);
      await f.whenStable();

      await select(1);

      expect(completedHost.ref().matStepper().selectedIndex).toBe(1);
    });

    it('hands the decision back to Material when unset', async () => {
      completedHost.done.set(undefined);
      await f.whenStable();

      // No step control and no override, so Material completes the step as soon as
      // the user tries to leave it — which `false` would have prevented forever.
      await select(1);

      expect(completedHost.ref().matStepper().selectedIndex).toBe(1);
    });

    it('reads the bare attribute rather than only a binding', async () => {
      @Component({
        imports: [Stepper, Step],
        template: `
          <ui-stepper>
            <ui-step #ref="uiStep" label="One" completed>1</ui-step>
          </ui-stepper>
        `,
      })
      class AttrHost {
        readonly ref = viewChild.required<Step>('ref');
      }

      const attr = TestBed.createComponent(AttrHost);
      await attr.whenStable();

      expect(attr.componentInstance.ref().completed()).toBe(true);
    });

    it('leaves completed undefined when the attribute is absent', () => {
      @Component({
        imports: [Stepper, Step],
        template: `<ui-stepper><ui-step #ref="uiStep" label="One">1</ui-step></ui-stepper>`,
      })
      class BareHost {
        readonly ref = viewChild.required<Step>('ref');
      }

      const bare = TestBed.createComponent(BareHost);
      bare.detectChanges();

      expect(bare.componentInstance.ref().completed()).toBeUndefined();
    });
  });

  describe('editable', () => {
    it('lets the user return to a completed step by default', async () => {
      await click(1);
      await click(0);

      expect(host.selectedIndex()).toBe(0);
    });

    it('refuses a backwards move onto a step that is not editable', async () => {
      host.steps.update((steps) =>
        steps.map((step) => (step.label === 'Address' ? { ...step, editable: false } : step)),
      );
      await fixture.whenStable();

      await click(1);
      await click(0);

      // The stepper stays put, and the binding says so rather than claiming a move
      // that did not happen.
      expect(host.selectedIndex()).toBe(1);
      expect(headers()[1].getAttribute('aria-selected')).toBe('true');
    });

    it('marks a non-editable completed step done rather than editable', async () => {
      host.steps.update((steps) =>
        steps.map((step) => (step.label === 'Address' ? { ...step, editable: false } : step)),
      );
      await fixture.whenStable();
      await click(1);

      expect(query('.mat-step-icon-state-done')).not.toBeNull();
    });
  });

  describe('custom label templates', () => {
    @Component({
      imports: [Stepper, Step, StepLabelDef],
      template: `
        <ui-stepper>
          <ui-step label="Address">
            <ng-template uiStepLabel>
              <span class="custom-label">Address<em>2</em></span>
            </ng-template>
            Body
          </ui-step>
          <ui-step label="Review">Reviewed</ui-step>
        </ui-stepper>
      `,
    })
    class LabelHost {}

    let f: ComponentFixture<LabelHost>;

    beforeEach(async () => {
      f = TestBed.createComponent(LabelHost);
      await f.whenStable();
    });

    // Rule 7: the header is the one part of a step a consumer cannot project into,
    // so it is a template rather than a string-only input.
    it('renders the template inside Material’s header, in place of the label', () => {
      const custom = f.nativeElement.querySelector('.custom-label');

      expect(custom).not.toBeNull();
      expect(custom.closest('.mat-step-header')).toBe(
        f.nativeElement.querySelectorAll('.mat-step-header')[0],
      );
      expect(custom.textContent).toContain('2');
    });

    it('leaves a step without one on its label string', () => {
      const stepLabels = f.nativeElement.querySelectorAll('.mat-step-text-label');

      expect(stepLabels[stepLabels.length - 1].textContent.trim()).toBe('Review');
    });
  });

  describe('accessibility', () => {
    it('names Material’s tablist from aria-label', () => {
      expect(query('[role="tablist"]')!.getAttribute('aria-label')).toBe('Checkout');
    });

    it('leaves no empty aria-label behind when unnamed', async () => {
      @Component({
        imports: [Stepper, Step],
        template: `<ui-stepper><ui-step label="One">1</ui-step></ui-stepper>`,
      })
      class UnnamedHost {}

      const f = TestBed.createComponent(UnnamedHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('[role="tablist"]').hasAttribute('aria-label')).toBe(
        false,
      );
    });

    it('keeps Material’s header/content wiring', () => {
      const header = headers()[0];
      const content = query('.mat-horizontal-stepper-content')!;

      expect(header.getAttribute('role')).toBe('tab');
      expect(header.getAttribute('aria-controls')).toBe(content.id);
      expect(content.getAttribute('aria-labelledby')).toBe(header.id);
    });

    // A step whose rendered label is not the whole story — an icon, a count — can
    // still be named, and the name has to reach Material's header element rather
    // than sit on a `<ui-step>` host that no assistive tech ever sees.
    it('puts a ui-step’s aria-label on Material’s header element', async () => {
      @Component({
        imports: [Stepper, Step],
        template: `
          <ui-stepper>
            <ui-step label="Address" aria-label="Address, 2 problems">Body</ui-step>
          </ui-stepper>
        `,
      })
      class AriaHost {}

      const f = TestBed.createComponent(AriaHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('.mat-step-header').getAttribute('aria-label')).toBe(
        'Address, 2 problems',
      );
    });
  });

  // Material shows the error state on a step the user has *left* in an invalid
  // state — never on the one they are standing in, which is why these steppers are
  // not linear: a linear stepper would refuse the move and keep the step selected.
  describe('the error state', () => {
    @Component({
      imports: [Stepper, Step],
      template: `
        <ui-stepper>
          <ui-step label="Address" [stepControl]="address">Body</ui-step>
          <ui-step label="Review">Done</ui-step>
        </ui-stepper>
      `,
    })
    class ErrorHost {
      readonly address = new FormGroup({ line: new FormControl('', Validators.required) });
    }

    const leaveFirstStep = async (f: ComponentFixture<unknown>) => {
      (f.nativeElement.querySelectorAll('.mat-step-header')[1] as HTMLElement).click();
      await f.whenStable();
    };

    // Material ships `showError` off, which leaves a step the user abandoned
    // half-filled looking exactly like one they have not reached yet. This library
    // turns it on, so the header says which step needs going back to.
    it('flags a step left invalid, where Material’s default would stay silent', async () => {
      const f = TestBed.createComponent(ErrorHost);
      await f.whenStable();
      expect(f.nativeElement.querySelector('.mat-step-icon-state-error')).toBeNull();

      await leaveFirstStep(f);

      expect(f.nativeElement.querySelector('.mat-step-icon-state-error')).not.toBeNull();
    });

    it('leaves a step that was filled in correctly alone', async () => {
      const f = TestBed.createComponent(ErrorHost);
      await f.whenStable();
      f.componentInstance.address.setValue({ line: '12 Mill Lane' });
      await f.whenStable();

      await leaveFirstStep(f);

      expect(f.nativeElement.querySelector('.mat-step-icon-state-error')).toBeNull();
    });

    // The `showError` default is a default, not a ceiling: an app that provides
    // Material's own token above a `<ui-stepper>` still wins.
    it('defers to a STEPPER_GLOBAL_OPTIONS provided above it', async () => {
      @Component({
        imports: [Stepper, Step],
        template: `
          <ui-stepper>
            <ui-step label="Address" [stepControl]="address">Body</ui-step>
            <ui-step label="Review">Done</ui-step>
          </ui-stepper>
        `,
        providers: [{ provide: STEPPER_GLOBAL_OPTIONS, useValue: { showError: false } }],
      })
      class NoErrorHost {
        readonly address = new FormGroup({ line: new FormControl('', Validators.required) });
      }

      const f = TestBed.createComponent(NoErrorHost);
      await f.whenStable();

      await leaveFirstStep(f);

      expect(f.nativeElement.querySelector('.mat-step-icon-state-error')).toBeNull();
    });
  });

  describe('escape hatches', () => {
    it('exposes the component instance via exportAs', () => {
      expect(host.ref()).toBeInstanceOf(Stepper);
    });

    // Rule 4: Material's own instance is the way out of anything not wrapped here.
    it('exposes the underlying MatStepper instance', () => {
      expect(host.ref().matStepper()).toBeInstanceOf(MatStepper);
      expect(host.ref().matStepper().selectedIndex).toBe(0);
    });

    it('exposes the projected steps', () => {
      expect(
        host
          .ref()
          .steps()
          .map((step) => step.label()),
      ).toEqual(['Address', 'Payment', 'Review']);
    });
  });

  // The colours are Material's, resolved from the shared theme's tokens. This
  // component only re-points those tokens at hooks whose defaults are the tokens
  // Material would have used anyway.
  describe('theming', () => {
    // These read the *declaration* rather than a painted colour, on purpose:
    // `ng test` runs in jsdom, which does not substitute `var()` at all. What the
    // stepper resolves to under the real theme is asserted by the Storybook
    // stories, which run in Chromium.
    const declaration = (token: string) =>
      getComputedStyle(query('ui-stepper')!).getPropertyValue(`--mat-stepper-${token}`);

    const NO_LITERAL = /#[0-9a-f]{3,8}\b|\brgba?\(/i;

    it('resolves the state icon from the theme, not a literal', () => {
      expect(declaration('header-selected-state-icon-background-color')).toContain(
        'var(--ui-stepper-color',
      );
      expect(declaration('header-selected-state-icon-background-color')).toContain(
        'var(--mat-sys-primary)',
      );
      expect(declaration('header-selected-state-icon-background-color')).not.toMatch(NO_LITERAL);
    });

    // Selected, done and editable are one decision: a stepper whose done icon is a
    // different colour from its selected icon would be a bug, not a design.
    it('keeps every state icon on the same hook', () => {
      const selected = declaration('header-selected-state-icon-background-color');

      expect(declaration('header-done-state-icon-background-color')).toBe(selected);
      expect(declaration('header-edit-state-icon-background-color')).toBe(selected);
    });

    it('resolves the label colours from the theme, not a literal', () => {
      expect(declaration('header-label-text-color')).toContain('var(--ui-stepper-label-text-color');
      expect(declaration('header-label-text-color')).toContain('var(--mat-sys-on-surface-variant)');
      expect(declaration('header-selected-state-label-text-color')).toContain(
        'var(--ui-stepper-selected-label-text-color',
      );
      expect(declaration('header-label-text-color')).not.toMatch(NO_LITERAL);
    });

    it('resolves the connecting line from the theme, not a literal', () => {
      expect(declaration('line-color')).toContain('var(--ui-stepper-line-color');
      expect(declaration('line-color')).toContain('var(--mat-sys-outline)');
    });

    it('resolves the error state from the theme’s error role, not a literal', () => {
      expect(declaration('header-error-state-label-text-color')).toContain(
        'var(--ui-stepper-error-color',
      );
      expect(declaration('header-error-state-label-text-color')).toContain('var(--mat-sys-error)');
      expect(declaration('header-error-state-label-text-color')).not.toMatch(NO_LITERAL);
    });

    // Density is the theme's decision, not this component's: a height hook here
    // would be a second way to set it, and a way for two apps to disagree.
    it('leaves the header height to the theme’s density token', () => {
      expect(declaration('header-height')).toBe('');
    });

    // The overrides are emitted on the host, which is what keeps a consumer off
    // `::ng-deep`: `--ui-stepper-color` set by an ordinary rule on `ui-stepper` —
    // or inherited from any ancestor — reaches the elements inside Material's
    // template by CSS's own inheritance.
    it('exposes the hooks on the host, not on Material’s internals', () => {
      expect(declaration('line-color')).not.toBe('');
      expect(
        getComputedStyle(query('mat-stepper')!).getPropertyValue('--mat-stepper-line-color'),
      ).toBe('');
    });
  });
});
