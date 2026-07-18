import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Collapse, CollapseTrigger, UiCollapseOrientation } from './collapse';

/** A collapse with a trigger projected into it — the no-wiring common case. */
@Component({
  imports: [Collapse, CollapseTrigger],
  template: `
    <ui-collapse
      #c="uiCollapse"
      [expanded]="open()"
      (expandedChange)="open.set($event)"
      [disabled]="disabled()"
      [orientation]="orientation()"
      [duration]="duration()"
    >
      <button uiCollapseTrigger>Toggle</button>
      <p class="body">Body content</p>
    </ui-collapse>
  `,
})
class Host {
  readonly open = signal(true);
  readonly disabled = signal(false);
  readonly orientation = signal<UiCollapseOrientation>('vertical');
  readonly duration = signal<number | null>(null);
  readonly c = viewChild.required<Collapse>('c');
}

describe('Collapse', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  const el = (selector: string): HTMLElement =>
    fixture.nativeElement.querySelector(selector) as HTMLElement;
  const trigger = (): HTMLButtonElement => el('button') as HTMLButtonElement;
  const region = (): HTMLElement => el('.ui-collapse__region');
  const collapse = (): HTMLElement => el('ui-collapse');

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  describe('open state', () => {
    it('defaults to open', () => {
      expect(host.c().expanded()).toBe(true);
      expect(collapse().classList).toContain('ui-collapse--expanded');
    });

    it('toggles when the projected trigger is clicked, and emits expandedChange', async () => {
      expect(host.open()).toBe(true);

      trigger().click();
      await fixture.whenStable();

      // The output propagated back through the two-way binding to the host signal.
      expect(host.open()).toBe(false);
      expect(host.c().expanded()).toBe(false);
      expect(collapse().classList).not.toContain('ui-collapse--expanded');

      trigger().click();
      await fixture.whenStable();
      expect(host.open()).toBe(true);
    });

    it('reacts to the input changing from outside', async () => {
      host.open.set(false);
      await fixture.whenStable();

      expect(host.c().expanded()).toBe(false);
      expect(collapse().classList).not.toContain('ui-collapse--expanded');
    });

    it('exposes an imperative open/close/toggle API', async () => {
      host.c().close();
      await fixture.whenStable();
      expect(host.open()).toBe(false);

      host.c().open();
      await fixture.whenStable();
      expect(host.open()).toBe(true);

      host.c().toggle();
      await fixture.whenStable();
      expect(host.open()).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('gives the region a stable id and points the trigger at it', () => {
      const id = region().id;
      expect(id).toBeTruthy();
      expect(trigger().getAttribute('aria-controls')).toBe(id);
    });

    it('keeps aria-expanded on the trigger in sync with the state', async () => {
      expect(trigger().getAttribute('aria-expanded')).toBe('true');

      host.open.set(false);
      await fixture.whenStable();

      expect(trigger().getAttribute('aria-expanded')).toBe('false');
    });

    // "Properly hidden, not just visually": inert removes the content from the
    // tab order and the accessibility tree when collapsed.
    it('makes the region inert only while collapsed', async () => {
      expect(region().hasAttribute('inert')).toBe(false);

      host.open.set(false);
      await fixture.whenStable();
      expect(region().hasAttribute('inert')).toBe(true);

      host.open.set(true);
      await fixture.whenStable();
      expect(region().hasAttribute('inert')).toBe(false);
    });

    it('projects the body content into the region', () => {
      expect(region().querySelector('.body')?.textContent).toContain('Body content');
    });
  });

  describe('disabled', () => {
    it('ignores a trigger click', async () => {
      host.disabled.set(true);
      await fixture.whenStable();

      trigger().click();
      await fixture.whenStable();

      expect(host.open()).toBe(true);
    });

    it('ignores the imperative API too, freezing the state rather than closing it', async () => {
      host.disabled.set(true);
      await fixture.whenStable();

      host.c().close();
      host.c().toggle();
      await fixture.whenStable();

      expect(host.open()).toBe(true);
    });

    it('reports aria-disabled on the trigger', async () => {
      expect(trigger().hasAttribute('aria-disabled')).toBe(false);

      host.disabled.set(true);
      await fixture.whenStable();

      expect(trigger().getAttribute('aria-disabled')).toBe('true');
    });
  });

  describe('orientation', () => {
    it('marks the host for the horizontal axis', async () => {
      expect(collapse().classList).not.toContain('ui-collapse--horizontal');

      host.orientation.set('horizontal');
      await fixture.whenStable();

      expect(collapse().classList).toContain('ui-collapse--horizontal');
    });
  });

  describe('duration', () => {
    it('leaves the theme motion token to CSS when unset', () => {
      expect(collapse().style.getPropertyValue('--ui-collapse-duration')).toBe('');
    });

    it('writes an explicit duration as a custom property in ms', async () => {
      host.duration.set(500);
      await fixture.whenStable();

      expect(collapse().style.getPropertyValue('--ui-collapse-duration')).toBe('500ms');
    });
  });
});

describe('CollapseTrigger', () => {
  it('controls a collapse referenced by binding from elsewhere on the page', async () => {
    @Component({
      imports: [Collapse, CollapseTrigger],
      template: `
        <button [uiCollapseTrigger]="c" class="ext">Ext</button>
        <ui-collapse #c="uiCollapse" [expanded]="open()" (expandedChange)="open.set($event)">
          <p>Body</p>
        </ui-collapse>
      `,
    })
    class ExternalHost {
      readonly open = signal(true);
    }

    const f = TestBed.createComponent(ExternalHost);
    await f.whenStable();
    const button = f.nativeElement.querySelector('.ext') as HTMLButtonElement;
    const region = f.nativeElement.querySelector('.ui-collapse__region') as HTMLElement;

    expect(button.getAttribute('aria-controls')).toBe(region.id);
    expect(button.getAttribute('aria-expanded')).toBe('true');

    button.click();
    await f.whenStable();

    expect(f.componentInstance.open()).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('makes a non-button element a keyboard-operable disclosure control', async () => {
    @Component({
      imports: [Collapse, CollapseTrigger],
      template: `
        <ui-collapse [expanded]="open()" (expandedChange)="open.set($event)">
          <span uiCollapseTrigger>Toggle</span>
          <p>Body</p>
        </ui-collapse>
      `,
    })
    class SpanHost {
      readonly open = signal(true);
    }

    const f = TestBed.createComponent(SpanHost);
    await f.whenStable();
    const span = f.nativeElement.querySelector('span') as HTMLElement;

    // A native button carries these for free; a span must be given them.
    expect(span.getAttribute('role')).toBe('button');
    expect(span.getAttribute('tabindex')).toBe('0');

    span.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await f.whenStable();

    expect(f.componentInstance.open()).toBe(false);
  });
});
