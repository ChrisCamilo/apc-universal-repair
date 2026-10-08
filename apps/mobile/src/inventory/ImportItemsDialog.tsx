import { useState } from 'react';
import { View, type ViewStyle } from 'react-native';
import {
  importedDetails,
  importedSummary,
  importItems,
  newListNames,
  readItemsCsv,
  rowsSummary,
  type CsvItems,
} from '@apc/shared/item-csv';
import { ITEM_LIST_TEXTS, type ItemLists } from '@apc/shared/lists';
import { scales } from '@apc/shared/theme';
import { API_URL } from '../api';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { softHairline } from '../Panel';
import { useTheme, type ActiveTheme } from '../theme';
import { useToast } from '../Toast';
import { Heading, NumericReadout, Text } from '../Typography';
import { pickCsv, shareTemplate } from './csv';

// The "Importar CSV" dialog of the Inventory tab, the same as the web: it explains the file, shares the template
// (to save it or send it to a computer) and reads the file picked from the phone's files. The preview counts the rows
// ready and those with errors, lists the categories, brands and models the import creates, and shows each row as it
// will be saved, the rows with errors marked with their reasons. "Importar" sends the valid rows only, and a toast
// says how many items were created and updated; a file that can't be read says why, and another can be picked.

const BUTTONS_STYLE: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: scales.space.s2 };
const HEAD_STYLE: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: scales.space.s2 };
/** How each list's new names are worded in the preview, e.g. "Categorias: Ignição, Turbo". */
const NEW_NAMES = [
  ['categories', ITEM_LIST_TEXTS.categories.title],
  ['partBrands', ITEM_LIST_TEXTS.partBrands.title],
  ['vehicleBrands', ITEM_LIST_TEXTS.vehicleBrands.title],
] as const;
const SECTION_STYLE: ViewStyle = { gap: scales.space.s1 };

type ImportItemsDialogProps = {
  open: boolean;
  /** The lists the API keeps, whose spelling the imported names take. */
  lists: ItemLists;
  onClose: () => void;
  /** Called once the items are imported, so the inventory and the lists load again. */
  onImported: () => void;
};

/**
 * Styles a row of the preview: a soft hairline under it, and a danger stripe at its start when it has errors.
 * @param theme Active theme.
 * @param invalid Whether the row has errors.
 * @returns Style for the row View.
 */
function rowStyle(theme: ActiveTheme, invalid: boolean): ViewStyle {
  return {
    gap: scales.space.s1 / 2,
    paddingVertical: scales.space.s2,
    borderBottomWidth: 1,
    borderBottomColor: softHairline(theme),
    ...(invalid && { borderLeftWidth: 2, borderLeftColor: theme.colors.danger, paddingLeft: scales.space.s3 }),
  };
}

export function ImportItemsDialog({ open, lists, onClose, onImported }: ImportItemsDialogProps) {
  const theme = useTheme();
  const toast = useToast();
  // The file read, with its name.
  const [read, setRead] = useState<{ name: string; result: CsvItems }>();
  const [importing, setImporting] = useState(false);
  const rows = read && 'rows' in read.result ? read.result.rows : [];
  const valid = rows.filter((row) => row.errors.length === 0).length;
  const created = newListNames(rows, lists);
  const creates = [
    ...NEW_NAMES.filter(([kind]) => created[kind].length > 0).map(([kind, title]) => `${title}: ${created[kind].join(', ')}`),
    ...(created.vehicleModels.length > 0
      ? [`${ITEM_LIST_TEXTS.vehicleModels.title}: ${created.vehicleModels.map((model) => `${model.name} (${model.vehicleBrand})`).join(', ')}`]
      : []),
  ];

  /** Picks a file and reads it into the preview; a file that can't be opened says so in a toast. */
  const choose = async () => {
    const file = await pickCsv().catch(() => {
      toast('Não foi possível abrir o arquivo. Tente de novo.');
      return null;
    });
    if (file) {
      setRead({ name: file.name, result: readItemsCsv(file.text, lists) });
    }
  };

  /** Sends the valid rows, then says how many items were created and updated. */
  const submit = async () => {
    setImporting(true);
    const result = await importItems(API_URL, rows);
    setImporting(false);
    if (!result) {
      toast('Não foi possível importar os itens. Tente de novo.');
      return;
    }
    toast(importedSummary(result));
    onImported();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Importar CSV"
      actions={
        <>
          <Button variant="secondary" size="sm" onPress={onClose}>
            Cancelar
          </Button>
          <Button size="sm" loading={importing} disabled={valid === 0} onPress={submit}>
            {valid === 1 ? 'Importar 1 item' : `Importar ${valid} itens`}
          </Button>
        </>
      }
    >
      <Text size="sm" tone="muted">
        Use o modelo: uma linha por item, separada por vírgula ou ponto e vírgula, em UTF-8. Com vírgula, um valor como
        “189,90” vai entre aspas. Um código que já está no estoque atualiza o item.
      </Text>
      <View style={BUTTONS_STYLE}>
        <Button variant="secondary" size="sm" onPress={shareTemplate}>
          Compartilhar modelo
        </Button>
        <Button size="sm" onPress={choose}>
          {read ? 'Escolher outro arquivo' : 'Escolher arquivo'}
        </Button>
      </View>
      {read && 'error' in read.result && (
        <Text size="sm" tone="danger">
          {`${read.name}: ${read.result.error}`}
        </Text>
      )}
      {read && 'rows' in read.result && (
        <View style={SECTION_STYLE} accessibilityLabel="Prévia da importação">
          <Text size="sm">{`${read.name} · ${rowsSummary(rows)}`}</Text>
          {creates.length > 0 && (
            <View style={SECTION_STYLE}>
              <Heading level={4}>Serão criados</Heading>
              {creates.map((line) => (
                <Text key={line} size="sm" tone="muted">
                  {line}
                </Text>
              ))}
            </View>
          )}
          {rows.map(({ line, item, errors }) => (
            <View key={line} style={rowStyle(theme, errors.length > 0)} testID={errors.length > 0 ? 'import-row-invalid' : 'import-row'}>
              <View style={HEAD_STYLE}>
                <NumericReadout tone="muted">{`Linha ${line}`}</NumericReadout>
                <NumericReadout>{item.code || '—'}</NumericReadout>
                <Text size="sm">{item.name || '—'}</Text>
              </View>
              <Text size="sm" tone="muted">
                {importedDetails(item)}
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
