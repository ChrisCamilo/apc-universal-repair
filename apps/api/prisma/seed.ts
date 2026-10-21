import "dotenv/config";
import { codeKey, optionKey, type ItemCreate } from "@apc/shared/items";
import { listName } from "@apc/shared/lists";
import { TEST_USERS } from "@apc/shared/test-users";
import { prisma } from "../src/db/client.js";
import { brandData, createData, originalCodesData, type ListIds } from "../src/items/items.js";
import { listIds } from "../src/items/listIds.js";
import { hashPassword } from "../src/users/passwords.js";

// The starting data of a new database (`pnpm --filter @apc/api db:seed`): the test users of @apc/shared/test-users
// (christian.camilo and oficina) with their passwords hashed, the default categories, part brands, vehicle brands with
// the models of the catalog, and sample items, each with its brands. It can run again: a username in use, a name a
// list holds and an item one of whose codes, its brands' or its original ones, is in use are left as they are.

/** The default categories. */
const CATEGORIES = ["Arrefecimento", "Elétrica", "Freios", "Motor", "Suspensão", "Transmissão"];
/**
 * Sample items, a few of each category, some low or out of stock; most made by one brand, and three by several, with
 * their own codes, stock and prices, and the vehicle maker's original codes.
 */
const ITEMS: ItemCreate[] = [
  { name: "Filtro de óleo", category: "Motor", vehicleBrand: "Volkswagen", vehicleModel: "Gol", minQuantity: 2, brands: [{ partBrand: "Mann", code: "W 712/95", location: "A-2", quantity: 8, unitPriceCents: 3990 }] },
  { name: "Vela de ignição", category: "Motor", vehicleBrand: "Universal", minQuantity: 8, brands: [{ partBrand: "NGK", code: "BKR6E", location: "A-3", quantity: 24, unitPriceCents: 2490 }] },
  { name: "Pastilha de freio", category: "Freios", vehicleBrand: "Chevrolet", vehicleModel: "Opala", position: "D", minQuantity: 3, brands: [{ partBrand: "Cobreq", code: "BP-1020", location: "B-10", quantity: 2, unitPriceCents: 8990 }] },
  { name: "Disco de freio", category: "Freios", vehicleBrand: "Fiat", vehicleModel: "Uno", position: "D", side: "Ambos", minQuantity: 2, brands: [{ partBrand: "Fras-le", code: "PD-580", location: "B-11", quantity: 4, unitPriceCents: 15990 }] },
  { name: "Bomba d'água", category: "Arrefecimento", vehicleBrand: "Fiat", vehicleModel: "Uno", minQuantity: 1, brands: [{ partBrand: "Urba", code: "BA-77", location: "C-1", quantity: 0, unitPriceCents: 13240 }] },
  { name: "Válvula termostática", category: "Arrefecimento", vehicleBrand: "Ford", vehicleModel: "Escort", minQuantity: 1, brands: [{ partBrand: "Valeo", code: "VT-40", location: "C-2", quantity: 3, unitPriceCents: 6590 }] },
  { name: "Amortecedor", category: "Suspensão", vehicleBrand: "Ford", vehicleModel: "Escort", position: "T", side: "LE", minQuantity: 1, brands: [{ partBrand: "Cofap", code: "AM-501", color: "Preto", location: "A-10", quantity: 4, unitPriceCents: 24900 }] },
  { name: "Bieleta", category: "Suspensão", vehicleBrand: "Volkswagen", vehicleModel: "Santana", position: "D", side: "Ambos", minQuantity: 2, brands: [{ partBrand: "Monroe", code: "BT-2010", location: "A-11", quantity: 6, unitPriceCents: 4590 }] },
  { name: "Alternador", category: "Elétrica", vehicleBrand: "Chevrolet", vehicleModel: "Monza", minQuantity: 1, brands: [{ partBrand: "Bosch", code: "0 986 AN0 123", location: "D-1", quantity: 1, unitPriceCents: 89900 }] },
  { name: "Motor de partida", category: "Elétrica", vehicleBrand: "Volkswagen", vehicleModel: "Fusca", minQuantity: 1, brands: [{ partBrand: "Bosch", code: "MR-1500", location: "D-2", quantity: 2, unitPriceCents: 64900 }] },
  { name: "Kit de embreagem", category: "Transmissão", vehicleBrand: "Chevrolet", vehicleModel: "Chevette", minQuantity: 1, brands: [{ partBrand: "Sachs", code: "KE-3000", location: "E-1", quantity: 3, unitPriceCents: 42900 }] },
  { name: "Cabo de embreagem", category: "Transmissão", vehicleBrand: "Fiat", vehicleModel: "Tempra", minQuantity: 2, brands: [{ partBrand: "Cofap", code: "CB-4500", location: "E-2", quantity: 0, unitPriceCents: 5490 }] },
  {
    name: "Pastilha de freio dianteira",
    category: "Freios",
    vehicleBrand: "Volkswagen",
    vehicleModel: "Gol",
    position: "D",
    side: "Ambos",
    minQuantity: 4,
    originalCodes: ["5U0 698 151", "5U0 698 151 A"],
    brands: [
      { partBrand: "Cobreq", code: "N-1210", location: "B-12", quantity: 2, unitPriceCents: 7990 },
      { partBrand: "Fras-le", code: "PD/1210", location: "B-12", quantity: 1, unitPriceCents: 9490 },
      { partBrand: "Bosch", code: "BB 1210", location: "B-13", quantity: 0, unitPriceCents: 11290 },
    ],
  },
  {
    name: "Amortecedor dianteiro",
    category: "Suspensão",
    vehicleBrand: "Fiat",
    vehicleModel: "Uno",
    position: "D",
    side: "Ambos",
    minQuantity: 2,
    originalCodes: ["7085 4321"],
    brands: [
      { partBrand: "Cofap", code: "GP 32950", color: "Preto", location: "A-12", quantity: 4, unitPriceCents: 21900 },
      { partBrand: "Monroe", code: "SP 0950", color: "Preto", location: "A-12", quantity: 2, unitPriceCents: 25900 },
    ],
  },
  {
    name: "Filtro de ar",
    category: "Motor",
    vehicleBrand: "Chevrolet",
    vehicleModel: "Opala",
    minQuantity: 3,
    originalCodes: ["94 650 433"],
    brands: [
      { partBrand: "Mann", code: "C 2433", location: "A-4", quantity: 3, unitPriceCents: 4990 },
      { partBrand: "Bosch", code: "F 026 400 433", location: "A-4", quantity: 2, unitPriceCents: 4590 },
      { partBrand: "Tecfil", code: "ARL 4433", location: "A-5", quantity: 5, unitPriceCents: 3290 },
    ],
  },
];
/** The default part brands. */
const PART_BRANDS = ["Bosch", "Cobreq", "Cofap", "Fras-le", "Mann", "Monroe", "NGK", "Sachs", "Tecfil", "Urba", "Valeo"];
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

