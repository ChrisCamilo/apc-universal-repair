import { useState, type FormEvent } from 'react'
import {
  ENGINE_DRIVE_LABELS,
  ENGINE_DRIVES,
  engineLabel,
  engineSheet,
  litresText,
  readEngineFields,
  type CatalogEngineInput,
  type EngineFields,
  type EngineSheetNames,
} from '@apc/domain/catalog'
import { capitalizeFirst } from '@apc/domain/items'
import { Button } from '../../components/Button'
import { Segmented } from '../../components/Segmented'
import { TextField } from '../../components/TextField'
import { Heading, NumericReadout, Text } from '../../components/Typography'
import { engineSheetForm } from './EngineSheetForm.styles.ts'

// An engine's sheet as a form, in the Catalog's detail column, to add an engine under a year or save its sheet again:
// the displacement in litres (a comma or a dot), the cylinders, the drive and a summary. The year comes from the tree
// and isn't typed. While what is typed makes a sheet, the form shows the title it will have, the engine's name in the
// tree and its readouts as they will look. Salvar ficha checks each field and says under it what to fix; Cancelar
// gives up. On a phone the form fills a full-screen dialog, whose own Cancelar and Salvar ficha send it by its id.

type EngineSheetFormProps = {
  /** The form's id, for a button outside it to send it. */
  id?: string
  /** Whether the form ends with Cancelar and Salvar ficha; false when buttons outside it send it and give up. */
  actions?: boolean
  /** Accessible name of the form, e.g. "Novo motor em 1986". */
  label: string
  /** The year, brand, model and version the sheet's title is built from. */
  names: EngineSheetNames
  /** The sheet the form opens with, when saving it again. */
  initial?: CatalogEngineInput
  /** While the owner saves it. */
  saving?: boolean
  onSave: (sheet: CatalogEngineInput) => void
  onCancel: () => void
}

export function EngineSheetForm({ id, actions = true, label, names, initial, saving = false, onSave, onCancel }: EngineSheetFormProps) {
  const { classes, ids } = engineSheetForm()
  const [litres, setLitres] = useState(initial ? litresText(initial.displacementDl) : '')
  const [cylinders, setCylinders] = useState(initial?.cylinders.toString() ?? '')
  const [drive, setDrive] = useState<string>(initial?.drive ?? '')
  const [summary, setSummary] = useState(initial?.summary ?? '')
  const [problems, setProblems] = useState<Partial<Record<keyof EngineFields, string>>>({})
  const read = readEngineFields({ litres, cylinders, drive, summary })
  const sheet = 'sheet' in read ? read.sheet : null
  const preview = sheet && engineSheet(names, sheet)

  /** Checks the fields and saves the sheet, or says what to fix under each field. */
  const save = (event: FormEvent) => {
    event.preventDefault()
    if ('sheet' in read) {
      setProblems({})
      onSave(read.sheet)
    } else {
      setProblems(read.problems)
    }
  }

  return (
    <form id={id} aria-label={label} className={classes.base()} data-testid={ids.base} onSubmit={save} noValidate>
      <div className={classes.head()} data-testid={ids.head}>
        <p className={classes.kicker()} data-testid={ids.kicker}>
          Ficha do motor
        </p>
        <Heading level={3}>{preview?.title ?? `${names.year} · ${names.brand} ${names.model} ${names.version}`}</Heading>
      </div>
      <p className={classes.fromTree()} data-testid={ids.fromTree}>
        Ano {names.year}, do galho de cima
      </p>
      <div className={classes.pair()} data-testid={ids.pair}>
        <TextField label="Cilindrada (L)" kind="decimal" value={litres} onValueChange={setLitres} error={problems.litres} autoFocus />
        <TextField label="Cilindros" kind="number" value={cylinders} onValueChange={setCylinders} error={problems.cylinders} />
      </div>
      <div className={classes.drive()} data-testid={ids.drive}>
        <Segmented
          label="Tração"
          options={ENGINE_DRIVES.map((value) => ({ value, label: capitalizeFirst(ENGINE_DRIVE_LABELS[value].toLowerCase()) }))}
          value={drive}
          onValueChange={setDrive}
        />
        {problems.drive && (
          <p role="alert" className={classes.problem()} data-testid={ids.problem}>
            {problems.drive}
          </p>
        )}
      </div>
      <TextField label="Resumo" value={summary} onValueChange={setSummary} lines={4} />
      {sheet && preview && (
        <div className={classes.preview()} data-testid={ids.preview}>
          <Text size="sm" tone="muted">
            Na árvore: {engineLabel(sheet)}
          </Text>
          <div className={classes.readouts()} data-testid={ids.readouts}>
            {preview.specs.map((spec) => (
              <NumericReadout key={spec} tone="accent">
                {spec}
              </NumericReadout>
            ))}
          </div>
        </div>
      )}
      {actions && (
        <div className={classes.actions()} data-testid={ids.actions}>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" loading={saving}>
            Salvar ficha
          </Button>
        </div>
      )}
    </form>
  )
}
