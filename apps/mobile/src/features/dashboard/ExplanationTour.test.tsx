/**
 * @format
 */
import React, { useState } from 'react';
import { Pressable, Text, View, type HostInstance, type ViewStyle } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import { LOCALE_STORAGE_KEY } from '@apc/domain/locale';
import { EXPLANATIONS, explanationSteps, tutorialTitle } from '@apc/domain/tutorials';
import { MIN_MOBILE_HEIGHT, MIN_MOBILE_WIDTH } from '@apc/ui-spec/screens';
import { spotlightRect } from '@apc/ui-spec/tour';
import { LocaleProvider } from '../../app/locale';
import { themeStorage, ThemeProvider } from '../../app/theme';
import { TourProvider, tourTarget } from '../../components/Tour';
import { ExplanationTour } from './ExplanationTour';
import { TutorialsDialog } from './TutorialsDialog';
import { useTutorialsChoice } from './tutorialsContext';

// The explanations, started from Tutoriais over stand-in views marked with the targets the explanations point at, the
// same as the Dashboard holds them: each one shows its steps one after the other, the ring around each step's target,
// with Next only, and ends.

// A phone's screen with no notch.
const SAFE_AREA = { frame: { x: 0, y: 0, width: MIN_MOBILE_WIDTH, height: MIN_MOBILE_HEIGHT }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
// Every target the phone's explanations point at, each a stand-in view.
const TARGETS: string[] = [
  ...new Set(EXPLANATIONS.filter((explanation) => explanation.platforms.includes('phone' as never)).flatMap((explanation) => explanation.targets.filter((target) => target !== null))),
];

/**
 * Says where a stand-in view sits on screen, as measureInWindow reports it: each one a row of its own.
 * @param name The target.
 * @returns x, y, width and height.
 */
function rectOf(name: string): [number, number, number, number] {
  return [16, 60 + TARGETS.indexOf(name) * 50, 200, 40];
}

/**
 * Finds the host views with a testID.
 * @param tree Rendered tree.
 * @param testID The testID.
 * @returns The views.
 */
function views(tree: ReactTestRenderer.ReactTestRenderer, testID: string): ReactTestRenderer.ReactTestInstance[] {
  return tree.root.findAll((n) => n.props.testID === testID && typeof n.type === 'string');
}

/**
 * Reads the title of the step on the tour card.
 * @param tree Rendered tree.
 * @returns The card's accessible name, or null with no card.
 */
function cardTitle(tree: ReactTestRenderer.ReactTestRenderer): string | null {
  return views(tree, 'common.tour.card')[0]?.props.accessibilityLabel ?? null;
}

/**
 * Reads the texts on the tour card.
 * @param tree Rendered tree.
 * @returns Every text on it.
 */
function cardTexts(tree: ReactTestRenderer.ReactTestRenderer): unknown[] {
  return views(tree, 'common.tour.card')[0].findAllByType(Text).map((text) => text.props.children);
}

/**
 * Presses the pressable with an accessible name or visible text.
 * @param tree Rendered tree.
 * @param name Accessibility label, or the text inside.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, name: string) {
  const node = tree.root.find(
    (n) =>
      typeof n.type !== 'string' &&
      typeof n.props.onPress === 'function' &&
      (n.props.accessibilityLabel === name || n.findAll((c) => c.type === Text && c.props.children === name).length > 0),
  );
  await ReactTestRenderer.act(async () => node.props.onPress());
}

/**
 * Renders the stand-ins and Tutoriais, and waits for the theme and the language to load.
 * @returns The rendered tree.
 */
async function mount() {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={SAFE_AREA}>
        <ThemeProvider>
          <LocaleProvider>
            <TourProvider>
              <Harness />
            </TourProvider>
          </LocaleProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  return tree!;
}

beforeEach(async () => {
  await themeStorage.clear();
  // Jest's View doesn't lay out; each stand-in reports its row instead.
  jest
    .spyOn(View.prototype as unknown as HostInstance, 'measureInWindow')
    .mockImplementation(function (this: { props: { testID: string } }, done) {
      done(...rectOf(this.props.testID?.replace('target-', '') ?? ''));
    });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Runs every explanation the phone lists, the Estoque's, the Catálogo's, the Notificações' and the Modo offline's: each
// step shows its title, the explanation's name and its count, no "Fazer por mim", and the ring around its target, the
// step with no target without a ring; Concluir ends it.
test('Mobile: each explanation starts from Tutoriais, shows its steps on their targets and ends', async () => {
  const tree = await mount();
  for (const { id } of EXPLANATIONS.filter((explanation) => explanation.platforms.includes('phone' as never))) {
    await press(tree, 'Tutoriais');
    await press(tree, tutorialTitle(id, 'pt-BR'));
    const steps = explanationSteps(id, 'pt-BR');
    for (const [index, step] of steps.entries()) {
      expect(cardTitle(tree)).toBe(step.title);
      expect(cardTexts(tree)).toEqual(expect.arrayContaining([tutorialTitle(id, 'pt-BR'), `${index + 1} / ${steps.length}`, step.text]));
      expect(cardTexts(tree)).not.toContain('Fazer por mim');
      const rings = views(tree, 'common.tour.spotlight');
      if (step.target) {
        const [x, y, width, height] = rectOf(step.target);
        const ring: ViewStyle = Object.assign({}, ...[rings[0].props.style].flat(Infinity));
        expect({ x: ring.left, y: ring.top, width: ring.width, height: ring.height }).toEqual(spotlightRect({ x, y, width, height }));
      } else {
        expect(rings).toHaveLength(0);
      }
      await press(tree, index === steps.length - 1 ? 'Concluir' : 'Próximo');
    }
    expect(cardTitle(tree)).toBeNull();
  }
  await ReactTestRenderer.act(async () => tree.unmount());
});

// Starts an explanation and checks Pular tutorial ends it.
test('Mobile: an explanation can be skipped', async () => {
  const tree = await mount();
  await press(tree, 'Tutoriais');
  await press(tree, 'Trabalhar offline');
  expect(cardTitle(tree)).toBe('A cópia do estoque');
  await press(tree, 'Pular tutorial');
  expect(cardTitle(tree)).toBeNull();
  await ReactTestRenderer.act(async () => tree.unmount());
});

// With English chosen, starts an explanation and checks its card is written in English.
test('Mobile: an explanation reads in English', async () => {
  await themeStorage.setItem(LOCALE_STORAGE_KEY, 'en-US');
  const tree = await mount();
  await press(tree, 'Tutoriais');
  await press(tree, 'Settling a conflict');
  expect(cardTitle(tree)).toBe('A conflict');
  expect(cardTexts(tree)).toContain('Next');
  await ReactTestRenderer.act(async () => tree.unmount());
});

/** The Dashboard's part in an explanation: the marked views, Tutoriais, which starts what it picks, and the tour. */
function Harness() {
  const tutorials = useTutorialsChoice(true, () => {});
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)}>
        <Text>Tutoriais</Text>
      </Pressable>
      {TARGETS.map((name) => (
        <View key={name} ref={tourTarget(name)} collapsable={false} testID={`target-${name}`} />
      ))}
      <TutorialsDialog
        open={open}
        onClose={() => setOpen(false)}
        onStart={(id) => {
          setOpen(false);
          tutorials.start(id);
        }}
      />
      <ExplanationTour id={tutorials.explaining} onClose={tutorials.explained} />
    </>
  );
}
