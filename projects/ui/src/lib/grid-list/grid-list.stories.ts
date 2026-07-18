import { MatGridListModule } from '@angular/material/grid-list';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { GridList, GridListTileDef, type UiGridListTile } from './grid-list';

/** What each tile carries: a label and an M3 palette role to tint it with. */
interface Cell {
  readonly label: string;
  readonly role: string;
}

/** A plausible set of tiles, rather than "Tile 1". */
const PHOTOS: UiGridListTile<Cell>[] = [
  { value: { label: 'Beach', role: 'primary' } },
  { value: { label: 'Forest', role: 'tertiary' } },
  { value: { label: 'Desert', role: 'secondary' } },
  { value: { label: 'Mountains', role: 'primary' } },
  { value: { label: 'City', role: 'tertiary' } },
  { value: { label: 'Lake', role: 'secondary' } },
  { value: { label: 'Coast', role: 'primary' } },
  { value: { label: 'Valley', role: 'tertiary' } },
];

/**
 * The tile slot, shared by most stories. Its fill and text are M3 system-token
 * roles rather than literals, so every story renders the palette a consuming app
 * gets — dark mode included.
 */
const SLOT = `
  <ng-template uiGridListTile let-cell>
    <span
      style="display: grid; place-items: center; width: 100%; height: 100%;
             font: var(--mat-sys-title-medium); border-radius: var(--mat-sys-corner-medium);"
      [style.background]="'var(--mat-sys-' + cell.role + '-container)'"
      [style.color]="'var(--mat-sys-on-' + cell.role + '-container)'"
    >{{ cell.label }}</span>
  </ng-template>`;

const caption = (text: string) =>
  `<p style="font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant); margin: 0 0 0.5rem;">${text}</p>`;

const readout = (expression: string) =>
  `<p style="font: var(--mat-sys-body-medium); color: var(--mat-sys-on-surface); margin: 0;">${expression}</p>`;

const meta: Meta<GridList<Cell>> = {
  title: 'Components/Grid list',
  component: GridList,
  tags: ['autodocs'],
  decorators: [
    // `GridListTileDef` is the `uiGridListTile` slot; `MatGridListModule` brings the
    // `<mat-grid-tile-header>` / `<mat-grid-tile-footer>` a slot may render.
    moduleMetadata({ imports: [GridList, GridListTileDef, MatGridListModule] }),
  ],
  args: {
    tiles: PHOTOS,
    cols: 4,
    rowHeight: '1:1',
    gutterSize: '8px',
    responsive: false,
  },
  argTypes: {
    tiles: { control: 'object' },
    cols: { control: { type: 'number', min: 1 } },
    rowHeight: { control: 'text' },
    gutterSize: { control: 'text' },
    responsive: { control: 'boolean' },
    responsiveCols: { control: 'object' },
    // Not knobs: the escape-hatch ref and the read-only derived count.
    matGridList: { table: { disable: true } },
    activeCols: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-grid-list` is the shared theme applied to Angular Material’s grid list — a grid of',
          'tiles over a fixed or a viewport-driven number of columns. Like `ui-list` and unlike',
          '`uiButton`, it is a **component**: a grid owns composition, placing its tiles absolutely',
          'and sizing them from `cols`, `rowHeight` and `gutterSize`. The placement, the',
          'column/row arithmetic and the header/footer type scale are all Material’s own.',
          '',
          '### Tiles are data, with a slot for their content',
          '',
          'The tiles are a `[tiles]` input — each carries a `value` and, optionally, a `colspan` /',
          '`rowspan`. A `uiGridListTile` template renders each tile’s content, handed the `value`,',
          'the tile and its index. They are declared here rather than projected because Material',
          'finds its tiles with a content query that does not see through a wrapper’s `<ng-content>`',
          '— the same shape `ui-list` takes, and for the same reason.',
          '',
          '### Responsive columns',
          '',
          '`cols` is the fixed count. Set `responsive` and the count is instead driven by the CDK’s',
          '`BreakpointObserver`: `[responsiveCols]` maps each breakpoint to a column count',
          '(`xsmall`…`xlarge`), defaulting to 1 / 2 / 3 / 4 / 6, and a partial map overrides only the',
          'widths it names. Resize the Storybook canvas to watch a `responsive` grid reflow.',
          '',
          '### Escape hatch',
          '',
          '`#grid="uiGridList"` hands back the component, `grid.matGridList()` hands back Material’s',
          'own instance, and `grid.activeCols()` reads out the column count in force.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `<ui-grid-list ${argsToTemplate(args)} style="max-width: 40rem;">${SLOT}</ui-grid-list>`,
  }),
};

