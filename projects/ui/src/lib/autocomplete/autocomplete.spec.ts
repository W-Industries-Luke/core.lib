import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

import {
  Autocomplete,
  AutocompleteEmptyDef,
  AutocompleteHint,
  AutocompleteOptionDef,
  AutocompletePrefix,
  AutocompleteSuffix,
  type UiAutocompleteAppearance,
  type UiAutocompleteOption,
} from './autocomplete';

const OPTIONS: UiAutocompleteOption<string>[] = [
  { value: 'gb', label: 'United Kingdom' },
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany' },
  { value: 'es', label: 'Spain', disabled: true },
];

const APPEARANCES: readonly UiAutocompleteAppearance[] = ['fill', 'outline'];

@Component({
  imports: [Autocomplete],
  template: `
    <ui-autocomplete
      #ref="uiAutocomplete"
      [label]="label()"
      [options]="options()"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [hint]="hint()"
      [error]="error()"
      [appearance]="appearance()"
      [required]="required()"
      [noResultsText]="noResultsText()"
      [(value)]="value"
      (optionSelected)="selected.set($event)"
      (openedChange)="opened.set($event)"
    />
  `,
})
class TestHost {
  readonly label = signal<string | undefined>('Country');
  readonly options = signal<readonly UiAutocompleteOption<string>[]>(OPTIONS);
  readonly placeholder = signal<string | undefined>(undefined);
  readonly disabled = signal(false);
  readonly hint = signal<string | undefined>(undefined);
  readonly error = signal<string | undefined>(undefined);
  readonly appearance = signal<UiAutocompleteAppearance>('outline');
  readonly required = signal(false);
  readonly noResultsText = signal<string | undefined>(undefined);
  readonly value = signal<string | null>(null);
  readonly selected = signal<UiAutocompleteOption<string> | null>(null);
  readonly opened = signal(false);
  readonly ref = viewChild.required<Autocomplete<string>>('ref');
}

