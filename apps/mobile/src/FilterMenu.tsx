import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type TextStyle, type ViewStyle } from 'react-native';
import { activeFilterCount, clearedFilters, type FilterValues } from '@apc/shared/filters';
import { filterIcon } from '@apc/shared/icons';
import { popShadow, scales } from '@apc/shared/theme';
import { Button } from './Button';
import { FilterChipGroup } from './FilterChip';
import { Icon } from './Icon';
import { Panel, softHairline } from './Panel';
import { Select } from './Select';
import { fontFamily, useTheme, withAlpha, type ActiveTheme } from './theme';
import { Label } from './Typography';

// The detailed filters of a list, the same as the web: a button that opens a panel with one row per filter.
// A row holds a multiple-choice Select, or toggle chips split into labeled groups; a row with any value
// chosen lights up. Nothing changes until Apply; Clear resets every row and applies right away; the back
// button or a tap outside closes the panel without applying. The button counts the filters on. Rows may depend on
// what is chosen in the panel, e.g. the vehicle models of the chosen brands: a value a row stops offering leaves the
// choice.

const ACTIONS_STYLE: ViewStyle = { flexDirection: 'row', justifyContent: 'flex-end', gap: scales.space.s2 };
const CHIPS_STYLE: ViewStyle = { flexDirection: 'row', flexWrap: 'wrap', columnGap: scales.space.s4, rowGap: scales.space.s2 };
/** Room the panel leaves around it, and its widest size, as on the web: min(360px, 100vw - 80px). */
const PANEL_INSET = 80;
const PANEL_MAX_WIDTH = 360;

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
 * Styles the count badge on the button: mono digits on the accent.
 * @param theme Active theme.
 * @returns Style for the badge Text.
 */
function countStyle(theme: ActiveTheme): TextStyle {
  return {
    minWidth: scales.space.s4,
    paddingHorizontal: scales.space.s1,
    borderRadius: scales.radiusPill,
    overflow: 'hidden',
    textAlign: 'center',
    fontFamily: fontFamily(scales.monoFont, 500),
    fontSize: scales.fontSize.xs,
    color: theme.colors.onAccent,
    backgroundColor: theme.colors.accent,
  };
}

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
 * Places the panel near the top of the screen, as wide as the web's min(360px, 100vw - 80px), with the
 * floating shadow.
 * @param theme Active theme.
 * @param screenWidth Window width.
 * @returns Style for the View around the panel.
 */
function panelFrameStyle(theme: ActiveTheme, screenWidth: number): ViewStyle {
  return {
    alignSelf: 'center',
    marginTop: scales.space.s8,
    width: Math.min(PANEL_MAX_WIDTH, screenWidth - PANEL_INSET),
    borderRadius: theme.radiusPanel,
    boxShadow: popShadow(),
  };
}

/**
 * Lists the filter keys a row sets: its own key, or one per chip group.
 * @param row A Select or chips row.
 * @returns The row's filter keys.
 */
function rowKeys(row: Row): string[] {
  return 'groups' in row ? row.groups.map((group) => group.key) : [row.key];
}

/**
 * Styles the button's label: display face in uppercase, in the button's tint.
 * @param theme Active theme.
 * @param tint Accent while filters are on, text otherwise.
 * @returns Style for the label Text.
 */
function triggerLabelStyle(theme: ActiveTheme, tint: string): TextStyle {
  const fontSize = scales.fontSize.xs;
  return {
    fontFamily: fontFamily(theme.displayFont, 600),
    fontSize,
    letterSpacing: theme.displayTracking * fontSize,
    textTransform: 'uppercase',
    color: tint,
  };
}

/**
 * Styles the button: a pill in the display face, lit in the accent on a soft accent fill while filters are on.
 * @param theme Active theme.
 * @param active Whether any filter is on.
 * @returns Style for the button Pressable.
 */
function triggerStyle(theme: ActiveTheme, active: boolean): ViewStyle {
  const { colors } = theme;
  return {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: scales.space.s2,
    borderWidth: scales.hairline,
    borderColor: active ? colors.accent : colors.hairline,
    borderRadius: scales.radiusPill,
    backgroundColor: active ? withAlpha(colors.accent, scales.accentSoft) : 'transparent',
    paddingHorizontal: scales.space.s4,
    paddingVertical: scales.space.s2,
  };
}

export function FilterMenu({ label, title, rows: rowsFor, values, onApply }: FilterMenuProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(values);
  const rows = typeof rowsFor === 'function' ? rowsFor(draft) : rowsFor;
  const count = activeFilterCount(values);
  const tint = count ? theme.colors.accent : theme.colors.text;

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
        style={triggerStyle(theme, count > 0)}
        testID="filter-button"
      >
        <Icon icon={filterIcon} size={13} color={tint} />
        <Text style={triggerLabelStyle(theme, tint)}>Filtros</Text>
        {count > 0 && <Text style={countStyle(theme)}>{count}</Text>}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => show(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar filtros"
          onPress={() => show(false)}
          style={StyleSheet.absoluteFill}
          testID="filter-backdrop"
        />
        <View
          accessibilityLabel={label}
          style={panelFrameStyle(theme, width)}
        >
          <Panel>
            <ScrollView contentContainerStyle={{ gap: scales.space.s3 }}>
              <Label>{title}</Label>
              {rows.map((row) => {
                const on = rowKeys(row).some((key) => (draft[key] ?? []).length > 0);
                return (
                  <View key={rowKeys(row).join('-')} style={{ gap: scales.space.s1 }}>
                    <Label tone={on ? 'accent' : 'muted'}>{row.label}</Label>
                    {'groups' in row ? (
                      <View style={CHIPS_STYLE}>
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
              <View
                style={[
                  ACTIONS_STYLE,
                  { borderTopWidth: scales.hairline, borderTopColor: softHairline(theme), paddingTop: scales.space.s2 },
                ]}
              >
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
