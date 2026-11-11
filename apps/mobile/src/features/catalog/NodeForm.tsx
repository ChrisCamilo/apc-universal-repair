import { useState } from 'react';
import { View } from 'react-native';
import { readCatalogFields, type CatalogEditLevel, type CatalogFields, type CatalogValues } from '@apc/domain/catalog';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useStyles } from './NodeForm.styles';

// The sheet that adds or renames a node of the Catalog's tree, or a brand, the same as the web on a phone: a brand, a
// model or a version by its name, a generation by its name and its first and last years (the last one empty while it
// is still made), and a year by its number. The button that saves (Adicionar or Salvar) checks what is typed and says
// under each field what to fix, or shows the owner's error, such as a name another node has; Cancelar, the back
// button, a tap outside or a drag down give up. The owner gives it a new key each time it opens, so it opens empty or
// with the node's values.

type NodeFormProps = {
  open: boolean;
  /** The sheet's title, e.g. "Nova geração em Opala" or "Renomear Opala". */
  title: string;
  /** What is added or renamed: a brand or a level of the tree. */
  level: CatalogEditLevel | 'brand';
  /** What the fields open with, when renaming. */
  initial?: CatalogValues;
  /** The button that saves, e.g. "Adicionar". */
  submitLabel: string;
  /** Why the owner couldn't save it, e.g. a name another node has, shown under the first field. */
  error?: string;
  /** While the owner saves it. */
  saving?: boolean;
  onSave: (values: CatalogValues) => void;
  onClose: () => void;
};

export function NodeForm({ open, title, level, initial = {}, submitLabel, error, saving = false, onSave, onClose }: NodeFormProps) {
  const { styles, ids } = useStyles();
  const [name, setName] = useState(initial.name ?? '');
  const [firstYear, setFirstYear] = useState(initial.firstYear?.toString() ?? '');
  const [lastYear, setLastYear] = useState(initial.lastYear?.toString() ?? '');
  const [year, setYear] = useState(initial.year?.toString() ?? '');
  const [problems, setProblems] = useState<Partial<Record<keyof CatalogFields, string>>>({});

  /** Checks what is typed and hands it over, or says what to fix under each field. */
  const save = () => {
    const read = readCatalogFields(level, { name, firstYear, lastYear, year });
    setProblems('problems' in read ? read.problems : {});
    if ('values' in read) {
      onSave(read.values);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <View style={styles.buttons} testID={ids.buttons}>
          <View style={styles.button} testID={ids.button}>
            <Button variant="secondary" align="stretch" onPress={onClose}>
              Cancelar
            </Button>
          </View>
          <View style={styles.button} testID={ids.button}>
            <Button align="stretch" loading={saving} onPress={save}>
              {submitLabel}
            </Button>
          </View>
        </View>
      }
    >
      <View style={styles.base} testID={ids.base}>
        {level === 'year' ? (
          <TextField label="Ano" kind="number" value={year} onValueChange={setYear} error={problems.year ?? error} returnKeyType="done" onSubmitEditing={save} />
        ) : (
          <View style={styles.name} testID={ids.name}>
            <TextField label="Nome" value={name} onValueChange={setName} error={problems.name ?? error} returnKeyType="done" onSubmitEditing={save} />
          </View>
        )}
        {level === 'generation' && (
          <View style={styles.years} testID={ids.years}>
            <View style={styles.year} testID={ids.year}>
              <TextField label="De" kind="number" value={firstYear} onValueChange={setFirstYear} error={problems.firstYear} />
            </View>
            <View style={styles.year} testID={ids.year}>
              <TextField label="Até" kind="number" value={lastYear} onValueChange={setLastYear} error={problems.lastYear} />
            </View>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}
