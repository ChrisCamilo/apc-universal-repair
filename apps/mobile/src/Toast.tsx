import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOAST_DURATION_MS } from '@apc/shared/dialog';
import { popShadow, scales } from '@apc/shared/theme';
import { fontFamily, useTheme, type ActiveTheme } from './theme';

// Short success messages ("Item adicionado", "Item excluído") at the bottom of the screen, the same as the
// web: a pill with the colors turned around, read out by screen readers, that hides on its own after
// TOAST_DURATION_MS; a new message replaces the one showing.

const SPOT_STYLE: ViewStyle = { position: 'absolute', left: scales.space.s4, right: scales.space.s4, alignItems: 'center' };
const ToastContext = createContext<(message: string) => void>(() => {});

type Shown = { id: number; message: string };

/**
 * Styles the pill: the text color as the fill and the canvas as the letters, in the display face.
 * @param theme Active theme.
 * @returns Styles for the pill View and its Text.
 */
function pillStyles(theme: ActiveTheme): { pill: ViewStyle; label: TextStyle } {
  const fontSize = scales.fontSize.xs;
  return {
    pill: {
      borderRadius: scales.radiusPill,
      backgroundColor: theme.colors.text,
      paddingHorizontal: scales.space.s4,
      paddingVertical: scales.space.s2,
      boxShadow: popShadow(),
    },
    label: {
      fontFamily: fontFamily(theme.displayFont, 600),
      fontSize,
      letterSpacing: theme.displayTracking * fontSize,
      textTransform: 'uppercase',
      textAlign: 'center',
      color: theme.colors.canvas,
    },
  };
}

/**
 * Gets the function that shows a toast, e.g. "Item adicionado" after a save.
 * @returns A function taking the message to show.
 */
export function useToast(): (message: string) => void {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState<Shown | null>(null);
  const show = useCallback((message: string) => {
    setShown((prev) => ({ id: (prev?.id ?? 0) + 1, message }));
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  // Hide the toast after a while; a new message starts the wait again.
  useEffect(() => {
    if (!shown) {
      return;
    }
    const timer = setTimeout(() => setShown(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [shown]);

  const { pill, label } = pillStyles(theme);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {shown && (
        <View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[SPOT_STYLE, { bottom: insets.bottom + scales.space.s5 }]}
        >
          <View style={pill} testID="toast">
            <Text style={label}>{shown.message}</Text>
          </View>
        </View>
      )}
    </ToastContext.Provider>
  );
}
