import { View } from 'react-native';
import { scales } from '@apc/shared/theme';
import { Panel } from '../Panel';
import { Heading, Text } from '../Typography';

// The Inventory tab, the default and, in the MVP, the only tab. For now it only holds the place the inventory
// list (#26) fills in.

export function InventoryTab() {
  return (
    <Panel>
      <View style={{ gap: scales.space.s2 }}>
        <Heading level={2}>Estoque</Heading>
        <Text tone="muted">A lista de peças do estoque aparece aqui.</Text>
      </View>
    </Panel>
  );
}
