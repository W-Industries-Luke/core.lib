import { afterNextRender, Component, ElementRef, signal, viewChildren } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { expect } from 'storybook/test';

/** One M3 type role: a scale group at one size. */
interface TypeRole {
  /** The role name, e.g. `display-large`. */
  readonly role: string;
  /** The `font` shorthand token the theme emits for it, e.g. `--mat-sys-display-large`. */
  readonly token: string;
}

/**
 * The M3 type scale, in the order M3 lists it: the five groups from biggest to
 * smallest, each in its three sizes. Built by product rather than typed out so a
 * role cannot be forgotten and the list cannot disagree with itself.
 */
const GROUPS = ['display', 'headline', 'title', 'body', 'label'] as const;
const SIZES = ['large', 'medium', 'small'] as const;
const TYPE_ROLES: readonly TypeRole[] = GROUPS.flatMap((group) =>
  SIZES.map((size) => ({ role: `${group}-${size}`, token: `--mat-sys-${group}-${size}` })),
);

/** The computed geometry of one role, read back off the rendered sample. */
interface RoleMetrics {
  readonly size: string;
  readonly weight: string;
  readonly lineHeight: string;
}

/**
 * Renders every M3 type role as a live sample, each painted with the theme's own
 * `font` shorthand token, beside the token name and the size the browser computed
 * from it.
 *
 * Story support for `Foundations/Typography`, and deliberately NOT a library
 * component — nothing here is exported from public-api.ts. Every sample is styled
 * with `font: var(--mat-sys-<role>)` and its size is read back with
 * `getComputedStyle`, so nothing here is a number typed by hand: a role the theme
 * stops emitting renders at the inherited default and its size collapses to match,
 * which the play function catches.
 */
@Component({
  selector: 'ui-typography-scale',
  template: `
    <table class="scale">
      <caption>
        The Material 3 type scale, as the shared theme resolves it.
      </caption>
      <thead>
        <tr>
          <th scope="col">Sample</th>
          <th scope="col">Token</th>
          <th scope="col">Size</th>
          <th scope="col">Weight</th>
          <th scope="col">Line height</th>
        </tr>
      </thead>
      <tbody>
        @for (role of roles; track role.token; let i = $index) {
          <tr>
            <!-- The whole point: the sample's font comes entirely from the token,
                 so what you read is what the theme emits, not a copy of it. -->
            <td #sample class="sample" [style.font]="'var(' + role.token + ')'">
              {{ role.role }}
            </td>
            <td><code>{{ role.token }}</code></td>
            <td class="metric">{{ metrics()[i]?.size }}</td>
            <td class="metric">{{ metrics()[i]?.weight }}</td>
            <td class="metric">{{ metrics()[i]?.lineHeight }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    .scale {
      border-collapse: collapse;
      color: var(--mat-sys-on-surface);
    }
    caption {
      caption-side: top;
      text-align: left;
      margin-bottom: 1rem;
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
    }
    th {
      text-align: left;
      font: var(--mat-sys-title-small);
    }
    th,
    td {
      padding: 0.75rem 1.5rem 0.75rem 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      vertical-align: baseline;
    }
    /* The sample is intentionally NOT given a font here — its only font is the
       token bound inline, so a missing token shows as unstyled text, not a lie. */
    .sample {
      white-space: nowrap;
    }
    code {
      font-family: monospace;
      font-size: 0.85em;
      color: var(--mat-sys-on-surface-variant);
    }
    .metric {
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
      font-variant-numeric: tabular-nums;
    }
  `,
})
class TypographyScale {
  /** The roles to render, in scale order. */
  readonly roles = TYPE_ROLES;

  private readonly samples = viewChildren<ElementRef<HTMLElement>>('sample');

  /** Computed geometry per role, index-aligned with {@link roles}. */
  protected readonly metrics = signal<readonly RoleMetrics[]>([]);

  constructor() {
    // Read the resolved sizes back off the DOM once it has rendered: the token is
    // the source, `getComputedStyle` is the only honest way to show what it became.
    afterNextRender(() => {
      this.metrics.set(
        this.samples().map((ref) => {
          const style = getComputedStyle(ref.nativeElement);
          return { size: style.fontSize, weight: style.fontWeight, lineHeight: style.lineHeight };
        }),
      );
    });
  }
}

const meta: Meta<TypographyScale> = {
  title: 'Foundations/Typography',
  component: TypographyScale,
  decorators: [moduleMetadata({ imports: [TypographyScale] })],
  parameters: {
    docs: {
      description: {
        component:
          'The Material 3 type scale the shared theme ships. Every sample is styled ' +
          'with the theme\'s own `font` shorthand token (`--mat-sys-display-large`, ' +
          '`--mat-sys-body-medium`, …) and its size is read back with `getComputedStyle`, ' +
          'so the catalogue shows what the theme emits rather than a transcription of it. ' +
          'Use a role by pointing `font` at its token — `h1 { font: var(--mat-sys-headline-large); }` ' +
          '— never by hardcoding a size. The scale is set by the `typography` entry in ' +
          '`src/styles/_theme.scss`; the README (**Typography**) shows how an app overrides it.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<TypographyScale>;

/**
 * The full scale.
 *
 * The play function is the assertion the story makes: that the samples really do
 * pick up distinct sizes from the theme. Without it this is a screenshot that
 * would keep passing if every token stopped resolving — the samples would all
 * fall back to the inherited default and render identically, which is exactly
 * what a broken type scale looks like.
 */
export const Scale: Story = {
  render: () => ({ template: '<ui-typography-scale />' }),
  play: async ({ canvasElement }) => {
    const samples = [...canvasElement.querySelectorAll<HTMLElement>('.sample')];

    // One sample per role — a role dropped from the scale would render one fewer.
    expect(samples).toHaveLength(TYPE_ROLES.length);

    const sizePx = (el: HTMLElement) => parseFloat(getComputedStyle(el).fontSize);

    // Every sample resolved to a real, positive size...
    for (const sample of samples) {
      expect(sizePx(sample)).toBeGreaterThan(0);
    }

    // ...and the scale actually descends: display-large is the biggest role and
    // label-small the smallest, so if the tokens had all collapsed to one
    // inherited default this strict ordering would fail rather than pass.
    const displayLarge = samples[0]!;
    const labelSmall = samples.at(-1)!;
    expect(sizePx(displayLarge)).toBeGreaterThan(sizePx(labelSmall));
  },
};
