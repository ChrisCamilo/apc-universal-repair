import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOAST_DURATION_MS } from '@apc/shared/dialog';
import { ICON_SIZES } from '@apc/shared/icons';
import { TOAST_KIND_LOOKS, TOAST_KINDS, type ToastKind } from '@apc/shared/toast';
import { Icon } from './Icon';
import { KIND_STYLES, TOAST_OFFSET, useStyles } from './Toast.styles';
import { useTheme } from './theme';

// Short messages at the bottom of the screen, each of a kind, the same as the web: success ("Item adicionado"), error
// ("Não foi possível …"), info or warning, in a pill of the kind's color with its icon. Screen readers read an error
// or a warning out at once and a success or an info after what they are reading; the toast hides on its own after
// TOAST_DURATION_MS, and a new message replaces the one showing. A Modal sits above the rest of the app, so each open
// Dialog holds a ToastLayer, as it does a TourLayer: the toast draws in the last layer registered, the topmost, and
// at the root while no Dialog is open, so it stays above a dialog that shows one, such as the item form.

const ToastContext = createContext<Toasts>(toastsOf(() => {}));
const ToastLayersContext = createContext<ToastLayers | null>(null);

type Shown = { id: number; kind: ToastKind; message: string };
/** The toast showing, the layer on top, and how a ToastLayer joins or leaves the stack. */
type ToastLayers = {
  shown: Shown | null;
  top: string | null;
  addLayer: (id: string) => void;
  removeLayer: (id: string) => void;
};

/** Shows a toast of each kind, each taking the message. */
export type Toasts = Record<ToastKind, (message: string) => void>;

/**
 * Builds the function of each kind from one that shows a toast of any kind.
 * @param show Shows a message as a toast of a kind.
 * @returns A function per kind, e.g. `success("Item adicionado")`.
 */
function toastsOf(show: (kind: ToastKind, message: string) => void): Toasts {
  return Object.fromEntries(TOAST_KINDS.map((kind) => [kind, (message: string) => show(kind, message)])) as Toasts;
}

/**
 * Gets the functions that show a toast of each kind, e.g. `success("Item adicionado")` after a save or
 * `error("Não foi possível …")` when it fails.
 * @returns A function per kind, each taking the message to show.
 */
export function useToast(): Toasts {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const [layers, setLayers] = useState<string[]>([]);
  const show = useCallback((kind: ToastKind, message: string) => {
    setShown((prev) => ({ id: (prev?.id ?? 0) + 1, kind, message }));
    // An error or a warning interrupts what is being read; a success or an info waits for it (on iOS).
    if (TOAST_KIND_LOOKS[kind].urgent) {
      AccessibilityInfo.announceForAccessibility(message);
    } else {
      AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
    }
  }, []);
  const toasts = useMemo(() => toastsOf(show), [show]);

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
    <ToastContext.Provider value={toasts}>
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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!shown) {
    return null;
  }
  const look = TOAST_KIND_LOOKS[shown.kind];
  const keys = KIND_STYLES[shown.kind];
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion={look.urgent ? 'assertive' : 'polite'}
      style={[styles.spot, { bottom: insets.bottom + TOAST_OFFSET }]}
      testID={ids.spot}
    >
      <View style={[styles.pill, styles[keys.pill]]} testID={ids.pill}>
        <Icon icon={look.icon} size={ICON_SIZES.inline} color={colors[look.onColor]} />
        <Text style={[styles.label, styles[keys.label]]} testID={ids.label}>
          {shown.message}
        </Text>
      </View>
    </View>
  );
}