export default meta;
type Story = StoryObj<GridList<Cell>>;

/** The default, with every knob live in the controls panel. */
export const Default: Story = {};

// --- Fixed columns ---------------------------------------------------------

/**
 * The everyday shape: a fixed `cols`, a `rowHeight` ratio that keeps every tile
 * square, and a gutter between them. Nothing reflows — this is the grid for a
 * surface whose width you control.
 */
export const FixedCols: Story = {
  name: 'Fixed columns',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { tiles: PHOTOS },
    template: `<ui-grid-list [tiles]="tiles" cols="4" rowHeight="1:1" gutterSize="8px" style="max-width: 40rem;">${SLOT}</ui-grid-list>`,
  }),
};

/**
 * A tile with no `uiGridListTile` slot shows its `value` as text — the convenience
 * shape for the simplest grid, where the tiles are labels rather than cards.
 */
export const PlainText: Story = {
  name: 'Plain text tiles',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      tiles: [
        { value: 'Mon' },
        { value: 'Tue' },
        { value: 'Wed' },
        { value: 'Thu' },
        { value: 'Fri' },
      ] satisfies UiGridListTile<string>[],
    },
    template: `<ui-grid-list [tiles]="tiles" cols="5" rowHeight="3:1" gutterSize="8px" style="max-width: 40rem;"></ui-grid-list>`,
  }),
};

/**
 * `rowHeight` takes three shapes: a **ratio** (`'4:3'`) that scales with the column
 * width, a fixed **length** (`'120px'`), or **`'fit'`**, which shares a container of
 * a known height between the rows. A bare number is read as `px`.
 */
export const RowHeight: Story = {
  name: 'Row height',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { tiles: PHOTOS.slice(0, 6) },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 40rem;">
        <div>
          ${caption('rowHeight="4:3" — each row is ¾ of a column’s width')}
          <ui-grid-list [tiles]="tiles" cols="3" rowHeight="4:3" gutterSize="8px">${SLOT}</ui-grid-list>
        </div>
        <div>
          ${caption('rowHeight="80px" — every row is exactly 80px tall')}
          <ui-grid-list [tiles]="tiles" cols="3" rowHeight="80px" gutterSize="8px">${SLOT}</ui-grid-list>
        </div>
        <div>
          ${caption('rowHeight="fit" — the two rows split this 200px-tall grid')}
          <ui-grid-list [tiles]="tiles" cols="3" rowHeight="fit" gutterSize="8px" style="height: 200px;">${SLOT}</ui-grid-list>
        </div>
      </div>`,
  }),
};

/**
 * `gutterSize` is the gap between tiles. Point it at a `--ui-sys-spacing-*` role
 * rather than a literal, so the grid’s gaps match the rest of the fleet and follow
 * a change to the shared spacing scale.
 */
export const GutterSize: Story = {
  name: 'Gutter size',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { tiles: PHOTOS },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; max-width: 40rem;">
        <div>
          ${caption('gutterSize="var(--ui-sys-spacing-sm)" — the fleet’s tight step')}
          <ui-grid-list [tiles]="tiles" cols="4" rowHeight="1:1" gutterSize="var(--ui-sys-spacing-sm)">${SLOT}</ui-grid-list>
        </div>
        <div>
          ${caption('gutterSize="var(--ui-sys-spacing-lg)" — the loose step')}
          <ui-grid-list [tiles]="tiles" cols="4" rowHeight="1:1" gutterSize="var(--ui-sys-spacing-lg)">${SLOT}</ui-grid-list>
        </div>
      </div>`,
  }),
};

// --- Varied tile spans -----------------------------------------------------

/**
 * `colspan` and `rowspan` on a tile make it straddle columns and rows — a featured
 * tile twice as wide, a sidebar twice as tall. Material’s coordinator flows the rest
 * of the tiles around them.
 */
