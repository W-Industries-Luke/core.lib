import type { AriaLivePoliteness } from '@angular/cdk/a11y';
import type { ComponentType } from '@angular/cdk/portal';
import {
  EmbeddedViewRef,
  inject,
  Injectable,
  InjectionToken,
  makeEnvironmentProviders,
  TemplateRef,
  type EnvironmentProviders,
} from '@angular/core';
import {
  MatSnackBar,
  MatSnackBarConfig,
  MatSnackBarRef,
  type MatSnackBarHorizontalPosition,
  type MatSnackBarVerticalPosition,
  type TextOnlySnackBar,
} from '@angular/material/snack-bar';

/**
 * Semantic status a snackbar reports.
 *
 * Material's snackbar has no variants of its own — it is one neutral toast — so
 * these are this library's, resolved in `src/styles/_snackbar.scss` against the
 * roles the shared theme emits:
 *
 *   - `info`    — M3's own snackbar colours (`inverse-surface` /
 *                 `inverse-on-surface`), which is what a neutral toast already
 *                 is. It therefore ships no colour override at all.
 *   - `success` — the theme's `--ui-sys-success` role
 *   - `error`   — M3's own `error` palette
 *
 * These are the *bold* roles, not the `-container` ones `ui-alert` uses. A
 * snackbar is a small floating chip over unrelated content rather than a banner
 * tinting a block of text, so it wants the same solid, high-contrast surface M3
 * gives the default snackbar — see `_snackbar.scss`.
 */
export type UiSnackbarVariant = 'success' | 'error' | 'info';

/**
 * Everything `MatSnackBarConfig` takes, plus the variant.
 *
 * Extending rather than re-declaring is rule 4: `panelClass`, `direction`,
 * `data`, `viewContainerRef`, `announcementMessage` and the positions all reach
 * Material untouched, so nothing this service does not know about is swallowed.
 * Anything set here wins over the variant's defaults, except `panelClass`, which
 * is merged with the variant's own classes rather than replacing them.
 */
export interface UiSnackbarConfig<D = unknown> extends MatSnackBarConfig<D> {
  /** Semantic status the snackbar reports. Defaults to `info`. */
  variant?: UiSnackbarVariant;
}

/**
 * The defaults every snackbar this service opens starts from.
 *
 * Injected through {@link UI_SNACKBAR_DEFAULTS}, so an app tunes them once
 * instead of passing the same config at every call site.
 */
export interface UiSnackbarDefaults {
  /**
   * How long each variant stays up, in milliseconds. `0` means "until
   * dismissed" — a snackbar with a `0` duration always gets an action button, so
   * it can never strand the user with a toast that will not go away (see
   * {@link UiSnackbarDefaults.dismissAction}).
   */
  duration: Readonly<Record<UiSnackbarVariant, number>>;

  /** Where the snackbar sits horizontally. */
  horizontalPosition: MatSnackBarHorizontalPosition;

  /** Where the snackbar sits vertically. */
  verticalPosition: MatSnackBarVerticalPosition;

  /**
   * The action label used for a snackbar that never times out and was given no
   * action of its own.
   */
  dismissAction: string;
}

/**
 * The shipped defaults.
 *
 * - **Duration.** M3 puts a snackbar between 4 and 10 seconds, so 5 seconds is
 *   the default for the two variants that report something went fine: long
 *   enough to read "Draft saved", short enough not to sit on top of the page.
 *   `error` is `0` — it stays until dismissed, because a message reporting a
 *   *failure* is the one the user must not miss by looking away, and usually the
 *   one they need to read twice (or copy) before deciding what to do. WCAG 2.2.1
 *   asks for exactly that: a timed message the user cannot extend is a failure,
 *   and "it timed out before I read it" has no recovery.
 * - **Position.** Bottom centre — M3's own placement, and the one that keeps a
 *   toast clear of the app bar and of a right-hand rail.
 */
export const UI_SNACKBAR_DEFAULT_VALUES: UiSnackbarDefaults = {
  duration: { success: 5000, info: 5000, error: 0 },
  horizontalPosition: 'center',
  verticalPosition: 'bottom',
  dismissAction: 'Dismiss',
};

/**
 * The defaults {@link Snackbar} resolves against. Override with
 * {@link provideUiSnackbarDefaults}.
 *
 * Material's own `MAT_SNACK_BAR_DEFAULT_OPTIONS` still applies to everything
 * this service does not set — `direction`, `viewContainerRef`,
 * `announcementMessage` — but not to duration, position or politeness, which
 * this service passes explicitly on every call and would therefore silently
 * override. This token is where those live instead.
 */
export const UI_SNACKBAR_DEFAULTS = new InjectionToken<UiSnackbarDefaults>('UI_SNACKBAR_DEFAULTS', {
  providedIn: 'root',
  factory: () => UI_SNACKBAR_DEFAULT_VALUES,
});

