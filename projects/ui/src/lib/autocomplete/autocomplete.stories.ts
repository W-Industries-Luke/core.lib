import { JsonPipe } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule, type ValidatorFn } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Button } from '../button/button';
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

const APPEARANCES: UiAutocompleteAppearance[] = ['fill', 'outline'];

/** The short list every story that is not about the list itself is built from. */
const COUNTRIES: UiAutocompleteOption<string>[] = [
  { value: 'gb', label: 'United Kingdom' },
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany' },
  { value: 'es', label: 'Spain' },
  { value: 'jp', label: 'Japan', disabled: true },
];

/**
 * The case an autocomplete exists for: a list nobody would scroll. This is what a
 * `ui-select` cannot do — 100 options in a panel is a search, not a choice.
 */
const AIRPORTS: UiAutocompleteOption<string>[] = [
  ['LHR', 'London Heathrow'],
  ['LGW', 'London Gatwick'],
  ['STN', 'London Stansted'],
  ['LTN', 'London Luton'],
  ['LCY', 'London City'],
  ['MAN', 'Manchester'],
  ['BHX', 'Birmingham'],
  ['EDI', 'Edinburgh'],
  ['GLA', 'Glasgow'],
  ['BRS', 'Bristol'],
  ['NCL', 'Newcastle'],
  ['LPL', 'Liverpool John Lennon'],
  ['BFS', 'Belfast International'],
  ['LBA', 'Leeds Bradford'],
  ['ABZ', 'Aberdeen'],
  ['SOU', 'Southampton'],
  ['EMA', 'East Midlands'],
  ['CWL', 'Cardiff'],
  ['NWI', 'Norwich'],
  ['EXT', 'Exeter'],
  ['CDG', 'Paris Charles de Gaulle'],
  ['ORY', 'Paris Orly'],
  ['AMS', 'Amsterdam Schiphol'],
  ['FRA', 'Frankfurt'],
  ['MUC', 'Munich'],
  ['BER', 'Berlin Brandenburg'],
  ['MAD', 'Madrid Barajas'],
  ['BCN', 'Barcelona El Prat'],
  ['FCO', 'Rome Fiumicino'],
  ['MXP', 'Milan Malpensa'],
  ['LIS', 'Lisbon'],
  ['DUB', 'Dublin'],
  ['CPH', 'Copenhagen'],
  ['ARN', 'Stockholm Arlanda'],
  ['OSL', 'Oslo Gardermoen'],
  ['HEL', 'Helsinki Vantaa'],
  ['VIE', 'Vienna'],
  ['ZRH', 'Zurich'],
  ['GVA', 'Geneva'],
  ['BRU', 'Brussels'],
  ['PRG', 'Prague'],
  ['WAW', 'Warsaw Chopin'],
  ['BUD', 'Budapest'],
  ['ATH', 'Athens'],
  ['IST', 'Istanbul'],
  ['JFK', 'New York JFK'],
  ['EWR', 'New York Newark'],
  ['LAX', 'Los Angeles'],
  ['SFO', 'San Francisco'],
  ['ORD', 'Chicago O’Hare'],
  ['ATL', 'Atlanta'],
  ['MIA', 'Miami'],
  ['BOS', 'Boston Logan'],
  ['SEA', 'Seattle Tacoma'],
  ['DEN', 'Denver'],
  ['YYZ', 'Toronto Pearson'],
  ['YVR', 'Vancouver'],
  ['GRU', 'São Paulo Guarulhos'],
  ['EZE', 'Buenos Aires Ezeiza'],
  ['MEX', 'Mexico City'],
  ['NRT', 'Tokyo Narita'],
  ['HND', 'Tokyo Haneda'],
  ['ICN', 'Seoul Incheon'],
  ['PEK', 'Beijing Capital'],
  ['PVG', 'Shanghai Pudong'],
  ['HKG', 'Hong Kong'],
  ['SIN', 'Singapore Changi'],
  ['BKK', 'Bangkok Suvarnabhumi'],
  ['KUL', 'Kuala Lumpur'],
  ['DEL', 'Delhi Indira Gandhi'],
  ['BOM', 'Mumbai'],
  ['DXB', 'Dubai International'],
  ['AUH', 'Abu Dhabi'],
  ['DOH', 'Doha Hamad'],
  ['TLV', 'Tel Aviv Ben Gurion'],
  ['CAI', 'Cairo'],
  ['JNB', 'Johannesburg'],
  ['CPT', 'Cape Town'],
  ['NBO', 'Nairobi'],
  ['LOS', 'Lagos'],
  ['SYD', 'Sydney'],
  ['MEL', 'Melbourne'],
  ['BNE', 'Brisbane'],
  ['PER', 'Perth'],
  ['AKL', 'Auckland'],
].map(([value, label]) => ({ value, label }));

