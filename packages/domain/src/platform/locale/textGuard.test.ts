import assert from "node:assert/strict";
import { test } from "node:test";
import { findTextProblems, looksPortuguese } from "./textGuard.ts";

// Checks a text with a Portuguese letter or a Portuguese word looks Portuguese at any length, one of several words with
// a short Portuguese word does too, and English, a class list, an id, a short word alone and an address don't.
test("Shared: the text guard tells a Portuguese text from the rest", () => {
  for (const text of ["Ações", "Não", "Excluir", "Excluir item", "Procure pelo nome", "Escolha uma marca", "Tente de novo"]) {
    assert.equal(looksPortuguese(text), true, text);
  }
  for (const text of ["Save changes", "grid gap-2 text-sm", "inventory.remove", "Mann", "de", "https://github.com/ChrisCamilo/apc-universal-repair", "Do it now"]) {
    assert.equal(looksPortuguese(text), false, text);
  }
});

// Reads a component that writes Portuguese in a string, a JSX text, a template and a prop, and checks the guard finds
// each, at its line.
test("Shared: the text guard finds Portuguese texts written in a component", () => {
  const source = [
    "export function Bad({ count }) {",
    "  const title = 'Excluir item'",
    "  return (",
    "    <Dialog title={title}>",
    "      <p>Essa ação não pode ser desfeita.</p>",
    "      <span>{`${count} itens para revisar`}</span>",
    '      <Button aria-label="Fechar o diálogo" />',
    "    </Dialog>",
    "  )",
    "}",
  ].join("\n");
  assert.deepEqual(
    findTextProblems(source).map(({ line, text }) => [line, text]),
    [
      [2, "Excluir item"],
      [5, "Essa ação não pode ser desfeita."],
      [6, "itens para revisar"],
      [7, "Fechar o diálogo"],
    ],
  );
});

// Reads a component that takes its texts from a catalog, with English and code strings, and checks the guard passes
// it; a module's name and a literal type written in Portuguese don't count either.
test("Shared: the text guard passes a component that reads its texts from a catalog", () => {
  const source = `
    import { INVENTORY_TEXTS } from '@apc/domain/inventory-texts'
    import { posição } from './posição.ts'
    type Side = 'Dianteiro' | 'Traseiro'
    export function Good({ locale, side }: { locale: Locale; side: Side }) {
      const texts = INVENTORY_TEXTS[locale]
      return (
        <Dialog title={texts.deleteTitle} data-testid="inventory.delete">
          <p className="text-sm">{texts.deleteBody(side)}</p>
          <a href="https://github.com/ChrisCamilo/apc-universal-repair/releases">{texts.allVersions}</a>
        </Dialog>
      )
    }`;
  assert.deepEqual(findTextProblems(source), []);
});
