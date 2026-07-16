import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { FormControl, FormsModule, NgModel, ReactiveFormsModule } from '@angular/forms';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatRadioButtonHarness, MatRadioGroupHarness } from '@angular/material/radio/testing';

import {
  RadioGroup,
  RadioOptionDef,
  type UiRadioGroupDirection,
  type UiRadioGroupLabelPosition,
  type UiRadioOption,
} from './radio-group';

const OPTIONS: UiRadioOption<string>[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'express', label: 'Express' },
  { value: 'courier', label: 'Courier', disabled: true },
];

const DIRECTIONS: readonly UiRadioGroupDirection[] = ['row', 'column'];
const LABEL_POSITIONS: readonly UiRadioGroupLabelPosition[] = ['after', 'before'];

@Component({
  imports: [RadioGroup],
  template: `
    <ui-radio-group
      #ref="uiRadioGroup"
      [label]="label()"
      [options]="options()"
      [disabled]="disabled()"
      [direction]="direction()"
      [labelPosition]="labelPosition()"
      [required]="required()"
      [(value)]="value"
      (changed)="changes.push($event)"
    />
  `,
})
class TestHost {
  readonly label = signal<string | undefined>('Delivery');
  readonly options = signal<readonly UiRadioOption<string>[]>(OPTIONS);
  readonly disabled = signal(false);
  readonly direction = signal<UiRadioGroupDirection>('column');
  readonly labelPosition = signal<UiRadioGroupLabelPosition>('after');
  readonly required = signal(false);
  readonly value = signal<string | null>(null);
  readonly changes: (string | null)[] = [];
  readonly ref = viewChild.required<RadioGroup<string>>('ref');
}

