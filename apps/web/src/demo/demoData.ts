import type { ItemBrandCreate, ItemCreate, ItemVehicleCreate } from '@apc/shared/items'
import shockAbsorber from './photos/amortecedor.svg'
import timingBelt from './photos/correia-dentada.svg'
import brakeDisc from './photos/disco-de-freio.svg'
import oilFilter from './photos/filtro-de-oleo.svg'
import sparkPlug from './photos/vela-de-ignicao.svg'

// The web app's demo starts from these, all of them made up: one user, whose first login runs the Inventory's
// tutorial, and the stock of a small workshop of Brazilian cars of the 80s and 90s, a few parts low or out of stock,
// some with more than one brand or the maker's original codes. They go through the demo's own create (see demoApi.ts),
// so they follow the API's rules; each is a day older than the one after it, so the list's newest-first order is the
// same every time. A few carry a drawing of the part, made for the demo (photos/), as the photo of their first brand.

/** The stock, oldest first. */
export const DEMO_ITEMS: ItemCreate[] = [
  part('Pastilha de freio dianteira', 'Freios', [car('Volkswagen', 'Gol'), car('Volkswagen', 'Parati')], [brand('Cobreq', 'N-1210', 12, 8990, 'A-2'), brand('Fras-le', 'PD/1210', 4, 9490, 'A-2')], { position: 'D', side: 'Ambos', minQuantity: 6, originalCodes: ['5U0 698 151'] }),
  part('Disco de freio ventilado', 'Freios', [car('Chevrolet', 'Monza')], [brand('Fremax', 'BD-3377', 4, 21500, 'A-3')], { position: 'D', side: 'Ambos', minQuantity: 2 }),
  part('Lona de freio traseira', 'Freios', [car('Fiat', 'Uno'), car('Fiat', 'Prêmio')], [brand('Fras-le', 'L-2214', 0, 6490, 'A-4')], { position: 'T', side: 'Ambos', minQuantity: 2 }),
  part('Cilindro mestre de freio', 'Freios', [car('Ford', 'Escort')], [brand('TRW', 'RCMA-0081', 2, 32900, 'A-5')], { minQuantity: 1 }),
  part('Flexível de freio', 'Freios', [car('Chevrolet', 'Chevette')], [brand('Cobreq', 'FL-0233', 6, 2890, 'A-6')], { position: 'D', side: 'LE', minQuantity: 2 }),
  part('Filtro de óleo', 'Motor', [car('Volkswagen'), car('Fiat')], [brand('Mann', 'W 712/95', 18, 3990, 'B-1'), brand('Tecfil', 'PSL 55', 10, 2990, 'B-1')], { minQuantity: 8 }),
  part('Junta do cabeçote', 'Motor', [car('Chevrolet', 'Opala')], [brand('Sabó', 'MO-0031', 2, 18990, 'B-10')], { minQuantity: 2, originalCodes: ['93 211 104'] }),
  part('Bomba de óleo', 'Motor', [car('Volkswagen', 'Fusca')], [brand('Schadek', 'BO-1144', 3, 15800, 'B-2')], { minQuantity: 1 }),
  part('Correia dentada', 'Motor', [car('Fiat', 'Uno'), car('Fiat', 'Tempra')], [brand('Gates', 'CT-488', 7, 7490, 'B-3'), brand('Dayco', '94488', 3, 6990, 'B-3')], { minQuantity: 4 }),
  part('Tensor da correia dentada', 'Motor', [car('Fiat', 'Uno')], [brand('SKF', 'VKM-12174', 0, 11900, 'B-4')], { minQuantity: 2 }),
  part('Pistão com anéis', 'Motor', [car('Chevrolet', 'Opala')], [brand('Metal Leve', 'P-9411', 6, 24500, 'B-5')], { minQuantity: 6 }),
  part('Bomba d’água', 'Arrefecimento', [car('Chevrolet', 'Chevette')], [brand('Urba', 'AR-0098', 1, 13240, 'B-3')], { minQuantity: 2 }),
  part('Radiador', 'Arrefecimento', [car('Volkswagen', 'Santana')], [brand('Visconde', 'RD-1550', 2, 45900, 'C-1')], { minQuantity: 1 }),
  part('Válvula termostática', 'Arrefecimento', [car('Ford', 'Del Rey'), car('Ford', 'Corcel II')], [brand('Wahler', 'TS-4071', 5, 4590, 'C-2')], { minQuantity: 2 }),
  part('Mangueira superior do radiador', 'Arrefecimento', [car('Fiat', 'Prêmio')], [brand('Gates', 'MG-3320', 4, 3890, 'C-2')], { minQuantity: 2 }),
  part('Amortecedor traseiro', 'Suspensão', [car('Ford', 'Escort')], [brand('Cofap', 'SU-0007', 0, 24900, 'A-10')], { position: 'T', side: 'Ambos', minQuantity: 2 }),
  part('Amortecedor dianteiro', 'Suspensão', [car('Volkswagen', 'Gol')], [brand('Monroe', 'SP-1902', 4, 28900, 'A-11'), brand('Nakata', 'HG-31016', 2, 25900, 'A-11')], { position: 'D', side: 'Ambos', minQuantity: 2 }),
  part('Bandeja de suspensão', 'Suspensão', [car('Fiat', 'Prêmio')], [brand('Cofap', 'SU-0112', 3, 15800, 'D-1')], { position: 'D', side: 'LD', minQuantity: 1 }),
  part('Pivô de suspensão', 'Suspensão', [car('Chevrolet', 'Kadett'), car('Chevrolet', 'Monza')], [brand('Nakata', 'N-9025', 8, 6790, 'D-2')], { position: 'D', side: 'Ambos', minQuantity: 4 }),
  part('Bieleta da barra estabilizadora', 'Suspensão', [car('Volkswagen', 'Gol')], [brand('Viemar', 'BE-2201', 1, 3490, 'D-2')], { position: 'D', side: 'Ambos', minQuantity: 2 }),
  part('Cabo de vela', 'Ignição', [car('Fiat', 'Uno')], [brand('NGK', 'IG-0210', 7, 6450, 'C-1')], { minQuantity: 2 }),
  part('Vela de ignição', 'Ignição', [car('Universal')], [brand('NGK', 'BPR6ES', 40, 1890, 'C-3'), brand('Bosch', 'WR7DC', 24, 1790, 'C-3')], { minQuantity: 16 }),
  part('Bobina de ignição', 'Ignição', [car('Volkswagen', 'Santana'), car('Volkswagen', 'Passat')], [brand('Bosch', 'F 000 ZS0 104', 2, 18900, 'C-4')], { minQuantity: 1 }),
  part('Tampa do distribuidor', 'Ignição', [car('Chevrolet', 'Opala')], [brand('Magneti Marelli', 'TD-0412', 0, 5490, 'C-4')], { minQuantity: 1 }),
  part('Alternador', 'Elétrica', [car('Ford', 'Verona')], [brand('Bosch', '0 123 320 041', 1, 69900, 'D-3')], { minQuantity: 1 }),
  part('Motor de arranque', 'Elétrica', [car('Fiat', 'Tempra')], [brand('Valeo', 'D7E-18', 2, 54900, 'D-3')], { minQuantity: 1 }),
  part('Farol dianteiro', 'Elétrica', [car('Chevrolet', 'Chevette')], [brand('Arteb', 'FR-0621', 2, 18500, 'D-4')], { position: 'D', side: 'LE', minQuantity: 1 }),
  part('Kit de embreagem', 'Transmissão', [car('Volkswagen', 'Gol'), car('Volkswagen', 'Voyage')], [brand('Luk', '620 3001 00', 3, 46900, 'E-1'), brand('Sachs', '6211', 1, 43900, 'E-1')], { minQuantity: 2 }),
  part('Cabo de embreagem', 'Transmissão', [car('Fiat', 'Uno')], [brand('Fras-le', 'CE-0318', 5, 4290, 'E-2')], { minQuantity: 2 }),
  part('Junta homocinética', 'Transmissão', [car('Ford', 'Escort')], [brand('Albarus', 'JH-1260', 2, 21900, 'E-3')], { position: 'D', side: 'Ambos', minQuantity: 1 }),
]

