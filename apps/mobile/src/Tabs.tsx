import { useEffect, useState } from 'react';
import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import type { IconShape } from '@apc/shared/icons';
import { initialTab } from '@apc/shared/tabs';
import { scales } from '@apc/shared/theme';
import { Icon } from './Icon';
import { fontFamily, save, themeStorage, useTheme, withAlpha, type ActiveTheme } from './theme';

// Top-level navigation of the Dashboard, the same as the web: the selected tab takes the accent with an
// underline, which glows where the style has a glow; pressing shows what hover shows on the web. Pair it
// with useStoredTab to reopen on the last tab used, and render the selected tab's content below it.

const COUNT_BORDER_OPACITY = 0.45;
const ICON_SIZE = 15;
const LIST_STYLE: ViewStyle = { flexDirection: 'row', gap: scales.space.s1 };
const TAB_STYLE: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: scales.space.s2,
  paddingHorizontal: scales.space.s3,
  paddingVertical: scales.space.s3,
};
const UNDERLINE_HEIGHT = 2 * scales.hairline;

type TabItem<T extends string> = {
  id: T;
  label: string;
  /** Leading icon from @apc/shared/icons. */
  icon?: IconShape[];
  /** Badge after the label, e.g. the number of items in stock. */
  count?: number;
};
type TabsProps<T extends string> = {
  /** Accessible name of the tab list, e.g. "Seções do Dashboard". */
  label: string;
  tabs: TabItem<T>[];
  selected: T;
  onSelect: (id: T) => void;
};

/**
 * Styles the count badge: mono digits in a pill, accent-tinted on the selected tab.
 * @param theme Active theme.
 * @param selected Whether the badge's tab is selected.
 * @returns Style for the badge Text.
 */
function countStyle(theme: ActiveTheme, selected: boolean): TextStyle {
  const { colors } = theme;
  return {
    fontFamily: fontFamily(scales.monoFont, 500),
    fontSize: scales.fontSize.xs,
    fontVariant: ['tabular-nums'],
    color: selected ? colors.accent : colors.textMuted,
    borderWidth: scales.hairline,
    borderColor: selected ? withAlpha(colors.accent, COUNT_BORDER_OPACITY) : colors.hairline,
    borderRadius: scales.radiusPill,
    paddingHorizontal: scales.space.s2,
    overflow: 'hidden',
  };
}

/**
 * Styles a tab's label: display face in uppercase with the style's tracking.
 * @param theme Active theme.
 * @param color Label color for the tab's state.
 * @returns Style for the label Text.
 */
function labelStyle(theme: ActiveTheme, color: string): TextStyle {
  const fontSize = scales.fontSize.sm;
  return {
    fontFamily: fontFamily(theme.displayFont, 600),
    fontSize,
    letterSpacing: theme.displayTracking * fontSize,
    textTransform: 'uppercase',
    color,
  };
}

/**
 * Picks a tab's label and icon color: accent when selected, text while pressed, muted otherwise.
 * @param theme Active theme.
 * @param selected Whether the tab is selected.
 * @param pressed Whether the tab is being pressed (the mobile counterpart of hover).
 * @returns A token color.
 */
function tabColor(theme: ActiveTheme, selected: boolean, pressed: boolean): string {
  const { colors } = theme;
  return selected ? colors.accent : pressed ? colors.text : colors.textMuted;
}

/**
 * Draws the line under a tab: accent with the style's glow when selected, nothing otherwise.
 * @param theme Active theme.
 * @param selected Whether the tab is selected.
 * @returns Style for the underline View.
 */
function underlineStyle(theme: ActiveTheme, selected: boolean): ViewStyle {
  const glow: ViewStyle =
    selected && theme.glow
      ? {
          shadowColor: theme.colors.accent,
          shadowOpacity: theme.glow.opacity,
          shadowRadius: theme.glow.blur / 2,
          shadowOffset: { width: 0, height: 0 },
        }
      : {};
  return {
    position: 'absolute',
    left: scales.space.s3,
    right: scales.space.s3,
    bottom: -scales.hairline,
    height: UNDERLINE_HEIGHT,
    borderRadius: scales.radiusPill,
    backgroundColor: selected ? theme.colors.accent : 'transparent',
    ...glow,
  };
}

/**
 * Holds the selected tab and remembers it on the device, so the app reopens on the last tab used.
 * Storage is read once, on the first render.
 * @param storageKey AsyncStorage key, e.g. DASHBOARD_TAB_STORAGE_KEY from @apc/shared/tabs.
 * @param ids Tab ids in display order; the first opens when nothing valid was saved.
 * @returns The selected tab id (null until storage is read, so render nothing yet) and the setter that
 * also saves it.
 */
export function useStoredTab<T extends string>(storageKey: string, ids: readonly T[]): [T | null, (id: T) => void] {
  const [tab, setTab] = useState<T | null>(null);

  useEffect(() => {
    themeStorage
      .getItem(storageKey)
      .catch(() => null)
      .then((saved) => setTab((current) => current ?? initialTab(ids, saved)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the tabs are read once, with the stored tab
  }, [storageKey]);

  const select = (id: T) => {
    setTab(id);
    save(storageKey, id);
  };
  return [tab, select];
}

export function Tabs<T extends string>({ label, tabs, selected, onSelect }: TabsProps<T>) {
  const theme = useTheme();
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={LIST_STYLE}>
      {tabs.map((tab) => {
        const isSelected = tab.id === selected;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(tab.id)}
            style={TAB_STYLE}
          >
            {({ pressed }) => {
              const color = tabColor(theme, isSelected, pressed);
              return (
                <>
                  {tab.icon && <Icon icon={tab.icon} size={ICON_SIZE} color={color} />}
                  <Text style={labelStyle(theme, color)}>{tab.label}</Text>
                  {tab.count !== undefined && <Text style={countStyle(theme, isSelected)}>{tab.count}</Text>}
                  <View testID="tab-underline" style={underlineStyle(theme, isSelected)} />
                </>
              );
            }}
          </Pressable>
        );
      })}
    </View>
  );
}
