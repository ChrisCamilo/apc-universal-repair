import { strToU8, zipSync, type Zippable } from 'fflate'
import { apiFetch } from '@apc/domain/auth'
import { MERCADO_LIVRE_CSV_NAME, MERCADO_LIVRE_PHOTOS_FOLDER, type MercadoLivreListings } from '@apc/domain/mercado-livre-csv'
import { photoAddress } from '@apc/domain/photos'

// The web's file for Mercado Livre: the listings' CSV and, in a folder beside it, each listing's photos, fetched from the
// API and named after their brand's code, for the photo manager (Gestor de fotos). The photos are stored as they are,
// since they are compressed already.

/**
 * Fetches the listings' photos and puts them in a zip with the listings' CSV.
 * @param listings The listings, with their photos' names and addresses.
 * @param base Where the API is reached, e.g. "/api".
 * @returns The zip's bytes, or null when a photo couldn't be fetched.
 */
export async function mercadoLivreZip(listings: MercadoLivreListings, base: string): Promise<Uint8Array | null> {
  const photos = await Promise.all(
    listings.photos.map(async ({ name, url }) => {
      const response = await apiFetch(photoAddress(url, base)).catch(() => null)
      return response?.ok ? ([name, new Uint8Array(await response.arrayBuffer())] as const) : null
    }),
  )
  if (photos.some((photo) => photo === null)) {
    return null
  }
  const folder: Zippable = Object.fromEntries(photos.map((photo) => [photo![0], [photo![1], { level: 0 }]]))
  return zipSync({ [MERCADO_LIVRE_CSV_NAME]: strToU8(listings.csv), [MERCADO_LIVRE_PHOTOS_FOLDER]: folder })
}
