import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOAST_DURATION_MS } from '@apc/shared/dialog';
import { TOAST_OFFSET, useStyles } from './Toast.styles';

// Short success messages ("Item adicionado", "Item excluído") at the bottom of the screen, the same as the
// web: a pill with the colors turned around, read out by screen readers, that hides on its own after
// TOAST_DURATION_MS; a new message replaces the one showing. A Modal sits above the rest of the app, so each open
// Dialog holds a ToastLayer, as it does a TourLayer: the toast draws in the last layer registered, the topmost, and
// at the root while no Dialog is open, so it stays above a dialog that shows one, such as the item form.

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
  const { styles, ids } = useStyles();
  const insets = useSafeAreaInsets();
  if (!shown) {
    return null;
  }
  return (
    <View pointerEvents="none" accessibilityLiveRegion="polite" style={[styles.spot, { bottom: insets.bottom + TOAST_OFFSET }]} testID={ids.spot}>
      <View style={styles.pill} testID={ids.pill}>
        <Text style={styles.label} testID={ids.label}>
          {shown.message}
        </Text>
      </View>
    </View>
  );
}
