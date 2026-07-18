import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  effect,
  inject,
  input,
  model,
  untracked,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { map, switchMap } from 'rxjs';

/**
 * How the drawer sits against the main content.
 *
 * These are Material's own drawer modes, handed straight to `<mat-sidenav>`
 * rather than translated:
 *
 *   - `side` — the drawer takes its own column and the content shrinks beside it.
 *     The only non-modal mode: no scrim, no focus trap, so the content stays usable
 *     while the drawer is open. This library's default — a `ui-sidenav` is an app
 *     shell's navigation first, and a column is what that looks like on a screen
 *     with room for one.
 *   - `over` — the drawer floats above the content behind a scrim. What
 *     {@link Sidenav.compact} switches to on a small screen.
 *   - `push` — the drawer takes its own column and shoves the content sideways
 *     rather than shrinking it. Modal like `over`, not like `side`: Material scrims
 *     everything that is not `side`, so a `push` drawer takes a scrim and a focus
 *     trap too. For content that cannot reflow — a fixed-width canvas, a wide table
 *     you would rather scroll than squeeze.
 */
export type UiSidenavMode = 'over' | 'push' | 'side';

/** Which edge the drawer is anchored to, in Material's direction-aware terms. */
export type UiSidenavPosition = 'start' | 'end';

/**
 * Marks the content that belongs *in* the drawer, rather than in the main area
 * beside it.
 *
 * Everything projected into `<ui-sidenav>` without this marker is the main
 * content, so the everyday shell marks one element:
 *
 * ```html
 * <ui-sidenav>
 *   <nav uiSidenavDrawer aria-label="Main"> … </nav>
 *   <main> … </main>
 * </ui-sidenav>
 * ```
 *
 * The marked element is projected into Material's own `<mat-sidenav>`, so it is
 * inside the drawer's focus trap and its scroll container rather than in a box of
 * ours beside it. Mark the element itself rather than a wrapper around it:
 * `ng-content select` only matches direct children of `<ui-sidenav>` anyway, so a
 * marker nested deeper is never projected into the drawer.
 */
@Directive({ selector: '[uiSidenavDrawer]' })
export class SidenavDrawer {}

/**
 * A themed Material sidenav: a drawer, the main content beside it, and the
 * responsive rule that turns the first into an overlay when there is no room for
 * a column.
 *
 * ```html
 * <ui-sidenav #nav="uiSidenav" [(opened)]="navOpen">
 *   <nav uiSidenavDrawer aria-label="Main">
 *     <a routerLink="/orders">Orders</a>
 *   </nav>
 *
 *   <ui-toolbar>
 *     <button matIconButton uiToolbarStart aria-label="Toggle navigation" (click)="nav.toggle()">
 *       <mat-icon>menu</mat-icon>
 *     </button>
 *     <h1>Orders</h1>
 *   </ui-toolbar>
 *   <main> … </main>
 * </ui-sidenav>
 * ```
 *
 * Like `ui-toolbar` and unlike `uiButton`, this is a component rather than a
 * directive: a sidenav owns *composition* — two regions whose relationship (a
 * column beside, a sheet over) is the whole widget. There is no native element to
 * decorate.
 *
 * ### It is Material, not a re-implementation
 *
 * The drawer, the scrim, the slide, the content's margin, the focus trap, the
 * `Escape`-to-close and every colour are `<mat-sidenav-container>`'s own, resolved
 * from the `--mat-sys-*` tokens that `src/styles/_theme.scss` emits — so there is
 * not a literal colour in `sidenav.scss`, and a palette change there re-skins every
 * sidenav in the fleet, in light and dark alike. This component owns only the
 * responsive rule and the hooks below.
 *
 * ### Sizing
 *
 * Material's container is `display: block` and takes the height it is given, so
 * give it one — an app shell usually wants `ui-sidenav { height: 100dvh; }`. A
 * container with no height is a drawer with no height, which looks like a drawer
 * that did not render.
 *
 * ### Responsive
 *
 * {@link mode} is what the layout asks for; {@link compact} is whether the screen
 * can give it. Below {@link compactBreakpoint} the drawer is forced to `over`,
 * because a 360px column out of a 360px viewport leaves no content — the same
 * `BreakpointObserver` rule every app hand-rolls, which is why it is here once
 * rather than in each of them.
 *
 * Going compact also closes the drawer and re-opens it on the way back out (see
 * {@link opened}), so the wide layout's state survives a rotation. Set
 * `[responsive]="false"` to opt out of all of it and let {@link mode} stand.
 *
 * ### Accessibility
 *
 * No role is imposed on the drawer, which is Material's own choice for
 * `<mat-sidenav>` and the honest one: what the drawer *is* depends on what a
 * consumer puts in it. Say so at the call site — `<nav uiSidenavDrawer
 * aria-label="Main">` for the navigation a sidenav usually holds. The projected
 * element is the real element, so its attributes need no forwarding (rule 3).
 *
 * In `over` mode Material traps focus in the drawer and closes it on `Escape`; in
 * `side` mode it does neither, because the content beside it is still in use.
 * Neither is re-implemented here.
 *
 * ### Styling hooks
 *
 * - `--ui-sidenav-width` — the drawer's width. M3's `360px` by default.
 * - `--ui-sidenav-background-color` / `--ui-sidenav-text-color` — the drawer.
 * - `--ui-sidenav-content-background-color` / `--ui-sidenav-content-text-color` —
 *   the main area beside it.
 * - `--ui-sidenav-scrim-color` — the scrim behind an `over` drawer.
 * - `--ui-sidenav-shape` — the drawer's outer corners.
 * - `--ui-sidenav-divider-color` — the rule between a `side`/`push` drawer and the
 *   content. `transparent` by default, as in M3.
 * - `--ui-sidenav-elevation` — the drawer's shadow. `none` by default, as in M3.
 *
 * All are read off `<ui-sidenav>`, so a consumer sets them from an ordinary rule
 * (`ui-sidenav { --ui-sidenav-width: 16rem; }`) with no `::ng-deep`. Point the
 * colours at another `--mat-sys-*` role rather than a literal, so they survive a
 * palette change and dark mode.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiSidenav'` hands back the component, and {@link matSidenav} /
 * {@link matSidenavContainer} hand back Material's own instances — so
 * `nav.matSidenav().open('keyboard')` or `nav.matSidenavContainer().scrollable`
 * needs no API here (rule 4).
 */