describe('Autocomplete', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  /** The real control — the `<input>`, the one with `role="combobox"`. */
  const inputElement = (f: ComponentFixture<unknown> = fixture): HTMLInputElement =>
    f.nativeElement.querySelector('input');

  /** The panel lives in an overlay at the document root, not inside the fixture. */
  const panelOptions = (): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>('mat-option'));

  const optionLabels = (): string[] => panelOptions().map((o) => o.textContent!.trim());

  /** Opens the panel the way a user does: by focusing the field. */
  const open = async (f: ComponentFixture<unknown> = fixture): Promise<void> => {
    const input = inputElement(f);
    input.focus();
    input.dispatchEvent(new Event('focusin'));
    await f.whenStable();
  };

  /**
   * Types into the field the way a user does. Material's trigger only opens the
   * panel for an input event on a *focused* field, so this focuses it first — which
   * is something a user typing into a field has already done.
   */
  const type = async (text: string, f: ComponentFixture<unknown> = fixture): Promise<void> => {
    const input = inputElement(f);
    input.focus();
    input.dispatchEvent(new Event('focusin'));
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await f.whenStable();
  };

  /** Chooses a suggestion the way a user would: click it in the panel. */
  const choose = async (label: string, f: ComponentFixture<unknown> = fixture): Promise<void> => {
    const option = panelOptions().find((o) => o.textContent?.trim() === label);
    if (!option) {
      throw new Error(`No option labelled "${label}" in the panel. Have: ${optionLabels()}`);
    }
    option.click();
    await f.whenStable();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  // The point of this library: the control is Material's, not a box painted to look
  // like one. If these fail, everything below is testing a lookalike.
  describe('composition', () => {
    it('renders Material’s form field around Material’s input and panel', () => {
      expect(query('mat-form-field')).not.toBeNull();
      expect(host.ref().matFormField()).toBeInstanceOf(MatFormField);
      expect(host.ref().matInput()).toBeInstanceOf(MatInput);
      expect(host.ref().matAutocomplete()).toBeInstanceOf(MatAutocomplete);
      expect(host.ref().matAutocompleteTrigger()).toBeInstanceOf(MatAutocompleteTrigger);
    });

    it('renders the control as a combobox over a listbox, as ARIA wants', async () => {
      expect(inputElement().getAttribute('role')).toBe('combobox');
      expect(inputElement().getAttribute('aria-autocomplete')).toBe('list');
      expect(inputElement().getAttribute('aria-expanded')).toBe('false');

      await open();

      expect(inputElement().getAttribute('aria-expanded')).toBe('true');
      expect(document.querySelector('.mat-mdc-autocomplete-panel')!.getAttribute('role')).toBe(
        'listbox',
      );
    });

    it('renders exactly one control', () => {
      expect(fixture.nativeElement.querySelectorAll('input').length).toBe(1);
    });
  });

  describe('options', () => {
    it('renders one Material option per option, in order, when the panel opens', async () => {
      await open();

      expect(optionLabels()).toEqual(['United Kingdom', 'France', 'Germany', 'Spain']);
    });

    it('shows no panel until the field is focused', () => {
      expect(panelOptions()).toEqual([]);
      expect(host.ref().matAutocompleteTrigger().panelOpen).toBe(false);
    });

    it('renders no options for an empty list', async () => {
      host.options.set([]);
      await fixture.whenStable();
      await open();

      expect(panelOptions()).toEqual([]);
    });

    it('re-renders when the list changes', async () => {
      host.options.set([{ value: 'it', label: 'Italy' }]);
      await fixture.whenStable();
      await open();

      expect(optionLabels()).toEqual(['Italy']);
    });

    // A disabled option is one suggestion being unavailable — the rest still work,
    // which is what separates it from a disabled field.
    it('disables the option marked disabled, and only it', async () => {
      await open();
      const [uk, , , spain] = panelOptions();

      expect(spain.getAttribute('aria-disabled')).toBe('true');
      expect(uk.getAttribute('aria-disabled')).toBe('false');
    });

    it('does not choose a disabled option that is clicked', async () => {
      await open();
      await choose('Spain');

      expect(host.value()).toBeNull();
      expect(host.selected()).toBeNull();
    });

    it('holds the option’s value, which need not be a string', async () => {
      @Component({
        imports: [Autocomplete],
        template: `<ui-autocomplete label="Country" [options]="options" [(value)]="value" />`,
      })
      class ObjectHost {
        readonly options: UiAutocompleteOption<{ id: number }>[] = [
          { value: { id: 1 }, label: 'One' },
          { value: { id: 2 }, label: 'Two' },
        ];
        readonly value = signal<{ id: number } | string | null>(null);
      }

      const f = TestBed.createComponent(ObjectHost);
      await f.whenStable();
      await open(f);
      await choose('Two', f);

      expect(f.componentInstance.value()).toEqual({ id: 2 });
    });
  });

  // The behaviour this component adds on top of Material, which leaves filtering to
  // the consumer.
  describe('filtering', () => {
    it('filters the panel to the options containing what was typed', async () => {
      await type('an');

      expect(optionLabels()).toEqual(['France', 'Germany']);
    });

    it('is case-insensitive', async () => {
      await type('FRANCE');

      expect(optionLabels()).toEqual(['France']);
    });

    // "Contains", not "starts with": someone typing `kingdom` means the UK.
    it('matches anywhere in the label, not just the start', async () => {
      await type('kingdom');

      expect(optionLabels()).toEqual(['United Kingdom']);
    });

    it('ignores the whitespace around what was typed', async () => {
      await type('  france  ');

      expect(optionLabels()).toEqual(['France']);
    });

    it('narrows as the user keeps typing', async () => {
      await type('g');
      expect(optionLabels()).toEqual(['United Kingdom', 'Germany']);

      await type('ge');
      expect(optionLabels()).toEqual(['Germany']);
    });

    it('widens again as the user deletes', async () => {
      await type('germ');
      expect(optionLabels()).toEqual(['Germany']);

      await type('');
      expect(optionLabels()).toEqual(['United Kingdom', 'France', 'Germany', 'Spain']);
    });

    it('exposes the filtered list, and the text it was filtered by', async () => {
      await type('fra');

      expect(host.ref().text()).toBe('fra');
      expect(host.ref().filteredOptions()).toEqual([{ value: 'fr', label: 'France' }]);
      expect(host.ref().hasNoResults()).toBe(false);
    });

    it('filters a disabled option in like any other, and it stays disabled', async () => {
      await type('spain');

      expect(optionLabels()).toEqual(['Spain']);
      expect(panelOptions()[0].getAttribute('aria-disabled')).toBe('true');
    });

    describe('when nothing matches', () => {
      it('leaves nothing in the panel', async () => {
        await type('zzz');

        expect(panelOptions()).toEqual([]);
        expect(host.ref().hasNoResults()).toBe(true);
      });

      // Material's own behaviour, kept: a panel with nothing in it is hidden rather
      // than an empty box hanging under the field.
      it('shows no panel, by Material’s own rule', async () => {
        await type('zzz');

        expect(host.ref().matAutocompleteTrigger().panelOpen).toBe(false);
      });
    });

    // Reopening a field to change your mind is not a search for what you already
    // picked.
    describe('once an option is chosen', () => {
      beforeEach(async () => {
        await type('fra');
        await choose('France');
      });

      it('shows the whole list again rather than the one chosen label', async () => {
        await open();

        expect(inputElement().value).toBe('France');
        expect(optionLabels()).toEqual(['United Kingdom', 'France', 'Germany', 'Spain']);
      });

      it('filters again from the next keystroke', async () => {
        await type('Franc');

        expect(optionLabels()).toEqual(['France']);
      });
    });

    // A value a form wrote is the field's own answer, not a query either.
    it('shows the whole list for a value written by a consumer', async () => {
      host.value.set('de');
      await fixture.whenStable();
      await open();

      expect(inputElement().value).toBe('Germany');
      expect(optionLabels()).toEqual(['United Kingdom', 'France', 'Germany', 'Spain']);
    });

    describe('filterWith', () => {
      @Component({
        imports: [Autocomplete],
        template: `<ui-autocomplete label="Country" [options]="options" [filterWith]="filter()" />`,
      })
      class FilterHost {
        readonly options = OPTIONS;
        readonly filter = signal<(o: UiAutocompleteOption<string>, text: string) => boolean>(
          (o, text) => o.label.toLowerCase().startsWith(text.toLowerCase()),
        );
      }

      it('replaces the default with the consumer’s own rule', async () => {
        const f = TestBed.createComponent(FilterHost);
        await f.whenStable();

        await type('ger', f);
        expect(optionLabels()).toEqual(['Germany']);

        // The default would have matched `United Kingdom` on "contains".
        await type('kingdom', f);
        expect(optionLabels()).toEqual([]);
      });

      // The shape a server-filtered list takes: the options are already the answer.
      it('leaves every option in place for a filter that always passes', async () => {
        const f = TestBed.createComponent(FilterHost);
        f.componentInstance.filter.set(() => true);
        await f.whenStable();

        await type('zzz', f);

        expect(optionLabels()).toEqual(['United Kingdom', 'France', 'Germany', 'Spain']);
      });

      it('is handed the option and the text exactly as typed', async () => {
        const seen: [UiAutocompleteOption<string>, string][] = [];
        const f = TestBed.createComponent(FilterHost);
        f.componentInstance.filter.set((o, text) => {
          seen.push([o, text]);
          return true;
        });
        await f.whenStable();

        await type('  Fr ', f);

        expect(seen[0]).toEqual([OPTIONS[0], '  Fr ']);
        expect(seen.length).toBe(OPTIONS.length);
      });
    });
  });

  describe('displayWith', () => {
    it('shows the matching option’s label for a value, with no configuration', async () => {
      host.value.set('fr');
      await fixture.whenStable();

      expect(inputElement().value).toBe('France');
    });

    it('shows text the user typed as they typed it, option value or not', async () => {
      // `fr` *is* an option's value — the field must not turn it into `France` while
      // someone is mid-word.
      await type('fr');

      expect(inputElement().value).toBe('fr');
      expect(host.value()).toBe('fr');
    });

    it('shows nothing for an empty value', async () => {
      host.value.set(null);
      await fixture.whenStable();

      expect(inputElement().value).toBe('');
    });

    it('re-renders a value once the options that name it arrive', async () => {
      @Component({
        imports: [Autocomplete],
        template: `<ui-autocomplete label="Country" [options]="options()" [value]="'fr'" />`,
      })
      class LateHost {
        readonly options = signal<readonly UiAutocompleteOption<string>[]>([]);
      }

      const f = TestBed.createComponent(LateHost);
      await f.whenStable();
      // Nothing to look the value up in yet, so the value itself is the honest
      // answer.
      expect(inputElement(f).value).toBe('fr');

      f.componentInstance.options.set(OPTIONS);
      await f.whenStable();

      expect(inputElement(f).value).toBe('France');
    });

    describe('a consumer’s own function', () => {
      interface Country {
        id: string;
        name: string;
      }

      @Component({
        imports: [Autocomplete],
        template: `
          <ui-autocomplete
            label="Country"
            [options]="options"
            [displayWith]="byName"
            [(value)]="value"
          />
        `,
      })
      class DisplayHost {
        readonly options: UiAutocompleteOption<Country>[] = [
          { value: { id: 'gb', name: 'United Kingdom' }, label: 'United Kingdom' },
          { value: { id: 'fr', name: 'France' }, label: 'France' },
        ];
        readonly byName = (value: Country | string | null) =>
          typeof value === 'string' ? value : (value?.name ?? '');
        // Deliberately not the same instance as the one in `options` — this is a
        // form patched from a server response, which the default `===` lookup would
        // not find.
        readonly value = signal<Country | string | null>({ id: 'fr', name: 'France' });
      }

      let f: ComponentFixture<DisplayHost>;

      beforeEach(async () => {
        f = TestBed.createComponent(DisplayHost);
        await f.whenStable();
      });

      it('renders a value no option holds', () => {
        expect(inputElement(f).value).toBe('France');
      });

      // Material's own `displayWith` writes the box on selection. Handing it the
      // same function is what keeps the two from disagreeing.
      it('renders the same text when Material writes the box on selection', async () => {
        await type('United', f);
        await choose('United Kingdom', f);

        expect(inputElement(f).value).toBe('United Kingdom');
        expect(f.componentInstance.value()).toEqual({ id: 'gb', name: 'United Kingdom' });
      });

      it('leaves typed text alone', async () => {
        await type('Fra', f);

        expect(inputElement(f).value).toBe('Fra');
      });
    });
  });

  describe('optionSelected', () => {
    it('emits the whole option the user chose', async () => {
      await type('ger');
      await choose('Germany');

      expect(host.selected()).toEqual({ value: 'de', label: 'Germany' });
    });

    it('does not emit for text the user merely types', async () => {
      await type('Germany');

      expect(host.selected()).toBeNull();
      expect(host.value()).toBe('Germany');
    });

    it('emits again for a second choice', async () => {
      await open();
      await choose('France');
      await open();
      await choose('Germany');

      expect(host.selected()).toEqual({ value: 'de', label: 'Germany' });
      expect(host.value()).toBe('de');
    });
  });

  describe('openedChange', () => {
    it('emits when the panel opens and when it closes', async () => {
      expect(host.opened()).toBe(false);

      await open();
      expect(host.opened()).toBe(true);

      host.ref().matAutocompleteTrigger().closePanel();
      await fixture.whenStable();
      expect(host.opened()).toBe(false);
    });
  });

  describe('the empty state', () => {
    it('renders nothing by default, which is Material’s own behaviour', async () => {
      await type('zzz');

      expect(panelOptions()).toEqual([]);
    });

    it('shows noResultsText in the panel when the filter matches nothing', async () => {
      host.noResultsText.set('No country matches.');
      await fixture.whenStable();
      await type('zzz');

      expect(optionLabels()).toEqual(['No country matches.']);
      expect(host.ref().matAutocompleteTrigger().panelOpen).toBe(true);
    });

    it('is not choosable, and stays out of the value', async () => {
      host.noResultsText.set('No country matches.');
      await fixture.whenStable();
      await type('zzz');

      const empty = panelOptions()[0];
      expect(empty.getAttribute('aria-disabled')).toBe('true');

      empty.click();
      await fixture.whenStable();

      expect(host.value()).toBe('zzz');
      expect(host.selected()).toBeNull();
    });

    it('gives way to the options as soon as something matches again', async () => {
      host.noResultsText.set('No country matches.');
      await fixture.whenStable();

      await type('zzz');
      expect(optionLabels()).toEqual(['No country matches.']);

      await type('fra');
      expect(optionLabels()).toEqual(['France']);
    });

    it('carries a hook a panelClass rule can reach', async () => {
      host.noResultsText.set('No country matches.');
      await fixture.whenStable();
      await type('zzz');

      expect(panelOptions()[0].classList).toContain('ui-autocomplete__empty');
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

    // Verifying Material's association rather than reimplementing it.
    it('is associated with the real input, the way Material does it', () => {
      expect(inputElement().id).not.toBe('');
      expect(query('label')!.getAttribute('for')).toBe(inputElement().id);
    });

    it('keeps the association when a consumer names the id', async () => {
      @Component({
        imports: [Autocomplete],
        template: `<ui-autocomplete label="Country" id="country" [options]="options" />`,
      })
      class IdHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(IdHost);
      await f.whenStable();

      expect(inputElement(f).id).toBe('country');
      expect(f.nativeElement.querySelector('label').getAttribute('for')).toBe('country');
    });

    // Two elements claiming one id is invalid HTML, and the id is the one the
    // label's `for` points at — so it has to be the input's alone.
    it('moves the id off the wrapper', async () => {
      @Component({
        imports: [Autocomplete],
        template: `<ui-autocomplete label="Country" id="country" [options]="options" />`,
      })
      class IdHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(IdHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('ui-autocomplete').hasAttribute('id')).toBe(false);
      expect(f.nativeElement.querySelectorAll('#country').length).toBe(1);
    });
  });

  describe('placeholder', () => {
    it('shows the placeholder while the field is empty', async () => {
      host.placeholder.set('Start typing a country…');
      await fixture.whenStable();

      expect(inputElement().placeholder).toBe('Start typing a country…');
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

    // The notched outline is Material's outlined treatment; `fill` has none. This is
    // what proves the appearance reaches the rendering, not just the instance.
    it('notches the outline only for outline', async () => {
      expect(query('.mdc-notched-outline')).not.toBeNull();

      host.appearance.set('fill');
      await fixture.whenStable();

      expect(query('.mdc-notched-outline')).toBeNull();
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

      expect(inputElement().getAttribute('aria-describedby')).toBe(query('mat-hint')!.id);
    });
  });

  describe('error', () => {
    const message = 'Pick a country from the list.';

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

    // Blank is the same instruction as unset, rather than a red field reporting an
    // empty message.
    it('ignores a blank message', async () => {
      host.error.set('   ');
      await fixture.whenStable();

      expect(host.ref().hasError()).toBe(false);
      expect(query('mat-error')).toBeNull();
      expect(host.ref().matInput().errorState).toBe(false);
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

      expect(inputElement().getAttribute('aria-describedby')).toBe(query('mat-error')!.id);
    });
  });

  // The requirement this component exists to meet: `[(ngModel)]` and reactive forms
  // with no adapter (rule 5).
  describe('ControlValueAccessor', () => {
    describe('with [(ngModel)]', () => {
      @Component({
        imports: [Autocomplete, FormsModule],
        template: `
          <ui-autocomplete
            label="Country"
            [options]="options"
            [(ngModel)]="country"
            #model="ngModel"
          />
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
      it('shows the model’s initial value as its label', () => {
        expect(inputElement(f).value).toBe('France');
      });

      // writeValue, after the fact
      it('shows a value written to the model later', async () => {
        modelHost.country.set('gb');
        await f.whenStable();

        expect(inputElement(f).value).toBe('United Kingdom');
      });

      // registerOnChange, for a chosen option
      it('writes the chosen option’s value back to the model', async () => {
        await type('ger', f);
        await choose('Germany', f);

        expect(modelHost.country()).toBe('de');
      });

      // registerOnChange, for text
      it('writes typed text back to the model', async () => {
        await type('Atlantis', f);

        expect(modelHost.country()).toBe('Atlantis');
      });

      // registerOnTouched
      it('marks the control touched on blur', async () => {
        expect(modelHost.model().touched).toBe(false);

        inputElement(f).dispatchEvent(new Event('blur'));
        await f.whenStable();

        expect(modelHost.model().touched).toBe(true);
      });

      it('marks the control dirty once the user types', async () => {
        expect(modelHost.model().dirty).toBe(false);

        await type('fra', f);

        expect(modelHost.model().dirty).toBe(true);
      });
    });

    describe('with a reactive FormControl', () => {
      @Component({
        imports: [Autocomplete, ReactiveFormsModule],
        template: `<ui-autocomplete label="Country" [options]="options" [formControl]="control" />`,
      })
      class ReactiveHost {
        readonly options = OPTIONS;
        readonly control = new FormControl<string | null>(null);
      }

      let f: ComponentFixture<ReactiveHost>;
      let reactiveHost: ReactiveHost;

      beforeEach(async () => {
        f = TestBed.createComponent(ReactiveHost);
        reactiveHost = f.componentInstance;
        await f.whenStable();
      });

      // writeValue
      it('shows a value set on the control', async () => {
        reactiveHost.control.setValue('de');
        await f.whenStable();

        expect(inputElement(f).value).toBe('Germany');
      });

      // registerOnChange
      it('reports the chosen option to the control', async () => {
        await type('fra', f);
        await choose('France', f);

        expect(reactiveHost.control.value).toBe('fr');
      });

      // writeValue, with a form's own empty value
      it('empties the field when the control is reset', async () => {
        reactiveHost.control.setValue('fr');
        await f.whenStable();

        reactiveHost.control.reset();
        await f.whenStable();

        expect(inputElement(f).value).toBe('');
        expect(reactiveHost.control.value).toBeNull();
      });

      // The text the user typed has to survive the form echoing it back — which is
      // what `onChange` → `setValue` → `writeValue` does on every keystroke. `fr` is
      // an option's value, so a `writeValue` that re-rendered it would turn what
      // someone is typing into `France` under their cursor.
      it('leaves the text alone when the form echoes a keystroke back', async () => {
        await type('fr', f);

        expect(inputElement(f).value).toBe('fr');
        expect(reactiveHost.control.value).toBe('fr');
      });

      // setDisabledState — a control disabled by the form has no `disabled`
      // attribute in the template to read.
      it('disables the control when the form disables it', async () => {
        reactiveHost.control.disable();
        await f.whenStable();

        expect(inputElement(f).disabled).toBe(true);
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

        expect(inputElement(f).disabled).toBe(false);
      });

      it('starts disabled for a control that starts disabled', async () => {
        @Component({
          imports: [Autocomplete, ReactiveFormsModule],
          template: `
            <ui-autocomplete label="Country" [options]="options" [formControl]="control" />
          `,
        })
        class DisabledHost {
          readonly options = OPTIONS;
          readonly control = new FormControl({ value: 'fr', disabled: true });
        }

        const df = TestBed.createComponent(DisabledHost);
        await df.whenStable();

        expect(inputElement(df).disabled).toBe(true);
        expect(inputElement(df).value).toBe('France');
      });
    });
  });

  describe('disabled', () => {
    it('is enabled by default', () => {
      expect(inputElement().disabled).toBe(false);
    });

    it('disables Material’s control', async () => {
      host.disabled.set(true);
      await fixture.whenStable();

      expect(inputElement().disabled).toBe(true);
      expect(query('mat-form-field')!.classList).toContain('mat-form-field-disabled');
    });

    it('does not open the panel when focused', async () => {
      host.disabled.set(true);
      await fixture.whenStable();
      await open();

      expect(host.ref().matAutocompleteTrigger().panelOpen).toBe(false);
      expect(panelOptions()).toEqual([]);
    });

    it('reads the bare attribute as true', async () => {
      @Component({
        imports: [Autocomplete],
        template: `<ui-autocomplete label="Country" disabled [options]="options" />`,
      })
      class AttrHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();

      expect(inputElement(f).disabled).toBe(true);
    });

    // The two routes are independent: a form enabling its control — which is a
    // `setDisabledState(false)` — must not silently un-set a `disabled` the template
    // wrote.
    it('stays disabled by the input when a form enables the control', async () => {
      host.disabled.set(true);
      await fixture.whenStable();

      host.ref().setDisabledState(false);
      await fixture.whenStable();

      expect(inputElement().disabled).toBe(true);
    });

    it('is disabled by either route on its own', async () => {
      host.ref().setDisabledState(true);
      await fixture.whenStable();
      expect(inputElement().disabled).toBe(true);

      host.ref().setDisabledState(false);
      await fixture.whenStable();
      expect(inputElement().disabled).toBe(false);

      host.disabled.set(true);
      await fixture.whenStable();
      expect(inputElement().disabled).toBe(true);
    });
  });

  describe('readonly', () => {
    // Unlike `disabled`, a readonly field stays focusable and in the tab order — but
    // there is nothing to suggest for a box nobody can type in.
    it('does not open the panel, but stays enabled', async () => {
      @Component({
        imports: [Autocomplete],
        template: `<ui-autocomplete label="Country" readonly [value]="'fr'" [options]="options" />`,
      })
      class ReadonlyHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(ReadonlyHost);
      await f.whenStable();
      await open(f);

      expect(inputElement(f).readOnly).toBe(true);
      expect(inputElement(f).disabled).toBe(false);
      expect(panelOptions()).toEqual([]);
    });
  });

  // Rule 5: two-way state is a model(), for the field that is not part of a form.
  describe('[(value)]', () => {
    it('starts empty', () => {
      expect(host.ref().value()).toBeNull();
      expect(inputElement().value).toBe('');
    });

    it('shows a value written by the consumer, as its label', async () => {
      host.value.set('de');
      await fixture.whenStable();

      expect(inputElement().value).toBe('Germany');
    });

    it('writes a chosen option’s value back through the binding', async () => {
      await open();
      await choose('France');

      expect(host.value()).toBe('fr');
      expect(host.ref().value()).toBe('fr');
    });

    it('writes typed text back through the binding', async () => {
      await type('Atlantis');

      expect(host.value()).toBe('Atlantis');
    });
  });

  describe('required', () => {
    it('is optional by default', () => {
      expect(inputElement().required).toBe(false);
      expect(query('.mat-mdc-form-field-required-marker')).toBeNull();
    });

    it('marks the control required for assistive technology and marks the label', async () => {
      host.required.set(true);
      await fixture.whenStable();

      expect(inputElement().required).toBe(true);
      expect(query('.mat-mdc-form-field-required-marker')).not.toBeNull();
    });

    it('hides Material’s asterisk when asked', async () => {
      @Component({
        imports: [Autocomplete],
        template: `
          <ui-autocomplete label="Country" required hideRequiredMarker [options]="options" />
        `,
      })
      class MarkerHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(MarkerHost);
      await f.whenStable();

      expect(inputElement(f).required).toBe(true);
      expect(f.nativeElement.querySelector('.mat-mdc-form-field-required-marker')).toBeNull();
    });
  });

  // Rule 3. A wrapper must not be where attributes go to die: the input is the real
  // element, so what a consumer writes has to reach it.
  describe('native attributes reach the real input', () => {
    @Component({
      imports: [Autocomplete],
      template: `
        <ui-autocomplete
          class="mine"
          label="Country"
          tabindex="3"
          maxlength="20"
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
    let input: HTMLInputElement;

    beforeEach(async () => {
      f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      wrapper = f.nativeElement.querySelector('ui-autocomplete');
      input = inputElement(f);
    });

    it('moves data-* onto the input', () => {
      expect(input.dataset['testid']).toBe('country-field');
      expect(wrapper.hasAttribute('data-testid')).toBe(false);
    });

    it('moves aria-label onto the input, which is the combobox', () => {
      expect(input.getAttribute('aria-label')).toBe('Country of issue');
      expect(wrapper.hasAttribute('aria-label')).toBe(false);
    });

    // A tabindex left on the wrapper would be a second tab stop on something that is
    // not a control.
    it('moves tabindex onto the input', () => {
      expect(input.getAttribute('tabindex')).toBe('3');
      expect(wrapper.hasAttribute('tabindex')).toBe(false);
    });

    it('moves a native constraint onto the input, where the browser reads it', () => {
      expect(input.maxLength).toBe(20);
    });

    // `class` is how a consumer targets the wrapper — the one thing that must not
    // move.
    it('leaves class on the wrapper', () => {
      expect(wrapper.classList).toContain('mine');
      expect(input.classList).not.toContain('mine');
    });

    // Rule 3 for the bound case: a binding that only worked on the first paint is a
    // bug that shows up later.
    it('moves an attribute bound after the first render', async () => {
      @Component({
        imports: [Autocomplete],
        template: `
          <ui-autocomplete label="Country" [attr.data-state]="state()" [options]="options" />
        `,
      })
      class BoundHost {
        readonly options = OPTIONS;
        readonly state = signal('clean');
      }

      const bf = TestBed.createComponent(BoundHost);
      await bf.whenStable();
      expect(inputElement(bf).dataset['state']).toBe('clean');

      bf.componentInstance.state.set('dirty');
      await bf.whenStable();
      // The move happens in a MutationObserver callback — a microtask after the
      // binding writes the attribute.
      await Promise.resolve();

      expect(inputElement(bf).dataset['state']).toBe('dirty');
      expect(bf.nativeElement.querySelector('ui-autocomplete').hasAttribute('data-state')).toBe(
        false,
      );
    });

    // Material merges these ids with the hint's and the error's, so it has to arrive
    // through its input rather than as an attribute it would overwrite.
    it('keeps a consumer’s aria-describedby alongside Material’s messages', async () => {
      @Component({
        imports: [Autocomplete],
        template: `
          <p id="policy">We only use this to work out your tax rate.</p>
          <ui-autocomplete
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
      const ids = inputElement(df).getAttribute('aria-describedby')!.split(' ');

      expect(ids).toContain('policy');
      expect(ids).toContain(df.nativeElement.querySelector('mat-hint').id);
      expect(
        df.nativeElement.querySelector('ui-autocomplete').hasAttribute('aria-describedby'),
      ).toBe(false);
    });

    it('gives the real input a name, for native submission', async () => {
      @Component({
        imports: [Autocomplete],
        template: `<ui-autocomplete label="Country" name="country" [options]="options" />`,
      })
      class NameHost {
        readonly options = OPTIONS;
      }

      const nf = TestBed.createComponent(NameHost);
      await nf.whenStable();

      expect(inputElement(nf).name).toBe('country');
    });
  });

  // Rule 7: a string input cannot spell an icon, an avatar, or a hint with a link.
  describe('slots', () => {
    it('projects a prefix into Material’s own leading slot', async () => {
      @Component({
        imports: [Autocomplete, AutocompletePrefix],
        template: `
          <ui-autocomplete label="Country" [options]="options">
            <span uiAutocompletePrefix id="lead">&#64;</span>
          </ui-autocomplete>
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
        imports: [Autocomplete, AutocompleteSuffix],
        template: `
          <ui-autocomplete label="Country" [options]="options">
            <span uiAutocompleteSuffix id="trail">!</span>
          </ui-autocomplete>
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
      expect(query('.ui-autocomplete__prefix')).toBeNull();
      expect(query('.ui-autocomplete__suffix')).toBeNull();
    });

    it('lets a projected hint replace the hint string', async () => {
      @Component({
        imports: [Autocomplete, AutocompleteHint],
        template: `
          <ui-autocomplete label="Country" hint="ignored" [options]="options">
            <span uiAutocompleteHint>See the <a href="/docs">docs</a>.</span>
          </ui-autocomplete>
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

    describe('uiAutocompleteOption', () => {
      @Component({
        imports: [Autocomplete, AutocompleteOptionDef],
        template: `
          <ui-autocomplete label="Country" [options]="options" [(value)]="value">
            <ng-template uiAutocompleteOption let-option let-text="text">
              <span class="code">{{ option.value }}</span>
              <span class="name">{{ option.label }}</span>
              <span class="query">{{ text }}</span>
            </ng-template>
          </ui-autocomplete>
        `,
      })
      class OptionHost {
        readonly options = OPTIONS;
        readonly value = signal<string | null>(null);
      }

      let f: ComponentFixture<OptionHost>;

      beforeEach(async () => {
        f = TestBed.createComponent(OptionHost);
        await f.whenStable();
        await open(f);
      });

      it('renders the template in place of the label', () => {
        expect(document.querySelectorAll('mat-option .code').length).toBe(4);
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

      // What the template needs to highlight the match.
      it('is handed the text the user has typed', async () => {
        await type('ger', f);

        expect(document.querySelector('mat-option .query')!.textContent).toBe('ger');
      });
    });

    describe('uiAutocompleteEmpty', () => {
      @Component({
        imports: [Autocomplete, AutocompleteEmptyDef],
        template: `
          <ui-autocomplete label="Country" noResultsText="ignored" [options]="options">
            <ng-template uiAutocompleteEmpty let-text>
              <span class="empty">Nothing matches “{{ text }}”. <a href="/add">Add it</a>.</span>
            </ng-template>
          </ui-autocomplete>
        `,
      })
      class EmptyHost {
        readonly options = OPTIONS;
      }

      let f: ComponentFixture<EmptyHost>;

      beforeEach(async () => {
        f = TestBed.createComponent(EmptyHost);
        await f.whenStable();
      });

      it('renders the template, naming the text that matched nothing', async () => {
        await type('zzz', f);

        expect(document.querySelector('.empty')!.textContent).toContain('Nothing matches “zzz”');
        expect(document.querySelector('.empty a')).not.toBeNull();
      });

      it('replaces the noResultsText string', async () => {
        await type('zzz', f);

        expect(document.querySelector('mat-option')!.textContent).not.toContain('ignored');
      });

      it('shows nothing while options match', async () => {
        await type('fra', f);

        expect(document.querySelector('.empty')).toBeNull();
        expect(optionLabels()).toEqual(['France']);
      });
    });
  });

  describe('escape hatches', () => {
    it('exposes the component via exportAs', () => {
      expect(host.ref()).toBeInstanceOf(Autocomplete);
    });

    // Rule 4: Material's own API is not swallowed — `openPanel()`, `focus()` and the
    // rest are one hop away rather than an API this component has to re-declare.
    it('exposes the Material instances and the real element', () => {
      expect(host.ref().matInput()).toBeInstanceOf(MatInput);
      expect(host.ref().matFormField()).toBeInstanceOf(MatFormField);
      expect(host.ref().matAutocomplete()).toBeInstanceOf(MatAutocomplete);
      expect(host.ref().matAutocompleteTrigger()).toBeInstanceOf(MatAutocompleteTrigger);
      expect(host.ref().inputElement().nativeElement).toBe(inputElement());
    });

    it('opens and closes the panel through the Material instance', async () => {
      host.ref().matAutocompleteTrigger().openPanel();
      await fixture.whenStable();
      expect(host.ref().matAutocompleteTrigger().panelOpen).toBe(true);

      host.ref().matAutocompleteTrigger().closePanel();
      await fixture.whenStable();
      expect(host.ref().matAutocompleteTrigger().panelOpen).toBe(false);
    });
  });

  // Rule 2: the panel renders in an overlay at the document root, so styling it must
  // not take a `::ng-deep`. Material's own `classList` is the answer.
  describe('panelClass', () => {
    it('puts a consumer’s class on Material’s own panel', async () => {
      @Component({
        imports: [Autocomplete],
        template: `<ui-autocomplete label="Country" panelClass="tall" [options]="options" />`,
      })
      class PanelHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(PanelHost);
      await f.whenStable();
      await open(f);

      expect(document.querySelector('.mat-mdc-autocomplete-panel')!.classList).toContain('tall');
    });
  });

  // Rule 2 again: sizing a field is the obvious thing to want, and `::ng-deep` must
  // not be the way to get it. The field fills the host, so the host is what is sized.
  describe('styling hooks', () => {
    // Reads the *declaration* rather than a painted width, on purpose: `ng test`
    // runs in jsdom, which does not substitute `var()` at all.
    it('resolves the field’s width from the hook', () => {
      expect(getComputedStyle(query('mat-form-field')!).getPropertyValue('width')).toContain(
        'var(--ui-autocomplete-width',
      );
    });
  });

  describe('a field with no form bound', () => {
    // `onTouched` is a no-op until a form registers one: a field with no forms
    // directive must not break on blur or on choosing.
    it('survives a blur, a type and a choice', async () => {
      inputElement().dispatchEvent(new Event('blur'));
      await type('fra');
      await choose('France');

      expect(host.value()).toBe('fr');
    });
  });
});
