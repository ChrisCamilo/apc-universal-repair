import { useRef, useState } from 'react'
import {
  CSV_TEMPLATE,
  CSV_TEMPLATE_NAME,
  importedDetails,
  importedSummary,
  importItems,
  newListNames,
  readItemsCsv,
  rowsSummary,
  type CsvItems,
} from '@apc/shared/item-csv'
import { ITEM_LIST_TEXTS, type ItemLists } from '@apc/shared/lists'
import { Button } from '../components/Button.tsx'
import { Dialog } from '../components/Dialog.tsx'
import { useToast } from '../components/toastContext.ts'
import { Heading, Text } from '../components/Typography.tsx'
import { API_BASE } from './savePhotos.ts'

// The "Importar CSV" dialog of the Inventory tab: it explains the file, downloads the template and reads the file
// chosen, UTF-8, comma or semicolon separated. The preview counts the rows ready and those with errors, lists the
// categories, brands and models the import creates, and shows each row as it will be saved, the rows with errors
// marked with their reasons. "Importar" sends the valid rows only, and a toast says how many items were created and
// updated (a part code in use updates its item); a file that can't be read says why, and another can be chosen.

/** How each list's new names are worded in the preview, e.g. "Categorias: Ignição, Turbo". */
const NEW_NAMES = [
  ['categories', ITEM_LIST_TEXTS.categories.title],
  ['partBrands', ITEM_LIST_TEXTS.partBrands.title],
  ['vehicleBrands', ITEM_LIST_TEXTS.vehicleBrands.title],
] as const

type ImportItemsDialogProps = {
  open: boolean
  /** The lists the API keeps, whose spelling the imported names take. */
  lists: ItemLists
  onClose: () => void
  /** Called once the items are imported, so the inventory and the lists load again. */
  onImported: () => void
}

export function ImportItemsDialog({ open, lists, onClose, onImported }: ImportItemsDialogProps) {
  const toast = useToast()
  const picker = useRef<HTMLInputElement>(null)
  // The file read, with its name.
  const [read, setRead] = useState<{ name: string; result: CsvItems }>()
  const [importing, setImporting] = useState(false)
  const rows = read && 'rows' in read.result ? read.result.rows : []
  const valid = rows.filter((row) => row.errors.length === 0).length
  const created = newListNames(rows, lists)
  const creates = [
    ...NEW_NAMES.filter(([kind]) => created[kind].length > 0).map(([kind, title]) => `${title}: ${created[kind].join(', ')}`),
    ...(created.vehicleModels.length > 0
      ? [`${ITEM_LIST_TEXTS.vehicleModels.title}: ${created.vehicleModels.map((model) => `${model.name} (${model.vehicleBrand})`).join(', ')}`]
      : []),
  ]

  /** Hands over the template as a file to save. */
  const downloadTemplate = () => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' }))
    link.download = CSV_TEMPLATE_NAME
    link.click()
    // Let go of the file once the download has it.
    setTimeout(() => URL.revokeObjectURL(link.href))
  }

  /** Reads the file chosen into the preview. */
  const choose = async (file: File | undefined) => {
    if (file) {
      setRead({ name: file.name, result: readItemsCsv(await file.text(), lists) })
    }
  }

  /** Sends the valid rows, then says how many items were created and updated. */
  const submit = async () => {
    setImporting(true)
    const result = await importItems(API_BASE, rows)
    setImporting(false)
    if (!result) {
      toast('Não foi possível importar os itens. Tente de novo.')
      return
    }
    toast(importedSummary(result))
    onImported()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Importar CSV"
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" loading={importing} disabled={valid === 0} onClick={submit}>
            {valid === 1 ? 'Importar 1 item' : `Importar ${valid} itens`}
          </Button>
        </>
      }
    >
      <Text size="sm" tone="muted">
        Use o modelo: uma linha por item, separada por vírgula ou ponto e vírgula, em UTF-8. Com vírgula, um valor como
        “189,90” vai entre aspas. Um código que já está no estoque atualiza o item.
      </Text>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={downloadTemplate}>
          Baixar modelo
        </Button>
        <Button size="sm" onClick={() => picker.current?.click()}>
          {read ? 'Escolher outro arquivo' : 'Escolher arquivo'}
        </Button>
        <input
          ref={picker}
          type="file"
          accept=".csv,text/csv"
          aria-label="Arquivo CSV"
          className="hidden"
          onChange={(event) => {
            void choose(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </div>
      {read && 'error' in read.result && (
        <p role="alert" className="m-0 font-body text-sm text-danger">
          {read.name}: {read.result.error}
        </p>
      )}
      {read && 'rows' in read.result && (
        <section aria-label="Prévia da importação" className="grid gap-3">
          <Text size="sm">
            {read.name} · {rowsSummary(rows)}
          </Text>
          {creates.length > 0 && (
            <div className="grid gap-1">
              <Heading level={4}>Serão criados</Heading>
              {creates.map((line) => (
                <Text key={line} size="sm" tone="muted">
                  {line}
                </Text>
              ))}
            </div>
          )}
          <ul aria-label="Linhas do arquivo" className="m-0 grid list-none p-0">
            {rows.map(({ line, item, errors }) => (
              <li
                key={line}
                data-invalid={errors.length > 0 || undefined}
                className={`grid gap-0.5 border-b border-hairline-soft py-2 ${errors.length > 0 ? 'border-l-2 border-l-danger pl-3' : ''}`}
              >
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <span className="font-mono text-xs text-text-muted">Linha {line}</span>
                  <span className="font-mono text-xs text-text">{item.code || '—'}</span>
                  <span className="min-w-0 truncate font-body text-sm font-semibold text-text">{item.name || '—'}</span>
                </span>
                <Text size="sm" tone="muted">
                  {importedDetails(item)}
                </Text>
                {errors.map((error) => (
                  <p key={error} className="m-0 font-body text-sm text-danger">
                    {error}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Dialog>
  )
}
