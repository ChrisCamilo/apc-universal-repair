import { useId } from 'react'
import { carSheet, type Catalog } from '@apc/domain/catalog'
import { itemCardCode, itemCardDetails, stockTint, type Item } from '@apc/domain/items'
import { photoAddress } from '@apc/domain/photos'
import { filterIcon } from '@apc/tokens/icons'
import { API_BASE } from '../../app/api.ts'
import { Button } from '../../components/Button'
import { DataTable, TableThumbnail, TableTitle } from '../../components/DataTable'
import { EmptyState } from '../../components/EmptyState'
import { Heading } from '../../components/Typography'
import { usePhone } from '../../components/usePhone.ts'
import { carSheet as carSheetStyles } from './CarSheet.styles.ts'
import { StockQuantity } from '../inventory/StockQuantity.tsx'

// A model's or a version's sheet in the Catalog (see carSheet in @apc/domain/catalog): its title; a model's brand and
// its generations, each with its years ("85/90") and versions; a version's generation and years; and its engines with
// sheets, each a link that opens its engine's sheet, or a note when it has none yet. Under it, CarParts lists the parts
// in stock that fit it, as the Inventory's rows (its cards on a phone): photo, name, code, where it fits, where it is and its price, and quantity with its stock
// status, tinted by it. A click on one opens its details in the Inventory, and "Ver todas as peças" opens the
// Inventory with the filters that list them; with none, a note says so.

// A part's row: its photo, its name and code, and its quantity.
const PART_COLUMNS = [
  {
    key: 'photo',
    header: 'Foto',
    headerHidden: true,
    card: 'thumb' as const,
    cell: (item: Item) => {
      const photo = item.brands.flatMap((brand) => brand.photos)[0]
      return <TableThumbnail src={photo && photoAddress(photo.thumbUrl, API_BASE)} label={`Foto de ${item.name}`} />
    },
  },
  { key: 'name', header: 'Item', card: 'main' as const, cell: (item: Item) => <TableTitle title={item.name} code={itemCardCode(item)} details={itemCardDetails(item)} /> },
  { key: 'quantity', header: 'Qtd.', numeric: true, card: 'end' as const, cell: (item: Item) => <StockQuantity {...item} /> },
]

type CarSheetProps = {
  catalog: Catalog
  brandId: string
  /** A model or a version of the brand's tree. */
  nodeId: string
  /** Opens an engine's sheet. */
  onEngine: (id: string) => void
}

type CarPartsProps = {
  /** The parts in stock that fit the car. */
  parts: Item[]
  /** Opens a part's details in the Inventory. */
  onPart: (item: Item) => void
  /** Opens the Inventory with the filters that list the parts. */
  onAll: () => void
}

export function CarSheet({ catalog, brandId, nodeId, onEngine }: CarSheetProps) {
  const phone = usePhone()
  const { classes, ids } = carSheetStyles()
  const sheet = carSheet(catalog, brandId, nodeId)
  const brand = catalog.brands.find((each) => each.id === brandId)!
  return (
    <div className={classes.base()} data-testid={ids.base}>
      <Heading level={phone ? 2 : 3}>{sheet.title}</Heading>
      <dl className={classes.facts()} data-testid={ids.facts}>
        {sheet.level === 'model' && (
          <div className={classes.fact()} data-testid={ids.fact}>
            <dt className={classes.term()} data-testid={ids.term}>
              Marca
            </dt>
            <dd className={classes.value()} data-testid={ids.value}>
              {brand.name}
            </dd>
          </div>
        )}
        <div className={classes.fact()} data-testid={ids.fact}>
          <dt className={classes.term()} data-testid={ids.term}>
            {sheet.level === 'model' ? 'Gerações' : 'Geração'}
          </dt>
          <dd className={classes.value()} data-testid={ids.value}>
            {sheet.generations.length > 0 ? (
              <ul className={classes.list()} data-testid={ids.list}>
                {sheet.generations.map((generation) => (
                  <li key={generation.id} className={classes.generation()} data-testid={ids.generation}>
                    <span>
                      {generation.name}{' '}
                      <span className={classes.years()} data-testid={ids.years}>
                        {generation.years}
                      </span>
                    </span>
                    {generation.versions.length > 0 && (
                      <span className={classes.versions()} data-testid={ids.versions}>
                        {generation.versions.join(', ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              'Nenhuma geração cadastrada'
            )}
          </dd>
        </div>
        <div className={classes.fact()} data-testid={ids.fact}>
          <dt className={classes.term()} data-testid={ids.term}>
            Motores
          </dt>
          <dd className={classes.value()} data-testid={ids.value}>
            {sheet.engines.length > 0 ? (
              <ul className={classes.list()} data-testid={ids.list}>
                {sheet.engines.map((engine) => (
                  <li key={engine.id}>
                    <Button variant="link" size="sm" className={classes.engine()} onClick={() => onEngine(engine.id)}>
                      {engine.label}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              'Nenhum motor com ficha ainda'
            )}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function CarParts({ parts, onPart, onAll }: CarPartsProps) {
  const { classes, ids } = carSheetStyles()
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={classes.parts()} data-testid={ids.parts}>
      <h3 id={headingId} className={classes.heading()} data-testid={ids.heading}>
        Peças disponíveis · {parts.length}
      </h3>
      {parts.length > 0 ? (
        <>
          <DataTable
            label="Peças disponíveis"
            columns={PART_COLUMNS}
            rows={parts}
            rowKey={(item) => item.id}
            rowStatus={stockTint}
            sort={null}
            onSortChange={() => {}}
            unsortedLabel=""
            empty={null}
            sortSelect={false}
            onRowOpen={onPart}
          />
          <Button variant="secondary" icon={filterIcon} onClick={onAll}>
            Ver todas as peças
          </Button>
        </>
      ) : (
        <EmptyState title="Nenhuma peça no estoque" message="As peças cadastradas para esse carro aparecem aqui." />
      )}
    </section>
  )
}
