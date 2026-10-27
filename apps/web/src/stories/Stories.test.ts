import { expect, test } from 'vitest'

// The Storybook is published on GitHub Pages (.github/workflows/pages.yml), for anyone to open: what it shows must be
// the stories' own sample data. These are the sources of every story, of the screens and sheets they draw, and of what
// the Storybook wraps them in.
const SOURCES = import.meta.glob<string>(['../**/*.stories.tsx', './Screens.tsx', './Foundations.tsx', '../../.storybook/*.ts*'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

// Reads every story's source and checks none calls an API, reads the browser's storage or the desktop app's bridge,
// so the published Storybook never shows anything but its sample data.
test('Web: the published stories use only their own sample data', () => {
  const files = Object.entries(SOURCES)
  expect(files.length).toBeGreaterThan(20)
  for (const [file, source] of files) {
    expect(source, file).not.toMatch(/\bfetch\(|apiFetch|localStorage|sessionStorage|apcDesktop|import\.meta\.env/)
  }
})
