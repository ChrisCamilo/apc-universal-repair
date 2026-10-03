import { useState } from 'react'
import { themes } from '@apc/shared/theme'
import { beforeAll, expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { ImageFrame } from './ImageFrame.tsx'
import { Panel } from './Panel.tsx'

const MISSING_PHOTO = '/fotos/nao-existe.jpg'
const root = document.documentElement

/**
 * Draws a plain test photo of a given size as an SVG data URL.
 * @param width Photo width in px.
 * @param height Photo height in px.
 * @returns A data URL usable as an image src.
 */
function photo(width: number, height: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<rect width="100%" height="100%" fill="#808080"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
  root.dataset.style = 'eighties'
  root.dataset.mode = 'night'
})

// Loads a tall photo into the default 16:9 frame and checks the frame keeps its ratio, the busy state ends,
// and the photo is fitted whole over the frame instead of stretched or cropped.
test('Web: frames keep their ratio and never stretch the photo', async () => {
  const screen = await render(
    <div style={{ width: 320 }}>
      <ImageFrame data-testid="frame" src={photo(300, 600)} alt="Opala de frente" />
    </div>,
  )
  const frame = screen.getByTestId('frame')
  await expect.element(frame).not.toHaveAttribute('aria-busy')
  const box = frame.element().getBoundingClientRect()
  expect(box.width / box.height).toBeCloseTo(16 / 9, 1)

  const img = screen.getByRole('img', { name: 'Opala de frente' }).element()
  expect(getComputedStyle(img).objectFit).toBe('contain')
  expect(img.getBoundingClientRect().height).toBeCloseTo(box.height - 2, 0)
  await expect.poll(() => getComputedStyle(img).opacity).toBe('1')
})

// Checks a custom ratio sets the frame's shape.
test('Web: frames take a custom ratio', async () => {
  const screen = await render(
    <div style={{ width: 300 }}>
      <ImageFrame data-testid="frame" src={photo(10, 10)} alt="Peça" ratio={1} />
    </div>,
  )
  const box = screen.getByTestId('frame').element().getBoundingClientRect()
  expect(box.width).toBeCloseTo(box.height, 0)
})

// Shows the loading state while the photo URL is on its way: busy, spinner, no photo yet.
test('Web: frames show a spinner while loading', async () => {
  const screen = await render(<ImageFrame data-testid="frame" loading alt="Opala" />)
  await expect.element(screen.getByTestId('frame')).toHaveAttribute('aria-busy', 'true')
  await expect.element(screen.getByTestId('image-spinner')).toBeInTheDocument()
  expect(screen.getByRole('img').query()).toBeNull()
})

// Shows the missing state with no photo, and switches to it when the photo fails to load.
test('Web: frames say when there is no photo or it fails to load', async () => {
  const screen = await render(
    <>
      <ImageFrame data-testid="none" src={null} alt="Opala" />
      <ImageFrame data-testid="broken" src={MISSING_PHOTO} alt="Opala" />
    </>,
  )
  await expect.element(screen.getByTestId('none')).toHaveTextContent('Sem foto')
  await expect.element(screen.getByTestId('broken')).toHaveTextContent('Sem foto')
  await expect.element(screen.getByTestId('broken')).not.toHaveAttribute('aria-busy')
})

// Swaps a loaded photo for one that fails and checks the frame follows the new photo instead of keeping
// the old result.
test('Web: frames follow a new photo', async () => {
  const screen = await render(<Swap />)
  await expect.element(screen.getByRole('img', { name: 'Opala' })).toBeVisible()
  await screen.getByRole('button', { name: 'Trocar' }).click()
  await expect.element(screen.getByTestId('frame')).toHaveTextContent('Sem foto')
})

// Checks a frame inside a panel takes the tile radius, like a nested panel, and the panel radius outside.
test('Web: frames inside panels take the tile radius', async () => {
  const screen = await render(
    <>
      <ImageFrame data-testid="alone" src={null} alt="Opala" />
      <Panel>
        <ImageFrame data-testid="nested" src={null} alt="Opala" />
      </Panel>
    </>,
  )
  const { radiusPanel, radiusTile } = themes.eighties.night
  expect(getComputedStyle(screen.getByTestId('alone').element()).borderTopLeftRadius).toBe(`${radiusPanel}px`)
  expect(getComputedStyle(screen.getByTestId('nested').element()).borderTopLeftRadius).toBe(`${radiusTile}px`)
})

function Swap() {
  const [src, setSrc] = useState(photo(80, 45))
  return (
    <>
      <ImageFrame data-testid="frame" src={src} alt="Opala" />
      <button type="button" onClick={() => setSrc(MISSING_PHOTO)}>
        Trocar
      </button>
    </>
  )
}
