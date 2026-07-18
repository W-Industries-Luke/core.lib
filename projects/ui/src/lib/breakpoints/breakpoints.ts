import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { computed, inject, Injectable, Injector, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/**
 * The three device classes this service reports, smallest first.
 *
 * These are names for CDK's own `Breakpoints.Handset` / `.Tablet` / `.Web`
 * media queries, which between them partition every viewport by width and
 * orientation, so at any size exactly one is active:
 *
 *   - `handset` — a phone. `(max-width: 599.98px)` portrait, or
 *     `(max-width: 959.98px)` landscape.
 *   - `tablet`  — a tablet. `600px–839.98px` portrait, or
 *     `960px–1279.98px` landscape.
 *   - `web`     — a laptop or desktop. `(min-width: 840px)` portrait, or
 *     `(min-width: 1280px)` landscape.
 *
 * Material picks these same three as the buckets an app lays out against, which
 * is why they are the ones named here rather than the raw `XSmall … XLarge`
 * ladder — a component asks "am I on a phone?", not "am I under 600px?". Reach
 * for a specific width through {@link UiBreakpoints.observe} when you genuinely
 * need one.
 */
export type UiDeviceClass = 'handset' | 'tablet' | 'web';

/**
 * Signals for the current responsive breakpoint, from CDK's `BreakpointObserver`.
 *
 * Several components need the same "is this a phone?" logic — a sheet that
 * becomes a dialog on desktop, a toolbar that collapses its actions into a menu,
 * a grid that drops to one column. Left to themselves each would inject
 * `BreakpointObserver`, wire up its `Observable<BreakpointState>`, and convert it
 * to a signal — the same boilerplate every time, and a second subscription to the
 * same query is how two answers to one question start to disagree. This is that
 * logic, written once and shared.
 *
 * ```ts
 * private readonly breakpoints = inject(UiBreakpoints);
 *
 * // Drive a template straight off the signals — no async pipe, no subscription.
 * protected readonly columns = computed(() => (this.breakpoints.handset() ? 1 : 3));
 * ```
 *
 * ```html
 * @if (breakpoints.handset()) {
 *   <button matIconButton (click)="menu.open()"><mat-icon>menu</mat-icon></button>
 * } @else {
 *   <nav>…</nav>
 * }
 * ```
 *
 * ### What it reports
 *
 * - {@link handset}, {@link tablet}, {@link web} — a boolean signal per device
 *   class. Exactly one is `true` at a time (see {@link UiDeviceClass}).
 * - {@link active} — the same information as a single `'handset' | 'tablet' |
 *   'web'`, for a `switch` in a template or a lookup table.
 *
 * ### Escape hatches
 *
 * - {@link observe} — a boolean signal for any custom media query or CDK
 *   breakpoint, for the cases the three device classes do not name.
 * - {@link breakpointObserver} — the `BreakpointObserver` underneath, for its
 *   imperative `isMatched(...)` and its raw `observe(...)` observable.
 *
 * Registered at the root, so every consumer shares one instance and therefore one
 * subscription per query.
 */
@Injectable({ providedIn: 'root' })
export class UiBreakpoints {
  /**
   * The `BreakpointObserver` underneath, exposed as the escape hatch for the
   * imperative `isMatched(...)` check and the raw `observe(...)` observable this
   * service does not wrap.
   */
  readonly breakpointObserver = inject(BreakpointObserver);

  private readonly injector = inject(Injector);

  /** `true` while the viewport is phone-sized. See {@link UiDeviceClass}. */
  readonly handset = this.observe(Breakpoints.Handset);

  /** `true` while the viewport is tablet-sized. See {@link UiDeviceClass}. */
  readonly tablet = this.observe(Breakpoints.Tablet);

  /** `true` while the viewport is laptop/desktop-sized. See {@link UiDeviceClass}. */
  readonly web = this.observe(Breakpoints.Web);

  /**
   * The current device class as a single value, for a template `switch` or a
   * lookup keyed by device.
   *
   * ```ts
   * protected readonly gutter = computed(
   *   () => ({ handset: 8, tablet: 16, web: 24 })[this.breakpoints.active()],
   * );
   * ```
   *
   * `web` and `tablet` are checked before `handset`, so the value is stable in the
   * fraction-of-a-pixel gaps the CDK queries leave between buckets: it can only
   * ever resolve down to `handset`, never flicker to it.
   */
  readonly active: Signal<UiDeviceClass> = computed(() =>
    this.web() ? 'web' : this.tablet() ? 'tablet' : 'handset',
  );

  /**
   * A boolean signal that tracks whether a custom media query — or one of CDK's
   * `Breakpoints` constants — currently matches.
   *
   * The escape hatch for the widths the three device classes do not name:
   *
   * ```ts
   * private readonly breakpoints = inject(UiBreakpoints);
   *
   * // A single custom query…
   * protected readonly wide = this.breakpoints.observe('(min-width: 1600px)');
   *
   * // …or several, matching if any of them do.
   * protected readonly portrait = this.breakpoints.observe([
   *   Breakpoints.HandsetPortrait,
   *   Breakpoints.TabletPortrait,
   * ]);
   * ```
   *
   * Call it from an injection context (a field initialiser, a constructor): like
   * every `toSignal` it needs one to tear the subscription down when its owner is
   * destroyed, and it reuses this service's own injector so a call outside a
   * context still works. The service's three device signals are just `observe(...)`
   * calls themselves.
   */
  observe(query: string | readonly string[]): Signal<boolean> {
    // The observer emits its current state synchronously on subscribe, so the
    // signal has a real value from the first read; `isMatched` supplies that same
    // value up front so no consumer ever sees a stale `false` for one tick.
    const q = query as string | string[];
    return toSignal(
      this.breakpointObserver.observe(q).pipe(map((state) => state.matches)),
      { initialValue: this.breakpointObserver.isMatched(q), injector: this.injector },
    );
  }
}
