import assert from "node:assert/strict";
import { test } from "node:test";
import { findStyleProblems } from "./styleGuard.ts";

/**
 * Reads the lines a source breaks the conventions on.
 * @param source A component file's text.
 * @param platform The platform it is written for.
 * @returns The lines with a problem.
 */
function lines(source: string, platform: "mobile" | "web"): number[] {
  return findStyleProblems(source, platform).map((problem) => problem.line);
}

// Checks a web component that takes its classes, ids and runtime styles from its recipe passes, recipe variants and
// conditions on strings included, and so does a design-system component styled by a slot without an id.
test("Shared: the style guard passes a web component written by the conventions", () => {
  const source = `
    export function Viewer({ side }) {
      const { classes, ids } = viewer()
      return (
        <div className={classes.base()} data-testid={ids.base} style={viewerBox()}>
          <button className={classes.nav({ side: 'prev' })} data-testid={side === 'prev' ? ids.previous : ids.nav} />
          <Panel className={classes.panel()} />
        </div>
      )
    }`;
  assert.deepEqual(lines(source, "web"), []);
});

// Checks the guard finds, on web, classes and an id written by hand, a style object, and an HTML element with classes
// but no id, each on its own line.
test("Shared: the style guard finds hand-written classes, ids and styles on web", () => {
  const source = [
    "export function Bad({ on }) {",
    "  const { classes } = bad()",
    "  return (",
    "    <div>",
    '      <span className="grid gap-2" data-testid={ids.a} />',
    "      <span className={on ? 'text-accent' : classes.b()} data-testid={ids.b} />",
    '      <span className={classes.c()} data-testid="c" />',
    "      <span className={classes.d()} data-testid={ids.d} style={{ width: 4 }} />",
    "      <span className={classes.e()} />",
    "    </div>",
    "  )",
    "}",
  ].join("\n");
  assert.deepEqual(lines(source, "web"), [5, 6, 7, 8, 9]);
});

// Checks a mobile component passes when its React Native elements carry their styles and ids from the recipe, with
// runtime values after the recipe styles in an array, while its own components and unstyled views need no id.
test("Shared: the style guard passes a mobile component written by the conventions", () => {
  const source = `
    import { Text as NativeText, View } from 'react-native';
    export function Card({ top }) {
      const { styles, ids } = useStyles();
      return (
        <View style={[styles.card, { top }]} testID={ids.card}>
          <NativeText style={styles.name} testID={ids.name} />
          <Panel style={styles.panel} />
          <View ref={target} collapsable={false} />
        </View>
      );
    }`;
  assert.deepEqual(lines(source, "mobile"), []);
});

// Checks the guard finds, on mobile, a style object, a React Native element (even under another name) with a style but
// no testID, and a testID written by hand.
test("Shared: the style guard finds hand-written styles and ids on mobile", () => {
  const source = [
    "import { Text as NativeText, View } from 'react-native';",
    "export function Bad() {",
    "  const { styles, ids } = useStyles();",
    "  return (",
    "    <View style={styles.box} testID={ids.box}>",
    "      <View style={{ flex: 1 }} testID={ids.a} />",
    "      <NativeText style={styles.name} />",
    '      <View style={styles.c} testID="c" />',
    "    </View>",
    "  );",
    "}",
  ].join("\n");
  assert.deepEqual(lines(source, "mobile"), [6, 7, 8]);
});
