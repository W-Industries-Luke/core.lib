import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  Directive,
  input,
  numberAttribute,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';

/** The heading level `headingLevel` falls back to, and the range ARIA defines. */
const DEFAULT_HEADING_LEVEL = 3;
const MIN_HEADING_LEVEL = 1;
const MAX_HEADING_LEVEL = 6;

/** The live-region role an empty state announces itself with by default. */
const DEFAULT_ROLE = 'status';

/**
 * Marks an element as the empty state's illustration, replacing the `icon` input.
 *
 * For anything a Material Symbols ligature cannot spell — an SVG illustration, a
 * brand mark, a `<ui-spinner>` on a list that is still resolving:
 *
 * ```html
 * <ui-empty-state title="Still looking">
 *   <img uiEmptyStateIcon src="/assets/no-orders.svg" alt="" />
 * </ui-empty-state>
 * ```
 *
 * Put it on the element itself — not on a wrapper around it: `ng-content select`
 * only matches the direct children of `<ui-empty-state>`, so a marker nested any
 * deeper lands in the default slot instead.
 */
@Directive({ selector: '[uiEmptyStateIcon]' })
export class EmptyStateIcon {}

/**
 * Marks an element for the empty state's actions row — the way out of the empty
 * state.
 *
 * Mark each action rather than a wrapper around them: the row is a flex
 * container, so the marked elements have to be its direct children for its
 * spacing and wrapping to apply to them.
 *
 * ```html
 * <button matButton uiButton uiEmptyStateActions variant="filled">Add an order</button>
 * <button matButton uiButton uiEmptyStateActions variant="text">Import a CSV</button>
 * ```
 *
 * This mirrors `uiCardActions`, for the same reason: the row is an element of
 * this component's template, so it renders only when something is projected into
 * it and a state with no action has no empty row where one would have been.
 */
@Directive({ selector: '[uiEmptyStateActions]' })
export class EmptyStateActions {}

/**
 * The placeholder for a list, table or search that has nothing to show: an icon,
 * a title, a message, and optionally the action that fills it.
 *
 * ```html
 * <ui-empty-state
 *   icon="search_off"
 *   title="No orders match your filters"
 *   message="Try widening the date range, or clear the filters to start again."
 * >
 *   <button matButton uiButton uiEmptyStateActions variant="outlined">Clear filters</button>
 * </ui-empty-state>
 * ```
 *
 * Like `ui-alert` and unlike `uiButton`, this is a component rather than a
 * directive: an empty state owns structure — a centred column of icon, title,
 * message and actions — and there is no native element to decorate. HTML has no
 * `<empty-state>`.
 *
 * ### It is composed from Material, not from scratch
 *
 * Material ships no empty state, so this component owns its own container. It
 * still owns no *colours* and no *type*: the icon is `<mat-icon>`, the action is
 * whatever Material control the consumer projects, and every colour and font
 * resolves from the `--mat-sys-*` roles that `src/styles/_theme.scss` emits — so
 * there is not a literal colour in `empty-state.scss`, and a palette change there
 * re-skins every empty state, in light and dark alike.
 *
 * ### Every part is optional
 *
 * `icon`, `title`, `message` and the actions row each render only when they have
 * something to render, so an icon-less state has no gap where the glyph would
 * have been, and a message-only state is a legitimate configuration rather than a
 * column of empty boxes.
 *
 * ### Accessibility
 *
 * The host is a polite live region (`role="status"`), so an empty state that
 * replaces a list — a search that came back with nothing — is announced without
 * stealing focus from the box the user is still typing in. Polite rather than
 * assertive, because "no results" is a report and not an emergency. A plain
 * `role` attribute overrides it where the surrounding page knows better.
 *
 * The title is a heading, so it can be reached by heading navigation, and
 * `headingLevel` places it in the surrounding document outline — a decision only
 * the consumer can make. The icon is decorative (`aria-hidden`): it repeats what
 * the title already says.
 *
 * ### Styling hooks
 *
 * - `--ui-empty-state-padding` — the container's padding. Default `48px 24px`.
 * - `--ui-empty-state-gap` — space between the icon, title and message. Default `8px`.
 * - `--ui-empty-state-icon-size` — the icon's box. Default `48px`.
 * - `--ui-empty-state-icon-color` — the icon's colour. Defaults to the message colour.
 * - `--ui-empty-state-title-color` / `--ui-empty-state-message-color` — the text colours.
 * - `--ui-empty-state-message-max-width` — the message's measure. Default `44ch`.
 * - `--ui-empty-state-actions-gap` — space between the actions. Default `8px`.
 *
 * All are read off `<ui-empty-state>`, so a consumer sets them from an ordinary
 * rule on an ordinary selector (`ui-empty-state { --ui-empty-state-padding: 0; }`)
 * — no `::ng-deep`, no `!important`. Point a colour at another `--mat-sys-*` /
 * `--ui-sys-*` role rather than a literal, so it survives a palette change and
 * dark mode.
 */
