import { MatButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Button } from '../button/button';
import {
  Card,
  CardActions,
  CardHeader,
  type UiCardActionsAlign,
  type UiCardAppearance,
} from './card';

const APPEARANCES: UiCardAppearance[] = ['outlined', 'raised'];
const ALIGNMENTS: UiCardActionsAlign[] = ['start', 'end'];

/** Every story renders at a card-ish width rather than filling the canvas. */
const frame = (content: string, width = '20rem') =>
  `<div style="max-width: ${width};">${content}</div>`;

const HEADER = `
  <h2 uiCardHeader matCardTitle>Shipping address</h2>
  <span uiCardHeader matCardSubtitle>Default for new orders</span>`;

const BODY = `<p style="margin: 0;">1 Infinite Loop<br />Cupertino, CA 95014</p>`;

const ACTIONS = `
  <button matButton uiButton uiCardActions variant="text">Edit</button>
  <button matButton uiButton uiCardActions variant="text" color="warn">Remove</button>`;

const meta: Meta<Card> = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
  decorators: [
    // MatCardModule brings `matCardTitle` / `matCardSubtitle`: the card does not
    // re-export them, because they are Material's and work unchanged inside the
    // header slot. Button is here because card actions are the reason it exists.
    moduleMetadata({ imports: [Card, CardHeader, CardActions, MatCardModule, MatButton, Button] }),
  ],
  args: {
    appearance: 'outlined',
    padded: true,
    actionsAlign: 'start',
  },
  argTypes: {
    appearance: { control: 'inline-radio', options: APPEARANCES },
    actionsAlign: { control: 'inline-radio', options: ALIGNMENTS },
    padded: { control: 'boolean' },
    matCard: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-card` is the shared theme applied to Angular Material’s `<mat-card>`. It is a',
          '**component** rather than a directive — unlike `uiButton` — because a card owns',
          'structure: three regions, in a fixed order, each with its own padding. There is no',
          'native element to decorate.',
          '',
          '### Slots',
          '',
          'Mark the element itself, not a wrapper around it — `ng-content select` only matches the',
          'direct children of `<ui-card>`:',
          '',
          '- `uiCardHeader` — title and subtitle. Pair it with Material’s own `matCardTitle` /',
          '  `matCardSubtitle` for M3 typography.',
          '- *(unmarked)* — anything else is the body.',
          '- `uiCardActions` — mark **each** action, so the buttons are the direct children of',
          '  Material’s actions row and `actionsAlign` can lay them out.',
          '',
          'The header and actions regions render only when something is projected into them, so a',
          'card with no header has no stray padding where one would have been — see the stories',
          'below.',
          '',
          '### Theming and restyling',
          '',
          'The container, elevation, outline and corner radius are `<mat-card>`’s own, resolved',
          'from the M3 system tokens in `src/styles/_theme.scss` — there is not a colour in this',
          'component’s stylesheet, and every story below renders the exact palette a consuming app',
          'gets, dark mode included. Padding is the one thing Material leaves as a literal, so it',
          'is exposed as `--ui-card-padding` and `--ui-card-actions-padding` on `<ui-card>`: a',
          'consumer restyles it from an ordinary rule, with no `::ng-deep`.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: frame(`
      <ui-card ${argsToTemplate(args)}>
        ${HEADER}
        ${BODY}
        ${ACTIONS}
      </ui-card>`),
  }),
};

export default meta;
type Story = StoryObj<Card>;

/** The default card: outlined, padded, with all three slots filled. */
export const Default: Story = {};

// --- Appearances -----------------------------------------------------------

/** The default. A flat `surface` container with the theme's `outline-variant` border. */
export const Outlined: Story = { args: { appearance: 'outlined' } };

/** Material's base treatment: no border, lifted onto `surface-container-low` at elevation 1. */
export const Raised: Story = { args: { appearance: 'raised' } };

/** Both appearances side by side — the pair a consumer is choosing between. */
export const Appearances: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
        ${APPEARANCES.map((appearance) =>
          frame(`
          <ui-card appearance="${appearance}">
            <h2 uiCardHeader matCardTitle>${appearance}</h2>
            ${BODY}
            <button matButton uiButton uiCardActions variant="text">Edit</button>
          </ui-card>`),
        ).join('\n        ')}
      </div>
    `,
  }),
};

// --- Slots -----------------------------------------------------------------

/** All three slots: header, body, actions. */
export const WithHeaderAndActions: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-card>
        ${HEADER}
        ${BODY}
        ${ACTIONS}
      </ui-card>`),
  }),
};

/**
 * No header. The header region is not rendered at all, so the body closes the
 * top of the card itself rather than sitting below an empty 16px band.
 */
export const WithoutHeader: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-card>
        ${BODY}
        ${ACTIONS}
      </ui-card>`),
  }),
};

