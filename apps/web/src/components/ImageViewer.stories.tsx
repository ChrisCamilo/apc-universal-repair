import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ITEM_PHOTO_LIMIT } from '@apc/shared/photos'
import { userEvent, within } from 'storybook/test'
import { TableThumbnail } from './DataTable.tsx'
import type { UploadPhoto } from './ImageUpload.tsx'
import { ImageViewer } from './ImageViewer.tsx'

// The photo viewer opened from an item's thumbnail: with three photos (arrows, dots, no "Adicionar foto"),
// with one, with none (the empty state offering "Adicionar foto"), with the remove confirmation on the
// cover, and after choosing a file that breaks the rules. Use the arrows or the Left and Right keys, the
// dots, remove, change or add; close with the ×, Escape or a click outside, and reopen from the thumbnail.
// Switch Style and Mode in the toolbar, and the phone viewports to see it at 360px.

const PHOTOS: UploadPhoto[] = [
  photo(800, 450, '#6E7B86', '#1C2024'),
  photo(450, 800, '#8C6A4F', '#2B211A'),
  photo(600, 600, '#4F6E5A', '#18231C'),
].map((url) => ({ url }))
const meta = {
  title: 'Components/ImageViewer',
  component: ImageViewer,
  args: {
    open: true,
    onClose: () => {},
    name: 'Pastilha de freio dianteira',
    code: 'FR-0142',
    photos: [],
    onPhotosChange: () => {},
    limit: ITEM_PHOTO_LIMIT,
  },
} satisfies Meta<typeof ImageViewer>
export const ConfirmRemove: Story = {
  render: () => <SampleItem initial={PHOTOS} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement.ownerDocument.body).getByRole('button', { name: 'Remover esta foto' }))
  },
}
export const Empty: Story = {
  render: () => <SampleItem initial={[]} />,
}
export const LeftOut: Story = {
  render: () => <SampleItem initial={PHOTOS.slice(0, 2)} />,
  play: async ({ canvasElement }) => {
    const input = canvasElement.ownerDocument.querySelector<HTMLInputElement>('dialog input[type="file"]')!
    // The picker can be set to show every file, so a GIF can reach the viewer.
    await userEvent.setup({ applyAccept: false }).upload(input, new File(['GIF89a'], 'motor.gif', { type: 'image/gif' }))
  },
}
export const OnePhoto: Story = {
  render: () => <SampleItem initial={PHOTOS.slice(0, 1)} />,
}
export const ThreePhotos: Story = {
  render: () => <SampleItem initial={PHOTOS} />,
}

type Story = StoryObj<typeof meta>

export default meta

/**
 * Draws a stand-in photo as an SVG data URL: a sky and a car-like block, at any shape.
 * @param width Photo width in px.
 * @param height Photo height in px.
 * @param sky Background color.
 * @param car Color of the block.
 * @returns A data URL usable as an image src.
 */
function photo(width: number, height: number, sky: string, car: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="100%" height="100%" fill="${sky}"/>` +
    `<rect x="${width * 0.15}" y="${height * 0.5}" width="${width * 0.7}" height="${height * 0.18}" rx="${width * 0.04}" fill="${car}"/>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function SampleItem({ initial }: { initial: UploadPhoto[] }) {
  const [open, setOpen] = useState(true)
  const [photos, setPhotos] = useState(initial)
  return (
    <div className="p-6">
      <TableThumbnail src={photos[0]?.url ?? null} label="Ver fotos de Pastilha de freio dianteira" onOpen={() => setOpen(true)} />
      <ImageViewer
        open={open}
        onClose={() => setOpen(false)}
        name="Pastilha de freio dianteira"
        code="FR-0142"
        photos={photos}
        onPhotosChange={setPhotos}
        limit={ITEM_PHOTO_LIMIT}
      />
    </div>
  )
}