describe('RadioGroup', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  // The `MatRadioGroupHarness` / `MatRadioButtonHarness` pair speaks Material's
  // *public* test surface — `getRadioButtons()`, `isChecked()`, `isDisabled()`,
  // `isRequired()`, `getName()`, `getLabelText()`, `check()` — instead of poking
  // at the `<input type="radio">`s Material renders. Reaching into those inputs
  // couples this spec to Material's internal markup; the harness exists precisely
  // so that when Material moves the detail, the spec keeps passing. Everything
  // the harness *cannot* see — this library's own `ui-radio-group__*` classes and
  // rendered legend, the `aria-labelledby` association, attribute forwarding onto
  // the real group, Material's layout classes, the projected `uiRadioOption`
  // template, the `ControlValueAccessor` internals asserted through the host
  // `FormControl` / `NgModel` — stays a DOM or instance assertion below.
  const radioGroup = (
    f: ComponentFixture<unknown> = fixture,
    filter?: Parameters<typeof MatRadioGroupHarness.with>[0],
  ): Promise<MatRadioGroupHarness> =>
    TestbedHarnessEnvironment.loader(f).getHarness(MatRadioGroupHarness.with(filter ?? {}));

  /** The radio buttons, in order, through Material's public harness surface. */
  const buttons = async (f: ComponentFixture<unknown> = fixture): Promise<MatRadioButtonHarness[]> =>
    (await radioGroup(f)).getRadioButtons();

  /** The element carrying the `radiogroup` role — Material's own group. */
  const group = (f: ComponentFixture<unknown> = fixture): HTMLElement =>
    f.nativeElement.querySelector('mat-radio-group');

  /** The real controls — the `<input type="radio">`s Material renders. */
  const inputs = (f: ComponentFixture<unknown> = fixture): HTMLInputElement[] =>
    Array.from(f.nativeElement.querySelectorAll('input[type="radio"]'));

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  // The point of this library: the control is Material's, not a set of circles
  // painted to look like one. If these fail, everything below is testing a
  // lookalike.
  describe('composition', () => {
    it('renders Material’s radio group and buttons', () => {
      expect(query('mat-radio-group')).not.toBeNull();
      expect(host.ref().matRadioGroup()).toBeInstanceOf(MatRadioGroup);
      expect(host.ref().matRadioButtons().length).toBe(OPTIONS.length);
      expect(host.ref().matRadioButtons()[0]).toBeInstanceOf(MatRadioButton);
    });

    it('renders one native radio per option, in order', async () => {
      const btns = await buttons();

      expect(btns.length).toBe(OPTIONS.length);
      expect(await Promise.all(btns.map((b) => b.getLabelText()))).toEqual([
        'Standard',
        'Express',
        'Courier',
      ]);
    });

    // Material's own exclusivity mechanism: one shared `name` across the inputs is
    // what makes choosing one clear the rest, without this component tracking it.
    it('gives every radio one shared, non-empty name', async () => {
      const btns = await buttons();
      const names = new Set(await Promise.all(btns.map((b) => b.getName())));

      expect(names.size).toBe(1);
      expect([...names][0]).not.toBe('');
    });

    it('takes the name a consumer gives it', async () => {
      @Component({
        imports: [RadioGroup],
        template: `<ui-radio-group label="Delivery" name="delivery" [options]="options" />`,
      })
      class NamedHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(NamedHost);
      await f.whenStable();

      const btns = await buttons(f);
      expect((await Promise.all(btns.map((b) => b.getName()))).every((n) => n === 'delivery')).toBe(
        true,
      );
    });

    // Two unnamed groups on one page must not share a name: radios are grouped by
    // it, so a collision would let a choice in one group clear the other's.
    it('gives two unnamed groups distinct names', async () => {
      @Component({
        imports: [RadioGroup],
        template: `
          <ui-radio-group label="First" [options]="options" />
          <ui-radio-group label="Second" [options]="options" />
        `,
      })
      class TwoHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(TwoHost);
      await f.whenStable();

      const [first, second] = await TestbedHarnessEnvironment.loader(f).getAllHarnesses(
        MatRadioGroupHarness,
      );
      const names = [await first.getName(), await second.getName()];

      expect(names[0]).toBeTruthy();
      expect(names[0]).not.toBe(names[1]);
    });
  });

  // The issue's own requirement, and the reason a `<legend>` would not do: the
  // element with the role is Material's group, so the name has to reach *it*.
  describe('accessibility', () => {
    it('names the radiogroup with the label', () => {
      expect(group().getAttribute('role')).toBe('radiogroup');

      const labelId = group().getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();

      const label = query(`#${labelId}`);
      expect(label).not.toBeNull();
      expect(label!.textContent!.trim()).toBe('Delivery');
    });

    it('drops the association when there is no label to point at', async () => {
      host.label.set(undefined);
      await fixture.whenStable();

      expect(query('.ui-radio-group__label')).toBeNull();
      expect(group().hasAttribute('aria-labelledby')).toBe(false);
    });

    it('gives two groups on one page distinct label ids', async () => {
      @Component({
        imports: [RadioGroup],
        template: `
          <ui-radio-group label="First" [options]="options" />
          <ui-radio-group label="Second" [options]="options" />
        `,
      })
      class TwoHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(TwoHost);
      await f.whenStable();

      const [first, second] = Array.from(
        f.nativeElement.querySelectorAll('mat-radio-group'),
      ) as HTMLElement[];

      expect(first.getAttribute('aria-labelledby')).toBeTruthy();
      expect(first.getAttribute('aria-labelledby')).not.toBe(second.getAttribute('aria-labelledby'));
    });

    it('names the group by aria-label when there is no visible label', async () => {
      @Component({
        imports: [RadioGroup],
        template: `<ui-radio-group aria-label="Delivery method" [options]="options" />`,
      })
      class AriaLabelHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(AriaLabelHost);
      await f.whenStable();

      expect(group(f).getAttribute('aria-label')).toBe('Delivery method');
      expect(group(f).hasAttribute('aria-labelledby')).toBe(false);
    });

    // A consumer pointing at a heading already on the page is being more specific
    // than the legend this component rendered, so they win.
    it('lets an explicit aria-labelledby beat the rendered label', async () => {
      @Component({
        imports: [RadioGroup],
        template: `
          <h2 id="delivery-heading">Delivery</h2>
          <ui-radio-group label="Ignored" aria-labelledby="delivery-heading" [options]="options" />
        `,
      })
      class LabelledbyHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(LabelledbyHost);
      await f.whenStable();

      expect(group(f).getAttribute('aria-labelledby')).toBe('delivery-heading');
    });

    it('marks every radio required when the group is', async () => {
      host.required.set(true);
      await fixture.whenStable();

      const btns = await buttons();
      expect((await Promise.all(btns.map((b) => b.isRequired()))).every(Boolean)).toBe(true);
    });
  });

  describe('options', () => {
    it('checks the radio matching a preselected value', async () => {
      host.value.set('express');
      await fixture.whenStable();

      const btns = await buttons();
      expect(await Promise.all(btns.map((b) => b.isChecked()))).toEqual([false, true, false]);
      expect(host.ref().selectedOption()).toEqual(OPTIONS[1]);
    });

    it('disables one option without disabling the rest', async () => {
      const btns = await buttons();
      expect(await Promise.all(btns.map((b) => b.isDisabled()))).toEqual([false, false, true]);
    });

    it('ignores a click on a disabled option', async () => {
      // `check()` clicks the button; a disabled radio swallows the click.
      await (await buttons())[2].check();

      expect(host.value()).toBeNull();
      expect(host.changes).toEqual([]);
    });

    it('re-renders when the options change', async () => {
      host.options.set([{ value: 'pickup', label: 'Collect in store' }]);
      await fixture.whenStable();

      const btns = await buttons();
      expect(btns.length).toBe(1);
      expect(await btns[0].getLabelText()).toBe('Collect in store');
    });

    it('reports no selected option for a value no option holds', async () => {
      host.value.set('teleport');
      await fixture.whenStable();

      const btns = await buttons();
      expect(host.ref().selectedOption()).toBeUndefined();
      expect((await Promise.all(btns.map((b) => b.isChecked()))).some(Boolean)).toBe(false);
    });
  });

  describe('value', () => {
    it('writes a user’s choice back through the two-way binding', async () => {
      const btns = await buttons();
      await btns[1].check();

      expect(host.value()).toBe('express');
      expect(await btns[1].isChecked()).toBe(true);
    });

    it('clears the previous choice when another is made', async () => {
      const btns = await buttons();
      await btns[0].check();
      await btns[1].check();

      expect(host.value()).toBe('express');
      expect(await Promise.all(btns.map((b) => b.isChecked()))).toEqual([false, true, false]);
    });

    it('emits changed for a user’s choice only', async () => {
      await (await buttons())[0].check();

      expect(host.changes).toEqual(['standard']);

      // A value set from code is not a choice anyone made — `changed` is Material's
      // own `change` forwarded, which is the distinction the output exists for.
      host.value.set('express');
      await fixture.whenStable();

      expect(host.changes).toEqual(['standard']);
    });
  });

  describe('direction', () => {
    it('stacks the buttons by default', () => {
      expect(host.ref().direction()).toBe('column');
      expect(group().classList).not.toContain('ui-radio-group__group--row');
    });

    for (const direction of DIRECTIONS) {
      it(`lays the buttons out in a ${direction}`, async () => {
        host.direction.set(direction);
        await fixture.whenStable();

        expect(group().classList.contains('ui-radio-group__group--row')).toBe(direction === 'row');
      });
    }
  });

  describe('labelPosition', () => {
    // The class is Material's own layout switch — checking it rather than the
    // instance is what proves the input reaches the rendering.
    for (const position of LABEL_POSITIONS) {
      it(`lays each label out ${position} its button, with Material’s own class`, async () => {
        host.labelPosition.set(position);
        await fixture.whenStable();

        expect(host.ref().matRadioGroup().labelPosition).toBe(position);
        expect(
          query('.mat-internal-form-field')!.classList.contains('mdc-form-field--align-end'),
        ).toBe(position === 'before');
      });
    }
  });

  describe('disabled', () => {
    it('disables every radio', async () => {
      host.disabled.set(true);
      await fixture.whenStable();

      const btns = await buttons();
      expect((await Promise.all(btns.map((b) => b.isDisabled()))).every(Boolean)).toBe(true);
    });

    it('ignores a click while disabled', async () => {
      host.disabled.set(true);
      await fixture.whenStable();
      // `check()` clicks the button; a disabled radio swallows the click.
      await (await buttons())[0].check();

      expect(host.value()).toBeNull();
      expect(host.changes).toEqual([]);
    });

    it('keeps disabled buttons interactive when asked, with aria-disabled', async () => {
      @Component({
        imports: [RadioGroup],
        template: `<ui-radio-group
          label="Delivery"
          [options]="options"
          disabled
          disabledInteractive
        />`,
      })
      class InteractiveHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(InteractiveHost);
      await f.whenStable();

      // The harness's `isDisabled()` reports `true` here — it reads `aria-disabled`
      // as well as the native attribute, and cannot tell the two apart. This test's
      // whole point is that split, so both halves stay DOM reads.
      expect(inputs(f).some((input) => input.disabled)).toBe(false);
      expect(inputs(f).every((input) => input.getAttribute('aria-disabled') === 'true')).toBe(true);
    });
  });

  // Rule 5: a form control that needs no adapter. These bind the host, which is the
  // whole claim — a consumer never reaches for the group inside it.
  describe('forms', () => {
    @Component({
      imports: [RadioGroup, FormsModule],
      template: `<ui-radio-group label="Delivery" [options]="options" [(ngModel)]="value" />`,
    })
    class NgModelHost {
      readonly options = OPTIONS;
      readonly value = signal<string | null>(null);
    }

    @Component({
      imports: [RadioGroup, ReactiveFormsModule],
      template: `<ui-radio-group label="Delivery" [options]="options" [formControl]="control" />`,
    })
    class ReactiveHost {
      readonly options = OPTIONS;
      readonly control = new FormControl<string | null>(null);
    }

    it('writes a user’s choice into an ngModel', async () => {
      const f = TestBed.createComponent(NgModelHost);
      await f.whenStable();
      await (await buttons(f))[1].check();

      expect(f.componentInstance.value()).toBe('express');
    });

    it('renders the value an ngModel already holds', async () => {
      const f = TestBed.createComponent(NgModelHost);
      f.componentInstance.value.set('standard');
      await f.whenStable();

      expect(await (await buttons(f))[0].isChecked()).toBe(true);
    });

    it('writes a user’s choice into a reactive control', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();
      await (await buttons(f))[0].check();

      expect(f.componentInstance.control.value).toBe('standard');
    });

    it('renders a form’s value, and clears on reset', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();
      const btns = await buttons(f);

      f.componentInstance.control.setValue('express');
      await f.whenStable();

      expect(await btns[1].isChecked()).toBe(true);

      // `reset()` writes `null` — the empty value a group with nothing chosen has.
      f.componentInstance.control.reset();
      await f.whenStable();

      expect((await Promise.all(btns.map((b) => b.isChecked()))).some(Boolean)).toBe(false);
    });

    it('follows a reactive form’s own disable()', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();
      const btns = await buttons(f);

      f.componentInstance.control.disable();
      await f.whenStable();

      expect((await Promise.all(btns.map((b) => b.isDisabled()))).every(Boolean)).toBe(true);

      // Re-enabling gives every button back except the one the *option* disables,
      // which the form never owned.
      f.componentInstance.control.enable();
      await f.whenStable();

      expect(await Promise.all(btns.map((b) => b.isDisabled()))).toEqual([false, false, true]);
    });

    it('reports touched once the user has been in and out', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();

      expect(f.componentInstance.control.touched).toBe(false);

      inputs(f)[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      await f.whenStable();

      expect(f.componentInstance.control.touched).toBe(true);
    });

    // A form's `required` validator matches the attribute on the host, so writing
    // it once has to get both the ARIA semantics and the validation.
    it('is validated by Angular’s own required, from the same attribute', async () => {
      @Component({
        imports: [RadioGroup, FormsModule],
        template: `<ui-radio-group
          label="Delivery"
          required
          [options]="options"
          [(ngModel)]="value"
        />`,
      })
      class RequiredHost {
        readonly options = OPTIONS;
        readonly value = signal<string | null>(null);
      }

      const f = TestBed.createComponent(RequiredHost);
      await f.whenStable();

      // The `NgModel` on the host — the same directive instance a consumer's own
      // `#delivery="ngModel"` would hand them.
      const model = f.debugElement.query((node) => !!node.injector.get(NgModel, null)).injector.get(
        NgModel,
      );

      const btns = await buttons(f);
      expect(model.invalid).toBe(true);
      expect((await Promise.all(btns.map((b) => b.isRequired()))).every(Boolean)).toBe(true);

      await btns[0].check();

      expect(model.valid).toBe(true);
    });
  });

  // Rule 7: an option a string cannot spell needs a template, not another input.
  describe('uiRadioOption', () => {
    @Component({
      imports: [RadioGroup, RadioOptionDef],
      template: `
        <ui-radio-group label="Delivery" [options]="options" [(value)]="value">
          <ng-template uiRadioOption let-option let-checked="checked">
            <strong>{{ option.label }}</strong>
            <em>{{ checked ? 'chosen' : 'not chosen' }}</em>
          </ng-template>
        </ui-radio-group>
      `,
    })
    class TemplateHost {
      readonly options = OPTIONS;
      readonly value = signal<string | null>('standard');
    }

    it('renders the template in place of the label string', async () => {
      const f = TestBed.createComponent(TemplateHost);
      await f.whenStable();

      const first = f.nativeElement.querySelector('mat-radio-button');
      expect(first.querySelector('strong').textContent).toBe('Standard');
    });

    // Inside Material's own `<label for>`, so clicking the custom content still
    // chooses the option — the whole reason the content is projected there.
    it('chooses the option when the projected content is clicked', async () => {
      const f = TestBed.createComponent(TemplateHost);
      await f.whenStable();

      const second = f.nativeElement.querySelectorAll('mat-radio-button')[1];
      second.querySelector('strong').click();
      await f.whenStable();

      expect(f.componentInstance.value()).toBe('express');
    });

    it('tells the template which option is chosen', async () => {
      const f = TestBed.createComponent(TemplateHost);
      await f.whenStable();

      const states = Array.from(f.nativeElement.querySelectorAll('mat-radio-button em')).map(
        (em) => (em as HTMLElement).textContent,
      );

      expect(states).toEqual(['chosen', 'not chosen', 'not chosen']);
    });
  });

  // Rule 3: nothing this component does not name may be swallowed by the wrapper.
  describe('native attributes', () => {
    @Component({
      imports: [RadioGroup],
      template: `<ui-radio-group
        label="Delivery"
        [options]="options"
        [attr.data-state]="state()"
        data-testid="delivery"
        aria-describedby="delivery-help"
      />`,
    })
    class AttributeHost {
      readonly options = OPTIONS;
      readonly state = signal('idle');
    }

    it('moves unclaimed attributes onto the real group', async () => {
      const f = TestBed.createComponent(AttributeHost);
      await f.whenStable();

      const wrapper = f.nativeElement.querySelector('ui-radio-group');

      expect(group(f).getAttribute('data-testid')).toBe('delivery');
      expect(group(f).getAttribute('aria-describedby')).toBe('delivery-help');

      // *Moved*, not copied: two elements carrying one `data-testid` is an
      // ambiguous query.
      expect(wrapper.hasAttribute('data-testid')).toBe(false);
      expect(wrapper.hasAttribute('aria-describedby')).toBe(false);
    });

    it('keeps forwarding a bound attribute after the first paint', async () => {
      const f = TestBed.createComponent(AttributeHost);
      await f.whenStable();

      f.componentInstance.state.set('saving');
      await f.whenStable();
      // The MutationObserver that forwards a re-landed attribute delivers its
      // records as a microtask, which `whenStable` above does not await.
      await Promise.resolve();

      expect(group(f).getAttribute('data-state')).toBe('saving');
      expect(f.nativeElement.querySelector('ui-radio-group').hasAttribute('data-state')).toBe(false);
    });

    it('leaves the wrapper’s own attributes alone', async () => {
      const f = TestBed.createComponent(AttributeHost);
      await f.whenStable();

      // `label` is this component's input — moving it would break the thing it is
      // for, and it is a selector a consumer may reasonably write.
      expect(f.nativeElement.querySelector('ui-radio-group').getAttribute('label')).toBe('Delivery');
    });
  });

  // Rule 4: Material's own API is not swallowed.
  describe('escape hatches', () => {
    it('hands back the Material instances', () => {
      expect(host.ref().matRadioGroup()).toBeInstanceOf(MatRadioGroup);
      expect(host.ref().groupElement().nativeElement.tagName.toLowerCase()).toBe('mat-radio-group');
    });

    it('lets a consumer drive a button through Material’s own API', async () => {
      host.ref().matRadioButtons()[1].focus();
      await fixture.whenStable();

      expect(document.activeElement).toBe(inputs()[1]);
    });
  });

  /**
   * The gaps are only shared with the rest of the fleet if they come from the
   * theme's spacing scale. A `0.5rem` here builds, renders and passes every
   * assertion above — and is a control that agrees with the fleet's rhythm only
   * until the theme's changes, which is the exact drift `--ui-sys-spacing-*`
   * exists to prevent. jsdom does not resolve `var()`, so this is a source-level
   * assertion, in the spirit of `ui-divider`'s and `theme-contract.spec.ts`.
   */
  describe('spacing comes from the theme, not from literals', () => {
    const styles = readFileSync(
      join(process.cwd(), 'projects', 'ui', 'src', 'lib', 'radio-group', 'radio-group.scss'),
      'utf8',
    );

    it('resolves the button/legend gap from the theme’s `sm` step', () => {
      expect(styles).toContain('var(--ui-radio-group-gap, var(--ui-sys-spacing-sm))');
      expect(styles).not.toMatch(/--ui-radio-group-gap,\s*0\.5rem/);
    });

    it('resolves the row gap from the theme’s `md` step', () => {
      expect(styles).toContain('var(--ui-radio-group-column-gap, var(--ui-sys-spacing-md))');
      expect(styles).not.toMatch(/--ui-radio-group-column-gap,\s*1rem/);
    });
  });
});
