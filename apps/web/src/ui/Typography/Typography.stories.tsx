import type { Meta, StoryObj } from '@storybook/react-vite'
import { TEXT_SIZES } from '@apc/shared/typography'
import { Heading, Label, NumericReadout, Text } from './Typography.tsx'

// The text primitives in every variant and tone. Switch Style and Mode in the toolbar: headings and
// labels change face and tracking with the style, colors change with the mode.

const LONG_TEXT =
  'O seis-cilindros em linha de 4,1 L é a configuração definitiva do Opala e o motivo de o Diplomata ter virado ' +
  'sinônimo de conforto no Brasil dos anos 80. Entrega torque farto desde a marcha lenta, com resposta longa e sem ' +
  'pressa. Vem com tração traseira e opção de câmbio manual de quatro marchas ou automático de três. O acabamento ' +
  'topo de linha traz revestimento em veludo, console completo e rodas de liga. É o item mais procurado da linha ' +
  'quando o assunto é restauração, e as peças de reposição continuam fáceis de achar.'
const TONES = ['default', 'muted', 'accent', 'danger'] as const
const meta = { title: 'Components/Typography' } satisfies Meta
export const BodyText: Story = {
  render: () => (
    <div className="grid max-w-xl gap-4 p-6">
      {TEXT_SIZES.map((size) => (
        <Text key={size} size={size}>
          {size} · Corpo em Barlow, 4.1 L 6 cilindros
        </Text>
      ))}
      {TONES.map((tone) => (
        <Text key={tone} tone={tone}>
          tone {tone} · Corpo em Barlow
        </Text>
      ))}
    </div>
  ),
}
export const Headings: Story = {
  render: () => (
    <div className="grid gap-4 p-6">
      {([1, 2, 3, 4] as const).map((level) => (
        <Heading key={level} level={level}>
          Nível {level} · Opala Diplomata
        </Heading>
      ))}
      <Heading level={3} tone="accent">
        Tone accent
      </Heading>
    </div>
  ),
}
export const Labels: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6 p-6">
      {TONES.map((tone) => (
        <Label key={tone} tone={tone}>
          Cilindrada · {tone}
        </Label>
      ))}
    </div>
  ),
}
export const LineClamp: Story = {
  render: () => (
    <div className="grid max-w-md gap-4 p-6">
      <Label>Resumo em cinco linhas</Label>
      <Text size="sm" tone="muted" lines={5}>
        {LONG_TEXT}
      </Text>
    </div>
  ),
}
export const Readouts: Story = {
  render: () => (
    <div className="grid gap-2 p-6">
      {TONES.map((tone) => (
        <NumericReadout key={tone} tone={tone}>
          4.1 L · 6 CIL · 1986 · W 712/95 · {tone}
        </NumericReadout>
      ))}
    </div>
  ),
}

type Story = StoryObj<typeof meta>

export default meta
