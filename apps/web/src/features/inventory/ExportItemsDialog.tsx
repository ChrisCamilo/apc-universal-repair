import { useState } from 'react'
import { csvExportName, exportedSummary, exportItems, exportScope } from '@apc/domain/item-csv'
import { exportMercadoLivre, mercadoLivreExportName, mercadoLivreSummary } from '@apc/domain/mercado-livre-csv'
import { API_BASE } from '../../app/api.ts'
import { Button } from '../../components/Button'
import { Dialog } from '../../components/Dialog'
import { Switch } from '../../components/Switch'
import { useToast } from '../../components/Toast'
import { Text } from '../../components/Typography'
import { usePhone } from '../../components/usePhone.ts'
import { mercadoLivreZip } from './mercadoLivreZip.ts'

// The "Exportar Peças" dialog of the Inventory tab: it says which items go into the file, the whole list as it is (the
// search, the filters, the stock status and the sort) across all its pages, and offers to add each item's photo
// paths, off by default. "Exportar" fetches every item of the list, downloads them as a CSV in the import's format,
// closes the dialog and says how many items went into the file; when they can't be fetched, a toast says so and the
// dialog stays open. "Exportar para o Mercado Livre", off by default, downloads instead a zip with the listings in
// Mercado Livre's words, one for each brand with stock and a price it takes, to copy into the spreadsheet of its
// Anunciador em massa, and their photos for its Gestor de fotos; the photo paths' switch hides meanwhile, and the toast
// also says how many brands were left out. With nothing in the list there is nothing to export. On a phone it fills
// the screen, with the × at the left of its title, as the other dialogs of the "Mais ações" menu do.

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

/**
 * Downloads a file the export made.
 * @param name The file's name.
 * @param blob Its content.
 */
function download(name: string, blob: Blob) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = name
  link.click()
  // Let go of the file once the download has it.
  setTimeout(() => URL.revokeObjectURL(link.href))
}

/**
 * Fetches every item of the list and writes the file to download: the CSV in the import's format, or the zip for
 * Mercado Livre.
 * @param query The list query, with no page.
 * @param options Whether to add the photo paths, and whether the file is for Mercado Livre.
 * @returns The file, its name and the toast's text, or null when the items or a photo couldn't be fetched.
 */
async function exportFile(query: string, { photos, mercadoLivre }: { photos: boolean; mercadoLivre: boolean }) {
  if (!mercadoLivre) {
    const exported = await exportItems(API_BASE, query, { photos })
    return exported && { name: csvExportName(new Date()), blob: new Blob([exported.csv], { type: 'text/csv;charset=utf-8' }), summary: exportedSummary(exported.count) }
  }
  const listings = await exportMercadoLivre(API_BASE, query)
  const zip = listings && (await mercadoLivreZip(listings, API_BASE))
  return zip && { name: mercadoLivreExportName(new Date(), 'zip'), blob: new Blob([zip as BlobPart], { type: 'application/zip' }), summary: mercadoLivreSummary(listings) }
}

export function ExportItemsDialog({ open, query, count, narrowed, onClose }: ExportItemsDialogProps) {
  const toast = useToast()
  const [photos, setPhotos] = useState(false)
  const [mercadoLivre, setMercadoLivre] = useState(false)
  const [exporting, setExporting] = useState(false)
  const phone = usePhone()

  /** Fetches every item of the list, downloads the file and says what it holds, or that it failed. */
  const submit = async () => {
    setExporting(true)
    const file = await exportFile(query, { photos, mercadoLivre })
    setExporting(false)
    if (!file) {
      toast.error('Não foi possível exportar os itens. Tente de novo.')
      return
    }
    download(file.name, file.blob)
    toast.success(file.summary)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Exportar Peças"
      size={phone ? 'form' : 'confirm'}
      closable={phone}
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
        {mercadoLivre
          ? 'Todas as páginas vão no arquivo, um anúncio por marca, nas palavras do Mercado Livre.'
          : 'Todas as páginas vão no arquivo, no formato do modelo de importação.'}
      </Text>
      <Switch checked={mercadoLivre} onCheckedChange={setMercadoLivre} disabled={count === 0}>
        Exportar para o Mercado Livre
      </Switch>
      <Text size="sm" tone="muted">
        Para copiar na planilha baixada do Anunciador em massa, na sua conta de vendedor. Vai um .zip com os anúncios e
        as fotos, para o Gestor de fotos. Marcas sem estoque ou abaixo de R$ 8,00 ficam de fora.
      </Text>
      {!mercadoLivre && (
        <>
          <Switch checked={photos} onCheckedChange={setPhotos} disabled={count === 0}>
            Incluir o caminho das fotos
          </Switch>
          <Text size="sm" tone="muted">
            Para reaproveitar as mesmas fotos depois. Os caminhos vão na coluna “photos”, a capa primeiro.
          </Text>
        </>
      )}
    </Dialog>
  )
}
