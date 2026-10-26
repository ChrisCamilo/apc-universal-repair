import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { AboutDialog } from './AboutDialog.tsx'
import { portugueseNotes, RELEASES_URL } from './releaseNotes.ts'

// A release's notes as docs/releases holds them: in English, a line of "---", then in Portuguese.
const NOTES = [
  '**Windows:** installed apps update themselves.',
  '',
  "### What's new",
  '- **Uninstalling asks about the data** (#299).',
  '',
  '---',
  '',
  '**Windows:** os apps instalados se atualizam sozinhos.',
  '',
  '### Novidades',
  '- **Desinstalar pergunta sobre os dados** (#299).',
  '',
].join('\r\n')

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

// Takes the Portuguese half of notes with both languages, and checks a file with no "---" is kept whole.
test('Web: the release notes shown are the Portuguese half', () => {
  expect(portugueseNotes(NOTES)).toBe('**Windows:** os apps instalados se atualizam sozinhos.\r\n\r\n### Novidades\r\n- **Desinstalar pergunta sobre os dados** (#299).')
  expect(portugueseNotes('### Novidades\n- Um.\n')).toBe('### Novidades\n- Um.')
})

// Opens the dialog on a version with notes, and checks it names the version and shows the Portuguese notes, not the
// English ones, and that Fechar asks to close it.
test('Web: Sobre esta versão shows the version and its notes in Portuguese', async () => {
  const onClose = vi.fn()
  const screen = await render(<AboutDialog open onClose={onClose} version="0.6.5" notes={NOTES} />)
  const dialog = screen.getByRole('dialog', { name: 'Sobre esta versão' })
  await expect.element(dialog.getByText('APC Universal Repair 0.6.5')).toBeVisible()
  await expect.element(dialog.getByRole('heading', { name: 'Novidades' })).toBeVisible()
  await expect.element(dialog.getByText('Desinstalar pergunta sobre os dados')).toBeVisible()
  await expect.element(dialog.getByText("What's new")).not.toBeInTheDocument()
  await dialog.getByRole('button', { name: 'Fechar' }).last().click()
  expect(onClose).toHaveBeenCalledTimes(1)
})

// Clicks the link to every release, and checks it opens GitHub's releases page in a new window, which the desktop app
// hands to the computer's browser.
test('Web: Sobre esta versão links to every release on GitHub', async () => {
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  const screen = await render(<AboutDialog open onClose={() => {}} version="0.6.5" notes={NOTES} />)
  await screen.getByRole('button', { name: 'Ver todas as versões no GitHub' }).click()
  expect(open).toHaveBeenCalledWith(RELEASES_URL, '_blank')
  expect(RELEASES_URL).toBe('https://github.com/ChrisCamilo/apc-universal-repair/releases')
})

// Opens the dialog on a version with no notes yet, as a development build ahead of its notes, and checks it says so
// and still has the version and the link.
test('Web: Sobre esta versão says when the version has no notes', async () => {
  const screen = await render(<AboutDialog open onClose={() => {}} version="0.7.0" />)
  await expect.element(screen.getByText('Esta versão não tem notas.')).toBeVisible()
  await expect.element(screen.getByText('APC Universal Repair 0.7.0')).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'Ver todas as versões no GitHub' })).toBeVisible()
})

// Opens long notes at 1280×720 and 360×780, and checks the dialog fits the screen with Fechar in view, while the notes
// scroll inside it.
test('Web: Sobre esta versão fits the screen, with long notes scrolling inside', async () => {
  const long = `---\n### Novidades\n${Array.from({ length: 40 }, (_, i) => `- Mudança ${i + 1}, com um texto que ocupa a linha.`).join('\n')}`
  for (const [width, height] of [
    [MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT],
    [MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT],
  ]) {
    await page.viewport(width, height)
    const screen = await render(<AboutDialog open onClose={() => {}} version="0.6.5" notes={long} />)
    const dialog = screen.getByRole('dialog', { name: 'Sobre esta versão' }).element().getBoundingClientRect()
    const close = screen.getByRole('button', { name: 'Fechar' }).last().element().getBoundingClientRect()
    expect(dialog.right).toBeLessThanOrEqual(window.innerWidth)
    expect(dialog.bottom).toBeLessThanOrEqual(window.innerHeight)
    expect(close.bottom).toBeLessThan(dialog.bottom)
    const body = screen.getByRole('list').element().closest('.overflow-y-auto')!
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
    await screen.unmount()
  }
})
