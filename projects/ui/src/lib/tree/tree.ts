import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  Directive,
  inject,
  input,
  TemplateRef,
  viewChild,
  type TrackByFunction,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import {
  MatTree,
  MatTreeNode,
  MatTreeNodeDef,
  MatTreeNodePadding,
  MatTreeNodeToggle,
} from '@angular/material/tree';

import { EmptyState } from '../empty-state/empty-state';
import { Icon } from '../icon/icon';

/**
 * Reads the children of a node — the one piece of shape a tree cannot guess.
 *
 * The library's tree is *flat-first*: the data a consumer already has is a
 * hierarchy — a file system, an org chart, a category list nested by `children` —
 * and this is how `ui-tree` walks it. Return the node's children, or `null` /
 * `undefined` / `[]` for a leaf. Material flattens the hierarchy for rendering and
 * derives each node's `level`, `aria-level` and `aria-expanded` from the walk, so
 * a consumer passes the nested data as-is rather than pre-flattening it.
 */
export type UiTreeChildrenAccessor<T> = (node: T) => readonly T[] | null | undefined;

/** The context of a {@link TreeNodeDef} template — what its `let-`s bind to. */
export interface UiTreeNodeContext<T = unknown> {
  /** The node, so that a bare `let-node` works. */
  $implicit: T;
  /** The node this row renders. */
  node: T;
  /** The node's depth, 0 for a root. */
  level: number;
  /** Whether the node has children the user can expand into. */
  expandable: boolean;
  /** Whether the node is currently expanded. */
  expanded: boolean;
}

/**
 * Renders one node's label, in place of the string {@link Tree.label} would have
 * printed (rule 7).
 *
 * A `label` accessor can say what a node's *text* is; it cannot say the label
 * should be an icon and a name, a count badge, a link. This is how that gets in —
 * the toggle, the indentation and the a11y wiring stay `ui-tree`'s, and this
 * replaces only the label's *content*:
 *
 * ```html
 * <ui-tree [data]="tree()" [childrenAccessor]="children">
 *   <ng-template uiTreeNode let-node let-expandable="expandable">
 *     <ui-icon [fontIcon]="expandable ? 'folder' : 'description'" />
 *     {{ node.name }}
 *   </ng-template>
 * </ui-tree>
 * ```
 *
 * ### Typing `let-node`
 *
 * A tree node is reached through a `TemplateRef`, which carries no type, so
 * `let-node` is `any` by default — exactly as Material's own
 * `*matTreeNodeDef="let node"` is. Bind `uiTreeNodeData` to the same array as the
 * tree's `[data]` to get the node type back:
 *
 * ```html
 * <ng-template uiTreeNode [uiTreeNodeData]="tree()" let-node>
 *   {{ node.name }}  <!-- node is typed, and a typo here is a build error -->
 * </ng-template>
 * ```
 *
 * It is a type hint and nothing else — it renders nothing and costs nothing at
 * runtime. Optional, because a node template that only prints a field should not
 * have to name the array twice to compile.
 */
@Directive({ selector: 'ng-template[uiTreeNode]' })
// `any` is the fallback when a consumer gives no `uiTreeNodeData` to infer from.
// It is what Material's own `matTreeNodeDef` hands to `let node`, and narrowing it
// to `unknown` would make the *untyped* case — the common one — a build error that
// no cast in the template could fix.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TreeNodeDef<T = any> {
  /**
   * The tree's `data`, purely so that `let-node` can be typed from it — the node
   * type is inferred from this array and nothing else. Renders nothing, and is
   * read by nothing: bind it or leave it, see *Typing `let-node`* above.
   *
   * Named for its binding rather than aliased to it, because an alias here would
   * be a rename `no-input-rename` is right to object to.
   */
  readonly uiTreeNodeData = input<readonly T[]>([]);

  /** The template itself, rendered by `tree.html`. @docs-private */
  readonly template = inject<TemplateRef<UiTreeNodeContext<T>>>(TemplateRef);

  /**
   * Types `let-node` as the node, rather than as `any`. @docs-private
   *
   * The signature is Angular's, and the compiler is its only caller — the
   * parameters exist to be named in the type predicate and nowhere else, which is
   * exactly what `no-unused-vars` reports. The same shape as `TableCellDef`'s.
   */
  static ngTemplateContextGuard<T>(
    directive: TreeNodeDef<T>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: unknown,
  ): context is UiTreeNodeContext<T> {
    return true;
  }
}

/**
 * Replaces the whole empty state, for a tree whose "nothing here" is more than a
 * sentence — the action that fills it, a link to the filters hiding the nodes
 * (rule 7).
 *
 * ```html
 * <ng-template uiTreeEmpty>
 *   <ui-empty-state icon="folder_off" title="No folders yet" message="Create one to get started.">
 *     <button matButton uiButton uiEmptyStateActions>New folder</button>
 *   </ui-empty-state>
 * </ng-template>
 * ```
 *
 * It renders where {@link Tree.emptyMessage} would have, so the tree keeps its
 * frame while it is empty.
 */