@Component({
  selector: 'ui-sidenav',
  exportAs: 'uiSidenav',
  imports: [MatSidenavContainer, MatSidenav, MatSidenavContent],
  templateUrl: './sidenav.html',
  styleUrl: './sidenav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidenav {
  private readonly breakpointObserver = inject(BreakpointObserver);

  /**
   * Whether the drawer is open, two-way.
   *
   * A `model` rather than an input/output pair (rule 5): `[(opened)]` keeps a
   * signal in step with the drawer, `[opened]` drives it one way, and
   * `(openedChange)` observes it — all from one declaration, with no way for the
   * two halves to disagree.
   *
   * Everything that closes a drawer writes back through this one signal, so a
   * consumer's state never drifts from what is on screen: a click on the scrim,
   * `Escape`, and the {@link compact} switch below all land here rather than only
   * on Material's own instance.
   */
  readonly opened = model(false);

  /**
   * How the drawer sits against the content. Defaults to `side` — see
   * {@link UiSidenavMode}.
   *
   * This is what the layout asks for. What it *gets* is this, unless the screen is
   * {@link compact} — which forces `over` whatever was asked for.
   */
  readonly mode = input<UiSidenavMode>('side');

  /** Which edge the drawer is anchored to. Defaults to `start`, as Material does. */
  readonly position = input<UiSidenavPosition>('start');

  /**
   * Whether a narrow screen overrides {@link mode} to `over`.
   *
   * On by default: a drawer that keeps its column on a phone leaves no room for
   * the thing the drawer navigates to. Turn it off for a sidenav that is not the
   * page's shell — a panel inside a pane that is already sized — where the
   * viewport's width says nothing about the space this drawer is in.
   */
  readonly responsive = input(true, { transform: booleanAttribute });

  /**
   * The media query (or queries) below which the layout is {@link compact}.
   *
   * Defaults to CDK's `Breakpoints.Handset`, the breakpoint Angular Material's own
   * responsive sidenav uses: a phone in either orientation. Pass a query of your
   * own for a shell whose drawer needs the room sooner —
   * `compactBreakpoint="(max-width: 60rem)"`.
   */
  readonly compactBreakpoint = input<string | readonly string[]>(Breakpoints.Handset);

  /**
   * Whether the drawer stays put when the user clicks the scrim or presses
   * `Escape`.
   *
   * Material's own default of `false` is kept: a drawer is usually navigation, and
   * navigation a user cannot dismiss is a trap. Reach for it only when closing
   * would lose something — a drawer holding an unsaved edit.
   */
  readonly disableClose = input(false, { transform: booleanAttribute });

  /**
   * Whether the drawer is fixed to the viewport rather than scrolling with the
   * page — Material's `fixedInViewport`.
   *
   * For a shell whose page scrolls behind a drawer that should not. A shell that
   * sizes `ui-sidenav` to the viewport (`height: 100dvh`) does not need it.
   */
  readonly fixedInViewport = input(false, { transform: booleanAttribute });

  /**
   * Whether the container draws a scrim, overriding what the mode implies.
   *
   * `null` (the default) leaves Material's own rule alone: a scrim for every mode
   * that is not `side` — so `over` and `push` both take one. `true` puts one behind
   * a `side` drawer as well; `false` takes it away from an `over` one.
   *
   * Not a `booleanAttribute`, because the third state is the default and the one
   * worth keeping — coercing `null` to `false` would silently strip the scrim off
   * every `over` drawer.
   */
  readonly hasBackdrop = input<boolean | null>(null);

  /**
   * The `MatSidenav` this component renders — the escape hatch for anything not
   * wrapped here (rule 4), e.g. `nav.matSidenav().open('keyboard')`. Reach it with
   * `#nav="uiSidenav"`.
   */
  readonly matSidenav = viewChild.required(MatSidenav);

  /**
   * The `MatSidenavContainer` around it — the other half of rule 4, e.g.
   * `nav.matSidenavContainer().scrollable` or `.updateContentMargins()`.
   */
  readonly matSidenavContainer = viewChild.required(MatSidenavContainer);

  /** Whether {@link compactBreakpoint} matches, ignoring {@link responsive}. */
  private readonly narrow = toSignal(
    // `compactBreakpoint` is an input, so the observation follows it rather than
    // being set up once: `switchMap` drops the old query's subscription when a
    // consumer swaps it, which is what stops a stale query from still deciding the
    // layout.
    toObservable(this.compactBreakpoint).pipe(
      switchMap((query) => this.breakpointObserver.observe(query)),
      map((state) => state.matches),
    ),
    { initialValue: false },
  );

  /**
   * Whether the screen is too narrow for the drawer to have a column of its own.
   *
   * Public and read-only: a shell often wants to know — to swap in a menu button
   * that is only there while the drawer is an overlay, say — and re-observing the
   * same breakpoint alongside this component is how two answers to one question
   * start disagreeing.
   */
  readonly compact = computed(() => this.responsive() && this.narrow());

  /**
   * The mode Material is actually given: {@link mode}, unless the screen is
   * {@link compact} and forces `over`.
   */
  protected readonly resolvedMode = computed<UiSidenavMode>(() =>
    this.compact() ? 'over' : this.mode(),
  );

  /**
   * The drawer's open state from before the layout went compact, or `null` while
   * the layout is wide.
   *
   * A plain field rather than a signal: nothing renders from it, and it is only
   * ever read inside the effect that wrote it.
   */
  private openedBeforeCompact: boolean | null = null;

  constructor() {
    // The compact switch is not only about the mode. A `side` drawer that was open
    // becomes an `over` one the moment the screen narrows — a sheet, over the
    // content, behind a scrim, that the user never asked for. So going compact
    // closes it, and coming back out restores what it was, leaving the wide
    // layout's state intact across a rotation.
    //
    // It writes through `opened` rather than around it, so a consumer's binding
    // hears about every one of these (rule 5) instead of being left holding a
    // `true` for a drawer that is shut.
    effect(() => {
      const compact = this.compact();

      untracked(() => {
        if (compact) {
          // Only on the way *in*: a user who opens the drawer while compact must
          // not have that overwrite the state held for the wide layout.
          if (this.openedBeforeCompact === null) {
            this.openedBeforeCompact = this.opened();
            this.opened.set(false);
          }
        } else if (this.openedBeforeCompact !== null) {
          const restored = this.openedBeforeCompact;
          this.openedBeforeCompact = null;
          this.opened.set(restored);
        }
      });
    });
  }

  /** Opens the drawer, through {@link opened} so a two-way binding follows. */
  open(): void {
    this.opened.set(true);
  }

  /** Closes the drawer, through {@link opened} so a two-way binding follows. */
  close(): void {
    this.opened.set(false);
  }

  /**
   * Flips the drawer open or shut — what a shell's menu button calls.
   *
   * `<button matIconButton (click)="nav.toggle()">` with `#nav="uiSidenav"`.
   */
  toggle(): void {
    this.opened.update((opened) => !opened);
  }
}
