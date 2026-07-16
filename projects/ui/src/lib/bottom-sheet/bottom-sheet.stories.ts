import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import {
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  moduleMetadata,
  type Meta,
  type StoryObj,
} from '@storybook/angular-vite';
import { expect, waitFor } from 'storybook/test';

import { Button } from '../button/button';
import { BottomSheet, type UiBottomSheetConfig } from './bottom-sheet';

/** Where a post can be shared — the typed result the demo sheets dismiss with. */
type ShareTarget = 'email' | 'link' | 'message';

/** What the demo sheets are opened with — the typed data. */
interface Post {
  readonly title: string;
}

const TARGETS: readonly { readonly value: ShareTarget; readonly label: string; readonly icon: string }[] = [
  { value: 'email', label: 'Email', icon: 'mail' },
  { value: 'link', label: 'Copy link', icon: 'link' },
  { value: 'message', label: 'Message', icon: 'chat' },
];

/**
 * A consumer's own sheet: an ordinary component, opened with `open()`.
 *
 * It reads what it was opened with from `MAT_BOTTOM_SHEET_DATA` and dismisses
 * with a result through Material's own `MatBottomSheetRef` — both Material's, so
 * there is no wiring of this library's to learn.
 */
@Component({
  selector: 'ui-share-sheet',
  imports: [MatButton, Button, MatIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 style="font: var(--mat-sys-title-medium); margin: 0.5rem 0;">Share “{{ data.title }}”</h2>

    <div style="display: flex; flex-direction: column; align-items: stretch;">
      @for (target of targets; track target.value) {
        <button
          matButton
          uiButton
          variant="text"
          style="justify-content: flex-start;"
          (click)="ref.dismiss(target.value)"
        >
          <mat-icon>{{ target.icon }}</mat-icon>
          {{ target.label }}
        </button>
      }
    </div>
  `,
})
class ShareSheet {
  protected readonly ref = inject<MatBottomSheetRef<ShareSheet, ShareTarget>>(MatBottomSheetRef);
  protected readonly data = inject<Post>(MAT_BOTTOM_SHEET_DATA);

  protected readonly targets = TARGETS;
}

/**
 * The consumer, as a consumer actually writes it: a component that injects the
 * service and calls it from a click handler. Every story on this page is one of
 * these — a bottom sheet has no element to render, so there is nothing else to
 * show.
 *
 * The result is the point. `afterDismissed()` is Material's own, and it emits
 * `undefined` for Escape, the backdrop and a bare `dismiss()` — so a call site
 * has to say what "dismissed without choosing" means.
 */
@Component({
  selector: 'ui-bottom-sheet-demo',
  imports: [MatButton, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <button matButton uiButton variant="filled" (click)="share()">{{ trigger() }}</button>
    </div>

    <p style="font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant);">
      {{ log() }}
    </p>
  `,
})
class BottomSheetDemo {
  private readonly bottomSheet = inject(BottomSheet);

  /** The label of the button that opens the sheet. */
  readonly trigger = input('Share post');

  /** The post the sheet is opened with — `config.data`, typed as `Post`. */
  readonly post = input<Post>({ title: 'The state of the fleet' });

  /**
   * The sheet's accessible name. A sheet is a `role="dialog"` with nothing to
   * infer a name from, so this is not optional in real code.
   */
  readonly ariaLabel = input('Share this post');

  /** Anything else to hand Material — disableClose, maxHeight, panelClass, data. */
  readonly config = input<Omit<UiBottomSheetConfig<Post>, 'data' | 'ariaLabel'>>({});

  protected readonly log = signal('Press the button.');

  protected share(): void {
    this.bottomSheet
      .open<ShareSheet, Post, ShareTarget>(ShareSheet, {
        data: this.post(),
        ariaLabel: this.ariaLabel(),
        ...this.config(),
      })
      .afterDismissed()
      .subscribe((target) =>
        this.log.set(
          target
            ? `Shared via ${target} — this is where the work goes.`
            : 'Dismissed without choosing, so nothing happened.',
        ),
      );
  }
}

/**
 * Rule 7: a sheet does not have to be a component. `open()` takes a `TemplateRef`
 * too, for content that is already in the template of whoever opens it.
 *
 * The data arrives as the template's implicit context and the ref as
 * `bottomSheetRef`, so dismissing with a result is `(click)="ref.dismiss('link')"`
 * — no component, no injection.
 */
@Component({
  selector: 'ui-bottom-sheet-template-demo',
  imports: [MatButton, Button, MatIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #tpl let-post let-ref="bottomSheetRef">
      <h2 style="font: var(--mat-sys-title-medium); margin: 0.5rem 0;">Share “{{ post.title }}”</h2>

      <div style="display: flex; flex-direction: column; align-items: stretch;">
        @for (target of targets; track target.value) {
          <button
            matButton
            uiButton
            variant="text"
            style="justify-content: flex-start;"
            (click)="ref.dismiss(target.value)"
          >
            <mat-icon>{{ target.icon }}</mat-icon>
            {{ target.label }}
          </button>
        }
      </div>
    </ng-template>

    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <button matButton uiButton variant="filled" (click)="share()">Share from a template</button>
    </div>

    <p style="font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant);">
      {{ log() }}
    </p>
  `,
})
class BottomSheetTemplateDemo {
  private readonly bottomSheet = inject(BottomSheet);
  private readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');

  protected readonly targets = TARGETS;
  protected readonly log = signal('Press the button.');

  protected share(): void {
    this.bottomSheet
      .open<unknown, Post, ShareTarget>(this.tpl(), {
        data: { title: 'The state of the fleet' },
        ariaLabel: 'Share this post',
      })
      .afterDismissed()
      .subscribe((target) => this.log.set(target ? `Shared via ${target}.` : 'Dismissed.'));
  }
}

/** A sheet with more content than fits, to show the `maxHeight` default doing its job. */
@Component({
  selector: 'ui-terms-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 style="font: var(--mat-sys-title-medium); margin: 0.5rem 0;">Terms of service</h2>
    @for (paragraph of paragraphs; track $index) {
      <p>{{ paragraph }}</p>
    }
  `,
})
class TermsSheet {
  protected readonly paragraphs = Array.from(
    { length: 12 },
    (_, i) =>
      `${i + 1}. This clause exists to make the sheet taller than its maxHeight, so that the ` +
      'content inside it scrolls rather than the sheet growing past the top of the window. ' +
      'All of that is Material’s own, resolved from the shared theme.',
  );
}

@Component({
  selector: 'ui-bottom-sheet-scroll-demo',
  imports: [MatButton, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <button matButton uiButton variant="filled" (click)="show()">Read the terms</button>
    </div>
  `,
})
class BottomSheetScrollDemo {
  private readonly bottomSheet = inject(BottomSheet);

  protected show(): void {
    this.bottomSheet.open(TermsSheet, { ariaLabel: 'Terms of service' });
  }
}

/**
 * Restyling, with no `::ng-deep` and no `!important`.
 *
 * A sheet renders into the CDK overlay at the end of `<body>`, so it is outside
 * every component's encapsulation already — which is why this demo is
 * `ViewEncapsulation.None`, exactly as a consumer's own global stylesheet would
 * be. The class reaches the panel through `panelClass`, which is Material's own
 * config and is *merged* with `.ui-bottom-sheet-panel` rather than replacing it,
 * and the `--ui-bottom-sheet-*` hooks do the rest.
 */
@Component({
  selector: 'ui-bottom-sheet-styled-demo',
  imports: [MatButton, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: `
    .demo-branded {
      /* Pointed at other theme roles rather than literals, so this still follows
         the palette and dark mode. */
      --ui-bottom-sheet-container-color: var(--mat-sys-surface-container-highest);
      --ui-bottom-sheet-text-color: var(--mat-sys-on-surface-variant);
      --ui-bottom-sheet-radius: 4px;
    }

    /* The everyday reason to reach for the padding hook: content that runs edge
       to edge, where the rows bring their own padding. */
    .demo-full-bleed {
      --ui-bottom-sheet-padding: 0;
    }
  `,
  template: `
    <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center;">
      <button matButton uiButton variant="filled" (click)="show()">{{ trigger() }}</button>
    </div>
  `,
})
class BottomSheetStyledDemo {
  private readonly bottomSheet = inject(BottomSheet);

  /** The label of the button that opens the sheet. */
  readonly trigger = input('Branded sheet');

  /** The consumer's own class, merged with `.ui-bottom-sheet-panel` rather than replacing it. */
  readonly panelClass = input('demo-branded');

  /** The sheet's heading, so each story says which hooks painted it. */
  readonly title = input('Painted from --ui-bottom-sheet-*');

  protected show(): void {
    this.bottomSheet.open<ShareSheet, Post, ShareTarget>(ShareSheet, {
      data: { title: this.title() },
      ariaLabel: 'Share this post',
      panelClass: this.panelClass(),
    });
  }
}

/**
 * Opens the story's sheet by pressing its trigger, and waits for it to arrive.
 *
 * Every story on this page runs this, which is what makes each of them a real axe
 * assertion on an open, focus-trapped sheet in a real browser: the `role`, the
 * `aria-label` that names it, and the contrast of every colour the theme
 * resolved.
 *
 * Without it, a bottom sheet story renders a *button* — the sheet is opened from
 * code and lives in the CDK overlay, so it is simply not there until something
 * presses the trigger, and `npm run test:a11y` would be checking the trigger
 * rather than the thing this page documents. That matters more here than
 * anywhere else in the library: the jsdom specs next door cannot see any of this,
 * because jsdom has no layout and no colour — it cannot even answer where focus
 * landed, which is why the spec asserts `autoFocus` on the config and leaves the
 * real question to this.
 *
 * It does not run on the Docs page — Storybook's `docs.story.autoplay` is `false`
 * by default — so the autodocs page below stays a page rather than a stack of
 * sheets.
 */
async function openOnLoad({ canvasElement }: { canvasElement: HTMLElement }): Promise<void> {
  canvasElement.querySelector('button')!.click();

  // The overlay lands at the end of <body>, outside the story's own canvas — so
  // this waits on the document rather than on the canvas.
  await waitFor(() => expect(document.querySelector('.mat-bottom-sheet-container')).toBeTruthy());
}

const meta: Meta<BottomSheetDemo> = {
  title: 'Services/BottomSheet',
  component: BottomSheetDemo,
  tags: ['autodocs'],
  play: openOnLoad,
  decorators: [
    moduleMetadata({
      imports: [
        BottomSheetDemo,
        BottomSheetTemplateDemo,
        BottomSheetScrollDemo,
        BottomSheetStyledDemo,
      ],
    }),
  ],
  args: {
    trigger: 'Share post',
    post: { title: 'The state of the fleet' },
    ariaLabel: 'Share this post',
    config: {},
  },
  argTypes: {
    trigger: { control: 'text' },
    post: { control: 'object' },
    ariaLabel: { control: 'text' },
    config: { control: 'object' },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`BottomSheet` is an injectable service rather than a component: a sheet has no element in',
          'anyone’s template — it is opened from code, into the CDK overlay. So there is nothing to',
          'render on this page directly, and every story below is a *consumer*: a component that does',
          '`inject(BottomSheet)` and calls it from a click handler, which is exactly how an app uses',
          'it. Press the buttons.',
          '',
          '### It is `MatBottomSheet`, themed',
          '',
          '`open()` mirrors Material’s, takes Material’s own `MatBottomSheetConfig`, and returns',
          'Material’s own `MatBottomSheetRef` — so `afterDismissed()`, `afterOpened()`,',
          '`backdropClick()`, `keydownEvents()` and `instance` are all still there. Every sheet gets a',
          '`.ui-bottom-sheet-panel` class, and that class re-points Material’s own tokens at the shared',
          'theme’s roles: there is not a literal colour in `styles/_bottom-sheet.scss`, so every story',
          'below shows the exact palette a consuming app gets. Toggle your OS light/dark preference and',
          'watch them follow.',
          '',
          '### Typed data in, a typed result out',
          '',
          '```ts',
          'const ref = this.bottomSheet.open<ShareSheet, Post, ShareTarget>(ShareSheet, {',
          '  data: this.post(),',
          '  ariaLabel: \'Share this post\',',
          '});',
          '',
          'ref.afterDismissed().subscribe((target) => target && this.shareTo(target));',
          '```',
          '',
          '`T` is what is rendered, `D` is what `config.data` has to be, and `R` is what',
          '`afterDismissed()` emits. **A result is always `R | undefined`**: Escape, the backdrop and a',
          'bare `dismiss()` all report `undefined`, so a call site has to say what “dismissed without',
          'choosing” means.',
          '',
          '### A sheet is a dialog, so name it',
          '',
          'Material renders the sheet into a container with `role="dialog"` and **no accessible name of',
          'its own** — there is no `matBottomSheetTitle` the way there is a `matDialogTitle`, so nothing',
          'can infer one. Pass `ariaLabel`, as every story here does, or a screen reader announces an',
          'unnamed dialog.',
          '',
          'Everything else is Material’s and is not reimplemented: the focus trap, the focus restore on',
          'dismiss, Escape, the backdrop, and marking the rest of the page `aria-hidden`. `aria-modal`',
          'is **off** by default, for the same reason it is on `Dialog` — it would hide the overlays a',
          '`<ui-select>` *inside* the sheet renders into. Pass `ariaModal: true` per call for a sheet',
          'with no such content.',
        ].join('\n'),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: `
      <ui-bottom-sheet-demo
        [trigger]="trigger"
        [post]="post"
        [ariaLabel]="ariaLabel"
        [config]="config"
      />`,
  }),
};

export default meta;
type Story = StoryObj<BottomSheetDemo>;

/**
 * `bottomSheet.open(ShareSheet, { data, ariaLabel })` — a component of your own,
 * the data it needs, and a typed result back through Material’s own
 * `afterDismissed()`.
 *
 * Try Escape and the backdrop as well as the buttons: both are Material’s, and
 * both report `undefined` rather than a choice.
 *
 * Every story on this page opens its own sheet on load, so that axe has an *open*
 * one to check — see `openOnLoad`. Dismiss it to get back to the trigger.
 */
export const Default: Story = {};

/**
 * Rule 7: a sheet does not have to be a component. `open()` takes a `TemplateRef`
 * too, for content that already lives in the template of whoever opens it.
 *
 * The data is the template’s implicit context and the ref is `bottomSheetRef`:
 *
 * ```html
 * <ng-template #tpl let-post let-ref="bottomSheetRef">
 *   <button matButton (click)="ref.dismiss('email')">Share {{ post.title }}</button>
 * </ng-template>
 * ```
 */
export const FromATemplate: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({ template: `<ui-bottom-sheet-template-demo />` }),
};

