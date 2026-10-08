import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import type { ItemLists } from "../lists/lists.ts";
import {
  CSV_COLUMNS,
  CSV_TEMPLATE,
  csvPrice,
  importItems,
  itemImportSchema,
  ITEM_IMPORT_LIMIT,
  newListNames,
  parseCsv,
  readItemsCsv,
  type CsvItemRow,
} from "./itemCsv.ts";
import { ITEM_FORM_MESSAGES } from "./itemForm.ts";

const HEADER = CSV_COLUMNS.join(",");
// The lists the API keeps: one of each, Volkswagen with the Gol.
const LISTS: ItemLists = {
  categories: [{ id: "motor", name: "Motor" }],
  partBrands: [{ id: "ngk", name: "NGK" }],
  vehicleBrands: [{ id: "vw", name: "Volkswagen" }],
  vehicleModels: [{ id: "gol", name: "Gol", vehicleBrandId: "vw" }],
};

afterEach(() => mock.restoreAll());

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

// Reads prices with a decimal comma, with thousands, and with a decimal point, and refuses what isn't a price.
test("Shared: CSV prices take a decimal comma or point", () => {
  assert.equal(csvPrice("189,90"), 18990);
  assert.equal(csvPrice("1.234,56"), 123456);
  assert.equal(csvPrice("189.90"), 18990);
  assert.equal(csvPrice("189.9"), 18990);
  assert.equal(csvPrice("42"), 4200);
  assert.equal(csvPrice("abc"), null);
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

// Reads the template, comma separated, and checks both rows are valid with the price, quantities, an empty model,
// and position and side taken from the file.
test("Shared: the CSV template reads as two valid items", () => {
  const [filter, pads] = rows(CSV_TEMPLATE);
  assert.deepEqual(filter.errors, []);
  assert.deepEqual(pads.errors, []);
  assert.equal(filter.line, 2);
  assert.deepEqual(
    [filter.item.code, filter.item.unitPriceCents, filter.item.quantity, filter.item.minQuantity, filter.item.vehicleModel],
    ["W 712/95", 3990, 8, 2, "Gol"],
  );
  assert.deepEqual([pads.item.vehicleModel, pads.item.position, pads.item.side, pads.item.color], ["", "D", "Ambos", "N/A"]);
});

// Reads a semicolon-separated file with a BOM and its columns in another order, and checks the writing rule: codes
// uppercase, capitals on text, acronyms kept, and names already in the lists in their spelling.
test("Shared: a semicolon file is read with the writing rule and the lists' spelling", () => {
  const text = "﻿name;code;unit_price;category;part_brand;vehicle_brand;vehicle_model;location;color;position;side\n" +
    "vela xR3;ngk-b7;34,9;MOTOR;ngk;volkswagen;gol;a-2;preto;d;ld\n";
  const [row] = rows(text);
  assert.deepEqual(row.errors, []);
  assert.deepEqual(row.item, {
    code: "NGK-B7",
    name: "Vela xR3",
    category: "Motor",
    partBrand: "NGK",
    vehicleBrand: "Volkswagen",
    vehicleModel: "Gol",
    quantity: 0,
    minQuantity: 0,
    location: "A-2",
    unitPriceCents: 3490,
    color: "Preto",
    position: "D",
    side: "LD",
  });
});

// Reads rows with each kind of mistake and checks each one names its reasons, while a blank row is skipped.
test("Shared: invalid CSV rows say why", () => {
  const text = [
    HEADER,
    ",,,,,,,,,,,,",
    ",Filtro,Motor,Mann,Volkswagen,,x,2.5,,0,,Cima,Meio",
    "A-1,Junta,Motor,Mann,Volkswagen,,1,1,,abc,,,",
    "a-1,Junta,Motor,Mann,Volkswagen,,1,1,,10,,,",
  ].join("\n");
  const [missing, wrong, repeated] = rows(text);
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
    "A,Junta,Motor,Mann,Volkswagen,Santana,,,,10,,,",
    "B,Vela,Ignição,mann,Renault,Clio,,,,10,,,",
    "C,Filtro,Ignicao,NGK,volkswagen,santana,,,,10,,,",
    "D,Erro,Turbo,Cofap,Fiat,Uno,,,,0,,,",
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

// Sends the template with an invalid row and checks only the valid items go, then that a failed import gives null.
test("Shared: an import sends the valid rows only", async () => {
  const read = rows(`${CSV_TEMPLATE},,,,,,,,,0,,,
`);
  const fetch = mock.method(globalThis, "fetch", async () => new Response(JSON.stringify({ created: 1, updated: 1 }), { status: 200 }));
  assert.deepEqual(await importItems("/api", read), { created: 1, updated: 1 });
  const [url, init] = fetch.mock.calls[0].arguments as unknown as [string, RequestInit];
  assert.equal(url, "/api/items/import");
  assert.deepEqual(
    JSON.parse(String(init.body)).items.map((item: { code: string }) => item.code),
    ["W 712/95", "BP-1020"],
  );
  mock.method(globalThis, "fetch", async () => new Response(null, { status: 500 }));
  assert.equal(await importItems("/api", read), null);
});

// Checks the import request takes at least one item and at most the limit.
test("Shared: an import takes from one item up to the limit", () => {
  const [item] = rows(CSV_TEMPLATE).map((row) => row.item);
  assert.equal(itemImportSchema.safeParse({ items: [] }).success, false);
  assert.equal(itemImportSchema.safeParse({ items: [item] }).success, true);
  assert.equal(itemImportSchema.safeParse({ items: Array(ITEM_IMPORT_LIMIT + 1).fill(item) }).success, false);
});
