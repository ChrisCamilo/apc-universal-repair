import { catalog, type Locale } from "../platform/locale/locale.ts";
import { exportedItems } from "./itemCsv.ts";
import { NOT_APPLICABLE, UNIVERSAL_BRAND, type Item, type ItemBrand, type ItemVehicle } from "./items.ts";

// The inventory written for Mercado Livre's bulk listing tool (Anunciador em massa), shared by web and mobile: one
// listing for each brand of an item, in Mercado Livre's words, to copy into the spreadsheet downloaded from the seller
// account, which only takes a file of its own. The CSV is UTF-8 with a byte-order mark, semicolon separated with a
// decimal comma, so Excel in Portuguese opens it in columns; a value with a semicolon, quotes or a line break in it is
// quoted. The title is the name, the part brand, the code and the first vehicle, up to 60 characters, dropping the
// vehicle and then the code when it doesn't fit, never cutting a word. A brand with no stock, or priced under Mercado
// Livre's minimum, is left out. Each brand's photos get file names after its code and their order, the cover first,
// for the web to put beside the CSV in a zip, for Mercado Livre's photo manager (Gestor de fotos). The file stays in
// Portuguese, as Mercado Livre reads it; only the toast that says how the export went follows the language chosen.

/** What the export's toast says: how many listings went into the file, and how many brands were left out. */
export const MERCADO_LIVRE_MESSAGES = catalog(
  {
    summary: (count: number, skipped: number) => {
      const exported = count === 1 ? "1 anúncio exportado" : `${count} anúncios exportados`;
      const left = skipped === 1 ? "1 marca ficou de fora" : `${skipped} marcas ficaram de fora`;
      return skipped === 0 ? `${exported}.` : `${exported} · ${left} (sem estoque ou preço abaixo de R$ 8,00).`;
    },
  },
  {
    summary: (count, skipped) => {
      const exported = count === 1 ? "1 listing exported" : `${count} listings exported`;
      const left = skipped === 1 ? "1 brand was left out" : `${skipped} brands were left out`;
      return skipped === 0 ? `${exported}.` : `${exported} · ${left} (no stock, or priced under R$ 8.00).`;
    },
  },
);
/** The columns of the listings' CSV, in Mercado Livre's words. */
export const MERCADO_LIVRE_COLUMNS = [
  "Título",
  "Condição",
  "Marca",
  "Número de peça",
  "SKU",
  "Códigos OEM",
  "Estoque",
  "Preço [R$]",
  "Posição",
  "Lado",
  "Cor",
  "Material",
  "Veículos compatíveis",
  "Descrição",
  "Fotos",
] as const;
/** The name of the listings' CSV inside the zip. */
export const MERCADO_LIVRE_CSV_NAME = "anuncios.csv";
/** The lowest price Mercado Livre takes, R$ 8,00. */
export const MERCADO_LIVRE_MIN_PRICE_CENTS = 800;
/** The folder of the photos inside the zip. */
export const MERCADO_LIVRE_PHOTOS_FOLDER = "fotos";
/** The most characters a listing's title has. */
export const MERCADO_LIVRE_TITLE_MAX = 60;
/** What each position is called on Mercado Livre; empty when it doesn't apply. */
const POSITION_WORDS: Record<Item["position"], string> = { "N/A": "", D: "Dianteira", T: "Traseira", Ambos: "Dianteira e traseira" };
/** What each side is called on Mercado Livre; empty when it doesn't apply. */
const SIDE_WORDS: Record<Item["side"], string> = { "N/A": "", LD: "Direito", LE: "Esquerdo", Ambos: "Esquerdo e direito" };

/** A photo of a listing: its name in the zip's photos folder, and its address as the API sends it. */
export type MercadoLivrePhoto = { name: string; url: string };
/** The listings of the list: the CSV, the photos to put beside it, how many listings it holds and how many brands were left out. */
export type MercadoLivreListings = { csv: string; photos: MercadoLivrePhoto[]; count: number; skipped: number };

/**
 * Writes a part's color as Mercado Livre lists colors: its first letter in uppercase, the rest in lowercase.
 * @param color The brand's color, kept in uppercase, or "N/A".
 * @returns E.g. "Azul-marinho", or empty when it doesn't apply.
 */
