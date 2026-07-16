import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatAutocompleteHarness } from '@angular/material/autocomplete/testing';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { Observable, of, Subject, throwError } from 'rxjs';

import {
  Typeahead,
  TypeaheadEmptyDef,
  TypeaheadErrorDef,
  TypeaheadLoadingDef,
  TypeaheadOptionDef,
  type UiTypeaheadResult,
  type UiTypeaheadSearch,
} from './typeahead';

/** The canned answer most stories that are not about the network itself are built from. */
const USERS: UiTypeaheadResult<string>[] = [
  { value: 'ada', label: 'Ada Lovelace' },
  { value: 'alan', label: 'Alan Turing' },
  { value: 'grace', label: 'Grace Hopper' },
];

/** Waits `ms` of real time. The suite is zoneless, so there is no `tick()`. */
const delay = (ms = 0): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

@Component({
  imports: [Typeahead],
  template: `
    <ui-typeahead
      #ref="uiTypeahead"
      [label]="label()"
      [search]="search()"
      [minChars]="minChars()"
      [debounceMs]="debounceMs()"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [error]="error()"
      [noResultsText]="noResultsText()"
      [errorText]="errorText()"
      [(value)]="value"
      (selected)="chosen.set($event)"
      (openedChange)="opened.set($event)"
    />
  `,
})
class TestHost {
  readonly label = signal<string | undefined>('User');
  readonly search = signal<UiTypeaheadSearch<string> | undefined>(undefined);
  readonly minChars = signal(2);
  // Short but non-zero, so a burst still collapses to one search while the tests stay fast.
  readonly debounceMs = signal(10);
  readonly placeholder = signal<string | undefined>(undefined);
  readonly disabled = signal(false);
  readonly error = signal<string | undefined>(undefined);
  readonly noResultsText = signal('No results found');
  readonly errorText = signal('Something went wrong. Try again.');
  readonly value = signal<string | null>(null);
  readonly chosen = signal<UiTypeaheadResult<string> | null>(null);
  readonly opened = signal(false);
  readonly ref = viewChild.required<Typeahead<string>>('ref');
}

