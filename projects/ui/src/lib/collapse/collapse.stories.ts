import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Button } from '../button/button';
import { Collapse, CollapseTrigger, type UiCollapseOrientation } from './collapse';

const ORIENTATIONS: UiCollapseOrientation[] = ['vertical', 'horizontal'];

/**
 * A panel of body content, styled from theme tokens so it reads as a real
 * surface — the collapse itself ships no chrome, so the surrounding demo brings
 * its own.
 */
const BODY = `
  <div style="
    padding: 1rem;
    background: var(--mat-sys-surface-container);
    color: var(--mat-sys-on-surface);
    border-radius: var(--mat-sys-corner-medium);
    font: var(--mat-sys-body-medium);
  ">
    <p style="margin: 0 0 0.5rem;">This content collapses without a hardcoded height.</p>
    <p style="margin: 0;">The region measures itself, so it fits whatever is projected in.</p>
  </div>`;

const meta: Meta<Collapse> = {
  title: 'Components/Collapse',
  component: Collapse,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [Collapse, CollapseTrigger, Button, MatButton, MatIcon] })],
  args: {
    expanded: true,
    disabled: false,
    orientation: 'vertical',
  },
  argTypes: {
    expanded: { control: 'boolean' },
    disabled: { control: 'boolean' },
    orientation: { control: 'inline-radio', options: ORIENTATIONS },
    duration: { control: { type: 'number' } },
    regionId: { table: { disable: true } },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-collapse` is a **generic collapsible content area**: any region that opens and',
          'closes, with none of the panel chrome or accordion semantics of `ui-expansion-panel`.',
          'It owns one thing — animating a projected region open and shut — and leaves every',
          'surface decision to whatever composes it.',
          '',
          '### Driving it',
          '',
          '- `[(expanded)]` two-way binds the open state (`model()`), and `expandedChange` fires',
          '  on every change.',
          '- A `uiCollapseTrigger` on **any** element toggles it: projected inside the collapse it',
          '  wires up by itself, or pointed at one elsewhere with `[uiCollapseTrigger]="ref"`.',
          '- `open()`, `close()` and `toggle()` are there for imperative control.',
          '',
          '### The animation',
          '',
          'The region is a one-cell CSS grid whose track animates `1fr → 0fr`, so the browser',
          'measures the content and **no pixel height is ever hardcoded**. Duration and easing',
          'come from the fleet’s motion tokens (`--ui-sys-motion-*`); `prefers-reduced-motion`',
          'drops the slide to an instant state change.',
          '',
          '### Accessibility',
          '',
          'The trigger carries `aria-expanded` and `aria-controls`; the region has a matching id',
          'and, when collapsed, is `inert` — so the hidden content leaves the tab order and the',
          'accessibility tree rather than merely being clipped.',
        ].join('\n'),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 24rem;">
        <button matButton uiButton uiCollapseTrigger variant="tonal" style="margin-bottom: 0.5rem;">
          Toggle content
        </button>
        <ui-collapse ${argsToTemplate(args)}>${BODY}</ui-collapse>
      </div>
    `,
  }),
};

export default meta;
type Story = StoryObj<Collapse>;

/** The default: a vertical collapse, open, with a projected button trigger. */
export const Vertical: Story = {};

/**
 * `orientation="horizontal"` animates the width instead of the height — for a
 * side panel, an inline detail column, or a toolbar section that slides in.
 */
export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
  render: (args) => ({
    props: args,
    template: `
      <div style="display: flex; align-items: flex-start; gap: 0.5rem;">
        <button matButton uiButton uiCollapseTrigger variant="tonal">Toggle</button>
        <ui-collapse ${argsToTemplate(args)}>
          <div style="
            width: 16rem;
            padding: 1rem;
            background: var(--mat-sys-surface-container);
            color: var(--mat-sys-on-surface);
            border-radius: var(--mat-sys-corner-medium);
            font: var(--mat-sys-body-medium);
          ">
            A horizontal collapse slides its width open and shut.
          </div>
        </ui-collapse>
      </div>
    `,
  }),
};

/**
 * The trigger is a directive, so **any** element can be one — here a plain
 * `<div>` header with an icon. It gains `role="button"`, a tab stop and
 * Enter/Space handling automatically, and the whole row toggles the panel.
 */
export const CustomTrigger: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="max-width: 24rem;">
        <ui-collapse ${argsToTemplate(args)}>
          <div
            uiCollapseTrigger
            style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0.75rem 1rem;
              cursor: pointer;
              background: var(--mat-sys-surface-container-high);
              color: var(--mat-sys-on-surface);
              border-radius: var(--mat-sys-corner-medium);
              font: var(--mat-sys-title-small);
            "
          >
            <span>Advanced settings</span>
            <mat-icon>expand_more</mat-icon>
          </div>
          ${BODY}
        </ui-collapse>
      </div>
    `,
  }),
};

/**
 * `disabled` freezes the collapse in its current state: the trigger reports
 * `aria-disabled` and clicks and key presses do nothing. It does not close the
 * region — an open collapse stays open.
 */
export const Disabled: Story = {
  args: { disabled: true, expanded: true },
};

/**
 * `prefers-reduced-motion` is respected automatically: when the OS requests
 * reduced motion, the collapse skips the slide and changes state instantly. This
 * story sets an exaggerated `duration` of 2000ms so the difference is obvious —
 * turn "Reduce motion" on in your OS and the same toggle becomes immediate,
 * with no override needed here.
 */
export const ReducedMotion: Story = {
  args: { duration: 2000 },
};
