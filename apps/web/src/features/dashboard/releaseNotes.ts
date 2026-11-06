// A release's notes, as the "Sobre esta versão" dialog shows them: each release's file, docs/releases/v<version>.md,
// holds them in English, then in Portuguese after a line of "---", and the app shows the Portuguese ones.

/** Where every release is listed on GitHub, with its notes and files. */
export const RELEASES_URL = 'https://github.com/ChrisCamilo/apc-universal-repair/releases'

/**
 * Takes the Portuguese half of a release's notes.
 * @param notes The release's whole file, in English, a line of "---", then in Portuguese.
 * @returns What follows that line, trimmed; the whole file, trimmed, when it has no such line.
 */
export function portugueseNotes(notes: string): string {
  const parts = notes.split(/^\s*-{3,}\s*$/m)
  return parts.at(-1)!.trim()
}