describe('Typeahead', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let loader: HarnessLoader;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  const inputElement = (f: ComponentFixture<unknown> = fixture): HTMLInputElement =>
    f.nativeElement.querySelector('input');

  const autocomplete = (f: ComponentFixture<unknown> = fixture): Promise<MatAutocompleteHarness> =>
    (f === fixture ? loader : TestbedHarnessEnvironment.loader(f)).getHarness(MatAutocompleteHarness);

  const optionLabels = async (f: ComponentFixture<unknown> = fixture): Promise<string[]> =>
    Promise.all((await (await autocomplete(f)).getOptions()).map((o) => o.getText()));

  /** The option labels as rendered in the overlay — read without the harness's open check. */
  const renderedOptions = (): string[] =>
    Array.from(document.querySelectorAll('mat-option')).map((o) => o.textContent!.trim());

  /** Types into the field the way a user does — focusing it first, as a real one has. */
  const type = async (text: string, f: ComponentFixture<unknown> = fixture): Promise<void> => {
    const input = inputElement(f);
    input.focus();
    input.dispatchEvent(new Event('focusin'));
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await f.whenStable();
  };

  /**
   * Types, then lets the debounce elapse and a synchronous search settle. The wait is
   * comfortably longer than the field's `debounceMs`, so the pipeline has run by the
   * time this resolves.
   */
  const search = async (text: string, f: ComponentFixture<unknown> = fixture): Promise<void> => {
    await type(text, f);
    await delay(40);
    await f.whenStable();
  };

  beforeEach(async () => {
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  // The point of this library: the control is Material's, not a lookalike.
  describe('composition', () => {
    it('renders Material’s form field around Material’s input and panel', () => {
      expect(query('mat-form-field')).not.toBeNull();
      expect(host.ref().matFormField()).toBeInstanceOf(MatFormField);
      expect(host.ref().matInput()).toBeInstanceOf(MatInput);
      expect(host.ref().matAutocomplete()).toBeInstanceOf(MatAutocomplete);
      expect(host.ref().matAutocompleteTrigger()).toBeInstanceOf(MatAutocompleteTrigger);
    });

    it('renders the control as a combobox, as ARIA wants', () => {
      expect(inputElement().getAttribute('role')).toBe('combobox');
      expect(inputElement().getAttribute('aria-autocomplete')).toBe('list');
    });

    it('renders exactly one control', () => {
      expect(fixture.nativeElement.querySelectorAll('input').length).toBe(1);
    });
  });

  // The behaviour this component exists for. Requirement: cover the debounce and the
  // stale-response race.
  describe('the async pipeline', () => {
    it('runs the search with what was typed, and shows what comes back', async () => {
      host.search.set((q) => of(USERS.filter((u) => u.label.toLowerCase().includes(q.toLowerCase()))));

      // "la" is in both "Ada Lovelace" and "Alan Turing", but not "Grace Hopper".
      await search('la');

      expect(host.ref().results().map((r) => r.label)).toEqual(['Ada Lovelace', 'Alan Turing']);
      expect(renderedOptions()).toEqual(['Ada Lovelace', 'Alan Turing']);
    });

    it('accepts a search that returns a Promise, not only an Observable', async () => {
      host.search.set((q) => Promise.resolve([{ value: q, label: 'From a promise' }]));

      await search('react');

      expect(host.ref().results().map((r) => r.label)).toEqual(['From a promise']);
    });

    it('hands the search the trimmed query', async () => {
      const seen: string[] = [];
      host.search.set((q) => {
        seen.push(q);
        return of([]);
      });

      await search('   ada  ');

      expect(seen).toEqual(['ada']);
    });

    // Requirement: the debounce.
    it('debounces — a burst of keystrokes runs one search, for the final query', async () => {
      const calls: string[] = [];
      host.debounceMs.set(50);
      host.search.set((q) => {
        calls.push(q);
        return of([{ value: q, label: q }]);
      });
      await fixture.whenStable();

      // Five keystrokes, each within the 50ms window of the last (the awaits are
      // microtask-fast).
      await type('r');
      await type('re');
      await type('rea');
      await type('reac');
      await type('react');
      expect(calls).toEqual([]);

      await delay(80);
      await fixture.whenStable();

      expect(calls).toEqual(['react']);
    });

    // Requirement: the stale-response race. This is the whole reason to reach for
    // switchMap — a slow earlier request must never land on top of a newer one.
    it('never lets a stale response overwrite a newer one (switchMap semantics)', async () => {
      const pending = new Map<string, Subject<readonly UiTypeaheadResult<string>[]>>();
      host.debounceMs.set(5);
      host.search.set((q) => {
        const subject = new Subject<readonly UiTypeaheadResult<string>[]>();
        pending.set(q, subject);
        return subject.asObservable();
      });
      await fixture.whenStable();

      // Fire the slow search first, then a newer one — both are now in flight as far as
      // the wire is concerned.
      await type('reac');
      await delay(15);
      await type('react');
      await delay(15);

      expect(pending.has('reac')).toBe(true);
      expect(pending.has('react')).toBe(true);

      // The newer query answers first.
      pending.get('react')!.next([{ value: 'r', label: 'React' }]);
      await fixture.whenStable();
      expect(host.ref().results().map((r) => r.label)).toEqual(['React']);

      // Now the stale one answers, late. switchMap has already unsubscribed it, so this
      // is dropped rather than clobbering the fresher result.
      pending.get('reac')!.next([{ value: 's', label: 'Stale — must not win' }]);
      await fixture.whenStable();
      expect(host.ref().results().map((r) => r.label)).toEqual(['React']);
    });

    it('aborts the in-flight request when the query changes (unsubscribes the source)', async () => {
      let unsubscribed = false;
      host.debounceMs.set(5);
      host.search.set(
        () =>
          new Observable<readonly UiTypeaheadResult<string>[]>(() => {
            // The teardown an HttpClient would use to abort its request.
            return () => (unsubscribed = true);
          }),
      );
      await fixture.whenStable();

      await type('reac');
      await delay(15);
      expect(unsubscribed).toBe(false);

      // A newer query supersedes the first — switchMap unsubscribes the earlier source.
      await type('react');
      await delay(15);

      expect(unsubscribed).toBe(true);
    });
  });

  describe('minChars', () => {
    it('runs no search until the query reaches minChars', async () => {
      const calls: string[] = [];
      host.minChars.set(3);
      host.search.set((q) => {
        calls.push(q);
        return of([{ value: q, label: q }]);
      });
      await fixture.whenStable();

      await search('re');
      expect(calls).toEqual([]);
      expect(host.ref().loading()).toBe(false);

      await search('rea');
      expect(calls).toEqual(['rea']);
    });

    it('closes back to idle when the query drops under minChars again', async () => {
      host.minChars.set(3);
      host.search.set((q) => of([{ value: q, label: q }]));
      await fixture.whenStable();

      await search('react');
      expect(host.ref().results().length).toBe(1);

      await search('re');
      expect(host.ref().results()).toEqual([]);
      expect(host.ref().loading()).toBe(false);
    });

    it('defaults to two characters', () => {
      expect(host.ref().minChars()).toBe(2);
    });
  });

  describe('the loading state', () => {
    it('shows a spinner while a search is in flight, then the results', async () => {
      const subject = new Subject<readonly UiTypeaheadResult<string>[]>();
      host.debounceMs.set(5);
      host.search.set(() => subject.asObservable());
      await fixture.whenStable();

      await search('react');

      expect(host.ref().loading()).toBe(true);
      expect(document.querySelector('ui-spinner')).not.toBeNull();

      subject.next([{ value: 'r', label: 'React' }]);
      await fixture.whenStable();

      expect(host.ref().loading()).toBe(false);
      expect(document.querySelector('ui-spinner')).toBeNull();
      expect(await optionLabels()).toEqual(['React']);
    });
  });

  describe('the empty state', () => {
    it('shows a ui-empty-state with noResultsText when a search returns nothing', async () => {
      host.search.set(() => of([]));

      await search('zzz');

      expect(host.ref().hasNoResults()).toBe(true);
      const empty = document.querySelector('ui-empty-state');
      expect(empty).not.toBeNull();
      expect(empty!.textContent).toContain('No results found');
    });

    it('is not choosable and does not become the value', async () => {
      host.search.set(() => of([]));
      await search('zzz');

      const [only] = await (await autocomplete()).getOptions();
      expect(await only.isDisabled()).toBe(true);
    });
  });

  describe('the error state', () => {
    it('shows a ui-empty-state with errorText when the search throws', async () => {
      host.search.set(() => throwError(() => new Error('network down')));

      await search('react');

      expect(host.ref().searchError()).toBeInstanceOf(Error);
      expect(host.ref().loading()).toBe(false);
      const errored = document.querySelector('.ui-typeahead__error ui-empty-state');
      expect(errored).not.toBeNull();
      expect(errored!.textContent).toContain('Something went wrong');
    });

    it('recovers on the next keystroke — one failure does not kill the pipeline', async () => {
      let attempt = 0;
      host.search.set((q) => {
        attempt += 1;
        return attempt === 1 ? throwError(() => new Error('flaky')) : of([{ value: q, label: q }]);
      });

      await search('one');
      expect(host.ref().searchError()).not.toBeNull();

      await search('two');
      expect(host.ref().searchError()).toBeNull();
      expect(host.ref().results().map((r) => r.label)).toEqual(['two']);
    });
  });

  describe('selecting a result', () => {
    beforeEach(async () => {
      host.search.set((q) => of(USERS.filter((u) => u.label.toLowerCase().includes(q.toLowerCase()))));
    });

    it('emits the whole result and writes its value', async () => {
      await search('ada');
      await (await autocomplete()).selectOption({ text: 'Ada Lovelace' });
      await fixture.whenStable();

      expect(host.chosen()).toEqual({ value: 'ada', label: 'Ada Lovelace' });
      expect(host.value()).toBe('ada');
    });

    it('shows the chosen result’s label in the box, not its raw value', async () => {
      await search('grace');
      await (await autocomplete()).selectOption({ text: 'Grace Hopper' });
      await fixture.whenStable();

      expect(inputElement().value).toBe('Grace Hopper');
    });

    it('does not emit for text the user merely types', async () => {
      await search('ada');

      expect(host.chosen()).toBeNull();
      expect(host.value()).toBe('ada');
    });

    it('holds a result value that need not be a string', async () => {
      @Component({
        imports: [Typeahead],
        template: `<ui-typeahead label="User" [search]="search" [debounceMs]="5" [(value)]="value" />`,
      })
      class ObjectHost {
        readonly value = signal<{ id: number } | string | null>(null);
        readonly search = (): ReturnType<UiTypeaheadSearch<{ id: number }>> =>
          of([{ value: { id: 7 }, label: 'Seven' }]);
      }

      const f = TestBed.createComponent(ObjectHost);
      await f.whenStable();
      await search('sev', f);
      await (await autocomplete(f)).selectOption({ text: 'Seven' });
      await f.whenStable();

      expect(f.componentInstance.value()).toEqual({ id: 7 });
    });
  });

  // Rule 5: `[(ngModel)]` and reactive forms with no adapter.
  describe('ControlValueAccessor', () => {
    it('writes a chosen result back to an ngModel', async () => {
      @Component({
        imports: [Typeahead, FormsModule],
        template: `<ui-typeahead label="User" [search]="search" [debounceMs]="5" [(ngModel)]="user" />`,
      })
      class ModelHost {
        readonly user = signal<string | null>(null);
        readonly search: UiTypeaheadSearch<string> = (q) =>
          of(USERS.filter((u) => u.label.toLowerCase().includes(q.toLowerCase())));
      }

      const f = TestBed.createComponent(ModelHost);
      await f.whenStable();
      await search('alan', f);
      await (await autocomplete(f)).selectOption({ text: 'Alan Turing' });
      await f.whenStable();

      expect(f.componentInstance.user()).toBe('alan');
    });

    it('renders a value written by a reactive control through displayWith', async () => {
      interface User {
        id: string;
        name: string;
      }

      @Component({
        imports: [Typeahead, ReactiveFormsModule],
        template: `
          <ui-typeahead label="User" [search]="search" [displayWith]="byName" [formControl]="control" />
        `,
      })
      class ReactiveHost {
        readonly control = new FormControl<User | string | null>({ id: 'ada', name: 'Ada Lovelace' });
        readonly byName = (value: User | string | null) =>
          typeof value === 'string' ? value : (value?.name ?? '');
        readonly search: UiTypeaheadSearch<User> = () => of([]);
      }

      const f = TestBed.createComponent(ReactiveHost);
      await f.whenStable();

      expect(inputElement(f).value).toBe('Ada Lovelace');
    });

    it('disables the control when the form disables it', async () => {
      @Component({
        imports: [Typeahead, ReactiveFormsModule],
        template: `<ui-typeahead label="User" [search]="search" [formControl]="control" />`,
      })
      class DisabledHost {
        readonly control = new FormControl({ value: null, disabled: true });
        readonly search: UiTypeaheadSearch<string> = () => of([]);
      }

      const f = TestBed.createComponent(DisabledHost);
      await f.whenStable();

      expect(inputElement(f).disabled).toBe(true);
    });

    it('marks the control touched on blur', async () => {
      @Component({
        imports: [Typeahead, FormsModule],
        template: `
          <ui-typeahead label="User" [search]="search" [(ngModel)]="user" #model="ngModel" />
        `,
      })
      class ModelHost {
        readonly user = signal<string | null>(null);
        readonly search: UiTypeaheadSearch<string> = () => of([]);
        readonly model = viewChild.required<{ touched: boolean }>('model');
      }

      const f = TestBed.createComponent(ModelHost);
      await f.whenStable();
      expect(f.componentInstance.model().touched).toBe(false);

      await (await autocomplete(f)).blur();

      expect(f.componentInstance.model().touched).toBe(true);
    });
  });

  describe('disabled', () => {
    it('disables Material’s control', async () => {
      host.disabled.set(true);
      await fixture.whenStable();

      expect(inputElement().disabled).toBe(true);
      expect(query('mat-form-field')!.classList).toContain('mat-form-field-disabled');
    });

    it('reads the bare attribute as true', async () => {
      @Component({
        imports: [Typeahead],
        template: `<ui-typeahead label="User" disabled [search]="search" />`,
      })
      class AttrHost {
        readonly search: UiTypeaheadSearch<string> = () => of([]);
      }

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();

      expect(inputElement(f).disabled).toBe(true);
    });
  });

  // `error` is the form-validation message, distinct from a failed search.
  describe('error (form validation)', () => {
    it('puts Material’s field into its error state while set', async () => {
      host.error.set('Pick a user from the list.');
      await fixture.whenStable();

      expect(query('mat-error')!.textContent!.trim()).toBe('Pick a user from the list.');
      expect(host.ref().matInput().errorState).toBe(true);
      expect(inputElement().getAttribute('aria-invalid')).toBe('true');
    });

    it('ignores a blank message', async () => {
      host.error.set('   ');
      await fixture.whenStable();

      expect(host.ref().hasError()).toBe(false);
      expect(query('mat-error')).toBeNull();
    });
  });

  describe('openedChange', () => {
    it('emits when the panel opens and closes', async () => {
      host.search.set(() => of(USERS));
      expect(host.opened()).toBe(false);

      await search('a');
      // A one-char query is under the default minChars of 2, so nothing opened yet.
      expect(host.opened()).toBe(false);

      await search('ada');
      expect(host.opened()).toBe(true);

      host.ref().matAutocompleteTrigger().closePanel();
      await fixture.whenStable();
      expect(host.opened()).toBe(false);
    });
  });

  describe('slots and custom content (rule 7)', () => {
    it('renders each result through a uiTypeaheadOption template, handed the query', async () => {
      @Component({
        imports: [Typeahead, TypeaheadOptionDef],
        template: `
          <ui-typeahead label="User" [search]="search" [debounceMs]="5">
            <ng-template uiTypeaheadOption let-user let-q="query">
              <span class="name">{{ user.label }}</span>
              <span class="q">{{ q }}</span>
            </ng-template>
          </ui-typeahead>
        `,
      })
      class OptionHost {
        readonly search: UiTypeaheadSearch<string> = () => of(USERS);
      }

      const f = TestBed.createComponent(OptionHost);
      await f.whenStable();
      await search('ada', f);

      expect(document.querySelector('mat-option .name')!.textContent).toBe('Ada Lovelace');
      expect(document.querySelector('mat-option .q')!.textContent).toBe('ada');
    });

    it('renders a uiTypeaheadEmpty template in place of the default empty state', async () => {
      @Component({
        imports: [Typeahead, TypeaheadEmptyDef],
        template: `
          <ui-typeahead label="User" [search]="search" [debounceMs]="5">
            <ng-template uiTypeaheadEmpty let-q>
              <span class="empty">Nobody matches “{{ q }}”.</span>
            </ng-template>
          </ui-typeahead>
        `,
      })
      class EmptyHost {
        readonly search: UiTypeaheadSearch<string> = () => of([]);
      }

      const f = TestBed.createComponent(EmptyHost);
      await f.whenStable();
      await search('zzz', f);

      expect(document.querySelector('.empty')!.textContent).toContain('Nobody matches “zzz”');
      expect(document.querySelector('ui-empty-state')).toBeNull();
    });

    it('renders a uiTypeaheadError template in place of the default error state', async () => {
      @Component({
        imports: [Typeahead, TypeaheadErrorDef],
        template: `
          <ui-typeahead label="User" [search]="search" [debounceMs]="5">
            <ng-template uiTypeaheadError let-err>
              <span class="err">Failed: {{ $any(err).message }}</span>
            </ng-template>
          </ui-typeahead>
        `,
      })
      class ErrorHost {
        readonly search: UiTypeaheadSearch<string> = () => throwError(() => new Error('boom'));
      }

      const f = TestBed.createComponent(ErrorHost);
      await f.whenStable();
      await search('react', f);

      expect(document.querySelector('.err')!.textContent).toContain('Failed: boom');
    });

    it('renders a uiTypeaheadLoading template in place of the default spinner', async () => {
      @Component({
        imports: [Typeahead, TypeaheadLoadingDef],
        template: `
          <ui-typeahead label="User" [search]="search" [debounceMs]="5">
            <ng-template uiTypeaheadLoading>
              <span class="pending">Looking…</span>
            </ng-template>
          </ui-typeahead>
        `,
      })
      class LoadingHost {
        readonly subject = new Subject<readonly UiTypeaheadResult<string>[]>();
        readonly search: UiTypeaheadSearch<string> = () => this.subject.asObservable();
      }

      const f = TestBed.createComponent(LoadingHost);
      await f.whenStable();
      await search('react', f);

      expect(document.querySelector('.pending')!.textContent).toContain('Looking…');
      expect(document.querySelector('ui-spinner')).toBeNull();
    });
  });

  // Rule 3: what a consumer writes on the wrapper reaches the real input.
  describe('native attributes reach the real input', () => {
    it('moves data-*, aria-label and tabindex onto the input, leaving class on the wrapper', async () => {
      @Component({
        imports: [Typeahead],
        template: `
          <ui-typeahead
            class="mine"
            label="User"
            tabindex="3"
            data-testid="user-field"
            aria-label="Search users"
            [search]="search"
          />
        `,
      })
      class AttrHost {
        readonly search: UiTypeaheadSearch<string> = () => of([]);
      }

      const f = TestBed.createComponent(AttrHost);
      await f.whenStable();
      const wrapper = f.nativeElement.querySelector('ui-typeahead');
      const input = inputElement(f);

      expect(input.dataset['testid']).toBe('user-field');
      expect(input.getAttribute('aria-label')).toBe('Search users');
      expect(input.getAttribute('tabindex')).toBe('3');
      expect(wrapper.hasAttribute('tabindex')).toBe(false);
      expect(wrapper.classList).toContain('mine');
    });
  });

  describe('escape hatches', () => {
    it('exposes the component via exportAs and the Material instances underneath', () => {
      expect(host.ref()).toBeInstanceOf(Typeahead);
      expect(host.ref().matInput()).toBeInstanceOf(MatInput);
      expect(host.ref().matFormField()).toBeInstanceOf(MatFormField);
      expect(host.ref().matAutocomplete()).toBeInstanceOf(MatAutocomplete);
      expect(host.ref().inputElement().nativeElement).toBe(inputElement());
    });
  });
});
