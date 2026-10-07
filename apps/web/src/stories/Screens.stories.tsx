import type { Meta, StoryObj } from '@storybook/react-vite'
import { createMockAuth } from '@apc/shared/auth'
import { TEST_USERS } from '@apc/shared/test-users'
import { LoginScreen } from '../auth/LoginScreen.tsx'
import { DashboardScreen } from './Screens.tsx'

// The wireframe screens rebuilt from the design system alone: the real Login, and the Dashboard on its Catalog and
// Inventory tabs. Switch Style and Mode in the toolbar to see each combination, and the viewports to see them at
// 1280×720 and at phone width.

// The Login story logs in with the repo's test users (see @apc/shared/auth) and keeps no session.
const AUTH = createMockAuth({ getItem: async () => null, setItem: async () => {}, removeItem: async () => {} }, TEST_USERS)
const meta = { title: 'Screens', parameters: { layout: 'fullscreen' } } satisfies Meta
export const Catalog: Story = { render: () => <DashboardScreen initialTab="catalog" /> }
export const Dashboard: Story = { render: () => <DashboardScreen initialTab="inventory" /> }
export const Login: Story = { render: () => <LoginScreen auth={AUTH} onLoggedIn={() => {}} /> }

type Story = StoryObj<typeof meta>

export default meta
