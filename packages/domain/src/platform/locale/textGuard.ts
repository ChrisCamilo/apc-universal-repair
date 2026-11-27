import ts from "typescript";

// The guard of where texts live (AGENTS.md, "Texts in both languages"): a text the user reads is written in a catalog,
// in both languages, never in a component. It reads a component file as TypeScript and finds a text that looks
// Portuguese: a string, a template's text or a JSX text with a letter only Portuguese writes (ã, ç, é…), a word only
// Portuguese has (excluir, salvar, para, nenhum…), or, in a text of more than one word, a short Portuguese word (de, da,
// ou…). It can't know every word, so a text it misses is still caught in review. A module's name and a literal type don't
// count.

/** A place where a component writes a Portuguese text. */
export type TextProblem = { line: number; text: string };

/** The letters English never writes and Portuguese does. */
const PORTUGUESE_LETTERS = /[ãõçáéíóúâêôàü]/i;
/** Words Portuguese has and English doesn't: the screens' verbs and the words that join a sentence. */
const PORTUGUESE_WORDS = new Set([
  "abrir",
  "adicionar",
  "agora",
  "ainda",
  "aqui",
  "cancelar",
  "criar",
  "depois",
  "editar",
  "entrar",
  "escolha",
  "escolher",
  "excluir",
  "fechar",
  "isso",
  "itens",
  "limpar",
  "mais",
  "mostrar",
  "nenhum",
  "nenhuma",
  "para",
  "pela",
  "pelo",
  "procure",
  "procurar",
  "remover",
  "sair",
  "salvar",
  "seu",
  "sua",
  "trocar",
  "uma",
  "voltar",
]);
/** Short Portuguese words that could be something else alone, found in a text of more than one word. */
const SHORT_WORDS = new Set(["aos", "da", "das", "de", "dos", "ou", "sem"]);

/**
 * Tells whether a text looks Portuguese.
 * @param text The text, as the file writes it.
 * @returns Whether it has a Portuguese letter or word, or, with more than one word, a short Portuguese word.
 */
export function looksPortuguese(text: string): boolean {
  if (PORTUGUESE_LETTERS.test(text)) {
    return true;
  }
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  return words.some((word) => PORTUGUESE_WORDS.has(word) || (words.length > 1 && SHORT_WORDS.has(word)));
}

/**
 * Finds the Portuguese texts a component file writes.
 * @param source The file's text.
 * @returns Each text that looks Portuguese, with its line.
 */
export function findTextProblems(source: string): TextProblem[] {
  const file = ts.createSourceFile("component.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const problems: TextProblem[] = [];

  /** Notes a text that looks Portuguese, at its line. */
  const check = (node: ts.Node, text: string) => {
    if (looksPortuguese(text)) {
      problems.push({ line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1, text: text.trim() });
    }
  };

  /** Visits a node and what it holds, but for a module's name and a literal type. */
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isLiteralTypeNode(node)) {
      return;
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      check(node, node.text);
    } else if (ts.isTemplateExpression(node)) {
      check(node, [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(" "));
    } else if (ts.isJsxText(node)) {
      check(node, node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return problems;
}
