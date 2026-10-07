import type { Meta, StoryObj } from '@storybook/react-vite'
import { DashboardScreen, LoginScreen } from './Screens.tsx'

// The wireframe screens rebuilt from the design system alone: the Login, and the Dashboard on its Catalog and
// Inventory tabs. Switch Style and Mode in the toolbar to see each combination, and the viewports to see them at
// 1280×720 and at phone width.

const meta = { title: 'Screens', parameters: { layout: 'fullscreen' } } satisfies Meta
export const Catalog: Story = { render: () => <DashboardScreen initialTab="catalog" /> }
export const Dashboard: Story = { render: () => <DashboardScreen initialTab="inventory" /> }
export const Login: Story = { render: () => <LoginScreen /> }

type Story = StoryObj<typeof meta>

export default meta
