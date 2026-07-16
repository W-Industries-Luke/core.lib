import { JsonPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { NEVER, of, throwError, timer } from 'rxjs';
import { delay, switchMap } from 'rxjs/operators';

import {
  Typeahead,
  TypeaheadEmptyDef,
  TypeaheadErrorDef,
  TypeaheadHint,
  TypeaheadOptionDef,
  TypeaheadPrefix,
  TypeaheadSuffix,
  type UiTypeaheadAppearance,
  type UiTypeaheadResult,
  type UiTypeaheadSearch,
} from './typeahead';

const APPEARANCES: UiTypeaheadAppearance[] = ['fill', 'outline'];

/** A stand-in "server" — the sort of catalogue nobody would ship as a static `options` list. */
const REPOS: UiTypeaheadResult<string>[] = [
  'angular/angular',
  'angular/angular-cli',
  'angular/components',
  'facebook/react',
  'facebook/react-native',
  'vuejs/core',
  'sveltejs/svelte',
  'microsoft/typescript',
  'microsoft/vscode',
  'microsoft/playwright',
  'nodejs/node',
  'denoland/deno',
  'oven-sh/bun',
  'vitejs/vite',
  'webpack/webpack',
  'rollup/rollup',
  'storybookjs/storybook',
  'jestjs/jest',
  'vitest-dev/vitest',
  'cypress-io/cypress',
  'tailwindlabs/tailwindcss',
  'reactivex/rxjs',
  'ngrx/platform',
  'nrwl/nx',
  'prettier/prettier',
  'eslint/eslint',
].map((name) => ({ value: name, label: name }));

/** How long the fake API "takes", so the spinner is on screen long enough to see. */
const LATENCY_MS = 600;

/** The basic case: type, wait, get results — over a network that is not instant. */
const searchRepos: UiTypeaheadSearch<string> = (query) =>
  of(REPOS.filter((r) => r.label.toLowerCase().includes(query.toLowerCase()))).pipe(delay(LATENCY_MS));

/** A search that never comes back — parks the field in its loading state for the story. */
const searchForever: UiTypeaheadSearch<string> = () => NEVER;

/** A search that always comes back empty. */
const searchEmpty: UiTypeaheadSearch<string> = () => of<UiTypeaheadResult<string>[]>([]).pipe(delay(LATENCY_MS));

/** A search that fails after a beat, so the spinner gives way to the error state. */
const searchFailing: UiTypeaheadSearch<string> = () =>
  timer(LATENCY_MS).pipe(switchMap(() => throwError(() => new Error('Search API unavailable'))));

/** Fields are full-width by nature, so every story renders in a form-ish column. */
const frame = (content: string, width = '24rem') =>
  `<div style="max-width: ${width}; display: flex; flex-direction: column;">${content}</div>`;

/** Captions a grid cell, so a story is readable without opening the source. */
const caption = (text: string, content: string) => `
  <div style="display: flex; flex-direction: column;">
    ${content}
    <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${text}</span>
  </div>`;

const grid = (content: string, columns = 2) => `
  <div style="display: grid; grid-template-columns: repeat(${columns}, minmax(0, 20rem)); gap: 1rem 1.5rem;">
    ${content}
  </div>`;

const meta: Meta<Typeahead<string>> = {
  title: 'Components/Typeahead',
  component: Typeahead,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        Typeahead,
        TypeaheadPrefix,
        TypeaheadSuffix,
        TypeaheadHint,
        TypeaheadOptionDef,
        TypeaheadEmptyDef,
        TypeaheadErrorDef,
        FormsModule,
        ReactiveFormsModule,
        MatIcon,
        MatIconButton,
        JsonPipe,
      ],
    }),
  ],
  args: {
    label: 'Repository',
    placeholder: 'Search GitHub repositories…',
    minChars: 2,
    debounceMs: 300,
    appearance: 'outline',
    disabled: false,
    required: false,
    readonly: false,
    floatLabel: 'auto',
    subscriptSizing: 'fixed',
    noResultsText: 'No results found',
    errorText: 'Something went wrong. Try again.',
    loadingText: 'Searching',
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    hint: { control: 'text' },
    error: { control: 'text' },
    noResultsText: { control: 'text' },
    errorText: { control: 'text' },
    loadingText: { control: 'text' },
    minChars: { control: { type: 'number', min: 0, max: 5 } },
    debounceMs: { control: { type: 'number', min: 0, max: 2000, step: 50 } },
    appearance: { control: 'inline-radio', options: APPEARANCES },
    floatLabel: { control: 'inline-radio', options: ['auto', 'always'] },
    subscriptSizing: { control: 'inline-radio', options: ['fixed', 'dynamic'] },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    required: { control: 'boolean' },
    panelClass: { control: 'text' },
    panelWidth: { control: 'text' },
    value: { control: false },
    valueChange: { action: 'valueChange' },
    selected: { action: 'selected' },
    openedChange: { action: 'openedChange' },
    // Functions, not knobs — shown for real in the stories below.
    search: { control: false },
    displayWith: { control: false },
    ariaDescribedby: { name: 'aria-describedby', control: false },
    matFormField: { table: { disable: true } },
    matInput: { table: { disable: true } },
    matAutocomplete: { table: { disable: true } },
    matAutocompleteTrigger: { table: { disable: true } },
    inputElement: { table: { disable: true } },
    hasError: { table: { disable: true } },
    text: { table: { disable: true } },
    query: { table: { disable: true } },
    loading: { table: { disable: true } },
    searchError: { table: { disable: true } },
    results: { table: { disable: true } },
    hasNoResults: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-typeahead` is `ui-autocomplete`’s **remote** sibling: where that component filters a',
          'list it already holds, this one **fetches** the list as you type. Give it a `search`',
          'function that returns an `Observable` (or `Promise`) of results, and it owns the async',
          'plumbing — debounce, a minimum query length, cancelling stale requests, and the loading,',
          'empty and error states that come with talking to a network.',
          '',
          '### It is Material, and it shares #16’s shape',
          '',
          'The box, the overlay, the options, the keyboard and every colour are `<mat-form-field>`’s',
          'and `<mat-autocomplete>`’s own, from the shared theme’s `--mat-sys-*` tokens — so there is',
          'not a literal colour in `typeahead.scss`. A result is the same `{ value, label }` shape as',
          '`ui-autocomplete` (`UiTypeaheadResult` *is* `UiAutocompleteOption`), and the spinner and empty',
          'states are this library’s own `ui-spinner` and `ui-empty-state`.',
          '',
          '### The stale-response guarantee',
          '',
          'Type quickly and the requests race on the wire. `switchMap` **cancels** the one still in',
          'flight when the next keystroke arrives, so results for `reac` can never land after — and',
          'overwrite — results for `react`. An `Observable` search is unsubscribed (aborting an',
          '`HttpClient` request); a `Promise` search has its late result dropped. The field always',
          'shows the latest query’s answer.',
          '',
          '### Forms',
          '',
          '`ui-typeahead` is a `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]` and',
          '`formControlName` work with no adapter — bind the host. While you type the value is the',
          'text; when you pick a result it becomes that result’s `value`. See the **Forms** stories.',
          '',
          '> The stories use a fake in-memory “API” with ~600ms of latency, so the spinner, the empty',
          '> state and the error state are all visible. Type at least two characters to see them.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: { ...args, search: searchRepos },
    template: frame(`<ui-typeahead [search]="search" ${argsToTemplate(args)} />`),
  }),
};

export default meta;
type Story = StoryObj<Typeahead<string>>;

/**
 * The default field. Type a couple of letters (`ang`, `react`, `vite`) and, after the
 * debounce, the fake API answers. The value is the repo’s full name — watch the
 * `selected` and `valueChange` actions as you pick one.
 */
export const Default: Story = {};

// --- Basic -----------------------------------------------------------------

/**
 * The case a typeahead exists for: a catalogue far too large to ship as a static list,
 * searched over the network. Type `micro` for Microsoft’s repos, or `js`.
 */
export const Basic: Story = {
  args: {
    label: 'Repository',
    hint: 'Type at least two characters to search.',
  },
  render: (args) => ({
    props: { ...args, search: searchRepos },
    template: frame(`
      <ui-typeahead [search]="search" ${argsToTemplate(args)}>
        <mat-icon uiTypeaheadPrefix>search</mat-icon>
      </ui-typeahead>`),
  }),
};

// --- The four states -------------------------------------------------------

/**
 * **Loading.** While a search is in flight the panel shows a `<ui-spinner>`. This
 * field’s fake search never resolves, so the spinner stays — type two characters to
 * see it. In a real field it shows for as long as the request takes.
 */
export const Loading: Story = {
  args: { label: 'Repository', hint: 'This search never returns — the spinner stays.' },
  render: (args) => ({
    props: { ...args, search: searchForever },
    template: frame(`<ui-typeahead [search]="search" ${argsToTemplate(args)} />`),
  }),
};

/**
 * **No results.** A search that comes back empty shows a `<ui-empty-state>` with
 * `noResultsText`. Type anything — this field’s API always answers with an empty list.
 * Project a `uiTypeaheadEmpty` template for something richer (see **Custom states**).
 */
export const NoResults: Story = {
  args: { label: 'Repository', hint: 'This API always comes back empty.' },
  render: (args) => ({
    props: { ...args, search: searchEmpty },
    template: frame(`<ui-typeahead [search]="search" ${argsToTemplate(args)} />`),
  }),
};

/**
 * **Error.** A search that throws (or an erroring `Observable`, or a rejected `Promise`)
 * shows a `<ui-empty-state>` with `errorText`. The failure is caught, so the next
 * keystroke tries again rather than the field going dead. Type two characters — this
 * one fails every time.
 */
export const ErrorState: Story = {
  name: 'Error',
  args: { label: 'Repository', hint: 'This API fails every request.' },
  render: (args) => ({
    props: { ...args, search: searchFailing },
    template: frame(`<ui-typeahead [search]="search" ${argsToTemplate(args)} />`),
  }),
};

// --- Tuning ----------------------------------------------------------------

/**
 * **Min chars.** No request runs until the query is worth one. With `minChars` at 3,
 * `an` opens nothing; `ang` searches. It stops a one-letter query matching half the
 * catalogue, and it keeps the panel closed until there is something worth showing.
 */
export const MinChars: Story = {
  args: {
    label: 'Repository',
    minChars: 3,
    hint: 'Nothing happens until the third character.',
  },
};

/**
 * **Debounce.** A search runs a beat *after* you stop typing, not on every keystroke —
 * so a fast typist fires one request, not eight. This field’s debounce is dialled up to
 * 900ms to make the pause obvious; the default is a subtler 300ms.
 */
export const Debounce: Story = {
  args: {
    label: 'Repository',
    debounceMs: 900,
    hint: 'Search fires 900ms after you stop typing.',
  },
};

// --- Appearances -----------------------------------------------------------

/**
 * Both appearances. Neither carries a colour of its own — the container, the outline
 * and the label all resolve from the theme’s M3 tokens.
 */
export const Appearances: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { search: searchRepos },
    template: grid(
      APPEARANCES.map((appearance) =>
        caption(
          `appearance="${appearance}"`,
          `<ui-typeahead appearance="${appearance}" label="Repository"
             placeholder="Search…" [search]="search" />`,
        ),
      ).join('\n'),
    ),
  }),
};

// --- Custom content --------------------------------------------------------

/**
 * Rule 7: `uiTypeaheadOption` renders each result in place of its label, and is handed
 * the query, so highlighting the match — or a two-line result with an avatar — is a
 * template rather than an input this component would have to grow.
 */
export const CustomOptions: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { search: searchRepos },
    template: frame(`
      <ui-typeahead label="Repository" placeholder="Search…" [search]="search"
                    hint="Type “angular”.">
        <mat-icon uiTypeaheadPrefix>search</mat-icon>
        <ng-template uiTypeaheadOption let-repo let-query="query">
          <span style="display: inline-flex; align-items: center; gap: 0.5rem; width: 100%;">
            <mat-icon style="color: var(--mat-sys-on-surface-variant);">book</mat-icon>
            <span>{{ repo.label }}</span>
          </span>
        </ng-template>
      </ui-typeahead>`),
  }),
};

/**
 * Rule 7: a string cannot name the query that missed, and cannot offer a retry — which
 * is the point of an empty/error state. `uiTypeaheadEmpty` is handed the query;
 * `uiTypeaheadError` is handed the error.
 */
export const CustomStates: Story = {
  name: 'Custom empty and error',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { searchEmpty, searchFailing },
    template: grid(
      [
        caption(
          'uiTypeaheadEmpty · names the query',
          `<ui-typeahead label="Repository" placeholder="Type anything…" [search]="searchEmpty">
             <ng-template uiTypeaheadEmpty let-query>
               <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
                 <mat-icon style="color: var(--mat-sys-on-surface-variant);">travel_explore</mat-icon>
                 No repository matches “<strong>{{ query }}</strong>”.
               </span>
             </ng-template>
           </ui-typeahead>`,
        ),
        caption(
          'uiTypeaheadError · offers a way out',
          `<ui-typeahead label="Repository" placeholder="Type anything…" [search]="searchFailing">
             <ng-template uiTypeaheadError let-error>
               <span style="display: inline-flex; align-items: center; gap: 0.5rem;
                            color: var(--mat-sys-error);">
                 <mat-icon>error</mat-icon> {{ error.message }}
               </span>
             </ng-template>
           </ui-typeahead>`,
        ),
      ].join('\n'),
    ),
  }),
};

// --- Forms -----------------------------------------------------------------

/**
 * `[(ngModel)]` binds the host — `ui-typeahead` is a `ControlValueAccessor`, so there is
 * no adapter (rule 5). The model is the **text** while you type, and the result’s
 * `value` the moment you pick one.
 */
export const NgModel: Story = {
  name: 'Forms: [(ngModel)]',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { search: searchRepos, repo: null },
    template: frame(`
      <ui-typeahead label="Repository" placeholder="Search…" [search]="search" [(ngModel)]="repo" />
      <p style="font: var(--mat-sys-body-small); margin: 0;">
        repo: <strong>{{ repo ?? 'null' }}</strong>
      </p>`),
  }),
};

/**
 * The case a string-only API would force an adapter on: the result’s `value` is a whole
 * object, and that is what the form holds — no id in, no lookup out (rule 5).
 * `displayWith` turns the object back into the field’s text.
 */
export const ObjectValues: Story = {
  name: 'Forms: object values and displayWith',
  parameters: { controls: { disable: true } },
  render: () => {
    interface Repo {
      owner: string;
      name: string;
    }
    const search: UiTypeaheadSearch<Repo> = (query) =>
      of(
        REPOS.filter((r) => r.label.toLowerCase().includes(query.toLowerCase())).map((r) => {
          const [owner, name] = r.value.split('/');
          return { value: { owner, name }, label: r.label };
        }),
      ).pipe(delay(LATENCY_MS));

    return {
      props: {
        search,
        byName: (value: Repo | string | null) =>
          typeof value === 'string' ? value : value ? `${value.owner}/${value.name}` : '',
        control: new FormControl<Repo | string | null>(null),
      },
      template: frame(`
        <ui-typeahead label="Repository" placeholder="Search…" [search]="search"
                      [displayWith]="byName" [formControl]="control" />
        <p style="font: var(--mat-sys-body-small); margin: 0;">
          value: <strong>{{ control.value | json }}</strong>
        </p>`),
    };
  },
};

/**
 * The usual shape for a reactive form. `error` is a string this library shows on
 * demand — *when* to show it is the consumer’s call. Here it waits until the user has
 * been in and out of the field without picking anything.
 */
export const ReactiveValidation: Story = {
  name: 'Forms: reactive validation',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      search: searchRepos,
      control: new FormControl<string | null>(null, (c) =>
        typeof c.value === 'string' && c.value.includes('/') ? null : { notPicked: true },
      ),
    },
    template: frame(`
      <ui-typeahead
        label="Repository"
        required
        placeholder="Search…"
        hint="Pick one from the list."
        [search]="search"
        [formControl]="control"
        [error]="control.touched && control.hasError('notPicked') ? 'Pick a repository from the list.' : ''"
      />
      <p style="font: var(--mat-sys-body-small); margin: 0;">
        touched: <strong>{{ control.touched }}</strong> · valid: <strong>{{ control.valid }}</strong>
      </p>`),
  }),
};

// --- Slots -----------------------------------------------------------------

/**
 * `uiTypeaheadPrefix` and `uiTypeaheadSuffix` project into Material’s own icon slots.
 * The suffix here is a real clear button — `exportAs` hands back the component, so
 * clearing is `field.value.set(null)` with no host code.
 */
export const PrefixAndSuffix: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { search: searchRepos },
    template: frame(`
      <ui-typeahead #field="uiTypeahead" label="Repository" placeholder="Search…" [search]="search">
        <mat-icon uiTypeaheadPrefix>search</mat-icon>
        <button matIconButton uiTypeaheadSuffix type="button" aria-label="Clear"
                (click)="field.value.set(null)">
          <mat-icon>close</mat-icon>
        </button>
      </ui-typeahead>`),
  }),
};

// --- Styling hooks ---------------------------------------------------------

/**
 * `<ui-typeahead>` is a block and the field fills it, so sizing a field is an ordinary
 * rule on an ordinary selector — no `::ng-deep`. Set the width on the host; reach for
 * `--ui-typeahead-width` only when the field should not fill it.
 */
export const StylingHooks: Story = {
  name: 'Styling hooks: width',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { search: searchRepos },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; max-width: 34rem;">
        <ui-typeahead label="Sized by the host" style="width: 16rem;"
                      placeholder="Search…" [search]="search" />
        <ui-typeahead label="Sized by the hook" style="--ui-typeahead-width: max-content;"
                      placeholder="Search…" [search]="search"
                      hint="max-content — the field shrinks to its intrinsic width." />
      </div>`,
  }),
};
