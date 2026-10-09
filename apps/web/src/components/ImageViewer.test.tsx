import { useState } from 'react'
import { ITEM_PHOTO_LIMIT } from '@apc/shared/photos'
import { MIN_DESKTOP_HEIGHT, MIN_DESKTOP_WIDTH, MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/shared/screens'
import { MODES, STYLES, themes } from '@apc/shared/theme'
import { beforeAll, expect, test, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import '../index.css'
import { themeCss } from '../theme.ts'
import type { UploadPhoto } from './ImageUpload.tsx'
import { ImageViewer } from './ImageViewer.tsx'

const NAME = 'Pastilha de freio dianteira'
const PHOTOS: UploadPhoto[] = [[800, 450], [300, 900], [600, 600]].map(([width, height], i) => ({
  url: `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" id="p${i}" width="${width}" height="${height}"><rect width="100%" height="100%"/></svg>`,
  )}`,
}))
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
 * Chooses a file in the viewer's hidden file input, as the picker would.
 * @param file File to choose.
 */
async function choose(file: File) {
  await userEvent.upload(page.elementLocator(document.querySelector('dialog input[type="file"]')!), file)
}

/**
 * Reads which photo is on screen, by its alt text.
 * @returns E.g. "Foto 2 de 3 · Pastilha de freio dianteira".
 */
function onScreen(): string | null {
  return document.querySelector('dialog img')?.getAttribute('alt') ?? null
}

beforeAll(() => {
  const tag = document.createElement('style')
  tag.textContent = themeCss()
  document.head.append(tag)
})

for (const style of STYLES) {
  for (const mode of MODES) {
    // Opens the viewer in one style and mode and checks the window is the panel framed in the hairline, the
    // dot of the photo on screen is the accent and the others the hairline.
    test(`Web: the photo viewer follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode]
      root.dataset.style = style
      root.dataset.mode = mode
      const screen = await render(<Sample initial={PHOTOS} />)
      const dialog = screen.getByRole('dialog', { name: NAME }).element()
      expect(getComputedStyle(dialog).backgroundColor).toBe(rgb(colors.panel))
      expect(getComputedStyle(dialog).borderColor).toBe(rgb(colors.hairline))
      expect(getComputedStyle(screen.getByRole('button', { name: 'Foto 1' }).element()).backgroundColor).toBe(rgb(colors.accent))
      expect(getComputedStyle(screen.getByRole('button', { name: 'Foto 2' }).element()).backgroundColor).toBe(rgb(colors.hairline))
    })
  }
}

// Opens the viewer and checks the name and code head it, and a tall photo shows whole inside the frame.
test('Web: the viewer shows the item and the whole photo', async () => {
  const screen = await render(<Sample initial={PHOTOS} />)
  await expect.element(screen.getByRole('heading', { name: NAME })).toBeVisible()
  await expect.element(screen.getByText('FR-0142')).toBeVisible()
  await screen.getByRole('button', { name: 'Foto 2' }).click()
  const img = screen.getByRole('img', { name: `Foto 2 de 3 · ${NAME}` }).element()
  expect(getComputedStyle(img).objectFit).toBe('contain')
  expect(img.getBoundingClientRect().height).toBeLessThanOrEqual(img.parentElement!.getBoundingClientRect().height)
})

// Moves with the arrows, the keys and the dots, and checks next wraps from the last photo to the first,
// previous from the first to the last, and the dot of the photo on screen is marked current.
test('Web: arrows, keys and dots move through the photos, wrapping around', async () => {
  const screen = await render(<Sample initial={PHOTOS} />)
  await screen.getByRole('button', { name: 'Foto anterior' }).click()
  expect(onScreen()).toBe(`Foto 3 de 3 · ${NAME}`)
  await screen.getByRole('button', { name: 'Próxima foto' }).click()
  expect(onScreen()).toBe(`Foto 1 de 3 · ${NAME}`)
  await userEvent.keyboard('{ArrowRight}{ArrowRight}')
  expect(onScreen()).toBe(`Foto 3 de 3 · ${NAME}`)
  await userEvent.keyboard('{ArrowLeft}')
  expect(onScreen()).toBe(`Foto 2 de 3 · ${NAME}`)
  await expect.element(screen.getByRole('button', { name: 'Foto 2' })).toHaveAttribute('aria-current', 'true')
  await screen.getByRole('button', { name: 'Foto 1' }).click()
  expect(onScreen()).toBe(`Foto 1 de 3 · ${NAME}`)
})

// Opens a viewer with a single photo and checks it has no arrows or dots.
test('Web: a single photo has no arrows or dots', async () => {
  const screen = await render(<Sample initial={PHOTOS.slice(0, 1)} />)
  await expect.element(screen.getByRole('img', { name: `Foto 1 de 1 · ${NAME}` })).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'Próxima foto' })).not.toBeInTheDocument()
  await expect.element(screen.getByRole('button', { name: 'Foto 1' })).not.toBeInTheDocument()
})

// Opens a viewer with no photo and checks it says so and only offers to add one.
test('Web: with no photo the viewer shows the empty state', async () => {
  const screen = await render(<Sample initial={[]} />)
  await expect.element(screen.getByText('Este item ainda não tem fotos')).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'Adicionar foto' })).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'Remover esta foto' })).not.toBeInTheDocument()
})

// Closes the viewer with the ×, Escape and a click on the backdrop, and checks each one asks the owner to close.
test('Web: the ×, Escape and a click outside close the viewer', async () => {
  const onClose = vi.fn()
  const screen = await render(<Sample initial={PHOTOS} onClose={onClose} keepOpen />)
  await screen.getByRole('button', { name: 'Fechar' }).click()
  await userEvent.keyboard('{Escape}')
  // A click on the backdrop reaches the dialog element itself, not its content.
  document.querySelector('dialog')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  // A click on the content doesn't close it.
  await screen.getByRole('heading', { name: NAME }).click()
  expect(onClose).toHaveBeenCalledTimes(3)
})

