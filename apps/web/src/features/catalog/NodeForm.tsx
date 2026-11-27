import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import {
  CATALOG_YEAR_PLACEHOLDER,
  readCatalogFields,
  yearInput,
  type CatalogEditLevel,
  type CatalogFields,
  type CatalogValues,
  type CatalogYearLimits,
} from '@apc/domain/catalog'
import { checkIcon, closeIcon } from '@apc/tokens/icons'
import { COMMON_TEXTS } from '@apc/domain/app-texts'
import { CATALOG_SCREEN_TEXTS } from '@apc/domain/catalog-texts'
import { RowAction } from '../../components/DataTable'
import { TextField } from '../../components/TextField'
import { nodeForm } from './NodeForm.styles.ts'
import { useLocale } from '../../app/useLocale.ts'

// The row that adds or renames a node of the Catalog's tree, or a brand: a brand, a model or a version by its name, a
// generation by its name and its first and last years (the last one empty while it is still made), and a period by its
// first and last years (De and Até, the last one empty for a single year). A year field shows "AAAA" and takes only
// digits, four at most; a period keeps inside its generation's years and a generation around its periods' (see
// readCatalogFields). ✓ or Enter saves what is typed, once it is filled in right; ✕ or Escape gives up. It opens on its first
// field, and shows under each field why it can't be saved, or the owner's error, such as a name another node has. In a
// phone's bottom sheet the form goes without ✓ and ✕: the sheet's own buttons send it, by its id.

type NodeFormProps = {
  /** The form's id, for a button outside it to send it. */
  id?: string
  /** Whether the row ends with ✓ and ✕; false when buttons outside it send it and give up. */
  buttons?: boolean
  /** What is added or renamed: a brand or a level of the tree. */
  level: CatalogEditLevel | 'brand'
  /** Accessible name of the row, e.g. "Nova geração em Opala" or "Renomear Opala". */
  label: string
  /** What the fields open with, when renaming. */
  initial?: CatalogValues
  /** The years a period or a generation keeps to (see catalogYearLimits); none for the other levels. */
  limits?: CatalogYearLimits
  /** Why the owner couldn't save it, e.g. a name another node has, shown under the first field. */
  error?: string
  /** While the owner saves it. */
  saving?: boolean
  onSave: (values: CatalogValues) => void
  onCancel: () => void
}

export function NodeForm({ id, buttons = true, level, label, initial = {}, limits, error, saving = false, onSave, onCancel }: NodeFormProps) {
  const { locale } = useLocale()
  const texts = CATALOG_SCREEN_TEXTS[locale].form
  const common = COMMON_TEXTS[locale]
  const { classes, ids } = nodeForm()
  const form = useRef<HTMLFormElement>(null)
  const [name, setName] = useState(initial.name ?? '')
  const [firstYear, setFirstYear] = useState(initial.firstYear?.toString() ?? '')
  const [lastYear, setLastYear] = useState(initial.lastYear?.toString() ?? '')
  const [year, setYear] = useState(initial.year?.toString() ?? '')
  const [problems, setProblems] = useState<Partial<Record<keyof CatalogFields, string>>>({})
  const named = level !== 'year'

  /** Checks what is typed and hands it over, or says what to fix under each field. */
  const save = (event: FormEvent) => {
    event.preventDefault()
    const read = readCatalogFields(level, { name, firstYear, lastYear, year }, locale, limits)
    setProblems('problems' in read ? read.problems : {})
    if ('values' in read) {
      onSave(read.values)
    }
  }

  /** Saves on Enter in any field, which a form of several fields and no submit button wouldn't do, and gives up on Escape. */
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    } else if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      event.preventDefault()
      form.current?.requestSubmit()
    }
  }

  return (
    <form ref={form} id={id} aria-label={label} className={classes.base()} data-testid={ids.base} data-tour="catalog-form" onSubmit={save} onKeyDown={onKeyDown} noValidate>
      {named && (
        <div className={classes.name()} data-testid={ids.name}>
          <TextField label={texts.name} value={name} onValueChange={setName} error={problems.name ?? error} autoFocus />
        </div>
      )}
      {level === 'generation' && (
        <>
          <div className={classes.year()} data-testid={ids.year}>
            <TextField
              label={texts.from}
              kind="number"
              placeholder={CATALOG_YEAR_PLACEHOLDER[locale]}
              value={firstYear}
              onValueChange={(typed) => setFirstYear(yearInput(typed))}
              error={problems.firstYear}
            />
          </div>
          <div className={classes.year()} data-testid={ids.year}>
            <TextField
              label={texts.to}
              kind="number"
              placeholder={CATALOG_YEAR_PLACEHOLDER[locale]}
              value={lastYear}
              onValueChange={(typed) => setLastYear(yearInput(typed))}
              error={problems.lastYear}
            />
          </div>
        </>
      )}
      {level === 'year' && (
        <>
          <div className={classes.year()} data-testid={ids.year}>
            <TextField
              label={texts.from}
              kind="number"
              placeholder={CATALOG_YEAR_PLACEHOLDER[locale]}
              value={year}
              onValueChange={(typed) => setYear(yearInput(typed))}
              error={problems.year ?? error}
              autoFocus
            />
          </div>
          <div className={classes.year()} data-testid={ids.year}>
            <TextField
              label={texts.to}
              kind="number"
              placeholder={texts.sameYear}
              value={lastYear}
              onValueChange={(typed) => setLastYear(yearInput(typed))}
              error={problems.lastYear}
            />
          </div>
        </>
      )}
      {buttons && (
        <div className={classes.buttons()} data-testid={ids.buttons}>
          <RowAction icon={checkIcon} label={common.save} onClick={() => form.current?.requestSubmit()} disabled={saving} />
          <RowAction icon={closeIcon} label={common.cancel} onClick={onCancel} />
        </div>
      )}
    </form>
  )
}
