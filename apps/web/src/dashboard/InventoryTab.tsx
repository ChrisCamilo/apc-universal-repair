import { Panel } from '../components/Panel.tsx'
import { Heading, Text } from '../components/Typography.tsx'

// The Inventory tab (/inventory), the default and, in the MVP, the only tab. For now it only holds the
// place the inventory list (#26) fills in.

export function InventoryTab() {
  return (
    <Panel className="grid gap-2">
      <Heading level={2}>Estoque</Heading>
      <Text tone="muted">A lista de peças do estoque aparece aqui.</Text>
    </Panel>
  )
}
