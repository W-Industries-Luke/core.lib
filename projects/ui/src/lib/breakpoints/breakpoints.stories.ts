import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { UiBreakpoints, type UiDeviceClass } from './breakpoints';

/** The icon that stands in for each device class, so the live value reads at a glance. */
const DEVICE_ICON: Readonly<Record<UiDeviceClass, string>> = {
  handset: 'smartphone',
  tablet: 'tablet',
  web: 'computer',
};

/**
 * The consumer, as a consumer actually writes it: a component that injects
 * `UiBreakpoints` and reads its signals straight from the template — no async
 * pipe, no subscription, no `BreakpointObserver` of its own.
 *
 * `UiBreakpoints` has no element to render — it is a service reporting the
 * viewport — so this stands in for it, and the signals it reads are wired to the
 * *real* `BreakpointObserver`. Resize the preview (drag its frame, or open this
 * story in its own tab and resize the window) and every value below moves live.
 */
@Component({
  selector: 'ui-breakpoints-demo',
  imports: [MatIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    :host {
      display: block;
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface);
    }

    .active {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
      border-radius: var(--mat-sys-corner-large);
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }

    .active mat-icon {
      width: 2rem;
      height: 2rem;
      font-size: 2rem;
    }

    .active .label {
      font: var(--mat-sys-title-medium);
      text-transform: capitalize;
    }

    .flags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .flag {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.75rem;
      border-radius: var(--mat-sys-corner-full);
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-large);
    }

    .flag[data-on='true'] {
      background: var(--ui-sys-success);
      color: var(--ui-sys-on-success);
    }

    /* The everyday payoff: a grid whose column count comes straight off the
       signals, so it reflows with the viewport with no media queries of its own. */
    .cards {
      display: grid;
      gap: 0.75rem;
      grid-template-columns: repeat(var(--columns), 1fr);
    }

    .card {
      padding: 1rem;
      border-radius: var(--mat-sys-corner-medium);
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface);
    }

    .hint {
      margin-top: 1.25rem;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
  template: `
    <div class="active">
      <mat-icon>{{ icon() }}</mat-icon>
      <span>
        <code>active()</code> is <span class="label">{{ breakpoints.active() }}</span>
      </span>
    </div>

    <div class="flags">
      <span class="flag" [attr.data-on]="breakpoints.handset()">
        <mat-icon>smartphone</mat-icon> handset() — {{ breakpoints.handset() }}
      </span>
      <span class="flag" [attr.data-on]="breakpoints.tablet()">
        <mat-icon>tablet</mat-icon> tablet() — {{ breakpoints.tablet() }}
      </span>
      <span class="flag" [attr.data-on]="breakpoints.web()">
        <mat-icon>computer</mat-icon> web() — {{ breakpoints.web() }}
      </span>
    </div>

    <div class="cards" [style.--columns]="columns()">
      @for (n of cards(); track n) {
        <div class="card">Card {{ n }}</div>
      }
    </div>

    <p class="hint">
      The grid above shows {{ columns() }}
      {{ columns() === 1 ? 'column' : 'columns' }} — one on a handset, two on a
      tablet, three on web. Resize the preview to watch every value move.
    </p>
  `,
})
class BreakpointsDemo {
  protected readonly breakpoints = inject(UiBreakpoints);

  /** The icon for the current device class — a plain read of `active()`. */
  protected readonly icon = computed(() => DEVICE_ICON[this.breakpoints.active()]);

  /** How many columns the demo grid gets, driven straight off the signals. */
  protected readonly columns = computed(
    () => ({ handset: 1, tablet: 2, web: 3 })[this.breakpoints.active()],
  );

  protected readonly cards = computed(() => Array.from({ length: 6 }, (_, i) => i + 1));
}

const meta: Meta<BreakpointsDemo> = {
  title: 'Services/Breakpoints',
  component: BreakpointsDemo,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [BreakpointsDemo] })],
  parameters: {
    docs: {
      description: {
        component: [
          '`UiBreakpoints` is an injectable service rather than a component: it reports the current',
          'responsive breakpoint, so it has no element of its own. The story below is a *consumer* — a',
          'component that does `inject(UiBreakpoints)` and reads its signals straight from the template,',
          'which is exactly how a component in the fleet uses it. **Resize the preview** (drag the frame,',
          'or open the story in its own tab and resize the window) and every value moves live.',
          '',
          '### Why it exists',
          '',
          'Several components need the same “is this a phone?” logic — a sheet that becomes a dialog on',
          'desktop, a toolbar that collapses into a menu, a grid that drops to one column. Left to itself',
          'each would inject CDK’s `BreakpointObserver`, wire up its `Observable<BreakpointState>` and',
          'convert it to a signal — the same boilerplate every time, and a second subscription to the',
          'same query is how two answers to one question start to disagree. This is that logic, written',
          'once and shared at the root.',
          '',
          '### The breakpoints',
          '',
          'The three device classes are names for CDK’s own `Breakpoints.Handset` / `.Tablet` / `.Web`',
          'media queries, which between them partition every viewport, so exactly one is active:',
          '',
          '| Signal | Device | Portrait | Landscape |',
          '| --- | --- | --- | --- |',
          '| `handset()` | phone | `≤ 599.98px` | `≤ 959.98px` |',
          '| `tablet()` | tablet | `600–839.98px` | `960–1279.98px` |',
          '| `web()` | laptop/desktop | `≥ 840px` | `≥ 1280px` |',
          '',
          '`active()` folds the three into a single `\'handset\' | \'tablet\' | \'web\'`, for a template',
          '`@switch` or a lookup keyed by device.',
          '',
          '### Usage',
          '',
          '```ts',
          'private readonly breakpoints = inject(UiBreakpoints);',
          '',
          '// Drive a template straight off the signals — no async pipe, no subscription.',
          'protected readonly columns = computed(() => (this.breakpoints.handset() ? 1 : 3));',
          '```',
          '',
          '### Escape hatches',
          '',
          '- `observe(query)` returns a boolean signal for any custom media query or CDK breakpoint, for',
          '  the widths the three device classes do not name.',
          '- `breakpointObserver` is the CDK `BreakpointObserver` underneath, for its imperative',
          '  `isMatched(...)` check and its raw `observe(...)` observable.',
        ].join('\n'),
      },
    },
  },
};

export default meta;
type Story = StoryObj<BreakpointsDemo>;

/**
 * The service, read from a template. Each signal is a plain field read —
 * `breakpoints.handset()`, `breakpoints.active()` — so it drops into `@if`,
 * `@switch`, a `computed`, or a `[style]` binding with no ceremony.
 *
 * Resize the preview and watch the active class, the three flags, and the grid’s
 * column count all follow. In an app the same signals drive whether a sheet
 * becomes a dialog, whether a toolbar collapses, or how many columns a grid gets.
 */
export const Default: Story = {};
