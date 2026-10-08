import { z } from "zod";
import { findEntry, listName, type ItemLists, type ListEntry } from "../lists/lists.ts";
import { ITEM_FORM_MESSAGES, parsePrice } from "./itemForm.ts";
import { capitalizeFirst, itemCreateSchema, itemDetails, NOT_APPLICABLE, optionKey, POSITIONS, SIDES, type ItemCreate } from "./items.ts";

// The CSV batch import of the inventory, shared by web and mobile: the template to download, and reading a file into
// the items it holds, each row checked as the item form checks it, with the reasons a row can't be saved. A file is
// UTF-8, comma or semicolon separated (told by its header line), with a header naming the columns in any order; a
// value with the separator, quotes or a line break in it is quoted, as a decimal comma is in a comma-separated file.
// Text follows the writing rule, codes are uppercase, and a category, brand or model already in the lists takes its
// spelling there; the names not in the lists yet are listed, to be created by the import. The valid rows go to the API
// in one request, checked with the item schema, and come back as how many items were created and updated.

/** The columns of the import, in the template's order. */
export const CSV_COLUMNS = [
  "code",
  "name",
  "category",
  "part_brand",
  "vehicle_brand",
  "vehicle_model",
  "quantity",
  "minimum",
  "location",
  "unit_price",
  "color",
  "position",
  "side",
] as const;
/** The template to download: the header and two example rows. */
export const CSV_TEMPLATE = [
  CSV_COLUMNS.join(","),
  'W 712/95,Filtro de óleo,Motor,Mann,Volkswagen,Gol,8,2,A-2,"39,90",,,',
  'BP-1020,Pastilha de freio,Freios,Cobreq,Chevrolet,,4,1,B-10,"89,90",,D,Ambos',
  "",
].join("\r\n");
/** Name the template is downloaded with. */
export const CSV_TEMPLATE_NAME = "modelo-estoque.csv";
/** Most rows one import takes. */
export const ITEM_IMPORT_LIMIT = 1000;
/** What POST /items/import answers: how many items were created, and how many updated for a code in use. */
export const itemImportResultSchema = z.object({ created: z.int().min(0), updated: z.int().min(0) });
/** What POST /items/import takes: the valid rows' items. */
export const itemImportSchema = z.object({ items: z.array(itemCreateSchema).min(1).max(ITEM_IMPORT_LIMIT) });
/** The columns a file must have; the others may be left out. */
const REQUIRED_COLUMNS: readonly CsvColumn[] = ["code", "name", "category", "part_brand", "vehicle_brand", "unit_price"];

/** How many items an import created and updated. */
export type ItemImportResult = z.infer<typeof itemImportResultSchema>;
/** One of the columns of the import. */
export type CsvColumn = (typeof CSV_COLUMNS)[number];
/** A row of the file: its line, the item it holds as it would be saved, and why it can't be, if it can't. */
export type CsvItemRow = { line: number; item: ItemCreate; errors: string[] };
/** A file read: its rows, or why it can't be read at all. */
export type CsvItems = { rows: CsvItemRow[] } | { error: string };
/** The names an import creates in the lists, in the order the rows have them. */
export type NewListNames = {
  categories: string[];
  partBrands: string[];
  vehicleBrands: string[];
  vehicleModels: { vehicleBrand: string; name: string }[];
};

/**
 * Builds the item of a row and checks it.
 * @param value Reads a column of the row, trimmed; empty when the file has no such column.
 * @param lists The lists the API keeps.
 * @returns The item as it would be saved, and why it can't be, if it can't.
 */
