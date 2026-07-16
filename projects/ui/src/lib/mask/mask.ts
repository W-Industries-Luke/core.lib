import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  Renderer2,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

/**
 * The built-in named masks, keyed by the string a consumer passes to `uiMask`.
 *
 *   - `phone`    — US phone, `(000) 000-0000`
 *   - `date`     — `MM/DD/YYYY`
 *   - `postcode` — US ZIP / ZIP+4, `00000-0000` (lazy, so a bare `12345` is valid)
 *   - `currency` — grouped decimal with a `$` prefix, `$1,234.56`
 *
 * Anything that is *not* one of these is treated as a literal pattern (see the
 * class docs for the token characters), so `uiMask="AA-0000"` is a custom mask,
 * not an unknown preset.
 */
export type UiMaskPreset = 'phone' | 'date' | 'postcode' | 'currency';

/** The preset names, for iteration in stories and tests. */
export const UI_MASK_PRESETS: readonly UiMaskPreset[] = ['phone', 'date', 'postcode', 'currency'];

/**
 * The placeholder tokens a pattern is built from. Every other character in a
 * pattern is a literal that is inserted automatically and skipped over as the
 * user types.
 *
 *   - `0` — a required digit, `[0-9]`
 *   - `A` — a required letter, `[A-Za-z]`
 *   - `*` — a required letter or digit
 */
const TOKENS: Readonly<Record<string, RegExp>> = {
  '0': /\d/,
  A: /[A-Za-z]/,
  '*': /[A-Za-z0-9]/,
};

/**
 * The two directions every mask can go, plus the metadata the directive applies
 * to the host input. A `ui-mask--*` structure is deliberately absent: everything
 * visible is Material's `matInput`, so there is nothing here to colour.
 */
interface ResolvedMask {
  /** Lay a raw value into the mask, marking which output chars fill a placeholder. */
  toDisplay(raw: string): MaskedValue;
  /** Pull the raw (unmasked) value back out of a display string. */
  toRaw(display: string): string;
  /** The empty-field hint, e.g. `(___) ___-____`, shown via the input's placeholder. */
  template: string;
  /** The `inputmode` that brings up the right on-screen keyboard. */
  inputMode: string;
}

interface MaskedValue {
  /** The masked display string. */
  value: string;
  /**
   * One flag per character of {@link value}: `true` where the character fills a
   * placeholder, `false` where it is an inserted literal. This is what lets the
   * caret be counted in *meaningful* characters and land in the same spot after a
   * reformat inserts or drops a separator.
   */
  filled: boolean[];
}

/** Preset metadata. `pattern` and `currency` are mutually exclusive. */
const PRESETS: Readonly<Record<UiMaskPreset, { pattern?: string; currency?: boolean; inputMode: string }>> = {
  phone: { pattern: '(000) 000-0000', inputMode: 'tel' },
  date: { pattern: '00/00/0000', inputMode: 'numeric' },
  postcode: { pattern: '00000-0000', inputMode: 'numeric' },
  currency: { currency: true, inputMode: 'decimal' },
};

/** The regex for a pattern character, or `undefined` if it is a literal. */
function tokenOf(char: string): RegExp | undefined {
  return TOKENS[char];
}

/**
 * Lays `raw` into `pattern`, lazily: it stops at the first placeholder it cannot
 * fill, so a half-typed value produces a half-formatted display rather than one
 * padded with placeholder characters.
 *
 * A raw character that does not match the token at its position is dropped (the
 * `while` loop), so pasting `"abc123"` into a digit mask keeps the digits.
 */
function formatPattern(raw: string, pattern: string): MaskedValue {
  let value = '';
  const filled: boolean[] = [];
  let ri = 0;
  for (const pc of pattern) {
    const token = tokenOf(pc);
    if (token) {
      while (ri < raw.length && !token.test(raw[ri])) {
        ri++;
      }
      if (ri >= raw.length) {
        break;
      }
      value += raw[ri++];
      filled.push(true);
    } else {
      // A literal is only worth emitting while there is still raw left to place
      // after it — otherwise a value like `555` would trail a `) ` no one typed.
      if (ri >= raw.length) {
        break;
      }
      value += pc;
      filled.push(false);
    }
  }
  return { value, filled };
}

/**
 * Extracts the raw value from a display string by keeping only the characters
 * that could fill one of the pattern's placeholders.
 *
 * Order-independent on purpose — it matches each character against the *union* of
 * the pattern's token classes rather than walking positions — which is what makes
 * it safe to call on an arbitrary prefix of the display when counting the caret.
 */
function unmaskPattern(display: string, pattern: string): string {
  const classes = [...new Set(pattern.split('').map(tokenOf).filter((r): r is RegExp => !!r))];
  let raw = '';
  for (const ch of display) {
    if (classes.some((r) => r.test(ch))) {
      raw += ch;
    }
  }
  return raw;
}