/**
 * Tunes the snackbar defaults for an app.
 *
 * ```ts
 * bootstrapApplication(App, {
 *   providers: [
 *     provideUiSnackbarDefaults({
 *       verticalPosition: 'top',
 *       duration: { success: 3000 },
 *     }),
 *   ],
 * });
 * ```
 *
 * Merged over the shipped defaults, per variant, so an app that only wants
 * shorter success toasts does not have to restate the other two.
 */
export function provideUiSnackbarDefaults(
  defaults: Partial<Omit<UiSnackbarDefaults, 'duration'>> & {
    duration?: Partial<Record<UiSnackbarVariant, number>>;
  },
): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: UI_SNACKBAR_DEFAULTS,
      useValue: {
        ...UI_SNACKBAR_DEFAULT_VALUES,
        ...defaults,
        duration: { ...UI_SNACKBAR_DEFAULT_VALUES.duration, ...defaults.duration },
      } satisfies UiSnackbarDefaults,
    },
  ]);
}

/** The class every snackbar this service opens carries. */
const ROOT_CLASS = 'ui-snackbar';

/** The class `_snackbar.scss` hangs each variant's colour roles off. */
const variantClass = (variant: UiSnackbarVariant): string => `${ROOT_CLASS}--${variant}`;

/**
 * How each variant announces itself.
 *
 * `assertive` interrupts a screen reader mid-sentence, so it is reserved for the
 * variant that reports something gone wrong — and which does not time out, so
 * the interruption is not immediately followed by the message disappearing.
 * Announcing "Draft saved" by cutting the user off is the misuse the ARIA spec
 * warns about, so the other two wait their turn. This is the same split
 * `ui-alert` makes with `role`, for the same reason.
 *
 * Not part of {@link UiSnackbarDefaults}: it follows from what the variant
 * *means*, so it is not a knob. A consumer who needs another politeness for one
 * message passes `politeness` in that call's config.
 */
const VARIANT_POLITENESS: Readonly<Record<UiSnackbarVariant, AriaLivePoliteness>> = {
  success: 'polite',
  info: 'polite',
  error: 'assertive',
};

const toClassArray = (panelClass: string | string[] | undefined): string[] =>
  panelClass == null ? [] : Array.isArray(panelClass) ? panelClass : [panelClass];

/**
 * Opens themed Material snackbars.
 *
 * ```ts
 * private readonly snackbar = inject(Snackbar);
 *
 * save(): void {
 *   this.api.save(this.draft).subscribe({
 *     next: () => this.snackbar.success('Draft saved'),
 *     error: () =>
 *       this.snackbar
 *         .error('Could not save the draft', 'Retry')
 *         .onAction()
 *         .subscribe(() => this.save()),
 *   });
 * }
 * ```
 *
 * A snackbar has no element in anyone's template — it is opened from code, into
 * an overlay — so this is a service rather than a component or a directive. It
 * is `MatSnackBar` with this library's defaults applied: every method mirrors one
 * of Material's, takes Material's own config, and returns Material's own
 * `MatSnackBarRef`, so `onAction()`, `afterDismissed()` and `dismissWithAction()`
 * are all still there.
 *
 * ### What it adds
 *
 * - **Variants.** `success` / `error` / `info`, painted by
 *   `src/styles/_snackbar.scss` from the shared theme's roles. There is not a
 *   literal colour anywhere: the variant is a class on Material's own container,
 *   and the class re-points Material's own tokens.
 * - **Defaults with a reason.** 5 seconds for the two that report success;
 *   `error` stays until dismissed. Bottom centre. `polite` for the first two,
 *   `assertive` for `error`. See {@link UI_SNACKBAR_DEFAULT_VALUES}.
 * - **No snackbar that cannot be dismissed.** A snackbar with a `0` duration and
 *   no action of its own gets a `Dismiss` action, so "until dismissed" always has
 *   a way to dismiss it.
 *
 * ### Escape hatches
 *
 * Every default is overridable, at three scopes, none of which needs a hack:
 *
 * - **Per call** — the `config` argument, which is `MatSnackBarConfig` plus
 *   `variant`. `panelClass` is merged with the variant's classes, not replaced.
 * - **Per app** — {@link provideUiSnackbarDefaults}.
 * - **Everything else** — {@link Snackbar.matSnackBar} is the `MatSnackBar` this
 *   service delegates to, unwrapped.
 *
 * Restyling needs no `::ng-deep` either: pass a `panelClass` and set the
 * `--ui-snackbar-*` hooks on it (see `_snackbar.scss`), or style the class
 * directly from a global stylesheet — a snackbar renders in the CDK overlay at
 * the end of `<body>`, so it is outside every component's encapsulation anyway.
 */
@Injectable({ providedIn: 'root' })
export class Snackbar {
  /**
   * The `MatSnackBar` underneath, exposed as the escape hatch for anything this
   * service does not wrap.
   */
  readonly matSnackBar = inject(MatSnackBar);

  private readonly defaults = inject(UI_SNACKBAR_DEFAULTS);

