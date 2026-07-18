import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Button } from '../button/button';
import {
  List,
  ListItemAvatarDef,
  ListItemIconDef,
  ListItemLineDef,
  ListItemTitleDef,
  type UiListItem,
} from './list';

/** A plausible list, rather than "Item 1". */
const MAILBOXES: UiListItem<string>[] = [
  { label: 'Inbox', icon: 'inbox', value: 'inbox' },
  { label: 'Starred', icon: 'star', value: 'starred' },
  { label: 'Sent', icon: 'send', value: 'sent' },
  { label: 'Archive', icon: 'archive', value: 'archive' },
];

/** The same rows with nothing in the leading slot, for the stories that are not about it. */
const PLAIN: UiListItem<string>[] = MAILBOXES.map((item) => ({
  label: item.label,
  value: item.value,
}));

/** The same list with a second line — a count, a timestamp, a summary. */
const MESSAGES: UiListItem<string>[] = [
  { label: 'Inbox', sublabel: '12 unread', icon: 'inbox', value: 'inbox' },
  { label: 'Starred', sublabel: 'Nothing yet', icon: 'star', value: 'starred' },
  { label: 'Sent', sublabel: 'Last: 2 hours ago', icon: 'send', value: 'sent' },
  { label: 'Archive', sublabel: '1,204 conversations', icon: 'archive', value: 'archive' },
];

interface Person {
  readonly name: string;
  readonly email: string;
  readonly initials: string;
  readonly online: boolean;
}

const PEOPLE: UiListItem<Person>[] = [
  {
    label: 'Sam Okafor',
    sublabel: 'sam@example.com',
    value: { name: 'Sam Okafor', email: 'sam@example.com', initials: 'SO', online: true },
  },
  {
    label: 'Alex Duarte',
    sublabel: 'alex@example.com',
    value: { name: 'Alex Duarte', email: 'alex@example.com', initials: 'AD', online: false },
  },
  {
    label: 'Rae Lindqvist',
    sublabel: 'rae@example.com',
    value: { name: 'Rae Lindqvist', email: 'rae@example.com', initials: 'RL', online: true },
  },
];

/**
 * A list takes the width it is given, so every story renders against a container with
 * an edge — a list filling the canvas is not what an app has.
 */
const frame = (content: string, width = '24rem') =>
  `<div style="max-width: ${width};">${content}</div>`;

const caption = (text: string) =>
  `<p style="font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant); margin: 0 0 0.5rem;">${text}</p>`;

/** Reads the value back as text, so a story shows what a binding actually holds. */
const readout = (expression: string) =>
  `<p style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface); margin: 0;">${expression}</p>`;

