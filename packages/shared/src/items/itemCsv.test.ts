import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import type { ItemLists } from "../lists/lists.ts";
import {
  CSV_COLUMNS,
  CSV_PHOTOS_COLUMN,
  CSV_TEMPLATE,
  csvExportName,
  exportedSummary,
  exportItems,
  exportScope,
  importedDetails,
  importedItems,
  importedSummary,
  importItems,
  itemImportSchema,
  ITEM_IMPORT_LIMIT,
  itemsCsv,
  newListNames,
  parseCsv,
  readItemsCsv,
  rowsSummary,
  type CsvItemRow,
} from "./itemCsv.ts";
import { ITEM_FORM_MESSAGES } from "./itemForm.ts";
import type { Item, ItemCreate } from "./items.ts";
import { testItem } from "./testItems.ts";

const HEADER = CSV_COLUMNS.join(",");
// The lists the API keeps: one of each, Volkswagen with the Gol.
const LISTS: ItemLists = {
  categories: [{ id: "motor", name: "Motor" }],
  partBrands: [{ id: "ngk", name: "NGK" }],
  vehicleBrands: [{ id: "vw", name: "Volkswagen" }],
  vehicleModels: [{ id: "gol", name: "Gol", vehicleBrandId: "vw" }],
};

// Three items as the API sends them: one with every field, a comma, quotes and two photos; one with nothing optional;
// and one made by two brands.
const STOCK: Item[] = [
  testItem({
    id: "00000000-0000-4000-8000-000000000001",
    code: "BP-1020",
    name: 'Pastilha de freio "cerâmica", dianteira',
    category: "Freios",
    partBrand: "Cobreq",
    vehicleBrand: "Volkswagen",
    vehicleModel: "Gol",
    position: "D",
    side: "Ambos",
    color: "Preto",
    location: "B-10",
    quantity: 4,
    minQuantity: 1,
    unitPriceCents: 123456,
    photos: [
      { id: "00000000-0000-4000-8000-0000000000a1", url: "/photos/a1.jpg", thumbUrl: "/photos/a1-thumb.webp" },
      { id: "00000000-0000-4000-8000-0000000000a2", url: "/photos/a2.png", thumbUrl: "/photos/a2-thumb.webp" },
    ],
  }),
  testItem({
    id: "00000000-0000-4000-8000-000000000002",
    code: "BKR6E",
    name: "Vela de ignição",
    category: "Motor",
    partBrand: "NGK",
    vehicleBrand: "Volkswagen",
    quantity: 0,
    unitPriceCents: 2490,
  }),
  testItem({
    id: "00000000-0000-4000-8000-000000000003",
    name: "Filtro de ar",
    category: "Motor",
    vehicleBrand: "Volkswagen",
    vehicleModel: "Gol",
    minQuantity: 3,
    brands: [
      { id: "00000000-0000-4000-8000-0000000000b1", partBrand: "Mann", code: "C 2433", color: "N/A", location: "A-4", quantity: 3, unitPriceCents: 4990, photos: [] },
      {
        id: "00000000-0000-4000-8000-0000000000b2",
        partBrand: "Tecfil",
        code: "ARL 4433",
        color: "N/A",
        location: "A-5",
        quantity: 5,
        unitPriceCents: 3290,
        photos: [{ id: "00000000-0000-4000-8000-0000000000b3", url: "/photos/b3.webp", thumbUrl: "/photos/b3-thumb.webp" }],
      },
    ],
  }),
];

afterEach(() => mock.restoreAll());

/**
 * Writes an item as the import reads it back: its own fields and its brands, without ids or photos.
 * @param item An item as the API sends it.
 * @returns The item as an import would send it.
 */
function createOf(item: Item): ItemCreate {
  return {
    name: item.name,
    category: item.category,
    vehicleBrand: item.vehicleBrand,
    vehicleModel: item.vehicleModel ?? "",
    minQuantity: item.minQuantity,
    position: item.position,
    side: item.side,
    brands: item.brands.map((brand) => ({
      partBrand: brand.partBrand,
      code: brand.code,
      quantity: brand.quantity,
      location: brand.location ?? "",
      unitPriceCents: brand.unitPriceCents,
      color: brand.color,
    })),
  };
}

