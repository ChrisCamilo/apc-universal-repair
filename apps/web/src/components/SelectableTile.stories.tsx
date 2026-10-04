import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Panel } from './Panel.tsx'
import { SelectableTileGroup } from './SelectableTile.tsx'

// The brand tiles of the Catalog rail: each state alone, the rail with one column of brand names (no logos
// exist yet), the same rail in four and two columns as on narrower screens, and tiles with logos, one of
// which fails to load and falls back to the name. Hover and focus-visible are forced by
// storybook-addon-pseudo-states through the classes below; switch Style and Mode in the toolbar to see each
// combination. Use the arrow keys to move the choice.

const BRANDS = ['Chevrolet', 'Volkswagen', 'Fiat', 'Ford', 'BMW', 'Toyota'].map((name) => ({ value: name.toLowerCase(), label: name }))
const STATES = [
  { name: 'default', className: undefined, value: 'none' },
  { name: 'hover', className: 'hover', value: 'none' },
  { name: 'focus-visible', className: 'focus', value: 'chevrolet' },
  { name: 'selected', className: undefined, value: 'chevrolet' },
]
const meta = {
  title: 'Components/SelectableTile',
  component: SelectableTileGroup,
  args: { label: 'Marcas', options: [], value: '', onValueChange: () => {} },
} satisfies Meta<typeof SelectableTileGroup>
export const Logos: Story = {
  render: () => (
    <div className="w-56 p-6">
      <SampleRail
        options={[
          { value: 'chevrolet', label: 'Chevrolet', logo: logo('CHEVROLET') },
          { value: 'fiat', label: 'Fiat', logo: logo('FIAT') },
          { value: 'bmw', label: 'BMW', logo: 'logos/missing-bmw.svg' },
        ]}
      />
    </div>
  ),
}
export const Narrow: Story = {
  render: () => (
    <div className="grid max-w-xl gap-6 p-6">
      <SampleRail className="grid-cols-4" />
      <div className="max-w-xs">
        <SampleRail className="grid-cols-2" />
      </div>
    </div>
  ),
}
export const Rail: Story = {
  render: () => (
    <div className="w-56 p-6">
      <Panel>
        <SampleRail />
      </Panel>
    </div>
  ),
}
export const States: Story = {
  parameters: { pseudo: { hover: ['.hover button'], focusVisible: ['.focus button[aria-checked=true]'] } },
  render: () => (
    <div className="flex flex-wrap items-start gap-6 p-6">
      {STATES.map((state) => (
        <div key={state.name} className={`grid w-40 gap-2 ${state.className ?? ''}`}>
          <span className="font-mono text-xs text-text-muted">{state.name}</span>
          <SelectableTileGroup label={state.name} options={BRANDS.slice(0, 1)} value={state.value} onValueChange={() => {}} />
        </div>
      ))}
    </div>
  ),
}

type Story = StoryObj<typeof meta>

export default meta

/**
 * Draws a stand-in wordmark as an SVG data URL, in the current text color.
 * @param name Text of the wordmark.
 * @returns A data URL usable as an image src.
 */
function logo(name: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="28" viewBox="0 0 140 28">` +
    `<rect x="1" y="1" width="138" height="26" rx="13" fill="none" stroke="#8A9198" stroke-width="2"/>` +
    `<text x="70" y="19" font-family="sans-serif" font-size="13" font-weight="700" text-anchor="middle" fill="#8A9198">${name}</text>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function SampleRail({ options = BRANDS, className }: { options?: { value: string; label: string; logo?: string }[]; className?: string }) {
  const [brand, setBrand] = useState(options[0].value)
  return <SelectableTileGroup label="Marcas" options={options} value={brand} onValueChange={setBrand} className={className} />
}
