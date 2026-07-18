import type { ComponentType } from '@angular/cdk/portal';
import {
  inject,
  Injectable,
  InjectionToken,
  makeEnvironmentProviders,
  TemplateRef,
  type EnvironmentProviders,
} from '@angular/core';
import {
  MatBottomSheet,
  MatBottomSheetConfig,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';

/**
 * Everything `MatBottomSheetConfig` takes.
 *
 * An alias rather than a re-declaration (rule 4): `data`, `hasBackdrop`,
 * `backdropClass`, `disableClose`, `ariaLabel`, `ariaModal`, `closeOnNavigation`,
 * `autoFocus`, `restoreFocus`, `scrollStrategy`, `direction`, `injector`,
 * `viewContainerRef` and the `height` / `minHeight` / `maxHeight` trio all reach
 * Material untouched, so nothing this service does not know about is swallowed.
 * `panelClass` is the one key not simply forwarded: it is merged with this
 * library's own class rather than replacing it, so a consumer adding a class
 * cannot silently strip the theme.
 */
export type UiBottomSheetConfig<D = unknown> = MatBottomSheetConfig<D>;

/**
 * The defaults every sheet this service opens starts from.
 *
 * Injected through {@link UI_BOTTOM_SHEET_DEFAULTS}, so an app tunes them once
 * instead of passing the same config at every call site.
 */
export interface UiBottomSheetDefaults {
  /**
   * How tall a sheet is allowed to get before its content scrolls.
   *
   * Material's own stylesheet says `max-height: 80vh`, but it says it as a plain
   * declaration on the container rather than as a token — so this is the one
   * sizing decision that cannot be re-pointed from the theme and has to travel
   * through the config. Naming it here is what makes it settable once.
   */
  maxHeight: string;

  /**
   * Where focus lands when the sheet opens.
   *
   * `first-tabbable` — Material's own default, and the right one for what a bottom
   * sheet usually holds: a list of actions, where the first action is what the
   * user came for. Named here rather than left implicit because it is the knob an
   * app reaches for when its sheets lead with a heading instead, where taking
   * focus to the container (`dialog`) announces that heading before the options.
   */
  autoFocus: NonNullable<MatBottomSheetConfig['autoFocus']>;
}

/**
 * The shipped defaults.
 *
 * Both are Material's own resolved values, restated rather than changed: a sheet
 * that overrides nothing behaves exactly as `MatBottomSheet`'s does. They are
 * named here because each is a reasonable thing for an app to want to set once,
 * and `maxHeight` in particular has nowhere else to live — it is a hardcoded
 * declaration in Material's container stylesheet rather than a token, so the
 * config is the only way to move it.
 */
export const UI_BOTTOM_SHEET_DEFAULT_VALUES: UiBottomSheetDefaults = {
  maxHeight: '80vh',
  autoFocus: 'first-tabbable',
};

/**
 * The defaults {@link BottomSheet} resolves against. Override with
 * {@link provideUiBottomSheetDefaults}.
 *
 * Material's own `MAT_BOTTOM_SHEET_DEFAULT_OPTIONS` still applies to everything
 * this service does not set — `hasBackdrop`, `disableClose`, `restoreFocus`,
 * `closeOnNavigation`, `direction` — and is untouched by this token, which holds
 * only the two values this service passes on every call and would therefore
 * silently override. The two compose rather than compete.
 */
export const UI_BOTTOM_SHEET_DEFAULTS = new InjectionToken<UiBottomSheetDefaults>(
  'UI_BOTTOM_SHEET_DEFAULTS',
  { providedIn: 'root', factory: () => UI_BOTTOM_SHEET_DEFAULT_VALUES },
);

/**
 * Tunes the bottom sheet defaults for an app.
 *
 * ```ts
 * bootstrapApplication(App, {
 *   providers: [provideUiBottomSheetDefaults({ maxHeight: '60vh' })],
 * });
 * ```
 *
 * Merged over the shipped defaults, so an app that only wants shorter sheets does
 * not have to restate the rest.
 */
export function provideUiBottomSheetDefaults(
  defaults: Partial<UiBottomSheetDefaults>,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: UI_BOTTOM_SHEET_DEFAULTS,
      useValue: { ...UI_BOTTOM_SHEET_DEFAULT_VALUES, ...defaults } satisfies UiBottomSheetDefaults,
    },
  ]);
}

