import { z } from "zod";
import { apiFetch } from "../auth/apiFetch.ts";
import { findEntry, listName, type ItemLists, type ListEntry } from "../lists/lists.ts";
import { ITEM_FORM_MESSAGES, parsePrice, priceInput } from "./itemForm.ts";
import {
  capitalizeFirst,
  codeKey,
  itemCreateSchema,
  itemDetails,
  itemListResponseSchema,
  MAX_PRICE_CENTS,
  MAX_QUANTITY,
  NOT_APPLICABLE,
  optionKey,
  POSITIONS,
  SIDES,
  type Item,
  type ItemCreate,
} from "./items.ts";

// The CSV batch import and export of the inventory, shared by web and mobile: the template to download, and reading a
// file into the items it holds, each row checked as the item form checks it, with the reasons a row can't be saved. A
// file is UTF-8, comma or semicolon separated (told by its header line), with a header naming the columns in any order;
// a value with the separator, quotes or a line break in it is quoted, as a decimal comma is in a comma-separated file.
// Each row is a brand of an item: rows with the same value in the "item" column are the brands of one item, and must
// describe it the same way (name, category, vehicle, position, side, minimum), each with its own part brand; a row
// without one is an item of its own. Text follows the writing rule, codes are uppercase, and a category, brand or model
// already in the lists takes its spelling there; the names not in the lists yet are listed, to be created by the
// import. The valid items go to the API in one request, checked with the item schema, and come back as how many items
// were created and updated; an item with a row in error is left out whole. The export writes the items of the list as
// it is, every page of it, in the same format, each item numbered in the "item" column, so a file exported can be
// imported again; on request it adds each brand's photo paths in a column the import leaves aside for now.

