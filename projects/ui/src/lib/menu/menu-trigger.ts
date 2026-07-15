import { Directive, effect, inject, input } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';

import { Menu } from './menu';

/**
 * Opens a {@link Menu} from the element it is on.
 *
 * ```html
 * <button matButton uiButton [uiMenuTriggerFor]="actions">Actions</button>
 * <ui-menu #actions [items]="items" (itemSelected)="run($event.value)" />
 * ```
 *
 * This is a directive on the *native* element rather than a wrapper (rule 1),
 * because a trigger *decorates* something a consumer already has — a button, an
 * icon button, a link. So the element they write is the element the browser gets:
 * `aria-label`, `id`, `disabled`, `type`, `data-*`, `tabindex` and `routerLink` all
 * apply natively and need no forwarding, Material anchors the overlay to the real
 * host box, and it composes with `uiButton` and `uiTooltip` on the same element.
 *
 * `MatMenuTrigger` is a real directive, so `uiMenuTriggerFor` pulls it onto the
 * host itself and a consumer writes one attribute — the same shape as `uiTooltip`,
 * and unlike `uiButton`, where Material's button is a *component* and `matButton`
 * therefore has to appear in the template alongside it.
 *
 * ### Why it takes a `ui-menu` rather than a `mat-menu`
 *
 * Material's own `[matMenuTriggerFor]` wants the `MatMenuPanel` — which, for a
 * `<ui-menu>`, is the `<mat-menu>` inside its view. Pointing a consumer at
 * `[matMenuTriggerFor]="menu.matMenu()"` would work, but it makes every trigger
 * reach through this library's internals to say something as ordinary as "open that
 * menu" (rule 2). This takes the `<ui-menu>` and does the reach itself.
 *
 * Material's own trigger still matches its own attribute, so a plain
 * `[matMenuTriggerFor]="matMenuRef"` elsewhere in an app is untouched.
 *
 * ### What Material's API this passes through
 *
 * `menuOpened` and `menuClosed` are Material's own outputs, re-exposed unrenamed
 * (rule 4) — `menuOpened` is where the lazy load of a menu's contents goes.
 * `uiMenuTriggerData` and `uiMenuTriggerRestoreFocus` keep Material's shape under
 * this library's prefix, for the same reason `uiTooltip*` does. `(closed)`, with
 * the *reason* the menu closed, is on the `<ui-menu>` rather than here.
 *
 * ### Escape hatches
 *
 * `exportAs: 'uiMenuTrigger'` hands back the directive, and {@link matMenuTrigger}
 * hands back Material's own instance — so `trigger.matMenuTrigger.openMenu()`,
 * `.closeMenu()`, `.toggleMenu()`, `.updatePosition()` and `.menuOpen` need no API
 * here (rule 4).
 */
@Directive({
  selector: '[uiMenuTriggerFor]',
  exportAs: 'uiMenuTrigger',
  hostDirectives: [
    {
      directive: MatMenuTrigger,
      inputs: [
        // The rest of Material's API, passed through rather than swallowed
        // (rule 4). `restoreFocus` is coerced in Material's own setter, so a bare
        // attribute works without a second layer of coercion to disagree with it.
        'matMenuTriggerData: uiMenuTriggerData',
        'matMenuTriggerRestoreFocus: uiMenuTriggerRestoreFocus',
      ],
      outputs: ['menuOpened', 'menuClosed'],
    },
  ],
})
export class MenuTrigger<T = unknown> {
  /**
   * The `MatMenuTrigger` on this host — the escape hatch for anything this
   * directive does not wrap: `openMenu()`, `closeMenu()`, `toggleMenu()`,
   * `updatePosition()`, `menuOpen`. Reach it with `#trigger="uiMenuTrigger"` and
   * `trigger.matMenuTrigger`.
   */
  readonly matMenuTrigger = inject(MatMenuTrigger, { self: true });

  /**
   * The menu this element opens.
   *
   * `null` disables the trigger — Material opens nothing when it has no panel,
   * which is how a conditional menu is expressed without an `@if` around the button
   * itself.
   */
  readonly uiMenuTriggerFor = input.required<Menu<T> | null | undefined>();

  constructor() {
    // `menu` is a plain setter rather than a signal input, so the panel has to be
    // pushed into it. Material's setter re-wires its close subscription on every
    // change and short-circuits when the panel is the same one, so this is safe to
    // re-run.
    //
    // `?? null` rather than a non-null assertion: `matMenu()` is a *non-required*
    // view query precisely so this effect can read it before `<ui-menu>`'s view
    // queries have resolved — a parent's view effects flush before its child
    // components are refreshed, so on the very first run there is genuinely nothing
    // there yet. The query then resolves, this effect re-runs, and the trigger gets
    // its panel well before a user could click. See `Menu.matMenu`.
    effect(() => {
      this.matMenuTrigger.menu = this.uiMenuTriggerFor()?.matMenu() ?? null;
    });
  }
}
