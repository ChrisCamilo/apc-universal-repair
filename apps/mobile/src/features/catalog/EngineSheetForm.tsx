import { useState } from 'react';
import { Text as RNText, View } from 'react-native';
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
} from '@apc/domain/catalog';
import { capitalizeFirst } from '@apc/domain/items';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { Segmented } from '../../components/Segmented';
import { TextField } from '../../components/TextField';
import { Heading, NumericReadout, Text } from '../../components/Typography';
import { useStyles } from './EngineSheetForm.styles';

// An engine's sheet as a form, the same as the web on a phone: a full-screen dialog to add an engine under a year or
// save its sheet again, with the displacement in litres (a comma or a dot), the cylinders, the drive and a summary. The
// year comes from the tree and isn't typed. While what is typed makes a sheet, the form shows the title it will have,
// the engine's name in the tree and its readouts as they will look. Salvar ficha, at the dialog's foot, checks each
// field and says under it what to fix; Cancelar, the × and the back button give up. The owner gives it a new key each
// time it opens, so it opens empty or with the engine's sheet.

type EngineSheetFormProps = {
  open: boolean;
  /** The dialog's title, e.g. "Novo motor em 1986". */
  title: string;
  /** The year, brand, model and version the sheet's title is built from. */
  names: EngineSheetNames;
  /** The sheet the form opens with, when saving it again. */
  initial?: CatalogEngineInput;
  /** While the owner saves it. */
  saving?: boolean;
  onSave: (sheet: CatalogEngineInput) => void;
  onClose: () => void;
};

export function EngineSheetForm({ open, title, names, initial, saving = false, onSave, onClose }: EngineSheetFormProps) {
  const { styles, ids } = useStyles();
  const [litres, setLitres] = useState(initial ? litresText(initial.displacementDl) : '');
  const [cylinders, setCylinders] = useState(initial?.cylinders.toString() ?? '');
  const [drive, setDrive] = useState<string>(initial?.drive ?? '');
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [problems, setProblems] = useState<Partial<Record<keyof EngineFields, string>>>({});
  const read = readEngineFields({ litres, cylinders, drive, summary });
  const sheet = 'sheet' in read ? read.sheet : null;
  const preview = sheet && engineSheet(names, sheet);

  /** Checks the fields and saves the sheet, or says what to fix under each field. */
  const save = () => {
    if ('sheet' in read) {
      setProblems({});
      onSave(read.sheet);
    } else {
      setProblems(read.problems);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      closable
      actions={
        <>
          <Button variant="secondary" size="sm" onPress={onClose}>
            Cancelar
          </Button>
          <Button size="sm" loading={saving} onPress={save}>
            Salvar ficha
          </Button>
        </>
      }
    >
      <View style={styles.base} testID={ids.base}>
        <View style={styles.head} testID={ids.head}>
          <RNText style={styles.kicker} testID={ids.kicker}>
            Ficha do motor
          </RNText>
          <Heading level={3}>{preview?.title ?? `${names.year} · ${names.brand} ${names.model} ${names.version}`}</Heading>
        </View>
        <RNText style={styles.fromTree} testID={ids.fromTree}>
          Ano {names.year}, do galho de cima
        </RNText>
        <View style={styles.pair} testID={ids.pair}>
          <View style={styles.pairField} testID={ids.pairField}>
            <TextField label="Cilindrada (L)" kind="decimal" value={litres} onValueChange={setLitres} error={problems.litres} />
          </View>
          <View style={styles.pairField} testID={ids.pairField}>
            <TextField label="Cilindros" kind="number" value={cylinders} onValueChange={setCylinders} error={problems.cylinders} />
          </View>
        </View>
        <View style={styles.drive} testID={ids.drive}>
          <Segmented
            label="Tração"
            options={ENGINE_DRIVES.map((value) => ({ value, label: capitalizeFirst(ENGINE_DRIVE_LABELS[value].toLowerCase()) }))}
            value={drive}
            onValueChange={setDrive}
          />
          {problems.drive && (
            <RNText accessibilityLiveRegion="polite" style={styles.problem} testID={ids.problem}>
              {problems.drive}
            </RNText>
          )}
        </View>
        <TextField label="Resumo" value={summary} onValueChange={setSummary} lines={4} />
        {sheet && preview && (
          <View style={styles.preview} testID={ids.preview}>
            <Text size="sm" tone="muted">
              Na árvore: {engineLabel(sheet)}
            </Text>
            <View style={styles.readouts} testID={ids.readouts}>
              {preview.specs.map((spec) => (
                <NumericReadout key={spec} tone="accent">
                  {spec}
                </NumericReadout>
              ))}
            </View>
          </View>
        )}
      </View>
    </Dialog>
  );
}
