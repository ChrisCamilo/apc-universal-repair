import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useStyles } from './SelectableTile.styles';

// The brand tiles of the Catalog rail, the same as the web. Each tile shows the brand's logo, or its name when
// there is no logo yet or the logo doesn't load. The chosen tile takes the accent on its frame and text over a
// tinted fill, glowing where the style has a glow; pressing shows what hover shows on the web. The group is a
// radio group with exactly one tile chosen, laid out in rows of `columns` tiles.

type TileOption = {
  value: string;
  /** The brand's name: the tile's accessible name, and its text when there is no logo. */
  label: string;
  /** URL of the brand's logo; leave it out until real logo assets exist. */
  logo?: string;
};
type SelectableTileGroupProps = {
  /** Accessible name of the group, e.g. "Marcas". */
  label: string;
  options: TileOption[];
  value: string;
  onValueChange: (value: string) => void;
  /** Tiles per row; one in the rail, more on narrow screens. */
  columns?: number;
};
type SelectableTileProps = { option: TileOption; checked: boolean; onSelect: () => void };

/**
 * Splits the options into rows of a number of tiles.
 * @param options Every option, in order.
 * @param columns Tiles per row.
 * @returns The rows.
 */
function rowsOf(options: TileOption[], columns: number): TileOption[][] {
  return Array.from({ length: Math.ceil(options.length / columns) }, (_, i) => options.slice(i * columns, (i + 1) * columns));
}

export function SelectableTileGroup({ label, options, value, onValueChange, columns = 1 }: SelectableTileGroupProps) {
  const { styles, ids } = useStyles();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.group} testID={ids.group}>
      {rowsOf(options, columns).map((row) => (
        <View key={row[0].value} style={styles.row} testID={ids.row}>
          {row.map((option) => (
            <SelectableTile key={option.value} option={option} checked={option.value === value} onSelect={() => onValueChange(option.value)} />
          ))}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`gap-${i}`} style={styles.filler} testID={ids.filler} />
          ))}
        </View>
      ))}
    </View>
  );
}

function SelectableTile({ option, checked, onSelect }: SelectableTileProps) {
  const { styles, ids } = useStyles();
  // The logo that failed to load, so the tile falls back to the name; a new logo URL tries again.
  const [failed, setFailed] = useState<string | null>(null);
  const showLogo = option.logo !== undefined && failed !== option.logo;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={option.label}
      accessibilityState={{ checked }}
      onPress={onSelect}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed, checked && styles.tileChecked]}
      testID={ids.tile}
    >
      {({ pressed }) =>
        showLogo ? (
          <Image source={{ uri: option.logo }} resizeMode="contain" onError={() => setFailed(option.logo!)} style={styles.logo} testID={ids.logo} />
        ) : (
          <Text numberOfLines={1} style={[styles.name, pressed && styles.namePressed, checked && styles.nameChecked]} testID={ids.name}>
            {option.label}
          </Text>
        )
      }
    </Pressable>
  );
}
