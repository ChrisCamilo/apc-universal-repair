import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { parseCsv } from "./itemCsv.ts";
import type { Item } from "./items.ts";
import {
  exportMercadoLivre,
  MERCADO_LIVRE_COLUMNS,
  MERCADO_LIVRE_TITLE_MAX,
  mercadoLivreDescription,
  mercadoLivreExportName,
  mercadoLivreListings,
  mercadoLivrePhotoName,
  mercadoLivreSummary,
  mercadoLivreTitle,
  mercadoLivreVehicle,
} from "./mercadoLivreCsv.ts";
import { testItem } from "./testItems.ts";

// Three items as the API sends them: one with every field and two photos, fitting a generation with its version; one
// fitting any vehicle, with a code a file name can't hold; and one made by three brands, one with no stock and one
// under R$ 8,00.
const STOCK: Item[] = [
  testItem({
    code: "BP-1020",
    name: "Pastilha de freio",
    partBrand: "Cobreq",
    vehicleBrand: "Chevrolet",
    vehicleModel: "Monza",
    firstYear: 1985,
    lastYear: 1990,
    version: "1.6 GLX",
    position: "D",
    side: "Ambos",
    color: "AZUL-MARINHO",
    quantity: 4,
    unitPriceCents: 123456,
    originalCodes: ["52098472", "52098473"],
    material: "Cerâmica",
    description: "Com sensor; e alarme",
    photos: [
      { id: "00000000-0000-4000-8000-0000000000a1", url: "/photos/a1.webp?session=s&signature=x", thumbUrl: "/photos/a1-thumb.webp" },
      { id: "00000000-0000-4000-8000-0000000000a2", url: "/photos/a2.jpg?session=s&signature=y", thumbUrl: "/photos/a2-thumb.webp" },
    ],
  }),
  testItem({
    code: "W 712/95",
    name: "Lâmpada H4",
    partBrand: "Philips",
    vehicleBrand: "Universal",
    quantity: 10,
    unitPriceCents: 1990,
    photos: [{ id: "00000000-0000-4000-8000-0000000000b1", url: "/photos/b1.webp", thumbUrl: "/photos/b1-thumb.webp" }],
  }),
  testItem({
    name: "Filtro de ar",
    vehicles: [
      { vehicleBrand: "Volkswagen", vehicleModel: "Gol", firstYear: 2008, lastYear: null },
      { vehicleBrand: "Fiat", vehicleModel: null },
    ],
    side: "LE",
    brands: [
      { id: "00000000-0000-4000-8000-0000000000c1", partBrand: "Mann", code: "C 2433", color: "N/A", location: "A-4", quantity: 3, unitPriceCents: 4990, photos: [] },
      { id: "00000000-0000-4000-8000-0000000000c2", partBrand: "Tecfil", code: "ARL 4433", color: "N/A", location: "A-5", quantity: 0, unitPriceCents: 3290, photos: [] },
      { id: "00000000-0000-4000-8000-0000000000c3", partBrand: "Wega", code: "FAP 1", color: "N/A", location: null, quantity: 2, unitPriceCents: 799, photos: [] },
    ],
  }),
];

afterEach(() => mock.restoreAll());

/**
 * Reads the listings' CSV back into rows, by column name.
 * @param csv The listings' CSV, as written.
 * @returns Each listing's cells, by column.
 */
function listings(csv: string): Record<string, string>[] {
  const [header, ...rows] = parseCsv(csv.replace(/^﻿/, ""), ";").map((record) => record.cells);
  return rows.map((cells) => Object.fromEntries(header.map((name, index) => [name, cells[index]])));
}

// Writes the stock and checks the file: a byte-order mark and the columns in Mercado Livre's words, semicolon
// separated, and one row for each brand with stock and a price of R$ 8,00 or more, with its values in Mercado Livre's
// words; a value with a semicolon or a line break reads back whole.
test("Shared: the listings have a row for each brand Mercado Livre takes, in its words", () => {
  const { csv, count, skipped } = mercadoLivreListings(STOCK);
  assert.ok(csv.startsWith(`﻿${MERCADO_LIVRE_COLUMNS.join(";")}\r\n`));
  assert.ok(csv.endsWith("\r\n"));
  const rows = listings(csv);
  assert.deepEqual([count, skipped], [3, 2]);
  assert.deepEqual(
    rows.map((row) => row.SKU),
    ["BP-1020", "W 712/95", "C 2433"],
  );
  assert.deepEqual(
    { ...rows[0], Descrição: "" },
    {
      Título: "Pastilha de freio Cobreq BP-1020 Chevrolet Monza",
      Condição: "Novo",
      Marca: "Cobreq",
      "Número de peça": "BP-1020",
      SKU: "BP-1020",
      "Códigos OEM": "52098472, 52098473",
      Estoque: "4",
      "Preço [R$]": "1234,56",
      Posição: "Dianteira",
      Lado: "Esquerdo e direito",
      Cor: "Azul-marinho",
      Material: "Cerâmica",
      "Veículos compatíveis": "Chevrolet Monza 1985-1990 1.6 GLX",
      Descrição: "",
      Fotos: "BP-1020-1.webp, BP-1020-2.jpg",
    },
  );
  assert.equal(rows[0].Descrição, mercadoLivreDescription(STOCK[0], STOCK[0].brands[0]));
  assert.deepEqual([rows[1].Posição, rows[1].Lado, rows[1].Cor, rows[1].Material, rows[1]["Veículos compatíveis"]], ["", "", "", "", "Universal"]);
  assert.equal(rows[1]["Preço [R$]"], "19,90");
  assert.equal(rows[2].Lado, "Esquerdo");
  assert.equal(rows[2]["Veículos compatíveis"], "Volkswagen Gol 2008 em diante; Fiat (todos os modelos)");
  assert.equal(rows[2].Fotos, "");
});

