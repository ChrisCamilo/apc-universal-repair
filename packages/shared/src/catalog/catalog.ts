import type { TreeNode } from "../tree/tree.ts";

// The vehicle catalog of the Catalog tab, mocked until the real data (EP-10): each brand's models as a tree, model →
// generation → version → year → engine, and each engine's sheet. Branches whose data is still to come are empty
// branches (see TreeNode), so every engine in a tree has a sheet. Engine ids are unique across brands, as the sheets
// are looked up by them.

/** The brands of the catalog, in the order of the rail, each with its model tree. */
export const CATALOG: readonly CatalogBrand[] = [
  {
    id: "chevrolet",
    name: "Chevrolet",
    models: [
      {
        id: "chevrolet-chevette",
        label: "Chevette",
        children: [{ id: "chevrolet-chevette-2", label: "Segunda geração", detail: "1983–1993", children: [] }],
      },
      {
        id: "chevrolet-opala",
        label: "Opala",
        children: [
          { id: "chevrolet-opala-1", label: "Primeira geração", detail: "1968–1974", children: [] },
          { id: "chevrolet-opala-2", label: "Segunda geração", detail: "1975–1979", children: [] },
          {
            id: "chevrolet-opala-3",
            label: "Terceira geração",
            detail: "1980–1992",
            children: [
              { id: "chevrolet-opala-3-comodoro", label: "Comodoro", children: [] },
              {
                id: "chevrolet-opala-3-diplomata",
                label: "Diplomata",
                children: [
                  { id: "chevrolet-opala-3-diplomata-1985", label: "1985", children: [] },
                  {
                    id: "chevrolet-opala-3-diplomata-1986",
                    label: "1986",
                    children: [
                      { id: "chevrolet-opala-diplomata-1986-2.5", label: "2.5 L 4 cilindros" },
                      { id: "chevrolet-opala-diplomata-1986-4.1", label: "4.1 L 6 cilindros" },
                    ],
                  },
                ],
              },
              { id: "chevrolet-opala-3-ss", label: "SS", children: [] },
            ],
          },
        ],
      },
      { id: "chevrolet-monza", label: "Monza", children: [] },
    ],
  },
  {
    id: "volkswagen",
    name: "Volkswagen",
    models: [
      { id: "volkswagen-fusca", label: "Fusca", children: [] },
      {
        id: "volkswagen-gol",
        label: "Gol",
        children: [
          {
            id: "volkswagen-gol-1",
            label: "Primeira geração",
            detail: "1980–1994",
            children: [
              {
                id: "volkswagen-gol-1-gts",
                label: "GTS",
                children: [
                  {
                    id: "volkswagen-gol-1-gts-1989",
                    label: "1989",
                    children: [{ id: "volkswagen-gol-gts-1989-1.8", label: "1.8 L 4 cilindros" }],
                  },
                ],
              },
            ],
          },
        ],
      },
      { id: "volkswagen-santana", label: "Santana", children: [] },
    ],
  },
  {
    id: "fiat",
    name: "Fiat",
    models: [
      { id: "fiat-147", label: "147", children: [] },
      {
        id: "fiat-uno",
        label: "Uno",
        children: [
          {
            id: "fiat-uno-1",
            label: "Primeira geração",
            detail: "1984–2013",
            children: [
              {
                id: "fiat-uno-1-mille",
                label: "Mille",
                children: [
                  {
                    id: "fiat-uno-1-mille-1991",
                    label: "1991",
                    children: [{ id: "fiat-uno-mille-1991-1.0", label: "1.0 L 4 cilindros" }],
                  },
                ],
              },
            ],
          },
        ],
      },
      { id: "fiat-tempra", label: "Tempra", children: [] },
    ],
  },
  {
    id: "ford",
    name: "Ford",
    models: [
      { id: "ford-corcel", label: "Corcel", children: [] },
      { id: "ford-del-rey", label: "Del Rey", children: [] },
      { id: "ford-escort", label: "Escort", children: [] },
    ],
  },
];
/** The sheet of each engine, by engine id. */
export const ENGINE_SHEETS: Readonly<Record<string, EngineSheet>> = {
  "chevrolet-opala-diplomata-1986-2.5": {
    title: "1986 · Chevrolet Opala Diplomata 2.5",
    specs: ["1986", "2.5 L", "4 CIL", "TRASEIRA"],
    summary:
      "Opção de entrada do Diplomata, o quatro-cilindros 2.5 usa bloco de ferro fundido e comando no bloco, priorizando " +
      "torque em baixa sobre giro alto. Pesa menos sobre o eixo dianteiro e deixa a direção mais leve.",
  },
  "chevrolet-opala-diplomata-1986-4.1": {
    title: "1986 · Chevrolet Opala Diplomata 4.1",
    specs: ["1986", "4.1 L", "6 CIL", "TRASEIRA"],
    summary:
      "O seis-cilindros em linha de 4,1 L é a configuração mais lembrada do Opala e ajudou o Diplomata a virar sinônimo de " +
      "conforto nos anos 80. Entrega torque farto desde a marcha lenta, com resposta longa e suave.",
  },
  "volkswagen-gol-gts-1989-1.8": {
    title: "1989 · Volkswagen Gol GTS 1.8",
    specs: ["1989", "1.8 L", "4 CIL", "DIANTEIRA"],
    summary:
      "Versão esportiva do primeiro Gol, com o motor AP 1.8 a álcool ou gasolina, câmbio de cinco marchas e acerto de " +
      "suspensão mais firme que o das versões de entrada.",
  },
  "fiat-uno-mille-1991-1.0": {
    title: "1991 · Fiat Uno Mille 1.0",
    specs: ["1991", "1.0 L", "4 CIL", "DIANTEIRA"],
    summary:
      "O Uno de mil cilindradas que abriu a era dos carros populares no Brasil: motor pequeno e econômico, manutenção " +
      "simples e peças fáceis de achar.",
  },
};

/** A brand of the catalog: its id, the name on its tile and its model tree. */
export type CatalogBrand = { id: string; name: string; models: TreeNode[] };
/** An engine's sheet: its title, the readouts under it and a short summary. */
export type EngineSheet = { title: string; specs: string[]; summary: string };

/**
 * Finds the first engine with a sheet in a model tree, depth first, to show when a brand opens.
 * @param nodes A brand's models, or any part of its tree.
 * @returns The engine's id, or undefined when none in the tree has a sheet yet.
 */
export function firstSheet(nodes: readonly TreeNode[]): string | undefined {
  for (const node of nodes) {
    if (ENGINE_SHEETS[node.id]) {
      return node.id;
    }
    const below = node.children && firstSheet(node.children);
    if (below) {
      return below;
    }
  }
  return undefined;
}