/**
 * Reads a file and returns its rows, failing the test when the file can't be read.
 * @param text The file's text.
 * @returns The rows.
 */
function rows(text: string): CsvItemRow[] {
  const read = readItemsCsv(text, LISTS);
  assert.ok("rows" in read, "error" in read ? read.error : "");
  return read.rows;
}

// Reads rows with prices in a decimal comma, with thousands, a decimal point, without cents, at the limit and past it,
// and checks each is read in cents, a dot and a comma meaning the same, and only the one past the limit is refused.
test("Shared: CSV prices take a decimal comma or point, up to a million", () => {
  const prices = ["189,90", "1.234,56", "1,234.56", "189.9", "7.50", "42", "1000000", "1000000,01"];
  const text = [HEADER, ...prices.map((price, index) => `,A-${index},Junta,Motor,Mann,Volkswagen,,1,1,,"${price}",,,`)].join("\n");
  const read = rows(text);
  assert.deepEqual(
    read.map((row) => row.item.brands[0].unitPriceCents),
    [18990, 123456, 123456, 18990, 750, 4200, 100_000_000, 100_000_001],
  );
  assert.deepEqual(
    read.map((row) => row.errors),
    [[], [], [], [], [], [], [], [ITEM_FORM_MESSAGES.priceTooHigh]],
  );
});

// Splits records with quoted cells holding the separator, doubled quotes and a line break, CRLF line ends, and checks
// each record starts on its own line.
test("Shared: CSV records keep quoted separators, quotes and line breaks", () => {
  const records = parseCsv('a,"b,1","say ""hi"""\r\n"two\nlines",x\r\nlast', ",");
  assert.deepEqual(
    records.map((record) => record.cells),
    [["a", "b,1", 'say "hi"'], ["two\nlines", "x"], ["last"]],
  );
  assert.deepEqual(
    records.map((record) => record.line),
    [1, 2, 4],
  );
});

// Reads the template, comma separated, and checks its rows are valid with the price, quantities, an empty model, and
// position and side taken from the file, and the last two rows make one item of two brands.
test("Shared: the CSV template reads as an item of one brand and one of two", () => {
  const read = rows(CSV_TEMPLATE);
  assert.deepEqual(
    read.map((row) => row.errors),
    [[], [], []],
  );
  const [filter, pads] = read;
  assert.equal(filter.line, 2);
  assert.deepEqual(
    [filter.item.brands[0].code, filter.item.brands[0].unitPriceCents, filter.item.brands[0].quantity, filter.item.minQuantity, filter.item.vehicleModel],
    ["W 712/95", 3990, 8, 2, "Gol"],
  );
  assert.deepEqual([pads.item.vehicleModel, pads.item.position, pads.item.side, pads.item.brands[0].color], ["", "D", "Ambos", "N/A"]);
  assert.deepEqual(
    importedItems(read).map((item) => item.brands.map((brand) => [brand.partBrand, brand.code])),
    [[["Mann", "W 712/95"]], [["Cobreq", "BP-1020"], ["Fras-le", "PD/1020"]]],
  );
});

// Reads a semicolon-separated file with a BOM and its columns in another order, and checks the writing rule: codes
// uppercase, capitals on text, acronyms kept, and names already in the lists in their spelling.
test("Shared: a semicolon file is read with the writing rule and the lists' spelling", () => {
  const text = "﻿name;code;unit_price;category;part_brand;vehicle_brand;vehicle_model;location;color;position;side\n" +
    "vela xR3;ngk-b7;34,9;MOTOR;ngk;volkswagen;gol;a-2;preto;d;ld\n";
  const [row] = rows(text);
  assert.deepEqual(row.errors, []);
  assert.equal(row.group, "");
  assert.deepEqual(row.item, {
    name: "Vela xR3",
    category: "Motor",
    vehicleBrand: "Volkswagen",
    vehicleModel: "Gol",
    minQuantity: 0,
    position: "D",
    side: "LD",
    brands: [{ partBrand: "NGK", code: "NGK-B7", quantity: 0, location: "A-2", unitPriceCents: 3490, color: "Preto" }],
  });
});

