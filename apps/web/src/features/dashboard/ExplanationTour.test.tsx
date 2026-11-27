import { initials } from '@apc/domain/auth'
import { TEST_USERS } from '@apc/domain/test-users'
import { EXPLANATIONS, explanationSteps, tutorialTitle, type TutorialPlatform } from '@apc/domain/tutorials'
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/ui-spec/screens'
import { useState } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeAll, beforeEach, expect, test } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../../index.css'
import { themeCss } from '../../app/theme.ts'
import { LocaleContext } from '../../app/useLocale.ts'
import { SessionContext } from '../auth/sessionContext.ts'
import type { DesktopBridge } from '../desktop/desktopBridge.ts'
import { DashboardLayout } from './DashboardLayout.tsx'
import { TutorialsDialog } from './TutorialsDialog.tsx'
import { useTutorials } from './tutorialsContext.ts'

// The explanations, started from Tutoriais on a Dashboard whose tabs and menus are stand-ins marked with the targets
// the explanations point at. Each one opens its tab, shows its steps one after the other on their targets, with Next
// only, and ends.

// A logged user who has seen the Inventory tour, so it doesn't start by itself.
const SESSION = {
  user: { ...TEST_USERS[0], initials: initials(TEST_USERS[0].displayName), inventoryTutorialSeen: true },
  expired: false,
  setUser: () => {},
  markInventoryTutorialSeen: () => {},
}

/**
 * Finds the tour's card.
 * @returns The card, or null when the tour is closed.
 */
function card(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-testid="common.tour.card"]')
}

/**
 * Tells whether the tour's spotlight rings an element: its box holds the element's.
 * @param target The element.
 * @returns True when the spotlight is drawn around it.
 */
function ringed(target: Element): boolean {
  const spot = document.querySelector('[data-testid="common.tour.spotlight"]')?.getBoundingClientRect()
  const box = target.getBoundingClientRect()
  return Boolean(spot) && spot!.left <= box.left && spot!.top <= box.top && spot!.right >= box.right && spot!.bottom >= box.bottom
}

/**
 * Runs each explanation of an app from Tutoriais and checks its tab opens, each step shows its title on its target,
 * the step with no target in the middle with no spotlight, and Concluir ends it.
 * @param platform The app.
 */
async function runEach(platform: TutorialPlatform) {
  const screen = await render(<Dashboard />)
  for (const { id, feature } of EXPLANATIONS.filter((explanation) => explanation.platforms.includes(platform as never))) {
    await screen.getByRole('button', { name: 'Tutoriais' }).click()
    await screen.getByRole('button', { name: tutorialTitle(id, 'pt-BR') }).click()
    if (feature === 'inventory' || feature === 'catalog') {
      await expect.element(screen.getByText(`Rota: /${feature}`)).toBeVisible()
    }
    const steps = explanationSteps(id, 'pt-BR')
    for (const [index, step] of steps.entries()) {
      await expect.poll(() => card()?.querySelector('h4')?.textContent, { message: step.id }).toBe(step.title)
      expect(card()!.textContent).toContain(tutorialTitle(id, 'pt-BR'))
      expect(card()!.textContent).toContain(`${index + 1} / ${steps.length}`)
      expect(card()!.textContent).not.toContain('Fazer por mim')
      const target = step.target && document.querySelector(`[data-tour="${step.target}"]`)
      if (target) {
        await expect.poll(() => ringed(target), { message: step.id }).toBe(true)
      } else {
        // The tour draws each frame, so the step before's spotlight leaves on the next one.
        await expect.poll(() => document.querySelector('[data-testid="common.tour.spotlight"]'), { message: step.id }).toBeNull()
      }
      await screen.getByRole('button', { name: index === steps.length - 1 ? 'Concluir' : 'Próximo' }).click()
    }
    await expect.poll(card).toBeNull()
  }
}

beforeAll(async () => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
})

beforeEach(async () => {
  localStorage.clear()
  await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
})

