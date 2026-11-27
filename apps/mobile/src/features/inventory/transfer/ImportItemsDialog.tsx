import { INVENTORY_NEEDS_SERVER } from '@apc/domain/sync-queue';
import { useLocale, useMessages } from '../../../app/locale';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  importedDetails,
  importedItems,
  importedSummary,
  importItems,
  newListNames,
  readItemsCsv,
  rowsSummary,
  type CsvItemRow,
  type CsvItems,
} from '@apc/domain/item-csv';
import { tourTarget } from '../../../components/Tour';
import { ITEM_LIST_TEXTS, type ItemLists } from '@apc/domain/lists';
import { perLocale } from '@apc/domain/locale';
import { apiUrl } from '../../../app/api';
import { Button } from '../../../components/Button';
import { Dialog } from '../../../components/Dialog';
import { useToast } from '../../../components/Toast';
import { Heading, NumericReadout, Text } from '../../../components/Typography';
import { pickCsv, shareTemplate } from './csv';
import { useStyles } from './ImportItemsDialog.styles';
import { COMMON_TEXTS } from '@apc/domain/app-texts';
import { INVENTORY_SCREEN_TEXTS } from '@apc/domain/inventory-texts';
import { PHONE_TEXTS } from '../../../app/phoneTexts';

// The "Importar Peças" dialog of the Inventory tab, the same as the web: it explains the file, shares the template
// (to save it or send it to a computer) and reads the file picked from the phone's files. The preview counts the items
// ready and the rows with errors, lists the categories, brands and models the import creates, and shows each row as it
// will be saved, the rows with errors marked with their reasons; rows with the same "item" are the brands of one item.
// "Importar" sends the valid items only, and a toast says how many items were created and updated; a file that can't
// be read says why, and another can be picked. The import needs the server: while it can't be reached, it says so. It fills the screen, as every form does, with the × at the left of its
// title.

/** How each list's new names are worded in the preview, e.g. "Categorias: Ignição, Turbo". */
const NEW_NAMES = perLocale(
  (locale) =>
    [
      ['categories', ITEM_LIST_TEXTS[locale].categories.title],
      ['partBrands', ITEM_LIST_TEXTS[locale].partBrands.title],
      ['vehicleBrands', ITEM_LIST_TEXTS[locale].vehicleBrands.title],
    ] as const,
);

/** The rows before a file is read, the same on every render. */
const NO_ROWS: CsvItemRow[] = [];

type ImportItemsDialogProps = {
  open: boolean;
  /** The lists the API keeps, whose spelling the imported names take. */
  lists: ItemLists;
  onClose: () => void;
  /** Called once the items are imported, so the inventory and the lists load again. */
  onImported: () => void;
  /** Whether the server can't be reached, which an import that fails then says. */
  offline?: boolean;
  /** A file the dialog opens having read, as if picked, e.g. the import tour's sample. */
  initialFile?: { name: string; text: string };
  /** Called with the rows of the file read, on each file, e.g. for the import tour. */
  onRowsChange?: (rows: readonly CsvItemRow[]) => void;
  /** Called once the template is handed to the share sheet, e.g. for the import tour. */
  onTemplate?: () => void;
};

