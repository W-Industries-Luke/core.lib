import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  contentChild,
  contentChildren,
  Directive,
  input,
  viewChild,
} from '@angular/core';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  type MatCardAppearance,
} from '@angular/material/card';

/**
 * Visual style of the card.
 *
 * A subset of `MatCardAppearance` — the two treatments this library ships. It
 * is written as an `Extract` rather than a fresh union so that a rename upstream
 * is a compile error here rather than a silently unstyled card. `filled` is
 * deliberately left out: under the shared theme it renders as
 * `surface-container-highest`, which reads as a *nested* surface.
 */
export type UiCardAppearance = Extract<MatCardAppearance, 'raised' | 'outlined'>;

/** Which end of the card the action buttons sit at. Mirrors `MatCardActions.align`. */
export type UiCardActionsAlign = 'start' | 'end';

/**
 * Marks an element for the card's header slot.
 *
 * Put it on the element itself — `<h2 uiCardHeader matCardTitle>` — not on a
 * wrapper around it: `ng-content select` only matches the direct children of
 * `<ui-card>`, so a marker nested any deeper is never projected.
 *
 * The slot is a plain block, so Material's own `matCardTitle` / `matCardSubtitle`
 * stack inside it exactly as they do in a hand-written `<mat-card>`.
 */
@Directive({ selector: '[uiCardHeader]' })
export class CardHeader {}

/**
 * Marks an element for the card's actions slot.
 *
 * Mark each action rather than a wrapper around them: the slot is Material's own
 * `<mat-card-actions>` flex row, so the marked elements have to be its direct
 * children for `actionsAlign` and its spacing to apply to them.
 *
 * ```html
 * <button matButton uiButton uiCardActions>Save</button>
 * <button matButton uiButton uiCardActions variant="text">Cancel</button>
 * ```
 */
@Directive({ selector: '[uiCardActions]' })
export class CardActions {}

/**
 * A themed Material card with header, body and actions slots.
 *
 * Unlike `uiButton`, this is a component rather than a directive: a card owns
 * structure — three regions, in a fixed order, each with its own box metrics —
 * and that structure is the thing being shared. There is no native element to
 * decorate here.
 *
 * ```html
 * <ui-card appearance="raised">
 *   <h2 uiCardHeader matCardTitle>Shipping address</h2>
 *   <p>1 Infinite Loop, Cupertino</p>
 *   <button matButton uiButton uiCardActions>Edit</button>
 * </ui-card>
 * ```
 *
 * Everything visual comes from Material: the container, elevation, outline and
 * corner radius are `<mat-card>`'s own, resolved from the M3 system tokens that
 * `src/styles/_theme.scss` emits, so there is not a colour in `card.scss`. This
 * component owns only the padding of the three slots — which is what `padded`
 * and the custom properties below need in order to exist at all without a
 * consumer reaching for `::ng-deep`.
 *
 * ### Empty slots collapse
 *
 * The header and actions regions render only when something is projected into
 * them, so a card with no header has no stray padding where one would have been.
 *
 * ### Styling hooks
 *
 * - `--ui-card-padding` — padding of the header and body. Default `16px`.
 * - `--ui-card-actions-padding` — padding of the actions row. Default `8px`.
 *
 * Both are read off `<ui-card>`, so a consumer sets them from their own
 * stylesheet (`ui-card { --ui-card-padding: 24px; }`) with no `::ng-deep`.
 * `[padded]="false"` overrides both to zero.
 */
@Component({
  selector: 'ui-card',
  exportAs: 'uiCard',
  imports: [MatCard, MatCardContent, MatCardActions],
  templateUrl: './card.html',
  styleUrl: './card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // A marker class rather than a `[style.--ui-card-padding]` binding, so that
    // `padded` beats a `--ui-card-padding` coming from a stylesheet rule:
    // turning the padding off is an explicit instruction, not a new default.
    '[class.ui-card--flush]': '!padded()',
  },
})
export class Card {
  /** Visual style of the card. Defaults to the flatter `outlined` treatment. */
  readonly appearance = input<UiCardAppearance>('outlined');

  /**
   * Whether the slots carry Material's standard padding.
   *
   * Turn it off for a card whose body is edge-to-edge — a full-bleed image, a
   * table, a list — where the padding would inset the content rather than the
   * card.
   */
  readonly padded = input(true, { transform: booleanAttribute });

  /** Which end of the actions row the buttons sit at. Defaults to Material's `start`. */
  readonly actionsAlign = input<UiCardActionsAlign>('start');

  /**
   * The `MatCard` this component renders — the escape hatch for anything not
   * wrapped here. Reach it with `#card="uiCard"` and `card.matCard()`.
   */
  readonly matCard = viewChild.required(MatCard);

  // `descendants: false` mirrors what `ng-content select` actually projects:
  // only direct children of `<ui-card>`. A deeper marker is not projected, so it
  // must not light up the slot either — that would render an empty region.
  protected readonly headerSlot = contentChild(CardHeader, { descendants: false });
  protected readonly actionSlots = contentChildren(CardActions, { descendants: false });
}
