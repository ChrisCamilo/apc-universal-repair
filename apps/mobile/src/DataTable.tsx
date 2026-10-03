import type { ReactNode } from 'react';
import { Image, Pressable, Text, View, type ViewStyle } from 'react-native';
import { cubeIcon, type IconShape } from '@apc/shared/icons';
import { sortFromValue, sortOptions, sortValue, type Sort } from '@apc/shared/table';
import { scales } from '@apc/shared/theme';
import { Icon } from './Icon';
import { softHairline } from './Panel';
import { Select } from './Select';
import { useTheme, withAlpha, type ActiveTheme } from './theme';
import { Label } from './Typography';

// The list of rows on a phone, the same as the web table below 720px: each row is a card (thumbnail |
// main | end and actions) and a "Sort by" select takes the place of the header. The owner sorts the rows
// (sortRows in @apc/shared/table). A row's status tints the card with a stripe at its start and is also
// read out, since color alone doesn't reach screen readers; the text keeps the text color on every tint.

const MAIN_STYLE: ViewStyle = { flex: 1, minWidth: 0 };
const ROW_STYLE: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: scales.space.s3 };
const SIDE_STYLE: ViewStyle = { alignItems: 'flex-end', gap: scales.space.s1 };
const SORT_STYLE: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: scales.space.s2 };
/** Width of the status stripe at the start of a card, as on the web (0.75 spacing units). */
const STRIPE_WIDTH = scales.space.s1 * 0.75;
/** Side of the thumbnail button, as on the web (11 spacing units). */
const THUMB_SIZE = scales.space.s1 * 11;
/** Kept on screen for screen readers only, like the web's sr-only. */
const VISUALLY_HIDDEN: ViewStyle = { position: 'absolute', width: 1, height: 1, overflow: 'hidden' };

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
 * Styles a card: hairline below, and for a status the soft tint and the stripe at its start.
 * @param theme Active theme.
 * @param tone Status of the row, if any.
 * @returns Style for the card View.
 */
function cardStyle(theme: ActiveTheme, tone: RowTone | undefined): ViewStyle {
  const { colors } = theme;
  return {
    ...ROW_STYLE,
    paddingVertical: scales.space.s2,
    paddingLeft: scales.space.s2,
    paddingRight: scales.space.s1,
    borderBottomWidth: scales.hairline,
    borderBottomColor: softHairline(theme),
    borderLeftWidth: tone ? STRIPE_WIDTH : 0,
    borderLeftColor: tone ? colors[tone] : 'transparent',
    backgroundColor: tone ? withAlpha(colors[tone], scales.statusTint[tone]) : 'transparent',
  };
}

/**
 * Lists the cells of a card area, in column order.
 * @param columns Table columns.
 * @param area Card area.
 * @returns The columns placed there.
 */
function inArea<Row>(columns: Column<Row>[], area: CardArea): Column<Row>[] {
  return columns.filter((column) => column.card === area);
}

/**
 * Styles the thumbnail: raised fill in a soft frame, the frame lit in the accent while pressed.
 * @param theme Active theme.
 * @param pressed Whether the thumbnail is being pressed.
 * @returns Style for the thumbnail.
 */
function thumbnailStyle(theme: ActiveTheme, pressed: boolean): ViewStyle {
  return {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: scales.hairline,
    borderColor: pressed ? theme.colors.accent : softHairline(theme),
    borderRadius: theme.radiusTile,
    backgroundColor: theme.colors.panelRaised,
  };
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
}: DataTableProps<Row>) {
  const theme = useTheme();
  const sortable = columns.filter((column) => column.sortable);

  /** Renders the cells of one card area for a row. */
  const cells = (row: Row, area: CardArea) =>
    inArea(columns, area).map((column) => <View key={column.key}>{column.cell(row)}</View>);

  return (
    <View style={{ gap: scales.space.s3 }}>
      {sortable.length > 0 && (
        <View style={SORT_STYLE}>
          <Label>Ordenar</Label>
          <View style={MAIN_STYLE}>
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
        <View role="list" accessibilityLabel={label}>
          {rows.map((row) => {
            const status = rowStatus?.(row);
            return (
              <View key={rowKey(row)} role="listitem" testID="table-row" style={cardStyle(theme, status?.tone)}>
                {status && <Text style={VISUALLY_HIDDEN}>{`${status.label}: `}</Text>}
                {cells(row, 'thumb')}
                <View style={MAIN_STYLE}>{cells(row, 'main')}</View>
                <View style={SIDE_STYLE}>
                  {cells(row, 'end')}
                  {cells(row, 'actions')}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function RowAction({ icon, label, onPress, tone = 'default' }: RowActionProps) {
  const theme = useTheme();
  const { colors } = theme;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={scales.space.s2}
      onPress={onPress}
      style={({ pressed }) => ({
        width: scales.space.s6,
        height: scales.space.s6,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radiusTile,
        backgroundColor: pressed ? colors.panel : 'transparent',
      })}
    >
      {({ pressed }) => (
        <Icon icon={icon} size={15} color={pressed ? (tone === 'danger' ? colors.danger : colors.accent) : colors.textMuted} />
      )}
    </Pressable>
  );
}

export function TableThumbnail({ src, label, onOpen }: TableThumbnailProps) {
  const theme = useTheme();
  const content = src ? (
    <Image source={{ uri: src }} resizeMode="cover" style={{ width: THUMB_SIZE, height: THUMB_SIZE }} />
  ) : (
    <Icon icon={cubeIcon} size={20} color={theme.colors.textMuted} />
  );
  if (!onOpen) {
    return (
      <View testID="table-thumbnail" style={thumbnailStyle(theme, false)}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onOpen}
      style={({ pressed }) => thumbnailStyle(theme, pressed)}
    >
      {content}
    </Pressable>
  );
}