export function ImportItemsDialog({ open, lists, onClose, onImported, offline = false, initialFile, onRowsChange, onTemplate }: ImportItemsDialogProps) {
  const { locale } = useLocale();
  const texts = INVENTORY_SCREEN_TEXTS[locale];
  const common = COMMON_TEXTS[locale];
  const phone = PHONE_TEXTS[locale].inventory;
  const { styles, ids } = useStyles();
  const toast = useToast();
  const needsServer = useMessages(INVENTORY_NEEDS_SERVER);
  // The file read, with its name.
  const [read, setRead] = useState<{ name: string; result: CsvItems } | undefined>(
    () => initialFile && { name: initialFile.name, result: readItemsCsv(initialFile.text, lists, locale) },
  );
  const [importing, setImporting] = useState(false);
  const rows = read && 'rows' in read.result ? read.result.rows : NO_ROWS;
  // The items the import sends: the rows of one item count once.
  const valid = importedItems(rows).length;
  const created = newListNames(rows, lists);
  const creates = [
    ...NEW_NAMES[locale].filter(([kind]) => created[kind].length > 0).map(([kind, title]) => `${title}: ${created[kind].join(', ')}`),
    ...(created.vehicleModels.length > 0
      ? [`${ITEM_LIST_TEXTS[locale].vehicleModels.title}: ${created.vehicleModels.map((model) => `${model.name} (${model.vehicleBrand})`).join(', ')}`]
      : []),
  ];

  // Tell the owner the rows of each file read.
  useEffect(() => {
    onRowsChange?.(rows);
  }, [rows, onRowsChange]);

  /** Hands the template to the share sheet. */
  const template = () => {
    shareTemplate();
    onTemplate?.();
  };

  /** Picks a file and reads it into the preview; a file that can't be opened says so in a toast. */
  const choose = async () => {
    const file = await pickCsv().catch(() => {
      toast.error(phone.fileFailed);
      return null;
    });
    if (file) {
      setRead({ name: file.name, result: readItemsCsv(file.text, lists, locale) });
    }
  };

  /** Sends the valid rows, then says how many items were created and updated. */
  const submit = async () => {
    setImporting(true);
    const result = await importItems(apiUrl(), rows);
    setImporting(false);
    if (!result) {
      toast.error(offline ? needsServer.import : texts.import.failed);
      return;
    }
    toast.success(importedSummary(result, locale));
    onImported();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={texts.importItems}
      closable
      actions={
        <>
          <Button variant="secondary" size="sm" onPress={onClose}>
            {common.cancel}
          </Button>
          <View ref={tourTarget('import-submit')} collapsable={false}>
            <Button size="sm" loading={importing} disabled={valid === 0} onPress={submit}>
              {texts.import.submit(valid)}
            </Button>
          </View>
        </>
      }
    >
      <Text size="sm" tone="muted">
        {texts.import.hint}
      </Text>
      <View style={styles.buttons} testID={ids.buttons}>
        <View ref={tourTarget('import-template')} collapsable={false}>
          <Button variant="secondary" size="sm" onPress={template}>
            {phone.shareTemplate}
          </Button>
        </View>
        <View ref={tourTarget('import-choose')} collapsable={false}>
          <Button size="sm" onPress={choose}>
            {read ? texts.import.chooseOther : texts.import.chooseFile}
          </Button>
        </View>
      </View>
      {read && 'error' in read.result && (
        <Text size="sm" tone="danger">
          {`${read.name}: ${read.result.error}`}
        </Text>
      )}
      {read && 'rows' in read.result && (
        <View ref={tourTarget('import-preview')} collapsable={false} style={styles.preview} testID={ids.preview} accessibilityLabel={texts.import.preview}>
          <Text size="sm">{`${read.name} · ${rowsSummary(rows, locale)}`}</Text>
          {creates.length > 0 && (
            <View style={styles.creates} testID={ids.creates}>
              <Heading level={4}>{texts.import.created}</Heading>
              {creates.map((line) => (
                <Text key={line} size="sm" tone="muted">
                  {line}
                </Text>
              ))}
            </View>
          )}
          {rows.map(({ line, item, errors }) => (
            <View key={line} style={[styles.row, errors.length > 0 && styles.rowInvalid]} testID={ids.row}>
              <View style={styles.head} testID={ids.head}>
                <NumericReadout tone="muted">{texts.import.row(line)}</NumericReadout>
                <NumericReadout>{item.brands[0].code || '—'}</NumericReadout>
                <Text size="sm">{item.name || '—'}</Text>
              </View>
              <Text size="sm" tone="muted">
                {importedDetails(item, locale)}
              </Text>
              {errors.map((error) => (
                <Text key={error} size="sm" tone="danger">
                  {error}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </Dialog>
  );
}