/** Builds the empty-field template, e.g. `(000) 000-0000` -> `(___) ___-____`. */
function patternTemplate(pattern: string, placeholderChar: string): string {
  return pattern.replace(/./g, (ch) => (tokenOf(ch) ? placeholderChar : ch));
}

/** Groups an integer digit string with commas: `1234567` -> `1,234,567`. */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * The raw form of a currency string: its digits and at most one decimal point,
 * with the fraction capped at two places. `"$1,234.567"` -> `"1234.56"`, which is
 * a number a consumer can `parseFloat` straight off the form control.
 */
function unmaskCurrency(display: string): string {
  let raw = '';
  let dot = false;
  let decimals = 0;
  for (const ch of display) {
    if (ch >= '0' && ch <= '9') {
      if (dot) {
        if (decimals >= 2) {
          continue;
        }
        decimals++;
      }
      raw += ch;
    } else if (ch === '.' && !dot) {
      dot = true;
      raw += '.';
    }
  }
  return raw;
}

/** Formats a raw currency value: `"1234.5"` -> `$1,234.5`, grouping the integer part. */
function formatCurrency(raw: string): MaskedValue {
  const clean = unmaskCurrency(raw);
  if (clean === '') {
    return { value: '', filled: [] };
  }

  const dotIndex = clean.indexOf('.');
  const hasDot = dotIndex !== -1;
  const intPart = hasDot ? clean.slice(0, dotIndex) : clean;
  const fracPart = hasDot ? clean.slice(dotIndex + 1) : '';

  // A lone `.5` reads as `$0.5`, not `$.5`.
  const grouped = groupThousands(intPart === '' && hasDot ? '0' : intPart);

  const value: string[] = ['$'];
  const filled: boolean[] = [false];
  for (const ch of grouped) {
    value.push(ch);
    filled.push(ch !== ',');
  }
  if (hasDot) {
    value.push('.');
    filled.push(true);
    for (const ch of fracPart) {
      value.push(ch);
      filled.push(true);
    }
  }
  return { value: value.join(''), filled };
}

/** Resolves a `uiMask` value (preset name or literal pattern) to a concrete mask. */
function resolveMask(spec: string, placeholderChar: string): ResolvedMask {
  const preset = PRESETS[spec as UiMaskPreset];
  if (preset?.currency) {
    return {
      toDisplay: formatCurrency,
      toRaw: unmaskCurrency,
      template: '$0.00',
      inputMode: preset.inputMode,
    };
  }

  const pattern = preset?.pattern ?? spec;
  // A digits-only pattern gets the numeric keypad; a pattern with letter tokens is
  // left to the default keyboard.
  const hasLetters = pattern.includes('A') || pattern.includes('*');
  const inputMode = preset?.inputMode ?? (hasLetters ? 'text' : 'numeric');
  return {
    toDisplay: (raw) => formatPattern(raw, pattern),
    toRaw: (display) => unmaskPattern(display, pattern),
    template: patternTemplate(pattern, placeholderChar),
    inputMode,
  };
}

/**
 * Finds the caret position after a reformat: the spot just past the
 * `meaningfulCount`-th filled character, having skipped forward over any inserted
 * literals so the next keystroke lands in the next placeholder rather than after
 * a separator it would have to step over.
 */
function caretAfter(filled: boolean[], meaningfulCount: number, length: number): number {
  if (meaningfulCount <= 0) {
    return 0;
  }
  let seen = 0;
  for (let i = 0; i < filled.length; i++) {
    if (filled[i]) {
      seen++;
      if (seen === meaningfulCount) {
        let caret = i + 1;
        while (caret < filled.length && !filled[caret]) {
          caret++;
        }
        return caret;
      }
    }
  }
  return length;
}

/**
 * Masks a text input so the DISPLAY is formatted while the FORM VALUE is the raw,
 * unmasked characters.
 *
 * ```html
 * <mat-form-field>
 *   <mat-label>Phone</mat-label>
 *   <input matInput uiMask="phone" [(ngModel)]="phone" />
 * </mat-form-field>
 * ```
 *
 * After typing `5551234567` the field shows `(555) 123-4567`, but `phone` holds
 * `5551234567`. That split is the whole point — the value you store, validate and
 * submit is never polluted with the separators a mask paints in — and set
 * `[unmaskedValue]="false"` when you would rather store the formatted string.
 *
 * ### Why a directive on the native input, not a wrapper
 *
 * Like `uiButton`, this decorates the real `<input>` rather than wrapping it
 * (extensibility rule 1), so `matInput`, the `<mat-form-field>` around it,
 * `aria-*`, `maxlength`, `autocomplete`, `id`, `data-*` and every other native
 * attribute keep working untouched. It *is* the input's `ControlValueAccessor`
 * (rule 5): Angular drops the built-in one in its favour, which is how the raw
 * value reaches `[(ngModel)]`, `[formControl]` and `formControlName` with no
 * adapter — and why the mask belongs on the `<input matInput>` a consumer writes,
 * not on `<ui-input>`, whose component already owns that role for the input it
 * hides. There is no colour here: the field is Material's, themed by
 * `src/styles/_theme.scss` like every other, so there is nothing to restyle and
 * no `::ng-deep` to reach for.
 *
 * ### It handles editing, not just blur
 *
 * Every change — a keystroke, a paste, a backspace, an edit in the middle of the
 * string — reformats on the spot and restores the caret, counted in *meaningful*
 * characters so it stays put when a reformat inserts or removes a separator.
 * Backspacing onto a separator deletes the character before it, as a mask should.
 *
 * ### Tokens
 *
 * A custom `uiMask` is a pattern of tokens and literals: `0` a digit, `A` a
 * letter, `*` a letter or digit, and anything else a literal that is inserted for
 * the user. `uiMask="000-000"`, `uiMask="AA 0000"`.
 *
 * ### Escape hatch
 *
 * `exportAs: 'uiMask'` hands the directive back for the rare case that needs it.
 */