// Reads rows with each kind of mistake and checks each one names its reasons, while a blank row is skipped; a code
// repeats in another case or with other separators too.
test("Shared: invalid CSV rows say why", () => {
  const text = [
    HEADER,
    ",,,,,,,,,,,,,",
    ",,Filtro,Motor,Mann,Volkswagen,,x,2.5,,0,,Cima,Meio",
    ",A-1,Junta,Motor,Mann,Volkswagen,,1,1,,abc,,,",
    ",a-1,Junta,Motor,Mann,Volkswagen,,1,1,,10,,,",
    ",A 1,Junta,Motor,Mann,Volkswagen,,1,1,,10,,,",
  ].join("\n");
  const [missing, wrong, repeated, spaced] = rows(text);
  assert.equal(missing.line, 3);
  assert.deepEqual(missing.errors, [
    ITEM_FORM_MESSAGES.code,
    ITEM_FORM_MESSAGES.priceInvalid,
    "Quantidade deve ser um número inteiro, como 4.",
    "Quantidade mínima deve ser um número inteiro, como 4.",
    "Posição deve ser D, T ou Ambos, ou ficar vazia.",
    "Lado deve ser LD, LE ou Ambos, ou ficar vazio.",
  ]);
  assert.deepEqual(wrong.errors, [ITEM_FORM_MESSAGES.priceInvalid]);
  assert.deepEqual(repeated.errors, ["Código repetido: já está na linha 4."]);
  assert.deepEqual(spaced.errors, ["Código repetido: já está na linha 4."]);
});

// Reads the rows of three items: one whose second row describes it otherwise, one whose second row repeats its part
// brand, and one whose rows are both fine; and checks the first two items' rows say why, every row of them, and only
// the third item goes to the import.
test("Shared: the rows of one item describe it the same way, each with its part brand", () => {
  const text = [
    HEADER,
    '1,N-1,Pastilha,Freios,Cobreq,Volkswagen,Gol,2,4,,"79,90",,D,',
    '1,N-2,Pastilha traseira,Freios,Fras-le,Volkswagen,Gol,1,4,,"94,90",,D,',
    '2,M-1,Filtro,Motor,Mann,Volkswagen,,1,1,,"10,00",,,',
    '2,M-2,filtro,MOTOR,mann,Volkswagen,,1,1,,"11,00",,,',
    '3,C-1,Junta,Motor,Mann,Volkswagen,,1,1,,"10,00",,,',
    '3,C-2,junta,motor,Victor Reinz,volkswagen,,2,1,,"12,00",,,',
  ].join("\n");
  const read = rows(text);
  assert.deepEqual(
    read.map((row) => row.errors),
    [
      ["Outra linha do item 1 tem erro."],
      ["O item 1 está descrito de outro jeito na linha 2."],
      ["Outra linha do item 2 tem erro."],
      ["Marca repetida no item 2: já está na linha 4."],
      [],
      [],
    ],
  );
  assert.deepEqual(
    importedItems(read).map((item) => [item.name, item.brands.map((brand) => brand.code)]),
    [["Junta", ["C-1", "C-2"]]],
  );
  assert.equal(rowsSummary(read), "1 item pronto para importar · 4 linhas com erro");
});

// Reads rows with quantities past the limit, a negative one and the limit itself, and checks only those past it and
// the negative one are refused, naming the column.
test("Shared: CSV quantities can't pass the limit", () => {
  const text = [
    HEADER,
    ",A-1,Junta,Motor,Mann,Volkswagen,,1000001,1000001,,10,,,",
    ",A-2,Junta,Motor,Mann,Volkswagen,,-2,0,,10,,,",
    ",A-3,Junta,Motor,Mann,Volkswagen,,1000000,1000000,,10,,,",
  ].join("\n");
  const [past, negative, limit] = rows(text);
  assert.deepEqual(past.errors, ["Quantidade deve ser no máximo 1.000.000.", "Quantidade mínima deve ser no máximo 1.000.000."]);
  assert.deepEqual(negative.errors, ["Quantidade deve ser um número inteiro, como 4."]);
  assert.deepEqual(limit.errors, []);
});

