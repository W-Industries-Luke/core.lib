import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { argsToTemplate, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';

import { Button } from '../button/button';
import { Spinner } from '../spinner/spinner';
import { Alert, AlertIcon, AlertTitle, type UiAlertVariant } from './alert';

const VARIANTS: UiAlertVariant[] = ['info', 'success', 'warning', 'error'];

/** What each variant is actually for, said in the alert itself. */
const MESSAGES: Record<UiAlertVariant, string> = {
  info: 'Scheduled maintenance runs on Sunday from 02:00 to 04:00 UTC.',
  success: 'Your changes have been saved.',
  warning: 'Your session expires in 5 minutes.',
  error: 'We could not reach the server. Check your connection and try again.',
};

const TITLES: Record<UiAlertVariant, string> = {
  info: 'Scheduled maintenance',
  success: 'Saved',
  warning: 'Session expiring',
  error: 'Connection failed',
};

/** Alerts are full-width by nature, so every story renders in a page-ish column. */
const frame = (content: string, width = '34rem') =>
  `<div style="max-width: ${width}; display: flex; flex-direction: column; gap: 1rem;">${content}</div>`;

const meta: Meta<Alert> = {
  title: 'Components/Alert',
  component: Alert,
  tags: ['autodocs'],
  decorators: [
    // AlertTitle and AlertIcon are the projection markers; Button and Spinner
    // appear in the slot stories, which are the reason those slots exist.
    moduleMetadata({ imports: [Alert, AlertTitle, AlertIcon, MatIcon, MatButton, Button, Spinner] }),
  ],
  args: {
    variant: 'info',
    dismissible: false,
    open: true,
  },
  argTypes: {
    variant: { control: 'inline-radio', options: VARIANTS },
    dismissible: { control: 'boolean' },
    open: { control: 'boolean' },
    icon: { control: 'text' },
    dismissLabel: { control: 'text' },
    dismissed: { action: 'dismissed' },
  },
  parameters: {
    docs: {
      description: {
        component: [
          '`ui-alert` is an inline message banner: an icon, a message, and optionally a dismiss',
          'button. Material ships no first-class inline alert, so this is the one component in this',
          'library that owns its own container — but not its own colours, and not its own parts.',
          '',
          '### Composed from Material',
          '',
          'The icon is `<mat-icon>` and the dismiss button is Material’s own `matIconButton`, each',
          'resolving its colour from a Material token that `alert.scss` re-points at the variant’s',
          'theme role. There is not a literal colour anywhere in the component, so every story below',
          'renders the exact palette a consuming app gets — toggle your OS light/dark preference to',
          'watch them all follow.',
          '',
          '### Colour comes from M3’s *container* roles',
          '',
          'M3 gives each colour a bold role (`error`) and a quiet tinted one (`error-container`).',
          'A banner tints a whole block of text, so it wants the second. `error` uses M3’s own',
          '`error-container`; `info` uses `secondary-container`, the brand’s low-chroma tint, because',
          '“here is some information” must not borrow the urgency of a colour that means something.',
          '`success` and `warning` have no M3 role at all — M3’s palette stops at',
          'primary/secondary/tertiary/error — so the shared theme derives',
          '`--ui-sys-success-container` and `--ui-sys-warning-container` from Material’s prebuilt',
          'palettes the same way Material itself derives `secondary-container`: off the palette’s',
          'reduced-chroma ramp, at the tones M3 gives a container. That is what keeps',
          '`on-<name>-container` above 4.5:1 against its container, in either mode.',
          '',
          '### Accessibility',
          '',
          '`role` follows `variant`: `alert` (assertive, interrupts a screen reader) for `error` and',
          '`warning`, `status` (polite, waits its turn) for `info` and `success`. The icon repeats the',
          'meaning of the colour for anyone who cannot read it, and is `aria-hidden` because the text',
          'already says the same thing.',
        ].join(' '),
      },
    },
  },
  render: (args) => ({
    props: args,
    template: frame(`<ui-alert ${argsToTemplate(args)}>${MESSAGES[args.variant ?? 'info']}</ui-alert>`),
  }),
};

export default meta;
type Story = StoryObj<Alert>;

/** The default alert: `info`, not dismissible. */
export const Default: Story = {};

// --- Variants --------------------------------------------------------------

/** The default. `secondary-container` — the brand’s quiet tint, announced politely. */
export const Info: Story = { args: { variant: 'info' } };

/** The theme’s `success` container role, derived from `mat.$green-palette`. Announced politely. */
export const Success: Story = { args: { variant: 'success' } };

/** The theme’s `warning` container role, derived from `mat.$orange-palette`. Announced assertively. */
export const Warning: Story = { args: { variant: 'warning' } };

/** M3’s own `error-container`. Announced assertively. */
export const Error: Story = { args: { variant: 'error' } };

/**
 * Every variant together — the set a consumer is choosing between. Each one’s
 * icon carries the same meaning as its colour, so the status survives a
 * greyscale print and a red/green colour deficiency alike.
 */
export const Variants: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(
      VARIANTS.map((variant) => `<ui-alert variant="${variant}">${MESSAGES[variant]}</ui-alert>`).join(
        '\n',
      ),
    ),
  }),
};