// Checks each brand's photos are named after its code and their order, the cover first, with their file's extension,
// a code's spaces and "/" replaced, and listed for the zip with their addresses as the API sends them.
test("Shared: the listings' photos are named after their brand's code", () => {
  assert.deepEqual(mercadoLivreListings(STOCK).photos, [
    { name: "BP-1020-1.webp", url: "/photos/a1.webp?session=s&signature=x" },
    { name: "BP-1020-2.jpg", url: "/photos/a2.jpg?session=s&signature=y" },
    { name: "W-712-95-1.webp", url: "/photos/b1.webp" },
  ]);
  assert.equal(mercadoLivrePhotoName("/ABC 1/", 2, "/photos/x.png"), "ABC-1-3.png");
  assert.equal(mercadoLivrePhotoName("ABC", 0, "blob:https://example.com/0c1f-77a2"), "ABC-1.jpg");
});

// Checks the title fits in 60 characters: whole when it fits, then without the vehicle, then without the code, and
// cut at the last whole word when the name alone is too long.
test("Shared: a listing's title drops the vehicle, then the code, to fit 60 characters", () => {
  const titleOf = (name: string, code = "BP-1020") => {
    const item = testItem({ name, code, partBrand: "Cobreq", vehicleBrand: "Volkswagen", vehicleModel: "Gol" });
    return mercadoLivreTitle(item, item.brands[0]);
  };
  assert.equal(titleOf("Pastilha de freio"), "Pastilha de freio Cobreq BP-1020 Volkswagen Gol");
  assert.equal(titleOf("Pastilha de freio dianteira cerâmica para uso"), "Pastilha de freio dianteira cerâmica para uso Cobreq BP-1020");
  assert.equal(titleOf("Pastilha de freio dianteira cerâmica com sensor"), "Pastilha de freio dianteira cerâmica com sensor Cobreq");
  const long = titleOf("Jogo de pastilhas de freio dianteiras cerâmicas com sensor de desgaste e alarme");
  assert.equal(long, "Jogo de pastilhas de freio dianteiras cerâmicas com sensor");
  assert.ok(long.length <= MERCADO_LIVRE_TITLE_MAX);
});

// Checks the description has one fact per line, leaving out what the item doesn't have, and ends with the vehicles.
test("Shared: a listing's description has a fact per line and the vehicles last", () => {
  assert.equal(
    mercadoLivreDescription(STOCK[0], STOCK[0].brands[0]),
    [
      "Pastilha de freio",
      "Marca: Cobreq",
      "Número de peça: BP-1020",
      "Códigos originais (OEM): 52098472, 52098473",
      "Material: Cerâmica",
      "Cor: Azul-marinho",
      "Com sensor; e alarme",
      "Posição: Dianteira · Lado: Esquerdo e direito",
      "Compatível com:",
      "- Chevrolet Monza 1985-1990 1.6 GLX",
    ].join("\n"),
  );
  assert.equal(
    mercadoLivreDescription(STOCK[1], STOCK[1].brands[0]),
    ["Lâmpada H4", "Marca: Philips", "Número de peça: W 712/95", "Compatível com:", "- Universal"].join("\n"),
  );
});

// Checks a vehicle reads with its years and version, from its first year on while it is still made, as its brand for
// any model, and as Universal for any vehicle.
test("Shared: a vehicle is written as Mercado Livre's buyers read it", () => {
  assert.equal(mercadoLivreVehicle({ vehicleBrand: "Chevrolet", vehicleModel: "Monza" }), "Chevrolet Monza");
  assert.equal(mercadoLivreVehicle({ vehicleBrand: "Fiat", vehicleModel: "Uno", firstYear: 2010, lastYear: null }), "Fiat Uno 2010 em diante");
  assert.equal(mercadoLivreVehicle({ vehicleBrand: "Fiat", vehicleModel: null }), "Fiat (todos os modelos)");
  assert.equal(mercadoLivreVehicle({ vehicleBrand: "Universal", vehicleModel: null }), "Universal");
});

// Exports through a stand-in for the API and checks it asks for the list query as given and writes the listings of
// every item it answers with; a failed request gives null.
test("Shared: the Mercado Livre export fetches every item of the list", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ items: STOCK, total: 3 }), { status: 200 }));
  assert.deepEqual(await exportMercadoLivre("/api", "sort=price&order=desc"), mercadoLivreListings(STOCK));
  assert.equal(fetch.mock.calls[0].arguments[0], "/api/items?sort=price&order=desc");
  mock.method(globalThis, "fetch", async () => new Response(null, { status: 500 }));
  assert.equal(await exportMercadoLivre("/api", ""), null);
});

// Words the file's name for the web and the phone, and the toast with and without brands left out.
test("Shared: the Mercado Livre export is worded for its file and toast", () => {
  assert.equal(mercadoLivreExportName(new Date(2026, 10, 23, 23, 30), "zip"), "mercado-livre-2026-11-23.zip");
  assert.equal(mercadoLivreExportName(new Date(2026, 0, 5), "csv"), "mercado-livre-2026-01-05.csv");
  assert.equal(mercadoLivreSummary({ count: 12, skipped: 0 }), "12 anúncios exportados.");
  assert.equal(mercadoLivreSummary({ count: 1, skipped: 1 }), "1 anúncio exportado · 1 marca ficou de fora (sem estoque ou preço abaixo de R$ 8,00).");
  assert.equal(mercadoLivreSummary({ count: 12, skipped: 3 }), "12 anúncios exportados · 3 marcas ficaram de fora (sem estoque ou preço abaixo de R$ 8,00).");
});