/** The drawings of the parts that have one, by the part's name. */
export const DEMO_PHOTOS: Record<string, string> = {
  'Amortecedor dianteiro': shockAbsorber,
  'Correia dentada': timingBelt,
  'Disco de freio ventilado': brakeDisc,
  'Filtro de óleo': oilFilter,
  'Vela de ignição': sparkPlug,
}
/** The demo's user, whom the demo logs in as; signing up adds others, in memory. */
export const DEMO_USER = { username: 'oficina', displayName: 'Oficina Demonstração', password: 'demo1234' }

/**
 * Writes a brand of a part.
 * @param partBrand Who makes it, e.g. "Cobreq".
 * @param code Its part code.
 * @param quantity Units in stock.
 * @param unitPriceCents Its price, in cents.
 * @param location Where it is kept, e.g. "A-2".
 * @returns The brand as the API takes it.
 */
function brand(partBrand: string, code: string, quantity: number, unitPriceCents: number, location: string): ItemBrandCreate {
  return { partBrand, code, quantity, unitPriceCents, location }
}

/**
 * Writes a vehicle a part fits.
 * @param vehicleBrand Its maker, or "Universal" for any vehicle.
 * @param vehicleModel Its model; without one, any model of the brand.
 * @returns The vehicle as the API takes it.
 */
function car(vehicleBrand: string, vehicleModel?: string): ItemVehicleCreate {
  return { vehicleBrand, vehicleModel }
}

/**
 * Writes a part of the stock.
 * @param name What it is.
 * @param category Its category.
 * @param vehicles The vehicles it fits.
 * @param brands Who makes it, the first the cover.
 * @param fields Its position, side, minimum stock and original codes.
 * @returns The item as the API takes it.
 */
function part(
  name: string,
  category: string,
  vehicles: ItemVehicleCreate[],
  brands: ItemBrandCreate[],
  fields: Pick<ItemCreate, 'position' | 'side' | 'minQuantity' | 'originalCodes'>,
): ItemCreate {
  return { name, category, vehicles, brands, ...fields }
}