/** The class every sheet this service opens carries, and `_bottom-sheet.scss` hangs off. */
const ROOT_CLASS = 'ui-bottom-sheet-panel';

const toClassArray = (panelClass: string | string[] | undefined): string[] =>
  panelClass == null ? [] : Array.isArray(panelClass) ? panelClass : [panelClass];

/**
 * Opens themed Material bottom sheets.
 *
 * ```ts
 * private readonly bottomSheet = inject(BottomSheet);
 *
 * async share(): Promise<void> {
 *   const target = await firstValueFrom(
 *     this.bottomSheet
 *       .open<ShareSheet, Post, ShareTarget>(ShareSheet, {
 *         data: this.post(),
 *         ariaLabel: 'Share this post',
 *       })
 *       .afterDismissed(),
 *   );
 *
 *   if (target) {
 *     this.shareTo(target);
 *   }
 * }
 * ```
 *
 * A bottom sheet has no element in anyone's template — it is opened from code,
 * into the CDK overlay — so this is a service rather than a component, the same
 * shape as {@link Dialog} and {@link Snackbar}. It is `MatBottomSheet` with this
 * library's theme and defaults applied: {@link open} mirrors Material's, takes
 * Material's own config, and returns Material's own `MatBottomSheetRef` — so
 * `afterDismissed()`, `afterOpened()`, `backdropClick()`, `keydownEvents()`,
 * `dismiss()` and `instance` are all still there.
 *
 * ### What it adds
 *
 * - **The theme.** Every sheet gets `.ui-bottom-sheet-panel`, which is what
 *   `src/styles/_bottom-sheet.scss` hangs the `--ui-bottom-sheet-*` hooks off. It
 *   re-points Material's own tokens at the shared theme's roles, so there is not
 *   a literal colour anywhere.
 * - **Defaults with somewhere to live.** See
 *   {@link UI_BOTTOM_SHEET_DEFAULT_VALUES} — in particular `maxHeight`, which
 *   Material hardcodes in a stylesheet rather than tokenising, so the config is
 *   the only way to move it.
 *
 * ### A sheet is a dialog, so name it
 *
 * Material renders the sheet into a container with `role="dialog"` and no
 * accessible name of its own — there is no `matBottomSheetTitle` the way there is
 * a `matDialogTitle`, so nothing can infer one. **Pass `ariaLabel`**, or a screen
 * reader announces an unnamed dialog:
 *
 * ```ts
 * this.bottomSheet.open(ShareSheet, { ariaLabel: 'Share this post' });
 * ```
 *
 * Everything else about the a11y is Material's and is not reimplemented here: the
 * focus trap, the focus restore on dismiss, Escape, the backdrop, and marking the
 * rest of the page `aria-hidden`.
 *
 * `aria-modal` is Material's own decision and is **off** by default, for the same
 * reason it is on {@link Dialog}: the container already marks outside content
 * `aria-hidden`, which is the same guarantee, and `aria-modal="true"` would hide
 * the CDK overlays that a `<ui-select>` or `<ui-datepicker>` *inside* the sheet
 * renders into. Turn it on per call with `ariaModal: true` — it reaches Material
 * untouched.
 *
 * ### Escape hatches
 *
 * - **Per call** — the `config` argument, which is Material's own
 *   `MatBottomSheetConfig`. `panelClass` is merged with this library's class, not
 *   replaced.
 * - **Per app** — {@link provideUiBottomSheetDefaults}, and Material's own
 *   `MAT_BOTTOM_SHEET_DEFAULT_OPTIONS` for everything this service leaves alone.
 * - **Everything else** — {@link BottomSheet.matBottomSheet} is the
 *   `MatBottomSheet` this service delegates to, unwrapped.
 *
 * Restyling needs no `::ng-deep`: a sheet renders in the CDK overlay at the end of
 * `<body>`, so it is outside every component's encapsulation already. Pass a
 * `panelClass` and set the `--ui-bottom-sheet-*` hooks on it (see
 * `_bottom-sheet.scss`).
 */
