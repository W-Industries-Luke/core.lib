import type { UiSelectOption } from '../select/select';

/**
 * The typed address a {@link AddressForm} exposes as its form value.
 *
 * Every key is always present and always a string — an address is a fixed shape,
 * and a control that reports `undefined` for a field a consumer never touched is
 * an adapter waiting to happen. `region` and `postalCode` are the country-neutral
 * names for the two fields whose *label* moves the most across borders (a US
 * `State`/`ZIP code`, a UK `County`/`Postcode`, a Canadian `Province`/`Postal
 * code`), so the object a form holds does not change shape when the country does.
 */
export interface UiAddress {
  /** Street address — house number and street, or a PO box. */
  line1: string;
  /** The second address line — flat, suite, unit, building. Usually optional. */
  line2: string;
  /** The town or city. */
  city: string;
  /** State, province, county or region — whatever the country calls its subdivision. */
  region: string;
  /** ZIP / postcode / postal code. */
  postalCode: string;
  /** ISO 3166-1 alpha-2 country code, e.g. `US`, `GB`, `CA`. */
  country: string;
}

/**
 * The five editable fields of an address, country excluded.
 *
 * Country is the selector that *drives* the schema rather than a field the schema
 * lays out, so it is not one of these — it always renders first, above the
 * country-specific fields.
 */
export type UiAddressField = Exclude<keyof UiAddress, 'country'>;

/**
 * How much of the form's two-column grid a field occupies.
 *
 * `full` spans the row — a street address wants the whole width. `half` shares a
 * row with the next `half`, which is how a `State` and a `ZIP code` sit side by
 * side. The grid is two columns by default (`--ui-address-form-columns`), so on a
 * single-column layout every field is full width regardless.
 */
export type UiAddressFieldSpan = 'full' | 'half';

/**
 * One field in a country's address layout.
 *
 * This is the data the markup is generated from — there is no US-shaped template
 * anywhere, only this record repeated per field per country. Adding a country is
 * adding a {@link UiAddressCountrySchema}, never touching `address-form.html`.
 */
export interface UiAddressFieldSchema {
  /** Which {@link UiAddress} key this field reads and writes. */
  key: UiAddressField;

  /** The visible label — `State`, `County`, `Province`; `ZIP code`, `Postcode`. */
  label: string;

  /**
   * How the field is collected. `input` is a text box; `select` is a dropdown,
   * for a closed set like the US states — its {@link options} are required then.
   */
  control: 'input' | 'select';

  /** The choices, for a `select` field. Ignored for an `input`. */
  options?: readonly UiSelectOption<string>[];

  /**
   * Whether this field is required by default for this country. A US address
   * needs a state and a ZIP; a line 2 never does. Overridable per instance with
   * {@link AddressForm.requiredFields}.
   */
  required?: boolean;

  /**
   * A format the value must match when it is non-blank, e.g. a five-digit ZIP.
   * A blank value is a `required` question, not a `pattern` one, so the pattern
   * is only applied once something is typed.
   */
  pattern?: RegExp;

  /**
   * The message shown when {@link pattern} fails. Defaults to a generic
   * `Enter a valid <label>.` when omitted.
   */
  patternError?: string;

  /**
   * The `autocomplete` token for the native control, so the browser's own
   * address autofill works — `address-line1`, `postal-code`, `address-level1`.
   */
  autocomplete?: string;

  /** How much of the grid row the field takes. Defaults to `full`. */
  span?: UiAddressFieldSpan;
}

/**
 * A complete address layout for one country — the field set, in order, with the
 * labels and validation that country uses.
 *
 * The whole locale-awareness of {@link AddressForm} is these records: order,
 * labels, which fields exist and how they validate all come from here, so a new
 * country is data, not code.
 */
export interface UiAddressCountrySchema {
  /** ISO 3166-1 alpha-2 code this schema applies to, e.g. `US`. */
  country: string;

  /** The country's display name, used as the default label in the country picker. */
  label: string;

  /** The fields, in the order they are shown. */
  fields: readonly UiAddressFieldSchema[];
}

/** The 50 US states plus DC, as `<ui-select>` options. */
const US_STATES: readonly UiSelectOption<string>[] = (
  [
    ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
    ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'],
    ['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'],
    ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
    ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
    ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
    ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'],
    ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'],
    ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'],
    ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'],
    ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'],
    ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'],
    ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
  ] as const
).map(([value, label]) => ({ value, label }));

/** The Canadian provinces and territories, as `<ui-select>` options. */
const CA_PROVINCES: readonly UiSelectOption<string>[] = (
  [
    ['AB', 'Alberta'], ['BC', 'British Columbia'], ['MB', 'Manitoba'], ['NB', 'New Brunswick'],
    ['NL', 'Newfoundland and Labrador'], ['NS', 'Nova Scotia'], ['NT', 'Northwest Territories'],
    ['NU', 'Nunavut'], ['ON', 'Ontario'], ['PE', 'Prince Edward Island'], ['QC', 'Quebec'],
    ['SK', 'Saskatchewan'], ['YT', 'Yukon'],
  ] as const
).map(([value, label]) => ({ value, label }));

// The two lines a street address always has, shared by every country's schema.
const STREET_FIELDS: readonly UiAddressFieldSchema[] = [
  {
    key: 'line1',
    label: 'Address line 1',
    control: 'input',
    required: true,
    autocomplete: 'address-line1',
  },
  {
    key: 'line2',
    label: 'Address line 2',
    control: 'input',
    autocomplete: 'address-line2',
  },
];

