import { catalogFrom, type CatalogData, type CatalogEngine } from "./catalog.ts";

// The catalog a new database starts with, as GET /catalog answers it: four brands, their models, the generations,
// versions and years written so far, and four engines with their sheets. The migration that made the catalog tables
// (apps/api/prisma/migrations/20261106000000_catalog) inserts these same rows with these same ids, so the web demo, the
// E2E stand-ins and the tests of web and mobile answer what a new server holds. The ids are numbered in UUID form in
// the order below.

let count = 0;
/** The next id, in UUID form. */
const id = () => `ca7a1000-0000-4000-8000-${String(++count).padStart(12, "0")}`;

/**
 * A model with its generations.
 * @param name The vehicle model's name.
 * @param generations Its generations.
 * @returns The model.
 */
function model(name: string, generations: CatalogData["brands"][number]["models"][number]["generations"] = []) {
  return { id: id(), name, generations };
}

/**
 * An engine with its sheet.
 * @param sheet Its displacement in decilitres, cylinders, drive and summary.
 * @returns The engine.
 */
function engine(sheet: Omit<CatalogEngine, "id">): CatalogEngine {
  return { id: id(), ...sheet };
}

export const TEST_CATALOG_DATA: CatalogData = {
  brands: [
    {
      id: id(),
      name: "Chevrolet",
      mark: "CH",
      models: [
        model("Chevette", [{ id: id(), name: "Segunda geração", firstYear: 1983, lastYear: 1993, versions: [] }]),
        model("Opala", [
          { id: id(), name: "Primeira geração", firstYear: 1968, lastYear: 1974, versions: [] },
          { id: id(), name: "Segunda geração", firstYear: 1975, lastYear: 1979, versions: [] },
          {
            id: id(),
            name: "Terceira geração",
            firstYear: 1980,
            lastYear: 1992,
            versions: [
              { id: id(), name: "Comodoro", years: [] },
              {
                id: id(),
                name: "Diplomata",
                years: [
                  { id: id(), year: 1985, engines: [] },
                  {
                    id: id(),
                    year: 1986,
                    engines: [
                      engine({
                        displacementDl: 25,
                        cylinders: 4,
                        drive: "REAR",
                        summary:
                          "Opção de entrada do Diplomata, o quatro-cilindros 2.5 usa bloco de ferro fundido e comando no bloco, priorizando " +
                          "torque em baixa sobre giro alto. Pesa menos sobre o eixo dianteiro e deixa a direção mais leve.",
                      }),
                      engine({
                        displacementDl: 41,
                        cylinders: 6,
                        drive: "REAR",
                        summary:
                          "O seis-cilindros em linha de 4,1 L é a configuração mais lembrada do Opala e ajudou o Diplomata a virar sinônimo de " +
                          "conforto nos anos 80. Entrega torque farto desde a marcha lenta, com resposta longa e suave.",
                      }),
                    ],
                  },
                ],
              },
              { id: id(), name: "SS", years: [] },
            ],
          },
        ]),
        model("Monza"),
      ],
    },
    {
      id: id(),
      name: "Volkswagen",
      mark: "VW",
      models: [
        model("Fusca"),
        model("Gol", [
          {
            id: id(),
            name: "Primeira geração",
            firstYear: 1980,
            lastYear: 1994,
            versions: [
              {
                id: id(),
                name: "GTS",
                years: [
                  {
                    id: id(),
                    year: 1989,
                    engines: [
                      engine({
                        displacementDl: 18,
                        cylinders: 4,
                        drive: "FRONT",
                        summary:
                          "Versão esportiva do primeiro Gol, com o motor AP 1.8 a álcool ou gasolina, câmbio de cinco marchas e acerto de " +
                          "suspensão mais firme que o das versões de entrada.",
                      }),
                    ],
                  },
                ],
              },
            ],
          },
        ]),
        model("Santana"),
      ],
    },
    {
      id: id(),
      name: "Fiat",
      mark: "FI",
      models: [
        model("147"),
        model("Uno", [
          {
            id: id(),
            name: "Primeira geração",
            firstYear: 1984,
            lastYear: 2013,
            versions: [
              {
                id: id(),
                name: "Mille",
                years: [
                  {
                    id: id(),
                    year: 1991,
                    engines: [
                      engine({
                        displacementDl: 10,
                        cylinders: 4,
                        drive: "FRONT",
                        summary:
                          "O Uno de mil cilindradas que abriu a era dos carros populares no Brasil: motor pequeno e econômico, manutenção " +
                          "simples e peças fáceis de achar.",
                      }),
                    ],
                  },
                ],
              },
            ],
          },
        ]),
        model("Tempra"),
      ],
    },
    { id: id(), name: "Ford", mark: "FO", models: [model("Corcel"), model("Del Rey"), model("Escort")] },
  ],
};

/** The same catalog as the screens use it. */
export const TEST_CATALOG = catalogFrom(TEST_CATALOG_DATA);

/**
 * Finds the id of a brand or a node of the test catalog by its names.
 * @param brand The brand's name.
 * @param labels The names from the model down to the node, as the tree shows them; none for the brand itself.
 * @returns Its id.
 */
export function testCatalogId(brand: string, ...labels: string[]): string {
  const held = TEST_CATALOG.brands.find((each) => each.name === brand);
  let nodes = held?.models;
  let found = held?.id;
  for (const label of labels) {
    const node = nodes?.find((each) => each.label === label);
    found = node?.id;
    nodes = node?.children;
  }
  if (!found) {
    throw new Error(`No ${[brand, ...labels].join(" › ")} in the test catalog.`);
  }
  return found;
}

/** The engines of the test catalog, by a short name. */
export const TEST_ENGINES = {
  opala25: testCatalogId("Chevrolet", "Opala", "Terceira geração", "Diplomata", "1986", "2.5 L 4 cilindros"),
  opala41: testCatalogId("Chevrolet", "Opala", "Terceira geração", "Diplomata", "1986", "4.1 L 6 cilindros"),
  golGts: testCatalogId("Volkswagen", "Gol", "Primeira geração", "GTS", "1989", "1.8 L 4 cilindros"),
  unoMille: testCatalogId("Fiat", "Uno", "Primeira geração", "Mille", "1991", "1.0 L 4 cilindros"),
};
