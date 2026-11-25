// The languages the apps speak, Portuguese (Brasil) and English (USA), chosen in the user menu and kept on each device
// (LOCALE_STORAGE_KEY), Portuguese until changed. Each feature keeps its texts in a catalog made with catalog(): the
// Portuguese texts first, and the English ones typed after them, so an English catalog missing a key, or a message
// taking other values, fails the typecheck. A message that depends on a value is a function, so each language writes
// its own plural and gender. Dates and numbers are written in the chosen language's way; prices stay in reais in
// both ("R$ 1.234,56" and "R$1,234.56").

/** The language the apps start in, until the user changes it. */
export const DEFAULT_LOCALE: Locale = "pt-BR";
/** What the user menu says about the language. */
export const LOCALE_MESSAGES = catalog({ language: "Idioma" }, { language: "Language" });
/** Each language's name, in that language, as the user menu offers it. */
export const LOCALE_NAMES: Record<Locale, string> = { "pt-BR": "Português", "en-US": "English" };
/** Where each device keeps the language chosen: localStorage on the web and the desktop, the app's storage on the phone. */
export const LOCALE_STORAGE_KEY = "apc-locale";
/** The languages, Portuguese first. */
export const LOCALES = ["pt-BR", "en-US"] as const;

/** A language the apps speak. */
export type Locale = (typeof LOCALES)[number];
/** A feature's texts in each language. */
export type Catalog<Messages> = Readonly<Record<Locale, Messages>>;

/**
 * Makes a feature's catalog: its texts in Portuguese, and the same texts in English.
 * @param portuguese The texts in Portuguese, which set the catalog's keys and each message's values.
 * @param english The same keys in English, each message taking the same values.
 * @returns The texts of each language.
 */
export function catalog<Messages>(portuguese: Messages, english: NoInfer<Messages>): Catalog<Messages> {
  return { "pt-BR": portuguese, "en-US": english };
}

/**
 * Writes a date and time in a language's way.
 * @param date The moment.
 * @param locale The language.
 * @returns E.g. "25 de nov. de 2026, 13:05", or "Nov 25, 2026, 1:05 PM".
 */
export function formatDateTime(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/**
 * Writes a number in a language's way.
 * @param value The number.
 * @param locale The language.
 * @returns E.g. "1.234" or "1,234".
 */
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Builds a value for each language from that language's texts, such as the options of a filter made from a catalog's
 * labels.
 * @param build Builds the value of one language.
 * @returns The value of each language.
 */
export function perLocale<Value>(build: (locale: Locale) => Value): Catalog<Value> {
  return { "pt-BR": build("pt-BR"), "en-US": build("en-US") };
}

/**
 * Tells whether a value is a language the apps speak, such as one read back from storage.
 * @param value The value.
 * @returns True for "pt-BR" or "en-US".
 */
export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}
