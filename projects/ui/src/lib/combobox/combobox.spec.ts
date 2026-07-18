import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatOptionHarness } from '@angular/material/core/testing';
import { MatFormField } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatSelectHarness } from '@angular/material/select/testing';

import { Combobox, ComboboxHint, ComboboxOptionDef, type UiComboboxOption } from './combobox';

const OPTIONS: UiComboboxOption<string>[] = [
  { value: 'gb', label: 'United Kingdom' },
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany', disabled: true },
  { value: 'es', label: 'Spain' },
];

const GROUPED: UiComboboxOption<string>[] = [
  { value: 'br', label: 'Brazil' },
  { value: 'gb', label: 'United Kingdom', group: 'Europe' },
  { value: 'fr', label: 'France', group: 'Europe' },
  { value: 'jp', label: 'Japan', group: 'Asia' },
];

@Component({
  imports: [Combobox],
  template: `
    <ui-combobox
      #ref="uiCombobox"
      [label]="label()"
      [options]="options()"
      [multiple]="multiple()"
      [clearable]="clearable()"
      [disabled]="disabled()"
      [hint]="hint()"
      [error]="error()"
      [(value)]="value"
      (openedChange)="opened.set($event)"
    />
  `,
})
class TestHost {
  readonly label = signal<string | undefined>('Country');
  readonly options = signal<readonly UiComboboxOption<string>[]>(OPTIONS);
  readonly multiple = signal(false);
  readonly clearable = signal(false);
  readonly disabled = signal(false);
  readonly hint = signal<string | undefined>(undefined);
  readonly error = signal<string | undefined>(undefined);
  readonly value = signal<string | readonly string[] | null>(null);
  readonly opened = signal(false);
  readonly ref = viewChild.required<Combobox<string>>('ref');
}