// Asks to remove the cover and checks the confirmation names the item and warns about the cover; Cancel
// keeps it, Remover takes it out, the next photo becomes the first, and the toast shows inside the viewer.
test('Web: removing a photo asks first and the next one takes its place', async () => {
  const screen = await render(<Sample initial={PHOTOS} />)
  await screen.getByRole('button', { name: 'Remover esta foto' }).click()
  const confirm = screen.getByRole('dialog', { name: 'Remover esta foto?' })
  await expect.element(confirm).toHaveTextContent(
    `Remover esta foto?Esta foto sai de ${NAME} (FR-0142). Essa ação não pode ser desfeita. Ela é a capa; a próxima foto passa a ser a capa na lista.CancelarRemover`,
  )
  await confirm.getByRole('button', { name: 'Cancelar' }).click()
  expect(screen.getByRole('button', { name: /^Foto \d$/ }).elements()).toHaveLength(3)

  await screen.getByRole('button', { name: 'Remover esta foto' }).click()
  await confirm.getByRole('button', { name: 'Remover' }).click()
  await expect.element(confirm).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /^Foto \d$/ }).elements()).toHaveLength(2)
  expect(document.querySelector('dialog img')!.getAttribute('src')).toBe(PHOTOS[1].url)
  const toast = screen.getByRole('status').filter({ hasText: 'Foto removida' })
  await expect.element(toast).toBeVisible()
  expect(toast.element().closest('dialog')).toBe(screen.getByRole('dialog', { name: NAME }).element())
})

// Removes a photo while the owner can't save it, and checks the toast says so instead of confirming the removal, and
// the photos stay as the owner keeps them.
test('Web: a change the owner could not save is reported', async () => {
  const screen = await render(<Sample initial={PHOTOS} failSave />)
  await screen.getByRole('button', { name: 'Remover esta foto' }).click()
  await screen.getByRole('dialog', { name: 'Remover esta foto?' }).getByRole('button', { name: 'Remover' }).click()
  await expect.element(screen.getByRole('status').filter({ hasText: 'Não foi possível salvar as fotos. Tente de novo.' })).toBeVisible()
  expect(screen.getByRole('status').filter({ hasText: 'Foto removida' }).elements()).toHaveLength(0)
  expect(screen.getByRole('button', { name: /^Foto \d$/ }).elements()).toHaveLength(3)
})

// Adds a photo, changes the one on screen and tries a GIF, and checks the new photo is shown and counted,
// "Adicionar foto" leaves at the limit, the change replaces the photo in place, and the GIF is refused with
// the ImageUpload message.
test('Web: adding and changing photos follow the upload rules', async () => {
  const screen = await render(<Sample initial={PHOTOS.slice(0, 2)} />)
  await expect.element(screen.getByText('JPG, PNG ou WebP, até 3 MB · 2 de 3 fotos')).toBeVisible()
  await choose(new File([new Uint8Array(10)], 'nova.png', { type: 'image/png' }))
  expect(onScreen()).toBe(`Foto 3 de 3 · ${NAME}`)
  await expect.element(screen.getByText('Foto adicionada')).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'Adicionar foto' })).not.toBeInTheDocument()
  await expect.element(screen.getByText('Limite de 3 fotos atingido. Troque ou remova uma para adicionar outra.')).toBeVisible()

  await screen.getByRole('button', { name: 'Foto 1' }).click()
  await screen.getByRole('button', { name: 'Trocar esta foto' }).click()
  await choose(new File([new Uint8Array(10)], 'troca.jpg', { type: 'image/jpeg' }))
  expect(document.querySelector('dialog img')!.getAttribute('src')).toMatch(/^blob:/)
  expect(screen.getByRole('button', { name: /^Foto \d$/ }).elements()).toHaveLength(3)
  await expect.element(screen.getByText('Foto trocada')).toBeVisible()

  await screen.getByRole('button', { name: 'Trocar esta foto' }).click()
  await choose(new File(['GIF89a'], 'motor.gif', { type: 'image/gif' }))
  await expect.element(screen.getByRole('alert')).toHaveTextContent('motor.gif: não é JPG, PNG ou WebP')
})

// Opens the viewer on a 360×780 phone and checks the window fits the screen width inside the gaps.
test('Web: the viewer fits a phone', async () => {
  await page.viewport(MIN_MOBILE_WIDTH, MIN_MOBILE_HEIGHT)
  try {
    const screen = await render(<Sample initial={PHOTOS} />)
    const box = screen.getByRole('dialog', { name: NAME }).element().getBoundingClientRect()
    expect(box.left).toBeGreaterThanOrEqual(0)
    expect(box.right).toBeLessThanOrEqual(MIN_MOBILE_WIDTH)
  } finally {
    await page.viewport(MIN_DESKTOP_WIDTH, MIN_DESKTOP_HEIGHT)
  }
})

function Sample({
  initial,
  onClose,
  keepOpen = false,
  failSave = false,
}: {
  initial: UploadPhoto[]
  onClose?: () => void
  keepOpen?: boolean
  failSave?: boolean
}) {
  const [open, setOpen] = useState(true)
  const [photos, setPhotos] = useState(initial)
  return (
    <ImageViewer
      open={open}
      onClose={() => {
        onClose?.()
        if (!keepOpen) {
          setOpen(false)
        }
      }}
      name={NAME}
      code="FR-0142"
      photos={photos}
      onPhotosChange={failSave ? async () => false : setPhotos}
      limit={ITEM_PHOTO_LIMIT}
    />
  )
}
