import { useState } from 'react'
import { ITEM_PHOTO_LIMIT } from '@apc/shared/photos'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import { ImageUpload, type UploadPhoto } from './ImageUpload.tsx'

const MB = 1024 * 1024
const SAVED: UploadPhoto[] = ['a', 'b', 'c'].map((name) => ({ url: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" id="${name}"/>` }))
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
 * Makes a file of a type and size, for the field to check.
 * @param name File name.
 * @param type MIME type.
 * @param size Size in bytes; defaults to 1 KB.
 * @returns The file.
 */
function file(name: string, type: string, size = 1024): File {
  return new File([new Uint8Array(size)], name, { type })
}

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders the field with a photo and a file left out in one style and mode, and checks the drop area is
    // framed in the dashed hairline on the raised fill and the message is in the danger color.
    test(`Web: the photo field follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<Sample initial={SAVED.slice(0, 1)} />)
      const drop = screen.getByText(/Arraste mais/).element().closest('label')!
      expect(getComputedStyle(drop).borderStyle).toBe('dashed')
      expect(getComputedStyle(drop).borderColor).toBe(rgb(colors.hairline))
      expect(getComputedStyle(drop).backgroundColor).toBe(rgb(colors.panelRaised))
      await userEvent.upload(screen.getByLabelText(/Arraste mais/), [file('motor.gif', 'image/gif')])
      expect(getComputedStyle(screen.getByRole('alert').element()).color).toBe(rgb(colors.danger))
    })
  }
}

// Chooses several files at once on an empty field and checks the good ones become thumbnails in order, the
// first marked as the cover, while a GIF and a photo over 3 MB are left out and named with their reasons.
test('Web: choosing files keeps the good ones and names each one left out', async () => {
  const screen = await render(<Sample initial={[]} />)
  await expect.element(screen.getByText('Arraste até 3 fotos ou clique para escolher')).toBeVisible()
  await userEvent.upload(screen.getByLabelText(/Arraste até 3 fotos/), [
    file('frente.jpg', 'image/jpeg'),
    file('motor.gif', 'image/gif'),
    file('lado.png', 'image/png', 4.2 * MB),
    file('traseira.webp', 'image/webp'),
  ])
  expect(screen.getByRole('img').elements().map((img) => img.getAttribute('alt'))).toEqual(['Foto 1, capa', 'Foto 2'])
  await expect.element(screen.getByText('capa', { exact: true })).toBeVisible()
  expect(screen.getByRole('alert').getByRole('listitem').elements().map((li) => li.textContent)).toEqual([
    'motor.gif: não é JPG, PNG ou WebP',
    'lado.png: tem 4,2 MB, e o limite é 3 MB',
  ])
  await expect.element(screen.getByText('Arraste mais 1 foto ou clique para escolher')).toBeVisible()
})

// Drops files on the area with two photos held and checks the area lights up while dragging, takes one file
// and names the one past the limit, then disappears since the field is full.
test('Web: dropping files fills the field up to the limit and hides the area', async () => {
  const screen = await render(<Sample initial={SAVED.slice(0, 2)} />)
  const drop = screen.getByText(/Arraste mais/).element().closest('label')!
  const files = new DataTransfer()
  files.items.add(file('frente.jpg', 'image/jpeg'))
  files.items.add(file('painel.jpg', 'image/jpeg'))
  drop.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: files }))
  await expect.element(drop).toHaveAttribute('data-dragging', 'true')
  drop.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: files }))

  await expect.poll(() => screen.getByRole('img').elements()).toHaveLength(ITEM_PHOTO_LIMIT)
  await expect.element(screen.getByRole('alert')).toHaveTextContent('painel.jpg: passou do limite de 3 fotos')
  expect(screen.container.querySelector('input[type="file"]')).toBeNull()
})

// Removes a photo just chosen and checks it goes, its preview is let go, the message clears and the drop
// area comes back.
test('Web: removing a photo frees its place', async () => {
  const revoke = vi.spyOn(URL, 'revokeObjectURL')
  const screen = await render(<Sample initial={SAVED.slice(0, 2)} />)
  await userEvent.upload(screen.getByLabelText(/Arraste mais/), [file('frente.jpg', 'image/jpeg'), file('a.gif', 'image/gif')])
  await expect.element(screen.getByRole('alert')).toBeVisible()
  await screen.getByRole('button', { name: 'Remover foto 3' }).click()
  expect(revoke).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('img').elements()).toHaveLength(2)
  await expect.element(screen.getByRole('alert')).not.toBeInTheDocument()
  await expect.element(screen.getByText('Arraste mais 1 foto ou clique para escolher')).toBeVisible()
  revoke.mockRestore()
})

// Fits the field in the width a 360px phone leaves inside a dialog and checks nothing overflows.
test('Web: the photo field fits a phone', async () => {
  await page.viewport(360, 780)
  try {
    const screen = await render(
      <div style={{ width: 280 }}>
        <Sample initial={SAVED.slice(0, 2)} />
      </div>,
    )
    const box = screen.container.firstElementChild as HTMLElement
    expect(box.scrollWidth).toBeLessThanOrEqual(280)
  } finally {
    await page.viewport(1280, 720)
  }
})

function Sample({ initial }: { initial: UploadPhoto[] }) {
  const [photos, setPhotos] = useState(initial)
  return <ImageUpload label="Fotos do item" photos={photos} onPhotosChange={setPhotos} limit={ITEM_PHOTO_LIMIT} />
}
