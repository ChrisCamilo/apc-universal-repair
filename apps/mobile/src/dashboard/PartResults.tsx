import { Pressable, View, Text as NativeText } from 'react-native';
import { partFit, type PartResults as Results } from '@apc/shared/catalog';
import type { Item } from '@apc/shared/items';
import { Text } from '../Typography';
import { useStyles } from './PartResults.styles';

// The inventory parts a Catalog search by code found, the same as the web: a tinted box above the tree with each
// part's code, name and the vehicle it fits. Choosing one reveals its vehicle in the tree; the chosen part has the
// accent frame. The parts are a radio group with one always chosen; when more parts matched than fit, a line says
// how many more.

type PartResultsProps = {
  results: Results;
  /** The chosen part's id. */
  chosen?: string;
  onChoose: (part: Item) => void;
};

export function PartResults({ results, chosen, onChoose }: PartResultsProps) {
  const { styles, ids } = useStyles();
  const { parts, more } = results;
  return (
    <View style={styles.box} testID={ids.box}>
      <Text size="sm" tone="muted">
        {parts.length === 1 ? 'Peça do estoque com esse código:' : 'Peças do estoque com esse código:'}
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Peças do estoque com esse código" style={styles.list} testID={ids.list}>
        {parts.map((part) => (
          <Pressable
            key={part.id}
            accessibilityRole="radio"
            accessibilityLabel={`${part.code} ${part.name}, ${partFit(part)}`}
            accessibilityState={{ checked: part.id === chosen }}
            onPress={() => onChoose(part)}
            style={({ pressed }) => [styles.part, pressed && styles.partPressed, part.id === chosen && styles.partChosen]}
            testID={ids.part}
          >
            <View style={styles.line} testID={ids.line}>
              <NativeText style={styles.code} testID={ids.code}>{part.code}</NativeText>
              <Text size="sm">{part.name}</Text>
            </View>
            <Text size="sm" tone="muted">
              {partFit(part)}
            </Text>
          </Pressable>
        ))}
      </View>
      {more > 0 && (
        <Text size="sm" tone="muted">
          {`Mais ${more}. Digite mais do código para afinar.`}
        </Text>
      )}
    </View>
  );
}
