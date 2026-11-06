import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ITEM_PHOTO_LIMIT } from '@apc/shared/photos'
import { userEvent } from 'storybook/test'
import { ImageUpload, type UploadPhoto } from './ImageUpload.tsx'

// The item's photo field empty, with some photos, full (no drop area), read-only as in the item details (with
// photos and without), and after choosing files where some are left out: a GIF, a photo over 3 MB and one past the limit, each named with its reason. The hover and
// focus-visible states are forced by storybook-addon-pseudo-states through the classes below; switch Style
// and Mode in the toolbar to see each combination, and the phone viewports to see it at 360px.

const MB = 1024 * 1024
const PHOTOS: UploadPhoto[] = [photo('#6E7B86', '#1C2024'), photo('#8C6A4F', '#2B211A'), photo('#4F6E5A', '#18231C')].map((url) => ({
  url,
}))
const meta = {
  title: 'Components/ImageUpload',
  component: ImageUpload,
  args: { label: 'Fotos do item', photos: [], onPhotosChange: () => {}, limit: ITEM_PHOTO_LIMIT },
} satisfies Meta<typeof ImageUpload>
export const Empty: Story = {
  render: () => <SampleField initial={[]} />,
}
export const Full: Story = {
  render: () => <SampleField initial={PHOTOS} />,
}
export const LeftOut: Story = {
  render: () => <SampleField initial={PHOTOS.slice(0, 1)} />,
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector<HTMLInputElement>('input[type="file"]')!
    // A drop ignores the input's accept list, so the GIF reaches the field too.
    await userEvent.setup({ applyAccept: false }).upload(input, [
      new File(['GIF89a'], 'motor.gif', { type: 'image/gif' }),
      new File([new Uint8Array(4.2 * MB)], 'lado.jpg', { type: 'image/jpeg' }),
      await pngFile('frente.png'),
      await pngFile('traseira.png'),
      await pngFile('painel.png'),
    ])
  },
}
export const ReadOnly: Story = {
  render: () => (
    <div className="grid gap-6 p-6">
      <ImageUpload label="Fotos do item" photos={PHOTOS.slice(0, 2)} onPhotosChange={() => {}} limit={ITEM_PHOTO_LIMIT} readOnly />
      <ImageUpload label="Fotos do item" photos={[]} onPhotosChange={() => {}} limit={ITEM_PHOTO_LIMIT} readOnly />
    </div>
  ),
}
export const SomePhotos: Story = {
  render: () => <SampleField initial={PHOTOS.slice(0, 2)} />,
}
export const States: Story = {
  parameters: {
    pseudo: { hover: ['.hover label', '.hover li button'], focusVisible: ['.focus li button', '.focus input'] },
  },
  render: () => (
    <div className="grid max-w-3xl grid-cols-[repeat(auto-fill,minmax(300px,1fr))] items-start gap-6">
      {['hover', 'focus'].map((state) => (
        <div key={state} className={`grid gap-2 ${state}`}>
          <span className="px-6 font-mono text-xs text-text-muted">{state}</span>
          <SampleField initial={PHOTOS.slice(0, 1)} />
        </div>
      ))}
    </div>
  ),
}

type Story = StoryObj<typeof meta>

export default meta

/**
 * Draws a stand-in photo as an SVG data URL: a sky and a car-like block.
 * @param sky Background color.
 * @param car Color of the block.
 * @returns A data URL usable as an image src.
 */
function photo(sky: string, car: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">` +
    `<rect width="100%" height="100%" fill="${sky}"/>` +
    `<rect x="24" y="80" width="112" height="30" rx="6" fill="${car}"/>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * Draws a small PNG in the browser, for a file the field accepts.
 * @param name File name.
 * @returns The PNG file.
 */
async function pngFile(name: string): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 160
  const context = canvas.getContext('2d')!
  context.fillStyle = '#5B6670'
  context.fillRect(0, 0, 160, 160)
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
  return new File([blob], name, { type: 'image/png' })
}

function SampleField({ initial }: { initial: UploadPhoto[] }) {
  const [photos, setPhotos] = useState(initial)
  return (
    <div className="max-w-md p-6">
      <ImageUpload label="Fotos do item" photos={photos} onPhotosChange={setPhotos} limit={ITEM_PHOTO_LIMIT} />
    </div>
  )
}
