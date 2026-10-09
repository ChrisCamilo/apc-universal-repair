import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { styleIds, type StyleId } from '@apc/shared/style-ids';
import { useTheme, type ActiveTheme } from '../theme';

// The style recipes of the mobile app, the same idea as the web's recipe(): a component's styles are built from the
// active theme once per style and mode, kept in a StyleSheet and reused after, and come with the style ids of the
// elements they style. A component's recipe lives in its own *.styles.ts beside it. A key that names an element has a
// path in `slots` and so an id; a key for one of its states (partChosen, partPressed) styles an element that already
// has one, so it has none.

/** What a recipe's hook gives: the styles, and the style id of each element. */
export type Styled<Styles, Slot extends keyof Styles> = { styles: Styles; ids: Record<Slot, string> };

/**
 * Makes a component's style hook: its styles, built from the active theme once per style and mode, and its style ids.
 * @param id The component's style id, e.g. "catalog.part-results".
 * @param slots The path of each element's key inside the component, e.g. { box: '', code: 'part.code' }; '' is the
 * component's own element.
 * @param build Builds the styles from the theme's tokens.
 * @returns The hook, which gives the styles for the active theme and the ids.
 */
export function createStyles<
  Styles extends Record<keyof Styles, ViewStyle | TextStyle | ImageStyle>,
  Slot extends keyof Styles & string,
>(
  id: StyleId,
  slots: Record<Slot, string>,
  build: (theme: ActiveTheme) => Styles,
): () => Styled<Styles, Slot> {
  const ids = styleIds(id, slots);
  const built = new Map<string, Styles>();
  return function useStyles() {
    const theme = useTheme();
    const key = `${theme.style}/${theme.mode}`;
    let styles = built.get(key);
    if (!styles) {
      styles = StyleSheet.create(build(theme));
      built.set(key, styles);
    }
    return { styles, ids };
  };
}
