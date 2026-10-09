import { useState } from 'react'
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { TOUR_CARD_GAP, TOUR_SPOT_PADDING, type TourStep } from '@apc/shared/tour'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { Button } from './Button.tsx'
import { Dialog } from './Dialog.tsx'
import { Tour } from './Tour.tsx'

const root = document.documentElement

/**
 * Converts a hex color to the `rgb(r, g, b)` form the browser reports for computed styles.
 * @param hex Color as `#RRGGBB`.
 * @returns The same color as `rgb(r, g, b)`.
 */
function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * Finds the tour's spotlight.
 * @returns The spotlight element.
 */
function spotlight(): HTMLElement {
  return document.querySelector<HTMLElement>('[data-testid="tour-spotlight"]')!
}

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Starts the tour in one style and mode and checks the spotlight rings the target in the accent over the
    // black dim, and the card is framed in the accent.
    test(`Web: the tour follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<Sample />)
      await expect.poll(spotlight).toBeTruthy()
      expect(getComputedStyle(spotlight()).outlineColor).toBe(rgb(colors.accent))
      expect(getComputedStyle(spotlight()).boxShadow).toContain('rgba(0, 0, 0, 0.5)')
      const card = screen.getByRole('dialog', { name: 'Abra o cadastro' }).element().firstElementChild!
      expect(getComputedStyle(card).borderColor).toBe(rgb(colors.accent))
    })
  }
}

// Starts the tour and checks the spotlight rings the target with its padding and the card sits below it
// with its header; then clicks the target through the spotlight and checks the step moves on by itself.
test('Web: the spotlight rings the target, which stays clickable', async () => {
  const screen = await render(<Sample />)
  const card = screen.getByRole('dialog', { name: 'Abra o cadastro' })
  await expect.element(card).toMatchTextContent(/Parte 1 de 2 · Criar um item/)
  await expect.element(card).toMatchTextContent(/1 \/ 4/)
  const target = screen.getByRole('button', { name: 'Novo item' }).element().getBoundingClientRect()
  await expect.poll(() => spotlight().getBoundingClientRect().left).toBeCloseTo(target.left - TOUR_SPOT_PADDING)
  expect(spotlight().getBoundingClientRect().width).toBeCloseTo(target.width + 2 * TOUR_SPOT_PADDING)
  expect(card.element().getBoundingClientRect().top).toBeCloseTo(target.bottom + TOUR_CARD_GAP)

  await screen.getByRole('button', { name: 'Novo item' }).click()
  await expect.element(screen.getByRole('dialog', { name: 'Dê um nome' })).toBeInTheDocument()
})

// Opens the dialog step and checks the tour renders inside the open dialog, where its buttons still work:
// "Fazer por mim" fills the name and the tour moves on to the next step.
test('Web: inside a modal dialog the tour renders in the dialog and stays usable', async () => {
  const screen = await render(<Sample />)
  await screen.getByRole('button', { name: 'Novo item' }).click()
  const card = screen.getByRole('dialog', { name: 'Dê um nome' })
  await expect.poll(() => card.element().closest('dialog[open]')).toBeTruthy()
  await card.getByRole('button', { name: 'Fazer por mim' }).click()
  await expect.element(screen.getByRole('textbox', { name: 'Nome' })).toHaveValue('Item de teste')
  await expect.element(screen.getByRole('dialog', { name: 'Veja o item' })).toBeInTheDocument()
})

// Closes the dialog in the middle of its step and checks the tour goes back to the step that opens it.
test('Web: leaving a step goes back to the step it names', async () => {
  const screen = await render(<Sample />)
  await screen.getByRole('button', { name: 'Novo item' }).click()
  await expect.element(screen.getByRole('dialog', { name: 'Dê um nome' })).toBeInTheDocument()
  await screen.getByRole('button', { name: 'Cancelar' }).click()
  await expect.element(screen.getByRole('dialog', { name: 'Abra o cadastro' })).toBeInTheDocument()
})

// Walks an info-only step with Next and checks the last step has no target, reads concluded, offers only
// Finish, and that Finish and Skip both close the tour.
test('Web: info steps use Next and the last step finishes the tour', async () => {
  const onClose = vi.fn()
  const screen = await render(<Sample from={2} onClose={onClose} />)
  const info = screen.getByRole('dialog', { name: 'Veja o item' })
  await expect.element(info.getByRole('button', { name: 'Fazer por mim' })).not.toBeInTheDocument()
  await info.getByRole('button', { name: 'Próximo' }).click()

  const last = screen.getByRole('dialog', { name: 'Pronto!' })
  await expect.element(last).toMatchTextContent(/Tutorial concluído/)
  await expect.element(last.getByRole('button', { name: 'Pular tutorial' })).not.toBeInTheDocument()
  expect(spotlight()).toBeNull()
  await last.getByRole('button', { name: 'Concluir' }).click()
  expect(onClose).toHaveBeenCalledTimes(1)

  const skipping = await render(<Sample onClose={onClose} />)
  await skipping.getByRole('button', { name: 'Pular tutorial' }).click()
  expect(onClose).toHaveBeenCalledTimes(2)
})

// Moves the target after the tour starts and checks the spotlight follows it.
test('Web: the spotlight follows the target as it moves', async () => {
  const screen = await render(<Sample />)
  const button = screen.getByRole('button', { name: 'Novo item' }).element() as HTMLElement
  await expect.poll(spotlight).toBeTruthy()
  button.style.marginTop = '200px'
  await expect.poll(() => spotlight().getBoundingClientRect().top).toBeCloseTo(button.getBoundingClientRect().top - TOUR_SPOT_PADDING)
})

// Starts the tour on a 360×780 phone and checks the card spans the screen inside the gaps, pinned to the bottom.
test('Web: at phone width the card is pinned to the bottom', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  const screen = await render(<Sample />)
  const card = screen.getByRole('dialog', { name: 'Abra o cadastro' }).element()
  // offsetHeight rounds the card's height, so the bottom may be off by a fraction of a pixel.
  await expect.poll(() => card.getBoundingClientRect().bottom).toBeCloseTo(MIN_MOBILE_HEIGHT - TOUR_CARD_GAP, 0)
  expect(card.getBoundingClientRect().left).toBe(TOUR_CARD_GAP)
  expect(card.getBoundingClientRect().width).toBe(MIN_MOBILE_WIDTH - 2 * TOUR_CARD_GAP)
})

// Asks for reduced motion and checks the tour brings the target into view without the smooth scroll.
test('Web: the tour respects prefers-reduced-motion', async () => {
  const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
  await render(<Sample />)
  expect(scroll).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' })
})

function Sample({ from = 0, onClose = () => {} }: { from?: number; onClose?: () => void }) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const steps: TourStep<Element>[] = [
    {
      id: 'new',
      part: 1,
      title: 'Abra o cadastro',
      text: 'Clique em Novo item.',
      target: () => document.getElementById('sample-new'),
      done: () => creating,
      auto: () => setCreating(true),
    },
    {
      id: 'name',
      part: 1,
      title: 'Dê um nome',
      text: 'Escreva o nome do item.',
      target: () => document.getElementById('sample-name'),
      done: () => name !== '',
      auto: () => setName('Item de teste'),
      lost: () => (creating ? null : 'new'),
    },
    { id: 'see', part: 2, title: 'Veja o item', text: 'Este é o item.', target: () => document.getElementById('sample-new') },
    { id: 'end', title: 'Pronto!', text: 'Você terminou o tutorial.' },
  ]
  return (
    <div className="p-6">
      <Button id="sample-new" onClick={() => setCreating(true)}>
        Novo item
      </Button>
      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Novo item"
        actions={
          <Button variant="secondary" size="sm" onClick={() => setCreating(false)}>
            Cancelar
          </Button>
        }
      >
        <label className="grid gap-1 font-body text-sm text-text">
          Nome
          <input id="sample-name" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
      </Dialog>
      <Tour open onClose={onClose} steps={steps.slice(from)} parts={['Criar um item', 'Procurar']} />
    </div>
  )
}
