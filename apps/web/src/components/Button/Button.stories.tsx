import type { Meta, StoryObj } from '@storybook/react-vite'
import { BUTTON_SIZES, BUTTON_VARIANTS } from '@apc/shared/button'
import { cubeIcon, documentIcon } from '@apc/shared/icons'
import { Button } from './Button.tsx'

// Every variant in every state. Hover, active and focus-visible are forced by storybook-addon-pseudo-states
// through the classes below; switch Style and Mode in the toolbar to see each combination.

const STATES = [
  { name: 'default', props: {}, className: undefined },
  { name: 'hover', props: {}, className: 'hover' },
  { name: 'active', props: {}, className: 'active' },
  { name: 'focus-visible', props: {}, className: 'focus' },
  { name: 'disabled', props: { disabled: true }, className: undefined },
  { name: 'loading', props: { loading: true }, className: undefined },
]
const meta = {
  title: 'Components/Button',
  component: Button,
  args: { children: 'Entrar', variant: 'primary', size: 'md' },
  argTypes: { variant: { control: 'inline-radio', options: BUTTON_VARIANTS } },
} satisfies Meta<typeof Button>
export const Playground: Story = {}
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4 p-6">
      {(Object.keys(BUTTON_SIZES) as (keyof typeof BUTTON_SIZES)[]).map((size) => (
        <Button key={size} size={size}>
          Entrar · {size}
        </Button>
      ))}
    </div>
  ),
}
export const States: Story = {
  parameters: { pseudo: { hover: ['.hover'], active: ['.active'], focusVisible: ['.focus'] } },
  render: () => (
    <table className="m-6 border-separate border-spacing-x-4 border-spacing-y-3">
      <thead>
        <tr>
          <th />
          {STATES.map((state) => (
            <th key={state.name} className="font-mono text-xs font-normal text-text-muted">{state.name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {BUTTON_VARIANTS.map((variant) => (
          <tr key={variant}>
            <th className="text-left font-mono text-xs font-normal">{variant}</th>
            {STATES.map((state) => (
              <td key={state.name}>
                <Button variant={variant} className={state.className} {...state.props}>
                  {variant === 'link' ? 'Esqueceu a senha?' : 'Entrar'}
                </Button>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}
export const WireframeActions: Story = {
  render: () => (
    <div className="grid max-w-sm gap-6 p-6">
      <div className="grid justify-items-start gap-3">
        <Button type="submit">Entrar</Button>
        <Button variant="link">Esqueceu a senha?</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={documentIcon}>
          Ver ficha técnica
        </Button>
        <Button size="sm" variant="secondary" icon={cubeIcon}>
          Ver em 3D
        </Button>
      </div>
    </div>
  ),
}

type Story = StoryObj<typeof meta>

export default meta
