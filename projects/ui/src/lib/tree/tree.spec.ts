import { Component, signal, viewChild } from '@angular/core';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatTree } from '@angular/material/tree';
import { MatTreeHarness } from '@angular/material/tree/testing';

import { Tree, TreeEmptyDef, TreeNodeDef, type UiTreeChildrenAccessor } from './tree';

interface FileNode {
  name: string;
  children?: FileNode[];
}

/** A small file tree: two roots, one of them a folder two levels deep. */
const FILES: FileNode[] = [
  {
    name: 'src',
    children: [
      { name: 'app', children: [{ name: 'main.ts' }, { name: 'app.ts' }] },
      { name: 'index.html' },
    ],
  },
  { name: 'README.md' },
];

const children: UiTreeChildrenAccessor<FileNode> = (node) => node.children;
const name = (node: FileNode) => node.name;

@Component({
  imports: [Tree],
  template: `
    <ui-tree
      #ref="uiTree"
      [data]="data()"
      [childrenAccessor]="children"
      [label]="name"
      [emptyMessage]="emptyMessage()"
      aria-label="Files"
    />
  `,
})
class TestHost {
  readonly data = signal<FileNode[]>(FILES);
  readonly emptyMessage = signal('No files match your filters');
  readonly children = children;
  readonly name = name;
  readonly ref = viewChild.required<Tree<FileNode>>('ref');
}

/**
 * Material's own switch for the tree's animations. Without it the disclosure
 * transitions run on timers no assertion here is waiting for. Material's public
 * token rather than `provideNoopAnimations()`, which is the same thing plus a
 * module.
 */
const noAnimations = { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } };

