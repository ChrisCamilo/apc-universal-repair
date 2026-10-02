import type { Meta, StoryObj } from '@storybook/react-vite'
import { MotionSheet, PaletteSheet, RadiiSheet, SpacingSheet, TypeSheet } from './Foundations.tsx'

// Design token stories. Switch Style and Mode in the toolbar to see every combination.

const meta = { title: 'Foundations' } satisfies Meta
export const Motion: Story = { render: () => <MotionSheet /> }
export const Palette: Story = { render: () => <PaletteSheet /> }
export const Radii: Story = { render: () => <RadiiSheet /> }
export const Spacing: Story = { render: () => <SpacingSheet /> }
export const Typography: Story = { render: () => <TypeSheet /> }

type Story = StoryObj<typeof meta>

export default meta
