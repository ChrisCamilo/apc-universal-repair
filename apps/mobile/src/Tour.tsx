import { useContext, useEffect, useEffectEvent, useId, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions, type HostInstance, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { popShadow, scales, spotlightDim } from '@apc/shared/theme';
import {
  cardPlacement,
  spotlightRect,
  stepHeader,
  stepIndex,
  TOUR_ADVANCE_DELAY_MS,
  TOUR_CHECK_MS,
  type TourRect,
  type TourStep,
} from '@apc/shared/tour';
import { Button } from './Button';
import { Panel } from './Panel';
import { useTheme, type ActiveTheme } from './theme';
import { TourActionsContext, TourLayersContext, type TourLayerActions } from './tourContext';
import { Heading, Label, NumericReadout, Text } from './Typography';

// A step-by-step guide that points at parts of the screen, the same as the web. A ring marks the step's
// target and the rest of the screen dims around it; touches pass through, so the user does the step on the
// target itself. A card next to the target (pinned to the bottom on a phone) shows the part and the step
// count, the title, the text and the actions: Skip, "Fazer por mim" when the step can do itself, and Next on
// info-only steps. A step moves on by itself once its check passes, and goes back to the step it names when
// the user leaves it. The tour draws in the topmost TourLayer, so it stays above an open Dialog and usable.
// It follows the target as it moves, and has no motion to reduce.

const ACTIONS_STYLE: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: scales.space.s2,
  paddingTop: scales.space.s1,
};
const ACTIONS_END_STYLE: ViewStyle = { flexDirection: 'row', gap: scales.space.s2, marginLeft: 'auto' };
const HEADER_STYLE: ViewStyle = { flexDirection: 'row', justifyContent: 'space-between', gap: scales.space.s2 };
const LAYER_STYLE: ViewStyle = StyleSheet.absoluteFill;
// The ring is two hairlines wide, as on the web.
const RING_WIDTH = scales.hairline * 2;

type TourProps = {
  open: boolean;
  /** Called on Skip and on Finish; the owner closes the tour by setting `open` to false. */
  onClose: () => void;
  /** Steps in order; each one's target is a native view, e.g. a View's ref. */
  steps: readonly TourStep<HostInstance>[];
  /** Names of the tour's parts, for the card header, e.g. ["Criar um item", "Procurar e filtrar"]. */
  parts?: readonly string[];
};

/**
 * Places the card's frame on screen.
 * @param card Left and top corner and width, from cardPlacement.
 * @returns Absolute style of the frame.
 */
function cardFrameStyle(card: { x: number; y: number; width: number }): ViewStyle {
  return { position: 'absolute', left: card.x, top: card.y, width: card.width };
}

/**
 * Styles the card around the step: the panel framed in the accent, lifted by the pop shadow.
 * @param theme Active theme.
 * @returns Style for the card's Panel.
 */
function cardStyle(theme: ActiveTheme): ViewStyle {
  return { gap: scales.space.s2, padding: scales.space.s4, borderColor: theme.colors.accent, boxShadow: popShadow() };
}

/**
 * Lays the dim around the spotlight as four boxes, above, below, left and right of it.
 * @param spot Box of the spotlight.
 * @param screen Size of the screen.
 * @returns Absolute styles of the four boxes.
 */
function dimBoxes(spot: TourRect, screen: { width: number; height: number }): ViewStyle[] {
  const below = spot.y + spot.height;
  const fill: ViewStyle = { position: 'absolute', backgroundColor: spotlightDim() };
  return [
    { ...fill, left: 0, top: 0, width: screen.width, height: Math.max(0, spot.y) },
    { ...fill, left: 0, top: below, width: screen.width, height: Math.max(0, screen.height - below) },
    { ...fill, left: 0, top: spot.y, width: Math.max(0, spot.x), height: spot.height },
    { ...fill, left: spot.x + spot.width, top: spot.y, width: Math.max(0, screen.width - spot.x - spot.width), height: spot.height },
  ];
}

/**
 * Styles the ring around the target: the accent in the tile radius, glowing where the style has a glow.
 * @param theme Active theme.
 * @param spot Box of the spotlight.
 * @returns Absolute style of the ring.
 */
function ringStyle(theme: ActiveTheme, spot: TourRect): ViewStyle {
  const glow: ViewStyle = theme.glow
    ? {
        shadowColor: theme.colors.accent,
        shadowOpacity: theme.glow.opacity,
        shadowRadius: theme.glow.blur / 2,
        shadowOffset: { width: 0, height: 0 },
      }
    : {};
  return {
    position: 'absolute',
    left: spot.x,
    top: spot.y,
    width: spot.width,
    height: spot.height,
    borderWidth: RING_WIDTH,
    borderColor: theme.colors.accent,
    borderRadius: theme.radiusTile,
    ...glow,
  };
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<ReactNode>(null);
  const [layers, setLayers] = useState<string[]>([]);
  const actions = useMemo<TourLayerActions>(
    () => ({
      show: (next) => setOverlay(next),
      addLayer: (id) => setLayers((prev) => [...prev, id]),
      removeLayer: (id) => setLayers((prev) => prev.filter((layer) => layer !== id)),
    }),
    [],
  );
  const state = useMemo(() => ({ overlay, top: layers[layers.length - 1] ?? null }), [overlay, layers]);
  return (
    <TourActionsContext.Provider value={actions}>
      <TourLayersContext.Provider value={state}>
        {children}
        <TourLayer />
      </TourLayersContext.Provider>
    </TourActionsContext.Provider>
  );
}

