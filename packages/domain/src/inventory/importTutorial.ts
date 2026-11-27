import { catalog, type Locale } from "../platform/locale/locale.ts";
import { CSV_COLUMNS } from "./itemCsv.ts";
import type { TutorialStep } from "./inventoryTutorial.ts";
import type { Item } from "./items.ts";

// The guided tour of importing a CSV, shared by web and mobile, the same way as the Inventory tutorial (see
// inventoryTutorial.ts): it opens Importar Peças, takes the template, reads the tour's sample file of two test items,
// which the app carries, shows the preview, imports them and points at them in the list. Each platform describes its
// screen and the actions "Fazer por mim" takes; the steps here say when each one is done and where to go back when the
// user leaves one. The test items have part codes no real part has, so the import creates them and changes nothing
// else, and the tab deletes them when the tour ends or is skipped, as well as any left from a run that didn't end.

/** The tutorial, as the user menu's Tutoriais lists it. */
export const IMPORT_TUTORIAL = "inventory-import";
/** The part codes of the sample file's test items, which tell them apart in the stock. */
export const IMPORT_TUTORIAL_CODES = ["TUTORIAL-CSV-1", "TUTORIAL-CSV-2"] as const;
/** What the part codes of the test items start with, to find them with the search. */
export const IMPORT_TUTORIAL_SEARCH = "TUTORIAL-CSV";
/** The sample file's name. */
export const IMPORT_TUTORIAL_FILE = "pecas-de-teste.csv";
/** The sample file: the template's columns and two test items of one brand each, the second with no stock. */
export const IMPORT_TUTORIAL_CSV = [
  CSV_COLUMNS.join(","),
  `1,${IMPORT_TUTORIAL_CODES[0]},,Item de teste do CSV 1,Motor,Bosch,Volkswagen / Gol,3,1,T-1,"19,90",PRETO,,,,`,
  `2,${IMPORT_TUTORIAL_CODES[1]},,Item de teste do CSV 2,Motor,Bosch,Volkswagen / Gol,0,1,T-2,"29,90",PRETO,,,,`,
  "",
].join("\r\n");
/** The tour's name and each step's title and text, and what a phone's step says instead. */
const STEP_TEXTS = catalog<{
  title: string;
  steps: Record<ImportTutorialStepId, { title: string; text: string }>;
  phone: Partial<Record<ImportTutorialStepId, string>>;
}>(
  {
    title: "Importar um CSV",
    steps: {
      open: { title: "Abra Importar Peças", text: "Clique em Mais ações e escolha Importar Peças." },
      template: {
        title: "Pegue o modelo",
        text: "Clique em Baixar modelo: é uma planilha com as colunas na ordem certa e dois itens de exemplo, para preencher com as suas peças.",
      },
      choose: {
        title: "Escolha o arquivo",
        text: "Este tutorial traz um arquivo com duas peças de teste, no formato do modelo. Clique em Fazer por mim para escolhê-lo.",
      },
      review: {
        title: "Confira antes",
        text: "A prévia diz quantos itens estão prontos, o que a importação cria nas listas e mostra cada linha como vai ser salva. Uma linha com erro diz o porquê e fica de fora.",
      },
      import: { title: "Importe", text: "Clique em Importar 2 itens. Um aviso diz quantos itens foram criados e quantos atualizados." },
      list: { title: "Na lista", text: "As duas peças de teste estão no estoque, a segunda esgotada, sem nenhuma unidade." },
      end: {
        title: "Pronto!",
        text: "Para importar as suas peças, preencha o modelo e escolha o arquivo. As peças de teste saem do estoque quando o tutorial termina.",
      },
    },
    phone: {
      open: "Toque no ⋯ do Estoque e em Importar Peças.",
      template: "Pegue o modelo, em Baixar modelo ou Compartilhar modelo: uma planilha com as colunas na ordem certa e dois itens de exemplo.",
      choose: "Este tutorial traz um arquivo com duas peças de teste, no formato do modelo. Toque em Fazer por mim para escolhê-lo.",
      import: "Toque em Importar 2 itens. Um aviso diz quantos itens foram criados e quantos atualizados.",
    },
  },
  {
    title: "Importing a CSV",
    steps: {
      open: { title: "Open Import parts", text: "Click More actions and choose Import parts." },
      template: {
        title: "Get the template",
        text: "Click Download template: a spreadsheet with the columns in the right order and two sample items, to fill in with your parts.",
      },
      choose: {
        title: "Choose the file",
        text: "This tutorial brings a file with two test parts, in the template's format. Click Do it for me to choose it.",
      },
      review: {
        title: "Check first",
        text: "The preview says how many items are ready, what the import creates in the lists, and shows each row as it will be saved. A row with errors says why and is left out.",
      },
      import: { title: "Import", text: "Click Import 2 items. A notice says how many items were created and how many updated." },
      list: { title: "In the list", text: "The two test parts are in stock, the second out of stock, with no unit." },
      end: {
        title: "Done!",
        text: "To import your parts, fill in the template and choose the file. The test parts leave the stock when the tutorial ends.",
      },
    },
    phone: {
      open: "Tap the Inventory's ⋯ and Import parts.",
      template: "Get the template, with Download template or Share template: a spreadsheet with the columns in the right order and two sample items.",
      choose: "This tutorial brings a file with two test parts, in the template's format. Tap Do it for me to choose it.",
      import: "Tap Import 2 items. A notice says how many items were created and how many updated.",
    },
  },
);

