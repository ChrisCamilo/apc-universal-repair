import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Image, Pressable, Text, View } from 'react-native';
import { cubeIcon, ICON_SIZES, type IconShape } from '@apc/shared/icons';
import { shownRows, sortFromValue, sortOptions, sortValue, type ShownRow, type Sort } from '@apc/shared/table';
import { scales } from '@apc/shared/theme';
import { useRowActionStyles, useStyles, useThumbnailStyles } from './DataTable.styles';
import { Icon } from './Icon';
import { useOverlayMotion, useReducedMotion } from './motion';
import { Select } from './Select';
import { useTheme } from './theme';
import { Label } from './Typography';

// The list of rows on a phone, the same as the web table below 720px: each row is a card (thumbnail |
// main | end and actions) and a "Sort by" select takes the place of the header, unless the owner sorts in its own
// way. The owner sorts the rows (sortRows in @apc/shared/table). A row's status tints the card with a stripe at its start and is also
// read out, since color alone doesn't reach screen readers; the text keeps the text color on every tint. With
// onRowOpen, a tap on a card opens it, shown by the raised fill while pressed, except on its own buttons
// (thumbnail, actions), which keep their tap. A nested row (rowNested) belongs to the row above it, such as a brand
// of an item: it is indented and never tinted. A row that opens into nested rows says whether it is open
// (rowExpanded), and a lead cell, such as its chevron, comes first on the card, at its left. Nested rows fade in as
// their row opens, and fade out in place as it closes (shownRows in @apc/shared/table), taking no taps and hidden from
// screen readers meanwhile, as on the web; with reduced motion they show and go at once.

type CardArea = 'lead' | 'thumb' | 'main' | 'end' | 'actions';
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
  /** Whether a row belongs to the row above it, e.g. a brand of an item, indented under it. */
  rowNested?: (row: Row) => boolean;
  /** Whether a row that opens into nested rows is open; undefined for a row that doesn't. */
  rowExpanded?: (row: Row) => boolean | undefined;
  /** Shows the "Sort by" select; off where the owner sorts in its own way, e.g. in a bottom sheet. */
  sortSelect?: boolean;
};
type RowActionProps = {
  icon: IconShape[];
  /** Accessible name, e.g. "Editar Pastilha de freio". */
  label: string;
  onPress: () => void;
  /** Danger is red instead of the accent, for actions like delete. */
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
  rowNested,
  rowExpanded,
  sortSelect = true,
}: DataTableProps<Row>) {
  const { styles, ids } = useStyles();
  const sortable = columns.filter((column) => column.sortable);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<ShownRow<Row>[]>(() => rows.map((row) => ({ row, leaving: false })));
  const [shownFor, setShownFor] = useState(rows);
  // New rows keep the nested rows of a row that closed, fading out, unless motion is reduced.
  if (shownFor !== rows) {
    setShownFor(rows);
    setShown(rowNested && !reduced ? shownRows(shown, rows, rowKey, rowNested) : rows.map((row) => ({ row, leaving: false })));
  }

  /** Lets a nested row go once it has faded out. */
  const gone = (key: string) => setShown((current) => current.filter((each) => !(each.leaving && rowKey(each.row) === key)));

  /** Renders the cells of one card area for a row. */
  const cells = (row: Row, area: CardArea) =>
    inArea(columns, area).map((column) => (
      <View key={column.key} style={styles.cell} testID={ids.cell}>
        {column.cell(row)}
      </View>
    ));

  /** The styles of a row: indented when nested, its tint by status, stronger while pressed. */
  const rowStyles = (nested: boolean, tone: RowTone | undefined, pressed: boolean) => [
    styles.row,
    nested && styles.rowNested,
    !tone && pressed && styles.rowPressed,
    tone === 'warn' && (pressed ? styles.rowWarnPressed : styles.rowWarn),
    tone === 'danger' && (pressed ? styles.rowDangerPressed : styles.rowDanger),
  ];

  return (
    <View style={styles.base} testID={ids.base}>
      {sortSelect && sortable.length > 0 && (
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
          {shown.map(({ row, leaving }) => {
            const key = rowKey(row);
            const nested = rowNested?.(row) ?? false;
            const status = nested ? undefined : rowStatus?.(row);
            const content = (
              <>
                {status && (
                  <Text style={styles.status} testID={ids.status}>
                    {`${status.label}: `}
                  </Text>
                )}
                {cells(row, 'lead')}
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
            const card = onRowOpen ? (
              <Pressable
                key={key}
                role="listitem"
                accessibilityState={{ expanded: leaving ? undefined : rowExpanded?.(row) }}
                onPress={() => onRowOpen(row)}
                style={({ pressed }) => rowStyles(nested, status?.tone, pressed)}
                testID={ids.row}
              >
                {content}
              </Pressable>
            ) : (
              <View key={key} role="listitem" style={rowStyles(nested, status?.tone, false)} testID={ids.row}>
                {content}
              </View>
            );
            return nested ? (
              <NestedRow key={key} leaving={leaving} onGone={() => gone(key)}>
                {card}
              </NestedRow>
            ) : (
              card
            );
          })}
        </View>
      )}
    </View>
  );
}

// A nested row's box: it fades in as the row comes and out while it leaves, in the motion token, taking no taps and
// hidden from screen readers meanwhile, and says when it has gone.
function NestedRow({ leaving, onGone, children }: { leaving: boolean; onGone: () => void; children: ReactNode }) {
  const { styles, ids } = useStyles();
  const { shown, fade } = useOverlayMotion(!leaving, 'translate');
  useEffect(() => {
    if (!shown) {
      onGone();
    }
  }, [shown, onGone]);
  return (
    <Animated.View
      style={[styles.fade, fade]}
      accessibilityElementsHidden={leaving}
      importantForAccessibility={leaving ? 'no-hide-descendants' : 'auto'}
      testID={ids.fade}
    >
      {children}
    </Animated.View>
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
      <Icon icon={icon} size={ICON_SIZES.label} color={tone === 'danger' ? colors.danger : colors.accent} />
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