export function TourLayer() {
  const actions = useContext(TourActionsContext);
  const { overlay, top } = useContext(TourLayersContext);
  const id = useId();

  // Join the stack while mounted; the layer mounted last is on top.
  useEffect(() => {
    actions?.addLayer(id);
    return () => actions?.removeLayer(id);
  }, [actions, id]);

  return top === id && overlay ? (
    <View pointerEvents="box-none" style={LAYER_STYLE} testID="tour-layer">
      {overlay}
    </View>
  ) : null;
}

export function Tour({ open, ...rest }: TourProps) {
  // Mounted only while open, so every opening starts again at the first step.
  return open ? <TourRun {...rest} /> : null;
}

function TourRun({ onClose, steps, parts = [] }: Omit<TourProps, 'open'>) {
  const theme = useTheme();
  const screen = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tour = useContext(TourActionsContext);
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState<TourRect | null>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const step = steps[index];
  const last = index === steps.length - 1;
  const header = stepHeader(steps, index, parts);
  const spot = target && spotlightRect(target);
  const card = cardPlacement(target, cardHeight, { width: screen.width, height: screen.height - insets.bottom });

  /** Moves on to the next step, or finishes after the last one. */
  const next = () => {
    if (last) {
      onClose();
    } else {
      setIndex(index + 1);
    }
  };

  // Read the current step and props inside the timers without restarting them on every render.
  const measure = useEffectEvent(() => {
    const view = step.target?.();
    if (!view) {
      setTarget(null);
      return;
    }
    view.measureInWindow((x, y, width, height) =>
      setTarget((prev) =>
        prev && prev.x === x && prev.y === y && prev.width === width && prev.height === height ? prev : { x, y, width, height },
      ),
    );
  });
  const check = useEffectEvent((advance: () => void) => {
    if (step.done?.()) {
      advance();
      return;
    }
    const back = step.lost?.();
    if (back) {
      setIndex(stepIndex(steps, back));
    }
  });
  const finishStep = useEffectEvent(next);

  // Each step, measure the target and check the step: once it is done, wait a moment so the user sees it
  // worked, then move on; once the user has left it, go back to the step it names. Measuring on every check
  // follows the target as it scrolls or the screen turns.
  useEffect(() => {
    let advance: ReturnType<typeof setTimeout> | undefined;
    measure();
    const timer = setInterval(() => {
      measure();
      if (advance === undefined) {
        check(() => {
          advance = setTimeout(finishStep, TOUR_ADVANCE_DELAY_MS);
        });
      }
    }, TOUR_CHECK_MS);
    return () => {
      clearInterval(timer);
      clearTimeout(advance);
    };
  }, [index]);

  const overlay = (
    <>
      {spot && dimBoxes(spot, screen).map((box, i) => <View key={i} pointerEvents="none" style={box} testID="tour-dim" />)}
      {spot && <View pointerEvents="none" style={ringStyle(theme, spot)} testID="tour-spotlight" />}
      <View
        accessibilityLabel={step.title}
        onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}
        style={cardFrameStyle(card)}
        testID="tour-card"
      >
        <Panel style={cardStyle(theme)}>
          <View style={HEADER_STYLE}>
            <Label tone="accent">{header.part}</Label>
            <NumericReadout tone="muted">{header.count}</NumericReadout>
          </View>
          <Heading level={4}>{step.title}</Heading>
          <View accessibilityLiveRegion="polite">
            <Text size="sm" tone="muted">
              {step.text}
            </Text>
          </View>
          <View style={ACTIONS_STYLE}>
            {!last && (
              <Button variant="link" size="sm" onPress={onClose}>
                Pular tutorial
              </Button>
            )}
            <View style={ACTIONS_END_STYLE}>
              {step.auto && (
                <Button variant="secondary" size="sm" onPress={step.auto}>
                  Fazer por mim
                </Button>
              )}
              {!step.done && (
                <Button size="sm" onPress={next}>
                  {last ? 'Concluir' : 'Próximo'}
                </Button>
              )}
            </View>
          </View>
        </Panel>
      </View>
    </>
  );

  // Hand the overlay to the topmost layer on every render, and take it back when the tour closes.
  useEffect(() => {
    tour?.show(overlay);
  });
  useEffect(() => () => tour?.show(null), [tour]);

  return null;
}