/** The steps of the tour. */
export type ImportTutorialStepId = "open" | "template" | "choose" | "review" | "import" | "list" | "end";
/** A part of the screen a step points at: Mais ações, the dialog's parts, and the first test item's row (or card). */
export type ImportTutorialTarget = "more-actions" | "import-template" | "import-choose" | "import-preview" | "import-submit" | "row";
/** The Inventory tab as the tour sees it, read again on every check, and what it does for the user. */
export type ImportTutorialScreen<Target> = {
  /** Importar Peças while it is open: the part codes of the rows of the file it read, and how many rows have errors. */
  importer: { codes: readonly string[]; errors: number } | null;
  /** Whether the template was downloaded or shared since the tour started. */
  templateTaken: boolean;
  /** Every item in stock. */
  items: readonly Item[];
  /** Whether a change "Fazer por mim" or the user made is still on its way to the list; no step goes back meanwhile. */
  busy: boolean;
  /** Whether the tab has the phone layout. */
  phone: boolean;
  /** Finds a part of the screen. */
  target: (name: ImportTutorialTarget) => Target | null;
  /** Opens Importar Peças. */
  openImporter: () => void;
  /** Downloads or shares the template, as its button does. */
  takeTemplate: () => void;
  /** Has Importar Peças read the sample file, opening it first if needed. */
  chooseSample: () => void;
  /** Imports the sample file's items, says so as Importar does, closes Importar Peças and loads the list again. */
  importSample: () => void;
};

/**
 * Tells whether an item is one of the tour's test items, by its part codes.
 * @param item An item, maybe none.
 * @returns True for a test item.
 */
export function isImportTestItem(item: Item | undefined): boolean {
  return item?.brands.some((brand) => (IMPORT_TUTORIAL_CODES as readonly string[]).includes(brand.code)) ?? false;
}

/**
 * Names the tour, as the dialog and its card do.
 * @param locale The language.
 * @returns E.g. "Importar um CSV".
 */
export function importTutorialTitle(locale: Locale): string {
  return STEP_TEXTS[locale].title;
}

/**
 * Counts the tour's steps, as the tutorials' list says.
 * @returns How many steps it has.
 */
export function importTutorialStepCount(): number {
  return Object.keys(STEP_TEXTS["pt-BR"].steps).length;
}

/**
 * Lists the tour's steps for a screen: each with its texts, target, check, the step to go back to and what "Fazer por
 * mim" does. The texts follow the screen's layout as it is when they are listed.
 * @param screen Reads the screen as it is now.
 * @param locale The language of the texts.
 * @returns The steps in order, every one but "Pronto!" in part 1.
 */
export function importTutorialSteps<Target>(screen: () => ImportTutorialScreen<Target>, locale: Locale): TutorialStep<Target>[] {
  /** Whether Importar Peças read the sample file, every row ready. */
  const sampleRead = () => {
    const { importer } = screen();
    return importer !== null && importer.errors === 0 && IMPORT_TUTORIAL_CODES.every((code) => importer.codes.includes(code));
  };
  /** Whether both test items are in stock. */
  const imported = () => IMPORT_TUTORIAL_CODES.every((code) => screen().items.some((item) => item.brands.some((brand) => brand.code === code)));
  /** Goes back to opening Importar Peças when it closes. */
  const reopen = () => (screen().importer ? null : "open");

  const bindings: Record<ImportTutorialStepId, Omit<TutorialStep<Target>, "id" | "title" | "text" | "part">> = {
    open: { target: () => screen().target("more-actions"), done: () => screen().importer !== null, auto: () => screen().openImporter() },
    template: {
      target: () => screen().target("import-template"),
      done: () => screen().templateTaken,
      auto: () => screen().takeTemplate(),
      lost: reopen,
    },
    choose: { target: () => screen().target("import-choose"), done: sampleRead, auto: () => screen().chooseSample(), lost: reopen },
    review: {
      target: () => screen().target("import-preview"),
      lost: () => (!screen().importer ? "open" : sampleRead() ? null : "choose"),
    },
    import: {
      target: () => screen().target("import-submit"),
      done: () => imported() && screen().importer === null,
      auto: () => screen().importSample(),
      lost: () => (screen().importer || imported() ? null : "open"),
    },
    list: { target: () => screen().target("row") },
    end: {},
  };

  const texts = STEP_TEXTS[locale];
  const phone = screen().phone;
  return (Object.keys(bindings) as ImportTutorialStepId[]).map((id) => {
    const { lost, ...binding } = bindings[id];
    const { title, text } = texts.steps[id];
    return {
      id,
      title,
      text: (phone && texts.phone[id]) || text,
      ...(id !== "end" && { part: 1 }),
      ...binding,
      ...(lost && { lost: () => (screen().busy ? null : lost()) }),
    };
  });
}
