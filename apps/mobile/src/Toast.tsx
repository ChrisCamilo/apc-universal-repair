import { createContext, useCallback, useContext, useEffect, useEffectEvent, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ICON_SIZES } from '@apc/shared/icons';
import {
  readToastDuration,
  TOAST_DURATION,
  TOAST_DURATION_STORAGE_KEY,
  TOAST_FADE_MS,
  TOAST_KIND_LOOKS,
  TOAST_KINDS,
  type ToastKind,
} from '@apc/shared/toast';
import { Icon } from './Icon';
import { useReducedMotion } from './motion';
import { KIND_STYLES, TOAST_OFFSET, TOAST_RISE, useStyles } from './Toast.styles';
import { save, themeStorage, useTheme } from './theme';

// Short messages at the bottom of the screen, each of a kind, the same as the web: success ("Item adicionado"), error
// ("Não foi possível …"), info or warning, in a pill of the kind's color with its icon. Screen readers read an error
// or a warning out at once and a success or an info after what they are reading. The toast fades in rising a little,
// stays for the time the user picked (5 s unless they changed it in the bell's menu; saved on the device) and fades out; a new message takes the place of the one showing, which fades out under it,
// hidden from screen readers. With reduced motion they show and hide at once. Whoever listens through useToastFeed,
// such as the notifications history, hears each toast, and what useNotify sends, which goes to the history without a
// toast. A Modal sits above the rest of the app,
// so each open Dialog holds a ToastLayer, as it does a TourLayer: the toast draws in the last layer registered, the
// topmost, and at the root while no Dialog is open, so it stays above a dialog that shows one, such as the item form.

const ToastContext = createContext<Toasts>(toastsOf(() => {}));
const ToastFeedContext = createContext<(listener: ToastListener) => () => void>(() => () => {});
const NotifyContext = createContext<ToastListener>(() => {});
const ToastDurationContext = createContext<ToastDuration>({ ms: TOAST_DURATION.defaultMs, setMs: () => {} });
const ToastLayersContext = createContext<ToastLayers | null>(null);

/** A toast on screen; a leaving one is fading out. */
type Shown = { id: number; kind: ToastKind; message: string; leaving: boolean };
/** The toasts on screen, the layer on top, and how a ToastLayer joins or leaves the stack. */
type ToastLayers = {
  shown: Shown[];
  top: string | null;
  addLayer: (id: string) => void;
  removeLayer: (id: string) => void;
};

/** The time a toast stays on screen, in ms, and the way to change it, which also saves it on the device. */
export type ToastDuration = { ms: number; setMs: (ms: number) => void };
/** Hears a toast as it is shown. */
export type ToastListener = (kind: ToastKind, message: string) => void;
/** Shows a toast of each kind, each taking the message. */
export type Toasts = Record<ToastKind, (message: string) => void>;

/**
 * Marks a toast as leaving, so it fades out.
 * @param shown The toast.
 * @returns The same toast, leaving.
 */
function leave(shown: Shown): Shown {
  return shown.leaving ? shown : { ...shown, leaving: true };
}

/**
 * Builds the function of each kind from one that shows a toast of any kind.
 * @param show Shows a message as a toast of a kind.
 * @returns A function per kind, e.g. `success("Item adicionado")`.
 */
function toastsOf(show: (kind: ToastKind, message: string) => void): Toasts {
  return Object.fromEntries(TOAST_KINDS.map((kind) => [kind, (message: string) => show(kind, message)])) as Toasts;
}

/**
 * Gets the function that adds a notification to the bell's history without showing it as a toast, e.g. a warning found
 * as the Inventory opens.
 * @returns A function taking the kind and the message.
 */
export function useNotify(): ToastListener {
  return useContext(NotifyContext);
}

/**
 * Gets the time a toast stays on screen and the way to change it, e.g. for the bell's settings.
 * @returns The time in ms and its setter.
 */
export function useToastDuration(): ToastDuration {
  return useContext(ToastDurationContext);
}

/**
 * Hears every toast shown while the caller is mounted, e.g. to keep them in the notifications history.
 * @param listener Called with each toast's kind and message.
 */