/**
 * The US address: `City`, `State` (a dropdown of the 50 states), and a five-digit
 * `ZIP code` that also accepts ZIP+4.
 */
export const US_ADDRESS_SCHEMA: UiAddressCountrySchema = {
  country: 'US',
  label: 'United States',
  fields: [
    ...STREET_FIELDS,
    { key: 'city', label: 'City', control: 'input', required: true, autocomplete: 'address-level2' },
    {
      key: 'region',
      label: 'State',
      control: 'select',
      options: US_STATES,
      required: true,
      autocomplete: 'address-level1',
      span: 'half',
    },
    {
      key: 'postalCode',
      label: 'ZIP code',
      control: 'input',
      required: true,
      pattern: /^\d{5}(-\d{4})?$/,
      patternError: 'Enter a ZIP code like 94103 or 94103-1234.',
      autocomplete: 'postal-code',
      span: 'half',
    },
  ],
};

/**
 * The UK address: a `Town/City`, an optional free-text `County`, and a `Postcode`
 * validated against the UK format (`SW1A 1AA`).
 */
export const GB_ADDRESS_SCHEMA: UiAddressCountrySchema = {
  country: 'GB',
  label: 'United Kingdom',
  fields: [
    ...STREET_FIELDS,
    {
      key: 'city',
      label: 'Town/City',
      control: 'input',
      required: true,
      autocomplete: 'address-level2',
    },
    { key: 'region', label: 'County', control: 'input', autocomplete: 'address-level1', span: 'half' },
    {
      key: 'postalCode',
      label: 'Postcode',
      control: 'input',
      required: true,
      pattern: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i,
      patternError: 'Enter a postcode like SW1A 1AA.',
      autocomplete: 'postal-code',
      span: 'half',
    },
  ],
};

/**
 * The Canadian address: `City`, a `Province` dropdown, and a `Postal code` in the
 * `A1A 1A1` format.
 */
export const CA_ADDRESS_SCHEMA: UiAddressCountrySchema = {
  country: 'CA',
  label: 'Canada',
  fields: [
    ...STREET_FIELDS,
    { key: 'city', label: 'City', control: 'input', required: true, autocomplete: 'address-level2' },
    {
      key: 'region',
      label: 'Province',
      control: 'select',
      options: CA_PROVINCES,
      required: true,
      autocomplete: 'address-level1',
      span: 'half',
    },
    {
      key: 'postalCode',
      label: 'Postal code',
      control: 'input',
      required: true,
      pattern: /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\s?\d[ABCEGHJ-NPRSTV-Z]\d$/i,
      patternError: 'Enter a postal code like K1A 0B1.',
      autocomplete: 'postal-code',
      span: 'half',
    },
  ],
};

/**
 * The fallback for any country without a schema of its own: generic labels, a
 * free-text region, and a postal code with no country-specific format.
 *
 * Its `country` is the empty string, which is how {@link resolveAddressSchema}
 * recognises it as the default — a real country code never collides with it.
 */
export const DEFAULT_ADDRESS_SCHEMA: UiAddressCountrySchema = {
  country: '',
  label: 'Other',
  fields: [
    ...STREET_FIELDS,
    { key: 'city', label: 'City', control: 'input', required: true, autocomplete: 'address-level2' },
    {
      key: 'region',
      label: 'State/Province/Region',
      control: 'input',
      autocomplete: 'address-level1',
      span: 'half',
    },
    {
      key: 'postalCode',
      label: 'Postal code',
      control: 'input',
      required: true,
      autocomplete: 'postal-code',
      span: 'half',
    },
  ],
};

/**
 * The schemas {@link AddressForm} ships with. Pass your own to
 * {@link AddressForm.schemas} to add or replace a country — the list is data, so
 * a new country is a new entry here, not a change to the component.
 */
export const UI_ADDRESS_SCHEMAS: readonly UiAddressCountrySchema[] = [
  US_ADDRESS_SCHEMA,
  CA_ADDRESS_SCHEMA,
  GB_ADDRESS_SCHEMA,
  DEFAULT_ADDRESS_SCHEMA,
];

/**
 * The default country picker options, derived from {@link UI_ADDRESS_SCHEMAS} so
 * the picker and the schemas can never drift apart. The `DEFAULT_ADDRESS_SCHEMA`
 * is left out — its empty code is a fallback, not a country to choose.
 */
export const UI_ADDRESS_COUNTRIES: readonly UiSelectOption<string>[] = UI_ADDRESS_SCHEMAS.filter(
  (schema) => schema.country !== '',
).map((schema) => ({ value: schema.country, label: schema.label }));

/**
 * Finds the schema for a country code, falling back to
 * {@link DEFAULT_ADDRESS_SCHEMA} when none matches — so an unknown or blank
 * country still renders a sensible, generic form rather than nothing.
 *
 * @param country The ISO country code to look up.
 * @param schemas The schemas to search, defaulting to the shipped set.
 */
export function resolveAddressSchema(
  country: string,
  schemas: readonly UiAddressCountrySchema[] = UI_ADDRESS_SCHEMAS,
): UiAddressCountrySchema {
  return (
    schemas.find((schema) => schema.country && schema.country === country) ??
    schemas.find((schema) => schema.country === '') ??
    DEFAULT_ADDRESS_SCHEMA
  );
}

/** An empty address, used as the control's default and reset value. */
export const EMPTY_ADDRESS: UiAddress = {
  line1: '',
  line2: '',
  city: '',
  region: '',
  postalCode: '',
  country: '',
};