function colorWord(color: string): string {
  return color === NOT_APPLICABLE ? "" : color.charAt(0) + color.slice(1).toLocaleLowerCase("pt-BR");
}

/**
 * Fetches every item of the list as it is, across all its pages, and writes them as Mercado Livre's listings.
 * @param base Where the API is reached, e.g. "/api" on the web.
 * @param query The list query from itemListQuery, with the search, filters, status and sort but no page.
 * @returns The listings, or null when the items couldn't be fetched.
 */
export async function exportMercadoLivre(base: string, query: string): Promise<MercadoLivreListings | null> {
  const items = await exportedItems(base, query);
  return items && mercadoLivreListings(items);
}

/**
 * Writes a cell of the listings' CSV, quoted when it holds a semicolon, quotes or a line break.
 * @param value The cell's value.
 * @returns The cell as written in the file.
 */
function listingCell(value: string): string {
  return /[";\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/**
 * Writes a listing's description: plain text, one fact per line, with no HTML, links or contact details, as Mercado
 * Livre asks, ending with the vehicles the part fits.
 * @param item The item.
 * @param brand The brand the listing sells.
 * @returns The description's text, its lines apart by line breaks.
 */
export function mercadoLivreDescription(item: Item, brand: ItemBrand): string {
  const place = [POSITION_WORDS[item.position] && `Posição: ${POSITION_WORDS[item.position]}`, SIDE_WORDS[item.side] && `Lado: ${SIDE_WORDS[item.side]}`];
  const lines = [
    item.name,
    `Marca: ${brand.partBrand}`,
    `Número de peça: ${brand.code}`,
    item.originalCodes.length > 0 ? `Códigos originais (OEM): ${item.originalCodes.join(", ")}` : "",
    item.material ? `Material: ${item.material}` : "",
    colorWord(brand.color) && `Cor: ${colorWord(brand.color)}`,
    item.description ?? "",
    place.filter(Boolean).join(" · "),
    "Compatível com:",
    ...item.vehicles.map((vehicle) => `- ${mercadoLivreVehicle(vehicle)}`),
  ];
  return lines.filter(Boolean).join("\n");
}

/**
 * Names the export's file after the day it is exported.
 * @param day When it is exported.
 * @param extension "zip" for the web's file with the photos, "csv" for the phone's.
 * @returns E.g. "mercado-livre-2026-11-23.zip", in local time.
 */
export function mercadoLivreExportName(day: Date, extension: "zip" | "csv"): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `mercado-livre-${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}.${extension}`;
}

/**
 * Writes the listings of a list of items: a row for each brand with stock and a price Mercado Livre takes, in the
 * columns' order, and its photos named after its code.
 * @param items The items, in the order to write them.
 * @returns The CSV, each line ending in CRLF after a byte-order mark, the photos, and how many listings and left-out brands.
 */
export function mercadoLivreListings(items: readonly Item[]): MercadoLivreListings {
  const photos: MercadoLivrePhoto[] = [];
  let skipped = 0;
  const rows = items.flatMap((item) =>
    item.brands.flatMap((brand) => {
      if (brand.quantity === 0 || brand.unitPriceCents < MERCADO_LIVRE_MIN_PRICE_CENTS) {
        skipped++;
        return [];
      }
      const names = brand.photos.map((photo, index) => ({ name: mercadoLivrePhotoName(brand.code, index, photo.url), url: photo.url }));
      photos.push(...names);
      const cells: Record<(typeof MERCADO_LIVRE_COLUMNS)[number], string> = {
        Título: mercadoLivreTitle(item, brand),
        Condição: "Novo",
        Marca: brand.partBrand,
        "Número de peça": brand.code,
        SKU: brand.code,
        "Códigos OEM": item.originalCodes.join(", "),
        Estoque: String(brand.quantity),
        "Preço [R$]": (brand.unitPriceCents / 100).toFixed(2).replace(".", ","),
        Posição: POSITION_WORDS[item.position],
        Lado: SIDE_WORDS[item.side],
        Cor: colorWord(brand.color),
        Material: item.material ?? "",
        "Veículos compatíveis": item.vehicles.map(mercadoLivreVehicle).join("; "),
        Descrição: mercadoLivreDescription(item, brand),
        Fotos: names.map((photo) => photo.name).join(", "),
      };
      return [MERCADO_LIVRE_COLUMNS.map((column) => cells[column])];
    }),
  );
  const csv = "﻿" + [[...MERCADO_LIVRE_COLUMNS], ...rows].map((row) => row.map(listingCell).join(";") + "\r\n").join("");
  return { csv, photos, count: rows.length, skipped };
}

/**
 * Names a brand's photo in the zip: its code, with the characters a file name can't hold replaced by "-", then its
 * place among the brand's photos, from 1, and its file's extension, "jpg" when its address has none (the web demo's
 * photos sent in the browser).
 * @param code The brand's code.
 * @param index The photo's place, from 0, the cover first.
 * @param url The photo's address, as the API sends it, whose path ends in its file's name.
 * @returns E.g. "W-712-95-1.webp" for the cover of "W 712/95".
 */
export function mercadoLivrePhotoName(code: string, index: number, url: string): string {
  const safe = code.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  const file = url.split("?")[0].split("/").pop() ?? "";
  const extension = /\.([A-Za-z0-9]{2,5})$/.exec(file)?.[1] ?? "jpg";
  return `${safe}-${index + 1}.${extension.toLowerCase()}`;
}

/**
 * Words the export's result for its toast: how many listings went into the file, and how many brands were left out.
 * @param listings How many listings and left-out brands.
 * @param locale The language.
 * @returns E.g. "12 anúncios exportados · 3 marcas ficaram de fora (sem estoque ou preço abaixo de R$ 8,00)."
 */
export function mercadoLivreSummary({ count, skipped }: Pick<MercadoLivreListings, "count" | "skipped">, locale: Locale): string {
  return MERCADO_LIVRE_MESSAGES[locale].summary(count, skipped);
}

/**
 * Writes a listing's title: the item's name, the part brand, the code and the first vehicle's brand and model, up to
 * MERCADO_LIVRE_TITLE_MAX characters. When it doesn't fit, the vehicle goes first, then the code, and what is still
 * too long is cut at the last whole word that fits.
 * @param item The item.
 * @param brand The brand the listing sells.
 * @returns E.g. "Pastilha de freio Cobreq BP-1020 Chevrolet Monza".
 */
export function mercadoLivreTitle(item: Item, brand: ItemBrand): string {
  const [first] = item.vehicles;
  const vehicle = [first.vehicleBrand, first.vehicleModel].filter(Boolean).join(" ");
  const tries = [
    [item.name, brand.partBrand, brand.code, vehicle],
    [item.name, brand.partBrand, brand.code],
    [item.name, brand.partBrand],
  ].map((parts) => parts.join(" ").replace(/\s+/g, " ").trim());
  const fits = tries.find((title) => title.length <= MERCADO_LIVRE_TITLE_MAX);
  if (fits) {
    return fits;
  }
  const words = tries[tries.length - 1].split(" ");
  let title = words[0].slice(0, MERCADO_LIVRE_TITLE_MAX);
  for (const word of words.slice(1)) {
    if (title.length + 1 + word.length > MERCADO_LIVRE_TITLE_MAX) {
      break;
    }
    title += ` ${word}`;
  }
  return title;
}

/**
 * Writes a vehicle a part fits: its brand, model, generation's years and version, or the brand for any of its models,
 * or "Universal" for any vehicle.
 * @param vehicle The vehicle.
 * @returns E.g. "Chevrolet Monza 1985-1990 1.6 GLX", "Fiat Uno 2010 em diante", "Volkswagen (todos os modelos)".
 */
export function mercadoLivreVehicle(vehicle: ItemVehicle): string {
  if (vehicle.vehicleBrand === UNIVERSAL_BRAND) {
    return UNIVERSAL_BRAND;
  }
  if (!vehicle.vehicleModel) {
    return `${vehicle.vehicleBrand} (todos os modelos)`;
  }
  const years = vehicle.firstYear == null ? "" : vehicle.lastYear == null ? `${vehicle.firstYear} em diante` : `${vehicle.firstYear}-${vehicle.lastYear}`;
  return [vehicle.vehicleBrand, vehicle.vehicleModel, years, vehicle.version ?? ""].filter(Boolean).join(" ");
}