@Directive({ selector: 'ng-template[uiTreeEmpty]' })
export class TreeEmptyDef {
  /** The template itself, rendered by `tree.html`. @docs-private */
  readonly template = inject<TemplateRef<void>>(TemplateRef);
}

/** The heading shown when a tree is empty and no `emptyMessage` was given. */
const DEFAULT_EMPTY_MESSAGE = 'Nothing to show';

/** The indent, in pixels, each level of depth adds — Material's own default. */
const DEFAULT_INDENT = 40;

/**
 * Identity tracking — the node object itself is its own id, matching Material's
 * own fallback so the default behaviour is unchanged and the input still has a
 * value a consumer can reason about.
 */
const TRACK_BY_IDENTITY: TrackByFunction<unknown> = (_index, node) => node;

/**
 * A themed Material tree over a hierarchy: `<mat-tree>`, its rows built from
 * `data` and a `childrenAccessor` rather than from a `matTreeNodeDef` and the
 * expansion plumbing by hand.
 *
 * ```html
 * <ui-tree [data]="folders()" [childrenAccessor]="children" aria-label="Folders" />
 *
 * <ui-tree
 *   [data]="folders()"
 *   [childrenAccessor]="children"
 *   [label]="name"
 *   emptyMessage="No folders yet"
 *   aria-label="Folders"
 * />
 * ```
 *
 * Like `ui-table` and unlike `uiButton`, this is a component rather than a
 * directive: a tree owns *composition* — a row per node, a toggle, the
 * indentation by depth — and there is no single native element to decorate.
 *
 * ### Flat-first
 *
 * This wraps Material's **flat** tree: every node is one row, indented by its
 * depth, with a disclosure toggle where it has children. The data it takes is a
 * *hierarchy* — the nested shape an app already has — and `childrenAccessor` is
 * how it walks it; Material flattens it for rendering. A tree of genuinely flat
 * rows is the same call with a `childrenAccessor` that returns nothing. (Nested
 * rendering, where a node owns its children's DOM, and checkbox trees are a
 * deliberate follow-up, not this component.)
 *
 * ### It is Material, not a re-implementation
 *
 * The `<mat-tree>`, its rows, the toggle with its keyboard and its `aria-expanded`,
 * the `role="tree"`/`treeitem` structure, and every colour and font are Material's
 * own, resolved from the `--mat-sys-*` tokens `src/styles/_theme.scss` emits — so
 * there is not a literal colour in `tree.scss`, and a palette change there re-skins
 * every tree in the fleet, in light and dark alike. The empty state is this
 * library's own `ui-empty-state`, so a tree agrees with the rest of the fleet about
 * what "empty" looks like.
 *
 * ### Rendering a node
 *
 * By default a node renders the string {@link label} returns (its `toString()` if
 * none is given). For a label a string cannot carry — an icon, a badge, a link —
 * project a {@link TreeNodeDef}: it takes over the label and leaves the toggle,
 * the indentation and the a11y wiring alone.
 *
 * ### Expand and collapse
 *
 * A node with children gets Material's disclosure toggle — click it, or use the
 * keyboard, to expand and collapse. {@link expandable} decides which nodes get one;
 * it defaults to "has children", which is right unless a node is a container that
 * happens to be empty. `matTree()` is the escape hatch for driving expansion from
 * code: `tree.matTree().expandAll()`.
 *
 * ### Empty
 *
 * With no nodes, the tree shows a `ui-empty-state` carrying {@link emptyMessage}.
 * For an empty state with an icon, a message or a way out of it, project a
 * {@link TreeEmptyDef} instead.
 *
 * ### Accessibility
 *
 * Material renders a real `role="tree"` of `role="treeitem"` rows, each carrying
 * its `aria-level`, `aria-expanded` and `aria-setsize` — Material's own, none of it
 * re-implemented here. Name it with `aria-label` (or `aria-labelledby`): say what
 * the nodes *are*, e.g. `Folders`.
 *
 * ### Styling hooks
 *
 * - `--ui-tree-background` — the tree's surface.
 * - `--ui-tree-text-color` — the node text.
 *
 * All are read off `<ui-tree>`, so a consumer sets them from an ordinary rule on an
 * ordinary selector — no `::ng-deep`, no `!important`. Point a colour at another
 * `--mat-sys-*` role rather than a literal, so it survives a palette change and
 * dark mode. The row height is deliberately not a hook: it is Material's density
 * token, and density is a fleet-wide decision `_theme.scss` owns.
 *
 * ### Escape hatch
 *
 * `exportAs: 'uiTree'` hands back the component, and {@link matTree} hands back
 * Material's own instance — so `tree.matTree().expandAll()` needs no API here
 * (rule 4).
 */
