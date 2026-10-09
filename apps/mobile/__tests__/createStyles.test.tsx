/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { THEME_STORAGE_KEYS, themes } from '@apc/shared/theme';
import { createStyles, type Styled } from '../src/styles/createStyles';
import { themeStorage, ThemeProvider, useTheme, type ActiveTheme } from '../src/theme';

// A recipe like PartResults': the box, its parts and a part's code are elements with a style id; a chosen part is a
// state of the part. Each build is counted.
const build = jest.fn((theme: ActiveTheme) => ({
  box: { borderColor: theme.colors.accent },
  code: { color: theme.colors.accent },
  part: { borderColor: 'transparent' },
  partChosen: { borderColor: theme.colors.accent, backgroundColor: theme.colors.panel },
}));
const useStyles = createStyles('catalog.part-results', { box: '', code: 'part.code', part: 'part' }, build);

// What the probe saw on its last render: the recipe's output and the active theme.
let seen: { styled: Styled<ReturnType<typeof build>, 'box' | 'code' | 'part'>; theme: ActiveTheme } | undefined;

/** Uses the recipe and keeps what it gave. */
function Probe() {
  seen = { styled: useStyles(), theme: useTheme() };
  return null;
}

beforeEach(async () => {
  await themeStorage.clear();
  await themeStorage.setMany({ [THEME_STORAGE_KEYS.style]: 'gt4', [THEME_STORAGE_KEYS.mode]: 'day' });
  build.mockClear();
});

// Renders the probe several times and checks the styles follow the theme's tokens and are built once for that style
// and mode; switching the mode builds them for the new one, and switching back reuses the first build.
test('Mobile: a recipe builds its styles once per style and mode', async () => {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
  });
  await ReactTestRenderer.act(async () => tree!.update(<ThemeProvider><Probe /></ThemeProvider>));
  const day = seen!.styled.styles;
  expect(day.partChosen).toEqual({ borderColor: themes.gt4.day.colors.accent, backgroundColor: themes.gt4.day.colors.panel });
  const builds = build.mock.calls.length;

  await ReactTestRenderer.act(async () => seen!.theme.setMode('night'));
  expect(seen!.styled.styles.box).toEqual({ borderColor: themes.gt4.night.colors.accent });
  expect(build).toHaveBeenCalledTimes(builds + 1);

  await ReactTestRenderer.act(async () => seen!.theme.setMode('day'));
  expect(seen!.styled.styles).toBe(day);
  expect(build).toHaveBeenCalledTimes(builds + 1);
  await ReactTestRenderer.act(async () => tree!.unmount());
});

// Checks the elements get their style ids, the component's own element the component's id and each other its path
// below it, while a state of an element (partChosen) gets none.
test("Mobile: a recipe gives its elements' style ids", async () => {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
  });
  expect(seen!.styled.ids).toEqual({
    box: 'catalog.part-results',
    code: 'catalog.part-results.part.code',
    part: 'catalog.part-results.part',
  });
  await ReactTestRenderer.act(async () => tree!.unmount());
});
