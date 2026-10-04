import { useState } from 'react';
import { Image, Pressable, Text, View, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { scales } from '@apc/shared/theme';
import { softHairline } from './Panel';
import { fontFamily, useTheme, withAlpha, type ActiveTheme } from './theme';

// The brand tiles of the Catalog rail, the same as the web. Each tile shows the brand's logo, or its name when
// there is no logo yet or the logo doesn't load. The chosen tile takes the accent on its frame and text over a
// tinted fill, glowing where the style has a glow; pressing shows what hover shows on the web. The group is a
// radio group with exactly one tile chosen, laid out in rows of `columns` tiles.

// Fills the rest of a short last row, so its tiles stay as wide as the others.
const FILLER_STYLE: ViewStyle = { flex: 1 };
const GROUP_STYLE: ViewStyle = { gap: scales.space.s2 };
// A logo is as tall as a line of the tile's text, so tiles with and without one line up.
const LOGO_STYLE: ImageStyle = { width: '100%', height: scales.space.s5 - scales.space.s1 };
const ROW_STYLE: ViewStyle = { flexDirection: 'row', gap: scales.space.s2 };

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
 * Styles a tile's name: display face in uppercase with the style's tracking, the accent when chosen.
 * @param theme Active theme.
 * @param checked Whether the tile is chosen.
 * @param pressed Whether the tile is being pressed.
 * @returns Style for the name Text.
 */
function nameStyle(theme: ActiveTheme, checked: boolean, pressed: boolean): TextStyle {
  const fontSize = scales.fontSize.sm;
  const { colors } = theme;
  return {
    fontFamily: fontFamily(theme.displayFont, 600),
    fontSize,
    letterSpacing: theme.displayTracking * fontSize,
    textTransform: 'uppercase',
    color: checked ? colors.accent : pressed ? colors.text : colors.textMuted,
  };
}

/**
 * Splits the options into rows of a number of tiles.
 * @param options Every option, in order.
 * @param columns Tiles per row.
 * @returns The rows.
 */
function rowsOf(options: TileOption[], columns: number): TileOption[][] {
  return Array.from({ length: Math.ceil(options.length / columns) }, (_, i) => options.slice(i * columns, (i + 1) * columns));
}

/**
 * Styles a tile: the raised fill in a soft hairline frame; chosen, the accent frame over the tinted fill with
 * the glow; pressed, the full hairline.
 * @param theme Active theme.
 * @param checked Whether the tile is chosen.
 * @param pressed Whether the tile is being pressed.
 * @returns Style for the tile Pressable.
 */
function tileStyle(theme: ActiveTheme, checked: boolean, pressed: boolean): ViewStyle {
  const { colors } = theme;
  const glow: ViewStyle =
    checked && theme.glow
      ? {
          shadowColor: colors.accent,
          shadowOpacity: theme.glow.opacity,
          shadowRadius: theme.glow.blur / 2,
          shadowOffset: { width: 0, height: 0 },
        }
      : {};
  return {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scales.space.s3,
    paddingVertical: scales.space.s3,
    borderWidth: scales.hairline,
    borderColor: checked ? colors.accent : pressed ? colors.hairline : softHairline(theme),
    borderRadius: theme.radiusTile,
    backgroundColor: checked ? withAlpha(colors.accent, scales.accentSoft) : colors.panelRaised,
    ...glow,
  };
}

export function SelectableTileGroup({ label, options, value, onValueChange, columns = 1 }: SelectableTileGroupProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={GROUP_STYLE}>
      {rowsOf(options, columns).map((row) => (
        <View key={row[0].value} style={ROW_STYLE}>
          {row.map((option) => (
            <SelectableTile key={option.value} option={option} checked={option.value === value} onSelect={() => onValueChange(option.value)} />
          ))}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`gap-${i}`} style={FILLER_STYLE} />
          ))}
        </View>
      ))}
    </View>
  );
}

function SelectableTile({ option, checked, onSelect }: SelectableTileProps) {
  const theme = useTheme();
  // The logo that failed to load, so the tile falls back to the name; a new logo URL tries again.
  const [failed, setFailed] = useState<string | null>(null);
  const showLogo = option.logo !== undefined && failed !== option.logo;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={option.label}
      accessibilityState={{ checked }}
      onPress={onSelect}
      style={({ pressed }) => tileStyle(theme, checked, pressed)}
    >
      {({ pressed }) =>
        showLogo ? (
          <Image source={{ uri: option.logo }} resizeMode="contain" onError={() => setFailed(option.logo!)} style={LOGO_STYLE} />
        ) : (
          <Text numberOfLines={1} style={nameStyle(theme, checked, pressed)}>
            {option.label}
          </Text>
        )
      }
    </Pressable>
  );
}
