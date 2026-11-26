import type { Locale } from '@apc/domain/locale'

// A release's notes, as the "Sobre esta versão" dialog shows them: each release's file, docs/releases/v<version>.md,
// holds them in English, then in Portuguese after a line of "---", and the app shows the half of the language chosen.

/** Where every release is listed on GitHub, with its notes and files. */
export const RELEASES_URL = 'https://github.com/ChrisCamilo/apc-universal-repair/releases'

/**
 * Takes the half of a release's notes written in a language.
 * @param notes The release's whole file, in English, a line of "---", then in Portuguese.
 * @param locale The language chosen.
 * @returns What comes before that line in English, or after it in Portuguese, trimmed; the whole file, trimmed, when it
 * has no such line.
 */
export function notesIn(notes: string, locale: Locale): string {
  const parts = notes.split(/^\s*-{3,}\s*$/m)
  return (locale === 'en-US' ? parts[0] : parts.at(-1)!).trim()
}
