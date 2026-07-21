import { MatButton } from '@angular/material/button';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Button } from '../button/button';
import { EmptyState, EmptyStateActions } from '../empty-state/empty-state';
import { Icon } from '../icon/icon';
import {
  Tree,
  TreeEmptyDef,
  TreeNodeDef,
  type UiTreeChildrenAccessor,
} from './tree';

interface FileNode {
  name: string;
  kind: 'folder' | 'file';
  children?: FileNode[];
}

/**
 * A plausible project tree rather than "Node 1" — the nesting, the mixed folders
 * and files are what a real tree has to cope with, and what the stories are here
 * to show it coping with.
 */
const FILES: FileNode[] = [
  {
    name: 'src',
    kind: 'folder',
    children: [
      {
        name: 'app',
        kind: 'folder',
        children: [
          { name: 'app.component.ts', kind: 'file' },
          { name: 'app.component.html', kind: 'file' },
          {
            name: 'shared',
            kind: 'folder',
            children: [
              { name: 'button.ts', kind: 'file' },
              { name: 'tree.ts', kind: 'file' },
            ],
          },
        ],
      },
      { name: 'main.ts', kind: 'file' },
      { name: 'index.html', kind: 'file' },
    ],
  },
  {
    name: 'assets',
    kind: 'folder',
    children: [
      { name: 'logo.svg', kind: 'file' },
      { name: 'styles.css', kind: 'file' },
    ],
  },
  { name: 'README.md', kind: 'file' },
  { name: 'package.json', kind: 'file' },
];

/** How `ui-tree` walks the hierarchy — the one piece of shape it cannot guess. */
const children: UiTreeChildrenAccessor<FileNode> = (node) => node.children;

/** The default label accessor: a node renders its `name`. */
const name = (node: FileNode) => node.name;

/** Stories render against a bordered container so the tree's frame is legible. */
const frame = (content: string, width = '24rem') =>
  `<div style="max-width: ${width}; border: 1px solid var(--mat-sys-outline-variant); border-radius: var(--mat-sys-corner-medium); padding: 0.5rem;">${content}</div>`;

const caption = (text: string) =>
  `<p style="font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant); margin: 0 0 0.5rem;">${text}</p>`;

