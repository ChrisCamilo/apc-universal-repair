import { useRef, type KeyboardEvent } from 'react'
import { itemFit, type Catalog, type FoundPart, type PartResults as Results } from '@apc/domain/catalog'
import { itemCardDetails, stockTint } from '@apc/domain/items'
import { CATALOG_SCREEN_TEXTS } from '@apc/domain/catalog-texts'
import { perLocale } from '@apc/domain/locale'
import { photoAddress } from '@apc/domain/photos'
import { API_BASE } from '../../app/api.ts'
import { DataTable, TableThumbnail, TableTitle } from '../../components/DataTable'
import { arrowTarget } from '../../components/radioKeys.ts'
import { Text } from '../../components/Typography'
import { usePhone } from '../../components/usePhone.ts'
import { partResults } from './PartResults.styles.ts'
import { StockQuantity } from '../inventory/browse/StockQuantity.tsx'
import { useLocale } from '../../app/useLocale.ts'

// The inventory parts a Catalog search by code found, in a tinted box above the tree: each brand of an item whose code
// matched, or its original code, with the code, the item's name and which vehicle it fits (of several, the one the
// catalog knows best and how many more). Choosing one reveals that vehicle in the tree; the chosen part has the accent
// frame. The parts are a radio group: one is always chosen, it is the only Tab stop and the arrows move the choice.
// When more parts matched than fit, a line says how many more.
// On a phone (below `card:`) the parts are the Inventory's cards under a heading, as in the "Catálogo no celular"
// mockup: each with its photo, its name, the code found with its part brand, where it fits, where it is and its price,
// and its quantity with its stock status, tinted by it. A tap on one opens its vehicle (see CatalogTab).

// A found part's card, the columns of the Inventory's card: its photo, its name, code and details, and its quantity.
const CARD_COLUMNS = perLocale((locale) => {
  const texts = CATALOG_SCREEN_TEXTS[locale]
  return [
    {
      key: 'photo',
      header: texts.photo,
      headerHidden: true,
      card: 'thumb' as const,
      cell: (part: FoundPart) => {
        const photo = partBrand(part).photos[0]
        return <TableThumbnail src={photo && photoAddress(photo.thumbUrl, API_BASE)} label={texts.photoOf(part.item.name)} />
      },
    },
    {
      key: 'name',
      header: texts.item,
      card: 'main' as const,
      cell: (part: FoundPart) => <FoundTitle part={part} />,
    },
    { key: 'quantity', header: texts.quantity, numeric: true, card: 'end' as const, cell: (part: FoundPart) => <StockQuantity {...part.item} /> },
  ]
})

type PartResultsProps = {
  /** The catalog, which says which vehicle each part fits. */
  catalog: Catalog
  results: Results
  /** The chosen part's id, its brand's. */
  chosen?: string
  onChoose: (part: FoundPart) => void
}

/**
 * Finds the brand of a found part's item whose code matched, or its first brand when an original code matched.
 * @param part A found part.
 * @returns The item's brand.
 */
function partBrand({ id, item }: FoundPart) {
  return item.brands.find((brand) => brand.id === id) ?? item.brands[0]
}

export function PartResults({ catalog, results, chosen, onChoose }: PartResultsProps) {
  const { locale } = useLocale()
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const { parts, more } = results
  const phone = usePhone()
  const { classes, ids } = partResults({ phone })
  const texts = CATALOG_SCREEN_TEXTS[locale].results

  /** Moves the choice with the arrows and follows it with the focus. */
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const target = arrowTarget(event.key, index, parts.length)
    if (target === null) {
      return
    }
    event.preventDefault()
    onChoose(parts[target])
    buttons.current[target]?.focus()
  }

  if (phone) {
    return (
      <div className={classes.base()} data-testid={ids.base}>
        <h2 className={classes.heading()} data-testid={ids.heading}>
          {texts.heading(parts.length)}
        </h2>
        <Text size="sm" tone="muted">
          {texts.tap}
        </Text>
        <DataTable
          label={texts.label}
          columns={CARD_COLUMNS[locale]}
          rows={parts}
          rowKey={(part) => part.id}
          rowStatus={(part) => stockTint(part.item, locale)}
          sort={null}
          onSortChange={() => {}}
          unsortedLabel=""
          empty={null}
          sortSelect={false}
          onRowOpen={onChoose}
        />
        {more > 0 && (
          <Text size="sm" tone="muted">
            {texts.more(more)}
          </Text>
        )}
      </div>
    )
  }

  return (
    <div className={classes.base()} data-testid={ids.base}>
      <Text size="sm" tone="muted">
        {texts.intro(parts.length)}
      </Text>
      <div role="radiogroup" aria-label={texts.label} className={classes.list()} data-testid={ids.list}>
        {parts.map((part, index) => (
          <button
            key={part.id}
            ref={(node) => {
              buttons.current[index] = node
            }}
            type="button"
            role="radio"
            aria-checked={part.id === chosen}
            tabIndex={part.id === chosen ? 0 : -1}
            className={classes.part()} data-testid={ids.part}
            onClick={() => onChoose(part)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            <span className={classes.line()} data-testid={ids.line}>
              <code className={classes.code()} data-testid={ids.code}>{part.code}</code>
              <span className={classes.name()} data-testid={ids.name}>{part.item.name}</span>
            </span>
            <span className={classes.fit()} data-testid={ids.fit}>{itemFit(catalog, part.item, locale)}</span>
          </button>
        ))}
      </div>
      {more > 0 && (
        <Text size="sm" tone="muted">
          {texts.more(more)}
        </Text>
      )}
    </div>
  )
}

/** A found part's name, with its code and details in the language chosen. */
function FoundTitle({ part }: { part: FoundPart }) {
  const { locale } = useLocale()
  return <TableTitle title={part.item.name} code={`${part.code} · ${partBrand(part).partBrand}`} details={itemCardDetails(part.item, locale)} />
}
