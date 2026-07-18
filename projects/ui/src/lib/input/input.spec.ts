import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatInputHarness } from '@angular/material/input/testing';

import {
  Input,
  InputHint,
  InputPrefix,
  InputSuffix,
  type UiInputAppearance,
  type UiInputType,
} from './input';

@Component({
  imports: [Input],
  template: `
    <ui-input
      #ref="uiInput"
      [label]="label()"
      [placeholder]="placeholder()"
      [type]="type()"
      [disabled]="disabled()"
      [hint]="hint()"
      [error]="error()"
      [appearance]="appearance()"
      [required]="required()"
      [readonly]="readonly()"
      [(value)]="value"
    />
  `,
})
class TestHost {
  readonly label = signal<string | undefined>('Email');
  readonly placeholder = signal<string | undefined>(undefined);
  readonly type = signal<UiInputType>('text');
  readonly disabled = signal(false);
  readonly hint = signal<string | undefined>(undefined);
  readonly error = signal<string | undefined>(undefined);
  readonly appearance = signal<UiInputAppearance>('outline');
  readonly required = signal(false);
  readonly readonly = signal(false);
  readonly value = signal('');
  readonly ref = viewChild.required<Input>('ref');
}

const TYPES: readonly UiInputType[] = ['text', 'email', 'password'];
const APPEARANCES: readonly UiInputAppearance[] = ['fill', 'outline'];

