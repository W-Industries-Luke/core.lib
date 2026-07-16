import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';

import { Checkbox, type UiCheckboxLabelPosition } from './checkbox';

const LABEL_POSITIONS: readonly UiCheckboxLabelPosition[] = ['after', 'before'];

@Component({
  imports: [Checkbox],
  template: `
    <ui-checkbox
      #ref="uiCheckbox"
      [label]="label()"
      [disabled]="disabled()"
      [labelPosition]="labelPosition()"
      [required]="required()"
      [(checked)]="checked"
      [(indeterminate)]="indeterminate"
      (changed)="changes.push($event)"
    />
  `,
})
class TestHost {
  readonly label = signal<string | undefined>('Remember me');
  readonly disabled = signal(false);
  readonly labelPosition = signal<UiCheckboxLabelPosition>('after');
  readonly required = signal(false);
  readonly checked = signal(false);
  readonly indeterminate = signal(false);
  readonly changes: boolean[] = [];
  readonly ref = viewChild.required<Checkbox>('ref');
}

describe('Checkbox', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let loader: HarnessLoader;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  // The `MatCheckboxHarness` speaks Material's *public* test surface —
  // `isChecked()`, `isIndeterminate()`, `isDisabled()`, `isRequired()`,
  // `getLabelText()`, `toggle()` — instead of poking at the `<input>` Material
  // renders. Reaching into that input couples this spec to Material's internal
  // markup; the harness exists precisely so that when Material moves the detail,
  // the spec keeps passing. Everything the harness *cannot* see — this library's
  // attribute forwarding onto the real input, `<label for>` association,
  // Material's own layout classes, the `ControlValueAccessor` internals asserted
  // through the host `FormControl` — stays a DOM or instance assertion below.
  const checkbox = (
    f: ComponentFixture<unknown> = fixture,
    filter?: Parameters<typeof MatCheckboxHarness.with>[0],
  ): Promise<MatCheckboxHarness> =>
    TestbedHarnessEnvironment.loader(f).getHarness(MatCheckboxHarness.with(filter ?? {}));

  /** The real control — the `<input type="checkbox">` Material renders. */
  const input = (f: ComponentFixture<unknown> = fixture): HTMLInputElement =>
    f.nativeElement.querySelector('input[type="checkbox"]');

  /** Material's own `<label for>`, which the label content is projected into. */
  const label = (f: ComponentFixture<unknown> = fixture): HTMLLabelElement =>
    f.nativeElement.querySelector('label');

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  // The point of this library: the control is Material's, not a box painted to
  // look like one. If these fail, everything below is testing a lookalike.
  describe('composition', () => {
    it('renders Material’s checkbox', () => {
      expect(query('mat-checkbox')).not.toBeNull();
      expect(host.ref().matCheckbox()).toBeInstanceOf(MatCheckbox);
    });

    it('renders exactly one control, and it is a native checkbox', () => {
      const inputs = fixture.nativeElement.querySelectorAll('input');

      expect(inputs.length).toBe(1);
      expect(inputs[0].type).toBe('checkbox');
    });
  });

  describe('label', () => {
    it('renders the label inside Material’s own label element', async () => {
      expect(await (await loader.getHarness(MatCheckboxHarness)).getLabelText()).toBe('Remember me');
    });

    // Verifying Material's association rather than reimplementing it: `for`
    // pointing at the input's id is what makes clicking the text toggle the box
    // and a screen reader read the two as one control.
    it('is named by the label, the way Material names a checkbox', () => {
      expect(input().id).not.toBe('');
      expect(label().getAttribute('for')).toBe(input().id);
    });

    it('toggles the box when the label is clicked', async () => {
      label().click();
      await fixture.whenStable();

      expect(host.checked()).toBe(true);
    });

    it('renders nothing in the label when none is given', async () => {
      host.label.set(undefined);
      await fixture.whenStable();

      expect(await (await loader.getHarness(MatCheckboxHarness)).getLabelText()).toBe('');
    });

    it('renders projected content in place of the label string', async () => {
      @Component({
        imports: [Checkbox],
        template: `<ui-checkbox label="ignored"
          >I accept the <a href="/terms">terms</a></ui-checkbox
        >`,
      })
      class ContentHost {}

      const f = TestBed.createComponent(ContentHost);
      await f.whenStable();

      expect(await (await checkbox(f)).getLabelText()).toBe('I accept the terms');
      // Inside Material's own `<label for>`, so clicking the link's row still
      // reaches the box — the whole reason the content is projected there.
      expect(label(f).querySelector('a')).not.toBeNull();
    });
  });

  describe('checked', () => {
    it('reflects the model into the real input', async () => {
      const harness = await loader.getHarness(MatCheckboxHarness);
      expect(await harness.isChecked()).toBe(false);

      host.checked.set(true);
      await fixture.whenStable();

      expect(await harness.isChecked()).toBe(true);
    });

    it('reports a user’s click back through the two-way binding', async () => {
      const harness = await loader.getHarness(MatCheckboxHarness);
      await harness.toggle();

      expect(host.checked()).toBe(true);

      await harness.toggle();

      expect(host.checked()).toBe(false);
    });

    it('renders a box that starts ticked', async () => {
      @Component({
        imports: [Checkbox],
        template: `<ui-checkbox label="Remember me" [checked]="true" />`,
      })
      class CheckedHost {}

      const f = TestBed.createComponent(CheckedHost);
      await f.whenStable();

      expect(await (await checkbox(f)).isChecked()).toBe(true);
    });
  });

  describe('changed', () => {
    it('emits the new state when the user toggles the box', async () => {
      const harness = await loader.getHarness(MatCheckboxHarness);
      await harness.toggle();
      await harness.toggle();

      expect(host.changes).toEqual([true, false]);
    });

    // The distinction between `changed` and `checkedChange`: this one is the
    // user, so a form patch or a parent's "select all" must not fire it.
    it('does not emit when the state is set programmatically', async () => {
      host.checked.set(true);
      await fixture.whenStable();

      expect(host.changes).toEqual([]);
    });
  });

  describe('indeterminate', () => {
    beforeEach(async () => {
      host.indeterminate.set(true);
      await fixture.whenStable();
    });

    it('renders Material’s mixed state on the real input', async () => {
      expect(await (await loader.getHarness(MatCheckboxHarness)).isIndeterminate()).toBe(true);
      // The `aria-checked="mixed"` wiring is an accessibility detail the harness
      // does not surface, so this half stays a DOM read.
      expect(input().getAttribute('aria-checked')).toBe('mixed');
    });

    // A click is an answer, so the mixed state is over. It is two-way precisely
    // so a parent's signal does not go on claiming a state the DOM has left.
    it('clears itself on a click, and reports that back', async () => {
      const harness = await loader.getHarness(MatCheckboxHarness);
      await harness.toggle();

      expect(host.indeterminate()).toBe(false);
      expect(await harness.isIndeterminate()).toBe(false);
      expect(host.checked()).toBe(true);
    });

    it('is a display state, not a value: the control still reports checked', async () => {
      expect(host.checked()).toBe(false);
      expect(await (await loader.getHarness(MatCheckboxHarness)).isChecked()).toBe(false);
    });
  });

  describe('disabled', () => {
    it('disables the real input', async () => {
      const harness = await loader.getHarness(MatCheckboxHarness);
      expect(await harness.isDisabled()).toBe(false);

      host.disabled.set(true);
      await fixture.whenStable();

      expect(await harness.isDisabled()).toBe(true);
    });

    it('ignores a click while disabled', async () => {
      host.disabled.set(true);
      await fixture.whenStable();
      // The harness toggles by clicking the real input; a disabled input
      // swallows that click, so nothing is written back.
      await (await loader.getHarness(MatCheckboxHarness)).toggle();

      expect(host.checked()).toBe(false);
      expect(host.changes).toEqual([]);
    });

    it('keeps a disabled box interactive when asked, with aria-disabled', async () => {
      @Component({
        imports: [Checkbox],
        template: `<ui-checkbox label="Remember me" disabled disabledInteractive />`,
      })
      class InteractiveHost {}

      const f = TestBed.createComponent(InteractiveHost);
      await f.whenStable();

      // The harness's `isDisabled()` reports `true` here — it reads `aria-disabled`
      // as well as the native attribute, and cannot tell the two apart. This test's
      // whole point is that split, so the native `disabled` stays a DOM read.
      expect(input(f).disabled).toBe(false);
      expect(input(f).getAttribute('aria-disabled')).toBe('true');
    });
  });

  describe('labelPosition', () => {
    it('defaults to after', () => {
      expect(host.ref().labelPosition()).toBe('after');
      expect(query('.mat-internal-form-field')!.classList).not.toContain(
        'mdc-form-field--align-end',
      );
    });

    // The class is Material's own layout switch — checking it rather than the
    // instance is what proves the input reaches the rendering.
    for (const position of LABEL_POSITIONS) {
      it(`lays the label out ${position} the box, with Material’s own class`, async () => {
        host.labelPosition.set(position);
        await fixture.whenStable();

        expect(host.ref().matCheckbox().labelPosition).toBe(position);
        expect(
          query('.mat-internal-form-field')!.classList.contains('mdc-form-field--align-end'),
        ).toBe(position === 'before');
      });
    }
  });

  // Rule 5: a form control that needs no adapter. These bind the host, which is
  // the whole claim — a consumer never reaches for the checkbox inside it.
  describe('forms', () => {
    @Component({
      imports: [Checkbox, FormsModule],
      template: `<ui-checkbox label="Remember me" [(ngModel)]="value" />`,
    })
    class NgModelHost {
      readonly value = signal(false);
    }

    @Component({
      imports: [Checkbox, ReactiveFormsModule],
      template: `<ui-checkbox label="Terms" [required]="required()" [formControl]="control" />`,
    })
    class ReactiveHost {
      readonly control = new FormControl(false);
      readonly required = signal(true);
    }

    it('writes a user’s click into an ngModel', async () => {
      const f = TestBed.createComponent(NgModelHost);
      await f.whenStable();
      await (await checkbox(f)).toggle();

      expect(f.componentInstance.value()).toBe(true);
    });

    it('renders the state an ngModel already holds', async () => {
      const f = TestBed.createComponent(NgModelHost);
      f.componentInstance.value.set(true);
      await f.whenStable();

      expect(await (await checkbox(f)).isChecked()).toBe(true);
    });

    it('renders a form’s value, whatever shape it arrives in', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();
      const harness = await checkbox(f);

      // `null` is a form's empty value — `reset()` writes it — and a checkbox is
      // a boolean, so it has to read as unticked rather than as "null".
      f.componentInstance.control.setValue(null);
      await f.whenStable();

      expect(await harness.isChecked()).toBe(false);

      f.componentInstance.control.setValue(true);
      await f.whenStable();

      expect(await harness.isChecked()).toBe(true);
    });

    it('follows a reactive form’s own disable()', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();

      f.componentInstance.control.disable();
      await f.whenStable();

      expect(await (await checkbox(f)).isDisabled()).toBe(true);
    });

    it('reports touched once the user has been in and out', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();

      expect(f.componentInstance.control.touched).toBe(false);

      input(f).dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      await f.whenStable();

      expect(f.componentInstance.control.touched).toBe(true);
    });

    // `Validators.required` rejects an *empty* value, and `false` is not empty —
    // so without `validate()` a required consent box is valid while unticked.
    it('is invalid while a required box is unticked', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();

      expect(f.componentInstance.control.invalid).toBe(true);
      expect(f.componentInstance.control.errors).toEqual({ required: true });

      await (await checkbox(f)).toggle();

      expect(f.componentInstance.control.valid).toBe(true);
      expect(f.componentInstance.control.errors).toBeNull();
    });

    it('is valid while unticked when it is not required', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      f.componentInstance.required.set(false);
      await f.whenStable();

      expect(f.componentInstance.control.valid).toBe(true);
    });

    // Angular re-runs validators when the *value* moves, not when the rule does,
    // so a `required` that flips has to say so itself.
    it('revalidates when required changes', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();

      expect(f.componentInstance.control.invalid).toBe(true);

      f.componentInstance.required.set(false);
      await f.whenStable();

      expect(f.componentInstance.control.valid).toBe(true);
    });

    it('marks the real input required, for the screen reader as well as the form', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();

      expect(await (await checkbox(f)).isRequired()).toBe(true);
    });
  });

  // Rule 3: nothing a consumer writes on the host may be swallowed.
  describe('native attributes', () => {
    @Component({
      imports: [Checkbox],
      template: `
        <ui-checkbox
          label="Remember me"
          id="remember"
          name="remember"
          value="yes"
          tabindex="3"
          aria-describedby="hint"
          data-testid="box"
          [attr.data-state]="state()"
        />
      `,
    })
    class AttributeHost {
      readonly state = signal('idle');
    }

    let f: ComponentFixture<AttributeHost>;

    const wrapper = (): HTMLElement => f.nativeElement.querySelector('ui-checkbox');

    beforeEach(async () => {
      f = TestBed.createComponent(AttributeHost);
      await f.whenStable();
    });

    it('moves an unclaimed attribute onto the real input', () => {
      expect(input(f).getAttribute('data-testid')).toBe('box');
      expect(wrapper().hasAttribute('data-testid')).toBe(false);
    });

    // A binding must not stop working after the first paint — the host is
    // observed for exactly this.
    it('keeps moving a bound attribute as it changes', async () => {
      expect(input(f).getAttribute('data-state')).toBe('idle');

      f.componentInstance.state.set('saving');
      await f.whenStable();

      expect(input(f).getAttribute('data-state')).toBe('saving');
      expect(wrapper().hasAttribute('data-state')).toBe(false);
    });

    // Two elements claiming one id is invalid HTML, and Material derives the
    // input's id — the one its `<label for>` points at — from this one.
    it('gives the id to Material and takes it off the wrapper', () => {
      expect(wrapper().hasAttribute('id')).toBe(false);
      expect(f.nativeElement.querySelectorAll('#remember').length).toBe(1);
      expect(input(f).id).toBe('remember-input');
      expect(label(f).getAttribute('for')).toBe('remember-input');
    });

    it('gives name and value to the real input, for a native submission', () => {
      expect(input(f).getAttribute('name')).toBe('remember');
      expect(input(f).getAttribute('value')).toBe('yes');
    });

    // Left on the host it would be a second tab stop, on an element that is not
    // the control.
    it('gives the tabindex to the real input and takes it off the wrapper', () => {
      expect(input(f).getAttribute('tabindex')).toBe('3');
      expect(wrapper().hasAttribute('tabindex')).toBe(false);
    });

    it('gives aria-describedby to the real input, where the description belongs', () => {
      expect(input(f).getAttribute('aria-describedby')).toBe('hint');
      expect(wrapper().hasAttribute('aria-describedby')).toBe(false);
    });

    it('leaves no aria-describedby on the input when none is asked for', () => {
      expect(input().hasAttribute('aria-describedby')).toBe(false);
    });

    it('names the control with aria-label when there is no visible label', async () => {
      @Component({
        imports: [Checkbox],
        template: `<ui-checkbox aria-label="Remember me" />`,
      })
      class AriaHost {}

      const g = TestBed.createComponent(AriaHost);
      await g.whenStable();

      expect(input(g).getAttribute('aria-label')).toBe('Remember me');
      expect(
        (g.nativeElement.querySelector('ui-checkbox') as HTMLElement).hasAttribute('aria-label'),
      ).toBe(false);
    });
  });

  // Rule 4: Material's own API is not swallowed.
  describe('escape hatches', () => {
    it('hands back the Material instance, whose API still works', async () => {
      host.ref().matCheckbox().toggle();
      await fixture.whenStable();

      expect(input().checked).toBe(true);

      host.ref().matCheckbox().focus();

      expect(document.activeElement).toBe(input());
    });

    it('hands back the `<mat-checkbox>` element', () => {
      expect(host.ref().checkboxElement().nativeElement.tagName.toLowerCase()).toBe('mat-checkbox');
    });
  });
});