describe('Combobox', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let loader: HarnessLoader;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  const selectElement = (): HTMLElement => query('mat-select') as HTMLElement;

  const select = (f: ComponentFixture<unknown> = fixture): Promise<MatSelectHarness> =>
    (f === fixture ? loader : TestbedHarnessEnvironment.loader(f)).getHarness(MatSelectHarness);

  const open = async (f: ComponentFixture<unknown> = fixture): Promise<void> => {
    await (await select(f)).open();
  };

  const openOptions = async (
    f: ComponentFixture<unknown> = fixture,
  ): Promise<MatOptionHarness[]> => {
    const harness = await select(f);
    await harness.open();
    return harness.getOptions();
  };

  const optionLabels = async (f: ComponentFixture<unknown> = fixture): Promise<string[]> =>
    Promise.all((await openOptions(f)).map((o) => o.getText()));

  const choose = async (
    label: string | RegExp,
    f: ComponentFixture<unknown> = fixture,
  ): Promise<void> => {
    await (await select(f)).clickOptions({ text: label });
  };

  /** The search `<input>` inside the open panel, at the document root. */
  const searchInput = (): HTMLInputElement =>
    document.querySelector('.ui-combobox__search-input') as HTMLInputElement;

  /** Types into the panel's search field the way a user would. */
  const typeSearch = async (text: string): Promise<void> => {
    const input = searchInput();
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  // The point of this library: the control is Material's, not a box painted to look
  // like one.
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
  });

  describe('options', () => {
    it('renders one Material option per option, in order', async () => {
      expect(await optionLabels()).toEqual(['United Kingdom', 'France', 'Germany', 'Spain']);
    });

    it('disables the option marked disabled, and only it', async () => {
      const [uk, , germany] = await openOptions();

      expect(await germany.isDisabled()).toBe(true);
      expect(await uk.isDisabled()).toBe(false);
    });

    it('holds the option’s value, not its label', async () => {
      await choose('France');

      expect(host.value()).toBe('fr');
    });
  });

  // The behaviour that separates a combobox from a plain select: a search field in the
  // panel that narrows the list.
  describe('search', () => {
    it('renders a search field at the top of the panel', async () => {
      await open();

      expect(searchInput()).not.toBeNull();
    });

    it('narrows the options to a case-insensitive match on the label', async () => {
      await open();
      await typeSearch('AN'); // matches Fr[an]ce and Germ[an]y

      expect(await optionLabels()).toEqual(['France', 'Germany']);
    });

    it('shows the empty state when nothing matches', async () => {
      await open();
      await typeSearch('zzz');

      expect(await openOptions()).toEqual([]);
      expect(document.querySelector('.ui-combobox__no-results')!.textContent!.trim()).toBe(
        'No results',
      );
    });

    it('keeps the full list available — the search is a filter, not the value', async () => {
      await open();
      await typeSearch('france');
      await choose('France');

      // The value is the option, and the search text never became it.
      expect(host.value()).toBe('fr');
      expect(host.ref().search()).toBe('');
    });

    it('forgets the search when the panel closes, so reopening shows everything', async () => {
      await open();
      await typeSearch('france');
      expect(await optionLabels()).toEqual(['France']);

      await (await select()).close();
      await open();

      expect(await optionLabels()).toEqual(['United Kingdom', 'France', 'Germany', 'Spain']);
    });

    it('replaces the default filter when one is given', async () => {
      @Component({
        imports: [Combobox],
        template: `
          <ui-combobox label="Country" [options]="options" [filterWith]="byCode" />
        `,
      })
      class FilterHost {
        readonly options = OPTIONS;
        // Searches the country code, which the label never shows — so 'de' finds
        // Germany, where the default "contains on label" would find nothing.
        readonly byCode = (o: UiComboboxOption<string>, text: string) =>
          o.value.toLowerCase().includes(text.toLowerCase());
      }

      const f = TestBed.createComponent(FilterHost);
      await f.whenStable();
      const harness = await select(f);
      await harness.open();
      const input = document.querySelector('.ui-combobox__search-input') as HTMLInputElement;
      input.value = 'de';
      input.dispatchEvent(new Event('input'));
      await f.whenStable();

      expect(await Promise.all((await harness.getOptions()).map((o) => o.getText()))).toEqual([
        'Germany',
      ]);
    });

    // The `UiComboboxFilter` contract: the text arrives *exactly as typed*, so a
    // whitespace-sensitive filter can see the spaces — and it is the same text the
    // option template's `search` context is handed, so a custom filter and a match
    // highlight can never disagree about what was searched.
    it('passes the filter the search text exactly as typed, untrimmed', async () => {
      const seen: string[] = [];

      @Component({
        imports: [Combobox],
        template: `<ui-combobox label="Country" [options]="options" [filterWith]="capture" />`,
      })
      class FilterHost {
        readonly options = OPTIONS;
        readonly capture = (o: UiComboboxOption<string>, text: string) => {
          seen.push(text);
          return o.label.toLowerCase().includes(text.trim().toLowerCase());
        };
      }

      const f = TestBed.createComponent(FilterHost);
      await f.whenStable();
      const harness = await select(f);
      await harness.open();
      const input = document.querySelector('.ui-combobox__search-input') as HTMLInputElement;
      input.value = '  an  ';
      input.dispatchEvent(new Event('input'));
      await f.whenStable();

      // The filter saw the untrimmed text, not `'  an  '.trim()`.
      expect(seen).toContain('  an  ');
      expect(seen).not.toContain('an');
      // And it still narrowed correctly, because this filter trims for itself.
      expect(await Promise.all((await harness.getOptions()).map((o) => o.getText()))).toEqual([
        'France',
        'Germany',
      ]);
    });
  });

  describe('groups', () => {
    beforeEach(async () => {
      host.options.set(GROUPED);
      await fixture.whenStable();
    });

    it('gathers options under Material’s optgroups, ungrouped ones first', async () => {
      await open();

      const groupLabels = Array.from(document.querySelectorAll('.mat-mdc-optgroup-label')).map(
        (el) => el.textContent!.trim(),
      );
      expect(groupLabels).toEqual(['Europe', 'Asia']);
      // The ungrouped option is rendered, above the groups.
      expect(await optionLabels()).toEqual(['Brazil', 'United Kingdom', 'France', 'Japan']);
    });

    it('drops a group whose options all fall out of the search', async () => {
      await open();
      await typeSearch('united');

      const groupLabels = Array.from(document.querySelectorAll('.mat-mdc-optgroup-label')).map(
        (el) => el.textContent!.trim(),
      );
      expect(groupLabels).toEqual(['Europe']);
      expect(await optionLabels()).toEqual(['United Kingdom']);
    });
  });

  // Rule 5: `[(ngModel)]` and reactive forms with no adapter.
  describe('ControlValueAccessor', () => {
    @Component({
      imports: [Combobox, FormsModule],
      template: `
        <ui-combobox label="Country" [options]="options" [(ngModel)]="country" #model="ngModel" />
      `,
    })
    class ModelHost {
      readonly options = OPTIONS;
      readonly country = signal<string | null>('fr');
      readonly model = viewChild.required<{ touched: boolean }>('model');
    }

    let f: ComponentFixture<ModelHost>;
    let modelHost: ModelHost;

    beforeEach(async () => {
      f = TestBed.createComponent(ModelHost);
      modelHost = f.componentInstance;
      await f.whenStable();
    });

    it('shows a value written to the model', async () => {
      expect(await (await select(f)).getValueText()).toBe('France');
    });

    it('writes what the user chooses back to the model, as the value', async () => {
      await choose('United Kingdom', f);

      expect(modelHost.country()).toBe('gb');
    });

    it('marks the control touched once the panel closes', async () => {
      expect(modelHost.model().touched).toBe(false);

      await open(f);
      await (await select(f)).close();

      expect(modelHost.model().touched).toBe(true);
    });

    it('disables the control when the form disables it', async () => {
      @Component({
        imports: [Combobox, ReactiveFormsModule],
        template: `<ui-combobox label="Country" [options]="options" [formControl]="control" />`,
      })
      class DisabledHost {
        readonly options = OPTIONS;
        readonly control = new FormControl({ value: 'fr', disabled: true });
      }

      const df = TestBed.createComponent(DisabledHost);
      await df.whenStable();

      expect(await (await select(df)).isDisabled()).toBe(true);
    });
  });

  describe('multiple', () => {
    @Component({
      imports: [Combobox],
      template: `
        <ui-combobox label="Countries" multiple [options]="options" [(value)]="value" />
      `,
    })
    class MultiHost {
      readonly options = OPTIONS;
      readonly value = signal<string | readonly string[] | null>(['gb', 'fr']);
      readonly ref = viewChild.required(Combobox);
    }

    let f: ComponentFixture<MultiHost>;
    let multiHost: MultiHost;

    beforeEach(async () => {
      f = TestBed.createComponent(MultiHost);
      multiHost = f.componentInstance;
      await f.whenStable();
    });

    it('holds an array of values', async () => {
      await choose('Spain', f);

      expect(multiHost.value()).toEqual(['gb', 'fr', 'es']);
    });

    it('shows the chosen options as chips in the closed field', () => {
      const chipLabels = Array.from(
        f.nativeElement.querySelectorAll('mat-chip .mat-mdc-chip-action-label'),
      ).map((label) => (label as HTMLElement).textContent!.trim());

      expect(chipLabels).toEqual(['United Kingdom', 'France']);
    });

    it('deselects the option behind a chip when its remove button is pressed', async () => {
      const remove = f.nativeElement.querySelector(
        'mat-chip .mat-mdc-chip-remove',
      ) as HTMLButtonElement;
      remove.click();
      await f.whenStable();

      expect(multiHost.value()).toEqual(['fr']);
    });
  });

  describe('clearable', () => {
    it('shows no clear button while there is nothing to clear', async () => {
      host.clearable.set(true);
      await fixture.whenStable();

      expect(query('.ui-combobox__clear')).toBeNull();
    });

    it('clears the whole selection when pressed', async () => {
      host.clearable.set(true);
      host.value.set('fr');
      await fixture.whenStable();

      const clear = query('.ui-combobox__clear') as HTMLButtonElement;
      expect(clear).not.toBeNull();
      clear.click();
      await fixture.whenStable();

      expect(host.value()).toBeNull();
    });

    it('does not open the panel when clearing', async () => {
      host.clearable.set(true);
      host.value.set('fr');
      await fixture.whenStable();

      (query('.ui-combobox__clear') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(await (await select()).isOpen()).toBe(false);
    });
  });

  describe('error', () => {
    const message = 'Choose a country.';

    it('shows the message and puts the field into its error state when set', async () => {
      host.error.set(message);
      await fixture.whenStable();

      expect(query('mat-error')!.textContent!.trim()).toBe(message);
      expect(host.ref().matSelect().errorState).toBe(true);
      expect(selectElement().getAttribute('aria-invalid')).toBe('true');
    });

    it('ignores a blank message', async () => {
      host.error.set('   ');
      await fixture.whenStable();

      expect(host.ref().hasError()).toBe(false);
      expect(query('mat-error')).toBeNull();
    });
  });

  describe('disabled', () => {
    it('disables Material’s control and does not open', async () => {
      host.disabled.set(true);
      await fixture.whenStable();
      await open();

      expect(host.ref().matSelect().disabled).toBe(true);
      expect(await (await select()).isOpen()).toBe(false);
    });
  });

  describe('openedChange', () => {
    it('emits when the panel opens and when it closes', async () => {
      expect(host.opened()).toBe(false);

      await open();
      expect(host.opened()).toBe(true);

      await (await select()).close();
      expect(host.opened()).toBe(false);
    });
  });

  // Rule 3: a wrapper must not be where attributes go to die.
  describe('native attributes reach the real control', () => {
    it('moves data-* onto the control', async () => {
      @Component({
        imports: [Combobox],
        template: `
          <ui-combobox label="Country" data-testid="country" [options]="options" />
        `,
      })
      class AttrHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();

      expect((f.nativeElement.querySelector('mat-select') as HTMLElement).dataset['testid']).toBe(
        'country',
      );
      expect(f.nativeElement.querySelector('ui-combobox').hasAttribute('data-testid')).toBe(false);
    });
  });

  // Rule 7: content projection for a hint a string cannot spell, and custom option
  // rendering.
  describe('slots', () => {
    it('lets a projected hint replace the hint string', async () => {
      @Component({
        imports: [Combobox, ComboboxHint],
        template: `
          <ui-combobox label="Region" hint="ignored" [options]="options">
            <span uiComboboxHint>See the <a href="/docs">docs</a>.</span>
          </ui-combobox>
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

    it('renders a projected option template in place of the label', async () => {
      @Component({
        imports: [Combobox, ComboboxOptionDef],
        template: `
          <ui-combobox label="Country" [options]="options">
            <ng-template uiComboboxOption let-option>
              <span class="name">{{ option.label }}</span>
            </ng-template>
          </ui-combobox>
        `,
      })
      class OptionHost {
        readonly options = OPTIONS;
      }

      const f = TestBed.createComponent(OptionHost);
      await f.whenStable();
      await open(f);

      expect(document.querySelectorAll('mat-option .name').length).toBe(4);
    });
  });

  describe('escape hatches', () => {
    it('exposes the component via exportAs and the Material instances', () => {
      expect(host.ref()).toBeInstanceOf(Combobox);
      expect(host.ref().matSelect()).toBeInstanceOf(MatSelect);
      expect(host.ref().selectElement().nativeElement).toBe(selectElement());
    });
  });
});