/** Adds the test users, fills the lists and adds the sample items, leaving what is already there as it is. */
async function seed() {
  for (const { username, displayName, password } of TEST_USERS) {
    if (!(await prisma.user.findUnique({ where: { username }, select: { id: true } }))) {
      await prisma.user.create({ data: { username, displayName, email: `${username}@apc.test`, passwordHash: await hashPassword(password) } });
    }
  }
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
    const where = { codeKey: { in: [...item.brands.map((brand) => brand.code), ...(item.originalCodes ?? [])].map(codeKey) } };
    if ((await prisma.itemBrand.count({ where })) + (await prisma.itemOriginalCode.count({ where })) > 0) {
      continue;
    }
    const brands = [];
    for (const [position, brand] of item.brands.entries()) {
      brands.push(brandData(brand, (await listIds(prisma, { partBrand: brand.partBrand })).partBrandId!, position));
    }
    const ids = (await listIds(prisma, item)) as ListIds;
    await prisma.item.create({
      data: { ...createData(item, ids), originalCodes: { create: originalCodesData(item.originalCodes ?? []) }, brands: { create: brands } },
    });
    added++;
  }
  console.log(`Seed done: ${added} sample items added, ${ITEMS.length - added} already there.`);
}

await seed().finally(() => prisma.$disconnect());
