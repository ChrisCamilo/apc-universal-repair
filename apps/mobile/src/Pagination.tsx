import type { ReactNode } from 'react';
import { Pressable, Text as NativeText, View } from 'react-native';
import { chevronIcon, ICON_SIZES } from '@apc/shared/icons';
import { pageCount, pageForSize, pageRange, pageSlots } from '@apc/shared/pagination';
import { scales } from '@apc/shared/theme';
import { Icon } from './Icon';
import { useStyles } from './Pagination.styles';
import { Segmented } from './Segmented';
import { useTheme } from './theme';
import { Label, NumericReadout } from './Typography';

// Page navigation for long lists, the same as the web: the page size selector, the range shown ("1–25 de
// 64", announced as it changes) and the page buttons, with the first page, the last page and the neighbors
// of the current one, and an ellipsis for skipped ranges, in at most seven slots. The current page fills with
// the accent. Previous and next are disabled at the ends. Changing the page size keeps the first item in
// view. The parts wrap onto more lines on a phone. An empty list shows no pagination.

type PaginationProps = {
  /** Accessible name of the page buttons, e.g. "Páginas do estoque". */
  label: string;
  /** Current page, from 1. */
  page: number;
  pageSize: number;
  /** Number of items in the whole list. */
  total: number;
  /** Sizes the selector offers, e.g. PAGE_SIZES. */
  pageSizes: readonly number[];
  onPageChange: (page: number) => void;
  /** Called with the new size; onPageChange then moves to the page holding the first item that was showing. */
  onPageSizeChange: (pageSize: number) => void;
};
type PageButtonProps = {
  /** Page the button goes to. */
  target: number;
  /** Accessible name, e.g. "Página 3" or "Próxima página". */
  label: string;
  current?: boolean;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  children: (color: string) => ReactNode;
};

export function Pagination({ label, page, pageSize, total, pageSizes, onPageChange, onPageSizeChange }: PaginationProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  if (total === 0) {
    return null;
  }
  const pages = pageCount(total, pageSize);

  return (
    <View style={styles.bar} testID={ids.bar}>
      <View style={styles.size} testID={ids.size}>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Label>Itens por página</Label>
        </View>
        {/* The group aligns itself to the top of its parent; wrapped, the row centers it on the label. */}
        <View>
          <Segmented
            label="Itens por página"
            options={pageSizes.map((size) => ({ value: String(size), label: String(size) }))}
            value={String(pageSize)}
            onValueChange={(value) => {
              onPageSizeChange(Number(value));
              onPageChange(pageForSize(page, pageSize, Number(value)));
            }}
          />
        </View>
      </View>
      <View accessibilityLiveRegion="polite" style={styles.range} testID={ids.range}>
        <NumericReadout tone="muted">{pageRange(page, pageSize, total)}</NumericReadout>
      </View>
      <View accessibilityLabel={label} style={styles.pages} testID={ids.pages}>
        <PageButton target={page - 1} disabled={page === 1} label="Página anterior" onPageChange={onPageChange}>
          {(color) => (
            <View style={styles.previous} testID={ids.previous}>
              <Icon icon={chevronIcon} size={ICON_SIZES.caret} color={color} />
            </View>
          )}
        </PageButton>
        {pageSlots(page, pages).map((slot, index) =>
          slot === null ? (
            <View
              key={index < 2 ? 'gap-start' : 'gap-end'}
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
              style={styles.gap}
              testID={ids.gap}
            >
              <NativeText style={[styles.number, { color: colors.textMuted }]}>…</NativeText>
            </View>
          ) : (
            <PageButton key={slot} target={slot} current={slot === page} label={`Página ${slot}`} onPageChange={onPageChange}>
              {(color) => (
                <NativeText style={[styles.number, { color }]} testID={ids.number}>
                  {slot}
                </NativeText>
              )}
            </PageButton>
          ),
        )}
        <PageButton target={page + 1} disabled={page === pages} label="Próxima página" onPageChange={onPageChange}>
          {(color) => <Icon icon={chevronIcon} size={ICON_SIZES.caret} color={color} />}
        </PageButton>
      </View>
    </View>
  );
}

function PageButton({ target, label, current = false, disabled = false, onPageChange, children }: PageButtonProps) {
  const { colors } = useTheme();
  const { styles, ids } = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: current, disabled }}
      disabled={disabled || current}
      hitSlop={scales.space.s1}
      onPress={() => onPageChange(target)}
      style={({ pressed }) => [styles.page, pressed && styles.pagePressed, current && styles.pageCurrent, disabled && styles.pageDisabled]}
      testID={ids.page}
    >
      {({ pressed }) => children(current ? colors.onAccent : pressed ? colors.accent : colors.text)}
    </Pressable>
  );
}