@Component({
  selector: 'ui-empty-state',
  exportAs: 'uiEmptyState',
  imports: [MatIcon],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-empty-state',
    // A binding rather than a static attribute, so that the `role` input below
    // can catch a role a consumer writes in their own template — a static
    // attribute there would be overwritten by this. See `role`.
    '[attr.role]': 'resolvedRole()',
    // `title` is an input here, but Angular also leaves a static `title="…"` on
    // the element as a real attribute — so the documented form,
    // `<ui-empty-state title="No orders yet">`, would give the whole column a
    // browser tooltip repeating its own visible heading, and name the live region
    // after it. The attribute is a side effect of the input's name, not something
    // the consumer asked for, so it is dropped. Anyone who wants a real tooltip
    // has `uiTooltip`, which is this library's answer to that question anyway.
    '[attr.title]': 'null',
  },
})
export class EmptyState {
  /**
   * The Material Symbols ligature of the icon above the title — e.g. `search_off`,
   * `inbox`, `folder_off`.
   *
   * There is no default on purpose: the icon's whole job is to say *what* is
   * empty, and a generic glyph chosen here would be wrong more often than right.
   * Leave it unset (or set `''` / `null`) for a text-only state; project a
   * `uiEmptyStateIcon` element for anything a ligature cannot spell.
   */
  readonly icon = input<string | null | undefined>(undefined);

  /**
   * The heading above the message — what is empty, in the user's words.
   *
   * "No orders match your filters" rather than "No data": this is the one line
   * that is certain to be read, so it should name the thing and, where it can,
   * hint at why the list is empty.
   *
   * This renders the heading and nothing else: the native `title` attribute
   * Angular would otherwise leave on the host — and the browser tooltip that
   * comes with it — is dropped, so `title="…"` means what it looks like it means.
   * For an actual tooltip, reach for `uiTooltip`.
   */
  readonly title = input<string | null | undefined>(undefined);

  /**
   * The line below the title — what the user can do about it.
   *
   * For a message a string cannot carry — a link, a list, anything formatted —
   * project it into the default slot instead: it lands directly below this.
   */
  readonly message = input<string | null | undefined>(undefined);

  /**
   * The title's heading level, 1–6. Defaults to 3.
   *
   * The title is a real heading so that it can be found by heading navigation,
   * but where it belongs in the document outline is something only the
   * surrounding page knows: an empty state filling a whole route wants `1` or
   * `2`, one inside a card on a dashboard wants `4`. Out-of-range and unparseable
   * values fall back to the default rather than emitting an `aria-level` no
   * screen reader could place.
   */
  readonly headingLevel = input(DEFAULT_HEADING_LEVEL, { transform: numberAttribute });

  /**
   * The live-region role, spelled as the ARIA attribute. Defaults to `status`.
   *
   * Rule 3 of the extensibility contract: a `role` a consumer writes on the host
   * has to work. The host *is* the real element here, but `[attr.role]` outranks
   * a static attribute in their template, so this input catches that attribute
   * rather than letting the host binding overwrite it.
   *
   * Reach for it when the surrounding page knows something this component cannot:
   * `role="none"` on an empty state that already sits inside a live region, say,
   * so it is not announced twice.
   */
  readonly role = input<string | undefined, unknown>(undefined, {
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * Whether a `uiEmptyStateIcon` was projected, which is what decides between it
   * and the `icon` input — the two are mutually exclusive, so this is a query
   * rather than a second `<ng-content>` that would render both.
   *
   * `descendants: false` mirrors what `ng-content select` actually projects: only
   * direct children of `<ui-empty-state>`. A deeper marker is not projected, so it
   * must not suppress the ligature either — that would leave no icon at all.
   */
  protected readonly iconSlot = contentChild(EmptyStateIcon, { descendants: false });

  /** The actions projected into the row, which renders only when there are some. */
  protected readonly actionSlots = contentChildren(EmptyStateActions, { descendants: false });

  /** The ligature actually rendered, or `null` for a state with no icon. */
  protected readonly resolvedIcon = computed(() => this.icon()?.trim() || null);

  /** The title actually rendered, or `null` for a state with no heading. */
  protected readonly resolvedTitle = computed(() => this.title()?.trim() || null);

  /** The message actually rendered, or `null` for a state with no message. */
  protected readonly resolvedMessage = computed(() => this.message()?.trim() || null);

  /** The heading level actually applied, held to the 1–6 that ARIA defines. */
  protected readonly resolvedHeadingLevel = computed(() => {
    const level = this.headingLevel();
    return Number.isInteger(level) && level >= MIN_HEADING_LEVEL && level <= MAX_HEADING_LEVEL
      ? level
      : DEFAULT_HEADING_LEVEL;
  });

  /**
   * The role actually put on the host: the consumer's if they wrote one, and the
   * polite live region otherwise. Widened to `string`, because a consumer's role
   * is whatever their page needs — `none`, `region`, `note` — not one of ours.
   */
  protected readonly resolvedRole = computed((): string => this.role()?.trim() || DEFAULT_ROLE);
}
