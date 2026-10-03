import { createContext, useContext, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { scales, sheenGradient } from '@apc/shared/theme';
import { useTheme, withAlpha, type ActiveTheme } from './theme';

// The surfaces the Dashboard nests several levels deep, the same as the web. Every panel pads its content,
// so a nested panel always sits inside its parent's padding and the two borders never touch or double up.
// A nested panel takes the smaller tile radius, to follow the curve of the corner around it, and leaves the
// top sheen to the outer panel, so the highlight isn't stacked.

const PanelContext = createContext(false);

type PanelProps = {
  /** Raised fill (panelRaised), for a surface that stands out from the one around it. */
  raised?: boolean;
  /** Top-down highlight; on by default for outer panels and off for nested ones. */
  sheen?: boolean;
  style?: ViewStyle;
  testID?: string;
  children: ReactNode;
};

/**
 * Draws a divider: one soft hairline with room above and below.
 * @param theme Active theme.
 * @returns Style for the divider View.
 */
function dividerStyle(theme: ActiveTheme): ViewStyle {
  return {
    height: scales.hairline,
    backgroundColor: softHairline(theme),
    marginVertical: scales.space.s2,
    marginHorizontal: scales.space.s1,
  };
}

/**
 * Picks the soft hairline of soft separators: panel borders and dividers.
 * @param theme Active theme.
 * @returns The hairline color at the soft opacity.
 */
export function softHairline(theme: ActiveTheme): string {
  return withAlpha(theme.colors.hairline, scales.hairlineSoft);
}

/**
 * Tells whether the caller renders inside a Panel, so nested surfaces can adapt their corners and sheen.
 * @returns True when a Panel wraps the caller at any depth.
 */
export function useInPanel(): boolean {
  return useContext(PanelContext);
}

export function Panel({ raised = false, sheen, style, testID, children }: PanelProps) {
  const theme = useTheme();
  const nested = useInPanel();
  const showSheen = sheen ?? !nested;
  const surface: ViewStyle = {
    backgroundColor: raised ? theme.colors.panelRaised : theme.colors.panel,
    backgroundImage: showSheen ? sheenGradient(theme.sheen, theme.mode) : undefined,
    borderWidth: scales.hairline,
    borderColor: softHairline(theme),
    borderRadius: nested ? theme.radiusTile : theme.radiusPanel,
    padding: scales.space.s3,
  };
  return (
    <View testID={testID} style={[surface, style]}>
      <PanelContext.Provider value={true}>{children}</PanelContext.Provider>
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View testID="divider" style={dividerStyle(theme)} />;
}
