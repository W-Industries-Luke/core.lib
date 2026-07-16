import { MatButton } from '@angular/material/button';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Button } from '../button/button';
import { ChipDef, Chips, type UiChip } from './chips';

/** A plausible row of tags, rather than "Chip 1". */
const TAGS: UiChip[] = [
  { label: 'design', value: 'design' },
  { label: 'urgent', value: 'urgent' },
  { label: 'backend', value: 'backend' },
];

interface Person {
  readonly name: string;
  readonly initials: string;
}

const PEOPLE: UiChip<Person>[] = [
  { label: 'Sam Okafor', value: { name: 'Sam Okafor', initials: 'SO' } },
  { label: 'Alex Duarte', value: { name: 'Alex Duarte', initials: 'AD' } },
  { label: 'Rae Lindqvist', value: { name: 'Rae Lindqvist', initials: 'RL' } },
];

/**
 * Chips wrap onto as many lines as they need, so every story renders against a
 * container with an edge — a set filling the canvas is not what an app has.
 */
const frame = (content: string, width = '32rem') =>
  `<div style="max-width: ${width};">${content}</div>`;

/** What the set holds, in one line — `tags` bound two-way, read back as text. */
const names = (chips: readonly UiChip<unknown>[]): string =>
  chips.map((chip) => chip.label).join(', ') || '—';

const caption = (text: string) =>
  `<p style="font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant); margin: 0 0 0.5rem;">${text}</p>`;

const meta: Meta<Chips> = {
  title: 'Components/Chips',
  component: Chips,
  tags: ['autodocs'],
  decorators: [
    // ChipDef is here for the story that renders a chip as something other than its
    // label, and Button (with the MatButton it decorates) for the ones that drive the
    // set from code — which is what `[(chips)]` looks like in an app.
    moduleMetadata({ imports: [Chips, ChipDef, MatButton, Button] }),
  ],
  args: {
    chips: TAGS,
    editable: false,
    removable: false,
    disabled: false,
    appearance: 'outline',
    addOnBlur: true,
  },
  argTypes: {
    chips: { control: 'object' },
    editable: { control: 'boolean' },
    removable: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    hint: { control: 'text' },
    appearance: { control: 'inline-radio', options: ['outline', 'fill'] },
    addOnBlur: { control: 'boolean' },
    // Documented in the table but not knobs: a function is not something the controls
    // panel can author, and the ARIA inputs are aliased to the attributes, which
    // `argsToTemplate` cannot bind — it writes the class member name. The stories
    // below cover all four with real templates.
    createChip: { control: false },
    removeAriaLabel: { control: false },
    separatorKeys: { control: false },
    ariaLabel: { name: 'aria-label', control: false },
    ariaLabelledby: { name: 'aria-labelledby', control: false },
    matChipSet: { table: { disable: true } },
    matChipGrid: { table: { disable: true } },
    matChipInput: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-chips` is the shared theme applied to Angular Material’s chips. Like `ui-menu` and',
          'unlike `uiButton`, it is a **component** rather than a directive: a chip set owns',
          'composition — a container, a chip per value, the remove button on each, and (when',
          '`editable`) a field with an input that turns text into another chip. The chip’s shape,',
          'outline, ripple and state layers, the remove button, the roving focus and arrow keys',
          'across the set, the Backspace that removes the focused chip, and the grid roles an',
          'editable set puts around its rows are all Material’s own, none of it re-implemented here.',
          '',
          '### The two shapes it takes',
          '',
          '`editable` picks between Material’s **two** chip containers, because they are different',
          'widgets rather than one with a switch. Without it you get a `<mat-chip-set role="list">`',
          'of `<mat-chip role="listitem">` — static chips, which is what a row of tags on a card is.',
          'With it you get a `<mat-form-field>` around a `<mat-chip-grid>` of `<mat-chip-row>` and an',
          '`<input matChipInputFor>` — the `role="grid"` a user types into.',
          '',
          '### State',
          '',
          '`[(chips)]` is a `model`, so the list is one piece of state rather than an input and an',
          'output that can disagree: removing a chip and adding one both write it. `(removed)` and',
          '`(added)` are **events** alongside it — what to save, what to offer an undo for — not the',
          'way to keep the list up to date. Bind it two-way whenever the set is `removable` or',
          '`editable`; a one-way `[chips]` still adds and removes, but says the consumer owns the',
          'list and will apply the change themselves.',
          '',
          '### Adding',
          '',
          'An editable set ends a chip on Enter **or a comma** (Material’s own default is Enter',
          'alone), and on blur — text a user typed and clicked away from is text they meant.',
          '`[createChip]` is what the typed text *becomes*: by default the label and the value are',
          'both the text, and a set over objects gives a factory. That factory is also where a',
          'duplicate is turned away, by returning `null`.',
          '',
          '### Theming and restyling',
          '',
          'Every colour and font is resolved from the M3 system tokens in `src/styles/_theme.scss`',
          '— there is not a literal colour in this component’s stylesheet, and every story below',
          'renders the exact palette a consuming app gets, dark mode included.',
          '`--ui-chips-container-color`, `--ui-chips-label-text-color`, `--ui-chips-outline-color`,',
          '`--ui-chips-outline-width`, `--ui-chips-trailing-icon-color`, `--ui-chips-shape` and',
          '`--ui-chips-width` restyle a set from an ordinary CSS rule, with no `::ng-deep`.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: frame(`<ui-chips ${argsToTemplate(args)} aria-label="Tags" />`),
  }),
};

export default meta;
type Story = StoryObj<Chips>;

/** The default: three static tags, with every knob live in the controls panel. */
export const Default: Story = {};

// --- Read-only -------------------------------------------------------------

/**
 * The everyday shape: chips as **content**. Nothing is bound but the list — no remove
 * buttons, no input — which is what a row of tags on a card, a list of applied
 * filters, or the recipients on a message is.
 *
 * Material's own default role for a chip set is `presentation`; this library renders a
 * static set as a `list` of `listitem`s instead, which is what Material's own
 * accessibility guidance prescribes for chips that are content rather than controls.
 * So a screen reader says how many there are, and `aria-label` names them.
 */
export const ReadOnly: Story = {
  name: 'Read-only',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { tags: TAGS },
    template: frame(`<ui-chips [chips]="tags" aria-label="Tags" />`),
  }),
};

/** A set with nothing in it renders an empty list rather than collapsing to nothing. */
export const Empty: Story = {
  name: 'An empty set',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { tags: [] },
    template: frame(`
      ${caption('No chips. The list is still there, and still named.')}
      <ui-chips [chips]="tags" aria-label="Tags" />`),
  }),
};

// --- Removable -------------------------------------------------------------

/**
 * `removable` gives every chip Material's remove button, and each one names itself
 * after the chip it takes away — `Remove design`, not `Remove`.
 *
 * The set removes the chip itself and writes the list back through `[(chips)]`, then
 * emits `(removed)` with the whole chip — which is what an undo toast or a save needs.
 * Material's own keyboard applies: focus a chip with the arrow keys and press Delete
 * or Backspace.
 */
export const Removable: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { tags: [...TAGS], removedTag: '' },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <ui-chips [(chips)]="tags" removable (removed)="removedTag = $event.label" aria-label="Tags" />
        <p style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface); margin: 0;">
          @if (removedTag) {
            Removed <strong>{{ removedTag }}</strong>. {{ tags.length }} left.
          } @else {
            Take one away — the list is bound two-way.
          }
        </p>
      </div>`),
  }),
};

