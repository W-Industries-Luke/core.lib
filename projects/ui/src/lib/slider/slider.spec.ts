import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSlider, MatSliderRangeThumb, MatSliderThumb } from '@angular/material/slider';

import { Slider, type UiSliderRange, type UiSliderValue } from './slider';

@Component({
  imports: [Slider],
  template: `
    <ui-slider
      #ref="uiSlider"
      aria-label="Volume"
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [disabled]="disabled()"
      [discrete]="discrete()"
      [showTicks]="showTicks()"
      [range]="range()"
      [(value)]="value"
      [(startValue)]="startValue"
      [(endValue)]="endValue"
      (changed)="changes.push($event)"
    />
  `,
})
class TestHost {
  readonly min = signal(0);
  readonly max = signal(100);
  readonly step = signal(1);
  readonly disabled = signal(false);
  readonly discrete = signal(false);
  readonly showTicks = signal(false);
  readonly range = signal(false);
  readonly value = signal(0);
  readonly startValue = signal(0);
  readonly endValue = signal(100);
  readonly changes: UiSliderValue[] = [];
  readonly ref = viewChild.required<Slider>('ref');
}

describe('Slider', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  /** The real controls — the `<input type="range">`s Material renders. */
  const inputs = (f: ComponentFixture<unknown> = fixture): HTMLInputElement[] =>
    Array.from(f.nativeElement.querySelectorAll('input'));

  const input = (f: ComponentFixture<unknown> = fixture): HTMLInputElement => inputs(f)[0];

  /**
   * Moves a thumb the way a user does.
   *
   * A drag is a stream of `input` events with `change` at the end, and the
   * keyboard fires both at once — which is exactly the distinction between the
   * live `[(value)]` and the "user has finished" `changed`, so the two are
   * separate here rather than wrapped in one helper.
   */
  const drag = async (element: HTMLInputElement, ...values: number[]): Promise<void> => {
    for (const value of values) {
      element.value = `${value}`;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await fixture.whenStable();
    }
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
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
    it('renders Material’s slider', () => {
      expect(fixture.nativeElement.querySelector('mat-slider')).not.toBeNull();
      expect(host.ref().matSlider()).toBeInstanceOf(MatSlider);
    });

    it('renders one real range input, and hands it back as the escape hatch', () => {
      expect(inputs().length).toBe(1);
      expect(input().type).toBe('range');
      expect(host.ref().thumb()).toBeInstanceOf(MatSliderThumb);
    });
  });

  describe('bounds', () => {
    it('hands min, max and step to the real input, so the browser enforces them', async () => {
      host.min.set(10);
      host.max.set(20);
      host.step.set(2);
      await fixture.whenStable();

      expect(input().min).toBe('10');
      expect(input().max).toBe('20');
      expect(input().step).toBe('2');
    });

    // Bounds and stepping are the browser's, not this component's — which is the
    // point of each thumb being a real `<input type="range">`. That the numbers
    // reach it is asserted above; that the component reports what the input
    // settled on rather than what the pointer asked for is asserted by the range
    // tests below, where the sibling thumb is the limit.
  });

  describe('value', () => {
    it('puts the value on the real input', async () => {
      host.value.set(40);
      await fixture.whenStable();

      expect(input().value).toBe('40');
    });

    it('follows the thumb while it is dragged, not only when it is released', async () => {
      await drag(input(), 10, 20, 30);

      expect(host.value()).toBe(30);
    });
  });

  describe('changed', () => {
    // The distinction the output exists for: `[(value)]` is live, `changed` is
    // the gesture ending — which is what a "save this setting" request wants.
    it('emits once per gesture rather than once per pixel', async () => {
      await drag(input(), 10, 20, 30);

      expect(host.changes).toEqual([30]);
    });

    it('does not emit when the value is moved from code', async () => {
      host.value.set(70);
      await fixture.whenStable();

      expect(host.changes).toEqual([]);
    });

    it('carries both thumbs while range is set', async () => {
      host.range.set(true);
      await fixture.whenStable();

      await drag(inputs()[1], 60);

      expect(host.changes).toEqual([{ start: 0, end: 60 }]);
    });
  });

  describe('disabled', () => {
    it('disables the real input', async () => {
      host.disabled.set(true);
      await fixture.whenStable();

      expect(input().disabled).toBe(true);
    });

    it('leaves the input enabled by default', () => {
      expect(input().disabled).toBe(false);
    });
  });

  describe('discrete and showTicks', () => {
    it('asks Material for the value indicator, rather than drawing one', async () => {
      host.discrete.set(true);
      await fixture.whenStable();

      expect(host.ref().matSlider().discrete).toBe(true);
      expect(fixture.nativeElement.querySelector('.mdc-slider--discrete')).not.toBeNull();
    });

    it('asks Material for tick marks, rather than drawing them', async () => {
      host.showTicks.set(true);
      await fixture.whenStable();

      expect(host.ref().matSlider().showTickMarks).toBe(true);
      expect(fixture.nativeElement.querySelector('.mdc-slider--tick-marks')).not.toBeNull();
    });

    it('formats the indicator with displayWith', async () => {
      @Component({
        imports: [Slider],
        template: `<ui-slider
          #ref="uiSlider"
          discrete
          aria-label="Price"
          [displayWith]="format"
        />`,
      })
      class DisplayWithHost {
        readonly ref = viewChild.required<Slider>('ref');
        readonly format = (value: number) => `£${value}`;
      }

      const f = TestBed.createComponent(DisplayWithHost);
      await f.whenStable();

      expect(f.componentInstance.ref().matSlider().displayWith(5)).toBe('£5');
    });

    it('falls back to Material’s own formatting when displayWith is unset', () => {
      expect(host.ref().matSlider().displayWith(5)).toBe('5');
    });
  });

  describe('range', () => {
    beforeEach(async () => {
      host.range.set(true);
      await fixture.whenStable();
    });

    it('renders two real inputs, and hands both back', () => {
      expect(inputs().length).toBe(2);
      expect(host.ref().matSlider()._isRange).toBe(true);
      expect(host.ref().startThumb()).toBeInstanceOf(MatSliderRangeThumb);
      expect(host.ref().endThumb()).toBeInstanceOf(MatSliderRangeThumb);
    });

    it('puts each thumb’s value on its own input', async () => {
      host.startValue.set(20);
      host.endValue.set(80);
      await fixture.whenStable();

      expect(inputs().map((i) => i.value)).toEqual(['20', '80']);
    });

    it('reports each thumb separately', async () => {
      await drag(inputs()[0], 30);
      await drag(inputs()[1], 70);

      expect(host.startValue()).toBe(30);
      expect(host.endValue()).toBe(70);
    });

    // Material bounds the thumbs against each other by moving the *inputs'* own
    // min/max, which is why this wrapper does no clamping of its own.
    it('lets Material stop the thumbs crossing', async () => {
      host.startValue.set(40);
      host.endValue.set(60);
      await fixture.whenStable();

      expect(inputs()[0].max).toBe('60');
      expect(inputs()[1].min).toBe('40');
    });

    it('rebuilds the slider when range is flipped, so Material rewires its thumbs', async () => {
      host.range.set(false);
      await fixture.whenStable();

      expect(inputs().length).toBe(1);
      expect(host.ref().matSlider()._isRange).toBe(false);
    });
  });

  describe('forms', () => {
    @Component({
      imports: [Slider, FormsModule, ReactiveFormsModule],
      template: `
        <ui-slider aria-label="Volume" [formControl]="control" />
        <ui-slider aria-label="Zoom" [(ngModel)]="zoom" />
      `,
    })
    class FormHost {
      readonly control = new FormControl<number | null>(30);
      zoom = 50;
    }

    let form: ComponentFixture<FormHost>;

    const controlInput = (): HTMLInputElement => inputs(form)[0];
    const modelInput = (): HTMLInputElement => inputs(form)[1];

    beforeEach(async () => {
      form = TestBed.createComponent(FormHost);
      await form.whenStable();
    });

    it('writes the control’s value into the slider', () => {
      expect(controlInput().value).toBe('30');
    });

    it('reports the user’s drag back to the control', async () => {
      controlInput().value = '45';
      controlInput().dispatchEvent(new Event('input', { bubbles: true }));
      await form.whenStable();

      expect(form.componentInstance.control.value).toBe(45);
    });

    it('binds [(ngModel)] with no adapter', async () => {
      modelInput().value = '65';
      modelInput().dispatchEvent(new Event('input', { bubbles: true }));
      await form.whenStable();

      expect(form.componentInstance.zoom).toBe(65);
    });

    // `Validators.required`-style rules read `touched`, and a slider is touched
    // once the user has been in and out of it.
    it('marks the control touched when focus leaves the slider', async () => {
      expect(form.componentInstance.control.touched).toBe(false);

      controlInput().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      await form.whenStable();

      expect(form.componentInstance.control.touched).toBe(true);
    });

    it('lets the form disable the slider, without a template binding', async () => {
      form.componentInstance.control.disable();
      await form.whenStable();

      expect(controlInput().disabled).toBe(true);
    });

    // A control holds whatever it is given: a reset makes it `null`, and a query
    // parameter or a JSON payload arrives as a string.
    it('parks the thumb at min for a control with no value', async () => {
      form.componentInstance.control.reset();
      await form.whenStable();

      expect(controlInput().value).toBe('0');
      expect(form.componentInstance.control.value).toBeNull();
    });

    it('reads a numeric string as the number it is', async () => {
      form.componentInstance.control.setValue('75' as unknown as number);
      await form.whenStable();

      expect(controlInput().value).toBe('75');
    });
  });

  describe('forms: range', () => {
    @Component({
      imports: [Slider, ReactiveFormsModule],
      template: `
        <ui-slider
          range
          startAriaLabel="Cheapest"
          endAriaLabel="Dearest"
          [min]="10"
          [max]="90"
          [formControl]="control"
        />
      `,
    })
    class RangeFormHost {
      readonly control = new FormControl<UiSliderRange | null>({ start: 20, end: 80 });
    }

    let form: ComponentFixture<RangeFormHost>;

    beforeEach(async () => {
      form = TestBed.createComponent(RangeFormHost);
      await form.whenStable();
    });

    it('is one control holding both thumbs', () => {
      expect(inputs(form).map((i) => i.value)).toEqual(['20', '80']);
    });

    it('reports the whole range when either thumb moves', async () => {
      const start = inputs(form)[0];
      start.value = '30';
      start.dispatchEvent(new Event('input', { bubbles: true }));
      await form.whenStable();

      expect(form.componentInstance.control.value).toEqual({ start: 30, end: 80 });
    });

    // The empty value of a range is the whole range — the state a filter starts
    // in, and the one `reset()` should put it back to.
    it('opens the thumbs out to min and max for a control with no value', async () => {
      form.componentInstance.control.reset();
      await form.whenStable();

      expect(inputs(form).map((i) => i.value)).toEqual(['10', '90']);
    });
  });

  describe('accessibility', () => {
    it('names the real input, not the wrapper', () => {
      expect(input().getAttribute('aria-label')).toBe('Volume');
      expect(fixture.nativeElement.querySelector('ui-slider').hasAttribute('aria-label')).toBe(
        false,
      );
    });

    it('names each thumb of a range separately', async () => {
      @Component({
        imports: [Slider],
        template: `<ui-slider range startAriaLabel="Cheapest" endAriaLabel="Dearest" />`,
      })
      class RangeHost {}

      const f = TestBed.createComponent(RangeHost);
      await f.whenStable();

      expect(inputs(f).map((i) => i.getAttribute('aria-label'))).toEqual(['Cheapest', 'Dearest']);
    });

    it('names the input by aria-labelledby, for a slider labelled on the page', async () => {
      @Component({
        imports: [Slider],
        template: `
          <span id="zoom-label">Zoom</span>
          <ui-slider aria-labelledby="zoom-label" />
        `,
      })
      class LabelledbyHost {}

      const f = TestBed.createComponent(LabelledbyHost);
      await f.whenStable();

      expect(input(f).getAttribute('aria-labelledby')).toBe('zoom-label');
    });

    // Material's own, not this component's: the value indicator a screen reader
    // reads is `aria-valuetext`, which it keeps in step with the thumb.
    it('leaves Material to announce the value', async () => {
      await drag(input(), 40);

      expect(input().getAttribute('aria-valuetext')).toBe('40');
    });
  });

  // Rule 3: everything this component does not name reaches the real control.
  describe('native attributes', () => {
    it('moves them onto the real input, rather than stranding them on the wrapper', async () => {
      @Component({
        imports: [Slider],
        template: `<ui-slider aria-label="Volume" id="volume" data-testid="volume" tabindex="3" />`,
      })
      class AttributeHost {}

      const f = TestBed.createComponent(AttributeHost);
      await f.whenStable();
      const host = f.nativeElement.querySelector('ui-slider');

      expect(input(f).id).toBe('volume');
      expect(input(f).getAttribute('data-testid')).toBe('volume');
      expect(input(f).getAttribute('tabindex')).toBe('3');
      expect(host.hasAttribute('id')).toBe(false);
      expect(host.hasAttribute('data-testid')).toBe(false);
    });

    // This component's own inputs stay where they were written, so a consumer's
    // `ui-slider[disabled]` rule keeps selecting — only what this does not name
    // is moved.
    it('keeps the wrapper’s own attributes on the wrapper', async () => {
      @Component({
        imports: [Slider],
        template: `<ui-slider aria-label="Volume" disabled discrete />`,
      })
      class OwnAttributeHost {}

      const f = TestBed.createComponent(OwnAttributeHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('ui-slider[disabled][discrete]')).not.toBeNull();
      expect(input(f).hasAttribute('discrete')).toBe(false);
      // …and the input is disabled by the binding, not by a copied attribute.
      expect(input(f).disabled).toBe(true);
    });

    // Two controls, so there is no one input an attribute is about — it goes on
    // the group, exactly as `ui-radio-group` forwards to `<mat-radio-group>`.
    it('forwards to the slider itself when there are two thumbs', async () => {
      @Component({
        imports: [Slider],
        template: `<ui-slider range startAriaLabel="From" endAriaLabel="To" data-testid="price" />`,
      })
      class RangeAttributeHost {}

      const f = TestBed.createComponent(RangeAttributeHost);
      await f.whenStable();

      expect(f.nativeElement.querySelectorAll('[data-testid="price"]').length).toBe(1);
      expect(f.nativeElement.querySelector('mat-slider').getAttribute('data-testid')).toBe('price');
    });

    it('re-applies them to the new control when range is flipped', async () => {
      @Component({
        imports: [Slider],
        template: `<ui-slider aria-label="Price" data-testid="price" [range]="range()" />`,
      })
      class FlippingHost {
        readonly range = signal(false);
      }

      const f = TestBed.createComponent(FlippingHost);
      await f.whenStable();
      expect(input(f).getAttribute('data-testid')).toBe('price');

      f.componentInstance.range.set(true);
      await f.whenStable();

      expect(f.nativeElement.querySelector('mat-slider').getAttribute('data-testid')).toBe('price');
    });

    it('forwards an attribute bound after the first render', async () => {
      @Component({
        imports: [Slider],
        template: `<ui-slider aria-label="Volume" [attr.data-state]="state()" />`,
      })
      class BoundAttributeHost {
        readonly state = signal('idle');
      }

      const f = TestBed.createComponent(BoundAttributeHost);
      await f.whenStable();

      f.componentInstance.state.set('busy');
      await f.whenStable();
      // The MutationObserver that moves it runs as a microtask.
      await Promise.resolve();

      expect(input(f).getAttribute('data-state')).toBe('busy');
    });
  });
});
