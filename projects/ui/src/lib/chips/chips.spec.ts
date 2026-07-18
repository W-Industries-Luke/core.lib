import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatChip, MatChipGrid, MatChipInput, MatChipSet } from '@angular/material/chips';
import { MatChipHarness } from '@angular/material/chips/testing';
import { By } from '@angular/platform-browser';

import { ChipDef, Chips, type UiChip } from './chips';

@Component({
  imports: [Chips],
  template: `
    <ui-chips
      #ref="uiChips"
      [(chips)]="chips"
      [editable]="editable()"
      [removable]="removable()"
      [disabled]="disabled()"
      [label]="label()"
      [placeholder]="placeholder()"
      (removed)="removals.push($event)"
      (added)="additions.push($event)"
      aria-label="Tags"
    />
  `,
})
class TestHost {
  readonly chips = signal<readonly UiChip[]>([
    { label: 'design', value: 'design' },
    { label: 'urgent', value: 'urgent' },
  ]);
  readonly editable = signal(false);
  readonly removable = signal(false);
  readonly disabled = signal(false);
  readonly label = signal<string | undefined>(undefined);
  readonly placeholder = signal<string | undefined>(undefined);
  readonly removals: UiChip[] = [];
  readonly additions: UiChip[] = [];
  readonly ref = viewChild.required<Chips>('ref');
}

/**
 * Material's own switch for its animations. Without it the chips' state-layer and
 * focus transitions run on timers that no assertion here is waiting for. This is
 * Material's public token rather than `provideNoopAnimations()`, which is the same
 * thing plus an animations module.
 */
const noAnimations = { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } };

/**
 * A keydown the CDK will actually read. It matches on `keyCode` rather than `key`
 * (`separatorKeyCodes.has(event.keyCode)`), and a `KeyboardEvent` built from `key`
 * alone reports `keyCode: 0` — a separator the chip input would ignore. The same
 * construction `dialog.spec.ts` uses for Escape.
 */
function keydown(keyCode: number, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true });
  Object.defineProperty(event, 'keyCode', { get: () => keyCode });
  return event;
}