/**
 * `removable` is the switch for the whole set; a single chip overrides it either way
 * with its own `removable`. That is the pinned tag among optional ones — or, the other
 * way round, the one draft chip in a set that is otherwise fixed.
 */
export const PerChipRemovable: Story = {
  name: 'A pinned chip',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      mixed: [
        { label: 'design', value: 'design' },
        { label: 'urgent', value: 'urgent' },
        { label: 'owner: you', value: 'owner', removable: false },
      ] satisfies UiChip[],
    },
    template: frame(`
      ${caption('The set is removable; “owner: you” says removable: false and keeps no button.')}
      <ui-chips [chips]="mixed" removable aria-label="Tags" />`),
  }),
};

// --- Editable --------------------------------------------------------------

/**
 * `editable` renders the other Material widget: a field around a `<mat-chip-grid>`
 * with an input. Type and press **Enter or a comma** — the comma is this library's
 * addition, because it is what a user typing a list types anyway. Text left in the
 * input when it loses focus is kept as a chip too, rather than dropped.
 *
 * Backspace on an empty input reaches back to the last chip: the input is wired to the
 * grid through `matChipInputFor`, so that behaviour is Material's own. It sits *beside*
 * the grid rather than in it, because a `role="grid"` may only own rows — an `<input>`
 * in there is an `aria-required-children` violation, which is the one place this
 * component departs from the markup in Material's own example.
 */