@Directive({
  selector: 'input[uiMask], textarea[uiMask]',
  exportAs: 'uiMask',
  host: {
    '[attr.inputmode]': 'resolved().inputMode',
    '(input)': 'handleInput($event)',
    '(blur)': 'onTouched()',
  },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Mask), multi: true },
  ],
})
export class Mask implements ControlValueAccessor {
  /**
   * The mask: a preset name (`phone`, `date`, `postcode`, `currency`) or a literal
   * token pattern (`000-000`). This is the directive's own selector, so it is
   * always written as the attribute value: `uiMask="phone"`.
   */
  readonly uiMask = input.required<string>();

  /**
   * Whether the form value is the raw, unmasked value (the default) or the
   * formatted display string. Raw is almost always what you want: it is what you
   * validate and submit, free of separators.
   */
  readonly unmaskedValue = input(true, { transform: booleanAttribute });

  /** The character the empty-field template uses for an unfilled slot. Defaults to `_`. */
  readonly placeholderChar = input('_');

  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);

  /** The concrete mask for the current inputs. */
  protected readonly resolved = computed(() => resolveMask(this.uiMask(), this.placeholderChar()));

  /** The last raw value emitted, used to tell a separator-only backspace apart. */
  private lastRaw = '';

  private onChange: (value: string) => void = () => {
    // Replaced by `registerOnChange` once a forms directive binds this control.
    // Until then the mask still formats the display — it is usable with no form.
  };

  onTouched: () => void = () => {
    // Replaced by `registerOnTouched`.
  };

  constructor() {
    // Keep the placeholder and the displayed value in step with the mask inputs:
    // changing `uiMask` at runtime reformats what is already in the field, and the
    // empty-field template is offered as the placeholder unless the consumer set
    // one of their own.
    effect(() => {
      const mask = this.resolved();
      if (!this.element.placeholder || this.element.dataset['uiMaskPlaceholder'] === 'true') {
        this.renderer.setAttribute(this.element, 'placeholder', mask.template);
        this.renderer.setAttribute(this.element, 'data-ui-mask-placeholder', 'true');
      }
      const raw = mask.toRaw(this.element.value);
      this.renderer.setProperty(this.element, 'value', mask.toDisplay(raw).value);
      this.lastRaw = raw;
    });
  }

  protected handleInput(event: Event): void {
    const mask = this.resolved();
    const input = event.target as HTMLInputElement;
    const display = input.value;
    const cursor = input.selectionStart ?? display.length;

    let raw = mask.toRaw(display);
    let before = mask.toRaw(display.slice(0, cursor)).length;

    // A backspace that removed a separator leaves the raw value unchanged. That
    // should still delete something, so drop the meaningful character before the
    // caret — the character the user was clearly aiming past the separator for.
    const isBackspace = (event as InputEvent).inputType === 'deleteContentBackward';
    if (isBackspace && raw.length === this.lastRaw.length && before > 0) {
      raw = raw.slice(0, before - 1) + raw.slice(before);
      before--;
    }

    const { value, filled } = mask.toDisplay(raw);
    const caret = caretAfter(filled, before, value.length);

    this.renderer.setProperty(input, 'value', value);
    input.setSelectionRange(caret, caret);

    this.lastRaw = mask.toRaw(value);
    this.onChange(this.unmaskedValue() ? this.lastRaw : value);
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  writeValue(value: unknown): void {
    const mask = this.resolved();
    const incoming = value == null ? '' : String(value);
    // Whether the incoming value is raw or already formatted, normalise it
    // through `toRaw` so the display is always the mask's own output.
    const raw = mask.toRaw(incoming);
    const display = mask.toDisplay(raw).value;
    this.renderer.setProperty(this.element, 'value', display);
    this.lastRaw = raw;
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /** Implemented as part of `ControlValueAccessor`. @docs-private */
  setDisabledState(isDisabled: boolean): void {
    this.renderer.setProperty(this.element, 'disabled', isDisabled);
  }
}