// --- dismissible -----------------------------------------------------------

/**
 * The default. An alert that reports the state of the page — a validation
 * summary, an outage banner — is not the user’s to dismiss, because dismissing it
 * would not make the thing it reports go away.
 */
export const NotDismissible: Story = { args: { dismissible: false } };

/**
 * `dismissible` adds Material’s `matIconButton` at the trailing end. Pressing it
 * closes the alert on its own — `open` is a `model()`, so the common case needs no
 * wiring — and then emits `dismissed`. Press it and watch the Actions panel.
 *
 * Set `open` back to `true` in the controls to bring it back.
 */
export const Dismissible: Story = { args: { dismissible: true } };

/** Every variant, dismissible. The button’s colour follows the container it sits on. */
export const DismissibleVariants: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(
      VARIANTS.map(
        (variant) => `<ui-alert variant="${variant}" dismissible>${MESSAGES[variant]}</ui-alert>`,
      ).join('\n'),
    ),
  }),
};

/**
 * `dismissLabel` names the button for what dismissing *does*. The button’s only
 * content is an `×`, so on a page with several alerts “Dismiss” alone tells a
 * screen reader user nothing about which one they are closing.
 */
export const DismissLabel: Story = {
  args: { dismissible: true, dismissLabel: 'Dismiss the maintenance notice' },
};

// --- Title -----------------------------------------------------------------

/**
 * `uiAlertTitle` marks a heading above the message — for an alert whose message
 * needs a summary a reader can scan.
 *
 * The element stays yours: only the typography (M3’s `title-small`) is this
 * library’s, so use whichever heading level the surrounding document outline
 * calls for.
 */
export const WithTitle: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(
      VARIANTS.map(
        (variant) => `
      <ui-alert variant="${variant}" dismissible>
        <h3 uiAlertTitle>${TITLES[variant]}</h3>
        ${MESSAGES[variant]}
      </ui-alert>`,
      ).join('\n'),
    ),
  }),
};

/** Without a title the column has a single child, so there is no gap where one would have been. */
export const WithoutTitle: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`<ui-alert variant="error">${MESSAGES['error']}</ui-alert>`),
  }),
};

// --- Icon ------------------------------------------------------------------

/** Each variant’s default glyph: `info`, `check_circle`, `warning`, `error`. */
export const VariantIcons: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(
      VARIANTS.map((variant) => `<ui-alert variant="${variant}">${variant}</ui-alert>`).join('\n'),
    ),
  }),
};

/** `icon` names any Material Symbols ligature, for an alert that is about something specific. */
export const CustomIcon: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-alert variant="warning" icon="cloud_off">
        <h3 uiAlertTitle>Working offline</h3>
        Changes are saved locally and will sync when you reconnect.
      </ui-alert>`),
  }),
};

/** `icon=""` (or `[icon]="null"`) drops the glyph entirely, for a plain tinted banner. */
export const NoIcon: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`<ui-alert variant="info" icon="">${MESSAGES['info']}</ui-alert>`),
  }),
};

/**
 * Rule 7: a string input cannot spell an SVG, an avatar or a spinner. Project a
 * `uiAlertIcon` element and it replaces the variant’s icon — here a live
 * `<ui-spinner>` on an alert that is still resolving.
 */
export const ProjectedIcon: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-alert variant="info">
        <ui-spinner uiAlertIcon [diameter]="20" label="Reconnecting" />
        Reconnecting to the server…
      </ui-alert>`),
  }),
};

// --- Composition -----------------------------------------------------------

/**
 * The message slot takes any content, so an alert that asks for something can
 * carry the control that does it — no extra slot, no `::ng-deep`.
 */