const meta: Meta<List> = {
  title: 'Components/List',
  component: List,
  tags: ['autodocs'],
  decorators: [
    // The slot directives are here for the stories that render a row as something other
    // than its strings, MatIcon for the ones that put a real icon in a slot, and Button
    // (with the MatButton it decorates) for the one that drives the list from code.
    moduleMetadata({
      imports: [
        List,
        ListItemAvatarDef,
        ListItemIconDef,
        ListItemTitleDef,
        ListItemLineDef,
        MatIcon,
        MatButton,
        Button,
      ],
    }),
  ],
  args: {
    items: MESSAGES,
    selectable: false,
    multiple: false,
    disabled: false,
    togglePosition: 'after',
    hideSingleSelectionIndicator: false,
  },
  argTypes: {
    items: { control: 'object' },
    selectable: { control: 'boolean' },
    multiple: { control: 'boolean' },
    disabled: { control: 'boolean' },
    togglePosition: { control: 'inline-radio', options: ['before', 'after'] },
    hideSingleSelectionIndicator: { control: 'boolean' },
    // Documented in the table but not knobs: a function is not something the controls
    // panel can author, and the ARIA inputs are aliased to the attributes, which
    // `argsToTemplate` cannot bind — it writes the class member name. The stories below
    // cover them with real templates.
    compareWith: { control: false },
    ariaLabel: { name: 'aria-label', control: false },
    ariaLabelledby: { name: 'aria-labelledby', control: false },
    matList: { table: { disable: true } },
    matSelectionList: { table: { disable: true } },
    selectedValues: { table: { disable: true } },
    selectedItems: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-list` is the shared theme applied to Angular Material’s list. Like `ui-select` and',
          'unlike `uiButton`, it is a **component** rather than a directive: a list owns',
          'composition — a container, a row per item, the lines inside each row, a leading avatar',
          'or icon, and (when `selectable`) the checkbox or radio that makes the row an option.',
          'The row heights, the ripple and state layers, the roving tabindex and arrow keys, the',
          'typeahead, the indicators and the roles are all Material’s own, none of it',
          're-implemented here.',
          '',
          '### The two shapes it takes',
          '',
          '`selectable` picks between Material’s **two** list containers, because they are',
          'different widgets rather than one with a switch. Without it you get a',
          '`<mat-list role="list">` of `<mat-list-item role="listitem">` — content, which is what a',
          'list of details on a card is: not focusable, and it emits nothing. With it you get a',
          '`<mat-selection-list role="listbox">` of `<mat-list-option role="option">`, with the',
          'keyboard and the indicators that come with it. `multiple` then decides whether that',
          'listbox takes one row or many, and therefore whether the indicator is a radio or a',
          'checkbox.',
          '',
          '### State and forms',
          '',
          '`[(value)]` is a `model`, so the selection is one piece of state rather than an input',
          'and an output that can disagree. `(selectionChange)` is the **event** beside it — what',
          'to save, what to log — not the way to keep the value up to date. `ui-list` is also a',
          '`ControlValueAccessor`, so `[(ngModel)]`, `[formControl]` and `formControlName` work',
          'with no adapter — bind the host. The value is the row’s `value`, an array of them when',
          '`multiple`, and `[compareWith]` is how a value that is not the same *instance* as the',
          'one in `items` still finds its row.',
          '',
          '### Slots',
          '',
          'Each row’s parts are `ng-template`s rather than string inputs, each handed the item,',
          'its index and whether it is selected: `uiListItemAvatar`, `uiListItemIcon`,',
          '`uiListItemTitle` and `uiListItemLine`. They render *inside* Material’s own slots, so',
          'the row’s structure, height and keyboard stay Material’s. The leading slot resolves in',
          'one order: an avatar template, else an icon template, else the item’s `icon` name.',
          '',
          '### Theming and restyling',
          '',
          'Every colour and font is resolved from the M3 system tokens in `src/styles/_theme.scss`',
          '— there is not a literal colour in this component’s stylesheet, and every story below',
          'renders the exact palette a consuming app gets, dark mode included.',
          '`--ui-list-item-container-color`, `--ui-list-selected-container-color`,',
          '`--ui-list-item-shape`, `--ui-list-label-text-color`, `--ui-list-supporting-text-color`,',
          '`--ui-list-leading-icon-color` and `--ui-list-leading-avatar-color` restyle a list from',
          'an ordinary CSS rule, with no `::ng-deep`.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: frame(`<ui-list ${argsToTemplate(args)} aria-label="Mailboxes" />`),
  }),
};

export default meta;
type Story = StoryObj<List>;

/** The default, with every knob live in the controls panel. */
export const Default: Story = {};

// --- The static list -------------------------------------------------------

/**
 * The everyday shape: rows as **content**. Only `items` is bound — no selection, no
 * keyboard, nothing emitted — which is what a list of details on a card, a changelog or
 * a set of properties is.
 *
 * Material's plain list ships no role at all, so this library spells out `list` and
 * `listitem`: a screen reader says how many rows there are, and `aria-label` names
 * them.
 */
export const Simple: Story = {
  name: 'Simple',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { items: PLAIN },
    template: frame(`<ui-list [items]="items" aria-label="Mailboxes" />`),
  }),
};

/**
 * `icon` on an item is the convenience shape for the leading slot: a Material icon
 * name, sized and spaced by Material, on the theme's quiet `on-surface-variant` role.
 *
 * For anything a name cannot spell, project a `uiListItemIcon` or `uiListItemAvatar`
 * template instead — see the slot stories below.
 */
export const WithIcons: Story = {
  name: 'With icons',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { items: MAILBOXES },
    template: frame(`<ui-list [items]="items" aria-label="Mailboxes" />`),
  }),
};

/**
 * A `sublabel` gives the row a second line, on the quieter `on-surface-variant` role —
 * a count under a name, a path under a filename — and Material grows the row to fit it.
 *
 * It is per-item, but give it for every row or for none: a list where only some rows
 * have a second line is a list of mixed heights. An empty string is enough to keep a
 * row two-line with nothing to say.
 */
export const TwoLine: Story = {
  name: 'Two-line',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { items: MESSAGES },
    template: frame(`<ui-list [items]="items" aria-label="Mailboxes" />`),
  }),
};

// --- Selection -------------------------------------------------------------

/**
 * `selectable` makes it Material's selection list: a `listbox` of `option`s, with the
 * arrow keys, the typeahead and a radio on each row. One row at a time, and `[(value)]`
 * holds that row's `value` — unwrapped, not in an array.
 *
 * `(selectionChange)` is the event beside it: it carries the whole selection *and* just
 * the rows that changed, which for a single-select list is the row the user chose —
 * Material reports the clicked option, not the one it replaced.
 */
export const Selectable: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { items: MAILBOXES, value: 'inbox' },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <ui-list selectable [items]="items" [(value)]="value" aria-label="Mailbox" />
        ${readout('Value: <strong>{{ value ?? "—" }}</strong>')}
      </div>`),
  }),
};