// Checks a file that can't be read at all says why: empty, missing columns, or only the header.
test("Shared: a CSV file without items or columns is refused", () => {
  assert.deepEqual(readItemsCsv("", LISTS), { error: "O arquivo está vazio." });
  assert.deepEqual(readItemsCsv("code,name\nA,B", LISTS), {
    error: "Faltam colunas no arquivo: category, part_brand, vehicle_brand, unit_price. Use o modelo.",
  });
  assert.deepEqual(readItemsCsv(`${HEADER}\n`, LISTS), { error: "O arquivo não tem itens, só o cabeçalho." });
});

// Lists the names the valid rows use that the lists don't hold, each once, leaving out invalid rows and the names
// the lists already have.
test("Shared: the names a CSV import creates are listed once", () => {
  const text = [
    HEADER,
    ",A,Junta,Motor,Mann,Volkswagen,Santana,,,,10,,,",
    ",B,Vela,Ignição,mann,Renault,Clio,,,,10,,,",
    ",C,Filtro,Ignicao,NGK,volkswagen,santana,,,,10,,,",
    ",D,Erro,Turbo,Cofap,Fiat,Uno,,,,0,,,",
  ].join("\n");
  assert.deepEqual(newListNames(rows(text), LISTS), {
    categories: ["Ignição"],
    partBrands: ["Mann"],
    vehicleBrands: ["Renault"],
    vehicleModels: [
      { vehicleBrand: "Volkswagen", name: "Santana" },
      { vehicleBrand: "Renault", name: "Clio" },
    ],
  });
});

// Sends the template with an invalid row and checks only the valid items go, the rows of one item as its brands,
// then that a failed import gives null.
test("Shared: an import sends the valid items only", async () => {
  const read = rows(`${CSV_TEMPLATE},,,,,,,,,,0,,,
`);
  const fetch = mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ created: 1, updated: 1 }), { status: 200 }));
  assert.deepEqual(await importItems("/api", read), { created: 1, updated: 1 });
  const [url, init] = fetch.mock.calls[0].arguments as unknown as [string, RequestInit];
  assert.equal(url, "/api/items/import");
  assert.deepEqual(
    (JSON.parse(String(init.body)).items as ItemCreate[]).map((item) => item.brands.map((brand) => brand.code)),
    [["W 712/95"], ["BP-1020", "PD/1020"]],
  );
  mock.method(globalThis, "fetch", async () => new Response(null, { status: 500 }));
  assert.equal(await importItems("/api", read), null);
});

// Checks the import request takes at least one item and at most the limit.
test("Shared: an import takes from one item up to the limit", () => {
  const [item] = importedItems(rows(CSV_TEMPLATE));
  assert.equal(itemImportSchema.safeParse({ items: [] }).success, false);
  assert.equal(itemImportSchema.safeParse({ items: [item] }).success, true);
  assert.equal(itemImportSchema.safeParse({ items: Array(ITEM_IMPORT_LIMIT + 1).fill(item) }).success, false);
});

// Words the preview's count of items and rows in error, an item's details line, and the toast of an import, in
// singular and plural.
test("Shared: the import is worded for the preview and the toast", () => {
  const read = rows(`${CSV_TEMPLATE},,,,,,,,,,0,,,
`);
  assert.equal(rowsSummary(read), "2 itens prontos para importar · 1 linha com erro");
  assert.equal(rowsSummary(read.slice(0, 1)), "1 item pronto para importar · 0 linhas com erro");
  assert.equal(importedDetails(read[0].item).replace(/\s/g, " "), "Motor · Mann · Volkswagen Gol · A-2 · R$ 39,90");
  assert.equal(importedSummary({ created: 3, updated: 1 }), "Importação concluída: 3 itens criados, 1 atualizado.");
  assert.equal(importedSummary({ created: 1, updated: 0 }), "Importação concluída: 1 item criado, 0 atualizados.");
});

