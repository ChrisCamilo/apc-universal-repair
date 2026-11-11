import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { CATALOG_YEARS, type CatalogEditLevel, type CatalogValues } from '@apc/domain/catalog'
import { checkIcon, closeIcon } from '@apc/tokens/icons'
import { RowAction } from '../../components/DataTable'
import { TextField } from '../../components/TextField'
import { nodeForm } from './NodeForm.styles.ts'

// The row that adds or renames a node of the Catalog's tree, or a brand: a brand, a model or a version by its name, a
// generation by its name and its first and last years (the last one empty while it is still made), and a year by its
// number. ✓ or Enter saves what is typed, once it is filled in right; ✕ or Escape gives up. It opens on its first
// field, and shows under each field why it can't be saved, or the owner's error, such as a name another node has.

/** The years a field takes, as typed. */
const YEAR = /^\d{4}$/

type NodeFormProps = {
  /** What is added or renamed: a brand or a level of the tree. */
  level: CatalogEditLevel | 'brand'
  /** Accessible name of the row, e.g. "Nova geração em Opala" or "Renomear Opala". */
  label: string
  /** What the fields open with, when renaming. */
  initial?: CatalogValues
  /** Why the owner couldn't save it, e.g. a name another node has, shown under the first field. */
  error?: string
  /** While the owner saves it. */
  saving?: boolean
  onSave: (values: CatalogValues) => void
  onCancel: () => void
}

/**
 * Reads a year as typed.
 * @param text The field's text.
 * @returns The year, or null when it isn't four digits in the catalog's range.
 */
function readYear(text: string): number | null {
  const year = Number(text)
  return YEAR.test(text.trim()) && year >= CATALOG_YEARS.min && year <= CATALOG_YEARS.max ? year : null
}

export function NodeForm({ level, label, initial = {}, error, saving = false, onSave, onCancel }: NodeFormProps) {
  const { classes, ids } = nodeForm()
  const form = useRef<HTMLFormElement>(null)
  const [name, setName] = useState(initial.name ?? '')
  const [firstYear, setFirstYear] = useState(initial.firstYear?.toString() ?? '')
  const [lastYear, setLastYear] = useState(initial.lastYear?.toString() ?? '')
  const [year, setYear] = useState(initial.year?.toString() ?? '')
  const [problems, setProblems] = useState<Record<string, string>>({})
  const named = level !== 'year'
  const yearsMessage = `Use um ano de ${CATALOG_YEARS.min} a ${CATALOG_YEARS.max}.`

  /** Checks what is typed and hands it over, or says what to fix under each field. */
  const save = (event: FormEvent) => {
    event.preventDefault()
    const found: Record<string, string> = {}
    if (named && !name.trim()) {
      found.name = 'Informe o nome.'
    }
    if (level === 'year') {
      const read = readYear(year)
      if (read === null) {
        found.year = yearsMessage
      }
      if (Object.keys(found).length === 0) {
        onSave({ year: read! })
      }
      setProblems(found)
      return
    }
    if (level === 'generation') {
      const first = readYear(firstYear)
      const last = lastYear.trim() ? readYear(lastYear) : null
      if (first === null) {
        found.firstYear = yearsMessage
      }
      if (lastYear.trim() && last === null) {
        found.lastYear = yearsMessage
      } else if (first !== null && last !== null && last < first) {
        found.lastYear = 'O último ano não pode vir antes do primeiro.'
      }
      setProblems(found)
      if (Object.keys(found).length === 0) {
        onSave({ name, firstYear: first!, lastYear: last })
      }
      return
    }
    setProblems(found)
    if (Object.keys(found).length === 0) {
      onSave({ name })
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
    <form ref={form} aria-label={label} className={classes.base()} data-testid={ids.base} onSubmit={save} onKeyDown={onKeyDown} noValidate>
      {named && (
        <div className={classes.name()} data-testid={ids.name}>
          <TextField label="Nome" value={name} onValueChange={setName} error={problems.name ?? error} autoFocus />
        </div>
      )}
      {level === 'generation' && (
        <>
          <div className={classes.year()} data-testid={ids.year}>
            <TextField label="De" kind="number" value={firstYear} onValueChange={setFirstYear} error={problems.firstYear} />
          </div>
          <div className={classes.year()} data-testid={ids.year}>
            <TextField label="Até" kind="number" value={lastYear} onValueChange={setLastYear} error={problems.lastYear} />
          </div>
        </>
      )}
      {level === 'year' && (
        <div className={classes.year()} data-testid={ids.year}>
          <TextField label="Ano" kind="number" value={year} onValueChange={setYear} error={problems.year ?? error} autoFocus />
        </div>
      )}
      <div className={classes.buttons()} data-testid={ids.buttons}>
        <RowAction icon={checkIcon} label="Salvar" onClick={() => form.current?.requestSubmit()} disabled={saving} />
        <RowAction icon={closeIcon} label="Cancelar" onClick={onCancel} />
      </div>
    </form>
  )
}
