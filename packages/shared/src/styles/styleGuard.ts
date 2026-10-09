import ts from "typescript";

// The guard of the style conventions (AGENTS.md, "Styles"): a component's look lives in its recipe, never in its JSX,
// and every styled element carries the style id the recipe gives. It reads a component file as TypeScript and finds:
// - on both platforms, a test id written by hand (`data-testid="…"`, `testID="…"`) instead of the recipe's ids;
// - on web, classes written in the JSX (`className="…"`, or a string inside the className's expression, except as a
//   recipe's variant argument), a `style={{…}}` object, and an HTML element with classes but no data-testid;
// - on mobile, a `style={{…}}` object, and a React Native element with a style but no testID.
// Runtime values stay allowed: a style function's result on web (`style={viewerBox()}`) and an object after the recipe
// styles in a mobile style array (`[styles.card, { top }]`).

/** The platform a component file is written for, which sets the rules it follows. */
export type StylePlatform = "mobile" | "web";
/** A place where a file breaks the style conventions. */
export type StyleProblem = { line: number; message: string };

// What each platform names the style id prop.
const ID_PROPS: Record<StylePlatform, string> = { mobile: "testID", web: "data-testid" };

/**
 * Reads the names a file imports from React Native's packages, the elements whose style must carry a testID.
 * @param file The parsed file.
 * @returns The local names, e.g. View, Pressable, NativeText (Text imported under another name) or Animated.
 */
function nativeNames(file: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    const bindings = statement.importClause?.namedBindings;
    if (statement.moduleSpecifier.text.startsWith("react-native") && bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        if (!element.isTypeOnly) {
          names.add(element.name.text);
        }
      }
    }
  }
  return names;
}

/**
 * Tells whether an expression can give a string written in it: a class list or an id typed by hand. A call's
 * arguments, where a recipe takes its variants (`classes.nav({ side: 'prev' })`), and a condition's test
 * (`side === 'prev' ? ids.previous : undefined`) don't count, as their strings are never the value given.
 * @param node The expression, or a part of it.
 * @returns Whether it gives a string written in it.
 */
function writesString(node: ts.Node): boolean {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
    return true;
  }
  if (ts.isCallExpression(node)) {
    return writesString(node.expression);
  }
  if (ts.isConditionalExpression(node)) {
    return writesString(node.whenTrue) || writesString(node.whenFalse);
  }
  if (ts.isBinaryExpression(node)) {
    const operator = node.operatorToken.kind;
    if (operator === ts.SyntaxKind.AmpersandAmpersandToken) {
      return writesString(node.right);
    }
    const joins = [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.PlusToken];
    return joins.includes(operator) && (writesString(node.left) || writesString(node.right));
  }
  return ts.forEachChild(node, (child) => writesString(child) || undefined) ?? false;
}

/**
 * Finds where a component file breaks the style conventions of its platform.
 * @param source The file's text.
 * @param platform The platform it is written for.
 * @returns Each problem, with its line, in the order they appear.
 */
export function findStyleProblems(source: string, platform: StylePlatform): StyleProblem[] {
  const file = ts.createSourceFile("component.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const native = nativeNames(file);
  const idProp = ID_PROPS[platform];
  const problems: StyleProblem[] = [];

  /** Notes a problem at a node's line. */
  const report = (node: ts.Node, message: string) => {
    problems.push({ line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1, message });
  };

  /** Checks the props of one JSX element. */
  const checkElement = (element: ts.JsxOpeningElement | ts.JsxSelfClosingElement) => {
    const tag = element.tagName.getText(file);
    const props = new Map<string, ts.JsxAttribute>();
    for (const prop of element.attributes.properties) {
      if (ts.isJsxAttribute(prop)) {
        props.set(prop.name.getText(file), prop);
      }
    }
    const id = props.get(idProp);
    if (id?.initializer && writesString(id.initializer)) {
      report(id, `${idProp} written by hand on <${tag}>: use the id its recipe gives`);
    }
    const style = props.get("style")?.initializer;
    if (style && ts.isJsxExpression(style) && style.expression && ts.isObjectLiteralExpression(style.expression)) {
      report(style, `style object on <${tag}>: move it into the recipe, or a style function for runtime values`);
    }
    if (platform === "web") {
      const className = props.get("className");
      if (className?.initializer && writesString(className.initializer)) {
        report(className, `classes written on <${tag}>: move them into the recipe`);
      }
      // An HTML element (<div>, <span>…) is styled here; a component's className is styled by that component.
      if (className && !id && /^[a-z]/.test(tag)) {
        report(element, `<${tag}> has classes but no data-testid: write the recipe's id`);
      }
    } else if (props.has("style") && !id && native.has(tag.split(".")[0])) {
      report(element, `<${tag}> has a style but no testID: write the recipe's id`);
    }
  };

  /** Walks the file, checking every JSX element. */
  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      checkElement(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return problems;
}
