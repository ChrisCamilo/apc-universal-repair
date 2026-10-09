/**
 * @format
 */

import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { mechanicIcon } from '@apc/shared/icons';
import { MODES, scales, STYLES, THEME_STORAGE_KEYS, themes, type Mode, type Style } from '@apc/shared/theme';
import { Icon } from '../src/Icon';
import { themeStorage, ThemeProvider, withAlpha } from '../src/theme';
import { WorkInProgress } from '../src/WorkInProgress';

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
 * Finds the host View with a style id.
 * @param tree Rendered tree.
 * @param testID The style id.
 * @returns The View test instance.
 */
function view(tree: ReactTestRenderer.ReactTestRenderer, testID: string): ReactTestRenderer.ReactTestInstance {
  return tree.root.find((n) => n.props.testID === testID && typeof n.type === 'string');
}

for (const style of STYLES) {
  for (const mode of MODES) {
    // Renders a screen still being built in one style and mode and checks the notice names it with the mechanic in
    // the accent, over the canvas tint of the dialogs' backdrop, and that the screen behind can't be pressed or read.
    test(`Mobile: the work-in-progress notice follows the ${style}/${mode} theme`, async () => {
      const { colors } = themes[style][mode];
      const tree = await mount(
        style,
        mode,
        <WorkInProgress label="Catálogo">
          <Pressable accessibilityRole="button" onPress={() => {}}>
            <Text>Escolher marca</Text>
          </Pressable>
        </WorkInProgress>,
      );
      const shown = tree.root.findAll((n) => n.type === Text).map((n) => n.props.children);
      expect(shown).toEqual(expect.arrayContaining(['A aba Catálogo ainda não está pronta', 'Estamos trabalhando nela. Volte em breve.']));
      expect(tree.root.find((n) => n.type === Icon && n.props.icon === mechanicIcon).props.color).toBe(colors.accent);
      expect(StyleSheet.flatten(view(tree, 'common.work-in-progress.overlay').props.style).backgroundColor).toBe(
        withAlpha(colors.canvas, scales.backdrop.opacity),
      );
      const content = view(tree, 'common.work-in-progress.content');
      expect(content.props.pointerEvents).toBe('none');
      expect(content.props.importantForAccessibility).toBe('no-hide-descendants');
      expect(content.props.accessibilityElementsHidden).toBe(true);
    });
  }
}
