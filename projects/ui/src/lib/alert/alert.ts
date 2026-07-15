import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  Directive,
  input,
  model,
  output,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

/**
 * Semantic status the alert reports.
 *
 * Material has no first-class inline alert, so these are not a Material union to
 * alias — they are this library's, resolved in `alert.scss` against the M3
 * *container* roles the shared theme emits:
 *
 *   - `info`    — the theme's `secondary-container`, M3's muted informational
 *                 surface. Not a status colour: it is the brand's own quiet tint,
 *                 so an informational banner does not borrow the urgency of a
 *                 colour that means something.
 *   - `success` — the theme's `--ui-sys-success-container` role
 *   - `warning` — the theme's `--ui-sys-warning-container` role
 *   - `error`   — the theme's `error-container` palette (M3's own)
 *
 * `success` and `warning` are roles this library adds to the theme, derived from
 * Material's prebuilt palettes the same way Material derives
 * `secondary-container` — the reduced-chroma ramp M3 uses for a quiet tinted
 * surface. See `src/styles/_theme.scss`, which explains why a banner cannot take
 * the bold ramp's tone 90.
 */
export type UiAlertVariant = 'info' | 'success' | 'warning' | 'error';

/**
 * The ARIA role an alert announces itself with — see {@link Alert.role}.
 *
 * `alert` is an assertive live region: it interrupts a screen reader mid-sentence.
 * `status` is polite: it waits its turn.
 */
export type UiAlertRole = 'alert' | 'status';

/**
 * How each variant announces itself.
 *
 * `alert` is assertive, so it is reserved for the two variants that report
 * something gone wrong. Announcing "3 items saved" by cutting the user off
 * mid-sentence is the misuse the ARIA spec warns about, so `info` and `success`
 * stay polite.
 */
const VARIANT_ROLES: Readonly<Record<UiAlertVariant, UiAlertRole>> = {
  info: 'status',
  success: 'status',
  warning: 'alert',
  error: 'alert',
};

/**
 * The Material Symbols ligature each variant leads with.
 *
 * The icon carries the same meaning as the colour, which is what keeps the
 * variant legible to someone who cannot separate green from orange: colour is
 * never the only channel here (WCAG 1.4.1).
 */
const VARIANT_ICONS: Readonly<Record<UiAlertVariant, string>> = {
  info: 'info',
  success: 'check_circle',
  warning: 'warning',
  error: 'error',
};

/** The dismiss button's accessible name when a consumer gives none. */
const DEFAULT_DISMISS_LABEL = 'Dismiss';

/**
 * Marks an element as the alert's title, above the message.
 *
 * ```html
 * <ui-alert variant="error">
 *   <h3 uiAlertTitle>Upload failed</h3>
 *   The file was larger than the 10 MB limit.
 * </ui-alert>
 * ```
 *
 * Put it on the element itself — not on a wrapper around it: `ng-content select`
 * only matches the direct children of `<ui-alert>`, so a marker nested any deeper
 * lands in the message slot instead.
 *
 * The element stays the consumer's. Only its typography is this library's —
 * M3's `title-small`, applied by `src/styles/_alert.scss` — so use whichever
 * heading level the surrounding document outline calls for, which is a decision
 * only the consumer can make. This is the shape `matCardTitle` has, for the same
 * reason.
 */
@Directive({ selector: '[uiAlertTitle]' })
export class AlertTitle {}

/**
 * Marks an element as the alert's leading icon, replacing the variant's own.
 *
 * For anything the `icon` input cannot spell — an SVG icon, an avatar, a
 * `<ui-spinner>` on an alert that is still resolving:
 *
 * ```html
 * <ui-alert variant="info">
 *   <ui-spinner uiAlertIcon [diameter]="20" label="Reconnecting" />
 *   Reconnecting to the server…
 * </ui-alert>
 * ```
 *
 * Mark the element itself, for the same reason as {@link AlertTitle}.
 */
@Directive({ selector: '[uiAlertIcon]' })
export class AlertIcon {}