afterEach(() => {
  delete window.apcDesktop
})

// Runs every explanation the web app lists, Estoque's, Catálogo's and Notificações', each on its stand-in targets.
test('Web: each explanation starts from Tutoriais, shows its steps on their targets and ends', async () => {
  await runEach('web')
})

// In the desktop app, runs the Servidor's explanations too, which point at the user menu.
test('Web: in the desktop app the Servidor explains pairing a phone and authorizing devices', async () => {
  window.apcDesktop = { setLocale: () => {} } as unknown as DesktopBridge
  await runEach('desktop')
})

// At 360×780, starts an explanation of the Estoque and checks the card, once it slides in, keeps clear of the bottom
// bar, and Pular tutorial ends it.
test('Web: on a phone an explanation keeps clear of the bottom bar and can be skipped', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  const screen = await render(<Dashboard />)
  await screen.getByRole('button', { name: 'Tutoriais' }).click()
  await screen.getByRole('button', { name: 'As listas' }).click()
  await expect.poll(() => card()?.querySelector('h4')?.textContent).toBe('Gerenciar listas')
  const bar = screen.getByTestId('dashboard.bottom-bar').element().getBoundingClientRect()
  await expect.poll(() => card()!.getBoundingClientRect().bottom).toBeLessThanOrEqual(bar.top)
  await screen.getByRole('button', { name: 'Pular tutorial' }).click()
  await expect.poll(card).toBeNull()
})

// Starts an explanation in English and checks its card is written in English.
test('Web: an explanation reads in English', async () => {
  const screen = await render(
    <LocaleContext.Provider value={{ locale: 'en-US', setLocale: () => {} }}>
      <Dashboard />
    </LocaleContext.Provider>,
  )
  await screen.getByRole('button', { name: 'Tutoriais' }).click()
  await screen.getByRole('button', { name: 'The bell and low-stock warnings' }).click()
  await expect.poll(() => card()?.querySelector('h4')?.textContent).toBe('The bell')
  await expect.element(screen.getByRole('button', { name: 'Next' })).toBeVisible()
})

function Dashboard() {
  return (
    <SessionContext.Provider value={SESSION}>
      <MemoryRouter initialEntries={['/inventory']}>
        <Routes>
          <Route path="/" element={<DashboardLayout userMenu={<Menus />} />}>
            <Route path="inventory" element={<Inventory />} />
            <Route path="catalog" element={<Catalog />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </SessionContext.Provider>
  )
}

function Where() {
  return <p>Rota: {useLocation().pathname}</p>
}

/** The Inventory's stand-in, with its marked parts. */
function Inventory() {
  return (
    <>
      <Where />
      <button type="button" data-tour="more-actions">
        Mais ações
      </button>
      <button type="button" data-tour="new-item">
        Novo item
      </button>
      <div data-tour="status">Estoque baixo · Esgotado</div>
      <div data-tour="items">Itens</div>
    </>
  )
}

/** The Catalog's stand-in, with its marked parts. */
function Catalog() {
  return (
    <>
      <Where />
      <div data-tour="catalog-brands">Marcas</div>
      <input aria-label="Buscar modelo" data-tour="catalog-search" />
      <div data-tour="catalog-models">Modelos</div>
      <div data-tour="catalog-sheet">Ficha</div>
    </>
  )
}

/** The header's menus: the bell and the user menu, marked, and Tutoriais, which starts what the dialog picks. */
function Menus() {
  const tutorials = useTutorials()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" data-tour="bell">
        Notificações
      </button>
      <button type="button" data-tour="user-menu">
        Menu do usuário
      </button>
      <button type="button" onClick={() => setOpen(true)}>
        Tutoriais
      </button>
      <TutorialsDialog
        open={open}
        onClose={() => setOpen(false)}
        onStart={(id) => {
          setOpen(false)
          tutorials.start(id)
        }}
      />
    </>
  )
}
