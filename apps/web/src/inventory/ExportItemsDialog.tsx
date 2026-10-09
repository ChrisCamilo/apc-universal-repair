import { useState } from 'react'
import { csvExportName, exportedSummary, exportItems, exportScope } from '@apc/shared/item-csv'
import { API_BASE } from '../api.ts'
import { Button } from '../components/Button.tsx'
import { Dialog } from '../components/Dialog.tsx'
import { Switch } from '../components/Switch.tsx'
import { useToast } from '../components/toastContext.ts'
import { Text } from '../components/Typography.tsx'

// The "Exportar CSV" dialog of the Inventory tab: it says which items go into the file, the whole list as it is (the
// search, the filters, the stock status and the sort) across all its pages, and offers to add each item's photo
// paths, off by default. "Exportar" fetches every item of the list, downloads them as a CSV in the import's format,
// closes the dialog and says how many items went into the file; when they can't be fetched, a toast says so and the
// dialog stays open. With nothing in the list there is nothing to export.

type ExportItemsDialogProps = {
  open: boolean
  /** The list query from itemListQuery, with the search, filters, status and sort, and no page. */
  query: string
  /** How many items the list holds, across all its pages. */
  count: number
  /** Whether the search, the filters or the stock status narrow the list. */
  narrowed: boolean
  onClose: () => void
}

export function ExportItemsDialog({ open, query, count, narrowed, onClose }: ExportItemsDialogProps) {
  const toast = useToast()
  const [photos, setPhotos] = useState(false)
  const [exporting, setExporting] = useState(false)

  /** Fetches every item of the list, downloads the file and says how many items it holds, or that it failed. */
  const submit = async () => {
    setExporting(true)
    const exported = await exportItems(API_BASE, query, { photos })
    setExporting(false)
    if (!exported) {
      toast('Não foi possível exportar os itens. Tente de novo.')
      return
    }
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([exported.csv], { type: 'text/csv;charset=utf-8' }))
    link.download = csvExportName(new Date())
    link.click()
    // Let go of the file once the download has it.
    setTimeout(() => URL.revokeObjectURL(link.href))
    toast(exportedSummary(exported.count))
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Exportar CSV"
      size="confirm"
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" loading={exporting} disabled={count === 0} onClick={submit}>
            Exportar
          </Button>
        </>
      }
    >
      <Text size="sm">{exportScope(count, narrowed)}</Text>
      <Text size="sm" tone="muted">
        Todas as páginas vão no arquivo, no formato do modelo de importação.
      </Text>
      <Switch checked={photos} onCheckedChange={setPhotos} disabled={count === 0}>
        Incluir o caminho das fotos
      </Switch>
      <Text size="sm" tone="muted">
        Para reaproveitar as mesmas fotos depois. Os caminhos vão na coluna “photos”, a capa primeiro.
      </Text>
    </Dialog>
  )
}
