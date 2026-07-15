import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormField } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';

import {
  Select,
  SelectHint,
  SelectOptionDef,
  SelectPrefix,
  SelectSuffix,
  SelectTriggerDef,
  type UiSelectAppearance,
  type UiSelectOption,
} from './select';

const OPTIONS: UiSelectOption<string>[] = [
  { value: 'gb', label: 'United Kingdom' },
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany', disabled: true },
];

const APPEARANCES: readonly UiSelectAppearance[] = ['fill', 'outline'];

@Component({
  imports: [Select],
  template: `
    <ui-select
      #ref="uiSelect"
      [label]="label()"
      [options]="options()"
      [placeholder]="placeholder()"
      [multiple]="multiple()"
      [disabled]="disabled()"
      [hint]="hint()"
      [error]="error()"
      [appearance]="appearance()"
      [required]="required()"
      [(value)]="value"
      (openedChange)="opened.set($event)"
    />
  `,
})
class TestHost {
  readonly label = signal<string | undefined>('Country');
  readonly options = signal<readonly UiSelectOption<string>[]>(OPTIONS);
  readonly placeholder = signal<string | undefined>(undefined);
  readonly multiple = signal(false);
  readonly disabled = signal(false);
  readonly hint = signal<string | undefined>(undefined);
  readonly error = signal<string | undefined>(undefined);
  readonly appearance = signal<UiSelectAppearance>('outline');
  readonly required = signal(false);
  readonly value = signal<string | readonly string[] | null>(null);
  readonly opened = signal(false);
  readonly ref = viewChild.required<Select<string>>('ref');
}

