import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSlideToggle } from '@angular/material/slide-toggle';

import { Toggle, type UiToggleLabelPosition } from './toggle';

const LABEL_POSITIONS: readonly UiToggleLabelPosition[] = ['after', 'before'];

@Component({
  imports: [Toggle],
  template: `
    <ui-toggle
      #ref="uiToggle"
      [label]="label()"
      [disabled]="disabled()"
      [labelPosition]="labelPosition()"
      [required]="required()"
      [(checked)]="checked"
      (changed)="changes.push($event)"
      (toggled)="toggles = toggles + 1"
    />
  `,
})
class TestHost {
  readonly label = signal<string | undefined>('Dark mode');
  readonly disabled = signal(false);
  readonly labelPosition = signal<UiToggleLabelPosition>('after');
  readonly required = signal(false);
  readonly checked = signal(false);
  readonly changes: boolean[] = [];
  toggles = 0;
  readonly ref = viewChild.required<Toggle>('ref');
}

describe('Toggle', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  /** The real control — the `<button role="switch">` Material renders. */
  const button = (f: ComponentFixture<unknown> = fixture): HTMLButtonElement =>
    f.nativeElement.querySelector('button[role="switch"]');

  /** Material's own `<label for>`, which the label content is projected into. */
  const label = (f: ComponentFixture<unknown> = fixture): HTMLLabelElement =>
    f.nativeElement.querySelector('label');

  /** Flips the switch the way a user does: a click on the real button. */
  const click = async (f: ComponentFixture<unknown> = fixture): Promise<void> => {
    button(f).click();
    await f.whenStable();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  // The point of this library: the control is Material's, not a track and a
  // handle painted to look like one. If these fail, everything below is testing
  // a lookalike.
  describe('composition', () => {
    it('renders Material’s slide toggle', () => {
      expect(query('mat-slide-toggle')).not.toBeNull();
      expect(host.ref().matSlideToggle()).toBeInstanceOf(MatSlideToggle);
    });

    it('renders exactly one control, and it is a switch', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');

      expect(buttons.length).toBe(1);
      expect(buttons[0].getAttribute('role')).toBe('switch');
    });

    // A switch is a `<button>`, not a checkbox — the state is Angular's to read,
    // not a native submission's.
    it('renders no native input', () => {
      expect(fixture.nativeElement.querySelector('input')).toBeNull();
    });
  });

  describe('label', () => {
    it('renders the label inside Material’s own label element', () => {
      expect(label().textContent!.trim()).toBe('Dark mode');
    });

    // Verifying Material's association rather than reimplementing it: `for`
    // pointing at the button's id is what makes clicking the text flip the
    // switch and a screen reader read the two as one control.
    it('is named by the label, the way Material names a switch', () => {
      expect(button().id).not.toBe('');
      expect(label().getAttribute('for')).toBe(button().id);
      expect(button().getAttribute('aria-labelledby')).toBe(label().id);
    });

    it('flips the switch when the label is clicked', async () => {
      label().click();
      await fixture.whenStable();

      expect(host.checked()).toBe(true);
    });

    it('renders nothing in the label when none is given', async () => {
      host.label.set(undefined);
      await fixture.whenStable();

      expect(label().textContent!.trim()).toBe('');
    });

    it('renders projected content in place of the label string', async () => {
      @Component({
        imports: [Toggle],
        template: `<ui-toggle label="ignored"
          >Sync over cellular <span class="hint">Uses your data</span></ui-toggle
        >`,
      })
      class ContentHost {}

      const f = TestBed.createComponent(ContentHost);
      await f.whenStable();

      expect(label(f).textContent!.trim()).toBe('Sync over cellular Uses your data');
      // Inside Material's own `<label for>`, so clicking the hint's row still
      // reaches the switch — the whole reason the content is projected there.
      expect(label(f).querySelector('.hint')).not.toBeNull();
    });
  });

  describe('checked', () => {
    it('reflects the model into the real switch', async () => {
      expect(button().getAttribute('aria-checked')).toBe('false');

      host.checked.set(true);
      await fixture.whenStable();

      expect(button().getAttribute('aria-checked')).toBe('true');
    });

    it('reports a user’s click back through the two-way binding', async () => {
      await click();

      expect(host.checked()).toBe(true);

      await click();

      expect(host.checked()).toBe(false);
    });

    it('renders a switch that starts on', async () => {
      @Component({
        imports: [Toggle],
        template: `<ui-toggle label="Dark mode" [checked]="true" />`,
      })
      class CheckedHost {}

      const f = TestBed.createComponent(CheckedHost);
      await f.whenStable();

      expect(button(f).getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('changed', () => {
    it('emits the new state when the user flips the switch', async () => {
      await click();
      await click();

      expect(host.changes).toEqual([true, false]);
    });

    // The distinction between `changed` and `checkedChange`: this one is the
    // user, so a form patch or a "reset" button must not fire it.
    it('does not emit when the state is set programmatically', async () => {
      host.checked.set(true);
      await fixture.whenStable();

      expect(host.changes).toEqual([]);
    });
  });

  describe('toggled', () => {
    it('emits when the user acts on the switch', async () => {
      await click();

      expect(host.toggles).toBe(1);
    });

    it('does not emit when the state is set programmatically', async () => {
      host.checked.set(true);
      await fixture.whenStable();

      expect(host.toggles).toBe(0);
    });
  });

  describe('disabled', () => {
    it('disables the real switch', async () => {
      expect(button().disabled).toBe(false);

      host.disabled.set(true);
      await fixture.whenStable();

      expect(button().disabled).toBe(true);
    });

    it('ignores a click while disabled', async () => {
      host.disabled.set(true);
      await fixture.whenStable();
      await click();

      expect(host.checked()).toBe(false);
      expect(host.changes).toEqual([]);
    });

    // A natively disabled button is skipped by the tab order, so a screen reader
    // user never reaches the tooltip saying why the switch is off.
    it('keeps a disabled switch interactive when asked, with aria-disabled', async () => {
      @Component({
        imports: [Toggle],
        template: `<ui-toggle label="Dark mode" disabled disabledInteractive />`,
      })
      class InteractiveHost {}

      const f = TestBed.createComponent(InteractiveHost);
      await f.whenStable();

      expect(button(f).disabled).toBe(false);
      expect(button(f).getAttribute('aria-disabled')).toBe('true');
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
      it(`lays the label out ${position} the switch, with Material’s own class`, async () => {
        host.labelPosition.set(position);
        await fixture.whenStable();

        expect(host.ref().matSlideToggle().labelPosition).toBe(position);
        expect(
          query('.mat-internal-form-field')!.classList.contains('mdc-form-field--align-end'),
        ).toBe(position === 'before');
      });
    }
  });

  describe('hideIcon', () => {
    // M3's own affordance for telling the two states apart without relying on
    // colour, so it is on by default.
    it('renders Material’s on/off icons by default', () => {
      expect(query('.mdc-switch__icons')).not.toBeNull();
    });

    it('drops the icons when asked', async () => {
      @Component({
        imports: [Toggle],
        template: `<ui-toggle label="Dark mode" hideIcon />`,
      })
      class NoIconHost {}

      const f = TestBed.createComponent(NoIconHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('.mdc-switch__icons')).toBeNull();
    });
  });

  // Rule 5: a form control that needs no adapter. These bind the host, which is
  // the whole claim — a consumer never reaches for the toggle inside it.
  describe('forms', () => {
    @Component({
      imports: [Toggle, FormsModule],
      template: `<ui-toggle label="Dark mode" [(ngModel)]="value" />`,
    })
    class NgModelHost {
      readonly value = signal(false);
    }

    @Component({
      imports: [Toggle, ReactiveFormsModule],
      template: `<ui-toggle label="Backups" [required]="required()" [formControl]="control" />`,
    })
    class ReactiveHost {
      readonly control = new FormControl(false);
      readonly required = signal(true);
    }

    it('writes a user’s click into an ngModel', async () => {
      const f = TestBed.createComponent(NgModelHost);
      await f.whenStable();
      await click(f);

      expect(f.componentInstance.value()).toBe(true);
    });

    it('renders the state an ngModel already holds', async () => {
      const f = TestBed.createComponent(NgModelHost);
      f.componentInstance.value.set(true);
      await f.whenStable();

      expect(button(f).getAttribute('aria-checked')).toBe('true');
    });

    it('renders a form’s value, whatever shape it arrives in', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();

      // `null` is a form's empty value — `reset()` writes it — and a switch is a
      // boolean, so it has to read as off rather than as "null".
      f.componentInstance.control.setValue(null);
      await f.whenStable();

      expect(button(f).getAttribute('aria-checked')).toBe('false');

      f.componentInstance.control.setValue(true);
      await f.whenStable();

      expect(button(f).getAttribute('aria-checked')).toBe('true');
    });

    it('follows a reactive form’s own disable()', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();

      f.componentInstance.control.disable();
      await f.whenStable();

      expect(button(f).disabled).toBe(true);
    });

    it('reports touched once the user has been in and out', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();

      expect(f.componentInstance.control.touched).toBe(false);

      button(f).dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      await f.whenStable();

      expect(f.componentInstance.control.touched).toBe(true);
    });

    // `Validators.required` rejects an *empty* value, and `false` is not empty —
    // so without `validate()` a required switch is valid while off.
    it('is invalid while a required switch is off', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();

      expect(f.componentInstance.control.invalid).toBe(true);
      expect(f.componentInstance.control.errors).toEqual({ required: true });

      await click(f);

      expect(f.componentInstance.control.valid).toBe(true);
      expect(f.componentInstance.control.errors).toBeNull();
    });

    it('is valid while off when it is not required', async () => {
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

    it('marks the real switch required, for the screen reader as well as the form', async () => {
      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();

      expect(button(f).getAttribute('aria-required')).toBe('true');
    });
  });

  // Rule 3: nothing a consumer writes on the host may be swallowed.
  describe('native attributes', () => {
    @Component({
      imports: [Toggle],
      template: `
        <ui-toggle
          label="Dark mode"
          id="dark"
          name="dark"
          tabindex="3"
          aria-describedby="hint"
          data-testid="switch"
          [attr.data-state]="state()"
        />
      `,
    })
    class AttributeHost {
      readonly state = signal('idle');
    }

    let f: ComponentFixture<AttributeHost>;

    const wrapper = (): HTMLElement => f.nativeElement.querySelector('ui-toggle');

    beforeEach(async () => {
      f = TestBed.createComponent(AttributeHost);
      await f.whenStable();
    });

    it('moves an unclaimed attribute onto the real switch', () => {
      expect(button(f).getAttribute('data-testid')).toBe('switch');
      expect(wrapper().hasAttribute('data-testid')).toBe(false);
    });

    // A binding must not stop working after the first paint — the host is
    // observed for exactly this.
    it('keeps moving a bound attribute as it changes', async () => {
      expect(button(f).getAttribute('data-state')).toBe('idle');

      f.componentInstance.state.set('saving');
      await f.whenStable();

      expect(button(f).getAttribute('data-state')).toBe('saving');
      expect(wrapper().hasAttribute('data-state')).toBe(false);
    });

    // Two elements claiming one id is invalid HTML, and Material derives the
    // button's id — the one its `<label for>` points at — from this one.
    it('gives the id to Material and takes it off the wrapper', () => {
      expect(wrapper().hasAttribute('id')).toBe(false);
      expect(f.nativeElement.querySelectorAll('#dark').length).toBe(1);
      expect(button(f).id).toBe('dark-button');
      expect(label(f).getAttribute('for')).toBe('dark-button');
    });

    it('gives the name to the real switch', () => {
      expect(button(f).getAttribute('name')).toBe('dark');
    });

    // Left on the host it would be a second tab stop, on an element that is not
    // the control.
    it('gives the tabindex to the real switch and takes it off the wrapper', () => {
      expect(button(f).getAttribute('tabindex')).toBe('3');
      expect(wrapper().hasAttribute('tabindex')).toBe(false);
    });

    it('gives aria-describedby to the real switch, where the description belongs', () => {
      expect(button(f).getAttribute('aria-describedby')).toBe('hint');
      expect(wrapper().hasAttribute('aria-describedby')).toBe(false);
    });

    it('leaves no aria-describedby on the switch when none is asked for', () => {
      expect(button().hasAttribute('aria-describedby')).toBe(false);
    });

    it('names the control with aria-label when there is no visible label', async () => {
      @Component({
        imports: [Toggle],
        template: `<ui-toggle aria-label="Dark mode" />`,
      })
      class AriaHost {}

      const g = TestBed.createComponent(AriaHost);
      await g.whenStable();

      expect(button(g).getAttribute('aria-label')).toBe('Dark mode');
      // Material drops its own `aria-labelledby` once the switch is named
      // directly, so the two do not fight over the accessible name.
      expect(button(g).hasAttribute('aria-labelledby')).toBe(false);
      expect(
        (g.nativeElement.querySelector('ui-toggle') as HTMLElement).hasAttribute('aria-label'),
      ).toBe(false);
    });

    // Material binds neither of these on the switch, so — unlike `ui-checkbox` —
    // they need no input here: forwarding is enough, which is rule 3 doing its
    // job for the "toggle reveals a section" shape.
    it('forwards aria-expanded and aria-controls to the real switch', async () => {
      @Component({
        imports: [Toggle],
        template: `<ui-toggle
          label="Advanced"
          [attr.aria-expanded]="open()"
          aria-controls="advanced"
        />`,
      })
      class ExpandHost {
        readonly open = signal(false);
      }

      const g = TestBed.createComponent(ExpandHost);
      await g.whenStable();

      expect(button(g).getAttribute('aria-expanded')).toBe('false');
      expect(button(g).getAttribute('aria-controls')).toBe('advanced');

      g.componentInstance.open.set(true);
      await g.whenStable();

      expect(button(g).getAttribute('aria-expanded')).toBe('true');
    });
  });

  // Rule 4: Material's own API is not swallowed.
  describe('escape hatches', () => {
    it('hands back the Material instance, whose API still works', async () => {
      host.ref().matSlideToggle().toggle();
      await fixture.whenStable();

      expect(button().getAttribute('aria-checked')).toBe('true');

      host.ref().matSlideToggle().focus();

      expect(document.activeElement).toBe(button());
    });

    it('hands back the `<mat-slide-toggle>` element', () => {
      expect(host.ref().toggleElement().nativeElement.tagName.toLowerCase()).toBe(
        'mat-slide-toggle',
      );
    });
  });
});