// Writes the items without and with photos, and checks the header follows the template's columns, the photos column
// comes last only when asked, each brand is a row with its item's number, a value with a comma or quotes is quoted,
// the price has a decimal comma, what doesn't apply says N/A, and the file starts with a byte-order mark and ends each
// line in CRLF.
test("Shared: the export writes the import's columns, a row per brand, with photos only when asked", () => {
  const plain = itemsCsv(STOCK, { photos: false });
  assert.ok(plain.startsWith("﻿"));
  const lines = plain.slice(1).split("\r\n");
  assert.equal(lines[0], CSV_COLUMNS.join(","));
  assert.equal(lines[1], '1,BP-1020,"Pastilha de freio ""cerâmica"", dianteira",Freios,Cobreq,Volkswagen,Gol,4,1,B-10,"1.234,56",Preto,D,Ambos');
  assert.equal(lines[2], '2,BKR6E,Vela de ignição,Motor,NGK,Volkswagen,,0,0,,"24,90",N/A,N/A,N/A');
  assert.equal(lines[3], '3,C 2433,Filtro de ar,Motor,Mann,Volkswagen,Gol,3,3,A-4,"49,90",N/A,N/A,N/A');
  assert.equal(lines[4], '3,ARL 4433,Filtro de ar,Motor,Tecfil,Volkswagen,Gol,5,3,A-5,"32,90",N/A,N/A,N/A');
  assert.equal(lines[5], "");
  const withPhotos = itemsCsv(STOCK, { photos: true }).slice(1).split("\r\n");
  assert.equal(withPhotos[0], `${CSV_COLUMNS.join(",")},${CSV_PHOTOS_COLUMN}`);
  assert.ok(withPhotos[1].endsWith(",/photos/a1.jpg | /photos/a2.png"));
  assert.ok(withPhotos[2].endsWith(",N/A,"));
  assert.ok(withPhotos[3].endsWith(",N/A,"));
  assert.ok(withPhotos[4].endsWith(",/photos/b3.webp"));
});

// Exports the items, with and without photos, and reads the file back with the import, and checks every row is valid
// and gives back the same items, the one of two brands whole.
test("Shared: an exported file reads back as the same items", () => {
  for (const photos of [false, true]) {
    const read = rows(itemsCsv(STOCK, { photos }));
    assert.deepEqual(
      read.map((row) => row.errors),
      [[], [], [], []],
    );
    assert.deepEqual(importedItems(read), STOCK.map(createOf));
  }
});

// Exports through a stand-in for the API and checks it asks for the list query as given, with no page, writes every
// item it answers with and counts them; a failed request gives null.
test("Shared: an export fetches every item of the list and writes them", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ items: STOCK, total: 3 }), { status: 200 }));
  const exported = await exportItems("/api", "category=Freios&sort=price&order=desc", { photos: true });
  assert.equal(fetch.mock.calls[0].arguments[0], "/api/items?category=Freios&sort=price&order=desc");
  assert.deepEqual(exported, { csv: itemsCsv(STOCK, { photos: true }), count: 3 });
  await exportItems("/api", "", { photos: false });
  assert.equal(fetch.mock.calls[1].arguments[0], "/api/items");
  mock.method(globalThis, "fetch", async () => new Response(null, { status: 500 }));
  assert.equal(await exportItems("/api", "", { photos: false }), null);
});

// Words the export's file name, scope and toast for none, one and many items, narrowed or not.
test("Shared: the export is worded for its file, dialog and toast", () => {
  assert.equal(csvExportName(new Date(2026, 9, 9, 23, 30)), "estoque-2026-10-09.csv");
  assert.equal(exportScope(0, true), "Nenhum item na lista para exportar.");
  assert.equal(exportScope(1, false), "O único item do estoque.");
  assert.equal(exportScope(40, false), "Todos os 40 itens do estoque.");
  assert.equal(exportScope(12, true), "12 itens, com a busca e os filtros atuais.");
  assert.equal(exportScope(1, true), "1 item, com a busca e os filtros atuais.");
  assert.equal(exportedSummary(1), "1 item exportado.");
  assert.equal(exportedSummary(12), "12 itens exportados.");
});