describe('Select', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  /** The `<mat-select>` host — the real control, the one with `role="combobox"`. */
  const selectElement = (): HTMLElement => query('mat-select') as HTMLElement;

  /** The panel lives in an overlay at the document root, not inside the fixture. */
  const panelOptions = (): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>('mat-option'));

  const open = async (f: ComponentFixture<unknown> = fixture): Promise<void> => {
    (f.nativeElement.querySelector('.mat-mdc-select-trigger') as HTMLElement).click();
    await f.whenStable();
  };

  /** Chooses an option the way a user would: open the panel, click the option. */
  const choose = async (label: string, f: ComponentFixture<unknown> = fixture): Promise<void> => {
    if (!document.querySelector('.mat-mdc-select-panel')) {
      await open(f);
    }
    const option = panelOptions().find((o) => o.textContent?.trim() === label);
    if (!option) {
      throw new Error(`No option labelled "${label}" in the panel.`);
    }
    option.click();
    await f.whenStable();
  };

  /** What the closed field shows as its value. */
  const triggerText = (): string => query('.mat-mdc-select-value')!.textContent!.trim();

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  // The point of this library: the control is Material's, not a box painted to
  // look like one. If these fail, everything below is testing a lookalike.
  describe('composition', () => {
    it('renders Material’s form field around Material’s select', () => {
      expect(query('mat-form-field')).not.toBeNull();
      expect(host.ref().matFormField()).toBeInstanceOf(MatFormField);
      expect(host.ref().matSelect()).toBeInstanceOf(MatSelect);
    });

    it('renders the control as a combobox over a listbox, as ARIA wants', async () => {
      expect(selectElement().getAttribute('role')).toBe('combobox');
      expect(selectElement().getAttribute('aria-haspopup')).toBe('listbox');

      await open();

      expect(document.querySelector('.mat-mdc-select-panel')!.getAttribute('role')).toBe('listbox');
    });

    it('renders exactly one control', () => {
      expect(fixture.nativeElement.querySelectorAll('mat-select').length).toBe(1);
    });
  });

  describe('options', () => {
    it('renders one Material option per option, in order', async () => {
      await open();

      expect(panelOptions().map((o) => o.textContent!.trim())).toEqual([
        'United Kingdom',
        'France',
        'Germany',
      ]);
    });

    it('renders no options for an empty list', async () => {
      host.options.set([]);
      await fixture.whenStable();
      await open();

      expect(panelOptions()).toEqual([]);
    });

    it('re-renders when the list changes', async () => {
      host.options.set([{ value: 'es', label: 'Spain' }]);
      await fixture.whenStable();
      await open();

      expect(panelOptions().map((o) => o.textContent!.trim())).toEqual(['Spain']);
    });

    // A disabled option is one choice being unavailable — the rest still work,
    // which is what separates it from a disabled field.
    it('disables the option marked disabled, and only it', async () => {
      await open();
      const [uk, , germany] = panelOptions();

      expect(germany.getAttribute('aria-disabled')).toBe('true');
      expect(uk.getAttribute('aria-disabled')).toBe('false');
    });

    it('does not choose a disabled option that is clicked', async () => {
      await open();
      panelOptions()[2].click();
      await fixture.whenStable();

      expect(host.value()).toBeNull();
    });

    it('holds the option’s value, which need not be a string', async () => {
      @Component({
        imports: [Select],
        template: `<ui-select label="Country" [options]="options" [(value)]="value" />`,
      })
      class ObjectHost {
        readonly options: UiSelectOption<{ id: number }>[] = [
          { value: { id: 1 }, label: 'One' },
          { value: { id: 2 }, label: 'Two' },
        ];
        readonly value = signal<{ id: number } | readonly { id: number }[] | null>(null);
      }

      const f = TestBed.createComponent(ObjectHost);
      await f.whenStable();
      await choose('Two', f);

      expect(f.componentInstance.value()).toEqual({ id: 2 });
    });
  });

  describe('label', () => {
    it('renders the label as Material’s own', () => {
      expect(query('mat-label')!.textContent!.trim()).toBe('Country');
    });

    it('renders no label element when none is given', async () => {
      host.label.set(undefined);
      await fixture.whenStable();

      expect(query('mat-label')).toBeNull();
    });

    // Verifying Material's association rather than reimplementing it. Note it is
    // `aria-labelledby` rather than a `<label for>`: `for` only associates with a
    // native form element, and Material's select is a combobox over an overlay
    // listbox — so `MatSelect` turns the automatic labelling off and names itself
    // with the label's id instead.
    it('is named by the label, the way Material names a combobox', () => {
      expect(selectElement().id).not.toBe('');
      expect(selectElement().getAttribute('aria-labelledby')).toContain(query('label')!.id);
      expect(query('label')!.id).not.toBe('');
    });

    it('keeps the association when a consumer names the id', async () => {
      @Component({
        imports: [Select],
        template: `<ui-select label="Country" id="country" [options]="options" />`,
      })
      class IdHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(IdHost);
      await f.whenStable();
      const select = f.nativeElement.querySelector('mat-select') as HTMLElement;

      expect(select.id).toBe('country');
      expect(select.getAttribute('aria-labelledby')).toContain(
        (f.nativeElement.querySelector('label') as HTMLElement).id,
      );
    });

    // Two elements claiming one id is invalid HTML, and the id is the one the
    // label's `for` points at — so it has to be the control's alone.
    it('moves the id off the wrapper', async () => {
      @Component({
        imports: [Select],
        template: `<ui-select label="Country" id="country" [options]="options" />`,
      })
      class IdHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(IdHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('ui-select').hasAttribute('id')).toBe(false);
      expect(f.nativeElement.querySelectorAll('#country').length).toBe(1);
    });
  });

  describe('placeholder', () => {
    it('shows the placeholder while nothing is chosen', async () => {
      host.placeholder.set('Pick one');
      await fixture.whenStable();

      expect(query('.mat-mdc-select-placeholder')!.textContent!.trim()).toBe('Pick one');
    });

    it('gives way to the value once something is chosen', async () => {
      host.placeholder.set('Pick one');
      await fixture.whenStable();
      await choose('France');

      expect(query('.mat-mdc-select-placeholder')).toBeNull();
      expect(triggerText()).toBe('France');
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

  // Material reads `multiple` once, as the select initialises, and throws if it
  // changes afterwards — so every host here is born in the mode it tests, which
  // is also the only way a consumer can use it.
  describe('multiple', () => {
    @Component({
      imports: [Select],
      template: `<ui-select label="Countries" multiple [options]="options" [(value)]="value" />`,
    })
    class MultiHost {
      readonly options = OPTIONS;
      readonly value = signal<string | readonly string[] | null>([]);
      readonly ref = viewChild.required(Select);
    }

    let f: ComponentFixture<MultiHost>;
    let multiHost: MultiHost;

    const multiTriggerText = (): string =>
      f.nativeElement.querySelector('.mat-mdc-select-value').textContent.trim();

    beforeEach(async () => {
      f = TestBed.createComponent(MultiHost);
      multiHost = f.componentInstance;
      await f.whenStable();
    });

    it('is a single select by default', () => {
      expect(host.ref().matSelect().multiple).toBe(false);
    });

    it('lets Material hold more than one choice', async () => {
      expect(multiHost.ref().matSelect().multiple).toBe(true);

      await choose('United Kingdom', f);
      await choose('France', f);

      expect(multiHost.value()).toEqual(['gb', 'fr']);
    });

    it('marks the listbox multi-selectable for assistive technology', async () => {
      await open(f);

      expect(
        document.querySelector('.mat-mdc-select-panel')!.getAttribute('aria-multiselectable'),
      ).toBe('true');
    });

    it('un-chooses an option that is clicked again', async () => {
      await choose('United Kingdom', f);
      await choose('France', f);
      await choose('United Kingdom', f);

      expect(multiHost.value()).toEqual(['fr']);
    });

    // Material's own checkbox — the visible difference between the two modes.
    it('gives every option a checkbox', async () => {
      await open(f);

      expect(document.querySelectorAll('mat-option .mat-pseudo-checkbox').length).toBe(3);
    });

    it('shows every chosen label in the closed field', async () => {
      await choose('United Kingdom', f);
      await choose('France', f);

      expect(multiTriggerText()).toBe('United Kingdom, France');
    });

    // Material's own rule: choosing is not the end of the interaction here, the
    // way it is for the single select below.
    it('keeps the panel open on choosing', async () => {
      await choose('United Kingdom', f);

      expect(multiHost.ref().matSelect().panelOpen).toBe(true);
    });
  });

  describe('a single select', () => {
    it('closes the panel on choosing', async () => {
      await choose('France');

      expect(host.ref().matSelect().panelOpen).toBe(false);
    });

    it('replaces the choice rather than adding to it', async () => {
      await choose('France');
      await choose('United Kingdom');

      expect(host.value()).toBe('gb');
    });
  });

  describe('hint', () => {
    it('renders the hint as Material’s own', async () => {
      host.hint.set('Where your card was issued.');
      await fixture.whenStable();

      expect(query('mat-hint')!.textContent!.trim()).toBe('Where your card was issued.');
    });

    it('renders no hint by default', () => {
      expect(query('mat-hint')).toBeNull();
    });

    // Material's own doing: it points the control at whatever it renders below.
    it('is announced with the control', async () => {
      host.hint.set('Where your card was issued.');
      await fixture.whenStable();

      expect(selectElement().getAttribute('aria-describedby')).toBe(query('mat-hint')!.id);
    });
  });

  describe('error', () => {
    const message = 'Choose the country your card was issued in.';

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

      expect(host.ref().matSelect().errorState).toBe(true);
      expect(query('mat-form-field')!.classList).toContain('mat-form-field-invalid');
      expect(selectElement().getAttribute('aria-invalid')).toBe('true');
    });

    it('leaves the field valid while unset', () => {
      expect(host.ref().matSelect().errorState).toBe(false);
      expect(query('mat-form-field')!.classList).not.toContain('mat-form-field-invalid');
    });

    it('clears the error state when the message is unset again', async () => {
      host.error.set(message);
      await fixture.whenStable();

      host.error.set(undefined);
      await fixture.whenStable();

      expect(query('mat-error')).toBeNull();
      expect(host.ref().matSelect().errorState).toBe(false);
      expect(query('mat-form-field')!.classList).not.toContain('mat-form-field-invalid');
    });

    // Blank is the same instruction as unset, rather than a red field reporting
    // an empty message.
    it('ignores a blank message', async () => {
      host.error.set('   ');
      await fixture.whenStable();

      expect(host.ref().hasError()).toBe(false);
      expect(query('mat-error')).toBeNull();
      expect(host.ref().matSelect().errorState).toBe(false);
    });

    // Material's own rule: the subscript shows one message, and the error is it.
    it('replaces the hint while it is showing', async () => {
      host.hint.set('Where your card was issued.');
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

      expect(selectElement().getAttribute('aria-describedby')).toBe(query('mat-error')!.id);
    });
  });

  // The requirement this component exists to meet: `[(ngModel)]` and reactive
  // forms with no adapter (rule 5).
  describe('ControlValueAccessor', () => {
    describe('with [(ngModel)]', () => {
      @Component({
        imports: [Select, FormsModule],
        template: `
          <ui-select label="Country" [options]="options" [(ngModel)]="country" #model="ngModel" />
        `,
      })
      class ModelHost {
        readonly options = OPTIONS;
        readonly country = signal<string | null>('fr');
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
      it('shows the model’s initial value', () => {
        expect(f.nativeElement.querySelector('.mat-mdc-select-value').textContent.trim()).toBe(
          'France',
        );
      });

      // writeValue, after the fact
      it('shows a value written to the model later', async () => {
        modelHost.country.set('gb');
        await f.whenStable();

        expect(f.nativeElement.querySelector('.mat-mdc-select-value').textContent.trim()).toBe(
          'United Kingdom',
        );
      });

      // registerOnChange
      it('writes what the user chooses back to the model', async () => {
        await choose('United Kingdom', f);

        expect(modelHost.country()).toBe('gb');
      });

      // registerOnTouched
      it('marks the control touched once the user closes the panel, not before', async () => {
        expect(modelHost.model().touched).toBe(false);

        await open(f);
        expect(modelHost.model().touched).toBe(false);

        await choose('France', f);
        await f.whenStable();

        expect(modelHost.model().touched).toBe(true);
      });

      // registerOnTouched, for the user who never opens the panel
      it('marks the control touched on blur', async () => {
        f.nativeElement.querySelector('mat-select').dispatchEvent(new Event('blur'));
        await f.whenStable();

        expect(modelHost.model().touched).toBe(true);
      });

      it('marks the control dirty once the user chooses', async () => {
        expect(modelHost.model().dirty).toBe(false);

        await choose('United Kingdom', f);

        expect(modelHost.model().dirty).toBe(true);
      });
    });

    describe('with a reactive FormControl', () => {
      @Component({
        imports: [Select, ReactiveFormsModule],
        template: `<ui-select label="Country" [options]="options" [formControl]="control" />`,
      })
      class ReactiveHost {
        readonly options = OPTIONS;
        readonly control = new FormControl<string | null>(null);
      }

      let f: ComponentFixture<ReactiveHost>;
      let reactiveHost: ReactiveHost;

      const reactiveSelect = (): HTMLElement => f.nativeElement.querySelector('mat-select');

      beforeEach(async () => {
        f = TestBed.createComponent(ReactiveHost);
        reactiveHost = f.componentInstance;
        await f.whenStable();
      });

      // writeValue
      it('shows a value set on the control', async () => {
        reactiveHost.control.setValue('de');
        await f.whenStable();

        expect(f.nativeElement.querySelector('.mat-mdc-select-value').textContent.trim()).toBe(
          'Germany',
        );
      });

      // registerOnChange
      it('reports what the user chooses to the control', async () => {
        await choose('France', f);

        expect(reactiveHost.control.value).toBe('fr');
      });

      // writeValue, with a form's own empty value
      it('empties the field when the control is reset', async () => {
        reactiveHost.control.setValue('fr');
        await f.whenStable();

        reactiveHost.control.reset();
        await f.whenStable();

        expect(f.nativeElement.querySelector('.mat-mdc-select-value').textContent.trim()).toBe('');
        expect(f.componentInstance.control.value).toBeNull();
      });

      // setDisabledState — a control disabled by the form has no `disabled`
      // attribute in the template to read.
      it('disables the control when the form disables it', async () => {
        reactiveHost.control.disable();
        await f.whenStable();

        expect(reactiveSelect().getAttribute('aria-disabled')).toBe('true');
        expect(f.nativeElement.querySelector('mat-form-field').classList).toContain(
          'mat-form-field-disabled',
        );
      });

      // setDisabledState, back again
      it('re-enables the control when the form enables it', async () => {
        reactiveHost.control.disable();
        await f.whenStable();

        reactiveHost.control.enable();
        await f.whenStable();

        expect(reactiveSelect().getAttribute('aria-disabled')).toBe('false');
      });

      it('starts disabled for a control that starts disabled', async () => {
        @Component({
          imports: [Select, ReactiveFormsModule],
          template: `<ui-select label="Country" [options]="options" [formControl]="control" />`,
        })
        class DisabledHost {
          readonly options = OPTIONS;
          readonly control = new FormControl({ value: 'fr', disabled: true });
        }

        const df = TestBed.createComponent(DisabledHost);
        await df.whenStable();

        expect(df.nativeElement.querySelector('mat-select').getAttribute('aria-disabled')).toBe(
          'true',
        );
      });
    });

    // A multiple select's value is an array, always — Material throws when it is
    // handed a value of the wrong shape for the mode it is in.
    describe('with a multiple select', () => {
      @Component({
        imports: [Select, ReactiveFormsModule],
        template: `
          <ui-select label="Countries" multiple [options]="options" [formControl]="control" />
        `,
      })
      class MultiHost {
        readonly options = OPTIONS;
        readonly control = new FormControl<string[] | null>(['gb', 'fr']);
      }

      let f: ComponentFixture<MultiHost>;
      let multiHost: MultiHost;

      beforeEach(async () => {
        f = TestBed.createComponent(MultiHost);
        multiHost = f.componentInstance;
        await f.whenStable();
      });

      it('shows every value the control starts with', () => {
        expect(f.nativeElement.querySelector('.mat-mdc-select-value').textContent.trim()).toBe(
          'United Kingdom, France',
        );
      });

      it('reports an array to the control', async () => {
        await choose('France', f);

        expect(multiHost.control.value).toEqual(['gb']);
      });

      // `reset()` writes `null`, which is not a value a multiple select can hold.
      it('reads a reset as nothing chosen, not as a broken value', async () => {
        multiHost.control.reset();
        await f.whenStable();

        expect(f.nativeElement.querySelector('.mat-mdc-select-value').textContent.trim()).toBe('');
        expect(f.debugElement.children[0].componentInstance.value()).toEqual([]);
      });

      // A form patched with one value plainly means an array of one.
      it('reads a lone value as an array of one', async () => {
        multiHost.control.setValue('de' as unknown as string[]);
        await f.whenStable();

        expect(f.nativeElement.querySelector('.mat-mdc-select-value').textContent.trim()).toBe(
          'Germany',
        );
      });
    });

    // Rule 5's whole point: the value can be an object, with no id-in/lookup-out
    // adapter in the consumer's way.
    describe('compareWith', () => {
      interface Country {
        id: string;
        name: string;
      }

      @Component({
        imports: [Select, ReactiveFormsModule],
        template: `
          <ui-select
            label="Country"
            [options]="options"
            [compareWith]="byId"
            [formControl]="control"
          />
        `,
      })
      class CompareHost {
        readonly options: UiSelectOption<Country>[] = [
          { value: { id: 'gb', name: 'United Kingdom' }, label: 'United Kingdom' },
          { value: { id: 'fr', name: 'France' }, label: 'France' },
        ];
        readonly byId = (a: Country, b: Country) => a?.id === b?.id;
        // Deliberately not the same instance as the one in `options` — this is a
        // form patched from a server response.
        readonly control = new FormControl<Country | null>({ id: 'fr', name: 'France' });
      }

      it('matches a value that is not the option’s own instance', async () => {
        const f = TestBed.createComponent(CompareHost);
        await f.whenStable();

        expect(f.nativeElement.querySelector('.mat-mdc-select-value').textContent.trim()).toBe(
          'France',
        );
      });

      it('leaves the field empty under the default ===, which is the reason it exists', async () => {
        @Component({
          imports: [Select, ReactiveFormsModule],
          template: `<ui-select label="Country" [options]="options" [formControl]="control" />`,
        })
        class DefaultCompareHost {
          readonly options: UiSelectOption<Country>[] = [
            { value: { id: 'fr', name: 'France' }, label: 'France' },
          ];
          readonly control = new FormControl<Country | null>({ id: 'fr', name: 'France' });
        }

        const f = TestBed.createComponent(DefaultCompareHost);
        await f.whenStable();

        expect(f.nativeElement.querySelector('.mat-mdc-select-value').textContent.trim()).toBe('');
      });
    });
  });

  describe('disabled', () => {
    it('is enabled by default', () => {
      expect(selectElement().getAttribute('aria-disabled')).toBe('false');
    });

    it('disables Material’s control', async () => {
      host.disabled.set(true);
      await fixture.whenStable();

      expect(host.ref().matSelect().disabled).toBe(true);
      expect(selectElement().getAttribute('aria-disabled')).toBe('true');
      expect(query('mat-form-field')!.classList).toContain('mat-form-field-disabled');
    });

    // Unlike a text field, a disabled select has no `disabled` attribute to take
    // it out of the tab order — Material drops the tabindex instead.
    it('takes the control out of the tab order', async () => {
      host.disabled.set(true);
      await fixture.whenStable();

      expect(selectElement().getAttribute('tabindex')).toBe('-1');
    });

    it('does not open when clicked', async () => {
      host.disabled.set(true);
      await fixture.whenStable();
      await open();

      expect(host.ref().matSelect().panelOpen).toBe(false);
    });

    it('reads the bare attribute as true', async () => {
      @Component({
        imports: [Select],
        template: `<ui-select label="Country" disabled [options]="options" />`,
      })
      class AttrHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('mat-select').getAttribute('aria-disabled')).toBe(
        'true',
      );
    });

    // The two routes are independent: a form enabling its control — which is a
    // `setDisabledState(false)` — must not silently un-set a `disabled` the
    // template wrote.
    it('stays disabled by the input when a form enables the control', async () => {
      host.disabled.set(true);
      await fixture.whenStable();

      host.ref().setDisabledState(false);
      await fixture.whenStable();

      expect(host.ref().matSelect().disabled).toBe(true);
    });

    it('is disabled by either route on its own', async () => {
      host.ref().setDisabledState(true);
      await fixture.whenStable();
      expect(host.ref().matSelect().disabled).toBe(true);

      host.ref().setDisabledState(false);
      await fixture.whenStable();
      expect(host.ref().matSelect().disabled).toBe(false);

      host.disabled.set(true);
      await fixture.whenStable();
      expect(host.ref().matSelect().disabled).toBe(true);
    });
  });

  // Rule 5: two-way state is a model(), for the field that is not part of a form.
  describe('[(value)]', () => {
    it('starts with nothing chosen', () => {
      expect(host.ref().value()).toBeNull();
      expect(triggerText()).toBe('');
    });

    it('shows a value written by the consumer', async () => {
      host.value.set('de');
      await fixture.whenStable();

      expect(triggerText()).toBe('Germany');
    });

    it('writes what the user chooses back through the binding', async () => {
      await choose('France');

      expect(host.value()).toBe('fr');
      expect(host.ref().value()).toBe('fr');
    });

    it('exposes the chosen options, matched under compareWith', async () => {
      await choose('France');

      expect(host.ref().selectedOptions()).toEqual([{ value: 'fr', label: 'France' }]);
    });
  });

  describe('openedChange', () => {
    it('emits when the panel opens and when it closes', async () => {
      expect(host.opened()).toBe(false);

      await open();
      expect(host.opened()).toBe(true);

      host.ref().matSelect().close();
      await fixture.whenStable();
      expect(host.opened()).toBe(false);
    });
  });

  describe('required', () => {
    it('is optional by default', () => {
      expect(selectElement().getAttribute('aria-required')).toBe('false');
      expect(query('.mat-mdc-form-field-required-marker')).toBeNull();
    });

    it('marks the control required for assistive technology and marks the label', async () => {
      host.required.set(true);
      await fixture.whenStable();

      expect(selectElement().getAttribute('aria-required')).toBe('true');
      expect(query('.mat-mdc-form-field-required-marker')).not.toBeNull();
    });

    it('hides Material’s asterisk when asked', async () => {
      @Component({
        imports: [Select],
        template: `<ui-select label="Country" required hideRequiredMarker [options]="options" />`,
      })
      class MarkerHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(MarkerHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('mat-select').getAttribute('aria-required')).toBe(
        'true',
      );
      expect(f.nativeElement.querySelector('.mat-mdc-form-field-required-marker')).toBeNull();
    });
  });

  // Rule 3. A wrapper must not be where attributes go to die: the control is the
  // real element, so what a consumer writes has to reach it.
  describe('native attributes reach the real control', () => {
    @Component({
      imports: [Select],
      template: `
        <ui-select
          class="mine"
          label="Country"
          tabindex="3"
          data-testid="country-field"
          aria-label="Country of issue"
          [options]="options"
        />
      `,
    })
    class AttrHost {
      readonly options = OPTIONS;
    }

    let f: ComponentFixture<AttrHost>;
    let wrapper: HTMLElement;
    let select: HTMLElement;

    beforeEach(async () => {
      f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      wrapper = f.nativeElement.querySelector('ui-select');
      select = f.nativeElement.querySelector('mat-select');
    });

    it('moves data-* onto the control', () => {
      expect(select.dataset['testid']).toBe('country-field');
      expect(wrapper.hasAttribute('data-testid')).toBe(false);
    });

    // Material owns `aria-label` and `tabindex` on its own host, so these arrive
    // through inputs rather than as attributes it would overwrite.
    it('gives the control a consumer’s aria-label', () => {
      expect(select.getAttribute('aria-label')).toBe('Country of issue');
      expect(wrapper.hasAttribute('aria-label')).toBe(false);
    });

    // A tabindex left on the wrapper would be a second tab stop on something
    // that is not a control.
    it('gives the control a consumer’s tabindex', () => {
      expect(select.getAttribute('tabindex')).toBe('3');
      expect(wrapper.hasAttribute('tabindex')).toBe(false);
    });

    // `class` is how a consumer targets the wrapper — the one thing that must
    // not move.
    it('leaves class on the wrapper', () => {
      expect(wrapper.classList).toContain('mine');
      expect(select.classList).not.toContain('mine');
    });

    // `<mat-select>` renders no native form element, so there is nowhere for
    // `name` to go — and `[(ngModel)]` inside a `<form>` reads it off this host.
    it('leaves name on the wrapper, where ngModel reads it', async () => {
      @Component({
        imports: [Select, FormsModule],
        template: `
          <form>
            <ui-select label="Country" name="country" [options]="options" [(ngModel)]="country" />
          </form>
        `,
      })
      class NameHost {
        readonly options = OPTIONS;
        readonly country = signal<string | null>(null);
      }

      const nf = TestBed.createComponent(NameHost);
      await nf.whenStable();

      expect(nf.nativeElement.querySelector('ui-select').getAttribute('name')).toBe('country');
      expect(nf.nativeElement.querySelector('mat-select').hasAttribute('name')).toBe(false);
    });

    // Rule 3 for the bound case: a binding that only worked on the first paint is
    // a bug that shows up later.
    it('moves an attribute bound after the first render', async () => {
      @Component({
        imports: [Select],
        template: `<ui-select label="Country" [attr.data-state]="state()" [options]="options" />`,
      })
      class BoundHost {
        readonly options = OPTIONS;
        readonly state = signal('clean');
      }

      const bf = TestBed.createComponent(BoundHost);
      await bf.whenStable();
      const boundSelect = bf.nativeElement.querySelector('mat-select') as HTMLElement;
      expect(boundSelect.dataset['state']).toBe('clean');

      bf.componentInstance.state.set('dirty');
      await bf.whenStable();
      // The move happens in a MutationObserver callback — a microtask after the
      // binding writes the attribute.
      await Promise.resolve();

      expect(boundSelect.dataset['state']).toBe('dirty');
      expect(bf.nativeElement.querySelector('ui-select').hasAttribute('data-state')).toBe(false);
    });

    // Material merges these ids with the hint's and the error's, so it has to
    // arrive through its input rather than as an attribute it would overwrite.
    it('keeps a consumer’s aria-describedby alongside Material’s messages', async () => {
      @Component({
        imports: [Select],
        template: `
          <p id="policy">Where your card was issued.</p>
          <ui-select
            label="Country"
            hint="Pick one"
            aria-describedby="policy"
            [options]="options"
          />
        `,
      })
      class DescribedHost {
        readonly options = OPTIONS;
      }

      const df = TestBed.createComponent(DescribedHost);
      await df.whenStable();
      const ids = (df.nativeElement.querySelector('mat-select') as HTMLElement)
        .getAttribute('aria-describedby')!
        .split(' ');

      expect(ids).toContain('policy');
      expect(ids).toContain(df.nativeElement.querySelector('mat-hint').id);
      expect(df.nativeElement.querySelector('ui-select').hasAttribute('aria-describedby')).toBe(
        false,
      );
    });
  });

  // Rule 7: a string input cannot spell an icon, an avatar, or a hint with a link.
  describe('slots', () => {
    it('projects a prefix into Material’s own leading slot', async () => {
      @Component({
        imports: [Select, SelectPrefix],
        template: `
          <ui-select label="Currency" [options]="options"
            ><span uiSelectPrefix id="lead">$</span></ui-select
          >
        `,
      })
      class PrefixHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(PrefixHost);
      await f.whenStable();

      expect(
        (f.nativeElement.querySelector('#lead') as HTMLElement).closest(
          '.mat-mdc-form-field-icon-prefix',
        ),
      ).not.toBeNull();
    });

    it('projects a suffix into Material’s own trailing slot', async () => {
      @Component({
        imports: [Select, SelectSuffix],
        template: `
          <ui-select label="Currency" [options]="options"
            ><span uiSelectSuffix id="trail">!</span></ui-select
          >
        `,
      })
      class SuffixHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(SuffixHost);
      await f.whenStable();

      expect(
        (f.nativeElement.querySelector('#trail') as HTMLElement).closest(
          '.mat-mdc-form-field-icon-suffix',
        ),
      ).not.toBeNull();
    });

    it('renders no slot containers when nothing is projected', () => {
      expect(query('.ui-select__prefix')).toBeNull();
      expect(query('.ui-select__suffix')).toBeNull();
    });

    it('lets a projected hint replace the hint string', async () => {
      @Component({
        imports: [Select, SelectHint],
        template: `
          <ui-select label="Region" hint="ignored" [options]="options">
            <span uiSelectHint>See the <a href="/docs">docs</a>.</span>
          </ui-select>
        `,
      })
      class HintHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(HintHost);
      await f.whenStable();
      const hints = f.nativeElement.querySelectorAll('mat-hint');

      expect(hints.length).toBe(1);
      expect(hints[0].querySelector('a')).not.toBeNull();
      expect(hints[0].textContent).not.toContain('ignored');
    });

    describe('uiSelectOption', () => {
      @Component({
        imports: [Select, SelectOptionDef],
        template: `
          <ui-select label="Country" [options]="options" [(value)]="value">
            <ng-template uiSelectOption let-option>
              <span class="flag">{{ option.value }}</span>
              <span class="name">{{ option.label }}</span>
            </ng-template>
          </ui-select>
        `,
      })
      class OptionHost {
        readonly options = OPTIONS;
        readonly value = signal<string | readonly string[] | null>(null);
      }

      let f: ComponentFixture<OptionHost>;

      beforeEach(async () => {
        f = TestBed.createComponent(OptionHost);
        await f.whenStable();
        await open(f);
      });

      it('renders the template in place of the label', () => {
        expect(document.querySelectorAll('mat-option .flag').length).toBe(3);
        expect(document.querySelector('mat-option .name')!.textContent).toBe('United Kingdom');
      });

      // The point of rendering *inside* `<mat-option>`: selection is untouched.
      it('leaves Material’s own option working', async () => {
        (
          Array.from(document.querySelectorAll<HTMLElement>('mat-option')).find((o) =>
            o.textContent?.includes('France'),
          ) as HTMLElement
        ).click();
        await f.whenStable();

        expect(f.componentInstance.value()).toBe('fr');
      });
    });

    describe('uiSelectTrigger', () => {
      @Component({
        imports: [Select, SelectTriggerDef],
        template: `
          <ui-select label="Countries" multiple [options]="options" [(value)]="value">
            <!-- value is typed as the union a select can hold, so narrowing it
                 to the array multiple guarantees is the consumer's call. -->
            <ng-template uiSelectTrigger let-value let-options="options">
              <span class="summary">{{ options.length }} chosen: {{ $any(value).join('+') }}</span>
            </ng-template>
          </ui-select>
        `,
      })
      class TriggerHost {
        readonly options = OPTIONS;
        readonly value = signal<string | readonly string[] | null>([]);
      }

      let f: ComponentFixture<TriggerHost>;

      beforeEach(async () => {
        f = TestBed.createComponent(TriggerHost);
        await f.whenStable();
      });

      it('renders the template in place of the chosen labels', async () => {
        await choose('United Kingdom', f);
        await choose('France', f);

        expect(f.nativeElement.querySelector('.summary').textContent.trim()).toBe(
          '2 chosen: gb+fr',
        );
      });

      // Material's own rule: the trigger shows only once there is a value, so an
      // empty field is still the placeholder.
      it('shows nothing while nothing is chosen', () => {
        expect(f.nativeElement.querySelector('.summary')).toBeNull();
      });
    });
  });

  describe('escape hatches', () => {
    it('exposes the component via exportAs', () => {
      expect(host.ref()).toBeInstanceOf(Select);
    });

    // Rule 4: Material's own API is not swallowed — `open()`, `focus()` and the
    // rest are one hop away rather than an API this component has to re-declare.
    it('exposes the Material instances and the real element', () => {
      expect(host.ref().matSelect()).toBeInstanceOf(MatSelect);
      expect(host.ref().matFormField()).toBeInstanceOf(MatFormField);
      expect(host.ref().selectElement().nativeElement).toBe(selectElement());
    });

    it('opens the panel through the Material instance', async () => {
      host.ref().matSelect().open();
      await fixture.whenStable();

      expect(host.ref().matSelect().panelOpen).toBe(true);
      expect(document.querySelector('.mat-mdc-select-panel')).not.toBeNull();
    });
  });

  // Rule 2: the panel renders in an overlay at the document root, so styling it
  // must not take a `::ng-deep`. `panelClass` is Material's own answer.
  describe('panelClass', () => {
    it('puts a consumer’s class on Material’s own panel', async () => {
      @Component({
        imports: [Select],
        template: `<ui-select label="Country" panelClass="tall" [options]="options" />`,
      })
      class PanelHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(PanelHost);
      await f.whenStable();
      await open(f);

      expect(document.querySelector('.mat-mdc-select-panel')!.classList).toContain('tall');
    });
  });

  // Rule 2 again: sizing a field is the obvious thing to want, and `::ng-deep`
  // must not be the way to get it. The field fills the host, so the host is what
  // is sized.
  describe('styling hooks', () => {
    // Reads the *declaration* rather than a painted width, on purpose: `ng test`
    // runs in jsdom, which does not substitute `var()` at all.
    it('resolves the field’s width from the hook', () => {
      expect(getComputedStyle(query('mat-form-field')!).getPropertyValue('width')).toContain(
        'var(--ui-select-width',
      );
    });
  });

  describe('a field with no form bound', () => {
    // `onTouched` is a no-op until a form registers one: a field with no forms
    // directive must not break on blur or on closing its panel.
    it('survives a blur and a panel close', async () => {
      selectElement().dispatchEvent(new Event('blur'));
      await open();
      host.ref().matSelect().close();
      await fixture.whenStable();

      expect(selectElement()).not.toBeNull();
    });
  });
});
