import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';

import {
  ButtonToggle,
  ButtonToggleOptionDef,
  type UiButtonToggleAppearance,
  type UiButtonToggleOption,
  type UiButtonToggleValue,
} from './button-toggle';

const VIEWS: UiButtonToggleOption<string>[] = [
  { value: 'list', label: 'List', icon: 'view_list' },
  { value: 'grid', label: 'Grid', icon: 'grid_view' },
  { value: 'map', label: 'Map', icon: 'map', disabled: true },
];

const APPEARANCES: readonly UiButtonToggleAppearance[] = ['standard', 'legacy'];

@Component({
  imports: [ButtonToggle],
  template: `
    <ui-button-toggle
      #ref="uiButtonToggle"
      [label]="label()"
      [options]="options()"
      [appearance]="appearance()"
      [disabled]="disabled()"
      [iconOnly]="iconOnly()"
      [(value)]="value"
      (changed)="changes.push($event)"
    />
  `,
})
class TestHost {
  readonly label = signal<string | undefined>('View');
  readonly options = signal<readonly UiButtonToggleOption<string>[]>(VIEWS);
  readonly appearance = signal<UiButtonToggleAppearance>('standard');
  readonly disabled = signal(false);
  readonly iconOnly = signal(false);
  readonly value = signal<UiButtonToggleValue<string>>(null);
  readonly changes: UiButtonToggleValue<string>[] = [];
  readonly ref = viewChild.required<ButtonToggle<string>>('ref');
}

/**
 * A `multiple` group, written the only way one can be: in the template.
 *
 * Material sizes the group's selection model as it initialises, so a `multiple` set
 * after that is a group whose mode and selection disagree — which is what
 * `ButtonToggle.multiple`'s docs say, and why this is a second host rather than a
 * signal on the first.
 */
@Component({
  imports: [ButtonToggle],
  template: `
    <ui-button-toggle
      #ref="uiButtonToggle"
      label="View"
      multiple
      [options]="options"
      [(value)]="value"
      (changed)="changes.push($event)"
    />
  `,
})
class MultipleHost {
  readonly options = VIEWS;
  readonly value = signal<UiButtonToggleValue<string>>([]);
  readonly changes: UiButtonToggleValue<string>[] = [];
  readonly ref = viewChild.required<ButtonToggle<string>>('ref');
}