describe('Input', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let loader: HarnessLoader;

  // The `MatInputHarness` speaks Material's *public* test surface — `getValue()`,
  // `setValue()`, `isDisabled()`, `isRequired()`, `isReadonly()`, `getType()`,
  // `getPlaceholder()` — instead of reaching into the native `<input>` Material
  // renders into. Reading state and value through it means Material can rework its
  // own markup without breaking this spec on a detail no consumer depends on.
  // Everything the harness *cannot* see — this library's wrapper behaviour:
  // label/hint/error rendering, `id`/`for`/`aria-*` association, native-attribute
  // forwarding, the CVA wiring proven through the host `FormControl`, the `ui-*`
  // styling hooks — stays a DOM or instance assertion below.
  const input = (f: ComponentFixture<unknown> = fixture): Promise<MatInputHarness> =>
    TestbedHarnessEnvironment.loader(f).getHarness(MatInputHarness);

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  /** The real `<input>` Material renders into, for the assertions the harness cannot make. */
  const inputElement = (): HTMLInputElement => query('input') as HTMLInputElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  // The point of this library: the field is Material's, not a box painted to
  // look like one. If these fail, everything below is testing a lookalike.
  describe('composition', () => {
    it('renders Material’s form field around Material’s input', () => {
      expect(query('mat-form-field')).not.toBeNull();
      expect(inputElement().classList).toContain('mat-mdc-input-element');
      expect(host.ref().matFormField()).toBeInstanceOf(MatFormField);
      expect(host.ref().matInput()).toBeInstanceOf(MatInput);
    });

    it('renders exactly one control', () => {
      expect(fixture.nativeElement.querySelectorAll('input').length).toBe(1);
    });
  });

  describe('label', () => {
    it('renders the label as Material’s own', () => {
      expect(query('mat-label')!.textContent!.trim()).toBe('Email');
    });

    it('renders no label element when none is given', async () => {
      host.label.set(undefined);
      await fixture.whenStable();

      expect(query('mat-label')).toBeNull();
    });

    it('updates the label when it changes', async () => {
      host.label.set('Work email');
      await fixture.whenStable();

      expect(query('mat-label')!.textContent!.trim()).toBe('Work email');
    });

    // Verifying Material's association rather than reimplementing it: the label
    // is a real `<label for>` pointed at the control's id, which is what makes
    // clicking it focus the field and a screen reader read the two as one thing.
    it('is associated with the control by MatFormField', () => {
      const label = query('label') as HTMLLabelElement;

      expect(inputElement().id).not.toBe('');
      expect(label.htmlFor).toBe(inputElement().id);
    });

    it('keeps the association when a consumer names the id', async () => {
      @Component({ imports: [Input], template: `<ui-input label="Email" id="email" />` })
      class IdHost {}

      const f = TestBed.createComponent(IdHost);
      await f.whenStable();
      const input = f.nativeElement.querySelector('input') as HTMLInputElement;
      const label = f.nativeElement.querySelector('label') as HTMLLabelElement;

      expect(input.id).toBe('email');
      expect(label.htmlFor).toBe('email');
    });

    // Two elements claiming one id is invalid HTML, and the id is the one the
    // label's `for` points at — so it has to be the control's alone.
    it('moves the id off the wrapper', async () => {
      @Component({ imports: [Input], template: `<ui-input label="Email" id="email" />` })
      class IdHost {}

      const f = TestBed.createComponent(IdHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('ui-input').hasAttribute('id')).toBe(false);
      expect(f.nativeElement.querySelectorAll('#email').length).toBe(1);
    });
  });

  describe('placeholder', () => {
    it('puts the placeholder on the control', async () => {
      host.placeholder.set('name@example.com');
      await fixture.whenStable();

      expect(await (await loader.getHarness(MatInputHarness)).getPlaceholder()).toBe(
        'name@example.com',
      );
    });

    it('has none by default', async () => {
      expect(await (await loader.getHarness(MatInputHarness)).getPlaceholder()).toBe('');
    });
  });

  describe('type', () => {
    it('defaults to text', async () => {
      expect(host.ref().type()).toBe('text');
      expect(await (await loader.getHarness(MatInputHarness)).getType()).toBe('text');
    });

    // Each type changes what the browser does for the user — the email keyboard,
    // the masked value a password manager looks for — so a type that does not
    // reach the element is the whole feature missing.
    for (const value of TYPES) {
      it(`sets type=${value} on the control`, async () => {
        host.type.set(value);
        await fixture.whenStable();

        expect(await (await loader.getHarness(MatInputHarness)).getType()).toBe(value);
      });
    }
  });

  describe('appearance', () => {
    it('defaults to outline, not Material’s fill', () => {
      expect(host.ref().appearance()).toBe('outline');
      expect(host.ref().matFormField().appearance).toBe('outline');
      expect(query('mat-form-field')!.classList).toContain('mat-form-field-appearance-outline');
    });

    for (const value of APPEARANCES) {
      it(`renders the ${value} appearance with Material’s own container`, async () => {
        host.appearance.set(value);
        await fixture.whenStable();

        expect(host.ref().matFormField().appearance).toBe(value);
        expect(query('mat-form-field')!.classList).toContain(`mat-form-field-appearance-${value}`);
      });
    }

    // The notched outline is Material's outlined treatment; `fill` has none. This
    // is what proves the appearance reaches the rendering, not just the instance.
    it('notches the outline only for outline', async () => {
      expect(query('.mdc-notched-outline')).not.toBeNull();

      host.appearance.set('fill');
      await fixture.whenStable();

      expect(query('.mdc-notched-outline')).toBeNull();
    });
  });

  describe('hint', () => {
    it('renders the hint as Material’s own', async () => {
      host.hint.set('We only use this to sign you in.');
      await fixture.whenStable();

      expect(query('mat-hint')!.textContent!.trim()).toBe('We only use this to sign you in.');
    });

    it('renders no hint by default', () => {
      expect(query('mat-hint')).toBeNull();
    });

    // Material's own doing: it points the control at whatever it renders below.
    it('is announced with the control', async () => {
      host.hint.set('We only use this to sign you in.');
      await fixture.whenStable();

      const describedBy = inputElement().getAttribute('aria-describedby');
      expect(describedBy).toBe(query('mat-hint')!.id);
      expect(describedBy).toBeTruthy();
    });
  });

  describe('error', () => {
    const message = 'Enter an email address like name@example.com';

    it('renders nothing while unset', () => {
      expect(query('mat-error')).toBeNull();
      expect(host.ref().hasError()).toBe(false);
    });

    it('shows the message when set', async () => {
      host.error.set(message);
      await fixture.whenStable();

      expect(query('mat-error')!.textContent!.trim()).toBe(message);
    });

    // The message and the red box must never disagree: they are the same signal.
    it('puts Material’s own field into its error state', async () => {
      host.error.set(message);
      await fixture.whenStable();

      expect(host.ref().matInput().errorState).toBe(true);
      expect(query('mat-form-field')!.classList).toContain('mat-form-field-invalid');
      expect(inputElement().getAttribute('aria-invalid')).toBe('true');
    });

    it('leaves the field valid while unset', () => {
      expect(host.ref().matInput().errorState).toBe(false);
      expect(query('mat-form-field')!.classList).not.toContain('mat-form-field-invalid');
    });

    it('clears the error state when the message is unset again', async () => {
      host.error.set(message);
      await fixture.whenStable();

      host.error.set(undefined);
      await fixture.whenStable();

      expect(query('mat-error')).toBeNull();
      expect(host.ref().matInput().errorState).toBe(false);
      expect(query('mat-form-field')!.classList).not.toContain('mat-form-field-invalid');
    });

    // Blank is the same instruction as unset, rather than a red field reporting
    // an empty message.
    it('ignores a blank message', async () => {
      host.error.set('   ');
      await fixture.whenStable();

      expect(host.ref().hasError()).toBe(false);
      expect(query('mat-error')).toBeNull();
      expect(host.ref().matInput().errorState).toBe(false);
    });

    // Material's own rule: the subscript shows one message, and the error is it.
    it('replaces the hint while it is showing', async () => {
      host.hint.set('We only use this to sign you in.');
      host.error.set(message);
      await fixture.whenStable();

      expect(query('mat-hint')).toBeNull();
      expect(query('mat-error')).not.toBeNull();

      host.error.set(undefined);
      await fixture.whenStable();

      expect(query('mat-hint')).not.toBeNull();
    });

    it('is announced with the control', async () => {
      host.error.set(message);
      await fixture.whenStable();

      expect(inputElement().getAttribute('aria-describedby')).toBe(query('mat-error')!.id);
    });
  });

  // The requirement this component exists to meet: `[(ngModel)]` and reactive
  // forms with no adapter (rule 5).
  describe('ControlValueAccessor', () => {
    describe('with [(ngModel)]', () => {
      @Component({
        imports: [Input, FormsModule],
        template: `<ui-input label="Email" [(ngModel)]="email" #model="ngModel" />`,
      })
      class ModelHost {
        readonly email = signal('start@example.com');
        readonly model = viewChild.required<{ touched: boolean; dirty: boolean }>('model');
      }

      let f: ComponentFixture<ModelHost>;
      let modelHost: ModelHost;

      beforeEach(async () => {
        f = TestBed.createComponent(ModelHost);
        modelHost = f.componentInstance;
        await f.whenStable();
      });

      // writeValue
      it('shows the model’s initial value', async () => {
        expect(await (await input(f)).getValue()).toBe('start@example.com');
      });

      // writeValue, after the fact
      it('shows a value written to the model later', async () => {
        modelHost.email.set('later@example.com');
        await f.whenStable();

        expect(await (await input(f)).getValue()).toBe('later@example.com');
      });

      // registerOnChange
      it('writes what the user types back to the model', async () => {
        await (await input(f)).setValue('typed@example.com');
        await f.whenStable();

        expect(modelHost.email()).toBe('typed@example.com');
      });

      // registerOnTouched
      it('marks the control touched on blur, not before', async () => {
        expect(modelHost.model().touched).toBe(false);

        await (await input(f)).blur();
        await f.whenStable();

        expect(modelHost.model().touched).toBe(true);
      });

      it('marks the control dirty once the user types', async () => {
        expect(modelHost.model().dirty).toBe(false);

        await (await input(f)).setValue('x');
        await f.whenStable();

        expect(modelHost.model().dirty).toBe(true);
      });
    });

    describe('with a reactive FormControl', () => {
      @Component({
        imports: [Input, ReactiveFormsModule],
        template: `<ui-input label="Email" [formControl]="control" />`,
      })
      class ReactiveHost {
        readonly control = new FormControl('');
      }

      let f: ComponentFixture<ReactiveHost>;
      let reactiveHost: ReactiveHost;

      beforeEach(async () => {
        f = TestBed.createComponent(ReactiveHost);
        reactiveHost = f.componentInstance;
        await f.whenStable();
      });

      it('shows a value set on the control', async () => {
        reactiveHost.control.setValue('set@example.com');
        await f.whenStable();

        expect(await (await input(f)).getValue()).toBe('set@example.com');
      });

      it('reports what the user types to the control', async () => {
        await (await input(f)).setValue('typed@example.com');
        await f.whenStable();

        expect(reactiveHost.control.value).toBe('typed@example.com');
      });

      it('empties the field when the control is reset', async () => {
        reactiveHost.control.setValue('something');
        await f.whenStable();

        reactiveHost.control.reset();
        await f.whenStable();

        // `null` is a form's empty value, and `String(null)` would put the word
        // "null" in the field.
        expect(await (await input(f)).getValue()).toBe('');
      });

      // setDisabledState — a control disabled by the form has no `disabled`
      // attribute in the template to read.
      it('disables the control when the form disables it', async () => {
        reactiveHost.control.disable();
        await f.whenStable();

        expect(await (await input(f)).isDisabled()).toBe(true);
        expect(f.nativeElement.querySelector('mat-form-field').classList).toContain(
          'mat-form-field-disabled',
        );
      });

      it('re-enables the control when the form enables it', async () => {
        reactiveHost.control.disable();
        await f.whenStable();

        reactiveHost.control.enable();
        await f.whenStable();

        expect(await (await input(f)).isDisabled()).toBe(false);
      });

      it('starts disabled for a control that starts disabled', async () => {
        @Component({
          imports: [Input, ReactiveFormsModule],
          template: `<ui-input label="Email" [formControl]="control" />`,
        })
        class DisabledHost {
          readonly control = new FormControl({ value: '', disabled: true });
        }

        const df = TestBed.createComponent(DisabledHost);
        await df.whenStable();

        expect(await (await input(df)).isDisabled()).toBe(true);
      });
    });
  });

  describe('disabled', () => {
    it('is enabled by default', async () => {
      expect(await (await loader.getHarness(MatInputHarness)).isDisabled()).toBe(false);
    });

    it('disables Material’s control', async () => {
      host.disabled.set(true);
      await fixture.whenStable();

      expect(await (await loader.getHarness(MatInputHarness)).isDisabled()).toBe(true);
      expect(host.ref().matInput().disabled).toBe(true);
      expect(query('mat-form-field')!.classList).toContain('mat-form-field-disabled');
    });

    it('reads the bare attribute as true', async () => {
      @Component({ imports: [Input], template: `<ui-input label="Email" disabled />` })
      class AttrHost {}

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();

      expect(await (await input(f)).isDisabled()).toBe(true);
    });

    // The two routes are independent: a form enabling its control — which is a
    // `setDisabledState(false)` — must not silently un-set a `disabled` the
    // template wrote.
    it('stays disabled by the input when a form enables the control', async () => {
      host.disabled.set(true);
      await fixture.whenStable();

      host.ref().setDisabledState(false);
      await fixture.whenStable();

      expect(await (await loader.getHarness(MatInputHarness)).isDisabled()).toBe(true);
    });

    it('is disabled by either route on its own', async () => {
      host.ref().setDisabledState(true);
      await fixture.whenStable();
      expect(await (await loader.getHarness(MatInputHarness)).isDisabled()).toBe(true);

      host.ref().setDisabledState(false);
      await fixture.whenStable();
      expect(await (await loader.getHarness(MatInputHarness)).isDisabled()).toBe(false);

      host.disabled.set(true);
      await fixture.whenStable();
      expect(await (await loader.getHarness(MatInputHarness)).isDisabled()).toBe(true);
    });
  });

  // Rule 5: two-way state is a model(), for the field that is not part of a form.
  describe('[(value)]', () => {
    it('starts empty', async () => {
      expect(host.ref().value()).toBe('');
      expect(await (await loader.getHarness(MatInputHarness)).getValue()).toBe('');
    });

    it('shows a value written by the consumer', async () => {
      host.value.set('written');
      await fixture.whenStable();

      expect(await (await loader.getHarness(MatInputHarness)).getValue()).toBe('written');
    });

    it('writes what the user types back through the binding', async () => {
      await (await loader.getHarness(MatInputHarness)).setValue('typed');
      await fixture.whenStable();

      expect(host.value()).toBe('typed');
      expect(host.ref().value()).toBe('typed');
    });
  });

  describe('readonly', () => {
    it('is editable by default', async () => {
      expect(await (await loader.getHarness(MatInputHarness)).isReadonly()).toBe(false);
    });

    // Unlike `disabled`, a readonly field stays focusable and is still submitted.
    it('makes the control readonly but not disabled', async () => {
      host.readonly.set(true);
      await fixture.whenStable();

      const harness = await loader.getHarness(MatInputHarness);
      expect(await harness.isReadonly()).toBe(true);
      expect(await harness.isDisabled()).toBe(false);
    });
  });

  describe('required', () => {
    it('is optional by default', async () => {
      expect(await (await loader.getHarness(MatInputHarness)).isRequired()).toBe(false);
      expect(query('.mat-mdc-form-field-required-marker')).toBeNull();
    });

    it('marks the control required for assistive technology and marks the label', async () => {
      host.required.set(true);
      await fixture.whenStable();

      expect(await (await loader.getHarness(MatInputHarness)).isRequired()).toBe(true);
      expect(inputElement().getAttribute('aria-required')).toBe('true');
      expect(query('.mat-mdc-form-field-required-marker')).not.toBeNull();
    });

    it('hides Material’s asterisk when asked', async () => {
      @Component({
        imports: [Input],
        template: `<ui-input label="Email" required hideRequiredMarker />`,
      })
      class MarkerHost {}

      const f = TestBed.createComponent(MarkerHost);
      await f.whenStable();

      expect(await (await input(f)).isRequired()).toBe(true);
      expect(f.nativeElement.querySelector('.mat-mdc-form-field-required-marker')).toBeNull();
    });
  });

  // Rule 3. A wrapper must not be where attributes go to die: the control is the
  // real element, so what a consumer writes has to reach it.
  describe('native attributes reach the real input', () => {
    @Component({
      imports: [Input],
      template: `
        <ui-input
          class="mine"
          label="Email"
          name="email"
          autocomplete="email"
          maxlength="254"
          tabindex="3"
          inputmode="email"
          data-testid="email-field"
          aria-label="Work email"
        />
      `,
    })
    class AttrHost {}

    let f: ComponentFixture<AttrHost>;
    let wrapper: HTMLElement;
    let input: HTMLInputElement;

    beforeEach(async () => {
      f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      wrapper = f.nativeElement.querySelector('ui-input');
      input = f.nativeElement.querySelector('input');
    });

    it('moves aria-* onto the control', () => {
      expect(input.getAttribute('aria-label')).toBe('Work email');
      expect(wrapper.hasAttribute('aria-label')).toBe(false);
    });

    it('moves data-* onto the control', () => {
      expect(input.dataset['testid']).toBe('email-field');
      expect(wrapper.hasAttribute('data-testid')).toBe(false);
    });

    // A tabindex left on the wrapper would be a second tab stop on something
    // that is not a control.
    it('moves tabindex onto the control', () => {
      expect(input.tabIndex).toBe(3);
      expect(wrapper.hasAttribute('tabindex')).toBe(false);
    });

    it('moves native input attributes onto the control', () => {
      expect(input.autocomplete).toBe('email');
      expect(input.maxLength).toBe(254);
      expect(input.getAttribute('inputmode')).toBe('email');
    });

    // Material's own host binding owns `[attr.name]`, so this one arrives through
    // its input rather than as an attribute Material would overwrite.
    it('gives the control the name, for native form submission', () => {
      expect(input.name).toBe('email');
    });

    // `class` is how a consumer targets the wrapper — the one thing that must
    // not move.
    it('leaves class on the wrapper', () => {
      expect(wrapper.classList).toContain('mine');
      expect(input.classList).not.toContain('mine');
    });

    // Rule 3 for the bound case: a binding that only worked on the first paint is
    // a bug that shows up later.
    it('moves an attribute bound after the first render', async () => {
      @Component({
        imports: [Input],
        template: `<ui-input label="Email" [attr.aria-label]="name()" />`,
      })
      class BoundHost {
        readonly name = signal('Work email');
      }

      const bf = TestBed.createComponent(BoundHost);
      await bf.whenStable();
      const boundInput = bf.nativeElement.querySelector('input') as HTMLInputElement;
      expect(boundInput.getAttribute('aria-label')).toBe('Work email');

      bf.componentInstance.name.set('Home email');
      await bf.whenStable();
      // The move happens in a MutationObserver callback — a microtask after the
      // binding writes the attribute.
      await Promise.resolve();

      expect(boundInput.getAttribute('aria-label')).toBe('Home email');
      expect(bf.nativeElement.querySelector('ui-input').hasAttribute('aria-label')).toBe(false);
    });

    // Material merges these ids with the hint's and the error's, so it has to
    // arrive through its input rather than as an attribute it would overwrite.
    it('keeps a consumer’s aria-describedby alongside Material’s messages', async () => {
      @Component({
        imports: [Input],
        template: `
          <p id="policy">Never shared.</p>
          <ui-input label="Email" hint="Sign-in address" aria-describedby="policy" />
        `,
      })
      class DescribedHost {}

      const df = TestBed.createComponent(DescribedHost);
      await df.whenStable();
      const describedInput = df.nativeElement.querySelector('input') as HTMLInputElement;
      const ids = describedInput.getAttribute('aria-describedby')!.split(' ');

      expect(ids).toContain('policy');
      expect(ids).toContain(df.nativeElement.querySelector('mat-hint').id);
      expect(df.nativeElement.querySelector('ui-input').hasAttribute('aria-describedby')).toBe(
        false,
      );
    });
  });

  // Rule 7: a string input cannot spell an icon, a button, or a hint with a link.
  describe('slots', () => {
    it('projects a prefix into Material’s own leading slot', async () => {
      @Component({
        imports: [Input, InputPrefix],
        template: `<ui-input label="Search"><span uiInputPrefix id="lead">@</span></ui-input>`,
      })
      class PrefixHost {}

      const f = TestBed.createComponent(PrefixHost);
      await f.whenStable();
      const projected = f.nativeElement.querySelector('#lead') as HTMLElement;

      expect(projected).not.toBeNull();
      expect(projected.closest('.mat-mdc-form-field-icon-prefix')).not.toBeNull();
    });

    it('projects a suffix into Material’s own trailing slot', async () => {
      @Component({
        imports: [Input, InputSuffix],
        template: `<ui-input label="Password"><span uiInputSuffix id="trail">!</span></ui-input>`,
      })
      class SuffixHost {}

      const f = TestBed.createComponent(SuffixHost);
      await f.whenStable();
      const projected = f.nativeElement.querySelector('#trail') as HTMLElement;

      expect(projected.closest('.mat-mdc-form-field-icon-suffix')).not.toBeNull();
    });

    it('renders no slot containers when nothing is projected', () => {
      expect(query('.ui-input__prefix')).toBeNull();
      expect(query('.ui-input__suffix')).toBeNull();
    });

    it('lets a projected hint replace the hint string', async () => {
      @Component({
        imports: [Input, InputHint],
        template: `
          <ui-input label="API token" hint="ignored">
            <span uiInputHint>See the <a href="/docs">docs</a>.</span>
          </ui-input>
        `,
      })
      class HintHost {}

      const f = TestBed.createComponent(HintHost);
      await f.whenStable();
      const hints = f.nativeElement.querySelectorAll('mat-hint');

      expect(hints.length).toBe(1);
      expect(hints[0].querySelector('a')).not.toBeNull();
      expect(hints[0].textContent).not.toContain('ignored');
    });

    it('announces a projected hint with the control, as Material’s own', async () => {
      @Component({
        imports: [Input, InputHint],
        template: `<ui-input label="API token"><span uiInputHint>Docs</span></ui-input>`,
      })
      class HintHost {}

      const f = TestBed.createComponent(HintHost);
      await f.whenStable();
      const hintInput = f.nativeElement.querySelector('input') as HTMLInputElement;

      expect(hintInput.getAttribute('aria-describedby')).toBe(
        f.nativeElement.querySelector('mat-hint').id,
      );
    });
  });

  describe('escape hatches', () => {
    it('exposes the component via exportAs', () => {
      expect(host.ref()).toBeInstanceOf(Input);
    });

    // Rule 4: Material's own API is not swallowed — `focus()` and the rest are
    // one hop away rather than an API this component has to re-declare.
    it('exposes the Material instances and the real element', () => {
      expect(host.ref().matInput()).toBeInstanceOf(MatInput);
      expect(host.ref().matFormField()).toBeInstanceOf(MatFormField);
      expect(host.ref().inputElement().nativeElement).toBe(inputElement());
    });
  });

  // Rule 2: sizing a field is the obvious thing to want, and `::ng-deep` must not
  // be the way to get it. The field fills the host, so the host is what is sized.
  describe('styling hooks', () => {
    // Reads the *declaration* rather than a painted width, on purpose: `ng test`
    // runs in jsdom, which does not substitute `var()` at all.
    it('resolves the field’s width from the hook', () => {
      expect(getComputedStyle(query('mat-form-field')!).getPropertyValue('width')).toContain(
        'var(--ui-input-width',
      );
    });
  });

  describe('a field with no form bound', () => {
    // `onTouched` is a no-op until a form registers one: a field with no forms
    // directive must not break on blur.
    it('survives a blur', async () => {
      await (await loader.getHarness(MatInputHarness)).blur();
      await fixture.whenStable();

      expect(inputElement()).not.toBeNull();
    });
  });
});
