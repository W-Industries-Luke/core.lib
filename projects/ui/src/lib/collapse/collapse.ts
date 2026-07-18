import { _IdGenerator } from '@angular/cdk/a11y';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  model,
} from '@angular/core';

/** Axis a {@link Collapse} animates along. */
export type UiCollapseOrientation = 'vertical' | 'horizontal';

/**
 * A generic collapsible content area — any region that opens and closes, with
 * none of the panel chrome or accordion semantics of `ui-expansion-panel`.
 *
 * This is the *low-level* primitive: it owns one thing — animating a projected
 * region open and shut along one axis — and leaves the header, the icon, the
 * grouping and the border to whatever composes it. `ui-expansion-panel` is one
 * such composition (a titled, single-open-at-a-time panel); a filter drawer, a
 * "show more" block or a sidebar section is another. See the PR notes: the
 * expansion panel *should* be rebuilt on top of this rather than the two
 * duplicating the open/close mechanics.
 *
 * ```html
 * <button uiCollapseTrigger>Details</button>
 * <ui-collapse>
 *   <p>…the collapsible body…</p>
 * </ui-collapse>
 * ```
 *
 * A trigger can also live *inside* the collapse (its projected trigger slot), or
 * anywhere else on the page pointed at it by reference — see
 * {@link CollapseTrigger}.
 *
 * ### How it animates
 *
 * The region is a one-cell CSS grid whose track goes `1fr → 0fr`. The browser
 * resolves `1fr` to the content's own size, so the open/close animation fits
 * whatever is projected — no pixel height is hardcoded and nothing is measured
 * in JS, and the region reflows for free when its content changes. The duration
 * and easing default to the fleet's motion tokens (`--ui-sys-motion-*`), and
 * `prefers-reduced-motion` drops the animation to an instant state change. See
 * `collapse.scss`.
 *
 * ### Accessibility
 *
 * The region carries a stable {@link regionId} for a trigger's `aria-controls`,
 * and when collapsed it is `inert` — dropped from the tab order and the
 * accessibility tree the instant the state flips — and `visibility: hidden` once
 * the slide finishes. So "collapsed" is never merely visual: the content cannot
 * be focused or read.
 *
 * ### Styling hooks
 *
 * - `--ui-collapse-duration` — animation duration. Default
 *   `--ui-sys-motion-duration-medium2` (300ms). The `duration` input sets this.
 * - `--ui-collapse-easing` — animation easing. Default
 *   `--ui-sys-motion-easing-emphasized`.
 */
@Component({
  selector: 'ui-collapse',
  exportAs: 'uiCollapse',
  templateUrl: './collapse.html',
  styleUrl: './collapse.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-collapse',
    '[class.ui-collapse--expanded]': 'expanded()',
    '[class.ui-collapse--horizontal]': "orientation() === 'horizontal'",
    '[class.ui-collapse--disabled]': 'disabled()',
    // Set only when the `duration` input is used; otherwise the token default in
    // `collapse.scss` stands. A style binding of `null` removes the property.
    '[style.--ui-collapse-duration]': 'durationCss()',
  },
})
export class Collapse {
  /**
   * Whether the region is open. Two-way (`model()`), so `[(expanded)]` binds it
   * and the generated `expandedChange` output fires on every change — including
   * the ones this component makes itself via {@link toggle}.
   *
   * Defaults to open: an un-triggered `<ui-collapse>` shows its content rather
   * than trapping it hidden, so the content is progressive-enhancement safe.
   */
  readonly expanded = model(true);

  /**
   * When `true`, {@link toggle}/{@link open}/{@link close} do nothing and a
   * {@link CollapseTrigger} reports `aria-disabled`. The current open state is
   * left as-is — disabling freezes the collapse, it does not close it.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Animation duration in milliseconds. When unset, the fleet's
   * `--ui-sys-motion-duration-medium2` token stands (see `collapse.scss`); set it
   * to override just this collapse.
   */
  readonly duration = input<number | null>(null);

  /** Axis the region animates along. Defaults to `vertical` (height). */
  readonly orientation = input<UiCollapseOrientation>('vertical');

  /** Stable id for the region, for a trigger's `aria-controls`. */
  readonly regionId = inject(_IdGenerator).getId('ui-collapse-');