describe('ButtonToggle', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  /** The element carrying the role — Material's own group. */
  const group = (f: ComponentFixture<unknown> = fixture): HTMLElement =>
    f.nativeElement.querySelector('mat-button-toggle-group');

  /** The real controls — the `<button>`s Material renders inside each toggle. */
  const buttons = (f: ComponentFixture<unknown> = fixture): HTMLButtonElement[] =>
    Array.from(f.nativeElement.querySelectorAll('.mat-button-toggle-button'));

  /** Chooses an option the way a user does: a click on the real button. */
  const click = async (index: number, f: ComponentFixture<unknown> = fixture): Promise<void> => {
    buttons(f)[index].click();
    await f.whenStable();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  // The point of this library: the control is Material's, not a row of buttons painted
  // to look like one. If these fail, everything below is testing a lookalike.
  describe('composition', () => {
    it('renders Material’s group and toggles', () => {
      expect(query('mat-button-toggle-group')).not.toBeNull();
      expect(host.ref().matButtonToggleGroup()).toBeInstanceOf(MatButtonToggleGroup);
      expect(host.ref().matButtonToggles().length).toBe(VIEWS.length);
      expect(host.ref().matButtonToggles()[0]).toBeInstanceOf(MatButtonToggle);
    });

    it('renders one toggle per option, in order', () => {
      expect(buttons().length).toBe(VIEWS.length);
      expect(
        Array.from(fixture.nativeElement.querySelectorAll('.ui-button-toggle__text')).map((text) =>
          (text as HTMLElement).textContent!.trim(),
        ),
      ).toEqual(['List', 'Grid', 'Map']);
    });

    it('renders each option’s icon as this library’s own themed icon', () => {
      // The name is on `fontIcon`, not in the text: `ui-icon` renders it as a
      // ligature, which is what keeps the glyph out of the toggle's accessible name.
      const icons = Array.from(
        fixture.nativeElement.querySelectorAll('ui-icon mat-icon'),
      ) as HTMLElement[];

      expect(icons.map((icon) => icon.getAttribute('fontIcon'))).toEqual([
        'view_list',
        'grid_view',
        'map',
      ]);
      expect(icons.every((icon) => icon.getAttribute('aria-hidden') === 'true')).toBe(true);
    });

    it('re-renders when the options change', async () => {
      host.options.set([{ value: 'table', label: 'Table' }]);
      await fixture.whenStable();

      expect(buttons().length).toBe(1);
      expect(query('.ui-button-toggle__text')!.textContent!.trim()).toBe('Table');
    });

    it('takes the name a consumer gives a single-select group', async () => {
      @Component({
        imports: [ButtonToggle],
        template: `<ui-button-toggle label="View" name="view" [options]="options" />`,
      })
      class NamedHost {
        readonly options = VIEWS;
      }

      const f = TestBed.createComponent(NamedHost);
      await f.whenStable();

      expect(buttons(f).every((button) => button.getAttribute('name') === 'view')).toBe(true);
    });

    // Two unnamed groups on one page must not share a name: a single-select group's
    // buttons are grouped by it natively.
    it('gives two unnamed groups distinct, non-empty names', async () => {
      @Component({
        imports: [ButtonToggle],
        template: `
          <ui-button-toggle label="First" [options]="options" />
          <ui-button-toggle label="Second" [options]="options" />
        `,
      })
      class TwoHost {
        readonly options = VIEWS;
      }

      const f = TestBed.createComponent(TwoHost);
      await f.whenStable();

      const names = (
        Array.from(f.nativeElement.querySelectorAll('mat-button-toggle-group')) as HTMLElement[]
      ).map((element) => element.querySelector('.mat-button-toggle-button')!.getAttribute('name'));

      expect(names[0]).toBeTruthy();
      expect(names[0]).not.toBe(names[1]);
    });
  });

  describe('accessibility', () => {
    it('names the group with the label', () => {
      const labelId = group().getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();

      const label = query(`#${labelId}`);
      expect(label).not.toBeNull();
      expect(label!.textContent!.trim()).toBe('View');
    });

    it('drops the association when there is no label to point at', async () => {
      host.label.set(undefined);
      await fixture.whenStable();

      expect(query('.ui-button-toggle__label')).toBeNull();
      expect(group().hasAttribute('aria-labelledby')).toBe(false);
    });

    it('gives two groups on one page distinct label ids', async () => {
      @Component({
        imports: [ButtonToggle],
        template: `
          <ui-button-toggle label="First" [options]="options" />
          <ui-button-toggle label="Second" [options]="options" />
        `,
      })
      class TwoHost {
        readonly options = VIEWS;
      }

      const f = TestBed.createComponent(TwoHost);
      await f.whenStable();

      const [first, second] = Array.from(
        f.nativeElement.querySelectorAll('mat-button-toggle-group'),
      ) as HTMLElement[];

      expect(first.getAttribute('aria-labelledby')).toBeTruthy();
      expect(first.getAttribute('aria-labelledby')).not.toBe(
        second.getAttribute('aria-labelledby'),
      );
    });

    it('names the group by aria-label when there is no visible label', async () => {
      @Component({
        imports: [ButtonToggle],
        template: `<ui-button-toggle aria-label="Result view" [options]="options" />`,
      })
      class AriaLabelHost {
        readonly options = VIEWS;
      }

      const f = TestBed.createComponent(AriaLabelHost);
      await f.whenStable();

      expect(group(f).getAttribute('aria-label')).toBe('Result view');
      expect(group(f).hasAttribute('aria-labelledby')).toBe(false);
    });

    // A consumer pointing at a heading already on the page is being more specific than
    // the label this component rendered, so they win.
    it('lets an explicit aria-labelledby beat the rendered label', async () => {
      @Component({
        imports: [ButtonToggle],
        template: `
          <h2 id="view-heading">View</h2>
          <ui-button-toggle label="Ignored" aria-labelledby="view-heading" [options]="options" />
        `,
      })
      class LabelledbyHost {
        readonly options = VIEWS;
      }

      const f = TestBed.createComponent(LabelledbyHost);
      await f.whenStable();

      expect(group(f).getAttribute('aria-labelledby')).toBe('view-heading');
    });

    // Material's own roles, and the reason `multiple` is not merely a value shape: the
    // two modes are different widgets to assistive tech.
    it('is a radiogroup of radios when single-select', () => {
      expect(group().getAttribute('role')).toBe('radiogroup');
      expect(buttons().every((button) => button.getAttribute('role') === 'radio')).toBe(true);
    });

    it('is a group of pressable buttons when multiple', async () => {
      const f = TestBed.createComponent(MultipleHost);
      await f.whenStable();

      expect(group(f).getAttribute('role')).toBe('group');
      expect(buttons(f).every((button) => button.getAttribute('role') === 'button')).toBe(true);
      expect(buttons(f)[0].getAttribute('aria-pressed')).toBe('false');
    });

    it('marks the chosen toggle for assistive tech', async () => {
      await click(0);

      expect(buttons()[0].getAttribute('aria-checked')).toBe('true');
      expect(buttons()[1].getAttribute('aria-checked')).toBe('false');
    });
  });

  // The whole point of `iconOnly`: a glyph is not a name, so the label has to become
  // one — Material marks the icon `aria-hidden`, so nothing else would.
  describe('iconOnly', () => {
    it('shows the label as text by default, and lets it name the toggle', () => {
      expect(query('.ui-button-toggle__text')).not.toBeNull();
      expect(buttons()[0].getAttribute('aria-label')).toBe('');
      expect(buttons()[0].textContent).toContain('List');
    });

    it('drops the text and names each toggle by its label instead', async () => {
      host.iconOnly.set(true);
      await fixture.whenStable();

      expect(query('.ui-button-toggle__text')).toBeNull();
      expect(buttons().map((button) => button.getAttribute('aria-label'))).toEqual([
        'List',
        'Grid',
        'Map',
      ]);
      expect(fixture.nativeElement.querySelectorAll('ui-icon').length).toBe(VIEWS.length);
    });

    // A group is never a row of blank buttons: an option with nothing to draw keeps its
    // words.
    it('keeps the text of an option that has no icon', async () => {
      host.options.set([
        { value: 'list', label: 'List', icon: 'view_list' },
        { value: 'all', label: 'All' },
      ]);
      host.iconOnly.set(true);
      await fixture.whenStable();

      const texts = Array.from(fixture.nativeElement.querySelectorAll('.ui-button-toggle__text'));

      expect(texts.length).toBe(1);
      expect((texts[0] as HTMLElement).textContent!.trim()).toBe('All');
    });
  });

  describe('options', () => {
    it('checks the toggle matching a preselected value', async () => {
      host.value.set('grid');
      await fixture.whenStable();

      expect(buttons().map((button) => button.getAttribute('aria-checked'))).toEqual([
        'false',
        'true',
        'false',
      ]);
      expect(host.ref().selectedOptions()).toEqual([VIEWS[1]]);
    });

    it('disables one option without disabling the rest', () => {
      expect(buttons().map((button) => button.disabled)).toEqual([false, false, true]);
    });

    it('ignores a click on a disabled option', async () => {
      await click(2);

      expect(host.value()).toBeNull();
      expect(host.changes).toEqual([]);
    });

    it('reports no selected option for a value no option holds', async () => {
      host.value.set('timeline');
      await fixture.whenStable();

      expect(host.ref().selectedOptions()).toEqual([]);
      expect(buttons().some((button) => button.getAttribute('aria-checked') === 'true')).toBe(
        false,
      );
    });
  });

  describe('single select', () => {
    it('writes a user’s choice back through the two-way binding', async () => {
      await click(1);

      expect(host.value()).toBe('grid');
      expect(host.ref().selectedValues()).toEqual(['grid']);
    });

    it('clears the previous choice when another is made', async () => {
      await click(0);
      await click(1);

      expect(host.value()).toBe('grid');
      expect(buttons().map((button) => button.getAttribute('aria-checked'))).toEqual([
        'false',
        'true',
        'false',
      ]);
    });

    it('emits changed for a user’s choice only', async () => {
      await click(0);

      expect(host.changes).toEqual(['list']);

      // A value set from code is not a choice anyone made — `changed` is Material's own
      // `change` forwarded, which is the distinction the output exists for.
      host.value.set('grid');
      await fixture.whenStable();

      expect(host.changes).toEqual(['list']);
    });

    // Material's group quietly selects nothing for an array in single-select mode.
    // A control whose mode changed with the screen is a real shape, not a mistake.
    it('takes the first value of an array written to it', async () => {
      host.value.set(['grid']);
      await fixture.whenStable();

      expect(buttons()[1].getAttribute('aria-checked')).toBe('true');
      expect(host.ref().selectedOptions()).toEqual([VIEWS[1]]);
    });
  });

  describe('multiple', () => {
    let f: ComponentFixture<MultipleHost>;
    let multipleHost: MultipleHost;

    beforeEach(async () => {
      f = TestBed.createComponent(MultipleHost);
      multipleHost = f.componentInstance;
      await f.whenStable();
    });

    it('keeps every chosen value, as an array', async () => {
      await click(0, f);
      await click(1, f);

      expect(multipleHost.value()).toEqual(['list', 'grid']);
      expect(multipleHost.ref().selectedOptions()).toEqual([VIEWS[0], VIEWS[1]]);
      expect(buttons(f).map((button) => button.getAttribute('aria-pressed'))).toEqual([
        'true',
        'true',
        'false',
      ]);
    });

    it('deselects a chosen toggle when it is clicked again', async () => {
      await click(0, f);
      await click(0, f);

      expect(multipleHost.value()).toEqual([]);
      expect(buttons(f)[0].getAttribute('aria-pressed')).toBe('false');
    });

    it('emits the whole selection on changed, not just the toggle that moved', async () => {
      await click(0, f);
      await click(1, f);

      expect(multipleHost.changes).toEqual([['list'], ['list', 'grid']]);
    });

    // Material throws "Value must be an array in multiple-selection mode" on this — a
    // control patched before `multiple` was known is a real shape, not a mistake.
    it('reads a single value written to it as an array of one', async () => {
      multipleHost.value.set('grid');
      await f.whenStable();

      expect(buttons(f)[1].getAttribute('aria-pressed')).toBe('true');
      expect(multipleHost.ref().selectedValues()).toEqual(['grid']);
    });
  });

  describe('appearance', () => {
    // The class is Material's own switch between the two appearances — checking it
    // rather than the instance is what proves the input reaches the rendering.
    for (const appearance of APPEARANCES) {
      it(`renders the ${appearance} appearance with Material’s own class`, async () => {
        host.appearance.set(appearance);
        await fixture.whenStable();

        expect(host.ref().matButtonToggleGroup().appearance).toBe(appearance);
        expect(group().classList.contains('mat-button-toggle-group-appearance-standard')).toBe(
          appearance === 'standard',
        );
      });
    }

    it('defaults to standard', () => {
      expect(host.ref().appearance()).toBe('standard');
      expect(group().classList).toContain('mat-button-toggle-group-appearance-standard');
    });
  });

  describe('disabled', () => {
    it('disables every toggle', async () => {
      host.disabled.set(true);
      await fixture.whenStable();

      expect(buttons().every((button) => button.disabled)).toBe(true);
      expect(group().getAttribute('aria-disabled')).toBe('true');
    });

    it('ignores a click while disabled', async () => {
      host.disabled.set(true);
      await fixture.whenStable();
      await click(0);

      expect(host.value()).toBeNull();
      expect(host.changes).toEqual([]);
    });

    it('keeps disabled toggles interactive when asked, with aria-disabled', async () => {
      @Component({
        imports: [ButtonToggle],
        template: `<ui-button-toggle
          label="View"
          [options]="options"
          disabled
          disabledInteractive
        />`,
      })
      class InteractiveHost {
        readonly options = VIEWS;
      }

      const f = TestBed.createComponent(InteractiveHost);
      await f.whenStable();

      expect(buttons(f).some((button) => button.disabled)).toBe(false);
      expect(buttons(f).every((button) => button.getAttribute('aria-disabled') === 'true')).toBe(
        true,
      );
    });
  });

  // Rule 5: a form control that needs no adapter. These bind the host, which is the
  // whole claim — a consumer never reaches for the group inside it.
  describe('forms', () => {
    @Component({
      imports: [ButtonToggle, FormsModule],
      template: `<ui-button-toggle label="View" [options]="options" [(ngModel)]="value" />`,
    })
    class NgModelHost {
      readonly options = VIEWS;
      readonly value = signal<string | null>(null);
    }

    @Component({
      imports: [ButtonToggle, ReactiveFormsModule],
      template: `<ui-button-toggle label="View" [options]="options" [formControl]="control" />`,
    })
    class ReactiveHost {
      readonly options = VIEWS;
      readonly control = new FormControl<string | null>(null);
    }

    it('writes a user’s choice into an ngModel', async () => {
      const f = TestBed.createComponent(NgModelHost);
      await f.whenStable();
      await click(1, f);

      expect(f.componentInstance.value()).toBe('grid');
    });

    it('renders the value an ngModel already holds', async () => {
      const f = TestBed.createComponent(NgModelHost);
      f.componentInstance.value.set('list');
      await f.whenStable();

      expect(buttons(f)[0].getAttribute('aria-checked')).toBe('true');
    });

    it('writes a user’s choice into a reactive control', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();
      await click(0, f);

      expect(f.componentInstance.control.value).toBe('list');
    });

    it('renders a form’s value, and clears on reset', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();

      f.componentInstance.control.setValue('grid');
      await f.whenStable();

      expect(buttons(f)[1].getAttribute('aria-checked')).toBe('true');

      // `reset()` writes `null` — the empty value a group with nothing chosen has.
      f.componentInstance.control.reset();
      await f.whenStable();

      expect(buttons(f).some((button) => button.getAttribute('aria-checked') === 'true')).toBe(
        false,
      );
    });

    it('writes an array into a multiple group’s control', async () => {
      @Component({
        imports: [ButtonToggle, ReactiveFormsModule],
        template: `<ui-button-toggle
          label="View"
          multiple
          [options]="options"
          [formControl]="control"
        />`,
      })
      class MultipleHost {
        readonly options = VIEWS;
        readonly control = new FormControl<string[]>([]);
      }

      const f = TestBed.createComponent(MultipleHost);
      await f.whenStable();
      await click(0, f);
      await click(1, f);

      expect(f.componentInstance.control.value).toEqual(['list', 'grid']);
    });

    it('follows a reactive form’s own disable()', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();

      f.componentInstance.control.disable();
      await f.whenStable();

      expect(buttons(f).every((button) => button.disabled)).toBe(true);

      // Re-enabling gives every toggle back except the one the *option* disables, which
      // the form never owned.
      f.componentInstance.control.enable();
      await f.whenStable();

      expect(buttons(f).map((button) => button.disabled)).toEqual([false, false, true]);
    });

    it('reports touched once the user has been in and out', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();

      expect(f.componentInstance.control.touched).toBe(false);

      buttons(f)[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      await f.whenStable();

      expect(f.componentInstance.control.touched).toBe(true);
    });
  });

  // Rule 7: a toggle a string cannot spell needs a template, not another input.
  describe('uiButtonToggleOption', () => {
    @Component({
      imports: [ButtonToggle, ButtonToggleOptionDef],
      template: `
        <ui-button-toggle label="View" iconOnly [options]="options" [(value)]="value">
          <ng-template uiButtonToggleOption let-option let-selected="selected">
            <strong>{{ option.label }}</strong>
            <em>{{ selected ? 'on' : 'off' }}</em>
          </ng-template>
        </ui-button-toggle>
      `,
    })
    class TemplateHost {
      readonly options = VIEWS;
      readonly value = signal<UiButtonToggleValue<string>>('list');
    }

    it('renders the template in place of the icon and label', async () => {
      const f = TestBed.createComponent(TemplateHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('strong').textContent).toBe('List');
      expect(f.nativeElement.querySelector('ui-icon')).toBeNull();
      expect(f.nativeElement.querySelector('.ui-button-toggle__text')).toBeNull();
    });

    it('tells the template which option is chosen', async () => {
      const f = TestBed.createComponent(TemplateHost);
      await f.whenStable();

      expect(
        Array.from(f.nativeElement.querySelectorAll('em')).map(
          (em) => (em as HTMLElement).textContent,
        ),
      ).toEqual(['on', 'off', 'off']);
    });

    // The template renders inside Material's own button, so a click on it is a click on
    // the toggle.
    it('chooses the option when the projected content is clicked', async () => {
      const f = TestBed.createComponent(TemplateHost);
      await f.whenStable();

      (f.nativeElement.querySelectorAll('strong')[1] as HTMLElement).click();
      await f.whenStable();

      expect(f.componentInstance.value()).toBe('grid');
    });

    // A name that says less than the content shows is the `label-in-name` failure — so
    // a template's toggle is named by what it renders, `iconOnly` or not.
    it('leaves the toggle named by its own content, even under iconOnly', async () => {
      const f = TestBed.createComponent(TemplateHost);
      await f.whenStable();

      expect(buttons(f).every((button) => button.getAttribute('aria-label') === '')).toBe(true);
    });
  });

  // Rule 3: nothing this component does not name may be swallowed by the wrapper.
  describe('native attributes', () => {
    @Component({
      imports: [ButtonToggle],
      template: `<ui-button-toggle
        label="View"
        [options]="options"
        [attr.data-state]="state()"
        data-testid="view"
        aria-describedby="view-help"
      />`,
    })
    class AttributeHost {
      readonly options = VIEWS;
      readonly state = signal('idle');
    }

    it('moves unclaimed attributes onto the real group', async () => {
      const f = TestBed.createComponent(AttributeHost);
      await f.whenStable();

      const wrapper = f.nativeElement.querySelector('ui-button-toggle');

      expect(group(f).getAttribute('data-testid')).toBe('view');
      expect(group(f).getAttribute('aria-describedby')).toBe('view-help');

      // *Moved*, not copied: two elements carrying one `data-testid` is an ambiguous
      // query.
      expect(wrapper.hasAttribute('data-testid')).toBe(false);
      expect(wrapper.hasAttribute('aria-describedby')).toBe(false);
    });

    it('keeps forwarding a bound attribute after the first paint', async () => {
      const f = TestBed.createComponent(AttributeHost);
      await f.whenStable();

      f.componentInstance.state.set('saving');
      await f.whenStable();
      // The MutationObserver that forwards a re-landed attribute delivers its records
      // as a microtask, which `whenStable` above does not await.
      await Promise.resolve();

      expect(group(f).getAttribute('data-state')).toBe('saving');
      expect(f.nativeElement.querySelector('ui-button-toggle').hasAttribute('data-state')).toBe(
        false,
      );
    });

    it('leaves the wrapper’s own attributes alone', async () => {
      const f = TestBed.createComponent(AttributeHost);
      await f.whenStable();

      // `label` is this component's input — moving it would break the thing it is for,
      // and it is a selector a consumer may reasonably write.
      expect(f.nativeElement.querySelector('ui-button-toggle').getAttribute('label')).toBe('View');
    });
  });

  // Rule 4: Material's own API is not swallowed.
  describe('escape hatches', () => {
    it('hands back the Material instances', () => {
      expect(host.ref().matButtonToggleGroup()).toBeInstanceOf(MatButtonToggleGroup);
      expect(host.ref().groupElement().nativeElement.tagName.toLowerCase()).toBe(
        'mat-button-toggle-group',
      );
    });

    it('lets a consumer drive a toggle through Material’s own API', async () => {
      host.ref().matButtonToggles()[1].focus();
      await fixture.whenStable();

      expect(document.activeElement).toBe(buttons()[1]);
    });
  });
});