@Component({
  selector: 'ui-tree',
  exportAs: 'uiTree',
  imports: [
    MatTree,
    MatTreeNode,
    MatTreeNodeDef,
    MatTreeNodePadding,
    MatTreeNodeToggle,
    MatIconButton,
    Icon,
    NgTemplateOutlet,
    EmptyState,
  ],
  templateUrl: './tree.html',
  styleUrl: './tree.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tree<T> {
  /**
   * The nodes, as the hierarchy an app already has. See {@link childrenAccessor}.
   *
   * Defaults to empty rather than being required, so a tree can render its empty
   * state before the first response lands.
   */
  readonly data = input<readonly T[]>([]);

  /**
   * How to read a node's children — the one piece of shape a tree cannot guess.
   * See {@link UiTreeChildrenAccessor}.
   *
   * Required: without it there is no hierarchy to walk, only a flat list, and a
   * `ui-tree` with no depth is a `ui-list` wearing the wrong component.
   */
  readonly childrenAccessor = input.required<UiTreeChildrenAccessor<T>>();

  /**
   * The text a node renders when no {@link TreeNodeDef} is projected — the field
   * that names it, e.g. `(folder) => folder.name`.
   *
   * Defaults to the node's own `toString()`, which is right for a tree of strings
   * and wrong for a tree of objects — give it the accessor, or project a node
   * template for anything a string cannot carry.
   */
  readonly label = input<(node: T) => string>((node) => String(node));

  /**
   * Which nodes get a disclosure toggle. Defaults to "has children".
   *
   * The default is right unless a node is a container that is legitimately empty —
   * a folder with no files that should still show as expandable — in which case
   * override it. Drives Material's `isExpandable`, which is what the toggle, the
   * `aria-expanded` and the keyboard all read.
   */
  readonly expandable = input<(node: T) => boolean>((node) => this.hasChildren(node));

  /**
   * The indent, in pixels, each level of depth adds. Defaults to 40 — Material's
   * own, from the Material menu sub-menu spec.
   */
  readonly indent = input(DEFAULT_INDENT);

  /**
   * The heading of the `ui-empty-state` shown when there are no nodes.
   *
   * Say what is missing in the user's words. For an empty state with an icon, a
   * message or a way out of it, project a {@link TreeEmptyDef} instead.
   */
  readonly emptyMessage = input(DEFAULT_EMPTY_MESSAGE);

  /**
   * How Angular identifies a node across renders. Material's own `trackBy`,
   * forwarded. Defaults to identity tracking.
   */
  readonly trackBy = input<TrackByFunction<T>>(TRACK_BY_IDENTITY);

  /**
   * The tree's accessible name, spelled as the ARIA attribute — what the nodes
   * are, e.g. `Folders`.
   *
   * An input rather than an attribute left on the host, because the host is not
   * the `<mat-tree>`: Material renders that inside this component, and this is put
   * on it.
   */
  readonly ariaLabel = input<string | undefined, unknown>(undefined, {
    alias: 'aria-label',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The id of the element naming the tree — for a tree named by a heading already
   * on the page. Preferred over {@link ariaLabel} where one exists.
   */
  readonly ariaLabelledby = input<string | undefined, unknown>(undefined, {
    alias: 'aria-labelledby',
    transform: (value) => (value == null ? undefined : String(value)),
  });

  /**
   * The `MatTree` this component renders — the escape hatch for anything not
   * wrapped here (rule 4), e.g. `tree.matTree().expandAll()`. Reach it with
   * `#tree="uiTree"`.
   */
  readonly matTree = viewChild.required<MatTree<T>>(MatTree);

  /** The node template a consumer projected, which replaces {@link label}. */
  protected readonly nodeSlot = contentChild(TreeNodeDef<T>);

  /** The projected empty state, which replaces {@link emptyMessage} when given. */
  protected readonly emptySlot = contentChild(TreeEmptyDef);

  /** Whether there is anything to render, which decides tree versus empty state. */
  protected readonly isEmpty = computed(() => this.data().length === 0);

  /**
   * `data` in the shape `MatTree`'s `dataSource` wants — the same array, its
   * `readonly` asserted away rather than copied, so the reference stays stable and
   * Material does not reset the expansion state on every change detection.
   */
  protected readonly dataSource = computed(() => this.data() as T[]);

  /**
   * `childrenAccessor` in the shape `MatTree` wants: `null` / `undefined` widened
   * to a real array, so a consumer's accessor can return any of the three for a
   * leaf. A bound arrow rather than a fresh closure per render, so
   * `[childrenAccessor]` is a stable reference Material does not re-subscribe to.
   */
  protected readonly matChildrenAccessor = (node: T): T[] => [
    ...(this.childrenAccessor()(node) ?? []),
  ];

  /** Whether a node has any children, the default {@link expandable} reads. */
  private hasChildren(node: T): boolean {
    return this.matChildrenAccessor(node).length > 0;
  }
}
