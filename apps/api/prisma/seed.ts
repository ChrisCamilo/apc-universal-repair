import "dotenv/config";
import { optionKey, type ItemCreate } from "@apc/shared/items";
import { listName } from "@apc/shared/lists";
import { prisma } from "../src/db/client.js";
import { createData, type ListIds } from "../src/items/items.js";
import { listIds } from "../src/items/listIds.js";

// The starting data of a new database (`pnpm --filter @apc/api db:seed`): the default categories, part brands,
// vehicle brands with the models of the catalog, and sample items, each with a unit price. It can run again: a name a
// list holds and an item whose part code is in use are left as they are.

/** The default categories. */
const CATEGORIES = ["Arrefecimento", "Elétrica", "Freios", "Motor", "Suspensão", "Transmissão"];
/** Sample items, a few of each category, some low or out of stock. */
const ITEMS: ItemCreate[] = [
  { code: "W 712/95", name: "Filtro de óleo", category: "Motor", partBrand: "Mann", vehicleBrand: "Volkswagen", vehicleModel: "Gol", quantity: 8, minQuantity: 2, location: "A-2", unitPriceCents: 3990 },
  { code: "BKR6E", name: "Vela de ignição", category: "Motor", partBrand: "NGK", vehicleBrand: "Universal", quantity: 24, minQuantity: 8, location: "A-3", unitPriceCents: 2490 },
  { code: "BP-1020", name: "Pastilha de freio", category: "Freios", partBrand: "Cobreq", vehicleBrand: "Chevrolet", vehicleModel: "Opala", position: "D", quantity: 2, minQuantity: 3, location: "B-10", unitPriceCents: 8990 },
  { code: "PD-580", name: "Disco de freio", category: "Freios", partBrand: "Fras-le", vehicleBrand: "Fiat", vehicleModel: "Uno", position: "D", side: "Ambos", quantity: 4, minQuantity: 2, location: "B-11", unitPriceCents: 15990 },
  { code: "BA-77", name: "Bomba d'água", category: "Arrefecimento", partBrand: "Urba", vehicleBrand: "Fiat", vehicleModel: "Uno", quantity: 0, minQuantity: 1, location: "C-1", unitPriceCents: 13240 },
  { code: "VT-40", name: "Válvula termostática", category: "Arrefecimento", partBrand: "Valeo", vehicleBrand: "Ford", vehicleModel: "Escort", quantity: 3, minQuantity: 1, location: "C-2", unitPriceCents: 6590 },
  { code: "AM-501", name: "Amortecedor", category: "Suspensão", partBrand: "Cofap", vehicleBrand: "Ford", vehicleModel: "Escort", position: "T", side: "LE", color: "Preto", quantity: 4, minQuantity: 1, location: "A-10", unitPriceCents: 24900 },
  { code: "BT-2010", name: "Bieleta", category: "Suspensão", partBrand: "Monroe", vehicleBrand: "Volkswagen", vehicleModel: "Santana", position: "D", side: "Ambos", quantity: 6, minQuantity: 2, location: "A-11", unitPriceCents: 4590 },
  { code: "0 986 AN0 123", name: "Alternador", category: "Elétrica", partBrand: "Bosch", vehicleBrand: "Chevrolet", vehicleModel: "Monza", quantity: 1, minQuantity: 1, location: "D-1", unitPriceCents: 89900 },
  { code: "MR-1500", name: "Motor de partida", category: "Elétrica", partBrand: "Bosch", vehicleBrand: "Volkswagen", vehicleModel: "Fusca", quantity: 2, minQuantity: 1, location: "D-2", unitPriceCents: 64900 },
  { code: "KE-3000", name: "Kit de embreagem", category: "Transmissão", partBrand: "Sachs", vehicleBrand: "Chevrolet", vehicleModel: "Chevette", quantity: 3, minQuantity: 1, location: "E-1", unitPriceCents: 42900 },
  { code: "CB-4500", name: "Cabo de embreagem", category: "Transmissão", partBrand: "Cofap", vehicleBrand: "Fiat", vehicleModel: "Tempra", quantity: 0, minQuantity: 2, location: "E-2", unitPriceCents: 5490 },
];
/** The default part brands. */
const PART_BRANDS = ["Bosch", "Cobreq", "Cofap", "Fras-le", "Mann", "Monroe", "NGK", "Sachs", "Urba", "Valeo"];
/** The default vehicle brands and their models: the catalog's, and Universal for parts that fit any vehicle. */
const VEHICLE_BRANDS: Record<string, string[]> = {
  Chevrolet: ["Chevette", "Monza", "Opala"],
  Fiat: ["147", "Tempra", "Uno"],
  Ford: ["Corcel", "Del Rey", "Escort"],
  Volkswagen: ["Fusca", "Gol", "Santana"],
  Universal: [],
};

/**
 * Adds a name to a list of plain names unless the list holds it.
 * @param name The name.
 * @returns The upsert's where, create and update.
 */
function entry(name: string) {
  const written = listName(name);
  return { where: { nameKey: optionKey(written) }, create: { name: written, nameKey: optionKey(written) }, update: {} };
}

/** Fills the lists and adds the sample items, leaving what is already there as it is. */
async function seed() {
  for (const name of CATEGORIES) {
    await prisma.category.upsert(entry(name));
  }
  for (const name of PART_BRANDS) {
    await prisma.partBrand.upsert(entry(name));
  }
  for (const [brand, models] of Object.entries(VEHICLE_BRANDS)) {
    for (const vehicleModel of models) {
      await listIds(prisma, { vehicleBrand: brand, vehicleModel });
    }
    await prisma.brand.upsert(entry(brand));
  }
  let added = 0;
  for (const item of ITEMS) {
    const ids = (await listIds(prisma, item)) as ListIds;
    const data = createData(item, ids);
    if (!(await prisma.item.findUnique({ where: { code: data.code }, select: { id: true } }))) {
      await prisma.item.create({ data });
      added++;
    }
  }
  console.log(`Seed done: ${added} sample items added, ${ITEMS.length - added} already there.`);
}

await seed().finally(() => prisma.$disconnect());
