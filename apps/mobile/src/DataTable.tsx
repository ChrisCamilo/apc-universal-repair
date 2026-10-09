import type { ReactNode } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { cubeIcon, ICON_SIZES, type IconShape } from '@apc/shared/icons';
import { sortFromValue, sortOptions, sortValue, type Sort } from '@apc/shared/table';
import { scales } from '@apc/shared/theme';
import { useRowActionStyles, useStyles, useThumbnailStyles } from './DataTable.styles';
import { Icon } from './Icon';
import { Select } from './Select';
import { useTheme } from './theme';
import { Label } from './Typography';

// The list of rows on a phone, the same as the web table below 720px: each row is a card (thumbnail |
// main | end and actions) and a "Sort by" select takes the place of the header. The owner sorts the rows
// (sortRows in @apc/shared/table). A row's status tints the card with a stripe at its start and is also
// read out, since color alone doesn't reach screen readers; the text keeps the text color on every tint. With
// onRowOpen, a tap on a card opens it, shown by the raised fill while pressed, except on its own buttons
// (thumbnail, actions), which keep their tap.

type CardArea = 'thumb' | 'main' | 'end' | 'actions';
type Column<Row> = {
  key: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** Sorted by value, which the "Sort by" select words as smaller → larger. */
  numeric?: boolean;
  /** The "Sort by" select offers this column. */
  sortable?: boolean;
  /** Name in the "Sort by" select when it differs from the header, e.g. "Quantidade" for "Qtd.". */
  sortLabel?: string;
  /** Place of the cell on the card; cells without one are left off. */
  card?: CardArea;
};
type DataTableProps<Row> = {
  /** Accessible name of the list, e.g. "Itens do estoque". */
  label: string;
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Status of a row, which tints it; the label is read out, e.g. "Esgotado". */
  rowStatus?: (row: Row) => { tone: RowTone; label: string } | undefined;
  sort: Sort | null;
  onSortChange: (sort: Sort | null) => void;
  /** Option of the "Sort by" select with no sort, e.g. "Ordem de cadastro". */
  unsortedLabel: string;
  /** Shown instead of the list when there are no rows. */
  empty: ReactNode;
  /** Opens a row, e.g. the item details; without it cards aren't pressable. */
  onRowOpen?: (row: Row) => void;
};
type RowActionProps = {
  icon: IconShape[];
  /** Accessible name, e.g. "Editar Pastilha de freio". */
  label: string;
  onPress: () => void;
  /** Danger tints the press, for actions like delete. */
  tone?: 'default' | 'danger';
};
type RowTone = 'warn' | 'danger';
type TableThumbnailProps = {
  /** Photo URL; without one the thumbnail shows a placeholder icon. */
  src?: string | null;
  /** Accessible name of the button, e.g. "Ver foto de Pastilha de freio". */
  label: string;
  /** Opens a larger view; without it the thumbnail is a plain picture, not a button. */
  onOpen?: () => void;
};

/**
 * Lists the cells of a card area, in column order.
 * @param columns Table columns.
 * @param area Card area.
 * @returns The columns placed there.
 */
function inArea<Row>(columns: Column<Row>[], area: CardArea): Column<Row>[] {
  return columns.filter((column) => column.card === area);
}

export function DataTable<Row>({
  label,
  columns,
  rows,
  rowKey,
  rowStatus,
  sort,
  onSortChange,
  unsortedLabel,
  empty,
  onRowOpen,
}: DataTableProps<Row>) {
  const { styles, ids } = useStyles();
  const sortable = columns.filter((column) => column.sortable);

  /** Renders the cells of one card area for a row. */
  const cells = (row: Row, area: CardArea) =>
    inArea(columns, area).map((column) => (
      <View key={column.key} style={styles.cell} testID={ids.cell}>
        {column.cell(row)}
      </View>
    ));

  /** The styles of a row: its tint by status, stronger while pressed. */
  const rowStyles = (tone: RowTone | undefined, pressed: boolean) => [
    styles.row,
    !tone && pressed && styles.rowPressed,
    tone === 'warn' && (pressed ? styles.rowWarnPressed : styles.rowWarn),
    tone === 'danger' && (pressed ? styles.rowDangerPressed : styles.rowDanger),
  ];

  return (
    <View style={styles.base} testID={ids.base}>
      {sortable.length > 0 && (
        <View style={styles.sortBar} testID={ids.sortBar}>
          <Label>Ordenar</Label>
          <View style={styles.sortSelect} testID={ids.sortSelect}>
            <Select
              label="Ordenar"
              options={sortOptions(
                sortable.map((column) => ({ key: column.key, label: column.sortLabel ?? column.header, numeric: column.numeric })),
                unsortedLabel,
              )}
              value={sortValue(sort)}
              onValueChange={(value) => onSortChange(sortFromValue(value))}
            />
          </View>
        </View>
      )}
      {rows.length === 0 ? (
        empty
      ) : (
        <View role="list" accessibilityLabel={label} style={styles.table} testID={ids.table}>
          {rows.map((row) => {
            const status = rowStatus?.(row);
            const content = (
              <>
                {status && (
                  <Text style={styles.status} testID={ids.status}>
                    {`${status.label}: `}
                  </Text>
                )}
                {cells(row, 'thumb')}
                <View style={styles.main} testID={ids.main}>
                  {cells(row, 'main')}
                </View>
                <View style={styles.side} testID={ids.side}>
                  {cells(row, 'end')}
                  {cells(row, 'actions')}
                </View>
              </>
            );
            return onRowOpen ? (
              <Pressable
                key={rowKey(row)}
                role="listitem"
                onPress={() => onRowOpen(row)}
                style={({ pressed }) => rowStyles(status?.tone, pressed)}
                testID={ids.row}
              >
                {content}
              </Pressable>
            ) : (
              <View key={rowKey(row)} role="listitem" style={rowStyles(status?.tone, false)} testID={ids.row}>
                {content}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function RowAction({ icon, label, onPress, tone = 'default' }: RowActionProps) {
  const { colors } = useTheme();
  const { styles, ids } = useRowActionStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={scales.space.s2}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
      testID={ids.action}
    >
      {({ pressed }) => (
        <Icon icon={icon} size={ICON_SIZES.label} color={pressed ? (tone === 'danger' ? colors.danger : colors.accent) : colors.textMuted} />
      )}
    </Pressable>
  );
}

export function TableThumbnail({ src, label, onOpen }: TableThumbnailProps) {
  const { colors } = useTheme();
  const { styles, ids } = useThumbnailStyles();
  const content = src ? (
    <Image source={{ uri: src }} resizeMode="cover" style={styles.image} testID={ids.image} />
  ) : (
    <Icon icon={cubeIcon} size={ICON_SIZES.thumbnail} color={colors.textMuted} />
  );
  if (!onOpen) {
    return (
      <View style={styles.thumbnail} testID={ids.thumbnail}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onOpen}
      style={({ pressed }) => [styles.thumbnail, pressed && styles.thumbnailPressed]}
      testID={ids.thumbnail}
    >
      {content}
    </Pressable>
  );
}
