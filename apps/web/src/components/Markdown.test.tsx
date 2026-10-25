import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH } from '@apc/shared/screens'
import { beforeAll, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { Markdown } from './Markdown.tsx'

beforeAll(async () => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

// Renders notes with a heading, a paragraph and a nested list, and checks each becomes its element: the heading under a
// dialog's title, the bullets shown, and the nested list inside its item.
test('Web: Markdown shows headings, paragraphs and nested lists as elements', async () => {
  const screen = await render(<Markdown>{'Antes da lista.\n\n### Novidades\n- Primeiro:\n  - um;\n- Segundo.'}</Markdown>)
  await expect.element(screen.getByRole('heading', { level: 4, name: 'Novidades' })).toBeVisible()
  await expect.element(screen.getByText('Antes da lista.')).toBeVisible()
  const lists = screen.getByRole('list').elements()
  expect(lists).toHaveLength(2)
  expect(getComputedStyle(lists[0]).listStyleType).toBe('disc')
  expect(lists[1].parentElement?.closest('li')?.firstChild?.textContent).toBe('Primeiro:')
  await expect.element(screen.getByRole('listitem').filter({ hasText: 'um;' }).last()).toBeVisible()
})

// Renders bold, italic, code and a link, and checks each element, and that the link opens a new window with no referrer.
test('Web: Markdown shows bold, italic, code and links', async () => {
  const screen = await render(<Markdown>{'**Novo:** o *Sobre*, `config.json` e o [guia](https://github.com/x).'}</Markdown>)
  await expect.element(screen.getByText('Novo:')).toHaveProperty('tagName', 'STRONG')
  await expect.element(screen.getByText('Sobre')).toHaveProperty('tagName', 'EM')
  await expect.element(screen.getByText('config.json')).toHaveProperty('tagName', 'CODE')
  const link = screen.getByRole('link', { name: 'guia' })
  await expect.element(link).toHaveAttribute('href', 'https://github.com/x')
  await expect.element(link).toHaveAttribute('target', '_blank')
  await expect.element(link).toHaveAttribute('rel', 'noreferrer')
})

// Renders HTML and a link to "javascript:", and checks both show as written text: no script or link is made.
test('Web: Markdown never turns the text into HTML', async () => {
  const screen = await render(<Markdown>{'<script>alert(1)</script> e [clique](javascript:alert(1))'}</Markdown>)
  await expect.element(screen.getByText('<script>alert(1)</script> e [clique](javascript:alert(1))')).toBeVisible()
  expect(screen.container.querySelector('script')).toBeNull()
  await expect.element(screen.getByRole('link')).not.toBeInTheDocument()
})