/**
 * An inline message banner: an icon, a message, and optionally a dismiss button.
 *
 * ```html
 * <ui-alert variant="success">Your changes have been saved.</ui-alert>
 *
 * <ui-alert variant="error" dismissible (dismissed)="acknowledge()">
 *   <h3 uiAlertTitle>Upload failed</h3>
 *   The file was larger than the 10 MB limit.
 * </ui-alert>
 * ```
 *
 * Like `ui-card` and unlike `uiButton`, this is a component rather than a
 * directive: an alert owns structure — a leading icon, a content column, a
 * trailing dismiss button — and there is no native element to decorate. HTML has
 * no `<alert>`.
 *
 * ### It is composed from Material, not from scratch
 *
 * Material ships no inline alert, so this is the one component here that owns its
 * own container. It still owns no *colours*: the icon is `<mat-icon>`, the
 * dismiss button is Material's own `matIconButton`, and every colour resolves
 * from the M3 container roles that `src/styles/_theme.scss` emits — so there is
 * not a literal colour in `alert.scss`, and a palette change there re-skins every
 * alert, in light and dark alike.
 *
 * ### Dismissal
 *
 * `dismissible` adds the trailing close button. Pressing it closes the alert on
 * its own — `open` is a `model()`, so the common case needs no wiring — and then
 * emits `dismissed`.
 *
 * The two are not redundant, and which one to reach for depends on what is being
 * asked:
 *
 *   - `(dismissed)` — *the user dismissed this*. Fires only for the button, never
 *     for a programmatic close, so it is the one to log, or to persist a "don't
 *     show me this again" against.
 *   - `[(open)]` — *whether the alert is showing*. Two-way, so a consumer can
 *     close it from their own code (`open.set(false)`), re-open it, or keep the
 *     state in a store. Rule 5: two-way state is a `model()`, not an input and an
 *     output pretending to be one.
 *
 * A closed alert stays in the DOM as `display: none`, so it is out of the
 * accessibility tree and can be re-opened. To drop it entirely, keep it in an
 * `@if` and let `(dismissed)` flip the condition.
 *
 * ### Accessibility
 *
 * The host is a live region, so an alert appearing is announced without moving
 * focus. `role` follows `variant`: `alert` (assertive) for `error` and `warning`,
 * `status` (polite) otherwise — announcing "saved" by interrupting the user
 * mid-sentence is the misuse the ARIA spec warns about. A plain `role` attribute
 * overrides it where the surrounding page knows better.
 *
 * The icon is decorative (`aria-hidden`): it repeats what the text already says,
 * for people who cannot read the colour. The dismiss button is a real `<button>`
 * — focusable, `Enter`/`Space` activated, and named `Dismiss` unless
 * `dismissLabel` says otherwise.
 *
 * ### Styling hooks
 *
 * - `--ui-alert-background-color` / `--ui-alert-text-color` — the container's
 *   colours, defaulting to the `variant`'s roles.
 * - `--ui-alert-icon-color` — the leading icon's colour. Defaults to the text
 *   colour.
 * - `--ui-alert-padding` — the container's padding. Default `12px 16px`.
 * - `--ui-alert-radius` — the corner radius. Defaults to M3's `corner-medium`.
 *
 * All are read off `<ui-alert>`, so a consumer sets them from an ordinary rule on
 * an ordinary selector (`ui-alert { --ui-alert-radius: 0; }`) — no `::ng-deep`,
 * no `!important`. Point a colour at another `--mat-sys-*` / `--ui-sys-*` role
 * rather than a literal, so it survives a palette change and dark mode.
 */
@Component({
  selector: 'ui-alert',
  exportAs: 'uiAlert',
  imports: [MatIcon, MatIconButton],
  templateUrl: './alert.html',
  styleUrl: './alert.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-alert',
    '[class.ui-alert--info]': 'variant() === "info"',
    '[class.ui-alert--success]': 'variant() === "success"',
    '[class.ui-alert--warning]': 'variant() === "warning"',
    '[class.ui-alert--error]': 'variant() === "error"',
    '[class.ui-alert--closed]': '!open()',
    // A binding rather than a static attribute, because the role has to track
    // `variant`. That would overwrite a `role` a consumer writes in their own
    // template, so the `role` input below catches it first — see `role`.
    '[attr.role]': 'resolvedRole()',
  },
})
export class Alert {
  /** Semantic status the alert reports. Defaults to `info`. */
  readonly variant = input<UiAlertVariant>('info');

