import type { Meta, StoryObj } from '@storybook/react-vite'
import { ImageFrame } from './ImageFrame.tsx'
import { Panel } from './Panel.tsx'

// Every photo frame state. The wide and tall photos show the frame keeping its ratio and never stretching
// the photo; inside a panel the frame takes the tile radius. Switch Style and Mode in the toolbar to see
// each combination.

// Stand-in photos: plain shapes in fixed grays, since they play the part of real photos.
const TALL_PHOTO = photo(300, 600)
const WIDE_PHOTO = photo(800, 450)
const meta = {
  title: 'Components/ImageFrame',
  component: ImageFrame,
  args: { alt: 'Chevrolet Opala 1980, de lado', src: WIDE_PHOTO },
} satisfies Meta<typeof ImageFrame>
export const Playground: Story = {
  render: (args) => (
    <div className="max-w-md p-6">
      <ImageFrame {...args} />
    </div>
  ),
}
export const States: Story = {
  render: () => (
    <div className="grid max-w-4xl grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6 p-6">
      {[
        { name: 'wide photo', props: { src: WIDE_PHOTO } },
        { name: 'tall photo', props: { src: TALL_PHOTO } },
        { name: 'loading', props: { loading: true } },
        { name: 'missing', props: { src: null } },
        { name: 'failed', props: { src: '/fotos/nao-existe.jpg' } },
      ].map((state) => (
        <div key={state.name} className="grid gap-2">
          <span className="font-mono text-xs text-text-muted">{state.name}</span>
          <ImageFrame alt="Chevrolet Opala 1980" {...state.props} />
        </div>
      ))}
      <div className="grid gap-2">
        <span className="font-mono text-xs text-text-muted">inside a panel</span>
        <Panel>
          <ImageFrame alt="Chevrolet Opala 1980" src={WIDE_PHOTO} />
        </Panel>
      </div>
    </div>
  ),
}

type Story = StoryObj<typeof meta>

export default meta

/**
 * Draws a stand-in photo as an SVG data URL: a sky, a ground line and a car-like block.
 * @param width Photo width in px.
 * @param height Photo height in px.
 * @returns A data URL usable as an image src.
 */
function photo(width: number, height: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="100%" height="100%" fill="#6E7B86"/>` +
    `<rect y="${height * 0.7}" width="100%" height="${height * 0.3}" fill="#3E464D"/>` +
    `<rect x="${width * 0.15}" y="${height * 0.5}" width="${width * 0.7}" height="${height * 0.18}" rx="${width * 0.04}" fill="#1C2024"/>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
