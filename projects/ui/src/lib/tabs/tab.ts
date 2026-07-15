import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  contentChild,
  Directive,
  inject,
  input,
  TemplateRef,
  viewChild,
  type Signal,
} from '@angular/core';

/**
 * Renders a tab's label in place of its `label` string (rule 7).
 *
 * The header is the one part of a tab a consumer cannot reach by projecting
 * content — the body is projected into `<ui-tab>`, but the label is a string
 * input. This template is how an icon, a count or a status dot gets in there:
 *
 * ```html
 * <ui-tabs>
 *   <ui-tab label="Inbox">
 *     <ng-template uiTabLabel>
 *       <mat-icon>inbox</mat-icon>
 *       Inbox
 *       <span uiBadge="4"></span>
 *     </ng-template>
 *     …
 *   </ui-tab>
 * </ui-tabs>
 * ```
 *
 * It renders inside Material's own `role="tab"` element, so the ripple, the ink
 * bar and the arrow-key navigation are untouched. {@link Tab.label} stays
 * required alongside it: it is the tab's plain-text name, and the fallback for
 * anything that reads a tab without rendering it.
 */
@Directive({ selector: 'ng-template[uiTabLabel]' })
export class TabLabelDef {
  /** The template itself, rendered by `tabs.html`. @docs-private */
  readonly template = inject<TemplateRef<void>>(TemplateRef);
}

/**
 * One tab in a {@link Tabs} group: its label, and the content shown when it is
 * selected.
 *
 * ```html
 * <ui-tabs>
 *   <ui-tab label="Details">…</ui-tab>
 *   <ui-tab label="History" disabled>…</ui-tab>
 * </ui-tabs>
 * ```
 *
 * The body is ordinary projected content, so anything a consumer can write in a
 * template can go in a tab — a component, a form, another `ui-tabs`. It is not a
 * string input, and there is no `content` to marshal (rule 7).
 *
 * ### It renders nothing itself
 *
 * `<ui-tab>` is a declaration, not a box: it captures its content in a template
 * and {@link Tabs} renders that template inside Material's own tab body, where
 * the animation, the `role="tabpanel"` and the `aria-labelledby` back to the tab
 * live. This is exactly how `<mat-tab>` itself works — see `@angular/material/tabs`,
 * whose template is the same single `<ng-template><ng-content/></ng-template>`.
 *
 * That is why a `ui-tab` outside a `ui-tabs` shows nothing at all rather than
 * dumping its content on the page.
 */
@Component({
  selector: 'ui-tab',
  exportAs: 'uiTab',
  // The content is captured rather than rendered here, so that `ui-tabs` can put
  // it inside Material's tab body. `<ng-content>` inside an `<ng-template>` is
  // Material's own construction for this, not a trick of ours.
  template: `<ng-template #content><ng-content /></ng-template>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tab {
  /**
   * The tab's plain-text label, e.g. `Details`.
   *
   * Required: a tab with no name is an unusable target for a mouse and an
   * anonymous one for a screen reader. To render something richer than a string,
   * project a {@link TabLabelDef} — this stays the tab's text either way.
   */
  readonly label = input.required<string>();

  /**
   * Whether this tab cannot be selected, while the rest still can.
   *
   * Material keeps a disabled tab in the header, marked `aria-disabled` and
   * skipped by the arrow-key navigation, so the set of tabs a user sees does not
   * change shape when one of them turns off.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * The tab's accessible name, spelled as the ARIA attribute — for a tab whose
   * rendered label is not the whole story, e.g. an icon-only {@link TabLabelDef}.
   *
   * An input rather than an attribute left on the host, because the host is not
   * the element with `role="tab"` — that one is rendered by Material inside the
   * header, and this is put on it.
   *
   * Leave it unset when the label already reads as the name: an `aria-label` that
   * disagrees with the visible text is worse than none at all.
   */
  readonly ariaLabel = input<string | undefined, unknown>(undefined, {
    alias: 'aria-label',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * Classes put on the `role="tab"` element in the header, since it is Material's
   * rather than this component's to style. Material's own `labelClass`, forwarded.
   */
  readonly labelClass = input<string | string[]>();

  /**
   * Classes put on the `role="tabpanel"` element holding the body, for the same
   * reason as {@link labelClass}. Material's own `bodyClass`, forwarded.
   */
  readonly bodyClass = input<string | string[]>();

  /** The projected label template, when a consumer gives one. @docs-private */
  readonly labelDef = contentChild(TabLabelDef);

  /**
   * The tab's projected body, captured as a template for `ui-tabs` to render.
   * @docs-private
   */
  readonly content: Signal<TemplateRef<void>> = viewChild.required('content', {
    read: TemplateRef,
  });
}
