import { CSV_TEMPLATE, CSV_TEMPLATE_NAME } from '@apc/domain/item-csv'

// The import's template as a file to save, which Importar Peças' Baixar modelo and the import tour hand over.

/** Hands over the template as a file to save. */
export function downloadCsvTemplate() {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' }))
  link.download = CSV_TEMPLATE_NAME
  link.click()
  // Let go of the file once the download has it.
  setTimeout(() => URL.revokeObjectURL(link.href))
}