function csvItem(value: (column: CsvColumn) => string, lists: ItemLists): { item: ItemCreate; errors: string[] } {
  const errors: string[] = [];
  /** Checks a required value, saying what is missing. */
  const required = (column: CsvColumn, message: string) => {
    if (!value(column)) {
      errors.push(message);
    }
    return value(column);
  };
  /** Reads a quantity, zero when empty. */
  const count = (column: CsvColumn, label: string) => {
    if (value(column) && !/^\d+$/.test(value(column))) {
      errors.push(`${label} deve ser um número inteiro, como 4.`);
    }
    return Number(value(column)) || 0;
  };
  /** Reads a choice among some values, ignoring case; N/A when empty. */
  const choice = <Option extends string>(column: CsvColumn, options: readonly Option[], message: string) => {
    const picked = options.find((option) => option.toLowerCase() === (value(column) || NOT_APPLICABLE).toLowerCase());
    if (!picked) {
      errors.push(message);
    }
    return picked ?? options[0];
  };

  const code = required("code", ITEM_FORM_MESSAGES.code).toUpperCase();
  const name = required("name", ITEM_FORM_MESSAGES.name);
  const category = required("category", ITEM_FORM_MESSAGES.category);
  const partBrand = required("part_brand", ITEM_FORM_MESSAGES.partBrand);
  const vehicleBrand = required("vehicle_brand", ITEM_FORM_MESSAGES.vehicleBrand);
  const priceText = required("unit_price", ITEM_FORM_MESSAGES.price);
  const price = priceText ? csvPrice(priceText) : null;
  if (priceText && (price === null || price <= 0)) {
    errors.push(ITEM_FORM_MESSAGES.priceInvalid);
  }
  const brand = findEntry(lists.vehicleBrands, vehicleBrand);
  const models = brand ? lists.vehicleModels.filter((model) => model.vehicleBrandId === brand.id) : [];
  /** Takes a name's spelling in its list, or writes a new one by the rule. */
  const listed = (entries: readonly ListEntry[], text: string) => (text ? (findEntry(entries, text)?.name ?? listName(text)) : "");
  const item: ItemCreate = {
    code,
    name: name && capitalizeFirst(name),
    category: listed(lists.categories, category),
    partBrand: listed(lists.partBrands, partBrand),
    vehicleBrand: listed(lists.vehicleBrands, vehicleBrand),
    vehicleModel: listed(models, value("vehicle_model")),
    quantity: count("quantity", "Quantidade"),
    minQuantity: count("minimum", "Quantidade mínima"),
    location: value("location") && capitalizeFirst(value("location")),
    unitPriceCents: price ?? 0,
    color: value("color") ? capitalizeFirst(value("color")) : NOT_APPLICABLE,
    position: choice("position", POSITIONS, "Posição deve ser D, T ou Ambos, ou ficar vazia."),
    side: choice("side", SIDES, "Lado deve ser LD, LE ou Ambos, ou ficar vazio."),
  };
  return { item, errors };
}

/**
 * Reads a price as a spreadsheet writes it: a decimal comma ("189,90", "1.234,56") or a decimal point ("189.90").
 * @param text The price as in the file.
 * @returns The price in cents, or null when it isn't a price.
 */
export function csvPrice(text: string): number | null {
  const typed = text.trim();
  return /^\d+\.\d{1,2}$/.test(typed) ? Math.round(Number(typed) * 100) : parsePrice(typed);
}

/**
 * Writes an imported item's details in one line, as the inventory card does under the name.
 * @param item The item of a row.
 * @returns E.g. "Motor · Mann · Volkswagen Gol · A-2 · R$ 39,90".
 */
export function importedDetails(item: ItemCreate): string {
  return itemDetails({
    ...item,
    vehicleModel: item.vehicleModel || null,
    location: item.location || null,
    position: item.position ?? NOT_APPLICABLE,
    side: item.side ?? NOT_APPLICABLE,
    color: item.color ?? NOT_APPLICABLE,
  });
}

/**
 * Words an import's result for its toast.
 * @param result How many items were created and updated.
 * @returns E.g. "Importação concluída: 3 itens criados, 1 atualizado."
 */
export function importedSummary({ created, updated }: ItemImportResult): string {
  const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  return `Importação concluída: ${plural(created, "item criado", "itens criados")}, ${plural(updated, "atualizado", "atualizados")}.`;
}

/**
 * Sends the valid rows of a file to the API, which creates their new list names and saves the items, updating an item
 * whose part code is in use.
 * @param base Where the API is reached, e.g. "/api" on the web.
 * @param rows The rows read from the file; the invalid ones are left out.
 * @returns How many items were created and updated, or null when the import failed.
 */
export async function importItems(base: string, rows: readonly CsvItemRow[]): Promise<ItemImportResult | null> {
  const response = await fetch(`${base}/items/import`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items: rows.filter((row) => row.errors.length === 0).map((row) => row.item) }),
  }).catch(() => null);
  return response?.ok ? itemImportResultSchema.parse(await response.json()) : null;
}

/**
 * Lists the names the valid rows use that the lists don't hold yet, each once: these are created by the import.
 * @param rows The rows read from a file.
 * @param lists The lists the API keeps.
 * @returns The new categories, part brands, vehicle brands and vehicle models.
 */