export const VariedSpans: Story = {
  name: 'Varied tile spans',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      tiles: [
        { value: { label: 'Featured (2×2)', role: 'primary' }, colspan: 2, rowspan: 2 },
        { value: { label: 'Wide (2×1)', role: 'tertiary' }, colspan: 2 },
        { value: { label: 'Tall (1×2)', role: 'secondary' }, rowspan: 2 },
        { value: { label: 'One', role: 'primary' } },
        { value: { label: 'Two', role: 'tertiary' } },
        { value: { label: 'Three', role: 'secondary' } },
      ] satisfies UiGridListTile<Cell>[],
    },
    template: `<ui-grid-list [tiles]="tiles" cols="4" rowHeight="120px" gutterSize="8px" style="max-width: 40rem;">${SLOT}</ui-grid-list>`,
  }),
};

/**
 * A slot can render `<mat-grid-tile-header>` or `<mat-grid-tile-footer>` to pin a
 * caption to a tile’s top or bottom — Material’s own tile chrome, `matLine` and all,
 * rendered inside the tile this component places.
 */
export const TileHeaderFooter: Story = {
  name: 'Tile header & footer',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: {
      tiles: [
        { value: { label: 'Sunrise', role: 'primary' } },
        { value: { label: 'Harbour', role: 'tertiary' } },
        { value: { label: 'Valley', role: 'secondary' } },
      ] satisfies UiGridListTile<Cell>[],
    },
    template: `
      <ui-grid-list [tiles]="tiles" cols="3" rowHeight="4:3" gutterSize="12px" style="max-width: 40rem;">
        <ng-template uiGridListTile let-cell>
          <!-- The bold palette role, not its light container: Material's footer is a
               white-on-dark-scrim caption meant to sit over a photo, so the tile behind
               it has to be dark enough for that white text to clear contrast. -->
          <span
            style="position: absolute; inset: 0;"
            [style.background]="'var(--mat-sys-' + cell.role + ')'"
          ></span>
          <mat-grid-tile-footer>
            <h3 matLine>{{ cell.label }}</h3>
            <span matLine>Aotearoa</span>
          </mat-grid-tile-footer>
        </ng-template>
      </ui-grid-list>`,
  }),
};

// --- Responsive ------------------------------------------------------------

/**
 * `responsive` hands `cols` to the CDK’s `BreakpointObserver` instead: the grid is
 * 1 column on a phone, 2 on a small tablet, 3 on a tablet, 4 on a laptop and 6 on a
 * wide desktop. **Resize the canvas** (or the Storybook viewport toolbar) to watch
 * it reflow — the count in force is read out below.
 */
export const Responsive: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { tiles: PHOTOS },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${caption('The defaults: xsmall 1 · small 2 · medium 3 · large 4 · xlarge 6. Resize the canvas.')}
        <ui-grid-list #grid="uiGridList" [tiles]="tiles" responsive rowHeight="1:1" gutterSize="8px">${SLOT}</ui-grid-list>
        ${readout('Columns in force: <strong>{{ grid.activeCols() }}</strong>')}
      </div>`,
  }),
};

/**
 * `[responsiveCols]` overrides the count at any breakpoint; a **partial** map keeps
 * the defaults for the rest. Here a phone gets 2 columns and a desktop is capped at
 * 4, while the middle breakpoints are left alone.
 */
export const CustomResponsiveCols: Story = {
  name: 'Custom responsive columns',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { tiles: PHOTOS, cols: { xsmall: 2, xlarge: 4 } },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${caption('responsiveCols set to xsmall 2 and xlarge 4 — small screens denser, wide ones capped.')}
        <ui-grid-list #grid="uiGridList" [tiles]="tiles" responsive [responsiveCols]="cols" rowHeight="1:1" gutterSize="8px">${SLOT}</ui-grid-list>
        ${readout('Columns in force: <strong>{{ grid.activeCols() }}</strong>')}
      </div>`,
  }),
};

// --- Escape hatch ----------------------------------------------------------

/**
 * `#grid="uiGridList"` hands back the component and `grid.matGridList()` hands back
 * Material’s own instance — the escape hatch for anything this wrapper does not
 * surface (rule 4). Here it reads Material’s live column count alongside the
 * `activeCols()` the wrapper computes, proving both refs are the real thing.
 */
export const EscapeHatch: Story = {
  name: 'Escape hatch: exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    props: { tiles: PHOTOS },
    template: `
      <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 40rem;">
        <ui-grid-list #grid="uiGridList" [tiles]="tiles" cols="4" rowHeight="1:1" gutterSize="8px">${SLOT}</ui-grid-list>
        ${readout('grid.activeCols() = <strong>{{ grid.activeCols() }}</strong> · grid.matGridList().cols = <strong>{{ grid.matGridList().cols }}</strong>')}
      </div>`,
  }),
};
