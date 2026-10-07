/**
 * @format
 */

import React, { useState } from 'react';
import { AccessibilityInfo, Animated, LayoutAnimation, Text, type ViewStyle } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { MODES, scales, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import type { TreeNode } from '@apc/shared/tree';
import { themeStorage, ThemeProvider, withAlpha } from '../src/theme';
import { TreeView } from '../src/TreeView';

const LEAF = '4.1';
const OPALA: TreeNode = {
  id: 'opala',
  label: 'Opala',
  children: [
    { id: 'gen1', label: 'Primeira geração', detail: '1968–1974', children: [] },
    {
      id: 'gen3',
      label: 'Terceira geração',
      detail: '1980–1992',
      children: [
        {
          id: '1986',
          label: '1986',
          children: [
            { id: '2.5', label: '2.5 L 4 cilindros' },
            { id: LEAF, label: '4.1 L 6 cilindros' },
          ],
        },
      ],
    },
  ],
};
const MODELS: TreeNode[] = [{ id: 'chevette', label: 'Chevette', children: [{ id: 'chevette-2', label: 'Segunda geração' }] }, OPALA, { id: 'monza', label: 'Monza', children: [] }];

/**
 * Saves a style and mode, renders the element inside a ThemeProvider and waits for it to load them.
 * @param style Style to start on.
 * @param mode Mode to start on.
 * @param element Element to render.
 * @returns The rendered tree.
 */
async function mount(style: Style, mode: Mode, element: React.ReactElement) {
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: style, [THEME_STORAGE_KEYS.mode]: mode });
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });
  return tree!;
}

/**
 * Presses a row.
 * @param tree Rendered tree.
 * @param name The row's accessible name.
 */
async function press(tree: ReactTestRenderer.ReactTestRenderer, name: string) {
  await ReactTestRenderer.act(async () => row(tree, name).props.onPress());
}

/**
 * Finds a row by its accessible name.
 * @param tree Rendered tree.
 * @param name The row's accessible name.
 * @returns The row's Pressable.
 */
function row(tree: ReactTestRenderer.ReactTestRenderer, name: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.find((n) => typeof n.props.style === 'function' && n.props.role === 'treeitem' && n.props.accessibilityLabel === name);
}

/**
 * Lists the accessible names of the rows on screen, in order.
 * @param tree Rendered tree.
 * @returns Row names.
 */
function rows(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root.findAll((n) => typeof n.props.style === 'function' && n.props.role === 'treeitem').map((n) => n.props.accessibilityLabel);
}

/**
 * Reads a row's style at rest and the color of its label.
 * @param tree Rendered tree.
 * @param name The row's accessible name.
 * @returns The row style and the label's color.
 */
function look(tree: ReactTestRenderer.ReactTestRenderer, name: string): { frame: ViewStyle; color: string } {
  const node = row(tree, name);
  return { frame: node.props.style({ pressed: false }), color: node.findAllByType(Text)[0].props.style.color };
}

beforeEach(async () => {
  await themeStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders the tree open down to the selected engine in one style and mode, and checks the engine takes the
    // accent on its label and left rule over the tinted fill, glowing only where the style has a glow, while the
    // other rows stay clear in the text color and the years take the muted color.
    test(`Mobile: the tree follows the ${style}/${mode} theme`, async () => {
      const theme = themes[style][mode];
      const { colors } = theme;
      const tree = await mount(style, mode, <Sample />);
      const chosen = look(tree, '4.1 L 6 cilindros');
      expect(chosen.frame).toMatchObject({ borderLeftColor: colors.accent, backgroundColor: withAlpha(colors.accent, scales.accentSoft) });
      expect(chosen.color).toBe(colors.accent);
      expect(chosen.frame.shadowColor).toBe(theme.glow ? colors.accent : undefined);
      const other = look(tree, '2.5 L 4 cilindros');
      expect(other.frame).toMatchObject({ borderLeftColor: 'transparent', backgroundColor: 'transparent' });
      expect(other.color).toBe(colors.text);
      expect(row(tree, '2.5 L 4 cilindros').props.style({ pressed: true }).backgroundColor).toBe(colors.panelRaised);
      const years = row(tree, 'Terceira geração 1980–1992').findAllByType(Text)[1];
      expect(years.props.style.color).toBe(colors.textMuted);
    });
  }
}

