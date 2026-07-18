import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatInputHarness } from '@angular/material/input/testing';

import { Textarea, TextareaHint, type UiTextareaAppearance } from './textarea';

@Component({
  imports: [Textarea],
  template: `
    <ui-textarea
      #ref="uiTextarea"
      [label]="label()"
      [placeholder]="placeholder()"
      [rows]="rows()"
      [autosize]="autosize()"
      [maxRows]="maxRows()"
      [maxLength]="maxLength()"
      [hideCounter]="hideCounter()"
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
  readonly label = signal<string | undefined>('Bio');
  readonly placeholder = signal<string | undefined>(undefined);
  readonly rows = signal(3);
  readonly autosize = signal(true);
  readonly maxRows = signal<number | undefined>(undefined);
  readonly maxLength = signal<number | undefined>(undefined);
  readonly hideCounter = signal(false);
  readonly disabled = signal(false);
  readonly hint = signal<string | undefined>(undefined);
  readonly error = signal<string | undefined>(undefined);
  readonly appearance = signal<UiTextareaAppearance>('outline');
  readonly required = signal(false);
  readonly readonly = signal(false);
  readonly value = signal('');
  readonly ref = viewChild.required<Textarea>('ref');
}

const APPEARANCES: readonly UiTextareaAppearance[] = ['fill', 'outline'];

describe('Textarea', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let loader: HarnessLoader;

  // The textarea is a `matInput` too, so the `MatInputHarness` speaks for it —
  // `getValue()`, `setValue()`, `isDisabled()`, `isRequired()`, `isReadonly()`,
  // `getPlaceholder()` — instead of reaching into the native `<textarea>` Material
  // renders into. Reading state and value through it means Material can rework its
  // own markup without breaking this spec on a detail no consumer depends on.
  // Everything the harness *cannot* see — this component's own additions (`rows`,
  // autosize, the character counter), label/hint/error rendering, `id`/`for`/
  // `aria-*` association, native-attribute forwarding, the CVA wiring proven
  // through the host `FormControl`, the `ui-*` styling hooks — stays a DOM or
  // instance assertion below.
  const input = (f: ComponentFixture<unknown> = fixture): Promise<MatInputHarness> =>
    TestbedHarnessEnvironment.loader(f).getHarness(MatInputHarness);

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  /** The real `<textarea>` Material renders into, for the assertions the harness cannot make. */
  const control = (): HTMLTextAreaElement => query('textarea') as HTMLTextAreaElement;

  /**
   * The end-aligned hint the counter is rendered as.
   *
   * By class rather than by `mat-hint[align="end"]`: `align` is a `MatHint` input
   * and it host-binds `[attr.align]="null"`, so the attribute the template writes
   * is gone from the DOM by the time a test can look for it. It is the class that
   * proves the counter reached Material's end slot.
   */
  const counter = (): HTMLElement | null => query('.mat-mdc-form-field-hint-end');

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  // The point of this library: the field is Material's and the growing is the
  // CDK's, not a box painted to look like one and a scroll-height loop of our
  // own. If these fail, everything below is testing a lookalike.
  describe('composition', () => {
    it('renders Material’s form field around Material’s textarea', () => {
      expect(query('mat-form-field')).not.toBeNull();
      expect(control().classList).toContain('mat-mdc-input-element');
      expect(host.ref().matFormField()).toBeInstanceOf(MatFormField);
      expect(host.ref().matInput()).toBeInstanceOf(MatInput);
    });

    it('grows with the CDK’s own autosize directive', () => {
      expect(host.ref().autosizeRef()).toBeInstanceOf(CdkTextareaAutosize);
    });

    it('renders exactly one control, and it is a textarea', () => {
      expect(fixture.nativeElement.querySelectorAll('textarea').length).toBe(1);
      expect(fixture.nativeElement.querySelector('input')).toBeNull();
    });
  });

  describe('label', () => {
    it('renders the label as Material’s own', () => {
      expect(query('mat-label')!.textContent!.trim()).toBe('Bio');
    });

    it('renders no label element when none is given', async () => {
      host.label.set(undefined);
      await fixture.whenStable();

      expect(query('mat-label')).toBeNull();
    });

    // Verifying Material's association rather than reimplementing it: the label
    // is a real `<label for>` pointed at the control's id, which is what makes
    // clicking it focus the field and a screen reader read the two as one thing.
    it('is associated with the control by MatFormField', () => {
      const label = query('label') as HTMLLabelElement;

      expect(control().id).not.toBe('');
      expect(label.htmlFor).toBe(control().id);
    });

    it('keeps the association when a consumer names the id, and moves it off the wrapper', async () => {
      @Component({ imports: [Textarea], template: `<ui-textarea label="Bio" id="bio" />` })
      class IdHost {}

      const f = TestBed.createComponent(IdHost);
      await f.whenStable();
      const textarea = f.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
      const label = f.nativeElement.querySelector('label') as HTMLLabelElement;

      expect(textarea.id).toBe('bio');
      expect(label.htmlFor).toBe('bio');
      // Two elements claiming one id is invalid HTML, and the id is the one the
      // label's `for` points at — so it has to be the control's alone.
      expect(f.nativeElement.querySelector('ui-textarea').hasAttribute('id')).toBe(false);
      expect(f.nativeElement.querySelectorAll('#bio').length).toBe(1);
    });
  });

  describe('placeholder', () => {
    it('puts the placeholder on the control', async () => {
      host.placeholder.set('A sentence or two about yourself.');
      await fixture.whenStable();

      expect(await (await loader.getHarness(MatInputHarness)).getPlaceholder()).toBe(
        'A sentence or two about yourself.',
      );
    });

    it('has none by default', async () => {
      expect(await (await loader.getHarness(MatInputHarness)).getPlaceholder()).toBe('');
    });
  });

  // The two things a multi-line field adds to `ui-input`. First: it grows.
  describe('rows', () => {
    it('defaults to three', () => {
      expect(host.ref().rows()).toBe(3);
      expect(control().rows).toBe(3);
    });

    it('puts the row count on the control', async () => {
      host.rows.set(8);
      await fixture.whenStable();

      expect(control().rows).toBe(8);
    });

    // `rows="6"` on the host is a string, and a string height is not a height.
    it('reads the attribute as a number', async () => {
      @Component({ imports: [Textarea], template: `<ui-textarea label="Bio" rows="6" />` })
      class RowsHost {
        readonly ref = viewChild.required(Textarea);
      }

      const f = TestBed.createComponent(RowsHost);
      await f.whenStable();

      expect(f.componentInstance.ref().rows()).toBe(6);
      expect((f.nativeElement.querySelector('textarea') as HTMLTextAreaElement).rows).toBe(6);
    });

    // A bound input is always transformed, and `numberAttribute(undefined)` is
    // `NaN` — so without a guard `[rows]="settings.rows"` on a setting nobody has
    // chosen would put `rows="NaN"` on the control.
    it('falls back to the default for a binding that is unset', async () => {
      host.rows.set(undefined as unknown as number);
      await fixture.whenStable();

      expect(host.ref().rows()).toBe(3);
      expect(control().rows).toBe(3);
    });

    // While autosize is on, `rows` is the floor the CDK grows from — otherwise a
    // three-row field would collapse to one row the moment it rendered empty.
    it('is the CDK’s minimum while autosize is on', async () => {
      expect(host.ref().autosizeRef().minRows).toBe(3);

      host.rows.set(5);
      await fixture.whenStable();

      expect(host.ref().autosizeRef().minRows).toBe(5);
    });
  });

  describe('autosize', () => {
    it('is on by default', () => {
      expect(host.ref().autosize()).toBe(true);
      expect(host.ref().autosizeRef().enabled).toBe(true);
    });

    it('turns the CDK’s autosizing off, and back on', async () => {
      host.autosize.set(false);
      await fixture.whenStable();
      expect(host.ref().autosizeRef().enabled).toBe(false);

      host.autosize.set(true);
      await fixture.whenStable();
      expect(host.ref().autosizeRef().enabled).toBe(true);
    });

    it('reads the bare attribute as true', async () => {
      @Component({ imports: [Textarea], template: `<ui-textarea label="Bio" autosize />` })
      class AttrHost {
        readonly ref = viewChild.required(Textarea);
      }

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();

      expect(f.componentInstance.ref().autosize()).toBe(true);
    });

    // Rule 6, and the reason the two are alternatives: while the CDK owns the
    // height, a height the user dragged to would be overwritten on the next
    // keystroke.
    it('takes the resize grabber away only while it is on', async () => {
      expect(control().classList).toContain('ui-textarea__control--autosize');

      host.autosize.set(false);
      await fixture.whenStable();

      expect(control().classList).not.toContain('ui-textarea__control--autosize');
    });

    describe('maxRows', () => {
      // 0 is how the CDK spells "no ceiling", and is what an unset input has to
      // reach it as.
      it('has no ceiling by default', () => {
        expect(host.ref().maxRows()).toBeUndefined();
        expect(host.ref().autosizeRef().maxRows).toBe(0);
      });

      it('caps the CDK’s growth', async () => {
        host.maxRows.set(10);
        await fixture.whenStable();

        expect(host.ref().autosizeRef().maxRows).toBe(10);
      });

      it('reads the attribute as a number', async () => {
        @Component({ imports: [Textarea], template: `<ui-textarea label="Bio" maxRows="9" />` })
        class MaxRowsHost {
          readonly ref = viewChild.required(Textarea);
        }

        const f = TestBed.createComponent(MaxRowsHost);
        await f.whenStable();

        expect(f.componentInstance.ref().maxRows()).toBe(9);
      });
    });
  });

  // Second: it counts.
  describe('maxLength and the counter', () => {
    it('has no limit and no counter by default', () => {
      expect(control().getAttribute('maxlength')).toBeNull();
      expect(host.ref().hasCounter()).toBe(false);
      expect(counter()).toBeNull();
    });

    // Both halves of the job: the browser enforces the limit, and the user can
    // see it coming.
    it('sets the native limit on the control', async () => {
      host.maxLength.set(280);
      await fixture.whenStable();

      expect(control().maxLength).toBe(280);
    });

    it('shows the counter once a limit is set', async () => {
      host.maxLength.set(280);
      await fixture.whenStable();

      expect(host.ref().hasCounter()).toBe(true);
      expect(counter()!.textContent!.trim()).toBe('0 / 280');
    });

    it('counts what the user types', async () => {
      host.maxLength.set(280);
      await fixture.whenStable();

      await (await loader.getHarness(MatInputHarness)).setValue('Hello');
      await fixture.whenStable();

      expect(host.ref().length()).toBe(5);
      expect(counter()!.textContent!.trim()).toBe('5 / 280');
    });

    it('counts a value written by the consumer', async () => {
      host.maxLength.set(280);
      host.value.set('Ada');
      await fixture.whenStable();

      expect(counter()!.textContent!.trim()).toBe('3 / 280');
    });

    it('reads the attribute as a number', async () => {
      @Component({ imports: [Textarea], template: `<ui-textarea label="Bio" maxLength="140" />` })
      class MaxLengthHost {
        readonly ref = viewChild.required(Textarea);
      }

      const f = TestBed.createComponent(MaxLengthHost);
      await f.whenStable();

      expect(f.componentInstance.ref().maxLength()).toBe(140);
      expect((f.nativeElement.querySelector('textarea') as HTMLTextAreaElement).maxLength).toBe(140);
    });

    // The whole point of `optionalNumber`. A bound input is always transformed,
    // and `numberAttribute(undefined)` is `NaN` — so `[maxLength]="user.bioLimit"`
    // for a user with no limit would set `maxlength="NaN"` on the control and
    // count `0 / NaN` under it. Unset has to mean unset however it is written.
    it('stays unset for a binding that is unset, rather than counting to NaN', async () => {
      host.maxLength.set(undefined);
      await fixture.whenStable();

      expect(host.ref().maxLength()).toBeUndefined();
      expect(host.ref().hasCounter()).toBe(false);
      expect(counter()).toBeNull();
      expect(control().getAttribute('maxlength')).toBeNull();
    });

    // The counter is Material's own end-aligned hint rather than a line of our
    // own below the field — which is what puts it opposite the hint and gets it
    // announced with the control for free.
    it('is Material’s end-aligned hint, opposite the hint', async () => {
      host.maxLength.set(280);
      host.hint.set('Markdown is supported.');
      await fixture.whenStable();

      const hints = fixture.nativeElement.querySelectorAll('mat-hint');
      expect(hints.length).toBe(2);
      expect(counter()!.tagName.toLowerCase()).toBe('mat-hint');
      expect(counter()!.textContent!.trim()).toBe('0 / 280');
    });

    it('is announced with the control', async () => {
      host.maxLength.set(280);
      await fixture.whenStable();

      expect(control().getAttribute('aria-describedby')!.split(' ')).toContain(counter()!.id);
    });

    // Material renders one subscript and an error wins it. It costs little: the
    // browser enforces `maxLength`, so nobody is over the limit and reading the
    // counter to find out by how much.
    it('gives way to an error, as any hint does', async () => {
      host.maxLength.set(280);
      host.error.set('Tell us a little more.');
      await fixture.whenStable();

      expect(counter()).toBeNull();
      expect(query('mat-error')).not.toBeNull();
      // The limit itself is untouched — only the message about it is.
      expect(control().maxLength).toBe(280);

      host.error.set(undefined);
      await fixture.whenStable();
      expect(counter()).not.toBeNull();
    });

    describe('hideCounter', () => {
      it('keeps the limit and drops the counter', async () => {
        host.maxLength.set(280);
        host.hideCounter.set(true);
        await fixture.whenStable();

        expect(counter()).toBeNull();
        expect(host.ref().hasCounter()).toBe(false);
        expect(control().maxLength).toBe(280);
      });

      it('leaves the hint alone', async () => {
        host.maxLength.set(280);
        host.hideCounter.set(true);
        host.hint.set('Markdown is supported.');
        await fixture.whenStable();

        const hints = fixture.nativeElement.querySelectorAll('mat-hint');
        expect(hints.length).toBe(1);
        expect(hints[0].textContent.trim()).toBe('Markdown is supported.');
      });

      it('reads the bare attribute as true', async () => {
        @Component({
          imports: [Textarea],
          template: `<ui-textarea label="Bio" maxLength="280" hideCounter />`,
        })
        class HideHost {}

        const f = TestBed.createComponent(HideHost);
        await f.whenStable();

        expect(f.nativeElement.querySelector('.mat-mdc-form-field-hint-end')).toBeNull();
        expect((f.nativeElement.querySelector('textarea') as HTMLTextAreaElement).maxLength).toBe(
          280,
        );
      });
    });
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
      host.hint.set('Markdown is supported.');
      await fixture.whenStable();

      expect(query('mat-hint')!.textContent!.trim()).toBe('Markdown is supported.');
    });

    it('renders no hint by default', () => {
      expect(query('mat-hint')).toBeNull();
    });

    // Material's own doing: it points the control at whatever it renders below.
    it('is announced with the control', async () => {
      host.hint.set('Markdown is supported.');
      await fixture.whenStable();

      expect(control().getAttribute('aria-describedby')).toBe(query('mat-hint')!.id);
    });
  });

  describe('error', () => {
    const message = 'Describe the problem in a sentence or two.';

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
      expect(control().getAttribute('aria-invalid')).toBe('true');
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

    it('replaces the hint while it is showing', async () => {
      host.hint.set('Markdown is supported.');
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

      expect(control().getAttribute('aria-describedby')).toBe(query('mat-error')!.id);
    });
  });

  // The requirement this component exists to meet: `[(ngModel)]` and reactive
  // forms with no adapter (rule 5).
  describe('ControlValueAccessor', () => {
    describe('with [(ngModel)]', () => {
      @Component({
        imports: [Textarea, FormsModule],
        template: `<ui-textarea label="Bio" [(ngModel)]="bio" #model="ngModel" />`,
      })
      class ModelHost {
        readonly bio = signal('Mathematician.');
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
        expect(await (await input(f)).getValue()).toBe('Mathematician.');
      });

      // writeValue, after the fact
      it('shows a value written to the model later', async () => {
        modelHost.bio.set('Countess of Lovelace.');
        await f.whenStable();

        expect(await (await input(f)).getValue()).toBe('Countess of Lovelace.');
      });

      // registerOnChange
      it('writes what the user types back to the model', async () => {
        await (await input(f)).setValue('Wrote the first program.');
        await f.whenStable();

        expect(modelHost.bio()).toBe('Wrote the first program.');
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
        imports: [Textarea, ReactiveFormsModule],
        template: `<ui-textarea label="Bio" [formControl]="control" />`,
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
        reactiveHost.control.setValue('Set by the form.');
        await f.whenStable();

        expect(await (await input(f)).getValue()).toBe('Set by the form.');
      });

      it('reports what the user types to the control', async () => {
        await (await input(f)).setValue('Typed.');
        await f.whenStable();

        expect(reactiveHost.control.value).toBe('Typed.');
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
      it('disables the control when the form disables it, and re-enables it', async () => {
        reactiveHost.control.disable();
        await f.whenStable();

        expect(await (await input(f)).isDisabled()).toBe(true);
        expect(f.nativeElement.querySelector('mat-form-field').classList).toContain(
          'mat-form-field-disabled',
        );

        reactiveHost.control.enable();
        await f.whenStable();

        expect(await (await input(f)).isDisabled()).toBe(false);
      });

      it('starts disabled for a control that starts disabled', async () => {
        @Component({
          imports: [Textarea, ReactiveFormsModule],
          template: `<ui-textarea label="Bio" [formControl]="control" />`,
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
      @Component({ imports: [Textarea], template: `<ui-textarea label="Bio" disabled />` })
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

    // A textarea's value is multi-line — the one thing it has that an input does
    // not.
    it('keeps newlines', async () => {
      await (await loader.getHarness(MatInputHarness)).setValue('one\ntwo\nthree');
      await fixture.whenStable();

      expect(host.value()).toBe('one\ntwo\nthree');
      expect(host.ref().length()).toBe(13);
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
      expect(control().getAttribute('aria-required')).toBe('true');
      expect(query('.mat-mdc-form-field-required-marker')).not.toBeNull();
    });

    it('hides Material’s asterisk when asked', async () => {
      @Component({
        imports: [Textarea],
        template: `<ui-textarea label="Bio" required hideRequiredMarker />`,
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
  describe('native attributes reach the real textarea', () => {
    @Component({
      imports: [Textarea],
      template: `
        <ui-textarea
          class="mine"
          label="Bio"
          name="bio"
          rows="4"
          wrap="hard"
          spellcheck="false"
          autocomplete="off"
          tabindex="3"
          data-testid="bio-field"
          aria-label="Short biography"
        />
      `,
    })
    class AttrHost {}

    let f: ComponentFixture<AttrHost>;
    let wrapper: HTMLElement;
    let textarea: HTMLTextAreaElement;

    beforeEach(async () => {
      f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      wrapper = f.nativeElement.querySelector('ui-textarea');
      textarea = f.nativeElement.querySelector('textarea');
    });

    it('moves aria-* onto the control', () => {
      expect(textarea.getAttribute('aria-label')).toBe('Short biography');
      expect(wrapper.hasAttribute('aria-label')).toBe(false);
    });

    it('moves data-* onto the control', () => {
      expect(textarea.dataset['testid']).toBe('bio-field');
      expect(wrapper.hasAttribute('data-testid')).toBe(false);
    });

    // A tabindex left on the wrapper would be a second tab stop on something
    // that is not a control.
    it('moves tabindex onto the control', () => {
      expect(textarea.tabIndex).toBe(3);
      expect(wrapper.hasAttribute('tabindex')).toBe(false);
    });

    it('moves native textarea attributes onto the control', () => {
      expect(textarea.wrap).toBe('hard');
      expect(textarea.autocomplete).toBe('off');
      // The attribute rather than the IDL property: jsdom does not implement
      // `HTMLElement.spellcheck`.
      expect(textarea.getAttribute('spellcheck')).toBe('false');
    });

    // Material's own host binding owns `[attr.name]`, so this one arrives through
    // its input rather than as an attribute Material would overwrite.
    it('gives the control the name, for native form submission', () => {
      expect(textarea.name).toBe('bio');
    });

    // `rows` is this component's own input, and the template binds it. Forwarding
    // the attribute as well would leave two writers on one property.
    it('leaves rows to the input that owns it', () => {
      expect(textarea.rows).toBe(4);
      expect(wrapper.getAttribute('rows')).toBe('4');
    });

    // `class` is how a consumer targets the wrapper — the one thing that must
    // not move.
    it('leaves class on the wrapper', () => {
      expect(wrapper.classList).toContain('mine');
      expect(textarea.classList).not.toContain('mine');
    });

    // Rule 3 for the bound case: a binding that only worked on the first paint is
    // a bug that shows up later.
    it('moves an attribute bound after the first render', async () => {
      @Component({
        imports: [Textarea],
        template: `<ui-textarea label="Bio" [attr.aria-label]="name()" />`,
      })
      class BoundHost {
        readonly name = signal('Short biography');
      }

      const bf = TestBed.createComponent(BoundHost);
      await bf.whenStable();
      const boundControl = bf.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
      expect(boundControl.getAttribute('aria-label')).toBe('Short biography');

      bf.componentInstance.name.set('Long biography');
      await bf.whenStable();
      // The move happens in a MutationObserver callback — a microtask after the
      // binding writes the attribute.
      await Promise.resolve();

      expect(boundControl.getAttribute('aria-label')).toBe('Long biography');
      expect(bf.nativeElement.querySelector('ui-textarea').hasAttribute('aria-label')).toBe(false);
    });

    // Material merges these ids with the hint's, the counter's and the error's,
    // so it has to arrive through its input rather than as an attribute it would
    // overwrite.
    it('keeps a consumer’s aria-describedby alongside Material’s messages', async () => {
      @Component({
        imports: [Textarea],
        template: `
          <p id="policy">Shown on your public profile.</p>
          <ui-textarea label="Bio" hint="Markdown is supported." maxLength="280"
                       aria-describedby="policy" />
        `,
      })
      class DescribedHost {}

      const df = TestBed.createComponent(DescribedHost);
      await df.whenStable();
      const describedControl = df.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
      const ids = describedControl.getAttribute('aria-describedby')!.split(' ');

      expect(ids).toContain('policy');
      expect(ids).toContain(
        df.nativeElement.querySelector('mat-hint:not(.mat-mdc-form-field-hint-end)').id,
      );
      expect(ids).toContain(df.nativeElement.querySelector('.mat-mdc-form-field-hint-end').id);
      expect(df.nativeElement.querySelector('ui-textarea').hasAttribute('aria-describedby')).toBe(
        false,
      );
    });
  });

  // Rule 7: a string input cannot spell a hint with a link in it.
  describe('slots', () => {
    it('lets a projected hint replace the hint string', async () => {
      @Component({
        imports: [Textarea, TextareaHint],
        template: `
          <ui-textarea label="Release notes" hint="ignored">
            <span uiTextareaHint>Supports <a href="/docs">Markdown</a>.</span>
          </ui-textarea>
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
        imports: [Textarea, TextareaHint],
        template: `<ui-textarea label="Release notes"><span uiTextareaHint>Docs</span></ui-textarea>`,
      })
      class HintHost {}

      const f = TestBed.createComponent(HintHost);
      await f.whenStable();
      const hintControl = f.nativeElement.querySelector('textarea') as HTMLTextAreaElement;

      expect(hintControl.getAttribute('aria-describedby')).toBe(
        f.nativeElement.querySelector('mat-hint').id,
      );
    });

    it('sits opposite the counter rather than replacing it', async () => {
      @Component({
        imports: [Textarea, TextareaHint],
        template: `
          <ui-textarea label="Release notes" maxLength="280">
            <span uiTextareaHint>Supports <a href="/docs">Markdown</a>.</span>
          </ui-textarea>
        `,
      })
      class HintHost {}

      const f = TestBed.createComponent(HintHost);
      await f.whenStable();

      expect(f.nativeElement.querySelectorAll('mat-hint').length).toBe(2);
      expect(f.nativeElement.querySelector('.mat-mdc-form-field-hint-end').textContent.trim()).toBe(
        '0 / 280',
      );
    });
  });

  describe('escape hatches', () => {
    it('exposes the component via exportAs', () => {
      expect(host.ref()).toBeInstanceOf(Textarea);
    });

    // Rule 4: Material's and the CDK's own APIs are not swallowed — `focus()` and
    // `resizeToFitContent()` are one hop away rather than an API this component
    // has to re-declare.
    it('exposes the Material and CDK instances and the real element', () => {
      expect(host.ref().matInput()).toBeInstanceOf(MatInput);
      expect(host.ref().matFormField()).toBeInstanceOf(MatFormField);
      expect(host.ref().autosizeRef()).toBeInstanceOf(CdkTextareaAutosize);
      expect(host.ref().textareaElement().nativeElement).toBe(control());
    });
  });

  // Rule 2: sizing a field is the obvious thing to want, and `::ng-deep` must not
  // be the way to get it. The field fills the host, so the host is what is sized.
  describe('styling hooks', () => {
    // Reads the *declaration* rather than a painted width, on purpose: `ng test`
    // runs in jsdom, which does not substitute `var()` at all.
    it('resolves the field’s width from the hook', () => {
      expect(getComputedStyle(query('mat-form-field')!).getPropertyValue('width')).toContain(
        'var(--ui-textarea-width',
      );
    });

    it('resolves the control’s resize from the hook', () => {
      expect(getComputedStyle(control()).getPropertyValue('resize')).toContain(
        'var(--ui-textarea-resize',
      );
    });
  });

  describe('a field with no form bound', () => {
    // `onTouched` is a no-op until a form registers one: a field with no forms
    // directive must not break on blur.
    it('survives a blur', async () => {
      await (await loader.getHarness(MatInputHarness)).blur();
      await fixture.whenStable();

      expect(control()).not.toBeNull();
    });
  });
});
