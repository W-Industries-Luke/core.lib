import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIcon } from '@angular/material/icon';

import { Icon, UI_ICON_FONT_SET, type UiIconColor, type UiIconSize } from './icon';

@Component({
  imports: [Icon],
  template: `
    <ui-icon
      #ref="uiIcon"
      [name]="name()"
      [size]="size()"
      [filled]="filled()"
      [color]="color()"
      [label]="label()"
    />
  `,
})
class TestHost {
  readonly name = signal('home');
  readonly size = signal<UiIconSize>('md');
  readonly filled = signal(false);
  readonly color = signal<UiIconColor>('inherit');
  readonly label = signal<string | undefined>(undefined);
  readonly ref = viewChild.required<Icon>('ref');
}

describe('Icon', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;

  /** The `<ui-icon>` host element — where the colour/size/a11y decisions land. */
  const uiIcon = (): HTMLElement => fixture.nativeElement.querySelector('ui-icon') as HTMLElement;

  /** The `<mat-icon>` this component renders — where the glyph is drawn. */
  const matIcon = (): HTMLElement => fixture.nativeElement.querySelector('mat-icon') as HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  describe('name', () => {
    // The *attribute* is what Material's own ligature rule draws:
    // `.mat-icon.mat-ligature-font[fontIcon]::before { content: attr(fontIcon); }`.
    // MatIcon reflects its input back onto it, so asserting both pins the pair
    // this component relies on — if that reflection ever stopped, the glyph
    // would silently become an empty box while the input still read fine.
    it('renders the name as a ligature, via the fontIcon attribute and input', () => {
      expect(matIcon().getAttribute('fontIcon')).toBe('home');
      expect(host.ref().matIcon().fontIcon).toBe('home');
    });

    it('updates the glyph when the name changes', async () => {
      host.name.set('shopping_cart');
      await fixture.whenStable();

      expect(matIcon().getAttribute('fontIcon')).toBe('shopping_cart');
      expect(host.ref().matIcon().fontIcon).toBe('shopping_cart');
    });

    // Material Symbols, not the `material-icons` font `<mat-icon>` falls back to
    // — standardising that is most of this component's reason to exist. The
    // ligature class has to be there too, or Material adds the *name* as a CSS
    // class and draws nothing.
    it('renders from the Material Symbols font set, as a ligature', () => {
      expect(matIcon().classList).toContain(UI_ICON_FONT_SET);
      expect(matIcon().classList).toContain('mat-ligature-font');
      expect(matIcon().classList).not.toContain('material-icons');
      expect(host.ref().matIcon().fontSet).toBe(UI_ICON_FONT_SET);
    });

    // The name is never in the element's text — that is the point of routing it
    // through `fontIcon`. A ligature rendered from content would be selectable,
    // translatable and indexable as the literal word "home".
    it('keeps the name out of the DOM text', () => {
      expect(matIcon().textContent?.trim()).toBe('');
    });

    it('projects custom content in place of a named glyph', async () => {
      @Component({
        imports: [Icon],
        template: `<ui-icon><svg data-testid="brand"></svg></ui-icon>`,
      })
      class ProjectionHost {}

      const f = TestBed.createComponent(ProjectionHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('mat-icon svg[data-testid="brand"]')).not.toBeNull();
    });
  });

  describe('size', () => {
    const sizes: [UiIconSize, number][] = [
      ['sm', 18],
      ['md', 24],
      ['lg', 36],
    ];

    it('defaults to the 24px md step', () => {
      expect(host.ref().size()).toBe('md');
      expect(matIcon().style.fontSize).toBe('24px');
    });

    for (const [size, px] of sizes) {
      it(`renders the ${size} step at ${px}px, as a square box`, async () => {
        host.size.set(size);
        await fixture.whenStable();

        // The glyph is font-rendered, so font-size is what actually scales it;
        // width/height keep the box in step, since Material's own `.mat-icon`
        // pins both at a flat 24px.
        expect(matIcon().style.fontSize).toBe(`${px}px`);
        expect(matIcon().style.width).toBe(`${px}px`);
        expect(matIcon().style.height).toBe(`${px}px`);
      });
    }

    it('takes a number as a size in px', async () => {
      host.size.set(52);
      await fixture.whenStable();

      expect(host.ref().size()).toBe(52);
      expect(matIcon().style.fontSize).toBe('52px');
      expect(matIcon().style.width).toBe('52px');
    });

    // A static attribute is a string, so `size="32"` and `[size]="32"` have to
    // mean the same thing — otherwise the number path only works from a binding.
    it('coerces a numeric string attribute to a number', async () => {
      @Component({ imports: [Icon], template: `<ui-icon #ref="uiIcon" size="32" />` })
      class AttrHost {
        readonly ref = viewChild.required<Icon>('ref');
      }

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();

      expect(f.componentInstance.ref().size()).toBe(32);
      expect((f.nativeElement.querySelector('mat-icon') as HTMLElement).style.fontSize).toBe(
        '32px',
      );
    });

    // Cosmetic garbage should not blank the page: the union already makes this a
    // compile error, so the runtime falls back to the default step.
    it('falls back to md for a value that is neither a step nor a positive number', async () => {
      host.size.set('meduim' as UiIconSize);
      await fixture.whenStable();
      expect(host.ref().size()).toBe('md');

      host.size.set(0);
      await fixture.whenStable();
      expect(host.ref().size()).toBe('md');
    });
  });

  describe('filled', () => {
    it('is outlined by default, and needs no marker class', () => {
      expect(host.ref().filled()).toBe(false);
      expect(uiIcon().classList).not.toContain('ui-icon--filled');
    });

    it('marks the host when filled, so the FILL axis flips', async () => {
      host.filled.set(true);
      await fixture.whenStable();

      expect(uiIcon().classList).toContain('ui-icon--filled');
    });

    // `booleanAttribute`: the bare attribute is how a consumer writes a boolean
    // in HTML, and it has to mean `true` rather than the string "".
    it('treats the bare attribute as true', async () => {
      @Component({ imports: [Icon], template: `<ui-icon #ref="uiIcon" name="favorite" filled />` })
      class BareHost {
        readonly ref = viewChild.required<Icon>('ref');
      }

      const f = TestBed.createComponent(BareHost);
      await f.whenStable();

      expect(f.componentInstance.ref().filled()).toBe(true);
      expect((f.nativeElement.querySelector('ui-icon') as HTMLElement).classList).toContain(
        'ui-icon--filled',
      );
    });
  });

  describe('color', () => {
    it('defaults to inherit, which needs no marker class', () => {
      expect(host.ref().color()).toBe('inherit');
      expect(uiIcon().className).not.toContain('ui-icon--primary');
      expect(uiIcon().className).not.toContain('ui-icon--error');
    });

    const colorClasses: [UiIconColor, string | null][] = [
      ['inherit', null],
      ['primary', 'ui-icon--primary'],
      ['error', 'ui-icon--error'],
    ];

    for (const [color, expectedClass] of colorClasses) {
      it(`maps the ${color} color onto ${expectedClass ?? 'no class'}`, async () => {
        host.color.set(color);
        await fixture.whenStable();

        if (expectedClass) {
          expect(uiIcon().classList).toContain(expectedClass);
        } else {
          expect(uiIcon().className).not.toContain('ui-icon--primary');
          expect(uiIcon().className).not.toContain('ui-icon--error');
        }
      });
    }

    it('drops the previous color class when the color changes', async () => {
      host.color.set('primary');
      await fixture.whenStable();
      expect(uiIcon().classList).toContain('ui-icon--primary');

      host.color.set('error');
      await fixture.whenStable();

      expect(uiIcon().classList).toContain('ui-icon--error');
      expect(uiIcon().classList).not.toContain('ui-icon--primary');
    });

    // Material's own `color` input is M2-only and does nothing under an M3
    // theme, so this component must not quietly hand the role to it and call the
    // icon themed — the roles are resolved in `icon.scss` instead.
    it('does not route the role through MatIcon’s M2-only color input', async () => {
      host.color.set('error');
      await fixture.whenStable();

      expect(host.ref().matIcon().color).toBeFalsy();
      expect(matIcon().classList).not.toContain('mat-error');
      expect(matIcon().classList).not.toContain('mat-warn');
    });
  });

  describe('accessibility', () => {
    // An icon beside its own label would otherwise be announced twice, so the
    // decorative default is the right one — and it is Material's.
    it('is decorative by default: no name, and the glyph is aria-hidden', () => {
      expect(uiIcon().hasAttribute('role')).toBe(false);
      expect(uiIcon().hasAttribute('aria-label')).toBe(false);
      expect(matIcon().getAttribute('aria-hidden')).toBe('true');
    });

    it('becomes a named role=img when labelled', async () => {
      host.label.set('Delete order');
      await fixture.whenStable();

      expect(uiIcon().getAttribute('role')).toBe('img');
      expect(uiIcon().getAttribute('aria-label')).toBe('Delete order');
      // The name lives on the host, so the glyph inside stays hidden rather than
      // being announced as a second, anonymous image.
      expect(matIcon().getAttribute('aria-hidden')).toBe('true');
    });

    it('goes back to decorative when the label is removed', async () => {
      host.label.set('Delete order');
      await fixture.whenStable();

      host.label.set(undefined);
      await fixture.whenStable();

      expect(uiIcon().hasAttribute('role')).toBe(false);
      expect(uiIcon().hasAttribute('aria-label')).toBe(false);
    });

    it('ignores a blank label rather than naming an anonymous image', async () => {
      host.label.set('   ');
      await fixture.whenStable();

      expect(uiIcon().hasAttribute('role')).toBe(false);
      expect(uiIcon().hasAttribute('aria-label')).toBe(false);
    });

    // Rule 3: the attribute a consumer reaches for first has to work, rather
    // than being silently overwritten by the host's own `[attr.aria-label]`.
    it('accepts aria-label as an equivalent of label', async () => {
      @Component({
        imports: [Icon],
        template: `<ui-icon name="delete" aria-label="Delete order" />`,
      })
      class AriaHost {}

      const f = TestBed.createComponent(AriaHost);
      await f.whenStable();
      const el = f.nativeElement.querySelector('ui-icon') as HTMLElement;

      expect(el.getAttribute('aria-label')).toBe('Delete order');
      expect(el.getAttribute('role')).toBe('img');
    });

    it('prefers label when both are given', async () => {
      @Component({
        imports: [Icon],
        template: `<ui-icon name="delete" label="Delete order" aria-label="Bin" />`,
      })
      class BothHost {}

      const f = TestBed.createComponent(BothHost);
      await f.whenStable();

      expect(
        (f.nativeElement.querySelector('ui-icon') as HTMLElement).getAttribute('aria-label'),
      ).toBe('Delete order');
    });
  });

  describe('native attributes reach the host', () => {
    it('does not swallow id, data-* or aria-describedby', async () => {
      @Component({
        imports: [Icon],
        template: `
          <ui-icon name="home" id="nav-glyph" data-testid="glyph" aria-describedby="hint" />
        `,
      })
      class AttrHost {}

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      const el = f.nativeElement.querySelector('ui-icon') as HTMLElement;

      expect(el.id).toBe('nav-glyph');
      expect(el.dataset['testid']).toBe('glyph');
      expect(el.getAttribute('aria-describedby')).toBe('hint');
    });
  });

  describe('exportAs', () => {
    it('exposes the directive instance to a template ref', () => {
      expect(host.ref()).toBeInstanceOf(Icon);
    });

    // Rule 4: the underlying Material instance is the escape hatch for
    // everything this component deliberately does not wrap — `svgIcon`, `inline`.
    it('exposes the underlying MatIcon instance', () => {
      expect(host.ref().matIcon()).toBeInstanceOf(MatIcon);
    });
  });
});