const meta: Meta<Tree<FileNode>> = {
  title: 'Components/Tree',
  component: Tree,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        Tree,
        TreeNodeDef,
        TreeEmptyDef,
        EmptyState,
        EmptyStateActions,
        Icon,
        MatButton,
        Button,
      ],
    }),
  ],
  args: {
    data: FILES,
    childrenAccessor: children,
    label: name,
    emptyMessage: 'Nothing to show',
  },
  argTypes: {
    emptyMessage: { control: 'text' },
    data: { control: 'object' },
    childrenAccessor: { table: { disable: true } },
    label: { table: { disable: true } },
    expandable: { table: { disable: true } },
    indent: { control: { type: 'number' } },
    trackBy: { table: { disable: true } },
    matTree: { table: { disable: true } },
    // Documented but not knobs: aliased to the ARIA attributes, which
    // `argsToTemplate` cannot bind. The `a11y:` stories cover them with real templates.
    ariaLabel: { name: 'aria-label', control: false },
    ariaLabelledby: { name: 'aria-labelledby', control: false },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-tree` is the shared theme applied to Angular Material’s `<mat-tree>`, over a',
          '**hierarchy**: `[data]` and a `[childrenAccessor]` in, a tree out, instead of the',
          '`matTreeNodeDef` and expansion plumbing every app was otherwise going to write for itself.',
          'Like `ui-table` and unlike `uiButton`, it is a **component** rather than a directive: a',
          'tree owns composition — a row per node, a toggle, the indentation by depth.',
          '',
          '### Flat-first',
          '',
          'This wraps Material’s **flat** tree: every node is one row, indented by its depth, with a',
          'disclosure toggle where it has children. The data it takes is a *hierarchy* — the nested',
          'shape an app already has — and `childrenAccessor` is how it walks it; Material flattens it',
          'for rendering. (Nested rendering and checkbox trees are a deliberate follow-up.)',
          '',
          '### Rendering a node',
          '',
          'By default a node renders the string `[label]` returns. For a label a string cannot carry',
          '— an icon, a badge, a link — project a `uiTreeNode` template: it takes over the label and',
          'leaves the toggle, the indentation and the a11y wiring alone. `uiTreeEmpty` does the same',
          'for the whole empty state.',
          '',
          '### Expand and collapse',
          '',
          'A node with children gets Material’s disclosure toggle — click it, or use the keyboard, to',
          'expand and collapse. `[expandable]` decides which nodes get one; it defaults to “has',
          'children”. `matTree()` is the escape hatch for driving expansion from code:',
          '`tree.matTree().expandAll()`.',
          '',
          '### Accessibility',
          '',
          'Material renders a real `role="tree"` of `role="treeitem"` rows, each carrying its',
          '`aria-level`, `aria-expanded` and `aria-setsize` — none of it re-implemented here. Name it',
          'with `aria-label` (or `aria-labelledby`): say what the nodes *are*, e.g. `Files`.',
          '',
          '### Theming and restyling',
          '',
          'The tree, its rows and its toggle are Material’s own, resolved from the M3 system tokens in',
          '`src/styles/_theme.scss` — there is not a literal colour in this component’s stylesheet,',
          'and every story below renders the exact palette a consuming app gets, dark mode included.',
          '`--ui-tree-background` and `--ui-tree-text-color` restyle it from an ordinary CSS rule,',
          'with no `::ng-deep`.',
        ].join(' '),
      },
    },
  },
  // The structural props — the data, the accessor, the label — are bound by name
  // rather than through `argsToTemplate`, which omits the required
  // `childrenAccessor` because it is hidden from the controls table (binding it
  // there would let the docs try to serialise a function). The knob-able inputs
  // still drive off `props`, so their controls work.
  render: (args) => ({
    props: args,
    template: frame(`
      <ui-tree
        [data]="data"
        [childrenAccessor]="childrenAccessor"
        [label]="label"
        [emptyMessage]="emptyMessage"
        [indent]="indent"
        aria-label="Files"
      />`),
  }),
};

export default meta;
type Story = StoryObj<Tree<FileNode>>;

/** The default: a project tree, collapsed to its roots. */
export const Default: Story = {};

/**
 * The everyday shape — a hierarchy and a `childrenAccessor`. Nothing is bound but
 * the data, the accessor and the label; every node renders its `name`, and a
 * folder gets a toggle because it has children.
 */
export const Basic: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { data: FILES, children, name },
    template: frame(
      `<ui-tree [data]="data" [childrenAccessor]="children" [label]="name" aria-label="Files" />`,
    ),
  }),
};

// --- Nesting ---------------------------------------------------------------

/**
 * The tree is *flat-first*: the data is the nested shape an app already has, and
 * `childrenAccessor` walks it. Material flattens it for rendering — every node is
 * one row, indented by its depth — and derives each node's level and expansion
 * from the walk. Click a folder to expand it; the `src` folder here is three
 * levels deep.
 */
export const NestedViaAccessor: Story = {
  name: 'Nesting: hierarchy in, flat rows out',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { data: FILES, children, name },
    template: frame(`
      ${caption('Click a folder — its children appear indented one level deeper.')}
      <ui-tree [data]="data" [childrenAccessor]="children" [label]="name" aria-label="Files" />`),
  }),
};

/**
 * `indent` is the pixels each level of depth adds — 40 by default, from
 * Material's own menu sub-menu spec. Turn it down for a denser tree, up for a
 * more spacious one.
 */
export const Indent: Story = {
  name: 'Nesting: indent per level',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { data: FILES, children, name },
    template: frame(`
      ${caption('16px per level instead of the default 40.')}
      <ui-tree [data]="data" [childrenAccessor]="children" [label]="name" [indent]="16" aria-label="Files" />`),
  }),
};

// --- Templates -------------------------------------------------------------

/**
 * `uiTreeNode` takes over a node's label and leaves the toggle, the indentation
 * and the a11y wiring alone (rule 7): here every node gets a folder-or-file icon
 * that a string label could not carry. The template's context hands over the
 * node, its `level`, and whether it is `expandable` and `expanded`.
 */
export const CustomNodeTemplate: Story = {
  name: 'uiTreeNode: a custom node',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { data: FILES, children },
    template: frame(`
      <ui-tree [data]="data" [childrenAccessor]="children" aria-label="Files">
        <ng-template uiTreeNode [uiTreeNodeData]="data" let-node let-expanded="expanded">
          <ui-icon
            [name]="node.kind === 'folder' ? (expanded ? 'folder_open' : 'folder') : 'description'"
            size="sm"
            style="margin-inline-end: 0.5rem; color: var(--mat-sys-primary);"
          />
          {{ node.name }}
        </ng-template>
      </ui-tree>`),
  }),
};

// --- Empty -----------------------------------------------------------------

/**
 * With no nodes, the tree shows a `ui-empty-state` carrying `emptyMessage`. Say
 * what is missing in the user's words — "No files match your filters" rather than
 * "No data".
 */
export const Empty: Story = {
  name: 'emptyMessage',
  args: { data: [], emptyMessage: 'No files match your filters' },
  parameters: { controls: { disable: true } },
  render: (args) => ({
    props: args,
    template: frame(`<ui-tree ${argsToTemplate(args)} aria-label="Files" />`),
  }),
};

/**
 * An empty state that needs more than a sentence — an icon, a message, the action
 * that fills it — is a template rather than a string (rule 7). `uiTreeEmpty`
 * replaces the whole thing, reusing `ui-empty-state` exactly as the table does.
 */
export const EmptyTemplate: Story = {
  name: 'uiTreeEmpty: a way out of it',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { children },
    template: frame(`
      <ui-tree [data]="[]" [childrenAccessor]="children" aria-label="Files">
        <ng-template uiTreeEmpty>
          <ui-empty-state
            icon="folder_off"
            title="No folders yet"
            message="Folders you create will appear here."
          >
            <button matButton uiButton uiEmptyStateActions variant="filled">New folder</button>
            <button matButton uiButton uiEmptyStateActions variant="text">Import</button>
          </ui-empty-state>
        </ng-template>
      </ui-tree>`),
  }),
};

// --- Accessibility ---------------------------------------------------------

/**
 * `aria-label` names Material's `<mat-tree>` — say what the nodes *are* (`Files`),
 * not that they are a tree. It reaches the real `role="tree"` element inside the
 * component rather than sitting on the `<ui-tree>` host.
 */
export const AriaLabel: Story = {
  name: 'a11y: aria-label',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { data: FILES, children, name },
    template: frame(
      `<ui-tree [data]="data" [childrenAccessor]="children" [label]="name" aria-label="Project files" />`,
    ),
  }),
};

/**
 * For a tree already named by something on the page, point `aria-labelledby` at
 * that heading rather than repeating it.
 */
export const AriaLabelledby: Story = {
  name: 'a11y: aria-labelledby',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { data: FILES, children, name },
    template: `
      <div style="max-width: 24rem;">
        <h2 id="files-heading" style="font: var(--mat-sys-title-medium); color: var(--mat-sys-on-surface);">
          Project files
        </h2>
        <ui-tree [data]="data" [childrenAccessor]="children" [label]="name" aria-labelledby="files-heading" />
      </div>`,
  }),
};

// --- Styling hooks and escape hatches --------------------------------------

/**
 * The hooks are read off `<ui-tree>`, so restyling one is an ordinary CSS rule on
 * an ordinary selector — no `::ng-deep`, no `!important`. Point a colour at
 * another `--mat-sys-*` role rather than a literal, so it survives a palette
 * change and dark mode.
 */
export const StylingHooks: Story = {
  name: 'Styling hooks',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { data: FILES, children, name },
    template: `
      <div style="display: flex; flex-direction: column; gap: 2rem; max-width: 24rem;">
        ${[
          ['Default', ''],
          ['On a container surface', '--ui-tree-background: var(--mat-sys-surface-container);'],
          ['Tertiary-accented node text', '--ui-tree-text-color: var(--mat-sys-tertiary);'],
        ]
          .map(
            ([label, style]) => `
            <div>
              ${caption(label)}
              <div style="border: 1px solid var(--mat-sys-outline-variant); border-radius: var(--mat-sys-corner-medium); padding: 0.5rem;">
                <ui-tree [data]="data" [childrenAccessor]="children" [label]="name" aria-label="Files — ${label}" style="${style}" />
              </div>
            </div>`,
          )
          .join('')}
      </div>`,
  }),
};

/**
 * `exportAs: 'uiTree'` hands back the component, and `matTree()` hands back
 * Material's own instance — the escape hatch for anything not wrapped here
 * (rule 4), such as driving expansion from code.
 */
export const EscapeHatch: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { data: FILES, children, name },
    template: frame(`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          <button matButton uiButton variant="outlined" (click)="tree.matTree().expandAll()">
            Expand all
          </button>
          <button matButton uiButton variant="text" (click)="tree.matTree().collapseAll()">
            Collapse all
          </button>
        </div>
        <ui-tree #tree="uiTree" [data]="data" [childrenAccessor]="children" [label]="name" aria-label="Files" />
      </div>`),
  }),
};