export const Editable: Story = {
  name: 'Editable (with an input)',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { tags: [...TAGS], names },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <ui-chips
          [(chips)]="tags"
          editable
          removable
          label="Tags"
          placeholder="New tag…"
          hint="Enter or comma to add"
          aria-label="Tags"
        />
        <p style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface); margin: 0;">
          {{ tags.length }} tags: <strong>{{ names(tags) }}</strong>
        </p>
      </div>`),
  }),
};

/**
 * Adding and removing are independent. An `editable` set without `removable` is one a
 * user can add to but not prune — a field that only grows.
 */
export const EditableNotRemovable: Story = {
  name: 'Editable, but pinned',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { tags: [...TAGS] },
    template: frame(`
      ${caption('editable without removable: no remove buttons, but the input still adds.')}
      <ui-chips [(chips)]="tags" editable label="Tags" placeholder="New tag…" />`),
  }),
};

/**
 * The field is Material's own, so it takes Material's appearances. `outline` is this
 * library's default, matching `ui-select` and `ui-input`; `fill` is Material's.
 */
export const Appearance: Story = {
  name: 'appearance',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { outlined: [...TAGS], filled: [...TAGS] },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          ${caption('appearance="outline" — the library’s default.')}
          <ui-chips [(chips)]="outlined" editable removable label="Tags" />
        </div>
        <div>
          ${caption('appearance="fill" — Material’s own default.')}
          <ui-chips [(chips)]="filled" editable removable appearance="fill" label="Tags" />
        </div>
      </div>`),
  }),
};

/**
 * `[createChip]` is what the typed text becomes. By default the label and the value
 * are both the text — which is why `T` defaults to `string` — and a set whose chips
 * stand for something else says so here.
 *
 * It is also where a duplicate is turned away: return `null` and nothing is added,
 * nothing is emitted, and the text stays in the input for the user to amend. Try
 * adding `design` twice.
 */
export const CreateChip: Story = {
  name: 'createChip: objects, and no duplicates',
  parameters: { controls: { disable: true } },
  render: () => {
    const tags: UiChip<{ name: string }>[] = [{ label: 'design', value: { name: 'design' } }];
    return {
      props: {
        tags,
        names,
        toTag: (label: string): UiChip<{ name: string }> | null =>
          tags.some((tag) => tag.label.toLowerCase() === label.toLowerCase())
            ? null
            : { label, value: { name: label } },
      },
      template: frame(`
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${caption('Each chip’s value is an object; “design” is rejected as a duplicate.')}
          <ui-chips
            [(chips)]="tags"
            editable
            removable
            label="Tags"
            placeholder="New tag…"
            [createChip]="toTag"
          />
          <p style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface); margin: 0;">
            Holding <strong>{{ names(tags) }}</strong>, each as a <code>{{ '{' }} name {{ '}' }}</code> object.
          </p>
        </div>`),
    };
  },
};

// --- Disabled --------------------------------------------------------------

/**
 * `disabled` makes the whole set inert: no chip can be removed and no text can be
 * typed. The chips are still shown and still read out — a disabled set is one a user
 * cannot change, not one they cannot see.
 */
