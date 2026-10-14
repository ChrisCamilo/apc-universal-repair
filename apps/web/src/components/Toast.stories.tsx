import type { Meta, StoryObj } from '@storybook/react-vite'
import { TOAST_KINDS, type ToastKind } from '@apc/shared/toast'
import { Button } from './Button.tsx'
import { ToastMessage, ToastProvider } from './Toast.tsx'
import { useToast } from './toastContext.ts'

// The four kinds of toast side by side: success in green with a check, error in red with an X, info in blue with an
// "i" and warning in yellow with a "!"; and a button for each that shows it at the bottom of the screen, where it hides
// on its own. Switch Style and Mode in the toolbar to see each combination.

/** A message of each kind, as the app shows them. */
const MESSAGES: Record<ToastKind, string> = {
  success: 'Item “Filtro de óleo” cadastrado.',
  error: 'Não foi possível salvar o item. Tente de novo.',
  info: 'Nenhuma alteração para salvar.',
  warning: 'Item “Filtro de óleo” salvo, mas as fotos não foram salvas. Tente de novo.',
}
const meta = {
  title: 'Components/Toast',
  component: ToastMessage,
  args: { kind: 'success', message: MESSAGES.success },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof ToastMessage>
export const Kinds: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3 p-6">
      {TOAST_KINDS.map((kind) => (
        <ToastMessage key={kind} kind={kind} message={MESSAGES[kind]} />
      ))}
    </div>
  ),
}
export const Showing: Story = {
  render: () => <Triggers />,
}

type Story = StoryObj<typeof meta>

export default meta

function Triggers() {
  const toast = useToast()
  return (
    <div className="flex flex-wrap gap-3 p-6">
      {TOAST_KINDS.map((kind) => (
        <Button key={kind} variant="secondary" size="sm" onClick={() => toast[kind](MESSAGES[kind])}>
          {kind}
        </Button>
      ))}
    </div>
  )
}