@Injectable({ providedIn: 'root' })
export class BottomSheet {
  /**
   * The `MatBottomSheet` underneath, exposed as the escape hatch for anything this
   * service does not wrap.
   */
  readonly matBottomSheet = inject(MatBottomSheet);

  private readonly defaults = inject(UI_BOTTOM_SHEET_DEFAULTS);

  /**
   * Opens a component or a template in a bottom sheet — `MatBottomSheet.open` with
   * this library's theme and defaults applied.
   *
   * The three type parameters are the ones a caller wants held to: `T` is what is
   * rendered, `D` is what `config.data` has to be, and `R` is what
   * `afterDismissed()` emits. A component reads its data with
   * `inject(MAT_BOTTOM_SHEET_DATA)` and dismisses with a result through its own
   * `MatBottomSheetRef`:
   *
   * ```ts
   * const ref = this.bottomSheet.open<ShareSheet, Post, ShareTarget>(ShareSheet, {
   *   data: this.post(),
   *   ariaLabel: 'Share this post',
   * });
   *
   * ref.afterDismissed().subscribe((target) => target && this.shareTo(target));
   * ```
   *
   * **A result is always `R | undefined`.** `afterDismissed()` emits `undefined`
   * when the sheet goes away with Escape, the backdrop, or a bare `dismiss()` — so
   * a call site has to say what "dismissed without choosing" means.
   *
   * A template gets the data as its implicit context and the ref as
   * `bottomSheetRef`:
   *
   * ```html
   * <ng-template #sheet let-post let-ref="bottomSheetRef">
   *   <button matButton (click)="ref.dismiss('email')">Share {{ post.title }}</button>
   * </ng-template>
   * ```
   */
  open<T, D = unknown, R = unknown>(
    componentOrTemplate: ComponentType<T> | TemplateRef<T>,
    config?: UiBottomSheetConfig<D>,
  ): MatBottomSheetRef<T, R> {
    const resolved = this.resolveConfig(config);

    // Narrowed rather than cast: `MatBottomSheet.open` is two overloads, one per
    // kind of content, and a union argument matches neither.
    return componentOrTemplate instanceof TemplateRef
      ? this.matBottomSheet.open<T, D, R>(componentOrTemplate, resolved)
      : this.matBottomSheet.open<T, D, R>(componentOrTemplate, resolved);
  }

  /**
   * Dismisses the sheet that is currently open, if there is one, with an optional
   * result for its `afterDismissed()`.
   *
   * Only one sheet can be open at a time — opening a second dismisses the first —
   * which is why this takes no ref. Material's own behaviour, untouched.
   */
  dismiss<R = unknown>(result?: R): void {
    this.matBottomSheet.dismiss(result);
  }

  /**
   * Layers this library's defaults under the caller's config.
   *
   * `panelClass` is the one key not simply overwritten: `.ui-bottom-sheet-panel`
   * is what carries the theme's hooks, so a consumer adding a class of their own
   * must not silently strip them (rule 4). Theirs comes last, so their rules win
   * on equal specificity.
   */
  private resolveConfig<D>(config: UiBottomSheetConfig<D> | undefined): MatBottomSheetConfig<D> {
    return {
      maxHeight: this.defaults.maxHeight,
      autoFocus: this.defaults.autoFocus,
      ...config,
      panelClass: [ROOT_CLASS, ...toClassArray(config?.panelClass)],
    };
  }
}