/**
 * A sheet taller than its `maxHeight` scrolls inside itself rather than growing
 * past the top of the window.
 *
 * `maxHeight` defaults to `80vh` — Material’s own value, restated as
 * `UI_BOTTOM_SHEET_DEFAULT_VALUES` because it is the one sizing decision Material
 * hardcodes in a stylesheet rather than tokenising, so the config is the only way
 * to move it. Set it per call, or once for the app with
 * `provideUiBottomSheetDefaults({ maxHeight: '60vh' })`.
 */
export const ScrollingContent: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({ template: `<ui-bottom-sheet-scroll-demo />` }),
};

/**
 * `disableClose` — a sheet the backdrop and Escape cannot dismiss, for a choice
 * that has to be made.
 *
 * Material’s own option, forwarded untouched. Give the sheet its own way out when
 * you use it: this one dismisses from its buttons, and a sheet with no way out at
 * all is a trap.
 */
export const DisableClose: Story = {
  args: { trigger: 'Share (must choose)', config: { disableClose: true } },
};

/**
 * Restyling, with **no `::ng-deep` and no `!important`** (rule 2).
 *
 * `panelClass` is Material’s own config and is *merged* with
 * `.ui-bottom-sheet-panel` rather than replacing it, so a class of your own cannot
 * silently strip the theme. The `--ui-bottom-sheet-*` hooks do the rest:
 *
 * ```scss
 * .branded {
 *   --ui-bottom-sheet-container-color: var(--mat-sys-surface-container-highest);
 *   --ui-bottom-sheet-radius: 4px;
 * }
 * ```
 *
 * Point the hooks at other theme roles rather than at literals, as this demo
 * does, and the result still follows the palette and dark mode.
 */
export const Restyled: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({ template: `<ui-bottom-sheet-styled-demo />` }),
};

/**
 * `--ui-bottom-sheet-padding: 0` — the everyday reason to reach for a hook.
 *
 * The canonical bottom sheet is a list of actions, and a `<ui-list>` brings its
 * own padding and wants to run edge to edge — so “take the container’s padding
 * off” is the first thing anyone asks of a sheet. Material writes that padding as
 * a plain declaration rather than a token, so without this hook it would take
 * exactly the reach into `.mat-bottom-sheet-container` that rule 2 exists to
 * prevent.
 *
 * The rows here keep their own padding, so the sheet is still legible — it is the
 * *container’s* inset that is gone, which is what lets a row's hover and focus
 * state span the full width.
 */
export const FullBleed: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <ui-bottom-sheet-styled-demo
        trigger="Full-bleed sheet"
        panelClass="demo-full-bleed"
        title="Painted from --ui-bottom-sheet-padding"
      />`,
  }),
};