  protected readonly durationCss = computed(() => {
    const ms = this.duration();
    return ms == null ? null : `${ms}ms`;
  });

  /** Toggles the open state, unless {@link disabled}. */
  toggle(): void {
    if (!this.disabled()) this.expanded.update((open) => !open);
  }

  /** Opens the region, unless {@link disabled}. */
  open(): void {
    if (!this.disabled()) this.expanded.set(true);
  }

  /** Closes the region, unless {@link disabled}. */
  close(): void {
    if (!this.disabled()) this.expanded.set(false);
  }
}

/**
 * Toggles a {@link Collapse} from the element it is on.
 *
 * A trigger *decorates* something a consumer already has — a button, a list-item
 * header, an icon — so this is a directive on the *native* element, not a
 * wrapper (extensibility rule 1): the element the consumer writes is the element
 * the browser gets, and `id`, `disabled`, `data-*`, `routerLink` and the rest
 * apply natively. It also composes with `uiButton` on the same element.
 *
 * It resolves the collapse it controls two ways:
 *
 * - **Projected into the collapse** — a bare `uiCollapseTrigger` inside
 *   `<ui-collapse>` finds it by injection, no wiring:
 *   ```html
 *   <ui-collapse>
 *     <button uiCollapseTrigger>Toggle</button>
 *     <p>body</p>
 *   </ui-collapse>
 *   ```
 * - **Anywhere else** — point it at a collapse by reference:
 *   ```html
 *   <button [uiCollapseTrigger]="panel">Toggle</button>
 *   <ui-collapse #panel="uiCollapse"> … </ui-collapse>
 *   ```
 *
 * It keeps the WAI-ARIA disclosure contract in sync automatically:
 * `aria-expanded` tracks the collapse, `aria-controls` points at its region, and
 * `aria-disabled` reflects a disabled collapse. On a non-`<button>` host it also
 * adds `role="button"`, a tab stop and Enter/Space handling, so *any* element
 * can be a trigger — though a real `<button>` is the accessible default and
 * needs none of that added.
 */
@Directive({
  selector: '[uiCollapseTrigger]',
  exportAs: 'uiCollapseTrigger',
  host: {
    class: 'ui-collapse-trigger',
    '(click)': 'toggle()',
    '(keydown.enter)': 'onKeydown($event)',
    '(keydown.space)': 'onKeydown($event)',
    '[attr.aria-expanded]': 'target()?.expanded() ?? null',
    '[attr.aria-controls]': 'target()?.regionId ?? null',
    '[attr.aria-disabled]': "target()?.disabled() ? 'true' : null",
    '[attr.role]': 'role',
    '[attr.tabindex]': 'tabIndex()',
  },
})
export class CollapseTrigger {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly parent = inject(Collapse, { optional: true });

  /**
   * The collapse to toggle. Bind it (`[uiCollapseTrigger]="ref"`) to control a
   * collapse elsewhere on the page; leave it bare inside a `<ui-collapse>` and it
   * falls back to the one it is projected into.
   */
  readonly explicitTarget = input<Collapse | '' | undefined>(undefined, {
    alias: 'uiCollapseTrigger',
  });

  /** The resolved collapse: the explicit binding if given, else the ancestor. */
  readonly target = computed<Collapse | null>(() => {
    const explicit = this.explicitTarget();
    return (explicit || null) ?? this.parent ?? null;
  });

  /** `<button>` is a disclosure control natively; nothing else is, so mark it. */
  private readonly isNativeButton = this.element.tagName === 'BUTTON';

  protected readonly role = this.isNativeButton ? null : 'button';

  protected readonly tabIndex = computed(() => {
    if (this.isNativeButton) return null; // natively focusable
    return this.target()?.disabled() ? '-1' : '0';
  });

  toggle(): void {
    this.target()?.toggle();
  }

  protected onKeydown(event: Event): void {
    // A native button already fires `click` on Enter/Space — toggling again here
    // would cancel it out. Only a synthesised (`role="button"`) trigger needs the
    // keyboard wired up, and Space must not scroll the page.
    if (this.isNativeButton) return;
    event.preventDefault();
    this.toggle();
  }
}