  /**
   * Whether the alert shows a trailing dismiss button.
   *
   * Off by default: an alert that reports the state of the page — a validation
   * summary, an outage banner — is not the user's to dismiss, because dismissing
   * it would not make the thing it reports go away.
   */
  readonly dismissible = input(false, { transform: booleanAttribute });

  /**
   * Whether the alert is showing. Two-way; defaults to open.
   *
   * The dismiss button sets this to `false` itself, so `dismissible` works with
   * no wiring. Bind it (`[(open)]`) to close, re-open, or restore an alert from
   * your own state.
   */
  readonly open = model(true);

  /**
   * Emits when the **user** dismisses the alert with the close button.
   *
   * Not emitted when `open` is set programmatically: this is the signal that a
   * person chose to make the message go away, which is the thing worth acting on
   * — persisting a "don't show this again", or retrying the work behind it.
   */
  readonly dismissed = output<void>();

  /**
   * The Material Symbols ligature of the leading icon — e.g. `cloud_off`.
   *
   * Defaults to the variant's own icon (`info`, `check_circle`, `warning`,
   * `error`). Set it to `''` or `null` for an alert with no icon; project a
   * `uiAlertIcon` element for anything a ligature cannot spell.
   */
  readonly icon = input<string | null | undefined>(undefined);

  /**
   * The dismiss button's accessible name. Defaults to `Dismiss`.
   *
   * The button's only content is an `×` glyph, so this is the entire label a
   * screen reader has to work with. Name it for what dismissing *does* where a
   * page has several alerts — `Dismiss the outage notice`. Blank falls back to
   * the default rather than leaving an unnamed button.
   */
  readonly dismissLabel = input<string>();

  /**
   * The live-region role, spelled as the ARIA attribute. Defaults to `alert` for
   * `error` / `warning` and `status` otherwise.
   *
   * Rule 3 of the extensibility contract: a `role` a consumer writes on the host
   * has to work. The host *is* the real element here, but `[attr.role]` outranks
   * a static attribute in their template, so this input catches that attribute
   * rather than letting the host binding overwrite it.
   *
   * Reach for it when the surrounding page knows something this component cannot:
   * `role="none"` on an alert that already sits inside a live region, say, so the
   * message is not announced twice.
   */
  readonly role = input<string | undefined, unknown>(undefined, {
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * Whether a `uiAlertIcon` was projected, which is what decides between it and
   * the variant's own icon — the two are mutually exclusive, so this is a query
   * rather than a second `<ng-content>` that would render both.
   *
   * The title needs no equivalent: it always projects, and the space above the
   * message is the content column's `gap`, which a single-child column never
   * applies. So a title-less alert has no empty region to collapse, and one whose
   * author forgot to import `AlertTitle` still renders.
   *
   * `descendants: false` mirrors what `ng-content select` actually projects: only
   * direct children of `<ui-alert>`. A deeper marker is not projected, so it must
   * not suppress the default icon either — that would leave no icon at all.
   */
  protected readonly iconSlot = contentChild(AlertIcon, { descendants: false });

  /** The ligature actually rendered, or `null` for an alert with no icon. */
  protected readonly resolvedIcon = computed(() => {
    const icon = this.icon();
    return icon === undefined ? VARIANT_ICONS[this.variant()] : icon?.trim() || null;
  });

  /**
   * The role actually put on the host: the consumer's if they wrote one, and the
   * variant's own otherwise. Widened to `string`, because a consumer's role is
   * whatever their page needs — `none`, `log`, `alertdialog` — not one of ours.
   */
  protected readonly resolvedRole = computed(
    (): string => this.role()?.trim() || VARIANT_ROLES[this.variant()],
  );

  /** The name actually put on the dismiss button. */
  protected readonly resolvedDismissLabel = computed(
    () => this.dismissLabel()?.trim() || DEFAULT_DISMISS_LABEL,
  );

  /**
   * Closes the alert and reports that the user did it.
   *
   * Deliberately not public: `dismissed` means *a person pressed the button*, and
   * a method anyone could call would quietly make that untrue. Closing an alert
   * from code is `open.set(false)`, which is what `open` being a `model()` is for.
   */
  protected dismiss(): void {
    this.open.set(false);
    this.dismissed.emit();
  }
}