export function useToastFeed(listener: ToastListener): void {
  const subscribe = useContext(ToastFeedContext);
  const hear = useEffectEvent(listener);
  useEffect(() => subscribe((kind, message) => hear(kind, message)), [subscribe]);
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
  const [shown, setShown] = useState<Shown[]>([]);
  const [layers, setLayers] = useState<string[]>([]);
  const listeners = useRef(new Set<ToastListener>());
  const [durationMs, setDurationMs] = useState<number>(TOAST_DURATION.defaultMs);
  const duration = useMemo<ToastDuration>(
    () => ({
      ms: durationMs,
      setMs: (ms) => {
        setDurationMs(ms);
        save(TOAST_DURATION_STORAGE_KEY, String(ms));
      },
    }),
    [durationMs],
  );
  const subscribe = useCallback((listener: ToastListener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);
  const notify = useCallback((kind: ToastKind, message: string) => listeners.current.forEach((listener) => listener(kind, message)), []);
  const show = useCallback((kind: ToastKind, message: string) => {
    // Show the message over the one it replaces, which leaves.
    setShown((list) => [...list.map(leave), { id: (list.at(-1)?.id ?? 0) + 1, kind, message, leaving: false }]);
    // An error or a warning interrupts what is being read; a success or an info waits for it (on iOS).
    if (TOAST_KIND_LOOKS[kind].urgent) {
      AccessibilityInfo.announceForAccessibility(message);
    } else {
      AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
    }
    notify(kind, message);
  }, [notify]);
  const toasts = useMemo(() => toastsOf(show), [show]);
  // The id of the toast showing, if one is, and those fading out, so a new one leaving starts their wait again.
  const current = shown.find((toast) => !toast.leaving)?.id;
  const fading = shown
    .filter((toast) => toast.leaving)
    .map((toast) => toast.id)
    .join();

  // Read the time picked once.
  useEffect(() => {
    let live = true;
    themeStorage
      .getItem(TOAST_DURATION_STORAGE_KEY)
      .catch(() => null)
      .then((saved) => live && setDurationMs(readToastDuration(saved)));
    return () => {
      live = false;
    };
  }, []);

  // Let the toast leave after the time picked; a new message, or a new time, starts the wait again.
  useEffect(() => {
    if (current === undefined) {
      return;
    }
    const timer = setTimeout(() => setShown((list) => list.map((toast) => (toast.id === current ? leave(toast) : toast))), durationMs);
    return () => clearTimeout(timer);
  }, [current, durationMs]);

  // Take the toasts that left out once they faded.
  useEffect(() => {
    if (!fading) {
      return;
    }
    const timer = setTimeout(() => setShown((list) => list.filter((toast) => !toast.leaving)), TOAST_FADE_MS);
    return () => clearTimeout(timer);
  }, [fading]);

  const addLayer = useCallback((id: string) => setLayers((prev) => [...prev, id]), []);
  const removeLayer = useCallback((id: string) => setLayers((prev) => prev.filter((layer) => layer !== id)), []);
  const state = useMemo(
    () => ({ shown, top: layers[layers.length - 1] ?? null, addLayer, removeLayer }),
    [shown, layers, addLayer, removeLayer],
  );

  return (
    <ToastContext.Provider value={toasts}>
      <ToastLayersContext.Provider value={state}>
        <ToastDurationContext.Provider value={duration}>
          <ToastFeedContext.Provider value={subscribe}>
            <NotifyContext.Provider value={notify}>{children}</NotifyContext.Provider>
          </ToastFeedContext.Provider>
        </ToastDurationContext.Provider>
        {layers.length === 0 && <ToastSpot shown={shown} />}
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

  return layers?.top === id ? <ToastSpot shown={layers.shown} /> : null;
}

/** The toasts' spot at the bottom of the screen, read out as the toast showing asks, with each toast on screen. */
function ToastSpot({ shown }: { shown: Shown[] }) {
  const { styles, ids } = useStyles();
  const insets = useSafeAreaInsets();
  if (shown.length === 0) {
    return null;
  }
  const current = shown.find((toast) => !toast.leaving);
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion={current && TOAST_KIND_LOOKS[current.kind].urgent ? 'assertive' : 'polite'}
      style={[styles.spot, { bottom: insets.bottom + TOAST_OFFSET }]}
      testID={ids.spot}
    >
      {shown.map((toast) => (
        <ToastPill key={toast.id} toast={toast} />
      ))}
    </View>
  );
}

/**
 * A toast's pill: the kind's icon and the message, in the kind's colors. It fades in rising a little, and fades out
 * under the toast taking its place, hidden from screen readers, while it leaves.
 */
function ToastPill({ toast }: { toast: Shown }) {
  const { styles, ids } = useStyles();
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  // 0 while hidden, 1 while shown.
  const fade = useRef(new Animated.Value(0)).current;
  const look = TOAST_KIND_LOOKS[toast.kind];
  const keys = KIND_STYLES[toast.kind];

  // Fade in once shown and out while leaving, or switch at once with reduced motion.
  useEffect(() => {
    const to = toast.leaving ? 0 : 1;
    if (reduced) {
      fade.setValue(to);
      return;
    }
    const animation = Animated.timing(fade, { toValue: to, duration: TOAST_FADE_MS, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [fade, reduced, toast.leaving]);

  return (
    <Animated.View
      importantForAccessibility={toast.leaving ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={toast.leaving}
      style={[
        styles.pill,
        styles[keys.pill],
        toast.leaving && styles.pillLeaving,
        { opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [TOAST_RISE, 0] }) }] },
      ]}
      testID={ids.pill}
    >
      <Icon icon={look.icon} size={ICON_SIZES.inline} color={colors[look.onColor]} />
      <Text style={[styles.label, styles[keys.label]]} testID={ids.label}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}