/** No actions — a card that only presents. */
export const WithoutActions: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-card>
        ${HEADER}
        ${BODY}
      </ui-card>`),
  }),
};

/** Body only. Both optional regions collapse; the body's own padding closes the box. */
export const BodyOnly: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({ template: frame(`<ui-card>${BODY}</ui-card>`) }),
};

// --- padded ----------------------------------------------------------------

/** The default: Material's standard 16px around the header and body, 8px around the actions. */
export const Padded: Story = { args: { padded: true } };

/**
 * `[padded]="false"` zeroes the padding on every slot, for a card whose content
 * runs edge to edge — a full-bleed image, a table, a list — where the padding
 * would inset the content rather than the card.
 */
export const Unpadded: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-card [padded]="false">
        <img
          alt=""
          src="https://material.angular.dev/assets/img/examples/shiba2.jpg"
          style="display: block; width: 100%; border-radius: var(--mat-sys-corner-medium) var(--mat-sys-corner-medium) 0 0;" />
      </ui-card>`),
  }),
};

/** Padded and unpadded side by side, so the input's effect is visible rather than described. */
export const PaddedComparison: Story = {
  name: 'padded: true vs false',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
        ${[true, false]
          .map((padded) =>
            frame(`
          <ui-card [padded]="${padded}">
            <h2 uiCardHeader matCardTitle>padded: ${padded}</h2>
            ${BODY}
            <button matButton uiButton uiCardActions variant="text">Edit</button>
          </ui-card>`),
          )
          .join('\n        ')}
      </div>
    `,
  }),
};

// --- actionsAlign ----------------------------------------------------------

/** Material's default: the actions sit at the start of the row. */
export const ActionsAlignStart: Story = {
  name: 'actionsAlign: start',
  args: { actionsAlign: 'start' },
};

/**
 * The buttons move to the trailing end. This is the input that keeps a consumer
 * off `::ng-deep .mat-mdc-card-actions { justify-content: flex-end }`.
 */
export const ActionsAlignEnd: Story = {
  name: 'actionsAlign: end',
  args: { actionsAlign: 'end' },
};

// --- Escape hatches and styling hooks --------------------------------------

/**
 * `--ui-card-padding` and `--ui-card-actions-padding` are read off `<ui-card>`,
 * so restyling the box metrics is an ordinary CSS rule on an ordinary selector —
 * no `::ng-deep`, no `!important`, no wrapper.
 */
export const CustomProperties: Story = {
  name: 'Styling hook: --ui-card-padding',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-card style="--ui-card-padding: 2rem; --ui-card-actions-padding: 2rem;">
        <h2 uiCardHeader matCardTitle>Roomier</h2>
        ${BODY}
        <button matButton uiButton uiCardActions variant="text">Edit</button>
      </ui-card>`),
  }),
};

/**
 * `exportAs: 'uiCard'` hands back the component, and `matCard()` hands back
 * Material's own instance — the escape hatch for anything not wrapped here.
 */
export const TemplateRef: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-card #card="uiCard">
        <h2 uiCardHeader matCardTitle>Appearance from the instance</h2>
        <p style="margin: 0;">MatCard.appearance is currently <strong>{{ card.matCard().appearance }}</strong>.</p>
      </ui-card>`),
  }),
};

/**
 * Material's own card directives keep working inside the slots — the header slot
 * is a plain block, so `matCardAvatar`, `matCardTitle` and `matCardSubtitle` are
 * the consumer's to use, and this library does not re-export them.
 */
export const MaterialHeaderParts: Story = {
  name: 'Material: avatar, title, subtitle',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-card appearance="raised">
        <div uiCardHeader style="display: flex; align-items: center; gap: 1rem;">
          <img
            matCardAvatar
            alt=""
            src="https://material.angular.dev/assets/img/examples/shiba1.jpg" />
          <div>
            <h2 matCardTitle style="margin: 0;">Shiba Inu</h2>
            <span matCardSubtitle>Dog breed</span>
          </div>
        </div>
        <p style="margin: 0;">A hunting dog from Japan, and a very good one.</p>
        <button matButton uiButton uiCardActions variant="text">Like</button>
        <button matButton uiButton uiCardActions variant="text">Share</button>
      </ui-card>`),
  }),
};

// --- The full matrix -------------------------------------------------------

/**
 * Every appearance × padded × actionsAlign combination. This is the reference
 * grid: if a combination does not hold together here, the theme is wrong.
 */
export const AllConfigurations: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 20rem)); gap: 1.5rem;">
        ${APPEARANCES.flatMap((appearance) =>
          [true, false].flatMap((padded) =>
            ALIGNMENTS.map(
              (align) => `
          <ui-card appearance="${appearance}" [padded]="${padded}" actionsAlign="${align}">
            <h2 uiCardHeader matCardTitle style="font: var(--mat-sys-title-medium);">${appearance}</h2>
            <span uiCardHeader matCardSubtitle>padded: ${padded} · actions: ${align}</span>
            ${BODY}
            <button matButton uiButton uiCardActions variant="text">Edit</button>
            <button matButton uiButton uiCardActions variant="text">Remove</button>
          </ui-card>`,
            ),
          ),
        ).join('')}
      </div>
    `,
  }),
};
