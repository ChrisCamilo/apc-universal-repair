import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOAST_DURATION_MS } from '@apc/shared/dialog';
import { popShadow, scales } from '@apc/shared/theme';
import { fontFamily, useTheme, type ActiveTheme } from './theme';

// Short success messages ("Item adicionado", "Item excluído") at the bottom of the screen, the same as the
// web: a pill with the colors turned around, read out by screen readers, that hides on its own after
// TOAST_DURATION_MS; a new message replaces the one showing. A Modal sits above the rest of the app, so each open
// Dialog holds a ToastLayer, as it does a TourLayer: the toast draws in the last layer registered, the topmost, and
// at the root while no Dialog is open, so it stays above a dialog that shows one, such as the item form.

const SPOT_STYLE: ViewStyle = { position: 'absolute', left: scales.space.s4, right: scales.space.s4, alignItems: 'center' };
const ToastContext = createContext<(message: string) => void>(() => {});
const ToastLayersContext = createContext<ToastLayers | null>(null);

type Shown = { id: number; message: string };
/** The toast showing, the layer on top, and how a ToastLayer joins or leaves the stack. */
type ToastLayers = {
  shown: Shown | null;
  top: string | null;
  addLayer: (id: string) => void;
  removeLayer: (id: string) => void;
};

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
  const [shown, setShown] = useState<Shown | null>(null);
  const [layers, setLayers] = useState<string[]>([]);
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

  const addLayer = useCallback((id: string) => setLayers((prev) => [...prev, id]), []);
  const removeLayer = useCallback((id: string) => setLayers((prev) => prev.filter((layer) => layer !== id)), []);
  const state = useMemo(
    () => ({ shown, top: layers[layers.length - 1] ?? null, addLayer, removeLayer }),
    [shown, layers, addLayer, removeLayer],
  );

  return (
    <ToastContext.Provider value={show}>
      <ToastLayersContext.Provider value={state}>
        {children}
        {layers.length === 0 && <ToastPill shown={shown} />}
      </ToastLayersContext.Provider>
    </ToastContext.Provider>
  );
}

/** Draws the toast inside an open Dialog's Modal while it is the topmost layer. */
export function ToastLayer() {
  const layers = useContext(ToastLayersContext);
  const id = useId();
  const addLayer = layers?.addLayer;
  const removeLayer = layers?.removeLayer;

  // Join the stack while mounted; the layer mounted last is on top.
  useEffect(() => {
    addLayer?.(id);
    return () => removeLayer?.(id);
  }, [addLayer, removeLayer, id]);

  return layers?.top === id ? <ToastPill shown={layers.shown} /> : null;
}

function ToastPill({ shown }: { shown: Shown | null }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  if (!shown) {
    return null;
  }
  const { pill, label } = pillStyles(theme);
  return (
    <View pointerEvents="none" accessibilityLiveRegion="polite" style={[SPOT_STYLE, { bottom: insets.bottom + scales.space.s5 }]}>
      <View style={pill} testID="toast">
        <Text style={label}>{shown.message}</Text>
      </View>
    </View>
  );
}