export const WithAction: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-alert variant="error" dismissible>
        <h3 uiAlertTitle>Connection failed</h3>
        <p style="margin: 0 0 0.5rem;">${MESSAGES['error']}</p>
        <button matButton uiButton variant="outlined">Try again</button>
      </ui-alert>`),
  }),
};

/** A long message wraps inside the column; the icon and the button stay level with the first line. */
export const LongMessage: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-alert variant="warning" dismissible>
        <h3 uiAlertTitle>Your trial ends in 3 days</h3>
        After that, projects stay readable but new builds are paused until a plan is chosen. Existing
        deployments keep running, and nothing is deleted — a plan can be chosen at any point, and
        everything picks up where it left off. Billing questions go to support@example.com.
      </ui-alert>`),
  }),
};

// --- State -----------------------------------------------------------------

/**
 * `open` is a `model()`, so state is two-way (rule 5) rather than an input and an
 * output pretending to be one. The dismiss button sets it to `false` itself; a
 * consumer can set it back.
 *
 * `exportAs: 'uiAlert'` hands back the component, so this needs no host code at
 * all — the button below is just `alert.open.set(true)`.
 */
export const TwoWayOpen: Story = {
  name: 'State: [(open)] and exportAs',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-alert #alert="uiAlert" variant="success" dismissible>
        Your changes have been saved. Dismiss me, then bring me back.
      </ui-alert>

      <button matButton uiButton variant="filled" (click)="alert.open.set(true)">
        Show the alert again
      </button>

      <p style="font: var(--mat-sys-body-small); margin: 0;">
        open: <strong>{{ alert.open() }}</strong>
      </p>`),
  }),
};

// --- Accessibility ---------------------------------------------------------

/**
 * `role` follows `variant`: `alert` interrupts a screen reader, `status` waits its
 * turn. Announcing “saved” by cutting the user off mid-sentence is the misuse the
 * ARIA spec warns about, so only `error` and `warning` are assertive.
 *
 * Inspect these in the DOM — the role is on the `<ui-alert>` host itself. A plain
 * `role` attribute overrides it where the surrounding page knows better.
 */
export const Roles: Story = {
  name: 'Accessibility: role',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(
      VARIANTS.map(
        (variant) => `
      <ui-alert variant="${variant}">
        <code>variant="${variant}"</code> → <code>role="${
          variant === 'error' || variant === 'warning' ? 'alert' : 'status'
        }"</code>
      </ui-alert>`,
      ).join('\n'),
    ),
  }),
};

// --- Styling hooks ---------------------------------------------------------

/**
 * The `--ui-alert-*` hooks are read off `<ui-alert>`, so restyling is an ordinary
 * rule on an ordinary selector — no `::ng-deep`, no `!important`, no wrapper.
 *
 * Point a colour at another `--mat-sys-*` / `--ui-sys-*` role rather than a
 * literal, so it survives a palette change and dark mode — as the last one here
 * does with `tertiary`.
 */
export const StylingHooks: Story = {
  name: 'Styling hooks: --ui-alert-*',
  parameters: { controls: { disable: true } },
  render: () => ({
    template: frame(`
      <ui-alert variant="info" style="--ui-alert-radius: 0;">
        <code>--ui-alert-radius: 0</code> — a square banner, for a full-bleed page header.
      </ui-alert>

      <ui-alert variant="info" style="--ui-alert-padding: 24px;">
        <code>--ui-alert-padding: 24px</code> — a roomier banner.
      </ui-alert>

      <ui-alert variant="success" style="--ui-alert-icon-color: var(--ui-sys-success);">
        <code>--ui-alert-icon-color</code> — the bold role, so the icon carries the status and the
        text stays quiet.
      </ui-alert>

      <ui-alert
        variant="info"
        style="--ui-alert-background-color: var(--mat-sys-tertiary-container);
               --ui-alert-text-color: var(--mat-sys-on-tertiary-container);"
      >
        <code>--ui-alert-background-color</code> / <code>--ui-alert-text-color</code> — pointed at
        the theme’s tertiary container, so this still follows the palette and dark mode.
      </ui-alert>`),
  }),
};

// --- The full matrix -------------------------------------------------------

/**
 * Every variant × dismissible × title combination. This is the reference grid: if
 * a combination does not hold together here, the theme is wrong.
 */
export const AllConfigurations: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    template: `
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 26rem)); gap: 1rem;">
        ${VARIANTS.flatMap((variant) =>
          [false, true].flatMap((dismissible) =>
            [false, true].map(
              (withTitle) => `
          <ui-alert variant="${variant}" [dismissible]="${dismissible}">
            ${withTitle ? `<h3 uiAlertTitle>${TITLES[variant]}</h3>` : ''}
            ${variant} · dismissible: ${dismissible} · title: ${withTitle}
          </ui-alert>`,
            ),
          ),
        ).join('')}
      </div>
    `,
  }),
};
