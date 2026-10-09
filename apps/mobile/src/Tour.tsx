import { useContext, useEffect, useEffectEvent, useId, useMemo, useState, type ReactNode } from 'react';
import { View, useWindowDimensions, type HostInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { dimBoxes, useStyles } from './Tour.styles';
import { TourActionsContext, TourLayersContext, type TourLayerActions } from './tourContext';
import { Heading, Label, NumericReadout, Text } from './Typography';

// A step-by-step guide that points at parts of the screen, the same as the web. A ring marks the step's
// target and the rest of the screen dims around it; touches pass through, so the user does the step on the
// target itself. A card next to the target (pinned to the bottom on a phone) shows the part and the step
// count, the title, the text and the actions: Skip, "Fazer por mim" when the step can do itself, and Next on
// info-only steps. A step moves on by itself once its check passes, and goes back to the step it names when
// the user leaves it. The tour draws in the topmost TourLayer, so it stays above an open Dialog and usable.
// It follows the target as it moves, and has no motion to reduce.

type TourProps = {
  open: boolean;
  /** Called on Skip and on Finish; the owner closes the tour by setting `open` to false. */
  onClose: () => void;
  /** Steps in order; each one's target is a native view, e.g. a View's ref. */
  steps: readonly TourStep<HostInstance>[];
  /** Names of the tour's parts, for the card header, e.g. ["Criar um item", "Procurar e filtrar"]. */
  parts?: readonly string[];
};

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
  const { styles, ids } = useStyles();

  // Join the stack while mounted; the layer mounted last is on top.
  useEffect(() => {
    actions?.addLayer(id);
    return () => actions?.removeLayer(id);
  }, [actions, id]);

  return top === id && overlay ? (
    <View pointerEvents="box-none" style={styles.layer} testID={ids.layer}>
      {overlay}
    </View>
  ) : null;
}

export function Tour({ open, ...rest }: TourProps) {
  // Mounted only while open, so every opening starts again at the first step.
  return open ? <TourRun {...rest} /> : null;
}

function TourRun({ onClose, steps, parts = [] }: Omit<TourProps, 'open'>) {
  const { styles, ids } = useStyles();
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
      {spot && dimBoxes(spot, screen).map((box, i) => <View key={i} pointerEvents="none" style={[styles.dim, box]} testID={ids.dim} />)}
      {spot && (
        <View
          pointerEvents="none"
          style={[styles.spotlight, { left: spot.x, top: spot.y, width: spot.width, height: spot.height }]}
          testID={ids.spotlight}
        />
      )}
      <View
        accessibilityLabel={step.title}
        onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}
        style={[styles.card, { left: card.x, top: card.y, width: card.width }]}
        testID={ids.card}
      >
        <Panel style={styles.panel}>
          <View style={styles.header} testID={ids.header}>
            <Label tone="accent">{header.part}</Label>
            <NumericReadout tone="muted">{header.count}</NumericReadout>
          </View>
          <Heading level={4}>{step.title}</Heading>
          <View accessibilityLiveRegion="polite" style={styles.text} testID={ids.text}>
            <Text size="sm" tone="muted">
              {step.text}
            </Text>
          </View>
          <View style={styles.actions} testID={ids.actions}>
            {!last && (
              <Button variant="link" size="sm" onPress={onClose}>
                Pular tutorial
              </Button>
            )}
            <View style={styles.buttons} testID={ids.buttons}>
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