describe('Tree', () => {
  let fixture: ComponentFixture<TestHost>;
  let host: TestHost;
  let loader: HarnessLoader;

  const query = (selector: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(selector);

  const tree = (): Promise<MatTreeHarness> => loader.getHarness(MatTreeHarness);

  /** Every visible node's text, top to bottom — the rendered order. */
  const visibleText = async (): Promise<string[]> => {
    const nodes = await (await tree()).getNodes();
    return Promise.all(nodes.map((node) => node.getText()));
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [noAnimations] });
    fixture = TestBed.createComponent(TestHost);
    host = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  it('renders Material’s tree rather than markup of its own', () => {
    expect(query('mat-tree')).not.toBeNull();
    expect(host.ref().matTree()).toBeInstanceOf(MatTree);
  });

  describe('rendering', () => {
    // Only the roots render until a branch is expanded: the tree is collapsed by
    // default, so `src`'s children are not in the DOM yet.
    it('renders the root nodes collapsed by default', async () => {
      expect(await visibleText()).toEqual(['src', 'README.md']);
    });

    it('labels a node from the label accessor', async () => {
      const [first] = await (await tree()).getNodes();
      expect(await first.getText()).toBe('src');
    });

    it('reveals a branch’s children when it is expanded', async () => {
      const [srcNode] = await (await tree()).getNodes();
      await srcNode.expand();

      expect(await visibleText()).toEqual(['src', 'app', 'index.html', 'README.md']);
    });

    it('nests through the accessor to any depth', async () => {
      const [srcNode] = await (await tree()).getNodes();
      await srcNode.expand();
      const [, appNode] = await (await tree()).getNodes();
      await appNode.expand();

      expect(await visibleText()).toEqual([
        'src',
        'app',
        'main.ts',
        'app.ts',
        'index.html',
        'README.md',
      ]);
    });

    it('re-renders when the data changes', async () => {
      host.data.set([{ name: 'only.txt' }]);
      await fixture.whenStable();

      expect(await visibleText()).toEqual(['only.txt']);
    });
  });

  describe('expandability', () => {
    // aria-level is Material's, derived from the childrenAccessor walk and 1-indexed.
    it('reports each node’s depth through aria-level', async () => {
      const [srcNode] = await (await tree()).getNodes();
      await srcNode.expand();
      const nodes = await (await tree()).getNodes();

      expect(await nodes[0].getLevel()).toBe(1);
      expect(await nodes[1].getLevel()).toBe(2);
    });

    it('gives a node with children a toggle and a leaf none', async () => {
      const nodes = await (await tree()).getNodes();

      expect(await nodes[0].isExpandable()).toBe(true); // src
      expect(await nodes[1].isExpandable()).toBe(false); // README.md
    });

    // The default is "has children". An `expandable` accessor overrides it, so a
    // container that is legitimately empty can still show as expandable.
    it('takes expandability from the expandable accessor when given one', async () => {
      @Component({
        imports: [Tree],
        template: `
          <ui-tree [data]="data" [childrenAccessor]="children" [expandable]="never" [label]="name" />
        `,
      })
      class ExpandableHost {
        readonly data = FILES;
        readonly children = children;
        readonly name = name;
        readonly never = () => false;
      }

      const f = TestBed.createComponent(ExpandableHost);
      await f.whenStable();
      const l = TestbedHarnessEnvironment.loader(f);
      const nodes = await (await l.getHarness(MatTreeHarness)).getNodes();

      expect(await nodes[0].isExpandable()).toBe(false);
    });

    it('coerces a null or undefined child list to a leaf', async () => {
      @Component({
        imports: [Tree],
        template: `<ui-tree [data]="data" [childrenAccessor]="children" [label]="name" />`,
      })
      class NullHost {
        // `children` returns `null` rather than an array, which must read as a
        // leaf rather than throw.
        readonly data: FileNode[] = [{ name: 'src' }];
        readonly children: UiTreeChildrenAccessor<FileNode> = () => null;
        readonly name = name;
      }

      const f = TestBed.createComponent(NullHost);
      await f.whenStable();
      const l = TestbedHarnessEnvironment.loader(f);
      const [node] = await (await l.getHarness(MatTreeHarness)).getNodes();

      expect(await node.isExpandable()).toBe(false);
    });
  });

  describe('node template', () => {
    @Component({
      imports: [Tree, TreeNodeDef],
      template: `
        <ui-tree [data]="data" [childrenAccessor]="children" [label]="name">
          <ng-template
            uiTreeNode
            [uiTreeNodeData]="data"
            let-node
            let-level="level"
            let-expandable="expandable"
            let-expanded="expanded"
          >
            <span class="custom-node"
              >{{ node.name }}:{{ level }}:{{ expandable }}:{{ expanded }}</span
            >
          </ng-template>
        </ui-tree>
      `,
    })
    class NodeHost {
      readonly data = FILES;
      readonly children = children;
      readonly name = name;
    }

    let f: ComponentFixture<NodeHost>;

    beforeEach(async () => {
      f = TestBed.createComponent(NodeHost);
      await f.whenStable();
    });

    it('renders the projected template in place of the label', () => {
      const custom = f.nativeElement.querySelector('.custom-node');
      // src is a level-0 expandable node, collapsed to start.
      expect(custom.textContent).toBe('src:0:true:false');
    });

    it('passes the expanded state through to the template’s context', async () => {
      const l = TestbedHarnessEnvironment.loader(f);
      const [srcNode] = await (await l.getHarness(MatTreeHarness)).getNodes();
      await srcNode.expand();

      const first = f.nativeElement.querySelector('.custom-node');
      expect(first.textContent).toBe('src:0:true:true');
    });

    // The guard is what types `let-node` as the node; it exists to be named in the
    // predicate and, like Material's own, always returns true at runtime.
    it('narrows the node template context through the type guard', () => {
      expect(TreeNodeDef.ngTemplateContextGuard(null as never, null)).toBe(true);
    });
  });

  describe('empty', () => {
    beforeEach(async () => {
      host.data.set([]);
      await fixture.whenStable();
    });

    it('shows an empty state carrying the message, and no tree', () => {
      expect(query('mat-tree')).toBeNull();
      expect(query('ui-empty-state')).not.toBeNull();
      expect(query('ui-empty-state')!.textContent).toContain('No files match your filters');
    });

    it('falls back to a default message', async () => {
      @Component({
        imports: [Tree],
        template: `<ui-tree [data]="[]" [childrenAccessor]="children" />`,
      })
      class DefaultHost {
        readonly children = children;
      }

      const f = TestBed.createComponent(DefaultHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('ui-empty-state').textContent).toContain(
        'Nothing to show',
      );
    });

    it('shows the tree again when nodes arrive', async () => {
      host.data.set(FILES);
      await fixture.whenStable();

      expect(query('ui-empty-state')).toBeNull();
      expect(await visibleText()).toEqual(['src', 'README.md']);
    });

    // Rule 7: an empty state that needs a way out of it is not a string.
    it('renders a projected uiTreeEmpty instead of the message', async () => {
      @Component({
        imports: [Tree, TreeEmptyDef],
        template: `
          <ui-tree [data]="[]" [childrenAccessor]="children" emptyMessage="ignored">
            <ng-template uiTreeEmpty>
              <p class="custom-empty">No folders yet</p>
            </ng-template>
          </ui-tree>
        `,
      })
      class EmptyHost {
        readonly children = children;
      }

      const f = TestBed.createComponent(EmptyHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('.custom-empty')).not.toBeNull();
      expect(f.nativeElement.querySelector('ui-empty-state')).toBeNull();
      expect(f.nativeElement.textContent).not.toContain('ignored');
    });
  });

  describe('accessibility', () => {
    it('names Material’s tree from aria-label', () => {
      expect(query('mat-tree')!.getAttribute('aria-label')).toBe('Files');
    });

    it('names it from aria-labelledby instead when given one', async () => {
      @Component({
        imports: [Tree],
        template: `
          <h2 id="heading">Files</h2>
          <ui-tree [data]="data" [childrenAccessor]="children" aria-labelledby="heading" />
        `,
      })
      class LabelledbyHost {
        readonly data = FILES;
        readonly children = children;
      }

      const f = TestBed.createComponent(LabelledbyHost);
      await f.whenStable();

      expect(f.nativeElement.querySelector('mat-tree').getAttribute('aria-labelledby')).toBe(
        'heading',
      );
    });

    it('leaves no empty aria-label behind when unnamed', async () => {
      @Component({
        imports: [Tree],
        template: `<ui-tree [data]="data" [childrenAccessor]="children" />`,
      })
      class UnnamedHost {
        readonly data = FILES;
        readonly children = children;
      }

      const f = TestBed.createComponent(UnnamedHost);
      await f.whenStable();
      const el = f.nativeElement.querySelector('mat-tree');

      expect(el.hasAttribute('aria-label')).toBe(false);
      expect(el.hasAttribute('aria-labelledby')).toBe(false);
    });

    // The aria inputs coerce their value to a string and drop a null one, so a
    // bound `[aria-label]` never lands a stray `aria-label="null"` on the tree.
    it('coerces a bound aria-label to a string and drops a null one', async () => {
      @Component({
        imports: [Tree],
        template: `
          <ui-tree [data]="data" [childrenAccessor]="children" [attr.data-x]="1"
            [aria-label]="label()" [aria-labelledby]="labelledby()" />
        `,
      })
      class BoundHost {
        readonly data = FILES;
        readonly children = children;
        readonly label = signal<unknown>(42);
        readonly labelledby = signal<unknown>('heading');
      }

      const f = TestBed.createComponent(BoundHost);
      await f.whenStable();
      const el = f.nativeElement.querySelector('mat-tree');

      expect(el.getAttribute('aria-label')).toBe('42');
      expect(el.getAttribute('aria-labelledby')).toBe('heading');

      f.componentInstance.label.set(null);
      f.componentInstance.labelledby.set(null);
      await f.whenStable();

      expect(el.hasAttribute('aria-label')).toBe(false);
      expect(el.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('renders a real role="tree" of treeitems', () => {
      expect(query('mat-tree')!.getAttribute('role')).toBe('tree');
      expect(query('mat-tree-node')!.getAttribute('role')).toBe('treeitem');
    });

    // The toggle is named after the node, so a screen reader reads "Toggle src"
    // rather than an anonymous button.
    it('names the disclosure toggle after its node', () => {
      const toggle = query('mat-tree-node button');
      expect(toggle!.getAttribute('aria-label')).toBe('Toggle src');
    });
  });

  describe('escape hatches', () => {
    it('exposes the component instance via exportAs', () => {
      expect(host.ref()).toBeInstanceOf(Tree);
    });

    // Rule 4: Material's own instance is the way out of anything not wrapped.
    it('exposes the underlying MatTree, and drives expansion through it', async () => {
      const matTree = host.ref().matTree();
      expect(matTree).toBeInstanceOf(MatTree);

      matTree.expandAll();
      await fixture.whenStable();

      expect(await visibleText()).toEqual([
        'src',
        'app',
        'main.ts',
        'app.ts',
        'index.html',
        'README.md',
      ]);
    });

    it('forwards trackBy to Material, keeping a node’s DOM across a data swap', async () => {
      @Component({
        imports: [Tree],
        template: `
          <ui-tree [data]="data()" [childrenAccessor]="children" [label]="name" [trackBy]="trackByName" />
        `,
      })
      class TrackHost {
        readonly data = signal<FileNode[]>(FILES);
        readonly children = children;
        readonly name = name;
        readonly trackByName = (_index: number, node: FileNode) => node.name;
      }

      const f = TestBed.createComponent(TrackHost);
      await f.whenStable();
      const before = f.nativeElement.querySelector('mat-tree-node');

      // Structurally identical nodes, but every object is new: without trackBy
      // Material would tear down and rebuild every row.
      f.componentInstance.data.set(FILES.map((node) => ({ ...node })));
      await f.whenStable();

      expect(f.nativeElement.querySelector('mat-tree-node')).toBe(before);
    });
  });

  // The colours are Material's, resolved from the shared theme's tokens. This
  // component only re-points those tokens at hooks whose defaults are the tokens
  // Material would have used anyway.
  describe('theming', () => {
    // These read the *declaration* rather than a painted colour, on purpose:
    // `ng test` runs in jsdom, which does not substitute `var()` at all. What the
    // tree resolves to under the real theme is asserted by the Storybook stories,
    // which run in Chromium.
    const declaration = (token: string) =>
      getComputedStyle(query('ui-tree')!).getPropertyValue(token);

    it('resolves the surface and node text from the theme, not a literal', () => {
      expect(declaration('--mat-tree-container-background-color')).toContain(
        'var(--ui-tree-background',
      );
      expect(declaration('--mat-tree-container-background-color')).toContain(
        'var(--mat-sys-surface)',
      );
      expect(declaration('--mat-tree-node-text-color')).toContain('var(--ui-tree-text-color');
      expect(declaration('--mat-tree-node-text-color')).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(/i);
    });

    // The overrides are emitted on the host, which is what keeps a consumer off
    // `::ng-deep`.
    it('exposes the hooks on the host, not on Material’s internals', () => {
      expect(declaration('--mat-tree-container-background-color')).not.toBe('');
      expect(
        getComputedStyle(query('mat-tree')!).getPropertyValue(
          '--mat-tree-container-background-color',
        ),
      ).toBe('');
    });
  });
});