  /**
   * Reports that something the user asked for worked. Polite, 5 seconds.
   *
   * ```ts
   * this.snackbar.success('Draft saved');
   * this.snackbar.success('Item archived', 'Undo').onAction().subscribe(() => this.restore());
   * ```
   */
  success(
    message: string,
    action?: string,
    config?: UiSnackbarConfig,
  ): MatSnackBarRef<TextOnlySnackBar> {
    return this.open(message, action, { ...config, variant: 'success' });
  }

  /**
   * Reports that something failed. Assertive, and stays until dismissed — with a
   * `Dismiss` action if no other action is given.
   *
   * ```ts
   * this.snackbar.error('Could not reach the server', 'Retry')
   *   .onAction()
   *   .subscribe(() => this.save());
   * ```
   */
  error(
    message: string,
    action?: string,
    config?: UiSnackbarConfig,
  ): MatSnackBarRef<TextOnlySnackBar> {
    return this.open(message, action, { ...config, variant: 'error' });
  }

  /**
   * States a neutral fact. Polite, 5 seconds, and M3's own snackbar colours.
   *
   * ```ts
   * this.snackbar.info('Working offline — changes will sync when you reconnect');
   * ```
   */
  info(
    message: string,
    action?: string,
    config?: UiSnackbarConfig,
  ): MatSnackBarRef<TextOnlySnackBar> {
    return this.open(message, action, { ...config, variant: 'info' });
  }

  /**
   * Opens a snackbar with a message and an optional action — `MatSnackBar.open`
   * with this library's defaults applied.
   *
   * The variant comes from `config.variant` and defaults to `info`, so this is
   * the one to call when the variant is a value rather than a literal:
   * `this.snackbar.open(text, undefined, { variant })`.
   */
  open(
    message: string,
    action?: string,
    config?: UiSnackbarConfig,
  ): MatSnackBarRef<TextOnlySnackBar> {
    const resolved = this.resolveConfig(config);
    return this.matSnackBar.open(message, this.resolveAction(action, resolved), resolved);
  }

  /**
   * Opens a snackbar rendering a component — `MatSnackBar.openFromComponent` with
   * this library's defaults applied.
   *
   * For anything a message and one action label cannot say: an icon, a progress
   * row, two actions. The component owns its own content, so it owns its own
   * dismissal too — inject `MatSnackBarRef` there and call `dismiss()`. Nothing
   * is added to it, which is why a `0`-duration snackbar opened this way is only
   * dismissible if its component says so.
   */
  openFromComponent<T, D = unknown>(
    component: ComponentType<T>,
    config?: UiSnackbarConfig<D>,
  ): MatSnackBarRef<T> {
    return this.matSnackBar.openFromComponent(component, this.resolveConfig(config));
  }

  /**
   * Opens a snackbar rendering a template — `MatSnackBar.openFromTemplate` with
   * this library's defaults applied.
   *
   * The template's implicit context is `config.data` and `snackBarRef` is the
   * ref, so a dismiss button is `(click)="ref.dismiss()"`:
   *
   * ```html
   * <ng-template #tpl let-data let-ref="snackBarRef">
   *   <mat-icon>cloud_off</mat-icon> {{ data.message }}
   *   <button matButton (click)="ref.dismiss()">Dismiss</button>
   * </ng-template>
   * ```
   */
  openFromTemplate<D = unknown>(
    template: TemplateRef<unknown>,
    config?: UiSnackbarConfig<D>,
  ): MatSnackBarRef<EmbeddedViewRef<unknown>> {
    return this.matSnackBar.openFromTemplate(template, this.resolveConfig(config));
  }

  /** Dismisses the snackbar that is currently open, if there is one. */
  dismiss(): void {
    this.matSnackBar.dismiss();
  }

  /**
   * Layers the variant's defaults under the caller's config.
   *
   * `panelClass` is the one key not simply overwritten: the variant's classes are
   * what paint it, so a consumer adding a class of their own must not silently
   * strip the colours (rule 4). Theirs come last, so their rules win on equal
   * specificity.
   */
  private resolveConfig<D>(config: UiSnackbarConfig<D> | undefined): MatSnackBarConfig<D> {
    const { variant = 'info', panelClass, ...rest } = config ?? {};

    return {
      duration: this.defaults.duration[variant],
      horizontalPosition: this.defaults.horizontalPosition,
      verticalPosition: this.defaults.verticalPosition,
      politeness: VARIANT_POLITENESS[variant],
      ...rest,
      panelClass: [ROOT_CLASS, variantClass(variant), ...toClassArray(panelClass)],
    };
  }

  /**
   * The action label actually handed to Material.
   *
   * A snackbar that never times out and has no action is a toast the user cannot
   * get rid of: it sits over the page until a route change, and a keyboard or
   * screen-reader user has nothing to press. So "until dismissed" implies a way
   * to dismiss it, and that is what this adds — for `error` by default, and for
   * any snackbar a consumer gives `duration: 0`.
   */
  private resolveAction(action: string | undefined, config: MatSnackBarConfig): string {
    if (action) {
      return action;
    }
    return config.duration ? '' : this.defaults.dismissAction;
  }
}