/**
 * `multiple` makes the value an array and every indicator a checkbox. It is always an
 * array — empty rather than `null` when nothing is chosen — so a consumer never has to
 * check which shape they were handed.
 *
 * Material reads `multiple` as the list initialises and throws if it changes
 * afterwards: like `<select multiple>`, it is what the control *is* rather than a state
 * it moves between.
 */
export const MultiSelect: Story = {
  name: 'Multi-select',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { items: MAILBOXES, value: ['inbox', 'archive'] },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <ui-list selectable multiple [items]="items" [(value)]="value" aria-label="Mailboxes" />
        ${readout('Value: <strong>{{ value.length ? value.join(", ") : "—" }}</strong>')}
      </div>`),
  }),
};

/**
 * `togglePosition="before"` moves the indicator to the leading edge. Note it shares
 * that edge with the icon — Material puts the two on opposite sides, so a list with
 * both moves the icon to the trailing one.
 */
export const TogglePosition: Story = {
  name: 'Toggle position',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { items: PLAIN },
    template: `
      <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
        <div style="min-width: 16rem;">
          ${caption('after — Material’s default')}
          <ui-list selectable multiple [items]="items" aria-label="Mailboxes" />
        </div>
        <div style="min-width: 16rem;">
          ${caption('before')}
          <ui-list selectable multiple togglePosition="before" [items]="items" aria-label="Mailboxes" />
        </div>
      </div>`,
  }),
};

/**
 * `hideSingleSelectionIndicator` drops the radio from a single-select list, which is
 * what a list of *views* wants — a column of radios reads as a form.
 *
 * That leaves nothing marking the chosen row, so pair it with
 * `--ui-list-selected-container-color`: the fill becomes the indicator. M3's role for a
 * selected row is `secondary-container`.
 */
export const HideSingleSelectionIndicator: Story = {
  name: 'Hidden indicator (a view switcher)',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { items: MAILBOXES, value: 'starred' },
    template: frame(`
      ${caption('The fill is the indicator, so the list reads as navigation rather than a form.')}
      <ui-list
        selectable
        hideSingleSelectionIndicator
        [items]="items"
        [(value)]="value"
        aria-label="View"
        style="--ui-list-selected-container-color: var(--mat-sys-secondary-container);
               --ui-list-item-shape: var(--mat-sys-corner-full);"
      />`),
  }),
};

// --- States ----------------------------------------------------------------

/**
 * `disabled` on an item takes that one row out, while the rest stay selectable. The row
 * is still shown and still read out — a disabled row is one a user cannot choose, not
 * one they cannot see.
 *
 * `disabled` on the list does the same to every row at once, and takes the list out of
 * the tab order. A reactive form's own `disable()` drives that too, through
 * `setDisabledState`.
 */
export const Disabled: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      items: [
        MAILBOXES[0],
        { ...MAILBOXES[1], disabled: true },
        MAILBOXES[2],
        { ...MAILBOXES[3], disabled: true },
      ],
      all: MAILBOXES,
    },
    template: `
      <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
        <div style="min-width: 16rem;">
          ${caption('Two rows disabled; the rest still choose.')}
          <ui-list selectable multiple [items]="items" aria-label="Mailboxes" />
        </div>
        <div style="min-width: 16rem;">
          ${caption('The whole list disabled.')}
          <ui-list selectable multiple disabled [items]="all" aria-label="Mailboxes" />
        </div>
      </div>`,
  }),
};

/** A list with nothing in it renders an empty list rather than collapsing to nothing. */
export const Empty: Story = {
  name: 'An empty list',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { items: [] },
    template: frame(`
      ${caption('No rows. The list is still there, and still named.')}
      <ui-list [items]="items" aria-label="Mailboxes" />`),
  }),
};

// --- Slots -----------------------------------------------------------------

/**
 * `uiListItemAvatar` fills Material's leading slot with anything at all — here an
 * initials tile and a status dot, neither of which an icon name can spell. The round
 * 40px frame, the spacing and the row height stay Material's.
 *
 * The template is handed the item, its index and whether it is selected, so the avatar
 * can depend on the row's own data.
 */
export const AvatarSlot: Story = {
  name: 'Slot: avatar',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { people: PEOPLE },
    template: frame(`
      <ui-list [items]="people" aria-label="People">
        <ng-template uiListItemAvatar let-item>
          <span
            style="display: grid; place-items: center; width: 100%; height: 100%;
                   border-radius: 50%; font: var(--mat-sys-label-large);
                   background: var(--mat-sys-tertiary-container);
                   color: var(--mat-sys-on-tertiary-container);"
          >{{ item.value.initials }}</span>
        </ng-template>
        <ng-template uiListItemLine let-item>
          <span style="display: inline-flex; align-items: center; gap: 0.375rem;">
            <span
              style="width: 0.5rem; height: 0.5rem; border-radius: 50%;"
              [style.background]="item.value.online ? 'var(--ui-sys-success)' : 'var(--mat-sys-outline)'"
            ></span>
            {{ item.value.online ? 'Online' : 'Away' }} · {{ item.value.email }}
          </span>
        </ng-template>
      </ui-list>`),
  }),
};

/**
 * `uiListItemIcon` is the same slot for an icon the item's `icon` name cannot spell —
 * one that depends on the row's state, or takes a colour of its own. It wins over
 * `icon`; an avatar template wins over both.
 *
 * `--ui-sys-success` and `--ui-sys-warning` are the theme's own status roles, which M3
 * itself lacks — not a parallel colour system, and they follow dark mode like every
 * other role.
 */
export const IconSlot: Story = {
  name: 'Slot: icon',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      // A row's `value` identifies it — the list tracks by it, so two rows cannot share
      // one. The status a row's icon depends on lives *in* the value rather than being
      // it, which is the shape a list over real objects has anyway.
      builds: [
        { label: 'ui-list', sublabel: 'Passed in 2m 14s', value: { id: 'list', ok: true } },
        { label: 'ui-chips', sublabel: 'Flaky — 1 retry', value: { id: 'chips', ok: false } },
        { label: 'ui-select', sublabel: 'Passed in 1m 02s', value: { id: 'select', ok: true } },
      ],
    },
    template: frame(`
      <ui-list [items]="builds" aria-label="Builds">
        <ng-template uiListItemIcon let-item>
          <mat-icon
            [style.color]="item.value.ok ? 'var(--ui-sys-success)' : 'var(--ui-sys-warning)'"
          >{{ item.value.ok ? 'check_circle' : 'warning' }}</mat-icon>
        </ng-template>
      </ui-list>`),
  }),
};

/**
 * `uiListItemTitle` and `uiListItemLine` render the two lines, in place of `label` and
 * `sublabel`. They render *inside* Material's own lines, so the type scale, the
 * no-wrap and the row height are still Material's.
 *
 * `let-selected` is what makes the badge here follow the selection — the slots are
 * handed the row's state, not just its data.
 */
export const LineSlots: Story = {
  name: 'Slots: title and line',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { items: MESSAGES, value: ['inbox'] },
    template: frame(`
      <ui-list selectable multiple [items]="items" [(value)]="value" aria-label="Mailboxes">
        <ng-template uiListItemTitle let-item let-selected="selected">
          <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
            {{ item.label }}
            @if (selected) {
              <span
                style="font: var(--mat-sys-label-small); padding: 0 0.5rem; border-radius: 999px;
                       background: var(--ui-sys-success-container);
                       color: var(--ui-sys-on-success-container);"
              >syncing</span>
            }
          </span>
        </ng-template>
        <ng-template uiListItemLine let-item let-index="index">
          <span>#{{ index + 1 }} · {{ item.sublabel }}</span>
        </ng-template>
      </ui-list>`),
  }),
};

// --- The rest of the API ---------------------------------------------------

/**
 * `[compareWith]` is how a value that is not the same **instance** as the one in
 * `items` still finds its row — a selection restored from a server response, say, where
 * the default `===` would leave the list looking empty.
 *
 * The value below is a fresh object built from an id, and the row is still marked.
 */
export const CompareWith: Story = {
  name: 'compareWith (values that are objects)',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      people: PEOPLE,
      // What a form patched from a response holds: equal to a row's value, but not it.
      value: { name: 'Rae Lindqvist', email: 'rae@example.com', initials: 'RL', online: true },
      byEmail: (a: Person, b: Person) => a?.email === b?.email,
    },
    template: frame(`
      ${caption('The value is a different object with the same email — matched by [compareWith].')}
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <ui-list selectable [items]="people" [(value)]="value" [compareWith]="byEmail" aria-label="Assignee" />
        ${readout('Assignee: <strong>{{ value?.name ?? "—" }}</strong>')}
      </div>`),
  }),
};

/**
 * The styling hooks (rule 6), all set from an ordinary rule on `ui-list` — no
 * `::ng-deep`, no `!important`. Each defaults to the token Material itself resolves to,
 * so an untouched list ships no colour decision of its own.
 *
 * Every value here points at a `--mat-sys-*` role rather than a literal, so it survives
 * a palette change and dark mode.
 */
export const StylingHooks: Story = {
  name: 'Styling hooks',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { items: MESSAGES, value: ['starred'] },
    template: frame(`
      <ui-list
        selectable
        multiple
        [items]="items"
        [(value)]="value"
        aria-label="Mailboxes"
        style="--ui-list-item-container-color: var(--mat-sys-surface-container-low);
               --ui-list-selected-container-color: var(--mat-sys-secondary-container);
               --ui-list-item-shape: var(--mat-sys-corner-medium);
               --ui-list-leading-icon-color: var(--mat-sys-primary);"
      />`),
  }),
};

/**
 * `#list="uiList"` hands back the component, and `.matSelectionList()` hands back
 * Material's own instance — the escape hatch for everything this component does not
 * wrap (rule 4), like `selectAll()`, `deselectAll()` and `focus()`.
 *
 * The readout below is the point: a selection made this way still writes `[(value)]`.
 * Material's own `selectionChange` does *not* fire for `selectAll()` — only for a click
 * or the keyboard — so a wrapper that synced its value from that event would leave the
 * two disagreeing. This one takes Material's value changes instead.
 */
export const EscapeHatch: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { items: MAILBOXES, value: [] },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <ui-list #list="uiList" selectable multiple [items]="items" [(value)]="value" aria-label="Mailboxes" />
        <div style="display: flex; gap: 0.5rem;">
          <button matButton uiButton variant="outlined" (click)="list.matSelectionList()?.selectAll()">
            Select all
          </button>
          <button matButton uiButton variant="outlined" (click)="list.matSelectionList()?.deselectAll()">
            Deselect all
          </button>
        </div>
        ${readout('Value: <strong>{{ value.length ? value.join(", ") : "—" }}</strong>')}
      </div>`),
  }),
};