/** The columns of the import, in the template's order. */
export const CSV_COLUMNS = [
  "item",
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
/** The template to download: the header, an item of one brand and an item of two. */
export const CSV_TEMPLATE = [
  CSV_COLUMNS.join(","),
  '1,W 712/95,Filtro de óleo,Motor,Mann,Volkswagen,Gol,8,2,A-2,"39,90",,,',
  '2,BP-1020,Pastilha de freio,Freios,Cobreq,Chevrolet,,4,1,B-10,"89,90",,D,Ambos',
  '2,PD/1020,Pastilha de freio,Freios,Fras-le,Chevrolet,,2,1,B-10,"94,90",,D,Ambos',
  "",
].join("\r\n");
/** Name the template is downloaded with. */
export const CSV_TEMPLATE_NAME = "modelo-estoque.csv";
/** The column the export puts the photo paths in, when asked; the import leaves it aside. */
export const CSV_PHOTOS_COLUMN = "photos";
/** What separates a brand's photo paths in the photos column. */
export const CSV_PHOTO_SEPARATOR = " | ";
/** Most rows one import takes. */
export const ITEM_IMPORT_LIMIT = 1000;
/** What POST /items/import answers: how many items were created, and how many updated for a code in use. */
export const itemImportResultSchema = z.object({ created: z.int().min(0), updated: z.int().min(0) });
/** What POST /items/import takes: the valid rows' items, each with its brands. */
export const itemImportSchema = z.object({ items: z.array(itemCreateSchema).min(1).max(ITEM_IMPORT_LIMIT) });
/** The columns a file must have; the others may be left out. */
const REQUIRED_COLUMNS: readonly CsvColumn[] = ["code", "name", "category", "part_brand", "vehicle_brand", "unit_price"];

/** How many items an import created and updated. */
export type ItemImportResult = z.infer<typeof itemImportResultSchema>;
/** One of the columns of the import. */
export type CsvColumn = (typeof CSV_COLUMNS)[number];
/**
 * A row of the file: its line, the item it holds as it would be saved with the row's one brand, the value of its "item"
 * column (empty for an item of its own), and why it can't be, if it can't.
 */
export type CsvItemRow = { line: number; item: ItemCreate; group: string; errors: string[] };
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
 * Checks the rows of each item of a file, adding to their errors: a row that describes the item otherwise than its
 * first row (name, category, vehicle, position, side or minimum), a part brand a row before already has, and, once
 * any row of an item has an error, every other row of it, since the item is left out whole.
 * @param rows The rows read, changed in place.
 */
function checkGroups(rows: readonly CsvItemRow[]): void {
  /** What a row says the item is, compared ignoring case, accents and extra spaces. */
  const described = ({ item }: CsvItemRow) =>
    [item.name, item.category, item.vehicleBrand, item.vehicleModel ?? "", item.position ?? NOT_APPLICABLE, item.side ?? NOT_APPLICABLE, String(item.minQuantity)]
      .map(optionKey)
      .join("|");
  const groups = new Map<string, CsvItemRow[]>();
  for (const row of rows.filter((each) => each.group)) {
    groups.set(row.group, [...(groups.get(row.group) ?? []), row]);
  }
  for (const [group, members] of groups) {
    const [first] = members;
    members.forEach((row, index) => {
      if (index > 0 && described(row) !== described(first)) {
        row.errors.push(`O item ${group} está descrito de outro jeito na linha ${first.line}.`);
      }
      const brand = optionKey(row.item.brands[0].partBrand);
      const before = members.slice(0, index).find((other) => brand && optionKey(other.item.brands[0].partBrand) === brand);
      if (before) {
        row.errors.push(`Marca repetida no item ${group}: já está na linha ${before.line}.`);
      }
    });
    if (members.some((row) => row.errors.length > 0)) {
      for (const row of members.filter((each) => each.errors.length === 0)) {
        row.errors.push(`Outra linha do item ${group} tem erro.`);
      }
    }
  }
}

/**
 * Writes a cell of the export, quoted when it holds the separator, quotes or a line break, as the import reads it.
 * @param value The cell's value.
 * @returns The cell as written in the file.
 */
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/**
 * Names an exported file after the day it is exported.
 * @param day When it is exported.
 * @returns E.g. "estoque-2026-10-09.csv", in local time.
 */
export function csvExportName(day: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `estoque-${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}.csv`;
}

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
  /** Reads a quantity, a whole number up to MAX_QUANTITY; zero when empty. */
  const count = (column: CsvColumn, label: string) => {
    if (value(column) && !/^\d+$/.test(value(column))) {
      errors.push(`${label} deve ser um número inteiro, como 4.`);
    } else if (Number(value(column)) > MAX_QUANTITY) {
      errors.push(`${label} deve ser no máximo ${MAX_QUANTITY.toLocaleString("pt-BR")}.`);
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
  const price = priceText ? parsePrice(priceText) : null;
  if (priceText && (price === null || price <= 0)) {
    errors.push(ITEM_FORM_MESSAGES.priceInvalid);
  } else if (price !== null && price > MAX_PRICE_CENTS) {
    errors.push(ITEM_FORM_MESSAGES.priceTooHigh);
  }
  const brand = findEntry(lists.vehicleBrands, vehicleBrand);
  const models = brand ? lists.vehicleModels.filter((model) => model.vehicleBrandId === brand.id) : [];
  /** Takes a name's spelling in its list, or writes a new one by the rule. */
  const listed = (entries: readonly ListEntry[], text: string) => (text ? (findEntry(entries, text)?.name ?? listName(text)) : "");
  const quantity = count("quantity", "Quantidade");
  const minQuantity = count("minimum", "Quantidade mínima");
  const item: ItemCreate = {
    name: name && capitalizeFirst(name),
    category: listed(lists.categories, category),
    vehicleBrand: listed(lists.vehicleBrands, vehicleBrand),
    vehicleModel: listed(models, value("vehicle_model")),
    minQuantity,
    position: choice("position", POSITIONS, "Posição deve ser D, T ou Ambos, ou ficar vazia."),
    side: choice("side", SIDES, "Lado deve ser LD, LE ou Ambos, ou ficar vazio."),
    brands: [
      {
        partBrand: listed(lists.partBrands, partBrand),
        code,
        quantity,
        location: value("location") && capitalizeFirst(value("location")),
        unitPriceCents: price ?? 0,
        color: value("color") ? capitalizeFirst(value("color")) : NOT_APPLICABLE,
      },
    ],
  };
  return { item, errors };
}

/**
 * Words an export's result for its toast.
 * @param count How many items the file holds.
 * @returns E.g. "12 itens exportados."
 */
export function exportedSummary(count: number): string {
  return count === 1 ? "1 item exportado." : `${count} itens exportados.`;
}

/**
 * Fetches every item of the list as it is, across all its pages, and writes them as a CSV file.
 * @param base Where the API is reached, e.g. "/api" on the web.
 * @param query The list query from itemListQuery, with the search, filters, status and sort but no page.
 * @param options Whether to add each item's photo paths.
 * @returns The file's text and how many items it holds, or null when the items couldn't be fetched.
 */
export async function exportItems(base: string, query: string, options: { photos: boolean }): Promise<{ csv: string; count: number } | null> {
  const response = await apiFetch(query ? `${base}/items?${query}` : `${base}/items`).catch(() => null);
  if (!response?.ok) {
    return null;
  }
  const { items } = itemListResponseSchema.parse(await response.json());
  return { csv: itemsCsv(items, options), count: items.length };
}

/**
 * Says which items an export takes, for its dialog.
 * @param count How many items the list holds, across all its pages.
 * @param narrowed Whether the search, the filters or the stock status narrow the list.
 * @returns E.g. "12 itens, com a busca e os filtros atuais." or "Todos os 40 itens do estoque."
 */
export function exportScope(count: number, narrowed: boolean): string {
  if (count === 0) {
    return "Nenhum item na lista para exportar.";
  }
  const items = count === 1 ? "1 item" : `${count} itens`;
  if (narrowed) {
    return `${items}, com a busca e os filtros atuais.`;
  }
  return count === 1 ? "O único item do estoque." : `Todos os ${items} do estoque.`;
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
    position: item.position ?? NOT_APPLICABLE,
    side: item.side ?? NOT_APPLICABLE,
    brands: item.brands.map((brand) => ({ ...brand, location: brand.location || null, color: brand.color ?? NOT_APPLICABLE })),
  });
}

