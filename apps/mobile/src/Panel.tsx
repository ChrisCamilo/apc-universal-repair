import { createContext, useContext, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useDividerStyles, useStyles } from './Panel.styles';

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
  children: ReactNode;
};

/**
 * Tells whether the caller renders inside a Panel, so nested surfaces can adapt their corners and sheen.
 * @returns True when a Panel wraps the caller at any depth.
 */
export function useInPanel(): boolean {
  return useContext(PanelContext);
}

export function Panel({ raised = false, sheen, style, children }: PanelProps) {
  const { styles, ids } = useStyles();
  const nested = useInPanel();
  return (
    <View
      style={[styles.panel, nested && styles.panelNested, raised && styles.panelRaised, (sheen ?? !nested) && styles.panelSheen, style]}
      testID={ids.panel}
    >
      <PanelContext.Provider value={true}>{children}</PanelContext.Provider>
    </View>
  );
}

export function Divider() {
  const { styles, ids } = useDividerStyles();
  return <View style={styles.divider} testID={ids.divider} />;
}