// Checks the tree is named, opens on the path to the selected engine, its branches tell whether they are open,
// its leaves whether they are selected, the open ones hold a group, and an empty branch has no chevron, tells
// neither and can't be pressed. A divider stands between the top-level models.
test('Mobile: the tree has tree, treeitem and group semantics', async () => {
  const tree = await mount('eighties', 'night', <Sample />);
  const root = tree.root.find((n) => n.props.role === 'tree' && typeof n.type === 'string');
  expect(root.props.accessibilityLabel).toBe('Modelos Chevrolet');
  expect(rows(tree)).toEqual(['Chevette', 'Opala', 'Primeira geração 1968–1974', 'Terceira geração 1980–1992', '1986', '2.5 L 4 cilindros', '4.1 L 6 cilindros', 'Monza']);
  expect(row(tree, 'Chevette').props.accessibilityState).toEqual({ expanded: false, selected: undefined });
  expect(row(tree, 'Opala').props.accessibilityState).toEqual({ expanded: true, selected: undefined });
  expect(row(tree, '4.1 L 6 cilindros').props.accessibilityState).toEqual({ expanded: undefined, selected: true });
  expect(row(tree, '2.5 L 4 cilindros').props.accessibilityState.selected).toBe(false);
  expect(tree.root.findAll((n) => n.props.role === 'group' && typeof n.type === 'string')).toHaveLength(3);
  const monza = row(tree, 'Monza');
  expect(monza.props.accessibilityState).toEqual({ expanded: undefined, selected: undefined });
  expect(monza.props.disabled).toBe(true);
  expect(monza.findAll((n) => n.props.testID === 'tree-chevron')).toHaveLength(0);
  expect(row(tree, 'Chevette').findAll((n) => n.props.testID === 'tree-chevron' && typeof n.type === 'string')).toHaveLength(1);
  expect(tree.root.findAll((n) => n.props.testID === 'divider' && typeof n.type === 'string')).toHaveLength(2);
});

// Presses a closed branch, an open one and an engine, and checks the branches open and close with their
// children sliding in, and the engine goes to onSelect and becomes the selected one.
test('Mobile: presses open and close branches and select leaves', async () => {
  const configure = jest.spyOn(LayoutAnimation, 'configureNext');
  const onSelect = jest.fn();
  const tree = await mount('gt4', 'day', <Sample onSelect={onSelect} />);
  await press(tree, 'Chevette');
  expect(rows(tree).slice(0, 3)).toEqual(['Chevette', 'Segunda geração', 'Opala']);
  expect(configure).toHaveBeenCalledTimes(1);
  await press(tree, 'Terceira geração 1980–1992');
  expect(rows(tree)).not.toContain('1986');
  expect(configure).toHaveBeenCalledTimes(2);
  await press(tree, 'Terceira geração 1980–1992');
  await press(tree, '2.5 L 4 cilindros');
  expect(onSelect).toHaveBeenLastCalledWith('2.5');
  expect(row(tree, '2.5 L 4 cilindros').props.accessibilityState.selected).toBe(true);
  expect(row(tree, '4.1 L 6 cilindros').props.accessibilityState.selected).toBe(false);
  expect(configure).toHaveBeenCalledTimes(3);
});

// Opens a branch and checks its chevron turns over the motion duration, then turns reduced motion on and checks
// the next branch opens and its chevron turns at once, with no layout animation.
test('Mobile: the chevron turns and the children slide in, at once with reduced motion', async () => {
  const configure = jest.spyOn(LayoutAnimation, 'configureNext');
  const timing = jest.spyOn(Animated, 'timing');
  const tree = await mount('bmw90', 'night', <Sample />);
  await press(tree, 'Chevette');
  expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, duration: scales.motion.durationMs }));
  expect(configure).toHaveBeenCalledTimes(1);

  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  configure.mockClear();
  timing.mockClear();
  const calm = await mount('bmw90', 'night', <Sample />);
  await press(calm, 'Chevette');
  expect(rows(calm)).toContain('Segunda geração');
  expect(configure).not.toHaveBeenCalled();
  expect(timing).not.toHaveBeenCalled();
});

// Gives a model a name too long for its row and checks it is cut short on one line, and that the tree scrolls
// inside the height its owner gives it.
test('Mobile: long labels stay on one line and the tree scrolls in its own height', async () => {
  const long: TreeNode = { id: 'bonanza', label: 'Bonanza cabine dupla de quatro portas e caçamba', children: [] };
  const tree = await mount('fiat90', 'day', <TreeView label="Modelos" nodes={[long]} onSelect={() => {}} style={{ maxHeight: 380 }} />);
  expect(row(tree, long.label).findAllByType(Text)[0].props.numberOfLines).toBe(1);
  const root = tree.root.find((n) => n.props.role === 'tree' && typeof n.type === 'string');
  expect(root.props.style).toMatchObject({ maxHeight: 380 });
  expect(root.props.nestedScrollEnabled).toBe(true);
});

// Points out a model and checks its row takes the accent like the selected leaf and is read out as "em destaque",
// while the rows around it stay clear.
test('Mobile: a pointed-out row takes the accent and is read out', async () => {
  const { colors } = themes.gt4.day;
  const tree = await mount('gt4', 'day', <TreeView label="Modelos" nodes={MODELS} onSelect={() => {}} highlighted="opala" />);
  const opala = look(tree, 'Opala');
  expect(opala.frame).toMatchObject({ borderLeftColor: colors.accent, backgroundColor: withAlpha(colors.accent, scales.accentSoft) });
  expect(opala.color).toBe(colors.accent);
  expect(row(tree, 'Opala').props.accessibilityValue).toEqual({ text: 'em destaque' });
  expect(look(tree, 'Chevette').frame.backgroundColor).toBe('transparent');
  expect(row(tree, 'Chevette').props.accessibilityValue).toBeUndefined();
});

function Sample({ onSelect }: { onSelect?: (id: string) => void }) {
  const [selected, setSelected] = useState(LEAF);
  return (
    <TreeView
      label="Modelos Chevrolet"
      nodes={MODELS}
      selected={selected}
      onSelect={(id) => {
        setSelected(id);
        onSelect?.(id);
      }}
    />
  );
}
