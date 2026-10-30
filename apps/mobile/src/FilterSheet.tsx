import { useState, type Ref } from 'react';
import { Pressable, Text, View, type HostInstance } from 'react-native';
import { clearedFilters, offeredValues, selectionSummary, toggleValue, type FilterValues } from '@apc/shared/filters';
import { checkIcon, chevronIcon, ICON_SIZES, sortIcon } from '@apc/shared/icons';
import { sortFromValue, sortValue, type Sort } from '@apc/shared/table';
import { BackButton } from './BackButton';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { useStyles } from './FilterSheet.styles';
import { Icon } from './Icon';
import { Segmented } from './Segmented';
import { useTheme } from './theme';

// A list's filters and sort in a bottom sheet, the same as the web on a phone (the Filtros mockup). "Ordenar por" comes
// first, then a row per filter with what it has chosen ("Todas", "Freios", "Freios +2"), in the accent once something
// is; a row opens its options inside the sheet, under a ← back to the rows, "Todas" first, and a filter of a small
// fixed set of values, such as the position, is a segmented choice of one value in place. Rows may depend on what is
// chosen, e.g. the vehicle models of the chosen brands: a value a row stops offering leaves the choice. Nothing changes
// until "Ver n itens", which counts the items the choice would show as it changes; "Limpar" turns every filter and the
// sort off in the sheet, and the back button goes back from a list, then closes the sheet without applying, as a tap
// above it or a drag down does. An owner may point a tour at the sheet's content. SortSheet is the sort alone, for the
// toolbar's Ordenar: a pick sorts the list at once and closes it.

type Option = { value: string; label: string };
type FilterSheetProps = {
  open: boolean;
  /** Called on a tap above the sheet, a drag down, or the back button on its rows; the owner closes it, dropping the choice. */
  onClose: () => void;
  /** The rows for what is chosen in the sheet so far. */
  rows: (draft: FilterValues) => Row[];
  /** Applied values per filter key. */
  values: FilterValues;
  /** The sort applied, or null. */
  sort: Sort | null;
  /** The sorts to choose from, the one with no sort first, e.g. "Ordem de cadastro". */
  sortOptions: Option[];
  /** How many items the list would show with the values chosen in the sheet. */
  count: (draft: FilterValues) => number;
  /** Applies the values and the sort chosen; the owner closes the sheet. */
  onApply: (values: FilterValues, sort: Sort | null) => void;
  /** The sheet's content, e.g. for a tour to point at. */
  panelRef?: Ref<HostInstance>;
};
/** A row of the sheet: a multiple choice opened as a list, or segmented choices sharing a heading, e.g. position and side. */
type Row =
  | { key: string; label: string; allLabel: string; options: Option[] }
  | { label: string; groups: { key: string; label: string; segments: Option[] }[] };
type SortSheetProps = {
  open: boolean;
  onClose: () => void;
  sort: Sort | null;
  /** The sorts to choose from, the one with no sort first. */
  options: Option[];
  /** Sorts the list; the sheet then asks to close. */
  onSortChange: (sort: Sort | null) => void;
};
/** What the sheet shows: its rows, or the options of the sort or of a filter. */
type Shown = { list: 'rows' } | { list: 'sort' } | { list: 'filter'; key: string };