/** Fields are full-width by nature, so every story renders in a form-ish column. */
const frame = (content: string, width = '22rem') =>
  `<div style="max-width: ${width}; display: flex; flex-direction: column;">${content}</div>`;

/** Captions a grid cell, so a story is readable without opening the source. */
const caption = (text: string, content: string) => `
  <div style="display: flex; flex-direction: column;">
    ${content}
    <span style="font: var(--mat-sys-label-small); color: var(--mat-sys-on-surface-variant);">${text}</span>
  </div>`;

const grid = (content: string, columns = 2) => `
  <div style="display: grid; grid-template-columns: repeat(${columns}, minmax(0, 18rem)); gap: 1rem 1.5rem;">
    ${content}
  </div>`;

const meta: Meta<Autocomplete<string>> = {
  title: 'Components/Autocomplete',
  component: Autocomplete,
  tags: ['autodocs'],
  decorators: [
    // The projection markers, plus the pieces the slot and form stories are built
    // from: Material's button and `<mat-icon>`, and this library's `uiButton` —
    // which needs `MatButton` alongside it, since it decorates Material's button
    // rather than replacing it.
    moduleMetadata({
      imports: [
        Autocomplete,
        AutocompletePrefix,
        AutocompleteSuffix,
        AutocompleteHint,
        AutocompleteOptionDef,
        AutocompleteEmptyDef,
        FormsModule,
        ReactiveFormsModule,
        MatIcon,
        MatButton,
        MatIconButton,
        Button,
        // For the `Forms: object values` story, which shows the object the control
        // actually holds.
        JsonPipe,
      ],
    }),
  ],
  args: {
    label: 'Country',
    options: COUNTRIES,
    appearance: 'outline',
    disabled: false,
    required: false,
    readonly: false,
    hideRequiredMarker: false,
    hideSingleSelectionIndicator: false,
    autoActiveFirstOption: false,
    autoSelectActiveOption: false,
    floatLabel: 'auto',
    subscriptSizing: 'fixed',
    panelPosition: 'auto',
    value: null,
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    hint: { control: 'text' },
    error: { control: 'text' },
    noResultsText: { control: 'text' },
    options: { control: 'object' },
    appearance: { control: 'inline-radio', options: APPEARANCES },
    floatLabel: { control: 'inline-radio', options: ['auto', 'always'] },
    subscriptSizing: { control: 'inline-radio', options: ['fixed', 'dynamic'] },
    panelPosition: { control: 'inline-radio', options: ['auto', 'above', 'below'] },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    required: { control: 'boolean' },
    hideRequiredMarker: { control: 'boolean' },
    hideSingleSelectionIndicator: { control: 'boolean' },
    autoActiveFirstOption: { control: 'boolean' },
    autoSelectActiveOption: { control: 'boolean' },
    panelClass: { control: 'text' },
    panelWidth: { control: 'text' },
    panelAriaLabel: { control: 'text' },
    value: { control: false },
    valueChange: { action: 'valueChange' },
    optionSelected: { action: 'optionSelected' },
    openedChange: { action: 'openedChange' },
    // Functions, not knobs — the stories below are where they are shown for real.
    displayWith: { control: false },
    filterWith: { control: false },
    // Documented in the table but not a knob: the input is aliased to the ARIA
    // attribute, which `argsToTemplate` cannot bind — it writes the class member
    // name. The `Native attributes` story covers it for real.
    ariaDescribedby: { name: 'aria-describedby', control: false },
    matFormField: { table: { disable: true } },
    matInput: { table: { disable: true } },
    matAutocomplete: { table: { disable: true } },
    matAutocompleteTrigger: { table: { disable: true } },
    inputElement: { table: { disable: true } },
    hasError: { table: { disable: true } },
    text: { table: { disable: true } },
    filteredOptions: { table: { disable: true } },
    hasNoResults: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-autocomplete` is the shared theme applied to Angular Material’s `<mat-form-field>`',
          'around an `<input matInput>` with a `<mat-autocomplete>` panel, wired as a form control',
          '**and filtered as you type**. Like `ui-input` and `ui-select`, and unlike `uiButton`, it is',
          'a **component** rather than a directive: an autocomplete owns *composition* — a container,',
          'a floating label, a text box, an overlay panel of suggestions, and a subscript that is',
          'either a hint or an error.',
          '',
          '`<input list>` is not the element it decorates, either: a native datalist cannot be styled,',
          'cannot suggest **an object rather than a string**, and cannot render a suggestion as',
          'anything but text.',
          '',
          '### It is Material, not a re-implementation',
          '',
          'The box, the outline, the floating label, the overlay and its elevation and animation, the',
          'options and their ripples, the `combobox`/`listbox` roles, the roving',
          '`aria-activedescendant`, the arrow keys, Enter, Escape and every colour are Material’s own,',
          'resolved from the `--mat-sys-*` tokens the shared theme emits. There is not a literal colour',
          'in `autocomplete.scss`, so every story below renders the exact palette a consuming app gets —',
          'toggle your OS light/dark preference to watch them follow.',
          '',
          'What this adds is the **filtering**, which Material deliberately leaves to the consumer —',
          'every one of its own examples ships a `startWith`/`map` pipeline over a form control. Here:',
          '`options` in, filtered as you type. The default is case-insensitive and matches anywhere in',
          'an option’s label; `filterWith` replaces it. See the **Filtering** stories.',
          '',
          '### Forms and the value',
          '',
          '`ui-autocomplete` is a `ControlValueAccessor`, so `[(ngModel)]`, `[formControl]` and',
          '`formControlName` work with no adapter — bind the host, not the input inside it. `[(value)]`',
          'is the same state without a forms directive.',
          '',
          'The value is Material’s own model, and it is worth being plain about: **while the user types,',
          'the value is the text they typed**; when they choose a suggestion it becomes that option’s',
          '`value` — an object, if that is what `options` holds. A box someone can type anything into',
          'cannot report otherwise without throwing away what they wrote. A field that must end up',
          'holding an option’s value wants a validator: see **Forms: only from the list**.',
          '',
          '### Custom content',
          '',
          '`uiAutocompleteOption` renders a suggestion as something other than its label — it is handed',
          'the text typed so far, so highlighting the match is a template rather than an input this',
          'component would have to grow. `uiAutocompleteEmpty` renders the panel when nothing matches.',
          'See the **Slots** stories.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: frame(`<ui-autocomplete ${argsToTemplate(args)} />`),
  }),
};

export default meta;
type Story = StoryObj<Autocomplete<string>>;

/**
 * The default field: `outline`, with a label and a list. Focus it to see every
 * suggestion, then type to filter — `an` leaves France and Germany.
 */
export const Default: Story = {};

// --- Basic -----------------------------------------------------------------

/**
 * The basic field. Focus it and the whole list is there; type and it narrows.
 *
 * The value is the option’s `value` (`'fr'`), not its label — watch the `valueChange`
 * and `optionSelected` actions as you pick one. `Japan` is `disabled: true`: one
 * suggestion unavailable while the rest still work.
 */
export const Basic: Story = {
  args: { label: 'Country', hint: 'Type to search, or pick from the list.' },
};

/** A field that already holds a value shows its **label**, not the raw `'fr'`. */
export const WithValue: Story = {
  args: {
    label: 'Country',
    value: 'fr',
    hint: 'Reopen the panel — the whole list is still there.',
  },
};

// --- Many options ----------------------------------------------------------

/**
 * The case this component exists for: **85 airports**, a list nobody would scroll.
 * This is what `ui-select` cannot do — 85 options in a panel is a search, not a
 * choice.
 *
 * Type `lon` for the London airports, or `heath` — the default filter matches
 * *anywhere* in the label, so you need not know how the name starts. The panel
 * scrolls at Material’s own height, and the arrow keys move through it with a roving
 * `aria-activedescendant`.
 */
export const ManyOptions: Story = {
  args: {
    label: 'Airport',
    options: AIRPORTS,
    placeholder: 'Start typing a city or airport…',
    floatLabel: 'always',
    hint: '85 airports. Try “lon”, “heath” or “international”.',
  },
};

/**
 * The same long list with `autoActiveFirstOption`, so the first suggestion is
 * highlighted as the panel opens and Enter takes it without an arrow key first.
 *
 * It is the right default for a field where the top hit is usually the answer.
 * Highlighting is not choosing: the value does not change until Enter — unless
 * `autoSelectActiveOption`, which makes the value follow the arrow keys.
 */
export const ManyOptionsAutoActive: Story = {
  name: 'Many options: autoActiveFirstOption',
  args: {
    label: 'Airport',
    options: AIRPORTS,
    autoActiveFirstOption: true,
    hint: 'Type “edi” and press Enter.',
  },
};

// --- No matches ------------------------------------------------------------

/**
 * Type `zzz`. Nothing matches, and Material’s own rule applies: **a panel with
 * nothing in it is hidden**, so the panel simply closes rather than hanging an empty
 * box under the field. That is the default, and it is honest.
 */
export const NoMatches: Story = {
  args: {
    label: 'Country',
    hint: 'Type “zzz” — nothing matches, so no panel.',
  },
};

/**
 * `noResultsText` keeps the panel open to say so. It renders as a **disabled**
 * option: announced with the list, but not choosable and skipped by the arrow keys.
 *
 * The field’s value is still what the user typed — nothing about a missed search
 * changes that.
 */
export const NoMatchesText: Story = {
  name: 'No matches: noResultsText',
  args: {
    label: 'Country',
    noResultsText: 'No country matches that.',
    hint: 'Type “zzz”.',
  },
};

/**
 * Rule 7: a string cannot name what missed, and it cannot offer the way out — which
 * is the point of an empty state. `uiAutocompleteEmpty` is handed the text that
 * matched nothing.
 */
export const NoMatchesTemplate: Story = {
  name: 'No matches: uiAutocompleteEmpty',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: AIRPORTS },
    template: frame(`
      <ui-autocomplete label="Airport" [options]="options" hint="Type “zzz”.">
        <ng-template uiAutocompleteEmpty let-text>
          <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
            <mat-icon style="color: var(--mat-sys-on-surface-variant);">search_off</mat-icon>
            <span>
              No airport matches “<strong>{{ text }}</strong>”.
              <a href="#" (click)="$event.preventDefault()">Tell us about it</a>.
            </span>
          </span>
        </ng-template>
      </ui-autocomplete>`),
  }),
};

/**
 * Nothing to suggest at all — an empty `options` list, before the first fetch comes
 * back. The field is still a perfectly good text box, and the hint is where the
 * reason goes.
 */
export const NoOptions: Story = {
  args: { label: 'Country', options: [], hint: 'No countries are loaded yet.' },
};

// --- Filtering -------------------------------------------------------------

/**
 * The default filter is case-insensitive and matches **anywhere** in the label, so
 * `kingdom` finds the United Kingdom. `filterWith` replaces it — here with a
 * `startsWith`, which is why the second field finds nothing for the same text.
 */
export const Filtering: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      options: COUNTRIES,
      startsWith: (o: UiAutocompleteOption<string>, text: string) =>
        o.label.toLowerCase().startsWith(text.trim().toLowerCase()),
    },
    template: grid(
      [
        caption(
          'default · contains',
          `<ui-autocomplete label="Country" [options]="options" hint="Type “kingdom”." />`,
        ),
        caption(
          '[filterWith] · startsWith',
          `<ui-autocomplete label="Country" [options]="options" [filterWith]="startsWith"
             hint="Type “kingdom”, then “united”." />`,
        ),
      ].join('\n'),
    ),
  }),
};

/**
 * A filter that searches a field the label does not show. The options are airports;
 * the filter matches the **code** as well as the name, so `LHR` finds London
 * Heathrow even though the code is not in the label.
 *
 * This is the shape a server-filtered list takes too: keep `options` the list the
 * server last returned, and pass `[filterWith]="() => true"` so the field does not
 * filter the answer twice.
 */
export const CustomFilter: Story = {
  name: 'Filtering: a filter of your own',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      options: AIRPORTS,
      byCodeOrName: (o: UiAutocompleteOption<string>, text: string) => {
        const query = text.trim().toLowerCase();
        return o.label.toLowerCase().includes(query) || o.value.toLowerCase().includes(query);
      },
    },
    template: frame(`
      <ui-autocomplete label="Airport" [options]="options" [filterWith]="byCodeOrName"
                       hint="Try “LHR” or “JFK” — the code is not in the label.">
        <mat-icon uiAutocompletePrefix>flight_takeoff</mat-icon>
      </ui-autocomplete>`),
  }),
};

// --- Error -----------------------------------------------------------------

/**
 * The field shows the message — and goes red, and flips `aria-invalid` — for exactly
 * as long as `error` is set. Clear the `error` control to watch it go back to the
 * hint.
 */
export const WithError: Story = {
  args: {
    label: 'Country',
    hint: 'Where your card was issued.',
    error: 'Pick a country from the list.',
  },
};

/**
 * Material renders one subscript message: the error replaces the hint rather than
 * stacking on it. Both fields below have the same hint.
 */
export const ErrorReplacesHint: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES },
    template: grid(
      [
        caption(
          'hint',
          `<ui-autocomplete label="Country" [options]="options" [value]="'fr'"
             hint="Where your card was issued." />`,
        ),
        caption(
          'hint + error',
          `<ui-autocomplete label="Country" [options]="options" hint="Where your card was issued."
             error="Pick a country from the list." />`,
        ),
      ].join('\n'),
    ),
  }),
};

/** The error state in both appearances — the red is M3’s `error` role, in either box. */
export const ErrorAppearances: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES },
    template: grid(
      APPEARANCES.map((appearance) =>
        caption(
          `appearance="${appearance}"`,
          `<ui-autocomplete appearance="${appearance}" label="Country" [options]="options"
             error="Pick a country." />`,
        ),
      ).join('\n'),
    ),
  }),
};

// --- State -----------------------------------------------------------------

/** A disabled field: it does not open, and it is out of the tab order. */
export const Disabled: Story = {
  args: { label: 'Country', value: 'fr', disabled: true },
};

/**
 * Disabled in both appearances, empty and filled. Note the disabled field keeps
 * showing its value as a **label** — `France`, not `fr`.
 */
export const DisabledStates: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES },
    template: grid(
      APPEARANCES.flatMap((appearance) =>
        ['null', "'fr'"].map((value) =>
          caption(
            `appearance="${appearance}"${value === 'null' ? ' · empty' : ' · chosen'}`,
            `<ui-autocomplete appearance="${appearance}" label="Country" [options]="options"
               [value]="${value}" disabled hint="Hints grey out too." />`,
          ),
        ),
      ).join('\n'),
    ),
  }),
};

/**
 * `readonly` is not `disabled`: the field stays focusable, stays in the tab order, is
 * announced normally and is submitted with the form — there is just nothing to
 * suggest for a box nobody can type in, so the panel never opens.
 */
export const Readonly: Story = {
  args: {
    label: 'Country',
    value: 'fr',
    readonly: true,
    hint: 'Focus it — it takes focus, but suggests nothing.',
  },
};

/**
 * `required` adds Material’s asterisk and sets `aria-required`. It says the field is
 * required; it does not enforce it — Angular’s own `required` validator matches the
 * same attribute on `<ui-autocomplete [(ngModel)] required>`, so writing it once gets
 * both.
 */
export const Required: Story = { args: { label: 'Country', required: true } };

// --- Appearances -----------------------------------------------------------

/** This library’s default: M3’s outlined box. */
export const Outline: Story = { args: { appearance: 'outline', value: 'fr' } };

/** Material’s own default: the filled box, for a form on a plain surface. */
export const Fill: Story = { args: { appearance: 'fill', value: 'fr' } };

/**
 * Both appearances, empty and filled. Neither carries a colour of its own — the
 * container, the outline and the label all resolve from the theme’s M3 tokens.
 */
export const Appearances: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES },
    template: grid(
      APPEARANCES.flatMap((appearance) =>
        ['null', "'fr'"].map((value) =>
          caption(
            `appearance="${appearance}"${value === 'null' ? ' · empty' : ' · chosen'}`,
            `<ui-autocomplete appearance="${appearance}" label="Country" [options]="options"
               [value]="${value}" />`,
          ),
        ),
      ).join('\n'),
    ),
  }),
};

// --- Slots -----------------------------------------------------------------

/**
 * Rule 7: `uiAutocompletePrefix` and `uiAutocompleteSuffix` project into Material’s
 * own icon slots, inside the field’s box.
 *
 * Note the suffix here is a real `<button>` — `exportAs` hands back the component, so
 * clearing the field is `field.value.set(null)` with no host code at all.
 */
export const PrefixAndSuffix: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: AIRPORTS },
    template: grid(
      [
        caption(
          'uiAutocompletePrefix',
          `<ui-autocomplete label="Airport" [options]="options" [value]="'LHR'">
             <mat-icon uiAutocompletePrefix>search</mat-icon>
           </ui-autocomplete>`,
        ),
        caption(
          'uiAutocompleteSuffix · a clear button',
          `<ui-autocomplete #field="uiAutocomplete" label="Airport" [options]="options" [value]="'CDG'">
             <button matIconButton uiAutocompleteSuffix type="button" aria-label="Clear"
                     (click)="field.value.set(null)">
               <mat-icon>close</mat-icon>
             </button>
           </ui-autocomplete>`,
        ),
      ].join('\n'),
    ),
  }),
};

/**
 * Rule 7: a string cannot spell a link, so project a `uiAutocompleteHint` element for
 * a hint that needs one. It replaces the `hint` string, and Material announces it with
 * the control exactly the same way.
 */
export const ProjectedHint: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: AIRPORTS },
    template: frame(`
      <ui-autocomplete label="Airport" [options]="options">
        <span uiAutocompleteHint>
          Can’t find it? <a href="#" (click)="$event.preventDefault()">See the full list</a>.
        </span>
      </ui-autocomplete>`),
  }),
};

/**
 * Rule 7: `uiAutocompleteOption` renders each suggestion in place of its label — and
 * it is handed **the text typed so far**, so highlighting the match is a template
 * rather than an input this component would have to grow.
 *
 * It renders *inside* Material’s own `<mat-option>`, so selection, the ripple and the
 * keyboard are untouched.
 */
export const CustomOptions: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: AIRPORTS },
    template: frame(
      `
      <ui-autocomplete label="Airport" [options]="options"
                       hint="Type “lon” — the code sits alongside every name.">
        <ng-template uiAutocompleteOption let-option>
          <span style="display: inline-flex; align-items: center; gap: 0.75rem; width: 100%;">
            <span style="font: var(--mat-sys-label-small); letter-spacing: 0.08em;
                         color: var(--mat-sys-on-secondary-container);
                         background: var(--mat-sys-secondary-container);
                         border-radius: var(--mat-sys-corner-extra-small); padding: 0.1rem 0.4rem;">
              {{ option.value }}
            </span>
            {{ option.label }}
          </span>
        </ng-template>
      </ui-autocomplete>`,
      '26rem',
    ),
  }),
};

// --- Forms -----------------------------------------------------------------

/**
 * `[(ngModel)]` binds the host — `ui-autocomplete` is a `ControlValueAccessor`, so
 * there is no adapter and nothing to reach inside for (rule 5).
 *
 * Watch the model as you go: it is the **text** while you type, and the option’s
 * `value` the moment you pick one. That is Material’s own model, and the reason the
 * story below exists.
 */
export const NgModel: Story = {
  name: 'Forms: [(ngModel)]',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES, country: 'fr' },
    template: frame(`
      <ui-autocomplete label="Country" [options]="options" [(ngModel)]="country" />
      <p style="font: var(--mat-sys-body-small); margin: 0;">
        country: <strong>{{ country ?? 'null' }}</strong>
      </p>`),
  }),
};

/**
 * The same state without a forms directive: `[(value)]` is a `model()` (rule 5).
 *
 * `exportAs: 'uiAutocomplete'` hands the component back, so the buttons below are just
 * `field.value.set(…)` and `field.matAutocompleteTrigger().openPanel()` — no host code
 * at all, and Material’s own API is one hop away rather than re-declared here (rule 4).
 */
export const TwoWayValue: Story = {
  name: 'Forms: [(value)] and exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES, country: 'de' },
    template: frame(`
      <ui-autocomplete #field="uiAutocomplete" label="Country" [options]="options" [(value)]="country">
        <mat-icon uiAutocompletePrefix>public</mat-icon>
      </ui-autocomplete>

      <div style="display: flex; gap: 0.5rem;">
        <button matButton uiButton variant="outlined" (click)="field.value.set(null)">Clear</button>
        <button matButton uiButton variant="outlined" (click)="field.value.set('es')">Pick Spain</button>
        <button matButton uiButton variant="outlined"
                (click)="field.matAutocompleteTrigger().openPanel(); field.matInput().focus()">
          Open
        </button>
      </div>

      <p style="font: var(--mat-sys-body-small); margin: 0.5rem 0 0;">
        value: <strong>{{ field.value() ?? 'null' }}</strong>
      </p>`),
  }),
};

/**
 * The usual shape for a reactive form. `error` is a string this library shows on
 * demand — *when* to show it is the consumer’s call, because only they know their
 * validation. Here it waits until the user has been in and out of the field.
 *
 * Type something and tab away.
 */
export const ReactiveValidation: Story = {
  name: 'Forms: reactive validation',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      options: COUNTRIES,
      control: new FormControl<string | null>(null, (c) => (c.value ? null : { required: true })),
    },
    template: frame(`
      <ui-autocomplete
        label="Country"
        required
        hint="Where your card was issued."
        [options]="options"
        [formControl]="control"
        [error]="control.touched && control.hasError('required') ? 'Pick a country.' : ''"
      />

      <p style="font: var(--mat-sys-body-small); margin: 0;">
        touched: <strong>{{ control.touched }}</strong> · valid: <strong>{{ control.valid }}</strong>
      </p>`),
  }),
};

/**
 * The value is the typed text until a suggestion is chosen — so a field that must end
 * up holding **an option’s value** wants a validator. That is the consumer’s own rule
 * rather than something to configure here, and it is four lines:
 *
 * ```ts
 * const fromList =
 *   (options: UiAutocompleteOption<string>[]): ValidatorFn =>
 *   (c) => options.some((o) => o.value === c.value) ? null : { notInList: true };
 * ```
 *
 * Type `Atlantis` and tab away; then pick a real country.
 */
export const OnlyFromTheList: Story = {
  name: 'Forms: only from the list',
  parameters: { controls: { disable: true } },
  render: () => {
    const fromList =
      (options: UiAutocompleteOption<string>[]): ValidatorFn =>
      (control) =>
        options.some((o) => o.value === control.value) ? null : { notInList: true };

    return {
      props: {
        options: COUNTRIES,
        control: new FormControl<string | null>(null, fromList(COUNTRIES)),
      },
      template: frame(`
        <ui-autocomplete
          label="Country"
          hint="Pick one from the list — typing a name is not enough."
          [options]="options"
          [formControl]="control"
          [error]="control.touched && control.hasError('notInList') ? 'Pick a country from the list.' : ''"
        />

        <p style="font: var(--mat-sys-body-small); margin: 0;">
          value: <strong>{{ control.value ?? 'null' }}</strong> ·
          valid: <strong>{{ control.valid }}</strong>
        </p>`),
    };
  },
};

/**
 * The case a string-only API would force an adapter on: the option’s `value` is a
 * whole object, and that is what the form holds — no id in, no lookup out (rule 5).
 *
 * The control below starts with an object that is **not** the same instance as the one
 * in `options`, as a form patched from a server response would be. `displayWith` is
 * what turns it into text — without it, the default’s `===` lookup would find nothing
 * and the field would show `[object Object]`.
 */
export const ObjectValues: Story = {
  name: 'Forms: object values and displayWith',
  parameters: { controls: { disable: true } },
  render: () => {
    interface Country {
      id: string;
      name: string;
    }
    const options: UiAutocompleteOption<Country>[] = COUNTRIES.filter((c) => !c.disabled).map(
      (c) => ({ value: { id: c.value, name: c.label }, label: c.label }),
    );

    return {
      props: {
        options,
        byName: (value: Country | string | null) =>
          typeof value === 'string' ? value : (value?.name ?? ''),
        control: new FormControl<Country | string | null>({ id: 'fr', name: 'France' }),
      },
      template: frame(`
        <ui-autocomplete label="Country" [options]="options" [displayWith]="byName"
                         [formControl]="control" />
        <p style="font: var(--mat-sys-body-small); margin: 0;">
          value: <strong>{{ control.value | json }}</strong>
        </p>`),
    };
  },
};

/**
 * A form’s own `disable()` reaches the field through `setDisabledState`, so a
 * `FormControl` that starts disabled — or is disabled later — needs nothing in the
 * template.
 */
export const FormDisabled: Story = {
  name: 'Forms: control.disable()',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES, control: new FormControl({ value: 'fr', disabled: true }) },
    template: frame(`
      <ui-autocomplete label="Country" [options]="options" [formControl]="control"
                       hint="Disabled by the form, not the template." />

      <button matButton uiButton variant="outlined"
              (click)="control.enabled ? control.disable() : control.enable()">
        Toggle
      </button>`),
  }),
};

// --- Native attributes -----------------------------------------------------

/**
 * Rule 3. Everything this component does not name is moved onto the real `<input>` —
 * inspect the DOM here: `data-*` and `maxlength` are on the input, not stranded on the
 * wrapper. `name` is there too, so the field submits natively.
 *
 * `id`, `readonly`, `required` and `aria-describedby` have inputs of their own
 * instead, because Material’s own host bindings own those attributes on the input — a
 * forwarded one would be overwritten on the next change detection.
 * `aria-describedby` is merged with the hint’s id rather than replacing it, so both
 * are announced.
 */
export const NativeAttributes: Story = {
  name: 'Native attributes',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES },
    template: frame(`
      <p id="policy" style="font: var(--mat-sys-body-small); margin: 0 0 0.5rem;">
        We only use this to work out your tax rate.
      </p>

      <ui-autocomplete
        label="Country"
        id="signup-country"
        name="country"
        maxlength="40"
        data-testid="signup-country"
        aria-describedby="policy"
        [options]="options"
        hint="Both this hint and the note above are announced with the field."
      />`),
  }),
};

// --- Styling hooks ---------------------------------------------------------

/**
 * `<ui-autocomplete>` is a block and the field fills it, so sizing a field is an
 * ordinary rule on an ordinary selector — no `::ng-deep`, no `!important`. Set the
 * width on the host; reach for `--ui-autocomplete-width` only when the field should
 * not fill it.
 *
 * The panel is a different problem — it renders in an overlay at the document root,
 * outside the component’s encapsulation. `panelClass` and `panelWidth` are Material’s
 * own answers to that, and both are forwarded, so styling the panel is not a
 * `::ng-deep` either.
 */
export const StylingHooks: Story = {
  name: 'Styling hooks: --ui-autocomplete-width and panelWidth',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: AIRPORTS },
    template: `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; max-width: 34rem;">
        <ui-autocomplete label="Sized by the host" style="width: 12rem;" [options]="options" />

        <ui-autocomplete label="Sized by the hook" style="--ui-autocomplete-width: max-content;"
                         [options]="options"
                         hint="max-content — the field shrinks to Material’s own intrinsic width." />

        <div style="display: flex; gap: 1rem;">
          <ui-autocomplete label="From" style="flex: 1;" [options]="options" />
          <ui-autocomplete label="To" style="flex: 1;" [options]="options" />
        </div>

        <ui-autocomplete label="Wide panel" panelWidth="24rem" [options]="options"
                         style="width: 12rem;"
                         hint="panelWidth — the panel need not match the field." />
      </div>`,
  }),
};

// --- The full matrix -------------------------------------------------------

/**
 * Every appearance × state combination. This is the reference grid: if a combination
 * does not hold together here, the theme is wrong.
 */
export const AllConfigurations: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { options: COUNTRIES },
    template: `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 18rem)); gap: 1rem 1.5rem;">
        ${APPEARANCES.flatMap((appearance) =>
          [
            { name: 'default', attrs: '', value: 'null' },
            { name: 'chosen', attrs: '', value: "'fr'" },
            {
              name: 'placeholder',
              attrs: 'placeholder="Start typing…" floatLabel="always"',
              value: 'null',
            },
            { name: 'hint', attrs: 'hint="Where your card was issued."', value: 'null' },
            { name: 'error', attrs: 'error="Pick a country."', value: 'null' },
            { name: 'required', attrs: 'required', value: 'null' },
            { name: 'readonly', attrs: 'readonly', value: "'fr'" },
            { name: 'disabled', attrs: 'disabled', value: "'fr'" },
          ].map(({ name, attrs, value }) =>
            caption(
              `${appearance} · ${name}`,
              `<ui-autocomplete appearance="${appearance}" label="Country" [options]="options"
                 [value]="${value}" ${attrs} />`,
            ),
          ),
        ).join('')}
      </div>`,
  }),
};
