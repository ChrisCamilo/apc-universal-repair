import { useState, type Ref } from 'react';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions, type HostInstance } from 'react-native';
import { activeFilterCount, clearedFilters, type FilterValues } from '@apc/shared/filters';
import { filterIcon, ICON_SIZES } from '@apc/shared/icons';
import { Button } from './Button';
import { FilterChipGroup } from './FilterChip';
import { PANEL_INSET, PANEL_MAX_WIDTH, useStyles } from './FilterMenu.styles';
import { Icon } from './Icon';
import { Panel } from './Panel';
import { Select } from './Select';
import { useTheme } from './theme';
import { TourLayer } from './Tour';
import { Label } from './Typography';

// The detailed filters of a list, the same as the web: a button that opens a panel with one row per filter.
// A row holds a multiple-choice Select, or toggle chips split into labeled groups; a row with any value
// chosen lights up. Nothing changes until Apply; Clear resets every row and applies right away; the back
// button or a tap outside closes the panel without applying. The button counts the filters on. Rows may depend on
// what is chosen in the panel, e.g. the vehicle models of the chosen brands: a value a row stops offering leaves the
// choice. An owner may also open and close the panel itself, as the Inventory tutorial does, whose tour draws above
// the panel.

type ChipsRow = {
  label: string;
  /** Chip groups sharing the row, each its own filter, e.g. position and side. */
  groups: { key: string; label: string; options: { value: string; label: string; title?: string }[] }[];
};
type FilterMenuProps = {
  /** Accessible name of the panel, e.g. "Filtros do estoque". */
  label: string;
  /** Heading at the top of the panel, e.g. "Filtrar estoque". */
  title: string;
  /** The rows, or the rows for what is chosen in the panel so far. */
  rows: Row[] | ((draft: FilterValues) => Row[]);
  /** Applied values per filter key. */
  values: FilterValues;
  onApply: (values: FilterValues) => void;
  /** Whether the panel is open, for an owner that opens or closes it itself, e.g. a tutorial; it follows its button otherwise. */
  open?: boolean;
  /** Called when the panel opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** The panel's view, e.g. for a tour to point at. */
  panelRef?: Ref<HostInstance>;
};
type Row = SelectRow | ChipsRow;
type SelectRow = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  /** Label of the option that clears the row, e.g. "Todas". */
  allLabel: string;
};

/**
 * Drops from each Select row the values it no longer offers, once the rest of the choice changed what it lists.
 * @param draft Values chosen in the panel.
 * @param rows The rows for those values.
 * @returns The values each row still offers.
 */
function offered(draft: FilterValues, rows: Row[]): FilterValues {
  const kept = { ...draft };
  for (const row of rows) {
    if (!('groups' in row) && kept[row.key]) {
      kept[row.key] = kept[row.key].filter((value) => row.options.some((option) => option.value === value));
    }
  }
  return kept;
}

/**
 * Lists the filter keys a row sets: its own key, or one per chip group.
 * @param row A Select or chips row.
 * @returns The row's filter keys.
 */
function rowKeys(row: Row): string[] {
  return 'groups' in row ? row.groups.map((group) => group.key) : [row.key];
}

export function FilterMenu({ label, title, rows: rowsFor, values, onApply, open: openProp, onOpenChange, panelRef }: FilterMenuProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  const { width } = useWindowDimensions();
  const [ownOpen, setOwnOpen] = useState(false);
  const open = openProp ?? ownOpen;
  const [draft, setDraft] = useState(values);
  const rows = typeof rowsFor === 'function' ? rowsFor(draft) : rowsFor;
  const count = activeFilterCount(values);
  const tint = count ? colors.accent : colors.text;

  /** Opens or closes the panel, telling the owner. */
  const setOpen = (next: boolean) => {
    setOwnOpen(next);
    onOpenChange?.(next);
  };

  /** Opens the panel on the applied values, or closes it and drops what was not applied. */
  const show = (next: boolean) => {
    setDraft(values);
    setOpen(next);
  };

  /** Applies values and closes the panel. */
  const apply = (next: FilterValues) => {
    onApply(next);
    setOpen(false);
  };

  /** Changes one filter in the panel, without applying it, dropping what the other rows stop offering. */
  const change = (key: string, chosen: string[]) =>
    setDraft((prev) => {
      const next = { ...prev, [key]: chosen };
      return typeof rowsFor === 'function' ? offered(next, rowsFor(next)) : next;
    });

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={count ? `Filtros, ${count} ${count === 1 ? 'ativo' : 'ativos'}` : 'Filtros'}
        accessibilityState={{ expanded: open }}
        onPress={() => show(true)}
        style={[styles.trigger, count > 0 && styles.triggerActive]}
        testID={ids.trigger}
      >
        <Icon icon={filterIcon} size={ICON_SIZES.compact} color={tint} />
        <Text style={[styles.triggerLabel, count > 0 && styles.triggerLabelActive]} testID={ids.triggerLabel}>
          Filtros
        </Text>
        {count > 0 && (
          <Text style={styles.count} testID={ids.count}>
            {count}
          </Text>
        )}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => show(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar filtros"
          onPress={() => show(false)}
          style={styles.backdrop}
          testID={ids.backdrop}
        />
        <View
          ref={panelRef}
          accessibilityLabel={label}
          style={[styles.panel, { width: Math.min(PANEL_MAX_WIDTH, width - PANEL_INSET) }]}
          testID={ids.panel}
        >
          <Panel>
            <ScrollView contentContainerStyle={styles.content}>
              <Label>{title}</Label>
              {rows.map((row) => {
                const on = rowKeys(row).some((key) => (draft[key] ?? []).length > 0);
                return (
                  <View key={rowKeys(row).join('-')} style={styles.row} testID={ids.row}>
                    <Label tone={on ? 'accent' : 'muted'}>{row.label}</Label>
                    {'groups' in row ? (
                      <View style={styles.chips} testID={ids.chips}>
                        {row.groups.map((group) => (
                          <FilterChipGroup
                            key={group.key}
                            multiple
                            size="sm"
                            label={group.label}
                            options={group.options}
                            value={draft[group.key] ?? []}
                            onValueChange={(chosen) => change(group.key, chosen)}
                          />
                        ))}
                      </View>
                    ) : (
                      <Select
                        label={row.label}
                        multiple
                        allLabel={row.allLabel}
                        options={row.options}
                        value={draft[row.key] ?? []}
                        onValueChange={(chosen) => change(row.key, chosen)}
                      />
                    )}
                  </View>
                );
              })}
              <View style={styles.actions} testID={ids.actions}>
                <Button size="sm" variant="secondary" onPress={() => apply(clearedFilters(draft))}>
                  Limpar
                </Button>
                <Button size="sm" onPress={() => apply(draft)}>
                  Aplicar
                </Button>
              </View>
            </ScrollView>
          </Panel>
        </View>
        {/* A guided tour draws here while the panel is open, the only place above the Modal. */}
        <TourLayer />
      </Modal>
    </>
  );
}

export function ClearFilters({ active, onClear }: { active: boolean; onClear: () => void }) {
  if (!active) {
    return null;
  }
  return (
    <Button variant="link" onPress={onClear}>
      Limpar filtros
    </Button>
  );
}