export const Disabled: Story = {
  name: 'disabled',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { tags: TAGS },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div>
          ${caption('A static set, disabled.')}
          <ui-chips [chips]="tags" removable disabled aria-label="Tags" />
        </div>
        <div>
          ${caption('An editable set, disabled — the input goes too.')}
          <ui-chips [chips]="tags" editable removable disabled label="Tags" placeholder="New tag…" />
        </div>
      </div>`),
  }),
};

// --- Custom content --------------------------------------------------------

/**
 * A chip is not a string (rule 7). `<ng-template uiChipDef>` renders each one with the
 * chip as its context, so initials, a status dot or a count is a template rather than
 * an input this component would have to grow.
 *
 * It renders *inside* Material's own chip — in the text slot, so the ripple, the focus
 * and the remove button beside it are untouched — and it applies to a static set and an
 * editable one alike.
 */
export const CustomContent: Story = {
  name: 'uiChipDef: custom chip content',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { people: PEOPLE },
    template: frame(`
      ${caption('Each chip renders its initials in a tertiary badge, then the name.')}
      <ui-chips [chips]="people" removable aria-label="Assignees">
        <ng-template uiChipDef let-chip>
          <span
            style="display: inline-grid; place-items: center; inline-size: 1.5rem; block-size: 1.5rem; margin-inline-end: 0.375rem; background: var(--mat-sys-tertiary-container); color: var(--mat-sys-on-tertiary-container); border-radius: 50%; font: var(--mat-sys-label-small);"
          >{{ chip.value.initials }}</span>
          {{ chip.label }}
        </ng-template>
      </ui-chips>`),
  }),
};

// --- Accessibility ---------------------------------------------------------

/**
 * `aria-label` names Material's list — say what the chips *are* (`Tags`), not that they
 * are chips. It reaches the real `<mat-chip-set>` inside the component rather than
 * sitting on the `<ui-chips>` host, which has no role for it to name.
 *
 * On an `editable` set the same name reaches Material's grid *and* the input: Material
 * renders the field's label as a `<label for>` pointing at the grid, and `for` only
 * names a native form element — so the input a user types into would otherwise be
 * anonymous.
 */
export const AriaLabel: Story = {
  name: 'a11y: aria-label',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { tags: TAGS },
    template: frame(`<ui-chips [chips]="tags" removable aria-label="Tags" />`),
  }),
};

/**
 * For a set already named by something on the page, point `aria-labelledby` at that
 * heading rather than repeating it.
 */
export const AriaLabelledby: Story = {
  name: 'a11y: aria-labelledby',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { tags: TAGS },
    template: frame(`
      <div>
        <h2 id="tags-heading" style="font: var(--mat-sys-title-medium); color: var(--mat-sys-on-surface);">
          Tags
        </h2>
        <ui-chips [chips]="tags" aria-labelledby="tags-heading" />
      </div>`),
  }),
};

/**
 * Each remove button is named `Remove {label}` — a row of buttons all called `Remove`
 * is a screen reader user guessing. `[removeAriaLabel]` is a function of the chip, so
 * rewording or translating it keeps that.
 */
export const RemoveAriaLabel: Story = {
  name: 'a11y: removeAriaLabel',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { tags: TAGS, welsh: (chip: UiChip) => `Dileu ${chip.label}` },
    template: frame(`
      ${caption('Every remove button here is named “Dileu” and then the tag.')}
      <ui-chips [chips]="tags" removable [removeAriaLabel]="welsh" aria-label="Tagiau" />`),
  }),
};

// --- Styling hooks and escape hatches --------------------------------------

/**
 * The hooks are read off `<ui-chips>`, so restyling a set is an ordinary CSS rule on an
 * ordinary selector — no `::ng-deep`, no `!important`. Point a colour at a
 * `--mat-sys-*` or `--ui-sys-*` role rather than a literal, so it survives a palette
 * change and dark mode.
 *
 * The last one below is the reason `--ui-sys-*` exists: M3 has no `success` role, and
 * the theme emits one rather than leaving every app to pick its own green.
 */
export const StylingHooks: Story = {
  name: 'Styling hooks',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { tags: TAGS },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 32rem;">
        ${[
          ['Default', ''],
          [
            'A tonal chip on the theme’s secondary container',
            '--ui-chips-container-color: var(--mat-sys-secondary-container); --ui-chips-label-text-color: var(--mat-sys-on-secondary-container); --ui-chips-outline-width: 0;',
          ],
          [
            'Fully rounded, in Material’s house style',
            '--ui-chips-shape: var(--mat-sys-corner-full);',
          ],
          [
            'A success chip, on the role M3 itself lacks',
            '--ui-chips-container-color: var(--ui-sys-success-container); --ui-chips-label-text-color: var(--ui-sys-on-success-container); --ui-chips-trailing-icon-color: var(--ui-sys-on-success-container); --ui-chips-outline-width: 0;',
          ],
        ]
          .map(
            ([label, style]) => `
            <div>
              ${caption(label)}
              <ui-chips [chips]="tags" removable aria-label="Tags — ${label}" style="${style}" />
            </div>`,
          )
          .join('')}
      </div>`,
  }),
};

/**
 * `exportAs: 'uiChips'` hands back the component, and `matChipSet()`, `matChipGrid()`
 * and `matChipInput()` hand back Material's own instances — the escape hatch for
 * anything not wrapped here. A `MatChipGrid` *is* a `MatChipSet`, so `matChipSet()`
 * reports it either way.
 */
export const EscapeHatch: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { tags: [...TAGS] },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <ui-chips #field="uiChips" [(chips)]="tags" editable removable label="Tags" placeholder="New tag…" />
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface);">
          <button matButton uiButton variant="outlined" (click)="field.matChipInput()?.focus()">
            matChipInput().focus()
          </button>
          <button matButton uiButton variant="text" (click)="field.matChipSet()?.focus()">
            matChipSet().focus()
          </button>
        </div>
      </div>`),
  }),
};