export function FilterSheet({ open, onClose, rows: rowsFor, values, sort, sortOptions, count, onApply, panelRef }: FilterSheetProps) {
  const { styles, ids } = useStyles();
  const [draft, setDraft] = useState(values);
  const [sorted, setSorted] = useState(sortValue(sort));
  const [view, setView] = useState<Shown>({ list: 'rows' });
  // Each opening starts from what is applied, on the rows.
  const [openedFor, setOpenedFor] = useState(open);
  if (openedFor !== open) {
    setOpenedFor(open);
    if (open) {
      setDraft(values);
      setSorted(sortValue(sort));
      setView({ list: 'rows' });
    }
  }
  const rows = rowsFor(draft);
  const shown = count(draft);
  const filter = view.list === 'filter' ? rows.find((row) => 'key' in row && row.key === view.key) : undefined;

  /** Changes one filter in the sheet, without applying it, dropping what the other rows stop offering. */
  const change = (key: string, chosen: string[]) =>
    setDraft((prev) => {
      const next = { ...prev, [key]: chosen };
      return offeredValues(next, rowsFor(next));
    });

  const back = () => setView({ list: 'rows' });
  const sortLabel = sortOptions.find((option) => option.value === sorted)?.label ?? '';

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      onBack={view.list === 'rows' ? undefined : back}
      title="Filtrar e ordenar"
      action={
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setDraft(clearedFilters(draft));
            setSorted('');
          }}
          style={({ pressed }) => [styles.clear, pressed && styles.clearPressed]}
          testID={ids.clear}
        >
          <Text style={styles.clearLabel} testID={ids.clearLabel}>
            Limpar
          </Text>
        </Pressable>
      }
      footer={<Button align="stretch" onPress={() => onApply(draft, sortFromValue(sorted))}>{`Ver ${shown} ${shown === 1 ? 'item' : 'itens'}`}</Button>}
    >
      <View ref={panelRef} collapsable={false}>
        {view.list === 'sort' && (
          <OptionList
            label="Ordenar por"
            onBack={back}
            options={sortOptions}
            selected={(value) => value === sorted}
            onPick={(value) => {
              setSorted(value);
              back();
            }}
          />
        )}
        {filter && 'key' in filter && (
          <OptionList
            label={filter.label}
            onBack={back}
            multiple
            options={[{ value: '', label: filter.allLabel }, ...filter.options]}
            selected={(value) => (value ? (draft[filter.key] ?? []).includes(value) : (draft[filter.key] ?? []).length === 0)}
            onPick={(value) =>
              change(
                filter.key,
                value
                  ? toggleValue(
                      draft[filter.key] ?? [],
                      value,
                      filter.options.map((option) => option.value),
                    )
                  : [],
              )
            }
          />
        )}
        {view.list === 'rows' && (
          <>
            <SheetRow icon label="Ordenar por" value={sortLabel} chosen={sorted !== ''} onPress={() => setView({ list: 'sort' })} />
            <View style={styles.strip} testID={ids.strip} />
            {rows.map((row) => {
              if ('groups' in row) {
                return row.groups.map((group, index) => (
                  <View key={group.key} style={[styles.segments, index === 0 && styles.segmentsFirst]} testID={ids.segments}>
                    <Text
                      importantForAccessibility="no"
                      accessibilityElementsHidden
                      style={styles.segmentsLabel}
                      testID={ids.segmentsLabel}
                    >
                      {group.label}
                    </Text>
                    <Segmented
                      fill
                      label={group.label}
                      options={group.segments}
                      // A choice of several values matches no segment.
                      value={(draft[group.key] ?? []).join()}
                      onValueChange={(value) => change(group.key, value ? [value] : [])}
                    />
                  </View>
                ));
              }
              const chosen = (draft[row.key] ?? []).flatMap((value) => row.options.find((option) => option.value === value)?.label ?? []);
              return (
                <SheetRow
                  key={row.key}
                  label={row.label}
                  value={selectionSummary(chosen, row.allLabel)}
                  chosen={chosen.length > 0}
                  onPress={() => setView({ list: 'filter', key: row.key })}
                />
              );
            })}
          </>
        )}
      </View>
    </BottomSheet>
  );
}

export function SortSheet({ open, onClose, sort, options, onSortChange }: SortSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Ordenar">
      <OptionList
        label="Ordenar"
        options={options}
        selected={(value) => value === sortValue(sort)}
        onPick={(value) => {
          onSortChange(sortFromValue(value));
          onClose();
        }}
      />
    </BottomSheet>
  );
}

type SheetRowProps = {
  label: string;
  /** What it has chosen, e.g. "Todas" or "Freios +2". */
  value: string;
  /** Whether something is chosen, which draws the value in the accent. */
  chosen: boolean;
  /** Leads with the sort's icon. */
  icon?: boolean;
  onPress: () => void;
};

/** A row of the sheet: its label, what it has chosen and a chevron, opening its options. */
function SheetRow({ label, value, chosen, icon = false, onPress }: SheetRowProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      testID={ids.row}
    >
      {icon && <Icon icon={sortIcon} size={ICON_SIZES.thumbnail} color={colors.textMuted} />}
      <Text numberOfLines={1} style={styles.rowLabel} testID={ids.rowLabel}>
        {label}
      </Text>
      <Text numberOfLines={1} style={[styles.rowValue, chosen && styles.rowValueChosen]} testID={ids.rowValue}>
        {value}
      </Text>
      <Icon icon={chevronIcon} size={ICON_SIZES.thumbnail} color={colors.textMuted} />
    </Pressable>
  );
}

type OptionListProps = {
  /** The list's name, e.g. "Categoria"; with onBack, also shown over it, beside the ←. */
  label: string;
  /** Goes back to the rows, inside the filter sheet. */
  onBack?: () => void;
  options: Option[];
  /** Whether several options can be on at once. */
  multiple?: boolean;
  selected: (value: string) => boolean;
  onPick: (value: string) => void;
};

/** The options of a sort or a filter, a check beside each one chosen. */
function OptionList({ label, onBack, options, multiple = false, selected, onPick }: OptionListProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  return (
    <>
      {onBack && (
        <View style={styles.listHeader} testID={ids.listHeader}>
          <BackButton label="Voltar aos filtros" onPress={onBack} />
          <Text style={styles.listTitle} testID={ids.listTitle}>
            {label}
          </Text>
        </View>
      )}
      <View accessibilityLabel={label}>
        {options.map((option, index) => {
          const on = selected(option.value);
          return (
            <Pressable
              key={option.value}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityLabel={option.label}
              accessibilityState={{ checked: on }}
              onPress={() => onPick(option.value)}
              style={({ pressed }) => [styles.option, index === 0 && styles.optionFirst, pressed && styles.optionPressed]}
              testID={ids.option}
            >
              <Text style={[styles.optionLabel, on && styles.optionLabelOn]} testID={ids.optionLabel}>
                {option.label}
              </Text>
              {on && <Icon icon={checkIcon} size={ICON_SIZES.prominent} color={colors.accent} />}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}
