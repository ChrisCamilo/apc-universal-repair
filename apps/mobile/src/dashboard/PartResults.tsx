import { Pressable, View, Text as NativeText, type TextStyle, type ViewStyle } from 'react-native';
import { partFit, type PartResults as Results } from '@apc/shared/catalog';
import type { Item } from '@apc/shared/items';
import { scales } from '@apc/shared/theme';
import { fontFamily, useTheme, withAlpha, type ActiveTheme } from '../theme';
import { Text } from '../Typography';

// The inventory parts a Catalog search by code found, the same as the web: a tinted box above the tree with each
// part's code, name and the vehicle it fits. Choosing one reveals its vehicle in the tree; the chosen part has the
// accent frame. The parts are a radio group with one always chosen; when more parts matched than fit, a line says
// how many more.

const CODE_LINE_STYLE: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: scales.space.s2 };
// The box's frame: the accent at this opacity, as on the web (border-accent/45).
const FRAME_OPACITY = 0.45;
const LIST_STYLE: ViewStyle = { gap: scales.space.s1 };

type PartResultsProps = {
  results: Results;
  /** The chosen part's id. */
  chosen?: string;
  onChoose: (part: Item) => void;
};

/**
 * Styles the box around the parts: the soft accent fill in a faint accent frame.
 * @param theme Active theme.
 * @returns Style for the box View.
 */
function boxStyle(theme: ActiveTheme): ViewStyle {
  return {
    gap: scales.space.s1,
    padding: scales.space.s3,
    borderWidth: scales.hairline,
    borderColor: withAlpha(theme.colors.accent, FRAME_OPACITY),
    borderRadius: theme.radiusTile,
    backgroundColor: withAlpha(theme.colors.accent, scales.accentSoft),
  };
}

/**
 * Styles a part's code: small mono digits in the accent.
 * @param theme Active theme.
 * @returns Style for the code Text.
 */
function codeStyle(theme: ActiveTheme): TextStyle {
  return { fontFamily: fontFamily(scales.monoFont), fontSize: scales.fontSize.xs, color: theme.colors.accent };
}

/**
 * Styles a part's row: clear at rest, the panel fill while pressed; chosen, the accent frame on the panel fill.
 * @param theme Active theme.
 * @param chosen Whether the part is the chosen one.
 * @param pressed Whether the row is being pressed.
 * @returns Style for the row Pressable.
 */
function partStyle(theme: ActiveTheme, chosen: boolean, pressed: boolean): ViewStyle {
  return {
    gap: scales.space.s1 / 2,
    paddingHorizontal: scales.space.s2,
    paddingVertical: scales.space.s2,
    borderWidth: scales.hairline,
    borderColor: chosen ? theme.colors.accent : 'transparent',
    borderRadius: theme.radiusTile,
    backgroundColor: chosen || pressed ? theme.colors.panel : 'transparent',
  };
}

export function PartResults({ results, chosen, onChoose }: PartResultsProps) {
  const theme = useTheme();
  const { parts, more } = results;
  return (
    <View style={boxStyle(theme)}>
      <Text size="sm" tone="muted">
        {parts.length === 1 ? 'Peça do estoque com esse código:' : 'Peças do estoque com esse código:'}
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Peças do estoque com esse código" style={LIST_STYLE}>
        {parts.map((part) => (
          <Pressable
            key={part.id}
            accessibilityRole="radio"
            accessibilityLabel={`${part.code} ${part.name}, ${partFit(part)}`}
            accessibilityState={{ checked: part.id === chosen }}
            onPress={() => onChoose(part)}
            style={({ pressed }) => partStyle(theme, part.id === chosen, pressed)}
          >
            <View style={CODE_LINE_STYLE}>
              <NativeText style={codeStyle(theme)}>{part.code}</NativeText>
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