/**
 * Joins the valid rows of a file into the items they hold: the rows of one value in the "item" column are the brands of
 * one item, described by its first row; a row without one is an item of its own. An item with a row in error is left
 * out whole (see readItemsCsv).
 * @param rows The rows read from a file.
 * @returns The items to import, in the order of their first rows.
 */
export function importedItems(rows: readonly CsvItemRow[]): ItemCreate[] {
  const items: ItemCreate[] = [];
  const grouped = new Map<string, ItemCreate>();
  for (const { item, group, errors } of rows) {
    if (errors.length > 0) {
      continue;
    }
    const held = group ? grouped.get(group) : undefined;
    if (held) {
      held.brands.push(...item.brands);
      continue;
    }
    const copy = { ...item, brands: [...item.brands] };
    items.push(copy);
    if (group) {
      grouped.set(group, copy);
    }
  }
  return items;
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
  const response = await apiFetch(`${base}/items/import`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items: importedItems(rows) }),
  }).catch(() => null);
  return response?.ok ? itemImportResultSchema.parse(await response.json()) : null;
}

/**
 * Writes items as a CSV file in the import's format: the template's columns in its order, comma separated, a row for
 * each brand of an item, the item numbered in the "item" column from 1, the price with a decimal comma and "N/A" for
 * what doesn't apply, after a byte-order mark so spreadsheets read it as UTF-8.
 * @param items The items, in the order to write them.
 * @param options Whether to add a photos column, with each brand's photo paths in their order, the cover first.
 * @returns The file's text, each line ending in CRLF.
 */
export function itemsCsv(items: readonly Item[], { photos }: { photos: boolean }): string {
  const header = photos ? [...CSV_COLUMNS, CSV_PHOTOS_COLUMN] : [...CSV_COLUMNS];
  const rows = items.flatMap((item, index) =>
    item.brands.map((brand) => {
      const cells: Record<CsvColumn, string> = {
        item: String(index + 1),
        code: brand.code,
        name: item.name,
        category: item.category,
        part_brand: brand.partBrand,
        vehicle_brand: item.vehicleBrand,
        vehicle_model: item.vehicleModel ?? "",
        quantity: String(brand.quantity),
        minimum: String(item.minQuantity),
        location: brand.location ?? "",
        unit_price: priceInput(brand.unitPriceCents),
        color: brand.color,
        position: item.position,
        side: item.side,
      };
      const row = CSV_COLUMNS.map((column) => cells[column]);
      return photos ? [...row, brand.photos.map((photo) => photo.url).join(CSV_PHOTO_SEPARATOR)] : row;
    }),
  );
  return "\ufeff" + [header, ...rows].map((row) => row.map(csvCell).join(",") + "\r\n").join("");
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
    for (const brand of item.brands) {
      add(found.partBrands, lists.partBrands, brand.partBrand);
    }
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
 * position and side among their values, and a part code only once in the file; and, for the rows of one item, the
 * same description as its first row, a part brand once, and the item left out whole when one of its rows has an error.
 * Blank rows are skipped.
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
  const rows = records.map(({ line, cells }): CsvItemRow => {
    const value = (column: CsvColumn) => (cells[columns.indexOf(column)] ?? "").trim();
    const { item, errors } = csvItem(value, lists);
    // Codes repeat as the search compares them (see codeKey): "CB4500" is "CB-4500".
    const key = codeKey(item.brands[0].code);
    const seen = firstLine.get(key);
    if (key && seen !== undefined) {
      errors.push(`Código repetido: já está na linha ${seen}.`);
    } else if (key) {
      firstLine.set(key, line);
    }
    return { line, item, group: value("item"), errors };
  });
  checkGroups(rows);
  return { rows };
}

/**
 * Counts a file for the preview: how many items will be imported, the rows of one item counted once, and how many
 * rows have errors.
 * @param rows The rows read from the file.
 * @returns E.g. "12 itens prontos para importar · 2 linhas com erro".
 */
export function rowsSummary(rows: readonly CsvItemRow[]): string {
  const invalid = rows.filter((row) => row.errors.length > 0).length;
  const valid = importedItems(rows).length;
  return `${valid} ${valid === 1 ? "item pronto" : "itens prontos"} para importar · ${invalid} ${invalid === 1 ? "linha" : "linhas"} com erro`;
}