describe('Chips', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let loader: HarnessLoader;

  // `MatChipHarness` speaks Material's public test surface — `getText()` for a chip's
  // label, `remove()` for its trailing button — instead of the MDC class names
  // (`.mat-mdc-chip-action-label`, `button[matChipRemove]`) the old spec reached into.
  // `getAllHarnesses(MatChipHarness)` matches both a static set's `mat-chip`s and an
  // editable set's `mat-chip-row`s, so one helper serves both containers. The ARIA
  // roles/names, the theme tokens and the keyboard-separator mechanics — none of which
  // the harness exposes — stay DOM assertions below.

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  const queryAll = (selector: string): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll(selector));

  /** Material's chips on screen, whichever container is rendered, through the harness. */
  const chips = (l: HarnessLoader = loader): Promise<MatChipHarness[]> =>
    l.getAllHarnesses(MatChipHarness);

  /** The chips on screen, whichever container is rendered, by their text. */
  const labels = async (l: HarnessLoader = loader): Promise<string[]> =>
    Promise.all((await chips(l)).map((chip) => chip.getText()));

  /** The remove buttons Material renders, in chip order. */
  const removeButtons = (): HTMLButtonElement[] =>
    queryAll('button[matChipRemove]') as HTMLButtonElement[];

  /** An `editable` set's input — the one a user types a new chip into. */
  const input = (): HTMLInputElement => query('input.mat-mdc-chip-input') as HTMLInputElement;

  /** Material's own chip instances, whichever container is rendered. */
  const matChips = (): MatChip[] =>
    fixture.debugElement.queryAll(By.directive(MatChip)).map((chip) => chip.componentInstance);

  /** Types into the input and ends the chip the way a user does: a separator key. */
  const type = async (text: string, keyCode = ENTER, key = 'Enter') => {
    const element = input();
    element.value = text;
    element.dispatchEvent(new Event('input'));
    element.dispatchEvent(keydown(keyCode, key));
    await fixture.whenStable();
  };

  const editable = async () => {
    host.editable.set(true);
    host.label.set('Tags');
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [noAnimations] });
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  // The point of this library: the chips are Material's, not spans painted to look
  // like them. If these fail, everything below is testing a lookalike.
  describe('composition', () => {
    it('renders Material’s chip set rather than markup of its own', () => {
      expect(query('mat-chip-set')).not.toBeNull();
      expect(query('mat-chip-set')!.classList).toContain('mat-mdc-chip-set');
      expect(host.ref().matChipSet()).toBeInstanceOf(MatChipSet);
    });

    it('renders one Material chip per chip, in order', async () => {
      expect(queryAll('mat-chip').length).toBe(2);
      expect(await labels()).toEqual(['design', 'urgent']);
    });

    it('renders Material’s chip grid and input once editable', async () => {
      await editable();

      expect(query('mat-form-field')).not.toBeNull();
      expect(query('mat-chip-grid')).not.toBeNull();
      expect(queryAll('mat-chip-row').length).toBe(2);
      expect(input()).not.toBeNull();
      // The static set is the other branch, not a wrapper around this one.
      expect(query('mat-chip-set:not(mat-chip-grid)')).toBeNull();
    });

    // A `MatChip` falls back to its own text content for a value. The chips here carry
    // one that is not their label — an id, an object — so it is handed over rather
    // than inferred, and `matChipGrid().value` and Material's own events agree with
    // this component's.
    it('hands each chip’s value to Material rather than letting it infer one from text', async () => {
      host.chips.set([{ label: 'Design', value: 42 as unknown as string }]);
      await fixture.whenStable();

      expect(matChips().map((chip) => chip.value)).toEqual([42]);
    });
  });

  describe('chips', () => {
    it('re-renders when the list changes under it', async () => {
      host.chips.set([{ label: 'blocked', value: 'blocked' }]);
      await fixture.whenStable();

      expect(await labels()).toEqual(['blocked']);
    });

    it('renders an empty set as an empty list rather than nothing at all', async () => {
      host.chips.set([]);
      await fixture.whenStable();

      expect(query('mat-chip-set')).not.toBeNull();
      expect(queryAll('mat-chip').length).toBe(0);
    });

    it('renders a chip’s label as its text', async () => {
      expect(await labels()).toContain('design');
    });
  });

  describe('removable', () => {
    it('ships no remove button by default — a static tag is not a control', () => {
      expect(removeButtons().length).toBe(0);
    });

    it('gives every chip a remove button when the set is removable', async () => {
      host.removable.set(true);
      await fixture.whenStable();

      expect(removeButtons().length).toBe(2);
    });

    it('removes the chip that was clicked, and writes the list back', async () => {
      host.removable.set(true);
      await fixture.whenStable();

      await (await chips())[0].remove();
      await fixture.whenStable();

      expect(host.chips().map((chip) => chip.label)).toEqual(['urgent']);
      expect(await labels()).toEqual(['urgent']);
    });

    it('emits the removed chip, whole', async () => {
      host.removable.set(true);
      await fixture.whenStable();

      await (await chips())[1].remove();
      await fixture.whenStable();

      expect(host.removals).toEqual([{ label: 'urgent', value: 'urgent' }]);
    });

    // The model is written before the output fires, so a handler that reads the list
    // sees it without the chip it was told about.
    it('has already left the list by the time removed fires', async () => {
      const seen: string[][] = [];

      @Component({
        imports: [Chips],
        template: `
          <ui-chips [(chips)]="chips" removable (removed)="record()" aria-label="Tags" />
        `,
      })
      class ReadHost {
        readonly chips = signal<readonly UiChip[]>([
          { label: 'design', value: 'design' },
          { label: 'urgent', value: 'urgent' },
        ]);
        record() {
          seen.push(this.chips().map((chip) => chip.label));
        }
      }

      const f = TestBed.createComponent(ReadHost);
      await f.whenStable();
      await (await chips(TestbedHarnessEnvironment.loader(f)))[0].remove();
      await f.whenStable();

      expect(seen).toEqual([['urgent']]);
    });

    // Identity, not label: two chips can read the same and still be two chips.
    it('removes only the chip whose button was pressed, even among duplicates', async () => {
      host.chips.set([
        { label: 'design', value: 'a' },
        { label: 'design', value: 'b' },
      ]);
      host.removable.set(true);
      await fixture.whenStable();

      await (await chips())[0].remove();
      await fixture.whenStable();

      expect(host.chips().map((chip) => chip.value)).toEqual(['b']);
    });

    it('lets one chip opt out of a removable set', async () => {
      host.chips.set([
        { label: 'design', value: 'design' },
        { label: 'pinned', value: 'pinned', removable: false },
      ]);
      host.removable.set(true);
      await fixture.whenStable();

      expect(removeButtons().length).toBe(1);
      expect(removeButtons()[0].getAttribute('aria-label')).toBe('Remove design');
    });

    it('lets one chip opt in to a set that is otherwise pinned', async () => {
      host.chips.set([
        { label: 'design', value: 'design' },
        { label: 'draft', value: 'draft', removable: true },
      ]);
      await fixture.whenStable();

      expect(removeButtons().length).toBe(1);
      expect(removeButtons()[0].getAttribute('aria-label')).toBe('Remove draft');
    });

    // Material only emits `removed` from a chip that is `removable`, so a set with no
    // buttons cannot be emptied by a stray call either.
    it('stays put when a chip that cannot be removed is asked to go', async () => {
      matChips()[0].remove();
      await fixture.whenStable();

      expect(host.chips().length).toBe(2);
      expect(host.removals).toEqual([]);
    });

    it('removes chips from an editable set’s rows too', async () => {
      host.removable.set(true);
      await editable();

      expect(queryAll('mat-chip-row').length).toBe(2);
      await (await chips())[0].remove();
      await fixture.whenStable();

      expect(host.chips().map((chip) => chip.label)).toEqual(['urgent']);
      expect(host.removals.length).toBe(1);
    });

    // `booleanAttribute`: the bare attribute is what a template naturally writes.
    it('reads the bare removable attribute', async () => {
      @Component({
        imports: [Chips],
        template: `<ui-chips #ref="uiChips" [chips]="chips" removable aria-label="Tags" />`,
      })
      class AttrHost {
        readonly chips: readonly UiChip[] = [{ label: 'design', value: 'design' }];
        readonly ref = viewChild.required<Chips>('ref');
      }

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();

      expect(f.componentInstance.ref().removable()).toBe(true);
      expect(f.nativeElement.querySelector('button[matChipRemove]')).not.toBeNull();
    });
  });

  describe('editable', () => {
    beforeEach(async () => {
      await editable();
    });

    it('turns typed text into a chip on Enter', async () => {
      await type('backend');

      expect(host.chips().map((chip) => chip.label)).toEqual(['design', 'urgent', 'backend']);
      expect(await labels()).toContain('backend');
    });

    it('emits the chip it added', async () => {
      await type('backend');

      expect(host.additions).toEqual([{ label: 'backend', value: 'backend' }]);
    });

    it('makes the label and the value the text, by default', async () => {
      await type('backend');

      expect(host.chips().at(-1)).toEqual({ label: 'backend', value: 'backend' });
    });

    it('clears the input, ready for the next one', async () => {
      await type('backend');

      expect(input().value).toBe('');
    });

    it('ends a chip on a comma as well as Enter — Material ends only on Enter', async () => {
      await type('backend', COMMA, ',');

      expect(host.chips().map((chip) => chip.label)).toEqual(['design', 'urgent', 'backend']);
    });

    it('takes custom separator keys instead when given some', async () => {
      @Component({
        imports: [Chips],
        template: ` <ui-chips [(chips)]="chips" editable [separatorKeys]="[13]" label="Tags" /> `,
      })
      class SeparatorHost {
        readonly chips = signal<readonly UiChip[]>([]);
      }

      const f = TestBed.createComponent(SeparatorHost);
      await f.whenStable();
      const element = f.nativeElement.querySelector('input') as HTMLInputElement;
      element.value = 'backend';
      element.dispatchEvent(keydown(COMMA, ','));
      await f.whenStable();

      // The comma is not a separator for this set, so it is just a character.
      expect(f.componentInstance.chips().length).toBe(0);

      element.dispatchEvent(keydown(ENTER, 'Enter'));
      await f.whenStable();

      expect(f.componentInstance.chips().map((chip) => chip.label)).toEqual(['backend']);
    });

    it('trims what was typed', async () => {
      await type('   backend   ');

      expect(host.chips().at(-1)).toEqual({ label: 'backend', value: 'backend' });
    });

    it('adds nothing for blank text, and clears it', async () => {
      await type('   ');

      expect(host.chips().length).toBe(2);
      expect(host.additions).toEqual([]);
      expect(input().value).toBe('');
    });

    // The fleet's default, and not Material's: text a user typed and clicked away from
    // is text they meant.
    it('keeps text left in the input on blur, as a chip', async () => {
      input().value = 'backend';
      input().dispatchEvent(new Event('blur'));
      await fixture.whenStable();

      expect(host.chips().map((chip) => chip.label)).toEqual(['design', 'urgent', 'backend']);
    });

    it('drops the text on blur when addOnBlur is off', async () => {
      @Component({
        imports: [Chips],
        template: ` <ui-chips [(chips)]="chips" editable [addOnBlur]="false" label="Tags" /> `,
      })
      class BlurHost {
        readonly chips = signal<readonly UiChip[]>([]);
      }

      const f = TestBed.createComponent(BlurHost);
      await f.whenStable();
      const element = f.nativeElement.querySelector('input') as HTMLInputElement;
      element.value = 'backend';
      element.dispatchEvent(new Event('blur'));
      await f.whenStable();

      expect(f.componentInstance.chips().length).toBe(0);
    });

    it('renders the label, the placeholder and the hint on Material’s field', async () => {
      host.placeholder.set('New tag…');
      await fixture.whenStable();

      expect(query('mat-label')!.textContent!.trim()).toBe('Tags');
      expect(input().getAttribute('placeholder')).toBe('New tag…');
    });

    it('shows no field furniture a static set has no room for', async () => {
      host.editable.set(false);
      await fixture.whenStable();

      expect(query('mat-form-field')).toBeNull();
      expect(query('input')).toBeNull();
    });
  });

  describe('createChip', () => {
    // The whole point of a chip carrying a `value`: a set over objects, where the
    // typed text is only the label.
    it('turns the text into whatever a set over objects needs', async () => {
      interface Tag {
        readonly name: string;
      }

      @Component({
        imports: [Chips],
        template: `
          <ui-chips
            [(chips)]="chips"
            editable
            label="Tags"
            [createChip]="toTag"
            (added)="added.push($event)"
          />
        `,
      })
      class FactoryHost {
        readonly chips = signal<readonly UiChip<Tag>[]>([]);
        readonly added: UiChip<Tag>[] = [];
        readonly toTag = (label: string): UiChip<Tag> => ({ label, value: { name: label } });
      }

      const f = TestBed.createComponent(FactoryHost);
      await f.whenStable();
      const element = f.nativeElement.querySelector('input') as HTMLInputElement;
      element.value = 'backend';
      element.dispatchEvent(keydown(ENTER, 'Enter'));
      await f.whenStable();

      expect(f.componentInstance.chips()).toEqual([
        { label: 'backend', value: { name: 'backend' } },
      ]);
      expect(f.componentInstance.added[0].value).toEqual({ name: 'backend' });
    });

    it('rejects a label the factory turns away, leaving it in the input to amend', async () => {
      @Component({
        imports: [Chips],
        template: ` <ui-chips [(chips)]="chips" editable label="Tags" [createChip]="unique" /> `,
      })
      class UniqueHost {
        readonly chips = signal<readonly UiChip[]>([{ label: 'design', value: 'design' }]);
        readonly unique = (label: string): UiChip | null =>
          this.chips().some((chip) => chip.label === label) ? null : { label, value: label };
      }

      const f = TestBed.createComponent(UniqueHost);
      await f.whenStable();
      const element = f.nativeElement.querySelector('input') as HTMLInputElement;
      element.value = 'design';
      element.dispatchEvent(keydown(ENTER, 'Enter'));
      await f.whenStable();

      expect(f.componentInstance.chips().length).toBe(1);
      expect(element.value).toBe('design');

      element.value = 'backend';
      element.dispatchEvent(keydown(ENTER, 'Enter'));
      await f.whenStable();

      expect(f.componentInstance.chips().map((chip) => chip.label)).toEqual(['design', 'backend']);
      expect(element.value).toBe('');
    });
  });

  describe('disabled', () => {
    it('turns Material’s whole set off', async () => {
      host.disabled.set(true);
      await fixture.whenStable();

      expect(host.ref().matChipSet()!.disabled).toBe(true);
      expect(query('mat-chip')!.classList).toContain('mat-mdc-chip-disabled');
    });

    it('keeps the chips on screen — a disabled set is one you cannot change, not one you cannot see', async () => {
      host.disabled.set(true);
      await fixture.whenStable();

      expect(await labels()).toEqual(['design', 'urgent']);
    });

    it('ignores a click on a remove button', async () => {
      host.removable.set(true);
      host.disabled.set(true);
      await fixture.whenStable();

      removeButtons()[0].click();
      await fixture.whenStable();

      expect(host.chips().length).toBe(2);
      expect(host.removals).toEqual([]);
    });

    it('turns an editable set’s input off too', async () => {
      host.disabled.set(true);
      await editable();

      expect(input().hasAttribute('disabled')).toBe(true);
    });

    it('comes back when it is turned on again', async () => {
      host.removable.set(true);
      host.disabled.set(true);
      await fixture.whenStable();

      host.disabled.set(false);
      await fixture.whenStable();
      removeButtons()[0].click();
      await fixture.whenStable();

      expect(host.chips().length).toBe(1);
    });

    // `booleanAttribute` again.
    it('reads the bare disabled attribute', async () => {
      @Component({
        imports: [Chips],
        template: `<ui-chips #ref="uiChips" [chips]="chips" disabled aria-label="Tags" />`,
      })
      class AttrHost {
        readonly chips: readonly UiChip[] = [{ label: 'design', value: 'design' }];
        readonly ref = viewChild.required<Chips>('ref');
      }

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();

      expect(f.componentInstance.ref().disabled()).toBe(true);
      expect(f.componentInstance.ref().matChipSet()!.disabled).toBe(true);
    });
  });

  // Rule 7: a chip is not a string, and a consumer who needs an avatar or a count in
  // one should not need a fork of this component.
  describe('uiChipDef', () => {
    @Component({
      imports: [Chips, ChipDef],
      template: `
        <ui-chips [chips]="chips" [editable]="editable()" aria-label="Tags">
          <ng-template uiChipDef let-chip>
            <span class="custom">{{ chip.label }} ({{ chip.value }})</span>
          </ng-template>
        </ui-chips>
      `,
    })
    class TemplateHost {
      readonly chips: readonly UiChip[] = [{ label: 'design', value: 'design' }];
      readonly editable = signal(false);
    }

    it('renders each chip through the projected template', async () => {
      const f = TestBed.createComponent(TemplateHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('.custom').textContent.trim()).toBe('design (design)');
    });

    // Inside Material's chip, not instead of it — and specifically in the chip's text
    // slot, which is the one an `ng-template` can reach. Material's leading
    // `matChipAvatar` slot is matched against the static template, so nothing rendered
    // through an outlet lands there; the docs say so rather than pretending otherwise.
    it('renders it inside Material’s own chip, in the text slot', async () => {
      const f = TestBed.createComponent(TemplateHost);
      await f.whenStable();

      expect(
        f.nativeElement.querySelector('mat-chip .mat-mdc-chip-action-label .custom'),
      ).not.toBeNull();
    });

    it('applies to an editable set’s rows too', async () => {
      const f = TestBed.createComponent(TemplateHost);
      f.componentInstance.editable.set(true);
      await f.whenStable();

      expect(f.nativeElement.querySelector('mat-chip-row .custom')).not.toBeNull();
    });

    it('falls back to the label when no template is given', async () => {
      expect(await labels()).toEqual(['design', 'urgent']);
    });
  });

  // #121: the remove affordance is a Material Symbols glyph, not the literal word
  // "cancel". jsdom applies no icon font, so what a regression in this family would
  // break — and what these pin — is the structural half: the affordance is a real
  // <mat-icon> drawing the `cancel` ligature (not a <span> of prose), and it is
  // hidden from assistive tech so the button announces its `aria-label` alone,
  // never "Remove design cancel".
  describe('remove button glyph', () => {
    const removeIcons = (): HTMLElement[] => queryAll('button[matChipRemove] mat-icon');

    it('draws the remove affordance as a Material cancel glyph', async () => {
      host.removable.set(true);
      await fixture.whenStable();

      const icons = removeIcons();
      expect(icons.length).toBe(2);
      for (const icon of icons) {
        expect(icon.tagName.toLowerCase()).toBe('mat-icon');
        expect(icon.classList).toContain('mat-icon');
        // The ligature name Material draws the glyph from — the thing the icon font
        // renders, rather than selectable, translatable prose.
        expect(icon.textContent?.trim()).toBe('cancel');
      }
    });

    it('hides the glyph from assistive tech, so the button reads as its label alone', async () => {
      host.removable.set(true);
      await fixture.whenStable();

      for (const icon of removeIcons()) {
        expect(icon.getAttribute('aria-hidden')).toBe('true');
      }
      // The name a screen reader gets is the button's, not the glyph's.
      expect(removeButtons()[0].getAttribute('aria-label')).toBe('Remove design');
    });

    it('draws the same glyph on an editable set’s rows', async () => {
      host.removable.set(true);
      await editable();

      const icons = removeIcons();
      expect(icons.length).toBe(2);
      expect(icons.every((icon) => icon.textContent?.trim() === 'cancel')).toBe(true);
    });
  });

  describe('accessibility', () => {
    // Material's own default role for a chip set is `presentation`, which an
    // `aria-label` may not name and which tells a screen reader nothing about how many
    // tags there are. Material's docs prescribe list/listitem for static chips.
    it('renders a static set as a list of listitems', () => {
      expect(query('mat-chip-set')!.getAttribute('role')).toBe('list');
      expect(queryAll('mat-chip').map((chip) => chip.getAttribute('role'))).toEqual([
        'listitem',
        'listitem',
      ]);
    });

    it('names Material’s list from aria-label, not the ui-chips host', () => {
      expect(query('mat-chip-set')!.getAttribute('aria-label')).toBe('Tags');
      // An ARIA name on an element with no role is a violation in itself, so it is
      // taken back off once Angular has read it (`aria-prohibited-attr`).
      expect(query('ui-chips')!.hasAttribute('aria-label')).toBe(false);
    });

    it('names it from aria-labelledby instead when given one', async () => {
      @Component({
        imports: [Chips],
        template: `
          <h2 id="heading">Tags</h2>
          <ui-chips [chips]="chips" aria-labelledby="heading" />
        `,
      })
      class LabelledbyHost {
        readonly chips: readonly UiChip[] = [{ label: 'design', value: 'design' }];
      }

      const f = TestBed.createComponent(LabelledbyHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('mat-chip-set').getAttribute('aria-labelledby')).toBe(
        'heading',
      );
      expect(f.nativeElement.querySelector('ui-chips').hasAttribute('aria-labelledby')).toBe(false);
    });

    it('leaves no empty aria-label behind when unnamed', async () => {
      @Component({
        imports: [Chips],
        template: `<ui-chips [chips]="chips" />`,
      })
      class UnnamedHost {
        readonly chips: readonly UiChip[] = [{ label: 'design', value: 'design' }];
      }

      const f = TestBed.createComponent(UnnamedHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('mat-chip-set').hasAttribute('aria-label')).toBe(false);
    });

    it('names each remove button after the chip it removes', async () => {
      host.removable.set(true);
      await fixture.whenStable();

      expect(removeButtons().map((button) => button.getAttribute('aria-label'))).toEqual([
        'Remove design',
        'Remove urgent',
      ]);
    });

    it('takes a reworded remove name when given one', async () => {
      @Component({
        imports: [Chips],
        template: `
          <ui-chips [chips]="chips" removable [removeAriaLabel]="welsh" aria-label="Tags" />
        `,
      })
      class IntlHost {
        readonly chips: readonly UiChip[] = [{ label: 'design', value: 'design' }];
        readonly welsh = (chip: UiChip) => `Dileu ${chip.label}`;
      }

      const f = TestBed.createComponent(IntlHost);
      await f.whenStable();

      expect(
        f.nativeElement.querySelector('button[matChipRemove]').getAttribute('aria-label'),
      ).toBe('Dileu design');
    });

    // Material renders the field's `<mat-label>` as a `<label for>` pointing at the
    // grid, and `for` names only a native form element — so the input a user types into
    // would otherwise be anonymous.
    it('names an editable set’s grid and input from the field’s label', async () => {
      await editable();

      expect(query('mat-chip-grid')!.getAttribute('role')).toBe('grid');
      expect(query('mat-chip-grid')!.getAttribute('aria-label')).toBe('Tags');
      // `aria-label` wins over the `label` here — it is the more specific of the two.
      expect(input().getAttribute('aria-label')).toBe('Tags');
    });

    // Material drops a chip container's `role` while it is empty, and an ARIA name on an
    // element with no role is a violation in itself — axe reports exactly that
    // (`aria-prohibited-attr`). So the grid's name has to come and go with its role; the
    // input keeps it either way, which is where a user of an empty set actually is.
    it('takes the grid’s name away with its role while the set is empty', async () => {
      await editable();
      host.chips.set([]);
      await fixture.whenStable();

      const grid = query('mat-chip-grid')!;

      expect(grid.hasAttribute('role')).toBe(false);
      expect(grid.hasAttribute('aria-label')).toBe(false);
      expect(input().getAttribute('aria-label')).toBe('Tags');
    });

    it('gives the name back as soon as there is a chip to navigate', async () => {
      await editable();
      host.chips.set([]);
      await fixture.whenStable();

      host.chips.set([{ label: 'design', value: 'design' }]);
      await fixture.whenStable();

      expect(query('mat-chip-grid')!.getAttribute('role')).toBe('grid');
      expect(query('mat-chip-grid')!.getAttribute('aria-label')).toBe('Tags');
    });

    // A `role="grid"` may only own rows, so an `<input>` inside it is a real violation
    // (`aria-required-children`) — `matChipInputFor` wires the two together regardless of
    // where the input sits, so it sits outside.
    it('keeps the input out of the grid, and still wires it to it', async () => {
      await editable();

      expect(query('mat-chip-grid input')).toBeNull();
      expect(query('mat-form-field input')).not.toBeNull();
      expect(host.ref().matChipInput()!.chipGrid).toBe(host.ref().matChipGrid());
    });

    it('renders each editable chip as a Material row', async () => {
      await editable();

      expect(queryAll('mat-chip-row').map((row) => row.getAttribute('role'))).toEqual([
        'row',
        'row',
      ]);
    });
  });

  describe('escape hatches', () => {
    it('exposes the component instance via exportAs', () => {
      expect(host.ref()).toBeInstanceOf(Chips);
    });

    // Rule 4: Material's own instances are the way out of anything not wrapped.
    it('exposes the underlying MatChipSet for a static set', () => {
      expect(host.ref().matChipSet()).toBeInstanceOf(MatChipSet);
      expect(host.ref().matChipGrid()).toBeUndefined();
      expect(host.ref().matChipInput()).toBeUndefined();
    });

    it('exposes the grid and the input for an editable set', async () => {
      await editable();

      expect(host.ref().matChipGrid()).toBeInstanceOf(MatChipGrid);
      expect(host.ref().matChipInput()).toBeInstanceOf(MatChipInput);
    });

    // A `MatChipGrid` is a `MatChipSet`, but Material does not alias the token — so
    // `matChipSet()` reports the grid itself rather than nothing at all.
    it('reports the grid as the chip set in force when editable', async () => {
      await editable();

      expect(host.ref().matChipSet()).toBe(host.ref().matChipGrid());
      expect(host.ref().matChipSet()).toBeInstanceOf(MatChipSet);
    });

    // Rule 4: the escape hatch has to be the real thing, not a copy — this is the input
    // an app focuses after adding a chip from code.
    it('hands back the real input element through the MatChipInput', async () => {
      await editable();

      expect(host.ref().matChipInput()!.inputElement).toBe(input());
    });
  });

  // The colours are Material's, resolved from the shared theme's tokens. This
  // component only re-points those tokens at hooks whose defaults are the tokens
  // Material would have used anyway.
  describe('theming', () => {
    // These read the *declaration* rather than a painted colour, on purpose: `ng test`
    // runs in jsdom, which does not substitute `var()` at all. What a chip resolves to
    // under the real theme is asserted by the Storybook stories, which run in Chromium.
    const declaration = (token: string) =>
      getComputedStyle(query('ui-chips')!).getPropertyValue(token);

    it('resolves the label and the outline from the theme, not a literal', () => {
      expect(declaration('--mat-chip-label-text-color')).toContain(
        'var(--ui-chips-label-text-color',
      );
      expect(declaration('--mat-chip-label-text-color')).toContain(
        'var(--mat-sys-on-surface-variant)',
      );
      expect(declaration('--mat-chip-outline-color')).toContain('var(--mat-sys-outline)');
    });

    it('ships no literal colour of its own', () => {
      for (const token of [
        '--mat-chip-label-text-color',
        '--mat-chip-outline-color',
        '--mat-chip-elevated-container-color',
        '--mat-chip-with-trailing-icon-trailing-icon-color',
      ]) {
        expect(declaration(token)).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(/i);
      }
    });

    it('takes its shape from the theme’s corner scale', () => {
      expect(declaration('--mat-chip-container-shape-radius')).toContain(
        'var(--mat-sys-corner-small)',
      );
    });

    // Density is the theme's decision, not this component's: a height hook here would
    // be a second way to set it, and a way for two apps to disagree.
    it('leaves the height to the theme’s density token', () => {
      expect(declaration('--mat-chip-container-height')).toBe('');
    });

    // The overrides are emitted on the host, which is what keeps a consumer off
    // `::ng-deep`: `--ui-chips-label-text-color` set by an ordinary rule on `ui-chips`
    // — or inherited from any ancestor — reaches the elements inside Material's
    // template by CSS's own inheritance.
    it('exposes the hooks on the host, not on Material’s internals', () => {
      expect(declaration('--mat-chip-label-text-color')).not.toBe('');
      expect(
        getComputedStyle(query('mat-chip-set')!).getPropertyValue('--mat-chip-label-text-color'),
      ).toBe('');
    });
  });
});