export function newListNames(rows: readonly CsvItemRow[], lists: ItemLists): NewListNames {
  const found: NewListNames = { categories: [], partBrands: [], vehicleBrands: [], vehicleModels: [] };
  /** Adds a name to a list of new names, unless the lists or the new names hold it. */
  const add = (names: string[], held: readonly ListEntry[], name: string) => {
    if (!findEntry(held, name) && !names.some((known) => optionKey(known) === optionKey(name))) {
      names.push(name);
    }
  };
  for (const { item, errors } of rows) {
    if (errors.length > 0) {
      continue;
    }
    add(found.categories, lists.categories, item.category);
    add(found.partBrands, lists.partBrands, item.partBrand);
    add(found.vehicleBrands, lists.vehicleBrands, item.vehicleBrand);
    const brand = findEntry(lists.vehicleBrands, item.vehicleBrand);
    const models = brand ? lists.vehicleModels.filter((model) => model.vehicleBrandId === brand.id) : [];
    const model = item.vehicleModel ?? "";
    const known = found.vehicleModels.some(
      (held) => optionKey(held.vehicleBrand) === optionKey(item.vehicleBrand) && optionKey(held.name) === optionKey(model),
    );
    if (model && !findEntry(models, model) && !known) {
      found.vehicleModels.push({ vehicleBrand: item.vehicleBrand, name: model });
    }
  }
  return found;
}

/**
 * Splits a CSV text into records and their cells, quotes taken off; a quoted cell may hold the separator, doubled
 * quotes and line breaks.
 * @param text The file's text.
 * @param separator "," or ";".
 * @returns Each record with the line it starts on, from 1.
 */
export function parseCsv(text: string, separator: string): { line: number; cells: string[] }[] {
  const records: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let start = 1;
  for (let at = 0; at < text.length; at++) {
    const char = text[at];
    if (quoted) {
      if (char === '"' && text[at + 1] === '"') {
        cell += '"';
        at++;
      } else if (char === '"') {
        quoted = false;
      } else {
        line += char === "\n" ? 1 : 0;
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === separator) {
      cells.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      at += char === "\r" && text[at + 1] === "\n" ? 1 : 0;
      records.push({ line: start, cells: [...cells, cell] });
      cells = [];
      cell = "";
      line++;
      start = line;
    } else {
      cell += char;
    }
  }
  if (cell || cells.length > 0) {
    records.push({ line: start, cells: [...cells, cell] });
  }
  return records;
}

/**
 * Reads a CSV file into the items it holds, checking each row: the required values, numbers that are numbers,
 * position and side among their values, and a part code only once in the file. Blank rows are skipped.
 * @param text The file's text, UTF-8.
 * @param lists The lists the API keeps, whose spelling the names take.
 * @returns The rows with their items and errors, or why the file can't be read.
 */
export function readItemsCsv(text: string, lists: ItemLists): CsvItems {
  const content = text.replace(/^﻿/, "");
  const header = content.slice(0, content.search(/\r|\n|$/));
  const separator = header.split(";").length > header.split(",").length ? ";" : ",";
  const [names, ...records] = parseCsv(content, separator).filter((record) => record.cells.some((cell) => cell.trim()));
  if (!names) {
    return { error: "O arquivo está vazio." };
  }
  const columns = names.cells.map((name) => name.trim().toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((column) => !columns.includes(column));
  if (missing.length > 0) {
    return { error: `Faltam colunas no arquivo: ${missing.join(", ")}. Use o modelo.` };
  }
  if (records.length === 0) {
    return { error: "O arquivo não tem itens, só o cabeçalho." };
  }
  if (records.length > ITEM_IMPORT_LIMIT) {
    return { error: `O arquivo tem ${records.length} itens; importe até ${ITEM_IMPORT_LIMIT} de cada vez.` };
  }
  const firstLine = new Map<string, number>();
  const rows = records.map(({ line, cells }) => {
    const value = (column: CsvColumn) => (cells[columns.indexOf(column)] ?? "").trim();
    const { item, errors } = csvItem(value, lists);
    const seen = firstLine.get(item.code);
    if (item.code && seen !== undefined) {
      errors.push(`Código repetido: já está na linha ${seen}.`);
    } else if (item.code) {
      firstLine.set(item.code, line);
    }
    return { line, item, errors };
  });
  return { rows };
}

/**
 * Counts the rows of a file for the preview: how many will be imported and how many have errors.
 * @param rows The rows read from the file.
 * @returns E.g. "12 itens prontos para importar · 2 com erro".
 */
export function rowsSummary(rows: readonly CsvItemRow[]): string {
  const invalid = rows.filter((row) => row.errors.length > 0).length;
  const valid = rows.length - invalid;
  return `${valid} ${valid === 1 ? "item pronto" : "itens prontos"} para importar · ${invalid} com erro`;
}
