import type { StorybookConfig } from '@storybook/react-vite'

// Uses the app's vite.config.ts, so stories get the same Tailwind setup and theme plugin as the app.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: '@storybook/react-vite',
  core: { disableTelemetry: true },
}

export default config
