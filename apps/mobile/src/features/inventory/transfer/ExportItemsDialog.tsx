import { INVENTORY_NEEDS_SERVER } from '@apc/domain/sync-queue';
import { useState } from 'react';
import { csvExportName, exportedSummary, exportItems, exportScope } from '@apc/domain/item-csv';
import { exportMercadoLivre, mercadoLivreExportName, mercadoLivreSummary } from '@apc/domain/mercado-livre-csv';
import { apiUrl } from '../../../app/api';
import { Button } from '../../../components/Button';
import { Dialog } from '../../../components/Dialog';
import { Switch } from '../../../components/Switch';
import { useToast } from '../../../components/Toast';
import { Text } from '../../../components/Typography';
import { shareCsv } from './csv';

// The "Exportar Peças" dialog of the Inventory tab, the same as the web: it says which items go into the file, the whole
// list as it is (the search, the filters, the stock status and the sort) across all its pages, and offers to add each
// item's photo paths, off by default. "Exportar" fetches every item of the list and hands the CSV, in the import's
// format, to the phone's share sheet, to save it or send it to a computer; once shared, the dialog closes and a toast
// says how many items went into the file. When the items can't be fetched, a toast says so and the dialog stays open,
// as it does when the share sheet is closed without sharing; while the server can't be reached, it says the export
// needs it. "Exportar para o Mercado Livre", off by default, shares
// instead the listings' CSV in Mercado Livre's words, one for each brand with stock and a price it takes, to copy into
// the spreadsheet of its Anunciador em massa; the phone has no zip for the photos, which the computer's export brings.
// The photo paths' switch hides meanwhile, and the toast also says how many brands were left out. With nothing in the
// list there is nothing to export. It fills the screen, with the × at the left of its title, as the web's does on a
// phone.

type ExportItemsDialogProps = {
  open: boolean;
  /** The list query from itemListQuery, with the search, filters, status and sort, and no page. */
  query: string;
  /** How many items the list holds, across all its pages. */
  count: number;
  /** Whether the search, the filters or the stock status narrow the list. */
  narrowed: boolean;
  onClose: () => void;
  /** Whether the server can't be reached, which an export that fails then says. */
  offline?: boolean;
};

/**
 * Fetches every item of the list and writes the file to share: the CSV in the import's format, or the listings' CSV
 * for Mercado Livre.
 * @param query The list query, with no page.
 * @param options Whether to add the photo paths, and whether the file is for Mercado Livre.
 * @returns The file's name and text and the toast's text, or null when the items couldn't be fetched.
 */
async function exportFile(query: string, { photos, mercadoLivre }: { photos: boolean; mercadoLivre: boolean }) {
  if (mercadoLivre) {
    const listings = await exportMercadoLivre(apiUrl(), query);
    return listings && { name: mercadoLivreExportName(new Date(), 'csv'), csv: listings.csv, summary: mercadoLivreSummary(listings) };
  }
  const exported = await exportItems(apiUrl(), query, { photos });
  return exported && { name: csvExportName(new Date()), csv: exported.csv, summary: exportedSummary(exported.count) };
}

export function ExportItemsDialog({ open, query, count, narrowed, onClose, offline = false }: ExportItemsDialogProps) {
  const toast = useToast();
  const [photos, setPhotos] = useState(false);
  const [mercadoLivre, setMercadoLivre] = useState(false);
  const [exporting, setExporting] = useState(false);

  /** Fetches every item of the list, shares the file and says what it holds, or that it failed. */
  const submit = async () => {
    setExporting(true);
    const file = await exportFile(query, { photos, mercadoLivre });
    if (!file) {
      setExporting(false);
      toast.error(offline ? INVENTORY_NEEDS_SERVER.export : 'Não foi possível exportar os itens. Tente de novo.');
      return;
    }
    const shared = await shareCsv(file.name, file.csv);
    setExporting(false);
    if (shared) {
      toast.success(file.summary);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Exportar Peças"
      closable
      actions={
        <>
          <Button variant="secondary" size="sm" onPress={onClose}>
            Cancelar
          </Button>
          <Button size="sm" loading={exporting} disabled={count === 0} onPress={submit}>
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
        Para copiar na planilha baixada do Anunciador em massa, na sua conta de vendedor. No celular vai só o CSV dos
        anúncios; as fotos vêm no Exportar Peças do computador. Marcas sem estoque ou abaixo de R$ 8,00 ficam de fora.
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
  );
}
